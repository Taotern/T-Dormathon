import {createInitialState,observe,legalActions,transition,DEFAULT_CALIBRATION} from './retail-dynamics-adapter.js';
import {assert,cloneJson,seededRandom,stableJson,round} from './retail-planning-utils.js';
/** Exact nonanticipative enumeration for ONLY an explicitly declared 2-day,
 * 3-path miniature experiment. This is not a seven-day/global oracle. */
export const ORACLE_PATHS=Object.freeze([
 {label:'same early sales, later high',weight:.3,exogenous:[{demand_units:20,outdoor_temperature_c:33},{demand_units:34,outdoor_temperature_c:34}]},
 {label:'same early sales, later low',weight:.3,exogenous:[{demand_units:20,outdoor_temperature_c:33},{demand_units:12,outdoor_temperature_c:34}]},
 {label:'higher early sales',weight:.4,exogenous:[{demand_units:30,outdoor_temperature_c:35},{demand_units:26,outdoor_temperature_c:35}]}
]);
export function boundedTwoDayOracle({initialState=createInitialState(),calibration=DEFAULT_CALIBRATION,paths=ORACLE_PATHS}={}){
 assert(initialState.day===0&&paths.length<=3&&paths.every(p=>p.exogenous.length===2&&p.weight>0)&&Math.abs(paths.reduce((n,p)=>n+p.weight,0)-1)<1e-8,'Two-day bounded assumed distribution required');
 let evaluations=0,best;const candidates=[];
 for(const first of legalActions(initialState)){
  const groups=new Map();let firstReward=0;
  for(const p of paths){const out=transition(initialState,first.id,p.exogenous[0],calibration);evaluations++;firstReward+=p.weight*out.reward;const key=stableJson(out.observation);if(!groups.has(key))groups.set(key,{observation:out.observation,entries:[]});groups.get(key).entries.push(p);}
  let expected=firstReward;const choices=[];
  for(const g of groups.values()){
   let secondBest;for(const second of legalActions(g.observation)){let value=0;for(const p of g.entries){value+=p.weight*transition(g.observation,second.id,p.exogenous[1],calibration).reward;evaluations++;}if(!secondBest||value>secondBest.value+1e-8)secondBest={action_id:second.id,value};}
   expected+=secondBest.value;choices.push({observation:cloneJson(g.observation),assumed_observation_weight:g.entries.reduce((n,p)=>n+p.weight,0),conditional_future_count:g.entries.length,action_id:secondBest.action_id});
  }
  const c={first_action_id:first.id,expected_reward:round(expected),second_choices:choices};candidates.push(c);if(!best||expected>best.expected_reward+1e-8)best=c;
 }
 assert(evaluations<=2000,'Bounded enumeration exceeded work contract');
 return {scope:'two-day three-path finite miniature only',expected_reward:best.expected_reward,first_action_id:best.first_action_id,second_choices:best.second_choices,first_candidates:candidates,model_transitions:evaluations,nonanticipative:true,automatic_execution:false,globally_optimal:false,exact_within_declared_scope:true,assumed_distribution:true};
}
export function createFiniteOracleEnvironmentFactory({initialState=createInitialState(),calibration=DEFAULT_CALIBRATION,paths=ORACLE_PATHS}={}){
 return ({seed,state=initialState,mode})=>{
  const publicStart=observe(state),compatible=paths.filter(p=>{
   if(state.day===0)return true;
   assert(state.day===1,'Finite comparison supports exactly two decision epochs');
   const first=state.history[0].action_id;return stableJson(transition(initialState,first,p.exogenous[0],calibration).observation)===stableJson(state);
  });assert(compatible.length>0,'Observation not supported by finite prior');
  const rng=seededRandom(seed),total=compatible.reduce((n,p)=>n+p.weight,0);let draw=rng()*total,chosen=compatible.at(-1);for(const p of compatible){draw-=p.weight;if(draw<=0){chosen=p;break;}}
  let current=publicStart;return {observation:()=>observe(current),legalActions:()=>legalActions(current),step:id=>{const out=transition(current,id,chosen.exogenous[current.day],calibration);current=out.state;return {...out,done:current.day===2};}};
 };
}
