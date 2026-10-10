import {compareJointPackages} from './mrdiy-joint-planner.js';

// Discrete deterministic stress tests over the existing planner. Never a probability model.
export const MRDIY_PLAN_THRESHOLDS_VERSION = 'dormathon.mrdiy-plan-thresholds.v0.1.0';
const ptClone = value => JSON.parse(JSON.stringify(value));
const ptAssert = (ok, message) => { if (!ok) throw new Error(message); };
const ptDefaultGrid = {delay_days:[0,1,2,3,4,5],demand_multipliers:[0.75,1,1.25,1.5,2]};
const ptDominates = (a,b) => Object.keys(b.score_vector).every(k=>a.score_vector[k]<=b.score_vector[k]) && Object.keys(b.score_vector).some(k=>a.score_vector[k]<b.score_vector[k]);
function ptMeasure(result, id) {
  const selected=result.packages.find(p=>p.package_id===id);
  if (!selected) return null;
  return {
    package_id:id, feasible:selected.feasible, covers_demand:selected.outcomes.inventory.shortage_units===0,
    shortage_units:selected.outcomes.inventory.shortage_units, continuity_gap_hours:selected.outcomes.energy.continuity_gap_hours,
    full_continuity:selected.outcomes.energy.continuity_gap_hours===0, pareto_efficient:selected.pareto_efficient,
    score_vector:ptClone(selected.score_vector), planned_arrival_day:selected.outcomes.transport.planned_arrival_day,
    failed_constraints:ptClone(selected.binding_constraints.filter(c=>!c.passed)),
    binding_constraints:ptClone(selected.binding_constraints),
    alternatives:{evaluated:result.counts.evaluated,feasible:result.counts.feasible,pareto_package_ids:[...result.pareto_package_ids],
      dominating_package_ids:result.packages.filter(p=>p.package_id!==id&&p.feasible&&selected.feasible&&ptDominates(p,selected)).map(p=>p.package_id)},
    input_checksum:result.input_checksum
  };
}
function ptGrid(grid) {
  ptAssert(grid&&typeof grid==='object'&&!Array.isArray(grid),'grid must be an object');
  ptAssert(Object.keys(grid).every(k=>['delay_days','demand_multipliers'].includes(k)),'Unsupported grid axis; resource budgets are not exposed as canonical assumption overrides');
  const out={...ptDefaultGrid,...grid};
  for (const [key,max] of [['delay_days',6],['demand_multipliers',5]]) {
    const values=out[key];
    ptAssert(Array.isArray(values)&&values.length>=1&&values.length<=max,'Grid '+key+' has invalid size');
    ptAssert(values.every(x=>typeof x==='number'&&Number.isFinite(x)&&(key==='delay_days'?Number.isInteger(x)&&x>=0&&x<=5:x>=0.5&&x<=2)),'Grid '+key+' is outside the declared range');
    ptAssert(new Set(values).size===values.length,'Grid '+key+' must not contain duplicates');
    out[key]=[...values].sort((a,b)=>a-b);
  }
  return out;
}
function ptTransitions(points,grid) {
  const out=[];
  const properties=['feasible','covers_demand','full_continuity','pareto_efficient'];
  for(const axis of ['delay_days','demand_multiplier']) {
    const fixed=axis==='delay_days'?'demand_multiplier':'delay_days';
    const fixedValues=axis==='delay_days'?grid.demand_multipliers:grid.delay_days;
    for(const fixedValue of fixedValues) {
      const slice=points.filter(p=>p[fixed]===fixedValue).sort((a,b)=>a[axis]-b[axis]);
      for(let i=1;i<slice.length;i++) for(const property of properties) {
        const left=slice[i-1],right=slice[i];
        if(left.selected&&right.selected&&left.selected[property]!==right.selected[property])out.push({
          axis,fixed:{[fixed]:fixedValue},property,
          from:{tested_value:left[axis],value:left.selected[property],point_id:left.point_id},
          to:{tested_value:right[axis],value:right.selected[property],point_id:right.point_id},
          interpretation:'Adjacent tested points differ. No exact threshold, interpolation, monotonicity outside these points, or causal effect is established.'
        });
      }
    }
  }
  return out;
}
export function comparePlanThresholds(options={}) {
  ptAssert(options&&typeof options==='object'&&!Array.isArray(options),'Plan threshold options must be an object');
  ptAssert(Object.keys(options).every(k=>['selected_package_id','snapshot','assumptions','commitments','demand','pinned_actions','grid'].includes(k)),'Unsupported plan threshold option');
  const grid=ptGrid(options.grid??{});
  const envelope={schema_version:MRDIY_PLAN_THRESHOLDS_VERSION,status:'insufficient_data',scenarioDataMode:'SYNTHETIC_INTERNAL',
    component_data_modes:['SYNTHETIC_INTERNAL','HYPOTHETICAL_EVENT','SIMULATED_OUTCOME'],
    automatic_execution:false,human_choice_required:true,resources_reserved:false,recommended_package_id:null,
    selected_package_id:options.selected_package_id??null,grid,points:[],tested_transitions:[],missing_inputs:[],
    tested_bounds:{delay_days:[grid.delay_days[0],grid.delay_days.at(-1)],demand_multiplier:[grid.demand_multipliers[0],grid.demand_multipliers.at(-1)]},
    computational_bounds:{max_grid_points:30,max_packages_per_point:72,max_enumerated_packages_including_reference:2232,max_additional_counterfactual_evaluations:62},
    allowed_grid_ranges:{delay_days:[0,5],demand_multiplier:[0.5,2]},
    semantics:{delay_days:'Absolute declared primary-route delay, not an increment to the current delay. Other shipments retain their own arrivals.',
      demand_multiplier:'Uniform scaling of every day in the exact supplied synthetic-company path, or the explicitly declared fixture path when demand is omitted.',
      feasibility:'Existing hard resource and intrinsic constraints; positive shortage or continuity gap does not by itself make a package infeasible.',
      preference:'Pareto membership among the same permitted alternatives at each tested point. No unique preference, automatic selection, or global optimum is inferred.'},
    limitations:['A bounded what-if grid, not continuous thresholds, probabilities, causal predictions, or all possible conditions.',
      'Only delay and demand vary. Energy, cash, staffing, storage, fuel and other constraints retain the frozen input values.',
      'No route/weather conversion is inferred here; any event-to-delay assumption must be explicit upstream.',
      'Rounded planner outcomes and its existing conservative shared-resource ledger semantics are retained.']};
  const unknown=(missing,extra={})=>({...envelope,...extra,missing_inputs:[...new Set(missing)]});
  if(typeof options.selected_package_id!=='string'||!options.selected_package_id)return unknown(['selected_package_id']);
  const jointOptions=Object.fromEntries(['snapshot','assumptions','commitments','demand','pinned_actions'].filter(k=>options[k]!==undefined).map(k=>[k,options[k]]));
  const reference=compareJointPackages(jointOptions);
  if(reference.status==='insufficient_data')return unknown(reference.missing_inputs,{reference_status:reference.status});
  const current=ptMeasure(reference,options.selected_package_id);
  if(!current)return unknown(['selected_package_in_current_permitted_alternatives'],{reference_status:reference.status});
  const demand=reference.frozen_basis.demand,points=[];
  for(const delay of grid.delay_days)for(const multiplier of grid.demand_multipliers) {
    const scaled={...demand,demand_by_day:demand.demand_by_day.map(value=>value*multiplier),basis:'explicit_sensitivity_multiplier_of_frozen_company_demand'};
    const result=compareJointPackages({...jointOptions,assumptions:{...(jointOptions.assumptions??{}),delay_days:delay},demand:scaled});
    points.push({point_id:'delay_'+delay+'__demand_'+multiplier,delay_days:delay,demand_multiplier:multiplier,
      status:result.status,missing_inputs:result.missing_inputs??[],selected:ptMeasure(result,options.selected_package_id)});
  }
  const complete=points.every(p=>p.selected!==null),transitions=ptTransitions(points,grid);
  return {...envelope,status:complete?'ok':'insufficient_data',missing_inputs:complete?[]:[...new Set(points.flatMap(p=>p.missing_inputs))],
    snapshot_id:reference.snapshot_id,data_revision:reference.data_revision,reference_input_checksum:reference.input_checksum,
    current:{delay_days:reference.frozen_basis.assumptions.delay_days,demand_multiplier:1,selected:current},
    frozen_basis:{base_demand:ptClone(demand),base_assumptions:ptClone(reference.frozen_basis.assumptions),
      external_commitments:ptClone(reference.frozen_basis.external_commitments),pinned_actions:ptClone(reference.pinned_actions),
      reservation_pins:ptClone(reference.reservation_pins),scenario_clock:reference.frozen_basis.scenario_clock},
    points,tested_transitions:transitions,
    counts:{grid_points:points.length,reference_packages:reference.counts.evaluated,
      evaluated_packages:reference.counts.evaluated+points.reduce((sum,p)=>sum+(p.selected?.alternatives.evaluated??0),0),
      feasible_points:points.filter(p=>p.selected?.feasible).length,covered_demand_points:points.filter(p=>p.selected?.covers_demand).length,
      pareto_points:points.filter(p=>p.selected?.pareto_efficient).length},
    observations:[
      {kind:'infeasible',point_ids:points.filter(p=>p.selected&&!p.selected.feasible).map(p=>p.point_id)},
      {kind:'uncovered_demand',point_ids:points.filter(p=>p.selected&&!p.selected.covers_demand).map(p=>p.point_id)},
      {kind:'continuity_gap',point_ids:points.filter(p=>p.selected&&!p.selected.full_continuity).map(p=>p.point_id)},
      {kind:'feasible_but_dominated',point_ids:points.filter(p=>p.selected?.feasible&&!p.selected.pareto_efficient).map(p=>p.point_id)}
    ],warnings:[...reference.warnings,'No automatic package switch or resource reservation was made.']};
}
