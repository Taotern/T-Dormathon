from pathlib import Path
from datetime import datetime,timezone
import argparse, copy, hashlib, importlib.util, json, sqlite3

def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest()
def now():return datetime.now(timezone.utc).isoformat()
def save(p,x):p.write_text(json.dumps(x,ensure_ascii=False,indent=2)+'\n')
a=argparse.ArgumentParser(description='Offline replay of three exact retained genuine US pages. Never makes a network request.');a.add_argument('--code',type=Path,required=True);a.add_argument('--original-root',type=Path,required=True);a.add_argument('--output',type=Path,required=True);args=a.parse_args()
assert not args.output.exists(),'Fresh independent replay state required'
args.output.mkdir(parents=True)
ledger=args.original_root/'attempt-ledger.json';assert sha(ledger)=='57219843279a5b30b92877baf0085632667e8b5fa5f206b1fb8f62d3dd1c0488'
old=sqlite3.connect('file:'+str(args.original_root/'state/refresh.sqlite')+'?mode=ro',uri=True)
assert old.execute("SELECT count(*)FROM versions WHERE source_id='legal_us_federal_register'").fetchone()[0]==0
receipts=[json.loads(p.read_text())for p in (args.original_root/'state/receipts').glob('*.json')]
saved=sorted([r for r in receipts if r['job_id']=='us.current'],key=lambda r:r['requested_url'])
assert len(saved)==3 and all(r['http_status']==200 and r['body_complete']for r in saved)
by_url={r['requested_url']:r for r in saved}
for r in saved:
    raw=args.original_root/'state/raw'/(r['upstream_raw_sha256']+'.body');assert sha(raw)==r['upstream_raw_sha256']
spec=importlib.util.spec_from_file_location('refresh_successor',args.code/'refresh.py');refresh=importlib.util.module_from_spec(spec);spec.loader.exec_module(refresh)
assert refresh.PROFILE_SHA=='9c33c077cc30fe4946e519eb795cbc33e9640320623db19db62333c6ad6ca130'
job=copy.deepcopy(next(j for j in refresh.JOBS['jobs']if j['id']=='us.current'))
def run_replay(state,mutate=False):
    state.mkdir(parents=True)
    save(state/'state-profile.json',{'profile_sha256':refresh.PROFILE_SHA,'parser_version':'history-refresh-v0.19.2','source_id':'legal_us_federal_register'})
    reads=[]
    def fetch(j,url,role,headers):
        assert role=='data'and url in by_url,'No unsaved URL or metadata request is allowed'
        witness=by_url[url];raw=args.original_root/'state/raw'/(witness['upstream_raw_sha256']+'.body');body=raw.read_bytes();reads.append(url)
        if mutate and 'page=3&'in url:
            data=json.loads(body);record=next(r for r in data['results']if r['document_number']=='2026-20493');record['cfr_references'][0]['part']=True;body=json.dumps(data).encode()
        return 200,body,{'Content-Type':'application/json; retained original bytes; no network'}
    original_request=refresh.request
    def with_original_clock(store,j,url,role,mode,stamp,fetcher=None):
        assert mode in ['retained_replay','synthetic_fixture']and url in by_url
        return original_request(store,j,url,role,mode,by_url[url]['fetched_at'],fetcher)
    refresh.request=with_original_clock
    try:
        store=refresh.Store(state);result=refresh.run_job(store,job,saved[0]['fetched_at'],'synthetic_fixture'if mutate else'retained_replay',3,fetch)
        parts=refresh.export_parts(store,[result],'synthetic_fixture'if mutate else'retained_replay',refresh.now())
        versions=store.db.execute("SELECT count(*)FROM versions").fetchone()[0];items=store.db.execute("SELECT count(*)FROM items").fetchone()[0]
        job_state=store.db.execute("SELECT last_good_at FROM job_state WHERE id='us.current'").fetchone()[0]
        return result,parts,versions,items,job_state,reads
    finally:refresh.request=original_request
started=now();result,parts,versions,items,last_good,reads=run_replay(args.output/'retained-state')
assert result['status']=='partial'and versions==300 and items==300 and len(reads)==3 and len(result['records'])==300
case=next(r for r in result['records']if r['upstream_id']=='2026-20493');assert case['metadata']['facts']['cfr_references'][0]=={'title':47,'part':None,'chapter':'IV','basis':'source_provided_reference'}
for record in result['records']:
    run=next(json.loads(p.read_text())for p in (args.output/'retained-state/receipts').glob('*.json')if json.loads(p.read_text())['id']==record['acquisition_id'])
    assert record['metadata']['fetched_at']==by_url[run['requested_url']]['fetched_at']
bad,badparts,badversions,baditems,badlast,badreads=run_replay(args.output/'synthetic-negative-state',True)
assert bad['status']=='failed'and badversions==0 and baditems==0 and badlast is None and len(bad['records'])==0 and len(badreads)==3
assert sha(ledger)=='57219843279a5b30b92877baf0085632667e8b5fa5f206b1fb8f62d3dd1c0488'
assert old.execute("SELECT count(*)FROM versions WHERE source_id='legal_us_federal_register'").fetchone()[0]==0
report={'schema_version':'dormathon.us-cfr-retained-replay.v0.19.2','started_at':started,'finished_at':now(),'transport_mode':'retained_replay','profile_sha256':refresh.PROFILE_SHA,'provider_requests':0,'site_requests':0,'logical_saved_body_reads':len(reads),'scope':{'requested_window':saved[0]['coverage']['requested_window'],'acquired_pages':[1,2,3],'declared_upstream_count':605,'declared_total_pages':7,'selected_rows':300,'truncated':True,'unacquired_pages':[4,5,6,7]},'original_failed_ledger':{'path':str(ledger),'sha256':sha(ledger),'original_US_versions':0},'original_witnesses':saved,'replay_result':{k:v for k,v in result.items()if k!='records'},'versions':versions,'items':items,'parts':parts,'chapter_only_example':case,'negative_boundary':{'transport_mode':'synthetic_fixture','mutated_field':'page3 document2026-20493 CFR.part=true','status':bad['status'],'versions':badversions,'items':baditems,'last_good_at':badlast,'logical_saved_body_reads':len(badreads),'parts':badparts},'inference':'Supplied nullable CFR references only; no inferred binding/applicability/current legal effect','notes':['Every retained row preserves the original per-page source acquisition clock. Replay run completion/export clocks are new logical replay clocks.','Part/run authenticity remains a producer claim; SHA binds saved bytes, not independent Site acquisition.','Synthetic negative output must never be imported live. Original failed state and ledger remain unchanged.']}
save(args.output/'replay-report.json',report)
print(json.dumps({'report':str(args.output/'replay-report.json'),'sha256':sha(args.output/'replay-report.json'),'retained_rows':versions,'retained_parts':len(parts),'negative_atomic_rollback':True,'provider_requests':0}))
