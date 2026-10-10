import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {FR12_WORLD_MODEL} from '../worker/generated.js';
import {simulatePath,comparePolicies,paretoFront} from '../worker/sandbox.js';

const fixture=JSON.parse(fs.readFileSync(new URL('../data/prototype/linked-operations.v0.2.json',import.meta.url),'utf8'));
const state={schema_version:'dormathon.fr12.state.v1',data_basis:'synthetic_fixture_with_user_edits',inputs:fixture.inputs,order_quantity:100,invoice_approved:false,service_remaining_hours:12,assumptions:FR12_WORLD_MODEL.synthetic_assumptions};

test('Seeded futures repeat exactly and conserve nonnegative bounded inventories',()=>{
 const a=simulatePath(state,{actionId:'no_action',seed:7103,horizon:14,model:FR12_WORLD_MODEL}),b=simulatePath(state,{actionId:'no_action',seed:7103,horizon:14,model:FR12_WORLD_MODEL});
 assert.deepEqual(a,b);assert.equal(a.path.length,15);for(const point of a.path){const stock=point.state.supply[0].stock;assert.ok(stock>=0);assert.ok(stock<=state.inputs.stock_units+state.order_quantity);assert.ok(point.state.waste[0].remaining>=0);assert.ok(point.state.waste[0].remaining<=state.inputs.food_units);}
 assert.equal(simulatePath(state,{actionId:'reduce_energy_consumption',seed:7103,horizon:2,model:FR12_WORLD_MODEL}).feasibility.status,'indeterminate');
 assert.equal(simulatePath({...state,assumptions:{...state.assumptions,cash_available:null}},{actionId:'reduce_energy_consumption',seed:7103,horizon:2,model:FR12_WORLD_MODEL,constraints:{cash_budget:{value:200,unit:'MYR'}}}).feasibility.status,'indeterminate');
 const reduced=simulatePath(state,{actionId:'reduce_energy_consumption',seed:7103,horizon:14,model:FR12_WORLD_MODEL,constraints:{cash_budget:{value:200,unit:'MYR'}}});assert.equal(reduced.feasibility.status,'feasible');assert.ok(reduced.metrics.energy_consumed_kwh.value<a.metrics.energy_consumed_kwh.value);assert.equal(reduced.metrics.action_cost_myr.value,100);
});

test('Unknown hard constraints block action branches and Pareto comparisons use vectors',()=>{
 const unknown={...state,assumptions:{}};const buffer=simulatePath(unknown,{actionId:'increase_buffer',seed:2,horizon:2,model:FR12_WORLD_MODEL});assert.equal(buffer.feasibility.status,'indeterminate');assert.equal(buffer.metrics,null);
 const unapproved=simulatePath(state,{actionId:'pay_approved_invoice',seed:2,horizon:2,model:FR12_WORLD_MODEL});assert.equal(unapproved.feasibility.status,'infeasible');
 assert.deepEqual(paretoFront([[1,4],[2,2],[3,5]]),[[1,4],[2,2]]);assert.deepEqual(paretoFront([[1,4],[2,2],[3,5]],'max'),[[3,5]]);
});

test('Comparison keeps the 100 seeded futures in daily quantiles and compact representative branches',async()=>{
 const result=await comparePolicies(state,{horizon:5,scenarios:100,seed:881,model:FR12_WORLD_MODEL});const baseline=result.scenario_runs.find(r=>r.action_id==='no_action');
 assert.equal(result.scenario_count_per_action,100);assert.equal(baseline.trajectory_quantiles.length,6);assert.ok(baseline.representative_paths.length<=3);assert.equal('paths' in baseline,false);assert.equal(result.ranking,'pareto_frontier_no_combined_score');assert.equal('combined_score' in result,false);assert.equal(result.seed,881);
 const again=await comparePolicies(state,{horizon:5,scenarios:100,seed:881,model:FR12_WORLD_MODEL});assert.deepEqual(baseline.trajectory_quantiles,again.scenario_runs.find(r=>r.action_id==='no_action').trajectory_quantiles);
 assert.deepEqual(result.scenario_seed_schedule,again.scenario_seed_schedule);
 assert.ok(result.scenario_runs.every(run=>run.model_version===FR12_WORLD_MODEL.model_version&&run.policy_version===(FR12_WORLD_MODEL.policy.version||FR12_WORLD_MODEL.model_version+':pareto-q')));
 const future=baseline.representative_paths[0];assert.deepEqual(future.references.record_ids,[]);assert.ok(future.path.every(point=>'record_refs'in point&&'evidence_ref_indices'in point&&'evidence_mapping_refs'in point));
 assert.equal(result.policy_runs.no_action,baseline.run_id);assert.ok(result.candidate_action_frontier.every(id=>result.candidate_first_actions.some(action=>action.action_id===id)));
});

test('Unknown route, storage, budget and resource limits block or reject only affected first actions',()=>{
 const explicit={...state,resource_authorization:true,resource_available:true,resource_rest_ok:true,assumptions:{...FR12_WORLD_MODEL.synthetic_assumptions,actions:{
  expedite_delivery:{days_saved:1,cost:100,currency:'MYR',record_ids:['fixture:order:01']},
  increase_buffer:{units:10,cost:50,currency:'MYR',record_ids:['fixture:order:01']},
  qualified_reassignment:{hours_saved:4,cost:25,currency:'MYR',resource_id:'operator-1',task_ids:['fixture:task:01']}
 }}};
 assert.equal(simulatePath(explicit,{actionId:'expedite_delivery',seed:1,horizon:2,model:FR12_WORLD_MODEL}).feasibility.status,'indeterminate');
 assert.equal(simulatePath(explicit,{actionId:'expedite_delivery',seed:1,horizon:2,model:FR12_WORLD_MODEL,constraints:{route_passability:false,cash_budget:{value:500,unit:'MYR'}}}).feasibility.status,'infeasible');
 assert.equal(simulatePath(explicit,{actionId:'increase_buffer',seed:1,horizon:2,model:FR12_WORLD_MODEL,constraints:{cash_budget:{value:500,unit:'MYR'}}}).feasibility.status,'indeterminate');
 assert.equal(simulatePath(explicit,{actionId:'increase_buffer',seed:1,horizon:2,model:FR12_WORLD_MODEL,constraints:{storage_capacity_units:105,cash_budget:{value:500,unit:'MYR'}}}).feasibility.status,'infeasible');
 assert.equal(simulatePath(explicit,{actionId:'increase_buffer',seed:1,horizon:2,model:FR12_WORLD_MODEL,constraints:{storage_capacity_units:500,cash_budget:{value:10,unit:'MYR'}}}).feasibility.status,'infeasible');
 assert.equal(simulatePath(explicit,{actionId:'qualified_reassignment',seed:1,horizon:2,model:FR12_WORLD_MODEL,constraints:{no_resource_double_allocation:true,cash_budget:{value:500,unit:'MYR'}}}).feasibility.status,'indeterminate');
 assert.equal(simulatePath(explicit,{actionId:'qualified_reassignment',seed:1,horizon:2,model:FR12_WORLD_MODEL,constraints:{qualified_role_available:null,no_resource_double_allocation:true,resource_capacities:[{resource_id:'operator-1',capacity:1,allocated_task_ids:[]}],cash_budget:{value:500,unit:'MYR'}}}).feasibility.status,'indeterminate');
 assert.equal(simulatePath(explicit,{actionId:'qualified_reassignment',seed:1,horizon:2,model:FR12_WORLD_MODEL,constraints:{qualified_role_available:true,no_resource_double_allocation:true,resource_capacities:[{resource_id:'operator-1',capacity:1,allocated_task_ids:['fixture:task:01']}],cash_budget:{value:500,unit:'MYR'}}}).feasibility.status,'infeasible');
 assert.equal(simulatePath(explicit,{actionId:'first_expiry_first_out',seed:1,horizon:2,model:FR12_WORLD_MODEL}).feasibility.status,'unsupported');
});

test('Database-backed partial states stay partial and same-time conflicts block affected actions',async()=>{
 const supply={id:'db-supply-1',domain:'supply',occurred_at:'2026-10-01T00:00:00Z',payload:{sku:'A',on_hand:10,daily_demand:2,lead_time_days:3,ordered_qty:20}};
 const energy={id:'db-energy-1',domain:'energy',occurred_at:'2026-10-01T00:00:00Z',payload:{meter_id:'M',period_start:'2026-09-30',period_end:'2026-10-01',kwh:20,baseline_kwh:20}};
 const partial={schema_version:'dormathon.fr12.state.v1',data_basis:'database_operational_records',records:[supply,energy],assumptions:{waste_inventory:{'db-energy-1':{units:10,daily:2,expiry:1}}},clocks:{world_time:'2026-10-01T00:00:00Z'}};
 const summary=await comparePolicies(partial,{actions:['no_action'],horizon:2,scenarios:2,seed:14,model:FR12_WORLD_MODEL});
 assert.equal(summary.status,'partial');const baseline=summary.scenario_runs.find(run=>run.policy_id==='no_action');
 assert.equal(baseline.metrics.fulfilment_gap_days.status,'available');assert.equal(baseline.metrics.cash_gap_myr.status,'insufficient_data');assert.equal(baseline.metrics.expiry_surplus_units.status,'available');assert.equal(baseline.metrics.expiry_surplus_units.unit,'kg');assert.equal(baseline.objectives.find(item=>item.metric==='expiry_surplus_units').unit,'kg');
 const conflict={...partial,records:[supply,{...supply,id:'db-supply-2',payload:{...supply.payload,on_hand:30}}]};
 const branch=simulatePath({...conflict,assumptions:{actions:{expedite_delivery:{days_saved:1,cost:5,currency:'MYR',record_ids:['db-supply-1']}}}},{actionId:'expedite_delivery',seed:15,horizon:2,model:FR12_WORLD_MODEL,constraints:{route_passability:true,cash_budget:{value:50,unit:'MYR'}}});
 assert.equal(branch.feasibility.status,'indeterminate');assert.equal(branch.metrics,null);
});
