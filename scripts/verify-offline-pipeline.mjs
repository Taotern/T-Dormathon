/** Reproduce the actual retained-data intake in isolated SQLite, never a live Site. */
import fs from 'node:fs';
import {fileURLToPath} from 'node:url';
import {LocalD1} from '../tests/d1-adapter.mjs';
import {RiskStore} from '../worker/store.js';
import {REVIEWED_ADMISSION,REVIEWED_SIGNALS} from '../worker/generated.js';
import {intelEnsureRegistry,intelSearch} from '../worker/global-store.js';
import {importReviewedChunk,reviewedIntakeStatus} from '../worker/source-intake.js';
import {retrievalStatus,retrievalDocuments} from '../worker/retrieval.js';
globalThis.fetch=()=>{throw Error('Offline verification never requests a provider or Site')};
const root=new URL('../',import.meta.url),dataset=new URL('../datasets/',import.meta.url),db=new LocalD1(),store=new RiskStore(db,JSON.parse(fs.readFileSync(new URL('data/public-bundle.json',root),'utf8')));
try{
 await store.ensureSeed();await intelEnsureRegistry(store);
 for(const admission of[REVIEWED_ADMISSION,REVIEWED_SIGNALS])for(const c of admission.chunks){const folder=admission===REVIEWED_ADMISSION?'reviewed-acquisitions/':'reviewed-signals/';const body={manifest_sha256:admission.manifest_sha256,policy_sha256:admission.original_policy_sha256,chunk_path:c.path,chunk_text:fs.readFileSync(new URL(folder+c.path,dataset),'utf8')};await importReviewedChunk(store,body)}
 const intake=await reviewedIntakeStatus(store),index=await retrievalStatus(store),hits=await intelSearch(store,'ABBOTT',5,{source_id:'enterprise_sec_registry',origin:'reviewed'}),documents=await retrievalDocuments(store,{limit:3});
 if(!intake.complete||intake.imported_records!==20644||index.indexed_documents!==20644||!index.coverage_complete||!hits.results.length||!documents.documents.every(d=>d.origin==='reviewed_external_snapshot'&&d.projection_hash))throw Error('Offline actual-data pipeline mismatch');
 console.log(JSON.stringify({passed:true,dataset:fileURLToPath(dataset),chunks:intake.imported_chunks,records:intake.imported_records,indexed:index.indexed_documents,search_mode:index.mode,source_origin:'reviewed_external_snapshot',network_requests:0,live_site_writes:0,private_user_data:0}));
}finally{db.close()}
