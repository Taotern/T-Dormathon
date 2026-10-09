import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {LocalD1} from './d1-adapter.mjs';

test('Actual emitted Worker serves the exact formal workspace and client assets while preserving the CVD runtime contract',async()=>{
 const source=fs.readFileSync(new URL('../dist/server/index.js',import.meta.url),'utf8').replace('export default{fetch:handleRequest};','globalThis.worker={fetch:handleRequest};');
 const context=vm.createContext({crypto,TextEncoder,TextDecoder,URL,Date,console,Request,Response,atob,btoa});vm.runInContext(source,context);
 const origin='https://dormathon-risk-private-20261007.liuyz8715.chatgpt.site';
 for(const [route,file]of [['/workbench.html','collector-index.html'],['/index.html','collector-index.html'],['/collector-workbench.js','collector-workbench.js'],['/collector-workbench.css','collector-workbench.css']]){
  const response=await context.worker.fetch(new Request(origin+route),{});assert.equal(response.status,200);assert.equal(await response.text(),fs.readFileSync(new URL('../static/'+file,import.meta.url),'utf8'));assert.ok(response.headers.get('Content-Security-Policy'));
 }
 const db=new LocalD1();try{const response=await context.worker.fetch(new Request(origin+'/api/outcomes/status'),{DB:db});assert.equal(response.status,200);const status=await response.json();assert.equal(status.events,0);assert.equal(status.batches[0].expected_rows,171);assert.equal(status.batches[0].expected_chunks,13);assert.equal(status.batches[0].policy_sha256,'07e124dd06428d3e0ea9cb7554249bbef5d85c3944cd42fab321f62268d0f012');}finally{db.close();}
});
