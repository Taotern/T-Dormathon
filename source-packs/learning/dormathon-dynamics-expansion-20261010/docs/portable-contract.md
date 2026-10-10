# Portable daily environment contract v1

Module: `worker/mrdiy-dynamics.js`. No dependencies, browser Worker-safe ES module.

Exports: `DEFAULT_CALIBRATION`, `ACTION_MENU`, `createInitialState(options={})`, `observe(state)`, `legalActions(state)`, `transition(state,actionId,exogenous,calibration)`, `createEnvironment({seed,state,calibration,mode})`.

`createEnvironment` returns `observation()`, `legalActions()`, `step(actionId)`. The last returns `{state, observation, reward, done, info}`. `state` and `observation` are sanitized public JSON only. The actual demand SDE state and PRNG are private closure values. An episode has seven daily decisions, prior commitments carried throughout. Every state is immutable to its caller.

The 12 stable action IDs combine `none|transfer40|order100`, `normal|support`, `none|cool` joined with underscores. `legalActions` returns an array of feasible action objects `{id,inventory,staff,energy,claims}`. `transition` rejects a masked action before modifying anything. Each actual order has a unique dated identity. Original receipts are already PO-reserved; they do not consume cash again. New reservations and physical receipt posting happen once. No sales revenue, real payment, real dispatch or actual work completion is claimed.

Public JSON fields are day, date, start_date, horizon_days, inventory_units, source_units, cash_available_myr, opening_po_reserved_myr, storage_capacity_units, orders, resources, fatigue, backlog_hours, indoor_temperature_c, last_sales, demand_belief, history, cumulative and initial. Public cumulative values contain fulfilled units, transferred units, received units, new cash commitments, consumed staff/fuel/energy, support hours and heat exposure. Lost demand and reward/cost are NOT cumulative observation fields. History contains dated actual fulfilled sales, censoring indicator, public receipt IDs and selected action ID; never lost demand or RNG. Censoring means demand could have exceeded physical or processing capacity; a censored fulfilled value cannot update the demand estimate as if it were complete demand.

A policy receives observation and feasible action list ONLY. `info` includes realized hidden demand/shortage and per-step reward arithmetic for evaluator diagnostics; it must not be passed into later policy state. Reward is a synthetic simulator score, not a live observable accounting measure.

MCTS generative model: `createEnvironment({seed: freshIndependentHypotheticalSeed,state: observedPublicState,calibration,mode:'planning'})`. It initializes hidden log-demand from public past-sales belief, not the actual hidden process or seed. This is approximate belief-state search; not exact POMDP inference. Independent hypothetical draws are never replaced by actual future draws. A source/evaluation environment must not be cloned for planning. Evaluation seed is held by the experiment harness, never encoded in observations or policy artifacts.

Calibration ID is logged in state. Calibration can change only between decisions; `replaceCalibration` supports same-resource-state model updates. Retained history and every irreversible resource counter remain unchanged. Calibration artifacts contain fitted synthetic observation rows strictly before their as-of time and no evaluation episode labels.

Limits: authored MR DIY-inspired compact store/SKU episode, not full original 40-case execution; baseline staffing and thermal/fatigue/service models are new explicit synthetic assumptions. Official weather is not silently consumed or relabeled as operational observations. All output is demonstration-only and automatic_execution=false.

`opening_po_reserved_myr` is fixed 4,160 MYR pre-existing reserve, not a current total PO ledger. New purchase commitments are included exactly once in cumulative.new_cash_commitments_myr. `createEnvironment` optionally takes `world_parameters` for evaluation only; they are fixed when calibration is replaced. Policies/MCTS see their fitted calibration, never world parameters. Replacing calibration affects only the policy model and future public belief updates; it does not rewrite the actual world.

Optional solver arguments: `createEnvironment({thermal_solver:'pinn',thermal_pinn:THERMAL_PINN_ARTIFACT,...})` and `transition(state,action,exogenous,calibration,{thermal_solver,thermal_pinn})`. The workday reports exact/neural segment counts and explicit mixed exact fallback outside the trained thermal domain. Solver configuration and neural weights are validated/cloned before use; failed transitions roll back private randomness. Overnight relaxation remains exact.

Browser task entry: `mrdiy-dynamics-task-worker.js`, protocol `{request_id,task,options}`. Known tasks are dynamics, calibration_replay, one_day_update and pinn_comparison. It imports local code/data only and performs zero network calls. Root integration still needs actual browser/render QA.

The compact incremental staff pool aggregates six authored qualified-role hours for this demonstration. It does not inherit or prove all role qualification/authorization constraints from the original 40-case planner. The 600-unit storage allocation is SKU-specific and authored; it is not the full store's measured storage space. Original routes, contract execution and task completion require the original detailed planner and real validation.
