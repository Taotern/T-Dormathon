import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {REVIEWED_HISTORY,REVIEWED_HISTORY_MIDDLE} from '../worker/generated.js';
import {validateItem,scaleSemanticContent} from '../worker/source-intake-validation.js';
import {retrievalProjection,retrievalRows,retrievalDocuments,retrievalIndex} from '../worker/retrieval.js';
import {reviewedIntakeStatus,REVIEWED_BATCHES,importReviewedChunk} from '../worker/source-intake.js';
import {REVIEWED_ADMISSION} from '../worker/generated.js';
import {LocalD1} from './d1-adapter.mjs';
import {RiskStore} from '../worker/store.js';
const samples=JSON.parse(fs.readFileSync(new URL('../source-packs/worldbank-gdp/fixtures/normalized-known-source-samples.v0.9.json',import.meta.url),'utf8')).items;
const policy=REVIEWED_HISTORY.policies[0];
test('Four actual GDP samples retain reporting geographies, units, annual period and returned null',()=>{
 assert.equal(samples.length,4);for(const m of samples)validateItem(m,policy);
 const mys=samples.find(m=>m.facts.geography.provider_geography_id==='MYS'),high=samples.find(m=>m.facts.geography.provider_geography_id==='HIC'),missing=samples.find(m=>m.facts.geography.provider_geography_id==='SSD');
 assert.equal(mys.facts.observation_period,'2025');assert.equal(mys.facts.unit,'current_USD');assert.equal(high.facts.geography.kind,'aggregate');assert.equal(high.facts.geography.provider_country_alias,'XD');assert.equal(missing.facts.value,null);assert.equal(missing.facts.missingness,'source_returned_null');
 assert.ok(samples.every(m=>m.published_at===null&&m.event_time===null&&m.source_updated_at===null&&m.source_country===null&&m.event_country===null&&m.location===null));
});
test('GDP refuses zero-fill, transformed units, invented UTC clocks, geography conflation and unacquired years',()=>{
 const value=samples.find(m=>m.facts.value!==null),missing=samples.find(m=>m.facts.value===null);
 for(const change of [m=>m.facts.unit='PPP_USD',m=>m.facts.unit_scale=1000,m=>m.source_updated_at='2026-07-13T00:00:00Z',m=>m.event_country='MY',m=>m.facts.observation_period='2026',m=>m.facts.vintage.dataset_last_updated_date='2026-02-30',m=>m.facts.geography.kind='aggregate',m=>m.facts.value='123',m=>m.facts.value=-1,m=>m.facts.methodology.article_body='not licensed']){const m=structuredClone(value);change(m);assert.throws(()=>validateItem(m,policy));}
 const m=structuredClone(missing);m.facts.value=0;assert.throws(()=>validateItem(m,policy));
});
test('Source vintage/method/value stay semantic while acquisition clocks do not churn GDP versions',()=>{
 const m=samples[0],transport=structuredClone(m);transport.first_seen_at=transport.fetched_at=transport.ingested_at='2026-10-10T00:00:00Z';assert.deepEqual(scaleSemanticContent(m,m.source_id),scaleSemanticContent(transport,m.source_id));
 for(const change of [v=>v.facts.vintage.dataset_last_updated_date='2026-09-01',v=>v.facts.methodology.country_method_changes='actual source method revision',v=>v.facts.value=123]){const v=structuredClone(m);change(v);assert.notDeepEqual(scaleSemanticContent(m,m.source_id),scaleSemanticContent(v,m.source_id));}
});
test('Same-source incremental policy selection is explicit and older document policy remains exact',async()=>{
 const m=samples[0],base=retrievalProjection(m,REVIEWED_HISTORY.original_policy_sha256),middle=retrievalProjection(m,REVIEWED_HISTORY_MIDDLE.original_policy_sha256);
 assert.equal(base.source_policy_sha256,REVIEWED_HISTORY.original_policy_sha256);assert.equal(middle.source_policy_sha256,REVIEWED_HISTORY_MIDDLE.original_policy_sha256);assert.equal(base.text,middle.text);assert.ok(base.text.includes('current_USD'));assert.ok(base.text.includes(m.facts.observation_period));assert.ok(!base.text.includes('CC BY4.0'));assert.ok(!base.text.includes('methodology'));
 assert.throws(()=>retrievalProjection(m,'0'.repeat(64)));
 const [a]=await retrievalRows([{id:'actual-sample',metadata:m}],undefined,REVIEWED_HISTORY.original_policy_sha256),[b]=await retrievalRows([{id:'actual-sample',metadata:m}],undefined,REVIEWED_HISTORY_MIDDLE.original_policy_sha256);assert.notEqual(a.projection_hash,b.projection_hash);
});
test('Legacy exact receipts stay idempotent while a different manifest can acknowledge overlapping input without duplicate versions',async()=>{
 const original=REVIEWED_ADMISSION,c=original.chunks.find(c=>c.source_id==='enterprise_sec_registry'),raw=fs.readFileSync(new URL('../datasets/reviewed-acquisitions/'+c.path,import.meta.url),'utf8');
 const synthetic={...structuredClone(original),manifest_sha256:'a'.repeat(64),expected_records:c.count,chunks:[c],source_counts:{[c.source_id]:c.count}};
 const db=new LocalD1(),store=new RiskStore(db,JSON.parse(fs.readFileSync('data/public-bundle.json')));REVIEWED_BATCHES.push(synthetic);
 const body=a=>({manifest_sha256:a.manifest_sha256,policy_sha256:a.original_policy_sha256,chunk_path:c.path,chunk_text:raw});
 try{await store.ensureSeed();const first=await importReviewedChunk(store,body(original));await store.write('INSERT INTO settings(key,value) VALUES(?,?)',['reviewed_chunk:'+c.sha256,JSON.stringify(first)]);
 assert.equal((await importReviewedChunk(store,body(original))).request_id,first.request_id);
 const second=await importReviewedChunk(store,body(synthetic));assert.equal(second.status,'imported');assert.equal(second.manifest_sha256,synthetic.manifest_sha256);assert.equal(second.new_versions,0);assert.equal(second.duplicates,100);
 const status=await reviewedIntakeStatus(store);assert.equal(status.unique_saved_records,100);assert.equal(status.imported_records,200);assert.equal(status.batches.find(b=>b.manifest_sha256===synthetic.manifest_sha256).complete,true);assert.equal(db.db.prepare('SELECT count(*) n FROM intel_versions').get().n,100);
 }finally{REVIEWED_BATCHES.pop();db.close()}
});
test('Quantitative document readback uses immutable receipt policy and typed year/value/vintage, never latest registry policy',async()=>{
 const db=new LocalD1(),store=new RiskStore(db,JSON.parse(fs.readFileSync('data/public-bundle.json')));try{
 await store.ensureSeed();const m=samples[0],stamp='2026-10-08T13:00:00Z',receipt={source_policy_sha256:REVIEWED_HISTORY.original_policy_sha256,data_origin:'reviewed_external_snapshot',fetched_at:m.fetched_at,site_imported_at:stamp,raw_sha256:policy.acquisition_receipts.find(r=>r.fetched_at===m.fetched_at).upstream_raw_sha256};
 await store.batch([{sql:'INSERT INTO intel_registry VALUES(?,?,0,?)',values:[m.source_id,JSON.stringify({id:m.source_id,data_origin:'reviewed_external_snapshot',source_policy_sha256:REVIEWED_HISTORY_MIDDLE.original_policy_sha256,material_kind:'statistical_observation'}),'test']},{sql:'INSERT INTO intel_runs VALUES(?,?,?,?,?,?)',values:['r',m.source_id,'succeeded',stamp,stamp,JSON.stringify(receipt)]}]);
 await store.write('INSERT INTO intel_items(id,source_id,upstream_id,title,url,category,language,published_at,event_time,first_seen_at,fetched_at,ingested_at,current_version_id) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?)',['i',m.source_id,m.upstream_id,m.title,m.url,m.category,m.source_language,null,null,stamp,m.fetched_at,stamp,'v']);
 await store.write('INSERT INTO intel_versions(id,item_id,run_id,content_hash,observed_at,metadata) VALUES(?,?,?,?,?,?)',['v','i','r','test-hash',stamp,JSON.stringify(m)]);
 const rows=await retrievalRows([{id:'v',metadata:m}],stamp,REVIEWED_HISTORY.original_policy_sha256);await store.batch(store.bulk('intel_retrieval_documents',Object.keys(rows[0]),rows));const d=(await retrievalDocuments(store,{limit:5})).documents[0];
 assert.equal(d.source_policy_sha256,REVIEWED_HISTORY.original_policy_sha256);assert.equal(d.quantitative_context.value,m.facts.value);assert.equal(d.quantitative_context.unit,'current_USD');assert.equal(d.date_context.observation_period,m.facts.observation_period);assert.equal(d.date_context.dataset_vintage_date,'2026-07-13');assert.equal(d.source_updated_at,null);
 await store.write('DELETE FROM intel_retrieval_documents');await retrievalIndex(store);assert.equal((await retrievalDocuments(store,{limit:5})).documents[0].source_policy_sha256,REVIEWED_HISTORY.original_policy_sha256);
 const missingPin={...receipt};delete missingPin.source_policy_sha256;await store.write('UPDATE intel_runs SET receipt=? WHERE id=?',[JSON.stringify(missingPin),'r']);
 const unknown=(await retrievalDocuments(store,{limit:5})).documents[0];assert.equal(unknown.source_policy_sha256,null);assert.equal(unknown.source_policy_provenance,'unknown_missing_or_unadmitted_receipt_pin');assert.equal(unknown.index_policy_current,false);assert.equal(unknown.text_truncated,null);
 await store.write('DELETE FROM intel_retrieval_documents');await assert.rejects(retrievalIndex(store),/精确来源策略/);assert.equal(db.db.prepare('SELECT count(*) n FROM intel_retrieval_documents').get().n,0);assert.equal(db.db.prepare('SELECT count(*) n FROM intel_versions').get().n,1);
 }finally{db.close()}
});
test('Appending a disjoint same-source time slice does not uncomplete its earlier acknowledged batch',async()=>{
 const done=REVIEWED_HISTORY.chunks.map(c=>({value:JSON.stringify({manifest_sha256:REVIEWED_HISTORY.manifest_sha256,chunk_sha256:c.sha256,rows:c.count,source_id:c.source_id,policy_sha256:REVIEWED_HISTORY.original_policy_sha256})}));
 const store={rows:async sql=>sql.includes('GROUP BY')?[{source_id:policy.id,item_count:5565}]:done};const status=await reviewedIntakeStatus(store),base=status.batches.find(b=>b.manifest_sha256===REVIEWED_HISTORY.manifest_sha256),middle=status.batches.find(b=>b.manifest_sha256===REVIEWED_HISTORY_MIDDLE.manifest_sha256);
 assert.equal(base.complete,true);assert.equal(base.imported_records,2915);assert.equal(middle.complete,false);assert.equal(middle.imported_records,0);assert.equal(status.unique_saved_records,5565);assert.equal(status.record_count_basis.startsWith('Pinned input rows'),true);
});
