"""Explicit paired saved-data replay; never performs an implicit upstream request."""
from pathlib import Path
import json,hashlib,os,tempfile,shutil,subprocess,argparse
CODE=Path(__file__).resolve().parent
def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest()
def reproduce(path):
 data=Path(path).resolve();manifests=[data/'delivery-current/manifest.json',data/'delivery-history/manifest.json'];policy=data/'contracts/source-manifest.v0.18.json';assert policy.read_bytes()==(CODE/'contracts/source-manifest.v0.18.json').read_bytes(),'Source/data pairing mismatch';total=0;chunks=0
 for p in manifests:
  m=json.loads(p.read_text());assert m['source_manifest_sha256']==sha(policy)
  for c in m['chunks']:assert sha(data/c['path'])==c['sha256']and(data/c['path']).stat().st_size==c['bytes'];chunks+=1
  total+=m['record_count']
 assert total==15435
 with tempfile.TemporaryDirectory(prefix='dormathon-commodity-replay-')as folder:
  target=Path(folder)/'data';shutil.copytree(data,target);env=dict(os.environ);env['DORMATHON_COMMODITY_DATA_DIR']=str(target);subprocess.run(['node',str(CODE/'build-package.mjs')],env=env,check=True)
  for p in manifests:assert(target/p.relative_to(data)).read_bytes()==p.read_bytes(),'Manifest reproduction differs'
  for p in manifests:
   for c in json.loads(p.read_text())['chunks']:assert sha(target/c['path'])==c['sha256'],'Chunk reproduction differs'
 print(json.dumps({'schema_version':'dormathon.commodity-portable-replay.v0.18','status':'passed','cells':total,'chunks':chunks,'current_cells':2835,'historical_cells':12600,'policy_sha256':sha(policy),'provider_calls':0,'site_calls':0,'raw_source_bodies_delivered':False}))
if __name__=='__main__':
 p=argparse.ArgumentParser();sub=p.add_subparsers(dest='command',required=True);r=sub.add_parser('reproduce');r.add_argument('--data-dir',required=True);sub.add_parser('test');args=p.parse_args()
 if args.command=='test':subprocess.run(['node',str(CODE/'test-contract.mjs')],check=True)
 else:reproduce(args.data_dir)
