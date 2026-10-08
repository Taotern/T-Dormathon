import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
import * as US from './adapters/legal/us-federal-register.mjs';
import {canonical,validateItem,allowedText} from './adapters/legal/normalized-common.mjs';
const config=JSON.parse(readFileSync(process.argv[2],'utf8'));
const profiles=JSON.parse(readFileSync(new URL('./contracts/source-profiles.json',import.meta.url),'utf8'));
assert.equal(config.source_id,'legal_us_federal_register');
const source=profiles.sources.find(s=>s.id===config.source_id);
assert.equal(source.adapter_version,'legal-us-federal-register-refresh-v0.19.2');
const envelope=US.readEnvelope(readFileSync(config.data_path,'utf8'),{period_start:config.start,period_end:config.end});
const clocks={fetched_at:config.fetched_at,first_seen_at:config.fetched_at,ingested_at:null,requested_url:config.requested_url};
const sha=x=>createHash('sha256').update(x).digest('hex'),seen=new Map();
for(const row of envelope.records){
 const metadata=US.project(row,source,clocks);validateItem(metadata,source);allowedText(metadata,source);
 const semantic={...metadata};for(const key of ['first_seen_at','fetched_at','ingested_at'])delete semantic[key];
 const content_hash=sha(canonical(semantic));
 if(seen.has(metadata.upstream_id))assert.equal(seen.get(metadata.upstream_id).content_hash,content_hash,'Conflicting source identity');
 else seen.set(metadata.upstream_id,{source_id:metadata.source_id,upstream_id:metadata.upstream_id,version_id:'lver_'+sha(metadata.source_id+'|'+metadata.upstream_id+'|'+content_hash).slice(0,28),content_hash,metadata_sha256:sha(canonical(metadata)),metadata});
}
const {records:ignored,...coverage}=envelope;
writeFileSync(process.argv[3],JSON.stringify({records:[...seen.values()],coverage,source_snapshot:{feed_generated_at:envelope.feed_generated_at??null,source_scope:{period_start:config.start,period_end:config.end},publication_basis:'Source day-only publication',current_binding_effect:'unknown_not_inferred'},duplicate_rows:envelope.records.length-seen.size,parser_version:profiles.parser_version})+'\n');
