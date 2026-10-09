from pathlib import Path
from datetime import datetime,timezone
import json,hashlib,urllib.request,urllib.error,signal,re,sys,time
ROOT=Path(__file__).resolve().parent
LANDING='https://www.worldbank.org/en/data/interactive/2021/03/02/temporary-trade-barriers-database'
CVD='https://thedocs.worldbank.org/en/doc/1b03ee05a4a6d2374c126196ddf0a128-0430012025/related/Global-countervailing-measures.zip'
class NoRedirect(urllib.request.HTTPRedirectHandler):
 def redirect_request(self,req,fp,code,msg,headers,newurl):raise urllib.error.HTTPError(req.full_url,code,'Redirect rejected',headers,fp)
def stamp():return datetime.now(timezone.utc).isoformat()
def timeout(*args):raise TimeoutError('30s overall deadline')
def get(role,url,cap,out):
 p=ROOT/'receipts'/f'{role}.json'
 if p.exists():return json.loads(p.read_text())
 r=dict(schema_version='dormathon.actor-source-acquisition.v0.21',role=role,requested_url=url,started_at=stamp(),status='attempt_recorded',attempts=1,body_cap=cap,strict_overall_deadline_seconds=30,redirect_policy='reject',authentication='none',recurring_operational=False)
 p.write_text(json.dumps(r,indent=2)+'\n');start=time.monotonic();signal.signal(signal.SIGALRM,timeout);signal.setitimer(signal.ITIMER_REAL,30)
 try:
  with urllib.request.build_opener(NoRedirect()).open(urllib.request.Request(url,headers={'User-Agent':'DormathonSourceResearch/0.1 (+public-metadata-test)','Accept':'text/html,application/zip'}),timeout=30)as resp:
   body=resp.read(cap+1);complete=len(body)<=cap;r.update(http_status=resp.status,bytes_read=len(body),body_complete=complete,response_headers={k:resp.headers[k]for k in['Date','Last-Modified','ETag','Content-Type','Retry-After']if k in resp.headers},raw_sha256=hashlib.sha256(body).hexdigest()if complete else None)
   if complete:(ROOT/'source-data'/out).write_bytes(body);r.update(status='retrieved_pending_schema_validation',retained_path='source-data/'+out,fetched_at=stamp())
   else:r.update(status='body_cap_exceeded',automatic_retry=False)
 except urllib.error.HTTPError as e:r.update(http_status=e.code,status='rate_limited'if e.code==429 else'redirect_rejected'if 300<=e.code<400 else'access_or_http_failed',retry_after=e.headers.get('Retry-After'),access_review_required=e.code in[401,402,403],automatic_retry=False,raw_sha256=None,error=str(e))
 except Exception as e:r.update(status='transport_failed',error=str(e),automatic_retry=False)
 finally:signal.setitimer(signal.ITIMER_REAL,0)
 r.update(completed_at=stamp(),elapsed_seconds=round(time.monotonic()-start,3));p.write_text(json.dumps(r,indent=2)+'\n');print(json.dumps(r));return r
if __name__=='__main__':
 role=sys.argv[1]
 if role=='landing':get(role,LANDING,262144,'landing.html')
 elif role=='countervailing':
  html=(ROOT/'source-data/landing.html').read_text();links=re.findall(r'href=["\']([^"\']+)["\']',html);urls=[u.replace('&amp;','&')for u in links if u.endswith('/Global-countervailing-measures.zip')]
  if len(set(urls))!=1:raise SystemExit('Exactly one official current countervailing link required')
  url=urls[0]
  if url!=CVD:raise SystemExit('Unreviewed official CVD target drift; stop before request')
  get(role,url,2097152,'countervailing.zip')
 else:raise SystemExit('Only landing/countervailing scopes are allowed')
