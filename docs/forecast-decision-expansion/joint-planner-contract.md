# Bounded linked-episode comparison (v0.4.2)

Integrate only `worker/mrdiy-joint-planner.js` and `tests/mrdiy-joint-planner.test.mjs` and `tests/mrdiy-joint-forecast-parity.test.mjs`. Fixture, operations and forecast dependency copies in this isolated directory are unchanged test dependencies, not replacements for canonical files. Add the new module to the single-file build list after `mrdiy-operations.js`. All module-level identifiers use `jp` or `MRDIY_JOINT_VERSION` prefixes; imports are single-line for the existing packager.

## Existing capability versus increment

Existing `compareCaseActions` already supplies per-case actions, qualifications, intrinsic checks, resource claims, conditional outcomes, shared reservations and immutable saved single-case records. This module reuses its action catalog and checks. It adds enumeration over linked whole action packages; recomputes one inventory trajectory for SC01/SC02; reserves shared resources once; preserves one invoice decision for SC17/SC18; and compares package-level tradeoffs and linked effects. It neither trains RL nor replaces existing per-case decision storage.

## Pure API

`compareJointPackages(options = {})` is synchronous, immutable and has no external side effects.

Allowed options:
- `snapshot`: internal test/caller-supplied synthetic snapshot. HTTP layer should always use canonical MRDIY_SCENARIO.
- `assumptions`: existing declared assumption overrides, validated by `openCase`.
- `commitments`: at most 35 current sandbox reservations; each needs `case_id` and `action_id`. Authoritative action claims are resolved again, rather than trusting submitted cash/quantity fields.
- `demand`: `{status:'ok', demand_by_day:[...], forecast_ref:string|null, scenarioDataMode:'SYNTHETIC_INTERNAL', basis?:string}`. Exactly horizon_days finite nonnegative values. Omission uses the declared constant fixture demand. A supplied unknown/foreign/invalid numerical demand path abstains; never falls back to invented demand.
- `pinned_actions`: object keyed by `inventory`, `route`, `invoice`, `service`, `energy`; values must be listed below.

The forecast adapter is `{status:forecast.status, demand_by_day:forecast.forecasts.map(x=>x.predicted_units), forecast_ref:forecast.request_id || forecast.model_version, scenarioDataMode:'SYNTHETIC_INTERNAL', basis:'synthetic_company_forecast_path'}`. Do not pass an external benchmark forecast or the full forecast object.

Decision slots:
- inventory SC01: no_action, practical_rule (buffer transfer), replenish
- route SC02: no_action, expedite
- invoice SC17 (SC18 alias): no_action, practical_rule
- service SC27: no_action, practical_rule
- energy SC35: no_action, practical_rule, prioritize_safe_load

The complete Cartesian product is 72 alternatives. Pins shrink that product; no search truncation or hidden heuristic pruning occurs.

## Reservations and comparison semantics

Compatible current reservations inside the episode become pinned slots and are removed from the external claims list. A SC01 expedite maps to route; SC02 transfer/replenishment maps to inventory. SC17/SC18 invoice reviews map to one invoice slot. Same physical action aliases are represented once and warned. Conflicting pins, unknown actions, unsupported per-case actions or two external actions for one case reject explicitly. No reservation is actually changed.

All alternatives retain pins. `baseline` is a counterfactual no-change episode with its own prior episode reservations released; unrelated external reservations remain. Show its `comparison_semantics` label. `practical_baseline` is also a released-episode counterfactual, combines existing practical rules and may be infeasible. It may ignore pins and is not an admissible pinned alternative or recommendation.

Hard ledger counts physical stock including quarantined/reserved units and every in-transit receipt against storage. Simulated sales never release hard storage. Aggregate role, stock, fuel, cash, transport and backup-energy rows make double allocation visible. The existing conservative review-day transport/role accounting is retained.

## Timing and shared outcomes

Days are zero-indexed 0..horizon_days-1. An arrival on day d is added before demand for that day. All same-store/SKU in-transit shipments are included exactly once. The route slot changes only the primary linked shipment; the other arrivals retain their fixture arrival_day. A transfer adds destination units and records equal source reduction. Existing PO costs are not recharged. Conditional cost combines new package cash commitments, holding, shortage and terminal value; unpriced energy/service/invoice consequences remain separately visible.

The baseline includes DEMO_SHIP01 200 units at day5 and DEMO_SHIP02 20 units at day3. With 60 initial available units and demand20/day, shortage is20 units. Expediting the primary shipment to day3 removes that conditional shortage while reserving MYR180, 18litres and200 transport units. New order100 plus expedited shipment200 exactly binds transport capacity300. A240-unit limit makes the combined package infeasible even when either action alone fits.

Energy priority changes supported runtime and interval exposure. Day0 transfer overlaps the interruption. No operational conversion rule establishes receiving delay, so the result explicitly does not alter arrival or demand based on exposure alone. Planned arrivals never become accepted receipts or approved payments. Planned service hours never establish completion.

## Response

- Envelope: status, schema_version, input_checksum, snapshot_id, assumptions/data/provenance, immutable pin sources, explicit synthetic/simulated modes, automatic_execution:false, human_choice_required:true.
- status: ok, no_feasible_package, or insufficient_data. Insufficient data returns missing_inputs and no packages.
- decision_slots: IDs, labels and allowed actions for UI controls.
- baseline, practical_baseline and packages: package_id, actions, action_ids, feasible, binding_constraints, resource_ledger, outcomes, score_vector, Pareto flag and delta_from_baseline.
- outcomes: inventory daily trajectory/events/conservation, cash, transport/arrival, energy runtime/exposure, linked service dependency, current procurement mismatch, known conditional cost components.
- resource_ledger.rows: constraint, resource_key, capacity, prior_reserved, package_required, remaining, passed, binding and unit. A binding feasible limit is distinct from a failed constraint.
- pareto_package_ids: alternatives not dominated on continuity gap, shortage, known conditional cost, unallocated service hours and unplanned invoice review. No scalar weights are hidden. recommended_package_id is always null; the user decides.
- counts: evaluated, feasible, infeasible, pareto, bound72.
- frozen_basis: exact demand path, assumptions, authoritative external reservations and scenario clock.

Suggested UI: one compact selected whole-package card plus selector for feasible/Pareto alternatives; display baseline and practical baseline, differences, binding constraints and a resource/trajectory disclosure. Label this separate from a saved per-case choice. API remains read-only comparison; resources_reserved:false is appropriate.

## Validation

Run `node --test tests/mrdiy-joint-*.test.mjs` in the isolated folder or integrated checkout. Tests cover bounded output, original IDs, all same-stream shipments, conservation, shared resource conflicts, demand/arrival propagation, unknown-input abstention, energy exposure, reservation pins/aliases, malicious underreporting of claims, determinism and immutability. Canonical aggregate regression/build tests remain the integrator's responsibility.

Final invariant audit: 26/26 focused tests passed. Includes direct baseline parity against `forecastRisk` with constant and actual varying demand paths, four delay settings and external authoritative reservations. Twenty demand/delay combinations establish earlier-arrival shortage monotonicity. Repeated lead-time changes preserve source quantities. Separate tests establish exact cost decomposition, invoice alias deduplication, unsafe energy exclusion and caller options immutability. Numerical parity tolerance is 0.00011 units because the joint display rounds to four decimals.
