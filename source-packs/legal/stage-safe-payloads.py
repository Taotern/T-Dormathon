"""Saved-response metadata projection only. No network or raw article redistribution."""
from pathlib import Path
import json,hashlib,xml.etree.ElementTree as ET
ROOT=Path(__file__).resolve().parent
def sha(b):return hashlib.sha256(b).hexdigest()
A='http://www.w3.org/2005/Atom';M='http://www.legislation.gov.uk/namespaces/metadata'
FIELDS=['document_number','title','type','publication_date','html_url','pdf_url','agencies','effective_on','comments_close_on','citation','cfr_references','docket_ids','regulation_id_numbers','action']
(ROOT/'safe-data').mkdir(exist_ok=True);payloads={}
for scope in ['uk_recent','uk_2020','us_recent','us_2020']:
 receipt_path=ROOT/'receipts'/f'{scope}.json';receipt=json.loads(receipt_path.read_text());raw=(ROOT/receipt['retained_path']).read_bytes()
 assert receipt['http_status']==200 and receipt['body_complete'] and sha(raw)==receipt['upstream_raw_sha256']
 if scope.startswith('uk_'):
  doc=ET.fromstring(raw)
  for entry in doc.findall('{'+A+'}entry'):
   for element in list(entry):
    if element.tag not in ['{'+A+'}'+x for x in ['id','title','link','published','updated']] and not element.tag.startswith('{'+M+'}'):entry.remove(element)
  safe=ET.tostring(doc,encoding='utf-8',xml_declaration=True);extension='xml'
 else:
  doc=json.loads(raw);doc['results']=[{key:row[key] for key in FIELDS}for row in doc['results']];doc.pop('description',None)
  safe=(json.dumps(doc,ensure_ascii=False,indent=2)+'\n').encode();extension='json'
 path='safe-data/'+scope+'.'+extension;(ROOT/path).write_bytes(safe)
 payloads[scope]={'path':path,'bytes':len(safe),'sha256':sha(safe),'original_response_sha256':sha(raw),'original_response_delivered':False,'original_receipt_path':str(receipt_path.relative_to(ROOT)),'original_receipt_sha256':sha(receipt_path.read_bytes()),'scope':'Complete returned metadata page, excluding summary/abstract/author/body fields; original upstream response hash is a separate witness'}
out={'schema_version':'dormathon.legal-safe-payloads.v0.16','raw_response_distribution':'Original responses remain research-side only; safe metadata projections are portable','payloads':payloads}
(ROOT/'contracts/retained-safe-payload-manifest.json').write_text(json.dumps(out,indent=2)+'\n')
print(json.dumps({k:{'bytes':v['bytes'],'sha256':v['sha256']}for k,v in payloads.items()}))
