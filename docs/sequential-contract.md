# Bounded sequential scenario contract (review before integration)

Version: `dormathon.mrdiy-sequential.v1`. Pure, additive, worker-safe module. Existing demo is the fallback and is not edited.

## Decision and information timing

Seven dated days, day 0 anchored to the existing synthetic scenario clock; decisions before receipts/demand on days 0 and 2. Daily order: retain prior commitments → make admissible new choice → receive dated outstanding shipments once → fulfill demand from available stock → record lost sales, holding cost, resource balance and conditional model events. Existing received units are already in opening inventory.

Day-0 action is common to every scenario. Day-2 information contains only actual fulfilled synthetic sales/receipts through day 1 (unserved latent demand is censored and excluded from observations), current physical balances, and an explicitly assumed carrier ETA update. No future demand, scenario identity, or terminal result appears in the observation. Equal observation histories share one action. Three default paths have assumed weights 0.5/0.3/0.2: original lead/base forecast; delayed/base forecast; delayed/high forecast after day 2. The latter two remain indistinguishable at day 2: their conditional weights are 0.6/0.4. Carrier ETA is assumed accurate within this tiny scenario set, not a validated forecast. Residual future demand uncertainty remains. No online training or calibrated event probability is claimed.

## Physical and financial semantics

Reconstruct canonical claims from existing case actions, never trust caller resource amounts. Cash starts at opening cash minus existing PO reserves; new model commitments reduce the available balance once. There is no actual payment, new sales revenue, refund, or PO re-charge. Transfers debit source stock and credit destination once. New orders have action-relative lead time. Expedite is one-off, cannot act on an already received shipment, and cannot time-travel: earliest receipt is the next day after the decision. Arrival registry is unique; generated order IDs receive deterministic suffixes if an existing ID collides, and output fails closed on duplicate event/receipt identity. Each receipt is posted once.

Fuel, role hours, backup energy and action identities are cumulative over the whole horizon. Day-0 energy, invoice and service choices remain irrevocable; the day-0 interruption cannot be repaired on day 2. At day 2 only supply transfer/new replenishment and route expedite may be added. Each physical action may be added at most once. Staff day-2 planning windows and day-specific transport capacity are explicit additional synthetic assumptions; no observed shift schedule is implied. Cumulative staff-hour budgets do not reset. Storage includes all original outstanding receipts plus newly reserved stock; only already fulfilled demand frees space, never predicted future sales. Non-episode external reservations remain held in every comparison. Pinned episode reservations are retained at day 0 in every admissible plan.

## Comparisons and objective

Enumerate at most 72 day-0 packages and six day-2 inventory/route combinations. Compare no additional action; fixed practical rule (infeasibility remains visible); best feasible open-loop two-epoch plan; and best feasible observation-conditioned two-epoch plan. Both bounded searches use identical scenario paths, weights, objective and constraints. No stochastic sampler is needed; fixed authored forecast seed 410102 is recorded. No MCTS claim.

Declared lexicographic objective: minimize already-incurred energy continuity gap first; then unallocated service work and unplanned invoice review; then weighted known conditional cost (new cash commitment + holding + shortage − terminal inventory value). Nonmonetized outcomes remain visible; no invented total-business-value weights. This is best only within the enumerated action/menu and explicit assumptions, not a globally optimal business policy.

## Outputs and safety boundary

Readable business story, observation groups/conditional weights, fixed/adaptive first and second choices, conditional dated trajectories, stock/cash conservation checks, resource balances, masked-action reasons, and model events (stockout, cash-limited alternative, unresolved service dependency/continuity gap). Weighted scenario incidence is an assumed finite-scenario quantity, not a real MRDIY failure prediction. No execution, real savings, trained RL, ODE/SDE/PINN, paid compute, or public publication.

## Required tests

Stock and transfer-network conservation; cash/PO counted once; event IDs posted once; unchanged input; deterministic replay; no actions outside fixed epochs; same observation → same action; no future-demand fields in observations; changed future does not alter pre-observation physical state; irreversible commitments and unchanged elapsed prefix across replan; no resource reset; feasibility masks; dates and action-relative lead times; malformed/unknown inputs rejected or abstained; bounded work and default small-CPU runtime.
