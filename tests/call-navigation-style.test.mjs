import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {fileURLToPath} from 'node:url';
const css=fs.readFileSync(fileURLToPath(new URL('../static/collector-workbench.css',import.meta.url)),'utf8');
// A scoped cascade oracle for the existing plain navigation selectors. It checks
// authored state precedence; hosted computed styles remain the visual authority.
function rules(source,width){
 source=source.replace(/\/\*[\s\S]*?\*\//g,'');const out=[];let i=0;
 while(i<source.length){const open=source.indexOf('{',i);if(open<0)break;const selector=source.slice(i,open).trim();let end=open+1,depth=1;for(;end<source.length&&depth;end++){if(source[end]==='{')depth++;else if(source[end]==='}')depth--;}
  const body=source.slice(open+1,end-1);if(selector.startsWith('@media')){const min=selector.match(/min-width:\s*(\d+)px/),max=selector.match(/max-width:\s*(\d+)px/);if((!min||width>=Number(min[1]))&&(!max||width<=Number(max[1])))out.push(...rules(body,width));}
  else if(!selector.startsWith('@')){const declarations=Object.fromEntries(body.split(';').map(pair=>{const at=pair.indexOf(':');return at<0?null:[pair.slice(0,at).trim(),pair.slice(at+1).trim()];}).filter(Boolean));for(const part of selector.split(','))out.push({selector:part.trim(),declarations});}i=end;
 }return out;
}
function specificity(selector){const ids=(selector.match(/#[\w-]+/g)||[]).length,classes=(selector.match(/\.[\w-]+|\[[^\]]+\]|:[\w-]+/g)||[]).length,tags=(selector.replace(/#[\w-]+|\.[\w-]+|\[[^\]]+\]|:[\w-]+/g,'').match(/\b[a-z]+\b/g)||[]).length;return ids*100+classes*10+tags;}
function colors(source,{selected=false,hover=false,focus=false,width=1350}={}){
 const all=rules(source,width),variables={},properties={};let navBackground;for(const rule of all)if(rule.selector===':root')for(const[k,v]of Object.entries(rule.declarations))if(k.startsWith('--'))variables[k]=v;
 const match=selector=>{
  if(!/^(?:(?:body\s*>?\s*)?nav\s+)?button(?:\[aria-pressed=(?:"?true"?)\])?(?::(?:hover|enabled|focus-visible))*$/.test(selector))return false;
  if(selector.includes('[aria-pressed=')&&!selected||selector.includes(':hover')&&!hover||selector.includes(':focus-visible')&&!focus)return false;return true;
 };
 for(const rule of all){if(/^(?:body\s*>\s*)?nav$/.test(rule.selector)&&rule.declarations.background){const rank=specificity(rule.selector);if(!navBackground||rank>=navBackground.rank)navBackground={rank,value:rule.declarations.background};}if(!match(rule.selector))continue;const rank=specificity(rule.selector);for(const[k,v]of Object.entries(rule.declarations)){if(!['color','background','background-color'].includes(k))continue;const property=k==='color'?'color':'background';if(!properties[property]||rank>=properties[property].rank)properties[property]={rank,value:v};}}
 const resolve=value=>value.replace(/var\((--[\w-]+)\)/g,(_,name)=>variables[name]||'unknown');return{color:resolve(properties.color.value),background:resolve(properties.background.value==='transparent'?navBackground.value:properties.background.value)};
}
function luminance(hex){const value=hex.replace('#',''),full=value.length===3?[...value].map(c=>c+c).join(''):value;assert.match(full,/^[0-9a-f]{6}$/i);const rgb=[0,2,4].map(i=>parseInt(full.slice(i,i+2),16)/255).map(c=>c<=.04045?c/12.92:((c+.055)/1.055)**2.4);return rgb[0]*.2126+rgb[1]*.7152+rgb[2]*.0722;}
function contrast(pair){const a=luminance(pair.color),b=luminance(pair.background);return(Math.max(a,b)+.05)/(Math.min(a,b)+.05);}
test('Navigation cascade preserves readable selected and unselected hover states at desktop and narrow widths',()=>{
 for(const width of[500,1350,2025])for(const selected of[false,true])for(const hover of[false,true]){
  const pair=colors(css,{width,selected,hover});assert.ok(contrast(pair)>=4.5,JSON.stringify({width,selected,hover,pair,contrast:contrast(pair)}));
 }
 const unchanged=css.slice(0,css.indexOf('/* Keep offset frame inside the chooser'));
 assert.ok(contrast(colors(unchanged,{hover:true}))<4.5,'The oracle must reproduce the independently observed old dark-on-dark hover');
 assert.ok(contrast(colors(unchanged,{selected:true,hover:true}))>=4.5,'The pre-existing selected-hover correction remains accepted');
});
