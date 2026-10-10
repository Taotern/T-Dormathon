/** Demand outlook and conditional stock-path mechanics. No model deployment or observed-stockout claim. */
export const DEMAND_RISK_VERSION='dormathon.demand-risk.0.5.0';
const drDAY=86400000;
const drCandidates=['zero','seasonal_naive_7','mean_7','mean_28','mean_56','median_28','trimmed_mean_56','ewma_005','ewma_015','sba_01','tsb_01','seasonal_mean_8weeks','weekly_total_median_8weeks','weekly_total_median_12weeks'];
const drQs=[.1,.5,.9];
function drDay(d){if(typeof d!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(d))return null;const n=Date.parse(d+'T00:00:00Z');return Number.isFinite(n)&&new Date(n).toISOString().slice(0,10)===d?n:null;}
function drDate(d,h){return new Date(drDay(d)+h*drDAY).toISOString().slice(0,10);}
function drStamp(v){return typeof v==='string'&&/(Z|[+-]\d{2}:\d{2})$/.test(v)&&Number.isFinite(Date.parse(v));}
function drNumber(v){return typeof v==='number'&&Number.isFinite(v)&&v>=0&&v<=1e9;}
function drSum(v){return v.reduce((s,x)=>s+x,0);}
function drMean(v){return drSum(v)/v.length;}
function drMedian(v){const s=[...v].sort((a,b)=>a-b),i=Math.floor(s.length/2);return s.length%2?s[i]:(s[i-1]+s[i])/2;}
function drQuantile(v,q){const s=[...v].sort((a,b)=>a-b);return s[Math.max(0,Math.ceil(q*s.length)-1)];}
function drPaths(y,weeks){return Array.from({length:weeks},(_,i)=>y.slice(y.length-7*(weeks-i),y.length-7*(weeks-i-1)));}
function drPoint(y){
 const p8=drPaths(y,8),m56=drMean(y.slice(-56)),seasonal=Array.from({length:7},(_,i)=>drMean(p8.map(p=>p[i])));
 const shape=seasonal.map(x=>(x+m56)/2),den=drSum(shape),weights=shape.map(x=>den?x/den:1/7);
 const out={zero:Array(7).fill(0),seasonal_naive_7:y.slice(-7),seasonal_mean_8weeks:seasonal};
 for(const w of [7,28,56])out['mean_'+w]=Array(7).fill(drMean(y.slice(-w)));
 out.median_28=Array(7).fill(drMedian(y.slice(-28)));out.trimmed_mean_56=Array(7).fill(drMean(y.slice(-56).sort((a,b)=>a-b).slice(5,-5)));
 let e05=y[0],e15=y[0],size=0,interval=1,last=-1,p=0,initialized=false;
 y.forEach((z,j)=>{if(j){e05=.05*z+.95*e05;e15=.15*z+.85*e15;}if(z>0){if(!initialized){size=z;interval=j+1;}else{size=.1*z+.9*size;interval=.1*(j-last)+.9*interval;}last=j;initialized=true;}p=.1*(z>0?1:0)+.9*p;});
 out.ewma_005=Array(7).fill(e05);out.ewma_015=Array(7).fill(e15);out.sba_01=Array(7).fill(.95*size/interval);out.tsb_01=Array(7).fill(p*size);
 for(const w of [8,12]){const m=drMedian(drPaths(y,w).map(drSum));out['weekly_total_median_'+w+'weeks']=weights.map(x=>m*x);}
 return out;
}
function drChoose(histories){
 const losses=Object.fromEntries(drCandidates.map(k=>[k,0])),qloss={8:0,12:0,24:0};let actualTotal=0;
 for(const y of histories)for(let j=0;j<4;j++){
  const end=y.length-28+j*7,h=y.slice(0,end),actual=drSum(y.slice(end,end+7)),pred=drPoint(h);actualTotal+=actual;
  for(const k of drCandidates)losses[k]+=Math.abs(drSum(pred[k])-actual);
  for(const w of [8,12,24]){const vals=drPaths(h,w).map(drSum);for(const q of drQs){const e=actual-drQuantile(vals,q);qloss[w]+=Math.max(q*e,(q-1)*e);}}
 }
 const selected=drCandidates.reduce((best,k)=>losses[k]<losses[best]?k:best,drCandidates[0]);
 const qw=[8,12,24].reduce((best,w)=>qloss[w]<qloss[best]?w:best,8);
 return {model:selected,quantile_weeks:qw,validation_weekly_absolute_error:losses,validation_actual_units:actualTotal,validation_weekly_WAPE:Object.fromEntries(drCandidates.map(k=>[k,actualTotal?losses[k]/actualTotal:null])),validation_mean_quantile_pinball:Object.fromEntries([8,12,24].map(w=>[w,qloss[w]/(histories.length*4*3)])),catalog_items:histories.length,tie_break:'predeclared candidate order; shorter quantile window',selection_cutoff:'preceding four complete seven-day targets only'};
}
function drEnvelope(r){return {schema_version:'dormathon.demand-outlook.v1',engine_version:DEMAND_RISK_VERSION,org_id:r?.org_id??null,brand_scope:r?.brand_scope??null,item_id:r?.item_id??null,node_id:r?.node_id??null,scenarioDataMode:r?.scenarioDataMode??null,provenance_refs:r?.provenance_refs??[],assumption_set_id:r?.assumption_set_id??null,request_id:r?.request_id??'local-demand-outlook',input_refs:r?.input_refs??[],knowledge_as_of:r?.knowledge_as_of??null,world_time:r?.world_time??null,knowledge_mode:r?.knowledge_mode??null,data_revision:r?.data_revision??null};}
/** Complete daily observations only. Default validation selector uses the supplied series as its catalog.
 * Benchmark selection used thousands of eligible series; this single-series demo carries no transferred accuracy.
 */
export function forecastDemand(request={}){
 if(!request||typeof request!=='object'||Array.isArray(request))request={};
 const out={...drEnvelope(request),status:'insufficient_data',delivery_mode:'live_local_calculation',horizon:7,forecast_origin:null,forecasts:[],cumulative:null,empirical_paths:[],evaluation_status:'EXPLORATORY_RETROSPECTIVE_ROLLING_CANDIDATES_ONLY',calibration_status:'EMPIRICAL_UNCALIBRATED',target_definition:'Daily positive recorded transaction sales, units; demand proxy, not latent demand',warnings:[]};
 const fail=reason=>{out.warnings.push(reason);return out;};
 if(!['SYNTHETIC_INTERNAL','EXTERNAL_BENCHMARK'].includes(out.scenarioDataMode))return fail('Explicit SYNTHETIC_INTERNAL or EXTERNAL_BENCHMARK data mode required.');
 if(!out.org_id||!out.item_id||!out.assumption_set_id)return fail('Stable organization, item and assumption references required.');
 if(request.horizon!==undefined&&request.horizon!==7)return fail('Exactly seven daily horizons are supported.');
 if(!drStamp(out.knowledge_as_of)||!drStamp(out.world_time))return fail('Knowledge and world timestamps with explicit timezones are required.');
 const adaptive=(request.model??'adaptive_past_validation')==='adaptive_past_validation',minimum=adaptive?196:168;
 if(!adaptive&&!drCandidates.includes(request.model)){out.status='unsupported';return fail('Unknown demand model.');}
 const history=request.history;
 if(!Array.isArray(history)||history.length<minimum||history.length>3660)return fail('Require '+minimum+'–3660 consecutive complete daily labels; unknown history is never zero-filled.');
 const seen=new Set();let last=null;
 for(const row of history){
  const day=drDay(row?.date);if(day===null||seen.has(row.date)||(last!==null&&day-last!==drDAY))return fail('History dates must be valid, unique and consecutive.');
  if(!drNumber(row.positive_sales)||!['observed','source_declared_complete'].includes(row.observation_status))return fail('History must contain known finite nonnegative recorded-sales labels.');
  if(row.date>out.knowledge_as_of.slice(0,10)||row.date>out.world_time.slice(0,10))return fail('History exceeds knowledge or world cutoff.');
  if(row.date===out.knowledge_as_of.slice(0,10)&&row.complete_day!==true)return fail('A same-day history label needs explicit complete_day=true.');
  if(row.available_at!==undefined&&(!drStamp(row.available_at)||Date.parse(row.available_at)>Date.parse(out.knowledge_as_of)))return fail('A history label was unavailable at the knowledge cutoff.');
  seen.add(row.date);last=day;
 }
 const y=history.map(x=>x.positive_sales);out.forecast_origin=history.at(-1).date;
 // Calendar origin must abut the scenario world date: do not silently forecast a stale week.
 if(![out.world_time.slice(0,10),drDate(out.world_time.slice(0,10),-1)].includes(out.forecast_origin))return fail('History must end on the world date or its immediately preceding complete day.');
 let selection=null,model=request.model,window=request.quantile_weeks??12;
 if(adaptive){selection=drChoose([y]);model=selection.model;window=selection.quantile_weeks;}
 if(![8,12,24].includes(window))return fail('Quantile window must be 8, 12 or 24 complete weeks.');
 const predictions=drPoint(y)[model],paths=drPaths(y,window),totals=paths.map(drSum);
 out.forecasts=predictions.map((p,i)=>({date:drDate(out.forecast_origin,i+1),horizon:i+1,predicted_units:p,low_units:drQuantile(paths.map(x=>x[i]),.1),high_units:drQuantile(paths.map(x=>x[i]),.9)}));
 out.cumulative={horizon_days:7,predicted_units:drSum(predictions),quantile_estimates:drQs.map(q=>({quantile:q,units:drQuantile(totals,q)})),quantile_method:'empirical inverted-CDF of prior weekday-aligned nonoverlapping weekly blocks',quantile_window_weeks:window,calibration_status:'EMPIRICAL_UNCALIBRATED'};
 out.empirical_paths=paths.map((demand,i)=>({path_id:'prior-week-'+(window-i),source_start_date:drDate(out.forecast_origin,-7*(window-i)+1),source_end_date:drDate(out.forecast_origin,-7*(window-i)+7),demand_by_day:demand}));
 out.model=model;out.model_version=DEMAND_RISK_VERSION+':'+model;out.training_cutoff=out.forecast_origin;out.feature_information_cutoff=out.forecast_origin;out.selection=selection?{...selection,population_scope:'supplied_single_series_demo',validation_start:drDate(out.forecast_origin,-27),validation_end:out.forecast_origin,empirical_performance_transfer:false}:null;
 out.status='ok';out.warnings.push('Low/high are marginal empirical 10th/90th percentiles, not confidence bounds; their daily sums need not equal the weekly quantiles.','Historical paths preserve within-week shape but assume past weeks represent the scenario. No calibrated operational shortage probability.','Recorded sales may be inventory-censored. Stock, delivery and savings accuracy are not established.');
 if(out.scenarioDataMode==='SYNTHETIC_INTERNAL')out.warnings.push('Authored company history demonstrates mechanics only; external benchmark accuracy does not transfer.');
 if(selection)out.warnings.push('This request selects across one supplied series. The external rolling study selected across its full eligible SKU catalog; its reported accuracy is not assigned to this single-series selection.');
 return out;
}
function drProject(demand,dates,stock,arrivals){
 let current=stock;const rows=[];
 for(let i=0;i<7;i++){const receipt=drSum(arrivals.filter(x=>x.date===dates[i]).map(x=>x.quantity_units)),opening=current,available=current+receipt,shortage=Math.max(0,demand[i]-available);current=Math.max(0,available-demand[i]);rows.push({date:dates[i],horizon:i+1,arrival_units:receipt,demand_units:demand[i],opening_free_stock_units:opening,available_before_demand_units:available,closing_free_stock_units:current,shortage_units:shortage});}
 return rows;
}
/** No orders executed. Lost-sales mechanics; arrivals available before same-day demand. */
export function forecastRisk(request={}){
 if(!request||typeof request!=='object'||Array.isArray(request))request={};
 const f=request.forecast??{},out={...drEnvelope(f),schema_version:'dormathon.demand-risk.v1',engine_version:DEMAND_RISK_VERSION,status:'insufficient_data',forecast_ref:f.request_id??null,model_version:f.model_version??null,forecast_origin:f.forecast_origin??null,horizon:7,projected_stock_by_day:[],first_projected_shortage_date:null,total_projected_shortage_units:null,next_arrival_date:null,shortage_before_next_arrival:null,conditional_path_shortage_fraction:null,empirical_path_count:0,path_shortage_unit_quantiles:[],arrival_day_convention:'arrivals_available_before_same_day_demand',shortage_treatment:'lost_sales',calibration_status:'UNVALIDATED_CONDITIONAL_SCENARIO',evaluation_status:'NO_OBSERVED_STOCKOUT_LABELS',output_type:'CONDITIONAL_SCENARIO',warnings:[]};
 const fail=reason=>{out.warnings.push(reason);return out;};
 if(f.status!=='ok'||!Array.isArray(f.forecasts)||f.forecasts.length!==7)return fail('A successful dated seven-day forecast is required.');
 if(drDay(f.forecast_origin)===null||!drStamp(f.knowledge_as_of)||!drStamp(f.world_time)||typeof f.org_id!=='string'||!f.org_id||typeof f.item_id!=='string'||!f.item_id)return fail('Forecast origin, explicit knowledge/world timestamps and stable scope are required.');
 if(drDate(f.forecast_origin,1)!==f.world_time.slice(0,10))return fail('Risk projection requires the first forecast date to be the scenario world date with opening inventory at that date.');
 if(!['SYNTHETIC_INTERNAL','EXTERNAL_BENCHMARK'].includes(f.scenarioDataMode))return fail('Unsupported forecast data mode.');
 const dates=f.forecasts.map(x=>x.date),demands=f.forecasts.map(x=>x.predicted_units);
 if(dates.some((x,i)=>drDay(x)===null||x!==drDate(f.forecast_origin,i+1))||demands.some(x=>!drNumber(x)))return fail('Forecast dates and nonnegative units must form a consecutive seven-day horizon.');
 const stock=request.inventory;
 if(!stock||stock.org_id!==f.org_id||stock.item_id!==f.item_id||(f.node_id&&stock.node_id!==f.node_id))return fail('Inventory must match the forecast organization, item and node.');
 if(!['observed','source_declared_complete','synthetic_assumption'].includes(stock.observation_status)||!drStamp(stock.as_of)||Date.parse(stock.as_of)>Date.parse(f.knowledge_as_of)||stock.as_of.slice(0,10)!==f.world_time?.slice(0,10))return fail('Known inventory at the scenario world date and available by the knowledge cutoff is required.');
 for(const field of ['on_hand_units','reserved_units','quarantined_units','committed_units'])if(!drNumber(stock[field]))return fail('Unknown '+field+' prevents a stock projection.');
 const reserved=stock.reserved_units+stock.quarantined_units+stock.committed_units;
 if(reserved>stock.on_hand_units)return fail('Reservations, quarantine and commitments exceed known on-hand stock.');
 if(request.arrivals_complete!==true||!Array.isArray(request.arrivals))return fail('Explicitly complete arrival registry is required; unknown inbound is not no inbound.');
 const ids=new Set();for(const a of request.arrivals){
  if(!a||typeof a.arrival_id!=='string'||!a.arrival_id||ids.has(a.arrival_id)||a.org_id!==f.org_id||a.item_id!==f.item_id||(f.node_id&&a.node_id!==f.node_id)||drDay(a.date)===null||a.date<dates[0]||!drNumber(a.quantity_units))return fail('Arrivals need unique IDs, matching scope, nonnegative quantities and dates no earlier than the forecast horizon.');
  if(!['confirmed','synthetic_assumption'].includes(a.observation_status))return fail('Unknown arrival timing or quantity prevents a stock projection.');
  if(a.available_at!==undefined&&(!drStamp(a.available_at)||Date.parse(a.available_at)>Date.parse(f.knowledge_as_of)))return fail('Arrival information was unavailable at the knowledge cutoff.');ids.add(a.arrival_id);
 }
 if(!Array.isArray(f.empirical_paths)||f.empirical_paths.length<8||f.empirical_paths.some(p=>!Array.isArray(p.demand_by_day)||p.demand_by_day.length!==7||p.demand_by_day.some(x=>!drNumber(x))))return fail('At least eight valid empirical weekly paths are required for the conditional path summary.');
 const free=stock.on_hand_units-reserved,rows=drProject(demands,dates,free,request.arrivals),losses=f.empirical_paths.map(p=>drSum(drProject(p.demand_by_day,dates,free,request.arrivals).map(x=>x.shortage_units)));
 out.status='ok';out.initial_free_stock_units=free;out.projected_stock_by_day=rows;out.total_projected_shortage_units=drSum(rows.map(x=>x.shortage_units));out.first_projected_shortage_date=rows.find(x=>x.shortage_units>1e-9)?.date??null;
 out.next_arrival_date=request.arrivals.filter(x=>x.quantity_units>0).map(x=>x.date).sort()[0]??null;out.shortage_before_next_arrival=out.next_arrival_date===null?null:!!out.first_projected_shortage_date&&out.first_projected_shortage_date<out.next_arrival_date;
 out.conditional_path_shortage_fraction=losses.filter(x=>x>1e-9).length/losses.length;out.empirical_path_count=losses.length;out.path_shortage_unit_quantiles=drQs.map(q=>({quantile:q,units:drQuantile(losses,q)}));
 out.warnings.push('Path fraction is the share of historical demand scenarios exhausting the declared synthetic/known supply path, not a calibrated real stockout probability.','Arrivals are assumed fully usable before demand on their stated date; intraday timing, delivery failures and backorders are not modeled.','No order, payment, staffing, supplier commitment or automatic action is executed.');
 if(f.scenarioDataMode==='EXTERNAL_BENCHMARK')out.warnings.push('UCI provides no inventory or arrival ledger; supplied stock/arrival inputs must be separately identified hypothetical assumptions.');
 return out;
}
