import fs from 'node:fs';
import assert from 'node:assert/strict';
export const catalog=JSON.parse(fs.readFileSync(new URL('../data/global-source-catalog.json',import.meta.url)));
const samples=JSON.parse(fs.readFileSync(new URL('./global-safe-samples.json',import.meta.url)));
const encode=x=>String(x??'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
export function body(id) {
  if(id==='metmalaysia_sarawak_forecast')return fs.readFileSync(new URL('./metmalaysia-sarawak-recorded.json',import.meta.url),'utf8');
  const x=samples[id].items;
  if(id==='usgs')return JSON.stringify({type:'FeatureCollection',metadata:{count:x.length},features:x});
  if(id==='eonet')return JSON.stringify({events:x});
  if(['my_warning','my_fuel_latest','nasa_metadata'].includes(id))return JSON.stringify(x);
  return '<rss><channel><title>Offline reconstructed retained metadata</title><link>https://example.invalid/</link>'+x.map(i=>'<item>'+Object.entries(i).filter(([k])=>!k.endsWith('_attributes')).map(([k,v])=>'<'+k+Object.entries(i[k+'_attributes']||{}).map(([a,b])=>' '+a+'="'+encode(b)+'"').join('')+'>'+encode(v)+'</'+k+'>').join('')+'</item>').join('')+'</channel></rss>';
}
export function transport(counts={},fail={}) {
  return async url=> {
    const s=catalog.sources.find(s=>s.id==='nasa_metadata'?url.startsWith('https://www.nasa.gov/wp-json/'):s.endpoint===url);
    assert.ok(s,'Only fixed registered provider endpoints can be fetched');
    counts[s.id]=(counts[s.id]||0)+1;
    return fail[s.id]?new Response('offline failed response',{status:403}):new Response(body(s.id));
  };
}
