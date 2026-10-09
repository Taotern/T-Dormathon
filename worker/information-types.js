import {ValidationError} from './common.js';

export const INFORMATION_TYPE_VERSION='source-shaped-information-types-v1';
export const INFORMATION_TYPES=[
 {id:'reference',label:'基础资料',scope:'地点、企业和机构的源限定登记 / 身份参照；不自动证明经营范围或主要实体资格'},
 {id:'observation',label:'状态与数值',scope:'源统计、价格和状态记录；保留时期、地区、单位、缩放和估计口径'},
 {id:'event',label:'事件与变化',scope:'源报告的事件、公告、刊登或程序案件；不默认确认影响、实施或当前效力'},
 {id:'interpretation',label:'解释与预期',scope:'新闻、讲话、预警和预测元数据；事实 / 观点未知时明确保留未知'},
 {id:'unknown',label:'待分类',scope:'当前源字段不足以可靠归类的记录；仍可在全部记录与此页检索'}
];
const INFORMATION_RULES=[
 {source:['metmalaysia_sarawak_forecast'],type:'interpretation',facet:'forward_forecast',secondary:['observation']},
 {source:['my_warning'],present:'facts.warning_issue.issued',type:'event',facet:'source_reported_warning_issuance',secondary:['interpretation']},
 {source:['my_warning'],type:'interpretation',facet:'warning_metadata_issuance_unknown',secondary:[]},
 {source:['my_fuel_latest'],type:'observation',facet:'source_effective_price',secondary:[]},
 {source:['usgs','eonet','gdacs'],type:'event',facet:'source_reported_hazard',secondary:[]},
 {source:['ecb','bis_press','bis_speeches','un_zh','nasa_metadata'],type:'interpretation',facet:'publication_metadata_fact_opinion_unknown',secondary:[]},
 {kind:['country_area_identity','legal_entity_registry','political_organization_identity'],type:'reference',facet:'source_qualified_identity',secondary:[]},
 {kind:['statistical_observation'],type:'observation',facet:'native_statistical_value',secondary:[]},
 {kind:['legal_document_publication'],type:'event',facet:'legal_resource_publication',secondary:['reference']},
 {kind:['official_notice'],type:'event',facet:'source_announcement_metadata',secondary:[]},
 {kind:['trade_remedy_case'],type:'event',facet:'source_reported_procedural_case',secondary:['reference']}
];
export function informationType(metadata={},config={}){
 const source=String(config.original_source_id||metadata.original_source_id||config.id||metadata.source_id||'').replace(/^local__/,'');
 const rule=INFORMATION_RULES.find(r=>(r.source?.includes(source)||r.kind?.includes(config.material_kind))&&(!r.present||informationPath(metadata,r.present)));
 const type=rule?.type||'unknown';
 return {policy_version:INFORMATION_TYPE_VERSION,primary:type,facet:rule?.facet||'source_kind_unknown',secondary:source==='enterprise_sec_disclosures'?['event']:[...(rule?.secondary||[])],basis:rule?.source?'approved_source_adapter_scope':rule?'registered_source_material_kind':'insufficient_typed_source_metadata',source_qualified_id:source,source_material_kind:config.material_kind||null,fact_opinion_status:rule?.facet==='forward_forecast'?'forecast_not_observed':source==='my_warning'?'source_reported_warning_claim_occurrence_unverified':type==='interpretation'?'unknown':null,forecast:source==='metmalaysia_sarawak_forecast',underlying_event_effect_verified:false,secondary_scope:source==='enterprise_sec_disclosures'?'embedded source filing references; not independent resolved company incidents':source==='metmalaysia_sarawak_forecast'?'forecast numerical fields and validity dates; not observed weather':null};
}
function informationPath(metadata,path){const value=path.split('.').reduce((v,key)=>v?.[key],metadata);return typeof value==='string'&&value.trim().length>0;}
function sqlString(value){return "'"+value.replaceAll("'","''")+"'";}
export function informationTypeSQL({metadata='v.metadata',config='s.config',source='i.source_id'}={}){
 const sourceExpr="coalesce(json_extract("+config+",'$.original_source_id'),json_extract("+metadata+",'$.original_source_id'),CASE WHEN substr("+source+",1,7)='local__' THEN substr("+source+",8) ELSE "+source+' END)';
 return 'CASE '+INFORMATION_RULES.map(r=>'WHEN '+(r.source?sourceExpr+' IN('+r.source.map(sqlString).join(',')+')'+(r.present?" AND json_type("+metadata+",'$."+r.present+"')='text' AND trim(json_extract("+metadata+",'$."+r.present+"'),char(9,10,11,12,13,32,160,5760,8192,8193,8194,8195,8196,8197,8198,8199,8200,8201,8202,8232,8233,8239,8287,12288,65279))<>''":''):"json_extract("+config+",'$.material_kind') IN("+r.kind.map(sqlString).join(',')+')')+' THEN '+sqlString(r.type)).join(' ')+' ELSE '+sqlString('unknown')+' END';
}
export function informationTypeBounds(filters,clauses,args){
 const type=filters.information_type;
 if(type===undefined||type===null||type==='')return null;
 if(typeof type!=='string'||!INFORMATION_TYPES.some(t=>t.id===type))throw new ValidationError('information_type需要明确的reference/observation/event/interpretation/unknown');
 clauses.push('('+informationTypeSQL()+')=?');args.push(type);
 return {primary:type,policy_version:INFORMATION_TYPE_VERSION,secondary_facets_are_crosslinks_only:true};
}
export async function informationTypeStatus(store){
 const rows=await store.rows('SELECT '+informationTypeSQL()+' information_type,count(*) count FROM intel_items i JOIN intel_versions v ON v.id=i.current_version_id JOIN intel_registry s ON s.id=i.source_id GROUP BY information_type');
 const types=INFORMATION_TYPES.map(t=>({...t,count:rows.find(r=>r.information_type===t.id)?.count||0}));
 return {schema_version:'dormathon.information-types.v1',policy_version:INFORMATION_TYPE_VERSION,types,total_current_records:types.reduce((n,t)=>n+t.count,0),basis:'derived primary source/record kind at current immutable version; original metadata is unchanged',secondary_facets_do_not_duplicate_records:true,coverage_complete_global:false,outcomes_are_separate:true};
}
