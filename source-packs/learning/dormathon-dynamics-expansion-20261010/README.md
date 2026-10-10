# Runnable calibrated retail dynamics extension

Additive Hackathon demonstration for the frozen MR DIY Malaysia-inspired source at b100ca9f157fe03946e1b87a48bf4514a7c862d0. Canonical source, deployment and repository remotes are untouched. Every operational observation/trajectory here is synthetic. This is not a high-fidelity company digital twin, real savings, warning accuracy or execution authorization.

## Run

Requires Node 24+, no install, network, paid service or credential.

- `npm test`: focused dynamics/calibration/neural/report contract tests
- `npm run calibrate`: regenerate dated synthetic observations, fitted model versions, pre/post heldout metrics, trained physics-informed neural weights and Worker artifacts; one small CPU process with 96 MiB JS heap
- `npm run demo`: produce `artifacts/dynamics-demo-output.json`

Coordinate the calibration job with any other shared training/evaluation work; no concurrent training processes were used in delivery. First fit+neural training run took about 0.3 s and measured current RSS about 54 MiB. Final reproducibility run recorded peak RSS 64.5 MiB. Exact inference and light contract tests use no external framework.

## Live Worker entry points

Copy these seven new files, preserving imports, into the integration's worker directory:

1. `mrdiy-dynamics.js`: portable public state/action/step/environment
2. `mrdiy-calibration.js`: actual bounded dated parameter fitting and heldout scoring
3. `mrdiy-thermal-pinn.js`: optional trained thermal neural inference
4. `mrdiy-calibrated-artifacts.js`: frozen effective parameter artifact and neural weights
5. `mrdiy-dated-observations.js`: explicitly authored synthetic dated extension, not real records
6. `mrdiy-dynamics-demo.js`: runnable report APIs
7. `mrdiy-dynamics-task-worker.js`: optional dedicated browser Web Worker dispatcher

The contract is `docs/portable-contract.md`. No original fixture/dependency file needs replacing. The separately developed learned-planning module imports the dynamics kernel and calibration artifact. `artifacts/dynamics-portable-manifest.json` records every source byte hash.

For browser execution, instantiate the dedicated Worker entry as an ES-module Worker and send `{request_id,task,options}`. Tasks are `dynamics`, `calibration_replay`, `one_day_update`, `pinn_comparison`. Returned messages preserve request_id and include status/result or a visible error. The entry imports only local JS, performs zero network/server calls, and has no third-party runtime dependencies. Heavy learned planning should use the separately integrated browser Worker, avoiding edge CPU limits.

- `runCoupledDynamicsDemo({seed,thermal_solver:'exact'|'pinn'})`: seven dated daily state transitions under a fixed declared schedule, public states and evaluator-only diagnostics
- `runSingleDayModelUpdate({new_observed_date:'2026-09-25'})`: one new authored dated sales/thermometer release → actual rolling refit → complete parameter version change → same untouched future heldout metrics; reports both scores and rolling-window drop
- `runDatedCalibrationReplay({as_of:'2026-09-26',window_days:56})`: actually refits selected past rows at call time, emits fitted parameters/provenance plus frozen heldout before/after comparison, demonstrates replacing only the policy model while preserving resource/history state and fixed evaluation truth
- `compareThermalSolvers({seed})`: same-seed/same-action exact RC versus actual trained-PINN workday inference, segment counts, temperature discrepancy and both outcome vectors

No dataset or source is sent to a third party. These report APIs run locally in JavaScript. Catch malformed-input/insufficient-data errors at routes and show a visible unavailable result, not zero metrics or an invented recommendation. Reports can be slower than static strings but are bounded to one seven-day episode or one 56-day fit.

## Coupled model

State has available target/source stock, available cash, fixed opening PO reserve, outstanding dated receipts, cumulative fuel/staff/backup energy commitments, physical store-zone temperature, fatigue, service queue and an elapsed-uncensored-sales demand belief.12 daily actions combine retain/transfer40/order100 with normal/support staffing and retain/cool thermal continuity. Known original receipts are200 units on day 5 and20 on day 3. New orders arrive day+3 and reserve cash 825 MYR once. Transfers debit source 40 and consume 8 litres. Support reserves one extra role hour and20 MYR; cooling reserves 6 kWh and 0.25 role-hour. These are declared added action assumptions, not reused claims of executing the original 40-case model. Storage is a 600-unit allocation to this SKU, and the six-hour incremental staff pool is an authored aggregate budget; it does not establish interchangeable receiving/service/facilities qualifications or a real shift schedule.

- Inventory/source/cash/resource/receipt conservation is enforced at every transition. Outstanding receipts reserve storage before arrival. Resource balances never reset.
- Demand log-deviation follows `dZ=-kappa Z dt + sigma dW`; exact OU daily transition is sampled. Demand is nonnegative weekday level times `exp(Z)`; caps/parameters are declared synthetic.
- A one-zone RC thermal ODE is `dT/dh=k(Tout-T)-g Pcool`. Exact piecewise analytic updates feed heat exposure and processing capacity. Overnight relaxation is exact and battery is never recharged inside the episode.
- Fatigue is `df/dh=build*u*(1-f)-recovery*(1-u)*f`, with utilization from lagged fulfilled sales and staffing. Its exact constant-utilization solution plus overnight recovery affects processing/service. Using lagged public sales avoids revealing unserved latent current demand.
- Service queue is `dB/dh=intake-lambda B`, with intake from fulfilled sales plus a declared scheduled inquiry rate. Exact positive queue dynamics carry backlog between days.
- Reward is negative declared conditional cash+shortage+holding+backlog+heat cost, with separate outcome metrics. It is a synthetic training/evaluator score, not live observable business accounting. No revenue/payment is invented. Root planning reports compare this same objective/menu/model using their own declared heldout experiment.

Public observations never include RNG, true hidden log-demand, current unserved demand, reward or cumulative conditional cost. Scenario/evaluator diagnostics are separate and must never become policy state. MCTS initializes fresh hypothetical worlds from the public history-derived belief and independent seeds. Approximate belief-state search is not exact POMDP inference.

## Actual dated updating and heldout evidence

An explicit separate generated record set has 180 dated sales rows and 720 thermometer rows from 2026-04-13 through 2026-10-09. Latent generator demand is not stored. Sales capped by a declared stocking limit are labeled censored and excluded from fitting. Generator seed 410105 is reproducible.

Fitting uses 56 rolling days strictly before each as-of time. Demand weekday-shrunk log-linear levels and adjacent residual AR(1) moments yield OU parameters. Thermal rate uses bounded least-squares grid plus conditional linear cooling-gain fit. Service, fatigue and reward coefficients remain authored and unfitted. Every artifact includes selected-observation and complete-effective-parameter fingerprints; different costs/priors cannot silently share a version.

Pre-update model: fitted before 2026-08-03. Updated model: `calibrated-2026-09-26-d7d491a4`, observations through 2026-09-25 only.19 daily dated replay artifacts demonstrate cumulative data release/refitting; there is no automatic operational feed or background ingest.

Same frozen 14-day holdout 2026-09-26 through 2026-10-09, 13 uncensored sales rows and 56 thermal rows:

- Demand absolute error: 7.1335 → 1.6896 synthetic units/day
- Demand RMSE: 7.4202 → 2.1834 synthetic units
- Thermal one-step RMSE: 0.0430 → 0.0418 °C

The authored demand generator includes a level change; update recovers that synthetic change. These tiny-sample improvements do not establish real-company performance. The demand level predictor is a lognormal median/weekday level, not an asserted mean forecast. No holdout hyperparameter tuning was used. Calibration after the old holdout start cannot inherit its holdout score; the API rejects that evaluation and report shows unvalidated instead.

## Genuine small physics-informed neural component

The optional network has one 12-unit tanh hidden layer and 37 trained parameters. It approximates normalized RC decay `y(x)`, `x=k*h`, using `y=1+x*N(x)` so `y(0)=1` exactly. Training loss is mean `(y'+y)^2` at 41 collocation points plus twice sparse exact-synthetic-data squared error at 4 points. Adam 8000 steps uses exact analytic input and parameter derivatives, no heavy framework.

Its governing ODE is explicit, known and valid for this assumed constant-forcing one-zone RC component. This is a real trained PINN, not a label added to conservation arithmetic.100 checked off-grid validation locations exclude every collocation/data location; decay RMSE 0.0000626, maximum error 0.0001488, residual RMSE 0.0004207. Input bounds and piecewise exact fallback are explicit. The standard seven-day comparison invokes 224 neural workday segments; overnight RC stays exact. Segment counts and mixed fallback are reported. Neural weights/config are fingerprinted as `thermal-pinn-6d9ccfa2`.

Exact analytic RC is simpler and more accurate for this scalar problem. PINN supplies a portable bounded approximation demonstration; no speedup, superior planning or increased operational fidelity is claimed. A richer neural simulator would need real measured dynamics, identifiability analysis, failure envelopes and new heldout validation.

## Primary technical references

- [Raissi, Perdikaris and Karniadakis, physics-informed neural residual formulation](https://arxiv.org/abs/1711.10561)
- [EnergyPlus Engineering Reference, capacitance/zone heat balance basis](https://energyplus.readthedocs.io/en/stable/guides/engineering-reference/2.1-basis-for-the-zone-and-air-system-integration.html)
- [FSU Ornstein–Uhlenbeck numerical demonstration](https://people.sc.fsu.edu/~jburkardt/py_src/ornstein_uhlenbeck/ornstein_uhlenbeck.html)

These sources support mathematical techniques. They do not validate our authored retail parameters, fatigue dynamics, service queue, actual weather, or operational performance.
