import {actionIds,assert} from './retail-planning-utils.js';
export function noActionPolicy(observation,available){const ids=actionIds(available);assert(ids.includes('none_normal_none'),'No-action package must stay feasible');return 'none_normal_none';}
/** Frozen before training/test. Local practical thresholds, not oracle access. */
export function practicalPolicy(obs,available){
 const legal=actionIds(available),orders=(obs.orders??[]).filter(o=>!o.received),nearby=orders.some(o=>o.reported_arrival_day<=obs.day+1);
 const belief=obs.demand_belief??{},mean=typeof belief==='number'?belief:(belief.mean_units??belief.mean??belief.expected_units??belief.estimate_units??20*Math.exp(belief.log_deviation??0));
 const preferInventory=obs.inventory_units<mean*1.5&&!nearby?'transfer40':obs.inventory_units<mean*2.5&&!orders.length&&obs.day<obs.horizon_days-2?'order100':'none';
 const preferStaff=(obs.fatigue>0.5||obs.backlog_hours>4)?'support':'normal',preferEnergy=obs.indoor_temperature_c>30?'cool':'none';
 const ranked=legal.map(id=>{const [i,s,e]=id.split('_');return {id,cost:(i===preferInventory?0:3)+(s===preferStaff?0:1)+(e===preferEnergy?0:1)+(i!=='none'&&preferInventory==='none'?2:0)};});
 ranked.sort((a,b)=>a.cost-b.cost||a.id.localeCompare(b.id));return ranked[0].id;
}
