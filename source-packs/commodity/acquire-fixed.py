"""One official historical monthly workbook plus current source PDF; fixed bounded reads."""
from pathlib import Path
from datetime import datetime,timezone
import argparse,hashlib,json,signal,time,urllib.request,urllib.error,os
ROOT=Path(os.environ.get('DORMATHON_COMMODITY_DATA_DIR',Path(__file__).resolve().parent)).resolve()
BASE='https://thedocs.worldbank.org/en/doc/74e8be41ceb20fa0da750cda2f6b9e4e-0050012026/related/'
URLS={'monthly':BASE+'CMO-Historical-Data-Monthly.xlsx','definitions':BASE+'CMO-Pink-Sheet-October-2026.pdf'}
HEADERS={'User-Agent':'DormathonSourceResearch/0.1 (+public-metadata-test)','Accept':'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/pdf'}
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
  if old.get('access_review_required')or old.get('status')=='rate_limited':raise SystemExit('Provider access/rate state requires review')
 cap=2097152 if scope == 'monthly' else 1048576;start=time.monotonic();r={'schema_version':'dormathon.commodity-acquisition.v0.18','scope':scope,'requested_url':URLS[scope],'started_at':now(),'status':'attempt_recorded','attempts':1,'headers':HEADERS,'authentication':'none','redirect_policy':'reject','body_cap':cap,'strict_overall_deadline_seconds':30,'purpose':'Historical monthly nominal data and source definitions; forecasts/real-index assets excluded','recurring_operational':False};p.write_text(json.dumps(r,indent=2)+'\n')
 prior=signal.signal(signal.SIGALRM,deadline);signal.setitimer(signal.ITIMER_REAL,30)
 try:
  with urllib.request.build_opener(NoRedirect()).open(urllib.request.Request(URLS[scope],headers=HEADERS),timeout=30)as response:
   body=response.read(cap+1);complete=len(body)<=cap;r.update(http_status=response.status,bytes_read=len(body),body_complete=complete,response_headers={k:response.headers[k]for k in ['Date','Last-Modified','ETag','Content-Type','Retry-After']if k in response.headers},upstream_raw_sha256=hashlib.sha256(body).hexdigest()if complete else None)
   if complete:
    out=ROOT/'source-data'/(scope+('.xlsx'if scope=='monthly'else'.pdf'));out.write_bytes(body);r.update(status='retrieved_pending_schema_validation',fetched_at=now(),retained_path=str(out.relative_to(ROOT)),retained_sha256=hashlib.sha256(body).hexdigest())
   else:r.update(status='body_cap_exceeded',automatic_retry=False)
 except urllib.error.HTTPError as e:r.update(http_status=e.code,status='rate_limited'if e.code==429 else'redirect_rejected'if 300<=e.code<400 else'access_or_http_failed',error=str(e),retry_after=e.headers.get('Retry-After'),access_review_required=e.code in[401,402,403],automatic_retry=False,upstream_raw_sha256=None)
 except Exception as e:r.update(status='transport_failed',error=str(e),automatic_retry=False)
 finally:signal.setitimer(signal.ITIMER_REAL,0);signal.signal(signal.SIGALRM,prior)
 r.update(completed_at=now(),elapsed_seconds=round(time.monotonic()-start,3));p.write_text(json.dumps(r,indent=2)+'\n');print(json.dumps({k:r.get(k)for k in['scope','http_status','status','bytes_read','elapsed_seconds','upstream_raw_sha256','retry_after']}))
if __name__=='__main__':
 p=argparse.ArgumentParser();p.add_argument('scope',choices=URLS);a=p.parse_args();acquire(a.scope)
