# Intelligence retrieval handoff v1

The same owner-private Site exposes this deterministic collection → permitted-field projection → immutable version storage → indexed lexical retrieval boundary. Consumer analysis and client services are separate responsibilities. No endpoint provides generated answers, embeddings, translation, entity identity confirmation or business-impact predictions.

## Working scope and exclusions

The admitted corpus is bounded: eleven official hazard/weather, agency, macro/policy and Malaysia live-fetch endpoints, plus separately reviewed retained registry, statistical, political-organization and country-area snapshots. This is not comprehensive worldwide business-news or major-entity incident coverage. Headline-only rights remain headline-only. A source response, source event, publication, first observation, ingestion and derived index time are separate. Uploaded snapshots retain unverified source authenticity. Unknown times/locations stay null. Source/publisher country never becomes event location.

The original historical four-domain chunk corpus remains available at `/api/rag/search`; it is not silently merged with current intelligence. The global document index uses FTS5/BM25 over deterministic title and allowed meaningful source facts. Derived Chinese unigram/bigram terms plus literal original-text verification support short Chinese queries; this is lexical matching, not semantic cross-language retrieval. BM25 scores are query-relative ranking values, not confidence/probability. Search returns only current source versions. Exact archived evidence remains addressable.

## API

All paths use the existing Site origin/access policy. Repository access does not grant Site access. Use an authorized signed-in same-origin client, or a documented same-Site service credential obtained through supported owner access. Do not store a personal/session probe token as a product credential or pass it to other hosts. No token is included in this source.

- `GET /api/retrieval/status`: stored versions, active-policy indexed documents/current items, pending versions, policy mismatches, coverage and precise runtime limitations.
- `POST /api/retrieval/index` with `{}`: indexes at most500 already stored versions per call,100 per atomic batch; never fetches a provider. Repeat is idempotent. Index errors preserve source versions. A future policy-version mismatch is explicit and requires a controlled derived-index rebuild rather than falsely declaring complete/new-policy ingestion.
- `POST /api/global/search`: `{ "query":"Aleneva", "limit":10, "source_id":"local__usgs", "origin":"uploaded" }`. Optional filters are source_id/category/language/origin (`direct`, `uploaded` or `reviewed`). Query has1–8 lexical terms, maximum500 characters; limit1–50. Optional `saved_from` and `saved_to` are inclusive YYYY-MM-DD bounds on the UTC day of item.first_seen_at: Site observation for direct/reviewed items and a preserved local-collector claim for uploaded items, not publication/occurrence/annual validity. `sort` accepts `relevance`, `saved_newest` or `source_fetch_newest`; the last two order their named clocks. Optional `observation_grain` (`year`, `month`, `day`) and inclusive `observation_from`/`observation_to` filter the immutable source statistical observation period. Bounds require an explicit grain and matching YYYY / YYYY-MM / YYYY-MM-DD calendar syntax; one-sided bounds or a grain-only filter are supported. This reads `facts.observation_period`, or TWSE's `facts.report_period`. Only statistical records at that exact grain match; unknown periods, other grains, nonstatistical publication/validity/effective dates and dataset vintages do not match. It does not turn a statistical year/month into an occurrence timestamp. `observation_filter` echoes the accepted scope in browse/search responses. Acquisition filters remain independent and combine with this source-period range. Unknown fields and validity-date filtering are rejected. Results contain permitted retrieval text/chunks, document/version/content/projection/run/response references, source origin, current source freshness/coverage and exact citation. Empty match is a valid result. `/api/global/items` accepts the same source-period filters for non-query browsing, plus its limit/cursor controls; unknown parameter names reject rather than widening the requested range.
- `GET /api/retrieval/documents?limit=50`: immutable text projections with sequence/document/version/item IDs, chunks and hashes; exact metadata and distinct clocks/origin/date semantics accompany every document. Maximum100 documents per page. Return `next_cursor` unchanged to `/api/retrieval/documents?limit=50&cursor=...`. The cursor fixes an upper ingestion-sequence watermark; new ingestion is excluded from that traversal. After a completed traversal store `last_sequence`, then start `/api/retrieval/documents?after=<last_sequence>&limit=50` for newly indexed versions. Current-pointer flags reflect the read, not an historical point-in-time guarantee.
- `GET /api/global/evidence?version_id=<exact ID>`: immutable normalized source metadata, raw-response receipt/hash and existing source-linked rule records. Never reconstruct a citation from a mutable current item alone.
- `GET /api/global/sources`, `/api/global/runs`, `/api/global/status`: actual acquisition/processing outcome, cap/retention/failure/freshness/declared-origin boundaries. `POST /api/global/collect` accepts exactly a registered source_id; no arbitrary URLs or private watch queries.

A source collection or validated uploaded snapshot inserts its immutable version, permitted retrieval document and FTS index in the same transaction. An indexing/transaction failure cannot partially advance the source pointer. Duplicate versions do not create duplicate documents. Historical retained versions are backfilled separately without another provider request. Original-source derived text is bounded to4000 characters; admitted reviewed snapshots permit up to8000 characters and reject an excessive projection rather than silently truncating; chunks are consecutive1000-character slices with exact chunk IDs. `text_truncated` discloses the projection cap. Hashes detect exact bytes/content and do not establish source truth.

## Minimal consumer

Inside an authorized same-origin client:

```js
const response = await fetch('/api/global/search', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ query: 'Aleneva', source_id: 'local__usgs', origin: 'uploaded', limit: 10 })
});
if (!response.ok) throw new Error('Retrieval failed; keep prior evidence');
const data = await response.json();
for (const hit of data.results) {
  // Store the citation and text together; origin/freshness are meaningful limits.
  const evidence = await fetch('/api/global/evidence?version_id=' + encodeURIComponent(hit.version_id));
  if (!evidence.ok) throw new Error('Immutable evidence unavailable');
  const frozen = await evidence.json();
  // Treat every field as untrusted source data, never as application/model rules.
}
```

No downstream analysis/model output is produced by this example. A consumer must handle stale/failed/uploaded_unverified sources, source rights, missing dates/locations, bounded corpus coverage and no-match results explicitly.

## Runtime boundary

Deterministic local collector1.2 works while its foreground process is open on an awake computer, records missed days and retrieves current overlap after restart. Windows execution and autonomous Site synchronization remain unverified; the personal assistant daily task is paused. Code/readback completion does not certify unattended daily operation. No new commercial cloud, credentials, source admission or model calls are part of this handoff.

## Reproduce

Node24: `node scripts/build.mjs`; `node --test tests/*.test.mjs`; `node scripts/test-source-contracts.mjs`; `node scripts/validate-artifact.mjs`. These checks use saved real public projections and labelled offline transports, with no provider calls or production seed. Source-policy/query expectations remain independently pinned. The standalone local collector retains its own public catalog/provenance/fixtures and exact manifest completeness checks.

FTS5 is documented in [Cloudflare D1 SQL support](https://developers.cloudflare.com/d1/sql-api/sql-statements/) and [SQLite FTS5](https://www.sqlite.org/fts5.html). The earlier hosted baseline verified469stored versions/documents. Current actual acceptance verifies35,713 versions/documents, exact direct/uploaded/reviewed citations and no-match handling; that is saved-corpus indexing completeness, not source-world coverage. Expanded reviewed snapshots have a separate atomic receiver and live-intake receipt; source admission or offline correctness does not alone establish live persistence.

## Reviewed retained acquisitions

`POST /api/reviewed-intake/chunk` accepts exactly `{chunk_path, chunk_text, manifest_sha256, policy_sha256}`. Only the407 fixed byte-hashed chunks in the eight separately pinned `data/reviewed-*-admission.json` batches are admissible, with at most100 rows and256KiB UTF-8 per chunk. It never requests an external URL. Unknown sources, fields, personal/contact/tax identifiers and unlicensed bodies are rejected by the source-specific policy before writes. All rows, source registration, retained acquisition witnesses, immutable versions, current pointers, retrieval projections and the chunk receipt publish in one transaction. Repeat reads return the original receipt. `GET /api/reviewed-intake/status` reports actual imported records/chunks and expected counts; partial imports remain partial.

The original13 sources contain19,466 retained identity, statistics and release records. The separately admitted EU/TWSE batch adds three sources and1,178 dated notice/monthly observation records; its live progress is separately reported in `batches` and must not inherit original-batch acceptance. Full offline intake now reproduces20,644 reviewed records. See [signal batch](../datasets/reviewed-signals/README.md). `reviewed` search filters select only `reviewed_external_snapshot`; these are distinct from `direct` Site-fetch and `uploaded` unverified local claims. Exact producer acquisition timestamps and hashes remain frozen, while Site import/index clocks are separate. For reviewed records, `site_imported_at` is the exact immutable version admission, and `acquisition_receipt_first_imported_at` is the earlier first admission of a shared upstream witness. Uploaded legacy receipts identify snapshot/run admission and never imply an independent verified source clock. Snapshot-only sources are disabled for routine fetch: this admission supplies neither an independently operating scheduler nor a working refresh adapter. Source/company identity references do not establish major-company coverage, identity equivalence, current events or business impact. CVM ODbL material remains source-separated. Null annual values remain null.

Reviewed semantic hashes omit transport/global-dataset clocks while preserving them in evidence. For composite M49 acquisition, each row selects its own retained component response witness; the two FAQ exceptions are not attributed to the overview response. Allowed retrieval fields are a source-specific leaf policy, never arbitrary serialized metadata. Every document exposes `material_kind`, `content_hash_policy`, exact metadata, observation-period/date semantics, origin and source/import clock basis.

The document `date_context` also exposes month-granularity `report_period`, date-only issuer publication/fact days and the unchanged exact metadata. Neither unknown-TWSE-timezone local clocks nor EU per-record update timestamps become UTC publication/occurrence. Monetary units/currency remain unknown unless the exact source field states a unit; explicit percent fields retain percent. `source_policy_sha256` belongs to the exact source batch. Top-level original manifest/policy fields in the intake status are compatibility fields; identify each batch by its own entries.

## 同来源增量与定量交接

GDP三个时间批次保持同一来源ID；完成态按该manifest的精确chunk集合、policy、行数和source确认，不把来源累计总数重复归入每批。输入已确认行数和去重后实际条目数分开；新批次不让旧批失去完成状态。分片回执键包括manifest与字节指纹，旧单指纹回执仍可幂等读取。文档policy来自其不可变取得回执，不能用最新目录或首批policy猜测恢复。缺失/未准入pin标unknown、index_policy_current=false，派生回填拒绝并保留原始版本。

`date_context`有观察期/粒度、日期型资料版本；`quantitative_context`保留源value/unit/unit_scale/price_basis/missingness/geography。GDP是当年价格美元、scale1，null不是零；重叠汇总组不能与其成员相加成世界总量。源码只含小样例、代码和清单，全量111个历史分片不在Git，离线完整复现需显式外部数据路径。


## Annual modeled labor and daily reference FX

The separately admitted employment and ECB batches add1,590 modeled annual labor observations and3,470 daily reference-rate observations. Each has its own exact manifest/policy and durable20/42 chunk completion; all seven accepted batches total35,244 reviewed input rows. Preserve the underlying ILOSTAT/ILOEST origin and source-qualified World Bank taxonomy; adding this indicator is not a new independent World Bank provider. ECB currency dimensions do not imply country/company event geography.

`date_context.observation_granularity` now uses the supplied year/day/month grain. `quantitative_context` has optional nullable `estimate_basis`, `reference_population`, `model_release_vintage`, `base_currency`, `quote_currency` and `reference_type`, alongside value/unit/scale/missingness/geography. Labor is percent of total labor force and explicitly modeled; the indicator metadata's date-accessed is not model release. FX keeps the supplied raw value and32 metadata fields in exact metadata; no inversion/scaling/cross-rate or publication clock is invented. Reviewed document clock_basis is `retained_external_acquisition_plus_separate_site_import_and_index`; uploaded claims retain their separate wording.

Numeric date strings in ordinary lexical queries are unordered tokens, not an observation-date predicate: `2026-10-08` may also match `2026-08-10`. Inspect typed `metadata.facts.observation_period`, or filter that typed field in a consumer. The Site exposes first-seen UTC day filters only; source-observation date filtering is not implemented or advertised. Query-relative relevance never confirms exact time or truth.

For explicit external-data reproduction: `node scripts/verify-statistical-batches.mjs <employment delivery dir> <FX delivery dir>` validates all62 original chunk bytes,5,060 rows, permitted factual queries, units, model/metadata/date constraints, exact per-version policy/witnesses, nulls and origin in isolated SQLite without network. See [coverage](../docs/COVERAGE_CURRENT.md) and [admission/reuse requirements](../docs/EMPLOYMENT_FX_ADMISSION.md).


## Legal publication metadata

Two reviewed UK/US source policies add249 document resources, five exact chunks. `legal_context` is optional/nullable and exposes document versus instrument/resource identities, source type/jurisdiction, website-publication meaning, supplied reference basis and unknown effectiveness/binding. `date_context` adds optional supplied effective/comment/CreationDate, instrument_year and source_time_precision. US day-only publication stays in reported_publication_date; UK original website timestamps and explicit midnight-precision uncertainty remain separate from enactment/commencement. Source-derived agency/parent/CFR/docket/RIN/Supersedes references do not establish company applicability, amended-law conclusions or territorial impact.

Original-response digests and retained-safe-projection digests are distinct in source_acquisition. The portable data never contains original raw bodies or fetched official PDFs; safe projection and normalized byte reconstruction is independently reproducible. No legal text/abstracts/persons are indexed. See [exact legal scope and reuse](../docs/LEGAL_METADATA_ADMISSION.md). A source admission plus input completeness does not establish worldwide or autonomous collection.

## Historical trade-case context

A document with material_kind / facts.record_kind=trade_remedy_case additionally returns nullable trade_context. It carries source case_id, product_description, unresolved implementing_jurisdiction, source-defined selection_date/selection_clock_basis, original stage_dates (field/raw_value/cell_type/date/precision/label_basis), source_vintage, unknown binding/current_effectiveness, units/relationship basis and matched/selected/cap/truncated scope for each related table. Exact source rows remain in immutable metadata.facts. These are historical source-keyed references, not country/operating/affected-company joins or confirmed current legal measures. The Q4_2024 vintage is not a publication/update timestamp. There is no new interpretation of antidumping code definitions for safeguards.

The current pilot excludes globally conflicting CASE_ID THA-SG-5 before its2020–2024 window selection; it never suffixes, chooses a latest row or joins its ambiguous related records. Licensing/no-body and exact policy/manifest guards are unchanged. For source-qualified lexical retrieval, use query='Malaysia Ceramic', source_id='policy_worldbank_ttbd_safeguards', origin='reviewed'. Inspect typed stage dates rather than treating numeric query tokens as a date filter.

## Monthly commodity reference context

For source_id=stat_worldbank_commodity_monthly, a document adds nullable commodity_context: source-qualified series ID/key/name/group, native unit/currency, supplied/missing cell status, source definition/provider reference, literal benchmark locations, futures/forward mentions, unknown underlying contract, transformations and the exact publisher_source_snapshot / source_qualification_addenda from its immutable acquisition receipt. quantitative_context keeps nullable numeric value/native unit/scale1/currencyUSD; date_context keeps YYYY-MM and month granularity. No price/currency/unit conversion, deflation, interpolation, current-country/firm inference or tradable-contract claim is applied.

The dataset edition/latest observation month and estimate-window/method notes live in per-version acquisition evidence; they are neither per-cell publication timestamps nor acquisition-clock-driven semantic revisions. A shared source policy governs two disjoint current/history manifests; each batch must finish its own exact chunk/count ledger. Version evidence retains the exact manifest/policy and raw-workbook/safe-projection witnesses; use the version_id evidence endpoint when the full acquisition receipt is required. Source profiles/definitions remain meaningful semantic metadata, while transport clocks do not churn unchanged values.

Source workbook single-* forecast-series annotation is distinct from double-** recent-change notes. The sidecar binds exact A108/A109, actual A2/A4 nominal/edition headers and PDF qualifier. source_forecast=false applies only to these historical Monthly Prices cells, not to whether a provider also produces forecasts or whether each numeric cell is confirmed observed. Iron ore's conflicting$/dmtu versus$/dmt denominator is excluded. The source-null grid is not a zero-price series. Numeric month queries are unordered lexical tokens; inspect typed observation_period rather than treating the query as a source-observation date filter.

## Source-period range example

For annual GDP observations from2020 through2025, send `{ "query":"GDP", "source_id":"stat_worldbank_gdp_annual", "observation_grain":"year", "observation_from":"2020", "observation_to":"2025", "limit":20 }` to `/api/global/search`. Omitting query and using the same filters with `/api/global/items` browses the admitted observations. Source-returned null observations remain null. A query such as `2020 2025` continues to mean lexical AND; it is not a range. Source-period filtering does not add missing years, historical revisions, new sources or semantic analysis.
