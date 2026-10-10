import test from 'node:test';
import assert from 'node:assert/strict';
import {compareJointPackages} from '../worker/mrdiy-joint-planner.js';
import {MRDIY_SCENARIO} from '../worker/mrdiy-fixture.js';
import {compareCaseActions} from '../worker/mrdiy-operations.js';
const clone=x=>JSON.parse(JSON.stringify(x));
const pin={inventory:'no_action',route:'no_action',invoice:'no_action',service:'no_action',energy:'no_action'};
const single=(p={},options={})=>compareJointPackages({...options,pinned_actions:{...pin,...p}}).packages[0];

test('72 bounded whole plans retain IDs, human choice, and honest mechanics',()=>{
 const result=compareJointPackages();assert.equal(result.counts.evaluated,72);assert.equal(result.counts.feasible,48);assert.equal(result.recommended_package_id,null);assert.equal(result.trained_rl,false);assert.equal(result.automatic_execution,false);assert.equal(result.baseline.outcomes.inventory.shortage_units,20);assert.equal(result.practical_baseline.feasible,false);assert.ok(result.practical_baseline.binding_constraints.some(c=>c.constraint==='backup_duration'));assert.ok(result.pareto_package_ids.length>0);
 for(const p of result.packages){assert.equal(p.actions.length,5);assert.equal(new Set(p.actions.map(x=>x.case_id)).size,5);assert.equal(p.outcomes.inventory.stock_conservation_residual_units,0);assert.equal(p.outcomes.inventory.events.filter(x=>x.event_id==='DEMO_SHIP01').length,1);assert.equal(p.outcomes.cash.existing_payable_recharged,false);assert.equal(p.outcomes.procurement.planned_arrival_does_not_match_invoice,true);assert.equal(p.outcomes.service.completion_status,'not_observed_or_guaranteed');}
});
test('one route change propagates arrival, inventory, cash, fuel, task dependency',()=>{
 const base=single(),fast=single({route:'expedite'});assert.equal(base.outcomes.transport.planned_arrival_day,5);assert.equal(fast.outcomes.transport.planned_arrival_day,3);assert.equal(fast.outcomes.inventory.shortage_units,0);assert.equal(fast.outcomes.transport.package_fuel_litres,18);assert.equal(fast.outcomes.cash.incremental_package_cash_myr,180);assert.equal(fast.outcomes.service.shipment_dependency_arrival_day,3);assert.equal(fast.outcomes.procurement.current_unmatched_units,base.outcomes.procurement.current_unmatched_units);
});
test('combined replenishment and route act on one conserved trajectory and bind transport',()=>{
 const result=single({inventory:'replenish',route:'expedite'});assert.equal(result.feasible,true);assert.equal(result.outcomes.inventory.events.length,3);assert.equal(result.outcomes.inventory.days[3].arrival_units,320);assert.equal(result.outcomes.inventory.ending_available_units,240);assert.equal(result.outcomes.inventory.stock_conservation_residual_units,0);assert.ok(result.binding_constraints.some(x=>x.constraint==='transport_capacity'&&x.passed));
});
test('an individually feasible action package is rejected by aggregate fuel/transport',()=>{
 const snapshot=clone(MRDIY_SCENARIO);snapshot.resources.capacities.transport_units_per_day=250;
 assert.equal(compareCaseActions('SC01',{snapshot}).actions.find(x=>x.id==='replenish').feasible,true);assert.equal(compareCaseActions('SC02',{snapshot}).actions.find(x=>x.id==='expedite').feasible,true);
 const p=single({inventory:'replenish',route:'expedite'},{snapshot});assert.equal(p.feasible,false);assert.ok(p.binding_constraints.some(x=>x.constraint==='transport_capacity'&&!x.passed));
 const f=clone(MRDIY_SCENARIO);f.resources.capacities.global_fuel_litres=17;assert.equal(single({route:'expedite'},{snapshot:f}).feasible,false);
});
test('unknown demand abstains, zero demand stays finite, forecast provenance survives',()=>{
 assert.equal(compareJointPackages({demand:{status:'insufficient_data'}}).status,'insufficient_data');
 for(const bad of [null,NaN,-1,Infinity]){const demand={status:'ok',demand_by_day:[bad,20,20,20,20,20,20],scenarioDataMode:'SYNTHETIC_INTERNAL'};assert.equal(compareJointPackages({demand}).packages.length,0);}
 const d={status:'ok',demand_by_day:[0,0,0,0,0,0,0],forecast_ref:'synthetic-forecast-v2',scenarioDataMode:'SYNTHETIC_INTERNAL'};const r=compareJointPackages({demand:d});assert.equal(r.baseline.outcomes.inventory.shortage_units,0);assert.equal(r.frozen_basis.demand.forecast_ref,d.forecast_ref);assert.equal(r.baseline.outcomes.inventory.stock_conservation_residual_units,0);
 d.scenarioDataMode='EXTERNAL_BENCHMARK';assert.equal(compareJointPackages({demand:d}).status,'insufficient_data');
});
test('forecast path change recomputes all packages under the same declared path',()=>{
 const demand={status:'ok',demand_by_day:[30,30,30,30,30,30,30],forecast_ref:'higher',scenarioDataMode:'SYNTHETIC_INTERNAL'};
 const r=compareJointPackages({demand});assert.equal(r.baseline.outcomes.inventory.shortage_units,70);for(const p of r.packages)assert.deepEqual(p.outcomes.inventory.days.map(d=>d.demand_units),demand.demand_by_day);
});
test('unknown energy, linked key, and stock inputs abstain without fabricated zero',()=>{
 for(const mutate of [s=>s.objects.facilities[0].efficiency=null,s=>s.cases.find(c=>c.scenario_ref==='SC27').object_refs.shipment_id='different',s=>s.resources.inventory[0].on_hand_units=null,s=>s.cases.find(c=>c.scenario_ref==='SC01').config.lead_days=null]){const s=clone(MRDIY_SCENARIO);mutate(s);const r=compareJointPackages({snapshot:s});assert.equal(r.status,'insufficient_data');assert.equal(r.packages.length,0);}
});
test('inventory transfer and energy priority recalculate exposure without invented downtime',()=>{
 const base=single({inventory:'practical_rule'}),safe=single({inventory:'practical_rule',energy:'prioritize_safe_load'});
 assert.equal(base.outcomes.energy.continuity_gap_hours,4);assert.equal(safe.outcomes.energy.continuity_gap_hours,1.3);
 const e=base.outcomes.energy.receiving_exposure.find(e=>e.event_id.startsWith('planned_transfer'));assert.equal(e.arrives_during_interruption,true);assert.equal(e.arrives_during_uncovered_interval,true);
 assert.equal(safe.outcomes.energy.receiving_exposure.find(e=>e.event_id.startsWith('planned_transfer')).arrives_during_uncovered_interval,false);assert.equal(safe.outcomes.energy.receiving_delay_inferred,false);assert.equal(safe.outcomes.inventory.shortage_units,base.outcomes.inventory.shortage_units);
});
test('compatible episode commitments become pinned slots once and conflicting changes reject',()=>{
 const existing=compareCaseActions('SC01').actions.find(x=>x.id==='practical_rule').resource_claims;
 const r=compareJointPackages({commitments:[existing]});assert.equal(r.pinned_actions.inventory,'practical_rule');assert.equal(r.counts.evaluated,24);assert.equal(r.frozen_basis.external_commitments.length,0);
 for(const p of r.packages)assert.equal(p.resource_ledger.package.stock['DEMO_ST02|DEMO_SKU01'],40);
 assert.throws(()=>compareJointPackages({commitments:[existing],pinned_actions:{inventory:'replenish'}}),/conflicts/);
});
test('aliased SC01/02 action commitments are not a second transfer',()=>{
 const a=compareCaseActions('SC01').actions.find(x=>x.id==='practical_rule').resource_claims,b=compareCaseActions('SC02').actions.find(x=>x.id==='practical_rule').resource_claims;
 const r=compareJointPackages({commitments:[a,b]});assert.equal(r.warnings.length,1);for(const p of r.packages)assert.equal(p.outcomes.inventory.source_stock_reduction_units,40);
});
test('external authoritative reservations cannot be underreported and duplicate case rejects',()=>{
 const p={case_id:'mrdiy_energy_03',action_id:'practical_rule',fuel_litres:0,transport_units:0};
 const r=compareJointPackages({commitments:[p],pinned_actions:{route:'expedite'}});assert.equal(r.status,'no_feasible_package');assert.equal(r.frozen_basis.external_commitments[0].fuel_litres,18);for(const plan of r.packages)assert.ok(plan.binding_constraints.some(c=>c.constraint==='shared_fuel'&&!c.passed));
 assert.throws(()=>compareJointPackages({commitments:[p,p]}),/Only one action/);
});
test('storage, staff and backup energy remain hard conservative limits',()=>{
 const s=clone(MRDIY_SCENARIO);s.objects.roles.find(x=>x.id==='DEMO_ROLE01').available_hours=1;
 const p=single({inventory:'practical_rule',energy:'prioritize_safe_load'},{snapshot:s});assert.equal(p.feasible,false);assert.ok(p.binding_constraints.some(x=>x.constraint==='role_capacity:DEMO_ROLE01'&&!x.passed));
 const r=compareJointPackages();for(const p of r.packages.filter(x=>x.feasible))assert.ok(p.resource_ledger.rows.every(x=>x.remaining>=-1e-7));
});
test('deterministic pure output, immutable snapshots and existing 40 case IDs',()=>{
 const snapshot=clone(MRDIY_SCENARIO),before=JSON.stringify(snapshot),options={snapshot,pinned_actions:{route:'expedite'}};const saved=JSON.stringify(options);assert.deepEqual(compareJointPackages(options),compareJointPackages(options));assert.equal(JSON.stringify(snapshot),before);assert.equal(JSON.stringify(options),saved);assert.equal(snapshot.cases.length,40);
});
test('input boundaries reject unsupported fields, actions and oversized reservations',()=>{
 assert.throws(()=>compareJointPackages({pinned_actions:{route:'unsafe_transfer'}}),/Unsupported pinned/);assert.throws(()=>compareJointPackages({pinned_actions:{mystery:'no_action'}}),/Unsupported pinned/);assert.throws(()=>compareJointPackages({force_execute:true}),/Unsupported joint/);assert.throws(()=>compareJointPackages({commitments:Array(36).fill({})}),/At most 35/);
});
test('all same-store/SKU inbound is counted once with explicit day-zero receipts-before-demand convention',()=>{
 const base=single();assert.deepEqual(base.outcomes.inventory.events.map(x=>[x.event_id,x.day,x.units]),[['DEMO_SHIP01',5,200],['DEMO_SHIP02',3,20]]);assert.deepEqual(base.outcomes.inventory.days.map(x=>x.ending_available_units),[40,20,0,0,0,180,160]);assert.deepEqual(base.outcomes.inventory.days.map(x=>x.lost_sales_units),[0,0,0,0,20,0,0]);
 const fast=single({route:'expedite'});assert.deepEqual(fast.outcomes.inventory.events.map(x=>[x.event_id,x.day]),[['DEMO_SHIP01',3],['DEMO_SHIP02',3]]);
});
test('unknown other same-stream arrival and missing exact exposure mapping abstain',()=>{
 for(const mutate of [s=>s.objects.shipments.find(x=>x.id==='DEMO_SHIP02').arrival_day=null,s=>s.objects.shipments.find(x=>x.id==='DEMO_SHIP02').quantity_units=null,s=>s.exposures=[],s=>s.resources.capacities.global_fuel_litres=null,s=>s.resources.inventory[0].reserved_units=999]){const snapshot=clone(MRDIY_SCENARIO);mutate(snapshot);assert.equal(compareJointPackages({snapshot}).status,'insufficient_data');}
});
test('weaker shortage cost exposes genuine multiple Pareto tradeoffs without autochoice',()=>{
 const result=compareJointPackages({assumptions:{shortage_myr_per_unit:2}});assert.equal(result.pareto_package_ids.length,2);assert.equal(result.recommended_package_id,null);for(const id of result.pareto_package_ids)assert.equal(result.packages.find(p=>p.package_id===id).feasible,true);
});
test('earlier route arrivals cannot increase lost demand or manufacture shipment units',()=>{
 for(const delay of [0,1,2,3,5])for(const daily of [0,7,20,43]){
  const demand={status:'ok',demand_by_day:Array(7).fill(daily),scenarioDataMode:'SYNTHETIC_INTERNAL'};
  const options={assumptions:{delay_days:delay},demand};const slow=single({},options),fast=single({route:'expedite'},options);
  assert.ok(fast.outcomes.inventory.shortage_units<=slow.outcomes.inventory.shortage_units);
  assert.deepEqual(fast.outcomes.inventory.events.map(x=>[x.event_id,x.units]),slow.outcomes.inventory.events.map(x=>[x.event_id,x.units]));
  assert.equal(slow.outcomes.inventory.stock_conservation_residual_units,0);assert.equal(fast.outcomes.inventory.stock_conservation_residual_units,0);
 }
});
test('lead-time changes retain every shipment quantity and only change authored arrival timing',()=>{
 for(const lead of [1,3,5]){const snapshot=clone(MRDIY_SCENARIO);snapshot.cases.find(x=>x.scenario_ref==='SC01').config.lead_days=lead;const p=single({inventory:'replenish',route:'expedite'},{snapshot});assert.equal(p.outcomes.inventory.events.find(x=>x.event_id==='DEMO_SHIP01').units,200);assert.equal(p.outcomes.inventory.events.find(x=>x.event_id==='DEMO_SHIP02').units,20);assert.equal(p.outcomes.inventory.events.find(x=>x.event_id==='DEMO_SHIP02').day,3);assert.equal(p.outcomes.inventory.events.find(x=>x.kind==='new_replenishment').units,100);assert.equal(p.outcomes.inventory.stock_conservation_residual_units,0);}
});
test('invoice alias review uses one staff allocation and never creates payment or receipt',()=>{
 const a=compareCaseActions('SC17').actions.find(x=>x.id==='practical_rule').resource_claims,b=compareCaseActions('SC18').actions.find(x=>x.id==='practical_rule').resource_claims;
 const r=compareJointPackages({commitments:[a,b]});for(const p of r.packages){assert.equal(p.resource_ledger.package.role_hours.DEMO_ROLE02,2);assert.equal(p.outcomes.procurement.payment_executed,false);assert.equal(p.outcomes.cash.existing_payable_recharged,false);assert.equal(p.outcomes.procurement.current_unmatched_units,200);}
});
test('known cost is charged once from resource cash plus inventory carrying/shortage terms',()=>{
 const p=single({inventory:'replenish',route:'expedite',invoice:'practical_rule',service:'practical_rule',energy:'prioritize_safe_load'}),c=p.outcomes.cost.components;
 assert.equal(p.outcomes.cash.incremental_package_cash_myr,100*8+25+180);assert.equal(c.new_cash_commitment_myr,1005);assert.equal(p.outcomes.cost.known_conditional_total_myr,Math.round((c.new_cash_commitment_myr+c.holding_myr+c.shortage_myr-c.terminal_value_myr)*10000)/10000);assert.equal(p.outcomes.cash.prior_po_reserved_myr,4160);
});
test('negative/nonfinite assumptions and reservation claims reject; unsafe energy is absent',()=>{
 for(const n of [-1,NaN,Infinity]){assert.throws(()=>compareJointPackages({assumptions:{delay_days:n}}),/finite allowed range/);assert.throws(()=>compareJointPackages({commitments:[{case_id:'mrdiy_energy_03',action_id:'practical_rule',fuel_litres:n}]}),/Invalid fuel/);}
 assert.throws(()=>compareJointPackages({pinned_actions:{energy:'unsafe_load_shed'}}),/Unsupported pinned/);assert.equal(compareJointPackages({pinned_actions:{energy:'practical_rule'}}).counts.feasible,0);
});

test('reservation pin adoption never mutates caller-provided options or pins',()=>{
 const options={pinned_actions:{route:'expedite'},commitments:[{case_id:'demo_supply_01',action_id:'practical_rule'}]},before=JSON.stringify(options);const r=compareJointPackages(options);assert.equal(JSON.stringify(options),before);assert.equal(r.pinned_actions.inventory,'practical_rule');assert.equal(options.pinned_actions.inventory,undefined);
});
