export const DOMAINS={supply:'供应 / 库存 / 履约',procurement:'采购 / 发票 / 付款',service:'服务 / SLA',energy:'能耗 / 废弃物'};
export class ValidationError extends Error{constructor(message){super(message);this.code='validation_error';this.status=400}}
export const has=(object,key)=>Object.hasOwn(object,key);
export const clone=value=>JSON.parse(JSON.stringify(value,(_,v)=>{if(typeof v==='number'&&!Number.isFinite(v))throw new ValidationError('非有限 JSON 数值');return v}));
export function textField(value,name,limit=1000,required=false){if(value===null||value===undefined)value='';if(typeof value!=='string'||value.length>limit)throw new ValidationError(`${name} 必须为不超过 ${limit} 字符的文本`);value=value.trim();if(required&&!value)throw new ValidationError(`${name} 不能为空`);return value}
export function validDomain(domain){if(!has(DOMAINS,domain))throw new ValidationError('未知业务域');return domain}
// Decimal digit blocks generated from frozen Python3.12 unicodedata.decimal.
const DECIMAL_DIGIT_BLOCKS=[48,1632,1776,1984,2406,2534,2662,2790,2918,3046,3174,3302,3430,3558,3664,3792,3872,4160,4240,6112,6160,6470,6608,6784,6800,6992,7088,7232,7248,42528,43216,43264,43472,43504,43600,44016,65296,66720,68912,69734,69872,69942,70096,70384,70736,70864,71248,71360,71472,71904,72016,72784,73040,73120,73552,92768,92864,93008,120782,120792,120802,120812,120822,123200,123632,124144,125264,130032];
export function finiteNumber(value,name='value',nonnegative=true){
 if(value===null||value===undefined||typeof value==='boolean'||!['number','string'].includes(typeof value))throw new ValidationError(`${name} 必须为有限数字`);
 if(typeof value==='string'){
  const raw=value.trim();if(!raw||!/^[-+_.eE\p{Nd}]+$/u.test(raw))throw new ValidationError(`${name} 必须为十进制有限数字`);
  let decimal='';for(const char of raw){const cp=char.codePointAt(0);if(cp<128){decimal+=char;continue}const start=DECIMAL_DIGIT_BLOCKS.find(n=>cp>=n&&cp<n+10);if(start===undefined)throw new ValidationError(`${name} 数字格式无效`);decimal+=String(cp-start)}
  const digits='[0-9](?:_?[0-9])*',syntax=new RegExp('^[+-]?(?:(?:'+digits+')(?:\\.(?:'+digits+')?)?|\\.(?:'+digits+'))(?:[eE][+-]?(?:'+digits+'))?$');
  if(!syntax.test(decimal))throw new ValidationError(`${name} 必须为十进制有限数字`);value=Number(decimal.replaceAll('_',''));
 }
 if(!Number.isFinite(value)||(nonnegative&&value<0))throw new ValidationError(`${name} 必须为${nonnegative?'非负':''}有限数字`);return value;
}
export function safeInt(value,low,high,name){const n=finiteNumber(value,name,false);if(!Number.isInteger(n)||n<low||n>high)throw new ValidationError(`${name} 必须为 ${low}–${high} 整数`);return n}
export function dateMicros(value){
 if(typeof value!=='string')throw new ValidationError('日期必须为 ISO8601 文本');
 const s=value.trim(),m=s.match(/^(\d{4})-(\d{2})-(\d{2})(?:[T ](\d{2}):(\d{2})(?::(\d{2})(?:\.(\d+))?)?(Z|[+-]\d{2}:?\d{2})?)?$/);
 if(!m)throw new ValidationError('无效 ISO8601 日期');
 const [y,mo,day]=m.slice(1,4).map(Number),check=new Date(0);check.setUTCFullYear(y,mo-1,day);check.setUTCHours(0,0,0,0);if(y<1)throw new ValidationError('无效年份');
 if(check.getUTCFullYear()!==y||check.getUTCMonth()!==mo-1||check.getUTCDate()!==day||Number(m[4]||0)>23||Number(m[5]||0)>59||Number(m[6]||0)>59)throw new ValidationError('无效日期/时间');
 if(m[8]&&m[8]!=='Z'&&(Number(m[8].slice(1,3))>23||Number(m[8].replace(':','').slice(3,5))>59))throw new ValidationError('无效时区偏移');
 let normalized=s.replace(' ','T');if(m[4]&&!m[8])normalized+='Z';
 const ms=Date.parse(normalized);if(!Number.isFinite(ms))throw new ValidationError('无效日期');
 return ms*1000+Number((m[7]||'').padEnd(6,'0').slice(3,6));
}
export function isoMicros(value){const u=typeof value==='number'?value:dateMicros(value);return new Date(Math.floor(u/1000)).toISOString().replace(/\.(\d{3})Z$/,(_,v)=>'.'+v+String(((u%1000)+1000)%1000).padStart(3,'0')+'Z')}
export const nowISO=()=>isoMicros(Date.now()*1000);
export const isoTime=ms=>new Date(ms).toISOString().replace('.000Z','+00:00');
// Exact IEEE754 rational rounding mirrors Python round(): nearest, ties to even.
export function round(n,places=4){
 if(!Number.isFinite(n))throw new ValidationError('数值聚合超出有限范围，请检查输入单位或拆分数据');if(!Number.isInteger(places)||Math.abs(places)>20)throw new ValidationError('无效小数精度');
 const buffer=new ArrayBuffer(8),view=new DataView(buffer);view.setFloat64(0,n,false);const bits=view.getBigUint64(0,false),negative=(bits>>63n)!==0n,exponent=Number((bits>>52n)&2047n);let numerator=bits&((1n<<52n)-1n),denominator=1n;
 if(exponent!==0)numerator|=1n<<52n;const shift=(exponent===0?-1022:exponent-1023)-52;if(shift>=0)numerator<<=BigInt(shift);else denominator<<=BigInt(-shift);
 if(places>=0)numerator*=10n**BigInt(places);else denominator*=10n**BigInt(-places);let quotient=numerator/denominator;const remainder=numerator%denominator;if(remainder*2n>denominator||(remainder*2n===denominator&&quotient%2n!==0n))quotient++;
 return Number((negative?'-':'')+quotient.toString()+'e'+String(-places));
}
export const mean=values=>values.reduce((sum,v)=>sum+v/values.length,0);
export const fixed=(n,places)=>round(n,places).toFixed(places);
export function stableJSON(value){if(Array.isArray(value))return '['+value.map(stableJSON).join(',')+']';if(value&&typeof value==='object')return '{'+Object.keys(value).sort().map(k=>JSON.stringify(k)+':'+stableJSON(value[k])).join(',')+'}';if(typeof value==='number'&&!Number.isFinite(value))throw new ValidationError('非有限 JSON 数值');return JSON.stringify(value)}
export async function sha256(text){const data=typeof text==='string'?new TextEncoder().encode(text):text;return [...new Uint8Array(await crypto.subtle.digest('SHA-256',data))].map(n=>n.toString(16).padStart(2,'0')).join('')}
export const uid=prefix=>prefix+'_'+crypto.randomUUID().replaceAll('-','').slice(0,16);
export function domainTags(value){if(value===null||value===undefined)return[];if(!Array.isArray(value)||value.some(d=>!has(DOMAINS,d)))throw new ValidationError('domain_tags 必须为有效业务域数组');return [...new Set(value)]}
export function splitChunks(text,size=1200,overlap=120){const result=[];let start=0;text=text.trim();while(start<text.length){let end=Math.min(start+size,text.length);if(end<text.length){const cut=text.lastIndexOf('\n',end);if(cut>start+size/2)end=cut}result.push(text.slice(start,end));if(end===text.length)break;start=Math.max(start+1,end-overlap)}return result}
