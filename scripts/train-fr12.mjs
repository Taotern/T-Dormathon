import fs from 'node:fs';
import {comparePolicies,trainWorldModel,trainParetoPolicy,simulatePath} from '../worker/sandbox.js';

if(Number(process.versions.node.split('.')[0])!==24)throw new Error('FR12 model artifacts must be trained and evaluated with Node 24.');
const episodes=Number(process.argv[2]||4000),seed=Number(process.argv[3]||7919),output=process.argv[4]||'data/fr12-world-model.v1.json';
const fixture=JSON.parse(fs.readFileSync('data/prototype/linked-operations.v0.2.json','utf8'));
const assumptions=JSON.parse(fs.readFileSync('data/prototype/fr12-assumptions.v1.json','utf8'));
const constraints={
 cash_budget:{value:500,unit:'MYR',basis:'synthetic_training_fixture'},route_passability:true,
 storage_capacity_units:500,qualified_role_available:true,no_resource_double_allocation:true,
 resource_capacities:[{resource_id:'fixture:operator:01',capacity:1,allocated_task_ids:[]}]
};
const baseState={
 schema_version:'dormathon.fr12.state.v1',data_basis:'synthetic_fixture_with_user_edits',
 inputs:fixture.inputs,order_quantity:fixture.records.find(row=>row.order_id)?.quantity??100,
 invoice_approved:false,resource_authorization:true,resource_available:true,resource_rest_ok:true,
 service_remaining_hours:12,assumptions,constraints
};
let model=trainWorldModel({episodes,seed,baseState,assumptions});
model=trainParetoPolicy(model,{baseState,episodes,seed:seed+1,horizon:assumptions.limits.default_horizon_days});

const heldoutConfigurations=[
 {
  id:'demand-and-delay-shift',
  disturbances:{
   demand_multiplier:[{value:1.1,weight:0.2},{value:1.3,weight:0.6},{value:1.5,weight:0.2}],
   delay_add_days:[{value:1,weight:0.2},{value:2,weight:0.5},{value:3,weight:0.3}],
   processing_multiplier:[{value:0.9,weight:0.2},{value:1.1,weight:0.6},{value:1.4,weight:0.2}],
   waste_use_multiplier:[{value:0.8,weight:0.2},{value:1.1,weight:0.5},{value:1.4,weight:0.3}],
   energy_use_multiplier:[{value:0.95,weight:0.2},{value:1.1,weight:0.5},{value:1.3,weight:0.3}]
  }
 },
 {
  id:'lower-demand-higher-processing-variance',
  disturbances:{
   demand_multiplier:[{value:0.5,weight:0.2},{value:0.7,weight:0.6},{value:0.9,weight:0.2}],
   delay_add_days:[{value:0,weight:0.7},{value:1,weight:0.2},{value:2,weight:0.1}],
   processing_multiplier:[{value:0.6,weight:0.2},{value:1.2,weight:0.5},{value:1.8,weight:0.3}],
   waste_use_multiplier:[{value:0.5,weight:0.2},{value:0.8,weight:0.5},{value:1.1,weight:0.3}],
   energy_use_multiplier:[{value:0.7,weight:0.2},{value:0.9,weight:0.5},{value:1.2,weight:0.3}]
  }
 }
];
const metricNames=['fulfilment_gap_days','cash_gap_myr','processing_wait_hours','expiry_surplus_units','energy_consumed_kwh','energy_over_baseline_kwh','action_cost_myr'];
const seedsPerConfiguration=100,validationSeeds=Array.from({length:seedsPerConfiguration},(_,index)=>(seed+0x20000+index)>>>0);
const mean=values=>values.length?values.reduce((sum,value)=>sum+value,0)/values.length:null;
function fidelitySummary(predicted,observed){
 const pairs=predicted.map((value,index)=>[value,observed[index]]).filter(pair=>pair.every(Number.isFinite));
 const predictions=pairs.map(pair=>pair[0]),actual=pairs.map(pair=>pair[1]),p10=quantile(predictions,0.1),p90=quantile(predictions,0.9);
 return{
  count:pairs.length,predicted_mean:mean(predictions),observed_mean:mean(actual),
  mean_absolute_error:mean(pairs.map(([a,b])=>Math.abs(a-b))),
  mean_signed_error:mean(pairs.map(([a,b])=>a-b)),
  predicted_p10:p10,predicted_p90:p90,
  empirical_holdout_coverage:pairs.length?actual.filter(value=>value>=p10&&value<=p90).length/pairs.length:null
 };
}
function quantile(values,p){
 if(!values.length)return null;
 const sorted=[...values].sort((a,b)=>a-b),position=(sorted.length-1)*p,lo=Math.floor(position),hi=Math.ceil(position);
 return sorted[lo]+(sorted[hi]-sorted[lo])*(position-lo);
}

const transitionHoldout={data_basis:'held_out_synthetic_simulator_configurations',scenarios_per_configuration:seedsPerConfiguration,configurations:[],operational_outcomes_used:false,claims:'synthetic simulator fidelity only'};
const policyHoldout={data_basis:'synthetic_simulator_same_state_common_seeds',scenarios_per_configuration:seedsPerConfiguration,configurations:[],common_scenario_seeds:true,hard_constraint_violations:0,operational_outcomes_used:false,claims:'synthetic policy comparison only'};
for(let configIndex=0;configIndex<heldoutConfigurations.length;configIndex++){
 const configuration=heldoutConfigurations[configIndex],heldoutAssumptions={...assumptions,disturbances:configuration.disturbances};
 const actualState={...baseState,assumptions:heldoutAssumptions};
 const modelState={...baseState,assumptions:{...model.synthetic_assumptions,actions:assumptions.actions,cash_available:assumptions.cash_available,synthetic_energy_projection:assumptions.synthetic_energy_projection}};
 const samples={one_day:{predicted:Object.fromEntries(metricNames.map(name=>[name,[]])),observed:Object.fromEntries(metricNames.map(name=>[name,[]]))},rollout:{predicted:Object.fromEntries(metricNames.map(name=>[name,[]])),observed:Object.fromEntries(metricNames.map(name=>[name,[]]))}};
 for(const validationSeed of validationSeeds){
  const predicted=simulatePath(modelState,{actionId:'no_action',seed:validationSeed,horizon:assumptions.limits.default_horizon_days,model});
  const observed=simulatePath(actualState,{actionId:'no_action',seed:validationSeed,horizon:assumptions.limits.default_horizon_days,model});
  for(const name of metricNames){
   const predictedOne=predicted.path[1]?.metrics?.[name],observedOne=observed.path[1]?.metrics?.[name];
   const predictedFinal=predicted.metrics?.[name],observedFinal=observed.metrics?.[name];
   if(predictedOne?.status==='available'&&Number.isFinite(observedOne?.value)){samples.one_day.predicted[name].push(predictedOne.value);samples.one_day.observed[name].push(observedOne.value)}
   if(predictedFinal?.status==='available'&&Number.isFinite(observedFinal?.value)){samples.rollout.predicted[name].push(predictedFinal.value);samples.rollout.observed[name].push(observedFinal.value)}
  }
 }
 const metricSummary={one_day:{},rollout:{}};
 for(const name of metricNames)for(const period of ['one_day','rollout'])metricSummary[period][name]=fidelitySummary(samples[period].predicted[name],samples[period].observed[name]);
 transitionHoldout.configurations.push({configuration_id:configuration.id,horizon_days:assumptions.limits.default_horizon_days,metrics:metricSummary});
 const comparison=await comparePolicies(actualState,{
  actions:['no_action','expedite_delivery','increase_buffer','qualified_reassignment','reduce_waste','reduce_energy_consumption'],
  horizon:assumptions.limits.default_horizon_days,scenarios:seedsPerConfiguration,
  seed:validationSeeds[0],model,constraints,objectives:undefined
 });
 policyHoldout.configurations.push({
  configuration_id:configuration.id,comparison_status:comparison.status,
  run_refs:comparison.scenario_runs.map(run=>run.run_id),
  policy_comparisons:comparison.policy_comparisons,
  candidate_action_comparisons:comparison.candidate_action_comparisons,
  scenario_seed_schedule:Array.from({length:seedsPerConfiguration},(_,index)=>(validationSeeds[0]+Math.imul(index,2654435761))>>>0),
  hard_constraint_violations:comparison.hard_constraint_violations
 });
 policyHoldout.hard_constraint_violations+=comparison.hard_constraint_violations;
}
const policyValidation={episodes:validationSeeds.length,untrained_model:false,hard_constraint_violations:policyHoldout.hard_constraint_violations,mean_final_metrics:{}};
for(const name of metricNames){
 const values=[];
 for(const validationSeed of validationSeeds){
  const run=simulatePath(baseState,{actionId:'no_action',seed:validationSeed,horizon:assumptions.limits.default_horizon_days,model});
  if(run.metrics?.[name]?.status==='available'&&Number.isFinite(run.metrics[name].value))values.push(run.metrics[name].value);
 }
 policyValidation.mean_final_metrics[name]=mean(values);
}
model.training.policy_validation=policyValidation;
model.training.transition_holdout_evaluation=transitionHoldout;
model.training.policy_comparison_holdout=policyHoldout;
model.training.policy_entries=Object.keys(model.policy.q_table).length;
fs.writeFileSync(output,JSON.stringify(model,null,2)+'\n');
process.stdout.write(JSON.stringify({output,model_version:model.model_version,episodes,policy_entries:model.training.policy_entries,transition_holdout:transitionHoldout,policy_holdout:{hard_constraint_violations:policyHoldout.hard_constraint_violations,common_scenario_seeds:policyHoldout.common_scenario_seeds}},null,2)+'\n');
