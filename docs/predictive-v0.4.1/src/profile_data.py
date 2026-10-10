"""Streaming UCI profiling. No customer-level output or external transmission."""
import argparse, collections, datetime as dt, hashlib, json, re, sqlite3, time, zipfile
from pathlib import Path
import numpy as np
from openpyxl import load_workbook
ROOT=Path(__file__).resolve().parents[1]
PRODUCT=re.compile(r'^\d{5}[A-Z]{0,2}$')
SOURCE='https://archive.ics.uci.edu/dataset/502/online+retail+ii'
def sha(path):
 h=hashlib.sha256()
 with open(path,'rb') as f:
  for x in iter(lambda:f.read(1024*1024),b''):h.update(x)
 return h.hexdigest()
def write(path,x):
 path.parent.mkdir(parents=True,exist_ok=True); tmp=path.with_suffix(path.suffix+'.tmp');tmp.write_text(json.dumps(x,indent=2,ensure_ascii=False));tmp.replace(path)
def profile(file):
 t=time.monotonic(); dbpath=ROOT/'data/derived/dedup.sqlite';dbpath.unlink(missing_ok=True)
 db=sqlite3.connect(dbpath);db.execute('pragma journal_mode=off');db.execute('pragma synchronous=off');db.execute('pragma cache_size=-8192');db.execute('create table seen(h blob primary key) without rowid')
 counts=collections.Counter(); sheets={}; sales=collections.defaultdict(float); retained=collections.defaultdict(float);returns=collections.defaultdict(float); globaldays=collections.Counter();validdays=collections.Counter();invoice_days={}; itemnames={}; missing=collections.Counter();minimum=None;maximum=None
 wb=load_workbook(file,read_only=True,data_only=True)
 for sheet in wb:
  rows=sheet.iter_rows(values_only=True);headers=list(next(rows));sc=collections.Counter();smin=None;smax=None
  for row in rows:
   counts['raw_rows']+=1;sc['raw_rows']+=1
   for h,v in zip(headers,row):
    if v is None:missing[h]+=1
   inv,sku,desc,q,when,price,cust,country=row
   inv=str(inv or '').strip().upper();sku=str(sku or '').strip().upper();desc=str(desc or '').strip()
   if isinstance(when,dt.datetime):
    date=when.date();globaldays[date.isoformat()]+=1;minimum=min(minimum,when) if minimum else when;maximum=max(maximum,when) if maximum else when;smin=min(smin,when) if smin else when;smax=max(smax,when) if smax else when
    if inv:
     old=invoice_days.get(inv);invoice_days[inv]=(min(old[0],date),max(old[1],date)) if old else (date,date)
   else:counts['invalid_timestamp']+=1;sc['invalid_timestamp']+=1;continue
   h=hashlib.sha256(repr(tuple(row)).encode()).digest();unique=db.execute('insert or ignore into seen values (?)',(h,)).rowcount==1
   if not unique:counts['exact_duplicate_rows']+=1;sc['exact_duplicate_rows']+=1
   try:q=float(q);price=float(price)
   except (TypeError,ValueError):counts['invalid_numeric']+=1;sc['invalid_numeric']+=1;continue
   if not np.isfinite(q) or not np.isfinite(price):counts['invalid_numeric']+=1;sc['invalid_numeric']+=1;continue
   product=bool(PRODUCT.fullmatch(sku))
   if not product:counts['non_product_code_rows']+=1;sc['non_product_code_rows']+=1
   if q<0:counts['negative_quantity_rows']+=1
   if inv.startswith('C'):counts['cancellation_invoice_rows']+=1
   if price<=0:counts['nonpositive_price_rows']+=1
   if q==0:counts['zero_quantity_rows']+=1
   if not desc:counts['missing_description_rows']+=1
   key=(sku,date.isoformat())
   if product and price>0 and (q<0 or inv.startswith('C')):
    if unique:returns[key]+=abs(q)
    counts['return_or_cancellation_rows']+=1;sc['return_or_cancellation_rows']+=1;continue
   if not product or price<=0 or q<=0 or not inv.isdigit():
    counts['excluded_other_rows']+=1;sc['excluded_other_rows']+=1;continue
   retained[key]+=q
   if not unique:continue
   sales[key]+=q;validdays[date.isoformat()]+=1;itemnames.setdefault(sku,desc or None);counts['positive_sales_rows']+=1;sc['positive_sales_rows']+=1
  db.commit();sheets[sheet.title]={'headers':headers,'counts':dict(sc),'min_timestamp':smin.isoformat() if smin else None,'max_timestamp':smax.isoformat() if smax else None};print('PROFILE_SHEET',sheet.title,dict(sc),flush=True)
 wb.close();db.close()
 start=minimum.date();last_complete=maximum.date()-dt.timedelta(days=1);dates=[(start+dt.timedelta(days=i)).isoformat() for i in range((last_complete-start).days+1)];items=sorted(itemnames);di={d:i for i,d in enumerate(dates)};ii={s:i for i,s in enumerate(items)}
 y=np.zeros((len(items),len(dates)),dtype=np.float32);r=np.zeros_like(y);dup=np.zeros_like(y)
 for pairs,arr in [(sales,y),(returns,r),(retained,dup)]:
  for (s,d),q in pairs.items():
   if s in ii and d in di:arr[ii[s],di[d]]=q
 gapdates=[d for d in dates if globaldays[d]==0];gaps=[]
 for d in gapdates:
  if gaps and (dt.date.fromisoformat(d)-dt.date.fromisoformat(gaps[-1][-1])).days==1:gaps[-1].append(d)
  else:gaps.append([d])
 n=len(dates);train_end=n-56;nonzero=(y[:,:train_end]>0).sum(axis=1);eligible=nonzero>=26
 spans=[{'invoice_id_hash':hashlib.sha256(k.encode()).hexdigest(),'first_date':a.isoformat(),'last_date':b.isoformat()} for k,(a,b) in invoice_days.items() if a!=b]
 split={'train_start':dates[0],'train_end':dates[train_end-1],'validation_start':dates[train_end],'validation_end':dates[n-29],'test_start':dates[n-28],'test_end':dates[-1],'train_calendar_days':train_end,'validation_calendar_days':28,'test_calendar_days':28,'horizon_days':7,'min_train_calendar_days':180,'min_train_nonzero_days':26,'eligible_item_count':int(eligible.sum()),'excluded_item_count':int((~eligible).sum()),'eligible_item_ids':[s for s,e in zip(items,eligible) if e],'selection_basis':'training only; zero-sales or historically inactive test series remain eligible; no test-based item selection','population':'known SKU, all countries aggregated within original single UK retailer','cold_start_established':False,'cross_company_established':False}
 split['configuration_sha256']=hashlib.sha256(json.dumps(split,sort_keys=True).encode()).hexdigest()
 cross=[]
 for sp in spans:
  if any(sp['first_date']<c<=sp['last_date'] for c in [split['validation_start'],split['test_start']]):cross.append(sp)
 profile={'schema_version':'dormathon.data-profile.v1','generated_at':dt.datetime.now(dt.timezone.utc).isoformat(),'source':{'url':SOURCE,'doi':'10.24432/C5CG6D','license':'CC BY 4.0','citation':'Chen, D. (2012). Online Retail II [Dataset]. UCI Machine Learning Repository. https://doi.org/10.24432/C5CG6D.','raw_file':file.name,'raw_file_bytes':file.stat().st_size,'raw_file_sha256':sha(file)},'sheets':sheets,'counts':dict(counts),'missing_fields':dict(missing),'coverage':{'min_timestamp':minimum.isoformat(),'max_timestamp':maximum.isoformat(),'first_calendar_day':start.isoformat(),'last_complete_calendar_day':last_complete.isoformat(),'trailing_excluded_day':maximum.date().isoformat(),'trailing_excluded_rows':globaldays[maximum.date().isoformat()],'calendar_days':len(dates),'ledger_transaction_free_days':gapdates,'consecutive_transaction_free_runs':gaps,'timezone':'unprovided naive local transaction time; calendar dates preserved, no invented UTC conversion','completeness_basis':'UCI publisher says all transactions over 2009-12-01 through 2011-12-09; source-declared retrospective complete ledger for interior covered calendar days, not audited real-time availability','zero_rule':'Missing SKU-date is zero recorded positive sales only within publisher-declared complete ledger. Whole-ledger zero dates are disclosed separately. Unknown dates supplied to engine remain null and block applicable forecasts.','first_day_basis':'Publisher names 2009-12-01 as coverage start; first transaction time alone does not imply an incomplete day.','last_day_basis':'Conservatively exclude maximum transaction calendar day because end-of-day completeness is unproven.'},'row_handling':{'positive_target':'unique exact source rows, numeric product StockCode with optional <=2-letter suffix, digit Invoice, quantity>0, Price>0; retain missing customer/description if other fields valid','exact_duplicates':'SHA256 over complete original row values, keep first globally across both sheets; no customer-level modeling or output','returns':'negative quantity or C invoice separate absolute-unit ledger; not positive target, net-sales sensitivity only','non_product':'exclude nonstandard product codes (postage, discounts, adjustments etc); no latent product mapping','outliers':'all qualifying positive quantities retained, no test-derived clipping','historical_discontinuation':'no post-training sales based removal; eligible catalog can include discontinued items; report zero-volume test slice'},'invoice_multi_date_groups':spans,'cross_split_invoice_groups':cross,'unavailable_fields':['actual inventory','stockouts/unmet demand','supplier delivery outcomes','lead time','procurement/setup/holding/shortage costs','historical acquired_at','late-arrival/version logs'],'label_availability':{'knowledge_mode':'retrospective_transaction_time_assumption','availability_basis':'transaction timestamps used as retrospective proxy; historical system-known/public-known replay not established','right_censoring':'last calendar day excluded; sales can be demand-censored by unknown stockouts'},'split':split,'runtime_seconds':round(time.monotonic()-t,3)}
 profile['exclusive_row_partition']={'positive_sales_unique':counts['positive_sales_rows'],'duplicate_positive_sales_excluded':counts['raw_rows']-counts['positive_sales_rows']-counts['return_or_cancellation_rows']-counts['excluded_other_rows']-counts['invalid_timestamp']-counts['invalid_numeric'],'return_or_cancellation_class_including_duplicates':counts['return_or_cancellation_rows'],'other_nonproduct_or_invalid_price_quantity_invoice':counts['excluded_other_rows'],'invalid_timestamp':counts['invalid_timestamp'],'invalid_numeric':counts['invalid_numeric']}
 assert sum(profile['exclusive_row_partition'].values())==counts['raw_rows']
 profile['quality_counter_note']='Raw missing/price/quantity/non-product/exact-duplicate counters overlap; exclusive_row_partition alone sums to raw rows. Returns and other rejected rows are classified before duplicate-positive exclusion.'
 profile['sheet_overlap']={'overlap_start':max(x['min_timestamp'][:10] for x in sheets.values()),'overlap_end':min(x['max_timestamp'][:10] for x in sheets.values()),'handling':'Globally exact-row dedup across both sheets; keep first source order, no duplicate split leakage. Invoice groups never span calendar dates in this workbook.','cross_sheet_duplicate_exact_count':'not separately measured from within-sheet duplicates; total exact duplicate count is verified'}
 profile['source']['download_url']='https://archive.ics.uci.edu/static/public/502/online+retail+ii.zip'
 profile['source']['source_url']=SOURCE
 archive=file.parent/'online_retail_ii.zip'
 profile['source']['archive_sha256']=sha(archive) if archive.exists() else None
 np.savez_compressed(ROOT/'data/derived/daily-sales.npz',sales=y,returns=r,with_duplicates=dup,dates=np.array(dates),items=np.array(items),eligible=eligible,ledger_day_observed=np.array([globaldays[d]>0 for d in dates]))
 write(ROOT/'artifacts/data-profile.v1.json',profile);write(ROOT/'artifacts/frozen-split.v1.json',split);print('PROFILE_COMPLETE',json.dumps({'rows':counts['raw_rows'],'eligible':int(eligible.sum()),'global_gap_days':len(gapdates),'split':split|{'eligible_item_ids':'omitted'},'runtime_seconds':profile['runtime_seconds']}),flush=True)
 return profile
if __name__=='__main__':
 p=argparse.ArgumentParser();p.add_argument('--file',type=Path,default=ROOT/'data/raw/online_retail_II.xlsx');a=p.parse_args();profile(a.file)
