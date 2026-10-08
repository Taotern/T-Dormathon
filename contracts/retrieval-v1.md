# Intelligence retrieval handoff v1

The same owner-private Site exposes this deterministic collection → permitted-field projection → immutable version storage → indexed lexical retrieval boundary. Consumer analysis and client services are separate responsibilities. No endpoint provides generated answers, embeddings, translation, entity identity confirmation or business-impact predictions.

## Working scope and exclusions

The admitted corpus is bounded: eleven official hazard/weather, agency, macro/policy and Malaysia live-fetch endpoints, plus separately reviewed retained registry, statistical, political-organization and country-area snapshots. This is not comprehensive worldwide business-news or major-entity incident coverage. Headline-only rights remain headline-only. A source response, source event, publication, first observation, ingestion and derived index time are separate. Uploaded snapshots retain unverified source authenticity. Unknown times/locations stay null. Source/publisher country never becomes event location.

The original historical four-domain chunk corpus remains available at `/api/rag/search`; it is not silently merged with current intelligence. The global document index uses FTS5/BM25 over deterministic title and allowed meaningful source facts. Derived Chinese unigram/bigram terms plus literal original-text verification support short Chinese queries; this is lexical matching, not semantic cross-language retrieval. BM25 scores are query-relative ranking values, not confidence/probability. Search returns only current source versions. Exact archived evidence remains addressable.

## API

All paths use the existing Site origin/access policy. Repository access does not grant Site access. Use an authorized signed-in same-origin client, or a documented same-Site service credential obtained through supported owner access. Do not store a personal/session probe token as a product credential or pass it to other hosts. No token is included in this source.

- `GET /api/retrieval/status`: stored versions, active-policy indexed documents/current items, pending versions, policy mismatches, coverage and precise runtime limitations.
- `POST /api/retrieval/index` with `{}`: indexes at most500 already stored versions per call,100 per atomic batch; never fetches a provider. Repeat is idempotent. Index errors preserve source versions. A future policy-version mismatch is explicit and requires a controlled derived-index rebuild rather than falsely declaring complete/new-policy ingestion.
- `POST /api/global/search`: `{ "query":"Aleneva", "limit":10, "source_id":"local__usgs", "origin":"uploaded" }`. Optional filters are source_id/category/language/origin (`direct`, `uploaded` or `reviewed`). Query has1–8 lexical terms, maximum500 characters; limit1–50. Optional `saved_from` and `saved_to` are inclusive YYYY-MM-DD bounds on the UTC day of item.first_seen_at: Site observation for direct/reviewed items and a preserved local-collector claim for uploaded items, not publication/occurrence/annual validity. `sort` accepts `relevance`, `saved_newest` or `source_fetch_newest`; the last two order their named clocks. Unknown fields and validity-date filtering are rejected. Results contain permitted retrieval text/chunks, document/version/content/projection/run/response references, source origin, current source freshness/coverage and exact citation. Empty match is a valid result.
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

Node24: `node scripts/build.mjs`; `node --test tests/*.test.mjs`; `node scripts/test-source-contracts.mjs`; `node scripts/test-frontend.mjs`; `node scripts/validate-artifact.mjs`. These checks use saved real public projections and labelled offline transports, with no provider calls or production seed. Source-policy/query expectations remain independently pinned. The standalone local collector retains its own public catalog/provenance/fixtures and exact manifest completeness checks.

FTS5 is documented in [Cloudflare D1 SQL support](https://developers.cloudflare.com/d1/sql-api/sql-statements/) and [SQLite FTS5](https://www.sqlite.org/fts5.html). Native hosted baseline index/readback has verified469stored versions/documents, exact uploaded/direct citations and no-match handling. Expanded reviewed snapshots have a separate atomic receiver and live-intake receipt; source admission or offline correctness does not alone establish live persistence.

## Reviewed retained acquisitions

`POST /api/reviewed-intake/chunk` accepts exactly `{chunk_path, chunk_text, manifest_sha256, policy_sha256}`. Only the204 fixed byte-hashed chunks in `data/reviewed-acquisition-admission.json` are admissible, with at most100 rows and256KiB UTF-8 per chunk. It never requests an external URL. Unknown sources, fields, personal/contact/tax identifiers and unlicensed bodies are rejected by the source-specific policy before writes. All rows, source registration, retained acquisition witnesses, immutable versions, current pointers, retrieval projections and the chunk receipt publish in one transaction. Repeat reads return the original receipt. `GET /api/reviewed-intake/status` reports actual imported records/chunks and expected counts; partial imports remain partial.

The13 sources contain19,466 retained identity, statistics and release records. `reviewed` search filters select only `reviewed_external_snapshot`; these are distinct from `direct` Site-fetch and `uploaded` unverified local claims. Exact producer acquisition timestamps and hashes remain frozen, while Site import/index clocks are separate. For reviewed records, `site_imported_at` is the exact immutable version admission, and `acquisition_receipt_first_imported_at` is the earlier first admission of a shared upstream witness. Uploaded legacy receipts identify snapshot/run admission and never imply an independent verified source clock. Snapshot-only sources are disabled for routine fetch: this admission supplies neither an independently operating scheduler nor a working refresh adapter. Source/company identity references do not establish major-company coverage, identity equivalence, current events or business impact. CVM ODbL material remains source-separated. Null annual values remain null.

Reviewed semantic hashes omit transport/global-dataset clocks while preserving them in evidence. For composite M49 acquisition, each row selects its own retained component response witness; the two FAQ exceptions are not attributed to the overview response. Allowed retrieval fields are a source-specific leaf policy, never arbitrary serialized metadata. Every document exposes `material_kind`, `content_hash_policy`, exact metadata, observation-period/date semantics, origin and source/import clock basis.
