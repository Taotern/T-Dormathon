# Dormathon v0.4.1 predictive evidence and inventory sandbox

Dated 10 October 2026. This isolated package implements FR10–12/15 and the limited external-benchmark AC11/12 scope. It does not edit the canonical app, publish a Site, push Git, create paid services or use credentials.

## Result first

The compact supervised model did **not** improve on the practical 28-day mean. The validation-selected mean is retained. Its test WAPE is **103.41%**, so this is a reproducible weak/sparse-sales result, not an adequate-accuracy claim. A procedural evaluation gate does not imply high forecast quality.

| Point model | Validation WAPE | Test MAE, units | Test WAPE | Test seasonal MASE |
|---|---:|---:|---:|---:|
| Weekly seasonal naive | 123.88% | 7.7266 | 114.57% | 1.6957 |
| Trailing 28-day mean | 114.07% | 6.9740 | 103.41% | 1.5595 |
| Compact direct ridge | 122.17% | 7.6067 | 112.80% | See machine-readable report |

A separately marked posthoc all-zero diagnostic has WAPE 100%. It was added for interpretation after the test was seen and never became a new selection candidate. On intermittent sales, percentage error alone can reward an unusable always-zero forecaster. Volume/sparsity and zero-volume failure slices remain visible; no weak item was removed after test.

## Verified dataset and scope

Source: [UCI Online Retail II](https://archive.ics.uci.edu/dataset/502/online+retail+ii), [DOI 10.24432/C5CG6D](https://doi.org/10.24432/C5CG6D). Attribution: Chen, D. (2012). Online Retail II [Dataset]. UCI Machine Learning Repository. CC BY 4.0, as declared by UCI. Original 2009–2011 UK non-store retailer identity stays intact. All countries are aggregated within this retailer; no cross-company generalization is established.

Official archive and workbook downloaded and parsed. Workbook: 45,622,278 bytes; SHA256 bcbe73b35f5b7babf197fb0cb983a11f5d9ff929078d4aa53d171b1f2df2e980. Both sheets total 1,067,371 raw rows. There are 34,335 globally exact duplicate rows, including overlap between the sheets' 2010-12-01 through 2010-12-09 date ranges. Exact duplicate positive-sales lines are excluded globally; other row-quality counters overlap and are labelled accordingly. No invoice spans multiple calendar dates, so none bridges a split. No customer-level modeling or output is produced.

Target: daily **positive recorded item transaction sales**, in units, a demand proxy. Returns/cancellations, non-product records and invalid price/quantity/invoice classes are excluded with a frozen rule, not mixed with demand. Missing customer/description fields do not discard otherwise valid item sales. All qualifying outliers remain. The `exclusive_row_partition` in the data profile sums exactly to the raw-row count.

Observation rule: UCI explicitly calls this a complete all-transactions ledger over its published coverage interval. Interior calendar dates therefore have source-declared retrospective ledger completeness. An absent SKU-date means zero recorded positive sales in that ledger, not zero latent demand. All 135 whole-ledger transaction-free dates and long runs are exposed; these include 11-day year-end intervals. Closure versus collection failure is not independently audited. Missing dates supplied to the live engine remain unknown and are never zero-filled. The maximum transaction day, 2011-12-09, is conservatively excluded as incomplete. The first day relies on the publisher's stated start date.

Historical acquired-at, late-arrival/version logs, actual inventory, hidden stockouts, delivery outcomes, suppliers, lead times and all operating costs are unavailable. Evaluation uses an explicitly labelled retrospective transaction-time availability assumption, never historical system-known replay.

## Frozen temporal design

- Training: 2009-12-01 to 2011-10-13, 682 calendar days
- Validation: 2011-10-14 to 2011-11-10, 28 days
- Untouched primary test: 2011-11-11 to 2011-12-08, 28 days
- 3,231 known SKUs qualify using at least 26 nonzero **training** sales days; 1,476 are excluded using training alone
- Every eligible SKU stays in the test, including inactive/discontinued and zero-volume items
- Seven daily horizons from each of 22 daily origins per period: 497,574 test forecast tasks, versus 90,468 unique item-days
- Past observations of the same known SKU are legitimate rolling inputs. Cold-start, unseen entities and cross-company validity are not established

The direct ridge uses 15 lag/calendar features, training-only per-item scaling, seven separate horizons and weekly-strided training origins to bound compute. Ridge alpha 10/100/1000 is selected on validation WAPE only. There is no test-derived transformation, future demand feature, future news, refit or item selection. The fixed compact ridge loses on validation and test. The primary report is retained separately before the explicit posthoc diagnostics; training and its untouched test metrics were not changed afterward.

MAE is in units. WAPE is total absolute error divided by total actual units over forecast tasks, stored as a ratio (multiply by 100 to display percent). A zero total denominator yields null. MASE uses each item's training-only lag-7 absolute-difference scale, with zero scales omitted and counted. Item percentage errors are not averaged.

Paired candidate-minus-baseline differences resample SKU clusters and nonoverlapping 7-origin blocks, retaining all seven correlated horizons; 400 bootstrap replicates, seed 41010. Ridge minus 28-day mean WAPE difference is +9.38 percentage points, descriptive 95% interval +7.05 to +12.65 points. Only four time blocks exist, related SKUs may share shocks, and overlapping labels cross block boundaries. This uncertainty is descriptive and limited, not broad statistical certification.

Sensitivity reports retain the frozen population and model: duplicate lines retained, returns subtracted as a separately labelled changed-label diagnostic, long global gaps excluded from scoring, 10% input quantity noise and 2% missing history with abstention. These diagnostics never replace the primary target or choose a flattering cohort.

## Simulated decision utility is a separate claim

`simulated-policy-report.v1.json` uses the benchmark's recorded sales only as an exogenous path in an **assumed** inventory environment. It contains 12,924 nonoverlapping SKU-week episodes. Initial stock, zero reserved stock, costs, budgets, capacities and delivery timing are invented scenario values with units and declared ranges. No-action, fixed/reorder-point and forecast-informed policies share the same state and path. Lost sales is assumed; backorder is unsupported. Initial stock costs are common sunk state; end-of-horizon on-hand is credited at the declared procurement value, while committed future receipts receive no terminal credit.

The first storage calculation incorrectly allowed forecast future consumption to free hard capacity. That unsafe proposal produced 437 storage failures and is retained in `simulated-policy-report.unsafe-capacity.v1.json`. It was never called feasible. Safety version **0.4.1.1** reserves space using known usable and reserved on-hand plus every outstanding inbound commitment. Future forecasts cannot release reservations. Requested quantities are rejected/clamped before execution, with each limit and binding constraint exposed. The repaired study has zero storage failures across all nine lead-time/cost scenarios and exact stock conservation. The repair changes no forecast model, test split, costs or tuned range.

Safe base scenario simulated costs: no replenishment GBP 1,973,415.22; reorder-point GBP 1,753,891.35; forecast-informed GBP 1,572,958.47. These are aggregate invented-cost outcomes, never observed savings. At shortage penalty GBP1/unit, no replenishment is cheapest; at GBP4/10, forecast-informed is cheapest for lead times 1/3/5 days. Preference depends on assumptions and is not a real-world recommendation.

Warnings also have **simulated** labels: a SKU-week event occurs when assumed no-replenishment stock cannot cover the exogenous path. One warning is issued at episode origin. Thresholds .75/1/1.25/1.5/2 are selected using validation-only FP+4FN utility. Test threshold .75 gives TP5600/FP2005/FN516/TN4803, precision73.64%, recall91.56%. SKU-cluster bootstrap intervals and lead-time counts are in the separate report. These do not validate a real shortage classifier, real false alarms or live warning lead time.

## Portable run

Python 3.12.14 and Node 24.19.0 were used; actual Node version is recorded in the run manifest. Dependencies are pinned in requirements.txt. No GPU or advanced training service is needed.

```sh
python -m venv .venv
. .venv/bin/activate
python -m pip install -r requirements.txt
python src/download_data.py
OPENBLAS_NUM_THREADS=1 OMP_NUM_THREADS=1 MKL_NUM_THREADS=1 python src/profile_data.py
OPENBLAS_NUM_THREADS=1 OMP_NUM_THREADS=1 MKL_NUM_THREADS=1 python src/evaluate.py
OPENBLAS_NUM_THREADS=1 python src/simulate_benchmark_policies.py
OPENBLAS_NUM_THREADS=1 python src/posthoc_diagnostics.py
node examples/run-example.mjs
node --test tests/engine.test.mjs
OPENBLAS_NUM_THREADS=1 python src/check_artifacts.py
```

`download_data.py` uses only the official approved archive and aborts if its workbook bytes differ. No fallback dataset is selected. Full data stays outside app source and source-code export. Profiling took 57.7 seconds; candidate/evaluation 4.1 seconds, single CPU thread, peak RSS277MB. A clean isolated end-to-end reproduction matched all daily arrays, frozen split, selection, primary metrics, bootstrap values, model coefficients, safe-policy totals and alert counts exactly (see reproduction-check.v1.json). Exact floating-point bit equality is not guaranteed across BLAS/architectures; tolerate 1e-8 relative/absolute numerical differences while counts, seeds, dates and hashes must match. No advanced service dependency blocks the pure baseline example.

## App integration

The machine-readable report is precomputed; a screen must say so. Suggested copy path: `data/benchmark-report.v1.json`, separate Intelligence evidence area. Always keep `EXTERNAL_BENCHMARK`, original retailer identity, source/license, date range, high errors and uncertainty/limitations visible. Do not insert the benchmark in MR D.I.Y. operational records or risk scores.

Pure JS `forecast()` in `src/predictive-engine.mjs` supports the weekly naive and 28-day mean. It requires consecutive, complete, finite nonnegative history; future/late/partial labels and unknown dates are rejected. It returns point-only outputs and null uncertainty. Applying the same baseline mechanics to synthetic MR D.I.Y. history proves functionality only.

Pure JS `comparePolicies()` in `src/policy-engine.mjs` returns no-action, practical rule and forecast-informed alternatives with constraints, component costs, conservation and simulated type. `initial_stock_units` is usable free stock, and `reserved_stock_units` is required explicitly. The hero's physical80/reserved20 is initial60/reserved20. Unknown input is `insufficient_data`; no fabricated default appears. A saved human decision remains the canonical app's responsibility. These modules do not place orders or take external action.

Final contract: `artifacts/integration-contract.v1.json`. Sources, code, tests, frozen inputs and outputs are listed in `artifacts/run-manifest.v1.json`.
