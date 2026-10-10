import {fitDatedCalibration} from './mrdiy-calibration.js';
import {DATED_SYNTHETIC_OBSERVATIONS} from './mrdiy-dated-observations.js';
const rtMean=xs=>xs.reduce((n,x)=>n+x,0)/xs.length;
const rtDateOffset=(date,days)=>new Date(Date.parse(date+'T00:00:00Z')+days*86400000).toISOString().slice(0,10);
/** Newly computed retrospective diagnostics. Does not install models or replay claimed past training. */
export function runRetrospectiveForecastBacktest(onProgress=()=>{}){
 if(typeof onProgress!=='function')throw Error('Progress callback required');
 const records=DATED_SYNTHETIC_OBSERVATIONS,targets=records.demand.filter(r=>r.date>='2026-08-11'&&r.date<'2026-10-10').sort((a,b)=>a.date.localeCompare(b.date));
 if(targets.length!==60)throw Error('Exactly 60 pinned synthetic evaluation dates required');
 const rows=[];
 for(const target of targets){
  const fitted=fitDatedCalibration(records,{as_of:target.date,window_days:56}),p=fitted.calibration;
  if(fitted.provenance.latest_training_date>=target.date||fitted.provenance.as_of_exclusive!==target.date)throw Error('Past-only fitting boundary violated');
  const prior=records.demand.filter(r=>r.date>=rtDateOffset(target.date,-28)&&r.date<target.date&&!r.censored);
  if(!prior.length)throw Error('Baseline has no observed past sales');
  const forecast=p.demand.base_units*p.demand.weekday_multipliers[new Date(target.date+'T00:00:00Z').getUTCDay()],baseline=rtMean(prior.map(r=>r.fulfilled_units));
  if(!Number.isFinite(forecast)||!Number.isFinite(baseline))throw Error('Finite forecasts required');
  rows.push({date:target.date,forecast_units:forecast,actual_units:target.fulfilled_units,censored:target.censored,absolute_error_units:target.censored?null:Math.abs(forecast-target.fulfilled_units),baseline_forecast_units:baseline,baseline_absolute_error_units:target.censored?null:Math.abs(baseline-target.fulfilled_units),calibration_version:p.version,latest_training_date:fitted.provenance.latest_training_date,training_start:fitted.provenance.window_start,training_end_exclusive:target.date,training_uncensored_rows:fitted.provenance.uncensored_sales_rows,baseline_start:rtDateOffset(target.date,-28),baseline_end_exclusive:target.date,baseline_uncensored_rows:prior.length});
  onProgress({completed:rows.length,total:60,date:target.date});
 }
 const eligible=rows.filter(r=>!r.censored),mae=rtMean(eligible.map(r=>r.absolute_error_units)),baselineMAE=rtMean(eligible.map(r=>r.baseline_absolute_error_units));
 return{schema_version:'dormathon.retrospective-synthetic-backtest.v1',data_mode:'SYNTHETIC_INTERNAL',status:'ok',computed_at:new Date().toISOString(),rows,protocol:{mode:'RETROSPECTIVE_PAST_ONLY_CALCULATION',evaluation_start:'2026-08-11',evaluation_end_exclusive:'2026-10-10',target:'uncensored fulfilled sales, a synthetic demand proxy',fit_window_days:56,forecast_rule:'Fitted weekday level, matching the existing calibration evaluator',baseline:'Mean uncensored fulfilled sales in the strictly prior 28 calendar days',training_cutoff:'Each target date exclusive; that date never enters its own fit',censored_evaluation:'Excluded from both models; daily errors remain null',real_operational_validation:false,recorded_historical_training:false},summary:{scored_days:eligible.length,censored_days:60-eligible.length,model_mae_units:mae,baseline_mae_units:baselineMAE,model_rmse_units:Math.sqrt(rtMean(eligible.map(r=>r.absolute_error_units**2))),baseline_rmse_units:Math.sqrt(rtMean(eligible.map(r=>r.baseline_absolute_error_units**2))),model_worse_days:eligible.filter(r=>r.absolute_error_units>r.baseline_absolute_error_units).length},failure_cases:[...eligible].sort((a,b)=>b.absolute_error_units-a.absolute_error_units).slice(0,3),disclosure:'Newly computed retrospective synthetic backtest. Actual rolling fits use past-only authored records; this is not recorded daily training, an untouched product holdout, or real-company forecast validation.',active_planning_model_changed:false,automatic_execution:false,network_calls:0,provider_calls:0};
}
