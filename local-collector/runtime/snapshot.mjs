import fs from 'node:fs';
import path from 'node:path';
import {GLOBAL_CATALOG} from '../worker/generated.js';
import {CollectorStore} from '../worker/store.js';
import {intelEnsureRegistry,intelSources} from '../worker/global-store.js';
import {sha256,stableJSON} from '../worker/common.js';
import {nextDue} from './calendar.mjs';

export const MAX_SNAPSHOT_BYTES=1572864;
export const MAX_ARCHIVE_BYTES=25*1024*1024;
export async function buildSnapshot(db,config,clock=Date.now()) {
  const store=new CollectorStore(db);await intelEnsureRegistry(store);
  db.db.exec('BEGIN');
  try {
    const rows=table=>db.db.prepare('SELECT * FROM '+table+' ORDER BY id').all();
    const calendar=db.db.prepare("SELECT value FROM settings WHERE key='local_calendar'").get();
    const heartbeat=db.db.prepare("SELECT value FROM settings WHERE key='local_loop_heartbeat'").get();
    const loop=heartbeat?JSON.parse(heartbeat.value):null;
    let alive=false;if(loop?.state==='running')try {process.kill(loop.pid,0);alive=true;}catch{}
    const catalogBytes=fs.readFileSync(new URL('../data/global-source-catalog.json',import.meta.url));
    const snapshot={
      schema_version:'dormathon.local-intel.snapshot.v1',
      producer:{name:'Dormathon Local Deterministic Collector',version:'1.1.0',source_site_commit:'e197857444fa3c5386d1e896f10c0cc8814d2f9b',sidecar_commit:'4cdbb2202eb06046529dbe819bbbc09279efcece'},
      exported_at:null,catalog_sha256:await sha256(catalogBytes),
      registry:rows('intel_registry').map(r=>({...r,config:JSON.parse(r.config)})),
      sources:await intelSources(store,clock),
      runs:rows('intel_runs').map(r=>JSON.parse(r.receipt)),
      items:rows('intel_items'),
      versions:rows('intel_versions').map(r=>({...r,metadata:JSON.parse(r.metadata)})),
      rule_alerts:rows('intel_rule_alerts').map(r=>({...r,evidence_snapshot:JSON.parse(r.evidence_snapshot)})),
      daily_jobs:rows('collector_daily_jobs').map(r=>JSON.parse(r.payload)),
      scheduling:{execution_mode:'local_open_process',time_zone:config.time_zone,daily_time:config.daily_time,closed_process_runs:false,os_schedule_registered:false,next_due_at:new Date(nextDue(clock,config)).toISOString(),loop_running_observed:alive,loop_heartbeat:loop?{state:loop.state,observed_at:loop.observed_at}:null,missed_days:calendar?JSON.parse(calendar.value).missed_days:[],history_backfill:false,coverage_warning:'Current overlapping feeds only. Missed RSS/live-warning changes may be irrecoverable; no exhaustive history claim.'}
    };
    // A standalone export can overlap a collector committing before this read
    // transaction begins. Stamp the file only after reading its consistent view,
    // rather than reusing a caller's collection-start or pre-transaction clock.
    snapshot.exported_at=new Date(Date.now()).toISOString();
    snapshot.integrity={algorithm:'SHA-256',canonicalization:'stableJSON-v1',payload_sha256:await sha256(stableJSON(snapshot))};
    db.db.exec('COMMIT');return snapshot;
  }catch(e){db.db.exec('ROLLBACK');throw e;}
}
export async function exportSnapshot(db,config,clock=Date.now(),limit=1000) {
  if(!Number.isInteger(limit)||limit<1||limit>1000)throw Error('Site export limit must be an integer from 1 to 1000.');
  const full=await buildSnapshot(db,config,clock);
  const {integrity,...base}=full;
  const byVersion=new Map(full.versions.map(v=>[v.id,v]));
  const projected=async items=> {
    const itemIds=new Set(items.map(i=>i.id));
    const alerts=full.rule_alerts.filter(a=>itemIds.has(a.item_id));
    const versionIds=new Set([...items.map(i=>i.current_version_id),...alerts.map(a=>a.version_id)]);
    const versions=[...versionIds].map(id=>byVersion.get(id));
    if(versions.some(v=>!v))throw Error('Database contains a missing current version; export stopped.');
    const dailyJobs=full.daily_jobs.slice().sort((a,b)=>b.day_key.localeCompare(a.day_key)).slice(0,1);
    const runIds=new Set(versions.map(v=>v.run_id));
    for(const s of full.sources)for(const r of [s.last_attempt,s.last_success])if(r?.id)runIds.add(r.id);
    for(const j of dailyJobs)for(const s of Object.values(j.sources))for(const id of s.run_ids)runIds.add(id);
    const snapshot={...base,items,versions,rule_alerts:alerts,runs:full.runs.filter(r=>runIds.has(r.id)),daily_jobs:dailyJobs,
      export_scope:{mode:'selected_current_items_and_rule_evidence',history_retained_in_local_sqlite:true,history_complete:false,total_local_items:full.items.length,total_local_versions:full.versions.length,total_local_runs:full.runs.length,total_local_rule_alerts:full.rule_alerts.length,selected_item_limit:limit,selected_items:Math.min(full.items.length,limit),omitted_items:Math.max(0,full.items.length-limit),partition_items:items.length,partition_versions:versions.length,partition_rule_alerts:alerts.length,partition_index:1,partition_count:1,note:'Newest first-seen current items, their current versions and every referenced rule-alert version/run. Other revisions and omitted items remain in SQLite. No full historical import claim.'}};
    snapshot.integrity={algorithm:'SHA-256',canonicalization:'stableJSON-v1',payload_sha256:await sha256(stableJSON(snapshot))};
    return snapshot;
  };
  const partitions=[];
  async function split(items) {
    const snapshot=await projected(items);
    const size=Buffer.byteLength(JSON.stringify(snapshot))+1;
    if(items.length<=1000&&snapshot.versions.length<=2000&&snapshot.runs.length<=500&&snapshot.rule_alerts.length<=1000&&size<=MAX_SNAPSHOT_BYTES-1024) {partitions.push(snapshot);return;}
    if(items.length<2)throw Error('Required snapshot evidence exceeds Site import caps. Database is intact; use archive for local review.');
    const middle=Math.ceil(items.length/2);await split(items.slice(0,middle));await split(items.slice(middle));
  }
  const selected=full.items.slice().sort((a,b)=>b.first_seen_at.localeCompare(a.first_seen_at)||a.id.localeCompare(b.id)).slice(0,limit);
  await split(selected);
  fs.mkdirSync(config.exports_directory,{recursive:true});
  const stem='dormathon-snapshot-'+new Date(clock).toISOString().replace(/[:.]/g,'-')+'-'+crypto.randomUUID().slice(0,8);
  const files=[];
  for(let index=0;index<partitions.length;index++) {
    const snapshot=partitions[index];delete snapshot.integrity;
    snapshot.export_scope.partition_index=index+1;snapshot.export_scope.partition_count=partitions.length;
    snapshot.integrity={algorithm:'SHA-256',canonicalization:'stableJSON-v1',payload_sha256:await sha256(stableJSON(snapshot))};
    const body=JSON.stringify(snapshot)+'\n',bytes=Buffer.byteLength(body);
    if(bytes>MAX_SNAPSHOT_BYTES)throw Error('Snapshot cap exceeded before writing; database is intact.');
    const target=path.join(config.exports_directory,stem+'-part'+String(index+1).padStart(3,'0')+'of'+String(partitions.length).padStart(3,'0')+'.json');
    writeExport(target,body);
    files.push({file:target,bytes,payload_sha256:snapshot.integrity.payload_sha256,items:snapshot.items.length,versions:snapshot.versions.length,runs:snapshot.runs.length});
  }
  return {files,import_each_partition:true,export_scope:'selected_current_items_and_rule_evidence',selected_items:selected.length,omitted_items:full.items.length-selected.length,total_local_items:full.items.length,history_retained_in_local_sqlite:true};
}
export async function exportArchive(db,config,clock=Date.now()) {
  const snapshot=await buildSnapshot(db,config,clock),body=JSON.stringify(snapshot)+'\n';
  if(Buffer.byteLength(body)>MAX_ARCHIVE_BYTES)throw Error('Archive exceeds 25 MiB. SQLite is intact; use a stopped-process folder backup.');
  fs.mkdirSync(config.exports_directory,{recursive:true});
  const target=path.join(config.exports_directory,'dormathon-local-archive-'+new Date(clock).toISOString().replace(/[:.]/g,'-')+'-'+crypto.randomUUID().slice(0,8)+'.json');
  writeExport(target,body);return {file:target,bytes:Buffer.byteLength(body),site_importable:false,purpose:'Full local history archive. Site import uses the bounded snapshot files instead.'};
}
function writeExport(target,body) {
  const temporary=target+'.tmp';fs.writeFileSync(temporary,body,{flag:'wx',mode:0o600});fs.renameSync(temporary,target);
}
export async function verifySnapshot(snapshot) {
  if(snapshot?.schema_version!=='dormathon.local-intel.snapshot.v1')throw Error('Unsupported snapshot schema.');
  const {integrity,...payload}=snapshot;
  if(integrity?.algorithm!=='SHA-256'||integrity?.canonicalization!=='stableJSON-v1'||integrity.payload_sha256!==await sha256(stableJSON(payload)))throw Error('Snapshot integrity mismatch.');
  return true; // Corruption detection only; never proves authenticity or grants instruction authority.
}
