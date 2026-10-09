import {REPORTING_COUNTRY_POLICY} from './generated.js';
import {ValidationError} from './common.js';

const reportingCountryCodeSet=new Set(REPORTING_COUNTRY_POLICY.countries.map(c=>c.code));
const reportingCountryNames=new Map(REPORTING_COUNTRY_POLICY.countries.map(c=>[c.code,c.name]));
const reportingSourceID=m=>String(m.source_id||'').replace(/^local__/, '');
const reportingPath=(m,path)=>path.split('.').reduce((v,k)=>v?.[k],m);

export function reportingCountryContext(metadata){
 const source=reportingSourceID(metadata),rule=REPORTING_COUNTRY_POLICY.sources.find(r=>r.source_id===source);
 if(!rule)return null;
 let code,value;
 if(rule.kind==='worldbank_dimension'){
  const g=metadata.facts?.geography,mapped=REPORTING_COUNTRY_POLICY.worldbank.find(d=>d.id===g?.provider_geography_id);
  if(!mapped||g.provider!=='World Bank'||g.kind!=='country_or_economy'||g.provider_country_alias!==mapped.code||metadata.facts?.record_kind!=='statistical_observation')return null;
  code=mapped.code;value=g.provider_geography_id;
 }else{
  value=reportingPath(metadata,rule.field);
  if(typeof value!=='string')return null;
  code=rule.mapping?rule.mapping[value]:value;
 }
 if(!reportingCountryCodeSet.has(code)||rule.allowed_codes&&!rule.allowed_codes.includes(code))return null;
 return{country_code:code,country_name:reportingCountryNames.get(code),namespace:REPORTING_COUNTRY_POLICY.namespace,role:rule.role,source_namespace:rule.source_namespace,source_id:source,field:rule.field,source_value:value,mapping_policy:REPORTING_COUNTRY_POLICY.policy_version,basis:rule.basis,limitations:rule.limitations};
}

export function reportingCountryBounds(filters,clauses,args){
 const value=filters.reporting_country;
 if(value===undefined||value===null||value==='')return null;
 if(typeof value!=='string'||!reportingCountryCodeSet.has(value))throw new ValidationError('报告辖区需要已支持的ISO3166-1大写二字母代码，例如MY/JP/GB；未知代码不做词项猜测');
 const id="json_extract(v.metadata,'$.source_id')",source="case when substr("+id+",1,7)='local__' then substr("+id+",8) else "+id+" end",branches=[];
 for(const rule of REPORTING_COUNTRY_POLICY.sources){
  if(rule.allowed_codes&&!rule.allowed_codes.includes(value))continue;
  if(rule.kind==='worldbank_dimension'){
   const d=REPORTING_COUNTRY_POLICY.worldbank.find(d=>d.code===value);if(!d)continue;
   branches.push('('+source+"=? AND json_extract(v.metadata,'$.facts.record_kind')='statistical_observation' AND json_extract(v.metadata,'$.facts.geography.provider')='World Bank' AND json_extract(v.metadata,'$.facts.geography.kind')='country_or_economy' AND json_extract(v.metadata,'$.facts.geography.provider_geography_id')=? AND json_extract(v.metadata,'$.facts.geography.provider_country_alias')=?)");args.push(rule.source_id,d.id,value);
  }else{
   const raw=rule.mapping?Object.keys(rule.mapping).filter(k=>rule.mapping[k]===value):[value];if(!raw.length)continue;
   const field="json_extract(v.metadata,'$."+rule.field+"')";
   branches.push('('+source+'=? AND '+field+' IN ('+raw.map(()=>'?').join(',')+'))');args.push(rule.source_id,...raw);
  }
 }
 clauses.push(branches.length?'('+branches.join(' OR ')+')':'0=1');
 return{country_code:value,country_name:reportingCountryNames.get(value),namespace:REPORTING_COUNTRY_POLICY.namespace,mapping_policy:REPORTING_COUNTRY_POLICY.policy_version,basis:REPORTING_COUNTRY_POLICY.filter_basis,unknown_and_unresolved_excluded:true};
}

export function reportingCountryStatus(){return{supported:true,parameter:'reporting_country',namespace:REPORTING_COUNTRY_POLICY.namespace,policy_version:REPORTING_COUNTRY_POLICY.policy_version,sources:REPORTING_COUNTRY_POLICY.sources.map(({source_id,role})=>({source_id,role})),basis:REPORTING_COUNTRY_POLICY.filter_basis,exclusions:REPORTING_COUNTRY_POLICY.exclusions};}
