import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {resolve} from 'node:path';
import {createHash} from 'node:crypto';
import {readDimensions,readEnvelope,project,semanticPayload} from './adapters/worldbank-gdp-annual.mjs';
import {validateItem,canonical} from './adapters/normalized-common.mjs';

const codeRoot=import.meta.dirname;
const registry=JSON.parse(readFileSync(resolve(codeRoot,'contracts/route-registry.json'),'utf8'));
const hash=x=>createHash('sha256').update(x).digest('hex');
if(hash(readFileSync(resolve(codeRoot,'adapters/worldbank-gdp-annual.mjs')))!==registry.adapter_sha256)throw Error('Shared accepted adapter has changed');
const inputs=JSON.parse(process.env.DORMATHON_GDP_INPUT_ROOTS||'[]').map(p=>resolve(p));
const output=resolve(process.env.DORMATHON_GDP_OUTPUT_ROOT||'./gdp-derived');
if(!inputs.length)throw Error('At least one retained reviewed artifact root is required; reproduction never fetches');
const reports=[],seenGroups=new Set(),globalRows=new Map();

for(const root of inputs){
 const file=relative=>readFileSync(resolve(root,relative));
 const manifestBytes=file('delivery/manifest.json'),manifest=JSON.parse(manifestBytes);
 const group=registry.accepted_groups.find(g=>g.manifest_sha256===hash(manifestBytes));
 if(!group||seenGroups.has(group.name))throw Error('Unreviewed or duplicate artifact group');
 seenGroups.add(group.name);
 const policyBytes=file('contracts/source-manifest.'+group.version+'.json');
 if(hash(policyBytes)!==group.source_policy_sha256)throw Error('Original source policy binding mismatch');
 const policy=JSON.parse(policyBytes).sources[0];
 const dim=file('source-data/wb_country_dimensions.json'),contract=JSON.parse(policyBytes);
 if(hash(dim)!==contract.country_dimension_receipt.upstream_raw_sha256)throw Error('Original dimension witness mismatch');
 const dimensions=readDimensions(dim.toString('utf8')),rows=[];
 for(const witness of policy.acquisition_receipts){
  const route=registry.slices.find(s=>s.id===witness.request_id||s.retained_receipt_aliases.includes(witness.request_id));
  if(!route||route.group!==group.name||route.url!==witness.requested_url)throw Error('Witness is outside the fixed accepted route group');
  const body=file('source-data/'+witness.request_id+'.json');
  if(witness.http_status!==200||hash(body)!==witness.upstream_raw_sha256||body.length!==witness.bytes_read)throw Error('Original source response bytes/hash/status mismatch');
  const envelope=readEnvelope(body.toString('utf8'),{period_start:route.period_start,period_end:route.period_end});
  if(envelope.coverage_incomplete||envelope.returned_count!==envelope.upstream_count)throw Error('Unacquired source pages');
  for(const original of envelope.records){
   const item=project(original,{...policy,country_dimensions:dimensions},{fetched_at:witness.fetched_at,first_seen_at:witness.fetched_at,ingested_at:null,requested_url:witness.requested_url});
   validateItem(item,policy);
   const content=canonical(semanticPayload(item));
   if(globalRows.has(item.upstream_id)){
    if(globalRows.get(item.upstream_id).content!==content)throw Error('Conflicting same-source observation across artifacts');
    throw Error('Reviewed disjoint slices overlap');
   }
   globalRows.set(item.upstream_id,{content,item});rows.push(item);
  }
 }
 const derived=[];let pending=[];
 function flush(){
  if(!pending.length)return;
  const name=group.chunk_stem+'-'+String(derived.length).padStart(4,'0')+'.json';
  const bytes=Buffer.from(JSON.stringify({schema_version:'0.2.0',source_id:registry.source_id,items:pending})+'\n');
  const path='chunks/'+name;
  const target=resolve(output,group.name,path);mkdirSync(resolve(target,'..'),{recursive:true});writeFileSync(target,bytes);
  derived.push({path,source_id:registry.source_id,count:pending.length,bytes:bytes.length,sha256:hash(bytes)});pending=[];
 }
 for(const row of rows){const next=[...pending,row];if(pending.length&&(next.length>100||Buffer.byteLength(JSON.stringify({schema_version:'0.2.0',source_id:registry.source_id,items:next})+'\n')>262144))flush();pending.push(row);}flush();
 if(rows.length!==group.expected_rows||derived.length!==group.expected_chunks||canonical(derived)!==canonical(manifest.chunks))throw Error('Derived factual chunks do not reproduce the exact accepted manifest');
 reports.push({group:group.name,original_manifest_sha256:group.manifest_sha256,original_source_policy_sha256:group.source_policy_sha256,observations:rows.length,chunks:derived.length,exact_chunk_hashes_match:true});
}
const geographies=new Map();
for(const {item:r}of globalRows.values()){
 const f=r.facts;let g=geographies.get(f.geography.provider_geography_id);
 if(!g){g={id:f.geography.provider_geography_id,label:f.geography.label,kind:f.geography.kind,years:{}};geographies.set(g.id,g);}
 g.years[f.observation_period]={value:f.value,state:f.value===null?'returned_null':'numeric',unit:f.unit};
}
const years=[...new Set([...globalRows.values()].map(x=>x.item.facts.observation_period))].sort();
const economies=[...geographies.values()].filter(g=>g.kind==='country_or_economy');
const report={schema_version:'dormathon.unified-gdp-reproduction.v0.14',finished_at:new Date().toISOString(),status:'passed',adapter_sha256:registry.adapter_sha256,groups:reports,observations:globalRows.size,chunks:reports.reduce((n,r)=>n+r.chunks,0),actually_reproduced_years:years,unloaded_reviewed_groups:registry.accepted_groups.filter(g=>!seenGroups.has(g.name)).map(g=>g.name),geography_kind_counts:{country_or_economy:economies.length,aggregate:[...geographies.values()].filter(g=>g.kind==='aggregate').length},economies_numeric_every_reproduced_year:economies.filter(g=>years.every(y=>g.years[y]?.state==='numeric')).length,geographies:[...geographies.values()],provider_requests:0,site_requests:0,not_claimed:['New source acquisition','New admission manifest replacing original three pins','Site ingestion','Autonomous or Windows scheduling','Fine-grained event/enterprise coverage']};
mkdirSync(output,{recursive:true});writeFileSync(resolve(output,'reproduction-report.json'),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({status:report.status,groups:reports,observations:report.observations,chunks:report.chunks,year_span:[years[0],years.at(-1)],continuously_numeric_economies:report.economies_numeric_every_reproduced_year,provider_requests:0}));
