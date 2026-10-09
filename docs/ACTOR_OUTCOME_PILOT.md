# First historical actor-action/outcome vertical

The outcome lane is separate from the existing 51,471 intelligence records and their lexical index. It stores licensed, source-reported observational trajectories for downstream modeling. It does not generate rewards, resolve company identities, establish causality, or replace missing reports with zero.

## Actual initial content

World Bank TTBD countervailing-measure snapshot `Q4_2024`, selected by supplied initiation dates in 2020–2024: 171 case records in 123 source case groups, 13 bounded chunks. Nine supplied reporting-jurisdiction labels: Australia 14, Brazil 3, Canada 9, China 5, EU 12, UK 15, India 15, Mexico 1, USA 97. These counts are case records and source labels, not every-country monitoring or verified territorial applicability.

The source supplies 776 dated procedural stages, 115 cases with a supplied final code, 84 final-measure-date cells and one revocation-date cell. Seven fields per case make 1,197 preserved outcome fields: 677 reported categorical/date tokens and 520 unknown fields. They are neither 1,197 independent outcome events nor business-impact labels. CVD-specific definitions are unverified; the antidumping codebook is not applied to interpret A/N/T/IF/MI/dot codes. Source dates do not establish modern in-force status.

1,039 case/table-row party references preserve supplied labels. Zero company identities have been resolved; there are no individual-company strategies, revenues, employment effects, recovery or causal-impact observations. Government-jurisdiction references do not identify a named decision authority. Unknown publication/revision history and unknown censoring remain explicit. The current antidumping asset's denied route remains stopped.

The acquisition occurred on 2026-10-08; the source's Q4_2024 vintage and historical action dates are distinct from acquisition. HTTP Last-Modified is not per-record publication. The conservative label-availability bound is actual retained acquisition, which cannot prove these values were known at a 2020 decision.

Profile SHA256 `07e124dd06428d3e0ea9cb7554249bbef5d85c3944cd42fab321f62268d0f012`; original manifest SHA256 `a314a586b4d2a09a65d6d47bf8ccbaf42f1506839da88ccd052a31063c3dae60`. The receiver preserves exact original ZIP, safe-projection, policy, chunk and acquisition witnesses. Source-only code and small actual fixtures are in `source-packs/outcomes-cvd`; full 13-chunk/raw data remains in the separately permissioned external package. CC BY4 attribution and the catalog→landing→archive linkage are retained; there is no new blanket license for the entire intelligence database.

## Reproduce without a Site or credentials

Verified platform: Linux, Node24, Python3.12. Windows, scheduling and unattended operation remain unverified. Core build/test needs no network or install:

```sh
npm test
```

The Node tests use six small actual examples plus one bounded actual chunk. Explicit artificial mutations for rollback, temporal/group and version lifecycle tests stay offline. To verify all 171 original rows, obtain and extract the separate external CVD data ZIP and pass its consumer-local data directory:

```sh
node scripts/build.mjs
node scripts/verify-outcome-pilot.mjs --data-dir /absolute/extracted/Dormathon-CVD-Actor-Outcomes/data-local
```

This validates exact pins, imports into isolated in-memory SQLite, compares all immutable metadata/hashes, paginates all groups and verifies historical-context exclusion. It performs no provider fetch or Site write. Original-workbook reproduction and its Python dependency prerequisites are documented in [the producer README](../source-packs/outcomes-cvd/README.md). Repository access does not automatically grant external data or private Site access.

## Teammate API and observational export

Full schema: [outcome trajectories v1](../contracts/outcome-trajectories-v1.md). Same-origin owner-authorized reads:

```js
const response = await fetch('/api/outcomes/events?limit=25&onset_from=2020-01-01&onset_to=2024-12-31');
if (!response.ok) throw new Error('Historical trajectory read failed');
const page = await response.json();
// Preserve event_id, event_group_key, version_id, content_hash,
// metadata_sha256, source_policy_sha256 and the complete trajectory.
```

`GET /api/outcomes/export?limit=100&train_end=2022-12-31&validation_end=2023-12-31` returns a bounded page with a watermark/cursor, whole-group temporal partitions (calendar uncertainty bounds for coarse periods), label availability, unknown windows and censoring. Continue with the original query and returned cursor. Do not silently treat a first page as the complete dataset. Different filters invalidate a cursor; subsequent admissions are excluded by its watermark. Hashes are opaque canonical Node/ECMAScript JSON references; exact reproduction helpers are in the repository.

Event-time splits alone do not yield historical training truth. In this snapshot, labels acquired in 2026 are not available by 2022/2023 training cutoffs. Cross-boundary or unknown-onset groups are flagged. Unknown follow-up windows and censoring require an explicit downstream treatment.

`GET /api/outcomes/context?version_id=...&decision_at=2020-01-01T00:00:00Z` considers only exact intelligence versions retained on the Site by the supplied timezone-qualified clock; later revisions and uploaded-unverified claims are excluded. The existing corpus has no contemporaneously retained 2020 context, so it cannot reconstruct that environment. Availability candidates are unreviewed associations, with no actor relevance or causal guarantee. No linkage is guessed from a firm name or country label.

The formal workbench offers list/filter/detail, original action/value witnesses, JSON export and this explicit context clock. This first vertical validates source-shaped handoff; broad company, party, international-organization and global historical context/outcome coverage remains future work. Model/RL action selection, reward construction and training belong to the teammate.

## Runtime stage

On 2026-10-09 01:05:07 UTC, all 13 exact chunks were durably admitted: 171 cases / 171 immutable versions / 1,197 fields. Full saved readback compared every original trajectory and six evidence examples, with 123 case groups and zero hindsight context at a 2020 decision clock. Independent source-value review passed 15 focused checks; original intelligence remains 51,471 indexed versions, with 369 direct / 114 uploaded-unverified / 50,988 reviewed snapshots, eight saved rules and unchanged business records.

Source/runtime `902088dd8e2462922197930591cd8151854ab78a` is saved as private Site version33. The actual runtime and additive five-table schema were verified through owner-authorized reads and one ledgered first chunk before the remaining twelve. The native deployment status remains `publishing` with its last recorded update at 00:35:04 UTC; this is a qualified working-runtime/data acceptance, not certification of a terminal deployment-control-plane result. No duplicate deployment, import replay or provider request was made. Served asset body hashes were not empirically captured after a browser route denial; no alternate request was used for that target.

The date-epoch narration qualification preserves all row/version hashes: raw date cells are in environment source context; workbook date mode is in retained safe witness `$.cases[*].master.date_mode`, paired with workbook/sheet/row. Its immutable original SHA256 is `7ef5a30d80c481deea2f9e12c6e9c42427fc37636cc47d78dca6ddc16a315e73`. UCDP299 remains a separately prepared, unadmitted next vertical; CVM13,689 filings remain disabled action-only research with financial outcomes unknown after the preserved denied DFP request.

The formal-workspace successor, source `995978ecfcf4050b9f8b7157ee1c9629ad4248dd` / private version34, published with native terminal success on 2026-10-09 01:34:53 UTC. Its read-only 13-response acceptance confirmed unchanged CVD171 and 51,471 intelligence versions, source-type counts and actual GDP / MY / 2020–2025 two-page retrieval. Historical version33 remains recorded as publishing, without rewriting its original state. The presentation-only density successor source `cdc3509a9164a9246ee5d0cab67d5241284052c5` / version35 published with native terminal success at 01:54:32 UTC; source policies, stored rows and APIs are unchanged. Independent GUI acceptance is recorded separately.

The narrow-reader successor source `e2b14f7802d555b74adb10c3e97e5339518954c2` / private version36 published successfully at 2026-10-09 02:08:22 UTC. It adds a narrow scroll offset and preserves focus without scrolling so the reader Back control clears sticky navigation. Data, API, source profiles and admission receipts are unchanged. Independent actual GUI acceptance passed on 1188×761 desktop and 500×761 narrow viewports. Version34 established the four source-type/query/evidence/history flows; version35 passed compact density, exact-date tooltip and retained-result error clarity; version36 passed visible pointer Back and focus restoration for both intelligence and CVD readers. The final release receipt records the exact stages.
