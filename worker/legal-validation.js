import {ValidationError,stableJSON} from './common.js';
function legalRequire(ok,message){if(!ok)throw new ValidationError(message);}
function legalDate(value,label){if(value===null||value===undefined||value==='')return null;legalRequire(typeof value==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(value),label+' requires a supplied date-only value');const [y,m,d]=value.split('-').map(Number);legalRequire(y>=1&&m>=1&&m<=12&&d>=1&&d<=new Date(Date.UTC(y,m,0)).getUTCDate(),label+' has invalid calendar date');return value;}
function legalAware(value,label){if(value===null||value===undefined||value==='')return null;legalRequire(typeof value==='string'&&/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/.test(value),label+' requires a supplied timezone');legalDate(value.slice(0,10),label);const t=value.slice(11,19).split(':').map(Number),o=/([+-])(\d{2}):(\d{2})$/.exec(value);legalRequire(t[0]<24&&t[1]<60&&t[2]<60&&(!o||+o[2]<24&&+o[3]<60)&&Number.isFinite(Date.parse(value)),label+' invalid time');return value;}
function legalURL(value,host,allowHttp=false){let u;try{u=new URL(value)}catch{}legalRequire(u&&u.hostname===host&&!u.username&&!u.password&&(u.protocol==='https:'||allowHttp&&u.protocol==='http:'),'Invalid official legal URL');return u;}
/** Publication records do not establish territorial applicability or a binding legal conclusion. */
export function validateLegalMetadata(item,source){
 if(!['legal_uk_legislation_publications','legal_us_federal_register'].includes(item.source_id))return item;
 const f=item.facts;
 legalRequire(item.category==='policy'&&item.source_country===source.source_country&&item.source_language==='en'&&item.short_summary===null,'Legal metadata content/origin mismatch');
 legalRequire(item.event_country===null&&item.location===null&&item.location_basis==='unknown'&&item.event_time===null,'Legal publication is not a located incident');
 legalRequire(item.source_license===source.rights.attribution&&f.record_kind==='legal_document_publication'&&f.domain==='law_policy','Legal rights/record kind mismatch');
 legalRequire(f.document_id===item.upstream_id&&f.effectiveness_status==='unknown_not_verified'&&f.binding_status==='unknown_not_inferred','Unsupported legal identity/status inference');
 legalRequire(f.document_kind_basis==='source_provided'&&f.time_precision.event==='unknown','Legal type is source metadata; occurrence precision is unknown');
 legalRequire(f.jurisdiction.country_code===source.source_country&&f.jurisdiction.territorial_application===null,'Jurisdiction does not establish territorial applicability');
 legalDate(f.effective_date,'effective date');legalDate(f.comments_close_date,'comments-close date');
 if(source.id==='legal_us_federal_register'){
  legalRequire(item.published_at===null&&item.source_updated_at===null,'Date-only US publication cannot become timestamp');legalDate(f.publication_date,'publication date');
  legalRequire(f.publication_date&&['Rule','Proposed Rule','Notice'].includes(f.document_kind)&&f.official_legal_edition_verified===false&&f.time_precision.publication==='day'&&f.time_precision.source_update==='unknown'&&f.time_precision.effective===(f.effective_date?'day':'unknown')&&f.time_precision.comments_close===(f.comments_close_date?'day':'unknown')&&f.publication_time_basis==='source_date_only'&&f.jurisdiction.level==='federal'&&f.jurisdiction.basis==='source_publication_system','US legal semantics mismatch');
  const page=legalURL(item.url,'www.federalregister.gov'),pdf=legalURL(f.official_pdf_url,'www.govinfo.gov');
  legalRequire(/^(?:[A-Z]\d-)?\d{4}-\d{3,6}$/.test(item.upstream_id)&&page.pathname.includes('/'+item.upstream_id+'/')&&pdf.pathname==='/content/pkg/FR-'+f.publication_date+'/pdf/'+item.upstream_id+'.pdf','Official document/date/edition reference mismatch');
  legalRequire(item.evidence_url===f.official_pdf_url&&stableJSON(item.entities)===stableJSON(f.agencies.map(a=>({name:a.name,type:'organization',basis:'source_provided'}))),'Agency/evidence projection mismatch');
  for(const agency of f.agencies){legalRequire(agency.basis==='source_provided'&&(agency.id===null||Number.isSafeInteger(agency.id)&&agency.id>0)&&(agency.parent_id===null||Number.isSafeInteger(agency.parent_id)&&agency.parent_id>0),'Agency relationship must use supplied IDs');if(agency.url)legalURL(agency.url,'www.federalregister.gov');}
  for(const ref of f.cfr_references)legalRequire(Number.isSafeInteger(ref.title)&&ref.title>=1&&ref.title<=50&&['number','string'].includes(typeof ref.part)&&ref.basis==='source_provided_reference','CFR reference is source-provided, without applicability confirmation');
 }else{
  legalRequire(item.published_at===f.publication_at_raw&&item.source_updated_at===f.updated_at_raw&&item.entities.length===0&&f.effective_date===null&&f.comments_close_date===null&&f.jurisdiction.territorial_extent===null,'UK publication/unknown extent mismatch');
  legalAware(f.publication_at_raw,'publication raw');legalAware(f.updated_at_raw,'update raw');legalDate(f.source_creation_date,'source CreationDate');
  legalRequire(f.updated_at_raw&&f.time_precision.source_update==='source_timezone_timestamp'&&f.time_precision.creation===(f.source_creation_date?'day':'unknown')&&f.time_precision.effective==='unknown'&&f.time_precision.publication===(f.publication_at_raw?(f.publication_at_raw.includes('T00:00:00')?'source_midnight_timestamp_precision_unverified':'source_timezone_timestamp'):'unknown')&&f.publication_time_basis==='website_Atom_published_not_enactment_or_commencement'&&f.source_update_basis==='website_entry_Atom_updated_not_legal_amendment_proof'&&f.jurisdiction.basis==='source_type_identifier_mapping','Website update/publication semantics and source precision must remain explicit');
  legalRequire(['legislation','correction_slip'].includes(f.resource_kind),'Unknown UK resource kind');
  const official=legalURL(item.upstream_id,'www.legislation.gov.uk',true),page=legalURL(item.url,'www.legislation.gov.uk');
  const match=/^\/(?:id\/)?(ukpga|uksi|ssi|wsi|nisr|nia)\/(\d{4})\/(\d+)(\/pdfs\/[A-Za-z0-9_]+\.pdf)?$/.exec(official.pathname);
  legalRequire(match&&match[1]===f.type_code&&Number(match[2])===f.instrument_year&&Number(match[3])===f.instrument_number&&page.pathname.startsWith('/'+f.type_code+'/'+f.instrument_year+'/'+f.instrument_number),'UK resource/type/year/number reference mismatch');
  legalRequire(f.instrument_id==='http://www.legislation.gov.uk/id/'+f.type_code+'/'+f.instrument_year+'/'+f.instrument_number,'Related instrument identity mismatch');
  legalRequire((f.resource_kind==='correction_slip')===!!match[4],'Correction resource must remain distinct from its instrument');
  if(f.resource_kind==='correction_slip')legalRequire(item.title==='Correction Slip','Correction slip cannot become newly enacted law');
  for(const r of f.supersedes){legalRequire(Object.keys(r).length===1&&typeof r.URI==='string','Unsupported Supersedes fields');legalURL(r.URI,'www.legislation.gov.uk',true);}
 }
 return item;
}
