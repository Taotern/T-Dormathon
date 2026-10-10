import {MRDIY_SCENARIO} from './mrdiy-fixture.js';
import {compareCaseActions,openCase,energyRuntime,checkExposure} from './mrdiy-operations.js';

// Bounded enumeration over existing actions. No learning, optimization service, or execution.
export const MRDIY_JOINT_VERSION = 'dormathon.mrdiy-joint-plans.v0.4.2';
const jpSlots = [
  {slot:'inventory',scenario_ref:'SC01',action_ids:['no_action','practical_rule','replenish']},
  {slot:'route',scenario_ref:'SC02',action_ids:['no_action','expedite']},
  {slot:'invoice',scenario_ref:'SC17',action_ids:['no_action','practical_rule']},
  {slot:'service',scenario_ref:'SC27',action_ids:['no_action','practical_rule']},
  {slot:'energy',scenario_ref:'SC35',action_ids:['no_action','practical_rule','prioritize_safe_load']}
];
const jpClone = x => JSON.parse(JSON.stringify(x));
const jpRound = n => Math.round((n + Number.EPSILON) * 10000) / 10000;
const jpValid = n => typeof n === 'number' && Number.isFinite(n) && n >= 0 && n <= 1e7;
const jpAssert = (condition,message) => {if(!condition)throw new Error(message);};
const jpStable = x => JSON.stringify(x,(_,v)=>v&&typeof v==='object'&&!Array.isArray(v)?Object.fromEntries(Object.keys(v).sort().map(k=>[k,v[k]])):v);
function jpHash(x){let h=2166136261;for(const ch of jpStable(x))h=Math.imul(h^ch.charCodeAt(0),16777619);return 'fnv1a32:'+(h>>>0).toString(16).padStart(8,'0');}
const jpIsShared = name => /^(shared_cash|shared_fuel|transport_capacity|stock:|role_capacity:|storage:|backup_energy:)/.test(name);
function jpTotals(claims){
  const out={cash_myr:0,fuel_litres:0,transport_units:0,stock:{},storage:{},role_hours:{},energy:{}};
  for(const p of claims){
    for(const key of ['cash_myr','fuel_litres','transport_units']){jpAssert(jpValid(p[key]??0),'Invalid '+key+' reservation');out[key]+=p[key]??0;}
    for(const [kind,id,val] of [['stock','node_id','units'],['storage','node_id','units'],['role_hours','role_id','hours'],['energy','facility_id','kwh']]){
      jpAssert(Array.isArray(p[kind]||[]),'Invalid '+kind+' reservation');
      for(const r of p[kind]||[]){jpAssert(typeof r[id]==='string'&&jpValid(r[val]),'Invalid '+kind+' resource');if(kind==='stock')jpAssert(typeof r.sku_id==='string','Stock requires SKU');const key=kind==='stock'?r.node_id+'|'+r.sku_id:r[id];out[kind][key]=(out[kind][key]||0)+r[val];}
    }
  }return out;
}
function jpLedger(snapshot,external,planned){
  const before=jpTotals(external),added=jpTotals(planned),total=jpTotals([...external,...planned]),rows=[];
  const add=(constraint,key,available,b,a,unit)=>rows.push({constraint,resource_key:key,capacity:available,prior_reserved:jpRound(b),package_required:jpRound(a),remaining:jpValid(available)?jpRound(available-b-a):null,passed:jpValid(available)&&b+a<=available+1e-7,binding:jpValid(available)&&b+a>0&&b+a>=available-1e-7,unit});
  const cash=snapshot.resources.cash,po=Object.values(cash.committed_po_myr);
  add('shared_cash','uncommitted_cash',jpValid(cash.opening_cash_myr)&&po.every(jpValid)?cash.opening_cash_myr-po.reduce((s,n)=>s+n,0):null,before.cash_myr,added.cash_myr,'MYR');
  add('shared_fuel','global_fuel',snapshot.resources.capacities.global_fuel_litres,before.fuel_litres,added.fuel_litres,'litres');
  add('transport_capacity','review_day_transport',snapshot.resources.capacities.transport_units_per_day,before.transport_units,added.transport_units,'units/review day');
  for(const key of Object.keys(total.stock)){const inv=snapshot.resources.inventory.find(x=>x.node_id+'|'+x.sku_id===key);add('stock:'+key,key,inv&&[inv.on_hand_units,inv.reserved_units,inv.quarantined_units].every(jpValid)?inv.on_hand_units-inv.reserved_units-inv.quarantined_units:null,before.stock[key]||0,added.stock[key]||0,'units');}
  for(const key of Object.keys(total.storage)){const node=[...snapshot.objects.stores,...snapshot.objects.dcs].find(x=>x.id===key),stocks=snapshot.resources.inventory.filter(x=>x.node_id===key),inbound=snapshot.objects.shipments.filter(x=>x.to_node===key&&x.status==='in_transit');const known=node&&jpValid(node.capacity_units)&&stocks.every(x=>jpValid(x.on_hand_units))&&inbound.every(x=>jpValid(x.quantity_units));add('storage:'+key,key,known?node.capacity_units-stocks.reduce((s,x)=>s+x.on_hand_units,0)-inbound.reduce((s,x)=>s+x.quantity_units,0):null,before.storage[key]||0,added.storage[key]||0,'fixture-equivalent units');}
  for(const key of Object.keys(total.role_hours)){const role=snapshot.objects.roles.find(x=>x.id===key);add('role_capacity:'+key,key,role?.available_hours??null,before.role_hours[key]||0,added.role_hours[key]||0,'hours');}
  for(const key of Object.keys(total.energy)){const f=snapshot.objects.facilities.find(x=>x.facility_id===key);add('backup_energy:'+key,key,f?energyRuntime(f).usable_energy_kwh:null,before.energy[key]||0,added.energy[key]||0,'kWh');}
  return {rows,prior:before,package:added,total,feasible:rows.every(x=>x.passed),reservation_semantics:'One review-day sandbox allocation. Physical stock plus every in-transit receipt retain hard storage; future sales do not free reservations.'};
}
function jpUnknown(envelope,missing){return {...envelope,status:'insufficient_data',missing_inputs:[...new Set(missing)],packages:[],pareto_package_ids:[],recommended_package_id:null,baseline:null};}
function jpPrepare(options){
  jpAssert(options&&typeof options==='object'&&!Array.isArray(options),'Joint options must be an object');
  jpAssert(Object.keys(options).every(k=>['snapshot','assumptions','commitments','demand','pinned_actions'].includes(k)),'Unsupported joint-plan option');
  const snapshot=options.snapshot||MRDIY_SCENARIO;
  jpAssert(snapshot.org_id==='org_mrdiy_my_demo'&&snapshot.scenarioDataMode==='SYNTHETIC_INTERNAL','Joint planner only accepts the synthetic organization namespace');
  const pins=jpClone(options.pinned_actions??{});jpAssert(pins&&typeof pins==='object'&&!Array.isArray(pins),'pinned_actions must be an object');
  for(const [slot,id] of Object.entries(pins))jpAssert(jpSlots.find(x=>x.slot===slot)?.action_ids.includes(id),'Unsupported pinned action '+slot+':'+id);
  const slots=jpSlots.map(x=>({...x,case:snapshot.cases.find(c=>c.scenario_ref===x.scenario_ref)}));
  const missing=slots.filter(x=>!x.case).map(x=>'case:'+x.scenario_ref);
  const envelope={schema_version:MRDIY_JOINT_VERSION,org_id:snapshot.org_id,snapshot_id:snapshot.snapshot_id,data_revision:snapshot.data_revision,knowledge_as_of:snapshot.knowledge_as_of,world_time:snapshot.world_time,scenarioDataMode:'SYNTHETIC_INTERNAL',component_data_modes:['SYNTHETIC_INTERNAL','HYPOTHETICAL_EVENT','SIMULATED_OUTCOME'],delivery_mode:'live_bounded_deterministic_package_enumeration',trained_model:false,trained_rl:false,automatic_execution:false,implementation_status:'planned_only',human_choice_required:true,scope:'six_linked_deep_demo_cases_only',supported_scenario_refs:['SC01','SC02','SC17','SC18','SC27','SC35'],pinned_actions:jpClone(pins)};
  if(missing.length)return {abstain:jpUnknown(envelope,missing)};
  for(const x of slots)missing.push(...x.case.missing_inputs.map(k=>x.scenario_ref+':'+k));
  const anchor=slots[0].case,refs=anchor.object_refs;
  for(const x of slots)for(const key of ['store_id','sku_id','po_id','invoice_id','shipment_id','task_id'])if(x.case.object_refs[key]!==refs[key])missing.push('shared_episode_link:'+x.scenario_ref+':'+key);
  const alias=snapshot.cases.find(c=>c.scenario_ref==='SC18');if(!alias||alias.object_refs.invoice_id!==refs.invoice_id)missing.push('SC18:invoice_alias_link');
  const opened=openCase(anchor.id,{snapshot,assumptions:options.assumptions}),a=opened.assumptions;
  envelope.assumption_set_id=a.id;envelope.provenance_refs=[...new Set(slots.flatMap(x=>x.case.evidence_refs))];
  envelope.input_refs=[snapshot.snapshot_id,...slots.map(x=>x.case.id),alias?.id].filter(Boolean);
  jpAssert(Number.isInteger(a.horizon_days)&&a.horizon_days>=1&&a.horizon_days<=30,'Joint horizon must be 1–30 integer days');
  let demand=options.demand;
  if(demand===undefined)demand={status:'ok',demand_by_day:Array(a.horizon_days).fill(anchor.config.daily_sales_units),forecast_ref:null,scenarioDataMode:'SYNTHETIC_INTERNAL',basis:'declared_constant_fixture_demand'};
  else {jpAssert(demand&&typeof demand==='object'&&!Array.isArray(demand),'demand must be an object');jpAssert(Object.keys(demand).every(k=>['status','demand_by_day','forecast_ref','scenarioDataMode','basis'].includes(k)),'Unsupported demand field');}
  if(demand.status!=='ok'||demand.scenarioDataMode!=='SYNTHETIC_INTERNAL'||!Array.isArray(demand.demand_by_day)||demand.demand_by_day.length!==a.horizon_days||!demand.demand_by_day.every(jpValid))missing.push('known_company_scenario_demand_path');
  const stock=snapshot.resources.inventory.find(x=>x.node_id===refs.store_id&&x.sku_id===refs.sku_id),ship=snapshot.objects.shipments.find(x=>x.id===refs.shipment_id),facility=snapshot.objects.facilities.find(x=>x.id===slots[4].case.config.energy_record_id);
  if(!stock||![stock.on_hand_units,stock.reserved_units,stock.quarantined_units].every(jpValid)||stock.reserved_units+stock.quarantined_units>stock.on_hand_units)missing.push('inventory');
  const inbounds=snapshot.objects.shipments.filter(x=>x.to_node===refs.store_id&&x.sku_id===refs.sku_id&&x.status==='in_transit');
  if(new Set(inbounds.map(x=>x.id)).size!==inbounds.length||inbounds.some(x=>!jpValid(x.quantity_units)||!Number.isInteger(x.arrival_day)||x.arrival_day<0))missing.push('unique_known_same_stream_inbound_arrivals');
  const cash=snapshot.resources.cash;
  if(!jpValid(cash.opening_cash_myr)||!Object.values(cash.committed_po_myr).every(jpValid))missing.push('cash_pool');
  for(const k of ['global_fuel_litres','transport_units_per_day'])if(!jpValid(snapshot.resources.capacities[k]))missing.push(k);
  for(const [type,key,id,object] of [['route_delay','route_leg_id',refs.route_leg_id,refs.shipment_id],['power_interruption','facility_id',refs.facility_id,refs.task_id]]){
    const condition=snapshot.conditions?.find(x=>x.type===type&&x[key]===id),exposure=snapshot.exposures?.find(x=>x[key]===id&&x.business_object_id===object);
    const match=checkExposure(condition,exposure,{world_time:snapshot.world_time,window_end:new Date(Date.parse(snapshot.world_time)+a.horizon_days*86400000).toISOString()});
    if(match.status==='insufficient_data'||match.status==='unsupported')missing.push('exact_'+type+'_exposure_mapping');
  }
  if(!ship||!jpValid(ship.quantity_units)||ship.status!=='in_transit'||!jpValid(anchor.config.lead_days)||!Number.isInteger(anchor.config.lead_days)||!Number.isInteger(a.delay_days))missing.push('known_integer_arrival_and_outstanding_shipment');
  if(!facility||!jpValid(facility.safety_minimum_load_kw)||facility.safety_minimum_load_kw===0||!jpValid(facility.disruption_window?.duration_hours)||!Number.isFinite(Date.parse(facility.disruption_window?.start))||!Number.isFinite(Date.parse(facility.disruption_window?.end)))missing.push('energy_window_and_minimum_load');
  else if(energyRuntime(facility).missing_inputs.length)missing.push('energy_conversion');
  if(missing.length)return {abstain:jpUnknown(envelope,missing)};
  const commitments=options.commitments??[];jpAssert(Array.isArray(commitments)&&commitments.length<=35,'At most 35 existing reservations leave room for five package slots');
  const seen=new Set(),external=[],pinSources=[],warnings=[];const episodeIds=new Set([...slots.map(x=>x.case.id),alias.id]);
  for(const p of commitments){
    jpAssert(p&&typeof p.case_id==='string'&&typeof p.action_id==='string','Reservation requires case_id/action_id');
    jpTotals([p]); // Reject malformed supplied numbers even though authoritative claims replace them.
    const c=snapshot.cases.find(x=>x.id===p.case_id||x.scenario_ref===p.case_id);jpAssert(c,'Unknown reservation case');
    jpAssert(!seen.has(c.id),'Only one action reservation per external case');seen.add(c.id);
    const action=compareCaseActions(c.id,{snapshot,assumptions:options.assumptions}).actions.find(x=>x.id===p.action_id);jpAssert(action,'Unknown reservation action');
    // Caller-supplied resource numbers are not authority. Resolve the existing action again.
    jpAssert(action.feasible,'Existing reservation action is infeasible in this frozen state');
    if(episodeIds.has(c.id)){
      const slot=c.case_type==='supply'?(p.action_id==='expedite'?'route':p.action_id==='no_action'&&c.scenario_ref==='SC02'?'route':'inventory'):c.case_type==='procurement'?'invoice':c.case_type;
      jpAssert(jpSlots.find(x=>x.slot===slot)?.action_ids.includes(p.action_id),'Existing episode action is outside bounded joint slots; retain the per-case comparison or remove that reservation explicitly');
      jpAssert(!pins[slot]||pins[slot]===p.action_id,'Pinned choice conflicts with existing episode reservation for '+slot);
      if(pinSources.some(x=>x.slot===slot))warnings.push('Aliased reservation for '+slot+' is represented once by its physical decision slot.');
      pins[slot]=p.action_id;pinSources.push({slot,case_id:c.id,action_id:p.action_id});
    }else external.push(action.resource_claims);
  }
  for(const x of slots){const comparison=compareCaseActions(x.case.id,{snapshot,assumptions:options.assumptions});x.actions=x.action_ids.map(id=>{const action=comparison.actions.find(v=>v.id===id);jpAssert(action,'Required existing action unavailable '+x.slot+':'+id);return action;});}
  envelope.pinned_actions=jpClone(pins);envelope.reservation_pins=pinSources;envelope.warnings=warnings;
  return {snapshot,slots,anchor,refs,a,demand:jpClone(demand),stock,ship,facility,external,envelope,pins};
}
function jpOutcomes(context,chosen,ledger){
  const {snapshot,anchor,refs,a,demand,stock,ship,facility}=context;
  const transfer=chosen.inventory.id==='practical_rule'?anchor.config.quantity_units:0,newUnits=chosen.inventory.id==='replenish'?anchor.config.new_order_units:0;
  const arrival=Math.max(0,anchor.config.lead_days+a.delay_days-(chosen.route.id==='expedite'?2:0)),newArrival=anchor.config.lead_days;
  const key=refs.store_id+'|'+refs.sku_id,initial=stock.on_hand_units-stock.reserved_units-stock.quarantined_units-(ledger.prior.stock[key]||0);
  const events=snapshot.objects.shipments.filter(x=>x.to_node===refs.store_id&&x.sku_id===refs.sku_id&&x.status==='in_transit').map(x=>({event_id:x.id,kind:'existing_inbound',day:x.id===ship.id?arrival:x.arrival_day,units:x.quantity_units,node_id:refs.store_id,sku_id:refs.sku_id}));
  if(transfer)events.push({event_id:'planned_transfer:'+anchor.id,kind:'internal_transfer',day:0,units:transfer,source_node_id:anchor.config.source_store_id,node_id:refs.store_id,sku_id:refs.sku_id});
  if(newUnits)events.push({event_id:'planned_new_order:'+anchor.id,kind:'new_replenishment',day:newArrival,units:newUnits,node_id:refs.store_id,sku_id:refs.sku_id});
  let available=initial,fulfilled=0,lost=0,holding=0,totalArrived=0;const days=[];
  for(let day=0;day<a.horizon_days;day++){const arrivals=events.filter(e=>e.day===day).reduce((s,e)=>s+e.units,0);available+=arrivals;totalArrived+=arrivals;const served=Math.min(Math.max(0,available),demand.demand_by_day[day]);available-=served;fulfilled+=served;const shortage=demand.demand_by_day[day]-served;lost+=shortage;holding+=Math.max(0,available)*a.holding_myr_per_unit_day;days.push({day,demand_units:demand.demand_by_day[day],arrival_units:arrivals,fulfilled_units:jpRound(served),lost_sales_units:jpRound(shortage),ending_available_units:jpRound(available)});}
  const residual=jpRound(initial+totalArrived-fulfilled-available),shortageCost=lost*a.shortage_myr_per_unit,terminal=available*a.terminal_inventory_value_myr_per_unit;
  const duration=facility.disruption_window.duration_hours,energyAction=chosen.energy.id,load=energyAction==='prioritize_safe_load'?facility.safety_minimum_load_kw:facility.critical_load_kw,runtime=energyRuntime(facility,{load_kw:load});
  const supported=energyAction==='no_action'?0:runtime.power_feasible?Math.min(duration,runtime.runtime_hours):0,gap=Math.max(0,duration-supported);
  const interruptionStart=Date.parse(facility.disruption_window.start),interruptionEnd=Date.parse(facility.disruption_window.end),world=Date.parse(snapshot.world_time),uncoveredStart=interruptionStart+supported*3600000;
  const exposure=events.map(e=>{const at=world+e.day*86400000;return {event_id:e.event_id,day:e.day,units:e.units,facility_id:facility.facility_id,arrival_at:new Date(at).toISOString(),arrives_during_interruption:at>=interruptionStart&&at<interruptionEnd,arrives_during_uncovered_interval:at>=uncoveredStart&&at<interruptionEnd,remaining_uncovered_hours_at_arrival:at>=interruptionStart&&at<interruptionEnd?jpRound(Math.max(0,(interruptionEnd-Math.max(at,uncoveredStart))/3600000)):0};});
  const task=snapshot.objects.tasks.find(x=>x.id===refs.task_id),invoice=snapshot.objects.invoices.find(x=>x.id===refs.invoice_id),receipt=snapshot.objects.receipts.find(x=>x.id===refs.receipt_id);
  return {inventory:{node_id:refs.store_id,sku_id:refs.sku_id,initial_available_units:initial,events,days,total_demand_units:jpRound(demand.demand_by_day.reduce((s,n)=>s+n,0)),fulfilled_units:jpRound(fulfilled),shortage_units:jpRound(lost),ending_available_units:jpRound(available),stock_conservation_residual_units:residual,existing_shipment_counted_once:true,source_stock_reduction_units:transfer,transfer_network_net_units:0},cash:{prior_po_reserved_myr:Object.values(snapshot.resources.cash.committed_po_myr).reduce((s,n)=>s+n,0),incremental_package_cash_myr:ledger.package.cash_myr,uncommitted_cash_after_package_myr:ledger.rows.find(x=>x.constraint==='shared_cash').remaining,existing_payable_recharged:false},transport:{shipment_id:ship.id,route_leg_id:ship.route_leg_id,original_arrival_day:anchor.config.lead_days+a.delay_days,planned_arrival_day:arrival,package_fuel_litres:ledger.package.fuel_litres,package_transport_units:ledger.package.transport_units},energy:{facility_id:facility.facility_id,planned_load_kw:energyAction==='no_action'?null:load,supported_hours:jpRound(supported),continuity_gap_hours:jpRound(gap),receiving_exposure:exposure,receiving_delay_inferred:false,assumption:'Backup covers the beginning of the interruption; arrivals occur at scenario clock time on their day. Exposure does not establish receiving downtime or change demand.'},service:{task_id:task?.id,planned_work_hours:chosen.service.id==='no_action'?0:task?.work_hours??null,unallocated_work_hours:chosen.service.id==='no_action'?task?.work_hours??null:0,shipment_dependency_id:ship.id,shipment_dependency_arrival_day:arrival,shortage_days:days.filter(x=>x.lost_sales_units>0).length,completion_status:'not_observed_or_guaranteed',note:'Staff scheduling does not resolve shipment dependency or prove enquiry completion.'},procurement:{invoice_id:invoice?.id,linked_scenario_refs:['SC17','SC18'],review_planned:chosen.invoice.id!=='no_action',current_unmatched_units:invoice&&receipt?Math.max(0,invoice.invoiced_units-receipt.accepted_units):null,planned_arrival_does_not_match_invoice:true,payment_executed:false},cost:{known_conditional_total_myr:jpRound(ledger.package.cash_myr+holding+shortageCost-terminal),components:{new_cash_commitment_myr:ledger.package.cash_myr,holding_myr:jpRound(holding),shortage_myr:jpRound(shortageCost),terminal_value_myr:jpRound(terminal)},excluded_unpriced_consequences:['energy continuity loss','service delay','invoice review labor'],basis:'SIMULATED_OUTCOME',scope:'known conditional cost components, not total business value or observed savings'}};
}
function jpEvaluate(context,ids){
  const chosen=Object.fromEntries(context.slots.map(slot=>[slot.slot,slot.actions.find(a=>a.id===ids[slot.slot])]));
  const actions=context.slots.map(s=>({slot:s.slot,case_id:s.case.id,scenario_ref:s.scenario_ref,action_id:chosen[s.slot].id,label:chosen[s.slot].label}));
  const claims=Object.values(chosen).map(x=>x.resource_claims),ledger=jpLedger(context.snapshot,context.external,claims);
  const intrinsic=context.slots.flatMap(s=>chosen[s.slot].constraint_checks.filter(x=>!jpIsShared(x.constraint)).map(x=>({...x,slot:s.slot,case_id:s.case.id})));
  const checks=[...ledger.rows,...intrinsic],feasible=checks.every(x=>x.passed===true),outcomes=jpOutcomes(context,chosen,ledger);
  const id='joint_'+context.slots.map(s=>ids[s.slot]).join('__');
  return {package_id:id,actions,action_ids:{...ids},feasible,status:feasible?'ok':'infeasible',binding_constraints:checks.filter(x=>x.passed!==true||x.binding).map(x=>({constraint:x.constraint,slot:x.slot??null,passed:x.passed,required:x.package_required??x.required??null,remaining:x.remaining??null,reason:x.reason||'Shared resource reservation across the whole package'})),resource_ledger:ledger,outcomes,score_vector:{continuity_gap_hours:outcomes.energy.continuity_gap_hours,shortage_units:outcomes.inventory.shortage_units,known_conditional_cost_myr:outcomes.cost.known_conditional_total_myr,unallocated_service_hours:outcomes.service.unallocated_work_hours,invoice_review_not_planned:outcomes.procurement.review_planned?0:1},scenarioDataMode:'SIMULATED_OUTCOME',automatic_execution:false,implementation_status:'planned_only'};
}
function jpDelta(p,baseline){
  const diff={};for(const [k,v] of Object.entries(p.score_vector))diff[k]=jpRound(v-baseline.score_vector[k]);
  diff.cash_reserved_myr=jpRound(p.outcomes.cash.incremental_package_cash_myr-baseline.outcomes.cash.incremental_package_cash_myr);
  diff.arrival_days=p.outcomes.transport.planned_arrival_day-baseline.outcomes.transport.planned_arrival_day;
  diff.fuel_litres=jpRound(p.outcomes.transport.package_fuel_litres-baseline.outcomes.transport.package_fuel_litres);
  const changed=p.actions.filter(x=>x.action_id!=='no_action');
  return {against_package_id:baseline.package_id,values:diff,explanations:[...changed.map(x=>({cause:x.slot+':'+x.action_id,effect:x.slot==='inventory'?'Recompute the one shared stock trajectory and reserve new cash, source stock, storage and transport.':x.slot==='route'?'Move the existing shipment once; recompute lost demand and linked task arrival while reserving fuel and transport.':x.slot==='energy'?'Recompute usable runtime, continuity gap, arrival-window exposure and shared role/energy allocations.':x.slot==='service'?'Reserve qualified service hours; keep physical dependency and unfinished outcome visible.':'Reserve invoice-review hours once across SC17/SC18; retain current mismatch and existing PO cash reserve.'})),{cause:'whole_package',effect:p.feasible?'All proposed actions fit the same shared resource ledger.':'A locally attractive action is rejected if the combined package exceeds a shared limit or intrinsic constraint.'}]};
}
export function compareJointPackages(options={}){
  const context=jpPrepare(options);if(context.abstain)return context.abstain;
  const {slots,pins,envelope,demand,a}=context,baselineIds=Object.fromEntries(slots.map(s=>[s.slot,'no_action']));
  const baseline=jpEvaluate(context,baselineIds),practical=jpEvaluate(context,{inventory:'practical_rule',route:'no_action',invoice:'practical_rule',service:'practical_rule',energy:'practical_rule'}),packages=[];
  baseline.comparison_semantics='Counterfactual no-change episode with its own reservations released; unrelated existing reservations remain. This does not change session state.';
  practical.comparison_semantics='Counterfactual practical rules with episode reservations released; unrelated reservations remain. It may ignore pinned choices and is not an admissible pinned alternative. It may also be infeasible under shared or intrinsic constraints.';
  function enumerate(i,ids){if(i===slots.length){packages.push(jpEvaluate(context,ids));return;}const slot=slots[i];for(const id of pins[slot.slot]?[pins[slot.slot]]:slot.action_ids)enumerate(i+1,{...ids,[slot.slot]:id});}
  enumerate(0,{});
  const feasible=packages.filter(x=>x.feasible);
  const dominates=(x,y)=>Object.keys(x.score_vector).every(k=>x.score_vector[k]<=y.score_vector[k])&&Object.keys(x.score_vector).some(k=>x.score_vector[k]<y.score_vector[k]);
  const frontier=feasible.filter(x=>!feasible.some(y=>dominates(y,x))).map(x=>x.package_id);
  for(const p of packages){p.pareto_efficient=frontier.includes(p.package_id);p.delta_from_baseline=jpDelta(p,baseline);}
  const result={...envelope,status:feasible.length?'ok':'no_feasible_package',missing_inputs:[],decision_slots:slots.map(({slot,case:c,action_ids,actions})=>({slot,case_id:c.id,scenario_ref:c.scenario_ref,action_ids,actions:actions.map(x=>({action_id:x.id,label:x.label}))})),baseline,practical_baseline:practical,packages,pareto_package_ids:frontier,recommended_package_id:null,counts:{evaluated:packages.length,feasible:feasible.length,infeasible:packages.length-feasible.length,pareto:frontier.length,bound:72},frozen_basis:{demand,assumptions:jpClone(a),external_commitments:jpClone(context.external),scenario_clock:context.snapshot.world_time,comparison_rule:'Identical demand path, opening stock, PO reserves and exogenous conditions for every package.'},objective:'Pareto tradeoffs: continuity gap, shortage, known conditional costs, unallocated service hours, review planned. No hidden scalar weighting; human chooses.',limitations:['Bounded six-case episode, not all 40 cases or a globally optimal policy.','SC01 and SC02 share one stock trajectory and shipment; SC17 and SC18 share one invoice-review decision.','No trained RL, causal company savings, validated stockout probability, completed task, accepted receipt, payment or physical execution is claimed.','Receiving energy exposure is shown explicitly; without an operational conversion rule it does not invent downtime, demand loss or automatic receipt delay.','Transport and role reservations use the existing conservative review-day capacity rules, not a detailed vehicle-routing or shift schedule.']};
  result.input_checksum=jpHash({snapshot:context.snapshot,assumptions:a,demand,commitments:context.external,pins});return result;
}
