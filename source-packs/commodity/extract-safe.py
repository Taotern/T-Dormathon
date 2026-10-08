"""Read-only workbook extraction; source missing cells and benchmark descriptions preserved."""
from pathlib import Path
from datetime import datetime,timezone
import json,hashlib,openpyxl,math,re,zipfile,collections,os
ROOT=Path(os.environ.get('DORMATHON_COMMODITY_DATA_DIR',Path(__file__).resolve().parent)).resolve()
for d in ['safe-data','reports','coverage']:(ROOT/d).mkdir(parents=True,exist_ok=True)
read=lambda p:json.loads((ROOT/p).read_text());sha=lambda b:hashlib.sha256(b).hexdigest()
config=read('contracts/series-selection.v0.18.json');receipt=read('receipts/monthly.json');raw=(ROOT/receipt['retained_path']).read_bytes();assert receipt['http_status']==200 and receipt['body_complete']and sha(raw)==receipt['upstream_raw_sha256']
with zipfile.ZipFile(ROOT/receipt['retained_path'])as z:assert sum(i.file_size for i in z.infolist())<=33554432,'Decoded workbook budget'
w=openpyxl.load_workbook(ROOT/receipt['retained_path'],read_only=True,data_only=True)
assert {'Monthly Prices','Description'}<=set(w.sheetnames);s=w['Monthly Prices'];table=list(s.iter_rows(values_only=True));assert table[0][0]=='World Bank Commodity Price Data (The Pink Sheet)'and 'nominal US dollars' in table[1][0]
assert table[3][0]=='Updated on October 02, 2026','Unreviewed source edition';headers=table[4];units=table[5];labels=[x for x in headers[1:]if x is not None];assert len(labels)==len(set(labels))==71,'Price-header uniqueness/schema drift'
periods=[];observations={}
for i,row in enumerate(table[6:],7):
 p=row[0]
 if p is None:continue
 assert isinstance(p,str)and re.fullmatch(r'\d{4}M(?:0[1-9]|1[0-2])',p),'Invalid monthly row label'
 key=p[:4]+'-'+p[5:];assert key not in observations,'Conflicting/duplicate source period';periods.append(key);observations[key]=(i,row)
assert periods[0]=='1960-01'and periods[-1]=='2026-09'and len(periods)==801
indices=lambda month:int(month[:4])*12+int(month[5:])-1
assert [indices(x)for x in periods]==list(range(indices(periods[0]),indices(periods[-1])+1)),'Source calendar gaps'
selected=[p for p in periods if p>=config['start_month']];assert len(selected)==441 and selected[-1]==config['expected_latest_month']
desc=w['Description'];desc_rows=list(desc.iter_rows(values_only=True));method_log=[{'source_row':i+1,'text':r[1].strip()}for i,r in enumerate(desc_rows)if i>=107 and i<=130 and len(r)>1 and isinstance(r[1],str)]
series=[];location_terms=['Sarawak','Sabah','Malaysia','Tokyo','China','Japan','Europe','Louisiana','Henry Hub','Newcastle','Richards Bay','Singapore','Bangkok','Rotterdam','US Gulf','Middle East','North Africa','London']
unit_map={'($/bbl)':'USD_per_barrel','($/mt)':'USD_per_metric_ton','($/mmbtu)':'USD_per_million_British_thermal_units','($/kg)':'USD_per_kilogram','($/troy oz)':'USD_per_troy_ounce','($/cubic meter)':'USD_per_cubic_meter'}
for spec in config['series']:
 col=headers.index(spec['name']);unit=units[col];assert unit in unit_map,'Unknown or conflicted native unit'
 dr=desc_rows[spec['definition_row']-1];definition=dr[1];providers=dr[19]if len(dr)>19 else None;assert isinstance(definition,str)and 0<len(definition)<=1800 and isinstance(providers,str)and len(providers)<=1800
 if spec['id']=='wheat_hrw':assert definition.startswith('Wheat (U.S.), no. 2 hard red winter')
 if spec['id']=='wheat_srw':assert definition.startswith('Wheat (U.S.), no. 2, soft red winter')
 cells=[]
 for month in selected:
  row_index,row=observations[month];v=row[col]
  if isinstance(v,(int,float))and not isinstance(v,bool):assert math.isfinite(v);status='supplied_numeric';value=v;kind='number'
  else:assert v is None or v in ['…','...','..',''],'Unknown source missingness marker';status='source_missing';value=None;kind='blank'if v is None else'text_marker'
  cells.append({'period':month,'raw_value':v,'value':value,'missingness':status,'cell_kind':kind})
 series.append({**spec,'source_name':spec['name'],'unit_raw':unit,'unit':unit_map[unit],'currency':'USD','unit_scale':1,'definition':definition,'provider_reference':providers,'definition_metadata_scope':'Current source Description includes historical regimes; not evidence of a homogeneous quote basis across all months','reference_locations':[t for t in location_terms if t.lower()in definition.lower()],'reference_locations_basis':'Literal source-definition text matches; no geocoding/current-country/impact assertion','futures_forward_inputs_mentioned':bool(re.search(r'future|forward|nearby contract',definition,re.I)),'latest_two_months_estimate_rule':spec['id']=='lng_japan','cells':cells})
safe={'schema_version':'dormathon.commodity-monthly-safe.v0.18','source_workbook_sha256':sha(raw),'source_sheet':'Monthly Prices','source_price_basis':'monthly prices in nominal US dollars','source_edition_raw':table[3][0],'source_edition_date':'2026-10-02','original_available_period':['1960-01','2026-09'],'selected_period':['1990-01','2026-09'],'expected_months_per_series':441,'source_price_columns_including_index':71,'price_series_selected':len(series),'series':series,'method_change_log':method_log,'auxiliary_sheets_excluded':[n for n in w.sheetnames if n not in ['Monthly Prices','Description']],'unit_quarantine':config['unit_quarantine'],'definitions_pdf_sha256':read('receipts/definitions.json')['upstream_raw_sha256']}
out=ROOT/'safe-data/selected-monthly-prices-1990-2026.json';out.write_text(json.dumps(safe,ensure_ascii=False,indent=2)+'\n')
coverage={'schema_version':'dormathon.commodity-missingness.v0.18','source_workbook_sha256':sha(raw),'safe_payload_sha256':sha(out.read_bytes()),'observation_months':{'start':'1990-01','end':'2026-09','expected_calendar_months_per_series':441,'actual_source_rows':441,'missing_source_month_rows':0},'source_edition_date':'2026-10-02','series':[{'id':r['id'],'source_name':r['source_name'],'group':r['group'],'unit':r['unit'],'unit_raw':r['unit_raw'],'numeric_count':sum(c['value']is not None for c in r['cells']),'missing_count':sum(c['value']is None for c in r['cells']),'zero_count':sum(c['value']==0 for c in r['cells']),'first_numeric_month':next((c['period']for c in r['cells']if c['value']is not None),None),'last_numeric_month':next((c['period']for c in reversed(r['cells'])if c['value']is not None),None),'missing_months':[c['period']for c in r['cells']if c['value']is None],'recent2020_forward_numeric':sum(c['value']is not None for c in r['cells']if c['period']>='2020-01'),'recent2020_forward_expected_months':81}for r in series],'excluded_unit_conflict':config['unit_quarantine'],'value_interpolation':False,'country_denominator':None,'prices_are_country_complete':False,'not_tradable_futures_or_forecasts':True,'recurring_operational':False,'site_ingestion':'not_run'}
(ROOT/'coverage/series-month-missingness.v0.18.json').write_text(json.dumps(coverage,ensure_ascii=False,indent=2)+'\n')
print(json.dumps({'series':len(series),'months_per_series':441,'observation_cells':len(series)*441,'recent2020_cells':len(series)*81,'fully_numeric_1990_latest':sum(r['numeric_count']==441 for r in coverage['series']),'missingness':[(r['id'],r['missing_count'])for r in coverage['series']if r['missing_count']],'safe_payload_bytes':out.stat().st_size,'safe_payload_sha256':sha(out.read_bytes())}))
