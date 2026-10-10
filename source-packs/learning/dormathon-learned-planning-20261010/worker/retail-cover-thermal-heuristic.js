import {transition} from './retail-dynamics-adapter.js';import {actionIds,assert} from './retail-planning-utils.js';
export const COVER_THERMAL_VERSION='dormathon.cover-thermal-myopic.v1';
/** Protocol2 baseline, prespecified after diagnosing passive legacy thresholds.
 * Daily cover from PUBLIC fitted forecast; only receipts due TODAY count today.
 * Remaining-horizon stock-position check for orders. Feasible staff/cooling choice
 * minimizes deterministic one-day declared cost at authored outdoor mean34C.
 * No search tree, learned weights, actual scenario seed or realized demand input.
 */
export function createCoverThermalPolicy(calibration){
 assert(calibration?.demand&&calibration?.thermal,'Public calibration required');
 let modelCalls=0,calls=0;const choose=(obs,available)=>{
  calls++;
  const legal=actionIds(available),log=obs.demand_belief.log_deviation,forecast=offset=>{const weekday=new Date(Date.parse(obs.date+'T00:00:00Z')+offset*86400000).getUTCDay();const t=offset+1,k=calibration.demand.kappa_per_day,phi=Math.exp(-k*t),variance=calibration.demand.sigma_per_sqrt_day**2*(1-phi**2)/(2*k);return calibration.demand.base_units*calibration.demand.weekday_multipliers[weekday]*Math.exp(phi*log+.5*variance);};
  const pending=obs.orders.filter(o=>!o.received),coverToday=obs.inventory_units+pending.filter(o=>o.reported_arrival_day===obs.day).reduce((n,o)=>n+o.units,0),stockPosition=obs.inventory_units+pending.filter(o=>o.reported_arrival_day<obs.horizon_days).reduce((n,o)=>n+o.units,0),remaining=Array.from({length:obs.horizon_days-obs.day},(_,i)=>forecast(i)).reduce((n,v)=>n+v,0);
  const preferred=coverToday<forecast(0)?'transfer40':stockPosition<remaining&&obs.day+3<obs.horizon_days?'order100':'none';
  let candidates=legal.filter(id=>id.startsWith(preferred+'_'));if(!candidates.length)candidates=legal.filter(id=>id.startsWith('none_'));if(!candidates.length)candidates=legal;
  let best;for(const id of candidates){modelCalls++;const modeled=transition(obs,id,{demand_units:forecast(0),outdoor_temperature_c:34},calibration),value=modeled.reward;if(!best||value>best.value+1e-9||Math.abs(value-best.value)<=1e-9&&id<best.id)best={id,value};}
  assert(best,'No feasible cover/thermal action');return best.id;
 };choose.diagnostics=()=>({calls,one_day_model_transitions:modelCalls,forecast:'one-step OU lognormal mean from approximate public point belief',outdoor_mean_c:34});return choose;
}
