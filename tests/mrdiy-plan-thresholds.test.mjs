import test from 'node:test';
import assert from 'node:assert/strict';
import {comparePlanThresholds} from '../worker/mrdiy-plan-thresholds.js';
import {compareJointPackages} from '../worker/mrdiy-joint-planner.js';
import {MRDIY_SCENARIO} from '../worker/mrdiy-fixture.js';
const clone=x=>JSON.parse(JSON.stringify(x));
const id='joint_no_action__expedite__practical_rule__practical_rule__prioritize_safe_load';
const small={delay_days:[2,4],demand_multipliers:[1,1.5]};
const run=(options={})=>comparePlanThresholds({selected_package_id:id,...options});
function freeze(x){if(x&&typeof x==='object'){Object.freeze(x);for(const v of Object.values(x))freeze(v);}return x;}

test('bounded default grid and no automatic recommendation or reservation',()=>{
 const r=run();assert.equal(r.status,'ok');assert.equal(r.points.length,30);assert.equal(r.counts.evaluated_packages,2232);assert.equal(r.counts.feasible_points,30);assert.equal(r.recommended_package_id,null);assert.equal(r.automatic_execution,false);assert.equal(r.resources_reserved,false);assert.equal(r.human_choice_required,true);
 assert.deepEqual(r.grid.delay_days,[0,1,2,3,4,5]);assert.deepEqual(r.grid.demand_multipliers,[0.75,1,1.25,1.5,2]);
 assert.ok(r.points.every(p=>p.selected.package_id===id));
});
test('delay changes demand coverage without falsely changing hard feasibility',()=>{
 const r=run();const at=d=>r.points.find(p=>p.delay_days===d&&p.demand_multiplier===1).selected;
 assert.equal(at(3).covers_demand,true);assert.equal(at(4).covers_demand,false);assert.equal(at(4).shortage_units,20);assert.equal(at(3).feasible,true);assert.equal(at(4).feasible,true);
 const t=r.tested_transitions.find(t=>t.axis==='delay_days'&&t.fixed.demand_multiplier===1&&t.property==='covers_demand');assert.equal(t.from.tested_value,3);assert.equal(t.to.tested_value,4);assert.match(t.interpretation,/No exact threshold/);
 assert.ok(r.points.every(p=>p.selected.continuity_gap_hours===1.3));
});
test('every point matches original planner metrics, constraints, checksum and Pareto set',()=>{
 const r=run();for(const p of r.points){const direct=compareJointPackages({assumptions:{delay_days:p.delay_days},demand:{...r.frozen_basis.base_demand,demand_by_day:r.frozen_basis.base_demand.demand_by_day.map(x=>x*p.demand_multiplier),basis:'explicit_sensitivity_multiplier_of_frozen_company_demand'}});const d=direct.packages.find(x=>x.package_id===id);
 assert.equal(p.selected.input_checksum,direct.input_checksum);assert.equal(p.selected.feasible,d.feasible);assert.deepEqual(p.selected.score_vector,d.score_vector);assert.deepEqual(p.selected.binding_constraints,d.binding_constraints);assert.equal(p.selected.pareto_efficient,d.pareto_efficient);assert.deepEqual(p.selected.alternatives.pareto_package_ids,direct.pareto_package_ids);
 for(const domId of p.selected.alternatives.dominating_package_ids){const dom=direct.packages.find(x=>x.package_id===domId);assert.ok(dom.feasible);assert.ok(Object.keys(d.score_vector).every(k=>dom.score_vector[k]<=d.score_vector[k]));assert.ok(Object.keys(d.score_vector).some(k=>dom.score_vector[k]<d.score_vector[k]));}
 }
});
test('selected package is not silently pinned, and current reference remains exact',()=>{
 const direct=compareJointPackages(),r=run();const d=direct.packages.find(x=>x.package_id===id);assert.equal(r.current.delay_days,2);assert.equal(r.reference_input_checksum,direct.input_checksum);assert.deepEqual(r.current.selected.score_vector,d.score_vector);assert.equal(r.points[0].selected.alternatives.evaluated,72);assert.deepEqual(r.frozen_basis.pinned_actions,{});
});
test('nonconstant forecast path is scaled day by day and provenance retained',()=>{
 const demand={status:'ok',demand_by_day:[1,30,3,40,5,50,7],forecast_ref:'fixture-forecast-123',scenarioDataMode:'SYNTHETIC_INTERNAL',basis:'synthetic_company_forecast_path'};
 const r=run({demand,assumptions:{shortage_myr_per_unit:2},grid:small});assert.deepEqual(r.frozen_basis.base_demand,demand);assert.equal(r.frozen_basis.base_assumptions.shortage_myr_per_unit,2);
 for(const p of r.points){const d=compareJointPackages({demand:{...demand,demand_by_day:demand.demand_by_day.map(x=>x*p.demand_multiplier),basis:'explicit_sensitivity_multiplier_of_frozen_company_demand'},assumptions:{shortage_myr_per_unit:2,delay_days:p.delay_days}}).packages.find(x=>x.package_id===id);assert.deepEqual(p.selected.score_vector,d.score_vector);}
});
test('unknown and foreign demand abstain rather than inventing fixture demand',()=>{
 for(const demand of [{status:'insufficient_data'},{status:'ok',scenarioDataMode:'EXTERNAL_BENCHMARK',demand_by_day:Array(7).fill(20)},{status:'ok',scenarioDataMode:'SYNTHETIC_INTERNAL',demand_by_day:[NaN]}]){const r=run({demand});assert.equal(r.status,'insufficient_data');assert.equal(r.points.length,0);assert.ok(r.missing_inputs.includes('known_company_scenario_demand_path'));}
});
test('unknown energy abstains and missing selected package never silently chooses',()=>{
 const snapshot=clone(MRDIY_SCENARIO);snapshot.objects.facilities[0].efficiency=null;assert.equal(run({snapshot}).status,'insufficient_data');
 for(const options of [{},{selected_package_id:null},{selected_package_id:'not_a_package'}]){const r=comparePlanThresholds(options);assert.equal(r.status,'insufficient_data');assert.equal(r.points.length,0);assert.equal(r.recommended_package_id,null);}
});
test('unsafe energy package remains infeasible with exact constraint reason',()=>{
 const r=run({selected_package_id:id.replace('prioritize_safe_load','practical_rule'),grid:small});assert.equal(r.status,'ok');assert.equal(r.counts.feasible_points,0);assert.ok(r.points.every(p=>p.selected.failed_constraints.some(c=>c.constraint==='backup_duration')));assert.ok(r.points.every(p=>!p.selected.pareto_efficient));assert.ok(r.points.every(p=>p.selected.alternatives.dominating_package_ids.length===0));
});
test('authoritative reservations and explicit pins remain unchanged at each point',()=>{
 const commitments=[{case_id:'SC17',action_id:'practical_rule'}],r=run({commitments,pinned_actions:{route:'expedite'},grid:small});assert.equal(r.current.selected.alternatives.evaluated,18);assert.equal(r.counts.evaluated_packages,90);assert.deepEqual(r.frozen_basis.pinned_actions,{route:'expedite',invoice:'practical_rule'});assert.equal(r.frozen_basis.reservation_pins.length,1);
 assert.equal(run({pinned_actions:{route:'no_action'}}).status,'insufficient_data');
});
test('pre-existing external reservation is resolved authoritatively, no_feasible is not missing',()=>{
 const commitments=[{case_id:'mrdiy_energy_03',action_id:'practical_rule',fuel_litres:0}],r=run({commitments,pinned_actions:{route:'expedite'},grid:small});assert.equal(r.status,'ok');assert.equal(r.counts.feasible_points,0);assert.equal(r.frozen_basis.external_commitments[0].fuel_litres,18);assert.ok(r.points.every(p=>p.status==='no_feasible_package'));assert.ok(r.points.every(p=>p.selected.failed_constraints.some(c=>c.constraint==='shared_fuel')));
});
test('zero demand remains zero across all multipliers, no invented coverage transition',()=>{
 const r=run({demand:{status:'ok',scenarioDataMode:'SYNTHETIC_INTERNAL',demand_by_day:Array(7).fill(0)}});assert.ok(r.points.every(p=>p.selected.shortage_units===0));assert.ok(!r.tested_transitions.some(t=>t.property==='covers_demand'));
});
test('grid ordering is normalized without mutating frozen caller inputs',()=>{
 const options=freeze({snapshot:clone(MRDIY_SCENARIO),selected_package_id:id,grid:{delay_days:[4,2],demand_multipliers:[1.5,1]},assumptions:{delay_days:3},commitments:[]}),before=JSON.stringify(options);const a=comparePlanThresholds(options),b=comparePlanThresholds(options);assert.deepEqual(a,b);assert.equal(JSON.stringify(options),before);assert.deepEqual(a.grid,small);assert.equal(a.current.delay_days,3);assert.equal(a.current.demand_multiplier,1);
});
test('bounded inputs reject excess work, invalid values, unknown axes and execution fields',()=>{
 for(const grid of [{delay_days:[]},{delay_days:[0,1,2,3,4,5,6]},{delay_days:[1,1]},{delay_days:[1.2]},{delay_days:[-1]},{demand_multipliers:[0.49]},{demand_multipliers:[2.01]},{demand_multipliers:[NaN]},{demand_multipliers:[0.5,0.75,1,1.25,1.5,2]},{cash_budget:[100]}])assert.throws(()=>run({grid}));
 assert.throws(()=>run({execute:true}),/Unsupported/);assert.throws(()=>run({assumptions:{not_allowed:1}}),/Unsupported/);
});
test('single tested point is valid and never fabricates a boundary',()=>{
 const r=run({grid:{delay_days:[3],demand_multipliers:[1]}});assert.equal(r.points.length,1);assert.equal(r.tested_transitions.length,0);assert.equal(r.counts.evaluated_packages,144);
});
test('outside-range scaled demand abstains at affected point without zero substitution',()=>{
 const r=run({demand:{status:'ok',scenarioDataMode:'SYNTHETIC_INTERNAL',demand_by_day:Array(7).fill(6000000)},grid:{delay_days:[2],demand_multipliers:[1,2]}});assert.equal(r.status,'insufficient_data');assert.ok(r.points[0].selected);assert.equal(r.points[1].selected,null);assert.ok(r.missing_inputs.includes('known_company_scenario_demand_path'));assert.equal(r.tested_transitions.length,0);
});
