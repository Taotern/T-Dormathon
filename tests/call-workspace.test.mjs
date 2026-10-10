import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const data=JSON.parse(fs.readFileSync(new URL('../data/prototype/business-demo.v1.json',import.meta.url)));
const client=fs.readFileSync(new URL('../static/call-workspace.js',import.meta.url),'utf8');
const context=vm.createContext({});
vm.runInContext(client.slice(client.indexOf('function demoAssessment'),client.indexOf('async function callData'))+';globalThis.assess=demoAssessment',context);
test('The same fourteen complete operating matters support exactly four authored risks across the four business tracks',()=>{
 assert.equal(data.cases.length,14);assert.equal(new Set(data.cases.map(c=>c.id)).size,14);
 const counts=Object.fromEntries(['supply','procurement','service','energy'].map(t=>[t,data.cases.filter(c=>c.case_type===t).length]));assert.deepEqual(counts,{supply:4,procurement:4,service:4,energy:2});
 const alerts=data.cases.filter(c=>context.assess(c).active);assert.equal(alerts.length,4);
 for(const c of data.cases){assert.equal(c.input_basis,'synthetic_operational_scenario');assert.equal(c.prediction.trained_model,false);assert.equal(c.prediction.calibrated,false);assert.ok(c.deadline&&c.next_action&&c.documents.length&&c.evidence.query);assert.equal(c.evidence.applicability,'unverified');}
 assert.deepEqual(alerts.map(c=>context.assess(c).value),[360,12000,16,80]);
});
test('Changing operating quantities updates the rule result and withdraws the old authored probability',()=>{
 const c=data.cases[0],before=JSON.stringify(c),r=context.assess(c,{...c.operations,stock_units:800});assert.equal(r.value,0);assert.equal(r.active,false);assert.equal(r.probability,null);assert.equal(r.probability_basis,'not_reassessed_after_input_change');assert.equal(JSON.stringify(c),before);
 const missing=context.assess(c,{...c.operations,daily_use_units:0});assert.equal(missing.value,null);assert.equal(missing.active,false);assert.equal(missing.probability,null);
});
test('Unreconciled payment is neither a nonpayment conclusion nor a calibrated default probability',()=>{
 const c=data.cases.find(c=>c.id==='demo_procurement_03'),r=context.assess(c);assert.equal(r.value,7000);assert.equal(r.metric,'Amount not reconciled');assert.equal(r.probability,null);assert.equal(r.active,false);assert.match(c.notes,/does not prove nonpayment/);
});
test('The produced Worker serves exact protected demo and client bytes while leaving data ownership tables untouched',async()=>{
 const code=fs.readFileSync(new URL('../dist/server/index.js',import.meta.url),'utf8'),worker=(await import('data:text/javascript;base64,'+Buffer.from(code).toString('base64'))).default;
 for(const[path,file]of [['/business-demo.json','../data/prototype/business-demo.v1.json'],['/call-workspace.js','../static/call-workspace.js']]){const r=await worker.fetch(new Request('https://dormathon-risk-private-20261007.liuyz8715.chatgpt.site'+path),{},{});assert.equal(r.status,200);assert.deepEqual(Buffer.from(await r.arrayBuffer()),fs.readFileSync(new URL(file,import.meta.url)));}
});
