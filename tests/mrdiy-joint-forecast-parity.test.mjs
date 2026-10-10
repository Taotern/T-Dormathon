import test from 'node:test';
import assert from 'node:assert/strict';
import {compareJointPackages} from '../worker/mrdiy-joint-planner.js';
import {forecastRisk} from '../worker/demand-risk-engine.js';
import {mrdiyDemandOutlook} from '../worker/mrdiy-demand-outlook.js';
const near=(a,b)=>assert.ok(Math.abs(a-b)<=0.00011,`${a} differs from ${b}`);
const demandAdapter=f=>({status:f.status,demand_by_day:f.forecasts.map(x=>x.predicted_units),forecast_ref:f.request_id||f.model_version,scenarioDataMode:'SYNTHETIC_INTERNAL'});
function checkParity(outlook,forecast,options={}){
 assert.equal(outlook.status,'ok');const risk=forecastRisk({forecast,...outlook.frozen_risk_inputs}),joint=compareJointPackages({...options,demand:demandAdapter(forecast)});
 assert.equal(risk.status,'ok');assert.equal(joint.status,'ok');assert.equal(risk.projected_stock_by_day.length,7);
 for(let i=0;i<7;i++){const j=joint.baseline.outcomes.inventory.days[i],r=risk.projected_stock_by_day[i];near(j.ending_available_units,r.closing_free_stock_units);near(j.lost_sales_units,r.shortage_units);}
 near(joint.baseline.outcomes.inventory.shortage_units,risk.total_projected_shortage_units);return {risk,joint};
}
test('joint no-action and forecastRisk have exactly the same constant20/day trajectory',()=>{
 const o=mrdiyDemandOutlook('SC01'),f={...o.forecast,forecasts:o.forecast.forecasts.map(x=>({...x,predicted_units:20}))};const {joint}=checkParity(o,f);assert.deepEqual(joint.baseline.outcomes.inventory.days.map(x=>x.ending_available_units),[40,20,0,0,0,180,160]);
});
test('joint no-action matches actual varying synthetic selected-model forecast at each delay',()=>{
 for(const delay_days of [0,1,2,5]){const options={assumptions:{delay_days}},o=mrdiyDemandOutlook('SC01',options);checkParity(o,o.forecast,options);}
});
test('matching authoritative external reservations do not diverge between forecast and package baseline',()=>{
 const options={commitments:[{case_id:'mrdiy_energy_03',action_id:'practical_rule',fuel_litres:0}]},o=mrdiyDemandOutlook('SC01',options);checkParity(o,o.forecast,options);
});
