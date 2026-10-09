"""Pure source-qualified TTBD CVD procedural trajectories. No fetch, causal labels or entity matching."""
import datetime,hashlib,json,math,re
SOURCE='outcome_worldbank_ttbd_cvd';PARSER='ttbd-cvd-trajectories-v0.21.0'
PLACEHOLDERS={'','MI','.','IF'}
DATE_FIELDS=['INIT_DATE','P_SUB_DATE','P_INJ_DATE','P_CVD_DATE','F_SUB_DATE','F_INJ_DATE','F_CVD_DATE','REVOKE_DATE','TERM_DATE']
CODE_FIELDS=['P_SUB_DEC','P_INJ_DEC','P_CVD_MEASURE','F_SUB_DEC','F_INJ_DEC','F_CVD_MEASURE','REVOKE_DATE']
PAIR={'P_SUB_DEC':'P_SUB_DATE','P_INJ_DEC':'P_INJ_DATE','P_CVD_MEASURE':'P_CVD_DATE','F_SUB_DEC':'F_SUB_DATE','F_INJ_DEC':'F_INJ_DATE','F_CVD_MEASURE':'F_CVD_DATE','REVOKE_DATE':'REVOKE_DATE'}
CONTEXT=['V_NUMBER','CASE_ID','CASE_REPCODE','CVD_CTY_NAME','INV_CTY_NAME','INV_CTY_CODE','PRODUCT','RELATED_AD','REVOKE_YEAR','WTO_CITATION']+DATE_FIELDS+CODE_FIELDS
COLLECTIVE=re.compile(r'^(all\s+(other\s+)?(others|exporters|producers|companies|firms)|others|other exporters|country[- ]wide|china[- ]wide)\b',re.I)
def canonical(x):return json.dumps(x,ensure_ascii=False,sort_keys=True,separators=(',',':'),allow_nan=False)
def digest(x):return hashlib.sha256(x if isinstance(x,bytes)else canonical(x).encode()).hexdigest()
def text(v,limit=500):
 if not isinstance(v,str)or len(v)>limit or any(ord(c)<32 and c not in '\t\n\r'for c in v):raise ValueError('Invalid bounded source text')
 return v
def unknown(basis):return {'value':None,'precision':'unknown','timezone':None,'basis':basis}
def typed_day(row,field):
 v=row['fields'].get(field);basis=f"Source cell {field}; original raw value and workbook date mode retained in environment.source_context"
 if v is None or isinstance(v,str)and v.strip()in PLACEHOLDERS:return unknown(basis+'; missing or unresolved source marker')
 if isinstance(v,(int,float))and not isinstance(v,bool):
  if not math.isfinite(v)or v!=int(v)or not 1<=v<=90000:raise ValueError('Invalid or non-day Excel date cell')
  mode=row['date_mode']
  if mode not in [0,1]:raise ValueError('Unknown Excel epoch')
  if mode==0 and v==60:raise ValueError('Fictitious Excel leap date')
  start=datetime.date(1904,1,1)if mode else datetime.date(1899,12,31)
  days=int(v)if mode else int(v)-(1 if v>=61 else 0)
  d=start+datetime.timedelta(days=days)
 elif isinstance(v,str):
  if re.fullmatch(r'\d{4}-\d{2}-\d{2}T00:00:00',v):d=datetime.date.fromisoformat(v[:10])
  elif re.fullmatch(r'\d{4}-\d{2}-\d{2}',v):d=datetime.date.fromisoformat(v)
  else:return unknown(basis+'; unparsed source date string')
 else:raise ValueError('Unsupported date cell')
 return {'value':d.isoformat(),'precision':'day','timezone':None,'basis':basis+'; date-only, no time-of-day claim'}
def pointer(r,field):return {'workbook':r['workbook'],'workbook_sha256':r['workbook_sha256'],'sheet':r['sheet'],'row':r['row'],'field':field}
def read_envelope(masters,related):
 ids={}
 for r in masters:
  f=r['fields'];id=text(f.get('CASE_ID'),100)
  if id in ids:raise ValueError('Ambiguous global master CASE_ID: '+id)
  for k in ['V_NUMBER','CVD_CTY_NAME','PRODUCT','INIT_DATE','CASE_REPCODE']:
   if k not in f:raise ValueError('Missing source-required field '+k)
  if f['V_NUMBER']!='Q4_2024':raise ValueError('Unreviewed source vintage')
  text(f['CVD_CTY_NAME']);text(f['PRODUCT'],2000)
  typed_day(r,'INIT_DATE');ids[id]=r
 for r in related:
  if r['fields'].get('CASE_ID')not in ids:raise ValueError('Orphan related CASE_ID')
 return ids

def project(row,related,receipt,license_url,source_url):
 f=row['fields'];case=f['CASE_ID'];case_id=SOURCE+':'+case;onset=typed_day(row,'INIT_DATE')
 if onset['value']is None or not '2020-01-01'<=onset['value']<='2024-12-31':raise ValueError('Outside selected cohort')
 raw_group=f['CASE_REPCODE'];group_known=isinstance(raw_group,str)and raw_group.strip()not in PLACEHOLDERS
 group=SOURCE+':group:'+(raw_group if group_known else case)
 gov=SOURCE+':jurisdiction:'+digest(f['CVD_CTY_NAME'])[:20]
 actors=[{'actor_id':gov,'actor_type':'government_jurisdiction','name':f['CVD_CTY_NAME'],'role':'reporting_investigation_jurisdiction','identity_basis':'Exact source reporting-country label; authority name and ISO mapping not inferred','registry_refs':[]}]
 omitted=[];seen=set()
 for r in related:
  if r['fields']['CASE_ID']!=case:continue
  for field,role in [('D_FIRM','domestic_party_source_label'),('F_FIRM','foreign_party_source_label')]:
   v=r['fields'].get(field)
   if v is None or isinstance(v,str)and v.strip()in PLACEHOLDERS:continue
   text(v)
   if COLLECTIVE.match(v.strip()):omitted.append(pointer(r,field));continue
   if re.search(r'https?://|[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}',v):raise ValueError('Contact/URL field cannot become an actor')
   aid=case_id+':'+field+':'+digest(pointer(r,field))[:20]
   if aid in seen:continue
   seen.add(aid);actors.append({'actor_id':aid,'actor_type':'unknown','name':v,'role':role,'identity_basis':'Exact case-scoped source entity label; may denote a company, association or compound label; no cross-case identity resolution','registry_refs':[]})
 actions=[]
 for field in DATE_FIELDS:
  if field not in f:continue
  t=typed_day(row,field)
  if t['value']is None:continue
  actions.append({'action_id':case_id+':'+field,'actor_ids':[gov],'action_type':'source_reported_'+field,'status':'reported','time':t,'evidence':{'source_record_id':case,'field':field,'raw_value':f[field],'url':source_url}})
 outcomes=[]
 for field in CODE_FIELDS:
  raw=f.get(field);marker=raw.strip()if isinstance(raw,str)else None
  if field=='REVOKE_DATE':
   value=typed_day(row,field)['value'];status='source_reported'if value else'unknown'
   unit='date-only source revocation cell';value_type='categorical'
  else:
   if raw is not None and not isinstance(raw,str):raise ValueError('Source decision/measure marker must be text')
   value=raw if marker not in PLACEHOLDERS and raw is not None else None;status='source_reported'if value is not None else'unknown';unit='uninterpreted source categorical code';value_type='categorical'
  end=typed_day(row,PAIR[field]);action=case_id+':'+PAIR[field]
  outcomes.append({'metric_id':case_id+':metric:'+field,'name':field,'value_type':value_type,'value':value,'value_status':status,'unit':unit,'label_kind':'reported','measurement_window':{'start':onset,'end':end,'basis':'Source case progression window; not a business impact evaluation horizon'},'basis':'Exact source categorical marker/date cell; no CVD-specific codebook interpretation or downstream business effect. MI/dot/IF and unstated legal effect remain unknown.', 'evidence':{'source_record_id':case,'field':field,'raw_value':raw,'url':source_url},'related_action_ids':[action]if any(a['action_id']==action for a in actions)else[],'attribution_status':'not_established'})
 ctx=[{'field':k,'value':f[k]}for k in dict.fromkeys(CONTEXT)if k in f]
 result={'schema_version':'dormathon.outcome-trajectory.v1','source_id':SOURCE,'source_record_id':case,'event_group_id':group,'domain':'policy_supply_chain','title':case+' — '+f['CVD_CTY_NAME']+' countervailing case: '+f['PRODUCT'], 'actors':actors,'event':{'event_type':'source_reported_countervailing_investigation','onset':onset,'end':unknown('No verified whole-case end; stage dates/revocation cells are kept independently'),'geography':[{'role':'reporting_jurisdiction','label':f['CVD_CTY_NAME'],'id':f['CVD_CTY_NAME'],'namespace':'ttbd:reporting-country-label','basis':'source_provided'},{'role':'investigated_origin_reference','label':f['INV_CTY_NAME'],'id':f['INV_CTY_CODE'],'namespace':'ttbd:INV_CTY_CODE','basis':'source_provided; no current ISO/operating/impact mapping'}]},'actions':actions,'outcomes':outcomes,'environment':{'snapshot_asof':unknown('Contemporaneous decision environment unavailable'),'reconstruction_status':'not_reconstructed','source_context':ctx},'confounding':{'assessment_status':'not_assessed','concurrent_event_ids':[],'notes':'No counterfactual or causal outcome attribution; product/country/related-case references are source context only.'},'availability':{'publication':unknown('Per-field/per-record original publication unavailable'),'source_asof':{'value':'2024-Q4','precision':'quarter','timezone':None,'basis':'Exact raw source vintage Q4_2024; not original publication or field-level availability'},'revision':unknown('Prior publication/revision history unavailable'),'acquired_at':receipt['fetched_at'],'historical_availability_status':'not_verified'},'completeness':{'monitored_universe':'Reported CVD case rows in this exact World Bank archive; not all actors/actions or event-free exposure','window':{'start':{'value':'2020-01-01','precision':'day','timezone':None,'basis':'Selected source initiation-date cohort begins'},'end':{'value':'2024-12-31','precision':'day','timezone':None,'basis':'Selected initiation-date cohort ends; not complete follow-up monitoring'},'basis':'2020–24 source initiation cohort, source vintage Q4_2024'},'source_record_status':'reported_record','censoring':'unknown','negative_label_supported':False,'limitations':'No business loss/recovery, actor strategy, measured actor impact or causal effect. No2025–26 update or original publication/revision reconstruction. Party labels are case/table-row references, not resolved companies; no person scoring or name joins. Legacy AD codebook is not applied to CVD. '+('Group is supplied CASE_REPCODE. 'if group_known else'Empty source group: self-only grouping. ')+f'{len(omitted)} collective all-other labels omitted from actor identities; original rows remain in safe witnesses. Unknown censoring; missing reports cannot form negatives.'},'provenance':{'source_url':source_url,'license_name':'CC-BY-4.0','license_url':license_url,'source_snapshot_id':'TTBD-CVD-Q4_2024','raw_response_sha256':receipt['raw_sha256'],'safe_projection_sha256':digest({'master':row,'related':[r for r in related if r['fields']['CASE_ID']==case]}),'parser_version':PARSER}}
 result['event']['geography']=[g for g in result['event']['geography']if isinstance(g['id'],str)and g['id'].strip()not in PLACEHOLDERS and isinstance(g['label'],str)and g['label'].strip()not in PLACEHOLDERS]
 return result
