import {ValidationError} from './common.js';
function statisticalRequire(ok,message){if(!ok)throw new ValidationError(message);}
function statisticalDate(value){
 statisticalRequire(typeof value==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(value),'Statistical observation remains a date-only calendar value');
 const [y,m,d]=value.split('-').map(Number),date=new Date(Date.UTC(y,m-1,d));
 statisticalRequire(date.getUTCFullYear()===y&&date.getUTCMonth()===m-1&&date.getUTCDate()===d,'Invalid statistical calendar date');return value;
}
const ECB_COLUMNS=['KEY','FREQ','CURRENCY','CURRENCY_DENOM','EXR_TYPE','EXR_SUFFIX','TIME_PERIOD','OBS_VALUE','OBS_STATUS','OBS_CONF','OBS_PRE_BREAK','OBS_COM','TIME_FORMAT','BREAKS','COLLECTION','COMPILING_ORG','DISS_ORG','DOM_SER_IDS','PUBL_ECB','PUBL_MU','PUBL_PUBLIC','UNIT_INDEX_BASE','COMPILATION','COVERAGE','DECIMALS','NAT_TITLE','SOURCE_AGENCY','SOURCE_PUB','TITLE','TITLE_COMPL','UNIT','UNIT_MULT'];
/** Source statistics stay typed; no conversion to events, prices or person-level claims. */
export function validateStatisticalContext(item,source){
 if(!['stat_worldbank_unemployment_ilo_annual','stat_ecb_fx_daily_reference'].includes(item.source_id))return item;
 const f=item.facts;
 statisticalRequire(f.record_kind==='statistical_observation'&&item.source_country===null&&item.event_country===null&&item.location===null&&item.location_basis==='unknown'&&item.published_at===null&&item.event_time===null&&item.source_updated_at===null,'Statistical context has no verified located event or publication clock');
 statisticalRequire(item.short_summary===null&&item.entities.length===0,'Statistical context has no generated summary or entity associations');
 if(item.source_id==='stat_worldbank_unemployment_ilo_annual'){
  const g=f.geography,v=f.vintage;
  statisticalRequire(f.indicator==='SL.UEM.TOTL.ZS'&&f.domain==='employment','Exact total-unemployment indicator required');
  statisticalRequire(g?.provider==='World Bank'&&['country_or_economy','aggregate'].includes(g.kind)&&/^[A-Z0-9]{3}$/.test(g.provider_geography_id)&&(g.region_id==='NA')===(g.kind==='aggregate'),'Reporting economy and overlapping aggregate stay source-qualified');
  statisticalRequire(/^\d{4}$/.test(f.observation_period)&&f.observation_granularity==='year','Annual modeled observation remains a year');
  const year=Number(f.observation_period),ranges=source.coverage.acquired_periods.map(p=>p.split(/[–-]/).map(Number));
  statisticalRequire(ranges.some(([a,b])=>year>=a&&year<=b),'Unemployment period not acquired');
  statisticalRequire(item.upstream_id===f.indicator+':'+g.provider_geography_id+':'+f.observation_period&&f.series_id==='worldbank:wdi:'+f.indicator+':'+g.provider_geography_id,'Stable indicator/geography/year identity required');
  statisticalRequire(f.unit==='percent_of_total_labor_force'&&f.unit_scale===1&&f.estimate_basis==='modeled_ILO_estimate','Percent of labor force is a modeled estimate, not population share or headcount');
  statisticalRequire(f.reference_population==='Total labor force; not total population, unemployed headcount or individual talent'&&f.original_provider==='ILO Modelled Estimates database (ILOEST), International Labour Organization / ILOSTAT','Exact modeled provider/population context required');
  statisticalRequire(f.value===null?f.missingness==='source_returned_null':typeof f.value==='number'&&Number.isFinite(f.value)&&f.value>=0&&f.value<=100&&f.missingness==='source_numeric_value','Modeled percentages must be within0–100; null is not zero');
  statisticalRequire(f.provider_metadata_date_accessed==='2026-01-17'&&f.model_release_vintage===null&&f.metadata_date_accessed_semantics==='Date accessed stated in exact indicator metadata; not model-release/publication/event time','Metadata access date cannot become model-release or publication date');
  statisticalRequire(v&&v.date_precision==='date_only_dataset_vintage_not_per_observation_update'&&v.per_observation_revision_time===null&&v.historical_vintages_in_this_batch===false,'Dataset vintage is not per-observation update history');
  statisticalDate(v.dataset_last_updated_date);
 }else{
  const m=f.source_metadata,date=statisticalDate(f.observation_period),[start,end]=source.coverage.acquired_period;
  statisticalRequire(f.domain==='FX'&&f.observation_granularity==='day'&&date>=start&&date<=end,'Only acquired date-only daily reference observations admitted');
  statisticalRequire(m&&Object.keys(m).length===ECB_COLUMNS.length&&ECB_COLUMNS.every(k=>Object.hasOwn(m,k)&&typeof m[k]==='string'),'All32 original ECB CSV metadata fields required');
  statisticalRequire(f.base_currency==='EUR'&&['USD','MYR'].includes(f.quote_currency)&&f.unit===f.quote_currency+'_per_EUR'&&f.unit_scale===1,'Reference rate retains supplied EUR base and quote units');
  const key='EXR.D.'+f.quote_currency+'.EUR.SP00.A';
  statisticalRequire(f.series_id==='ECB:'+key&&item.upstream_id===key+':'+date&&m.KEY===key&&m.FREQ==='D'&&m.CURRENCY===f.quote_currency&&m.CURRENCY_DENOM==='EUR'&&m.EXR_TYPE==='SP00'&&m.EXR_SUFFIX==='A'&&m.TIME_PERIOD===date,'ECB source dimensions/date/identity mismatch');
  statisticalRequire(f.source_agency_code==='4F0'&&m.SOURCE_AGENCY==='4F0'&&f.source_agency_label==='European Central Bank (ECB)'&&f.reference_type==='ECB_euro_reference_rate_informational','Only verified ECB informational reference series admitted');
  statisticalRequire(f.source_title===m.TITLE&&f.value_raw===m.OBS_VALUE&&/^[+]?(?:\d+(?:\.\d*)?|\.\d+)$/.test(f.value_raw)&&typeof f.value==='number'&&Number.isFinite(f.value)&&f.value>0&&Number(f.value_raw)===f.value&&f.missingness==='source_numeric_value','Original reference value remains unchanged and positive');
  statisticalRequire(m.UNIT===f.quote_currency&&m.UNIT_MULT==='0'&&f.metadata_preservation==='Original CSV values, codes and metadata retained unchanged; typed wrapper/formatting only','Original currency metadata cannot be scaled or reinterpreted');
  statisticalRequire(f.transformations&&Object.keys(f.transformations).sort().join(',')==='annualized,cross_rate_calculated,inverted,scaled'&&Object.values(f.transformations).every(v=>v===false),'No inversion, scaling, cross-rate or annualization allowed');
 }
 return item;
}
