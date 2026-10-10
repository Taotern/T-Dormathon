# Demand forecast rolling expansion: reproducibility and limits

## What this establishes

Eight historical rolling folds (February–September 2011), 89,324 non-overlapping SKU-week forecast tasks. The predeclared past-validation selector scored seven-day cumulative WAPE **69.73%**, compared with the same-fold 28-day mean's **77.21%**, weekly naïve's **88.63%**, and zero's **100%**. The paired descriptive selector-minus-mean difference is −7.48 percentage points (95% SKU/fold bootstrap interval −11.63 to −3.71 points).

**This is exploratory retrospective evidence.** Those historical periods belonged to the previous study's training data and may already have been inspected. Predeclaring this analysis does not make them an untouched holdout. The original November–December test remains exposed diagnostic evidence and is never reevaluated here. The new weekly metric must not be compared directly with the original daily 103.41% WAPE.

Daily WAPE remains **108.53%** and the selector underpredicts seven-day volume by **9.35 units per SKU-week on average**. Empirical 90th-percentile coverage is **88.74%**; central-80% inclusive coverage is **84.34%**. Zero-inflated discrete outcomes affect inclusive coverage. These are evaluated empirical quantiles, **not calibrated operational stockout probabilities**.

## Source and attribution

Chen, D. (2012). *Online Retail II*. UCI Machine Learning Repository. DOI: [10.24432/C5CG6D](https://doi.org/10.24432/C5CG6D). [Dataset page](https://archive.ics.uci.edu/dataset/502/online+retail+ii). License: CC BY 4.0.

Original workbook SHA256: `bcbe73b35f5b7babf197fb0cb983a11f5d9ff929078d4aa53d171b1f2df2e980`.

No raw workbook or transactions are included here. Supply the approved `daily-sales.npz` from the existing `docs/predictive-v0.4.1/src/profile_data.py` pipeline. That pipeline's README/download script documents acquiring the attributed original workbook. Before profiling, create its `data/raw`, `data/derived`, and `artifacts` directories; run with `--file` pointing to the workbook. Use its pinned NumPy/openpyxl versions. The matrix must retain **all 4,707 product series**, with the old 3,231-item eligible mask stored separately. This expansion does not use that old mask.

The source ledger excludes returns/cancellations from positive sales, keeps them separately, applies fixed product/validity rules and global exact-row deduplication, and excludes the incomplete trailing day. Publisher-declared completeness is an explicit retrospective zero-fill assumption; real historical ingestion times are unavailable. Recorded sales may be inventory-censored and are not latent demand.

## Run

From this directory, with Python 3.12:

```sh
python -m pip install -r requirements.txt
OPENBLAS_NUM_THREADS=1 OMP_NUM_THREADS=1 python src/evaluate_rolling.py \
  --data /your/local/derived/daily-sales.npz \
  --output /your/new/output-directory
python src/verify_reproduction.py \
  --expected /your/checkout/data/forecast-rolling-report.v1.json \
  --actual /your/new/output-directory/artifacts/rolling-report.v1.json
```

The explicit input path is never a default or a bundled dataset. `input-manifest.json` verifies every array's shape, dtype and content hash before evaluation. A different ZIP serialization may change file bytes while retaining identical array content; the per-array checks are authoritative. A new output directory prevents accidental overwriting. Measured original run: 2.4 seconds, 407 MiB peak RSS, one CPU thread, no GPU or paid service. Runtime varies by machine.

`implementation-provenance.json` records the original frozen evaluator/protocol hashes and the portable hashes. The portable program changes only input/output plumbing and adds input verification. No candidate, fold, selection rule, metric or bootstrap code is tuned. Original and portable protocol hashes refer to their respective exact bytes.

## Protocol summary

- Fold test starts: first of February, March, April, May, June, July, August and September 2011; 28 target days per fold.
- Four weekly origins per fold avoid duplicate weekly outcomes. A preceding 28-day validation window alone selects the next fold's model and empirical quantile window.
- SKU eligibility is frozen before that validation window: at least 180 calendar training days and 26 nonzero recorded-sales days. Zero-test and discontinued series are retained.
- Fourteen declared point candidates include zero, seasonal naïve, mean7/28/56, daily median, trimmed mean, EWMA, SBA/Croston, TSB, seasonal means and weekly-total medians.
- Primary selection minimizes validation seven-day cumulative absolute error (equivalent to WAPE for a shared nonzero denominator). Exact ties follow protocol order. Zero-total WAPE is null, not invented perfect accuracy.
- Empirical 8/12/24-week quantile windows are selected using mean past-validation pinball loss at 0.1/0.5/0.9.
- All candidates and every fold are reported. The best test candidate does not replace the frozen adaptive selector.
- Descriptive intervals use 400 paired shared-SKU and fold-block bootstrap replicates. Eight folds and one retailer sharply limit inference.

## Product interface and simulation boundary

`forecastDemand` produces seven dated point values, empirical daily low/high values, cumulative quantiles, prior weekly paths, model/selection metadata and explicit uncertainty limits. The company demo uses a separately authored 196-day history. Its one-series validation selector is not the benchmark's full-catalog selection population and receives no transferred benchmark accuracy claim.

`forecastRisk` consumes known free-stock components and an explicitly complete dated-arrival registry. Unknowns abstain. It reports dated lost-sales stock trajectories and a conditional historical-path shortage fraction. Day 0 is the scenario world date; receipts are usable before same-day demand. Marginal daily bounds are not coherent joint paths and need not sum to weekly quantiles.

Stock, arrivals and company history are synthetic in the MRDIY demo. UCI provides no actual stock, delivery or stockout labels. There is **no demonstrated real shortage-warning accuracy, real company calibration, causal savings or automatic operational action**. Canonical saved case/action claims, rather than caller-supplied reservation amounts, determine stock commitments. Joint package feasibility handles cash, staffing and other resources separately.

Before an operational claim: freeze this candidate family, collect unseen complete transaction/stock/arrival histories with availability timestamps, define warning horizon/lead-time and asymmetric decision costs, then evaluate demand calibration and actual shortage precision/recall, warning lead time and feasible decision utility on a genuinely untouched period.
