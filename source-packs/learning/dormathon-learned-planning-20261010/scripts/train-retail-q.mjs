import fs from 'node:fs';import path from 'node:path';import {fileURLToPath} from 'node:url';
import {createEnvironment,DEFAULT_CALIBRATION} from '../worker/retail-dynamics-adapter.js';
import {Q_POLICY_VERSION,RETAIL_ACTION_IDS,qStateKey,createQPolicy} from '../worker/retail-q-policy.js';
import {updateTabularQ} from '../worker/retail-q-learning.js';
import {practicalPolicy} from '../worker/retail-heuristics.js';
import {actionIds,seededRandom,hash32,round} from '../worker/retail-planning-utils.js';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const args=Object.fromEntries(process.argv.slice(2).map(x=>x.split('=')));
const episodes=Number(args.episodes??20000),runs=Number(args.runs??3),checkpoint=Number(args.checkpoint??2000);
if(!Number.isInteger(episodes)||episodes<1||episodes>25000||!Number.isInteger(runs)||runs<1||runs>3)throw new Error('Bounded episodes 1..25000/runs 1..3 required');
const calibration=args.calibration?JSON.parse(fs.readFileSync(args.calibration,'utf8')):DEFAULT_CALIBRATION;
const outDir=args.outdir?path.resolve(args.outdir):path.join(root,'artifacts');const started=new Date().toISOString();fs.mkdirSync(outDir,{recursive:true});
const trainSeeds=[41,43,47],curves=[],summaries=[];
for(let run=0;run<runs;run++){
 const trainingSeed=trainSeeds[run],rng=seededRandom(trainingSeed),q=new Map(),visits=new Map();let intervalReturn=0,intervalN=0,peakRss=0;
 function row(key){if(!q.has(key)){if(q.size>=50000)throw new Error('Bounded 50000-state training cap reached');q.set(key,new Float64Array(12));visits.set(key,new Uint32Array(12));}return q.get(key);}
 function best(values,legal){let value=0,chosen=legal[0],have=false;for(const id of legal){const v=values[RETAIL_ACTION_IDS.indexOf(id)];if(Number.isFinite(v)&&(!have||v>value)){have=true;value=v;chosen=id;}}return {id:chosen,value:have?value:0};}
 function exportArtifact(done){return {schema_version:Q_POLICY_VERSION,algorithm:'tabular_Q_learning',trained:true,artifact_id:`retail-q-seed${trainingSeed}-episodes${done}`,action_ids:RETAIL_ACTION_IDS,calibration_id:calibration.version??calibration.id??'default',model_parameters:calibration,training:{episodes:done,training_rng_seed:trainingSeed,environment_seed_start:100000+run*30000,environment_seed_end:100000+run*30000+done-1,epsilon_schedule:'linear 1.0 to 0.08 over first 80%; then 0.08',gamma:1,alpha:'max(0.035, 0.45 / visit_count^0.55)',state_aggregation:'coarse bins of public day/inventory/source/cash/fuel/staff/battery/fatigue/backlog/temperature/public log-demand belief/order ETA/units and feasible mask',validation_seed_start:200000,validation_episodes:48,validation_used_for_model_selection:false,oracle_targets_used:false,initial_q_value:0,bellman_max:'all feasible actions, including initialized unvisited estimates',portable_unvisited_estimates:'exported null, inference excludes values with zero interaction visits'},q_table:Object.fromEntries([...q].map(([key,values])=>[key,Array.from(values,(v,i)=>visits.get(key)[i]>0?round(v):null)])),state_action_visits:Object.fromEntries([...visits].map(([key,v])=>[key,Array.from(v)]))};}
 function validate(artifact){const policy=createQPolicy(artifact,{fallback:practicalPolicy,calibration});let total=0;for(let i=0;i<48;i++){const env=createEnvironment({seed:200000+i,calibration,mode:'evaluation'});let done=false;while(!done){const out=env.step(policy.choose(env.observation(),env.legalActions()));total+=out.reward;done=out.done;}}return {mean_return:round(total/48),...policy.diagnostics()};}
 for(let episode=0;episode<episodes;episode++){
  const epsilon=Math.max(0.08,1-0.92*episode/(episodes*0.8));const env=createEnvironment({seed:100000+run*30000+episode,calibration,mode:'evaluation'});let done=false,total=0;
  while(!done){
   const obs=env.observation(),legal=actionIds(env.legalActions()),key=qStateKey(obs,legal),values=row(key);
   // Exploration is interaction-based, never supplied an optimal action target.
   const id=rng()<epsilon?legal[Math.floor(rng()*legal.length)]:best(values,legal).id,index=RETAIL_ACTION_IDS.indexOf(id);
   const out=env.step(id);let nextValues,nextLegalIndices;
   if(!out.done){const nextLegal=actionIds(env.legalActions());nextValues=row(qStateKey(out.observation,nextLegal));nextLegalIndices=nextLegal.map(a=>RETAIL_ACTION_IDS.indexOf(a));}
   updateTabularQ({values,counts:visits.get(key),actionIndex:index,reward:out.reward,nextValues,nextLegalIndices,done:out.done,gamma:1});
   total+=out.reward;done=out.done;
  }
  intervalReturn+=total;intervalN++;peakRss=Math.max(peakRss,process.memoryUsage().rss);if(peakRss>240*1048576)throw new Error('Owned RSS exceeded conservative 240MiB guard');
  if((episode+1)%checkpoint===0||episode+1===episodes){const artifact=exportArtifact(episode+1),validation=validate(artifact),point={training_seed:trainingSeed,episodes:episode+1,exploratory_mean_return:round(intervalReturn/intervalN),greedy_validation_mean_return:validation.mean_return,validation_fallback_rate:validation.fallback_rate,states:q.size,visited_state_actions:[...visits.values()].reduce((n,v)=>n+Array.from(v).filter(x=>x>0).length,0),rss_mib:round(process.memoryUsage().rss/1048576)};curves.push(point);process.stdout.write(JSON.stringify(point)+'\n');intervalReturn=0;intervalN=0;}
 }
 const artifact=exportArtifact(episodes);artifact.policy_digest='fnv1a32:'+hash32({actions:artifact.action_ids,q:artifact.q_table}).toString(16).padStart(8,'0');artifact.validation=validate(artifact);artifact.training.completed_at=new Date().toISOString();artifact.training.peak_rss_mib=round(peakRss/1048576);
 const filename=`retail-q-seed${trainingSeed}.json`;fs.writeFileSync(path.join(outDir,filename),JSON.stringify(artifact));summaries.push({filename,artifact_id:artifact.artifact_id,policy_digest:artifact.policy_digest,training:artifact.training,validation:artifact.validation,states:q.size});
}
fs.writeFileSync(path.join(outDir,'retail-q-training-curve.json'),JSON.stringify({started_at:started,completed_at:new Date().toISOString(),calibration,curves,summaries,primary_policy:'retail-q-seed41.json',primary_policy_chosen_before_training:true,disclosure:'Synthetic interaction-trained tabular Q-learning; coarse state aggregation is not proven Markov and no convergence or real company benefit is claimed.'},null,2));
