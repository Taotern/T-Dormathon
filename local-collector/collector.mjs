#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import {setTimeout as sleep} from 'node:timers/promises';

if(Number(process.versions.node.split('.')[0])!==24) {
  console.error('Use Node.js 24.x. This package uses the built-in node:sqlite module and needs no npm install.');
  process.exit(2);
}
const args=process.argv.slice(2),command=args[0]||'help';
const commands=new Set(['diagnose','status','once','collect-source','loop','export','export-site','archive','verify','help']);
if(!commands.has(command)){console.error('Unknown command. Use: node collector.mjs help');process.exit(2);}
if(command==='help') {
  console.log('Dormathon local collector\n  diagnose  Offline runtime/path/database checks; no provider requests\n  status    Show durable job status; no provider requests\n  once      Collect all ten sources for the current due day, then export JSON\n  collect-source --source ID  Collect only one enabled registered source; same daily ledger/retry caps\n  loop      Keep this window open; daily collection and failed-only retry\n  export    Export bounded Site snapshot partitions; no provider requests\n  archive   Export full history for local review, not Site import\n  verify FILE  Detect snapshot corruption; not an authenticity check\n\nDefault: daily 08:00 Asia/Kuching. No OS task, service, firewall, cloud or credential is created.\nOffline tests: node scripts/test.mjs');
  process.exit(0);
}
const {loadConfig,ROOT}=await import('./runtime/config.mjs');
const {LocalD1}=await import('./runtime/sqlite.mjs');
const {localTick,setting}=await import('./runtime/supervisor.mjs');
const {exportSnapshot,exportArchive,verifySnapshot}=await import('./runtime/snapshot.mjs');
const {CollectorStore}=await import('./worker/store.js');
const {intelEnsureRegistry,intelStatus,intelSources}=await import('./worker/global-store.js');
const {nextDue}=await import('./runtime/calendar.mjs');
const {acquireProcessLock}=await import('./runtime/process-lock.mjs');
let db=null,releaseProcess=null,stopping=false;
const abort=new AbortController();
let wake=null;
function stop(){stopping=true;abort.abort();wake?.abort();}
process.once('SIGINT',stop);process.once('SIGTERM',stop);
const output=value=>console.log(JSON.stringify(value,null,2));
try {
  let sourceId=null;
  if(command==='collect-source') {
    if(args.length!==3||args[1]!=='--source')throw Error('Usage: node collector.mjs collect-source --source REGISTERED_ID');
    sourceId=args[2];
    const {GLOBAL_CATALOG}=await import('./worker/generated.js');
    if(!GLOBAL_CATALOG.sources.some(s=>s.id===sourceId&&s.enabled))throw Error('Unknown or disabled source ID. Use one registered ID; arbitrary URLs are not accepted.');
  }
  const config=loadConfig();
  if(command==='verify') {
    if(args.length!==2)throw Error('Usage: node collector.mjs verify FILE');
    const stat=fs.statSync(args[1]);if(stat.size>25*1024*1024)throw Error('File exceeds snapshot cap.');
    await verifySnapshot(JSON.parse(fs.readFileSync(args[1],'utf8')));
    output({integrity:'valid',authenticity:'not established',file:path.resolve(args[1])});
  }else if(command==='diagnose') {
    db=new LocalD1();
    await intelEnsureRegistry(new CollectorStore(db));
    const check=db.db.prepare("SELECT json_extract('{\"ok\":1}','$.ok') AS ok").get();
    const paths=[];
    for(const folder of [config.data_directory,config.exports_directory]) {
      fs.mkdirSync(folder,{recursive:true});
      const temporary=path.join(folder,'.diagnostic-'+crypto.randomUUID());
      fs.writeFileSync(temporary,'offline write probe',{flag:'wx'});fs.unlinkSync(temporary);
      paths.push({directory:folder,writable:true});
    }
    output({status:'passed',node:process.versions.node,platform:process.platform,sqlite:db.db.prepare('SELECT sqlite_version() AS version').get().version,sqlite_json_support:check.ok===1,source_count:(await intelSources(new CollectorStore(db))).length,paths,time_zone:config.time_zone,daily_time:config.daily_time,next_due_at:new Date(nextDue(Date.now(),config)).toISOString(),provider_requests:0,windows_runtime_tested:process.platform==='win32',site_sync:'manual snapshot import',os_task_created:false});
  }else {
    fs.mkdirSync(config.data_directory,{recursive:true});
    const file=path.join(config.data_directory,'collector.sqlite');
    if(fs.existsSync(file)&&fs.lstatSync(file).isSymbolicLink())throw Error('Database path is a symlink; stopped before opening.');
    if(['once','collect-source','loop'].includes(command))releaseProcess=acquireProcessLock(config.data_directory);
    db=new LocalD1(file);
    const store=new CollectorStore(db);await intelEnsureRegistry(store);
    if(command==='status') {
      const jobs=await store.rows('SELECT payload FROM collector_daily_jobs ORDER BY day_key DESC LIMIT 5');
      output({database:file,counts:await intelStatus(store),daily_jobs:jobs.map(r=>JSON.parse(r.payload)),site_sync:'manual snapshot import',time_zone:config.time_zone,daily_time:config.daily_time,next_due_at:new Date(nextDue(Date.now(),config)).toISOString()});
    }else if(['export','export-site'].includes(command)) {
      if(args.length>1&&(args.length!==3||args[1]!=='--limit'))throw Error('Usage: node collector.mjs export-site [--limit 200]');
      output(await exportSnapshot(db,config,Date.now(),args[2]===undefined?1000:Number(args[2])));
    }
    else if(command==='archive')output(await exportArchive(db,config));
    else {
      const fetcher=(url,init)=>fetch(url,{...init,signal:AbortSignal.any([init.signal,abort.signal])});
      if(command==='once'||command==='collect-source') {
        const result=await localTick(db,config,{fetcher,shouldStop:()=>stopping,sourceId});
        const selected=sourceId?result.job?.sources[sourceId]:null;
        output(sourceId?{mode:'single_source',selected_source:sourceId,operation_status:selected?.status==='succeeded'?(result.external_requests?'succeeded':'already_succeeded'):selected?.status||result.status,daily_job_status:result.status,request_count:result.external_requests??0,selected_receipt:selected?.last_receipt??null,...result}:result);
        output({snapshot:await exportSnapshot(db,config)});
        const succeeded=sourceId?result.job?.sources[sourceId]?.status==='succeeded':['complete_success','already_complete'].includes(result.status);
        if(!succeeded)process.exitCode=3;
      }else {
        console.log('Daily 08:00 '+config.time_zone+'. Keep this window and computer awake. Ctrl+C stops safely. After sleep/offline, current feeds are caught up; missing history is disclosed.');
        let previous='';
        try {
          while(!stopping) {
            try {
              await setting(store,'local_loop_heartbeat',{state:'running',pid:process.pid,observed_at:new Date().toISOString()});
              const result=await localTick(db,config,{fetcher,shouldStop:()=>stopping});
              const key=JSON.stringify([result.status,result.job?.day_key,result.job?.summary]);
              if(key!==previous||result.processed_sources) {
                output({observed_at:new Date().toISOString(),...result});
                output({snapshot:await exportSnapshot(db,config)});
                previous=key;
              }
            }catch(e) {
              // Transient DB/network problems do not kill the foreground loop or erase last-good data.
              output({status:'retry_pending',observed_at:new Date().toISOString(),error:e.message});
            }
            if(!stopping) {
              wake=new AbortController();
              try {await sleep(config.poll_seconds*1000,undefined,{signal:wake.signal});}catch(e){if(e.name!=='AbortError')throw e;}
              wake=null;
            }
          }
        }finally {await setting(store,'local_loop_heartbeat',{state:'stopped',pid:process.pid,observed_at:new Date().toISOString()});}
        console.log('Stopped. SQLite data and earlier snapshots have been kept.');
      }
    }
  }
}catch(e) {console.error('Stopped safely: '+e.message);process.exitCode=2;}
finally {db?.close();releaseProcess?.();}
