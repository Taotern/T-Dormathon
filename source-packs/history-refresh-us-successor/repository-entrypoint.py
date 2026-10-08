from pathlib import Path
import argparse, hashlib, json, shutil, sqlite3, subprocess, sys, tempfile

ROOT=Path(__file__).resolve().parent
PIN='9c33c077cc30fe4946e519eb795cbc33e9640320623db19db62333c6ad6ca130'
MARKER={'profile_sha256':PIN,'parser_version':'history-refresh-v0.19.2','source_id':'legal_us_federal_register'}
def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest()
def prepare(repo,target):
    dependencies=json.loads((ROOT/'DEPENDENCIES.repo.json').read_text())
    for row in dependencies['repository_files']:
        p=repo/row['path'];assert p.is_file()and p.stat().st_size==row['bytes']and sha(p)==row['sha256'],'Repository dependency drift: '+row['path']
    adapter=ROOT/'adapters/us-federal-register.mjs';assert sha(adapter)==dependencies['US_adapter_sha256']
    target.mkdir(parents=True)
    def copy(source,relative):
        p=target/relative;p.parent.mkdir(parents=True,exist_ok=True);shutil.copyfile(source,p)
    original=repo/'source-packs/history-refresh/refresh.py';code=original.read_text()
    old="'../../data/refresh-source-profiles.v0.19.json'";assert code.count(old)==2 and code.count("'version':'0.19.0'")==1
    code=code.replace(old,"'contracts/source-profiles.json'").replace("'version':'0.19.0'","'version':'0.19.2'")
    (target/'refresh.py').write_text(code)
    canonical=(repo/'source-packs/history-refresh/canonical.mjs').read_text()
    before="'../legal/adapters/normalized-common.mjs'";assert canonical.count(before)==1
    (target/'canonical.mjs').write_text(canonical.replace(before,"'./adapters/legal/normalized-common.mjs'"))
    copy(ROOT/'project-us.mjs','project.mjs')
    copy(adapter,'adapters/legal/us-federal-register.mjs')
    for name in ['legal-common.mjs','normalized-common.mjs']:copy(repo/'source-packs/legal/adapters'/name,'adapters/legal/'+name)
    copy(repo/'data/refresh-source-profiles.us-v0.19.2.json','contracts/source-profiles.json')
    jobs=json.loads((repo/'source-packs/history-refresh/contracts/refresh-jobs.json').read_text());jobs['profile_id']='dormathon-approved-history-refresh-v0.19.2';jobs['profile_sha256']=PIN;jobs['jobs']=[j for j in jobs['jobs']if j['id']=='us.current']
    assert len(jobs['jobs'])==1 and jobs['jobs'][0]['max_requests']==4 and jobs['jobs'][0]['cadence_days']==1
    (target/'contracts/refresh-jobs.json').write_text(json.dumps(jobs,ensure_ascii=False,indent=2)+'\n')
    # Eight runtime files plus a small derivation witness; no raw/state/full package duplication.
    files=[{'path':str(p.relative_to(target)),'sha256':sha(p),'bytes':p.stat().st_size}for p in sorted(target.rglob('*'))if p.is_file()]
    (target/'RUNTIME-VIEW.json').write_text(json.dumps({'profile_sha256':PIN,'repository_dependencies_sha256':sha(ROOT/'DEPENDENCIES.repo.json'),'transformations':['Exact legacy runtime profile path redirects to the approved successor file','Producer caption0.19.2','Canonical helper import redirects to the same pinned normalized-common module','US-only typed projector; original shared fetch/store/export behavior unchanged','Only us.current job; other source/history entrypoints untouched'],'files':files},indent=2)+'\n')
    return target
def state_guard(state):
    marker=state/'state-profile.json'
    if marker.exists():
        assert json.loads(marker.read_text())==MARKER,'Do not reuse a mismatched or invalid profile marker'
    db=state/'refresh.sqlite'
    if db.exists():
        c=sqlite3.connect('file:'+str(db)+'?mode=ro',uri=True)
        assert not c.execute("SELECT source_id FROM versions WHERE source_id!='legal_us_federal_register' LIMIT 1").fetchone(),'Do not migrate mixed-source state'
        assert all(json.loads(receipt)['source_id']=='legal_us_federal_register'for receipt, in c.execute('SELECT receipt FROM runs'))
        marker=state/'state-profile.json';assert marker.exists()and json.loads(marker.read_text())==MARKER,'Do not relabel an unmarked or earlier-profile state'
if __name__=='__main__':
    a=argparse.ArgumentParser(description='US-current-only foreground/replay entrypoint using exact curated repository dependencies; no scheduler/upload.');a.add_argument('--repo',type=Path,required=True);a.add_argument('--state-dir',type=Path,required=True);a.add_argument('--acquire',action='store_true');a.add_argument('--replay-root',type=Path);x=a.parse_args();assert not(x.acquire and x.replay_root),'Select genuine acquisition or saved replay, never both'
    with tempfile.TemporaryDirectory(prefix='dormathon-us-repo-view-')as temp:
        code=prepare(x.repo,Path(temp)/'engine')
        if x.replay_root:
            raise SystemExit(subprocess.call([sys.executable,str(ROOT/'replay-three-saved.py'),'--code',str(code),'--original-root',str(x.replay_root),'--output',str(x.state_dir)]))
        state_guard(x.state_dir)
        if not x.acquire:
            print(json.dumps({'job':'us.current','profile_sha256':PIN,'mode':'foreground_explicit','maximum_provider_requests':4,'requires_explicit_acquire':True,'no_base_ZIP_required':True,'scheduler_created':False,'automatic_upload':False,'runtime_files':sum(p.is_file()for p in code.rglob('*')),'archive':False},indent=2));raise SystemExit(0)
        x.state_dir.mkdir(parents=True,exist_ok=True);marker=x.state_dir/'state-profile.json'
        if not marker.exists():marker.write_text(json.dumps(MARKER,indent=2)+'\n')
        raise SystemExit(subprocess.call([sys.executable,str(code/'refresh.py'),'run','--state-dir',str(x.state_dir),'--job','us.current','--max-requests','4','--acquire']))
