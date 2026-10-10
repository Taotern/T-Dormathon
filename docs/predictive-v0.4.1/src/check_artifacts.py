import json,hashlib
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
load=lambda p:json.loads((ROOT/'artifacts'/p).read_text())
p=load('data-profile.v1.json');r=load('benchmark-report.v1.json');split=load('frozen-split.v1.json');m=load('model-artifact.v1.json');s=load('simulated-policy-report.v1.json')
assert p['counts']['raw_rows']==1067371
assert sum(p['exclusive_row_partition'].values())==1067371
assert p['sheet_overlap']['overlap_start']=='2010-12-01' and p['sheet_overlap']['overlap_end']=='2010-12-09'
assert p['coverage']['trailing_excluded_day']=='2011-12-09'
assert split['train_calendar_days']>=180 and split['validation_calendar_days']==28 and split['test_calendar_days']==28
assert split['configuration_sha256']==m['split_configuration_sha256']
assert not p['cross_split_invoice_groups']
assert r['selected_model']=='moving_average_28'
assert r['selection']['validation_winner']=='moving_average_28'
assert r['models']['moving_average_28']['validation']['WAPE']<r['models']['ridge_lag_calendar']['validation']['WAPE']
assert r['models']['moving_average_28']['test']['WAPE']>1
assert r['posthoc_diagnostics']['zero_forecast']['test']['WAPE']==1
assert r['sample_sizes']['test_prediction_points']==3231*22*7
assert all(v['stock_conservation_pass'] for v in s['policies'].values())
assert s['policies']['forecast_informed']['infeasible_storage_episodes']==0
assert load('simulated-policy-report.unsafe-capacity.v1.json')['policies']['forecast_informed']['infeasible_storage_episodes']==437
assert all(v['infeasible_storage_episodes']==0 for v in s['policies'].values())
assert s['output_type']=='SIMULATED_COUNTERFACTUAL'
assert r['scenarioDataMode']=='EXTERNAL_BENCHMARK'
assert m['feature_policy'].startswith('only origin-and-earlier')
print('Artifact boundary/split/selection/conservation assertions passed')
