import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { MRDIY_SCENARIO as D } from '../worker/mrdiy-fixture.js';
import { listCases,openCase,analyzeCase,compareCaseActions,createDecisionRecord,reopenDecisionRecord,validateMrdiySnapshot,energyRuntime,checkExposure,checkRoleConstraints,nextOpenBankDay,reconstructState,outcomeRecord } from '../worker/mrdiy-operations.js';
const copy=x=>JSON.parse(JSON.stringify(x));
const action=(id,a,options={})=>compareCaseActions(id,options).actions.find(x=>x.id===a);
const choice=(id='decision_fixture')=>({decision_id:id,action_id:'practical_rule',disposition:'selected',rationale:'Human reviewed the synthetic constraints and chose a planned action.',actor_role:'DEMO_ROLE01',created_at:D.world_time});

test('40 linked cases preserve 14 IDs and add 26 in 16/10/8/6 with all states',()=>{
 const report=validateMrdiySnapshot();assert.equal(report.valid,true,report.errors.join('\n'));assert.deepEqual(listCases().counts,{supply:16,procurement:10,service:8,energy:6});
 const old=['supply','procurement','service'].flatMap(t=>[1,2,3,4].map(n=>`demo_${t}_${String(n).padStart(2,'0')}`)).concat(['demo_energy_01','demo_energy_02']);assert.deepEqual(D.case_id_crosswalk.filter(x=>x.original_case_id).map(x=>x.case_id).sort(),old.sort());
 assert.equal(new Set(D.cases.map(x=>x.id)).size,40);for(const category of ['supply','procurement','service','energy'])for(const state of ['normal','action_needed','risk','unknown'])assert.ok(D.cases.some(x=>x.case_type===category&&x.state===state));
});

test('source JSON equals worker fixture; eight stores/two DC/24 SKU/six suppliers/three carriers',()=>{
 assert.deepEqual(JSON.parse(fs.readFileSync(new URL('../data/prototype/mrdiy-demo.v0.4.1.json',import.meta.url),'utf8')),D);assert.equal(D.objects.stores.length,8);assert.equal(D.objects.dcs.length,2);assert.equal(D.objects.skus.length,24);assert.equal(D.objects.suppliers.length,6);assert.equal(D.objects.carriers.length,3);assert.ok(D.objects.suppliers.every(x=>x.owned_by_demo===false));
});

test('all 40 complete open/analyze/compare/save/reopen workflows are functional',()=>{
 for(const c of D.cases){const opened=openCase(c.id),analysis=analyzeCase(c.id),comparison=compareCaseActions(c.id);assert.equal(opened.case.id,c.id);assert.equal(opened.org_id,D.org_id);assert.equal(analysis.scenarioDataMode,'SYNTHETIC_INTERNAL');assert.ok(analysis.metrics.length>0);assert.ok(comparison.actions.length>=2);assert.ok(comparison.actions.some(x=>x.id==='no_action'));assert.ok(comparison.actions.some(x=>x.id==='practical_rule'));
 const feasible=comparison.actions.find(x=>x.feasible && !x.baseline),saved=createDecisionRecord(c.id,{...choice('decision_'+c.id),action_id:feasible?.id||'no_action',disposition:c.state==='unknown'?'deferred':'selected'});const reopened=reopenDecisionRecord(saved.record);assert.deepEqual(reopened.analysis,saved.record.analysis);assert.deepEqual(reopened.comparison,saved.record.comparison);assert.equal(reopened.reproduces_saved_basis,true);assert.equal(reopened.implementation_status,'planned_only');}
});

test('six deep cases have one episode and one consistent shared ledger',()=>{
 const cases=D.cases.filter(c=>c.deep_demo);assert.deepEqual(cases.map(x=>x.scenario_ref),['SC01','SC02','SC17','SC18','SC27','SC35']);for(const key of ['store_id','sku_id','po_id','invoice_id','shipment_id','task_id'])assert.ok(cases.every(x=>x.object_refs[key]===cases[0].object_refs[key]),key);assert.equal(openCase('SC35').resources.cash.available_myr,3840);assert.deepEqual(openCase('SC01').resources,openCase('SC18').resources);
});

test('stock conservation includes received stock once and only outstanding shipments',()=>{
 for(const po of D.objects.purchase_orders){const received=D.objects.receipts.filter(x=>x.po_id===po.id).reduce((s,x)=>s+x.accepted_units,0);const onorder=D.objects.shipments.filter(x=>x.po_id===po.id).reduce((s,x)=>s+x.quantity_units,0);assert.equal(received,po.received_units);assert.equal(received+onorder,po.ordered_units);}
 for(const c of D.cases.filter(x=>x.case_type==='supply'&&x.state!=='unknown'))for(const a of compareCaseActions(c.id).actions){assert.equal(a.outcomes.stock_conservation.residual_units,0,c.id+' '+a.id);assert.equal(a.outcomes.network_stock_conservation.transfer_net_units,0);assert.equal(a.outcomes.network_stock_conservation.source_stock_reduction_units,a.outcomes.network_stock_conservation.destination_transfer_increase_units);}
 const invalid=copy(D);invalid.objects.shipments[0].quantity_units+=40;assert.equal(validateMrdiySnapshot(invalid).valid,false);
});

test('hero baseline has 40 simulated lost-sales units and transfer avoids them',()=>{
 const b=action('SC01','no_action'),rule=action('SC01','practical_rule');assert.equal(b.outcomes.metrics.find(x=>x.metric==='Shortage').value,40);assert.equal(rule.outcomes.metrics.find(x=>x.metric==='Shortage').value,0);assert.equal(rule.feasible,true);assert.equal(b.outcomes.unmet_demand,'lost_sales');assert.equal(b.outcomes.external_business_savings,false);
});

test('identical state, horizon, assumptions and exogenous path apply to all candidates',()=>{
 const r=compareCaseActions('SC01');assert.equal(r.frozen_conditions.snapshot_id,D.snapshot_id);assert.equal(r.frozen_conditions.horizon_days,7);assert.equal(r.frozen_conditions.information_cutoff,D.knowledge_as_of);assert.ok(r.actions.every(x=>x.scenarioDataMode==='SIMULATED_OUTCOME'));assert.ok(r.actions.every(x=>x.outcomes.existing_committed_order_cost==='not_recharged_equal_for_every_policy'));
});

test('delay and cost sensitivity change conditional outcomes without changing fixture',()=>{
 const before=JSON.stringify(D);const fast=compareCaseActions('SC01',{assumptions:{delay_days:0,shortage_myr_per_unit:2}});const slow=compareCaseActions('SC01',{assumptions:{delay_days:5,shortage_myr_per_unit:24}});assert.notEqual(fast.assumption_set_id,slow.assumption_set_id);assert.ok(fast.actions[0].outcomes.total_cost_myr<slow.actions[0].outcomes.total_cost_myr);assert.equal(JSON.stringify(D),before);assert.throws(()=>compareCaseActions('SC01',{assumptions:{delay_days:99}}));assert.throws(()=>compareCaseActions('SC01',{assumptions:{probability:0.9}}));assert.throws(()=>compareCaseActions('SC01',{assumptions:{shortage_myr_per_unit:NaN}}));
});

test('capacity/cash/supplier hard constraints reject attractive options before ranking',()=>{
 assert.equal(action('SC01','unsafe_transfer').feasible,false);const storage=action('SC09','replenish');assert.equal(storage.feasible,false);assert.ok(storage.binding_constraints.includes('storage:DEMO_ST04'));const supply=action('SC07','replenish');assert.equal(supply.feasible,false);assert.ok(supply.binding_constraints.includes('supplier_capacity'));for(const c of D.cases){const r=compareCaseActions(c.id);if(r.recommended_action_id)assert.equal(r.actions.find(x=>x.id===r.recommended_action_id).feasible,true);}
});

test('shared commitments prevent duplicate stock, cash, qualified hours and fuel allocation',()=>{
 const first=action('SC24','budget_priority');assert.equal(first.feasible,true);const second=action('SC24','budget_priority',{commitments:[first.resource_claims]});assert.equal(second.feasible,false);assert.ok(second.binding_constraints.includes('shared_cash'));
 const stockClaims={...action('SC01','practical_rule').resource_claims,case_id:'prior_stock_plan',action_id:'prior_plan',stock:[{node_id:'DEMO_ST02',sku_id:'DEMO_SKU01',units:150}],cash_myr:0,role_hours:[],transport_units:0,storage:[]};assert.equal(action('SC35','reallocate_queue',{commitments:[stockClaims]}).feasible,false);
 const energy=action('SC37','practical_rule');assert.equal(energy.feasible,true);assert.equal(action('SC37','practical_rule',{commitments:[energy.resource_claims]}).feasible,false);assert.equal(action('SC37','two_runs').feasible,false);
 const role=action('SC27','practical_rule');assert.equal(role.feasible,true);assert.equal(action('SC27','reassign',{commitments:[role.resource_claims]}).feasible,false);
 assert.throws(()=>compareCaseActions('SC01',{commitments:[first.resource_claims,first.resource_claims]}),/Duplicate commitment/);assert.throws(()=>compareCaseActions('SC01',{commitments:[{case_id:'x',action_id:'y',cash_myr:-1}]}));
});

test('one backup equipment pool cannot be promised twice across sandbox choices',()=>{
 const p=action('SC35','prioritize_safe_load');assert.equal(p.feasible,true);assert.equal(p.resource_claims.energy[0].kwh,10.8);const repeat=action('SC35','prioritize_safe_load',{commitments:[p.resource_claims]});assert.equal(repeat.feasible,false);assert.ok(repeat.binding_constraints.includes('backup_energy:DEMO_ST01'));
 const gen=action('SC36','prioritize_safe_load');assert.ok(gen.resource_claims.fuel_litres>0);assert.ok(gen.resource_claims.fuel_litres<=25);
});

test('invoice evidence mismatch, duplicate, missing docs, currency and ledger uncertainty are distinct',()=>{
 assert.equal(action('SC17','schedule_payment').feasible,false);assert.ok(action('SC17','schedule_payment').binding_constraints.includes('receipt_invoice_match'));assert.ok(action('SC19','schedule_payment').binding_constraints.includes('duplicate_review'));assert.ok(action('SC20','schedule_payment').binding_constraints.includes('documentation'));assert.ok(action('SC23','schedule_payment').binding_constraints.includes('currency'));assert.equal(action('SC25','schedule_payment').feasible,true);const unknown=analyzeCase('SC26');assert.equal(unknown.status,'insufficient_data');assert.equal(unknown.metrics.find(x=>x.metric==='Outstanding payment').value,null);assert.match(unknown.explanation,/unknown/);
});

test('bank calendar rolls Saturday to Monday without claiming true nonpayment',()=>{
 assert.equal(nextOpenBankDay('2026-10-10',D.assumptions.bank_calendar),'2026-10-12');const a=analyzeCase('SC18');assert.equal(a.metrics.find(x=>x.metric==='Contract bank due date').value,'2026-10-12');assert.match(a.explanation,/blocked_approval/);assert.doesNotMatch(a.explanation,/overdue/);
});

test('existing payable funds are reserved once, not an incremental spending claim',()=>{
 const plan=action('SC25','schedule_payment');assert.equal(plan.resource_claims.cash_myr,0);assert.equal(plan.outcomes.cost_components.new_cash_commitment_myr,0);assert.equal(plan.outcomes.cost_components.existing_payable_plan_myr,0);assert.equal(D.resources.cash.opening_cash_myr-Object.values(D.resources.cash.committed_po_myr).reduce((s,x)=>s+x,0),3840);
});

test('service qualifications, rest, shift, authorization and required review are enforced',()=>{
 assert.equal(action('SC27','unqualified_assignment').feasible,false);assert.equal(action('SC31','practical_rule').feasible,false);const role=copy(D.objects.roles[0]);role.rest_hours_before_shift=3;const r=checkRoleConstraints(role,{qualification:'receiving',authorization:'receipt_review',work_hours:2,at:D.world_time});assert.equal(r.feasible,false);assert.equal(r.checks.find(x=>x.constraint==='rest').passed,false);const late=checkRoleConstraints(D.objects.roles[0],{qualification:'receiving',authorization:'receipt_review',work_hours:9,at:D.world_time});assert.equal(late.feasible,false);const review=checkRoleConstraints(D.objects.roles[0],{qualification:'receiving',authorization:'receipt_review',work_hours:1,at:D.world_time,require_review:true});assert.equal(review.feasible,false);
});

test('unfinished and cancelled service outcomes do not turn into failed labels',()=>{
 assert.equal(analyzeCase('SC27').outcome_status,'censored');assert.equal(analyzeCase('SC32').outcome_status,'cancelled');assert.equal(action('SC32','practical_rule').resource_claims.role_hours.length,0);assert.match(analyzeCase('SC33').explanation,/Completion is observed/);assert.equal(outcomeRecord({metric:'completion',unit:'boolean',status:'unknown',censored:true}).causal_effect_identified,false);
});

test('energy unit conversion, critical power, runtime, safety and missing input paths',()=>{
 const battery=energyRuntime(D.objects.facilities[0]);assert.equal(battery.usable_energy_kwh,10.8);assert.equal(battery.runtime_hours,1.8);assert.equal(battery.power_feasible,true);const generator=energyRuntime(D.objects.facilities[1]);assert.equal(generator.usable_energy_kwh,67.5);assert.equal(generator.runtime_hours,2.8125);assert.equal(generator.power_feasible,false);assert.equal(action('SC35','practical_rule').feasible,false);assert.equal(action('SC35','unsafe_load_shed').feasible,false);assert.equal(action('SC38','practical_rule').feasible,false);assert.equal(energyRuntime(D.objects.facilities[5]).runtime_hours,null);assert.equal(analyzeCase('SC40').status,'insufficient_data');assert.equal(compareCaseActions('SC40').recommended_action_id,null);assert.equal(analyzeCase('SC39').risks.length,0);
});

test('incomplete safe energy plan exposes residual gap rather than guaranteed service',()=>{
 const p=action('SC35','prioritize_safe_load');assert.equal(p.feasible,true);assert.equal(p.outcomes.covers_full_window,false);assert.equal(p.outcomes.metrics.find(x=>x.metric==='Continuity gap after priority').value,1.3);assert.ok(p.description.includes('remaining continuity gap'));
});

test('exact route and facility/time exposure required, unrelated/tariff/national news rejected',()=>{
 const good=checkExposure(D.conditions[0],D.exposures[0],{world_time:D.world_time});assert.equal(good.applies,true);assert.equal(good.probability,null);assert.equal(checkExposure(D.conditions[2],D.exposures[1],{world_time:D.world_time}).applies,false);assert.equal(checkExposure(D.conditions[3],D.exposures[1],{world_time:D.world_time}).applies,false);assert.equal(checkExposure({...D.conditions[0],route_leg_id:'DEMO_LEG02'},D.exposures[0],{world_time:D.world_time}).applies,false);assert.equal(checkExposure(D.conditions[0],D.exposures[0],{world_time:'2026-11-01T08:00:00+08:00'}).applies,false);assert.equal(checkExposure({...D.conditions[0],type:'national_protest'},D.exposures[0],{world_time:D.world_time}).applies,false);
});

test('temporal reconstruction rejects late publication/arrival/future correction and honors timezone',()=>{
 const v=[{id:'v1',object_id:'o',version:1,available_at:'2026-10-09T08:00:00+08:00',published_at:'2026-10-09T08:00:00+08:00',acquired_at:'2026-10-10T09:00:00+08:00',effective_from:'2026-10-08T00:00:00Z',effective_to:'2026-10-20T00:00:00Z',revision_at:'2026-10-09T08:00:00+08:00'},{id:'v2',object_id:'o',version:2,available_at:'2026-10-11T08:00:00+08:00',acquired_at:'2026-10-11T08:00:00+08:00',effective_from:'2026-10-08T00:00:00Z',revision_at:'2026-10-11T08:00:00+08:00'}];
 const cutoff={knowledge_as_of:D.knowledge_as_of,world_time:D.world_time};assert.equal(reconstructState(v,{...cutoff,knowledge_mode:'system_known'}).records.length,0);assert.equal(reconstructState(v,{...cutoff,knowledge_mode:'public_known'}).records[0].id,'v1');const later=reconstructState(v,{knowledge_as_of:'2026-10-12T00:00:00Z',world_time:D.world_time,knowledge_mode:'system_known'});assert.equal(later.records[0].id,'v2');assert.ok(later.records.length===1);const tz=reconstructState([{...v[0],acquired_at:'2026-10-10T00:00:00Z'}],{...cutoff,knowledge_mode:'system_known'});assert.equal(tz.records.length,1);
 const proxy=[{...v[0],available_at:null}];assert.equal(reconstructState(proxy,{...cutoff,knowledge_mode:'public_known'}).records.length,0);assert.equal(reconstructState(proxy,{...cutoff,knowledge_mode:'public_known',allow_availability_proxy:true}).records[0].availability_proxy,true);
});

test('unknown fields stay null and no numerical risk/probability/company validation is invented',()=>{
 for(const c of D.cases)for(const risk of analyzeCase(c.id).risks)assert.equal(risk.probability,null);for(const id of ['SC16','SC26','SC34','SC40']){const r=compareCaseActions(id);assert.equal(r.status,'insufficient_data');assert.equal(r.recommended_action_id,null);assert.ok(r.analysis.missing_inputs.length);assert.equal(r.actions[0].outcomes.total_cost_myr,null);}
 assert.equal(D.benchmark_separation.rows_in_operational_records,0);assert.equal(D.benchmark_separation.company_predictive_validation,false);assert.ok(D.synthetic_sales_history.every(x=>x.scenarioDataMode==='SYNTHETIC_INTERNAL'));
});

test('saved choice is frozen across future fixture source/assumption changes',()=>{
 const saved=createDecisionRecord('SC01',choice());const original=copy(saved.record);const revised=copy(D);revised.resources.inventory[0].on_hand_units=500;revised.evidence[2].version='future';const reopened=reopenDecisionRecord(saved.record);assert.deepEqual(reopened.record,original);assert.equal(reopened.source_revisions_after_save_used,false);const mutated=copy(saved.record);mutated.snapshot.resources.cash.opening_cash_myr+=1;assert.throws(()=>reopenDecisionRecord(mutated),/checksum/);
});

test('infeasible human selection rejected; reject/defer saves exact action and rationale',()=>{
 assert.throws(()=>createDecisionRecord('SC01',{...choice(),action_id:'unsafe_transfer'}),/infeasible/);const rejected=createDecisionRecord('SC01',{...choice(),action_id:'unsafe_transfer',disposition:'rejected'});assert.equal(rejected.record.action_status,'planned');assert.equal(rejected.record.implemented_action,null);assert.equal(rejected.record.choice.disposition,'rejected');assert.throws(()=>createDecisionRecord('SC01',{...choice(),rationale:''}));
});

test('prohibited sensitive fields or benchmark operational modes fail fixture integrity',()=>{
 const bad=copy(D);bad.objects.roles[0].diagnosis='forbidden';assert.equal(validateMrdiySnapshot(bad).valid,false);const benchmark=copy(D);benchmark.objects.receipts[0].scenarioDataMode='EXTERNAL_BENCHMARK';assert.equal(validateMrdiySnapshot(benchmark).valid,false);
});

test('function calls never mutate fixture or perform external action',()=>{
 const before=JSON.stringify(D);for(const c of D.cases) {openCase(c.id);analyzeCase(c.id);compareCaseActions(c.id);}createDecisionRecord('SC01',choice());assert.equal(JSON.stringify(D),before);assert.equal(createDecisionRecord('SC01',choice()).record.automatic_execution,false);
});

test('integration v0.4.1.1 reserves physical stock and committed inbound exactly once before proposed storage',()=>{
 const d=copy(D),node=d.objects.stores.find(x=>x.id==='DEMO_ST01'),physical=d.resources.inventory.filter(x=>x.node_id===node.id).reduce((n,x)=>n+x.on_hand_units,0),incoming=d.objects.shipments.filter(x=>x.to_node===node.id&&x.status==='in_transit').reduce((n,x)=>n+x.quantity_units,0);
 assert.equal(physical,2219);assert.equal(incoming,220);node.capacity_units=physical+incoming+39;
 const proposal=action('demo_supply_01','practical_rule',{snapshot:d}),check=proposal.constraint_checks.find(x=>x.constraint==='storage:'+node.id);assert.equal(proposal.feasible,false);assert.equal(check.available,39);assert.equal(check.required,40);
 node.capacity_units=physical+incoming+40;assert.equal(action('demo_supply_01','practical_rule',{snapshot:d}).feasible,true);
 const committed={case_id:'mrdiy_supply_15',action_id:'other_future_storage',cash_myr:0,stock:[],role_hours:[],fuel_litres:0,storage:[{node_id:node.id,units:1}],energy:[],transport_units:0};assert.equal(action('demo_supply_01','practical_rule',{snapshot:d,commitments:[committed]}).feasible,false);
 const reserved=d.resources.inventory.find(x=>x.node_id===node.id&&x.sku_id==='DEMO_SKU01').reserved_units;assert.equal(reserved,20);assert.equal(action('demo_supply_01','practical_rule',{snapshot:d}).constraint_checks.find(x=>x.constraint==='storage:'+node.id).available,40,'Reserved units are already inside physical on-hand and must not be added again');
 node.capacity_units=physical+incoming-1;assert.equal(validateMrdiySnapshot(d).valid,false);
});
