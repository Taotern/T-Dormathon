"""Two fixed official TTBD files, for bounded license/schema verification. No retries."""
from pathlib import Path
from datetime import datetime, timezone
import argparse,hashlib,json,signal,time,urllib.request,urllib.error,os
ROOT=Path(os.environ.get('DORMATHON_TRADE_DATA_DIR',Path(__file__).resolve().parent)).resolve()
URLS={
 'codebook':'https://thedocs.worldbank.org/en/doc/5b520d51bc417fb529eab93d26c1175c-0430012021/related/TTBD-Variable-Descriptions.xls',
 'safeguards':'https://thedocs.worldbank.org/en/doc/1b03ee05a4a6d2374c126196ddf0a128-0430012025/related/Global-safeguard-measures.zip'
}
HEADERS={'User-Agent':'DormathonSourceResearch/0.1 (+public-metadata-test)','Accept':'application/zip, application/vnd.ms-excel'}
class NoRedirect(urllib.request.HTTPRedirectHandler):
 def redirect_request(self,req,fp,code,msg,headers,newurl):raise urllib.error.HTTPError(req.full_url,code,'Redirect rejected',headers,fp)
def now():return datetime.now(timezone.utc).isoformat()
def deadline(signum,frame):raise TimeoutError('Strict30-second overall deadline')
def acquire(scope):
 (ROOT/'receipts').mkdir(parents=True,exist_ok=True);(ROOT/'source-data').mkdir(parents=True,exist_ok=True);p=ROOT/'receipts'/f'{scope}.json'
 if p.exists():
  old=json.loads(p.read_text());print(json.dumps({'scope':scope,'status':'existing_attempt_readback','original_status':old['status']}));return
 for f in (ROOT/'receipts').glob('*.json'):
  old=json.loads(f.read_text())
  if old.get('access_review_required')or old.get('status')=='rate_limited':raise SystemExit('Provider access/rate state requires review before another request')
 cap=2097152;start=time.monotonic();r={'schema_version':'dormathon.trade-remedy-acquisition.v0.17','scope':scope,'requested_url':URLS[scope],'started_at':now(),'status':'attempt_recorded','attempts':1,'headers':HEADERS,'authentication':'none','redirect_policy':'reject','body_cap':cap,'strict_overall_deadline_seconds':30,'purpose':'Current official asset/license/schema verification; no product activation inferred','recurring_operational':False};p.write_text(json.dumps(r,indent=2)+'\n')
 prior=signal.signal(signal.SIGALRM,deadline);signal.setitimer(signal.ITIMER_REAL,30)
 try:
  with urllib.request.build_opener(NoRedirect()).open(urllib.request.Request(URLS[scope],headers=HEADERS),timeout=30)as response:
   body=response.read(cap+1);complete=len(body)<=cap;r.update(http_status=response.status,bytes_read=len(body),body_complete=complete,response_headers={k:response.headers[k]for k in ['Date','Last-Modified','ETag','Content-Type','Retry-After']if k in response.headers},upstream_raw_sha256=hashlib.sha256(body).hexdigest()if complete else None)
   if complete:
    out=ROOT/'source-data'/(scope+('.xls'if scope=='codebook'else'.zip'));out.write_bytes(body);r.update(status='retrieved_pending_license_and_schema_validation',fetched_at=now(),retained_path=str(out.relative_to(ROOT)),retained_sha256=hashlib.sha256(body).hexdigest())
   else:r.update(status='body_cap_exceeded',automatic_retry=False)
 except urllib.error.HTTPError as e:r.update(http_status=e.code,status='rate_limited'if e.code==429 else'redirect_rejected'if 300<=e.code<400 else'access_or_http_failed',error=str(e),retry_after=e.headers.get('Retry-After'),access_review_required=e.code in[401,402,403],automatic_retry=False,upstream_raw_sha256=None)
 except Exception as e:r.update(status='transport_failed',error=str(e),automatic_retry=False)
 finally:signal.setitimer(signal.ITIMER_REAL,0);signal.signal(signal.SIGALRM,prior)
 r.update(completed_at=now(),elapsed_seconds=round(time.monotonic()-start,3));p.write_text(json.dumps(r,indent=2)+'\n');print(json.dumps({k:r.get(k)for k in['scope','http_status','status','bytes_read','elapsed_seconds','upstream_raw_sha256','retry_after']}))
if __name__=='__main__':
 p=argparse.ArgumentParser();p.add_argument('scope',choices=URLS);a=p.parse_args();acquire(a.scope)
