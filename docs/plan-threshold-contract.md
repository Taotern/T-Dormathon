# Discrete plan stress tests, v0.1.0

## Delivery and integration boundary

Only integrate `worker/mrdiy-plan-thresholds.js` and `tests/mrdiy-plan-thresholds.test.mjs`. The three other worker files are unchanged canonical-v74 dependencies copied for isolated testing, not replacements. No canonical files, UI, routes, event mapping, persistence, or external execution were changed. The primary event workflow remains owned by the integrator.

When integrated, add this module after `mrdiy-joint-planner.js` in the existing single-file packager. All internal names have the `pt` prefix; imports are single-line. It is a synchronous, deterministic, immutable, browser-Worker-compatible computation with no Node APIs, network calls, clock, randomness, paid APIs or GPU requirement.

## API

`comparePlanThresholds({selected_package_id, snapshot?, assumptions?, commitments?, demand?, pinned_actions?, grid?})`

The five existing joint options pass through unchanged. Omitted demand explicitly uses the existing declared fixture demand. Supplied invalid, missing-numerical or external-benchmark demand abstains. An absent or unavailable selected package also abstains, without selecting a replacement.

Use the exact assumptions, demand and commitments that generated the displayed package. In the event replay flow this means its confirmed synthetic replay options and resolved company demand, not observed weather interpreted as a numerical delay. This module never infers event impacts.

Do not pin the selected package merely to stress-test it: that would discard alternatives and artificially change Pareto membership. Explicit pre-existing pins and reservation-implied pins remain honored. No baseline or saved choice is mutated.

Important: the planner's `frozen_basis.assumptions` is an expanded record, not an override object. Pass the original override object; if reconstructing overrides from a frozen record, use its parameter-register entries (`parameter` and `value`), rather than passing fields such as `id` and `parameter_register` to the override API. Frozen external resource claims also are not a substitute for original commitment identities; pass original authorized commitment records.

Default grid:
- absolute `delay_days`: 0, 1, 2, 3, 4, 5
- `demand_multipliers`: 0.75, 1, 1.25, 1.5, 2

Custom grids may use at most six distinct integer delay values in 0..5 and at most five distinct finite demand multipliers in 0.5..2. Arrays are sorted without mutating inputs. Each multiplier scales every day of the exact base demand path, preserving its shape. Delay is absolute, not additive, and only the canonical primary shipment timing changes. The source forecast identifier is preserved in the base-demand record, but scaled demand is explicitly a hypothetical stress path, not a forecast produced by that source.

Resource budgets are not an axis because no canonical assumption override exposes them. Existing frozen resource constraints remain enforced. A test snapshot may contain resource limits for tests; this is not a proposed production HTTP snapshot override.

## Result

- `current`: exact selected package under original options; multiplier 1, even if omitted from the grid.
- `points`: tested coordinates with selected package feasibility, shortage, demand coverage, energy continuity gap, full continuity, score vector, planned arrival, failed/binding constraints, Pareto membership, feasible-alternative count, Pareto alternative IDs and feasible dominating alternative IDs.
- `tested_transitions`: every changed boolean property between adjacent tested coordinates on a slice where the other coordinate is fixed; both directions retained.
- `observations`: point IDs with infeasibility, unmet demand, continuity gaps, or feasible-but-dominated packages.
- `frozen_basis`: base demand and source, assumptions, resolved external resource claims, explicit and reservation-implied pins, scenario clock.
- `tested_bounds`: actual tested min/max; `allowed_grid_ranges`: validation domain; `computational_bounds`: workload limits.
- All results require human choice and report no automatic execution, recommendation or resource reservation.

`status: ok` means the bounded comparison is available; it does not mean the selected plan is feasible or preferred. `no_feasible_package` at a grid point is a valid comparison result. `insufficient_data` returns no made-up metrics. Partial grid abstention retains valid points with null selected metrics at unknown points and does not bridge those gaps with transitions.

Feasibility, coverage, continuity and preference are deliberately separate. Positive shortage or an energy continuity gap can exist in a hard-resource-feasible plan. An infeasible plan is not called dominated; it is rejected by the actual constraints. A feasible dominated plan lists alternatives no worse on every canonical score and better on at least one. Pareto efficiency is not a unique recommendation, guaranteed user preference or global optimum.

## Honest example language

For the canonical default Pareto package, `joint_practical_rule__no_action__practical_rule__practical_rule__prioritize_safe_load`:

- At fixed original demand, the package covers demand at tested delay 3 days; at tested delay 4 days, it has 20 units of shortage and leaves the Pareto set. It remains hard-resource feasible.
- At fixed delay 2 days, it covers demand at multiplier 1; at tested multiplier 1.25 it has 5 units of shortage. It remains Pareto-efficient there, but is dominated at tested multiplier 1.5.
- Its energy continuity gap remains 1.3 hours across this grid. Testing delay and demand alone establishes no energy-capacity tipping point.

Say “coverage changed between tested values 1 and 1.25” or “at the tested value 1.25 this plan leaves demand uncovered.” Do not say “exact failure threshold 1.25,” “every value above 1 fails,” “weather causes this loss,” “stockout probability,” or “globally optimal.” Do not say “no longer preferred” when it was already dominated at the starting point; show the current reference and transition direction.

## Computational budget and verification

At most 30 grid points plus one original-reference call. Each enumerates up to 72 package alternatives, for 2,232 enumerated alternatives. The unchanged planner also evaluates two explicit counterfactuals per call, at most 62 more arithmetic evaluations. Typical default module run on this environment was 0.2–0.3 seconds, not a browser or production latency guarantee. Use a Worker or a server call and avoid automatically recalculating on every keystroke.

Run `node --test tests/mrdiy-plan-thresholds.test.mjs`. Coverage includes all-point parity with the canonical ledger and Pareto results, exact nonconstant forecast scaling, transparent coverage boundaries, energy infeasibility, authoritative reservations, pin retention without pinning the selection, no-feasible cases, missing-input abstention, partial unknown grid points, zero demand, deterministic frozen-input immutability, limits and single-point non-boundaries.

Integration build, HTTP validation, UI stale-response handling and production/browser performance are intentionally not claimed by these isolated tests.
