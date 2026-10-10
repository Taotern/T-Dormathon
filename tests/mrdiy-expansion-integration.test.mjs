import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {handleRequest} from '../worker/index.js';
import {MRDIY_SCENARIO} from '../worker/mrdiy-fixture.js';
import {sha256,stableJSON} from '../worker/common.js';
import {LocalD1} from './d1-adapter.mjs';
const origin='https://dormathon-risk-private-20261007.liuyz8715.chatgpt.site';
async function expansionApi(db,path,body,handler=handleRequest){const response=await handler(new Request(origin+path,{method:'POST',headers:{'Content-Type':'application/json',Origin:origin},body:JSON.stringify(body)}),{DB:db});return{status:response.status,body:await response.json()};}

test('additive demand and joint-plan routes are read-only, coherent and explicitly synthetic',async()=>{
 const db=new LocalD1(),before=JSON.stringify(MRDIY_SCENARIO);
 try{
  const forecast=await expansionApi(db,'/api/mrdiy/demand-outlook',{case_id:'demo_supply_01'});
  assert.equal(forecast.status,200);assert.equal(forecast.body.status,'ok');assert.equal(forecast.body.scenarioDataMode,'SYNTHETIC_INTERNAL');assert.equal(forecast.body.forecast.forecasts.length,7);assert.equal(forecast.body.automatic_execution,false);
  const supply=await expansionApi(db,'/api/mrdiy/joint-plans',{case_id:'demo_supply_01'}),invoice=await expansionApi(db,'/api/mrdiy/joint-plans',{case_id:'demo_procurement_02'});
  assert.equal(supply.status,200);assert.equal(supply.body.status,'ok');assert.equal(invoice.body.status,'ok');
  assert.equal(supply.body.comparison_only,true);assert.equal(supply.body.resources_reserved,false);assert.equal(supply.body.automatic_execution,false);
  assert.equal(supply.body.selected_case_id,'demo_supply_01');assert.equal(invoice.body.selected_case_id,'demo_procurement_02');
  const {selected_case_id:ignoredA,...a}=supply.body,{selected_case_id:ignoredB,...b}=invoice.body;assert.deepEqual(a,b);
  assert.deepEqual(supply.body.demand_outlook.forecast,forecast.body.forecast);
  assert.equal(JSON.stringify(MRDIY_SCENARIO),before);
  assert.equal(db.db.prepare("SELECT COUNT(*) n FROM settings WHERE key GLOB 'dormathon_mrdiy_v041_decision:*'").get().n,0);
  assert.equal(db.db.prepare('SELECT COUNT(*) n FROM sovern_advisor_requests').get().n,0);
  assert.equal(db.db.prepare('SELECT COUNT(*) n FROM sovern_advisor_budget').get().n,0);
 }finally{db.close();}
});

test('expansion rejects extra fields and unrelated cases, while unknown lead time abstains',async()=>{
 const db=new LocalD1();try{
  const unknown=await expansionApi(db,'/api/mrdiy/demand-outlook',{case_id:'mrdiy_supply_16'});assert.equal(unknown.status,200);assert.equal(unknown.body.status,'insufficient_data');
  const unrelated=await expansionApi(db,'/api/mrdiy/joint-plans',{case_id:'mrdiy_supply_16'});assert.equal(unrelated.body.status,'unsupported');
  for(const route of ['/api/mrdiy/demand-outlook','/api/mrdiy/joint-plans'])assert.equal((await expansionApi(db,route,{case_id:'demo_supply_01',forecast:{predicted_units:0}})).status,400);
 }finally{db.close();}
});

test('new frozen decisions retain the outlook and old hashed artifacts reopen without recomputation',async()=>{
 const db=new LocalD1();try{
  const id='mrdiy_decision_expansion_legacy_001',saved=await expansionApi(db,'/api/mrdiy/decisions',{case_id:'demo_supply_01',action_id:'no_action',disposition:'deferred',rationale:'Fictional compatibility review.',actor_role:'DEMO_ROLE01',decision_id:id});
  assert.equal(saved.body.status,'saved');assert.equal(saved.body.predictive_mechanics.demand_outlook.status,'ok');
  const key='dormathon_mrdiy_v041_decision:'+id,row=db.db.prepare('SELECT value FROM settings WHERE key=?').get(key),legacy=JSON.parse(row.value);
  delete legacy.predictive_mechanics.demand_outlook;legacy.content_hash=await sha256(stableJSON({record:legacy.record,predictive_mechanics:legacy.predictive_mechanics}));
  const raw=stableJSON(legacy);db.db.prepare('UPDATE settings SET value=? WHERE key=?').run(raw,key);
  const response=await handleRequest(new Request(origin+'/api/mrdiy/decision?id='+id),{DB:db}),opened=await response.json();
  assert.equal(response.status,200);assert.equal(opened.artifact_hash_verified,true);assert.equal(opened.reopened.reproduces_saved_basis,true);assert.equal(Object.hasOwn(opened.predictive_mechanics,'demand_outlook'),false);
  assert.equal(db.db.prepare('SELECT value FROM settings WHERE key=?').get(key).value,raw);
 }finally{db.close();}
});

test('emitted single-file Worker actually serves both expansion calculations',async()=>{
 const source=fs.readFileSync(new URL('../dist/server/index.js',import.meta.url),'utf8').replace('export default{fetch:handleRequest};','globalThis.worker={fetch:handleRequest};');
 const context=vm.createContext({crypto,TextEncoder,TextDecoder,URL,Date,console,Request,Response,atob,btoa});vm.runInContext(source,context);
 const db=new LocalD1();try{for(const path of ['/api/mrdiy/demand-outlook','/api/mrdiy/joint-plans']){const r=await expansionApi(db,path,{case_id:'demo_supply_01'},context.worker.fetch);assert.equal(r.status,200);assert.equal(r.body.status,'ok');assert.equal(r.body.automatic_execution,false);}}finally{db.close();}
});
