# Employment foundation:modeled ILO unemployment2020–2025

This independent source-specific adapter adds annual total-unemployment percentages from the World Bank/ILOEST seriesSL.UEM.TOTL.ZS. The exact official indicator page explicitly licenses these data underCC BY4.0 and documents1991–2025 availability. Two fixed public API reads acquired the actual indicator metadata and one2020:2026 slice. The API returned2020–2025 only.1991–2019 remains unacquired;2026 is absent.

Actual numeric continuity is182 of217 World Bank reporting economies for all six years;187 have at least one numeric value. Thirty economies have no numeric value in the six-year slice. Coverage therefore excludes many small territories/economies and is not a complete every-country labor record.48 overlapping aggregates remain separate. Per-year/source-null/unreturned distinctions are preserved in the detailed matrix.

The source defines unemployment as a share of the labor force without work, available and seeking employment. It labels the series a modeled ILO estimate. Units arepercent of total labor force, scale1, with valid numeric bounds0–100. Values are not total-population rates, headcounts, observed layoff incidents, company risks or individual talent scores. For example,the actual retained Malaysia2025 value is3.764%,China2020 is5%; these are provider modeled annual statistics.

Annual observation labels, the2026-07-13 date-only dataset vintage, indicator metadata's2026-01-17 date-accessed field and actual acquisition clocks are separate. Date accessed does not establish a model-release/publication clock. Model-release vintage, publication/event/per-observation update clocks remain null. Country-specific methods/reference periods and historical classification changes remain unknown. Current country/economy dimensions are reused from their exact pinned primary acquisition.

`delivery/manifest.json` pins20 capped chunks/1,590 actual observations. These define the processing scope; continuity and missingness describe information coverage. `contracts/source-manifest.v0.12.json` contains the exact rights, typed facts, fixed allowed leaf paths and original acquisition witnesses. Allowed retrieval text is title plus geography label, indicator label, annual period, value andunit. License/parser/methodology prose stays outside the indexed factual text. Quantitative values and units remain in structured fields.

The pure adapter exportsreadMetadata/readEnvelope/project/semanticPayload. It requires this exact modeled indicator and percent unit, rejects invalid values/schema/calendar/geography, distinguishes legitimate recognized empty from silent schema-drift zero and preserves source nulls. Only local transport clocks are excluded from semantic hashing; observation values, model designation, units, source metadata and vintage remain semantic. Twenty offline source tests pass.

Extract source and external-data ZIPs into separate directories. Python3 andNode24 rebuild exact factual chunk hashes with no provider/Site requests:

```sh
python /path/to/code/Dormathon-Employment/run-slice.py --work-dir /path/to/data/Dormathon-Employment --build --test
```

New matrix generation timestamps change rebuilt outer-manifest digests without superseding the frozen original pin. `--acquire` is a separate two-request action with Linux30-second overall deadlines,2MiB licensed-structured-body caps, redirect rejection and durable no-retry attempts. Existing receipts are read without another fetch. Windows acquisition and unattended recurring operation remain unverified.

Code/policies/receipts/digest manifests/small safe fixtures belong in Git. Full raw statistical responses, detailed value matrices and chunks stay in separate storage. Site admission/indexed readback are independent core gates. No source-count inflation:the delivery uses the existing World Bank provider family and identifies the underlying ILOSTAT/ILOEST origin explicitly.

Primary rights:[exact indicator CC BY4.0 and modeled designation](https://data.worldbank.org/indicator/SL.UEM.TOTL.ZS),[World Bank dataset terms](https://data.worldbank.org/summary-terms-of-use). Preserve World Bank WDI and ILOSTAT/ILOEST attribution, normalization disclosure, no endorsement and downstream terms.
