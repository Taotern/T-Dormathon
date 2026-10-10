import {assert} from './retail-planning-utils.js';
/** Standard tabular Q-learning target, maximizing over ALL feasible actions.
 * Unvisited estimates are numeric zero, not removed from the Bellman target. */
export function updateTabularQ({values,counts,actionIndex,reward,nextValues,nextLegalIndices,done,gamma=1}){
 assert(Number.isFinite(values[actionIndex])&&Number.isFinite(reward),'Numeric initialized Q and reward required');
 let target=reward;if(!done){assert(nextLegalIndices?.length>0,'Feasible next action set required');const maximum=Math.max(...nextLegalIndices.map(i=>{assert(Number.isFinite(nextValues[i]),'All feasible Q estimates must be initialized');return nextValues[i];}));target+=gamma*maximum;}
 const visits=++counts[actionIndex],alpha=Math.max(.035,.45/Math.pow(visits,.55)),tdError=target-values[actionIndex];values[actionIndex]+=alpha*tdError;return {target,alpha,td_error:tdError,visits};
}
