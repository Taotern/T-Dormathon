"""One exact official TTBD catalog read after the web reader timed out; no alternate route."""
from pathlib import Path
from datetime import datetime,timezone
import json,hashlib,signal,time,urllib.request,urllib.error,os
from importlib.util import spec_from_file_location,module_from_spec
CODE=Path(__file__).resolve().parent;ROOT=Path(os.environ.get('DORMATHON_TRADE_DATA_DIR',CODE)).resolve();(ROOT/'receipts').mkdir(parents=True,exist_ok=True);(ROOT/'source-data').mkdir(parents=True,exist_ok=True);spec=spec_from_file_location('fixed',CODE/'acquire-fixed.py');fixed=module_from_spec(spec);spec.loader.exec_module(fixed)
URL='https://datacatalog.worldbank.org/search/dataset/0039583/temporary-trade-barriers-database-including-the-global-antidumping-database'
p=ROOT/'receipts/catalog-rights.json'
if p.exists():raise SystemExit('Existing catalog attempt; no retry')
now=lambda:datetime.now(timezone.utc).isoformat();r={'requested_url':URL,'started_at':now(),'status':'attempt_recorded','purpose':'Exact public dataset licence linkage verification after web tool timeout','headers':{'User-Agent':fixed.HEADERS['User-Agent'],'Accept':'text/html'},'attempts':1,'body_cap':1048576,'redirect_policy':'reject'};p.write_text(json.dumps(r,indent=2)+'\n');start=time.monotonic();prior=signal.signal(signal.SIGALRM,fixed.deadline);signal.setitimer(signal.ITIMER_REAL,30)
try:
 with urllib.request.build_opener(fixed.NoRedirect()).open(urllib.request.Request(URL,headers=r['headers']),timeout=30)as response:
  b=response.read(1048577);r.update(http_status=response.status,bytes_read=len(b),body_complete=len(b)<=1048576,content_type=response.headers.get('Content-Type'))
  if len(b)<=1048576:
   path=ROOT/'source-data/catalog-rights.html';path.write_bytes(b);r.update(status='retrieved_pending_rights_review',fetched_at=now(),retained_path=str(path.relative_to(ROOT)),upstream_raw_sha256=hashlib.sha256(b).hexdigest());text=b.decode('utf-8','replace');r['visible_terms_found']=[s for s in ['Creative Commons','Attribution 4.0','0039583','2024','2025','Temporary Trade Barriers']if s.lower()in text.lower()]
  else:r['status']='body_cap_exceeded'
except urllib.error.HTTPError as e:r.update(http_status=e.code,status='access_or_http_failed',error=str(e),retry_after=e.headers.get('Retry-After'),access_review_required=e.code in [401,402,403],automatic_retry=False,upstream_raw_sha256=None)
except Exception as e:r.update(status='transport_failed',error=str(e),automatic_retry=False)
finally:signal.setitimer(signal.ITIMER_REAL,0);signal.signal(signal.SIGALRM,prior)
r.update(completed_at=now(),elapsed_seconds=round(time.monotonic()-start,3));p.write_text(json.dumps(r,indent=2)+'\n');print(json.dumps(r))
