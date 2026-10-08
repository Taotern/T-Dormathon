# Deterministic history refresh 0.19.0

This is an explicit foreground collector for the seven already approved GDP, employment, FX, UK/US legal, safeguards and commodity sources. Python, the shipped pure JavaScript adapters and local SQLite do the work. No model runs during acquisition, parsing, deduplication or export.

The source-profile and snapshot pins are in `contracts/`. Original reviewed datasets/catalogs and their pins are unchanged. This package creates no service, scheduler, account, credentials or automatic upload. Genuine network execution of this new combined runner has not been claimed; the included checks are offline.

## Run

Use a verified POSIX/Linux runtime with Python 3.12+, Node 24 and the already approved `openpyxl` and `xlrd` workbook readers. Windows remains unverified and is blocked before networking. Keep runtime data outside the source package, or under its excluded `data-local/` directory.

```sh
python refresh.py plan
python test_refresh.py
python refresh.py run --state-dir /path/to/private/runtime --acquire
```

The final command is the explicit network action. It runs only due current jobs, sequentially, with at most twelve requests, a strict thirty-second request deadline, per-source body caps, rejected redirects and no in-run retries. Running the command once each day needs no Sol or model. A continuously available approved machine and an operator-selected daily trigger are still required. Neither is installed by this package.

Choose a single current job when needed:

```sh
python refresh.py run --state-dir /path/to/private/runtime --job fx.current --max-requests 1 --acquire
```

Archive jobs never run by default. Explicit bounded examples:

```sh
python refresh.py run --state-dir /path/to/private/runtime --mode archive --job gdp.archive --start 1990 --end 1994 --acquire
python refresh.py run --state-dir /path/to/private/runtime --mode archive --job fx.archive --start 2020-01-01 --end 2020-12-31 --acquire
```

The executable manifest rejects arbitrary URLs, unknown jobs, oversized year/day/month windows and requests outside the approved source families. Completed job state is retained so repeated foreground runs respect cadence. Existing immutable versions and original first-seen clocks survive failures and repeated observations.

## Source cadence and limits

| Job | Local check cadence | Actual information and limits |
| --- | --- | --- |
| GDP | Every 30 days | Source annual nominal USD observations, 2020 through the current requested year. Metadata + one bounded source page. Unreturned years remain gaps, not generated null records. |
| Employment | Every 30 days | Source annual modeled ILO percent of labor force. Metadata + one page. Metadata access date is not model release/publication. |
| FX | Daily | USD/EUR and MYR/EUR source reference rates, with an eight-day overlap. Preserve all 32 CSV fields and native base/quote units. Calendar continuity is not guaranteed. |
| UK legal | Daily | One current Atom page. Publication/update are website clocks; correction resources remain distinct from instruments. A rolling feed cannot establish daily completeness. |
| US legal | Daily | Seven-day publication overlap, at most four 100-row pages. Caps/next pages remain explicitly partial; omitted pages are not silently treated as acquired. |
| Safeguards | Every 90 days | One fixed official asset. Global conflict checks precede selection, and ambiguous attachments are excluded. v0.19 supports Q4_2024 only because the approved attribution names that vintage; a new vintage needs a profile update. This is not current worldwide policy monitoring. |
| Commodities | Every 30 days | One fixed historical monthly workbook, selected 35 native-unit series from 2020 onward, including corrections within that window. No interpolation, conversion, futures-contract or forecast claims. Source publisher says monthly; a successful check does not imply a new edition. |

Archive windows are source specific: GDP/employment at most five years, FX at most 366 days, US at most seven days/four pages, UK one primary-act year, safeguards at most five years/100 cases, commodities at most 60 months. The manifest specifies the supported oldest dates. Available archives and actual completed jobs are separate facts.

## State, versions and failures

`refresh.sqlite` stores immutable source-qualified versions, current pointers, original first-seen clocks, durable acquisition runs, job cadence and origin access/cooldown state. Raw bodies are local content-addressed assets. They are excluded from Git/source exports.

Only acquisition clocks are excluded from semantic hashes. Values, native units, source status, definition/model/publication/update fields and annual dataset vintage remain semantic. A new annual query window alone does not create versions: GDP/ILO per-record evidence uses the fixed approved series endpoint, while the exact acquired query URL remains in its run witness. Unchanged source facts yield no new versions and still produce a durable successful check receipt.

Known-schema numeric revisions create new immutable versions. Definitions, units, rights, geography aliases or required schema drift reject before local data mutation. A value returning to an older saved semantic hash is quarantined in v0.19: the current snapshot contract cannot represent a separate latest observation of an old immutable version. The previous current record is preserved and the failure is explicit. Reversion support is not claimed.

HTTP 401/402/403 locks the exact origin for access review. HTTP 429 retains and honors the actual Retry-After; the fallback is a disclosed conservative one-hour local cooldown. Transient failures preserve last-good rows. HTML/error envelopes, incoherent counts, unknown units and body-cap failures never become silent successful zero-row data. A budget exhausted after metadata produces no fabricated data and does not advance the last-good job clock.

Conditional requests reuse only hash-verified prior bodies from the same transport mode. A 304 never fabricates a new source-body fetch timestamp. Failed/no-change runs can be exported without rows. All referenced runs must be terminal before export.

## Manual ingestion boundary

Exports use `dormathon.source-refresh.snapshot.v1`, bind the approved profile/parser hashes and carry canonical payload hashes, exact immutable metadata hashes, source acquisition links and typed scope/coverage. Each part is at most 100 rows and 256 KiB. Dataset/model/edition/method qualifications remain run metadata, separate from record publication or event clocks.

The core receiver is being prepared separately. It must use `local__` source namespaces and `uploaded_unverified` origin. Producer HTTP claims are not authenticated Site-direct acquisition. Upload is an owner-session manual action; no machine authentication or automatic private sync is available. The old byte-pinned reviewed route and original v1/v2 snapshot imports remain independent.

Transport modes are explicit. Genuine acquisition is a new source request; retained replay preserves an existing source observation; synthetic fixture output is rejected by live ingestion. The supplied sample parts are synthetic and must not be uploaded as actual collection. The new combined CLI's network command is the genuine acquisition path; existing frozen source-specific `run-slice.py` commands remain the exact retained-data replay tools.

## Verification and remaining prerequisites

The offline suite exercises all seven retained-source projections, local store/export, immutable dedup/revision behavior, reversion quarantine, cadence, conditional requests, access/rate locks, failures, native units, definition drift, source caps and terminal clocks. Reduced fixture transport is explicitly synthetic. A separate producer-side receipt verifies both binary decoders against the already retained original workbook/ZIP, with no provider requests. Original source bodies are not shipped in this source package.

To operate daily, select an approved POSIX runtime, provide private writable state storage and the listed existing dependencies, and invoke the foreground command each day. Genuine combined-run transport remains unverified until a bounded real pilot is approved/run. The manual receiver needs its own acceptance and hosted readback. Unattended machine availability, an OS/platform trigger, automatic ingress authentication and Windows support remain separate prerequisites. No current claim extends to all-country, all-company or continuous legal/news completeness.
