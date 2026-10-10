# English-first Hackathon vertical

The current private Site serves Risk & Decisions as its default workspace, alongside the four preserved information views. This is a functioning prototype journey, not production readiness or proven business benefit.

## Try the genuine saved journey

1. Open the linked demo case. Its order, purchase order, invoice, task and food batch are explicitly synthetic, with fixture-declared business IDs.
2. Edit inputs and update observations. Stock100/daily use20/planned delivery7/assumed extra delay3 gives a five-day conditional gap; stock400 changes it to zero. An incomplete payment ledger remains unknown. Open-task delays refer to an internal target, not a formal SLA breach; expiry surplus is a scenario, not observed disposal.
3. Find the saved MYR reference, inspect its original source/units/version, and attach it as possible public context. It does not prove a delivery delay or a company exposure. In-page draft edits survive evidence navigation.
4. Save the analysis, then record a human-selected preventive check. Inputs and cited evidence are frozen; the action is announced/not implemented. No order, payment, message or operating action is executed.
5. Save feedback and reopen the saved case URL. Feedback cites the displayed newest decision, with evaluation pending and trained=false. A feedback record alone proves no improvement.

All interface/status/error explanations are English. Source quotations, names, values and units are retained; untranslated service diagnostics are available only in labelled disclosures. Queries, source-period context and case_id survive the initial route/reload. Desktop and actual500px evidence-reader/Back and Search-help use have been checked.

## What is actually connected

- Existing private case/evidence/review/action tables; no new migration or service.
- Actual saved operating records from the D1 `records` and `sources` tables. A user selects exact record IDs; the service freezes their payload fingerprints, source IDs/hashes, source retrieval times, world time, knowledge clock, evidence references and assumptions in an append-only review.
- FR12's shared daily hybrid simulator, seeded futures, no-action/rule-based/simple-planning/vector-Pareto-Q policies and candidate-first-action rollouts with simple-planner follow-ups. It uses common seed schedules, returns objective vectors without a hidden score, and shows daily P10/median/P90 summaries plus stepwise representative state/event/action paths, bounded to at most 100 futures/action and 30 days.
- Exact public evidence versions remain separate from operating data. A version must be attached and explicitly confirmed, then manually mapped to a supported typed variable and record with a validity window. A mapping only changes a stated scenario assumption; it does not establish causation.
- Explicit hard-constraint checks for available cash/action budget, route passability, storage, invoice approval, supplier state, task qualification/availability/rest, resource capacity, duplicate allocation and action cost. Unknown requirements are indeterminate; infeasible actions do not receive projected paths.
- Offline transition-marginal and vector-Pareto-Q training on 4,000 simulator-generated synthetic episodes. The artifact includes two 100-seed held-out simulator configurations, per-metric errors/coverage and policy comparisons using shared seeds. The UI labels these as simulator fidelity only; it does not present them as operational accuracy. User feedback remains pending evaluation; there is no background or online training.
- Actual saved intelligence/evidence and the four information pages remain intact. The original51,471 indexed versions and separate CVD171 historical trajectories are unchanged.

FR07 entity resolution and FR08 general-purpose as-of reconstruction are still separate unsupported services. FR12 performs its own bounded state freeze from user-selected D1 rows; it does not claim to provide those broader services. [Port request examples](../contracts/prototype/port-examples.v0.2.json) remain proposals for FR07/FR08. [Port contract and live prototype routes](../contracts/prototype/ports-v0.2.md) describe the implemented FR12 boundary.

Four-layer route/exposure applicability, independently verified counterparty history, representative operational datasets, real-world transition calibration and operational out-of-sample strategy evaluation remain incomplete. The synthetic held-out checks measure whether this simulator's learned marginals transfer across changed synthetic configurations; observed errors and interval coverage are exposed for review and do not establish real-world accuracy. Public evidence-to-variable mappings are deliberately limited to reviewed delay assumptions. Synthetic policy performance is not operational performance; no causal effect, reward truth, autonomous learning, automatic daily operation or production hardening is claimed.

## Reproduce

Verified Node24 entrypoints require no credentials or external call:

```sh
node scripts/build.mjs
node scripts/validate-artifact.mjs
node --test tests/sandbox.test.mjs tests/fr12-database.test.mjs tests/prototype.test.mjs tests/collector-workbench-behavior.test.mjs tests/formal-workspace.test.mjs
```

Current FR12 database/simulator/produced-Worker tests pass 12/12 and the frontend behavior suite passes 25/25. The full Node24 suite reports 386/404 passing; 18 failures remain in unrelated CVD import, Windows absolute-path, reviewed source-chunk fingerprint and source-pack manifest checks. Those failures are outside the FR12 files changed here. These unit/integration checks do not claim a new private-Site browser acceptance run.

English-before-Chinese approved specification and handoff blocks remain byte-pinned from private main09af336; original Chinese v0.3 files are preserved.

This acceptance is the functional English baseline. The next visual pass will prioritize a concise case overview, primary risk/next action, accessible evidence/coverage and a collapsible input editor. The eye-catching consultant presentation is not yet accepted; cancelled presentation-heavy/hyperfrontend work is not resumed.
