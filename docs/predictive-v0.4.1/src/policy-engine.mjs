/** Deterministic inventory sandbox. Every outcome is explicitly simulated. */
export const POLICY_VERSION = 'dormathon.inventory-policy.0.4.1.1';
const finiteNonnegative = x => Number.isFinite(x) && x >= 0;
function simulate(state, forecast, policy) {
  let stock = state.initial_stock_units, cash = state.budget, orders = 0, ordered = 0, totalDemand = 0, served = 0, lost = 0, holding = 0, setup = 0, procurement = 0, peak = stock + state.reserved_stock_units;
  const arrivals = state.on_order.map(x => ({...x})); const days = []; const checks = []; const startUnits = stock + arrivals.reduce((s, x) => s + x.quantity_units, 0);
  if (startUnits + state.reserved_stock_units > state.storage_capacity_units) checks.push({day:0, constraint:'unreserved_existing_inbound_capacity', feasible:false, excess_units:startUnits+state.reserved_stock_units-state.storage_capacity_units, remedy:'Reserve extra storage or retime committed inbound before making the action feasible; forecast sales cannot free hard reservations.'});
  const horizon = state.demand_by_day.length; const dayCapacity = state.supplier_capacity_units_per_day;
  for (let day = 0; day < horizon; day++) {
    const todayArrival = arrivals.filter(x => x.arrival_day === day).reduce((s, x) => s + x.quantity_units, 0); stock += todayArrival;
    if (stock + state.reserved_stock_units > state.storage_capacity_units) checks.push({day, constraint:'storage_capacity', feasible:false, excess_units:stock+state.reserved_stock_units-state.storage_capacity_units, remedy:'Increase declared capacity or reduce/retime incoming units.'});
    peak = Math.max(peak, stock + state.reserved_stock_units);
    let wanted = 0;
    const outstanding = arrivals.filter(x => x.arrival_day > day).reduce((s, x) => s + x.quantity_units, 0);
    if (day % state.review_cadence_days === 0 && policy !== 'no_replenishment') {
      if (policy === 'reorder_point' && stock + outstanding <= state.reorder_point_units) wanted = state.fixed_order_quantity_units;
      if (policy === 'forecast_informed') {
        // Only the frozen supplied forecast is planned; future realized demand is never a decision feature.
        const expected = forecast.slice(day, Math.min(horizon, day + state.lead_time_days + state.review_cadence_days)).reduce((s, x) => s + x, 0) + state.safety_stock_units;
        wanted = Math.max(0, Math.ceil(expected - stock - outstanding));
      }
    }
    let quantity = Math.min(wanted, dayCapacity, state.max_order_units);
    const affordable = cash >= state.order_setup_cost ? Math.floor((cash-state.order_setup_cost)/state.procurement_cost_per_unit) : 0;
    quantity = Math.max(0, Math.min(quantity, affordable));
    const arrivalDay = day + state.lead_time_days;
    // Reserve room against known on-hand + every outstanding committed receipt.
    // Future forecast consumption cannot release a hard capacity reservation.
    const reservedUpperBound = stock + state.reserved_stock_units + outstanding;
    quantity = Math.max(0, Math.min(quantity, Math.floor(state.storage_capacity_units-reservedUpperBound)));
    if (wanted > quantity) {
      const limits = [
        ['supplier_capacity', dayCapacity], ['order_quantity_limit', state.max_order_units],
        ['budget', affordable], ['reserved_storage_capacity', Math.max(0, Math.floor(state.storage_capacity_units-reservedUpperBound))]
      ];
      for (const [constraint, limit] of limits) if (wanted > limit) checks.push({day, constraint, feasible:false, requested_units:wanted, declared_limit_units:limit, feasible_units:quantity, binding:Math.abs(limit-quantity)<1e-9, remedy:'Increase the named declared limit or reduce the action size. Capacity cannot rely on future forecast sales.'});
    }
    if (quantity > 0) {
      const cost = quantity*state.procurement_cost_per_unit + state.order_setup_cost;cash-=cost;procurement+=quantity*state.procurement_cost_per_unit;setup+=state.order_setup_cost;ordered+=quantity;orders++;
      arrivals.push({arrival_day:arrivalDay,quantity_units:quantity,source:'simulated_order'});
      if (arrivalDay === day) stock += quantity;
      peak = Math.max(peak, stock + state.reserved_stock_units);
    }
    const demand = state.demand_by_day[day]; const supplied = Math.min(stock,demand);stock-=supplied;served+=supplied;lost+=demand-supplied;totalDemand+=demand;holding+=stock*state.holding_cost_per_unit_day;
    days.push({day,arrival_units:todayArrival+(arrivalDay===day?quantity:0),ordered_units:quantity,demand_units:demand,served_units:supplied,shortage_units:demand-supplied,end_stock_units:stock,budget_remaining:cash});
  }
  const outstanding = arrivals.filter(x => x.arrival_day >= horizon).reduce((s,x)=>s+x.quantity_units,0);const shortage=lost*state.shortage_cost_per_unit;const terminalCredit=stock*state.terminal_inventory_value_per_unit;
  const conservationDelta = startUnits + ordered - served - stock - outstanding;
  return {policy_id:policy,policy_version:POLICY_VERSION,output_type:'SIMULATED_COUNTERFACTUAL',feasible:!checks.some(x=>['storage_capacity','unreserved_existing_inbound_capacity'].includes(x.constraint)),constraint_checks:checks,action_clipping:'Capacity/budget/storage blocked requested quantities are clipped and disclosed; no double allocation.',metrics:{total_demand_units:totalDemand,served_units:served,shortage_units:lost,service_level:totalDemand>0?served/totalDemand:null,ending_stock_units:stock,reserved_stock_units:state.reserved_stock_units,ending_physical_stock_units:stock+state.reserved_stock_units,outstanding_units:outstanding,average_stock_held_units:days.reduce((s,x)=>s+x.end_stock_units,0)/horizon,peak_stock_units:peak,ordered_units:ordered,order_count:orders,budget_remaining:cash},component_costs:{currency:state.currency,procurement,order_setup:setup,holding,shortage,terminal_inventory_credit:terminalCredit,total:procurement+setup+holding+shortage-terminalCredit},stock_conservation:{initial_plus_preexisting_on_order_units:startUnits,new_order_units:ordered,served_units:served,ending_stock_units:stock,reserved_stock_units:state.reserved_stock_units,ending_physical_stock_units:stock+state.reserved_stock_units,outstanding_units:outstanding,delta_units:conservationDelta,pass:Math.abs(conservationDelta)<1e-9},days};
}
export function comparePolicies(request) {
  const state=request.state;const out={schema_version:'dormathon.policy-comparison.v1',policy_version:POLICY_VERSION,org_id:request.org_id??null,brand_scope:request.brand_scope??null,scenarioDataMode:request.scenarioDataMode??null,provenance_refs:request.provenance_refs??[],assumption_set_id:request.assumption_set_id??null,request_id:request.request_id??'local-policy-comparison',input_refs:request.input_refs??[],knowledge_as_of:request.knowledge_as_of??null,world_time:request.world_time??null,knowledge_mode:request.knowledge_mode??null,data_revision:request.data_revision??null,status:'insufficient_data',delivery_mode:'live_local_calculation',output_type:'SIMULATED_COUNTERFACTUAL',forecast_ref:request.forecast_ref??null,warnings:['All inventory, transition and cost outcomes are simulated under the same frozen exogenous sales path. No observed or causal savings claim.'],policies:[]};
  const fail=reason=>{out.warnings.push(reason);return out;};
  if(!state || !['SYNTHETIC_INTERNAL','EXTERNAL_BENCHMARK'].includes(out.scenarioDataMode)||!out.assumption_set_id||!out.org_id||!out.knowledge_as_of||Number.isNaN(Date.parse(out.knowledge_as_of)))return fail('Explicit data mode, frozen state and assumption-set references required.');
  if(!/^[A-Z]{3}$/.test(state.currency??''))return fail('Explicit three-letter scenario currency required; a numeric cost without units is insufficient.');
  const fields=['reserved_stock_units','initial_stock_units','budget','supplier_capacity_units_per_day','storage_capacity_units','max_order_units','reorder_point_units','fixed_order_quantity_units','safety_stock_units','procurement_cost_per_unit','order_setup_cost','holding_cost_per_unit_day','shortage_cost_per_unit','terminal_inventory_value_per_unit'];
  if(fields.some(k=>!finiteNonnegative(state[k])))return fail('Inventory, budget, capacities and each declared cost must be finite nonnegative values; unknown is not a default.');
  if(!Number.isInteger(state.lead_time_days)||state.lead_time_days<0||!Number.isInteger(state.review_cadence_days)||state.review_cadence_days<1||state.procurement_cost_per_unit<=0)return fail('Known integer lead/review timing and positive procurement cost required.');
  if(state.shortage_treatment!=='lost_sales')return fail('This version models explicitly assumed lost sales only; backorder is unsupported.');
  if(!Array.isArray(state.on_order)||state.on_order.some(x=>!Number.isInteger(x.arrival_day)||x.arrival_day<0||!finiteNonnegative(x.quantity_units)))return fail('Preexisting orders require valid arrival day and nonnegative quantity.');
  if(!Array.isArray(state.demand_by_day)||state.demand_by_day.length!==7||state.demand_by_day.some(x=>!finiteNonnegative(x)))return fail('An explicitly labelled seven-day exogenous simulation path is required.');
  const forecast=request.forecast_units;
  if(!Array.isArray(forecast)||forecast.length!==7||forecast.some(x=>!finiteNonnegative(x)))return fail('Seven known forecast units required; no realized future sales substitution.');
  out.policies=['no_replenishment','reorder_point','forecast_informed'].map(p=>simulate(state,forecast,p));out.status='ok';
  const feasible=out.policies.filter(x=>x.feasible&&x.stock_conservation.pass);out.preferred_policy_id=feasible.length?feasible.reduce((a,b)=>a.component_costs.total<=b.component_costs.total?a:b).policy_id:null;
  out.objective='Minimum declared simulated cost among feasible clipped policies; human choice required.';out.assumed_shortage_treatment=state.shortage_treatment;out.exogenous_path_frozen=true;out.capacity_rule='Conservative known usable and reserved on-hand plus all outstanding inbound reservation; no future forecast consumption releases hard capacity.';out.uncertainty=null;out.uncertainty_reason='Deterministic scenario; sensitivity ranges, not empirical confidence intervals.';return out;
}
