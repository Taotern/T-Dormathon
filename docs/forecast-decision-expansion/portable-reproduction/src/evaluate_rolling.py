"""Frozen exploratory rolling evaluation; no original-test access or tuning.
Run OPENBLAS_NUM_THREADS=1 OMP_NUM_THREADS=1 python src/evaluate_rolling.py.
"""
import argparse, datetime as dt, hashlib, json, os, resource, time
from pathlib import Path
import numpy as np
ROOT=Path(__file__).resolve().parents[1]
PROTOCOL=ROOT/'protocol.json'
EXPECTED_PROTOCOL='4a96ca7b566952d6c68daf084f853e542bacb8d3b35f78a15b6a2542b548a0a2'
DATA_PATH=None
PACKAGE_ROOT=ROOT

def digest(path):return hashlib.sha256(path.read_bytes()).hexdigest()
def dump(path,obj):path.write_text(json.dumps(obj,indent=2,allow_nan=False)+'\n')
def quantile(x,q,axis=-1):return np.quantile(x,q,axis=axis,method='inverted_cdf')
def recurring_states(y):
 n,t=y.shape;names=['ewma_005','ewma_015','sba_01','tsb_01'];out={k:np.zeros_like(y) for k in names}
 size=np.zeros(n);interval=np.ones(n);last=np.full(n,-1);p=np.zeros(n);initialized=np.zeros(n,dtype=bool)
 e05=y[:,0].copy();e15=e05.copy()
 for j in range(t):
  z=y[:,j];hit=z>0;first=hit&~initialized;again=hit&initialized
  if j:e05=.05*z+.95*e05;e15=.15*z+.85*e15
  size[first]=z[first];interval[first]=j+1
  size[again]=.1*z[again]+.9*size[again];interval[again]=.1*(j-last[again])+.9*interval[again]
  p=.1*hit+.9*p;last[hit]=j;initialized|=hit
  out['ewma_005'][:,j]=e05;out['ewma_015'][:,j]=e15
  out['sba_01'][:,j]=.95*size/interval;out['tsb_01'][:,j]=p*size
 return out

def paths(y,o,weeks):
 # Future day +1 shares weekday with origin-6. Oldest to newest complete aligned weeks.
 return np.stack([y[:,o-7*w+1:o-7*w+8] for w in range(weeks,0,-1)],axis=1)

def forecast_all(y,origins,states):
 values={k:[] for k in json.loads(PROTOCOL.read_text())['point_candidates']}
 for o in origins:
  h=y[:,:o+1];p8=paths(y,o,8);tot8=p8.sum(axis=-1);shape=(p8.mean(axis=1)+h[:,-56:].mean(axis=1)[:,None])/2
  shape=np.divide(shape,shape.sum(axis=1)[:,None],out=np.full_like(shape,1/7),where=shape.sum(axis=1)[:,None]>0)
  now={'zero':np.zeros((len(y),7)),'seasonal_naive_7':h[:,-7:].copy(),'seasonal_mean_8weeks':p8.mean(axis=1)}
  for w in [7,28,56]:now['mean_'+str(w)]=np.repeat(h[:,-w:].mean(axis=1)[:,None],7,axis=1)
  now['median_28']=np.repeat(np.median(h[:,-28:],axis=1)[:,None],7,axis=1)
  # Two-sided 10% trimming, fixed floor(56*0.1)=5 each tail.
  now['trimmed_mean_56']=np.repeat(np.sort(h[:,-56:],axis=1)[:,5:-5].mean(axis=1)[:,None],7,axis=1)
  for k in states:now[k]=np.repeat(states[k][:,o,None],7,axis=1)
  for w in [8,12]:now['weekly_total_median_'+str(w)+'weeks']=np.median(paths(y,o,w).sum(axis=-1),axis=1)[:,None]*shape
  for k,v in now.items():values[k].append(v)
 return {k:np.stack(v,axis=1) for k,v in values.items()}

def actual(y,origins):return np.stack([y[:,o+1:o+8] for o in origins],axis=1)
def metric(pred,act):
 e=pred-act;weekly=e.sum(axis=-1);a=act.sum();n=act.shape[0]*act.shape[1]
 return {'daily_MAE_units':float(np.abs(e).mean()),'daily_WAPE':float(np.abs(e).sum()/a) if a else None,'weekly_MAE_units':float(np.abs(weekly).mean()),'weekly_WAPE':float(np.abs(weekly).sum()/a) if a else None,'weekly_bias_units':float(weekly.mean()),'weekly_zero_forecast_fraction':float((pred.sum(axis=-1)==0).mean()),'actual_units':float(a),'weekly_forecasts':n,'daily_prediction_points':int(act.size)}
def loss_q(pred,act,qs):
 err=act[:,:,None]-pred
 return np.maximum(np.array(qs)*err,(np.array(qs)-1)*err)
def quant_forecast(y,origins,weeks,qs):
 totals=[];daily=[]
 for o in origins:
  pp=paths(y,o,weeks);totals.append(np.moveaxis(quantile(pp.sum(axis=-1),qs,axis=1),0,-1));daily.append(np.moveaxis(quantile(pp,qs,axis=1),0,-1))
 return np.stack(totals,axis=1),np.stack(daily,axis=1)
def qmetric(pred,daily,act,qs):
 total=act.sum(axis=-1);loss=loss_q(pred,total,qs)
 return {'mean_pinball_units':float(loss.mean()),'pinball_by_quantile':{str(q):float(loss[:,:,i].mean()) for i,q in enumerate(qs)},'fraction_actual_le_quantile':{str(q):float((total<=pred[:,:,i]).mean()) for i,q in enumerate(qs)},'central80_inclusive_coverage':float(((total>=pred[:,:,0])&(total<=pred[:,:,-1])).mean()),'central80_mean_width_units':float((pred[:,:,-1]-pred[:,:,0]).mean()),'daily_central80_inclusive_coverage':float(((act>=daily[:,:,:,0])&(act<=daily[:,:,:,-1])).mean()),'discrete_quantile_note':'Inclusive coverage can exceed nominal for zero-inflated/discrete outcomes. q0.9 exceedance is the upper-tail diagnostic; these are not calibrated operational stockout probabilities.'}

def run():
 start=time.monotonic();assert digest(PROTOCOL)==EXPECTED_PROTOCOL,'Frozen protocol changed: declare a new study, do not overwrite this one.'
 config=json.loads(PROTOCOL.read_text());d=np.load(DATA_PATH,allow_pickle=False)
 all_dates=d['dates'];last=np.flatnonzero(all_dates=='2011-09-28')[0]+1
 # Discard all later data before extracting model inputs or outcomes.
 y=d['sales'][:,:last].astype(float);dates=all_dates[:last];items=d['items'];states=recurring_states(y)
 candidates=config['point_candidates'];qs=config['quantiles'];weeks=config['quantile_candidates_weeks'];reports=[];records=[]
 totals={k:[] for k in candidates+['adaptive_past_validation']};qtotals=[];fold_catalogs=[]
 for fold,start_date in enumerate(config['fold_test_starts']):
  test_start=int(np.flatnonzero(dates==start_date)[0]);val_start=test_start-28;eligible=(y[:,:val_start]>0).sum(axis=1)>=26
  assert val_start>=180
  ids=np.flatnonzero(eligible);yy=y[ids];ss={k:v[ids] for k,v in states.items()};val_o=[val_start-1+i*7 for i in range(4)];test_o=[test_start-1+i*7 for i in range(4)]
  assert max(val_o)+7<test_start and max(test_o)+7<len(dates)
  va=actual(yy,val_o);vp=forecast_all(yy,val_o,ss)
  selection_loss={k:float(np.abs(v.sum(axis=-1)-va.sum(axis=-1)).sum()) for k,v in vp.items()};chosen=min(candidates,key=lambda k:selection_loss[k])
  vq={w:quant_forecast(yy,val_o,w,qs) for w in weeks};q_losses={w:float(loss_q(vq[w][0],va.sum(axis=-1),qs).mean()) for w in weeks};qw=min(weeks,key=lambda w:q_losses[w])
  # Choices above are committed before computing fold test predictions or labels.
  ta=actual(yy,test_o);tp=forecast_all(yy,test_o,ss);tp['adaptive_past_validation']=tp[chosen];tq=quant_forecast(yy,test_o,qw,qs)
  fold_rec={'fold':fold+1,'validation_start':str(dates[val_start]),'validation_end':str(dates[test_start-1]),'test_start':start_date,'test_end':str(dates[test_start+27]),'training_eligibility_cutoff':str(dates[val_start-1]),'item_count':len(ids),'eligible_item_ids_sha256':hashlib.sha256('\n'.join(items[ids]).encode()).hexdigest(),'point_selected_from_past_validation':chosen,'validation_weekly_WAPE':{k:float(v/va.sum()) for k,v in selection_loss.items()},'quantile_window_weeks_selected':qw,'validation_quantile_mean_pinball':q_losses,'models':{k:metric(v,ta) for k,v in tp.items()},'quantiles':qmetric(*tq,ta,qs)}
  rates=(yy[:,:val_start]>0).mean(axis=1);trainvol=yy[:,:val_start].mean(axis=1);median=np.median(trainvol)
  groups={'sparse_lt25pct':rates<.25,'intermittent_25to50pct':(rates>=.25)&(rates<.5),'frequent_ge50pct':rates>=.5,'lower_half_training_volume':trainvol<=median,'upper_half_training_volume':trainvol>median}
  fold_rec['slices']={name:{'items':int(mask.sum()),'adaptive':metric(tp['adaptive_past_validation'][mask],ta[mask]),'mean28':metric(tp['mean_28'][mask],ta[mask])} for name,mask in groups.items() if mask.any()}
  reports.append(fold_rec);fold_catalogs.append(ids);records.append((ids,ta,tp))
  for k,v in tp.items():totals[k].append((v,ta))
  qtotals.append((tq,ta));print(json.dumps({'fold':fold+1,'items':len(ids),'selected':chosen,'adaptive_weekly_WAPE':fold_rec['models']['adaptive_past_validation']['weekly_WAPE'],'mean28_weekly_WAPE':fold_rec['models']['mean_28']['weekly_WAPE'],'q_weeks':qw}),flush=True)
 def combine(k):return metric(np.concatenate([x[0] for x in totals[k]],axis=0),np.concatenate([x[1] for x in totals[k]],axis=0))
 metrics={k:combine(k) for k in totals};pq=np.concatenate([x[0][0] for x in qtotals],axis=0);dq=np.concatenate([x[0][1] for x in qtotals],axis=0);aq=np.concatenate([x[1] for x in qtotals],axis=0)
 # Paired resampling preserves both each item's repeated presence across folds and fold clusters.
 comparisons={};rng=np.random.default_rng(config['seed']);union=np.unique(np.concatenate(fold_catalogs));fold_errors={}
 for baseline in ['mean_28','zero','seasonal_naive_7']:
  dif=np.zeros((len(y),8));den=np.zeros_like(dif);counts=np.zeros_like(dif)
  for j,(ids,aa,pp) in enumerate(records):
   dif[ids,j]=(np.abs(pp['adaptive_past_validation'].sum(-1)-aa.sum(-1))-np.abs(pp[baseline].sum(-1)-aa.sum(-1))).sum(-1);den[ids,j]=aa.sum((1,2));counts[ids,j]=4
  vals=[]
  for rep in range(400):
   sku=rng.choice(union,len(union),replace=True);folds=rng.integers(0,8,8);ix=np.ix_(sku,folds);d0=dif[ix].sum();a0=den[ix].sum();n0=counts[ix].sum();vals.append([d0/a0 if a0 else 0,d0/n0 if n0 else 0])
  comparisons[baseline]={'adaptive_minus_baseline_weekly_WAPE':float(dif.sum()/den.sum()),'weekly_WAPE_delta_95pct_interval':np.quantile(np.array(vals)[:,0],[.025,.975]).tolist(),'weekly_MAE_delta_95pct_interval':np.quantile(np.array(vals)[:,1],[.025,.975]).tolist(),'interpretation':'Descriptive paired two-way SKU/fold bootstrap; selection occurs within each fold past; previously exposed training data limits confirmation.'}
 # Small fixtures for exact Python/JS parity, no customer records.
 fixture=[]
 for j in [0,17,117]:
  idx=union[j];o=len(dates)-1;hp=y[idx:idx+1,:o+1];pred=forecast_all(hp,[o],{k:v[idx:idx+1] for k,v in states.items()});q,dq0=quant_forecast(hp,[o],12,qs)
  fixture.append({'item_id':'uci_sku_'+str(items[idx]),'history_units':hp[0].tolist(),'origin':str(dates[o]),'point_predictions':{k:v[0,0].tolist() for k,v in pred.items()},'weekly_quantiles_12weeks':q[0,0].tolist()})
 dump(ROOT/'artifacts/parity-fixtures.json',fixture)
 report={'schema_version':'dormathon.forecast-rolling-report.v1','status':'ok','evaluation_status':'EXPLORATORY_RETROSPECTIVE_ROLLING','scenarioDataMode':'EXTERNAL_BENCHMARK','generated_at':dt.datetime.now(dt.timezone.utc).isoformat(),'protocol_sha256':EXPECTED_PROTOCOL,'source_matrix_sha256':digest(DATA_PATH),'source':{'name':'UCI Online Retail II','url':'https://archive.ics.uci.edu/dataset/502/online+retail+ii','doi':'10.24432/C5CG6D','license':'CC BY 4.0','attribution':'Daqing Chen, UCI Machine Learning Repository','raw_file_sha256':'bcbe73b35f5b7babf197fb0cb983a11f5d9ff929078d4aa53d171b1f2df2e980'},'target':config['source_target'],'knowledge_mode':'retrospective_transaction_time_assumption','selection_unit':'global model across eligible SKU catalog per fold; no per-item test selection','frozen_protocol':config,'aggregate':metrics,'probabilistic_aggregate':qmetric(pq,dq,aq,qs),'paired_comparisons':comparisons,'folds':reports,'original_test_policy':config['old_test_policy'],'operational_promotion':False,'limitations':['Historical targets belonged to prior training periods; predeclared analysis is exploratory, not an untouched holdout.','Eight folds, one retailer, 2009–2011; no cross-company or MRDIY predictive validation.','Observed sales are a demand proxy and can be inventory-censored.','Transaction-time availability is assumed; historical ingestion timestamps unavailable.','Source completeness assumption permits zero recorded sales on calendar dates; does not establish latent demand.','No real inventory, arrivals, shortage outcomes, operational calibration or causal savings evidence.','Point selection minimizes seven-day absolute error; it need not yield an unbiased mean or optimal inventory decision.','Empirical intervals are evaluated, not guaranteed calibrated. Marginal daily quantiles are not jointly coherent demand trajectories.'],'resource':{'wall_seconds':round(time.monotonic()-start,3),'peak_rss_mb':round(resource.getrusage(resource.RUSAGE_SELF).ru_maxrss/1024,1),'cpu_threads':1,'GPU':False}}
 dump(ROOT/'artifacts/rolling-report.v1.json',report)
 print(json.dumps({'summary':metrics['adaptive_past_validation'],'comparisons':comparisons,'probabilistic':report['probabilistic_aggregate'],'resource':report['resource']}),flush=True)
if __name__=='__main__':
 parser=argparse.ArgumentParser(description='Reproduce the frozen exploratory rolling analysis; no original test evaluation.')
 parser.add_argument('--data',type=Path,required=True,help='Explicit local daily-sales.npz from attributed UCI profiling pipeline')
 parser.add_argument('--output',type=Path,required=True,help='New local output directory; do not overwrite approved evidence')
 args=parser.parse_args();DATA_PATH=args.data
 manifest=json.loads((PACKAGE_ROOT/'input-manifest.json').read_text())
 with np.load(DATA_PATH,allow_pickle=False) as supplied:
  assert set(supplied.files)==set(manifest['arrays']),'Input arrays differ from approved profiling output'
  for key,expected in manifest['arrays'].items():
   value=supplied[key]
   assert list(value.shape)==expected['shape'] and str(value.dtype)==expected['dtype'] and hashlib.sha256(value.tobytes()).hexdigest()==expected['sha256'],'Input content mismatch: '+key
 ROOT=args.output
 if (ROOT/'artifacts/rolling-report.v1.json').exists():raise SystemExit('Output report already exists; choose a new output directory')
 (ROOT/'artifacts').mkdir(parents=True,exist_ok=True)
 run()
