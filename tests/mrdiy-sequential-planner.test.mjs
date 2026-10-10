import test from 'node:test';
import assert from 'node:assert/strict';
import {compareSequentialPlans,simulateSequentialPlan,createSequentialScenarioSet} from '../worker/mrdiy-sequential-planner.js';
import {MRDIY_SCENARIO} from '../worker/mrdiy-fixture.js';
import {mrdiyDemandOutlook} from '../worker/mrdiy-demand-outlook.js';
import {compareCaseActions} from '../worker/mrdiy-operations.js';
const clone=x=>structuredClone(x),none={inventory:'no_action',route:'no_action',invoice:'no_action',service:'no_action',energy:'no_action'};
const first=compareSequentialPlans();
const scenarios=()=>clone(first.scenario_paths);
const trajectory=(r,id='delayed_base')=>r.trajectories.find(t=>t.scenario_id===id);

test('bounded two-epoch CPU enumeration retains honest labels and fixed objective',()=>{
 assert.equal(first.status,'ok');assert.deepEqual(first.decision_days,[0,2]);assert.equal(first.horizon_days,7);assert.equal(first.counts.first_packages,72);assert.equal(first.counts.first_feasible,48);assert.ok(first.counts.path_evaluations<=6000);assert.equal(first.mcts_used,false);assert.equal(first.automatic_execution,false);assert.equal(first.trained_rl,false);assert.equal(first.objective.frozen_before_evaluation,true);assert.match(first.scenario_probability_basis,/not calibrated/);assert.equal(first.forecast_model,'weekly_total_median_12weeks');assert.ok(first.forecast_ref);assert.ok(first.business_story.some(s=>s.includes('higher expected unserved')));
});
test('default probabilities are explicit and conditional demand uncertainty survives observation',()=>{
 assert.deepEqual(first.scenario_paths.map(p=>p.assumed_weight),[.5,.3,.2]);const branches=first.adaptive_plan.second_choices;assert.equal(branches.length,2);const delay=branches.find(b=>b.conditional_scenarios.length===2);assert.deepEqual(delay.conditional_scenarios.map(p=>p.assumed_conditional_weight),[.6,.4]);assert.equal(delay.action_ids.inventory,'practical_rule');assert.ok(delay.conditional_scenarios.some(p=>p.scenario_id==='delayed_high'));
});
test('all trajectories conserve stock, source transfers, cash and unique receipts',()=>{
 for(const plan of [first.baselines.retain_existing,first.baselines.open_loop,first.adaptive_plan])for(const t of plan.trajectories){assert.equal(t.days.length,7);assert.equal(t.conservation.destination_residual_units,0);assert.equal(t.conservation.source_transfer_residual_units,0);assert.equal(t.conservation.cash_residual_myr,0);assert.equal(t.conservation.receipt_ids_unique,true);assert.equal(t.conservation.existing_po_charged_again,false);assert.equal(t.conservation.payment_executed,false);assert.equal(t.days[0].date,'2026-10-10');assert.equal(t.days[6].date,'2026-10-16');assert.ok(t.days.every(d=>d.ending_available_units>=0&&d.cash_available_myr>=0));}
});
test('nonanticipative first choice is identical across all realized trajectories',()=>{
 const actions=first.adaptive_plan.trajectories.map(t=>t.actions.filter(a=>a.day===0));for(const a of actions)assert.deepEqual(a,actions[0]);
});
test('identical day-2 information implies identical action, including residual high demand',()=>{
 const a=trajectory(first.adaptive_plan,'delayed_base'),b=trajectory(first.adaptive_plan,'delayed_high');assert.deepEqual(a.days.slice(0,2),b.days.slice(0,2));assert.deepEqual(a.actions.filter(x=>x.day===2),b.actions.filter(x=>x.day===2));assert.notDeepEqual(a.days.slice(2).map(x=>x.demand_units),b.days.slice(2).map(x=>x.demand_units));
 for(const branch of first.adaptive_plan.second_choices){const txt=JSON.stringify(branch.observation);assert.doesNotMatch(txt,/scenario_id|future|primary_arrival_day|known_conditional_cost|high_units|low_units/);assert.equal(branch.observation.elapsed_actuals.length,2);}
});
test('changing only future realizations cannot rewrite elapsed state under fixed actions',()=>{
 const a=scenarios(),b=scenarios();b[2].demand_by_day=b[2].demand_by_day.map((x,i)=>i<2?x:x*2);b[2].primary_arrival_day=6;
 const plan={first_action_ids:{energy:'prioritize_safe_load'},second_action_ids:{inventory:'practical_rule'}};
 const x=simulateSequentialPlan({...plan,options:{scenarios:a}}),y=simulateSequentialPlan({...plan,options:{scenarios:b}});assert.deepEqual(trajectory(x,'delayed_high').days.slice(0,2),trajectory(y,'delayed_high').days.slice(0,2));
});
test('scenario IDs and labels do not leak into decisions',()=>{
 const paths=scenarios().map((p,i)=>({...p,id:'renamed_'+i,label:'Different label '+i}));const r=compareSequentialPlans({scenarios:paths});assert.deepEqual(r.adaptive_plan.first_action_ids,first.adaptive_plan.first_action_ids);assert.deepEqual(r.adaptive_plan.second_choices.map(b=>b.action_ids),first.adaptive_plan.second_choices.map(b=>b.action_ids));assert.deepEqual(r.adaptive_plan.expected,first.adaptive_plan.expected);
});
test('open-loop and adaptive comparisons use paired paths and expose cost-shortage tradeoff',()=>{
 const a=first.adaptive_plan,b=first.baselines.open_loop;assert.deepEqual(a.trajectories.map(t=>t.scenario_id).sort(),b.trajectories.map(t=>t.scenario_id).sort());assert.equal(first.comparison.same_scenario_paths,true);assert.equal(first.comparison.same_resource_limits,true);assert.ok(a.expected.known_conditional_cost_myr<=b.expected.known_conditional_cost_myr);assert.ok(first.comparison.adaptive_minus_open_loop_shortage_units>0);assert.match(first.comparison.service_tradeoff,/not dominance/);assert.ok(Math.abs(first.comparison.open_loop_minus_adaptive_known_cost_myr-22.956004)<1e-5);
});
test('replanning cannot release day-0 cash, source inventory, staff or energy commitments',()=>{
 const plan=simulateSequentialPlan({first_action_ids:{inventory:'practical_rule',energy:'prioritize_safe_load'},second_action_ids:{route:'expedite'}});assert.equal(plan.status,'ok');for(const t of plan.trajectories){assert.equal(t.metrics.new_cash_committed_myr,220);assert.equal(t.days[1].cumulative_new_cash_commitment_myr,40);assert.equal(t.days[2].cumulative_new_cash_commitment_myr,220);assert.equal(t.days[2].cumulative_energy_kwh.DEMO_ST01,10.8);assert.equal(t.retained_commitments.cumulative_role_hours.DEMO_ROLE01,3);assert.equal(t.retained_commitments.cumulative_fuel_litres,18);assert.equal(t.days[1].source_ending_available_units,t.days[6].source_ending_available_units);}
});
test('one-off transfers, orders, expediting, invoice work and energy cannot be purchased twice',()=>{
 for(const [slot,id] of [['inventory','practical_rule'],['inventory','replenish'],['route','expedite'],['invoice','practical_rule'],['energy','prioritize_safe_load']]){const r=simulateSequentialPlan({first_action_ids:{[slot]:id},second_action_ids:{[slot]:id}});assert.equal(r.feasible,false,slot);assert.ok(r.binding_constraints.some(c=>c.constraint.startsWith('one_off:')),slot);}
});
test('day-2 transfer is dated, uses source stock, and costs canonical resources',()=>{
 const r=simulateSequentialPlan({second_action_ids:{inventory:'practical_rule'}});for(const t of r.trajectories){assert.equal(t.days[0].same_day_transfer_in_units,0);assert.equal(t.days[2].same_day_transfer_in_units,40);assert.equal(t.days[2].opening_post_decision_available_units,t.days[1].ending_available_units+40);assert.equal(t.metrics.new_cash_committed_myr,40);assert.equal(t.retained_commitments.transport_by_day[2],40);assert.equal(t.retained_commitments.cumulative_role_hours.DEMO_ROLE01,1);}
 assert.match(first.assumptions.transfer_timing,/decision day/);
});
test('new replenishment lead is relative to the decision day and never repays old PO',()=>{
 const r=simulateSequentialPlan({second_action_ids:{inventory:'replenish'}});assert.equal(r.status,'ok');for(const t of r.trajectories){assert.ok(t.days[5].receipt_ids.includes('new_order:day2'));assert.ok(!t.days[3].receipt_ids.includes('new_order:day2'));assert.equal(t.metrics.new_cash_committed_myr,825);assert.equal(t.retained_commitments.prior_po_reserved_myr,4160);}
});
test('a late expedite cannot move receipt into the elapsed past',()=>{
 const r=simulateSequentialPlan({second_action_ids:{route:'expedite'}});const t=trajectory(r,'on_time_base');assert.ok(t.days[3].receipt_ids.includes('DEMO_SHIP01'));assert.ok(!t.days[1].receipt_ids.includes('DEMO_SHIP01'));assert.ok(!t.days[2].receipt_ids.includes('DEMO_SHIP01'));
});
test('received shipment cannot be expedited again or purchased retroactively',()=>{
 const paths=scenarios();paths[0].primary_arrival_day=1;paths[0].carrier_eta_day2=1;const r=simulateSequentialPlan({options:{scenarios:paths},second_action_ids:{route:'expedite'}});assert.equal(r.feasible,false);assert.ok(r.binding_constraints.some(c=>c.constraint==='shipment_still_outstanding'));
});
test('elapsed energy outage cannot be repaired by a new day-2 energy choice',()=>{
 const r=simulateSequentialPlan({second_action_ids:{energy:'prioritize_safe_load'}});assert.equal(r.feasible,false);assert.ok(r.binding_constraints.some(c=>c.constraint==='decision_epoch:energy'));assert.equal(first.baselines.retain_existing.expected.continuity_gap_hours,4);assert.equal(first.adaptive_plan.expected.continuity_gap_hours,1.3);
});
test('hard fuel, cash and cumulative staff budgets mask second-epoch actions',()=>{
 const cases=[['shared_fuel',s=>s.resources.capacities.global_fuel_litres=10,{route:'expedite'}],['shared_cash',s=>s.resources.cash.opening_cash_myr=4165,{inventory:'practical_rule'}],['role_capacity:DEMO_ROLE01',s=>s.objects.roles.find(r=>r.id==='DEMO_ROLE01').available_hours=1,{inventory:'practical_rule'}]];
 for(const [constraint,mutate,second] of cases){const s=clone(MRDIY_SCENARIO);mutate(s);const r=simulateSequentialPlan({options:{snapshot:s},first_action_ids:constraint.startsWith('role')?{energy:'prioritize_safe_load'}:{},second_action_ids:second});assert.equal(r.feasible,false,constraint);assert.ok(r.binding_constraints.some(c=>c.constraint===constraint),constraint);}
});
test('day-specific transport remains bounded; an explicitly dated capacity is not free',()=>{
 const s=clone(MRDIY_SCENARIO);s.resources.capacities.transport_units_per_day=210;const r=simulateSequentialPlan({options:{snapshot:s},second_action_ids:{inventory:'practical_rule',route:'expedite'}});assert.equal(r.feasible,false);assert.ok(r.binding_constraints.some(c=>c.constraint==='dated_transport_capacity'));
});
test('new orders still respect the contract due date at their new decision epoch',()=>{
 const s=clone(MRDIY_SCENARIO);s.objects.purchase_orders[0].contract_due_at='2026-10-14T18:00:00+08:00';const r=simulateSequentialPlan({options:{snapshot:s},second_action_ids:{inventory:'replenish'}});assert.equal(r.feasible,false);assert.ok(r.binding_constraints.some(c=>c.constraint==='contract_date'));
});
test('day-2 role qualification expiry is checked against day 2 rather than copied day 0',()=>{
 const s=clone(MRDIY_SCENARIO);s.objects.roles.find(r=>r.id==='DEMO_ROLE01').qualification_valid_to='2026-10-11T23:59:59+08:00';const r=simulateSequentialPlan({options:{snapshot:s},second_action_ids:{inventory:'practical_rule'}});assert.equal(r.feasible,false);assert.ok(r.binding_constraints.some(c=>c.constraint==='qualification_validity'));
});
test('canonical committed action retained once; untrusted claim amount does not replace it',()=>{
 const r=compareSequentialPlans({commitments:[{case_id:'SC01',action_id:'practical_rule',cash_myr:1}]});for(const t of r.adaptive_plan.trajectories){assert.equal(t.actions.filter(a=>a.slot==='inventory'&&a.action_id==='practical_rule').length,1);assert.equal(t.actions.find(a=>a.slot==='inventory').cash_committed_myr,40);assert.ok(t.metrics.new_cash_committed_myr>=40);}assert.equal(r.adaptive_plan.first_action_ids.inventory,'practical_rule');assert.throws(()=>simulateSequentialPlan({options:{commitments:[{case_id:'SC01',action_id:'practical_rule'}]},first_action_ids:{inventory:'no_action'}}),/Irrevocable/);
});
test('external non-episode reservations are retained in every comparison',()=>{
 const action=compareCaseActions('SC20').actions.find(a=>a.id==='practical_rule');if(!action?.feasible)return;const r=compareSequentialPlans({commitments:[{case_id:'SC20',action_id:'practical_rule',cash_myr:0}]});for(const p of [r.baselines.retain_existing,r.baselines.open_loop,r.adaptive_plan])if(p?.feasible)for(const t of p.trajectories)for(const claim of action.resource_claims.role_hours)assert.ok(t.retained_commitments.cumulative_role_hours[claim.role_id]>=claim.hours);
});
test('invalid scenario weights, dates, numbers, input scope and action names fail closed',()=>{
 for(const mutate of [p=>p[0].assumed_weight=.9,p=>p[0].demand_by_day[0]=-1,p=>p[0].primary_arrival_day=2.5,p=>p.push(clone(p[0])),p=>p[1].id=p[0].id]){const p=scenarios();mutate(p);assert.throws(()=>compareSequentialPlans({scenarios:p}));}
 assert.throws(()=>compareSequentialPlans({paid_gpu:true}));assert.throws(()=>simulateSequentialPlan({first_action_ids:{inventory:'receipt_review'}}),/bounded menu/);assert.throws(()=>simulateSequentialPlan({first_action_ids:{arbitrary:'x'}}));
 const f=mrdiyDemandOutlook('SC01').forecast;f.forecasts[0].date='2026-10-11';assert.throws(()=>compareSequentialPlans({forecast:f}),/dated rows/);
});
test('unknown forecast or stock never becomes fabricated zero',()=>{
 assert.equal(compareSequentialPlans({forecast:{status:'insufficient_data'}}).status,'insufficient_data');const s=clone(MRDIY_SCENARIO);s.resources.inventory.find(i=>i.node_id==='DEMO_ST02'&&i.sku_id==='DEMO_SKU01').on_hand_units=null;assert.equal(compareSequentialPlans({snapshot:s}).status,'insufficient_data');
});
test('repeated evaluation is deterministic and mutates no inputs',()=>{
 const s=clone(MRDIY_SCENARIO),paths=scenarios(),before=JSON.stringify({s,paths});const a=compareSequentialPlans({snapshot:s,scenarios:paths}),b=compareSequentialPlans({snapshot:s,scenarios:paths});assert.deepEqual(a,b);assert.equal(JSON.stringify({s,paths}),before);assert.equal(a.input_checksum,first.input_checksum);
});
test('actual model events are conditional and do not claim company or service failure',()=>{
 assert.ok(first.baselines.retain_existing.trajectories.some(t=>t.model_events.some(e=>e.type==='stockout')));for(const t of first.adaptive_plan.trajectories){assert.ok(t.model_events.some(e=>e.type==='service_dependency_gap'&&e.completion_claimed===false));assert.ok(t.model_events.every(e=>e.basis==='conditional_scenario_only'));}
});

test('storage reservations free only elapsed demand, never future consumption',()=>{
 const s=clone(MRDIY_SCENARIO),store=s.objects.stores.find(x=>x.id==='DEMO_ST01');const physical=s.resources.inventory.filter(x=>x.node_id===store.id).reduce((n,x)=>n+x.on_hand_units,0),inbound=s.objects.shipments.filter(x=>x.to_node===store.id&&x.status==='in_transit').reduce((n,x)=>n+x.quantity_units,0);store.capacity_units=physical+inbound+5;
 const now=simulateSequentialPlan({options:{snapshot:s},first_action_ids:{inventory:'practical_rule'}});assert.equal(now.feasible,false);assert.ok(now.binding_constraints.some(c=>c.constraint==='storage:DEMO_ST01'));
 const later=simulateSequentialPlan({options:{snapshot:s},second_action_ids:{inventory:'practical_rule'}});assert.equal(later.feasible,true); // First two actual days sell >35 units.
 const paths=scenarios().map(p=>({...p,demand_by_day:p.demand_by_day.map((x,i)=>i<2?0:x)}));const notFreed=simulateSequentialPlan({options:{snapshot:s,scenarios:paths},second_action_ids:{inventory:'practical_rule'}});assert.equal(notFreed.feasible,false);assert.ok(notFreed.binding_constraints.some(c=>c.constraint==='storage:DEMO_ST01'));
});
test('zero demand and zero inventory preserve finite zero, with pending receipts retained',()=>{
 const paths=scenarios().map(p=>({...p,primary_arrival_day:10,carrier_eta_day2:10,demand_by_day:Array(7).fill(0)}));const s=clone(MRDIY_SCENARIO),stock=s.resources.inventory.find(x=>x.node_id==='DEMO_ST01'&&x.sku_id==='DEMO_SKU01');stock.on_hand_units=stock.reserved_units;
 const r=simulateSequentialPlan({options:{snapshot:s,scenarios:paths}});assert.equal(r.feasible,true);for(const t of r.trajectories){assert.equal(t.metrics.shortage_units,0);assert.ok(t.pending_receipts.some(e=>e.event_id==='DEMO_SHIP01'&&e.arrival_day===10));assert.equal(t.conservation.destination_residual_units,0);assert.ok(Number.isFinite(t.metrics.known_conditional_cost_myr));}
});
test('unknown other-SKU inbound quantity cannot disappear from hard storage',()=>{
 const s=clone(MRDIY_SCENARIO);s.objects.shipments.push({...clone(s.objects.shipments[0]),id:'unknown_other',sku_id:'DEMO_SKU02',quantity_units:null});const r=compareSequentialPlans({snapshot:s});assert.equal(r.status,'insufficient_data');
});
test('cash-limited alternatives are reported as constraints, never actual payments or failures',()=>{
 const s=clone(MRDIY_SCENARIO);s.resources.cash.opening_cash_myr=4165;const r=compareSequentialPlans({snapshot:s});assert.ok(r.constraint_model_events.length>0);assert.ok(r.constraint_model_events.every(e=>e.type==='cash_limited_alternative'&&e.payment_executed===false&&e.basis==='conditional_constraint_only'));
});
test('all branches with same report retain one action even when actual future arrival differs',()=>{
 const paths=scenarios();paths[2].primary_arrival_day=6;const r=compareSequentialPlans({scenarios:paths});const branches=r.adaptive_plan.second_choices;for(const b of branches)if(b.conditional_scenarios.some(p=>p.scenario_id==='delayed_base'))assert.ok(b.conditional_scenarios.some(p=>p.scenario_id==='delayed_high'));
});

test('censored latent demand cannot distinguish otherwise identical sales observations',()=>{
 const paths=[{id:'a',label:'Lower latent demand',assumed_weight:.5,primary_arrival_day:6,carrier_eta_day2:6,demand_by_day:[200,0,0,0,0,0,0]},{id:'b',label:'Higher latent demand',assumed_weight:.5,primary_arrival_day:6,carrier_eta_day2:6,demand_by_day:[300,0,100,100,100,100,100]}];
 const r=compareSequentialPlans({commitments:[{case_id:'SC01',action_id:'practical_rule'}],scenarios:paths});
 assert.equal(r.adaptive_plan.second_choices.length,1);
 const branch=r.adaptive_plan.second_choices[0];assert.equal(branch.conditional_scenarios.length,2);assert.deepEqual(branch.observation.elapsed_actuals.map(d=>d.fulfilled_units),[100,0]);assert.ok(branch.observation.elapsed_actuals.every(d=>!('demand_units' in d)&&!('lost_sales_units' in d)));
 const [a,b]=r.adaptive_plan.trajectories;assert.deepEqual(a.actions.filter(x=>x.day===2),b.actions.filter(x=>x.day===2));assert.notEqual(a.days[0].demand_units,b.days[0].demand_units);assert.notEqual(a.days[0].lost_sales_units,b.days[0].lost_sales_units);
});
test('generated new-order receipt IDs cannot collide with existing shipment IDs',()=>{
 const s=clone(MRDIY_SCENARIO);s.objects.shipments.push({...clone(s.objects.shipments[0]),id:'new_order:day2',quantity_units:1,arrival_day:5});s.objects.shipments.push({...clone(s.objects.shipments[0]),id:'new_order:day2:1',quantity_units:1,arrival_day:5});
 const r=simulateSequentialPlan({options:{snapshot:s},second_action_ids:{inventory:'replenish'}});assert.equal(r.status,'ok');for(const t of r.trajectories){assert.equal(t.conservation.receipt_ids_unique,true);assert.ok(t.days[5].receipt_ids.includes('new_order:day2'));assert.ok(t.days[5].receipt_ids.includes('new_order:day2:1'));assert.ok(t.days[5].receipt_ids.includes('new_order:day2:2'));assert.equal(new Set(t.days.flatMap(d=>d.receipt_ids)).size,t.days.flatMap(d=>d.receipt_ids).length);assert.equal(t.conservation.destination_residual_units,0);}
});

test('a self-transfer cannot create stock or return a feasible non-conserving result',()=>{
 const s=clone(MRDIY_SCENARIO);s.cases.find(c=>c.scenario_ref==='SC01').config.source_store_id='DEMO_ST01';assert.throws(()=>simulateSequentialPlan({options:{snapshot:s},first_action_ids:{inventory:'practical_rule'}}),/distinct nodes/);assert.throws(()=>compareSequentialPlans({snapshot:s}),/distinct nodes/);
});
