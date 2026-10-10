import {actionIds,assert,cloneJson,hash32,seededRandom,stableJson,round} from './retail-planning-utils.js';

export const MCTS_VERSION='dormathon.observation-history-uct.v1';
/**
 * UCT with action edges and observation-history chance branches. Search worlds are
 * freshly seeded hypothetical environments from the PUBLIC observation only.
 * An action/observation edge is scoped by its parent history; future draws, actual
 * environment RNG, scenario IDs, metrics and rewards never enter branch keys.
 * A finite pool reuses hypothetical worlds so a real multi-level tree can grow.
 */
export function planMcts({observation,createEnvironment,calibration,rolloutPolicy,iterations=256,maxNodes=2048,scenarioPoolSize=16,seed=11003,exploration=1.2,rewardScale=1000,gamma=1,horizon=7}={}){
 assert(observation&&typeof observation==='object','Public observation required');
 assert(typeof createEnvironment==='function','Environment factory required');
 for(const [key,value,max] of [['iterations',iterations,8192],['maxNodes',maxNodes,32768],['scenarioPoolSize',scenarioPoolSize,256],['horizon',horizon,30]])assert(Number.isInteger(value)&&value>=1&&value<=max,'Invalid bounded '+key);
 assert(Number.isFinite(rewardScale)&&rewardScale>0&&Number.isFinite(exploration)&&exploration>=0&&gamma>0&&gamma<=1,'Invalid UCT coefficients');
 const input=stableJson(observation),rng=seededRandom((seed^hash32(input))>>>0),worldSeeds=Array.from({length:scenarioPoolSize},()=>Math.floor(rng()*4294967296));
 const rootEnv=createEnvironment({seed:worldSeeds[0],state:cloneJson(observation),calibration,mode:'planning'});
 assert(stableJson(rootEnv.observation())===input,'Planning environment must preserve supplied public observation');
 let nodeCount=1,transitions=0,rolloutSteps=0,treeDepth=0;const rootLegal=actionIds(rootEnv.legalActions());
 assert(rootLegal.length>0,'No feasible action at decision');
 function node(legal){return {visits:0,edges:new Map(legal.map(id=>[id,{id,visits:0,total:0,children:new Map()}]))};}
 const root=node(rootLegal);
 const chooseRollout=env=>{const legal=actionIds(env.legalActions()),id=rolloutPolicy?.(env.observation(),legal);return legal.includes(id)?id:legal[Math.floor(rng()*legal.length)];};
 for(let iteration=0;iteration<iterations;iteration++){
  // Pool draw is independent of the actual evaluation scenario and hidden RNG.
  const env=createEnvironment({seed:worldSeeds[Math.floor(rng()*worldSeeds.length)],state:cloneJson(observation),calibration,mode:'planning'});
  const path=[],rewards=[];let current=root,done=false,depth=0,rollout=false;
  while(!done&&depth<horizon){
   const legal=actionIds(env.legalActions());assert(legal.length>0,'Model has no feasible continuation');
   let edge,id;
   if(!rollout&&current){
    // A chance branch may contain an abstraction only if the caller supplies one;
    // this implementation uses exact public observations and complete history.
    for(const a of legal)if(!current.edges.has(a))current.edges.set(a,{id:a,visits:0,total:0,children:new Map()});
    const eligible=legal.map(a=>current.edges.get(a)),unvisited=eligible.filter(e=>e.visits===0);
    if(unvisited.length)edge=unvisited[Math.floor(rng()*unvisited.length)];
    else {let best=-Infinity;for(const e of eligible){const score=e.total/e.visits/rewardScale+exploration*Math.sqrt(Math.log(Math.max(1,current.visits))/e.visits);if(score>best){best=score;edge=e;}}}
    id=edge.id;path.push({node:current,edge,rewardIndex:rewards.length});
   }else id=chooseRollout(env);
   assert(legal.includes(id),'Search attempted a masked action');
   const out=env.step(id);assert(Number.isFinite(out.reward),'Finite model reward required');transitions++;if(rollout)rolloutSteps++;
   rewards.push(out.reward);done=out.done===true;depth++;
   if(!rollout&&edge&&!done){
    const key=stableJson(out.observation);let next=edge.children.get(key);
    if(!next){
     if(nodeCount<maxNodes){next=node(actionIds(env.legalActions()));edge.children.set(key,next);nodeCount++;}
     // Standard expansion followed by a simulation rollout, not exhaustive search.
     rollout=true;
    }
    current=next;
   }
  }
  treeDepth=Math.max(treeDepth,path.length);
  let suffix=0;const returns=new Array(rewards.length);for(let i=rewards.length-1;i>=0;i--){suffix=rewards[i]+gamma*suffix;returns[i]=suffix;}
  for(const p of path){p.node.visits++;p.edge.visits++;p.edge.total+=returns[p.rewardIndex];}
 }
 const stats=rootLegal.map(id=>{const e=root.edges.get(id);return {action_id:id,visits:e.visits,mean_model_return:e.visits?round(e.total/e.visits):null,chance_branches:e.children.size};});
 // Visit-count recommendation is robust to a single lucky finite-budget return.
 stats.sort((a,b)=>b.visits-a.visits||(b.mean_model_return??-Infinity)-(a.mean_model_return??-Infinity)||a.action_id.localeCompare(b.action_id));
 return {schema_version:MCTS_VERSION,action_id:stats[0].action_id,root_actions:stats,counts:{iterations,model_transitions:transitions,model_transition_bound:iterations*horizon,nodes:nodeCount,node_bound:maxNodes,maximum_tree_decision_depth:treeDepth,rollout_steps:rolloutSteps,scenario_pool_size:scenarioPoolSize},seed:seed>>>0,objective:'maximize expected sum of declared synthetic rewards',information:'public observation/action history only; independently sampled hypothetical future worlds',actual_future_used:false,optimality_guaranteed:false};
}
