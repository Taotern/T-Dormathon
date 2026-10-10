import assert from 'node:assert/strict';
import {createInitialState,createEnvironment,observe} from '../dormathon-dynamics-expansion-20261010/worker/mrdiy-dynamics.js';

const results=[];
for(let delay=0;delay<=5;delay++){
  const state=createInitialState();
  const before=structuredClone(state);
  state.orders.find(x=>x.id==='DEMO_SHIP01').reported_arrival_day+=delay;
  assert.deepEqual(state.cumulative,before.cumulative);
  assert.deepEqual(state.initial,before.initial);
  assert.equal(state.opening_po_reserved_myr,before.opening_po_reserved_myr);
  assert.equal(state.cash_available_myr,before.cash_available_myr);
  observe(state);
  const env=createEnvironment({state,seed:18031});
  for(let day=0;day<7;day++)env.step('none_normal_none');
  const end=env.observation();
  const order=end.orders.find(x=>x.id==='DEMO_SHIP01');
  assert.equal(order.reported_arrival_day,5+delay);
  assert.equal(order.received,delay<=1);
  assert.equal(end.cumulative.received_units,delay<=1?220:20);
  assert.equal(end.cash_available_myr,before.cash_available_myr);
  assert.equal(end.opening_po_reserved_myr,before.opening_po_reserved_myr);
  assert.equal(end.cumulative.new_cash_commitments_myr,0);
  assert.equal(end.history.flatMap(x=>x.receipt_ids).filter(x=>x==='DEMO_SHIP01').length,delay<=1?1:0);
  const env2=createEnvironment({state,seed:18031});
  for(let day=0;day<7;day++)env2.step('none_normal_none');
  assert.deepEqual(env2.observation(),end);
  results.push({additional_delay_days:delay,reported_arrival_day:order.reported_arrival_day,received_within_horizon:order.received,pending_at_terminal:!order.received,receipt_posted_at_most_once:true,opening_reservation_unchanged:true});
}
console.log(JSON.stringify({delay_bridge:'passed',settings:results.length,results},null,2));
