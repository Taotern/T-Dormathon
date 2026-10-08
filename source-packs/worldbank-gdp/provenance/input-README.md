# Longitudinal foundation: nominal annual GDP

This is one acquired and tested foundation for the existing intelligence product. It adds typed annual economic observations and a real period/geography completeness matrix. It does not claim current incidents, every-country fine detail, complete political/enterprise relationships or all requested domains.

The official World Bank GDP indicator explicitly labels its data CC BY4.0 and advertises 1960–2025 availability. The actual package acquires **2020–2025 and 1990–1994**. The 2020–2026 request returned no 2026 observations. **1995–2019 remains unacquired**. Data are nominal/current-price United States dollars, not constant-price GDP, PPP or a derived growth forecast. Country-specific calendar/fiscal alignment and accounting-method changes remain unverified where the API supplies no detail.

The API returned 217 provider-defined economies and 48 overlapping aggregates. The separately fetched dimension snapshot contains 217 economies and 79 aggregates; the additional 31 aggregates are not present in this GDP response. Five income-group observations have blank iso3 fields and are resolved only by their exact supplied two-character alias against the pinned World Bank dimension, never by guessed country names.

For 2020–2025, **186 economies have numeric data in every year**, and 211 have at least one numeric observation. British Virgin Islands, Eritrea, Gibraltar, North Korea, South Sudan and Yemen have no numeric value in this acquired six-year slice. The per-year/per-economy matrix preserves every supplied null. For 1990–1994, 192 economies have all five numeric values. These are World Bank economic reporting units, not a sovereign-state count or a reconstruction of 1990 borders.

There are 2,915 actual observations in 34 capped delivery chunks. This number defines the processing batch, not coverage progress. The coverage matrix and continuity results define the acquired information.

## Typed temporal and revision contract

- Stable observation identity: source + indicator + World Bank reporting geography + annual period
- Observation year remains in `facts.observation_period`, with annual granularity
- Publication/event/per-observation update clocks remain null where absent
- `facts.vintage.dataset_last_updated_date` is the source's **2026-07-13** date-only dataset vintage, not a fabricated per-record timestamp
- Values, status, units, geography, observation period, vintage and methodology remain semantic
- Only local acquisition clocks (`first_seen_at`, `fetched_at`, `ingested_at`) are excluded from the semantic hash; raw/chunk hashes remain separately pinned evidence
- Country/economy classifications are from the current retained dimension snapshot, not verified historical memberships
- Aggregate groups overlap economies and each other. Do not sum them into global totals
- No numeric values are fabricated for missing cells or absent 2026 observations
- This batch contains one current vintage, not a history of prior releases or revisions

## Portable acquisition and processing

Use Python 3 and Node 24 with standard libraries only. No accounts, keys, packages, paid infrastructure or Site writes are required.

Keep code in a repository and bulk artifacts in a separate writable directory:

```sh
python run-slice.py --work-dir /path/to/artifact-storage --acquire metadata
python run-slice.py --work-dir /path/to/artifact-storage --acquire recent
python run-slice.py --work-dir /path/to/artifact-storage --acquire historical
python run-slice.py --work-dir /path/to/artifact-storage --build --test
```

The fixed endpoints are declared in `acquire-bounded.py`. One named attempt is recorded before each request. Re-running a completed scope reads its saved receipt. Redirects are rejected. A prior confirmed transport timeout may receive one **explicit** same-endpoint retry with `--retry-recent`; denial/429 does not qualify. There is no automatic retry loop or arbitrary URL input. The actual initial recent request timed out, and the one controlled retry succeeded; both receipts remain intact.

The build reads successful retained receipts, verifies digests, uses pure `readEnvelope`/`project` adapters, rejects source/count/schema drift and conflicting observations, and produces at most 100 rows/256KiB per safe chunk. `test-contract.mjs` checks real source samples, dimensions, missingness, 2026 absence, nominal units, vintage hashing, strict dates and invalid envelopes offline.

The allowed-text policy is `title` plus the factual leaf paths `geography.label`, `indicator_label`, `observation_period`, `value`, `unit`. Licenses, methodologies, parser labels, warning boilerplate and JSON keys are not indexed as source content. Full structured observations remain available for quantitative use; they are not flattened into text alone.

## Delivery and acceptance

`delivery/manifest.json` pins the complete 34-chunk batch. `contracts/source-manifest.v0.9.json` contains rights, fixed factual leaf whitelists, semantic exclusions, actual acquisition witnesses and source scope. `coverage/actual-period-geography-matrix.v0.9.json` contains actual geography/year/value/missingness continuity; `coverage/resumable-progress.v0.9.json` separates completed from planned historical slices.

Acquisition and source-contract tests are complete. Site admission, actual indexed readback and recurring collection remain separate stages owned by core. Imported acquisitions must retain reviewed-external origin and original source clocks; they are not Site-direct fetches. Existing source/catalog pins are unchanged.

Code, contracts, digest manifests and small fixtures belong in Git. Bulk `source-data`, full delivery chunks and generated runtime state stay outside the source export. The current local delivery artifact can be consumed directly by core without another provider request.

The next source plan is in `coverage/prioritized-source-matrix.v0.9.json`: licensed employment/FX foundations, higher-frequency market/futures aggregates, then source-specific legal/policy/cultural metadata. Their documented availability is kept separate from actual acquisition. No person ranking is performed.

GDELT's controlled same-route probe again returned 429 without Retry-After. `coverage/gdelt-reassessment.v0.9.json` records current rate limitation without calling it a permanent ban. No further GDELT request, proxy, alternate route or linked article/image acquisition is made this pass.

Primary evidence: [World Bank GDP definition/license](https://data.worldbank.org/indicator/NY.GDP.MKTP.CD), [dataset terms](https://data.worldbank.org/summary-terms-of-use), [API documentation](https://datahelpdesk.worldbank.org/knowledgebase/articles/889392-about-the-indicators-api-documentation).
