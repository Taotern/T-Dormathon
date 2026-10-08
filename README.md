# Dormathon private GPT-Site prototype

This is the hosted adaptation of frozen portable baseline eaa24be250ff9afda59fb92f9553f292ce3e7ea2. The untouched portable checkout remains separately recoverable. Existing GUI is preserved; the hosted backend is a Worker ESM plus persistent D1 (`DB`). Seven schema tables hold sources, records, documents, chunks, alerts, actions and settings. No browser storage is used as authoritative data.

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

The new slice is a separate global namespace. Five appended D1 tables store the curated registry, collection runs, stable items, immutable metadata versions and version-linked deterministic rule records. No event is silently assigned to an operational business domain. Ten enabled endpoints represent about seven publisher families: USGS, GDACS, NASA EONET and recent publication metadata, UN News Chinese, Malaysia fuel-price and warning metadata, ECB, and two BIS feeds. Shared upstream reports are not independent confirmation.

- GET `/api/global/sources`, `/api/global/status`, `/api/global/items`, `/api/global/runs` exposes actual saved state, coverage, capped selection, last attempt and last successful collection separately.
- POST `/api/global/collect` accepts exactly `{"source_id":"<registered enabled ID>"}`. No URLs or user queries. One source per request; run the ten sources sequentially. A15-minute attempt cooldown and durable lock make accidental repeated runs harmless. Do not repeat an uncertain write: read source/run receipts first.
- POST `/api/global/search` accepts a query plus optional source/category and bounded limit. This is lexical title/allowed-metadata retrieval with exact source/version/hash references. No semantic multilingual claim. Global retrieval is not automatically fed into the four-domain LLM prompt.
- GET `/api/global/evidence?version_id=...` returns the immutable metadata version, whole-response hash receipt and frozen source-linked rule records.
- News/agency articles retain titles/links/time metadata only. No article, image, full warning instruction or linked content fetch. Licensed hazard facts are projected; raw response bodies are hashed but not mirrored. Research upstream body hashes were never captured and remain unknown; the pinned research manifest binds only its retained safe projections.
- Each actual run is limited to30seconds, at most2network attempts,256KiB except justified structured hazard caps up to1MiB,100newest-known items. Caps, unknown publication time, upstream limit saturation and retention gaps are explicit. NASA uses a fixed metadata-field endpoint with the current UTC clock minus7days and per_page100. Feeds with undocumented retention cannot prove complete48-hour history. Daily successful retrieval freshness is36hours; NESO scheduling still expires after1hour independently.
- Separate event/publication/source-update/first-seen/fetch/ingest/analysis/alert timestamps preserve their meaning. Publisher country is separate from event country. Missing source first appearance and appearance-to-alert latency stay null. Deterministic rules are transparent review thresholds, not a generated impact model or official safety advice.

### Closed-page daily writer plan

A cloud task should reopen this exact owner-private project `appgprj_6ac6c8d4361c81919d4a8dffabfab361` through native Sites `get_site` each run. Use its current returned live URL and documented existing service credential only in `OAI-Sites-Authorization` to that same Site. Do not save the credential, put it in a prompt/URL/argv/log, or forward it through redirects. Disable redirects in the HTTP client. No signed-in visitor identity or connected private source is needed: these collectors use public unauthenticated upstream endpoints only.

Read GET `/api/global/sources`; sequentially POST each enabled source ID to `/api/global/collect` once with JSON and the same Site Origin. Each source has its own bounded fetch/retry/atomic transaction. Failed/cooldown source outcomes must not cause a second blind attempt. Then read `/api/global/status`, `/api/global/runs`, and `/api/global/items` to establish saved results. A timed-out or cancelled writer must reconcile the durable run/lock receipt before retrying. Preserve all owner imports/actions and previous valid evidence. Quietly update Site data; no routine chat digest or external message.

The baseline requested cadence is daily in Asia/Kuching, aiming around08:00 using the supported flexible cloud schedule. A schedule is not active merely because this capability exists. Only after native task creation and writer verification should its actual returned automation ID/schedule/timezone/state be recorded via POST `/api/global/schedule-receipt`. Do not claim Worker cron, realtime collection or a next-run timestamp the scheduler has not supplied.

### Scheduled-run finalization receipt

After each actual scheduled attempt, read `/api/global/status` and preserve its `scheduler` registration fields (`automation_id`, `enabled`, `verified`, `schedule`, `timezone`, `next_run_at`, `status`, `verified_at`). Read-modify-write the same `/api/global/schedule-receipt`; do not replace enabled state based on fetch results and do not invent a next-run time. Optional fields: `last_attempt_at` (timezone-aware start), `last_run_at` (timezone-aware finalization), `last_run_status` (`complete_success`, `partial_failure`, `failed`, `uncertain`), `last_complete_success_at` (retain prior value unless a complete known success), and `last_run_summary` (nonnegative integer counts only: `sources_succeeded`, `sources_failed`, `sources_uncertain`, `sources_skipped`, each0–10; `new_items`, `new_rule_alerts`, each0–10000). A completed request with capped/uneven source coverage is not worldwide completeness. An uncertain write is not success. Read back the receipt after finalization; no routine user message.

## Model-free source scripts and daily entrypoint

Each source has a deterministic adapter in `worker/adapters/<source>.js` and executable wrapper `scripts/sources/<source>.mjs`. Shared transport/validation/retry/storage remain centralized; the adapters reject wrong envelopes, contradictory counts, invalid identity/clock/geometry, and prohibited body fields. Coherent valid zero-item feeds are distinct from silent parser failure. Independent74case source contracts are pinned under tests/independent-source-contracts; run `node scripts/test-source-contracts.mjs` with network disabled by the evaluator.

`node scripts/collect-daily.mjs` accepts bounded JSON on hidden stdin with the exact fixed site_url and a currently authorized service_token. read_only:true performs no collector writes. The routine contains no model/agent calls. For an actual scheduled invocation only, record_schedule_outcome:true plus the matching automation_id enables the tested read-modify-write outcome receipt; a partial/uncertain/skipped run cannot overwrite prior complete success. The script cannot provision its own clock or credentials. See docs/PRODUCT_SCHEDULER_BOUNDARY.md: current personal cloud task is temporary, and independent product-owned background execution is not yet accepted.

## Local routine and manual snapshot handoff

The owner-selected deterministic runner is a separate local Node24/built-in SQLite package. Its foreground process must remain open on an awake computer; it records missed days and fetches current overlapping windows after restart. No operating-system scheduler or persistent Site machine credential is configured. Execution on the user's Windows computer is unverified because preflight failed before its first shell command.

The Global Intelligence page accepts `export-site` JSON partitions through `POST /api/global/import-snapshot`. Each partition is bounded to1.5MiB and validated before one atomic D1 transaction. Imports are separately namespaced, marked uploaded/unverified, deduplicated across repeated exports and searchable with version evidence. SHA verifies corruption only. No automatic synchronization or source-authenticity claim is made. Direct-fetched records, original domain records and frozen actions are preserved. See [the exact contract and limitations](docs/LOCAL_SNAPSHOT_HANDOFF.md).

## Evidence preparation workspace

The additive #prepare surface retains this same product and all four domains. User-declared projects/objects can select local lexical candidate events, freeze exact source evidence into an investigation, record explicit supply-coverage assumptions, append human reviews and create actions with frozen evidence. The exact contract is [workspace-v1](contracts/workspace-v1.md). External events never infer supplier identity or delivery delay; recorded historical business samples are not joined to current news as predictions. LLM remains unavailable until an actually configured provider call occurs.

The workflow borrows human-controlled investigation structure from [Babel Street's Investigator brief](https://www.babelstreet.com/resources/data-sheets/babel-street-insights-investigator), without its proprietary data, models, identity matching or claimed coverage. New source-admission work is separately reviewed. `node scripts/test-preparation.mjs` runs13offline frontend checks using labelled synthetic business inputs and actual recorded public source metadata, with no provider calls or live seed.

See [PROJECT_STATUS.md](PROJECT_STATUS.md) for gates and teammate reproduction. Secrets, local collector configuration, private user databases and runtime-only QA artifacts are excluded from clean source delivery. GitHub repository access is separate from owner-private Site access.
