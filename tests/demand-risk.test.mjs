import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {forecastDemand,forecastRisk} from '../worker/demand-risk-engine.js';
import {mrdiyDemandOutlook} from '../worker/mrdiy-demand-outlook.js';
import {MRDIY_SCENARIO} from '../worker/mrdiy-fixture.js';
const clone=x=>structuredClone(x);
const fixture=mrdiyDemandOutlook('SC01');
const fReq=()=>({...fixture.forecast,history:clone(fixture.history),model:'adaptive_past_validation'});
const rReq=()=>({forecast:clone(fixture.forecast),...clone(fixture.frozen_risk_inputs)});
const near=(a,b)=>assert.ok(Math.abs(a-b)<=1e-8*Math.max(1,Math.abs(b)),`${a} != ${b}`);

test('SC01 dated synthetic chain includes both receipts and alerts before next arrival',()=>{
 assert.equal(fixture.status,'ok');assert.equal(fixture.history.length,196);assert.equal(fixture.forecast.forecasts[0].date,'2026-10-10');assert.equal(fixture.risk.next_arrival_date,'2026-10-13');assert.equal(fixture.risk.first_projected_shortage_date,'2026-10-12');assert.equal(fixture.risk.shortage_before_next_arrival,true);assert.equal(fixture.risk.projected_stock_by_day[3].arrival_units,20);assert.equal(fixture.risk.projected_stock_by_day[5].arrival_units,200);assert.equal(fixture.forecast.selection.population_scope,'supplied_single_series_demo');assert.equal(fixture.forecast.selection.empirical_performance_transfer,false);
});
test('all Python point candidates and empirical quantiles match JS on three real benchmark SKU prefixes',()=>{
 const refs=JSON.parse(fs.readFileSync(new URL('./demand-risk-parity-fixtures.json',import.meta.url),'utf8'));
 for(const ref of refs){const start=Date.parse(ref.origin+'T00:00:00Z')-(ref.history_units.length-1)*86400000,history=ref.history_units.map((v,i)=>({date:new Date(start+i*86400000).toISOString().slice(0,10),positive_sales:v,observation_status:'source_declared_complete',complete_day:true}));
  for(const [model,expected] of Object.entries(ref.point_predictions)){const f=forecastDemand({org_id:'external_uci_online_retail_ii',item_id:ref.item_id,assumption_set_id:'uci-ledger',scenarioDataMode:'EXTERNAL_BENCHMARK',history,model,quantile_weeks:12,knowledge_as_of:ref.origin+'T23:59:59Z',world_time:ref.origin+'T23:59:59Z'});assert.equal(f.status,'ok');expected.forEach((x,i)=>near(f.forecasts[i].predicted_units,x));f.cumulative.quantile_estimates.forEach((x,i)=>near(x.units,ref.weekly_quantiles_12weeks[i]));}
 }
});
test('history missing labels, gaps, duplicates, negative, future or unavailable labels abstain',()=>{
 for(const change of [r=>r.history[0].positive_sales=null,r=>r.history[9].observation_status='unknown',r=>r.history.splice(20,1),r=>r.history[9].date=r.history[8].date,r=>r.history[0].positive_sales=-1,r=>r.history.at(-1).date='2026-10-11',r=>r.history[0].available_at='2026-10-12T00:00:00Z']){const r=fReq();change(r);assert.equal(forecastDemand(r).status,'insufficient_data');}
});
test('unknown model, unsupported data mode, partial same day and stale history do not return predictions',()=>{
 let r=fReq();r.model='magic-neural-net';assert.equal(forecastDemand(r).status,'unsupported');r=fReq();r.scenarioDataMode='PUBLIC_DISCLOSURE';assert.equal(forecastDemand(r).status,'insufficient_data');r=fReq();r.world_time='2026-10-12T00:00:00Z';assert.equal(forecastDemand(r).status,'insufficient_data');r=fReq();r.knowledge_as_of='2026-10-09T12:00:00+08:00';r.history.at(-1).complete_day=false;assert.equal(forecastDemand(r).status,'insufficient_data');
});
test('all-zero demand gives deterministic zero forecasts and declared candidate-order ties',()=>{
 const r=fReq();r.history.forEach(x=>x.positive_sales=0);const f=forecastDemand(r);assert.equal(f.status,'ok');assert.equal(f.model,'zero');assert.equal(f.cumulative.predicted_units,0);assert.equal(f.selection.quantile_weeks,8);assert.equal(f.selection.validation_weekly_WAPE.mean_28,null);
});
test('quantile intervals remain empirical and daily bounds need not sum to weekly quantiles',()=>{
 const f=fixture.forecast;assert.equal(f.calibration_status,'EMPIRICAL_UNCALIBRATED');assert.notEqual(f.forecasts.reduce((s,x)=>s+x.high_units,0),f.cumulative.quantile_estimates[2].units);assert.equal(f.risk,undefined);
});
test('stock conservation and free stock exclude reservations, quarantine and saved commitments',()=>{
 const r=rReq();r.inventory.on_hand_units=200;r.inventory.reserved_units=20;r.inventory.quarantined_units=10;r.inventory.committed_units=15;const risk=forecastRisk(r);assert.equal(risk.status,'ok');assert.equal(risk.initial_free_stock_units,155);
 for(const row of risk.projected_stock_by_day){near(row.opening_free_stock_units+row.arrival_units,row.closing_free_stock_units+row.demand_units-row.shortage_units);assert.ok(row.closing_free_stock_units>=0);assert.ok(row.shortage_units>=0);}
});
test('unknown or overcommitted stock, incomplete arrivals, foreign scope and duplicate shipments abstain',()=>{
 for(const change of [r=>r.inventory.reserved_units=null,r=>r.inventory.committed_units=1e6,r=>r.arrivals_complete=false,r=>r.arrivals[0].quantity_units=null,r=>r.inventory.org_id='foreign_org',r=>r.arrivals[0].item_id='foreign_item',r=>r.arrivals.push(clone(r.arrivals[0])),r=>r.arrivals[0].date='2026-10-09',r=>r.arrivals[0].observation_status='unknown',r=>r.inventory.as_of='2026-10-09T08:00:00+08:00']){const r=rReq();change(r);const out=forecastRisk(r);assert.equal(out.status,'insufficient_data');assert.deepEqual(out.projected_stock_by_day,[]);assert.equal(out.conditional_path_shortage_fraction,null);}
});
test('same-day receipt precedes demand and empty complete registry differs from unknown registry',()=>{
 const r=rReq();r.inventory.on_hand_units=0;r.inventory.reserved_units=0;r.inventory.quarantined_units=0;r.inventory.committed_units=0;r.arrivals=[{...r.arrivals[0],date:'2026-10-10',quantity_units:10000}];let o=forecastRisk(r);assert.equal(o.status,'ok');assert.equal(o.total_projected_shortage_units,0);assert.equal(o.conditional_path_shortage_fraction,0);r.arrivals=[];o=forecastRisk(r);assert.equal(o.status,'ok');assert.equal(o.next_arrival_date,null);assert.equal(o.shortage_before_next_arrival,null);assert.ok(o.total_projected_shortage_units>0);r.arrivals_complete=false;assert.equal(forecastRisk(r).status,'insufficient_data');
});
test('moving arrivals later cannot improve same-demand lost-sales shortage',()=>{
 const a=rReq(),b=clone(a);b.arrivals=b.arrivals.map(x=>({...x,date:'2026-10-20'}));assert.ok(forecastRisk(b).total_projected_shortage_units>=forecastRisk(a).total_projected_shortage_units);
});
test('all 40 case responses truthfully scope unsupported or insufficient cases; never mutate fixture',()=>{
 const before=JSON.stringify(MRDIY_SCENARIO);for(const c of MRDIY_SCENARIO.cases){const r=mrdiyDemandOutlook(c.case_id);assert.ok(['ok','unsupported','insufficient_data'].includes(r.status));if(r.status==='ok'){assert.equal(r.scenarioDataMode,'SYNTHETIC_INTERNAL');assert.equal(r.forecast.status,'ok');assert.equal(r.risk.status,'ok');}}assert.equal(JSON.stringify(MRDIY_SCENARIO),before);
});
test('adapter handles explicit zero, unknown and invalid commitments without treating unknown as zero',()=>{
 const snap=clone(MRDIY_SCENARIO);snap.cases.find(c=>c.scenario_ref==='SC01').config.daily_sales_units=null;assert.equal(mrdiyDemandOutlook('SC01',{snapshot:snap}).status,'insufficient_data');assert.equal(mrdiyDemandOutlook('SC01',{commitments:[{stock:[{node_id:'DEMO_ST01',sku_id:'DEMO_SKU01',units:null}]}]}).status,'insufficient_data');const valid={case_id:'SC01',action_id:'practical_rule',stock:[{node_id:'DEMO_ST01',sku_id:'DEMO_SKU01',units:20}]};const r=mrdiyDemandOutlook('SC01',{commitments:[valid]});assert.equal(r.status,'ok');assert.equal(r.risk.initial_free_stock_units,60);assert.equal(r.frozen_risk_inputs.resolved_commitments[0].stock[0].node_id,'DEMO_ST02');assert.equal(mrdiyDemandOutlook('SC01',{commitments:[valid,{...valid,case_id:'demo_supply_01'}]}).status,'insufficient_data');assert.equal(mrdiyDemandOutlook('SC01',{commitments:[{case_id:'SC01',action_id:'unsafe_transfer'}]}).status,'insufficient_data');
});
test('risk rejects malformed or absent origin/clocks and inconsistent world date without throwing',()=>{
 for(const change of [r=>r.forecast.forecast_origin=null,r=>r.forecast.forecast_origin='invalid',r=>r.forecast.knowledge_as_of='invalid',r=>r.forecast.world_time=null,r=>r.forecast.world_time='2026-10-11T08:00:00+08:00',r=>r.forecast.org_id=null]){const r=rReq();change(r);const o=forecastRisk(r);assert.equal(o.status,'insufficient_data');assert.deepEqual(o.projected_stock_by_day,[]);}
 assert.equal(forecastRisk(null).status,'insufficient_data');assert.equal(forecastDemand(null).status,'insufficient_data');
 const crafted=rReq();crafted.forecast.forecast_origin=null;crafted.forecast.world_time='1970-01-02T00:00:00Z';crafted.forecast.forecasts=crafted.forecast.forecasts.map((r,i)=>({...r,date:`1970-01-0${i+2}`}));assert.equal(forecastRisk(crafted).status,'insufficient_data');
});
