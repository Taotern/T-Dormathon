# Dormathon private GPT-Site prototype

This is the hosted adaptation of frozen portable baseline eaa24be250ff9afda59fb92f9553f292ce3e7ea2. The untouched portable checkout remains separately recoverable. Existing GUI is preserved; the hosted backend is a Worker ESM plus persistent D1 (`DB`). Eighteen schema tables preserve the original domain state, global collection/version receipts and human-reviewed investigation workspace. No browser storage is used as authoritative data.

## Checks/build

`node scripts/build.mjs`
`node --test tests/*.test.mjs`
`node scripts/validate-artifact.mjs`

The build embeds source-derived public constants and original assets into the supported single ES module. No full-stack framework/SSR dependency is introduced. Drizzle generates schema-only production migrations; no runtime CREATE/ALTER or migration data seed. Application batches use prepared statements and atomic D1 transactions.

## Limits and differences

- Hosted operational import:1000 rows and512KiB content per operation. Portable recovery retains5000/2MiB. Larger hosted inputs are rejected explicitly before writes. Text documents remain bounded at200000 characters.
- RAG is lexical with a visible fixed bilingual glossary, not semantic multilingual retrieval. The534 public documents contain observed prefixes only; future outcome replay stays separate.
- Saved source versions and frozen action evidence remain preserved across successful refresh. Current public search uses current snapshots only; explicit older evidence resolves the older source version.
- NESO refresh is owner-triggered, fixed official HTTPS endpoint, no redirects/customURLs,30-second budget,256KiB cap, contiguous validated future periods. Source hash/bytes, current pointer and analysis publish together. Failure retains lastgood and marks unusable/stale.
- The initially shipped14:28UTC energy snapshot is stale and current-use metrics are null until a fresh successful collection. Historical forecasts are never relabelled as current business telemetry.
- LLM is unconfigured409 unless explicitly enabled with project-specific Sites runtime values. No new key, real provider call or automatic tool action is part of this deployment.
- Source rebuild/raw-byte checks requiring the large historical archives are not available from the lightweight Git bundle. Frozen provenance, licenses, metrics, train/test splits and weak-utility caveats are retained unchanged.

Cloudflare's [D1 limits](https://developers.cloudflare.com/d1/platform/limits/) bound per-query parameters to100, rows/strings to2MB and free-tier queries to50 per invocation. The adapter preflights32-statement application batches and1.8MB string parameters; bulk JSON-row SQL keeps individual statements small. [D1 batches are transactions](https://developers.cloudflare.com/d1/worker-api/d1-database/#batch), so failures roll back the whole logical import or refresh.

## Global daily public-information collection

The new slice is a separate global namespace. Five appended D1 tables store the curated registry, collection runs, stable items, immutable metadata versions and version-linked deterministic rule records. No event is silently assigned to an operational business domain. Eleven enabled endpoints represent about seven publisher families: USGS, GDACS, NASA EONET and recent publication metadata, UN News Chinese, Malaysia fuel-price and warning metadata, ECB, two BIS feeds, and the admitted MET Malaysia Sarawak forward-forecast dataset. Shared upstream reports are not independent confirmation.

- GET `/api/global/sources`, `/api/global/status`, `/api/global/items`, `/api/global/runs` exposes actual saved state, coverage, capped selection, last attempt and last successful collection separately.
- POST `/api/global/collect` accepts exactly `{"source_id":"<registered enabled ID>"}`. No URLs or user queries. One source per request; run enabled sources sequentially. A15-minute attempt cooldown and durable lock make accidental repeated runs harmless. Do not repeat an uncertain write: read source/run receipts first.
- POST `/api/global/search` accepts a query plus optional source/category and bounded limit. This is lexical title/allowed-metadata retrieval with exact source/version/hash references. No semantic multilingual claim. Global retrieval is not automatically fed into the four-domain LLM prompt.
- GET `/api/global/evidence?version_id=...` returns the immutable metadata version, whole-response hash receipt and frozen source-linked rule records.
- News/agency articles retain titles/links/time metadata only. No article, image, full warning instruction or linked content fetch. Licensed hazard facts are projected; raw response bodies are hashed but not mirrored. Research upstream body hashes were never captured and remain unknown; the pinned research manifest binds only its retained safe projections.
- Each actual run is limited to30seconds, at most2network attempts,256KiB except justified structured hazard caps up to1MiB,100newest-known items. Caps, unknown publication time, upstream limit saturation and retention gaps are explicit. NASA uses a fixed metadata-field endpoint with the current UTC clock minus7days and per_page100. Feeds with undocumented retention cannot prove complete48-hour history. Daily successful retrieval freshness is36hours; NESO scheduling still expires after1hour independently.
- Separate event/publication/source-update/first-seen/fetch/ingest/analysis/alert timestamps preserve their meaning. Publisher country is separate from event country. Missing source first appearance and appearance-to-alert latency stay null. Deterministic rules are transparent review thresholds, not a generated impact model or official safety advice.

### Daily execution state

The personal assistant task is paused, and no independently provisioned Site trigger has been verified in the exposed contract. Deterministic adapters and a bounded manual collector API work. The selected local Node24/SQLite package can run while its foreground process stays open on an awake computer, records missed days, and retrieves current overlapping windows after restart. A closed process cannot collect. No unattended sync, OS scheduler, credential setup or Windows execution is claimed.

## Model-free source scripts and daily entrypoint

Each source has a deterministic adapter in `worker/adapters/<source>.js` and executable wrapper `scripts/sources/<source>.mjs`. Shared transport/validation/retry/storage remain centralized; the adapters reject wrong envelopes, contradictory counts, invalid identity/clock/geometry, and prohibited body fields. Coherent valid zero-item feeds are distinct from silent parser failure. Independent74case source contracts are pinned under tests/independent-source-contracts; run `node scripts/test-source-contracts.mjs` with network disabled by the evaluator.

`node scripts/collect-daily.mjs` accepts bounded JSON on hidden stdin with the exact fixed site_url and a currently authorized service_token. read_only:true performs no collector writes. The routine contains no model/agent calls. For an actual scheduled invocation only, record_schedule_outcome:true plus the matching automation_id enables the tested read-modify-write outcome receipt; a partial/uncertain/skipped run cannot overwrite prior complete success. The script cannot provision its own clock or credentials. See docs/PRODUCT_SCHEDULER_BOUNDARY.md: current personal cloud task is temporary, and independent product-owned background execution is not yet accepted.

## Local routine and manual snapshot handoff

The owner-selected deterministic runner is a separate local Node24/built-in SQLite package. Its foreground process must remain open on an awake computer; it records missed days and fetches current overlapping windows after restart. No operating-system scheduler or persistent Site machine credential is configured. Execution on the user's Windows computer is unverified because preflight failed before its first shell command.

The Global Intelligence page accepts `export-site` JSON partitions through `POST /api/global/import-snapshot`. Each partition is bounded to1.5MiB and validated before one atomic D1 transaction. Imports are separately namespaced, marked uploaded/unverified, deduplicated across repeated exports and searchable with version evidence. SHA verifies corruption only. No automatic synchronization or source-authenticity claim is made. Direct-fetched records, original domain records and frozen actions are preserved. See [the exact contract and limitations](docs/LOCAL_SNAPSHOT_HANDOFF.md).

## Evidence preparation workspace

The additive #prepare surface retains this same product and all four domains. User-declared projects/objects can select local lexical candidate events, freeze exact source evidence into an investigation, record explicit supply-coverage assumptions, append human reviews and create actions with frozen evidence. The exact contract is [workspace-v1](contracts/workspace-v1.md). External events never infer supplier identity or delivery delay; recorded historical business samples are not joined to current news as predictions. LLM remains unavailable until an actually configured provider call occurs.

The workflow borrows human-controlled investigation structure from [Babel Street's Investigator brief](https://www.babelstreet.com/resources/data-sheets/babel-street-insights-investigator), without its proprietary data, models, identity matching or claimed coverage. New source-admission work is separately reviewed. `node scripts/test-preparation.mjs` runs16offline frontend checks using labelled synthetic business inputs and actual recorded public source metadata, with no provider calls or live seed.

See [PROJECT_STATUS.md](PROJECT_STATUS.md) for gates and teammate reproduction. Secrets, local collector configuration, private user databases and runtime-only QA artifacts are excluded from clean source delivery. GitHub repository access is separate from owner-private Site access.

## Country/city navigation and project district

The primary #explore entry opens a country-bounded flat MapLibre map, local country/state/city search and a district of actual saved projects. Existing #prepare investigations and four-domain routes remain accessible. Only platform request.cf.country can provide a coarse request-origin hint; it never verifies physical owner location. Otherwise selection is manual, with remembered correction. No GPS, external place-query service, browser-language or timezone inference is used.

Natural Earth extents are public domain. GeoNames names/cities are CC BY4.0, with visible attribution. Local tables include cities with population over15,000 or capitals, bounded city aliases and disclosed missing countries/places. Admin1 names have no invented coordinates or boundaries. Place coordinates are for navigation, never event geolocation. Exact asset hashes and coverage are in data/geography/navigation-assets-manifest.json.

The pinned MapLibre6.10.0 library and local VersaTiles gray style fetch public tiles/glyphs/sprites only from tiles.versatiles.org. The free demo has no service guarantees. OSM/ESA attribution remains visible. CSP permits this one origin, no eval or arbitrary external URLs. Source-provided event points are eligible markers; named-area forecasts and unknown locations remain labelled evidence lists. Counts are records, not distinct incidents or independent confirmations.

Run node static/regional.test.mjs static/geo for19offline state/contract checks. Actual tiles, city zoom, transition and browser performance remain live QA gates until reported separately.

## Sarawak source and snapshot admission

The added deterministic MET Malaysia adapter collects the fixed Sarawak open-dataset endpoint, whitelists forecast fields and finite temperatures, rejects conflicting forecasts sharing area/day, and keeps unknown publication/issue clocks null. Validity dates do not become observed incidents. No forecast severity or business-delay rule is created. Official dataset integration/reuse permission is documented at https://www.met.gov.my/en/info/data-terbuka/; a named standard license is unspecified. General portal articles/images are excluded. Weather API calls share a durable4/minute quota.

Legacy dormathon.local-intel.snapshot.v1 and its original ten-source catalog pin remain accepted unchanged. The separate v2 branch pins the eleven-source admitted catalog and strictly validates nested forecast/attribution/time metadata. SHA indicates corruption detection only; all uploaded source authenticity remains unverified. The independently reviewed local collector1.2.0 adds the admitted source and exports v2, retaining legacy v1 compatibility. Its31runtime/provenance/CLI and74unchanged source-contract checks pass from a fresh extraction. Current receiver compatibility is also checked in isolated SQLite, with no provider or live Site writes. Owner Windows execution and unattended sync remain unverified.

### Verified browser correction

The actual cloud browser could not create WebGL2. The map now has a pinned Leaflet1.9.4 CPU/SVG/raster fallback with real OpenStreetMap standard tiles. It retains country bounds, city navigation, record provenance and reduced-motion behavior. Raster requests use browser cache, origin-only per-image Referrer, visible OSM attribution and current viewport loading only. No bulk/offline/prefetch or custom credentials are used. The standard public tile service is subject to its policy: https://operations.osmfoundation.org/policies/tiles/. Actual browser acceptance is recorded separately for the final deployed candidate.

Clean teammate delivery must retain the collector's public data/global-source-catalog.json and data/adapter-provenance.json. Generated private state is excluded by specific paths; a blanket data-directory exclusion would break runtime/export. Run node scripts/validate-clean-export.mjs /path/to/local-collector before treating an export as complete; it checks required assets and every packaged source-manifest hash.

For the complete teammate tree, run node scripts/validate-clean-export.mjs local-collector, then node local-collector/scripts/test.mjs. After the Site build, node scripts/test-local-collector-compatibility.mjs local-collector checks the actual producer-to-receiver v2 path in isolated SQLite; retained source fields are labelled offline test transport and never seeded live.

Actual hosted source acceptance: one MET request persisted seven official forecasts with unknown occurrence/publication clocks and no new rule; existing direct/uploaded state remained separate. Actual cloud-browser acceptance now verifies the2D Malaysia overview, Kuching streets/building footprints, pan and the country zoom-out floor. Province/city navigation data remains distinct from event geolocation. Project/district and changed captions have their own final browser receipts.
