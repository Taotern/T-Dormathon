import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
const root=path.resolve(new URL('..',import.meta.url).pathname),pack=path.join(root,'source-packs/history-refresh');
test('Foreground refresh resolves all exact shared dependencies without duplicate adapters or hidden workspace paths',()=>{
 const manifest=JSON.parse(fs.readFileSync(path.join(pack,'DEPENDENCIES.json')));
 assert.equal(manifest.producer_zip_sha256,'dd9f23c1cf24c1892cd4fc8c5f9540f0598c3e8bc8eed00a142bf2289cc1c010');assert.equal(manifest.dependencies.length,24);assert.equal(fs.existsSync(path.join(pack,'adapters')),false);
 for(const pin of manifest.dependencies){const file=path.resolve(root,pin.repository_path);assert.ok(file.startsWith(root+path.sep));assert.equal(createHash('sha256').update(fs.readFileSync(file)).digest('hex'),pin.sha256,pin.repository_path);}
 for(const name of ['refresh.py','project.mjs','canonical.mjs','binary_extract.py']){const code=fs.readFileSync(path.join(pack,name),'utf8');assert.ok(!code.includes('/workspace/shared/'));assert.ok(!code.includes('/workspace/scratch/'));}
 assert.ok(fs.existsSync(path.join(pack,'contracts/refresh-jobs.json')));assert.ok(fs.existsSync(path.join(pack,'fixtures/commodity_reduced.corrected.safe.json')));assert.ok(!fs.existsSync(path.join(pack,'raw')));assert.ok(!fs.existsSync(path.join(pack,'data-local/refresh.sqlite')));
});
