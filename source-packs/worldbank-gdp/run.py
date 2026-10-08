"""One allowlisted GDP entrypoint. Acquisition is explicit; accepted reproduction is offline."""
from pathlib import Path
from datetime import datetime, timedelta, timezone
from email.utils import parsedate_to_datetime
import argparse
import hashlib
import json
import os
import signal
import subprocess
import sys
import time
import urllib.error
import urllib.request

ROOT = Path(__file__).resolve().parent
REGISTRY = json.loads((ROOT/'contracts/route-registry.json').read_text())
PERIODS = [(1990,1994),(1995,1999),(2000,2004),(2005,2009),(2010,2014),(2015,2019),(2020,2026)]
FIXED = {f'wb_gdp_{a}_{b}': f'https://api.worldbank.org/v2/country/all/indicator/NY.GDP.MKTP.CD?source=2&date={a}:{b}&format=json&per_page=5000&page=1' for a,b in PERIODS}
FIXED.update(wb_gdp_metadata='https://api.worldbank.org/v2/indicator/NY.GDP.MKTP.CD?format=json',
             wb_country_dimensions='https://api.worldbank.org/v2/country?format=json&per_page=500')

class NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self,req,fp,code,msg,headers,newurl):
        raise urllib.error.HTTPError(req.full_url,code,'Redirect rejected; no alternate endpoint',headers,fp)

def now():
    return datetime.now(timezone.utc).isoformat()

def timeout(signum,frame):
    raise TimeoutError('Strict 30-second overall acquisition deadline')

def select_routes(slice_ids,metadata=False):
    names=(['wb_gdp_metadata','wb_country_dimensions'] if metadata else [])+slice_ids
    if not names or len(names)>2 or len(set(names))!=len(names):
        raise ValueError('Choose one or two distinct fixed routes per invocation')
    routes={r['id']:r['url'] for r in REGISTRY['metadata_routes']+REGISTRY['slices']}
    if any(name not in FIXED or routes.get(name)!=FIXED[name] for name in names):
        raise ValueError('Unknown or changed route; arbitrary URLs/years are not allowed')
    return [(name,FIXED[name]) for name in names]

def acquire_one(data_dir,key,url,opener_factory=None):
    if FIXED.get(key)!=url:
        raise ValueError('Request is outside the immutable exact HTTPS allowlist')
    data_dir=Path(data_dir).resolve()
    for folder in ['receipts','source-data']:
        (data_dir/folder).mkdir(parents=True,exist_ok=True)
    receipt_path=data_dir/'receipts'/f'{key}.json'
    if receipt_path.exists():
        prior=json.loads(receipt_path.read_text())
        return {'slice_id':key,'status':'existing_attempt_readback','previous_attempt_status':prior.get('status'),
                'http_status':prior.get('http_status'),'receipt':str(receipt_path),'provider_request_made':False}
    state_path=data_dir/'worldbank-origin-state.json'
    if state_path.exists():
        state=json.loads(state_path.read_text())
        if state.get('access_review_required'):
            raise PermissionError('Exact api.worldbank.org access denial remains locked for review; no request made')
        if state.get('cooldown_until') and datetime.fromisoformat(state['cooldown_until'])>datetime.now(timezone.utc):
            raise PermissionError('Recorded World Bank rate cooldown is active; no request made')
    if not hasattr(signal,'setitimer'):
        raise RuntimeError('Strict acquisition deadline requires verified Linux timer runtime; no request made')
    receipt={'schema_version':'dormathon.unified-gdp-acquisition.v0.14','slice_id':key,'requested_url':url,
             'started_at':now(),'status':'attempt_recorded','attempts':1,'authentication':'none',
             'headers':REGISTRY['headers'],'body_cap':2097152,'strict_overall_deadline_seconds':30,
             'redirect_policy':'reject','automatic_retry':False,'recurring_operational':False,
             'rights_baseline':REGISTRY['rights'],'normalization_stage':'not_run'}
    receipt_path.write_text(json.dumps(receipt,indent=2)+'\n')
    began=time.monotonic()
    old=signal.signal(signal.SIGALRM,timeout)
    signal.setitimer(signal.ITIMER_REAL,30)
    try:
        opener=(opener_factory or (lambda:urllib.request.build_opener(NoRedirect())))()
        with opener.open(urllib.request.Request(url,headers=REGISTRY['headers']),timeout=30) as response:
            body=response.read(2097153)
            receipt.update(http_status=response.status,bytes_read=len(body),body_complete=len(body)<=2097152,
                           response_headers={k:response.headers[k] for k in ['Date','Last-Modified','ETag','Content-Type','Retry-After'] if k in response.headers},
                           upstream_raw_sha256=hashlib.sha256(body).hexdigest() if len(body)<=2097152 else None)
            if len(body)>2097152:
                receipt['status']='body_cap_exceeded'
            else:
                payload=json.loads(body)
                if not isinstance(payload,list) or len(payload)!=2 or not isinstance(payload[0],dict) or not isinstance(payload[1],list):
                    raise ValueError('Recognized World Bank metadata/array envelope absent')
                target=data_dir/'source-data'/f'{key}.json'
                target.write_bytes(body)
                receipt.update(status='retrieved_pending_source_projection',fetched_at=now(),retained_path=str(target.relative_to(data_dir)),
                               retained_sha256=hashlib.sha256(body).hexdigest(),pagination=payload[0],returned_count=len(payload[1]))
    except urllib.error.HTTPError as error:
        headers={k:error.headers[k] for k in ['Date','Retry-After','Content-Type'] if k in error.headers}
        receipt.update(http_status=error.code,status='rate_limited' if error.code==429 else 'access_or_http_failed',
                       error=str(error),response_headers=headers,retry_after=error.headers.get('Retry-After'),upstream_raw_sha256=None)
        if error.code in [401,402,403]:
            state_path.write_text(json.dumps({'access_review_required':True,'http_status':error.code,'target':url,'recorded_at':now()},indent=2)+'\n')
        elif error.code==429:
            value=error.headers.get('Retry-After');instant=datetime.now(timezone.utc)+timedelta(hours=1);basis='local conservative one-hour cooldown; no provider Retry-After supplied'
            if value:
                try:
                    instant=datetime.now(timezone.utc)+timedelta(seconds=int(value)) if value.isdigit() else parsedate_to_datetime(value)
                    if instant.tzinfo is None:instant=instant.replace(tzinfo=timezone.utc)
                    basis='actual provider Retry-After'
                except (ValueError,TypeError,OverflowError):basis='local one-hour cooldown; provider Retry-After unparseable and retained raw'
            state_path.write_text(json.dumps({'access_review_required':False,'cooldown_until':instant.isoformat(),'basis':basis,'retry_after_raw':value,'target':url},indent=2)+'\n')
    except Exception as error:
        receipt.update(status='transport_or_schema_failed',error=str(error))
    finally:
        signal.setitimer(signal.ITIMER_REAL,0)
        signal.signal(signal.SIGALRM,old)
    receipt.update(completed_at=now(),elapsed_seconds=round(time.monotonic()-began,3))
    receipt_path.write_text(json.dumps(receipt,indent=2)+'\n')
    return receipt

def main():
    parser=argparse.ArgumentParser(description=__doc__)
    sub=parser.add_subparsers(dest='command',required=True)
    acquisition=sub.add_parser('acquire',help='One or two explicitly selected fixed public routes; no automatic retry')
    acquisition.add_argument('--data-dir',type=Path,required=True)
    acquisition.add_argument('--slice',action='append',default=[],dest='slices')
    acquisition.add_argument('--metadata',action='store_true',help='Two indicator/dimension reads, within the same two-request cap')
    reproduction=sub.add_parser('reproduce',help='Network-free exact reconstruction of retained accepted artifacts')
    reproduction.add_argument('--input-root',action='append',type=Path,required=True)
    reproduction.add_argument('--output-dir',type=Path,required=True)
    sub.add_parser('routes',help='List the seven fixed scopes and limits, without network')
    args=parser.parse_args()
    if args.command=='routes':
        print(json.dumps(REGISTRY,indent=2));return
    if args.command=='reproduce':
        environment={**os.environ,'DORMATHON_GDP_INPUT_ROOTS':json.dumps([str(p.resolve()) for p in args.input_root]),
                     'DORMATHON_GDP_OUTPUT_ROOT':str(args.output_dir.resolve())}
        subprocess.run(['node',str(ROOT/'reproduce.mjs')],env=environment,check=True);return
    failed=False
    for key,url in select_routes(args.slices,args.metadata):
        result=acquire_one(args.data_dir,key,url)
        print(json.dumps({k:result.get(k) for k in ['slice_id','status','previous_attempt_status','http_status','returned_count','provider_request_made']}))
        successful=result.get('status')=='retrieved_pending_source_projection' or result.get('status')=='existing_attempt_readback' and result.get('previous_attempt_status') in ['retrieved_pending_source_projection','retrieved_pending_schema_validation']
        failed=failed or not successful
        if result.get('http_status') in [401,402,403,429]:
            break
    if failed:
        raise SystemExit(1)

if __name__=='__main__':
    main()
