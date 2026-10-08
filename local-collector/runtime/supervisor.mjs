import {GLOBAL_CATALOG} from '../worker/generated.js';
import {CollectorStore} from '../worker/store.js';
import {intelCollect,intelEnsureRegistry,intelSources} from '../worker/global-store.js';
import {uid} from '../worker/common.js';
import {dueDay,addDays,scheduledAt,nextDue} from './calendar.mjs';

const iso=clock=>new Date(clock).toISOString();
const readSetting=async(store,key)=>{const row=await store.first('SELECT value FROM settings WHERE key=?',[key]);return row?JSON.parse(row.value):null;};
export const setting=(store,key,value)=>store.write('INSERT OR REPLACE INTO settings(key,value) VALUES(?,?)',[key,JSON.stringify(value)]);
export async function localTick(db,config,{clock=Date.now(),fetcher=fetch,shouldStop=()=>false,sourceId=null}={}) {
  if(sourceId!==null&&!GLOBAL_CATALOG.sources.some(s=>s.id===sourceId&&s.enabled))throw Error('Single-source collection requires one enabled registered source ID; arbitrary URLs are not accepted.');
  const store=new CollectorStore(db);
  await intelEnsureRegistry(store);
  const token=uid('local_tick');
  const lock=await store.write("INSERT INTO settings(key,value) VALUES('collector_tick_lock',?) ON CONFLICT(key) DO UPDATE SET value=excluded.value WHERE CAST(json_extract(settings.value,'$.expires') AS INTEGER) < ?",[JSON.stringify({token,expires:clock+10*60000}),clock]);
  if(lock.meta.changes!==1)return {status:'locked',external_requests:0,retry_after_ms:60000};
  try {
    const day=dueDay(clock,config);
    const calendar=await readSetting(store,'local_calendar')||{first_due_day:day,last_due_day:day,missed_days:[]};
    if(day<calendar.last_due_day)throw Error('Clock or timezone moved to an earlier schedule day; check config/time before collecting.');
    if(calendar.time_zone&&calendar.time_zone!==config.time_zone)throw Error('Existing ledger timezone differs from config; choose a separate data_directory for a deliberate timezone change.');
    if(day>calendar.last_due_day) {
      const first=addDays(calendar.last_due_day,1),last=addDays(day,-1);
      if(first<=last)calendar.missed_days.push({first_day:first,last_day:last,observed_at:iso(clock),reason:'Process was unavailable for these schedule days. Current feed only will be collected; no historical replay or completeness claim.'});
      const old=await store.first('SELECT payload FROM collector_daily_jobs WHERE day_key=?',[calendar.last_due_day]);
      if(old) {
        const prior=JSON.parse(old.payload);
        if(!['complete_success','partial_failure'].includes(prior.status)) {
          prior.status='missed_incomplete';prior.updated_at=iso(clock);
          prior.recovery_note='New schedule day observed. Unfinished old-day sources are not retroactively fetched.';
          await saveJob(store,prior);
        }
      }
      calendar.last_due_day=day;
    }
    calendar.time_zone=config.time_zone;calendar.daily_time=config.daily_time;calendar.last_observed_at=iso(clock);
    await setting(store,'local_calendar',calendar);
    const prior=await store.first('SELECT payload FROM collector_daily_jobs WHERE day_key=?',[day]);
    const job=prior?JSON.parse(prior.payload):{
      id:'local_'+day,day_key:day,time_zone:config.time_zone,scheduled_at:iso(scheduledAt(day,config)),
      started_at:iso(clock),updated_at:iso(clock),status:'in_progress',
      catch_up:clock-scheduledAt(day,config)>config.poll_seconds*1000,
      sources:Object.fromEntries(GLOBAL_CATALOG.sources.filter(s=>s.enabled).map(s=>[s.id,{status:'pending',attempts:0,run_ids:[]}]))
    };
    // A durable ten-source completion is valid for its original scope. Adding a
    // registered source cannot silently turn it into an eleven-source success.
    const registered=GLOBAL_CATALOG.sources.filter(s=>s.enabled).map(s=>s.id);
    const priorScope=Object.keys(job.sources),added=registered.filter(id=>!Object.hasOwn(job.sources,id));
    if(added.length) {
      job.catalog_scope_change={observed_at:iso(clock),previous_source_ids:priorScope,current_source_ids:registered,added_source_ids:added,previous_status:job.status,previous_completed_at:job.completed_at||null};
      for(const id of added)job.sources[id]={status:'pending',attempts:0,run_ids:[]};
      job.status='in_progress';delete job.completed_at;
      await saveJob(store,job);
    }
    if(job.status==='complete_success')return {status:'already_complete',job,external_requests:0,next_due_at:iso(nextDue(clock,config))};
    if(job.status==='partial_failure')return {status:'partial_failure',job,external_requests:0,next_due_at:iso(nextDue(clock,config))};
    await saveJob(store,job);
    let requests=0,processed=0;
    const health=new Map((await intelSources(store,clock)).map(s=>[s.id,s]));
    for(const [id,state] of Object.entries(job.sources)) {
      if(sourceId!==null&&id!==sourceId)continue;
      if(shouldStop())break;
      if(state.status==='succeeded')continue;
      if(['attempting','uncertain'].includes(state.status)) {
        const latest=health.get(id)?.last_attempt;
        if(latest&&latest.id!==state.previous_run_id&&Date.parse(latest.attempted_at)>=Date.parse(state.attempt_started_at)) {
          if(!state.run_ids.includes(latest.id))state.run_ids.push(latest.id);
          if(latest.status==='succeeded') {
            state.status='succeeded';state.last_receipt=latest;state.recovered_from_durable_receipt=true;
            await saveJob(store,job);continue;
          }
          if(latest.status==='running') {
            const sourceLock=await readSetting(store,'intel_lock:'+id);
            if(sourceLock?.expires>=clock) {state.status='uncertain';await saveJob(store,job);continue;}
            const interrupted={...latest,status:'failed',completed_at:iso(clock),error:'Interrupted local process; no atomic success receipt was persisted.',lastgood_preserved:true};
            await store.write('UPDATE intel_runs SET status=?,completed_at=?,receipt=? WHERE id=?',['failed',interrupted.completed_at,JSON.stringify(interrupted),latest.id]);
            state.last_receipt=interrupted;state.last_error=interrupted.error;
          }else {state.last_receipt=latest;state.last_error=latest.error;}
        }
        state.status='interrupted';
      }
      if(state.attempts>=3)continue;
      if(state.next_attempt_at&&clock<Date.parse(state.next_attempt_at))continue;
      // Do not consume the daily attempt budget while the unchanged source cooldown is active.
      const latest=await store.first('SELECT attempted_at FROM intel_runs WHERE source_id=? ORDER BY attempted_at DESC,id DESC LIMIT 1',[id]);
      if(latest&&clock-Date.parse(latest.attempted_at)<15*60000) {
        state.status='cooldown';state.next_attempt_at=iso(Date.parse(latest.attempted_at)+config.retry_minutes*60000);
        await saveJob(store,job);continue;
      }
      state.previous_run_id=health.get(id)?.last_attempt?.id||null;
      state.attempt_started_at=iso(clock);state.attempts++;state.status='attempting';
      await saveJob(store,job);
      const receipt=await intelCollect(store,id,fetcher,clock);
      processed++;requests+=receipt.fetch_attempts||0;
      state.last_receipt=receipt;
      state.status=receipt.status==='succeeded'?'succeeded':receipt.status==='failed'?'failed':receipt.status==='cooldown'?'cooldown':'uncertain';
      if(receipt.id&&!state.run_ids.includes(receipt.id))state.run_ids.push(receipt.id);
      if(receipt.error)state.last_error=receipt.error;
      if(receipt.status==='cooldown'){state.attempts--;state.next_attempt_at=receipt.next_attempt_after;}
      else if(receipt.status!=='succeeded')state.next_attempt_at=iso(clock+config.retry_minutes*60000);
      await saveJob(store,job);
    }
    const states=Object.values(job.sources);
    job.summary={sources_succeeded:states.filter(s=>s.status==='succeeded').length,sources_failed:states.filter(s=>['failed','interrupted'].includes(s.status)).length,sources_uncertain:states.filter(s=>['uncertain','attempting'].includes(s.status)).length,sources_pending:states.filter(s=>['pending','cooldown'].includes(s.status)).length};
    job.status=states.every(s=>s.status==='succeeded')?'complete_success':states.every(s=>s.status==='succeeded'||s.attempts>=3)?'partial_failure':job.summary.sources_uncertain?'uncertain':'in_progress';
    if(job.status==='complete_success')job.completed_at=iso(Date.now());
    job.updated_at=iso(clock);await saveJob(store,job);
    return {status:job.status,job,processed_sources:processed,external_requests:requests,next_due_at:iso(nextDue(clock,config))};
  }finally {
    await store.write("UPDATE settings SET value=? WHERE key='collector_tick_lock' AND json_extract(value,'$.token')=?",[JSON.stringify({token:'released',expires:0}),token]);
  }
}
async function saveJob(store,job) {
  await store.write('INSERT INTO collector_daily_jobs(id,day_key,status,started_at,updated_at,payload) VALUES(?,?,?,?,?,?) ON CONFLICT(day_key) DO UPDATE SET status=excluded.status,updated_at=excluded.updated_at,payload=excluded.payload',[job.id,job.day_key,job.status,job.started_at,job.updated_at,JSON.stringify(job)]);
}
