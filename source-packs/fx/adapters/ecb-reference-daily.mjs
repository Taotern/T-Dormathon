export const adapterVersion='ecb-reference-daily-v0.13';
export const SERIES=['EXR.D.MYR.EUR.SP00.A','EXR.D.USD.EUR.SP00.A'];
export const COLUMNS=['KEY','FREQ','CURRENCY','CURRENCY_DENOM','EXR_TYPE','EXR_SUFFIX','TIME_PERIOD','OBS_VALUE','OBS_STATUS','OBS_CONF','OBS_PRE_BREAK','OBS_COM','TIME_FORMAT','BREAKS','COLLECTION','COMPILING_ORG','DISS_ORG','DOM_SER_IDS','PUBL_ECB','PUBL_MU','PUBL_PUBLIC','UNIT_INDEX_BASE','COMPILATION','COVERAGE','DECIMALS','NAT_TITLE','SOURCE_AGENCY','SOURCE_PUB','TITLE','TITLE_COMPL','UNIT','UNIT_MULT'];
const require=(ok,message)=>{if(!ok)throw Error(message);};
function dateOnly(value){if(typeof value!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(value))return false;const [y,m,d]=value.split('-').map(Number),x=new Date(Date.UTC(y,m-1,d));return x.getUTCFullYear()===y&&x.getUTCMonth()===m-1&&x.getUTCDate()===d;}
export function parseCSV(raw){
 require(typeof raw==='string'&&!raw.includes('\uFFFD')&&!/^\s*[<\[{]/.test(raw),'Expected UTF-8 CSV, not error/HTML/JSON');
 const text=raw.replace(/^\uFEFF/,''),table=[];let row=[],field='',quoted=false,closed=false;
 function commitField(){row.push(field);field='';closed=false;}
 function commitRow(){commitField();if(row.some(v=>v!==''))table.push(row);row=[];}
 for(let i=0;i<text.length;i++){
  const c=text[i];
  if(quoted){if(c==='"'){if(text[i+1]==='"'){field+='"';i++;}else{quoted=false;closed=true;}}else field+=c;continue;}
  if(c==='"'){require(field===''&&!closed,'Quote inside unquoted field');quoted=true;continue;}
  if(c===','){commitField();continue;}
  if(c==='\r'||c==='\n'){if(c==='\r'&&text[i+1]==='\n')i++;commitRow();continue;}
  require(!closed,'Unexpected characters after closing quote');field+=c;
 }
 require(!quoted,'Unclosed quoted CSV field');if(field!==''||row.length||closed)commitRow();
 const columns=table.shift()||[];require(columns.length===COLUMNS.length&&columns.every((x,i)=>x===COLUMNS[i]),'Exact recognized ECB metadata schema required');
 return table.map(values=>{require(values.length===columns.length,'CSV column count mismatch');return Object.fromEntries(columns.map((key,i)=>[key,values[i]]));});
}
export function readEnvelope(raw,source){
 const rows=parseCSV(raw),seen=new Map(),records=[];
 require(!source.expect_nonempty||rows.length>0,'Known published query window cannot silently return zero');
 for(const row of rows){
  require(SERIES.includes(row.KEY)&&row.KEY===`EXR.D.${row.CURRENCY}.EUR.SP00.A`,'Unadmitted/mismatched currency series');
  require(row.FREQ==='D'&&row.CURRENCY_DENOM==='EUR'&&row.EXR_TYPE==='SP00'&&row.EXR_SUFFIX==='A'&&row.SOURCE_AGENCY==='4F0','Daily ECB reference series/source schema drift');
  require(row.UNIT===row.CURRENCY&&row.UNIT_MULT==='0'&&row.TIME_FORMAT==='P1D','Unscaled quote-unit/date grain required');
  require(dateOnly(row.TIME_PERIOD)&&row.TIME_PERIOD>=source.period_start&&row.TIME_PERIOD<=source.period_end,'Source observation date outside acquired window');
  require(/^\d{1,2}$/.test(row.DECIMALS)&&typeof row.TITLE==='string'&&row.TITLE.trim(),'Source precision/title metadata required');
  require(Object.values(row).every(v=>typeof v==='string'&&v.length<=2000),'Oversized or invalid source metadata');
  require(row.OBS_VALUE===''||/^(?:\d+(?:\.\d*)?|\.\d+)$/.test(row.OBS_VALUE)&&Number.isFinite(Number(row.OBS_VALUE))&&Number(row.OBS_VALUE)>0,'Reference value must be original positive numeric text or explicit empty');
  const id=row.KEY+':'+row.TIME_PERIOD,content=JSON.stringify(row);
  if(seen.has(id)){require(seen.get(id)===content,'Conflicting same-series/date records');continue;}
  seen.set(id,content);records.push(row);
 }
 for(const key of source.required_series||[])require(records.some(r=>r.KEY===key),'Known requested series missing from response');
 return {recognized_schema:true,records,returned_count:records.length,upstream_count:rows.length,duplicate_rows:rows.length-records.length,empty_allowed:true,legitimate_empty:rows.length===0,empty_result:!records.length,coverage_incomplete:true,coverage_basis:'Complete retained HTTP body; provider/calendar continuity and query truncation guarantee are not established'};
}
export function project(row,source,base={}){
 const id=row.KEY+':'+row.TIME_PERIOD;
 return {source_id:source.id,upstream_id:id,title:row.TITLE+' — '+row.TIME_PERIOD,url:'https://www.ecb.europa.eu/stats/policy_and_exchange_rates/euro_reference_exchange_rates/html/index.en.html',short_summary:null,category:'economy',source_country:null,source_language:'en',event_country:null,location:null,location_basis:'unknown',entities:[],event_time:null,published_at:null,source_updated_at:null,first_seen_at:base.first_seen_at??null,fetched_at:base.fetched_at??null,ingested_at:base.ingested_at??null,content_depth:'structured_facts',facts:{record_kind:'statistical_observation',domain:'FX',series_id:'ECB:'+row.KEY,observation_period:row.TIME_PERIOD,observation_granularity:'day',value_raw:row.OBS_VALUE,value:row.OBS_VALUE===''?null:Number(row.OBS_VALUE),missingness:row.OBS_VALUE===''?'source_supplied_empty_value':'source_numeric_value',unit:row.UNIT+'_per_EUR',unit_scale:1,quote_currency:row.CURRENCY,base_currency:row.CURRENCY_DENOM,source_agency_code:row.SOURCE_AGENCY,source_agency_label:'European Central Bank (ECB)',agency_code_basis:'Primary ECB Data Portal maps shared organization/provider code4F0 to ECB',source_title:row.TITLE,reference_type:'ECB_euro_reference_rate_informational',source_metadata:structuredClone(row),metadata_preservation:'Original CSV values, codes and metadata retained unchanged; typed wrapper/formatting only',transformations:{inverted:false,scaled:false,cross_rate_calculated:false,annualized:false},publication_clock:'Unknown; source date and TITLE_COMPL clock are not per-record publication instants',geography_basis:'Supplied currency dimensions only; no country, company operating footprint or event location inferred',unit_index_base_semantics:'UNIT_INDEX_BASE is retained raw and not interpreted as an index/base period for these currency-unit reference rates',availability_basis:'Published source observation dates; TARGET closure calendar and full provider continuity not verified',data_origin_basis:'Actual retained official ECB API CSV response; Site admission is separate'},source_license:'ECB/ESCB public statistics reuse policy: commercial/noncommercial reuse with ECB attribution and unchanged statistics/metadata; exclude uncleared third-party data. Source: ECB statistics; original reference-rate values and metadata unchanged.',evidence_url:'https://data-api.ecb.europa.eu/service/data/'+row.KEY.replace(/^EXR\./,'EXR/')};
}
export function semanticPayload(item){const x=structuredClone(item);for(const clock of ['first_seen_at','fetched_at','ingested_at'])delete x[clock];return x;}
