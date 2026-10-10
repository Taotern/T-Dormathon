# Optional event-led simulation and learning

The existing v76 forecasts, event replay, joint plans, sequential rehearsal, saved human decisions and paid explanation ledger remain separate. This addition is an optional Strategy experience with local, on-click browser WebWorker calculations.

## Walkthrough

1. Open Strategy. Choose a sourced Hormuz, Noto or Red Sea context. The card shows event date, source cutoff and the source link. Read the explicitly hypothetical retailer exposure, enter 0–5 additional whole arrival days for DEMO_SHIP01, and confirm. Choosing a headline alone does not change physics. Kimi is strategic context only, with no operational run.
2. Run the same seven-day episode. The calibrated inventory-cover/myopic controller, genuinely trained tabular Q policy and observation-history UCT see equal public observations and feasible masks. Inspect actual day-by-day stock, resource balances and chosen actions. A run is a conditional illustration, not heldout evidence. The corrected heldout report is collapsed; primary Q and MCTS do not beat the stronger controller on mean score, while Q reduces shortages at greater cost.
3. Open Update model. Releasing September 25 performs the real rolling-window fit that reproduces the shipped September 26 model, with the same untouched later holdout before/after. Release September 26 next to fit and install a genuinely newer active model. Frozen Q weights then use disclosed fallback; the consumed old holdout is withheld. Fitting never rewrites the previous episode or v76 decisions.
4. Inspect dynamics. Run the coupled stock/cash/staff/fatigue/backlog/thermal schedule and exact RC versus trained PINN comparison. The event delay is explicitly not applied to this separate fixed-schedule solver inspection. Displayed small nonzero errors preserve precision. The PINN is genuine but offers no accuracy advantage over exact RC here.

## Runtime contract

`/simulation/learning-task-worker.js` accepts bounded tasks `episode`, `update`, `dynamics`. It imports the approved browser modules. Edge code serves bytes only and has no learning compute endpoint. No providers, network feed, database write, autonomous action or background training is called. Browser CSP permits only same-origin Workers. One Worker runs at a time, with actual progress, cancellation by termination, 30-second hard timeout, request identity checks and stale view/case/model/seed/event rejection. Unsupported browsers or failed Workers leave v76 usable.

Episode choices are three disclosed seeds and 32 or 128 MCTS iterations per decision. The fixed authored evaluator world is separate from the policy calibration and never enters public observations. After a refit, MCTS/controller receive the actual fitted calibration. The immutable Q artifact uses its safe mismatch fallback, visibly labelled. New event impacts change only the confirmed existing shipment ETA equally across policies; no demand, severity, probability or company exposure is inferred from a headline.

## Evidence and pins

- Dynamics manifest: `7ed2364dbe1788750bc09dc59496c4a3fd82e815c85e953c5da737009b8f8014`.
- Planning adoption manifest: `09b37d3ff020d3b2122fe2b3263cadcf57cb2425008d37abe7cf5c116b1a5476`.
- Exact event JSON: `103756853af9cda64791f16e4f9dc50d27a496ce85a2b51df7b30440679cc5d8`.
- Independent module audit receipt: `040b6566a6a7810777fb6be16cd70dfd80cbfb46ba50a311ed1fd8b9824c8df7`.
- Eighteen runtime file pins and the sole approved adapter import relocation are recorded in `data/learning-adoption/approved-source-pins.json`.
- Frozen primary learned policy digest: `fnv1a32:f44b7eff`; actual training was 20,000 seven-day episodes per seed, three seeds, primary selected in advance.

No high-fidelity real-company validation, real savings, guaranteed RL superiority, production daily scheduler or autonomous execution is claimed. Host-browser visual/runtime QA is a separate publication stage.
