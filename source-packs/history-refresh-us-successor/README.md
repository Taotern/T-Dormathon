This small US-only repository entrypoint uses the clean Dormathon repository's curated history-refresh runtime, canonical helper, job manifest, two existing legal common modules, and exact central old/new profile assets. It requires no standalone base ZIP and does not copy the full 55-file producer package or change an existing source/history entrypoint.

Suggested integration location: source-packs/history-refresh-us-successor/. Copy this directory's source assets there unchanged. The approved central successor profile is data/refresh-source-profiles.us-v0.19.2.json, SHA-256 9c33c077cc30fe4946e519eb795cbc33e9640320623db19db62333c6ad6ca130. DEPENDENCIES.repo.json binds every reused repository file by exact path, size and SHA. Dependency drift fails before networking.

Show the US-only plan:

    python source-packs/history-refresh-us-successor/repository-entrypoint.py --repo . --state-dir /separate/us-state

Future explicit foreground acquisition, after the operator chooses to run it:

    python source-packs/history-refresh-us-successor/repository-entrypoint.py --repo . --state-dir /separate/us-state --acquire

The command uses only us.current: daily cadence, fixed official query, seven-day overlap, at most four pages/requests, one attempt per request, 30-second deadline, 1MiB per body, rejected redirects, origin rate/access backoff, dedup and atomic per-job processing. The exact shared runtime retains those behaviors. Old/shared/unmarked state rejects rather than being migrated or relabelled. A new dedicated state receives the exact successor profile marker. No archive, scheduler, service, credential, automatic upload or automatic sync is provided. The original CLI/profile and all previous source pins stay unchanged. POSIX/Linux is the verified deadline/lock runtime; Windows remains blocked.

At invocation, eight small runtime code/profile/job files plus a derivation manifest are materialized in a temporary folder. The original fetch/store/export runtime is reused with only its central-profile import path and producer version caption adapted. The canonical helper imports the same pinned shared module through its temporary location. A small US-only projector reproduces the approved metadata/content/version hashes. The new US adapter and the two existing common modules are materialized together without changing their bytes. The temporary folder is removed when the invocation ends; raw bodies, SQLite, receipts and exports stay only in the explicitly chosen local state directory.

The existing reusable exact-pilot replay is also available without network:

    python source-packs/history-refresh-us-successor/repository-entrypoint.py --repo . --state-dir /fresh/us-replay-proof --replay-root /path/to/original-six-source-run

That proof needs the separately retained original genuine ledger/body/receipt/state artifacts, not a base producer ZIP. It permits only the three already-saved Federal Register request URLs and verifies their hashes. Three hundred records are partial coverage of the declared 605 records/seven pages; no fourth page is acquired. Every normalized row preserves the exact original per-page source acquisition clock. Replay completes/exports at its own logical time and is labelled retained_replay. The synthetic bad-page3 test remains separate and rolls back all rows, items and last-good state. It cannot be imported live.

The source successor preserves nullable CFR title/part/chapter without guessed legal references or effects. A source action paragraph exceeding 1,000 UTF-16 units is wholly omitted with an explicit flag and exact length/hash/document-field-URL pointer. It never appears in summary or retrieval text. Original source publication/effective/comment dates, official IDs/URLs, agencies and unknown legal status are preserved.

Recorded repository proof: all 300 normalized metadata objects, metadata/content hashes, stable version IDs and source/first-seen clocks deep-equal the accepted standalone successor replay. Only new logical acquisition IDs, replay completion/export clocks and corresponding envelope hashes differ. No provider/Site request was made; the negative page rolls back atomically. This repository addition has not run a new genuine US request, deployed a scheduler, executed on Windows or uploaded its output to the Site.

The standalone16-asset producer ZIP/profile and original failed genuine ledger remain immutable. Repository mode is a separate source addendum. Old3eb4 and successor9c33 Site evidence must retain their own immutable policy/parser context; the latest registry is never a substitute for a saved version's original context. Uploaded producer authenticity remains unverified.

Source package excludes full source bodies, local runtime state/exports, credentials and scheduling configuration. Reproducing the exact recorded replay requires authorized local access to the separately retained raw witnesses.

Repository addendum v0.19.2.1 supersedes the05f2c8cd… package only for its state-marker preflight. Any existing mismatched/invalid marker now rejects even when SQLite has not yet been created. A matching marker-only interrupted initialization is recoverable; an existing unmarked/mixed database still rejects. Parser/profile/source/projector and the300-row equality proof are unchanged. No replay or source request was repeated for this fix. The immutable standalone16-asset package retains the earlier conditional marker guard, so ongoing US execution should use this corrected repository entrypoint.
