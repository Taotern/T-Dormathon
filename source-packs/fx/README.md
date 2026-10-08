# Daily FX context: ECB USD/EUR and MYR/EUR reference rates

This separate candidate acquires two official ECB reference-rate series. One small schema probe and one fixed historical request succeeded. Each series contains 1,735 supplied observation dates from 2020-01-02 through 2026-10-08. There are 257/258/257/255/256/255 dates in 2020–2025 and 197 in partial 2026. This is actual daily currency-series coverage, not every-country/company/market coverage.

Units are USD or MYR per one EUR, with source unit multiplier 0. Original numeric text, typed values and all 32 supplied CSV metadata fields are preserved unchanged. No rates are inverted, scaled, annualized, interpolated, converted into cross rates or changed into transaction prices. The source-agency code 4F0 identifies ECB, verified against the primary ECB Data Portal. These reference rates are information statistics rather than executable intraday prices.

Observation days are date-only source fields. Publication, event and per-record update clocks remain null. The source's TITLE_COMPL clock is retained raw and is not used as publication time. Its general UNIT_INDEX_BASE attribute is retained but not treated as an index/base period for these currency-unit reference rates. Source currencies are dimensions, not event country or company operating locations.

Each series has 32 unreturned calendar weekdays and 706 unreturned weekends in the requested window. These are measured calendar absences; a TARGET closing calendar and full source continuity were not verified. No completeness percentage, synthetic missing/zero observations or forward-fill is supplied. No pre-2020 data was acquired. The latest actual day is October 8, while the earlier small probe ended October 7; both original response witnesses remain immutable.

The official ECB/ESCB policy permits commercial and noncommercial reuse of public statistics with attribution and unchanged statistics/metadata. Uncleared third-party data are excluded. This projection preserves the supplied source fields and values; typed wrappers and display formatting are separate. Keep “Source: ECB statistics” and the original source link. Preserve the free-original-availability condition when incorporated in sold documents and the source's revision/continuity limitations. Linked documents, copyrighted article bodies and images are outside this candidate.

`delivery/manifest.json` pins 3,470 actual observations in 42 capped chunks. Processing totals identify the batch; the two-series/date/unit matrix describes coverage. `contracts/source-manifest.v0.13.json` fixes rights, allowed factual leaves, date/quote/base/source metadata and immutable response witnesses. Allowed text is title plus original source title, date, original value, quote/base currency and unit. Irrelevant defaults, parser/rights prose and JSON field names are not indexed as factual source content.

Twenty offline tests validate every original metadata/value field, exact byte/chunk caps, source agency/units, CSV quoting, calendar bounds, legitimate unknown-window empties versus impossible known-window zero, duplicate conflicts and semantic hashes. Only local acquisition clocks leave the semantic payload. Stable source-series/date IDs and canonical evidence URLs avoid query-window identity inflation.

Extract source and external-data ZIPs into separate directories. Python 3 and Node 24 reproduce exact factual chunk hashes without network:

```sh
python /path/to/code/Dormathon-ECB-FX/run-slice.py --work-dir /path/to/data/Dormathon-ECB-FX --build --test
```

New coverage generation timestamps change rebuilt outer-manifest digests without superseding the frozen original pin. Acquisition is a separate explicit scope with a Linux 30-second overall deadline, redirect rejection, durable attempts and no retries. Existing receipts are read without another fetch. Windows acquisition, unattended scheduling and future source continuity remain unverified.

Code/policies/receipts/small fixtures/digest manifests belong in Git. Full CSV responses, detailed value/calendar matrices and chunks stay in external storage. The source remains disabled until core separately accepts and verifies actual intake. No Site write, new credential, fee or public sharing is performed here.

Primary rights and method: [ESCB statistics reuse policy](https://www.ecb.europa.eu/stats/ecb_statistics/governance_and_quality_framework/html/usage_policy.en.html), [ECB copyright](https://www.ecb.europa.eu/services/using-our-site/disclaimer/html/index.en.html), [reference-rate method and base](https://www.ecb.europa.eu/stats/policy_and_exchange_rates/euro_reference_exchange_rates/html/index.en.html), [official API examples](https://data.ecb.europa.eu/help/api/data-examples), [ECB organization code 4F0](https://data.ecb.europa.eu/data/datasets/NEC).
