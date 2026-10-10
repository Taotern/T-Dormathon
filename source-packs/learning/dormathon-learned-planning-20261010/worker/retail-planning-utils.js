// Small, dependency-free shared helpers. No simulator state is retained here.
export const cloneJson = x => JSON.parse(JSON.stringify(x));
export const stableJson = x => JSON.stringify(x, (_,v) => v && typeof v === 'object' && !Array.isArray(v) ? Object.fromEntries(Object.keys(v).sort().map(k=>[k,v[k]])) : v);
export function hash32(x){let h=2166136261;for(const c of typeof x==='string'?x:stableJson(x))h=Math.imul(h^c.charCodeAt(0),16777619);return h>>>0;}
export function seededRandom(seed){let s=seed>>>0;return ()=>{s=(s+0x6D2B79F5)>>>0;let t=s;t=Math.imul(t^(t>>>15),t|1);t^=t+Math.imul(t^(t>>>7),t|61);return ((t^(t>>>14))>>>0)/4294967296;};}
export function assert(ok,message){if(!ok)throw new Error(message);}
export const actionIds = actions => actions.map(a=>typeof a==='string'?a:a.id).sort();
export const round = n => Math.round(n*1e6)/1e6;
