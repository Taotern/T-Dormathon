import fs from 'node:fs';import path from 'node:path';import crypto from 'node:crypto';import {pathToFileURL} from 'node:url';
const here=path.dirname(new URL(import.meta.url).pathname),argv=process.argv.slice(2);const arg=k=>{const i=argv.indexOf(k);return i<0?undefined:argv[i+1]};
const checkout=arg('--checkout')||'/workspace/shared/dormathon-private-site-20261007';const parserPath=arg('--parser')||path.join(checkout,'worker/global-parse.js');const prefix=arg('--report-prefix')||'contract-test-report';const phase=arg('--phase')||'all';
// Guard before importing the adapter graph as well as before every test.
let networkCalls=0;globalThis.fetch=()=>{networkCalls++;throw Error('Network forbidden in deterministic source-contract tests')};
const {parseIntelFeed}=await import(pathToFileURL(parserPath));if(typeof parseIntelFeed!=='function')throw Error('Public parseIntelFeed export missing');
const manifest=JSON.parse(fs.readFileSync(path.join(here,'cases.v0.4.json')));const catalogPath=path.resolve(here,manifest.catalog_file);const catalog=JSON.parse(fs.readFileSync(catalogPath)),sources=new Map(catalog.sources.map(s=>[s.id,s]));const hash=x=>crypto.createHash('sha256').update(x).digest('hex');
function subset(actual,expected,at='result'){
 if(expected===null||typeof expected!=='object'){if(actual!==expected)throw Error(at+': expected '+JSON.stringify(expected)+', got '+JSON.stringify(actual));return;}
 if(Array.isArray(expected)){if(!Array.isArray(actual)||actual.length!==expected.length)throw Error(at+': array length mismatch');expected.forEach((v,i)=>subset(actual[i],v,at+'['+i+']'));return;}
 if(!actual||typeof actual!=='object')throw Error(at+': expected object');for(const[k,v]of Object.entries(expected))subset(actual[k],v,at+'.'+k);
}
const rows=[];
for(const test of manifest.cases){
 if(phase==='positive'&&test.mode==='reject')continue;if(phase==='negative'&&test.mode!=='reject')continue;
 const bytes=fs.readFileSync(path.join(here,test.payload_file));if(hash(bytes)!==test.payload_sha256)throw Error('Fixture digest changed: '+test.case_id);
 const source=sources.get(test.source_id);const started=performance.now();let out,err;
 try{out=await parseIntelFeed(source,new Uint8Array(bytes),'2026-10-08T00:00:00.000Z');}catch(e){err=e;}
 let passed=false,detail='';
 try{
  if(test.mode==='reject'){if(!err)throw Error('Malformed/schema-drift input was accepted'+(out?.items?.length===0?' as silent zero':' with '+out?.items?.length+' projected items'));passed=true;detail='Rejected: '+err.message;}
  else if(err){if(test.mode==='project_or_reject'){passed=true;detail='Safely rejected: '+err.message;}else throw Error('Expected valid structured envelope: '+err.message);}
  else{
   const e=test.expected||{};if(e.result)subset(out,e.result);if(e.item_count!==undefined&&out.items.length!==e.item_count)throw Error('Expected '+e.item_count+' items, got '+out.items.length);
   if(e.items_by_id){const byID=new Map(out.items.map(i=>[i.upstream_id,i]));for(const[k,v]of Object.entries(e.items_by_id)){if(!byID.has(k))throw Error('Expected upstream ID missing: '+k);const expected={...v};if(typeof expected.title==='string')expected.title=expected.title.replace(/\s+/g,' ').trim();subset(byID.get(k),expected,'items_by_id.'+k);}}
   if(e.items)e.items.forEach((v,i)=>subset(out.items[i],v,'items['+i+']'));
   if(e.first_upstream_id&&out.items[0]?.upstream_id!==e.first_upstream_id)throw Error('Newest-first selection mismatch');if(e.last_upstream_id&&out.items.at(-1)?.upstream_id!==e.last_upstream_id)throw Error('Oldest selected ID mismatch');
   if(e.geometry_pair_cap!==undefined)for(const i of out.items)if(i.location?.coordinate_pairs?.length>e.geometry_pair_cap)throw Error('Geometry projection cap exceeded');
   if(e.forbidden_marker&&JSON.stringify(out).includes(e.forbidden_marker))throw Error('Forbidden unrequested content leaked into projected metadata');
   for(const i of out.items){if(i.title.length>500)throw Error('Title metadata bound exceeded');if(['ecb','un_zh','bis_press','bis_speeches','nasa_metadata','my_warning','usgs','eonet'].includes(i.source_id)&&i.event_country!==null)throw Error('Publisher/language country imputed to event');if(['usgs','eonet','my_warning','my_fuel_latest'].includes(i.source_id)&&i.published_at!==null)throw Error('Unknown publication time was fabricated');}
   passed=true;detail='Accepted expected source metadata projection';
  }
 }catch(e){detail=e.message;}
 rows.push({case_id:test.case_id,source_id:test.source_id,mode:test.mode,passed,detail,elapsed_ms:Number((performance.now()-started).toFixed(3)),fixture_sha256:test.payload_sha256});
}
if(networkCalls)rows.push({case_id:'shared--network_operation_forbidden',source_id:'shared',mode:'never_fetch',passed:false,detail:networkCalls+' forbidden fetch attempts'});
const summary={source_count:10,case_count:rows.length,passed:rows.filter(r=>r.passed).length,failed:rows.filter(r=>!r.passed).length,network_calls:networkCalls};const implementationFiles=[parserPath,path.join(checkout,'worker/common.js'),...(()=>{const dir=path.join(checkout,'worker/adapters');return fs.existsSync(dir)?fs.readdirSync(dir).filter(f=>f.endsWith('.js')).map(f=>path.join(dir,f)):[]})()].filter(f=>fs.existsSync(f)).sort().map(f=>({path:f,sha256:hash(fs.readFileSync(f))}));const report={schema_version:'0.4.0',implementation_files:implementationFiles,ran_at:new Date().toISOString(),parser_path:parserPath,parser_sha256:hash(fs.readFileSync(parserPath)),phase,deterministic_clock:'2026-10-08T00:00:00.000Z',frozen_registry_sha256:hash(fs.readFileSync(catalogPath)),summary,cases:rows};
fs.writeFileSync(path.join(here,prefix+'.json'),JSON.stringify(report,null,2));fs.writeFileSync(path.join(here,prefix+'.txt'),['Deterministic source-contract fixture checks',JSON.stringify(summary),...rows.filter(r=>!r.passed).map(r=>'FAIL '+r.case_id+': '+r.detail)].join('\n')+'\n');console.log(JSON.stringify(summary));for(const r of rows.filter(r=>!r.passed))console.log('FAIL',r.case_id,r.detail);if(summary.failed)process.exitCode=1;
