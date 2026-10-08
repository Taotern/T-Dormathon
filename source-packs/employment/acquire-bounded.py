"""Exactly two complementary unemployment metadata/data reads. Linux overall deadline; durable no-retry receipts."""
from pathlib import Path
from datetime import datetime, timezone
import hashlib, json, signal, time, urllib.request, urllib.error, os

ROOT = Path(os.environ.get('DORMATHON_HISTORY_DATA_DIR',Path(__file__).resolve().parent)).resolve()
HEADERS = {'User-Agent': 'DormathonSourceResearch/0.1 (+public-metadata-test)',
           'Accept': 'application/json,application/rss+xml,application/xml,text/xml;q=0.9,*/*;q=0.2'}
SLICES = {'wb_unemployment_metadata': None, 'wb_unemployment_2020_2026': (2020, 2026)}
CAP = 2097152
class NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        raise urllib.error.HTTPError(req.full_url, code, 'Redirect rejected', headers, fp)
def now(): return datetime.now(timezone.utc).isoformat()
def deadline(signum, frame): raise TimeoutError('Strict 30-second overall acquisition deadline')
def acquire(key, period):
    start,end=period or (None,None)
    (ROOT/'receipts').mkdir(parents=True,exist_ok=True);(ROOT/'source-data').mkdir(parents=True,exist_ok=True)
    receipt_path = ROOT/'receipts'/f'{key}.json'
    if receipt_path.exists():
        print(json.dumps({'slice_id':key,'status':'existing_attempt_readback'}), flush=True)
        return
    url = ('https://api.worldbank.org/v2/indicator/SL.UEM.TOTL.ZS?format=json' if period is None else f'https://api.worldbank.org/v2/country/all/indicator/SL.UEM.TOTL.ZS?source=2&date={start}:{end}&format=json&per_page=5000&page=1')
    receipt = {'schema_version':'dormathon.history-acquisition.v0.12','slice_id':key,
               'requested_url':url,'started_at':now(),'attempts':1,'period':[start,end],
               'headers':HEADERS,'authentication':'none','redirect_policy':'reject',
               'strict_overall_deadline_seconds':30,'deadline_runtime':'Linux main-thread SIGALRM',
               'body_cap':CAP,'status':'attempt_recorded','recurring_operational':False,
               'rights':'World Bank modeled ILO unemployment indicator-specific CC BY4.0; exact indicator page/terms verified2026-10-08'}
    receipt_path.write_text(json.dumps(receipt,indent=2)+'\n')
    began=time.monotonic()
    previous=signal.signal(signal.SIGALRM, deadline)
    signal.setitimer(signal.ITIMER_REAL,30)
    try:
        with urllib.request.build_opener(NoRedirect()).open(urllib.request.Request(url,headers=HEADERS),timeout=30) as response:
            body=response.read(CAP+1)
            receipt.update(http_status=response.status,
                           response_headers={k:response.headers[k] for k in ['Date','Last-Modified','ETag','Content-Type','Content-Length','Retry-After'] if k in response.headers},
                           bytes_read=len(body),body_complete=len(body)<=CAP,
                           upstream_raw_sha256=hashlib.sha256(body).hexdigest() if len(body)<=CAP else None)
            if len(body)>CAP: receipt['status']='body_cap_exceeded'
            else:
                payload=json.loads(body)
                if not isinstance(payload,list) or len(payload)!=2 or not isinstance(payload[0],dict) or not isinstance(payload[1],list):
                    raise ValueError('World Bank metadata+records schema required')
                retained=ROOT/'source-data'/f'{key}.json';retained.write_bytes(body)
                receipt.update(status='retrieved_pending_schema_validation',fetched_at=now(),pagination=payload[0],
                               returned_count=len(payload[1]),retained_path=str(retained.relative_to(ROOT)),
                               retained_sha256=hashlib.sha256(body).hexdigest(),retained_bytes=len(body))
    except urllib.error.HTTPError as error:
        receipt.update(http_status=error.code,status='rate_limited' if error.code==429 else 'access_or_http_failed',
                       error=str(error),upstream_raw_sha256=None,
                       response_headers={k:error.headers[k] for k in ['Date','Retry-After','Content-Type'] if k in error.headers},
                       retry_after=error.headers.get('Retry-After'),automatic_retry=False,
                       access_review_required=error.code in [401,402,403])
    except Exception as error:
        receipt.update(status='transport_or_schema_failed',error=str(error),automatic_retry=False)
    finally:
        signal.setitimer(signal.ITIMER_REAL,0);signal.signal(signal.SIGALRM,previous)
    receipt['completed_at']=now();receipt['elapsed_seconds']=round(time.monotonic()-began,3)
    receipt_path.write_text(json.dumps(receipt,indent=2)+'\n')
    print(json.dumps({k:receipt.get(k) for k in ['slice_id','http_status','status','returned_count','bytes_read','elapsed_seconds','upstream_raw_sha256'] }),flush=True)

if __name__=='__main__':
    if not hasattr(signal,'setitimer'): raise SystemExit('Strict bounded acquisition requires this verified Linux runtime; no network request made')
    for key,period in SLICES.items(): acquire(key,period)
