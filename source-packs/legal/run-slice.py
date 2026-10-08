"""Portable deterministic saved-data replay; never collects implicitly."""
from pathlib import Path
import argparse,hashlib,json,os,shutil,subprocess,tempfile
ROOT=Path(__file__).resolve().parent
def sha(path):return hashlib.sha256(path.read_bytes()).hexdigest()
def reproduce(data_dir):
 source=Path(data_dir).resolve();expected=json.loads((source/'delivery/manifest.json').read_text())
 assert expected['record_count']==249 and expected['source_counts']=={'legal_uk_legislation_publications':49,'legal_us_federal_register':200},'Unexpected pilot scope'
 for descriptor in expected['chunks']:
  p=source/descriptor['path'];assert sha(p)==descriptor['sha256'] and p.stat().st_size==descriptor['bytes'],'Frozen chunk mismatch'
 policy=source/'contracts/source-manifest.v0.16.json';assert sha(policy)==expected['source_manifest_sha256'],'Frozen policy mismatch'
 for file in ['rights-review.v0.16.json','retained-safe-payload-manifest.json','source-manifest.v0.16.json']:
  assert (ROOT/'contracts'/file).read_bytes()==(source/'contracts'/file).read_bytes(),'Producer source/data pairing mismatch '+file
 with tempfile.TemporaryDirectory(prefix='dormathon-legal-replay-') as folder:
  target=Path(folder)/'data';shutil.copytree(source,target);env=dict(os.environ);env['DORMATHON_LEGAL_DATA_DIR']=str(target)
  subprocess.run(['node',str(ROOT/'build-package.mjs')],env=env,check=True)
  assert (target/'delivery/manifest.json').read_bytes()==(source/'delivery/manifest.json').read_bytes(),'Manifest reconstruction differs'
  for descriptor in expected['chunks']:assert sha(target/descriptor['path'])==descriptor['sha256'],'Non-deterministic chunk projection'
  assert sha(target/'contracts/source-manifest.v0.16.json')==expected['source_manifest_sha256'],'Policy reconstruction differs'
 result={'schema_version':'dormathon.legal-portable-replay.v0.16','status':'passed','reproduced_chunks':len(expected['chunks']),'reproduced_rows':expected['record_count'],'manifest_sha256':sha(source/'delivery/manifest.json'),'source_policy_sha256':sha(policy),'source_requests':0,'site_requests':0,'original_upstream_bytes_delivered':False,'upstream_raw_hash_verification':'Original receipt digest retained; safe projection byte hashes and all normalized chunk hashes independently verified. Original byte-to-projection equality is separately attested by saved-source parity review.'}
 print(json.dumps(result))
if __name__=='__main__':
 p=argparse.ArgumentParser();sub=p.add_subparsers(dest='command',required=True);r=sub.add_parser('reproduce');r.add_argument('--data-dir',required=True);sub.add_parser('test');args=p.parse_args()
 if args.command=='test':subprocess.run(['node',str(ROOT/'test-contract.mjs')],check=True)
 else:reproduce(args.data_dir)
