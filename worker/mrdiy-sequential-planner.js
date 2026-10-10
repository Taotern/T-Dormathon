import {MRDIY_SCENARIO} from './mrdiy-fixture.js';
import {compareCaseActions,openCase,energyRuntime} from './mrdiy-operations.js';
import {compareJointPackages} from './mrdiy-joint-planner.js';
import {mrdiyDemandOutlook} from './mrdiy-demand-outlook.js';

// A finite scenario tree, not a trained policy or a real company failure forecast.
export const MRDIY_SEQUENTIAL_VERSION='dormathon.mrdiy-sequential.v1';
const sqClone=x=>JSON.parse(JSON.stringify(x));
const sqRound=n=>Math.round((n+Number.EPSILON)*1e6)/1e6||0;
const sqAssert=(ok,message)=>{if(!ok)throw new Error(message);};
const sqNumber=n=>typeof n==='number'&&Number.isFinite(n)&&n>=0&&n<=1e7;
const sqStable=x=>JSON.stringify(x,(_,v)=>v&&typeof v==='object'&&!Array.isArray(v)?Object.fromEntries(Object.keys(v).sort().map(k=>[k,v[k]])):v);
const sqHash=x=>{let h=2166136261;for(const c of sqStable(x))h=Math.imul(h^c.charCodeAt(0),16777619);return 'fnv1a32:'+(h>>>0).toString(16).padStart(8,'0');};
const sqDayMs=86400000;
const sqSlots=['inventory','route','invoice','service','energy'];
const sqAllowed={inventory:['no_action','practical_rule','replenish'],route:['no_action','expedite'],invoice:['no_action','practical_rule'],service:['no_action','practical_rule'],energy:['no_action','practical_rule','prioritize_safe_load']};
const sqRefs={inventory:'SC01',route:'SC02',invoice:'SC17',service:'SC27',energy:'SC35'};
const sqNone={inventory:'no_action',route:'no_action',invoice:'no_action',service:'no_action',energy:'no_action'};
const sqLater=()=>['no_action','practical_rule','replenish'].flatMap(inventory=>['no_action','expedite'].map(route=>({...sqNone,inventory,route})));
const sqDate=(ctx,day)=>new Date(ctx.baseDate+day*sqDayMs).toISOString().slice(0,10);
const sqTotals=claims=>{
 const t={cash_myr:0,fuel_litres:0,transport_units:0,stock:{},storage:{},role_hours:{},energy:{}};
 for(const c of claims){for(const k of ['cash_myr','fuel_litres','transport_units']){sqAssert(sqNumber(c[k]??0),'Unknown canonical '+k);t[k]+=c[k]??0;}for(const [kind,id,value] of [['stock','node_id','units'],['storage','node_id','units'],['role_hours','role_id','hours'],['energy','facility_id','kwh']])for(const r of c[kind]??[]){sqAssert(sqNumber(r[value]),'Unknown canonical '+kind);const key=kind==='stock'?r.node_id+'|'+r.sku_id:r[id];t[kind][key]=(t[kind][key]??0)+r[value];}}
 return t;
};

export function createSequentialScenarioSet({forecast,lead_days=3,delay_days=2}={}){
 sqAssert(Number.isInteger(lead_days)&&lead_days>=0&&lead_days<=9&&Number.isInteger(delay_days)&&delay_days>=0&&delay_days<=5,'Bounded integer lead and delay assumptions required');
 sqAssert(forecast?.status==='ok'&&forecast.forecasts?.length===7,'Seven-day synthetic forecast required');
 const base=forecast.forecasts.map(x=>x.predicted_units),high=forecast.forecasts.map((x,i)=>i<2?x.predicted_units:Math.max(x.predicted_units,x.high_units));
 sqAssert([...base,...high].every(sqNumber),'Finite nonnegative forecast values required');
 return [
  {id:'on_time_base',label:'On-time shipment / base demand',assumed_weight:0.5,primary_arrival_day:lead_days,carrier_eta_day2:lead_days,demand_by_day:base},
  {id:'delayed_base',label:'Delayed shipment / base demand',assumed_weight:0.3,primary_arrival_day:lead_days+delay_days,carrier_eta_day2:lead_days+delay_days,demand_by_day:base},
  {id:'delayed_high',label:'Delayed shipment / higher later demand',assumed_weight:0.2,primary_arrival_day:lead_days+delay_days,carrier_eta_day2:lead_days+delay_days,demand_by_day:high}
 ];
}
function sqPrepare(options){
 sqAssert(options&&typeof options==='object'&&!Array.isArray(options),'Sequential options must be an object');
 sqAssert(Object.keys(options).every(k=>['snapshot','assumptions','commitments','scenarios','forecast'].includes(k)),'Unsupported sequential option');
 const snapshot=options.snapshot??MRDIY_SCENARIO;
 sqAssert(snapshot.cases?.length<=40&&snapshot.resources?.inventory?.length<=1000&&Object.values(snapshot.objects??{}).every(x=>Array.isArray(x)&&x.length<=100),'Snapshot exceeds bounded sequential fixture scope');
 const opened=openCase('SC01',{snapshot,assumptions:options.assumptions}),a=opened.assumptions,c=opened.case;
 sqAssert(a.horizon_days===7,'Sequential demonstration has exactly seven days');
 sqAssert(c.config.source_store_id!==c.object_refs.store_id,'Sequential transfer source and destination must be distinct nodes');
 const baseDate=Date.parse(snapshot.world_time.slice(0,10)+'T00:00:00Z');
 let prediction=options.forecast;
 if(prediction===undefined)prediction=mrdiyDemandOutlook(c.id,{snapshot,assumptions:options.assumptions,commitments:options.commitments}).forecast;
 if(!prediction||prediction.status!=='ok')return {abstain:{status:'insufficient_data',missing_inputs:['seven_day_synthetic_forecast']}};
 sqAssert(prediction.scenarioDataMode==='SYNTHETIC_INTERNAL','Sequential forecast must retain synthetic organization provenance');
 sqAssert(prediction.forecasts?.length===7&&prediction.forecasts.every((x,i)=>sqNumber(x.predicted_units)&&sqNumber(x.high_units)&&x.date===new Date(baseDate+i*sqDayMs).toISOString().slice(0,10)),'Forecast must have seven finite dated rows matching scenario clock');
 const demand={status:'ok',demand_by_day:prediction.forecasts.map(x=>x.predicted_units),forecast_ref:prediction.request_id,scenarioDataMode:'SYNTHETIC_INTERNAL',basis:'authored_history_forecast'};
 const joint=compareJointPackages({snapshot,assumptions:options.assumptions,commitments:options.commitments,demand});
 if(joint.status==='insufficient_data')return {abstain:{status:'insufficient_data',missing_inputs:joint.missing_inputs}};
 const paths=sqClone(options.scenarios??createSequentialScenarioSet({forecast:prediction,lead_days:c.config.lead_days,delay_days:a.delay_days}));
 sqAssert(Array.isArray(paths)&&paths.length>=2&&paths.length<=3,'Two or three explicitly assumed scenario paths required');
 sqAssert(new Set(paths.map(p=>p.id)).size===paths.length,'Unique scenario IDs required');
 for(const p of paths){sqAssert(typeof p.id==='string'&&p.id.length<=80&&typeof p.label==='string'&&p.label.length<=160,'Bounded scenario identity required');sqAssert(sqNumber(p.assumed_weight)&&p.assumed_weight>0&&p.assumed_weight<=1,'Positive assumed scenario weight required');sqAssert(Number.isInteger(p.primary_arrival_day)&&p.primary_arrival_day>=0&&p.primary_arrival_day<=14&&Number.isInteger(p.carrier_eta_day2)&&p.carrier_eta_day2>=0&&p.carrier_eta_day2<=14,'Arrival and observed carrier ETA must be day indices 0–14');sqAssert(p.demand_by_day?.length===7&&p.demand_by_day.every(sqNumber),'Each scenario needs seven finite demand assumptions');}
 sqAssert(Math.abs(paths.reduce((n,p)=>n+p.assumed_weight,0)-1)<1e-9,'Assumed scenario weights must sum to one');
 const stockInputs=snapshot.resources.inventory.filter(x=>x.node_id===c.object_refs.store_id||x.node_id===c.config.source_store_id);
 const inboundInputs=snapshot.objects.shipments.filter(x=>x.to_node===c.object_refs.store_id&&x.status==='in_transit');
 if(new Set(stockInputs.map(x=>x.node_id+'|'+x.sku_id)).size!==stockInputs.length||new Set(inboundInputs.map(x=>x.id)).size!==inboundInputs.length||stockInputs.some(x=>![x.on_hand_units,x.reserved_units,x.quarantined_units].every(sqNumber)||x.reserved_units+x.quarantined_units>x.on_hand_units)||inboundInputs.some(x=>!sqNumber(x.quantity_units)||!Number.isInteger(x.arrival_day)||x.arrival_day<0))return {abstain:{status:'insufficient_data',missing_inputs:['known_stock_and_all_destination_inbound_storage']}};
 const ctx={snapshot,a,c,refs:c.object_refs,baseDate,paths,prediction,joint,external:joint.frozen_basis.external_commitments,actions:{0:{},2:{}},evaluations:0};
 ctx.facility=snapshot.objects.facilities.find(x=>x.id===snapshot.cases.find(x=>x.scenario_ref==='SC35').config.energy_record_id);
 ctx.task=snapshot.objects.tasks.find(x=>x.id===c.object_refs.task_id);
 for(const day of [0,2]){
  const dated=sqClone(snapshot);dated.world_time=new Date(Date.parse(snapshot.world_time)+day*sqDayMs).toISOString();
  // Explicit added assumption, not a hidden reset of staff-hour budgets or observed shifts.
  if(day===2)for(const r of dated.objects.roles){r.shift_start=new Date(Date.parse(r.shift_start)+2*sqDayMs).toISOString();r.shift_end=new Date(Date.parse(r.shift_end)+2*sqDayMs).toISOString();}
  for(const slot of sqSlots){ctx.actions[day][slot]={};for(const action of compareCaseActions(sqRefs[slot],{snapshot:dated,assumptions:options.assumptions}).actions)ctx.actions[day][slot][action.id]=action;}
 }
 return ctx;
}
function sqInitial(ctx,path){
 const {snapshot:s,refs}=ctx,ext=sqTotals(ctx.external),cash=s.resources.cash;
 const stock=Object.fromEntries(s.resources.inventory.map(x=>[x.node_id+'|'+x.sku_id,x.on_hand_units-x.reserved_units-x.quarantined_units-(ext.stock[x.node_id+'|'+x.sku_id]??0)]));
 const dest=refs.store_id+'|'+refs.sku_id,source=ctx.c.config.source_store_id+'|'+refs.sku_id;
 sqAssert(sqNumber(stock[dest])&&sqNumber(stock[source]),'External reservations exceed known physical stock');
 const node=[...s.objects.stores,...s.objects.dcs].find(x=>x.id===refs.store_id);
 const occupied=s.resources.inventory.filter(x=>x.node_id===refs.store_id).reduce((n,x)=>n+x.on_hand_units,0);
 const inbound=s.objects.shipments.filter(x=>x.to_node===refs.store_id&&x.status==='in_transit');
 const events=inbound.filter(x=>x.sku_id===refs.sku_id).map(x=>({event_id:x.id,kind:'existing_inbound',day:x.id===refs.shipment_id?path.primary_arrival_day:x.arrival_day,units:x.quantity_units,received:false}));
 return {day:0,stock,initial_destination_stock:stock[dest],initial_source_stock:stock[source],cash_available_myr:cash.opening_cash_myr-Object.values(cash.committed_po_myr).reduce((n,x)=>n+x,0)-ext.cash_myr,initial_cash_available_myr:cash.opening_cash_myr-Object.values(cash.committed_po_myr).reduce((n,x)=>n+x,0)-ext.cash_myr,new_cash_committed_myr:0,po_reserved_myr:Object.values(cash.committed_po_myr).reduce((n,x)=>n+x,0),claims:sqClone(ctx.external),actions:[],action_keys:[],events,fulfilled_units:0,lost_units:0,arrived_units:0,transfer_units:0,holding_myr:0,storage_initial_free:node.capacity_units-occupied-inbound.reduce((n,x)=>n+x.quantity_units,0)-(ext.storage[refs.store_id]??0),new_storage_reserved:0,transport_by_day:{0:ext.transport_units,2:0},energy_action:'no_action',invoice_review_planned:false,service_planned:false,days:[],model_events:[]};
}
function sqChecks(ctx,state,ids,day){
 const checks=[];const add=(constraint,passed,detail={})=>checks.push({constraint,passed,...detail});
 for(const slot of sqSlots)sqAssert(sqAllowed[slot].includes(ids[slot]),'Action outside bounded menu: '+slot+':'+ids[slot]);
 const chosen=sqSlots.map(slot=>({slot,action:ctx.actions[day][slot][ids[slot]]}));
 for(const {slot,action} of chosen){sqAssert(action,'Unknown bounded '+slot+' action');if(action.id==='no_action')continue;
  add('one_off:'+slot+':'+action.id,!state.action_keys.includes(slot+':'+action.id),{reason:'A committed physical action cannot be bought or reserved twice'});
  add('decision_epoch:'+slot,day===0||['inventory','route'].includes(slot),{reason:'Invoice, service and elapsed outage choices are frozen after day 0'});
  for(const check of action.constraint_checks)if(!/^(shared_cash|shared_fuel|transport_capacity|stock:|storage:|role_capacity:|backup_energy:)/.test(check.constraint))checks.push({...check,slot});
  if(slot==='route')add('shipment_still_outstanding',state.events.some(e=>e.event_id===ctx.refs.shipment_id&&!e.received),{reason:'Already received shipment cannot be expedited'});
 }
 const additions=chosen.filter(x=>x.action.id!=='no_action').map(x=>x.action.resource_claims),total=sqTotals([...state.claims,...additions]),newTotals=sqTotals(additions),s=ctx.snapshot;
 add('shared_cash',newTotals.cash_myr<=state.cash_available_myr+1e-7,{required:newTotals.cash_myr,available:state.cash_available_myr});
 add('shared_fuel',total.fuel_litres<=s.resources.capacities.global_fuel_litres+1e-7,{required:total.fuel_litres,available:s.resources.capacities.global_fuel_litres});
 add('dated_transport_capacity',state.transport_by_day[day]+newTotals.transport_units<=s.resources.capacities.transport_units_per_day+1e-7,{day,required:state.transport_by_day[day]+newTotals.transport_units,available:s.resources.capacities.transport_units_per_day});
 for(const [key,quantity] of Object.entries(newTotals.stock))add('stock:'+key,sqNumber(state.stock[key])&&quantity<=state.stock[key]+1e-7,{required:quantity,available:state.stock[key]??null});
 add('storage:'+ctx.refs.store_id,state.new_storage_reserved+(newTotals.storage[ctx.refs.store_id]??0)<=state.storage_initial_free+state.fulfilled_units+1e-7,{required:state.new_storage_reserved+(newTotals.storage[ctx.refs.store_id]??0),available:state.storage_initial_free+state.fulfilled_units,reason:'Only elapsed actual fulfilled demand releases storage; outstanding arrivals remain reserved'});
 for(const [role,hours] of Object.entries(total.role_hours)){const r=s.objects.roles.find(x=>x.id===role);add('role_capacity:'+role,r&&hours<=r.available_hours+1e-7,{required:hours,available:r?.available_hours??null});}
 for(const [facility,kwh] of Object.entries(total.energy)){const f=s.objects.facilities.find(x=>x.facility_id===facility),available=f?energyRuntime(f).usable_energy_kwh:null;add('backup_energy:'+facility,sqNumber(available)&&kwh<=available+1e-7,{required:kwh,available});}
 return {feasible:checks.every(c=>c.passed===true),checks,additions,chosen,newTotals};
}
function sqApply(ctx,input,ids,day){
 const state=sqClone(input),check=sqChecks(ctx,state,ids,day);if(!check.feasible)return {feasible:false,checks:check.checks,state:input};
 const {newTotals,additions}=check;state.cash_available_myr-=newTotals.cash_myr;state.new_cash_committed_myr+=newTotals.cash_myr;state.claims.push(...sqClone(additions));state.new_storage_reserved+=newTotals.storage[ctx.refs.store_id]??0;state.transport_by_day[day]+=newTotals.transport_units;
 const dest=ctx.refs.store_id+'|'+ctx.refs.sku_id;
 for(const {slot,action} of check.chosen){if(action.id==='no_action')continue;state.action_keys.push(slot+':'+action.id);state.actions.push({day,date:sqDate(ctx,day),slot,action_id:action.id,cash_committed_myr:action.resource_claims.cash_myr});
  if(slot==='inventory'&&action.id==='practical_rule'){for(const claim of action.resource_claims.stock)state.stock[claim.node_id+'|'+claim.sku_id]-=claim.units;state.stock[dest]+=ctx.c.config.quantity_units;state.transfer_units+=ctx.c.config.quantity_units;}
  if(slot==='inventory'&&action.id==='replenish'){let eventId='new_order:day'+day;let suffix=0;while(state.events.some(e=>e.event_id===eventId))eventId='new_order:day'+day+':'+(++suffix);state.events.push({event_id:eventId,kind:'new_replenishment',day:day+ctx.c.config.lead_days,units:ctx.c.config.new_order_units,received:false});}
  if(slot==='route'){const event=state.events.find(x=>x.event_id===ctx.refs.shipment_id);event.day=Math.max(day+1,event.day-2);}
  if(slot==='energy')state.energy_action=action.id;if(slot==='invoice')state.invoice_review_planned=true;if(slot==='service')state.service_planned=true;
 }
 return {feasible:true,checks:check.checks,state};
}
function sqAdvance(ctx,input,path,until){
 const state=sqClone(input),dest=ctx.refs.store_id+'|'+ctx.refs.sku_id;
 for(let day=state.day;day<until;day++){
  const opening=state.stock[dest],arrivals=state.events.filter(e=>!e.received&&e.day===day);for(const e of arrivals){e.received=true;state.stock[dest]+=e.units;state.arrived_units+=e.units;}
  const demand=path.demand_by_day[day],fulfilled=Math.min(state.stock[dest],demand),lost=demand-fulfilled;state.stock[dest]-=fulfilled;state.fulfilled_units+=fulfilled;state.lost_units+=lost;state.holding_myr+=state.stock[dest]*ctx.a.holding_myr_per_unit_day;
  const totals=sqTotals(state.claims),row={day,date:sqDate(ctx,day),opening_post_decision_available_units:sqRound(opening),same_day_transfer_in_units:state.actions.some(a=>a.day===day&&a.slot==='inventory'&&a.action_id==='practical_rule')?ctx.c.config.quantity_units:0,source_ending_available_units:sqRound(state.stock[ctx.c.config.source_store_id+'|'+ctx.refs.sku_id]),receipt_ids:arrivals.map(e=>e.event_id),arrival_units:sqRound(arrivals.reduce((n,e)=>n+e.units,0)),demand_units:sqRound(demand),fulfilled_units:sqRound(fulfilled),lost_sales_units:sqRound(lost),ending_available_units:sqRound(state.stock[dest]),cash_available_myr:sqRound(state.cash_available_myr),cumulative_new_cash_commitment_myr:sqRound(state.new_cash_committed_myr),fuel_remaining_litres:sqRound(ctx.snapshot.resources.capacities.global_fuel_litres-totals.fuel_litres),cumulative_role_hours:sqClone(totals.role_hours),cumulative_energy_kwh:sqClone(totals.energy)};
  state.days.push(row);if(lost>1e-7)state.model_events.push({day,date:row.date,type:'stockout',unserved_units:sqRound(lost),basis:'conditional_scenario_only'});
 }
 state.day=until;return state;
}
function sqObservation(ctx,state,path){
 const received=state.events.find(e=>e.event_id===ctx.refs.shipment_id)?.received===true;
 const expedited=state.actions.find(a=>a.slot==='route');
 const eta=expedited?Math.max(expedited.day+1,path.carrier_eta_day2-2):path.carrier_eta_day2;
 // Deliberately excludes path ID, future demand, hidden actual arrival day, and any terminal outcome.
 return {day:2,date:sqDate(ctx,2),elapsed_actuals:state.days.map(d=>({date:d.date,fulfilled_units:d.fulfilled_units,receipt_ids:d.receipt_ids})),available_units:sqRound(state.stock[ctx.refs.store_id+'|'+ctx.refs.sku_id]),cash_available_myr:sqRound(state.cash_available_myr),carrier_update:received?{status:'received'}:{status:'outstanding',reported_eta_day:eta,basis:'explicit_assumed_day_2_update_not_verified_carrier_feed'}};
}
function sqFinish(ctx,state,path){
 const dest=ctx.refs.store_id+'|'+ctx.refs.sku_id,source=ctx.c.config.source_store_id+'|'+ctx.refs.sku_id,f=ctx.facility;
 const runtime=state.energy_action==='no_action'?0:energyRuntime(f,{load_kw:state.energy_action==='prioritize_safe_load'?f.safety_minimum_load_kw:f.critical_load_kw}).runtime_hours;
 const gap=Math.max(0,f.disruption_window.duration_hours-runtime),cost=state.new_cash_committed_myr+state.holding_myr+state.lost_units*ctx.a.shortage_myr_per_unit-state.stock[dest]*ctx.a.terminal_inventory_value_myr_per_unit;
 const arrival=state.events.find(e=>e.event_id===ctx.refs.shipment_id),arrivalAt=Date.parse(ctx.snapshot.world_time)+arrival.day*sqDayMs,deadline=Date.parse(ctx.task.deadline);
 const modelEvents=sqClone(state.model_events);if(gap>0)modelEvents.push({day:0,date:sqDate(ctx,0),type:'continuity_gap',hours:sqRound(gap),basis:'conditional_scenario_only'});
 if(!state.service_planned||arrivalAt>deadline)modelEvents.push({day:Math.max(0,Math.min(6,Math.floor((deadline-Date.parse(ctx.snapshot.world_time))/sqDayMs))),type:'service_dependency_gap',staff_work_planned:state.service_planned,shipment_arrival_day:arrival.day,completion_claimed:false,basis:'conditional_scenario_only'});
 const totals=sqTotals(state.claims);
 const residuals=[state.initial_destination_stock+state.arrived_units+state.transfer_units-state.fulfilled_units-state.stock[dest],state.initial_source_stock-state.transfer_units-state.stock[source],state.initial_cash_available_myr-state.new_cash_committed_myr-state.cash_available_myr];sqAssert(residuals.every(n=>Number.isFinite(n)&&sqRound(n)===0),'Physical stock or cash conservation failed; no feasible outcome may be returned');
 const receiptIds=state.days.flatMap(d=>d.receipt_ids);sqAssert(new Set(state.events.map(e=>e.event_id)).size===state.events.length&&new Set(receiptIds).size===receiptIds.length,'Receipt conservation failed: duplicate event identity');
 return {scenario_id:path.id,scenario_label:path.label,assumed_weight:path.assumed_weight,actions:state.actions,days:state.days,model_events:modelEvents,metrics:{shortage_units:sqRound(state.lost_units),fulfilled_units:sqRound(state.fulfilled_units),ending_available_units:sqRound(state.stock[dest]),known_conditional_cost_myr:sqRound(cost),new_cash_committed_myr:sqRound(state.new_cash_committed_myr),cash_available_myr:sqRound(state.cash_available_myr),continuity_gap_hours:sqRound(gap),unallocated_service_hours:state.service_planned?0:ctx.task.work_hours,invoice_review_unplanned:state.invoice_review_planned?0:1},conservation:{destination_residual_units:sqRound(state.initial_destination_stock+state.arrived_units+state.transfer_units-state.fulfilled_units-state.stock[dest]),source_transfer_residual_units:sqRound(state.initial_source_stock-state.transfer_units-state.stock[source]),cash_residual_myr:sqRound(state.initial_cash_available_myr-state.new_cash_committed_myr-state.cash_available_myr),receipt_ids_unique:new Set(state.days.flatMap(d=>d.receipt_ids)).size===state.days.flatMap(d=>d.receipt_ids).length,existing_po_charged_again:false,payment_executed:false},retained_commitments:{prior_po_reserved_myr:state.po_reserved_myr,action_keys:state.action_keys,cumulative_fuel_litres:totals.fuel_litres,cumulative_role_hours:totals.role_hours,cumulative_energy_kwh:totals.energy,transport_by_day:state.transport_by_day},pending_receipts:state.events.filter(e=>!e.received).map(e=>({event_id:e.event_id,arrival_day:e.day,units:e.units})),scenarioDataMode:'SIMULATED_OUTCOME'};
}
const sqScore=trajectories=>{
 const weight=trajectories.reduce((n,t)=>n+t.assumed_weight,0),keys=['continuity_gap_hours','unallocated_service_hours','invoice_review_unplanned','known_conditional_cost_myr'];
 return keys.map(k=>sqRound(trajectories.reduce((n,t)=>n+t.assumed_weight*t.metrics[k],0)/weight));
};
const sqBetter=(a,b)=>!b||a.some((v,i)=>Math.abs(v-b[i])>1e-7&&a.slice(0,i).every((x,j)=>Math.abs(x-b[j])<=1e-7)&&v<b[i]);
function sqCandidate(ctx,entries,second){
 const trajectories=[],checks=[];
 for(const entry of entries){ctx.evaluations++;const next=sqApply(ctx,entry.state,second,2);if(!next.feasible){checks.push(...next.checks.filter(c=>!c.passed));return {feasible:false,checks};}trajectories.push(sqFinish(ctx,sqAdvance(ctx,next.state,entry.path,7),entry.path));}
 return {feasible:true,score:sqScore(trajectories),trajectories,second_action_ids:sqClone(second)};
}
function sqSearchLater(ctx,entries){
 let best=null;const masks=[];for(const ids of sqLater()){const c=sqCandidate(ctx,entries,ids);if(c.feasible){if(sqBetter(c.score,best?.score))best=c;}else masks.push({action_ids:ids,reasons:c.checks});}return {best,masks};
}
function sqPlanResult(ctx,id,first,secondChoices,trajectories,masks=[]){
 const score=sqScore(trajectories),expected={};for(const k of Object.keys(trajectories[0].metrics))expected[k]=sqRound(trajectories.reduce((n,t)=>n+t.assumed_weight*t.metrics[k],0));
 return {plan_id:id,status:'ok',feasible:true,first_action_ids:sqClone(first),second_choices:secondChoices,score_vector:score,expected,assumed_scenario_stockout_weight:sqRound(trajectories.filter(t=>t.metrics.shortage_units>0).reduce((n,t)=>n+t.assumed_weight,0)),trajectories,masked_second_actions:masks,automatic_execution:false,implementation_status:'planned_only'};
}
function sqEntries(ctx,first){
 const entries=[];for(const path of ctx.paths){const added=sqApply(ctx,sqInitial(ctx,path),first,0);if(!added.feasible)return {feasible:false,checks:added.checks.filter(c=>!c.passed)};const state=sqAdvance(ctx,added.state,path,2),observation=sqObservation(ctx,state,path);entries.push({path,state,observation,key:sqStable(observation)});}return {feasible:true,entries};
}
function sqFixed(ctx,id,first,second=sqNone){
 const e=sqEntries(ctx,first);if(!e.feasible)return {plan_id:id,status:'infeasible',feasible:false,first_action_ids:first,binding_constraints:e.checks};const c=sqCandidate(ctx,e.entries,second);if(!c.feasible)return {plan_id:id,status:'infeasible',feasible:false,binding_constraints:c.checks};return sqPlanResult(ctx,id,first,[{observation_scope:'all_paths_same_action',action_ids:second}],c.trajectories);
}

export function simulateSequentialPlan({options={},first_action_ids={},second_action_ids={}}={}){
 const ctx=sqPrepare(options);if(ctx.abstain)return {...ctx.abstain,schema_version:MRDIY_SEQUENTIAL_VERSION};
 for(const ids of [first_action_ids,second_action_ids])sqAssert(ids&&typeof ids==='object'&&!Array.isArray(ids)&&Object.keys(ids).every(k=>sqSlots.includes(k)),'Unknown action slot');
 const first={...sqNone,...ctx.joint.pinned_actions,...first_action_ids};for(const [k,v] of Object.entries(ctx.joint.pinned_actions))sqAssert(first[k]===v,'Irrevocable saved reservation cannot be replaced');
 return sqFixed(ctx,'explicit_fixed_two_epoch_plan',first,{...sqNone,...second_action_ids});
}

export function compareSequentialPlans(options={}){
 const ctx=sqPrepare(options),envelope={schema_version:MRDIY_SEQUENTIAL_VERSION,scenarioDataMode:'SYNTHETIC_INTERNAL',component_data_modes:['SYNTHETIC_INTERNAL','HYPOTHETICAL_EVENT','SIMULATED_OUTCOME'],automatic_execution:false,trained_model:false,trained_rl:false,mcts_used:false,human_choice_required:true,implementation_status:'planned_only'};
 if(ctx.abstain)return {...envelope,...ctx.abstain};
 const baseline=sqFixed(ctx,'retain_existing_no_additions',{...sqNone,...ctx.joint.pinned_actions});
 const practical=sqFixed(ctx,'fixed_practical_rule',{inventory:'practical_rule',route:'no_action',invoice:'practical_rule',service:'practical_rule',energy:'practical_rule',...ctx.joint.pinned_actions});
 let open=null,adaptive=null;let firstFeasible=0;const firstMasks=[];
 for(const p of ctx.joint.packages){
  const e=sqEntries(ctx,p.action_ids);if(!e.feasible){firstMasks.push({action_ids:p.action_ids,reasons:e.checks});continue;}firstFeasible++;
  const fixed=sqSearchLater(ctx,e.entries);if(fixed.best){const candidate=sqPlanResult(ctx,'bounded_open_loop',p.action_ids,[{observation_scope:'all_paths_same_action',action_ids:fixed.best.second_action_ids}],fixed.best.trajectories,fixed.masks);if(sqBetter(candidate.score_vector,open?.score_vector))open=candidate;}
  const groups=new Map();for(const entry of e.entries){if(!groups.has(entry.key))groups.set(entry.key,[]);groups.get(entry.key).push(entry);}
  const trajectories=[],choices=[],masks=[];let all=true;
  for(const [key,entries] of groups){const result=sqSearchLater(ctx,entries);if(!result.best){all=false;break;}const weight=entries.reduce((n,e)=>n+e.path.assumed_weight,0);choices.push({observation_id:sqHash(key),observation:entries[0].observation,assumed_observation_weight:sqRound(weight),conditional_scenarios:entries.map(e=>({scenario_id:e.path.id,assumed_conditional_weight:sqRound(e.path.assumed_weight/weight)})),action_ids:result.best.second_action_ids,elapsed_days_retained:2});trajectories.push(...result.best.trajectories);masks.push({observation_id:sqHash(key),masked_actions:result.masks});}
  if(all){const candidate=sqPlanResult(ctx,'bounded_observe_then_replan',p.action_ids,choices,trajectories,masks);if(sqBetter(candidate.score_vector,adaptive?.score_vector))adaptive=candidate;}
 }
 const result={...envelope,status:adaptive?'ok':'no_feasible_policy',org_id:ctx.snapshot.org_id,snapshot_id:ctx.snapshot.snapshot_id,world_time:ctx.snapshot.world_time,forecast_ref:ctx.prediction.request_id,forecast_model:ctx.prediction.model,forecast_seed:410102,decision_days:[0,2],horizon_days:7,scenario_paths:ctx.paths,scenario_probability_basis:'Explicit assumed finite-scenario weights, not calibrated probabilities or actual MRDIY failure predictions',objective:{type:'declared_lexicographic',frozen_before_evaluation:true,selection_information:'Prior finite scenario distribution at day 0; condition only on observed histories at day 2. Realized future path identity is never an action-selection input.',priority_order:['continuity_gap_hours','unallocated_service_hours','invoice_review_unplanned','expected_known_conditional_cost_myr'],cost_coefficients:{shortage_myr_per_unit:ctx.a.shortage_myr_per_unit,holding_myr_per_unit_day:ctx.a.holding_myr_per_unit_day,terminal_inventory_value_myr_per_unit:ctx.a.terminal_inventory_value_myr_per_unit},cost_scope:'New modeled cash commitments + holding + shortage − terminal value; energy/service consequences are not monetized'},assumptions:{day_order:'Decision, then dated receipts, then same-day demand',observation:'Elapsed fulfilled synthetic sales/receipts and explicitly assumed day-2 carrier ETA only; lost demand is censored and never supplied to the observation. Identical observations share one action. Future demand remains uncertain.',transfer_timing:'A transfer consumes its canonical source stock, cash, transport capacity and staff hours, and is explicitly assumed usable on the decision day, matching the existing synthetic transfer convention; no real transit time is claimed.',resource_schedule:'Day-2 roles are explicitly assumed to have the same local planning-window duration and rest values as day 0; cumulative available role-hour budget does not reset. Transport capacity is separately assumed available on each decision day.',storage:'Known physical stock and outstanding receipts remain reserved; only elapsed actual sales free capacity.',irreversibility:'Prior decisions and PO reserves survive replanning; each transfer/new order/expedite can occur once. Existing commitments are retained. No payment or external execution.',eta:'Default carrier update is accurate within this authored finite scenario set. This is an assumption, not observed carrier performance.'},baselines:{retain_existing:baseline,practical_rule:practical,open_loop:open},adaptive_plan:adaptive,counts:{first_packages:ctx.joint.packages.length,first_feasible:firstFeasible,second_menu_bound:6,scenario_count:ctx.paths.length,path_evaluations:ctx.evaluations,path_evaluation_bound:6000},masked_first_actions:firstMasks,limitations:['Only this fixed seven-day/two-epoch/six-case episode and finite action menu is searched; no global policy optimality claim.','Scenario weights and the carrier observation model are explicit assumptions; no calibrated stockout warning or real company failure prediction.','Service staffing is a plan only; shipment dependency and elapsed outage remain visible. No completed service or accepted invoice is invented.','No action is physically executed and no sales revenue, payment, or business savings is established.','MCTS is unnecessary for this bounded menu; no equal-budget improvement has been demonstrated.']};
 result.constraint_model_events=firstMasks.flatMap(m=>m.reasons.filter(c=>c.constraint==='shared_cash').map(c=>({type:'cash_limited_alternative',action_ids:m.action_ids,required_myr:c.required,available_myr:c.available,basis:'conditional_constraint_only',payment_executed:false})));
 if(adaptive&&open)result.comparison={same_scenario_paths:true,same_assumed_weights:true,same_objective:true,same_resource_limits:true,open_loop_minus_adaptive_known_cost_myr:sqRound(open.expected.known_conditional_cost_myr-adaptive.expected.known_conditional_cost_myr),adaptive_minus_open_loop_shortage_units:sqRound(adaptive.expected.shortage_units-open.expected.shortage_units),service_tradeoff:adaptive.expected.shortage_units>open.expected.shortage_units+1e-7?'Lower declared cost comes with higher expected unserved units; this is not dominance.':'Inspect all outcomes; cost improvement alone is not whole-business superiority.',interpretation:'Conditional value of using this assumed observation within the bounded menu; not real savings'};
 sqAssert(ctx.evaluations<=6000,'Bounded scenario evaluation budget exceeded');result.business_story=sqStory(result);result.input_checksum=sqHash({snapshot:ctx.snapshot,assumptions:ctx.a,scenarios:ctx.paths,forecast:ctx.prediction,external:ctx.external,pins:ctx.joint.pinned_actions});return result;
}
function sqStory(result){
 const p=result.adaptive_plan;if(!p)return ['No feasible sequential plan under the supplied hard constraints. Keep the existing demonstration and inspect the masked alternatives.'];
 const label=ids=>sqSlots.filter(s=>ids[s]!=='no_action').map(s=>s+': '+ids[s].replaceAll('_',' ')).join('; ')||'retain current commitments';
 return ['Seven-day synthetic business rehearsal. The scenario weights are assumptions, not forecasts of real company failure.',
  'Day 0: '+label(p.first_action_ids)+'. This same first decision applies to every possible scenario.',
  ...p.second_choices.map(c=>'Day 2: after '+(c.observation.carrier_update.status==='received'?'the shipment is recorded received':'the assumed carrier update reports arrival on day '+c.observation.carrier_update.reported_eta_day)+', '+label(c.action_ids)+'. '+(c.conditional_scenarios.length>1?'Multiple future demand paths remain possible and share this action.':'Only one declared path matches this observation in the tiny scenario set.')+' The first two days and all commitments are retained.'),
  'Conditional weighted shortage: '+p.expected.shortage_units+' units (fixed two-epoch plan: '+result.baselines.open_loop?.expected.shortage_units+'); new modeled cash commitments: MYR '+p.expected.new_cash_committed_myr+'. All branch-level outcomes remain available in the trace.',
  result.comparison?'Against the equally bounded fixed two-epoch plan, using the assumed observation reduces known conditional cost by MYR '+result.comparison.open_loop_minus_adaptive_known_cost_myr+'. '+result.comparison.service_tradeoff+' This is not observed savings.':'A comparable feasible fixed plan is unavailable.',
  'The model still shows '+p.expected.continuity_gap_hours+' hours of continuity gap. Staffing plans do not guarantee shipment-dependent service completion.'];
}
