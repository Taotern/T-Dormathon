import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {test} from 'node:test';
const root=new URL('../',import.meta.url),manifest=JSON.parse(fs.readFileSync(new URL('data/adapter-provenance.json',root)));
test('All adapter/shared provenance hashes and separately admitted catalog remain exact pinned bytes',()=> {
  for(const file of manifest.files)assert.equal(createHash('sha256').update(fs.readFileSync(new URL(file.path,root))).digest('hex'),file.sha256,file.path);
  assert.equal(createHash('sha256').update(fs.readFileSync(new URL('data/global-source-catalog.json',root))).digest('hex'),manifest.registry_sha256);
});

test('Original ten adapters and legacy catalog stay byte-identical to frozen1.1 input',()=> {const old=JSON.parse(fs.readFileSync(new URL('data/legacy-adapter-provenance.v1.1.json',root)));for(const f of old.files.filter(x=>x.path.startsWith('worker/adapters/')&&!x.path.endsWith('/index.js')))assert.equal(createHash('sha256').update(fs.readFileSync(new URL(f.path,root))).digest('hex'),f.sha256,f.path);assert.equal(createHash('sha256').update(fs.readFileSync(new URL('data/legacy-global-source-catalog.v0.2.json',root))).digest('hex'),old.registry_sha256);});
