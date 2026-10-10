import argparse,json
from pathlib import Path
p=argparse.ArgumentParser();p.add_argument('--expected',type=Path,required=True);p.add_argument('--actual',type=Path,required=True);a=p.parse_args();e=json.loads(a.expected.read_text());r=json.loads(a.actual.read_text())
for key in ['aggregate','probabilistic_aggregate','paired_comparisons','folds']:
 assert e[key]==r[key],f'Numerical mismatch: {key}'
assert e['source_matrix_sha256']==r['source_matrix_sha256'] or e['source']['raw_file_sha256']==r['source']['raw_file_sha256']
print('Exact equality: all fold/aggregate metrics, quantile diagnostics, model selections and paired intervals. Runtime, timestamps and portable protocol metadata intentionally excluded.')
