"""Fixed public requests; one attempt per named slice, durable receipts, no redirect/retry."""
from pathlib import Path
from datetime import datetime, timezone, timedelta
from urllib.parse import urlsplit
import hashlib, json, time, urllib.request, urllib.error, sys, os

ROOT=Path(os.environ.get("DORMATHON_HISTORY_DATA_DIR",Path(__file__).resolve().parent)).resolve()
UA='DormathonSourceResearch/0.1 (+public-metadata-test)'
ACCEPT='application/json,application/rss+xml,application/xml,text/xml;q=0.9,*/*;q=0.2'
GDELT='https://api.gdeltproject.org/api/v2/doc/doc?query=%28economy%20OR%20conflict%20OR%20earthquake%20OR%20flood%20OR%20technology%20OR%20trade%29&mode=artlist&maxrecords=100&timespan=48h&format=json&sort=datedesc'
SLICES={
 'wb_gdp_metadata':'https://api.worldbank.org/v2/indicator/NY.GDP.MKTP.CD?format=json',
 'wb_country_dimensions':'https://api.worldbank.org/v2/country?format=json&per_page=500',
 'wb_gdp_2020_2026':'https://api.worldbank.org/v2/country/all/indicator/NY.GDP.MKTP.CD?source=2&date=2020:2026&format=json&per_page=5000&page=1',
 'wb_gdp_2020_2026_retry':'https://api.worldbank.org/v2/country/all/indicator/NY.GDP.MKTP.CD?source=2&date=2020:2026&format=json&per_page=5000&page=1',
 'wb_gdp_1990_1994':'https://api.worldbank.org/v2/country/all/indicator/NY.GDP.MKTP.CD?source=2&date=1990:1994&format=json&per_page=5000&page=1',
 'gdelt_controlled_status_20261008':GDELT
}
class NoRedirect(urllib.request.HTTPRedirectHandler):
 def redirect_request(self,req,fp,code,msg,headers,newurl):
  raise urllib.error.HTTPError(req.full_url,code,'Redirect rejected; no alternate endpoint',headers,fp)
def now():return datetime.now(timezone.utc).isoformat()
def acquire(slice_id):
 if slice_id not in SLICES:raise ValueError('Unknown fixed slice')
 (ROOT/'receipts').mkdir(parents=True,exist_ok=True);(ROOT/'source-data').mkdir(parents=True,exist_ok=True)
 path=ROOT/'receipts'/f'{slice_id}.json'
 if path.exists():
  print(json.dumps({'slice':slice_id,'status':'existing_attempt_readback','receipt':str(path)}),flush=True);return
 url=SLICES[slice_id];parsed=urlsplit(url)
 assert parsed.scheme=='https' and parsed.hostname in ['api.worldbank.org','api.gdeltproject.org'] and not parsed.username
 cap=262144 if slice_id.startswith('gdelt') else 2097152
 receipt={'schema_version':'dormathon.history-acquisition.v0.9','slice_id':slice_id,'requested_url':url,'started_at':now(),'attempts':1,'redirect_policy':'reject','timeout_seconds':30,'body_cap':cap,'headers':{'User-Agent':UA,'Accept':ACCEPT},'authentication':'none','status':'attempt_recorded','recurring_operational':False,'rights':'World Bank indicator-specific CC BY4.0 structured facts' if not slice_id.startswith('gdelt') else 'Status/metadata-only test; article bodies never requested/retained'}
 path.write_text(json.dumps(receipt,indent=2)+'\n');started=time.monotonic()
 try:
  with urllib.request.build_opener(NoRedirect()).open(urllib.request.Request(url,headers={'User-Agent':UA,'Accept':ACCEPT}),timeout=30) as response:
   body=response.read(cap+1);receipt.update(http_status=response.status,response_headers={k:response.headers[k] for k in ['Date','Last-Modified','ETag','Content-Type','Content-Length','Retry-After','X-RateLimit-Limit','X-RateLimit-Remaining'] if k in response.headers},bytes_read=len(body),body_complete=len(body)<=cap,upstream_raw_sha256=hashlib.sha256(body).hexdigest() if len(body)<=cap else None)
   if len(body)>cap:receipt['status']='body_cap_exceeded'
   else:
    payload=json.loads(body);receipt['status']='retrieved_pending_schema_validation';receipt['fetched_at']=now()
    if slice_id.startswith('gdelt'):
     if not isinstance(payload,dict) or not isinstance(payload.get('articles'),list):raise ValueError('GDELT expected article envelope missing')
     safe={'articles':[{k:r.get(k) for k in ['url','title','seendate','domain','language','sourcecountry']} for r in payload['articles'][:100]]};body=(json.dumps(safe,ensure_ascii=False,indent=2)+'\n').encode();receipt['safe_projection_not_raw_response']=True
    else:
     if not isinstance(payload,list) or len(payload)!=2 or not isinstance(payload[0],dict) or not isinstance(payload[1],list):raise ValueError('World Bank metadata+array schema missing')
     receipt['pagination']=payload[0];receipt['returned_count']=len(payload[1])
    target=ROOT/'source-data'/f'{slice_id}.json';target.write_bytes(body);receipt['retained_path']=str(target.relative_to(ROOT));receipt['retained_sha256']=hashlib.sha256(body).hexdigest();receipt['retained_bytes']=len(body)
 except urllib.error.HTTPError as error:
  receipt.update(http_status=error.code,status='rate_limited' if error.code==429 else 'access_or_http_failed',error=str(error),upstream_raw_sha256=None,response_headers={k:error.headers[k] for k in ['Date','Retry-After','X-RateLimit-Limit','X-RateLimit-Remaining','Content-Type'] if k in error.headers})
  receipt['retry_after']=error.headers.get('Retry-After');receipt['automatic_retry']=False;receipt['access_review_required']=error.code in [401,402,403]
  if error.code==429:receipt['disposition']='Stop this pass. Preserve actual Retry-After; absent value does not prove a permanent ban.'
 except Exception as error:receipt.update(status='transport_or_schema_failed',error=str(error),automatic_retry=False)
 receipt['completed_at']=now();receipt['elapsed_seconds']=round(time.monotonic()-started,3);path.write_text(json.dumps(receipt,ensure_ascii=False,indent=2)+'\n');print(json.dumps({k:receipt.get(k) for k in ['slice_id','http_status','status','returned_count','bytes_read','retry_after','upstream_raw_sha256']},ensure_ascii=False),flush=True)
if __name__=='__main__':
 for slice_id in sys.argv[1:]:acquire(slice_id)
