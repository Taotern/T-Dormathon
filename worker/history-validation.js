import {ValidationError} from './common.js';
function requireFact(ok,message){if(!ok)throw new ValidationError(message);}
/** Validate typed source GDP context without deriving inflation, growth or risk. */
export function validateHistoricalGDP(item,source){
 const f=item.facts,g=f.geography,v=f.vintage;
 requireFact(f.indicator==='NY.GDP.MKTP.CD'&&f.record_kind==='statistical_observation','Unadmitted historical indicator');
 requireFact(item.source_country===null&&item.event_country===null&&item.location===null&&item.published_at===null&&item.event_time===null&&item.source_updated_at===null,'Annual context has no located event or publication clock');
 requireFact(g?.provider==='World Bank'&&['country_or_economy','aggregate'].includes(g.kind)&&/^[A-Z0-9]{3}$/.test(g.provider_geography_id),'Source-qualified World Bank geography required');
 requireFact((g.region_id==='NA')===(g.kind==='aggregate'),'Aggregate and reporting-economy classification mismatch');
 requireFact(/^\d{4}$/.test(f.observation_period)&&f.observation_granularity==='year','Annual period stays typed');
 const year=Number(f.observation_period),ranges=source.coverage.acquired_periods.map(p=>p.split(/[–-]/).map(Number));
 requireFact(ranges.some(([a,b])=>year>=a&&year<=b),'Historical year has not been acquired');
 requireFact(item.upstream_id===f.indicator+':'+g.provider_geography_id+':'+f.observation_period&&f.series_id==='worldbank:wdi:'+f.indicator+':'+g.provider_geography_id,'Stable indicator/geography/year identity mismatch');
 requireFact(f.unit==='current_USD'&&f.unit_scale===1&&f.price_basis==='current_prices_not_constant_or_PPP','Nominal USD source units cannot become PPP, real growth or scaled values');
 requireFact(f.value===null?f.missingness==='source_returned_null':typeof f.value==='number'&&Number.isFinite(f.value)&&f.value>=0&&f.missingness==='source_numeric_value','Returned null is distinct from zero or absent cells');
 requireFact(v&&/^\d{4}-\d{2}-\d{2}$/.test(v.dataset_last_updated_date)&&v.date_precision==='date_only_dataset_vintage_not_per_observation_update'&&v.per_observation_revision_time===null&&v.historical_vintages_in_this_batch===false,'Dataset vintage remains date-only, with no invented release history');
 const [y,m,d]=v.dataset_last_updated_date.split('-').map(Number),date=new Date(Date.UTC(y,m-1,d));requireFact(date.getUTCFullYear()===y&&date.getUTCMonth()===m-1&&date.getUTCDate()===d,'Invalid vintage calendar date');
 return item;
}
