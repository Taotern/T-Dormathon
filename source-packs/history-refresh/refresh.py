"""Explicit deterministic source refresh. No scheduler, server, credentials or automatic upload."""
from pathlib import Path
from datetime import datetime, timezone, timedelta
from email.utils import parsedate_to_datetime
from urllib.parse import urlencode, urlsplit
import argparse, hashlib, json, sqlite3, subprocess, signal, time, urllib.request, urllib.error, tempfile, os, sys

CODE = Path(__file__).resolve().parent
PROFILES = json.loads((CODE/'../../data/refresh-source-profiles.v0.19.json').read_text())
PROFILE_SHA = hashlib.sha256((CODE/'../../data/refresh-source-profiles.v0.19.json').read_bytes()).hexdigest()
JOBS = json.loads((CODE/'contracts/refresh-jobs.json').read_text())
SOURCES = {s['id']:s for s in PROFILES['sources']}

def now(): return datetime.now(timezone.utc).isoformat()
def sha(raw): return hashlib.sha256(raw).hexdigest()
def canon(value):
    result = subprocess.run(['node',str(CODE/'canonical.mjs')],input=json.dumps(value,ensure_ascii=False),capture_output=True,text=True,check=True,timeout=30)
    return json.loads(result.stdout)
def dump(path,value):
    path=Path(path);path.parent.mkdir(parents=True,exist_ok=True);temporary=path.with_suffix(path.suffix+'.tmp');temporary.write_text(json.dumps(value,ensure_ascii=False,indent=2)+'\n');temporary.replace(path)
def aware(value):
    d=datetime.fromisoformat(value.replace('Z','+00:00'))
    if d.tzinfo is None: raise ValueError('UTC-aware clock required')
    return d.astimezone(timezone.utc)

def window(job,stamp,start=None,end=None):
    day=aware(stamp).date();kind=job['kind']
    if job['mode']=='current':
        if kind in ['gdp','employment']:return '2020',str(day.year)
        if kind in ['fx','us']:return (day-timedelta(days=job['lookback_days'])).isoformat(),day.isoformat()
        if kind=='trade':return '2020-01-01',day.isoformat()
        if kind=='commodity':return '2020-01',day.strftime('%Y-%m')
        return None,None
    if not start or not end: raise ValueError('Archive jobs require explicit bounded start/end')
    if kind in ['gdp','employment']:
        if not (start.isdigit() and end.isdigit() and (1990 if kind=='gdp' else 1991)<=int(start)<=int(end)<=day.year and int(end)-int(start)<=4):raise ValueError('Annual archive requires at most five approved years')
    elif kind=='uk':
        if start!=end or not start.isdigit() or not 1988<=int(start)<=day.year:raise ValueError('UK archive requires one primary-act year')
    elif kind=='commodity':
        a=datetime.strptime(start,'%Y-%m');b=datetime.strptime(end,'%Y-%m')
        if start<'1990-01' or end>day.strftime('%Y-%m') or not 0<=(b.year-a.year)*12+b.month-a.month<60:raise ValueError('Commodity archive requires at most60 months')
    else:
        a=datetime.strptime(start,'%Y-%m-%d').date();b=datetime.strptime(end,'%Y-%m-%d').date()
        earliest={'fx':'2020-01-01','us':'1994-01-01','trade':'1990-01-01'}[kind];maximum={'fx':365,'us':6,'trade':1826}[kind]
        if start<earliest or b>day or not 0<=(b-a).days<=maximum:raise ValueError('Archive window outside approved bounds')
    return start,end

def routes(job,start,end):
    kind=job['kind'];out=[]
    if kind in ['gdp','employment']:
        indicator='NY.GDP.MKTP.CD' if kind=='gdp' else 'SL.UEM.TOTL.ZS'
        out.append(('metadata',f'https://api.worldbank.org/v2/indicator/{indicator}?format=json'))
        out.append(('data',f'https://api.worldbank.org/v2/country/all/indicator/{indicator}?source=2&date={start}:{end}&format=json&per_page=5000&page=1'))
    elif kind=='fx':out=[('data',f'https://data-api.ecb.europa.eu/service/data/EXR/D.USD+MYR.EUR.SP00.A?startPeriod={start}&endPeriod={end}&format=csvdata')]
    elif kind=='uk':out=[('data','https://www.legislation.gov.uk/new/data.feed' if job['mode']=='current' else f'https://www.legislation.gov.uk/ukpga/{start}/data.feed?results-count=100&sort=type')]
    elif kind=='us':
        fields=['document_number','title','type','publication_date','html_url','pdf_url','agencies','effective_on','comments_close_on','citation','cfr_references','docket_ids','regulation_id_numbers','action']
        for page in range(1,job['max_pages']+1):
            params=[('per_page','100'),('page',str(page)),('order','newest'),('conditions[publication_date][gte]',start),('conditions[publication_date][lte]',end)]+[('conditions[type][]',x)for x in ['RULE','PRORULE','NOTICE']]+[('fields[]',x)for x in fields]
            out.append(('data','https://www.federalregister.gov/api/v1/documents.json?'+urlencode(params)))
    else:out=[('data',SOURCES[job['source_id']]['endpoint'])]
    return out

class NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self,req,fp,code,msg,headers,newurl):raise urllib.error.HTTPError(req.full_url,code,'Redirect rejected',headers,fp)
def deadline(signum,frame):raise TimeoutError('Strict30-second source request deadline')

class Store:
    def __init__(self,root):
        self.root=Path(root).resolve();self.root.mkdir(parents=True,exist_ok=True)
        self.db=sqlite3.connect(self.root/'refresh.sqlite');self.db.row_factory=sqlite3.Row
        self.db.executescript('''CREATE TABLE IF NOT EXISTS versions(id TEXT PRIMARY KEY,source_id TEXT,upstream_id TEXT,content_hash TEXT,metadata_sha256 TEXT,metadata TEXT,acquisition_id TEXT);
CREATE TABLE IF NOT EXISTS items(source_id TEXT,upstream_id TEXT,version_id TEXT,first_seen_at TEXT,PRIMARY KEY(source_id,upstream_id));
CREATE TABLE IF NOT EXISTS runs(id TEXT PRIMARY KEY,receipt TEXT);
CREATE TABLE IF NOT EXISTS job_state(id TEXT PRIMARY KEY,last_good_at TEXT,last_attempt_at TEXT);
CREATE TABLE IF NOT EXISTS access(origin TEXT PRIMARY KEY,state TEXT);
CREATE TABLE IF NOT EXISTS responses(url TEXT PRIMARY KEY,path TEXT,raw_sha256 TEXT,headers TEXT,acquisition_id TEXT,fetched_at TEXT);''')
        self.db.commit()
    def run(self,r):
        dump(self.root/'receipts'/(r['id']+'.json'),r)
        self.db.execute('INSERT OR REPLACE INTO runs VALUES(?,?)',(r['id'],json.dumps(r,ensure_ascii=False)));self.db.commit()
    def lock(self,origin,state):
        self.db.execute('INSERT OR REPLACE INTO access VALUES(?,?)',(origin,json.dumps(state)));self.db.commit()
    def failure_guard(self,url,stamp):
        r=self.db.execute('SELECT state FROM access WHERE origin=?',(urlsplit(url).netloc,)).fetchone()
        if r:
            state=json.loads(r[0])
            if state.get('access_review_required'):return 'blocked_access',state
            if state.get('cooldown_until') and aware(state['cooldown_until'])>aware(stamp):return 'blocked_cooldown',state
        return None,None

def request(store,job,url,role,mode,stamp,fetcher=None):
    source=job['source_id'];start=now() if mode=='genuine_acquisition' else stamp
    r={'id':'racq_'+sha((source+'|'+url+'|'+start+'|'+os.urandom(8).hex()).encode())[:28],'source_id':source,'job_id':job['id'],'requested_url':url,'status':'failed','transport_mode':mode,'started_at':start,'completed_at':None,'fetched_at':None,'http_status':None,'bytes_read':0,'body_complete':False,'upstream_raw_sha256':None,'rows_changed':0,'no_change':False,'coverage':{'request_role':role,'outcome':'intent_recorded_not_completed','requested_window':job.get('requested_window'),'rows_parsed':0,'rows_changed':0,'truncated':False},'source_snapshot':{},'error':'Source response outcome not yet established'}
    blocked,state=store.failure_guard(url,stamp)
    if blocked:r.update(status=blocked,completed_at=start,error='Origin access/cooldown locked',coverage={**r['coverage'],'access_state':state});r['coverage']['outcome']='blocked_before_request' if r['status'].startswith('blocked_') else 'failed';store.run(r);return None,r
    store.run(r);cap=1048576 if job['kind'] in ['uk','us'] else 2097152
    cached=store.db.execute('SELECT * FROM responses WHERE url=?',(url,)).fetchone()
    headers={'User-Agent':JOBS['fetch_policy']['user_agent'],'Accept':'application/json,text/csv,application/atom+xml,application/zip,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'}
    if cached:
        prior_run=store.db.execute('SELECT receipt FROM runs WHERE id=?',(cached['acquisition_id'],)).fetchone()
        if not prior_run or json.loads(prior_run[0])['transport_mode']!=mode or json.loads(prior_run[0])['status'] not in ['succeeded','partial','no_change']:cached=None
    if cached:
        old=json.loads(cached['headers'])
        for key,target in [('ETag','If-None-Match'),('Last-Modified','If-Modified-Since')]:
            if old.get(key):headers[target]=old[key]
    try:
        if fetcher:
            code,body,response_headers=fetcher(job,url,role,headers)
            if code not in [200,304]:raise urllib.error.HTTPError(url,code,'Offline transport response',response_headers,None)
        else:
            previous=signal.signal(signal.SIGALRM,deadline);signal.setitimer(signal.ITIMER_REAL,30)
            try:
                with urllib.request.build_opener(NoRedirect()).open(urllib.request.Request(url,headers=headers),timeout=30) as response:
                    code=response.status;body=response.read(cap+1);response_headers={k:response.headers[k]for k in ['Date','Last-Modified','ETag','Content-Type','Retry-After']if k in response.headers}
            except urllib.error.HTTPError as e:
                if e.code==304:code,body,response_headers=304,b'',dict(e.headers)
                else:raise
            finally:signal.setitimer(signal.ITIMER_REAL,0);signal.signal(signal.SIGALRM,previous)
        if code==304:
            if not cached or not Path(cached['path']).exists() or sha(Path(cached['path']).read_bytes())!=cached['raw_sha256']:raise ValueError('304 without retained hash-verified prior body')
            r.update(status='no_change',http_status=304,completed_at=now(),no_change=True,error=None,source_snapshot={'prior_raw_sha256':cached['raw_sha256'],'prior_acquisition_id':cached['acquisition_id']},coverage={**r['coverage'],'conditional_not_modified':True});store.run(r)
            return {'path':cached['path'],'acquisition_id':cached['acquisition_id'],'fetched_at':cached['fetched_at']},r
        r.update(http_status=code,bytes_read=len(body),body_complete=len(body)<=cap)
        if code!=200 or len(body)>cap:raise ValueError('Unsupported HTTP response/body cap')
        digest=sha(body);path=store.root/'raw'/(digest+'.body');path.parent.mkdir(exist_ok=True);path.write_bytes(body)
        fetched=now() if mode=='genuine_acquisition' else stamp
        r.update(status='succeeded',completed_at=now(),fetched_at=fetched,upstream_raw_sha256=digest,error=None,coverage={**r['coverage'],'request_role':role,'outcome':'HTTP_body_retained_pending_normalization'})
        store.db.execute('INSERT OR REPLACE INTO responses VALUES(?,?,?,?,?,?)',(url,str(path),digest,json.dumps(response_headers),r['id'],fetched));store.db.commit();store.run(r)
        return {'path':str(path),'acquisition_id':r['id'],'fetched_at':fetched},r
    except urllib.error.HTTPError as e:
        rate_stamp=now() if mode=='genuine_acquisition' else stamp
        r.update(status='failed',http_status=e.code,completed_at=now(),error=str(e),coverage={**r['coverage'],'retry_after':e.headers.get('Retry-After') if e.headers else None})
        if e.code in [401,402,403]:store.lock(urlsplit(url).netloc,{'access_review_required':True,'http_status':e.code,'target':url,'recorded_at':start})
        elif e.code==429:
            value=e.headers.get('Retry-After') if e.headers else None;until=aware(rate_stamp)+timedelta(hours=1);basis='Local conservative1h; no valid provider RetryAfter'
            if value:
                try:until=aware(rate_stamp)+timedelta(seconds=int(value)) if value.isdigit() else parsedate_to_datetime(value);until=until.replace(tzinfo=timezone.utc) if until.tzinfo is None else until;basis='Actual providerRetryAfter'
                except (ValueError,TypeError,OverflowError):pass
            store.lock(urlsplit(url).netloc,{'access_review_required':False,'cooldown_until':until.isoformat(),'retry_after':value,'basis':basis,'target':url})
        elif e.code>=500:store.lock(urlsplit(url).netloc,{'cooldown_until':(aware(stamp)+timedelta(minutes=30)).isoformat(),'basis':'Local transient-failure backoff','target':url})
    except Exception as e:
        r.update(status='failed',completed_at=now(),error=str(e))
        store.lock(urlsplit(url).netloc,{'cooldown_until':(aware(stamp)+timedelta(minutes=30)).isoformat(),'basis':'Local transport/schema/body-failure backoff','target':url})
    r['coverage']['outcome']='blocked_before_request' if r['status'].startswith('blocked_') else 'failed';store.run(r);return None,r

def project(store,job,response,start,end,metadata_path=None):
    path=response['path'];config={'source_id':job['source_id'],'data_path':path,'metadata_path':metadata_path,'start':start,'end':end,'fetched_at':response['fetched_at'],'requested_url':response['url']}
    if job['kind']=='uk' and job['mode']=='archive':config['instrument_year']=int(start)
    with tempfile.TemporaryDirectory(prefix='dormathon-refresh-parse-')as folder:
        folder=Path(folder)
        if job['kind'] in ['trade','commodity']:
            parsed=folder/'safe.json';subprocess.run([sys.executable,str(CODE/'binary_extract.py'),job['kind'],'--input',path,'--output',str(parsed),'--start',start,'--end',end],check=True,capture_output=True,text=True,timeout=30);config['data_path']=str(parsed)
        dump(folder/'config.json',config);result=subprocess.run(['node',str(CODE/'project.mjs'),str(folder/'config.json'),str(folder/'result.json')],check=True,capture_output=True,text=True,timeout=30)
        return json.loads((folder/'result.json').read_text())

def run_job(store,job,stamp,mode,max_requests,fetcher=None,start=None,end=None):
    start,end=window(job,stamp,start,end);job={**job,'requested_window':{'start':start,'end':end,'grain':{'gdp':'year','employment':'year','fx':'day','us':'day','uk':'instrument_year' if job['mode']=='archive' else 'rolling_feed','trade':'source_date_cell','commodity':'month'}[job['kind']]}};key=job['id'] if job['mode']=='current' else job['id']+'|'+str(start)+'|'+str(end)
    old=store.db.execute('SELECT * FROM job_state WHERE id=?',(key,)).fetchone()
    if old and old['last_good_at'] and (aware(stamp).date()-aware(old['last_good_at']).date()).days<job['cadence_days']:return {'job_id':job['id'],'status':'skipped_not_due','requests':0}
    store.db.execute('INSERT INTO job_state VALUES(?,NULL,?) ON CONFLICT(id) DO UPDATE SET last_attempt_at=excluded.last_attempt_at',(key,stamp));store.db.commit()
    values=[];changed_by_run={};used=0;metadata_path=None;metadata_id=None;runs=[];coverage=[];seen={};failed=False
    for role,url in routes(job,start,end):
        if used>=max_requests:break
        if mode=='genuine_acquisition':
            origin=urlsplit(url).netloc;last=store.db.execute('SELECT receipt FROM runs ORDER BY rowid DESC').fetchall()
            latest=next((json.loads(x[0]).get('completed_at') for x in last if urlsplit(json.loads(x[0])['requested_url']).netloc==origin and json.loads(x[0]).get('completed_at')),None)
            if latest:
                delay=5-(datetime.now(timezone.utc)-aware(latest)).total_seconds()
                if delay>0:time.sleep(min(delay,5))
        response,r=request(store,job,url,role,mode,stamp,fetcher);used+=0 if r['status'].startswith('blocked_') else 1;runs.append(r)
        if response is None:failed=True;break
        if role=='metadata':metadata_path=response['path'];metadata_id=response['acquisition_id'];continue
        response['url']=url
        try:
            parsed=project(store,job,response,start,end,metadata_path)
            coverage.append(parsed['coverage']);
            if metadata_id:parsed['source_snapshot']['metadata_witness_id']=metadata_id
            for item in parsed['records']:
                if item['upstream_id'] in seen and seen[item['upstream_id']]['content_hash']!=item['content_hash']:raise ValueError('Conflicting duplicate across source pages; last-good preserved')
                item['acquisition_id']=response['acquisition_id'];seen[item['upstream_id']]=item
            witness=store.db.execute('SELECT receipt FROM runs WHERE id=?',(response['acquisition_id'],)).fetchone()
            if witness and r['http_status']!=304:
                r['source_snapshot']=parsed['source_snapshot'];r['coverage']={**parsed['coverage'],'request_role':role,'requested_window':job['requested_window'],'rows_parsed':len(parsed['records']),'rows_changed':0,'truncated':bool(parsed['coverage'].get('truncated'))};store.run(r)
            if job['kind']=='us' and not parsed['coverage'].get('has_next_page'):break
        except Exception as e:
            r.update(status='failed',error='Source normalization rejected: '+str(e)[:1000],rows_changed=0,no_change=False);store.run(r);failed=True;break
    if not failed:
        for item in seen.values():
            current=store.db.execute('SELECT version_id FROM items WHERE source_id=? AND upstream_id=?',(item['source_id'],item['upstream_id'])).fetchone()
            prior=store.db.execute('SELECT id FROM versions WHERE id=?',(item['version_id'],)).fetchone()
            if current and prior and current['version_id']!=item['version_id']:
                failed=True
                for receipt in runs:
                    if receipt['coverage'].get('request_role')=='data':
                        receipt.update(status='failed',error='Hash reversion requires a separately versioned observation/current-pointer contract; prior current record preserved',rows_changed=0,no_change=False);store.run(receipt)
                break
    parsed_data=bool(coverage)
    budget_partial=not failed and not parsed_data
    if not failed and parsed_data:
        with store.db:
            for item in seen.values():
                old=store.db.execute('SELECT * FROM items WHERE source_id=? AND upstream_id=?',(item['source_id'],item['upstream_id'])).fetchone()
                if old and old['version_id']==item['version_id']:continue
                if old:
                    item['metadata']['first_seen_at']=old['first_seen_at'];item['metadata_sha256']=canon(item['metadata'])['sha256']
                changed_by_run[item['acquisition_id']]=changed_by_run.get(item['acquisition_id'],0)+1
                existing=store.db.execute('SELECT * FROM versions WHERE id=?',(item['version_id'],)).fetchone()
                if existing:
                    item['metadata']=json.loads(existing['metadata']);item['metadata_sha256']=existing['metadata_sha256'];item['acquisition_id']=existing['acquisition_id']
                store.db.execute('INSERT OR IGNORE INTO versions VALUES(?,?,?,?,?,?,?)',(item['version_id'],item['source_id'],item['upstream_id'],item['content_hash'],item['metadata_sha256'],json.dumps(item['metadata'],ensure_ascii=False),item['acquisition_id']))
                store.db.execute('INSERT INTO items VALUES(?,?,?,?) ON CONFLICT(source_id,upstream_id) DO UPDATE SET version_id=excluded.version_id',(item['source_id'],item['upstream_id'],item['version_id'],item['metadata']['first_seen_at']));values.append(item)
            store.db.execute('UPDATE job_state SET last_good_at=? WHERE id=?',(stamp,key))
        for r in runs:
            if r['http_status']==200:
                r['rows_changed']=changed_by_run.get(r['id'],0);r['no_change']=r['rows_changed']==0;r['coverage']['rows_changed']=r['rows_changed'];r['status']='partial' if r['coverage'].get('truncated') else 'succeeded' if r['rows_changed'] else 'no_change';store.run(r)
    return {'job_id':job['id'],'status':'failed' if failed else 'partial' if budget_partial or any(c.get('truncated') for c in coverage) else 'updated' if values else 'no_change','requests':used,'records':values,'run_ids':[r['id']for r in runs],'coverage':coverage,'last_good_preserved_on_failure':failed}

def export_parts(store,result,mode,stamp):
    stamp=now()
    records=[r for j in result for r in j.get('records',[])];run_ids={r for j in result for r in j.get('run_ids',[])}|{r['acquisition_id']for r in records};run_by_id={r:json.loads(store.db.execute('SELECT receipt FROM runs WHERE id=?',(r,)).fetchone()[0])for r in run_ids};coverage=[{k:v for k,v in j.items()if k not in ['records','run_ids']}for j in result]
    if any(r['completed_at'] is None or aware(r['completed_at'])>aware(stamp) for r in run_by_id.values()):raise ValueError('No export before every referenced run is terminal')
    parts=[];pending=[]
    def body(rows,ids,index):
        return {'producer':{'name':'Dormathon deterministic history refresh','version':'0.19.0','execution_mode':'foreground_explicit'},'profile_id':PROFILES['profile_id'],'profile_sha256':PROFILE_SHA,'parser_version':PROFILES['parser_version'],'transport_mode':mode,'exported_at':stamp,'part_id':'rpart_'+sha((stamp+'|'+str(index)).encode())[:28],'records':rows,'runs':[run_by_id[r]for r in sorted(ids)],'coverage':coverage}
    def flush():
        if not pending:return
        ids={r['acquisition_id']for r in pending};ids|={run_by_id[r]['source_snapshot']['metadata_witness_id']for r in list(ids)if run_by_id[r]['source_snapshot'].get('metadata_witness_id')};payload=body(pending,ids,len(parts));c=canon(payload);envelope={'schema_version':'dormathon.source-refresh.snapshot.v1','payload':payload,'payload_sha256':c['sha256']};encoded=canon(envelope)['canonical'].encode();
        if len(encoded)+1>262144 or len(ids)>16:raise ValueError('Snapshot part/witness cap')
        path=store.root/'exports'/('part-'+str(len(parts)).zfill(4)+'.json');path.parent.mkdir(exist_ok=True);path.write_bytes(encoded+b'\n');parts.append({'path':str(path),'sha256':sha(path.read_bytes()),'records':len(pending)});pending.clear()
    for row in records:
        proposed=pending+[row];ids={r['acquisition_id']for r in proposed};ids|={run_by_id[r]['source_snapshot']['metadata_witness_id']for r in list(ids)if run_by_id[r]['source_snapshot'].get('metadata_witness_id')};payload=body(proposed,ids,len(parts));estimated=len(json.dumps({'schema_version':'dormathon.source-refresh.snapshot.v1','payload':payload,'payload_sha256':'0'*64},ensure_ascii=False,separators=(',',':')).encode())+8192
        if pending and (len(proposed)>100 or estimated>262144 or len(ids)>16):flush()
        pending.append(row)
    flush()
    # Include successful checks/failures even when no normalized row changed.
    remaining=sorted(run_ids-{r['acquisition_id']for r in records})
    for offset in range(0,len(remaining),16):
        payload=body([],set(remaining[offset:offset+16]),len(parts));c=canon(payload);envelope={'schema_version':'dormathon.source-refresh.snapshot.v1','payload':payload,'payload_sha256':c['sha256']};encoded=canon(envelope)['canonical'].encode()+b'\n'
        if len(encoded)>262144:raise ValueError('Receipt-only snapshot cap')
        path=store.root/'exports'/('part-'+str(len(parts)).zfill(4)+'.json');path.parent.mkdir(exist_ok=True);path.write_bytes(encoded);parts.append({'path':str(path),'sha256':sha(encoded),'records':0})
    return parts

def main():
    parser=argparse.ArgumentParser(description=__doc__);sub=parser.add_subparsers(dest='command',required=True);sub.add_parser('plan');run=sub.add_parser('run');run.add_argument('--state-dir',required=True);run.add_argument('--job',action='append',default=[]);run.add_argument('--mode',choices=['current','archive'],default='current');run.add_argument('--start');run.add_argument('--end');run.add_argument('--acquire',action='store_true');run.add_argument('--max-requests',type=int,default=12);args=parser.parse_args()
    if args.command=='plan':print(json.dumps(JOBS,indent=2));return
    if not args.acquire:raise SystemExit('Use offline tests/replay first; --acquire explicitly enables only the fixed public source requests')
    if not hasattr(signal,'setitimer') or os.name!='posix':raise SystemExit('Verified POSIX deadline/lock runtime required; Windows remains blocked before any request')
    if not 1<=args.max_requests<=12:raise SystemExit('Request budget must be1..12')
    import fcntl
    store=Store(args.state_dir);lock=(store.root/'run.lock').open('a')
    try:fcntl.flock(lock,fcntl.LOCK_EX|fcntl.LOCK_NB)
    except BlockingIOError:raise SystemExit('Another foreground refresh owns this state directory; no request made')
    selected=[j for j in JOBS['jobs']if j['mode']==args.mode and (not args.job and args.mode=='current' or j['id']in args.job)]
    if not selected or args.job and set(args.job)!={j['id']for j in selected}:raise SystemExit('Select known same-mode jobs; archive is explicit')
    stamp=now();result=[];remaining=args.max_requests
    for job in selected:
        if remaining<=0:result.append({'job_id':job['id'],'status':'skipped_budget','requests':0});continue
        r=run_job(store,job,stamp,'genuine_acquisition',remaining,start=args.start,end=args.end);remaining-=r['requests'];result.append(r)
    parts=export_parts(store,result,'genuine_acquisition',now());report={'schema_version':'dormathon.refresh-run-report.v0.19','completed_at':now(),'mode':'foreground_explicit','transport_mode':'genuine_acquisition','provider_requests':args.max_requests-remaining,'jobs':[{k:v for k,v in j.items()if k not in ['records','run_ids']}for j in result],'snapshot_parts':parts,'automatic_upload':False,'scheduler_created':False};dump(store.root/'reports/latest-run.json',report);print(json.dumps(report,ensure_ascii=False));
    if any(j['status']=='failed'for j in result):raise SystemExit(1)

if __name__=='__main__':main()
