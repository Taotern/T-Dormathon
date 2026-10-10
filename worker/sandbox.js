import {ValidationError,clone,finiteNumber,safeInt,round,dateMicros,sha256,stableJSON,uid} from './common.js';

export const FR12_ACTIONS=[
 {id:'no_action',label:'No action',kind:'control'},
 {id:'verify_eta',label:'Verify supplier ETA',kind:'information'},
 {id:'verify_documents',label:'Verify invoice documents',kind:'information'},
 {id:'expedite_delivery',label:'Expedite delivery',kind:'supply'},
 {id:'increase_buffer',label:'Increase stock buffer',kind:'supply'},
 {id:'pay_approved_invoice',label:'Pay approved invoice',kind:'procurement'},
 {id:'qualified_reassignment',label:'Reassign to a qualified operator',kind:'service'},
 {id:'first_expiry_first_out',label:'Use earliest-expiry stock first',kind:'waste'},
 {id:'reduce_waste',label:'Reduce avoidable waste',kind:'waste'},
 {id:'reduce_energy_consumption',label:'Reduce energy consumption',kind:'energy'}
];

export const DEFAULT_OBJECTIVES=['fulfilment_gap_days','cash_gap_myr','processing_wait_hours','expiry_surplus_units'];
export const FR12_METRICS={
 fulfilment_gap_days:{unit:'day',direction:'minimize'},
 cash_gap_myr:{unit:'MYR',direction:'minimize'},
 processing_wait_hours:{unit:'hour',direction:'minimize'},
 expiry_surplus_units:{unit:'units',direction:'minimize'},
 energy_consumed_kwh:{unit:'kWh',direction:'minimize'},
 energy_over_baseline_kwh:{unit:'kWh',direction:'minimize'},
 action_cost_myr:{unit:'MYR',direction:'minimize'}
};
const actionById=new Map(FR12_ACTIONS.map(x=>[x.id,x]));
const DEFAULT_POLICY_IDS=['no_action','rule_based','simple_planning','pareto_q'];
const GOLDEN=2654435761;

function rng(seed){
 let x=(seed>>>0)||0x9e3779b9;
 return()=>{x^=x<<13;x^=x>>>17;x^=x<<5;return(x>>>0)/4294967296};
}
function weightedChoice(rows,random,fallback=1){
 if(!Array.isArray(rows)||!rows.length)return fallback;
 const total=rows.reduce((sum,row)=>sum+row.weight,0);
 if(!(total>0))return fallback;
 let n=random()*total;
 for(const row of rows){n-=row.weight;if(n<0)return row.value}
 return rows.at(-1).value;
}
function expectedChoice(rows,fallback=1){
 if(!Array.isArray(rows)||!rows.length)return fallback;
 const total=rows.reduce((sum,row)=>sum+row.weight,0);
 return total>0?rows.reduce((sum,row)=>sum+row.value*row.weight,0)/total:fallback;
}
function quantile(values,p){
 if(!values.length)return null;
 const sorted=[...values].sort((a,b)=>a-b),at=(sorted.length-1)*p,lo=Math.floor(at),hi=Math.ceil(at);
 return sorted[lo]+(sorted[hi]-sorted[lo])*(at-lo);
}
const metric=(value,unit,status='available')=>({value:Number.isFinite(value)?round(value,4):null,unit,status});
const timeOf=value=>value?dateMicros(value):null;
const sameJSON=(a,b)=>stableJSON(a)===stableJSON(b);
const isSynthetic=state=>String(state?.data_basis||'').startsWith('synthetic_');

function latestBy(records,keyFor,clockFor,conflicts){
 const groups=new Map();
 for(const record of records){
  const key=keyFor(record);
  if(!groups.has(key))groups.set(key,[]);
  groups.get(key).push(record);
 }
 const selected=[];
 for(const [key,group] of groups){
  const latestTime=Math.max(...group.map(clockFor));
  const latest=group.filter(record=>clockFor(record)===latestTime).sort((a,b)=>a.id.localeCompare(b.id));
  if(latest.length>1&&latest.slice(1).some(record=>!sameJSON(record.payload,latest[0].payload))){
   conflicts.push({kind:'same_entity_same_clock_conflict',key,record_ids:latest.map(x=>x.id),domain:latest[0].domain});
   continue;
  }
  selected.push(latest.at(-1));
 }
 return selected;
}

export function detectStateConflicts(records=[]){
 const definitions={
  supply:r=>JSON.stringify([r.payload.sku,r.occurred_at]),
  procurement:r=>JSON.stringify([r.payload.vendor,r.payload.invoice_id,r.payload.currency,r.occurred_at]),
  service:r=>JSON.stringify([r.payload.ticket_id,r.occurred_at]),
  energy:r=>JSON.stringify([r.payload.meter_id,r.payload.period_start,r.payload.period_end])
 };
 const conflicts=[];
 for(const [domain,keyFor] of Object.entries(definitions)){
  const groups=new Map();
  for(const row of records.filter(x=>x.domain===domain)){
   const key=keyFor(row);
   if(!groups.has(key))groups.set(key,[]);
   groups.get(key).push(row);
  }
  for(const [key,group] of groups){
   if(group.length>1&&group.slice(1).some(row=>!sameJSON(row.payload,group[0].payload))){
    conflicts.push({kind:'same_entity_same_clock_conflict',domain,key,record_ids:group.map(x=>x.id).sort()});
   }
  }
 }
 const energyByMeter=new Map();
 for(const row of records.filter(x=>x.domain==='energy')){
  const meter=row.payload.meter_id;
  if(!energyByMeter.has(meter))energyByMeter.set(meter,[]);
  energyByMeter.get(meter).push(row);
 }
 for(const [meter,rows] of energyByMeter){
  const ordered=rows.filter(r=>r.payload.period_start&&r.payload.period_end)
   .sort((a,b)=>dateMicros(a.payload.period_start)-dateMicros(b.payload.period_start));
  let furthest=null;
  for(const row of ordered){
   if(furthest&&dateMicros(row.payload.period_start)<dateMicros(furthest.payload.period_end)){
    conflicts.push({kind:'overlapping_meter_intervals',domain:'energy',meter_id:meter,record_ids:[furthest.id,row.id]});
   }
   if(!furthest||dateMicros(row.payload.period_end)>dateMicros(furthest.payload.period_end))furthest=row;
  }
 }
 const deduped=new Map();
 for(const item of conflicts)deduped.set(item.kind+'|'+(item.key||item.meter_id),item);
 return[...deduped.values()];
}

function rowsForState(state){
 if(['synthetic_fixture','synthetic_fixture_with_user_edits'].includes(state.data_basis)){
  const i=state.inputs||{},energy=state.assumptions?.synthetic_energy_projection;
  return{
   supply:i.stock_units==null?[]:[{id:'fixture:order:01',domain:'supply',sku:'fixture-sku',stock:i.stock_units,daily:i.daily_use_units,lead:i.days_until_delivery,delay:i.delay_assumption_days,orderQty:state.order_quantity??100}],
   invoices:i.invoice_amount==null?[]:[{id:'fixture:invoice:01',domain:'procurement',amount:i.invoice_amount,paid:i.paid_amount,currency:'MYR',approved:state.invoice_approved??false,ledgerComplete:i.payment_ledger_complete,cash:i.cash_available}],
   tasks:i.service_elapsed_hours==null?[]:[{id:'fixture:task:01',domain:'service',ticket_id:'fixture-ticket',elapsed:i.service_elapsed_hours,target:i.service_target_hours,status:'open',remaining:state.service_remaining_hours??null,authorization:state.resource_authorization??null,available:state.resource_available??null,rest:state.resource_rest_ok??null}],
   waste:[
    ...(i.food_units==null?[]:[{id:'fixture:batch:01',domain:'energy',units:i.food_units,daily:i.food_daily_use_units,expiry:i.days_until_expiry,unit:'units'}]),
    ...Object.entries(state.assumptions?.waste_inventory||{}).map(([id,value])=>({id,domain:'energy',...value,unit:'kg'}))
   ],
   energy:energy?[{id:energy.record_id,domain:'energy',meter_id:energy.record_id,daily_kwh:energy.daily_kwh,baseline_daily_kwh:energy.baseline_daily_kwh}]:[],
   conflicts:[]
  };
 }
 const records=Array.isArray(state.records)?state.records:[],conflicts=[...(state.conflicts||[]),...detectStateConflicts(records)];
 const conflictIds=new Set(conflicts.flatMap(item=>item.record_ids||[]));
 const active=domain=>latestBy(records.filter(row=>row.domain===domain),row=>{
  const p=row.payload;
  if(domain==='supply')return p.sku;
  if(domain==='procurement')return JSON.stringify([p.vendor,p.invoice_id,p.currency]);
  if(domain==='service')return p.ticket_id;
  return row.id;
 },row=>dateMicros(row.occurred_at),conflicts).filter(row=>!conflictIds.has(row.id));
 const conditionByRecord=new Map();
 for(const mapping of state.evidence_mappings||[])if(mapping.variable==='delay_assumption_days')conditionByRecord.set(mapping.target_record_id,mapping.value);
 const supplies=active('supply'),invoices=active('procurement'),tasks=active('service'),energyRows=(state.records||[]).filter(row=>row.domain==='energy');
 const worldMicros=state.clocks?.world_time?dateMicros(state.clocks.world_time):Infinity;
 const completed=energyRows.filter(row=>row.payload.period_start&&row.payload.period_end&&dateMicros(row.payload.period_end)<=worldMicros);
 const overlapMeters=new Set(conflicts.filter(x=>x.kind==='overlapping_meter_intervals').map(x=>x.meter_id));
 const meterRows=latestBy(completed.filter(row=>!overlapMeters.has(row.payload.meter_id)),row=>row.payload.meter_id,row=>dateMicros(row.payload.period_end),conflicts);
 const waste=energyRows.filter(row=>Number.isFinite(state.assumptions?.waste_inventory?.[row.id]?.units))
  .map(row=>({id:row.id,domain:'energy',...state.assumptions.waste_inventory[row.id],unit:'kg'}));
 return{
  supply:supplies.map(row=>{const p=row.payload;return{id:row.id,domain:'supply',sku:p.sku,stock:p.on_hand,daily:p.daily_demand,lead:p.lead_time_days,delay:conditionByRecord.get(row.id)??state.assumptions?.delay_assumption_days,orderQty:p.ordered_qty,occurred_at:row.occurred_at}}),
  invoices:invoices.map(row=>{const p=row.payload;return{id:row.id,domain:'procurement',invoice_id:p.invoice_id,amount:p.amount,paid:Number.isFinite(p.paid_amount)?p.paid_amount:(state.assumptions?.payment_ledger_complete===true?0:null),currency:p.currency,approved:p.approval_status==='approved'?true:p.approval_status==='rejected'?false:null,ledgerComplete:state.assumptions?.payment_ledger_complete,cash:state.assumptions?.cash_available,occurred_at:row.occurred_at}}),
  tasks:tasks.filter(row=>['open','in_progress'].includes(row.payload.status)).map(row=>{const p=row.payload;return{id:row.id,domain:'service',ticket_id:p.ticket_id,elapsed:0,target:p.sla_hours,status:p.status,remaining:state.assumptions?.service_remaining_hours??null,authorization:p.authorization_status==='approved'?true:(state.assumptions?.service_authorization_confirmed??null),available:p.availability_status==='available'?true:(state.assumptions?.service_available??null),rest:p.rest_ok??state.assumptions?.service_rest_ok??null,occurred_at:row.occurred_at}}),
  waste,
  energy:meterRows.map(row=>{const p=row.payload,days=(dateMicros(p.period_end)-dateMicros(p.period_start))/86400000000;return{id:row.id,domain:'energy',meter_id:p.meter_id,daily_kwh:days>0?p.kwh/days:null,baseline_daily_kwh:days>0&&Number.isFinite(p.baseline_kwh)?p.baseline_kwh/days:null,occurred_at:row.occurred_at}}),
  conflicts
 };
}

function targetRows(effect,rows){
 if(Array.isArray(effect?.record_ids)){
  if(!effect.record_ids.length||new Set(effect.record_ids).size!==effect.record_ids.length)return null;
  const targets=rows.filter(row=>effect.record_ids.includes(row.id));
  return targets.length===effect.record_ids.length?targets:null;
 }
 return rows.length===1?rows:[];
}
function statusResult(status,checks=[]){return{status,checks}}
function spendCheck(world,cost,currency='MYR'){
 if(currency!=='MYR')return{status:'indeterminate',check:{constraint:'cost_currency',status:'unknown',currency}};
 if(cost===0)return{status:'feasible',check:{constraint:'action_cost',status:'passed',required:0,unit:'MYR'}};
 const available=world.cashAvailable,budget=world.budgetRemaining;
 if(!Number.isFinite(available))return{status:'indeterminate',check:{constraint:'available_cash',status:'unknown'}};
 if(!Number.isFinite(budget))return{status:'indeterminate',check:{constraint:'cash_budget',status:'unknown'}};
 if(Number.isFinite(available)&&cost>available)return{status:'infeasible',check:{constraint:'available_cash',status:'violated',available,required:cost,unit:'MYR'}};
 if(Number.isFinite(budget)&&cost>budget)return{status:'infeasible',check:{constraint:'cash_budget',status:'violated',available:budget,required:cost,unit:'MYR'}};
 return{status:'feasible',check:{constraint:'available_cash_and_action_budget',status:'passed',available_cash:available,action_budget:budget,required:cost,unit:'MYR'}};
}
function conflictAffects(rows,domains){
 return rows.conflicts.filter(item=>domains.includes(item.domain)).length>0;
}
function actionFeasibility(actionId,world,assumptions,constraints,usedActions=new Set()){
 if(!actionById.has(actionId))throw new ValidationError('Unsupported FR12 action');
 if(usedActions.has(actionId)&&actionId!=='no_action')return statusResult('infeasible',[{constraint:'one_time_action',status:'violated',action_id:actionId}]);
 const rows={...world.rows,supply:world.supply,invoices:world.invoices,tasks:world.tasks,waste:world.waste,energy:world.energy};
 if(actionId==='no_action')return statusResult('feasible',[]);
 if(actionId==='verify_eta')return rows.supply.length?statusResult('feasible',[{constraint:'supply_record',status:'present'}]):statusResult('unsupported',[{constraint:'supply_record',status:'missing'}]);
 if(actionId==='verify_documents')return rows.invoices.length?statusResult('feasible',[{constraint:'invoice_record',status:'present'}]):statusResult('unsupported',[{constraint:'invoice_record',status:'missing'}]);
 if(actionId==='first_expiry_first_out')return statusResult('unsupported',[{constraint:'batch_level_expiry_state',status:'unsupported',reason:'Current D1 records do not encode inventory lots.'}]);
 if(actionId==='expedite_delivery'||actionId==='increase_buffer'){
  if(conflictAffects(rows,['supply']))return statusResult('indeterminate',[{constraint:'supply_record_conflict',status:'unknown'}]);
  if(!rows.supply.length)return statusResult('unsupported',[{constraint:'supply_state',status:'missing'}]);
  if(rows.supply.some(row=>![row.stock,row.daily,row.lead,row.orderQty].every(Number.isFinite)||row.daily<=0))return statusResult('indeterminate',[{constraint:'complete_supply_state',status:'unknown'}]);
  const effect=assumptions.actions?.[actionId];if(!effect)return statusResult('indeterminate',[{constraint:'action_effect_and_cost',status:'unknown'}]);
  const targets=targetRows(effect,rows.supply);if(targets===null)return statusResult('indeterminate',[{constraint:'target_record_ids',status:'unknown'}]);if(!targets.length)return statusResult('indeterminate',[{constraint:'target_record_ids',status:'required_for_multiple_records'}]);
  if(actionId==='expedite_delivery'){
   const route=constraints.route_passability;
   if(route===false)return statusResult('infeasible',[{constraint:'route_passability',status:'violated'}]);
   if(route!==true)return statusResult('indeterminate',[{constraint:'route_passability',status:'unknown'}]);
  }else{
   const capacity=constraints.storage_capacity_units;
   if(!Number.isFinite(capacity))return statusResult('indeterminate',[{constraint:'storage_capacity_units',status:'unknown'}]);
   const additional=effect.units*targets.length,current=targets.reduce((sum,row)=>sum+row.stock,0);
   if(current+additional>capacity)return statusResult('infeasible',[{constraint:'storage_capacity_units',status:'violated',current,additional,capacity,unit:'units'}]);
  }
  const spend=spendCheck(world,effect.cost,effect.currency);if(spend.status!=='feasible')return statusResult(spend.status,[spend.check]);
  return statusResult('feasible',[spend.check,{constraint:actionId==='expedite_delivery'?'route_passability':'storage_capacity_units',status:'passed'}]);
 }
 if(actionId==='pay_approved_invoice'){
  if(!rows.invoices.length)return statusResult('unsupported',[{constraint:'invoice_state',status:'missing'}]);
  if(rows.invoices.some(row=>row.approved===false))return statusResult('infeasible',[{constraint:'invoice_approval',status:'violated'}]);
  if(rows.invoices.some(row=>row.approved!==true||!Number.isFinite(row.amount)||!Number.isFinite(row.paid)||row.ledgerComplete!==true))return statusResult('indeterminate',[{constraint:'invoice_approval_or_ledger',status:'unknown'}]);
  if(new Set(rows.invoices.map(row=>row.currency)).size!==1||rows.invoices[0].currency!=='MYR')return statusResult('indeterminate',[{constraint:'currency_conversion',status:'unknown'}]);
  const amount=rows.invoices.reduce((sum,row)=>sum+Math.max(0,row.amount-row.paid),0),spend=spendCheck(world,amount,'MYR');
  return spend.status==='feasible'?statusResult('feasible',[spend.check,{constraint:'invoice_approval_and_ledger',status:'passed'}]):statusResult(spend.status,[spend.check]);
 }
 if(actionId==='qualified_reassignment'){
  if(!rows.tasks.length)return statusResult('unsupported',[{constraint:'open_task',status:'missing'}]);
  if(rows.tasks.some(row=>row.authorization===false||row.available===false||row.rest===false))return statusResult('infeasible',[{constraint:'qualification_availability_rest',status:'violated'}]);
  if(rows.tasks.some(row=>row.authorization!==true||row.available!==true||row.rest!==true)||constraints.qualified_role_available!==true)return statusResult('indeterminate',[{constraint:'qualification_availability_rest',status:'unknown'}]);
  if(constraints.no_resource_double_allocation===false)return statusResult('infeasible',[{constraint:'no_resource_double_allocation',status:'violated'}]);
  if(constraints.no_resource_double_allocation!==true)return statusResult('indeterminate',[{constraint:'no_resource_double_allocation',status:'unknown'}]);
  const effect=assumptions.actions?.qualified_reassignment;if(!effect)return statusResult('indeterminate',[{constraint:'reassignment_effect',status:'unknown'}]);
  const ids=effect.task_ids,resourceId=effect.resource_id;
  if(typeof resourceId!=='string'||!resourceId||!Array.isArray(ids)||!ids.length||new Set(ids).size!==ids.length)return statusResult('indeterminate',[{constraint:'resource_and_task_assignment',status:'unknown'}]);
  const selected=rows.tasks.filter(row=>ids.includes(row.id));if(selected.length!==ids.length)return statusResult('unsupported',[{constraint:'selected_task_records',status:'missing'}]);
  if(selected.some(row=>!Number.isFinite(row.remaining)))return statusResult('indeterminate',[{constraint:'remaining_task_hours',status:'unknown'}]);
  const allocation=(constraints.resource_capacities||[]).find(item=>item.resource_id===resourceId);
  if(!allocation||!Number.isInteger(allocation.capacity))return statusResult('indeterminate',[{constraint:'resource_capacity',status:'unknown',resource_id:resourceId}]);
  const allocated=new Set(allocation.allocated_task_ids||[]);
  if(ids.some(id=>allocated.has(id))||allocated.size+ids.length>allocation.capacity)return statusResult('infeasible',[{constraint:'resource_capacity_or_duplicate_allocation',status:'violated',resource_id:resourceId,capacity:allocation.capacity,allocated:allocated.size,requested:ids.length}]);
  const spend=spendCheck(world,effect.cost,effect.currency);if(spend.status!=='feasible')return statusResult(spend.status,[spend.check]);
  return statusResult('feasible',[spend.check,{constraint:'resource_capacity',status:'passed',resource_id:resourceId,capacity:allocation.capacity}]);
 }
 if(actionId==='reduce_waste'){
  if(!rows.waste.length)return statusResult('unsupported',[{constraint:'waste_inventory',status:'missing'}]);
  const effect=assumptions.actions?.waste_reduction;if(!effect||!Number.isFinite(effect.fraction)||effect.fraction<=0)return statusResult('indeterminate',[{constraint:'waste_reduction_basis',status:'unknown'}]);
  if(rows.waste.some(row=>![row.units,row.daily,row.expiry].every(Number.isFinite)))return statusResult('indeterminate',[{constraint:'waste_inventory_flows',status:'unknown'}]);
  return statusResult('feasible',[{constraint:'waste_reduction_basis',status:'explicit_assumption'}]);
 }
 if(actionId==='reduce_energy_consumption'){
  if(!rows.energy.length)return statusResult('unsupported',[{constraint:'energy_meter_state',status:'missing'}]);
  if(!world.energyProjectionSupported)return statusResult('indeterminate',[{constraint:'energy_persistence_assumption',status:'unknown'}]);
  const effect=assumptions.actions?.energy_reduction;if(!effect)return statusResult('indeterminate',[{constraint:'energy_reduction_effect',status:'unknown'}]);
  if(rows.energy.some(row=>!Number.isFinite(row.daily_kwh)))return statusResult('indeterminate',[{constraint:'energy_rate',status:'unknown'}]);
  const spend=spendCheck(world,effect.cost,effect.currency);if(spend.status!=='feasible')return statusResult(spend.status,[spend.check]);
  return statusResult('feasible',[spend.check,{constraint:'energy_persistence_assumption',status:'confirmed'}]);
 }
 return statusResult('unsupported',[]);
}

function makeWorld(state,model,constraints,seed){
 const rows=rowsForState(state),baseAssumptions=state.assumptions??(isSynthetic(state)?model.synthetic_assumptions:{});
 if(!baseAssumptions)throw new ValidationError('Simulation assumptions are missing');
 const inferredMarginals=isSynthetic(state)?model.transition_model?.marginals||model.synthetic_assumptions?.disturbances||{}:{};
 const assumptions={...baseAssumptions,disturbances:{...inferredMarginals,...(baseAssumptions.disturbances||{})}};
 const energyProjectionSupported=isSynthetic(state)||assumptions.energy_persistence_confirmed===true;
 const random=rng(seed^0x5a5a0f0f),disturbance=disturbanceFor(assumptions,random,false,weightedChoice(assumptions.disturbances?.delay_add_days,random,0));
 const delay=disturbance.delay_add_days;
 const supply=rows.supply.map(row=>({
  ...row,stock:Number.isFinite(row.stock)?row.stock:null,daily:Number.isFinite(row.daily)?row.daily:null,
  arrivalDay:Number.isFinite(row.lead)&&Number.isFinite(row.delay??0)?Math.max(0,row.lead+(row.delay??0)+delay):null,
  inbound:Number.isFinite(row.orderQty)?row.orderQty:null,arrived:false
 }));
 const invoices=rows.invoices.map(row=>({...row,paid:Number.isFinite(row.paid)?row.paid:null}));
 const tasks=rows.tasks.map(row=>({...row,waitHours:0,done:false}));
 const waste=rows.waste.map(row=>({...row,remaining:Number.isFinite(row.units)?row.units:null,reduction:0}));
 const energy=rows.energy.map(row=>({...row,used:0,baseline:0,rate:Number.isFinite(row.daily_kwh)?row.daily_kwh:null}));
 const cashAvailable=Number.isFinite(assumptions.cash_available)?assumptions.cash_available:null;
 const budget=Number.isFinite(constraints.cash_budget?.value)?constraints.cash_budget.value:null;
 return{
  day:0,rows,assumptions,constraints,supply,invoices,tasks,waste,energy,energyProjectionSupported,
  cashAvailable,budgetRemaining:budget,actionCost:0,actionCostKnown:true,usedActions:[],disturbance,
  resourceUsage:Object.fromEntries((constraints.resource_capacities||[]).map(x=>[x.resource_id,(x.allocated_task_ids||[]).length]))
 };
}

function scopeRows(effect,rows){
 if(Array.isArray(effect?.record_ids))return rows.filter(row=>effect.record_ids.includes(row.id));
 return rows;
}
function applyAction(world,actionId){
 const effect=world.assumptions.actions||{},events=[],used=new Set(world.usedActions);
 const check=actionFeasibility(actionId,world,world.assumptions,world.constraints,used);
 if(check.status!=='feasible')return{check,events:[]};
 if(actionId==='no_action')return{check,events:[]};
 let cost=0,affected=[];
 if(actionId==='expedite_delivery'){
  const targets=scopeRows(effect.expedite_delivery,world.supply);
  for(const row of targets){row.arrivalDay=Math.max(world.day,row.arrivalDay-effect.expedite_delivery.days_saved);affected.push(row.id)}
  cost=effect.expedite_delivery.cost;
 }
 if(actionId==='increase_buffer'){
  const targets=scopeRows(effect.increase_buffer,world.supply);
  for(const row of targets){row.stock+=effect.increase_buffer.units;affected.push(row.id)}
  cost=effect.increase_buffer.cost;
 }
 if(actionId==='pay_approved_invoice'){
  for(const row of world.invoices){const due=Math.max(0,row.amount-row.paid);row.paid+=due;affected.push(row.id);cost+=due}
 }
 if(actionId==='qualified_reassignment'){
  const reassignment=effect.qualified_reassignment;
  for(const id of reassignment.task_ids){const row=world.tasks.find(x=>x.id===id);row.remaining=Math.max(0,row.remaining-reassignment.hours_saved);affected.push(row.id)}
  world.resourceUsage[reassignment.resource_id]=(world.resourceUsage[reassignment.resource_id]||0)+reassignment.task_ids.length;
  cost=reassignment.cost;
 }
 if(actionId==='reduce_waste'){
  for(const row of world.waste){row.reduction=effect.waste_reduction.fraction;affected.push(row.id)}
 }
 if(actionId==='reduce_energy_consumption'){
  for(const row of world.energy){row.rate*=1-effect.energy_reduction.fraction;affected.push(row.id)}
  cost=effect.energy_reduction.cost;
 }
 if(cost>0){
  world.actionCost+=cost;
  if(Number.isFinite(world.cashAvailable))world.cashAvailable-=cost;
  if(Number.isFinite(world.budgetRemaining))world.budgetRemaining-=cost;
 }
 world.usedActions.push(actionId);
 events.push({type:'action_applied',action_id:actionId,cost_myr:round(cost,4),record_refs:affected});
 return{check,events};
}

function disturbanceFor(assumptions,random,expected=false,delayAdd=0){
 const pick=(key,fallback)=>expected?expectedChoice(assumptions.disturbances?.[key],fallback):weightedChoice(assumptions.disturbances?.[key],random,fallback);
 return{
  demand_multiplier:pick('demand_multiplier',1),delay_add_days:delayAdd,
  processing_multiplier:pick('processing_multiplier',1),waste_use_multiplier:pick('waste_use_multiplier',1),
  energy_use_multiplier:pick('energy_use_multiplier',1)
 };
}
function measure(world){
 let supplyGap=0,cashGap=0,wait=0,wasteSurplus=0,energyUsed=0,energyOverBaseline=0;
 const supplyOK=world.supply.length>0&&world.supply.every(row=>Number.isFinite(row.stock)&&Number.isFinite(row.daily)&&row.daily>0&&Number.isFinite(row.arrivalDay)&&Number.isFinite(row.inbound));
 if(supplyOK)for(const row of world.supply){const cover=row.stock/(row.daily*world.disturbance.demand_multiplier);supplyGap+=Math.max(0,(row.arrivalDay===null?0:Math.max(0,row.arrivalDay-world.day))-cover)}
 const ledgerOK=world.invoices.length>0&&world.invoices.every(row=>row.currency==='MYR'&&Number.isFinite(row.amount)&&Number.isFinite(row.paid)&&row.ledgerComplete===true)&&Number.isFinite(world.assumptions.cash_available);
 if(ledgerOK){const due=world.invoices.reduce((sum,row)=>sum+Math.max(0,row.amount-row.paid),0);cashGap=Math.max(0,due-world.cashAvailable)}
 const serviceOK=world.tasks.length>0&&world.tasks.every(row=>Number.isFinite(row.remaining));
 if(serviceOK)wait=world.tasks.reduce((sum,row)=>sum+row.waitHours,0);
 const wasteUnits=new Set(world.waste.map(row=>row.unit||'units'));
 const wasteOK=world.waste.length>0&&wasteUnits.size===1&&world.waste.every(row=>Number.isFinite(row.remaining)&&Number.isFinite(row.daily)&&Number.isFinite(row.expiry));
 if(wasteOK)for(const row of world.waste)if(world.day>=row.expiry)wasteSurplus+=row.remaining*(1-row.reduction);
 const energyOK=world.energyProjectionSupported&&world.energy.length>0&&world.energy.every(row=>Number.isFinite(row.rate));
 if(energyOK)for(const row of world.energy){energyUsed+=row.used;energyOverBaseline+=row.used-row.baseline}
 const metrics={
  fulfilment_gap_days:metric(supplyGap,'day',supplyOK?'available':'insufficient_data'),
  cash_gap_myr:metric(cashGap,'MYR',ledgerOK?'available':'insufficient_data'),
  processing_wait_hours:metric(wait,'hour',serviceOK?'available':'insufficient_data'),
  expiry_surplus_units:metric(wasteSurplus,wasteUnits.size===1?[...wasteUnits][0]:'unknown',wasteOK?'available':'insufficient_data'),
  energy_consumed_kwh:metric(energyUsed,'kWh',energyOK?'available':'insufficient_data'),
  energy_over_baseline_kwh:metric(energyOverBaseline,'kWh',energyOK&&world.energy.every(row=>Number.isFinite(row.baseline_daily_kwh))?'available':'insufficient_data'),
  action_cost_myr:metric(world.actionCost,'MYR',world.actionCostKnown?'available':'insufficient_data')
 };
 return metrics;
}

function advance(world,random,events=[],expected=false){
 world.day++;
 world.disturbance=disturbanceFor(world.assumptions,random,expected,world.disturbance.delay_add_days);
 for(const row of world.supply){
  if(!Number.isFinite(row.stock)||!Number.isFinite(row.daily))continue;
  row.stock=Math.max(0,row.stock-row.daily*world.disturbance.demand_multiplier);
  if(!row.arrived&&Number.isFinite(row.arrivalDay)&&world.day>=row.arrivalDay){
   row.stock+=row.inbound;row.arrived=true;events.push({type:'delivery_arrived',record_refs:[row.id],quantity:row.inbound,unit:'units'});
  }
 }
 for(const row of world.tasks){
  if(row.done||!Number.isFinite(row.remaining))continue;
  const progressed=Math.min(24*world.disturbance.processing_multiplier,Math.max(0,row.remaining));
  row.waitHours+=progressed;row.remaining=Math.max(0,row.remaining-progressed);
  if(row.remaining===0){row.done=true;events.push({type:'task_completed',record_refs:[row.id]})}
 }
 for(const row of world.waste){
  if(Number.isFinite(row.remaining)&&Number.isFinite(row.daily))row.remaining=Math.max(0,row.remaining-row.daily*world.disturbance.waste_use_multiplier);
 }
 for(const row of world.energy){
  if(Number.isFinite(row.rate)){row.used+=row.rate*world.disturbance.energy_use_multiplier;if(Number.isFinite(row.baseline_daily_kwh))row.baseline+=row.baseline_daily_kwh}
 }
}

function snapshot(world){
 return{
  supply:world.supply.map(row=>({record_id:row.id,stock:round(row.stock,4),on_hand:round(row.stock,4),inbound_remaining:row.arrived?0:row.inbound,arrival_day:row.arrivalDay===null?null:round(Math.max(0,row.arrivalDay-world.day),4),unit:'units'})),
  cash:{available_myr:Number.isFinite(world.cashAvailable)?round(world.cashAvailable,4):null,action_budget_remaining_myr:Number.isFinite(world.budgetRemaining)?round(world.budgetRemaining,4):null},
  invoices:world.invoices.map(row=>({record_id:row.id,paid_myr:round(row.paid,4),outstanding_myr:round(Math.max(0,row.amount-row.paid),4),currency:row.currency})),
  tasks:world.tasks.map(row=>({record_id:row.id,remaining_hours:Number.isFinite(row.remaining)?round(row.remaining,4):null,status:row.done?'completed':'open'})),
  waste:world.waste.map(row=>({record_id:row.id,remaining:round(row.remaining,4),unit:row.unit||'units'})),
  energy:world.energy.map(row=>({record_id:row.id,used_kwh:round(row.used,4),baseline_kwh:round(row.baseline,4),unit:'kWh'})),
  cumulative_action_cost_myr:round(world.actionCost,4)
 };
}
function cloneWorld(world){return clone(world)}
function metricValues(metrics,names){return names.map(name=>metrics[name]?.status==='available'?metrics[name].value:null)}
function stateKey(metrics){
 return DEFAULT_OBJECTIVES.map(name=>{
  const value=metrics[name]?.status==='available'?metrics[name].value:null;
  if(!Number.isFinite(value))return'x';
  return value===0?'0':value<1?'1':value<5?'2':'3';
 }).join('|');
}
export {stateKey};

function objectiveVector(metrics,names){
 const values=metricValues(metrics,names);
 return values.every(Number.isFinite)?values:null;
}
function dominates(a,b,direction='min'){
 let strict=false;
 for(let i=0;i<a.length;i++){
  const better=direction==='max'?a[i]>b[i]+1e-9:a[i]<b[i]-1e-9;
  const worse=direction==='max'?a[i]<b[i]-1e-9:a[i]>b[i]+1e-9;
  if(worse)return false;
  if(better)strict=true;
 }
 return strict;
}
export function paretoFront(vectors,direction='min'){
 const out=[];
 for(const vector of vectors){
  if(out.some(item=>dominates(item,vector,direction)||item.every((value,index)=>Math.abs(value-vector[index])<1e-9)))continue;
  for(let i=out.length-1;i>=0;i--)if(dominates(vector,out[i],direction))out.splice(i,1);
  out.push(vector);
 }
 return out;
}

function actionCheck(world,actionId,used){
 return actionFeasibility(actionId,world,world.assumptions,world.constraints,used);
}
function feasibleCandidates(world,actionIds,used){
 return ['no_action',...actionIds.filter(id=>id!=='no_action')].filter(id=>actionCheck(world,id,used).status==='feasible');
}
function chooseFromPareto(ids,vectors,random,direction='max'){
 if(!ids.length)return'no_action';
 const front=paretoFront(vectors,direction),selected=ids.filter((id,index)=>front.some(vector=>vector.every((value,k)=>Math.abs(value-vectors[index][k])<1e-9)));
 return selected.length?selected[Math.floor(random()*selected.length)]:'no_action';
}
function chooseRuleAction(world,metrics,actionIds,used){
 const feasible=new Set(feasibleCandidates(world,actionIds,used));
 if(metrics.fulfilment_gap_days?.status==='available'&&metrics.fulfilment_gap_days.value>0&&feasible.has('expedite_delivery'))return'expedite_delivery';
 if(metrics.processing_wait_hours?.status==='available'&&metrics.processing_wait_hours.value>0&&feasible.has('qualified_reassignment'))return'qualified_reassignment';
 if(metrics.expiry_surplus_units?.status==='available'&&metrics.expiry_surplus_units.value>0&&feasible.has('reduce_waste'))return'reduce_waste';
 return'no_action';
}
function choosePlannerAction(world,metrics,actionIds,used,random,objectives){
 const baseline=cloneWorld(world),baselineEvents=[];
 advance(baseline,()=>0.5,baselineEvents,true);
 const baseValues=objectiveVector(measure(baseline),objectives);
 if(!baseValues)return'no_action';
 const ids=['no_action'],vectors=[objectives.map(()=>0)];
 for(const actionId of actionIds){
  if(actionId==='no_action'||used.has(actionId)||actionCheck(world,actionId,used).status!=='feasible')continue;
  const trial=cloneWorld(world),applied=applyAction(trial,actionId);
  if(applied.check.status!=='feasible')continue;
  advance(trial,()=>0.5,[],true);
  const values=objectiveVector(measure(trial),objectives);
  if(!values)continue;
  const improvement=values.map((value,index)=>baseValues[index]-value);
  if(improvement.some(value=>value>1e-9)){ids.push(actionId);vectors.push(improvement)}
 }
 return chooseFromPareto(ids,vectors,random,'max');
}
function chooseRlAction(world,metrics,actionIds,used,random,model){
 const key=stateKey(metrics),ids=[],vectors=[];
 for(const actionId of feasibleCandidates(world,actionIds,used)){
  if(actionId!=='no_action'&&used.has(actionId))continue;
  const q=model.policy?.q_table?.[key+'|'+actionId]||[];
  for(const vector of q)if(Array.isArray(vector)&&vector.length===DEFAULT_OBJECTIVES.length&&vector.every(Number.isFinite)){ids.push(actionId);vectors.push(vector)}
 }
 if(!ids.length)return'no_action';
 return chooseFromPareto(ids,vectors,random,'max');
}
function choosePolicyAction(policyId,world,metrics,actionIds,used,random,model,objectives){
 if(policyId==='no_action')return{action_id:'no_action',reason:'fixed_baseline'};
 if(policyId==='rule_based')return{action_id:chooseRuleAction(world,metrics,actionIds,used),reason:'explicit_rule_set'};
 if(policyId==='simple_planning')return{action_id:choosePlannerAction(world,metrics,actionIds,used,random,objectives),reason:'one_day_pareto_lookahead'};
 if(policyId==='pareto_q')return{action_id:chooseRlAction(world,metrics,actionIds,used,random,model),reason:'trained_vector_q_frontier'};
 if(policyId==='random_training'){
  const feasible=feasibleCandidates(world,actionIds,used);
  return{action_id:feasible[Math.floor(random()*feasible.length)]||'no_action',reason:'offline_exploration'};
 }
 return{action_id:'no_action',reason:'unsupported_policy'};
}

function normalizedObjectives(objectives){
 if(objectives===undefined)return DEFAULT_OBJECTIVES.map(metric=>({metric,direction:'minimize',unit:FR12_METRICS[metric].unit}));
 if(!Array.isArray(objectives)||objectives.length<1||objectives.length>Object.keys(FR12_METRICS).length)throw new ValidationError('objectives must be a non-empty list of supported metrics');
 const seen=new Set(),out=[];
 for(const item of objectives){
  const metricName=typeof item==='string'?item:item?.metric;
  const direction=typeof item==='string'?undefined:item?.direction;
  if(!FR12_METRICS[metricName]||seen.has(metricName))throw new ValidationError('objectives must be unique supported metrics');
  if(direction!==undefined&&direction!==FR12_METRICS[metricName].direction)throw new ValidationError('Only the documented minimize direction is supported for FR12 metrics');
  seen.add(metricName);out.push({metric:metricName,direction:FR12_METRICS[metricName].direction,unit:FR12_METRICS[metricName].unit});
 }
 return out;
}
function normalizedConstraints(raw={}){
 const input=raw||{};
 if(!input||typeof input!=='object'||Array.isArray(input))throw new ValidationError('constraints must be an object');
 const allowed=['data_basis','cash_budget','route_passability','storage_capacity_units','qualified_role_available','no_resource_double_allocation','resource_capacities'];
 if(Object.keys(input).some(key=>!allowed.includes(key)))throw new ValidationError('Unsupported FR12 constraint');
 const boolOrUnknown=(key)=>input[key]===true||input[key]===false?input[key]:null;
 let cash_budget=null;
 if(input.cash_budget!==undefined&&input.cash_budget!==null){
  const value=finiteNumber(input.cash_budget.value,'cash_budget.value');
  if(input.cash_budget.unit!=='MYR'||value<0)throw new ValidationError('cash_budget must be a non-negative MYR amount');
  cash_budget={value,unit:'MYR',basis:input.cash_budget.basis||'user_supplied_constraint'};
 }
 let storage_capacity_units=null;
 if(input.storage_capacity_units!==undefined&&input.storage_capacity_units!==null){storage_capacity_units=finiteNumber(input.storage_capacity_units,'storage_capacity_units');if(storage_capacity_units<0)throw new ValidationError('storage_capacity_units must be non-negative')}
 const resource_capacities=input.resource_capacities??[];
 if(!Array.isArray(resource_capacities)||resource_capacities.length>20)throw new ValidationError('resource_capacities must be a list of at most 20 resources');
 const resourceIds=new Set();
 const capacities=resource_capacities.map(item=>{
  if(!item||typeof item!=='object'||Array.isArray(item)||Object.keys(item).some(key=>!['resource_id','capacity','allocated_task_ids'].includes(key)))throw new ValidationError('Invalid resource capacity constraint');
  const resource_id=String(item.resource_id||'').trim(),capacity=safeInt(item.capacity,0,1000,'resource capacity'),allocated_task_ids=item.allocated_task_ids??[];
  if(!resource_id||resource_id.length>200||resourceIds.has(resource_id))throw new ValidationError('resource_id values must be unique non-empty identifiers');
  resourceIds.add(resource_id);
  if(!Array.isArray(allocated_task_ids)||allocated_task_ids.some(id=>typeof id!=='string'||!id)||new Set(allocated_task_ids).size!==allocated_task_ids.length)throw new ValidationError('allocated_task_ids must be unique string identifiers');
  return{resource_id,capacity,allocated_task_ids:[...allocated_task_ids]};
 });
 return{
  cash_budget,route_passability:boolOrUnknown('route_passability'),storage_capacity_units,
  qualified_role_available:boolOrUnknown('qualified_role_available'),
  no_resource_double_allocation:boolOrUnknown('no_resource_double_allocation'),
  resource_capacities:capacities
 };
}

function onePath(state,{firstActionId=null,policyId='no_action',candidateActions=[],objectives,seed,horizon,model,constraints,initialActionMode='fixed'}){
 const environment=rng(seed),decisions=rng(seed^0xa5a5f00d),world=makeWorld(state,model,constraints,seed),path=[],used=new Set();
 let selectedFirst=firstActionId,policyUnavailable=false;
 if(initialActionMode==='policy'){
  const startMetrics=measure(world),decision=choosePolicyAction(policyId,world,startMetrics,candidateActions,used,decisions,model,objectives);
  selectedFirst=decision.action_id;
  if(policyId==='pareto_q'&&decision.reason==='trained_vector_q_frontier'&&selectedFirst==='no_action'&&!model.policy?.q_table?.[stateKey(startMetrics)+'|no_action'])policyUnavailable=true;
 }
 const initialCheck=actionFeasibility(selectedFirst,world,world.assumptions,constraints,used);
 if(initialCheck.status!=='feasible')return{
  status:initialCheck.status,action_id:selectedFirst,policy_id:policyId,seed,horizon_days:horizon,feasibility:initialCheck,
  path:[],metrics:null,hard_constraint_violations:0
 };
 const first=applyAction(world,selectedFirst);
 if(selectedFirst!=='no_action')used.add(selectedFirst);
 const firstRefs=state.records?.map(row=>row.id)||[];
 path.push({
  day:0,state:snapshot(world),metrics:measure(world),disturbance:clone(world.disturbance),
  events:[{type:'first_action_selected',action_id:selectedFirst,policy_id:policyId,record_refs:first.events.flatMap(x=>x.record_refs||[]),checks:first.check.checks},...first.events],
  selected_action:{action_id:selectedFirst,phase:'first_action',policy_id:policyId,applied:true},
  record_refs:first.events.flatMap(event=>event.record_refs||[]),
  evidence_ref_indices:(state.evidence_refs||[]).map((_,index)=>index),
  evidence_mapping_refs:(state.evidence_mappings||[]).map(item=>item.review_id||item.mapping_id).filter(Boolean)
 });
 for(let day=1;day<=horizon;day++){
  const events=[];
  advance(world,environment,events,false);
  const stateAtDecision=snapshot(world),metricsAtDecision=measure(world);
  let nextAction='no_action',decision={reason:'terminal_day'},check=actionFeasibility('no_action',world,world.assumptions,constraints,used),applied={events:[]};
  if(day<horizon){
   decision=choosePolicyAction(policyId,world,metricsAtDecision,candidateActions,used,decisions,model,objectives);
   nextAction=decision.action_id;
   check=actionFeasibility(nextAction,world,world.assumptions,constraints,used);
   if(check.status!=='feasible'){
    events.push({type:'policy_action_not_applied',action_id:nextAction,reason:check.status,checks:check.checks});
    nextAction='no_action';check=actionFeasibility('no_action',world,world.assumptions,constraints,used);
   }
   applied=applyAction(world,nextAction);
   if(nextAction!=='no_action')used.add(nextAction);
   events.push({type:'follow_up_action_selected',action_id:nextAction,policy_id:policyId,reason:decision.reason,checks:check.checks},...applied.events);
  }
  path.push({
   day,state:stateAtDecision,metrics:metricsAtDecision,disturbance:clone(world.disturbance),events,
   selected_action:day<horizon?{action_id:nextAction,phase:'follow_up',policy_id:policyId,reason:decision.reason,applied:true}:{action_id:null,phase:'terminal',policy_id:policyId,applied:false},
   record_refs:events.flatMap(event=>event.record_refs||[]),
   evidence_ref_indices:(state.evidence_refs||[]).map((_,index)=>index),
   evidence_mapping_refs:(state.evidence_mappings||[]).map(item=>item.review_id||item.mapping_id).filter(Boolean)
  });
 }
 return{
  status:policyUnavailable?'unavailable_for_state':'ok',action_id:selectedFirst,policy_id:policyId,seed,horizon_days:horizon,
  feasibility:initialCheck,initial_checks:initialCheck.checks,path,metrics:path.at(-1).metrics,
  assumptions:clone(world.assumptions),constraints:clone(constraints),references:{
   record_ids:firstRefs,evidence_refs:clone(state.evidence_refs||[]),evidence_mapping_refs:(state.evidence_mappings||[]).map(item=>item.review_id||item.mapping_id).filter(Boolean)
  },hard_constraint_violations:0,
  uncertainty_basis:Object.keys(world.assumptions.disturbances||{}).length?'explicit_frozen_disturbance_distribution':'deterministic_baseline_assumptions'
 };
}

function summarizeRun(paths,objectiveItems,horizon){
 const objectiveNames=objectiveItems.map(item=>item.metric),validPaths=paths.filter(path=>path.metrics),metrics={},trajectory_quantiles=[];
 for(const name of Object.keys(FR12_METRICS)){
  const vals=validPaths.map(path=>path.metrics?.[name]).filter(item=>item?.status==='available'&&Number.isFinite(item.value)).map(item=>item.value);
  const units=new Set(validPaths.map(path=>path.metrics?.[name]).filter(item=>item?.status==='available'&&Number.isFinite(item.value)).map(item=>item.unit));
  const unit=units.size===1?[...units][0]:FR12_METRICS[name].unit;
  metrics[name]={unit,status:vals.length&&units.size===1?'available':'insufficient_data',count:vals.length,mean:vals.length?round(vals.reduce((a,b)=>a+b,0)/vals.length,4):null,min:vals.length?round(Math.min(...vals),4):null,p10:quantile(vals,.1),median:quantile(vals,.5),p90:quantile(vals,.9),max:vals.length?round(Math.max(...vals),4):null};
 }
 for(let day=0;day<=horizon;day++){
  const daily={};
  for(const name of objectiveNames){
   const vals=validPaths.map(path=>path.path[day]?.metrics?.[name]).filter(item=>item?.status==='available'&&Number.isFinite(item.value)).map(item=>item.value);
   const units=new Set(validPaths.map(path=>path.path[day]?.metrics?.[name]).filter(item=>item?.status==='available'&&Number.isFinite(item.value)).map(item=>item.unit));
   daily[name]={unit:units.size===1?[...units][0]:FR12_METRICS[name].unit,status:vals.length&&units.size===1?'available':'insufficient_data',count:vals.length,p10:quantile(vals,.1),median:quantile(vals,.5),p90:quantile(vals,.9)};
  }
  trajectory_quantiles.push({day,metrics:daily});
 }
 return{metrics,trajectory_quantiles,feasible_scenario_count:validPaths.length,objective_names:objectiveNames};
}
function representativePaths(paths,primaryMetric){
 const valid=paths.filter(path=>path.metrics&&Number.isFinite(path.metrics[primaryMetric]?.value));
 if(!valid.length)return[];
 const ordered=[...valid].sort((a,b)=>a.metrics[primaryMetric].value-b.metrics[primaryMetric].value);
 const selected=[ordered[0],ordered[Math.floor((ordered.length-1)/2)],ordered.at(-1)],seen=new Set(),out=[];
 for(let i=0;i<selected.length;i++){
  const branch=selected[i],signature=JSON.stringify(branch.path.map(point=>[point.metrics,point.selected_action?.action_id]));
  if(seen.has(signature))continue;
  seen.add(signature);
  out.push({scenario_role:out.length===0&&selected.length===1?'single_scenario':['low','median','high'][i],seed:branch.seed,first_action_id:branch.action_id,policy_id:branch.policy_id,metrics:branch.metrics,assumptions:branch.assumptions,constraints:branch.constraints,references:branch.references,path:branch.path});
 }
 if(out.length===1&&paths.length>1)out[0].scenario_role='single_outcome';
 return out;
}
function buildScenarioRun({runId,state,stateRef,stateHash,policyId,continuationPolicyId,firstActionMode,firstActionId,actions,objectives,constraints,seed,horizon,scenarios,model,modelHash}){
 const seeds=Array.from({length:scenarios},(_,index)=>(seed+Math.imul(index,GOLDEN))>>>0);
 const paths=seeds.map(pathSeed=>onePath(state,{
  firstActionId,policyId:continuationPolicyId||policyId,candidateActions:actions,objectives:objectives.map(x=>x.metric),
  seed:pathSeed,horizon,model,constraints,initialActionMode:firstActionMode
 }));
 const feasibility=paths[0]?.feasibility||{status:'insufficient_data',checks:[]};
 const summary=summarizeRun(paths,objectives,horizon);
 const runObjectives=objectives.map(item=>({...item,unit:summary.metrics[item.metric]?.status==='available'?summary.metrics[item.metric].unit:item.unit}));
 const primary=objectives.find(item=>summary.metrics[item.metric]?.status==='available')?.metric||objectives[0].metric;
 const firstActionCounts=new Map();
 for(const path of paths)if(path.action_id)firstActionCounts.set(path.action_id,(firstActionCounts.get(path.action_id)||0)+1);
 const modalFirstAction=[...firstActionCounts].sort((a,b)=>b[1]-a[1]||a[0].localeCompare(b[0]))[0]?.[0]||firstActionId;
 const run={
  schema_version:'dormathon.fr12.scenario-run.v1',run_id:runId,state_ref:stateRef,state_hash:stateHash,
  data_basis:state.data_basis,run_kind:firstActionMode==='policy'?'closed_loop_policy':'candidate_first_action',
  policy_id:policyId,continuation_policy_id:continuationPolicyId||policyId,first_action_id:firstActionId??'policy_selected',
  action_id:modalFirstAction||'policy_selected',first_action_distribution:Object.fromEntries(firstActionCounts),
  action_set:['no_action',...actions.filter(x=>x!=='no_action')],objectives:clone(runObjectives),constraints:clone(constraints),
  assumptions:clone(state.assumptions||{}),references:{record_ids:state.records?.map(row=>row.id)||[],evidence_refs:clone(state.evidence_refs||[]),evidence_mappings:clone(state.evidence_mappings||[])},
  model_version:model.model_version,policy_version:model.policy?.version||model.model_version+':pareto-q',
  simulator_version:model.simulator_version||'unknown',model_hash:modelHash,random_seed:seed,horizon_days:horizon,
  requested_scenario_count:scenarios,scenario_count:scenarios,status:paths.every(path=>path.status==='ok')?'ok':paths.every(path=>path.status!=='ok')?paths[0]?.status:'partial',
  feasibility,metrics:summary.metrics,summary:summary.metrics,trajectory_quantiles:summary.trajectory_quantiles,
  feasible_scenario_count:summary.feasible_scenario_count,representative_paths:representativePaths(paths,primary),
  uncertainty:{basis:[...new Set(paths.map(path=>path.uncertainty_basis).filter(Boolean))],seeded_scenarios_are_conditional:true,probabilities_are_operationally_calibrated:false},
  distinct_final_outcomes:new Set(paths.filter(path=>path.metrics).map(path=>stableJSON(objectives.map(item=>path.metrics[item.metric]?.value)))).size,
  hard_constraint_violations:paths.reduce((sum,path)=>sum+(path.hard_constraint_violations||0),0)
 };
 run.action_label=actionById.get(run.action_id)?.label||run.action_id.replaceAll('_',' ');
 return{run,paths};
}
function runFrontier(runs,objectiveItems){
 const eligible=runs.filter(run=>run.feasibility?.status==='feasible'&&objectiveItems.some(item=>run.metrics[item.metric]?.status==='available'));
 const dimensions=objectiveItems.filter(item=>eligible.length&&eligible.every(run=>run.metrics[item.metric]?.status==='available'));
 if(!dimensions.length)return[];
 const vectors=eligible.map(run=>dimensions.map(item=>run.metrics[item.metric].median));
 const front=paretoFront(vectors,'min');
 return eligible.filter((run,index)=>front.some(vector=>vector.every((value,j)=>Math.abs(value-vectors[index][j])<1e-9))).map(run=>run.run_id);
}
function pairedGains(paths,baselinePaths,objectiveItems){
 const bySeed=new Map(baselinePaths.map(path=>[path.seed,path]));
 const out={};
 for(const item of objectiveItems){
  const differences=[];
  for(const path of paths){
   const baseline=bySeed.get(path.seed),a=baseline?.metrics?.[item.metric],b=path.metrics?.[item.metric];
   if(a?.status==='available'&&b?.status==='available')differences.push(a.value-b.value);
  }
  out[item.metric]={unit:item.unit,count:differences.length,direction:'positive_values_are_improvements',p10:quantile(differences,.1),median:quantile(differences,.5),p90:quantile(differences,.9)};
 }
 return out;
}

export function simulatePath(state,{actionId='no_action',seed=1,horizon=14,model,continuation='no_action',constraints}={}){
 if(!model||model.schema_version!=='dormathon.fr12.world-model.v1')throw new ValidationError('FR12 world-model artifact unavailable');
 const h=safeInt(horizon,1,30,'horizon'),s=safeInt(seed,0,0xffffffff,'seed'),normalized=normalizedConstraints(constraints??state.constraints??{}),actions=FR12_ACTIONS.map(item=>item.id);
 const result=onePath(state,{firstActionId:actionId,policyId:continuation==='no_action'?'no_action':continuation,candidateActions:actions,objectives:DEFAULT_OBJECTIVES,seed:s,horizon:h,model,constraints:normalized,initialActionMode:'fixed'});
 return{...result,horizon_days:h,policy_continuation:continuation};
}

export function trainWorldModel({episodes=4000,seed=7919,baseState,assumptions}){
 const count=safeInt(episodes,100,100000,'episodes'),random=rng(seed),samples={demand_multiplier:[],delay_add_days:[],processing_multiplier:[],waste_use_multiplier:[],energy_use_multiplier:[]};
 const model={
  schema_version:'dormathon.fr12.world-model.v1',model_version:'fr12-synthetic-v2',simulator_version:'dormathon.fr12.simulator.v2',
  training:{data_basis:'simulator_generated_synthetic_episodes',episodes:count,seed,holdout_method:'separate_seeded_simulator_configurations',operational_outcomes_used:false,claims:'synthetic_simulator_fidelity_only'},
  synthetic_assumptions:clone(assumptions),state_support:{scope:'four-domain linked synthetic demonstration; operational calibration unavailable'},
  policy:{version:'fr12-vector-pareto-q-v2',algorithm:'vector_pareto_q_learning',gamma:0.95,alpha:0.12,max_vectors_per_state_action:32,actions:FR12_ACTIONS.map(item=>item.id),q_table:{}}
 };
 for(let i=0;i<count;i++){
  const run=simulatePath(baseState,{actionId:'no_action',seed:Math.floor(random()*0xffffffff),horizon:1,model});
  for(const point of run.path)for(const[key,value]of Object.entries(point.disturbance||{}))if(samples[key])samples[key].push(value);
 }
 const learned={};
 for(const[key,values]of Object.entries(samples)){
  const frequency=new Map();
  for(const value of values)frequency.set(value,(frequency.get(value)||0)+1);
  learned[key]=[...frequency].map(([value,n])=>({value,weight:n/values.length})).sort((a,b)=>a.value-b.value);
 }
 model.transition_model={
  schema_version:'dormathon.fr12.transition-model.v1',
  method:'empirical_simulator_disturbance_marginals',
  data_basis:'simulator_generated_synthetic_episodes',
  operational_outcomes_used:false,
  samples_per_variable:Object.fromEntries(Object.entries(samples).map(([key,values])=>[key,values.length])),
  marginals:learned,
  inference_scope:'Synthetic fixture states only; database-backed states require explicit frozen disturbance assumptions.'
 };
 model.synthetic_assumptions={...clone(assumptions),disturbances:learned};
 return model;
}

export function trainParetoPolicy(model,{baseState,episodes=4000,seed=9973,horizon=14}={}){
 const q=model.policy.q_table,random=rng(seed),actions=['no_action','expedite_delivery','increase_buffer','qualified_reassignment','first_expiry_first_out','reduce_waste','reduce_energy_consumption'];
 const add=(key,value)=>{q[key]=paretoFront([...(q[key]||[]),value],'max').slice(0,model.policy.max_vectors_per_state_action)};
 const maxEpisodes=safeInt(episodes,100,100000,'episodes'),maxHorizon=safeInt(horizon,1,30,'training horizon');
 for(let episode=0;episode<maxEpisodes;episode++){
  const run=simulatePath(baseState,{actionId:'no_action',seed:(seed+Math.imul(episode,GOLDEN))>>>0,horizon:maxHorizon,model,continuation:'random_training'});
  if(!run.path.length)continue;
  for(let step=0;step<run.path.length-1;step++){
  const current=run.path[step],next=run.path[step+1],action=current.selected_action?.action_id;
  if(step===0&&current.selected_action?.phase==='first_action')continue;
   if(!actions.includes(action))continue;
  const before=objectiveVector(current.metrics,DEFAULT_OBJECTIVES),after=objectiveVector(next.metrics,DEFAULT_OBJECTIVES);
   if(!before||!after)continue;
   const reward=before.map((value,index)=>value-after[index]),nextKey=stateKey(next.metrics),future=actions.flatMap(id=>q[nextKey+'|'+id]||[]);
   const targets=future.length?future.map(vector=>reward.map((value,index)=>value+model.policy.gamma*vector[index])):[reward],key=stateKey(current.metrics)+'|'+action,prior=q[key]||[];
   for(const target of targets){
    const closest=[...prior].sort((a,b)=>Math.hypot(...a.map((value,index)=>value-target[index]))-Math.hypot(...b.map((value,index)=>value-target[index])))[0];
    add(key,closest?closest.map((value,index)=>value+model.policy.alpha*(target[index]-value)):target);
   }
  }
 }
 model.training.policy_entries=Object.keys(q).length;
 return model;
}

export async function comparePolicies(state,{actions=FR12_ACTIONS.map(item=>item.id),horizon=14,scenarios=100,seed=1,model,objectives=DEFAULT_OBJECTIVES,constraints={},state_ref=null,state_hash=null}={}){
 if(!state||typeof state!=='object')throw new ValidationError('Frozen state is required');
 if(!model||model.schema_version!=='dormathon.fr12.world-model.v1')throw new ValidationError('FR12 world-model artifact unavailable');
 const n=safeInt(scenarios,1,100,'scenarios'),h=safeInt(horizon,1,30,'horizon'),base=safeInt(seed,0,0xffffffff,'seed');
 if(!Array.isArray(actions)||actions.length<1||actions.length>10||actions.some(id=>!actionById.has(id))||new Set(actions).size!==actions.length)throw new ValidationError('actions must contain 1-10 unique supported action IDs');
 const actionIds=actions.filter(id=>id!=='no_action'),objectiveItems=normalizedObjectives(objectives),constraintState=normalizedConstraints(constraints),modelHash=await sha256(stableJSON(model)),refs=state.records?.map(row=>row.id)||[],stateConflicts=rowsForState(state).conflicts;
 const scenarioSeedSchedule=Array.from({length:n},(_,index)=>(base+Math.imul(index,GOLDEN))>>>0);
 const make=(policyId,firstActionMode,firstActionId,continuationPolicyId)=>{
  const id=uid('scenariorun');
  return buildScenarioRun({runId:id,state,stateRef:state_ref,stateHash:state_hash,policyId,continuationPolicyId,firstActionMode,firstActionId,actions:actionIds,objectives:objectiveItems,constraints:constraintState,seed:base,horizon:h,scenarios:n,model,modelHash});
 };
 const paired={
  no_action:make('no_action','policy',null,'no_action'),
  rule_based:make('rule_based','policy',null,'rule_based'),
  simple_planning:make('simple_planning','policy',null,'simple_planning'),
  pareto_q:make('pareto_q','policy',null,'pareto_q')
 };
 const candidateBaseline=make('candidate_action_rollout','fixed','no_action','simple_planning');
 const candidateRuns=actionIds.map(id=>make('candidate_action_rollout','fixed',id,'simple_planning'));
 const scenario_runs=[paired.no_action.run,paired.rule_based.run,paired.simple_planning.run,paired.pareto_q.run,candidateBaseline.run,...candidateRuns.map(item=>item.run)];
 const baselinePaths=paired.no_action.paths,candidateBaselinePaths=candidateBaseline.paths;
 const reportedObjectives=objectiveItems.map(item=>({...item,unit:paired.no_action.run.metrics[item.metric]?.status==='available'?paired.no_action.run.metrics[item.metric].unit:item.unit}));
 const policyComparisons={};
 for(const id of ['rule_based','simple_planning','pareto_q'])policyComparisons[id]={run_ref:paired[id].run.run_id,gain_loss_ranges:pairedGains(paired[id].paths,baselinePaths,reportedObjectives)};
 const candidateComparisons=candidateRuns.map(item=>({action_id:item.run.first_action_id,run_ref:item.run.run_id,feasibility:item.run.feasibility,gain_loss_ranges:pairedGains(item.paths,candidateBaselinePaths,reportedObjectives)}));
 const policyFrontierRefs=runFrontier([paired.no_action.run,paired.rule_based.run,paired.simple_planning.run,paired.pareto_q.run],objectiveItems);
 const policyFrontier=scenario_runs.filter(run=>policyFrontierRefs.includes(run.run_id)).map(run=>run.policy_id);
 const candidateFrontierRefs=new Set(runFrontier([candidateBaseline.run,...candidateRuns.map(item=>item.run)],objectiveItems));
 const candidateFrontier=candidateRuns.filter(item=>candidateFrontierRefs.has(item.run.run_id)).map(item=>item.run.first_action_id);
 const baselineAvailable=objectiveItems.filter(item=>paired.no_action.run.metrics[item.metric]?.status==='available').length;
 const status=baselineAvailable===objectiveItems.length?'ok':baselineAvailable?'partial':'insufficient_data';
 const unknownConstraints=Object.entries(constraintState).filter(([,value])=>value===null).map(([key])=>key);
 const warnings=[
  state.data_basis==='database_operational_records'?'Every forecast begins from the frozen D1 records and typed state assumptions.':'Synthetic fixture paths are a demonstration only.',
  'Seeded paths are conditional scenario branches; their frequencies are not calibrated operational probabilities.',
  ...(stateConflicts.length?['Conflicting selected records were excluded from affected projections.']:[]),
  ...(unknownConstraints.length?['Unknown hard constraints keep affected actions indeterminate: '+unknownConstraints.join(', ')+'.']:[]),
  ...(!paired.pareto_q.paths.some(path=>path.status==='ok'&&path.action_id!=='no_action')?['The trained Pareto Q table has no supported first action for this state; RL is unavailable here.']:[])
 ];
 if(baselineAvailable<objectiveItems.length)warnings.push('Objectives without supported inputs remain insufficient_data and are excluded from Pareto comparisons.');
 return{
   schema_version:'dormathon.fr12.policy-comparison.v1',comparison_id:uid('comparison'),status,data_basis:state.data_basis,conflicts:stateConflicts,
  state_ref,state_hash,record_refs:refs,evidence_refs:clone(state.evidence_refs||[]),evidence_mappings:clone(state.evidence_mappings||[]),
  objectives:reportedObjectives,constraints:constraintState,assumptions:clone(state.assumptions||{}),action_set:['no_action',...actionIds],
  model_version:model.model_version,policy_version:model.policy?.version||model.model_version+':pareto-q',
  simulator_version:model.simulator_version||'unknown',model_hash:modelHash,random_seed:base,seed:base,horizon_days:h,
  scenario_count_per_action:n,scenario_seed_schedule:scenarioSeedSchedule,ranking:'pareto_frontier_no_combined_score',
  comparable_objectives:objectiveItems.filter(item=>paired.no_action.run.metrics[item.metric]?.status==='available').map(item=>item.metric),
  policy_frontier:policyFrontier,pareto_frontier:candidateFrontier,candidate_action_frontier:candidateFrontier,
  policy_runs:Object.fromEntries(Object.entries(paired).map(([id,value])=>[id,value.run.run_id])),
  candidate_action_runs:Object.fromEntries(candidateRuns.map(item=>[item.run.first_action_id,item.run.run_id])),
  baseline_results:{
   no_action_policy:{run_ref:paired.no_action.run.run_id,metrics:paired.no_action.run.metrics,feasibility:paired.no_action.run.feasibility},
   candidate_action_rollout:{run_ref:candidateBaseline.run.run_id,metrics:candidateBaseline.run.metrics,feasibility:candidateBaseline.run.feasibility}
  },
  policy_comparisons:policyComparisons,candidate_action_comparisons:candidateComparisons,
  policies:[
   {policy_id:'no_action',kind:'baseline',run_ref:paired.no_action.run.run_id},
   {policy_id:'rule_based',kind:'baseline',run_ref:paired.rule_based.run.run_id},
   {policy_id:'simple_planning',kind:'one_day_pareto_lookahead',run_ref:paired.simple_planning.run.run_id},
   {policy_id:'pareto_q',kind:paired.pareto_q.run.status==='unavailable_for_state'?'unavailable_for_state':'learned_synthetic_policy',run_ref:paired.pareto_q.run.run_id}
  ],
  candidate_first_actions:candidateRuns.map(item=>({action_id:item.run.first_action_id,label:actionById.get(item.run.first_action_id).label,run_ref:item.run.run_id,feasibility:item.run.feasibility})),
  scenario_runs,hard_constraint_violations:scenario_runs.reduce((sum,run)=>sum+run.hard_constraint_violations,0),
  uncertainty:{basis:state.assumptions?.disturbances?'explicit_state_assumption_distribution':'deterministic_baseline_assumptions',same_seed_set_for_all_comparisons:true,operational_calibration:false},
  scope_of_validity:'Frozen selected records and explicit scenario assumptions only; no unobserved route, capacity, qualification, behavioral or causal effects are inferred.',
  warnings
 };
}

export function outputActionStatus(result){
 return result.feasibility.status==='indeterminate'?'Verify missing hard constraints before considering this action':
  result.feasibility.status==='infeasible'?'Action violates a hard constraint':
  result.feasibility.status==='unsupported'?'Required state fields are not available':null;
}
