"""Independent complete original worksheet-to-safe projection equality. Read-only, no network."""
from pathlib import Path
import json,hashlib,zipfile,xlrd,collections
R=Path(__file__).resolve().parent;sha=lambda b:hashlib.sha256(b).hexdigest()
safe=json.loads((R/'safe-data/safeguard-cases-2020-2024.json').read_text());raw=(R/'source-data/safeguards.zip').read_bytes();assert sha(raw)==safe['original_zip_sha256']
with zipfile.ZipFile(R/'source-data/safeguards.zip')as z:workbook=z.read(safe['workbook_member'])
assert sha(workbook)==safe['original_workbook_sha256'];book=xlrd.open_workbook(file_contents=workbook);assert book.datemode==safe['workbook_date_mode'];tables={}
for sheet in book.sheets():
 header=sheet.row_values(0);records=[]
 for i in range(1,sheet.nrows):
  d={}
  for j,key in enumerate(header):
   if key in ['', 'NOTES']:continue
   c=sheet.cell(i,j)
   if key.endswith('_DATE'):
    day=xlrd.xldate_as_datetime(c.value,book.datemode).date().isoformat()if c.ctype==3 else None
    d[key]={'raw_value':c.value,'cell_type':{0:'empty',1:'text',2:'number',3:'excel_date',6:'blank'}[c.ctype],'date':day,'precision':'day'if day else'unknown'}
   else:d[key]=c.value
  records.append(d)
 tables[sheet.name]=records
groups=collections.defaultdict(list)
for row in tables['SG-Master']:groups[row['CASE_ID']].append(row)
conflicts={k:v for k,v in groups.items()if any(r!=v[0]for r in v)};assert set(conflicts)=={'THA-SG-5'}
candidates=[r for r in tables['SG-Master']if r['WTO_INIT_DATE']['date']and '2020-01-01'<=r['WTO_INIT_DATE']['date']<='2024-12-31'];eligible=[r for r in candidates if r['CASE_ID']not in conflicts];assert len(candidates)==61 and len(eligible)==len(safe['cases'])==60
for case in safe['cases']:
 source=next(r for r in eligible if r['CASE_ID']==case['master']['CASE_ID']);assert source==case['master']
 for name,projection in case['related'].items():
  original=[r for r in tables[name]if r['CASE_ID']==source['CASE_ID']];assert len(original)==projection['matched_count'];assert original[:projection['cap']]==projection['rows'];assert projection['selected_count']==len(projection['rows'])
assert {r['master']['CASE_ID']for r in safe['cases']}=={r['CASE_ID']for r in eligible}
report={'schema_version':'dormathon.ttbd-original-safe-parity.v0.17','status':'passed','cases_verified':60,'candidate_cases':61,'quarantined_identities':['THA-SG-5'],'all_original_permitted_master_fields_equal':True,'all_retained_related_field_values_equal':True,'all_related_counts_caps_equal':True,'identity_check_precedes_window_selection':True,'zip_sha256':sha(raw),'workbook_sha256':sha(workbook),'safe_payload_sha256':sha((R/'safe-data/safeguard-cases-2020-2024.json').read_bytes()),'provider_requests':0,'site_requests':0}
(R/'reports/original-safe-parity.json').write_text(json.dumps(report,indent=2)+'\n');print(json.dumps(report))
