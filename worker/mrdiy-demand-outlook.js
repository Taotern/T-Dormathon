import {MRDIY_SCENARIO} from './mrdiy-fixture.js';
import {openCase,compareCaseActions} from './mrdiy-operations.js';
import {forecastDemand,forecastRisk,DEMAND_RISK_VERSION} from './demand-risk-engine.js';

/** Separate authored history; never extends or relabels the original company's observed ledger. */
export function mrdiyDemandOutlook(caseId,options={}){
 const s=options.snapshot||MRDIY_SCENARIO,opened=openCase(caseId,options),c=opened.case,a=opened.assumptions;
 const envelope={schema_version:'dormathon.mrdiy-demand-outlook.v1',org_id:s.org_id,brand_scope:s.brand_scope,scenarioDataMode:'SYNTHETIC_INTERNAL',provenance_refs:c.evidence_refs,assumption_set_id:a.id,request_id:'mrdiy-demand-outlook-'+c.case_id+'-'+a.id,input_refs:[s.snapshot_id,c.case_id],knowledge_as_of:s.knowledge_as_of,world_time:s.world_time,knowledge_mode:s.knowledge_mode,data_revision:s.data_revision,case_id:c.case_id,snapshot_id:s.snapshot_id,engine_version:DEMAND_RISK_VERSION,automatic_execution:false};
 const fail=(reason,status='insufficient_data')=>({...envelope,status,history:[],forecast:null,risk:null,frozen_risk_inputs:null,warnings:[reason],delivery_mode:'live_deterministic_synthetic_calculation'});
 if(c.case_type!=='supply')return fail('This demand/stock outlook is scoped to supply cases.','unsupported');
 if(opened.status==='insufficient_data')return fail('Case declares missing inputs: '+(c.missing_inputs||[]).join(', '));
 const daily=c.config.daily_sales_units,lead=c.config.lead_days,stock=s.resources.inventory.find(x=>x.node_id===c.object_refs.store_id&&x.sku_id===c.object_refs.sku_id);
 if(!Number.isFinite(daily)||daily<0||!stock||!Number.isInteger(lead)||lead<0)return fail('Known nonnegative daily sales assumption, stock and integer lead days are required.');
 const commitments=options.commitments??[];
 if(!Array.isArray(commitments))return fail('Commitments must be an explicit array.');
 let stockClaim=0;const commitmentCases=new Set(),resolvedCommitments=[];
 if(commitments.length>40)return fail('At most 40 saved case reservations are supported.');
 for(const commitment of commitments){
  if(!commitment||typeof commitment.case_id!=='string'||typeof commitment.action_id!=='string')return fail('Commitment requires an existing case_id and action_id; raw resource claims are not authority.');
  const linked=s.cases.find(x=>x.id===commitment.case_id||x.case_id===commitment.case_id||x.scenario_ref===commitment.case_id);
  if(!linked||commitmentCases.has(linked.id))return fail('Unknown or duplicate case commitment prevents stock reconciliation.');
  commitmentCases.add(linked.id);
  let comparison;try{comparison=compareCaseActions(linked.id,{snapshot:s,assumptions:options.assumptions,commitments:[]});}catch{return fail('Commitment cannot be reconstructed in this frozen snapshot.');}
  const action=comparison.actions.find(x=>x.id===commitment.action_id);
  if(!action||action.feasible!==true)return fail('Unknown or infeasible commitment action prevents stock reconciliation.');
  const claims=action.resource_claims;resolvedCommitments.push({case_id:linked.id,action_id:action.id,...structuredClone(claims)});
  for(const claim of claims.stock??[]){if(!Number.isFinite(claim.units)||claim.units<0)return fail('Canonical stock commitment has an unknown quantity.');if(claim.node_id===c.object_refs.store_id&&claim.sku_id===c.object_refs.sku_id)stockClaim+=claim.units;}
 }
 const dayMs=86400000,start=Date.parse(s.world_time.slice(0,10)+'T00:00:00Z')-196*dayMs,weekday=[.8,.9,1,1.1,1.2,1,1],weekFactors=[.72,.88,1.04,1.2,.94,1.12,.82,1.28,.98,1.08,.76,1.18];
 let seed=410102;
 const history=Array.from({length:196},(_,i)=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;const week=Math.floor(i/7),jitter=.9+.2*(seed/4294967296),trend=.85+.3*(week/27);return{date:new Date(start+i*dayMs).toISOString().slice(0,10),positive_sales:Math.round(daily*weekday[i%7]*weekFactors[week%weekFactors.length]*jitter*trend),observation_status:'source_declared_complete',complete_day:true,source:'authored_synthetic_history_410102',scenarioDataMode:'SYNTHETIC_INTERNAL'};});
 const prediction=forecastDemand({...envelope,item_id:c.object_refs.sku_id,node_id:c.object_refs.store_id,history,horizon:7,model:'adaptive_past_validation'});
 const baseDate=Date.parse(s.world_time.slice(0,10)+'T00:00:00Z');
 const inbound=s.objects.shipments.filter(x=>x.to_node===c.object_refs.store_id&&x.sku_id===c.object_refs.sku_id&&x.status==='in_transit');
 const arrivals=[];
 for(const shipment of inbound){const day=shipment.id===c.object_refs.shipment_id&&['replenishment','inbound_delay'].includes(c.analysis_kind)?lead+a.delay_days:shipment.arrival_day;if(!Number.isInteger(day)||day<0)return fail('Unknown, fractional or overdue outstanding arrival timing needs resolution.');arrivals.push({arrival_id:shipment.id,org_id:s.org_id,item_id:c.object_refs.sku_id,node_id:c.object_refs.store_id,date:new Date(baseDate+day*dayMs).toISOString().slice(0,10),arrival_day:day,quantity_units:shipment.quantity_units,observation_status:'synthetic_assumption'});}
 const inventory={org_id:s.org_id,item_id:c.object_refs.sku_id,node_id:c.object_refs.store_id,on_hand_units:stock.on_hand_units,reserved_units:stock.reserved_units,quarantined_units:stock.quarantined_units,committed_units:stockClaim,observation_status:'synthetic_assumption',as_of:s.world_time};
 const frozen={inventory,arrivals,arrivals_complete:true,resolved_commitments:resolvedCommitments,commitment_resolution:'canonical case/action claims reconstructed; caller resource quantities are ignored',registry_completeness_basis:'frozen synthetic fixture explicitly enumerates all outstanding receipts',arrival_day_convention:'day 0 is world date; arrivals usable before same-day demand',shortage_treatment:'lost_sales'};
 const risk=forecastRisk({forecast:prediction,...frozen});
 return{...envelope,status:prediction.status==='ok'?risk.status:prediction.status,delivery_mode:'live_deterministic_synthetic_calculation',history,forecast:prediction,risk,frozen_risk_inputs:frozen,synthetic_generation:{seed:410102,history_days:196,weekday_multipliers:weekday,week_multipliers:weekFactors,daily_jitter_range:[.9,1.1],linear_trend_range:[.85,1.15],rule:'round(declared daily units × weekday multiplier × repeated declared week multiplier × seeded daily jitter × linear historical trend); no future labels or external event shock enters the forecast',history_identity:'separate authored scenario history, not the existing 28-day fixture ledger and not a reconstruction of MRDIY observations'},component_data_modes:['SYNTHETIC_INTERNAL','CONDITIONAL_SCENARIO'],warnings:['All company demand, inventory and arrivals here are synthetic assumptions.','Weekly historical benchmark improvement does not establish real company shortage warning accuracy.','Low/high are empirical conditional scenarios, not calibrated confidence limits.','The full-catalog benchmark selector and this one-series scenario selector have different populations.','This outlook does not evaluate shared cash, receiving staff, contractual restrictions or action feasibility; use the joint package comparison.'],automatic_execution:false};
}
