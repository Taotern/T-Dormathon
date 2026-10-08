# Deterministic foreground refresh

This is the repository's current seven-source refresh entrypoint. It reuses the exact existing pure adapters in sibling source packs and the approved profile/dimension contracts in `../../data`; it does not duplicate the 19 adapter implementations. `DEPENDENCIES.json` binds every reused file by SHA-256. The original independently verified standalone package identity and source manifest remain under `provenance/`.

Verified developer runtime: Linux, Python 3.12 and Node 24. The offline test needs only their standard libraries. Genuine commodity workbook decoding additionally needs `openpyxl`; genuine safeguard BIFF decoding needs `xlrd`. Those dependencies must come from their reputable package registry. Windows execution is blocked before requests because the strict deadline/process lock is verified only on POSIX.

From the repository root:

```sh
python source-packs/history-refresh/refresh.py plan
DORMATHON_REFRESH_TEST_REPORT_DIR=/tmp/dormathon-refresh-tests python source-packs/history-refresh/test_refresh.py
```

Both commands make zero provider requests. The 28 tests use explicitly synthetic transport with retained licensed factual fixtures. They are not genuine collection or live Site-import evidence.

To start an explicitly selected foreground acquisition after checking the source access/rights state:

```sh
python source-packs/history-refresh/refresh.py run \
  --state-dir /absolute/operator/runtime-directory \
  --job fx.current --max-requests 1 --acquire
```

`--acquire` enables only the fixed approved source URLs; it creates no scheduler or service. The process persists request intents, access/cooldown locks, original response hashes, immutable local versions, last-good job state and bounded export parts. `--state-dir` is runtime storage, not source delivery. Do not commit its SQLite database, raw responses, receipts or export files.

Daily jobs are ECB eight-day overlap, UK current Atom and US seven-day publication overlap (at most four pages). Monthly checks cover recent annual GDP/unemployment and commodity history. TTBD checks are quarterly; its approved attribution remains Q4_2024. No feed retention, complete calendar or exhaustive provider coverage is guaranteed. Source-specific archive jobs are explicit and range-limited; inspect `plan` before using `--mode archive --job … --start … --end …`.

HTTP401/402/403 creates an origin access lock. HTTP429 preserves/honors its actual Retry-After, and transport/schema/oversize failures preserve last good with cooldown. There is no in-run retry or alternate route. Unknown unit/definition/rights/geography/schema changes and true content-hash reversions are quarantined. Metadata-only budget exhaustion does not advance successful cadence. Future versions require approved profile maintenance when their meanings change.

Exported `dormathon.source-refresh.snapshot.v1` parts bind the approved profile, exact/semantic hashes and acquisition witnesses, with at most100 records/256KiB. The existing private workbench accepts them through its owner-session file picker. They remain `local__` / uploaded-unverified, even when the local mode says genuine acquisition; there is no machine credential or automatic Site synchronization. Full ingress/API semantics are in [DETERMINISTIC_REFRESH.md](../../docs/DETERMINISTIC_REFRESH.md).

One actual cloud-Linux ECB current-window run and one manual owner-session upload were verified on2026-10-08: oneHTTP200,14 source observations, exact raw32 CSV fields/native EUR-base units,14 local versions and14 Site documents. A local retained-byte replay used zeroHTTP and created zero versions. Its immediate cadence bypass was validation-only, not a scheduler or fresh source acquisition. This does not verify Windows, daily unattended operation, automatic synchronization or genuine transport for all seven families.

Earlier source packs remain reproducible acquisition/admission history and immutable evidence. This entrypoint adds operational refresh within their approved scopes; it does not add global entity/relationship/domain coverage or downstream risk analysis.
