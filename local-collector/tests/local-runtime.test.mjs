import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {test} from 'node:test';
import {LocalD1} from '../runtime/sqlite.mjs';
import {localTick} from '../runtime/supervisor.mjs';
import {DEFAULTS} from '../runtime/config.mjs';
import {loadConfig} from '../runtime/config.mjs';
import {dueDay,nextDue,scheduledAt} from '../runtime/calendar.mjs';
import {buildSnapshot,exportSnapshot,verifySnapshot,MAX_SNAPSHOT_BYTES} from '../runtime/snapshot.mjs';
import {CollectorStore} from '../worker/store.js';
import {intelItems,intelCollect,intelEnsureRegistry} from '../worker/global-store.js';
import {stableJSON,sha256} from '../worker/common.js';
import {acquireProcessLock} from '../runtime/process-lock.mjs';
import {transport,body} from './fixtures.mjs';
// This entire suite is offline; every intended transport is an explicit fixture function.
globalThis.fetch=()=>{throw Error('Unexpected real network request in offline runtime tests');};
const c={...DEFAULTS},clock=Date.parse('2026-10-08T01:00:00Z');
test('Targeted success collects one allowed source, preserves nine pending budgets and full-day truth',async()=> {
  const db=new LocalD1(),counts={};
  try {
    const result=await localTick(db,c,{clock,sourceId:'usgs',fetcher:transport(counts)});
    assert.equal(result.status,'in_progress');assert.equal(result.job.summary.sources_succeeded,1);assert.equal(result.external_requests,1);
    assert.deepEqual(counts,{usgs:1});
    for(const [id,state] of Object.entries(result.job.sources))if(id!=='usgs')assert.deepEqual(state,{status:'pending',attempts:0,run_ids:[]});
    const duplicate=await localTick(db,c,{clock:clock+60000,sourceId:'usgs',fetcher:()=>{throw Error('same-day selected success must not refetch');}});
    assert.equal(duplicate.external_requests,0);assert.equal(duplicate.job.sources.usgs.attempts,1);
    const rest=await localTick(db,c,{clock:clock+16*60000,fetcher:transport(counts)});
    assert.equal(rest.status,'complete_success');assert.equal(counts.usgs,1);assert.equal(Object.keys(counts).length,10);
  }finally {db.close();}
});
test('Targeted source validation rejects unknown IDs and arbitrary URLs before registry writes/fetch',async()=> {
  const db=new LocalD1();
  try {
    for(const sourceId of ['unknown','https://localhost/','USGS'])await assert.rejects(localTick(db,c,{clock,sourceId,fetcher:()=>{throw Error('must not fetch');}}),/registered source ID/);
    assert.equal(db.db.prepare('SELECT count(*) n FROM intel_registry').get().n,0);
    assert.equal(db.db.prepare('SELECT count(*) n FROM collector_daily_jobs').get().n,0);
  }finally {db.close();}
});
test('Targeted denied source makes one request, preserves others and obeys source/day retry cap',async()=> {
  const db=new LocalD1(),counts={};
  try {
    let r=await localTick(db,c,{clock,sourceId:'ecb',fetcher:transport(counts,{ecb:true})});
    assert.equal(r.external_requests,1);assert.equal(r.job.sources.ecb.status,'failed');assert.equal(r.job.sources.ecb.attempts,1);
    r=await localTick(db,c,{clock:clock+60000,sourceId:'ecb',fetcher:transport(counts,{ecb:true})});
    assert.equal(r.external_requests,0);assert.equal(r.job.sources.ecb.attempts,1);
    for(const minutes of [16,32,48])r=await localTick(db,c,{clock:clock+minutes*60000,sourceId:'ecb',fetcher:transport(counts,{ecb:true})});
    assert.deepEqual(counts,{ecb:3});assert.equal(r.job.sources.ecb.attempts,3);assert.equal(r.status,'in_progress');
    for(const [id,state] of Object.entries(r.job.sources))if(id!=='ecb')assert.deepEqual(state,{status:'pending',attempts:0,run_ids:[]});
  }finally {db.close();}
});
test('MYT schedule day is deliberate, before08 belongs to prior due day; UTC clocks retained',()=> {
  assert.equal(dueDay(Date.parse('2026-10-08T23:59:59Z'),c),'2026-10-08');
  assert.equal(dueDay(Date.parse('2026-10-09T00:00:00Z'),c),'2026-10-09');
  assert.equal(scheduledAt('2026-10-08',c),Date.parse('2026-10-08T00:00:00Z'));
  assert.equal(nextDue(Date.parse('2026-10-08T01:00:00Z'),c),Date.parse('2026-10-09T00:00:00Z'));
  const eastern={...c,time_zone:'America/New_York'};
  assert.equal(scheduledAt('2026-11-01',eastern),Date.parse('2026-11-01T13:00:00Z'));
});
test('Persistent SQLite migration runs once, restart retains rows and successful day makes no fetch',async()=> {
  const folder=fs.mkdtempSync(path.join(os.tmpdir(),'dormathon-restore-')),file=path.join(folder,'collector.sqlite');
  let db=new LocalD1(file);const counts={};
  try {
    const first=await localTick(db,c,{clock,fetcher:transport(counts)});
    assert.equal(first.status,'complete_success');assert.equal(Object.keys(counts).length,10);
    const before=(await intelItems(new CollectorStore(db),{limit:100})).items;
    db.close();db=new LocalD1(file);
    assert.equal((await localTick(db,c,{clock:clock+60000,fetcher:()=>{throw Error('completed day must not fetch')}})).status,'already_complete');
    assert.deepEqual((await intelItems(new CollectorStore(db),{limit:100})).items,before);
    assert.equal(db.db.prepare('PRAGMA user_version').get().user_version,1);
  }finally {db.close();}
});
test('Failed-only retries honor16min cooldown without burning budget; daily cap3',async()=> {
  const db=new LocalD1();const counts={};
  try {
    let r=await localTick(db,c,{clock,fetcher:transport(counts,{ecb:true})});
    assert.equal(r.job.summary.sources_succeeded,9);assert.equal(r.job.sources.ecb.attempts,1);
    r=await localTick(db,c,{clock:clock+60000,fetcher:transport(counts,{ecb:true})});
    assert.equal(r.job.sources.ecb.attempts,1);assert.equal(counts.ecb,1);
    for(const minutes of [16,32,48])r=await localTick(db,c,{clock:clock+minutes*60000,fetcher:transport(counts,{ecb:true})});
    assert.equal(r.status,'partial_failure');assert.equal(counts.ecb,3);
    assert.ok(Object.entries(counts).filter(([id])=>id!=='ecb').every(([,n])=>n===1));
  }finally {db.close();}
});
test('Sleep/offline catch-up records missed days, fetches present feed once, no fabricated old runs',async()=> {
  const db=new LocalD1();const counts={};
  try {
    await localTick(db,c,{clock,fetcher:transport(counts)});
    const after=await localTick(db,c,{clock:clock+3*86400000,fetcher:transport(counts)});
    assert.equal(after.status,'complete_success');assert.equal(db.db.prepare('SELECT count(*) n FROM collector_daily_jobs').get().n,2);
    const calendar=JSON.parse(db.db.prepare("SELECT value FROM settings WHERE key='local_calendar'").get().value);
    assert.equal(calendar.missed_days.length,1);assert.ok(Object.values(counts).every(n=>n===2));
    assert.match(calendar.missed_days[0].reason,/no historical replay/);
  }finally {db.close();}
});
test('Tick lock suppresses duplicate work without network',async()=> {
  const db=new LocalD1();
  try {
    await intelEnsureRegistry(new CollectorStore(db));
    db.db.prepare('INSERT INTO settings(key,value) VALUES(?,?)').run('collector_tick_lock',JSON.stringify({token:'other',expires:clock+60000}));
    assert.equal((await localTick(db,c,{clock,fetcher:()=>{throw Error('locked means no network')}})).status,'locked');
  }finally {db.close();}
});
test('Atomic source rollback leaves no partial items or versions and preserves failed receipt',async()=> {
  class FailDB extends LocalD1 {async batch(s){if(this.fail){this.fail=false;return super.batch([s[0],{_execute(){throw Error('offline injected transaction fault')}},...s.slice(1)]);}return super.batch(s);}}
  const db=new FailDB();
  try {
    const store=new CollectorStore(db);await intelEnsureRegistry(store);db.fail=true;
    const r=await intelCollect(store,'usgs',async()=>new Response(body('usgs')),clock);
    assert.equal(r.status,'failed');assert.equal(db.db.prepare('SELECT count(*) n FROM intel_items').get().n,0);
    assert.equal(db.db.prepare('SELECT count(*) n FROM intel_versions').get().n,0);
    assert.equal(db.db.prepare('SELECT status FROM intel_runs WHERE id=?').get(r.id).status,'failed');
  }finally {db.close();}
});
for(const attemptBudget of [1,3])test('Crash after atomic success at attempt '+attemptBudget+' recovers durable receipt with no refetch',async()=> {
  const db=new LocalD1();let stop=false;const counts={};
  try {
    await localTick(db,c,{clock,fetcher:async(url,init)=>{const r=await transport(counts)(url,init);stop=true;return r;},shouldStop:()=>stop});
    const row=db.db.prepare('SELECT payload FROM collector_daily_jobs').get(),job=JSON.parse(row.payload);
    const state=Object.values(job.sources).find(s=>s.status==='succeeded');const id=Object.keys(job.sources).find(id=>job.sources[id]===state);
    state.status='attempting';state.attempts=attemptBudget;state.run_ids=[];delete state.last_receipt;
    db.db.prepare('UPDATE collector_daily_jobs SET payload=?,status=?').run(JSON.stringify(job),'in_progress');
    const r=await localTick(db,c,{clock:clock+16*60000,fetcher:transport(counts)});
    assert.equal(r.status,'complete_success');assert.equal(counts[id],1);assert.equal(r.job.sources[id].recovered_from_durable_receipt,true);
  }finally {db.close();}
});
test('Foreground process gate prevents duplicate collectors and releases its own lock',()=> {
  const folder=fs.mkdtempSync(path.join(os.tmpdir(),'dormathon-process-'));
  const release=acquireProcessLock(folder);
  assert.throws(()=>acquireProcessLock(folder),/already running/);
  release();assert.equal(fs.existsSync(path.join(folder,'collector-process.json')),false);
});
test('Unrecognized pre-existing SQLite is never reinitialized',()=> {
  const folder=fs.mkdtempSync(path.join(os.tmpdir(),'dormathon-unknown-db-')),file=path.join(folder,'collector.sqlite');
  const db=new LocalD1(file);db.db.exec('PRAGMA user_version=0');db.close();
  assert.throws(()=>new LocalD1(file),/Unrecognized existing database/);
});
test('Config rejects traversal, unsupported time and invalid timezone before filesystem use',()=> {
  const folder=fs.mkdtempSync(path.join(os.tmpdir(),'dormathon-config-')),file=path.join(folder,'config.json');
  for(const bad of [{data_directory:'../outside'},{exports_directory:'/tmp/outside'},{daily_time:'03:00'},{time_zone:'No/Such_Zone'},{poll_seconds:1},{unknown:true}]) {
    fs.writeFileSync(file,JSON.stringify({...DEFAULTS,...bad}));assert.throws(()=>loadConfig(file));
  }
});
test('Large valid projected collection is split into independently linked Site-cap snapshots',async()=> {
  const db=new LocalD1(),folder=fs.mkdtempSync(path.join(os.tmpdir(),'dormathon-multipart-'));
  try {
    const store=new CollectorStore(db);await intelEnsureRegistry(store);
    const original=JSON.parse(body('usgs')).features[0];
    for(let batch=0;batch<10;batch++) {
      const features=Array.from({length:100},(_,i)=>({...original,id:'synthetic-snapshot-stress-'+batch+'-'+i,properties:{...original.properties,title:'Synthetic multipart stress '+batch+' '+i+' '+('X'.repeat(450)),mag:6}}));
      const receipt=await intelCollect(store,'usgs',async()=>new Response(JSON.stringify({type:'FeatureCollection',features})),clock+batch*16*60000);
      assert.equal(receipt.status,'succeeded');
    }
    const out=await exportSnapshot(db,{...c,exports_directory:folder},clock,1000);
    assert.ok(out.files.length>1,'Actual serialized-byte cap must trigger partitioning');
    let items=0;
    for(const f of out.files) {
      const s=JSON.parse(fs.readFileSync(f.file));await verifySnapshot(s);
      assert.ok(f.bytes<=MAX_SNAPSHOT_BYTES);assert.ok(s.items.length<=1000);assert.ok(s.versions.length<=2000);assert.ok(s.runs.length<=500);assert.ok(s.rule_alerts.length<=1000);
      const versionIds=new Set(s.versions.map(v=>v.id)),itemIds=new Set(s.items.map(i=>i.id)),runIds=new Set(s.runs.map(r=>r.id));
      for(const a of s.rule_alerts){assert.ok(versionIds.has(a.version_id));assert.ok(itemIds.has(a.item_id));}
      for(const v of s.versions){assert.ok(itemIds.has(v.item_id));assert.ok(runIds.has(v.run_id));}
      items+=s.items.length;
    }
    assert.equal(items,1000);
  }finally {db.close();}
});
test('Snapshot integrity/cross-links preserved; current projected handoff is bounded, limit omissions explicit',async()=> {
  const db=new LocalD1(),folder=fs.mkdtempSync(path.join(os.tmpdir(),'dormathon-export-'));
  try {
    await localTick(db,c,{clock,fetcher:transport()});
    const full=await buildSnapshot(db,c,clock);assert.equal(await verifySnapshot(full),true);
    const out=await exportSnapshot(db,{...c,exports_directory:folder},clock,2);
    assert.equal(out.selected_items,2);assert.ok(out.omitted_items>0);
    for(const f of out.files) {
      assert.ok(f.bytes<=MAX_SNAPSHOT_BYTES);
      const s=JSON.parse(fs.readFileSync(f.file));assert.equal(await verifySnapshot(s),true);
      assert.equal(s.catalog_sha256,'8cb6d74e029b066e4dc6660ec32e804078f3e2c941b5140566052fc94191ef27');
      assert.ok(!JSON.stringify(s).includes(folder));
      const versions=new Map(s.versions.map(v=>[v.id,v])),runs=new Set(s.runs.map(r=>r.id));
      for(const item of s.items)assert.ok(versions.has(item.current_version_id));
      for(const version of s.versions){assert.ok(runs.has(version.run_id));const {analyzed_at,...meta}=version.metadata;assert.equal(version.content_hash,await sha256(stableJSON(meta)));}
      s.items[0].title='changed after export';await assert.rejects(verifySnapshot(s));
    }
  }finally {db.close();}
});
test('Export timestamp follows the consistent read boundary, including a completion racing its entry clock',async()=> {
  class BoundaryDB extends LocalD1 {
    prepare(sql) {
      const original=super.prepare(sql),self=this;
      if(!self.inject||!sql.includes("key='global_registry_version'"))return original;
      return {bind(...args) {
        const statement=original.bind(...args),first=statement.first;
        statement.first=async function() {
          const result=await first.call(this);
          // Simulate a source completion committed after export entry but before
          // its consistent SQLite read view. This DB is an isolated fixture only.
          await new Promise(resolve=>setTimeout(resolve,5));
          const row=self.db.prepare("SELECT id,receipt FROM intel_runs WHERE status='succeeded' LIMIT 1").get();
          const receipt=JSON.parse(row.receipt);receipt.completed_at=new Date().toISOString();
          self.boundary=Date.parse(receipt.completed_at);
          self.db.prepare('UPDATE intel_runs SET completed_at=?,receipt=? WHERE id=?').run(receipt.completed_at,JSON.stringify(receipt),row.id);
          return result;
        };
        return statement;
      }};
    }
  }
  const db=new BoundaryDB();
  try {
    await localTick(db,c,{clock,fetcher:transport()});
    const entryClock=Date.now();db.inject=true;
    const snapshot=await buildSnapshot(db,c,entryClock);
    assert.ok(db.boundary>entryClock,'The simulated concurrent completion occurs after exporter entry');
    assert.ok(Date.parse(snapshot.exported_at)>=db.boundary,'File stamp must not precede any committed completion read into it');
    assert.equal(await verifySnapshot(snapshot),true);
  }finally {db.close();}
});
