import {runRetrospectiveForecastBacktest} from './learning-retrospective.js';
import {planMcts} from './retail-mcts.js';
import {practicalPolicy} from './retail-heuristics.js';
import {createEnvironment as searchEnvironment} from './retail-dynamics-adapter.js';
import {runRetailPlanningDemo} from './retail-planning-demo.js';
import {RETAIL_TRAINED_POLICY} from './retail-trained-policy.js';
import {runSingleDayModelUpdate,runCoupledDynamicsDemo,compareThermalSolvers} from './mrdiy-dynamics-demo.js';
import {createEnvironment,createInitialState} from './mrdiy-dynamics.js';
import {EVENT_BACKDROPS} from './learning-event-backdrops.js';
import {EVALUATION_WORLD} from './learning-evaluation-world.js';
const learnAssert=(ok,message)=>{if(!ok)throw new Error(message);};
export function runLearningTask(message,emit=()=>{}){
 learnAssert(message&&typeof message==='object'&&!Array.isArray(message)&&Object.keys(message).every(k=>['request_id','task','seed','iterations','calibration','new_observed_date','event_assumption','observation'].includes(k)),'Unknown learning Worker request field');
 learnAssert(typeof message.request_id==='string'&&message.request_id.length>0&&message.request_id.length<=100,'Bounded request identity required');
 learnAssert(JSON.stringify(message).length<=20000,'Learning request exceeds its bounded input size');
 const progress=p=>emit({request_id:message.request_id,status:'progress',progress:p,automatic_execution:false});
 let result;const calibration=message.calibration??RETAIL_TRAINED_POLICY.model_parameters;
 if(message.task==='episode'){
  const seed=message.seed??400000,iterations=message.iterations??32;
  learnAssert([400000,400001,400002].includes(seed)&&[32,128].includes(iterations),'Choose one of three declared seeds and a bounded MCTS budget');
  let initialState,eventContext=null;if(message.event_assumption){const a=message.event_assumption,e=EVENT_BACKDROPS.events.find(e=>e.id===a.event_id);learnAssert(e&&e.simulationMode==='retail_stress_test','Only a verified retail stress-test backdrop may activate an impact');learnAssert(Object.keys(a).every(k=>['event_id','additional_arrival_days','mapping_confirmed','impact_confirmed'].includes(k))&&a.mapping_confirmed===true&&a.impact_confirmed===true,'Explicit hypothetical exposure and impact confirmation required');learnAssert(Number.isInteger(a.additional_arrival_days)&&a.additional_arrival_days>=0&&a.additional_arrival_days<=5,'Additional arrival delay must be 0–5 whole days');initialState=createInitialState({calibration_version:calibration.version});initialState.orders.find(o=>o.id==='DEMO_SHIP01').reported_arrival_day=5+a.additional_arrival_days;eventContext={event_id:e.id,title:e.title,source_status:e.status,assumption:a,baseline_arrival_day:5,scenario_arrival_day:5+a.additional_arrival_days,actual_company_exposure_established:false,source_calibrates_delay:false};}
  progress({phase:'Running identical seeded episodes',completed:0,total:35});
  result=runRetailPlanningDemo({seed,mctsIterations:iterations,calibration,worldParameters:EVALUATION_WORLD,initialState,artifact:RETAIL_TRAINED_POLICY,onProgress:p=>progress({phase:'Evaluating a real daily transition',...p})});result.event_context=eventContext;
 }else if(message.task==='backtest'){
  result=runRetrospectiveForecastBacktest(p=>progress({phase:'Fitting past-only synthetic windows',...p}));
 }else if(message.task==='search'){
  const observation=message.observation,iterations=message.iterations??32;
  learnAssert([32,128].includes(iterations)&&observation&&Number.isInteger(observation.day)&&observation.day>=0&&observation.day<7,'A bounded observed decision day is required');
  progress({phase:'Inspecting actual root search branches',completed:0,total:1});
  result=planMcts({observation,createEnvironment:searchEnvironment,calibration,rolloutPolicy:practicalPolicy,iterations,horizon:7-observation.day,seed:11003,rewardScale:1000});
  result.inspection_basis='Actual search recomputed for the selected public observation; deeper nodes are not exported';result.observed_date=observation.date;
 }else if(message.task==='update'){
  const date=message.new_observed_date;
  learnAssert(typeof date==='string'&&/^2026-(09|10)-\d{2}$/.test(date)&&date>='2026-09-25'&&date<='2026-10-09','Choose a supported next dated release');
  progress({phase:'Fitting from released past observations',completed:0,total:2});
  result=runSingleDayModelUpdate({new_observed_date:date,window_days:56});
  const env=createEnvironment({seed:410103,calibration:result.before.calibration});env.step('none_normal_none');const before=env.observation(),after=env.replaceCalibration(result.after.calibration);
  result.model_replacement={before,after,irreversible_state_retained:JSON.stringify({...before,calibration_version:after.calibration_version})===JSON.stringify(after),actual_world_unchanged:true};
  progress({phase:'Refit complete; evaluating the heldout boundary',completed:2,total:2});
 }else if(message.task==='dynamics'){
  const seed=message.seed??400000;learnAssert([400000,400001,400002].includes(seed),'Choose a supported paired synthetic seed');
  progress({phase:'Integrating coupled stock, cash, staff and thermal state',completed:0,total:2});
  const coupled=runCoupledDynamicsDemo({seed,calibration});progress({phase:'Comparing exact RC with trained PINN inference',completed:1,total:2});
  result={coupled,thermal:compareThermalSolvers({seed,calibration})};
 }else throw new Error('Unknown learning Worker task');
 return{request_id:message.request_id,status:'ok',task:message.task,result,automatic_execution:false,network_calls:0,provider_calls:0};
}
if(typeof DedicatedWorkerGlobalScope!=='undefined'&&typeof self!=='undefined'&&self instanceof DedicatedWorkerGlobalScope)self.onmessage=event=>{try{self.postMessage(runLearningTask(event.data,value=>self.postMessage(value)));}catch(error){self.postMessage({request_id:event.data?.request_id??null,status:'error',error:error?.message||'Bounded task unavailable',automatic_execution:false});}};
