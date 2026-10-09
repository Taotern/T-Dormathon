from pathlib import Path
import zipfile,xlrd,openpyxl,io,hashlib,json,collections,datetime
R=Path(__file__).resolve().parent
rows=[];books=[];related=[]
with zipfile.ZipFile(R/'source-data/countervailing.zip')as z:
 if len(z.infolist())>32 or sum(i.file_size for i in z.infolist())>33554432 or any(i.file_size>8388608 for i in z.infolist()):raise ValueError('Archive/member resource bound exceeded')
 if any(i.filename.startswith('/')or'..'in Path(i.filename).parts for i in z.infolist()):raise ValueError('Unsafe archive path')
 for name in sorted(z.namelist()):
  if not name.lower().endswith(('.xls','.xlsx')):continue
  b=z.read(name);wh=hashlib.sha256(b).hexdigest()
  if name.endswith('.xlsx'):
   w=openpyxl.load_workbook(io.BytesIO(b),read_only=True,data_only=True);sheets=[(s.title,list(s.values))for s in w];date_mode=0
  else:
   w=xlrd.open_workbook(file_contents=b);sheets=[(s.name,[s.row_values(i)for i in range(s.nrows)])for s in w.sheets()];date_mode=w.datemode
  audit=[]
  for title,rr in sheets:
   if not rr:continue
   headers=[str(v).strip()if v is not None else''for v in rr[0]]
   audit.append(dict(sheet=title,rows=len(rr)-1,headers=headers))
   if 'CASE_ID'not in headers:continue
   for i,values in enumerate(rr[1:],2):
    fields={k:v.isoformat()if isinstance(v,(datetime.date,datetime.datetime))else v for k,v in zip(headers,values)if k and k!='NOTES'}
    if not fields.get('CASE_ID'):continue
    item=dict(workbook=name,workbook_sha256=wh,sheet=title,row=i,date_mode=date_mode,fields=fields)
    (rows if title.lower().endswith('master')else related).append(item)
  books.append(dict(path=name,sha256=wh,sheets=audit))
byid=collections.defaultdict(list)
for r in rows:byid[str(r['fields']['CASE_ID'])].append(r)
conflicts={k:v for k,v in byid.items()if len(v)>1}
def parsed(r,field):
 v=r['fields'].get(field)
 if isinstance(v,(int,float))and 0<v<90000:
  try:return xlrd.xldate_as_datetime(v,r['date_mode']).date().isoformat()
  except:return None
 if isinstance(v,str)and len(v)>=10:
  try:return datetime.date.fromisoformat(v[:10]).isoformat()
  except:return None
 return None
selected=[r for r in rows if r['fields']['CASE_ID']not in conflicts and (parsed(r,'INIT_DATE')or'')[:4]in['2020','2021','2022','2023','2024']]
result=dict(schema_version='dormathon.ttbd-cvd-extraction-audit.v0.21',books=books,master_rows=len(rows),unique_case_ids=len(byid),duplicate_case_id_occurrences={k:[{a:r[a]for a in['workbook','sheet','row']}for r in v]for k,v in conflicts.items()},reporting_labels=sorted(set(str(r['fields'].get('CVD_CTY_NAME'))for r in rows)),vintages=dict(collections.Counter(str(r['fields'].get('V_NUMBER'))for r in rows)),selected2020_2024_rows=len(selected),selected_reporting_labels=dict(collections.Counter(str(r['fields'].get('CVD_CTY_NAME'))for r in selected)),selected_init_years=dict(collections.Counter(parsed(r,'INIT_DATE')[:4]for r in selected)),selected_case_ids=[r['fields']['CASE_ID']for r in selected])
(R/'reports/extraction-audit.json').write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n')
(R/'source-data/master-with-witness.safe.json').write_text(json.dumps(rows,ensure_ascii=False,separators=(',',':'))+'\n')
(R/'source-data/related-with-witness.safe.json').write_text(json.dumps(related,ensure_ascii=False,separators=(',',':'))+'\n')
print(json.dumps({k:v for k,v in result.items()if k not in['books','selected_case_ids']},ensure_ascii=False))
print('GBR',next(b for b in books if b['path'].endswith('.xlsx')))
print('selected examples',[(r['fields']['CASE_ID'],parsed(r,'INIT_DATE'),r['fields'].get('F_SUB_DEC'),r['fields'].get('F_INJ_DEC'),r['fields'].get('REVOKE_DATE'))for r in selected[:8]])
