"""Explicit saved-payload replay and fixed route listing; no implicit acquisition."""
from pathlib import Path
import argparse,hashlib,json,os,shutil,subprocess,tempfile
CODE=Path(__file__).resolve().parent
def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest()
def reproduce(path):
 data=Path(path).resolve();manifest=json.loads((data/'delivery/manifest.json').read_text());assert manifest['record_count']==60 and manifest['source_selected_candidates']==61 and manifest['quarantined_identities']==['THA-SG-5']
 assert sha(data/'contracts/source-manifest.v0.17.json')==manifest['source_manifest_sha256']
 assert sha(data/'safe-data/safeguard-cases-2020-2024.json')==manifest['safe_payload_sha256']
 assert (data/'contracts/source-manifest.v0.17.json').read_bytes()==(CODE/'contracts/source-manifest.v0.17.json').read_bytes(),'Source/data pair mismatch'
 for c in manifest['chunks']:assert sha(data/c['path'])==c['sha256']and (data/c['path']).stat().st_size==c['bytes']
 with tempfile.TemporaryDirectory(prefix='dormathon-ttbd-replay-')as folder:
  out=Path(folder)/'data';shutil.copytree(data,out);env=dict(os.environ);env['DORMATHON_TRADE_DATA_DIR']=str(out);subprocess.run(['node',str(CODE/'build-package.mjs')],env=env,check=True)
  assert (out/'delivery/manifest.json').read_bytes()==(data/'delivery/manifest.json').read_bytes(),'Reconstructed manifest differs'
  for c in manifest['chunks']:assert sha(out/c['path'])==c['sha256'],'Reconstructed chunk differs'
 print(json.dumps({'schema_version':'dormathon.trade-portable-replay.v0.17','status':'passed','rows':60,'chunks':len(manifest['chunks']),'manifest_sha256':sha(data/'delivery/manifest.json'),'policy_sha256':manifest['source_manifest_sha256'],'provider_calls':0,'site_calls':0,'original_workbook_delivered':False,'upstream_byte_verification':'Original ZIP/workbook/catalog hashes are retained acquisition witnesses; complete original-byte-to-safe extraction was independently verified by producer-side xlrd and pure-reader parity, not redownloaded.'}))
if __name__=='__main__':
 p=argparse.ArgumentParser();sub=p.add_subparsers(dest='command',required=True);r=sub.add_parser('reproduce');r.add_argument('--data-dir',required=True);sub.add_parser('test');sub.add_parser('routes');args=p.parse_args()
 if args.command=='test':subprocess.run(['node',str(CODE/'test-contract.mjs')],check=True)
 elif args.command=='reproduce':reproduce(args.data_dir)
 else:
  from importlib.util import spec_from_file_location,module_from_spec
  s=spec_from_file_location('fixed',CODE/'acquire-fixed.py');m=module_from_spec(s);s.loader.exec_module(m);print(json.dumps({'fixed_data_routes':m.URLS,'network_calls':0,'acquisition':'Set DORMATHON_TRADE_DATA_DIR to a separate runtime directory; invoke acquire-fixed.py codebook or safeguards explicitly. Existing attempt receipts prevent automatic repeat. Source/rights/schema changes require reviewed export, not automatic admission.'},indent=2))
