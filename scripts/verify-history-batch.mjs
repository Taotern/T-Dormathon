/** Explicit external-data consumer: validates/imports retained bytes into isolated SQLite only. */
import fs from 'node:fs';import path from 'node:path';
import {REVIEWED_HISTORY,REVIEWED_HISTORY_MIDDLE,REVIEWED_HISTORY_COMPLETION} from '../worker/generated.js';
import {LocalD1} from '../tests/d1-adapter.mjs';import {RiskStore} from '../worker/store.js';
import {importReviewedChunk,reviewedIntakeStatus} from '../worker/source-intake.js';
import {intelSources,intelSearch,intelEvidence} from '../worker/global-store.js';
import {retrievalDocuments} from '../worker/retrieval.js';
const dirs=process.argv.slice(2);if(dirs.length!==3)throw Error('Pass the two external delivery roots explicitly: node scripts/verify-history-batch.mjs <v0.9 delivery dir> <v0.10 delivery dir> <v0.11 delivery dir>. No implicit workspace or network.');
globalThis.fetch=()=>{throw Error('Offline historical verification must not fetch')};
const db=new LocalD1(),store=new RiskStore(db,JSON.parse(fs.readFileSync(new URL('../data/public-bundle.json',import.meta.url),'utf8'))),checks=[];
function check(name,value){checks.push({name,passed:!!value});if(!value)throw Error(name)}
try{
 await store.ensureSeed();
 for(const [i,a]of[REVIEWED_HISTORY,REVIEWED_HISTORY_MIDDLE,REVIEWED_HISTORY_COMPLETION].entries()){
  for(const c of a.chunks)await importReviewedChunk(store,{manifest_sha256:a.manifest_sha256,policy_sha256:a.original_policy_sha256,chunk_path:c.path,chunk_text:fs.readFileSync(path.join(dirs[i],c.path),'utf8')});
  const status=await reviewedIntakeStatus(store);check('acknowledged batch'+i+' stays complete',status.batches.find(b=>b.manifest_sha256===a.manifest_sha256).complete);
 }
 const status=await reviewedIntakeStatus(store);check('both same-source batches complete independently',status.batches.filter(b=>[REVIEWED_HISTORY.manifest_sha256,REVIEWED_HISTORY_MIDDLE.manifest_sha256].includes(b.manifest_sha256)).every(b=>b.complete));check('actual9,540unique annual rows',status.unique_saved_records===9540);
 const source=(await intelSources(store)).find(s=>s.id==='stat_worldbank_gdp_annual');check('source expected/processed rows aggregate without growing source identities',source.expected_snapshot_input_rows===9540&&source.accepted_snapshot_input_rows===9540&&source.record_count===9540&&source.source_snapshot_import_complete);
 for(const query of['Malaysia 2025','Malaysia 2000','high income 1990']){const hits=await intelSearch(store,query,10,{source_id:source.id,origin:'reviewed'});check('literal real query:'+query,hits.results.length>0)}
 check('no2026observation',db.db.prepare("SELECT count(*) n FROM intel_versions WHERE json_extract(metadata,'$.facts.observation_period')='2026'").get().n===0);
 check('metadata not searchable',!(await intelSearch(store,'historical_vintages_in_this_batch',10,{source_id:source.id})).results.length);
 check('reviewed records never direct',(await intelSearch(store,'Malaysia',10,{source_id:source.id,origin:'direct'})).results.length===0);
 const missing=db.db.prepare("SELECT id FROM intel_versions WHERE json_extract(metadata,'$.facts.geography.provider_geography_id')='SSD' AND json_extract(metadata,'$.facts.observation_period')='2025'").get();check('source missing preserved null',(await intelEvidence(store,missing.id)).metadata.facts.value===null);
 const docs=await retrievalDocuments(store,{limit:100});check('exact original policy retained after later same-source registry update',docs.documents.every(d=>d.source_policy_sha256===REVIEWED_HISTORY.original_policy_sha256));check('quantitative units/year/vintage exposed',docs.documents.every(d=>d.quantitative_context.unit==='current_USD'&&d.date_context.observation_granularity==='year'&&d.date_context.dataset_vintage_date==='2026-07-13'));
 const repeat=REVIEWED_HISTORY.chunks[0];check('previous exact chunk remains idempotent',(await importReviewedChunk(store,{manifest_sha256:REVIEWED_HISTORY.manifest_sha256,policy_sha256:REVIEWED_HISTORY.original_policy_sha256,chunk_path:repeat.path,chunk_text:fs.readFileSync(path.join(dirs[0],repeat.path),'utf8')})).status==='already_imported');
 console.log(JSON.stringify({passed:true,checks:checks.length,chunks:111,unique_rows:9540,source_ids:1,network_requests:0,live_site_writes:0,policy_pins:[REVIEWED_HISTORY.original_policy_sha256,REVIEWED_HISTORY_MIDDLE.original_policy_sha256,REVIEWED_HISTORY_COMPLETION.original_policy_sha256],checks_detail:checks}));
}finally{db.close()}
