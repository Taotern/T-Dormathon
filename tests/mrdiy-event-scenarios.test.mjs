import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {MrdiyDemoService} from '../worker/mrdiy-service.js';
import {MRDIY_SCENARIO} from '../worker/mrdiy-fixture.js';
import {handleRequest} from '../worker/index.js';
import {LocalD1} from './d1-adapter.mjs';
const service=new MrdiyDemoService(),catalog=service.eventCatalog();
const request={case_id:'demo_supply_01',event_id:catalog.events[0].id,route_leg_id:'DEMO_LEG01',total_delay_days:4,mapping_confirmed:true,impact_confirmed:true,replay_confirmed:true};
const origin='https://dormathon-risk-private-20261007.liuyz8715.chatgpt.site';
async function api(db,path,body,handler=handleRequest){const r=await handler(new Request(origin+path,body===undefined?{}:{method:'POST',headers:{'Content-Type':'application/json',Origin:origin},body:JSON.stringify(body)}),{DB:db});return{status:r.status,body:await r.json()};}

test('saved public events preserve source clocks and never assert current company impact',()=>{
 assert.equal(catalog.status,'ok');assert.equal(catalog.live_refresh_supported,false);assert.equal(catalog.events.length,2);
 const met=catalog.events[0];assert.equal(met.observationKind,'official_warning_not_observed_incident');assert.equal(met.sourceTimezone,null);assert.equal(met.occurredAt,null);assert.equal(met.publishedAt,null);assert.equal(met.sourceIssuedAtRaw,'2026-10-10T13:45:00');assert.match(met.sourceLimits.join(' '),/not a live alert/);
 for(const e of catalog.events){assert.equal(e.replay,true);assert.equal(e.businessImpactVerified,false);assert.equal(e.operationalImpacts,null);assert.equal(e.geographicMatchVerified,false);assert.ok(e.sourceUrl.startsWith('https://'));assert.ok(Date.parse(e.verifiedAt));}
 assert.equal(catalog.mapping.actual_company_exposure_established,false);
});

test('external warning requires all explicit confirmations and bounded operational target',()=>{
 for(const key of ['mapping_confirmed','impact_confirmed','replay_confirmed'])for(const value of [false,undefined,'true',1])assert.throws(()=>service.eventScenario({...request,[key]:value}),/Confirm/);
 for(const value of [-1,6,2.5,'4',null,NaN,Infinity])assert.throws(()=>service.eventScenario({...request,total_delay_days:value}),/integer total delay/);
 assert.throws(()=>service.eventScenario({...request,event_id:'invented'}),/reviewed saved-source/);
 assert.throws(()=>service.eventScenario({...request,route_leg_id:'DEMO_LEG02'}),/DEMO_LEG01/);
 assert.throws(()=>service.eventScenario({...request,case_id:'mrdiy_supply_16'}),/six linked/);
 for(const key of ['source_url','business_severity','probability','execute','forecast','snapshot'])assert.throws(()=>service.eventScenario({...request,[key]:true}),/Unsupported/);
});

test('confirmed delay changes arrival and stock outcomes without changing historical demand or fixture',()=>{
 const frozen=JSON.stringify(MRDIY_SCENARIO),r=service.eventScenario(request);
 assert.equal(r.status,'ok');assert.equal(JSON.stringify(MRDIY_SCENARIO),frozen);assert.equal(r.automatic_execution,false);assert.equal(r.resources_reserved,false);assert.equal(r.comparison_only,true);
 assert.deepEqual(r.before.outlook.history,r.after.outlook.history);assert.deepEqual(r.before.outlook.forecast.forecasts,r.after.outlook.forecast.forecasts);
 assert.equal(r.summary.point_demand_before,148);assert.equal(r.summary.point_demand_after,148);assert.ok(Math.abs(r.summary.unmet_units_before-25.636107524)<1e-6);assert.ok(Math.abs(r.summary.unmet_units_after-68)<1e-6);
 assert.equal(r.summary.affected_shipment_arrival_before,'2026-10-15');assert.equal(r.summary.affected_shipment_arrival_after,'2026-10-17');
 assert.equal(r.provenance.baseline_delay_days,2);assert.equal(r.provenance.total_delay_days,4);assert.equal(r.provenance.delay_change_days,2);assert.equal(r.provenance.actual_company_exposure_established,false);assert.equal(r.provenance.source_claims_delay_days,false);
 assert.equal(r.provenance.event_occurred_at,null);assert.match(r.provenance.source_time_semantics,/no UTC offset/);
});

test('identical package IDs and shared constraints are paired, not independently ranked as causal savings',()=>{
 const r=service.eventScenario(request);assert.equal(r.package_comparisons.length,72);assert.equal(r.summary.feasible_before,48);assert.equal(r.summary.feasible_after,48);
 assert.equal(new Set(r.package_comparisons.map(p=>p.package_id)).size,72);
 for(const p of r.package_comparisons){assert.equal(p.before.package_id,p.after.package_id);assert.deepEqual(p.before.actions,p.after.actions);assert.equal(Math.abs(p.before.stock_conservation_residual_units),0);assert.equal(Math.abs(p.after.stock_conservation_residual_units),0);assert.equal(p.before.cash_reserved_myr,p.after.cash_reserved_myr);assert.equal(p.before.remaining_cash_myr,p.after.remaining_cash_myr);assert.equal(p.delta.continuity_gap_hours,0);assert.ok(Math.abs(p.delta.shortage_units-(p.after.score_vector.shortage_units-p.before.score_vector.shortage_units))<.00011);}
 assert.equal(r.summary.frontier_changes,r.package_comparisons.filter(x=>x.frontier_changed).length);
 assert.equal(r.before.joint.recommended_package_id,undefined);
});

test('zero-change replay exactly preserves physical outputs and source does not force disruption',()=>{
 const r=service.eventScenario({...request,total_delay_days:2});assert.equal(r.summary.unmet_units_change,0);assert.equal(r.provenance.delay_change_days,0);
 for(const p of r.package_comparisons){assert.ok(Object.values(p.delta).every(x=>x===0));assert.equal(p.feasibility_changed,false);assert.equal(p.frontier_changed,false);}
 const noDelay=service.eventScenario({...request,total_delay_days:0});assert.equal(noDelay.provenance.total_delay_days,0);assert.equal(noDelay.summary.affected_shipment_arrival_after,'2026-10-13');
});

test('existing baseline overrides and canonical session reservations remain unchanged across replay',()=>{
 const assumptions={delay_days:1,shortage_myr_per_unit:15},commitments=[{case_id:'demo_procurement_01',action_id:'practical_rule'}],frozen=JSON.stringify({assumptions,commitments});
 const r=service.eventScenario({...request,assumptions,commitments});assert.equal(r.provenance.baseline_delay_days,1);assert.equal(r.provenance.total_delay_days,4);assert.equal(JSON.stringify({assumptions,commitments}),frozen);assert.equal(r.before.joint.frozen_basis.assumptions.shortage_myr_per_unit,15);assert.equal(r.after.joint.frozen_basis.assumptions.shortage_myr_per_unit,15);assert.deepEqual(r.before.joint.pinned_actions,r.after.joint.pinned_actions);assert.equal(r.before.joint.counts.evaluated,36);assert.equal(r.after.joint.counts.evaluated,36);
});

test('all six linked cases can open the same read-only replay while unrelated cases cannot',()=>{
 const base=service.eventScenario(request);
 for(const c of MRDIY_SCENARIO.cases.filter(c=>c.deep_demo)){const r=service.eventScenario({...request,case_id:c.case_id});assert.equal(r.selected_case_id,c.case_id);assert.deepEqual(r.summary,base.summary);assert.deepEqual(r.package_comparisons,base.package_comparisons);}
});

test('historical regional flood preserves geography mismatch and its own UTC source clocks',()=>{
 const event=catalog.events[1],r=service.eventScenario({...request,event_id:event.id});assert.equal(r.event.location.countryCode,'VN');assert.equal(r.provenance.event_occurred_at,'2026-09-03T01:00:00Z');assert.equal(r.provenance.event_published_at,'2026-09-05T06:09:30Z');assert.equal(r.provenance.replay,true);assert.match(r.event.sourceLimits.join(' '),/cannot establish exposure/);assert.equal(r.provenance.actual_company_exposure_established,false);
});

test('event API is bounded and creates no decisions, provider requests or budget claims',async()=>{
 const db=new LocalD1();try{const events=await api(db,'/api/mrdiy/events');assert.equal(events.status,200);assert.equal(events.body.status,'ok');const before=db.db.prepare('SELECT COUNT(*) n FROM settings').get().n;
 const r=await api(db,'/api/mrdiy/event-scenario',request);assert.equal(r.status,200);assert.equal(r.body.status,'ok');assert.equal(db.db.prepare('SELECT COUNT(*) n FROM settings').get().n,before);for(const table of ['sovern_advisor_requests','sovern_advisor_budget'])assert.equal(db.db.prepare('SELECT COUNT(*) n FROM '+table).get().n,0);
 for(const change of [{mapping_confirmed:false},{total_delay_days:9},{actual_company_affected:true}])assert.equal((await api(db,'/api/mrdiy/event-scenario',{...request,...change})).status,400);
 }finally{db.close();}
});

test('emitted Worker includes reviewed catalog and working event comparison without module omissions',async()=>{
 const source=fs.readFileSync(new URL('../dist/server/index.js',import.meta.url),'utf8').replace('export default{fetch:handleRequest};','globalThis.worker={fetch:handleRequest};');const context=vm.createContext({crypto,TextEncoder,TextDecoder,URL,Date,console,Request,Response,atob,btoa});vm.runInContext(source,context);const db=new LocalD1();try{const r=await api(db,'/api/mrdiy/event-scenario',request,context.worker.fetch);assert.equal(r.status,200);assert.equal(r.body.status,'ok');assert.equal(r.body.package_comparisons.length,72);assert.equal(r.body.summary.affected_shipment_arrival_after,'2026-10-17');}finally{db.close();}
});

test('event plan stress uses the exact confirmed replay input, six delay tests by default and no demand inference',()=>{
 const replay=service.eventScenario(request),selected=replay.package_comparisons.find(p=>p.after.feasible&&p.after.pareto_efficient).package_id;
 const r=service.eventPlanStress({...request,selected_package_id:selected});assert.equal(r.status,'ok');assert.equal(r.points.length,6);assert.deepEqual(r.grid.demand_multipliers,[1]);assert.equal(r.reference_input_checksum,replay.after.joint.input_checksum);assert.equal(r.current.delay_days,4);assert.equal(r.actual_company_exposure_established,false);assert.equal(r.source_provides_stress_values,false);assert.deepEqual(r.frozen_basis.base_demand.demand_by_day,replay.after.outlook.forecast.forecasts.map(x=>x.predicted_units));assert.equal(r.resources_reserved,false);
 const expanded=service.eventPlanStress({...request,selected_package_id:selected,include_demand_stress:true});assert.equal(expanded.points.length,30);assert.equal(expanded.reference_input_checksum,r.reference_input_checksum);assert.deepEqual(expanded.current,r.current);
});

test('event stress rejects unconfirmed mapping, caller demand and arbitrary grid workload',()=>{
 const selected=service.eventScenario(request).package_comparisons[0].package_id;
 assert.throws(()=>service.eventPlanStress({...request,selected_package_id:selected,mapping_confirmed:false}),/Confirm/);
 assert.throws(()=>service.eventPlanStress({...request,selected_package_id:selected,include_demand_stress:'true'}),/explicit true or false/);
 for(const field of ['grid','demand','snapshot','pinned_actions'])assert.throws(()=>service.eventPlanStress({...request,selected_package_id:selected,[field]:{}}),/Unsupported/);
 const r=service.eventPlanStress({...request,selected_package_id:'not-a-plan'});assert.equal(r.status,'insufficient_data');assert.deepEqual(r.points,[]);
});

test('emitted event stress endpoint is explicit, six-point bounded, and leaves the provider ledger untouched',async()=>{
 const source=fs.readFileSync(new URL('../dist/server/index.js',import.meta.url),'utf8').replace('export default{fetch:handleRequest};','globalThis.worker={fetch:handleRequest};'),context=vm.createContext({crypto,TextEncoder,TextDecoder,URL,Date,console,Request,Response,atob,btoa});vm.runInContext(source,context);
 const db=new LocalD1();try{const selected=service.eventScenario(request).package_comparisons[0].package_id,r=await api(db,'/api/mrdiy/event-plan-stress',{...request,selected_package_id:selected},context.worker.fetch);assert.equal(r.status,200);assert.equal(r.body.points.length,6);assert.equal(r.body.automatic_execution,false);assert.equal(db.db.prepare("SELECT COUNT(*) n FROM settings WHERE key GLOB 'dormathon_mrdiy_v041_decision:*'").get().n,0);assert.equal(db.db.prepare('SELECT COUNT(*) n FROM sovern_advisor_requests').get().n,0);assert.equal(db.db.prepare('SELECT COUNT(*) n FROM sovern_advisor_budget').get().n,0);}finally{db.close();}
});
