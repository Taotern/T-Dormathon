from pathlib import Path
import argparse,os,subprocess,sys
ROOT=Path(__file__).resolve().parent
parser=argparse.ArgumentParser(description='Fixed ECB daily USD/EUR and MYR/EUR source, with separate code/bulk storage')
parser.add_argument('--work-dir',type=Path,default=ROOT)
parser.add_argument('--acquire',choices=['probe','backfill'],help='One fixed read; backfill requires retained passing probe review; never automatic retry')
parser.add_argument('--build',action='store_true',help='Project retained original CSV facts without network')
parser.add_argument('--test',action='store_true',help='Run twenty offline source-contract checks')
args=parser.parse_args();os.environ['DORMATHON_HISTORY_DATA_DIR']=str(args.work_dir.resolve())
if args.acquire:subprocess.run([sys.executable,str(ROOT/'acquire-fixed.py'),args.acquire],check=True)
if args.build:subprocess.run(['node',str(ROOT/'build-package.mjs')],check=True)
if args.test:subprocess.run(['node',str(ROOT/'test-contract.mjs')],check=True)
if not any([args.acquire,args.build,args.test]):parser.print_help()
