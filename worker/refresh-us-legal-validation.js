import {ValidationError} from './common.js';
import {validateLegalMetadata} from './legal-validation.js';
function usRefreshRequire(ok,message){if(!ok)throw new ValidationError('US刷新扩展：'+message);}
function usRefreshObject(v,keys){return v&&typeof v==='object'&&!Array.isArray(v)&&Object.keys(v).sort().join(',')===[...keys].sort().join(',');}
/** Only the exact separately admitted refresh profile invokes this; legacy legal metadata is unchanged. */
export function validateUSRefreshSuccessor(item,source){
 const f=item.facts;
 usRefreshRequire(Array.isArray(f.cfr_references)&&f.cfr_references.length<=100,'CFR参照上限');
 for(const r of f.cfr_references){
  usRefreshRequire(usRefreshObject(r,['title','part','chapter','basis'])&&r.basis==='source_provided_reference','CFR参照形态或来源依据变更');
  usRefreshRequire(r.title===null||Number.isSafeInteger(r.title)&&r.title>=1&&r.title<=50,'CFR title无效');
  usRefreshRequire(r.part===null||typeof r.part==='string'&&r.part.trim().length>0&&r.part.length<=100||Number.isSafeInteger(r.part)&&r.part>=0,'CFR part无效');
  usRefreshRequire(r.chapter===null||typeof r.chapter==='string'&&r.chapter.trim().length>0&&r.chapter.length<=100,'CFR chapter无效');
  usRefreshRequire(r.title!==null||r.part!==null||r.chapter!==null,'CFR参照全未知');
 }
 usRefreshRequire(typeof f.oversized_optional_action_omitted==='boolean','可选Action省略标志无效');
 if(f.oversized_optional_action_omitted){const o=f.action_omission;usRefreshRequire(f.action===null&&usRefreshObject(o,['original_field_length','length_unit','original_field_sha256','source_pointer','basis']),'超长Action必须完整省略且保留有界见证');usRefreshRequire(Number.isSafeInteger(o.original_field_length)&&o.original_field_length>1000&&o.original_field_length<=1048576&&o.length_unit==='UTF16_code_units'&&/^[a-f0-9]{64}$/.test(o.original_field_sha256),'Action原长度/指纹声明无效');usRefreshRequire(usRefreshObject(o.source_pointer,['document_id','field','url'])&&o.source_pointer.document_id===item.upstream_id&&o.source_pointer.field==='action'&&o.source_pointer.url===item.url&&o.basis==='source_supplied_optional_text_exceeded_1000_character_metadata_scope; complete_field_omitted_not_truncated','Action原始字段指针/省略依据不一致');}
 else usRefreshRequire(f.action_omission===null&&(f.action===null||typeof f.action==='string'&&f.action.length<=1000),'普通Action上限或省略见证不一致');
 // The unchanged validator checks all other legal/date/URL/agency/unknown-effect fields.
 // New CFR fields were checked above and are omitted only from this local check view.
 validateLegalMetadata({...item,facts:{...f,cfr_references:[]}},source);
 return item;
}
