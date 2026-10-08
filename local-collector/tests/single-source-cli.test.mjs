import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';
import assert from 'node:assert/strict';
import {test} from 'node:test';

const source=path.dirname(path.dirname(fileURLToPath(import.meta.url)));
function clone() {
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'Dormathon targeted CLI 中文 '));
  for(const entry of ['collector.mjs','package.json','config.example.json','runtime','worker','data'])fs.cpSync(path.join(source,entry),path.join(root,entry),{recursive:true});
  fs.mkdirSync(path.join(root,'tests'));
  for(const entry of ['fixtures.mjs','global-safe-samples.json','metmalaysia-sarawak-recorded.json'])fs.copyFileSync(path.join(source,'tests',entry),path.join(root,'tests',entry));
  const preload=path.join(root,'tests','offline-targeted-preload.mjs');
  fs.writeFileSync(preload,"import fs from 'node:fs';import {transport} from './fixtures.mjs';const counts={};globalThis.fetch=transport(counts);process.on('exit',()=>fs.writeFileSync(new URL('../counts.json',import.meta.url),JSON.stringify(counts)));\n");
  return {root,preload};
}
test('CLI collect-source succeeds without claiming full-day success; repeat/status/export/verify stay offline',()=> {
  const {root,preload}=clone();
  const call=(...args)=>spawnSync(process.execPath,['--import',preload,'collector.mjs',...args],{cwd:root,encoding:'utf8'});
  const result=call('collect-source','--source','usgs');
  assert.equal(result.status,0,result.stderr);assert.match(result.stdout,/"operation_status": "succeeded"/);assert.match(result.stdout,/"daily_job_status": "in_progress"/);assert.match(result.stdout,/"request_count": 1/);
  assert.deepEqual(JSON.parse(fs.readFileSync(path.join(root,'counts.json'))),{usgs:1});
  const repeated=call('collect-source','--source','usgs');
  assert.equal(repeated.status,0,repeated.stderr);assert.match(repeated.stdout,/"operation_status": "already_succeeded"/);assert.deepEqual(JSON.parse(fs.readFileSync(path.join(root,'counts.json'))),{});
  const status=call('status');assert.equal(status.status,0,status.stderr);
  const jobs=JSON.parse(status.stdout).daily_jobs;assert.equal(jobs[0].summary.sources_succeeded,1);assert.equal(jobs[0].summary.sources_pending,10);
  const exported=call('export-site','--limit','200');assert.equal(exported.status,0,exported.stderr);
  const files=JSON.parse(exported.stdout).files;assert.ok(files.length>0);
  for(const file of files){const verified=call('verify',file.file);assert.equal(verified.status,0,verified.stderr);}
});
test('CLI rejects invalid source syntax and arbitrary URLs before creating collector state',()=> {
  const {root,preload}=clone();
  for(const args of [['collect-source'],['collect-source','--url','https://localhost/'],['collect-source','--source','https://localhost/'],['collect-source','--source','USGS'],['collect-source','--source','usgs','--extra']]) {
    const result=spawnSync(process.execPath,['--import',preload,'collector.mjs',...args],{cwd:root,encoding:'utf8'});
    assert.equal(result.status,2,result.stdout);assert.deepEqual(JSON.parse(fs.readFileSync(path.join(root,'counts.json'))),{});assert.equal(fs.existsSync(path.join(root,'data-local')),false);
  }
});
