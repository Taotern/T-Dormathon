import fs from 'node:fs';
import path from 'node:path';
import {validateRefreshSnapshot} from '../worker/refresh-validation.js';
import {sha256} from '../worker/common.js';
const manifestPath=process.argv[2],reportPath=process.argv[3];
if(!manifestPath)throw Error('Provide the explicit external producer sample manifest path; no acquisition is performed');
const raw=fs.readFileSync(manifestPath),manifest=JSON.parse(raw),root=path.dirname(path.dirname(path.resolve(manifestPath)));
if(manifest.transport_mode!=='synthetic_fixture'||manifest.must_reject_live!==true||manifest.provider_calls!==0||manifest.site_calls!==0)throw Error('This verifier is scoped to clearly synthetic offline producer parts');
const results=[],sources=new Set();let records=0;
for(const pin of manifest.parts){
 const file=path.resolve(root,pin.path);if(!file.startsWith(root+path.sep))throw Error('Producer part path escapes explicit package');
 const bytes=fs.readFileSync(file),fileSHA=await sha256(bytes);if(fileSHA!==pin.sha256||bytes.length!==pin.bytes)throw Error('Producer file pin mismatch');
 const snapshot=JSON.parse(bytes),checked=await validateRefreshSnapshot(snapshot,{allowSynthetic:true});
 if(checked.records.size!==pin.records)throw Error('Producer row count mismatch');
 let rejected=false;try{await validateRefreshSnapshot(snapshot);}catch(e){rejected=/合成测试/.test(e.message);}
 if(!rejected)throw Error('Synthetic sample must be rejected on live/manual boundary');
 for(const r of checked.records.values())sources.add(r.source_id);records+=checked.records.size;
 results.push({path:pin.path,file_sha256:fileSHA,bytes:bytes.length,payload_sha256:snapshot.payload_sha256,records:checked.records.size,runs:checked.runs.size,offline_shape_passed:true,live_synthetic_rejection_passed:true});
}
if(records!==manifest.record_count||sources.size!==manifest.sources)throw Error('Producer aggregate counts mismatch');
const report={schema_version:'dormathon.refresh-producer-wire-review.v1',finished_at:new Date().toISOString(),manifest_sha256:await sha256(raw),records,sources:[...sources].sort(),parts:results,network_calls:0,site_mutations:0,scope:'Offline producer-format verification only. No genuine acquisition, owner runtime, manual live ingress or unattended operation claim.'};
if(reportPath){fs.mkdirSync(path.dirname(path.resolve(reportPath)),{recursive:true});fs.writeFileSync(reportPath,JSON.stringify(report,null,2)+'\n');}
console.log(JSON.stringify({passed:true,parts:results.length,records,sources:sources.size,network_calls:0,site_mutations:0}));
