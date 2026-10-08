from pathlib import Path
import argparse,os,subprocess,sys
ROOT=Path(__file__).resolve().parent
parser=argparse.ArgumentParser(description='Fixed modeled-ILO unemployment foundation, separate code and bulk storage')
parser.add_argument('--work-dir',type=Path,default=ROOT)
parser.add_argument('--acquire',action='store_true',help='Two fixed public reads, one attempt each; no automatic retry, Linux overall deadline')
parser.add_argument('--build',action='store_true',help='Project already retained licensed observations without network')
parser.add_argument('--test',action='store_true',help='Twenty source contract checks without network')
args=parser.parse_args();os.environ['DORMATHON_HISTORY_DATA_DIR']=str(args.work_dir.resolve())
if args.acquire:subprocess.run([sys.executable,str(ROOT/'acquire-bounded.py')],check=True)
if args.build:subprocess.run(['node',str(ROOT/'build-package.mjs')],check=True)
if args.test:subprocess.run(['node',str(ROOT/'test-contract.mjs')],check=True)
if not any([args.acquire,args.build,args.test]):parser.print_help()
