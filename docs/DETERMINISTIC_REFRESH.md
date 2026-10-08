# Deterministic source refresh and manual ingress

The approved source profile covers the existing GDP, modeled unemployment, ECB reference FX, UK legislation, US Federal Register, World Bank safeguard cases and monthly commodity benchmark sources. It does not add source coverage, a scheduler, machine credentials, an automatic upload service or generated analysis.

The producer is an explicitly started foreground process. Acquisition, local processing/versioning and export are separate from Site admission. The same private Site has published the profile-bound receiver and accepts owner-session manual parts at `POST /api/global/import-refresh-snapshot`, with exactly `{ "snapshot": <envelope> }`. The ordinary workbench's **04 入库 / 检索** file picker selects the matching importer by schema. Selecting a file never saves it automatically.

## Boundaries

- Profile: `dormathon-approved-history-refresh-v0.19`, SHA-256 `3eb4fbdcf987c4c944ae90f512ba9ab73085d740f21b3b90c64b06bfe46aee7a`.
- Parser: `history-refresh-v0.19.0`.
- Snapshot: `dormathon.source-refresh.snapshot.v1`, at most 100 records, 16 acquisition runs and 256 KiB per part.
- Witnesses: at most 64 KiB per run; normalized records at most 32 KiB. Source-specific and nested factual fields are allowlisted.
- Live/manual modes: `genuine_acquisition` or `retained_replay`. `synthetic_fixture` and mixed acquisition modes are rejected. These labels remain producer claims.
- Origin is always `uploaded_unverified`, with `local__` source/item/version/run namespaces. No mode upgrades a record into Site-direct or reviewed-external provenance.
- The existing byte-pinned reviewed snapshots and legacy local snapshot v1/v2 remain separate and unchanged.

The profile admits numeric/status/dataset-vintage revisions within the approved native semantics. Unknown rights, definitions, units, geography, schema and derived content reject the whole part before evidence/index mutation. TTBD remains restricted to the approved Q4_2024 attribution; a new quarterly edition requires a profile review. A return to a previously seen semantic hash is quarantined by this producer version rather than overwriting the prior immutable acquisition; separate observation/current-pointer support is not claimed. Source cadence is not an installed runtime schedule.

## Immutable data contract

The envelope is `{schema_version, payload, payload_sha256}`. The canonical SHA uses recursive sorted object keys and preserves array order. It is a payload integrity fingerprint, not the raw file fingerprint or proof of authenticity.

Each record supplies original `source_id`, stable `upstream_id`, exact normalized `metadata`, `metadata_sha256`, semantic `content_hash`, `version_id` and `acquisition_id`. The semantic hash excludes only `first_seen_at`, `fetched_at` and `ingested_at`. Native values, nulls, units, observation periods and source dataset vintages stay semantic. GDP/unemployment records use a fixed official series endpoint as their evidence URL; the exact bounded query URL belongs in the run witness so a changing year window does not revise every unchanged row.

The version ID is `lver_` plus the first 28 hex digits of SHA-256 of `source_id|upstream_id|content_hash`. Site storage adds the `local__` namespace. Conflicting immutable IDs reject. An older replay preserves history without rewinding the current item. Repeated parts are idempotent. A successful transaction writes source config, runs, versions, derived lexical documents and per-version ingress context together; transaction failure preserves the previous records.

An acquisition contains the fixed requested URL, status/mode, original start/completion/fetch clocks, HTTP status, bounded byte count, complete-body flag, original raw-response SHA, parsed/changed/cap coverage and source-specific edition/method/metadata context. World Bank data records also require a separate included indicator-metadata response witness. Failed, skipped and no-change runs cannot fabricate records. Requested windows are typed years, days, months, instrument years or an explicitly unknown rolling feed.

The import receipt is part-scoped. It does not certify that every export part, every provider row or every history period was received. A shared acquisition may appear in several parts. Its first immutable receipt is retained; each version separately binds its exact part payload SHA, profile SHA, transport mode and Site import clock.

## Retrieval and teammate handoff

The existing `/api/global/items`, `/api/global/search`, `/api/global/evidence?version_id=…` and `/api/retrieval/documents` contracts expose the same saved records. Choose `origin=uploaded` to inspect these claims. Direct/reviewed filters remain disjoint. Search uses allowed source text and FTS5/BM25, with literal CJK support; it has no embeddings, semantic translation or generated answer.

Document results expose the exact refresh policy, original raw-response hash, immutable metadata/content/projection hashes, `refresh_version_ingress`, original acquisition mode, separate Site import/index clocks and typed dates/units. Original local/source clocks are claims; Site import/index clocks are Site observations. Current-job windows are anchored to original UTC acquisition context, with a bounded preceding-day allowance for an invocation crossing midnight. Delayed replay keeps its original query window. Missing or unadmitted policy pins cannot be guessed from the current registry during index recovery.

## Verification and operation

Developer verification is Linux with Node 24 and Python 3.12. Run `npm run build`, `node --test tests/source-refresh.test.mjs tests/collector-workbench-behavior.test.mjs` and `npm run verify:artifact` from this restored repository. The refresh tests use clearly synthetic/mock transport in isolated SQLite; they never call a provider or the private Site. The production-bundle test executes the packed Worker validator, not just source modules.

The current foreground producer is source-packs/history-refresh/refresh.py; its README documents plan/test/current/archive commands and exact shared dependencies. One actual ECB source request and one manual owner upload passed on2026-10-08, with14 versions and native32-field metadata; a separate retained-byte replay made zeroHTTP and zero new versions. This is an operator-driven one-source validation. Windows execution, closed-process OS scheduling, daily unattended runtime and automatic Site synchronization remain unverified or blocked. Repo access does not grant private Site/API access, and no credentials are included in this handoff.
