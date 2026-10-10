# Hackathon module ports — v0.2

FR12 is now available as a local, bounded Worker service. FR07 entity resolution and FR08 general-purpose state reconstruction remain assigned services and are reported as unsupported. FR12 does not pretend to replace either service: a run accepts exact records and clocks from the existing D1 store, freezes them as a `workspace_reviews` state, and reports every unknown constraint.

Owners remain: teammate1 resolves entities/relations (FR07); teammate2 reconstructs/replays general state (FR08); Felix compares candidate actions and seeded futures (FR12). No external service URL or credential is invented.

## FR12 data and model boundary

- `data/prototype/fr12-assumptions.v1.json` contains labeled synthetic distributions and illustrative action costs. `scripts/train-fr12.mjs` trains an empirical disturbance transition model and vector Pareto Q policy on simulator-generated synthetic episodes only. The artifact states that learned disturbance marginals apply to synthetic fixture inference only; D1-backed runs require explicit frozen uncertainty assumptions. Operational outcomes are not used as reward truth.
- `data/fr12-world-model.v1.json` is the trained artifact bundled into the Worker at build time. The analysis includes its hash, training basis, model version, policy version, scenario seed and limits.
- A real-data state requires 1–40 exact D1 record IDs, a `knowledge_as_of` clock, a `world_time` clock, and optional validated user-supplied assumptions. The frozen review contains each record payload/fingerprint and the source ID, retrieval time, kind and SHA-256. Source rows must have been retained by `knowledge_as_of`; records after `world_time` are rejected.
- There is no synthetic-assumption fallback for D1-backed states. Missing inventory, currency, cash, invoice approval, task completion or qualification constraints remain unsupported/indeterminate. Historical `energy.waste_kg` observations are not treated as current inventory.
- A public evidence version only changes a model input through a separate explicit mapping: the exact attached version/hash must be user-confirmed, the mapping targets an existing supply record, and this first version supports only `delay_assumption_days` in days with a validity interval and note. This mapping is a scenario assumption; it does not prove causality.
- Energy futures use the latest completed interval selected for each exact `meter_id`, converted to a daily kWh rate. They remain indeterminate until the state explicitly sets `energy_persistence_confirmed:true`. An energy-saving branch also requires a typed fractional reduction and MYR cost. Historical `waste_kg` is not treated as present inventory; waste projections require separately supplied current stock, use and expiry assumptions.

## Current routes

- `GET /api/prototype` returns the synthetic fixture preview, FR12 model metadata, current case and port statuses.
- `POST /api/prototype/start {fixture_id:'linked-operations-v0.2'}` idempotently creates the clearly labeled synthetic case.
- `POST /api/prototype/evidence-review {id,association_status,association_note}` records a user review of an already attached exact public evidence version.
- `POST /api/prototype/evidence-mapping {case_id,version_id,target_record_id,variable,value,unit,valid_from,valid_to,note}` appends a reviewed typed mapping. The evidence version must be attached and confirmed by a user.
- `POST /api/prototype/state {case_id,record_refs,knowledge_as_of,world_time,assumptions?}` freezes selected D1 rows, exact evidence references, active mappings, assumptions, both clocks and a state hash as an append-only review. A changed input requires a new state review.
- `POST /api/prototype/analyze {case_id,state_ref,actions?,objectives?,constraints?,horizon?,scenarios?,seed?}` compares a frozen real-data state. For the synthetic demo only, `{case_id,inputs}` remains supported. `POST /api/prototype/save-analysis` saves the same result as an immutable review.
- The PolicyComparison supports 1-10 candidate action IDs, a 1-30 day horizon (default 14) and 1-100 seeded futures per action (default 100). It contains ScenarioRun records for no action, rule-based, simple-planning, synthetic Pareto-Q and candidate first-action continuations; each run reports raw metrics with units/status, constraint checks, feasibility, assumptions, references, model/policy/simulator versions, model hash, seed and uncertainty. Daily P10/median/P90 metrics and up to three reproducible stepwise paths are returned per run. Pareto comparisons are vectors without a combined score, and the saved review size is capped.
- `POST /api/prototype/decide {case_id,analysis_id,title,note}` records a human-selected next step together with the analysis hash and frozen record/evidence references. It never executes orders, payments, messages or other operating actions.
- `POST /api/prototype/feedback {case_id,action_id,feedback,note}` remains user-reported feedback with pending evaluation and `trained:false`.

Real-data action effects and disturbance distributions must be explicitly supplied as scenario assumptions before they can affect a branch. The service returns `ScenarioRun` records for closed-loop no-action, rule-based, simple-planning and Pareto-Q policies, plus candidate first-action runs whose follow-up actions are selected by the simple planner. Every policy and candidate uses the same scenario seed schedule. Daily steps retain states, events, selected actions and exact record/evidence references; run and path context includes the assumptions and constraints. These are conditional seeded futures, not calibrated operational probabilities. A policy trained on synthetic episodes is not evidence of operational improvement.

## Reproduce

```sh
node scripts/train-fr12.mjs 4000 7919 data/fr12-world-model.v1.json
node scripts/build.mjs
node --test tests/sandbox.test.mjs tests/fr12-database.test.mjs tests/prototype.test.mjs
```

No database migration, scheduler, external credentials, background training, or automatic execution is introduced. Original operating records, retained public evidence and the separate CVD dataset remain in their existing tables.
