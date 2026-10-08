"""Independent original XLSX cell/metadata equality, no provider or Site calls."""
from pathlib import Path
import json,hashlib,openpyxl
R=Path(__file__).resolve().parent;h=lambda b:hashlib.sha256(b).hexdigest();safe=json.loads((R/'safe-data/selected-monthly-prices-1990-2026.json').read_text());raw=(R/'source-data/monthly.xlsx').read_bytes();assert h(raw)==safe['source_workbook_sha256'];w=openpyxl.load_workbook(R/'source-data/monthly.xlsx',read_only=True,data_only=True);prices=list(w['Monthly Prices'].iter_rows(values_only=True));headers=prices[4];units=prices[5];desc=list(w['Description'].iter_rows(values_only=True));source_months={r[0][:4]+'-'+r[0][5:]:r for r in prices[6:]if isinstance(r[0],str)};count=0
for s in safe['series']:
 col=headers.index(s['source_name']);assert units[col]==s['unit_raw'];d=desc[s['definition_row']-1];assert d[1]==s['definition']and d[19]==s['provider_reference']
 for c in s['cells']:
  v=source_months[c['period']][col];assert v==c['raw_value'];expected=v if isinstance(v,(int,float))and not isinstance(v,bool)else None;assert expected==c['value'];count+=1
assert count==15435 and len(safe['series'])==35;assert all(s['source_name']!='Iron ore, cfr spot'for s in safe['series'])
report={'schema_version':'dormathon.commodity-original-safe-parity.v0.18','status':'passed','original_observation_cells_verified':count,'series_definition_provider_unit_profiles_verified':35,'original_workbook_sha256':h(raw),'safe_payload_sha256':h((R/'safe-data/selected-monthly-prices-1990-2026.json').read_bytes()),'no_interpolation_currency_or_unit_conversion':True,'iron_ore_conflict_excluded':True,'provider_requests':0,'site_requests':0};(R/'reports/original-safe-parity.json').write_text(json.dumps(report,indent=2)+'\n');print(json.dumps(report))
