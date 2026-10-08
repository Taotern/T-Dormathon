# Historical monthly commodity references v0.18

This separate World Bank Pink Sheet slice provides nominal monthly commodity-price history for supply-chain cost context. It does not change prior admitted data or infer enterprise exposure, country events, tradable contracts or forecasts.

The actual official workbook is updated2October2026, with observations through September2026. The selected history is January1990–September2026,441 calendar-month rows per series. Thirty-five energy, base/precious metal, agriculture/raw-material, fertilizer and Malaysian timber references are selected. Thirty-three have numeric values in all441 months. TSR20 rubber has108 unavailable early months; barley has73 unavailable later months. Every missing value retains its original cell marker and null numeric value, with no interpolation. Data is delivered as disjoint current2020+ and1990–2019 batches; these are one source/vintage, not two independent sources.

The underlying workbook has older1960+ rows and unselected series. That provider availability/raw acquisition is separate from the35-series projected1990+ coverage. No October2026 or later observation is generated, even though the catalog's generic range extends2030 because it also includes forecasts. Forecast, annual and real-index files and the workbook's auxiliary comparison/index sheets are excluded.

## Rights, units and benchmark identity

The exact [Dataset0038238 catalog](https://datacatalog.worldbank.org/search/dataset/0038238/commodity-prices-history-and-projections) declares Public and CC BY4.0 and links the [current Commodity Markets website](https://www.worldbank.org/en/research/commodity-markets), which links this historical-monthly workbook and dataset reuse policy. Attribute World Bank Pink Sheet/Prospects Group, retain licence and source, and disclose selection/normalization. Compiler-supplied underlying-provider names are preserved; proprietary vendor feeds, articles/software/logos and source-PDF bodies are excluded. The original PDF carries an “Official Use Only” footer despite the public link; this package distributes only the expressly licensed dataset/metadata, not that PDF/report body. Web-rendered catalog/landing response bodies were not retained, so their upstream body digests remain unknown rather than invented.

All selected prices use native nominal USD units. Dollar-per-barrel, metric-ton, mmbtu, kilogram, troy-ounce and cubic-meter denominators stay source-specific. No deflation, PPP/FX/unit conversion or annualization is performed. Iron ore is quarantined: workbook unit `$/dmtu` conflicts with current PDF `$/dmt`; no corrected denominator or historical conversion is guessed. Its source descriptions also span different historical quote bases.

Source series identities are explicitly derived from a frozen source-column registry. They are not upstream API identifiers, exchange tickers or unique tradable instruments. Some benchmark descriptions mention futures/forward inputs: Australian coal changed from physical/spot bases to a futures price in2022; cocoa and TSR20 reference nearby contracts. Others describe spot, import/export or survey prices. Every current and supplied historical definition remains exact, so this is not labeled homogeneous spot-price history. Underlying contract IDs, execution times, maturities and bid/ask records are not supplied.

LNG Japan's recent two monthly averages are publisher estimates. The current immutable source witness identifies August/September2026 as that relative window. Per-cell observed/estimated flags are not separately supplied, so earlier numeric cells are not certified observed. The relative latest-month window lives in acquisition context; it does not create a false semantic revision of every old value. Source definitions and revision notes preserve benchmark replacements, including palm oil fromJanuary2026, gold/platinum fromJune2025 and earlier regime changes. “Sarawak,” Tokyo and other market references are literal definition metadata, with no coordinates, national-price coverage or affected-company link.

Observation month, dataset edition date, source acquisition, Site import and index clocks are independent. Per-cell publication/update/event instants remain null. The current publisher page schedules monthly updates, but unattended operation, future-edition discovery, Windows and automatic sync are unverified.

## Portable deterministic path

Pair the small source ZIP with the separate external safe-data ZIP. Python3 and Node18+ are sufficient for replay; read-only original-workbook extraction additionally uses the installed `openpyxl` reader. Workbook formulas/macros are never run and the source workbook is not edited.

`python run-slice.py test`

`python run-slice.py reproduce --data-dir /absolute/path/Dormathon-Commodity-Data`

Replay verifies exact source/data pairing and both original manifests, reconstructs15435 source cells /250 capped chunks, and requires every resulting hash to match. It makes no network or Site request.32 guards use nine independently extracted original examples, including missing cells, estimate/futures context, units and exclusions. Original-to-safe verification separately checks all15435 values and all35 unit/definition/provider profiles against the retained workbook.

For separately authorized fresh acquisition, set `DORMATHON_COMMODITY_DATA_DIR` to a runtime folder and invoke the fixed `acquire-fixed.py monthly` / `definitions` scopes explicitly. Existing attempt receipts prevent automatic repeat. The two exact official assets use30-second Linux overall deadlines,2MiB/1MiB body caps and rejected redirects. Access/rate failures stop further provider reads. Revised assets/units/definitions need a new reviewed source contract; this frozen profile must not be silently reused for a new source vintage. Keep runtime original bodies and full safe vectors/chunks outside Git.

Core may import pure `readEnvelope` / `project` / `validateCommodity` / `semanticPayload` and the explicitly whitelisted factual/search fields. Stable dataset-qualified series/month IDs dedupe observations; numerical, unit, definition or provider revisions remain semantic, while acquisition clocks do not. Rights/current-workbook lineage and source-method/estimate snapshots are pinned independently from monthly cell values. Admission of the recent and older disjoint batches must preserve per-batch progress and original policy identity.
