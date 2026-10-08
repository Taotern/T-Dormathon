import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {LocalD1} from './d1-adapter.mjs';
import {RiskStore} from '../worker/store.js';
import {REVIEWED_ADMISSION,REVIEWED_SIGNALS} from '../worker/generated.js';
import {validateReviewedChunk,importReviewedChunk,reviewedIntakeStatus} from '../worker/source-intake.js';
import {validateItem,scaleSemanticContent} from '../worker/source-intake-validation.js';
import {intelEnsureRegistry,intelEvidence,intelSearch} from '../worker/global-store.js';
import {retrievalDocuments,retrievalProjection,retrievalStatus} from '../worker/retrieval.js';
const root=new URL('../datasets/reviewed-signals/',import.meta.url);
const bodies=REVIEWED_SIGNALS.chunks.map(c=>({manifest_sha256:REVIEWED_SIGNALS.manifest_sha256,policy_sha256:REVIEWED_SIGNALS.original_policy_sha256,chunk_path:c.path,chunk_text:fs.readFileSync(new URL(c.path,root),'utf8')}));
const bySource=Object.fromEntries(REVIEWED_SIGNALS.policies.map(p=>[p.id,p]));
function rows(source){return bodies.filter(b=>REVIEWED_SIGNALS.chunks.find(c=>c.path===b.chunk_path).source_id===source).flatMap(b=>{const d=JSON.parse(b.chunk_text);return Array.isArray(d)?d:d.items});}
test('Separate pinned signal admission preserves prior batch and all 1,178 actual source rows',async()=>{
 const manifest=fs.readFileSync('datasets/reviewed-acquisitions/manifest.json');
 assert.equal(REVIEWED_ADMISSION.expected_records,19466);assert.equal(REVIEWED_ADMISSION.chunks.length,204);
 assert.equal(REVIEWED_SIGNALS.expected_records,1178);assert.equal(bodies.length,25);
 assert.equal((await Promise.all(bodies.map(validateReviewedChunk))).reduce((n,c)=>n+c.items.length,0),1178);
 const {createHash}=await import('node:crypto');assert.equal(createHash('sha256').update(manifest).digest('hex'),REVIEWED_ADMISSION.manifest_sha256);
 await assert.rejects(validateReviewedChunk({...bodies[0],policy_sha256:REVIEWED_ADMISSION.original_policy_sha256}));
 await assert.rejects(validateReviewedChunk({...bodies[0],chunk_text:bodies[0].chunk_text+' '}));
});
test('Monthly revenue remains August 2026, unscaled issuer claims with explicit percent fields only',()=>{
 const a=rows('stat_twse_monthly_revenue');assert.equal(a.length,1086);
 assert.ok(a.every(i=>i.facts.report_period==='2026-08'&&i.facts.source_table_date==='2026-09-17'&&i.published_at===null&&i.event_time===null));
 const original=a[0],p=bySource[original.source_id];
 for(const change of [i=>i.facts.report_period='2026-10',i=>i.facts.metrics[0].currency='TWD',i=>i.facts.metrics[0].amount_scale=1000,i=>i.facts.metrics[0].unit='thousand',i=>i.facts.metrics[0].numeric_value=Number(i.facts.metrics[0].raw_value)*1000,i=>i.facts.metrics[0].article_body='unlicensed body',i=>i.facts.metrics.push(i.facts.metrics[0])]){const i=structuredClone(original);change(i);assert.throws(()=>validateItem(i,p));}
});
test('Notice calendar/local clocks and future factual dates cannot become confirmed UTC incidents',()=>{
 const a=rows('enterprise_notice_twse');assert.equal(a.length,72);assert.equal(a.filter(i=>i.facts.event_date_relation_to_acquisition==='future_by_calendar_date').length,4);
 assert.ok(a.every(i=>i.facts.publication_date==='2026-10-07'&&i.facts.publication_timezone===null&&i.facts.event_occurrence_confirmed===false&&i.event_country===null&&i.event_time===null));
 const p=bySource.enterprise_notice_twse;for(const change of [i=>i.published_at='2026-10-07T00:00:00Z',i=>i.facts.event_occurrence_confirmed=true,i=>i.facts.publication_local_time='25:61:00',i=>i.facts.publication_date='2026-02-30',i=>i.facts.notice_explanation_retained=true]){const i=structuredClone(a[0]);change(i);assert.throws(()=>validateItem(i,p));}
});
test('EU supplied updates and feed language stay separate from publication, occurrence and verified language',()=>{
 const a=rows('political_eu_council_releases_fr');assert.equal(a.length,20);assert.equal(a.filter(i=>i.facts.source_update_future_at_acquisition).length,1);
 assert.ok(a.every(i=>i.published_at===null&&i.event_time===null&&i.source_language==='und'&&i.facts.publisher_declared_language==='fr'));
 for(const change of [i=>i.source_language='fr',i=>i.facts.source_update_future_at_acquisition=false,i=>i.published_at=i.source_updated_at,i=>i.facts.article_body='not permitted']){const i=structuredClone(a[0]);change(i);assert.throws(()=>validateItem(i,bySource[i.source_id]));}
});
test('Semantic revisions exclude table/acquisition clocks but preserve actual values and provider updates',()=>{
 for(const source of Object.keys(bySource)){const a=rows(source)[0],b=structuredClone(a);b.first_seen_at=b.fetched_at=b.ingested_at='2026-10-10T00:00:00Z';if(source.startsWith('political'))b.facts.source_update_future_at_acquisition=false;else{b.facts.source_table_date='2026-10-10';b.facts.source_table_date_raw='1151010';b.facts.event_date_relation_to_acquisition='changed observation-relative annotation';}assert.deepEqual(scaleSemanticContent(a,source),scaleSemanticContent(b,source));b.title+=' actual source revision';assert.notDeepEqual(scaleSemanticContent(a,source),scaleSemanticContent(b,source));}
 const eu=rows('political_eu_council_releases_fr')[0],next=structuredClone(eu);next.source_updated_at='2026-10-09T12:20:00Z';assert.notDeepEqual(scaleSemanticContent(eu,eu.source_id),scaleSemanticContent(next,eu.source_id));
});
test('New signals import atomically with correct response digests, exact source filters and immutable retrieval evidence',async()=>{
 const db=new LocalD1(),store=new RiskStore(db,JSON.parse(fs.readFileSync('data/public-bundle.json')));try{
 await store.ensureSeed();await intelEnsureRegistry(store);for(const b of bodies)await importReviewedChunk(store,b);
 assert.equal((await importReviewedChunk(store,bodies[0])).status,'already_imported');assert.equal((await retrievalStatus(store)).indexed_documents,1178);
 const intake=await reviewedIntakeStatus(store);assert.equal(intake.batches[1].complete,true);assert.equal(intake.batches[0].complete,false);assert.equal(intake.complete,false);
 for(const p of Object.values(bySource)){const r=db.db.prepare('SELECT v.id FROM intel_versions v JOIN intel_items i ON i.id=v.item_id WHERE i.source_id=? LIMIT 1').get(p.id),ev=await intelEvidence(store,r.id),w=p.acquisition_receipts[0];assert.equal(ev.collection_receipt.raw_sha256,w.upstream_raw_sha256);assert.equal(ev.collection_receipt.bytes,w.bytes_read);assert.equal(ev.collection_receipt.http_status,200);assert.equal(ev.data_origin,'reviewed_external_snapshot');assert.equal(ev.metadata.event_time,null);}
 const eu=await intelSearch(store,'Russia',10,{source_id:'political_eu_council_releases_fr',origin:'reviewed'}),tw=await intelSearch(store,'台泥',10,{source_id:'stat_twse_monthly_revenue',origin:'reviewed'});assert.ok(eu.results.length);assert.ok(tw.results.length);assert.equal((await intelSearch(store,'Russia',10,{origin:'direct'})).results.length,0);
 const docs=await retrievalDocuments(store,{limit:100});assert.ok(docs.documents.every(d=>d.raw_response_sha256&&d.source_policy_sha256===REVIEWED_SIGNALS.original_policy_sha256));assert.equal(docs.documents.find(d=>d.source_id==='stat_twse_monthly_revenue').date_context.observation_period,'2026-08');
 assert.equal(db.db.prepare('SELECT count(*) n FROM intel_rule_alerts').get().n,0);
 }finally{db.close()}
});
test('Missing canonical response witness rejects before any durable source or chunk write',async()=>{
 const p=bySource.stat_twse_monthly_revenue,w=p.acquisition_receipts[0],saved=w.upstream_raw_sha256,db=new LocalD1(),store=new RiskStore(db,JSON.parse(fs.readFileSync('data/public-bundle.json')));
 try{await store.ensureSeed();await intelEnsureRegistry(store);delete w.upstream_raw_sha256;await assert.rejects(importReviewedChunk(store,bodies[0]),/见证缺失/);assert.equal(db.db.prepare('SELECT count(*) n FROM intel_versions').get().n,0);assert.equal(db.db.prepare("SELECT count(*) n FROM settings WHERE key LIKE 'reviewed_chunk:%'").get().n,0);}finally{w.upstream_raw_sha256=saved;db.close()}
});
test('Existing batch completion remains separately visible while the new registered batch is pending',async()=>{
 const store={rows:async(sql)=>sql.includes('GROUP BY')?Object.entries(REVIEWED_ADMISSION.source_counts).map(([source_id,item_count])=>({source_id,item_count})):REVIEWED_ADMISSION.chunks.map(c=>({value:JSON.stringify({manifest_sha256:REVIEWED_ADMISSION.manifest_sha256,chunk_sha256:c.sha256,rows:c.count,source_id:c.source_id,policy_sha256:REVIEWED_ADMISSION.original_policy_sha256})}))};
 const s=await reviewedIntakeStatus(store);assert.equal(s.batches[0].complete,true);assert.equal(s.batches[1].imported_chunks,0);assert.equal(s.complete,false);assert.equal(s.imported_records,19466);assert.equal(s.expected_records,35493);
});
