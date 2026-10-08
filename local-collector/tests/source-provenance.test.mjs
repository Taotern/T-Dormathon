import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {test} from 'node:test';
const root=new URL('../',import.meta.url),manifest=JSON.parse(fs.readFileSync(new URL('data/adapter-provenance.json',root)));
test('All 16 pinned adapter/shared files and catalog remain exact upstream bytes',()=> {
  for(const file of manifest.files)assert.equal(createHash('sha256').update(fs.readFileSync(new URL(file.path,root))).digest('hex'),file.sha256,file.path);
  assert.equal(createHash('sha256').update(fs.readFileSync(new URL('data/global-source-catalog.json',root))).digest('hex'),manifest.registry_sha256);
});
