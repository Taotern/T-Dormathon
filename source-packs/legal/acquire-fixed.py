"""Four immutable, separately invoked official legal metadata reads. No redirects/retries."""
from pathlib import Path
from datetime import datetime, timezone
import argparse, hashlib, json, signal, time, urllib.request, urllib.error, os
from urllib.parse import urlencode
ROOT=Path(os.environ.get('DORMATHON_LEGAL_DATA_DIR',Path(__file__).resolve().parent)).resolve()
FIELDS=['document_number','title','type','publication_date','html_url','pdf_url','abstract','agencies','effective_on','comments_close_on','citation','cfr_references','docket_ids','regulation_id_numbers','action']
def us_url(start,end):
 params=[('per_page','100'),('page','1'),('order','newest'),('conditions[publication_date][gte]',start),('conditions[publication_date][lte]',end)]
 params += [('conditions[type][]',v) for v in ['RULE','PRORULE','NOTICE']]
 params += [('fields[]',v) for v in FIELDS]
 return 'https://www.federalregister.gov/api/v1/documents.json?'+urlencode(params)
URLS={'uk_recent':'https://www.legislation.gov.uk/new/data.feed',
 'uk_2020':'https://www.legislation.gov.uk/ukpga/2020/data.feed?results-count=100&sort=type',
 'us_recent':us_url('2026-10-01','2026-10-08'),
 'us_2020':us_url('2020-01-01','2020-01-07')}
HEADERS={'User-Agent':'DormathonSourceResearch/0.1 (+public-metadata-test)','Accept':'application/atom+xml, application/json'}
class NoRedirect(urllib.request.HTTPRedirectHandler):
 def redirect_request(self,req,fp,code,msg,headers,newurl):raise urllib.error.HTTPError(req.full_url,code,'Redirect rejected',headers,fp)
def now():return datetime.now(timezone.utc).isoformat()
def deadline(signum,frame):raise TimeoutError('Strict 30-second overall acquisition deadline')
def acquire(scope):
 (ROOT/'receipts').mkdir(parents=True,exist_ok=True);(ROOT/'source-data').mkdir(parents=True,exist_ok=True)
 p=ROOT/'receipts'/f'{scope}.json'
 if p.exists():
  prior=json.loads(p.read_text());print(json.dumps({'scope':scope,'status':'existing_attempt_readback','original_status':prior['status']}));return
 # Access denials pause the same provider; no automatic alternate route or retry.
 family=scope.split('_',1)[0]
 for f in (ROOT/'receipts').glob(family+'_*.json'):
  prior=json.loads(f.read_text())
  if prior.get('access_review_required')or prior.get('status')=='rate_limited':raise SystemExit('Provider access/rate state requires review before further acquisition')
 # The official UK robots policy supplies a five-second crawl delay.
 if scope.startswith('uk_'):
  for f in (ROOT/'receipts').glob('uk_*.json'):
   r=json.loads(f.read_text())
   if r.get('access_review_required'):raise SystemExit('UK origin access is paused; no alternate route or retry')
   stamp=r.get('completed_at')
   if stamp:
    left=5-(datetime.now(timezone.utc)-datetime.fromisoformat(stamp)).total_seconds()
    if left>0:time.sleep(left)
 cap=1048576
 r={'schema_version':'dormathon.legal-acquisition.v0.16','scope':scope,'requested_url':URLS[scope],'started_at':now(),'attempts':1,'authentication':'none','headers':HEADERS,'status':'attempt_recorded','redirect_policy':'reject','body_cap':cap,'strict_overall_deadline_seconds':30,'recurring_operational':False}
 p.write_text(json.dumps(r,indent=2)+'\n');began=time.monotonic();previous=signal.signal(signal.SIGALRM,deadline);signal.setitimer(signal.ITIMER_REAL,30)
 try:
  with urllib.request.build_opener(NoRedirect()).open(urllib.request.Request(URLS[scope],headers=HEADERS),timeout=30) as response:
   body=response.read(cap+1);complete=len(body)<=cap
   r.update(http_status=response.status,bytes_read=len(body),body_complete=complete,response_headers={k:response.headers[k] for k in ['Date','Last-Modified','ETag','Content-Type','Retry-After'] if k in response.headers},upstream_raw_sha256=hashlib.sha256(body).hexdigest() if complete else None)
   if not complete:r['status']='body_cap_exceeded'
   else:
    out=ROOT/'source-data'/f'{scope}.{"xml" if scope.startswith("uk_") else "json"}';out.write_bytes(body)
    r.update(status='retrieved_pending_schema_validation',fetched_at=now(),retained_path=str(out.relative_to(ROOT)),retained_sha256=hashlib.sha256(body).hexdigest())
 except urllib.error.HTTPError as error:
  r.update(http_status=error.code,status='rate_limited' if error.code==429 else 'redirect_rejected' if 300<=error.code<400 else 'access_or_http_failed',error=str(error),automatic_retry=False,retry_after=error.headers.get('Retry-After'),access_review_required=error.code in [401,402,403],upstream_raw_sha256=None)
 except Exception as error:r.update(status='transport_failed',error=str(error),automatic_retry=False)
 finally:signal.setitimer(signal.ITIMER_REAL,0);signal.signal(signal.SIGALRM,previous)
 r.update(completed_at=now(),elapsed_seconds=round(time.monotonic()-began,3));p.write_text(json.dumps(r,indent=2)+'\n');print(json.dumps({k:r.get(k) for k in ['scope','http_status','status','bytes_read','elapsed_seconds','upstream_raw_sha256','retry_after']}))
if __name__=='__main__':
 parser=argparse.ArgumentParser();parser.add_argument('scope',choices=URLS);args=parser.parse_args();acquire(args.scope)
