import {ValidationError,clone,finiteNumber,safeInt,dateMicros,isoTime,round,mean,validDomain,has} from './common.js';
export function demandForecast(history,horizon=14,method='weekday_mean_4w'){
 horizon=safeInt(horizon,1,90,'horizon_days');const rows=[...history].sort((a,b)=>a.date.localeCompare(b.date));if(!rows.length)throw new ValidationError('At least one history day is required');
 if(new Set(rows.map(r=>r.date)).size!==rows.length)throw new ValidationError('Duplicate history date');const end=dateMicros(rows.at(-1).date)/1000;
 const series=new Map(rows.map(r=>[dateMicros(r.date)/1000,finiteNumber(r.units,'units')]));const recent=[...series].filter(([d])=>d>end-28*86400000).map(([,v])=>v),fallback=mean(recent);const out=[];
 for(let step=1;step<=horizon;step++){const target=end+step*86400000;let predicted;
  if(method==='weekday_mean_4w'){const past=[...series].filter(([d])=>new Date(d).getUTCDay()===new Date(target).getUTCDay()&&d>end-28*86400000).map(([,v])=>v);predicted=past.length?mean(past):fallback}
  else if(method==='seasonal_naive_7d'){let lookup=target;while(lookup>end)lookup-=7*86400000;predicted=series.get(lookup)??fallback}
  else if(method==='mean_28d')predicted=fallback;else throw new ValidationError('Unknown demand method');
  out.push({date:new Date(target).toISOString().slice(0,10),predicted_units:round(Math.max(0,predicted),4)});
 }return out;
}
export function chooseEnergyWindow(records,observedAt,duration=60,earliest=null,latest=null){
 const observed=dateMicros(observedAt)/1000;duration=safeInt(duration,30,1440,'duration_minutes');if(duration%30)throw new ValidationError('duration_minutes must be a 30-minute multiple');
 const begin=earliest?Math.max(observed,dateMicros(earliest)/1000):observed,end=latest?dateMicros(latest)/1000:observed+48*3600000;
 const usable=[];for(const r of records){const start=dateMicros(r.from)/1000,finish=dateMicros(r.to)/1000;if(start<begin||finish>end||finish-start!==1800000||r.forecast_gco2_per_kwh===null||r.forecast_gco2_per_kwh===undefined)continue;usable.push({start,end:finish,intensity:finiteNumber(r.forecast_gco2_per_kwh,'forecast'),r})}
 usable.sort((a,b)=>a.start-b.start);const needed=duration/30,candidates=[];
 for(let i=0;i<=usable.length-needed;i++){const c=usable.slice(i,i+needed);if(c.slice(0,-1).some((x,j)=>x.end!==c[j+1].start))continue;candidates.push({from:isoTime(c[0].start),to:isoTime(c.at(-1).end),mean_forecast_gco2_per_kwh:round(mean(c.map(x=>x.intensity)),4),evidence_ids:c.map(x=>x.r.id)})}
 if(!candidates.length)throw new ValidationError('No covered future contiguous window meets these constraints');
 const best=[...candidates].sort((a,b)=>a.mean_forecast_gco2_per_kwh-b.mean_forecast_gco2_per_kwh||a.from.localeCompare(b.from))[0],first=candidates[0];
 return{best,earliest_start_comparison:first,candidate_windows:candidates.length,estimated_gco2_reduction_per_kwh:round(first.mean_forecast_gco2_per_kwh-best.mean_forecast_gco2_per_kwh,4),normalized_energy_kwh:1,basis:'Forecast-only scenario from one saved snapshot; not realized savings.'};
}
export function publicFindings(out){
 const d=out.domain,source=out.provenance.source_id,records=out.records||[];
 if(out.availability.status!=='available'){out.findings=[{rule_id:d+'_source_missing',title:'Public source observations unavailable',severity:'warning',detail:out.availability.reason||'The source bytes are not available; no result is fabricated.',evidence_ids:[source],recommended_action:'Provide an authorized source extract or usable operational records.'}];return out}
 const f={rule_id:d+'_public_baseline',title:out.recommendation.title,severity:'info',detail:out.recommendation.detail,evidence_ids:[source,...(out.recommendation.evidence_ids||[]).slice(0,1)],recommended_action:'Review the linked observed evidence and baseline, then calibrate on your own records.'};
 if(['procurement','service'].includes(d)&&records.length){const e=records[0],pred=e.predicted_invoice_to_clear_hours??e.predicted_remaining_hours;Object.assign(f,{title:'Heldout prefix duration reference',detail:`Case ${e.case_id}: at ${e.observed_at}, the pre-cutoff baseline predicts ${pred.toFixed(1)} hours ${d==='procurement'?'from invoice receipt to clearing':'remaining until completion'}. Only the observed prefix and known category/activity ID enter this prediction. Eventual outcome is in the separate replay. ${out.baseline.interpretation||''}`,evidence_ids:[source,e.id],recommended_action:'Inspect this prefix, optionally reveal its eventual outcome, and supply your own escalation/SLA threshold before flagging a breach.'})}
 if(d==='supply'){const score=out.baseline.metrics.wape,comparison=out.baseline.comparison.seasonal_naive_7d.wape;Object.assign(f,{title:'Demand forecast heldout comparison',detail:`Fixed-origin holdout WAPE: ${(score*100).toFixed(1)}%; seasonal-naive comparison: ${(comparison*100).toFixed(1)}%. Positive invoice sales are a demand proxy. Stockout and fulfillment risks require stock and lead-time inputs.`,recommended_action:'Review the heldout chart, then add stock on hand and lead time before using replenishment scenarios.'});if(score>comparison){f.severity='warning';f.detail+=' The validation-selected method is worse than seasonal naive on this holdout; do not claim an accuracy improvement.'}}
 if(d==='energy'&&(out.availability.snapshot_stale||out.schedule?.status==='unavailable'))Object.assign(f,{title:out.recommendation.title,detail:out.recommendation.detail,severity:'warning',evidence_ids:[source],recommended_action:'Acquire a fresh forecast covering the entire requested future window before scheduling.'});
 else if(d==='energy'&&out.schedule)Object.assign(f,{detail:out.recommendation.detail+` Forecast-only reduction versus earliest feasible start: ${out.schedule.estimated_gco2_reduction_per_kwh.toFixed(1)} gCO2 per 1 kWh scenario. This is not realized savings.`,recommended_action:'Refresh the snapshot and specify task kWh, duration and deadline before acting.'});
 out.findings=[f];return out;
}
export function runPublic(domain,base,params={},durations=[],clock=Date.now(),refreshFailure=null){
 validDomain(domain);if(!params||typeof params!=='object'||Array.isArray(params))throw new ValidationError('params must be an object');
 const allowed={supply:['horizon_days','sku','inventory_on_hand','lead_time_days'],procurement:[],service:['sla_hours'],energy:['duration_minutes','task_kwh','earliest','latest','observed_at']};
 for(const key of Object.keys(params))if(!allowed[domain].includes(key))throw new ValidationError('Unsupported parameter: '+key);
 const out=clone(base);out.parameters=clone(params);
 if(domain==='supply'){
  const horizon=safeInt((has(params,'horizon_days')?params.horizon_days:14),1,90,'horizon_days');if(has(params,'lead_time_days'))safeInt(params.lead_time_days,1,90,'lead_time_days');if(has(params,'inventory_on_hand'))finiteNumber(params.inventory_on_hand,'inventory_on_hand');
  if(has(params,'sku')&&(typeof params.sku!=='string'||!params.sku.trim()))throw new ValidationError('sku must be a nonempty string');
  out.forecast=demandForecast(out.records,horizon,out.baseline.method);
  if(has(params,'inventory_on_hand')||has(params,'lead_time_days')){
   if(!['sku','inventory_on_hand','lead_time_days'].every(k=>has(params,k)))out.scenario={status:'missing_input',reason:'sku, inventory_on_hand and lead_time_days are all required; aggregate mixed-SKU stock comparisons are invalid'};
   else{if(!has(out.sku_history||{},params.sku))throw new ValidationError('Scenario SKU must be one of the training-selected reference SKUs');const stock=finiteNumber(params.inventory_on_hand,'inventory_on_hand'),lead=safeInt(params.lead_time_days,1,90,'lead_time_days'),expected=demandForecast(out.sku_history[params.sku],lead,out.baseline.method).reduce((sum,r)=>sum+r.predicted_units,0);out.scenario={status:'calculated',basis:'Historical SKU scenario with weak holdout accuracy; not an operational stock recommendation',sku:params.sku,confidence:'weak; SKU holdout errors are prominent in limitations',lead_time_forecast_units:round(expected,2),inventory_on_hand_user_input:stock,gap_units:round(Math.max(expected-stock,0),2),safety_stock:'not computed; service-level/lead-time uncertainty missing'}}
  }
  out.forecast_scope={...out.forecast_scope,from:out.forecast[0].date,from_date:out.forecast[0].date,to:out.forecast.at(-1).date,label:'Unvalidated historical scenario after the last full analysis day; separate from heldout evaluation'};
  out.metrics=out.metrics.filter(m=>m.label!=='Next 14 days forecast sales');out.metrics.push({label:`${out.forecast.length}-day unvalidated historical sales scenario`,value:round(out.forecast.reduce((s,r)=>s+r.predicted_units,0),2),unit:'units'});
 }
 if(domain==='service'&&has(params,'sla_hours')){const threshold=finiteNumber(params.sla_hours,'sla_hours');if(threshold<=0)throw new ValidationError('sla_hours must be positive');const count=durations.filter(v=>v>threshold).length;out.scenario={sla_hours_user_input:threshold,basis:'Scenario threshold on historical calendar-time durations; no contractual SLA claimed',exceedances:count,cases:durations.length,exceedance_rate:count/durations.length}}
 if(domain==='energy'){
  const duration=safeInt((has(params,'duration_minutes')?params.duration_minutes:60),30,1440,'duration_minutes');if(duration%30)throw new ValidationError('duration_minutes must be a multiple of 30');if(has(params,'task_kwh'))finiteNumber(params.task_kwh,'task_kwh');
  for(const k of ['earliest','latest','observed_at'])if(has(params,k))dateMicros(params[k]);if(params.earliest&&params.latest&&dateMicros(params.earliest)>=dateMicros(params.latest))throw new ValidationError('earliest must be before latest');
  const observed=dateMicros(out.availability.observed_at)/1000,now=Math.max(clock,observed,params.observed_at?dateMicros(params.observed_at)/1000:clock),stamp=isoTime(now),failure=refreshFailure&&dateMicros(refreshFailure.attempted_at)/1000>=observed?refreshFailure:null;
  const stale=now-observed>3600000||!!failure;Object.assign(out.availability,{analysis_clock_utc:stamp,snapshot_stale:stale,mode:'saved_public_forecast_snapshot'});
  if(params.observed_at)Object.assign(out.availability,{evaluation_mode:'future_clock_scenario; override cannot rewind the actual current clock',scenario_clock_user_input:params.observed_at});
  if(failure)Object.assign(out.availability,{refresh_failed:true,refresh_error:failure.error,last_refresh_attempt:failure.attempted_at});
  try{const schedule=chooseEnergyWindow(out.records,stamp,duration,params.earliest,params.latest);schedule.snapshot_stale=stale;if(has(params,'task_kwh')){const kwh=finiteNumber(params.task_kwh,'task_kwh');Object.assign(schedule,{task_kwh_user_input:kwh,estimated_task_kgco2:round(kwh*schedule.best.mean_forecast_gco2_per_kwh/1000,6),estimated_reduction_kgco2:round(kwh*schedule.estimated_gco2_reduction_per_kwh/1000,6)})}
   out.metrics=[{label:'Covered forecast periods',value:out.records.length,unit:'half-hours'},{label:duration===60?'Best currently feasible one-hour forecast intensity':'Best currently feasible forecast intensity',value:schedule.best.mean_forecast_gco2_per_kwh,unit:'gCO2/kWh'},{label:'Forecast reduction vs current earliest feasible start',value:schedule.estimated_gco2_reduction_per_kwh,unit:'gCO2 per 1 kWh scenario'}];out.metric={primary_label:'Best currently feasible forecast intensity',value:schedule.best.mean_forecast_gco2_per_kwh,unit:'gCO2/kWh'};
   out.recommendation={title:'Review the lowest currently feasible forecast window',detail:`Saved-snapshot prospective scenario: ${schedule.best.from} to ${schedule.best.to}. This schedule is filtered against ${stamp}; refresh before acting and supply actual task kWh and constraints.`,evidence_ids:schedule.best.evidence_ids};out.baseline.scenario_comparison=schedule;
   if(stale){schedule.status='stale_snapshot';out.recommendation={title:'Refresh the saved forecast',detail:failure?'The latest refresh failed; the last good saved snapshot is retained. Retry the official feed before making a scheduling decision.':'This forecast snapshot is over one hour old; refresh it before making a scheduling decision.',evidence_ids:[out.provenance.source_id]}}
   out.schedule=schedule;
  }catch(e){if(!(e instanceof ValidationError))throw e;out.schedule={status:'unavailable',reason:e.message,snapshot_stale:stale};out.recommendation={title:'Acquire a covered fresh forecast',detail:e.message,evidence_ids:[out.provenance.source_id]}}
  if(stale||out.schedule.status==='unavailable'){out.metric={primary_label:'Current usable forecast intensity',value:null,unit:'gCO2/kWh',reason:'Saved snapshot is stale or no longer covers the requested future window'};out.metrics=out.metrics.filter(m=>m.label==='Covered forecast periods')}
 }
 return publicFindings(out);
}
