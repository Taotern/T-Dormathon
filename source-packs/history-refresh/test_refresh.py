"""Independent retained-source and state/failure tests. All HTTP transports are mocked."""
from pathlib import Path
from datetime import timedelta
from unittest.mock import patch
import copy, json, tempfile, subprocess, hashlib
import refresh

ROOT=Path(__file__).parent
STAMP='2026-10-08T19:00:00Z'
RESULTS=[]
def test(name,fn):
    try:fn();RESULTS.append({'name':name,'passed':True})
    except Exception as e:RESULTS.append({'name':name,'passed':False,'error':str(e)[:1000]})
def job(kind):return copy.deepcopy(next(j for j in refresh.JOBS['jobs']if j['kind']==kind and j['mode']=='current'))
FILES={'gdp':'gdp_current.json','employment':'employment_current.json','fx':'fx_recent.csv','uk':'uk_recent.xml','us':'us_recent.json','trade':'trade_reduced.safe.json','commodity':'commodity_reduced.corrected.safe.json'}
def fake(j,url,role,headers):
    name=j['kind']+'_metadata.json' if role=='metadata' else FILES[j['kind']]
    return 200,(ROOT/'fixtures'/name).read_bytes(),{'ETag':'fixture-'+name,'Content-Type':'source-fixture'}
ORIGINAL_PROJECT=refresh.project
def fixture_project(store,j,response,start,end,metadata_path=None):
    if j['kind'] not in ['trade','commodity']:return ORIGINAL_PROJECT(store,j,response,start,end,metadata_path)
    with tempfile.TemporaryDirectory()as folder:
        cfg={'source_id':j['source_id'],'data_path':response['path'],'metadata_path':metadata_path,'start':start,'end':end,'fetched_at':response['fetched_at'],'requested_url':response['url']}
        p=Path(folder);(p/'in.json').write_text(json.dumps(cfg));subprocess.run(['node',str(ROOT/'project.mjs'),str(p/'in.json'),str(p/'out.json')],check=True,capture_output=True,text=True);return json.loads((p/'out.json').read_text())
def run(store,j,stamp=STAMP,fetch=fake,budget=12):
    with patch.object(refresh,'project',fixture_project):return refresh.run_job(store,j,stamp,'synthetic_fixture',budget,fetch)
def expect_bad(fn):
    try:fn()
    except Exception:return
    raise AssertionError('Expected source-boundary rejection')

def all_sources():
    with tempfile.TemporaryDirectory()as folder:
        store=refresh.Store(folder);results=[]
        for kind in FILES:
            j=job(kind)
            if kind=='us':j['max_pages']=1
            r=run(store,j);assert r['status']in ['updated','partial'],r;assert r['records'];results.append(r)
        parts=refresh.export_parts(store,results,'synthetic_fixture',refresh.now());assert parts
        for part in parts:
            raw=Path(part['path']).read_bytes();assert len(raw)<=262144
            x=json.loads(raw);assert x['payload_sha256']==refresh.canon(x['payload'])['sha256'];assert len(x['payload']['records'])<=100;assert x['payload']['transport_mode']=='synthetic_fixture'
            for r in x['payload']['records']:
                assert r['metadata_sha256']==refresh.canon(r['metadata'])['sha256'];assert r['acquisition_id']in {w['id']for w in x['payload']['runs']}
            for witness in x['payload']['runs']:
                assert refresh.aware(witness['completed_at'])<=refresh.aware(x['payload']['exported_at']);assert witness['transport_mode']=='synthetic_fixture'
                if witness['source_snapshot'].get('metadata_witness_id'):assert witness['source_snapshot']['metadata_witness_id']in {w['id']for w in x['payload']['runs']}
        assert store.db.execute('SELECT count(*)FROM versions').fetchone()[0]==98
test('All seven retained-source adapters/store/export; canonical/clock/witness and bounded parts',all_sources)

def no_change_revision_reversion():
    with tempfile.TemporaryDirectory()as f:
        store=refresh.Store(f);j=job('gdp');first=run(store,j);assert len(first['records'])==6
        original=[dict(r)for r in store.db.execute('SELECT*FROM versions ORDER BY id')]
        skipped=run(store,j);assert skipped['status']=='skipped_not_due'and skipped['requests']==0
        later='2026-11-09T19:00:00Z';second=run(store,j,later);assert second['status']=='no_change'and not second['records'];assert original==[dict(r)for r in store.db.execute('SELECT*FROM versions ORDER BY id')]
        def revised(j,url,role,headers):
            code,raw,h=fake(j,url,role,headers)
            if role=='data':x=json.loads(raw);x[1][0]['value']+=10;raw=json.dumps(x).encode()
            return code,raw,h
        third=run(store,j,'2026-12-11T19:00:00Z',revised);assert len(third['records'])==1;assert store.db.execute('SELECT count(*)FROM versions').fetchone()[0]==7
        fourth=run(store,j,'2027-01-12T19:00:00Z');assert fourth['status']=='failed' and not fourth['records'];assert store.db.execute('SELECT count(*)FROM versions').fetchone()[0]==7;assert original==[dict(store.db.execute('SELECT*FROM versions WHERE id=?',(x['id'],)).fetchone())for x in original]
test('Cadence/no-change/semantic revision/reversion preserve immutable version metadata',no_change_revision_reversion)

def conditional():
    with tempfile.TemporaryDirectory()as f:
        store=refresh.Store(f);j=job('fx');run(store,j)
        def unchanged(j,url,role,headers):assert headers.get('If-None-Match');return 304,b'',{}
        # Same query window: call request directly to verify retained-body and original-clock reuse.
        url=refresh.routes(j,'2026-09-30','2026-10-08')[0][1];body,r=refresh.request(store,j,url,'data','synthetic_fixture',STAMP,unchanged);assert r['status']=='no_change'and r['http_status']==304;assert body['fetched_at']==STAMP
        Path(body['path']).write_bytes(b'corrupt');body,r=refresh.request(store,j,url,'data','synthetic_fixture',STAMP,unchanged);assert body is None and r['status']=='failed'
test('Conditional304 requires uncorrupted retained bytes and preserves original fetch clock',conditional)

def access_lock():
    with tempfile.TemporaryDirectory()as f:
        store=refresh.Store(f);j=job('gdp');calls=[]
        def denied(j,url,role,headers):calls.append(url);return 403,b'',{}
        r=run(store,j,fetch=denied);assert r['status']=='failed'and len(calls)==1;other=run(store,job('employment'),fetch=denied);assert len(calls)==1 and other['requests']==0
        assert store.db.execute('SELECT count(*)FROM versions').fetchone()[0]==0
test('HTTP403 origin lock prevents alternate/source retries and fabricated rows',access_lock)

def rate_limit():
    with tempfile.TemporaryDirectory()as f:
        store=refresh.Store(f);j=job('fx');calls=[]
        def limited(j,url,role,headers):calls.append(url);return 429,b'',{'Retry-After':'120'}
        r=run(store,j,fetch=limited);state=json.loads(store.db.execute('SELECT state FROM access').fetchone()[0]);assert state['retry_after']=='120';assert refresh.aware(state['cooldown_until'])==refresh.aware(STAMP)+timedelta(seconds=120)
        run(store,j,'2026-10-08T19:01:00Z',limited);assert len(calls)==1
test('HTTP429 honors actualRetryAfter and does not hammer during cooldown',rate_limit)

def preserved_failure():
    with tempfile.TemporaryDirectory()as f:
        store=refresh.Store(f);j=job('gdp');run(store,j);before=[tuple(r)for r in store.db.execute('SELECT*FROM versions ORDER BY id')]
        def bad(j,url,role,headers):return (200,b'<html>challenge</html>',{})if role=='data'else fake(j,url,role,headers)
        failed=run(store,j,'2026-11-09T19:00:00Z',bad);assert failed['status']=='failed'and not failed['records'];assert before==[tuple(r)for r in store.db.execute('SELECT*FROM versions ORDER BY id')]
        parts=refresh.export_parts(store,[failed],'synthetic_fixture',refresh.now());assert parts;assert all(not json.loads(Path(p['path']).read_text())['payload']['records']for p in parts)
test('Source HTML/schema failure preserves last-good and exports durable row-free failure receipts',preserved_failure)

def legal_cap():
    with tempfile.TemporaryDirectory()as f:
        store=refresh.Store(f);j=job('us');j['max_pages']=1
        def capped(j,url,role,headers):
            code,raw,h=fake(j,url,role,headers);x=json.loads(raw);x.update(count=1000,total_pages=10,next_page_url='https://www.federalregister.gov/api/v1/documents.json?page=2');return code,json.dumps(x).encode(),h
        r=run(store,j,fetch=capped);assert r['status']=='partial';assert r['coverage'][0]['upstream_count']>len(r['records']);assert r['coverage'][0]['truncated']
test('US page cap stays explicit partial coverage instead of claimed daily completeness',legal_cap)

def budget():
    with tempfile.TemporaryDirectory()as f:
        store=refresh.Store(f);r=run(store,job('gdp'),budget=1);assert r['requests']==1 and not r['records'] and r['status']=='partial';assert store.db.execute('SELECT last_good_at FROM job_state').fetchone()[0] is None;assert store.db.execute('SELECT count(*)FROM versions').fetchone()[0]==0
test('Metadata-only exhausted budget yields no invented data rows',budget)

def guard(kind,change,role='data'):
    with tempfile.TemporaryDirectory()as f:
        store=refresh.Store(f)
        def mutated(j,url,r,h):
            code,raw,headers=fake(j,url,r,h)
            if r==role:
                if kind=='fx':raw=change(raw)
                else:x=json.loads(raw);change(x);raw=json.dumps(x).encode()
            return code,raw,headers
        result=run(store,job(kind),fetch=mutated);assert result['status']=='failed';assert not result['records'];assert store.db.execute('SELECT count(*)FROM versions').fetchone()[0]==0
test('GDP unknown geography quarantined',lambda:guard('gdp',lambda x:x[1][0].update(countryiso3code='XYZ')))
test('GDP wrong native indicator quarantined',lambda:guard('gdp',lambda x:x[1][0]['indicator'].update(id='NY.GDP.MKTP.KD')))
test('GDP unmatched year/future row quarantined',lambda:guard('gdp',lambda x:x[1][0].update(date='2030')))
test('GDP false-zero nonzero count quarantined',lambda:guard('gdp',lambda x:x.__setitem__(1,[])))
test('GDP complete-page count mismatch quarantined',lambda:guard('gdp',lambda x:x[0].update(total=99)))
test('GDP definition drift quarantined separately from values',lambda:guard('gdp',lambda x:x[1][0].update(sourceNote='Changed definition'),'metadata'))
test('Employment percent versus fraction never rescaled',lambda:guard('employment',lambda x:x[1][0].update(value=101)))
test('Employment original provider/model metadata drift quarantined',lambda:guard('employment',lambda x:x[1][0].update(sourceOrganization='Different provider'),'metadata'))
test('FX exact32field CSV schema required',lambda:guard('fx',lambda raw:raw.replace(b'UNIT_MULT',b'UNKNOWN_UNIT')))
test('Commodity native unit drift quarantined',lambda:guard('commodity',lambda x:x['series'][0].update(unit_raw='($/dmtu)')))
test('Commodity definition drift quarantined',lambda:guard('commodity',lambda x:x['series'][0].update(definition='Different contract specification')))
test('Commodity missing cell not turned intozero',lambda:guard('commodity',lambda x:next(s for s in x['series']if s['id']=='barley')['cells'][0].update(value=0)))
test('Commodity future month not source history',lambda:guard('commodity',lambda x:x['series'][0]['cells'][0].update(period='2026-10')))
test('Trade conflict ID excluded with all ambiguous attachments',lambda:guard('trade',lambda x:x['cases'][0]['master'].update(CASE_ID='THA-SG-5')))
test('Trade related table foreign ID cannot attach',lambda:guard('trade',lambda x:x['cases'][0]['related']['SG-Products']['rows'][0].update(CASE_ID='MYS-SG-999')))
test('Archive annual range bounded',lambda:expect_bad(lambda:refresh.window(next(j for j in refresh.JOBS['jobs']if j['id']=='gdp.archive'),STAMP,'1990','2026')))
test('FX archive prior2020 or excess calendar range rejected',lambda:expect_bad(lambda:refresh.window(next(j for j in refresh.JOBS['jobs']if j['id']=='fx.archive'),STAMP,'1990-01-01','2026-10-08')))

def clock_guard():
    with tempfile.TemporaryDirectory()as f:
        store=refresh.Store(f);r=run(store,job('gdp'));rid=r['run_ids'][0];w=json.loads(store.db.execute('SELECT receipt FROM runs WHERE id=?',(rid,)).fetchone()[0]);w['completed_at']='2030-01-01T00:00:00Z';store.run(w);expect_bad(lambda:refresh.export_parts(store,[r],'synthetic_fixture',STAMP))
test('Export clock must follow every terminal source run',clock_guard)
def daily_jitter():
    with tempfile.TemporaryDirectory()as f:
        store=refresh.Store(f);j=job('fx');first=run(store,j,'2026-10-08T19:00:03Z');assert first['status']=='updated'
        second=run(store,j,'2026-10-09T19:00:01Z');assert second['status']!='skipped_not_due' and second['requests']==1
test('Daily UTC calendar cadence survives ordinary cron-second jitter',daily_jitter)
def failure_part_window_and_cap():
    for kind,body in [('fx',b'<html>error</html>'),('us',b'x'*(1048576+1))]:
        with tempfile.TemporaryDirectory()as f:
            store=refresh.Store(f);j=job(kind)
            def invalid(j,url,role,headers):return 200,body,{}
            result=run(store,j,fetch=invalid);assert result['status']=='failed'and not result['records']
            parts=refresh.export_parts(store,[result],'synthetic_fixture',refresh.now());assert parts
            for part in parts:
                snap=json.loads(Path(part['path']).read_text());assert not snap['payload']['records']
                for witness in snap['payload']['runs']:
                    assert witness['coverage']['requested_window']['start'];assert witness['rows_changed']==0
                    if kind=='us':assert witness['bytes_read']==1048577 and witness['body_complete']is False
test('Malformed/source-cap failure exports preserve requested windows and cap+1 diagnostics',failure_part_window_and_cap)


report={'schema_version':'dormathon.refresh-offline-tests.v0.19','finished_at':refresh.now(),'status':'passed'if all(t['passed']for t in RESULTS)else'failed','passed':sum(t['passed']for t in RESULTS),'failed':sum(not t['passed']for t in RESULTS),'skipped':0,'provider_calls':0,'site_calls':0,'transport_mode':'synthetic_fixture','binary_decoders':'Separate retained-original check; portable tests use reduced safe intermediate facts','results':RESULTS}
out=Path(__import__('os').environ.get('DORMATHON_REFRESH_TEST_REPORT_DIR',ROOT/'data-local/reports'));out.mkdir(parents=True,exist_ok=True);(out/'offline-tests.json').write_text(json.dumps(report,indent=2)+'\n');print(json.dumps({k:report[k]for k in ['status','passed','failed','provider_calls']}));print(json.dumps([r for r in RESULTS if not r['passed']]));raise SystemExit(0 if report['status']=='passed' else 1)
