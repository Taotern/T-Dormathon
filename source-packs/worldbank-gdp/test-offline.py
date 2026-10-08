"""Source-route, durable error-state and full accepted-chunk reproduction checks. No network."""
from pathlib import Path
from email.message import Message
import datetime,hashlib,importlib.util,json,os,subprocess,tempfile,urllib.error
ROOT=Path(__file__).resolve().parent
spec=importlib.util.spec_from_file_location('gdp_runner',ROOT/'run.py')
runner=importlib.util.module_from_spec(spec);spec.loader.exec_module(runner)
tests=[]
def test(name,fn):
    try:fn();tests.append({'name':name,'passed':True})
    except Exception as error:tests.append({'name':name,'passed':False,'error':str(error)})
def expect_error(fn,kind=Exception):
    try:fn()
    except kind:return
    raise AssertionError('Expected rejection absent')
def check(ok):
    assert ok
def never():
    raise AssertionError('Unexpected network-opener construction')

test('Exactly seven fixed period scopes and two metadata routes, no arbitrary URL',lambda:check(len(runner.REGISTRY['slices'])==7 and len(runner.FIXED)==9 and all(u.startswith('https://api.worldbank.org/v2/') for u in runner.FIXED.values())))
test('Unknown route and unreviewed year range reject before any opener',lambda:expect_error(lambda:runner.select_routes(['https://example.invalid/'])))
test('More than two requests, duplicate scopes and metadata-plus-data reject',lambda:[expect_error(lambda ids=ids,meta=meta:runner.select_routes(ids,meta)) for ids,meta in [(['wb_gdp_1990_1994']*2,False),(['wb_gdp_1990_1994','wb_gdp_1995_1999','wb_gdp_2000_2004'],False),(['wb_gdp_1990_1994'],True)]])
test('All seven fixed scopes individually select their exact documented URI',lambda:[check(runner.select_routes([r['id']])==[(r['id'],r['url'])]) for r in runner.REGISTRY['slices']])
with tempfile.TemporaryDirectory(prefix='dormathon-unified-tests-') as scratch:
    temp=Path(scratch)
    def existing():
        p=temp/'existing';(p/'receipts').mkdir(parents=True)
        (p/'receipts/wb_gdp_1990_1994.json').write_text(json.dumps({'status':'retrieved_pending_schema_validation','http_status':200}))
        r=runner.acquire_one(p,'wb_gdp_1990_1994',runner.FIXED['wb_gdp_1990_1994'],never)
        check(r['provider_request_made'] is False and r['previous_attempt_status']=='retrieved_pending_schema_validation')
    test('Existing success receipt is read without repeat request',existing)
    def existing_failure():
        p=temp/'failed';(p/'receipts').mkdir(parents=True)
        (p/'receipts/wb_gdp_1990_1994.json').write_text(json.dumps({'status':'access_or_http_failed','http_status':403}))
        r=runner.acquire_one(p,'wb_gdp_1990_1994',runner.FIXED['wb_gdp_1990_1994'],never)
        check(r['http_status']==403 and r['previous_attempt_status']=='access_or_http_failed' and not r['provider_request_made'])
    test('Existing denied receipt preserves failure rather than silent success',existing_failure)
    def locked():
        p=temp/'locked';p.mkdir();(p/'worldbank-origin-state.json').write_text(json.dumps({'access_review_required':True}))
        expect_error(lambda:runner.acquire_one(p,'wb_gdp_1990_1994',runner.FIXED['wb_gdp_1990_1994'],never),PermissionError)
    test('Recorded access denial remains locked before another route/opener',locked)
    def cooling():
        p=temp/'cooling';p.mkdir();(p/'worldbank-origin-state.json').write_text(json.dumps({'cooldown_until':(datetime.datetime.now(datetime.timezone.utc)+datetime.timedelta(hours=1)).isoformat()}))
        expect_error(lambda:runner.acquire_one(p,'wb_gdp_1990_1994',runner.FIXED['wb_gdp_1990_1994'],never),PermissionError)
    test('Active actual rate cooldown blocks source calls',cooling)
    def changed_uri():
        expect_error(lambda:runner.acquire_one(temp/'bad','wb_gdp_1990_1994','https://api.worldbank.org/v2/country/all/indicator/SL.UEM.TOTL.ZS',never),ValueError)
    test('Route substitution to another legitimate provider indicator still rejects',changed_uri)
    class FakeOpener:
        def __init__(self,error,path):self.error=error;self.path=path
        def open(self,request,timeout):
            check(self.path.exists() and json.loads(self.path.read_text())['status']=='attempt_recorded')
            raise self.error
    def denied():
        p=temp/'simulated-denial';headers=Message();headers['Content-Type']='text/plain'
        error=urllib.error.HTTPError(runner.FIXED['wb_gdp_1990_1994'],403,'simulated offline denial',headers,None)
        r=runner.acquire_one(p,'wb_gdp_1990_1994',runner.FIXED['wb_gdp_1990_1994'],lambda:FakeOpener(error,p/'receipts/wb_gdp_1990_1994.json'))
        check(r['http_status']==403 and json.loads((p/'worldbank-origin-state.json').read_text())['access_review_required'])
    test('Offline simulated denial records attempt first and durable origin lock',denied)
    def rate_limit():
        p=temp/'simulated-rate';headers=Message();headers['Retry-After']='120'
        error=urllib.error.HTTPError(runner.FIXED['wb_gdp_1990_1994'],429,'simulated offline rate',headers,None)
        r=runner.acquire_one(p,'wb_gdp_1990_1994',runner.FIXED['wb_gdp_1990_1994'],lambda:FakeOpener(error,p/'receipts/wb_gdp_1990_1994.json'))
        state=json.loads((p/'worldbank-origin-state.json').read_text());check(r['retry_after']=='120' and state['basis']=='actual provider Retry-After' and not state['access_review_required'])
    test('Offline simulated Retry-After retained without permanent-ban inference',rate_limit)
    inputs=os.environ.get('DORMATHON_GDP_TEST_INPUT_ROOTS')
    if inputs is None:
        inputs=json.dumps([str(ROOT.parent/name) for name in ['history-foundation-v0.9','history-middle-v0.10','history-completion-v0.11']])
    roots=json.loads(inputs)
    def reproduce():
        command=['python',str(ROOT/'run.py'),'reproduce','--output-dir',str(temp/'derived')]
        for path in roots:command+=['--input-root',path]
        result=subprocess.run(command,capture_output=True,text=True,timeout=60)
        check(result.returncode==0)
        report=json.loads((temp/'derived/reproduction-report.json').read_text())
        check(report['observations']==9540 and report['chunks']==111 and report['economies_numeric_every_reproduced_year']==177)
        check(report['provider_requests']==0 and not report['unloaded_reviewed_groups'])
        years=report['actually_reproduced_years'];check(years==[str(y) for y in range(1990,2026)])
        heldout=json.loads((ROOT/'fixtures/held-out-real-rows.json').read_text())['items'];expected={r['upstream_id']:r for r in heldout}
        for file in (temp/'derived').glob('*/chunks/*.json'):
            for item in json.loads(file.read_text())['items']:
                if item['upstream_id'] in expected:check(item==expected.pop(item['upstream_id']))
        check(not expected)
    test('Single exact adapter reproduces all111 accepted chunks,9540rows and twelve real held-out records across all seven slices',reproduce)
report={'schema_version':'dormathon.unified-gdp-offline-tests.v0.14','finished_at':datetime.datetime.now(datetime.timezone.utc).isoformat(),'passed':sum(t['passed'] for t in tests),'failed':sum(not t['passed'] for t in tests),'tests':tests,'provider_requests':0,'site_requests':0,'simulated_http_tests_are_not_upstream_receipts':True,'Windows':'not_run','OS_scheduling':'not_run'}
(ROOT/'reports').mkdir(exist_ok=True);(ROOT/'reports/offline-tests.json').write_text(json.dumps(report,indent=2)+'\n')
print(json.dumps(report))
raise SystemExit(1 if report['failed'] else 0)
