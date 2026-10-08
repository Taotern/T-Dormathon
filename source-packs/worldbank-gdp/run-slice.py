"""Portable deterministic acquisition entrypoint; no services, credentials or automatic retries."""
from pathlib import Path
import argparse, importlib.util, subprocess, sys, os
ROOT=Path(__file__).resolve().parent
parser=argparse.ArgumentParser(description='World Bank GDP bounded historical slices')
parser.add_argument('--acquire',choices=['metadata','recent','historical'],help='One fixed permitted scope; acquisition is separate from Site ingestion')
parser.add_argument('--work-dir',type=Path,default=ROOT,help='Separate writable artifact storage; keep bulk data outside the code repository')
parser.add_argument('--retry-recent',action='store_true',help='Explicit single same-endpoint retry after a confirmed transport timeout, never denial/429')
parser.add_argument('--build',action='store_true',help='Build normalized capped chunks from already retained successful receipts')
parser.add_argument('--test',action='store_true',help='Run offline source fixtures/schema/coverage checks')
args=parser.parse_args()
os.environ["DORMATHON_HISTORY_DATA_DIR"]=str(args.work_dir.resolve())
if args.acquire or args.retry_recent:
 spec=importlib.util.spec_from_file_location('bounded',ROOT/'acquire-bounded.py');module=importlib.util.module_from_spec(spec);spec.loader.exec_module(module)
 if args.retry_recent:
  import json
  prior=json.loads((args.work_dir/'receipts/wb_gdp_2020_2026.json').read_text())
  if prior.get('http_status') is not None or prior.get('status')!='transport_or_schema_failed' or 'timed out' not in prior.get('error',''):raise SystemExit('Explicit retry is allowed only for the recorded transport timeout')
  module.acquire('wb_gdp_2020_2026_retry')
 selected={'metadata':['wb_gdp_metadata','wb_country_dimensions'],'recent':['wb_gdp_2020_2026'],'historical':['wb_gdp_1990_1994']}.get(args.acquire,[])
 for slice_id in selected:module.acquire(slice_id)
if args.build:subprocess.run(['node',str(ROOT/'build-package.mjs')],cwd=ROOT,check=True)
if args.test:subprocess.run(['node',str(ROOT/'test-contract.mjs')],cwd=ROOT,check=True)
if not any([args.acquire,args.retry_recent,args.build,args.test]):parser.print_help()
