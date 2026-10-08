"""One fixed ECB CSV schema probe and at most one separately invoked backfill. No redirects/retries."""
from pathlib import Path
from datetime import datetime,timezone
import argparse,csv,hashlib,io,json,signal,time,urllib.request,urllib.error,os
ROOT=Path(os.environ.get('DORMATHON_HISTORY_DATA_DIR',Path(__file__).resolve().parent)).resolve()
URLS={'probe':'https://data-api.ecb.europa.eu/service/data/EXR/D.USD+MYR.EUR.SP00.A?lastNObservations=2&format=csvdata',
      'backfill':'https://data-api.ecb.europa.eu/service/data/EXR/D.USD+MYR.EUR.SP00.A?startPeriod=2020-01-01&endPeriod=2026-10-08&format=csvdata'}
HEADERS={'User-Agent':'DormathonSourceResearch/0.1 (+public-metadata-test)','Accept':'text/csv'}
class NoRedirect(urllib.request.HTTPRedirectHandler):
 def redirect_request(self,req,fp,code,msg,headers,newurl):raise urllib.error.HTTPError(req.full_url,code,'Redirect rejected',headers,fp)
def now():return datetime.now(timezone.utc).isoformat()
def deadline(signum,frame):raise TimeoutError('Strict30-second overall acquisition deadline')
def acquire(scope):
 (ROOT/'receipts').mkdir(parents=True,exist_ok=True);(ROOT/'source-data').mkdir(parents=True,exist_ok=True)
 p=ROOT/'receipts'/f'ecb_fx_{scope}.json'
 if p.exists():print(json.dumps({'scope':scope,'status':'existing_attempt_readback'}));return
 if scope=='backfill':
  prior=json.loads((ROOT/'reports/probe-schema-review.json').read_text())
  if prior.get('status')!='passed':raise SystemExit('No backfill without an explicit passing source/unit/rights probe review')
 cap=262144 if scope=='probe' else 2097152
 r={'schema_version':'dormathon.fx-acquisition.v0.13','scope':scope,'requested_url':URLS[scope],'started_at':now(),'attempts':1,'authentication':'none','headers':HEADERS,'status':'attempt_recorded','redirect_policy':'reject','body_cap':cap,'strict_overall_deadline_seconds':30,'recurring_operational':False}
 p.write_text(json.dumps(r,indent=2)+'\n');began=time.monotonic();previous=signal.signal(signal.SIGALRM,deadline);signal.setitimer(signal.ITIMER_REAL,30)
 try:
  with urllib.request.build_opener(NoRedirect()).open(urllib.request.Request(URLS[scope],headers=HEADERS),timeout=30) as response:
   body=response.read(cap+1);r.update(http_status=response.status,bytes_read=len(body),body_complete=len(body)<=cap,response_headers={k:response.headers[k] for k in ['Date','Last-Modified','ETag','Content-Type','Retry-After'] if k in response.headers},upstream_raw_sha256=hashlib.sha256(body).hexdigest() if len(body)<=cap else None)
   if len(body)>cap:r['status']='body_cap_exceeded'
   else:
    text=body.decode('utf-8-sig')
    if text.lstrip().startswith(('<','{','[')):raise ValueError('Expected CSV source response, not HTML/error envelope')
    reader=csv.DictReader(io.StringIO(text));rows=list(reader)
    if not reader.fieldnames or 'TIME_PERIOD' not in reader.fieldnames or 'OBS_VALUE' not in reader.fieldnames:raise ValueError('Recognized ECB date/value CSV columns missing')
    out=ROOT/'source-data'/f'ecb_fx_{scope}.csv';out.write_bytes(body);r.update(status='retrieved_pending_schema_validation',fetched_at=now(),retained_path=str(out.relative_to(ROOT)),retained_sha256=hashlib.sha256(body).hexdigest(),returned_rows=len(rows),column_names=reader.fieldnames)
 except urllib.error.HTTPError as error:r.update(http_status=error.code,status='rate_limited' if error.code==429 else'access_or_http_failed',error=str(error),automatic_retry=False,retry_after=error.headers.get('Retry-After'),access_review_required=error.code in[401,402,403],upstream_raw_sha256=None)
 except Exception as error:r.update(status='transport_or_schema_failed',error=str(error),automatic_retry=False)
 finally:signal.setitimer(signal.ITIMER_REAL,0);signal.signal(signal.SIGALRM,previous)
 r.update(completed_at=now(),elapsed_seconds=round(time.monotonic()-began,3));p.write_text(json.dumps(r,indent=2)+'\n');print(json.dumps({k:r.get(k) for k in ['scope','http_status','status','bytes_read','returned_rows','elapsed_seconds','upstream_raw_sha256']}))
if __name__=='__main__':
 parser=argparse.ArgumentParser();parser.add_argument('scope',choices=['probe','backfill']);args=parser.parse_args();acquire(args.scope)
