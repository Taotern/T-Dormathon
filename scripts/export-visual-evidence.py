"""Reproduce display-only projections from retained original dynamics artifacts. No fitting/training."""
import argparse,json,pathlib
parser=argparse.ArgumentParser();parser.add_argument('source_artifacts',type=pathlib.Path);parser.add_argument('output',type=pathlib.Path);args=parser.parse_args()
read=lambda name:json.loads((args.source_artifacts/name).read_text())
observations=read('dynamics-observations-v1.json');updates=read('dynamics-daily-updates.json');pinn=read('dynamics-thermal-pinn-v1.json')
replay=json.loads('{"schema_version": "dormathon.synthetic-history-replay.v1", "data_mode": "SYNTHETIC_INTERNAL", "observed_real_company_data": false, "source_id": "authored-extension-seed410105-v1", "generator_seed": 410105, "source_artifact": "dynamics-observations-v1.json", "display_semantics": "Last 60 already-authored dated synthetic sales releases. This interface replays supplied records; it is not evidence of 60 operating days or a live feed.", "daily_accuracy_available": false, "daily_accuracy_unavailable_reason": "No daily paired pre-release forecasts and uncensored outcomes were exported for this window. Forecast accuracy is unavailable; it is not synthesized.", "fit_history_source_artifact": "dynamics-daily-updates.json", "fit_history_semantics": "Replay one dated daily observation release at a time; refit only rows strictly before each as-of time; no automatic background ingest is claimed."}')
days=[]
for row in observations['demand'][-60:]:
 thermal=[r for r in observations['thermal'] if r['date']==row['date']]
 days.append({**row,'thermal_rows':len(thermal),'mean_ending_temperature_c':sum(r['ending_temperature_c'] for r in thermal)/len(thermal) if thermal else None,'daily_accuracy':None})
# Preserve the original exported key order.
replay={**dict(list(replay.items())[:9]),'days':days,**dict(list(replay.items())[9:])}
replay['fit_history']=[{'as_of':a['calibration']['as_of'],'version':a['calibration']['version'],'window_start':a['provenance']['window_start'],'latest_training_date':a['provenance']['latest_training_date'],'uncensored_sales_rows':a['provenance']['uncensored_sales_rows'],'demand_innovation_rmse_log_units':a['fit']['demand_innovation_rmse_log_units'],'thermal_training_rmse_c':a['fit']['thermal_training_rmse_c'],'holdout_rows_used':a['provenance']['holdout_rows_used']} for a in updates['artifacts']]
pinn={k:v for k,v in pinn.items() if k!='weights'}
pinn['validation']={k:v for k,v in pinn['validation'].items() if k!='heldout_x'}
args.output.mkdir(parents=True,exist_ok=True)
for name,value in [('visual-replay-60d.json',replay),('visual-pinn-training.json',pinn)]:
 (args.output/name).write_text(json.dumps(value,indent=2,ensure_ascii=False)+'\n')
