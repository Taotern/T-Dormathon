"""Read-only BIFF extraction of one pinned official workbook; no formulas/macros run."""
from pathlib import Path
from datetime import datetime
import json,hashlib,zipfile,xlrd,collections,math,os
ROOT=Path(os.environ.get('DORMATHON_TRADE_DATA_DIR',Path(__file__).resolve().parent)).resolve()
for directory in ['safe-data','reports','coverage']:(ROOT/directory).mkdir(parents=True,exist_ok=True)
def read(p):return json.loads((ROOT/p).read_text())
def sha(b):return hashlib.sha256(b).hexdigest()
receipt=read('receipts/safeguards.json');raw=(ROOT/receipt['retained_path']).read_bytes();assert receipt['http_status']==200 and receipt['body_complete']and sha(raw)==receipt['upstream_raw_sha256']
with zipfile.ZipFile(ROOT/receipt['retained_path'])as z:
 files=[x for x in z.infolist()if not x.is_dir()];assert len(files)==1 and files[0].filename=='Global safeguard measures/GSGD-WTO.xls'and files[0].file_size<=8388608
 workbook_raw=z.read(files[0]);book=xlrd.open_workbook(file_contents=workbook_raw)
EXPECTED={
 'SG-Master':['V_NUMBER','SG_CTY_NAME','CASE_ID','PRODUCT','PET_DATE','WTO_INIT_DATE','P_DATE','P_INJ_DEC','P_DEC','P_SG_DATE','P_SG_MEASURE','F_INJ_DATE','F_INJ_DEC','F_DATE','F_DEC','F_SG_DATE','F_SG_MEASURE','TERM_DATE','D1_DATE','D2_DATE','D3_DATE','D4_DATE','D1_YR','D2_YR','D3_YR','D4_YR','EXP_DATE','EXP_YR','REVOKE_DATE','REVOKE_YEAR','WTO_INIT_DOC','WTO_PRELIM_DOC','WTO_INJ_INV_DOC','WTO_FINAL_DOC','NOTES'],
 'SG-Products':['CASE_ID','SG_CTY_NAME','HS_CODE','HS_DIGITS','HS_SUBSET','F_SG_PRODUCT','F_SG_PRODUCT_D1','F_SG_PRODUCT_D2','F_SG_PRODUCT_D3','F_SG_PRODUCT_D4','NOTES',''],
 'SG-QR or TRQ':['CASE_ID','HS_CODE','HS_SUBSET','QR_CTY_NAME','QR_CTY_CODE','F_SG_QR','F_SG_QR_D1','F_SG_QR_D2','F_SG_QR_D3','F_SG_QR_D4','NOTES',''],
 'SG-Final Measures':['CASE_ID','SG_CTY_NAME','HS_CODE','HS_DIGITS','HS_SUBSET','AVD','SD','DPU','TRQ/SD','TRQ/AVD','QR','REC_CTY_NAME','REC_CTY_CODE','F_SG_PRODUCT','F_SG_PRODUCT_D1','F_SG_PRODUCT_D2','F_SG_PRODUCT_D3','F_SG_PRODUCT_D4','UNIT_DUTY','F_SG_QR','F_SG_QR_D1','F_SG_QR_D2','F_SG_QR_D3','F_SG_QR_D4','UNIT_QR','NOTES'],
 'SG-Exemptions':['CASE_ID','EXEMPT_CTY_NAME','EXEMPT_CTY_CODE','NOTES','','','']}
assert book.sheet_names()==list(EXPECTED)
tables={};headers={};date_kinds=collections.Counter()
for name,cols in EXPECTED.items():
 sheet=book.sheet_by_name(name);assert sheet.nrows<=25000 and sheet.ncols==len(cols)and sheet.row_values(0)==cols
 headers[name]=cols;records=[]
 for i in range(1,sheet.nrows):
  row={}
  for j,key in enumerate(cols):
   if not key or key=='NOTES':continue
   cell=sheet.cell(i,j);assert cell.ctype in [0,1,2,3,5,6],'Unsupported formula/error/bool cell'
   assert cell.ctype!=5,'Source cell contains an Excel error'
   v=cell.value
   if isinstance(v,float):assert math.isfinite(v)
   if key.endswith('_DATE'):
    converted=None
    if cell.ctype==3:
     dt=xlrd.xldate_as_datetime(v,book.datemode);assert(dt.hour,dt.minute,dt.second,dt.microsecond)==(0,0,0,0),'Date-only source cell unexpectedly has time'
     converted=dt.date().isoformat()
    row[key]={'raw_value':v,'cell_type':{0:'empty',1:'text',2:'number',3:'excel_date',6:'blank'}[cell.ctype],'date':converted,'precision':'day'if converted else'unknown'};date_kinds[row[key]['cell_type']]+=1
   else:row[key]=v
  records.append(row)
 tables[name]=records
master=tables['SG-Master'];groups=collections.defaultdict(list)
for r in master:groups[r['CASE_ID']].append(r)
conflicts={key:rows for key,rows in groups.items()if any(row!=rows[0]for row in rows)}
assert set(conflicts)=={'THA-SG-5'},'Unexpected conflicting identity needs a fresh review'
candidates=[r for r in master if r['WTO_INIT_DATE']['date']and '2020-01-01'<=r['WTO_INIT_DATE']['date']<='2024-12-31']
selected=[r for r in candidates if r['CASE_ID']not in conflicts];selected.sort(key=lambda r:r['CASE_ID']);assert len(selected)<=100
caps={'SG-Products':24,'SG-QR or TRQ':12,'SG-Final Measures':12,'SG-Exemptions':24};cases=[]
for r in selected:
 related={}
 for name,cap in caps.items():
  rows=[x for x in tables[name]if x['CASE_ID']==r['CASE_ID']];related[name]={'matched_count':len(rows),'selected_count':min(len(rows),cap),'cap':cap,'truncated':len(rows)>cap,'selection_basis':'First supplied workbook rows for this case, in source order; not a representative/full product or country list','rows':rows[:cap]}
 cases.append({'master':r,'related':related})
safe={'schema_version':'dormathon.ttbd-safeguard-safe.v0.17','source_family':'World Bank TTBD','workbook_member':'Global safeguard measures/GSGD-WTO.xls','workbook_date_mode':book.datemode,'dataset_vintage_labels':sorted({r['V_NUMBER']for r in master}),'original_zip_sha256':sha(raw),'original_workbook_sha256':sha(workbook_raw),'source_workbook_headers':headers,'source_table_counts':{k:len(v)for k,v in tables.items()},'selection':{'clock':'Source WTO_INIT_DATE Excel date cell; no notification/publication/occurrence instant inferred','start':'2020-01-01','end':'2024-12-31','candidate_case_count':len(candidates),'selected_case_count':len(cases),'quarantined_candidate_count':len(candidates)-len(selected),'quarantined_case_ids':sorted(conflicts),'case_cap':100,'truncated':False},'cases':cases}
out=ROOT/'safe-data/safeguard-cases-2020-2024.json';out.write_text(json.dumps(safe,ensure_ascii=False,indent=2)+'\n')
coverage={'source_case_rows':len(master),'source_distinct_case_ids':len(groups),'conflicting_ids':sorted(conflicts),'selected_candidate_count':len(candidates),'quarantined_candidate_count':len(candidates)-len(selected),'source_implementing_labels':sorted({r['SG_CTY_NAME']for r in master}),'source_WTO_INIT_DATE_span':[min(r['WTO_INIT_DATE']['date']for r in master if r['WTO_INIT_DATE']['date']),max(r['WTO_INIT_DATE']['date']for r in master if r['WTO_INIT_DATE']['date'])],'selected_case_count':len(cases),'selected_implementing_labels':sorted({r['master']['SG_CTY_NAME']for r in cases}),'selected_WTO_INIT_DATE_by_year':dict(sorted(collections.Counter(r['master']['WTO_INIT_DATE']['date'][:4]for r in cases).items())),'related_table_counts':{name:{'matched_rows':sum(r['related'][name]['matched_count']for r in cases),'retained_rows':sum(r['related'][name]['selected_count']for r in cases),'cases_with_truncation':sum(r['related'][name]['truncated']for r in cases)}for name in caps},'date_cell_kinds_in_complete_master':dict(date_kinds),'safe_payload_sha256':sha(out.read_bytes()),'workbook_date_mode':book.datemode,'codebook_scope':'Generic downloaded definitions are antidumping-focused; safeguard stage labels/decision markers stay original and uninterpreted','person_or_firm_rows_exported':0,'notes_contacts_article_bodies_exported':False,'recurring_operational':False,'site_ingestion':'not_run'}
(ROOT/'reports/identity-conflict-quarantine.v0.17.json').write_text(json.dumps({'source_case_id':'THA-SG-5','status':'quarantined','scope':'Both master rows and all related rows keyed by this ambiguous ID are excluded from normalized/retrieval output','reason':'Conflicting product/date/stage facts under one supplied case ID; related-table attachments cannot be disambiguated','original_zip_sha256':sha(raw),'safe_conflicting_master_rows':conflicts['THA-SG-5'],'fabricated_ids':False},ensure_ascii=False,indent=2)+'\n')
(ROOT/'coverage/source-selection-coverage.v0.17.json').write_text(json.dumps(coverage,ensure_ascii=False,indent=2)+'\n');print(json.dumps({k:coverage[k]for k in ['selected_case_count','selected_implementing_labels','selected_WTO_INIT_DATE_by_year','source_WTO_INIT_DATE_span','related_table_counts','safe_payload_sha256']},ensure_ascii=False))
