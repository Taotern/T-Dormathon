import {compareSequentialPlans} from './mrdiy-sequential-planner.js';
import {comparePlanThresholds} from './mrdiy-plan-thresholds.js';
import {MRDIY_EVENT_EVIDENCE} from './mrdiy-event-evidence.js';
import {MRDIY_SCENARIO} from './mrdiy-fixture.js';
import {openCase} from './mrdiy-operations.js';
import {mrdiyDemandOutlook} from './mrdiy-demand-outlook.js';
import {compareJointPackages} from './mrdiy-joint-planner.js';

export const MRDIY_EVENT_VERSION='dormathon.event-impact-scenario.v1';
const eventAssert=(ok,message)=>{if(!ok)throw new Error(message);};
const eventClone=x=>JSON.parse(JSON.stringify(x));
const eventRound=x=>Math.round((x+Number.EPSILON)*10000)/10000;
function eventCompactPlan(p){return{package_id:p.package_id,actions:p.actions,feasible:p.feasible,pareto_efficient:p.pareto_efficient??false,score_vector:p.score_vector,planned_arrival_day:p.outcomes.transport.planned_arrival_day,cash_reserved_myr:p.outcomes.cash.incremental_package_cash_myr,remaining_cash_myr:p.outcomes.cash.uncommitted_cash_after_package_myr,stock_conservation_residual_units:p.outcomes.inventory.stock_conservation_residual_units,blocked_constraints:p.binding_constraints.filter(x=>x.passed!==true)};}
function eventCompactJoint(r){return{status:r.status,counts:r.counts,input_checksum:r.input_checksum,assumption_set_id:r.assumption_set_id,pinned_actions:r.pinned_actions,reservation_pins:r.reservation_pins,frozen_basis:r.frozen_basis,baseline:eventCompactPlan(r.baseline),practical_baseline:eventCompactPlan(r.practical_baseline),packages:r.packages.map(eventCompactPlan),pareto_package_ids:r.pareto_package_ids,objective:r.objective,comparison_only:true,resources_reserved:false,automatic_execution:false};}
function eventRun(options){
 const outlook=mrdiyDemandOutlook('demo_supply_01',options);
 if(outlook.status!=='ok'||outlook.forecast?.status!=='ok')return{status:'insufficient_data',outlook,joint:null,warnings:['Event scenario abstains because the original demand/stock outlook is unavailable.']};
 const demand={status:'ok',demand_by_day:outlook.forecast.forecasts.map(x=>x.predicted_units),forecast_ref:outlook.forecast.request_id,scenarioDataMode:'SYNTHETIC_INTERNAL',basis:'Same authored historical demand model; external warning does not alter historical sales or predict demand change.'};
 const joint=compareJointPackages({...options,demand});
 if(!['ok','no_feasible_package'].includes(joint.status))return{status:'insufficient_data',outlook,joint,warnings:['Whole-episode evaluation abstains on missing inputs.']};
 return{status:'ok',outlook,joint:eventCompactJoint(joint)};
}
export function mrdiyEventCatalog(){return{schema_version:MRDIY_EVENT_VERSION,status:MRDIY_EVENT_EVIDENCE.events.length?'ok':'unavailable',catalog_version:MRDIY_EVENT_EVIDENCE.catalog_version,source_mode:'reviewed_saved_public_evidence',live_refresh_supported:false,last_source_check_at:MRDIY_EVENT_EVIDENCE.last_source_check_at,events:eventClone(MRDIY_EVENT_EVIDENCE.events),source_notice:'Saved primary-source records, not a live alert feed. Replaying a warning does not establish an observed incident or business exposure.',mapping:{route_leg_id:'DEMO_LEG01',shipment_id:'DEMO_SHIP01',store_id:'DEMO_ST01',scenario_refs:['SC01','SC02','SC17','SC18','SC27','SC35'],basis:'explicit_human_confirmed_synthetic_analogy_only',actual_company_exposure_established:false}};}
function eventValidateReplay(body,options={}){
 const s=options.snapshot||MRDIY_SCENARIO;
 const event=MRDIY_EVENT_EVIDENCE.events.find(x=>x.id===body.event_id);
 eventAssert(event,'Choose an event from the reviewed saved-source catalog.');
 const opened=openCase(body.case_id,options);
 eventAssert(opened.case.deep_demo===true,'Event-impact comparison is limited to the six linked deep-demo cases.');
 eventAssert(body.route_leg_id==='DEMO_LEG01','Only the explicitly declared DEMO_LEG01 synthetic route mapping is supported.');
 eventAssert(body.mapping_confirmed===true&&body.impact_confirmed===true&&body.replay_confirmed===true,'Confirm the synthetic route analogy, the business-impact assumption and replay before calculating.');
 eventAssert(Number.isInteger(body.total_delay_days)&&body.total_delay_days>=0&&body.total_delay_days<=5,'Enter an integer total delay from 0 to 5 days; this replaces rather than adds to the existing delay.');
 return{s,event,opened};
}
export function evaluateMrdiyEventScenario(body,options={}){
 const {s,event,opened}=eventValidateReplay(body,options);
 const baseOptions={snapshot:s,assumptions:eventClone(options.assumptions||{}),commitments:eventClone(options.commitments||[])};
 const before=eventRun(baseOptions),afterOptions={...baseOptions,assumptions:{...baseOptions.assumptions,delay_days:body.total_delay_days}},after=eventRun(afterOptions);
 const provenance={event_id:event.id,source_url:event.sourceUrl,source_name:event.sourceName,event_occurred_at:event.occurredAt,event_published_at:event.publishedAt,source_verified_at:event.verifiedAt,source_time_semantics:event.sourceTimezone===null?'Issue/validity clocks are raw source-local strings with no UTC offset; occurrence is not established.':'Preserve the explicit UTC source event range, publication and update clocks separately.',replay:true,event_fact_mode:'PUBLIC_SOURCE_RECORD',business_impact_mode:'HUMAN_CONFIRMED_SYNTHETIC_ASSUMPTION',mapping_basis:'Reviewer explicitly maps the public location to DEMO_LEG01 as a fictional route analogue; geographic overlap alone is not exposure evidence.',mapping_confirmed:true,impact_confirmed:true,replay_confirmed:true,confirmation_identity:'UI affirmation only; no authenticated operator identity or actual company acknowledgement',confirmed_at:new Date().toISOString(),route_leg_id:'DEMO_LEG01',shipment_id:'DEMO_SHIP01',scenario_world_time:s.world_time,baseline_delay_days:opened.assumptions.delay_days,total_delay_days:body.total_delay_days,delay_change_days:body.total_delay_days-opened.assumptions.delay_days,assumption_semantics:'Replace the total route-delay assumption for the shared shipment; do not add it twice.',actual_company_exposure_established:false,source_claims_delay_days:false,source_claims_business_severity:false,source_claims_probability:false};
 const envelope={input_request:{case_id:opened.case.case_id,event_id:event.id,route_leg_id:'DEMO_LEG01',total_delay_days:body.total_delay_days,mapping_confirmed:true,impact_confirmed:true,replay_confirmed:true,assumptions:baseOptions.assumptions,commitments:baseOptions.commitments.map(c=>({case_id:c.case_id,action_id:c.action_id}))},schema_version:MRDIY_EVENT_VERSION,status:before.status==='ok'&&after.status==='ok'?'ok':'insufficient_data',selected_case_id:opened.case.case_id,snapshot_id:s.snapshot_id,catalog_version:MRDIY_EVENT_EVIDENCE.catalog_version,event:eventClone(event),provenance,comparison_only:true,resources_reserved:false,automatic_execution:false,scenarioDataMode:'SYNTHETIC_INTERNAL',component_data_modes:['PUBLIC_SOURCE_RECORD','HUMAN_CONFIRMED_SYNTHETIC_ASSUMPTION','CONDITIONAL_SCENARIO'],before,after};
 if(envelope.status!=='ok')return{...envelope,package_comparisons:[],warnings:[...(before.warnings||[]),...(after.warnings||[])]};
 const prior=new Map(before.joint.packages.map(p=>[p.package_id,p]));
 const packageComparisons=after.joint.packages.map(p=>{const b=prior.get(p.package_id);eventAssert(b,'Before/after package identities must match.');return{package_id:p.package_id,before:b,after:p,delta:Object.fromEntries(Object.keys(p.score_vector).map(k=>[k,eventRound(p.score_vector[k]-b.score_vector[k])])),feasibility_changed:b.feasible!==p.feasible,frontier_changed:b.pareto_efficient!==p.pareto_efficient};});
 return{...envelope,forecast_effect:'Historical sales and the demand model are held fixed. Only the explicitly confirmed arrival-delay assumption changes the stock outlook and whole-episode outcomes.',package_comparisons:packageComparisons,summary:{point_demand_before:eventRound(before.outlook.forecast.forecasts.reduce((n,x)=>n+x.predicted_units,0)),point_demand_after:eventRound(after.outlook.forecast.forecasts.reduce((n,x)=>n+x.predicted_units,0)),unmet_units_before:before.outlook.risk.total_projected_shortage_units,unmet_units_after:after.outlook.risk.total_projected_shortage_units,unmet_units_change:eventRound(after.outlook.risk.total_projected_shortage_units-before.outlook.risk.total_projected_shortage_units),first_shortage_before:before.outlook.risk.first_projected_shortage_date,first_shortage_after:after.outlook.risk.first_projected_shortage_date,arrival_before:before.outlook.risk.next_arrival_date,arrival_after:after.outlook.risk.next_arrival_date,affected_shipment_arrival_before:before.outlook.frozen_risk_inputs.arrivals.find(x=>x.arrival_id==='DEMO_SHIP01')?.date??null,affected_shipment_arrival_after:after.outlook.frozen_risk_inputs.arrivals.find(x=>x.arrival_id==='DEMO_SHIP01')?.date??null,feasible_before:before.joint.counts.feasible,feasible_after:after.joint.counts.feasible,frontier_changes:packageComparisons.filter(x=>x.frontier_changed).length},warnings:['A real warning or event is a review trigger, not proof of disruption to MR D.I.Y.','This replay relocates an event analogy into the synthetic scenario clock; it is not a historical causal replay of company operations.','Before retains the existing declared assumptions, including any baseline delay; it is not an event-free observation.','Neither external source severity nor probability is converted into business delay, loss or risk.']};
}

export function evaluateMrdiyEventPlanStress(body,options={}){
 const {s,event}=eventValidateReplay(body,options);
 eventAssert(typeof body.selected_package_id==='string'&&body.selected_package_id.length<=300,'Choose an existing whole-episode package.');
 eventAssert(body.include_demand_stress===undefined||typeof body.include_demand_stress==='boolean','Demand-stress selection must be explicit true or false.');
 const replayOptions={snapshot:s,assumptions:{...(options.assumptions||{}),delay_days:body.total_delay_days},commitments:eventClone(options.commitments||[])};
 const outlook=mrdiyDemandOutlook('demo_supply_01',replayOptions);
 if(outlook.status!=='ok'||outlook.forecast?.status!=='ok')return{status:'insufficient_data',missing_inputs:['confirmed_replay_demand_outlook'],automatic_execution:false,resources_reserved:false};
 const demand={status:'ok',demand_by_day:outlook.forecast.forecasts.map(x=>x.predicted_units),forecast_ref:outlook.forecast.request_id,scenarioDataMode:'SYNTHETIC_INTERNAL',basis:'Same authored historical demand model; external warning does not alter historical sales or predict demand change.'};
 const result=comparePlanThresholds({...replayOptions,demand,selected_package_id:body.selected_package_id,grid:{delay_days:[0,1,2,3,4,5],demand_multipliers:body.include_demand_stress?[.75,1,1.25,1.5,2]:[1]}});
 return{...result,event_id:event.id,event_source_url:event.sourceUrl,replay:true,confirmed_delay_days:body.total_delay_days,actual_company_exposure_established:false,source_provides_stress_values:false,comparison_only:true};
}

export function mrdiySequentialPlanComparison(body,options={}){
 const opened=openCase(body.case_id,options);
 eventAssert(opened.case.deep_demo===true,'Sequential rehearsal covers only the six linked deep-demo cases.');
 const eventFields=['route_leg_id','total_delay_days','mapping_confirmed','impact_confirmed','replay_confirmed'];
 let event=null;
 if(body.event_id!==undefined)event=eventValidateReplay(body,options).event;
 else eventAssert(eventFields.every(k=>body[k]===undefined),'Event-impact fields require a reviewed event and all replay confirmations.');
 const assumptions={...(options.assumptions||{}),...(event?{delay_days:body.total_delay_days}:{})};
 const commitments=eventClone(options.commitments||[]);
 const result=compareSequentialPlans({snapshot:options.snapshot||MRDIY_SCENARIO,assumptions,commitments});
 return{...result,selected_case_id:opened.case.case_id,comparison_only:true,resources_reserved:false,replanning_context:{basis:event?'confirmed_event_replay':'current_session_baseline',event_id:event?.id??null,event_title:event?.title??null,source_url:event?.sourceUrl??null,source_verified_at:event?.verifiedAt??null,total_delay_days:event?body.total_delay_days:opened.assumptions.delay_days,baseline_delay_days:opened.assumptions.delay_days,actual_company_exposure_established:false,observation_mode:'authored_synthetic_sales_receipts_and_carrier_update',forecast_and_scenarios_supplied_by_caller:false},input_request:{case_id:opened.case.case_id,assumptions:eventClone(options.assumptions||{}),commitments:commitments.map(c=>({case_id:c.case_id,action_id:c.action_id})),...(event?{event_id:event.id,route_leg_id:'DEMO_LEG01',total_delay_days:body.total_delay_days,mapping_confirmed:true,impact_confirmed:true,replay_confirmed:true}:{})}};
}
