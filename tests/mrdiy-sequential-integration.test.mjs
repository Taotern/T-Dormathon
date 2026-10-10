import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {createHash} from 'node:crypto';
import {MrdiyDemoService} from '../worker/mrdiy-service.js';
import {MRDIY_SCENARIO} from '../worker/mrdiy-fixture.js';
import {compareSequentialPlans} from '../worker/mrdiy-sequential-planner.js';
import {handleRequest} from '../worker/index.js';
import {LocalD1} from './d1-adapter.mjs';
const service=new MrdiyDemoService(),baseline={case_id:'demo_supply_01'},replay={...baseline,event_id:service.eventCatalog().events[0].id,route_leg_id:'DEMO_LEG01',total_delay_days:4,mapping_confirmed:true,impact_confirmed:true,replay_confirmed:true},origin='https://dormathon-risk-private-20261007.liuyz8715.chatgpt.site';
async function api(db,body,handler=handleRequest){const r=await handler(new Request(origin+'/api/mrdiy/sequential-plans',{method:'POST',headers:{'Content-Type':'application/json',Origin:origin},body:JSON.stringify(body)}),{DB:db});return{status:r.status,body:await r.json()};}

test('integrated sequential module is byte-identical to the independently audited final artifact',()=>{
 assert.equal(createHash('sha256').update(fs.readFileSync(new URL('../worker/mrdiy-sequential-planner.js',import.meta.url))).digest('hex'),'c48a501d34ba8e0ac61e881decdcdfa5380cda36e99955ab13bada852572748d');
});

test('baseline service reproduces audited paired tradeoff and retains planned-only semantics',()=>{
 const frozen=JSON.stringify(MRDIY_SCENARIO),r=service.sequentialPlans(baseline),pure=compareSequentialPlans();assert.equal(r.status,'ok');assert.equal(r.input_checksum,pure.input_checksum);assert.equal(r.adaptive_plan.expected.known_conditional_cost_myr,71.016947);assert.equal(r.baselines.open_loop.expected.known_conditional_cost_myr,93.972951);assert.equal(r.adaptive_plan.expected.shortage_units,2.24085);assert.equal(r.baselines.open_loop.expected.shortage_units,2.155276);assert.equal(r.adaptive_plan.expected.continuity_gap_hours,1.3);assert.match(r.comparison.service_tradeoff,/higher expected unserved/);assert.equal(r.replanning_context.basis,'current_session_baseline');assert.equal(r.replanning_context.total_delay_days,2);assert.equal(r.resources_reserved,false);assert.equal(r.automatic_execution,false);assert.equal(r.mcts_used,false);assert.equal(r.trained_rl,false);assert.equal(JSON.stringify(MRDIY_SCENARIO),frozen);
});

test('confirmed event replay is actually used, rather than reusing the cheaper default example',()=>{
 const r=service.sequentialPlans(replay),pure=compareSequentialPlans({assumptions:{delay_days:4}});assert.equal(r.input_checksum,pure.input_checksum);assert.equal(r.replanning_context.basis,'confirmed_event_replay');assert.equal(r.replanning_context.total_delay_days,4);assert.equal(r.replanning_context.actual_company_exposure_established,false);assert.equal(r.adaptive_plan.expected.known_conditional_cost_myr,161.016947);assert.equal(r.baselines.open_loop.expected.known_conditional_cost_myr,273.972951);assert.equal(r.scenario_paths[1].primary_arrival_day,7);assert.equal(r.input_request.event_id,replay.event_id);assert.equal(r.input_request.total_delay_days,4);
});

test('source and impact confirmation cannot be bypassed, and HTTP callers cannot supply future paths or forecast authority',()=>{
 for(const key of ['mapping_confirmed','impact_confirmed','replay_confirmed'])assert.throws(()=>service.sequentialPlans({...replay,[key]:false}),/Confirm/);
 assert.throws(()=>service.sequentialPlans({...replay,event_id:'invented'}),/reviewed saved-source/);assert.throws(()=>service.sequentialPlans({...replay,total_delay_days:2.5}),/integer total delay/);assert.throws(()=>service.sequentialPlans({...baseline,total_delay_days:4}),/require a reviewed event/);assert.throws(()=>service.sequentialPlans({case_id:'mrdiy_supply_16'}),/six linked/);
 for(const field of ['forecast','scenarios','snapshot','selected_package_id','execute','future_demand','true_arrival_day'])assert.throws(()=>service.sequentialPlans({...baseline,[field]:{}}),/Unsupported/);
});

test('canonical reservations survive both decision epochs and are never overwritten by caller quantities',()=>{
 const commitments=[{case_id:'demo_procurement_01',action_id:'practical_rule',cash_myr:999999}],assumptions={shortage_myr_per_unit:15},frozen=JSON.stringify({commitments,assumptions}),r=service.sequentialPlans({...baseline,commitments,assumptions});assert.equal(r.status,'ok');assert.equal(JSON.stringify({commitments,assumptions}),frozen);assert.equal(r.adaptive_plan.first_action_ids.invoice,'practical_rule');assert.equal(r.objective.cost_coefficients.shortage_myr_per_unit,15);for(const t of r.adaptive_plan.trajectories){assert.equal(t.retained_commitments.prior_po_reserved_myr,4160);assert.equal(t.conservation.destination_residual_units,0);assert.equal(t.conservation.source_transfer_residual_units,0);assert.equal(t.conservation.cash_residual_myr,0);assert.equal(t.conservation.payment_executed,false);assert.equal(t.actions.filter(a=>a.slot==='invoice').length,1);}assert.deepEqual(r.input_request.commitments,[{case_id:'demo_procurement_01',action_id:'practical_rule'}]);
});

test('public response keeps equal observation histories grouped while scenario evaluator futures remain separately labelled',()=>{
 const r=service.sequentialPlans(baseline),choices=r.adaptive_plan.second_choices,combined=choices.find(c=>c.conditional_scenarios.length===2);assert.ok(combined);assert.deepEqual(combined.conditional_scenarios.map(c=>c.assumed_conditional_weight),[.6,.4]);assert.equal(combined.action_ids.inventory,'practical_rule');assert.match(r.scenario_probability_basis,/Explicit assumed/);assert.match(r.assumptions.observation,/Identical observations share one action/);
 for(const c of choices){const raw=JSON.stringify(c.observation);assert.doesNotMatch(raw,/demand_units|lost_sales|scenario_id|primary_arrival_day|future/);assert.equal(c.elapsed_days_retained,2);assert.equal(c.observation.elapsed_actuals.length,2);assert.equal(c.observation.cash_available_myr,3840);}
});

test('sequential API is read-only and malformed requests leave all prior workflows usable',async()=>{
 const db=new LocalD1();try{
 await handleRequest(new Request(origin+'/api/mrdiy/scenario'),{DB:db});const before=db.db.prepare('SELECT COUNT(*) n FROM settings').get().n;const r=await api(db,baseline);assert.equal(r.status,200);assert.equal(r.body.status,'ok');assert.equal(db.db.prepare('SELECT COUNT(*) n FROM settings').get().n,before);for(const table of ['sovern_advisor_requests','sovern_advisor_budget'])assert.equal(db.db.prepare('SELECT COUNT(*) n FROM '+table).get().n,0);
 assert.equal((await api(db,{...replay,mapping_confirmed:false})).status,400);assert.equal((await api(db,{...baseline,forecast:{}})).status,400);const original=service.jointPlans(baseline);assert.equal(original.counts.evaluated,72);assert.equal(original.counts.feasible,48);assert.equal(original.demand_outlook.risk.total_projected_shortage_units,25.636107524357328);
 }finally{db.close();}
});

test('single-Worker bundle serves the new rehearsal and retains original replay routes',async()=>{
 const source=fs.readFileSync(new URL('../dist/server/index.js',import.meta.url),'utf8').replace('export default{fetch:handleRequest};','globalThis.worker={fetch:handleRequest};'),context=vm.createContext({crypto,TextEncoder,TextDecoder,URL,Date,console,Request,Response,atob,btoa});vm.runInContext(source,context);const db=new LocalD1();try{const r=await api(db,replay,context.worker.fetch);assert.equal(r.status,200);assert.equal(r.body.status,'ok');assert.equal(r.body.adaptive_plan.expected.known_conditional_cost_myr,161.016947);assert.equal(r.body.input_checksum,service.sequentialPlans(replay).input_checksum);const e=await context.worker.fetch(new Request(origin+'/api/mrdiy/events'),{DB:db});assert.equal(e.status,200);assert.equal((await e.json()).events.length,2);}finally{db.close();}
});
