import assert from 'node:assert/strict';import fs from 'node:fs';import {test} from 'node:test';
import {runPublic,demandForecast,chooseEnergyWindow} from '../worker/public.js';import {round} from '../worker/common.js';
const fixture=JSON.parse(fs.readFileSync(new URL('./python-oracle.json',import.meta.url))),bundle=JSON.parse(fs.readFileSync(new URL('../data/public-bundle.json',import.meta.url)));
function subset(actual,expected,path='root'){
 if(Array.isArray(expected)){assert.ok(Array.isArray(actual),path);assert.equal(actual.length,expected.length,path+'.length');for(let i=0;i<expected.length;i++)subset(actual[i],expected[i],path+'['+i+']')}
 else if(expected&&typeof expected==='object'){assert.ok(actual&&typeof actual==='object',path);for(const [k,v] of Object.entries(expected))subset(actual[k],v,path+'.'+k)}
 else if(typeof expected==='number'){assert.ok(typeof actual==='number'&&Math.abs(actual-expected)<1e-6,path+': '+actual+' vs '+expected)}
 else if(typeof expected==='string'&&/^\d{4}-\d\d-\d\dT/.test(expected)){assert.equal(Date.parse(actual),Date.parse(expected),path)}else assert.equal(actual,expected,path);
}
for(const item of fixture.cases)test('Python oracle '+item.id,()=>{
 const run=()=>{if(item.operation==='domain_run'){const params={...item.params};for(const [k,v] of Object.entries(item.materialize_nonfinite||{}))params[k]=Number(v);return runPublic(item.domain,bundle.domains[item.domain],params,bundle.sla_durations_hours)}
 if(item.operation==='energy_window'){const i=item.input;return chooseEnergyWindow(i.records,i.observed_at,i.duration_minutes,i.earliest,i.latest)}
 if(item.operation==='energy_emissions'){const i=item.input;return{estimated_task_kgco2:round(i.task_kwh*i.window.best.mean_forecast_gco2_per_kwh/1000,6),estimated_reduction_kgco2:round(i.task_kwh*i.window.estimated_gco2_reduction_per_kwh/1000,6)}}throw Error('unsupported test operation')};
 if(item.expect_rejection)assert.throws(run);else{const actual=run();subset(actual,item.expected);for(const k of item.absent_fields||[])assert.ok(!Object.hasOwn(actual,k),'absent '+k)}
});
test('Repeated requests clone immutable supply/service/energy baselines',()=>{
 const original=JSON.stringify(bundle.domains);runPublic('supply',bundle.domains.supply,{horizon_days:7},bundle.sla_durations_hours);assert.equal(runPublic('supply',bundle.domains.supply,{},bundle.sla_durations_hours).forecast.length,14);
 runPublic('service',bundle.domains.service,{sla_hours:48},bundle.sla_durations_hours);runPublic('service',bundle.domains.service,{sla_hours:168},bundle.sla_durations_hours);assert.ok(!Object.hasOwn(runPublic('service',bundle.domains.service,{},bundle.sla_durations_hours),'scenario'));
 runPublic('energy',bundle.domains.energy,{},bundle.sla_durations_hours);assert.equal(JSON.stringify(bundle.domains),original);
});
