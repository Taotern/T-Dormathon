"""Download only original approved official dataset; verify frozen workbook bytes."""
from pathlib import Path
import hashlib,urllib.request,zipfile
ROOT=Path(__file__).resolve().parents[1]
URL='https://archive.ics.uci.edu/static/public/502/online+retail+ii.zip'
EXPECTED='bcbe73b35f5b7babf197fb0cb983a11f5d9ff929078d4aa53d171b1f2df2e980'
out=ROOT/'data/raw';out.mkdir(parents=True,exist_ok=True);archive=out/'online_retail_ii.zip'
if not archive.exists():
 urllib.request.urlretrieve(URL,archive)
with zipfile.ZipFile(archive) as z:
 if z.namelist()!=['online_retail_II.xlsx']:raise RuntimeError('Unexpected archive contents; stop before changing benchmark input.')
 z.extract('online_retail_II.xlsx',out)
f=out/'online_retail_II.xlsx';h=hashlib.sha256(f.read_bytes()).hexdigest()
if h!=EXPECTED:raise RuntimeError('Workbook hash changed; frozen report does not apply. Do not silently substitute revised data: '+h)
print(str(f),f.stat().st_size,h)
