from pathlib import Path
import importlib,sys,json,copy,unittest
R=Path(__file__).resolve().parent;sys.path.insert(0,str(R/'adapters'));A=importlib.import_module('ttbd-cvd');X=json.loads((R/'fixtures/six-actual-inputs.safe.json').read_text());P=json.loads((R/'contracts/source-profile.v0.21.json').read_text());EXPECTED=json.loads((R/'fixtures/six-actual-trajectories.json').read_text())
def project(c,receipt=None):return A.project(c['master'],c['related'],receipt or X['receipt'],P['rights']['license_url'],P['source_urls'][0])
class Contract(unittest.TestCase):
 def test_saved_reconstruction(self):self.assertEqual({x['source_record_id']:x for x in[project(c)for c in X['cases']]},{x['source_record_id']:x for x in EXPECTED})
 def test_deterministic(self):self.assertEqual(A.canonical(project(X['cases'][0])),A.canonical(project(X['cases'][0])))
 def test_global_duplicate_fails_before_selection(self):
  r=X['cases'][0]['master']
  with self.assertRaises(ValueError):A.read_envelope([r,copy.deepcopy(r)],[])
 def test_orphan_related_rejected(self):
  r=copy.deepcopy(X['cases'][0]['related'][0]);r['fields']['CASE_ID']='UNKNOWN'
  with self.assertRaises(ValueError):A.read_envelope([X['cases'][0]['master']],[r])
 def test_vintage_drift_fails(self):
  r=copy.deepcopy(X['cases'][0]['master']);r['fields']['V_NUMBER']='Q1_2026'
  with self.assertRaises(ValueError):A.read_envelope([r],[])
 def test_missing_required_source_field_fails(self):
  r=copy.deepcopy(X['cases'][0]['master']);del r['fields']['INIT_DATE']
  with self.assertRaises(ValueError):A.read_envelope([r],[])
 def test_marker_null_preserves_exact_token(self):
  c=copy.deepcopy(X['cases'][0]);c['master']['fields']['F_SUB_DEC']='MI '
  m=next(x for x in project(c)['outcomes']if x['name']=='F_SUB_DEC');self.assertIsNone(m['value']);self.assertEqual(m['value_status'],'unknown');self.assertEqual(m['evidence']['raw_value'],'MI ')
 def test_codes_not_success_reward(self):
  c=copy.deepcopy(X['cases'][0]);c['master']['fields']['F_SUB_DEC']='N';m=next(x for x in project(c)['outcomes']if x['name']=='F_SUB_DEC');self.assertEqual(m['value'],'N');self.assertEqual(m['value_type'],'categorical');self.assertEqual(m['attribution_status'],'not_established')
 def test_no_numeric_code_coercion(self):
  c=copy.deepcopy(X['cases'][0]);c['master']['fields']['F_SUB_DEC']=0
  with self.assertRaises(ValueError):project(c)
 def test_date_precision_not_publication(self):
  r=project(X['cases'][0]);self.assertEqual(r['event']['onset']['precision'],'day');self.assertIsNone(r['event']['onset']['timezone']);self.assertIsNone(r['availability']['publication']['value']);self.assertEqual(r['availability']['source_asof']['precision'],'quarter')
 def test_asof_conservative_acquisition_only(self):
  r=project(X['cases'][0]);self.assertEqual(r['availability']['acquired_at'],X['receipt']['fetched_at']);self.assertEqual(r['availability']['historical_availability_status'],'not_verified')
 def test_no_end_inferred_from_final_stage(self):self.assertIsNone(project(X['cases'][0])['event']['end']['value'])
 def test_invalid_excel_day_rejects(self):
  c=copy.deepcopy(X['cases'][0]);c['master']['fields']['INIT_DATE']=60
  with self.assertRaises(ValueError):project(c)
 def test_empty_group_self_only(self):
  c=copy.deepcopy(X['cases'][0]);c['master']['fields']['CASE_REPCODE']='';r=project(c);self.assertTrue(r['event_group_id'].endswith(r['source_record_id']));self.assertIn('self-only',r['completeness']['limitations'])
 def test_empty_foreign_geo_is_unknown(self):
  c=copy.deepcopy(X['cases'][0]);c['master']['fields']['INV_CTY_NAME']='';self.assertEqual(len(project(c)['event']['geography']),1)
 def test_party_ids_are_rows_not_name_merge(self):
  c=copy.deepcopy(X['cases'][0]);r=copy.deepcopy(c['related'][0]);r['fields']['D_FIRM']='Exact same raw label';r['row']=910;c['related']=[r,copy.deepcopy(r)];c['related'][1]['row']=911;o=project(c);self.assertEqual(len(o['actors']),3);self.assertNotEqual(o['actors'][1]['actor_id'],o['actors'][2]['actor_id']);self.assertEqual(o['actors'][1]['name'],o['actors'][2]['name'])
 def test_collective_not_company_identity(self):
  c=copy.deepcopy(X['cases'][0]);r=copy.deepcopy(c['related'][0]);r['fields']={'CASE_ID':c['master']['fields']['CASE_ID'],'F_FIRM':'All Other Exporters'};c['related']=[r];self.assertEqual(len(project(c)['actors']),1)
 def test_no_notes_leak(self):
  c=copy.deepcopy(X['cases'][0]);c['master']['fields']['NOTES']='SECRET NARRATIVE';self.assertNotIn('SECRET NARRATIVE',A.canonical(project(c)))
 def test_no_negative_examples(self):self.assertFalse(project(X['cases'][0])['completeness']['negative_label_supported'])
 def test_transport_digest_not_snapshot_identity(self):
  r=copy.deepcopy(X['receipt']);r['raw_sha256']='f'*64;o=project(X['cases'][0],r);self.assertEqual(o['provenance']['source_snapshot_id'],'TTBD-CVD-Q4_2024');self.assertEqual(o['provenance']['raw_response_sha256'],'f'*64)
if __name__=='__main__':unittest.main()
