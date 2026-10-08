import {test} from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import vm from 'node:vm';
import {webcrypto} from 'node:crypto';
import os from 'node:os';import path from 'node:path';import {spawnSync} from 'node:child_process';
test('Exact published Worker bytes execute historical validation, rather than only source modules passing',()=>{
 const built=fs.readFileSync(new URL('../dist/server/index.js',import.meta.url),'utf8');
 const context={TextEncoder,TextDecoder,URL,URLSearchParams,crypto:webcrypto,Request,Response,Headers,console,atob,btoa};vm.createContext(context);
 const script=built.replace(/^export default/gm,'globalThis.publishedWorker =')+'\nglobalThis.artifactHistoryBoundary=(item)=>validateItem(item,REVIEWED_HISTORY.policies[0]);';
 new vm.Script(script).runInContext(context);
 const samples=JSON.parse(fs.readFileSync(new URL('../source-packs/worldbank-gdp/fixtures/normalized-known-source-samples.v0.9.json',import.meta.url),'utf8')).items;
 for(const sample of samples)assert.equal(context.artifactHistoryBoundary(sample),sample);
 const wrong=structuredClone(samples[0]);wrong.facts.unit='PPP_USD';assert.throws(()=>context.artifactHistoryBoundary(wrong));
 assert.equal(typeof context.publishedWorker.fetch,'function');
});
test('Exact built Worker includes employment and ECB validation dependencies and rejects transformed source values',()=>{
 const built=fs.readFileSync(new URL('../dist/server/index.js',import.meta.url),'utf8'),context={TextEncoder,TextDecoder,URL,URLSearchParams,crypto:webcrypto,Request,Response,Headers,console,atob,btoa};vm.createContext(context);
 new vm.Script(built.replace(/^export default/gm,'globalThis.publishedWorker =')+'\nglobalThis.statisticalBoundary=(item)=>validateItem(item,item.source_id===REVIEWED_EMPLOYMENT.policies[0].id?REVIEWED_EMPLOYMENT.policies[0]:REVIEWED_FX.policies[0]);').runInContext(context);
 for(const [name,v]of [['employment','0.12'],['fx','0.13']]){const samples=JSON.parse(fs.readFileSync(new URL('../source-packs/'+name+'/fixtures/normalized-known-source-samples.v'+v+'.json',import.meta.url),'utf8')).items;for(const m of samples)assert.equal(context.statisticalBoundary(m),m);const wrong=structuredClone(samples[0]);wrong.facts.unit_scale=1000;assert.throws(()=>context.statisticalBoundary(wrong));}
});
test('Packager rejects a newly imported Worker dependency before emitting an incomplete release',()=>{
 const scratch=fs.mkdtempSync(path.join(os.tmpdir(),'dormathon-build-closure-'));
 try{for(const name of ['worker','data','static','.openai'])fs.cpSync(new URL('../'+name,import.meta.url),path.join(scratch,name),{recursive:true});fs.mkdirSync(path.join(scratch,'scripts'));fs.copyFileSync(new URL('../scripts/build.mjs',import.meta.url),path.join(scratch,'scripts/build.mjs'));
 const entry=path.join(scratch,'worker/index.js');fs.writeFileSync(entry,"import {missing} from './deliberately-unbundled.js';\n"+fs.readFileSync(entry,'utf8'));
 const result=spawnSync(process.execPath,['scripts/build.mjs'],{cwd:scratch,encoding:'utf8'});assert.notEqual(result.status,0);assert.match(result.stderr,/Unbundled Worker dependency index.js -> deliberately-unbundled.js/);assert.equal(fs.existsSync(path.join(scratch,'dist/server/index.js')),false);
 }finally{fs.rmSync(scratch,{recursive:true,force:true})}
});
