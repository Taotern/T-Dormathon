import {test} from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import path from 'node:path';import {createHash} from 'node:crypto';
test('Curated statistical source packages retain actual entrypoint dependencies and exact public asset manifests',()=>{
 const packs={employment:['run-slice.py','acquire-bounded.py','build-package.mjs','test-contract.mjs','adapters/worldbank-unemployment-annual.mjs','adapters/worldbank-dimensions-pinned.mjs','adapters/normalized-common.mjs','contracts/source-manifest.v0.12.json','contracts/rights-review.v0.12.json','delivery/manifest.json'],fx:['run-slice.py','acquire-fixed.py','build-package.mjs','test-contract.mjs','adapters/ecb-reference-daily.mjs','adapters/normalized-common.mjs','contracts/source-manifest.v0.13.json','contracts/rights-review.v0.13.json','delivery/manifest.json'],'worldbank-gdp':['run.py','reproduce.mjs','test-offline.py','adapters/worldbank-gdp-annual.mjs','adapters/normalized-common.mjs','contracts/route-registry.json','fixtures/held-out-real-rows.json']};
 for(const [name,required]of Object.entries(packs)){
  const root=new URL('../source-packs/'+name+'/',import.meta.url),lines=fs.readFileSync(new URL('MANIFEST-SHA256.txt',root),'utf8').trim().split('\n'),listed=new Set();
  for(const line of lines){const match=line.match(/^([a-f0-9]{64})  (.+)$/);assert.ok(match,'Strict public source-manifest line');const [,sha,file]=match;assert.ok(!path.isAbsolute(file)&&!file.split('/').includes('..'));listed.add(file);assert.equal(createHash('sha256').update(fs.readFileSync(new URL(file,root))).digest('hex'),sha,name+':'+file);}
  for(const file of required)assert.ok(listed.has(file),'Required current entrypoint dependency:'+name+'/'+file);
  assert.ok(![...listed].some(file=>/(?:^|\/)(?:source-data|delivery\/chunks|__pycache__|node_modules|data-local|exports)(?:\/|$)/.test(file)),'External bulk and runtime never part of current source');
 }
});
