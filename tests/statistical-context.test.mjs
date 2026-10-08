import {test} from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import {REVIEWED_EMPLOYMENT,REVIEWED_FX} from '../worker/generated.js';
import {validateItem,scaleSemanticContent,scaleAllowedText} from '../worker/source-intake-validation.js';
import {retrievalRows,retrievalDocuments} from '../worker/retrieval.js';
import {LocalD1} from './d1-adapter.mjs';import {RiskStore} from '../worker/store.js';
const employment=JSON.parse(fs.readFileSync(new URL('../source-packs/employment/fixtures/normalized-known-source-samples.v0.12.json',import.meta.url),'utf8')).items;
const fx=JSON.parse(fs.readFileSync(new URL('../source-packs/fx/fixtures/normalized-known-source-samples.v0.13.json',import.meta.url),'utf8')).items;
test('Actual modeled labor observations preserve percent population, model basis, aggregate and null',()=>{
 for(const row of employment)validateItem(row,REVIEWED_EMPLOYMENT.policies[0]);
 assert.equal(employment.find(m=>m.facts.geography.provider_geography_id==='MYS').facts.value,3.764);
 assert.equal(employment.find(m=>m.facts.geography.provider_geography_id==='CHN').facts.value,5);
 assert.equal(employment.find(m=>m.facts.geography.provider_geography_id==='HIC').facts.geography.kind,'aggregate');
 assert.equal(employment.find(m=>m.facts.geography.provider_geography_id==='INX').facts.value,null);
 for(const change of [m=>m.facts.value=101,m=>m.facts.unit='percent_of_population',m=>m.facts.unit_scale=100,m=>m.facts.estimate_basis='observed_survey',m=>m.facts.model_release_vintage='2026-01-17',m=>m.published_at='2026-01-17T00:00:00Z',m=>m.facts.observation_period='2026',m=>m.facts.vintage.dataset_last_updated_date='2026-02-30',m=>m.facts.geography.kind='aggregate',m=>m.facts.definition={article_body:'unexpected body'}]){const m=structuredClone(employment[0]);change(m);assert.throws(()=>validateItem(m,REVIEWED_EMPLOYMENT.policies[0]));}
 const missing=structuredClone(employment.find(m=>m.facts.value===null));missing.facts.value=0;assert.throws(()=>validateItem(missing,REVIEWED_EMPLOYMENT.policies[0]));
});
test('Actual ECB observations preserve two source series, date-only clocks and all32 original fields',()=>{
 for(const row of fx){validateItem(row,REVIEWED_FX.policies[0]);assert.equal(Object.keys(row.facts.source_metadata).length,32);assert.equal(row.facts.value_raw,row.facts.source_metadata.OBS_VALUE);assert.equal(row.facts.value,Number(row.facts.value_raw));assert.equal(row.published_at,null);assert.equal(row.event_time,null);}
 assert.deepEqual([...new Set(fx.map(m=>m.facts.quote_currency))].sort(),['MYR','USD']);
 for(const change of [m=>m.facts.value=2,m=>m.facts.base_currency='USD',m=>m.facts.unit_scale=1000,m=>m.facts.transformations.inverted=true,m=>m.facts.source_metadata.CURRENCY='JPY',m=>m.facts.source_agency_code='third_party',m=>m.facts.observation_period='2026-10-09',m=>m.facts.observation_period='2020-02-30',m=>m.event_country='MY',m=>m.published_at='2020-01-02T13:15:00Z',m=>delete m.facts.source_metadata.TITLE_COMPL,m=>m.facts.source_metadata.article_body='unlicensed',m=>m.facts.metadata_preservation='rewritten statistics']){const m=structuredClone(fx[0]);change(m);assert.throws(()=>validateItem(m,REVIEWED_FX.policies[0]));}
});
test('Statistical transport clocks do not churn versions; provider metadata, values and source vintage remain semantic',()=>{
 for(const row of [employment[0],fx[0]]){const later=structuredClone(row);later.first_seen_at=later.fetched_at=later.ingested_at='2026-10-09T00:00:00Z';assert.deepEqual(scaleSemanticContent(row,row.source_id),scaleSemanticContent(later,row.source_id));const revised=structuredClone(row);revised.facts.value=7;assert.notDeepEqual(scaleSemanticContent(row,row.source_id),scaleSemanticContent(revised,row.source_id));}
 const revised=structuredClone(fx[0]);revised.facts.source_metadata.OBS_STATUS='R';assert.notDeepEqual(scaleSemanticContent(fx[0],fx[0].source_id),scaleSemanticContent(revised,revised.source_id));
 const text=scaleAllowedText(fx[0],REVIEWED_FX.policies[0]);assert.ok(text.includes(fx[0].facts.observation_period));assert.ok(text.includes(fx[0].facts.value_raw));assert.ok(!text.includes('SOURCE_AGENCY'));assert.ok(!text.includes('2.15 pm'));assert.ok(!text.includes('reuse policy'));
});
test('Consumer document contract exposes actual day/year, population/model and EUR quote/base without invented release clocks',async()=>{
 const db=new LocalD1(),store=new RiskStore(db,JSON.parse(fs.readFileSync(new URL('../data/public-bundle.json',import.meta.url),'utf8')));try{
 await store.ensureSeed();let sequence=0;for(const [a,m]of [[REVIEWED_EMPLOYMENT,employment[0]],[REVIEWED_FX,fx[0]]]){
  const id=String(++sequence),stamp='2026-10-08T14:00:00Z',receipt={source_policy_sha256:a.original_policy_sha256,data_origin:'reviewed_external_snapshot',fetched_at:m.fetched_at,site_imported_at:stamp,raw_sha256:a.policies[0].acquisition_receipts[0].upstream_raw_sha256};
  await store.write('INSERT INTO intel_registry VALUES(?,?,0,?)',[m.source_id,JSON.stringify({id:m.source_id,data_origin:'reviewed_external_snapshot',material_kind:'statistical_observation'}),'test']);
  await store.write('INSERT INTO intel_runs VALUES(?,?,?,?,?,?)',['r'+id,m.source_id,'succeeded',stamp,stamp,JSON.stringify(receipt)]);
  await store.write('INSERT INTO intel_items(id,source_id,upstream_id,title,url,category,language,published_at,event_time,first_seen_at,fetched_at,ingested_at,current_version_id) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?)',['i'+id,m.source_id,m.upstream_id,m.title,m.url,m.category,m.source_language,null,null,stamp,m.fetched_at,stamp,'v'+id]);
  await store.write('INSERT INTO intel_versions(id,item_id,run_id,content_hash,observed_at,metadata) VALUES(?,?,?,?,?,?)',['v'+id,'i'+id,'r'+id,'test-hash',stamp,JSON.stringify(m)]);
  const rows=await retrievalRows([{id:'v'+id,metadata:m}],stamp,a.original_policy_sha256);await store.batch(store.bulk('intel_retrieval_documents',Object.keys(rows[0]),rows));
 }
 const docs=(await retrievalDocuments(store,{limit:10})).documents;const labor=docs.find(d=>d.source_id===employment[0].source_id),rate=docs.find(d=>d.source_id===fx[0].source_id);
 assert.equal(labor.date_context.observation_granularity,'year');assert.equal(labor.quantitative_context.estimate_basis,'modeled_ILO_estimate');assert.equal(labor.quantitative_context.model_release_vintage,null);
 assert.equal(rate.date_context.observation_granularity,'day');assert.equal(rate.quantitative_context.base_currency,'EUR');assert.equal(rate.quantitative_context.quote_currency,'USD');assert.equal(rate.quantitative_context.reference_type,'ECB_euro_reference_rate_informational');
 assert.ok(docs.every(d=>d.origin==='reviewed_external_snapshot'&&d.source_policy_provenance==='exact_retained_acquisition_pin'&&d.clock_basis==='retained_external_acquisition_plus_separate_site_import_and_index'&&d.published_at===null&&d.event_time===null&&d.fetched_at!==d.site_imported_at));
 }finally{db.close()}
});
