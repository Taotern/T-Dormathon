/** Required-source completeness gate for teammate exports, not a private-state scanner. */
import fs from 'node:fs';import path from 'node:path';import {createHash} from 'node:crypto';import {fileURLToPath} from 'node:url';
export function validateCleanCollectorSource(root){
 const base=path.resolve(root),required=['package.json','collector.mjs','runtime/supervisor.mjs','runtime/snapshot.mjs','data/global-source-catalog.json','data/adapter-provenance.json','MANIFEST-SHA256.txt'];
 for(const name of required)if(!fs.statSync(path.join(base,name),{throwIfNoEntry:false})?.isFile())throw Error('Required public collector source asset missing: '+name);
 const manifest=JSON.parse(fs.readFileSync(path.join(base,'data/adapter-provenance.json'),'utf8')),catalog=fs.readFileSync(path.join(base,'data/global-source-catalog.json'));
 if(createHash('sha256').update(catalog).digest('hex')!==manifest.registry_sha256)throw Error('Public collector catalog/provenance hash mismatch');
 const lines=fs.readFileSync(path.join(base,'MANIFEST-SHA256.txt'),'utf8').trim().split('\n');let checked=0;
 for(const line of lines){const match=line.match(/^([a-f0-9]{64})\s+(.+)$/);if(!match)throw Error('Invalid collector source manifest');const name=match[2].replace(/^\*/,''),target=path.resolve(base,name);if(!target.startsWith(base+path.sep))throw Error('Collector source manifest path escaped');const bytes=fs.readFileSync(target);if(createHash('sha256').update(bytes).digest('hex')!==match[1])throw Error('Collector source asset mismatch: '+name);checked++;}
 return{required_assets:required.length,manifest_assets:checked,catalog_sha256:manifest.registry_sha256};
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url))console.log(JSON.stringify(validateCleanCollectorSource(process.argv[2]||'local-collector')));
