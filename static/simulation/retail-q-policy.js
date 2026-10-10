import {actionIds,assert,hash32,stableJson} from './retail-planning-utils.js';
export const Q_POLICY_VERSION='dormathon.tabular-q.v1';
export const RETAIL_ACTION_IDS=['none','transfer40','order100'].flatMap(i=>['normal','support'].flatMap(s=>['none','cool'].map(e=>`${i}_${s}_${e}`))).sort();
const bucket=(x,breaks)=>breaks.findIndex(t=>x<t)<0?breaks.length:breaks.findIndex(t=>x<t);
/** Deliberately coarse observable-state aggregation. Not a Markov sufficiency claim. */
export function qStateKey(obs,legal){
 const resources=obs.resources??{},orders=(obs.orders??[]).filter(x=>!x.received),eta=orders.length?Math.max(0,Math.min(...orders.map(x=>x.reported_arrival_day-obs.day))):9;
 const belief=obs.demand_belief??{};
 const demandLog=typeof belief==='number'?Math.log(Math.max(1,belief)/20):(belief.log_deviation??Math.log(Math.max(1,belief.mean_units??belief.mean??belief.expected_units??belief.estimate_units??20)/20));
 const mask=RETAIL_ACTION_IDS.reduce((n,id,i)=>n+(legal.includes(id)?2**i:0),0);
 return [obs.day,bucket(obs.inventory_units,[20,50,90,140]),bucket(obs.source_units,[1,40,80,120]),bucket(obs.cash_available_myr,[50,150,300,600]),bucket(resources.fuel_remaining_litres,[1,3,6]),bucket(resources.staff_hours_remaining,[2,5,10,20]),bucket(resources.backup_energy_remaining_kwh,[1,6,12]),bucket(obs.fatigue,[0.2,0.5,0.8]),bucket(obs.backlog_hours,[1,4,8]),bucket(obs.indoor_temperature_c,[27,30,33]),bucket(demandLog,[-.25,-.08,.08,.25]),Math.min(4,eta),bucket(orders.reduce((n,o)=>n+o.units,0),[1,101,201]),mask].join('|');
}
export function createQPolicy(artifact,{fallback,calibration}={}){
 assert(artifact?.schema_version===Q_POLICY_VERSION&&artifact.algorithm==='tabular_Q_learning','Trained tabular Q artifact required');
 assert(Array.isArray(artifact.action_ids)&&stableJson(artifact.action_ids)===stableJson(RETAIL_ACTION_IDS),'Q action menu differs');
 assert(artifact.trained===true&&artifact.training?.episodes>0&&artifact.q_table&&Object.keys(artifact.q_table).length>0,'Artifact has no trained values');
 const fingerprint=p=>{const {version,...effective}=p;return 'fnv1a32:'+hash32(effective).toString(16).padStart(8,'0');};const parameterMismatch=calibration!==undefined&&artifact.model_parameters!==undefined&&fingerprint(calibration)!==fingerprint(artifact.model_parameters);
 let calls=0,fallbacks=0,calibrationMismatches=0,effectiveParameterMismatches=0;const choose=(obs,available)=>{
  const legal=actionIds(available);assert(legal.length>0,'No legal Q action');const mismatch=obs.calibration_version!==undefined&&obs.calibration_version!==artifact.calibration_id;if(mismatch)calibrationMismatches++;if(parameterMismatch)effectiveParameterMismatches++;const row=mismatch||parameterMismatch?undefined:artifact.q_table[qStateKey(obs,legal)];calls++;
  const candidates=legal.map(id=>({id,index:RETAIL_ACTION_IDS.indexOf(id)})).filter(x=>x.index>=0&&row&&Number.isFinite(row[x.index]));
  if(!candidates.length){fallbacks++;const f=fallback?.(obs,legal);return legal.includes(f)?f:legal[0];}
  candidates.sort((a,b)=>row[b.index]-row[a.index]||a.id.localeCompare(b.id));return candidates[0].id;
 };
 return {choose,diagnostics:()=>({calls,fallbacks,fallback_rate:calls?fallbacks/calls:0,calibration_mismatch_calls:calibrationMismatches,effective_parameter_mismatch_calls:effectiveParameterMismatches,current_parameter_fingerprint_checked:calibration!==undefined}),artifact_id:artifact.artifact_id,policy_digest:'fnv1a32:'+hash32({actions:artifact.action_ids,q:artifact.q_table}).toString(16).padStart(8,'0')};
}
