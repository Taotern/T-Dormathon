"""Read-only frozen-code oracle; every row below is a synthetic unit fixture."""
import sys,json,math,hashlib,subprocess
from pathlib import Path
from datetime import datetime,timezone
source=Path(sys.argv[1]);assert subprocess.check_output(['git','-C',str(source),'rev-parse','HEAD'],text=True).strip()=='eaa24be250ff9afda59fb92f9553f292ce3e7ea2'
sys.path.insert(0,str(source));from backend.analysis import validate_payload,analyze_records
clock=datetime(2026,10,7,23,0,tzinfo=timezone.utc);cases=[]
bases={'supply':{'sku':'S','on_hand':10,'daily_demand':5,'lead_time_days':4},'procurement':{'invoice_id':'I','vendor':'V','amount':100,'currency':'USD','due_date':'2026-10-07'},'service':{'ticket_id':'T','opened_at':'2026-10-07T01:00:00Z','sla_hours':24,'status':'open'},'energy':{'meter_id':'M','period_start':'2026-10-01','period_end':'2026-10-02','kwh':20}}
def add_validation(name,domain,patch=None,payload=None):
 p=payload if payload is not None else {**bases[domain],**(patch or {})};c={'id':name,'operation':'validate','domain':domain,'payload':p}
 try:c['expected']=validate_payload(domain,p)
 except Exception as e:c.update(expect_rejection=True,python_error=type(e).__name__)
 cases.append(c)
for value in ['0x10','0b10','0o10','1_000','1_0.2_5','１２３','٣','٣.٥','+1e2',' .5 ','1.','1__0','1_','_1','1_.0','1._0','1e_2','1e+2','1e309','NaN','Infinity','-0','-1','',None,True,False]:add_validation('supply_numeric_'+str(len(cases)),'supply',{'on_hand':value})
for value in [0,1,1.25,'1_000','0x10',True,-1]:add_validation('invoice_amount_'+str(len(cases)),'procurement',{'amount':value})
for value in ['usd','US','123','€UR','ZZZ']:add_validation('currency_'+value,'procurement',{'currency':value})
for value in ['open','in_progress','resolved','closed','DONE']:add_validation('ticket_state_'+value,'service',{'status':value})
add_validation('open_with_resolution','service',{'resolved_at':'2026-10-07T02:00Z'})
add_validation('resolved_before_open','service',{'status':'resolved','resolved_at':'2026-09-30'})
add_validation('resolved_valid','service',{'status':'resolved','resolved_at':'2026-10-07T02:00Z'})
for value in ['2026-02-29','2024-02-29','0099-01-01','0000-01-01','2026-10-07T09:00:00+09:00','2026-10-07T01:00','2026-10-07T01:00:00.1234567Z']:add_validation('expiry_'+str(len(cases)),'supply',{'expiry_date':value})
for patch in [{'period_end':'2026-10-01'},{'period_end':'2026-09-30'},{'waste_kg':10,'recycled_kg':11},{'waste_kg':0,'recycled_kg':0},{'recycled_kg':2}]:add_validation('energy_validation_'+str(len(cases)),'energy',patch)
add_validation('missing_field','supply',payload={'sku':'S','on_hand':1})
add_validation('too_many_fields','supply',payload={**bases['supply'],**{'extra'+str(i):i for i in range(80)}})
def record(domain,payload,index=0,occur='2026-10-07T22:00:00Z'):return{'id':'fixture_'+str(index),'domain':domain,'occurred_at':occur,'source_id':'synthetic_source','payload':payload}
def add_analysis(name,domain,rows):
 out=analyze_records(rows,domain,clock);expected={'metrics':out['metrics'],'findings':[{k:f[k] for k in ['rule_id','title','severity','evidence_ids']} for f in out['findings']]}
 cases.append({'id':name,'operation':'analyze','domain':domain,'records':rows,'clock':clock.isoformat(),'expected':expected})
for domain in bases:add_analysis('empty_'+domain,domain,[])
for on_hand,demand in [(1,4),(3,20),(1.25,5),(0,0),(99,0),(10,2),(1e308,1)]:add_analysis('supply_coverage_'+str(len(cases)),'supply',[record('supply',{**bases['supply'],'on_hand':on_hand,'daily_demand':demand})])
add_analysis('supply_latest_timezone','supply',[record('supply',{**bases['supply'],'on_hand':99},0,'2026-10-07T09:00+09:00'),record('supply',{**bases['supply'],'on_hand':1},1,'2026-10-07T01:00:00.001Z')])
add_analysis('supply_fulfillment_expiry','supply',[record('supply',{**bases['supply'],'ordered_qty':100,'fulfilled_qty':94,'reorder_point':11,'expiry_date':'2026-10-01'})])
for amount in [.125,.15,2.675,10.005,1e308]:add_analysis('invoice_round_'+str(len(cases)),'procurement',[record('procurement',{**bases['procurement'],'amount':amount})])
add_analysis('invoice_duplicate_multicurrency','procurement',[record('procurement',bases['procurement'],0),record('procurement',{**bases['procurement'],'amount':200},1,'2026-10-07T22:10Z'),record('procurement',{**bases['procurement'],'currency':'EUR'},2)])
add_analysis('invoice_matching_and_overpay','procurement',[record('procurement',{**bases['procurement'],'due_date':'2026-10-06','paid_amount':120,'po_amount':90,'received_amount':95})])
for opened,sla in [('2026-10-07T00:00Z',24),('2026-10-07T03:00Z',24),('2026-10-06T22:00Z',24),('2026-10-08T00:00Z',24)]:add_analysis('ticket_elapsed_'+str(len(cases)),'service',[record('service',{**bases['service'],'opened_at':opened,'sla_hours':sla})])
add_analysis('ticket_resolved_elapsed','service',[record('service',{**bases['service'],'status':'resolved','resolved_at':'2026-10-07T22:00Z','sla_hours':20})])
for payload in [bases['energy'],{**bases['energy'],'baseline_kwh':10,'waste_kg':1,'recycled_kg':.25},{**bases['energy'],'baseline_kwh':0,'waste_kg':0,'recycled_kg':0}]:add_analysis('energy_metric_'+str(len(cases)),'energy',[record('energy',payload)])
add_analysis('energy_duplicate_overlap','energy',[record('energy',bases['energy'],0),record('energy',{**bases['energy'],'kwh':30},1,'2026-10-07T22:10Z'),record('energy',{**bases['energy'],'period_start':'2026-10-01T12:00Z','period_end':'2026-10-02T12:00Z','kwh':10},2)])
report={'source_commit':'eaa24be250ff9afda59fb92f9553f292ce3e7ea2','source_sha256':hashlib.sha256((source/'backend/analysis.py').read_bytes()).hexdigest(),'fixture_only_synthetic':True,'cases':cases}
Path('tests/operational-oracle.json').write_text(json.dumps(report,ensure_ascii=False,allow_nan=False,separators=(',',':')))
print('operational oracle',len(cases),'cases')
