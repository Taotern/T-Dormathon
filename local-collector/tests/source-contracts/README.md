# Deterministic source-contract tests, v0.4

This pack tests the ten existing source-specific adapters through their shared public interface:

`parseIntelFeed(source, Uint8Array, fetchedAt)`

It does not fetch providers, write to the Site, seed production intelligence items, provision services, create credentials, or schedule an agent. Inputs and golden expectations are saved files. The runner forbids `fetch`, verifies input SHA-256 values, and uses a fixed acquisition clock.

## Run

Use the Node version already supported by the application. The runner itself uses only Node built-ins and needs no package installation.

```sh
node run-source-contracts.mjs --checkout /absolute/path/to/site --report-prefix source-contract-check
```

Or specify the exact public parser file:

```sh
node run-source-contracts.mjs --parser /absolute/path/to/worker/global-parse.js --report-prefix source-contract-check
```

The runner exits nonzero when any required contract check fails. JSON and short text reports are written only in this pack directory. `--phase positive` checks valid projection/content cases; `--phase negative` checks malformed-input rejection. Run all cases for acceptance.

## Integration

1. Keep this test pack separate from production source data. The bundled catalog is an exact, read-only v0.2 snapshot, SHA-256 8cb6d74e029b066e4dc6660ec32e804078f3e2c941b5140566052fc94191ef27.
2. Add the one runner command to the existing test/CI stage. Continue importing the public parser while core owns the ten isolated adapter modules and shared fetching, retries, deduplication, storage and product-owned scheduling.
3. Fix parser contract failures in the owning adapter/module. Do not approve a failing output by regenerating golden expectations from that implementation.
4. After a provider schema change, review that source's existing evidence and rights first. Update only the relevant fixture/contract and record the change. A deliberate live-source check is a separate operation, never performed by this suite.

## Coverage

74 cases span all ten sources. Each has saved-source positive metadata and a correctly structured empty envelope. Negatives distinguish real empty containers from HTML/error objects, missing containers, hidden RDF items and nonzero reported counts/references that would otherwise become silent zero. Other cases cover required identifiers/typed facts, calendar-valid timestamps, nullable missing times/geography, bounded source-provided geometry, metadata-only projections, deterministic exact-ID deduplication, newest-100 selection and saturation flags.

Source-specific details are in `source-contracts.v0.4.json`. Expected semantic subsets are in `cases.v0.4.json`. Fixtures are either reconstructed envelopes around retained safe public metadata or explicitly synthetic drift/limit examples. Neither kind is an original raw response body; fixture hashes bind fixture bytes, not a provider's HTTP body.

Coherent empty results remain distinguishable from completeness or freshness. For example, an empty weather-warning array can mean no warnings at the snapshot; an empty weekly price array does not establish latest pricing availability. Publication time, event/valid/effective time, source revision time and local fetch time remain separate.

## Scope boundaries

The suite validates parsing/projection contracts only. Shared transport timeout/byte-limit enforcement, persisted cross-run deduplication/revision handling, source uptime, actual historical completeness and scheduler execution remain separate integration gates. No v0.3 candidate is enabled by these tests. No global coverage claim is implied by ten endpoints.
