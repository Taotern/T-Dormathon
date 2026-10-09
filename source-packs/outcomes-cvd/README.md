# World Bank CVD actor/action/source-outcome pilot

This separate source producer supplies **171 retrospective countervailing investigation trajectories**, grouped into 123 exact source case groups. They begin during 2020–2024 and belong to the World Bank archive vintage `Q4_2024`. Nine reporting jurisdictions are represented: Australia, Brazil, Canada, China, European Union, United Kingdom, India, Mexico and USA. A jurisdiction is not a named agency, political party or a verified company's operating footprint.

The pilot retains 776 dated procedural source stages. 115 cases contain a supplied final decision marker, 84 contain a final-measure date and one contains a revocation date. These are source-reported procedural fields. Codes such as A/N/T/S/AVD stay literal categorical values because the linked legacy variable book describes antidumping rather than this CVD schema. MI/dot/IF remain raw evidence tokens with null/unknown normalized values. No code becomes a success/failure reward or a modern in-force statement.

There are 1,039 case/table-row references to domestic or foreign party labels. Labels may denote companies, associations or compound labels. IDs refer to the source row; names are not merged across cases, resolved to LEI/CIK, or split into invented entities. Collective "all other" labels are omitted from actor identities and retained in the source witnesses. Individual-company action histories, business loss, recovery and causal effects are not supplied by this pilot. No event-free negative examples are generated.

## Rights and evidence

Dataset-specific [World Bank Dataset0039583](https://datacatalog.worldbank.org/search/dataset/0039583/temporary-trade-barriers-database-including-the-global-antidumping-database) explicitly declares CC BY4.0 and links the current TTBD distribution. The actual retained [TTBD landing](https://www.worldbank.org/en/data/interactive/2021/03/02/temporary-trade-barriers-database) links the fixed CVD archive used here. The retained license projection, landing response and full archive hashes bind that lineage. Use the attribution in `contracts/source-profile.v0.21.json`, describe filtering/normalization and avoid endorsement claims.

Only source date/code/product/geography labels and bounded party-table references enter normalized rows. Narrative NOTES, linked document bodies, contacts and arbitrary numeric duties are excluded. Exact original public dataset bytes and all acquired/normalized bulk data remain outside the Git source pack. Small lawful source fixtures and code/profile/receipts may be included in source control.

The separate current antidumping archive returned HTTP403 through the public reader and is stopped. No alternate transport, headers, proxy or retry was used for that target. The independently published CVD asset succeeded once: 1,332,534 bytes, SHA-256 `9151401fa3ff8d438d19e1d60dc7560f80f2f49f77ac45b3aa625881b3e4655b`.

## Time and coverage

All archive master IDs were checked globally before period selection: 1,263 unique cases, 23 supplied reporting labels, no duplicate master case ID. Parseable source initiation dates span 1977-04-14 through 2024-09-16. Only the disjoint 2020–2024 initiation cohort is normalized in this pilot. Downloaded historical availability is different from admitted historical coverage. No2025–2026 case coverage or complete2024 late-year reporting is claimed. USA contributes97 of171 selected rows; this is uneven reporting coverage, not a global country denominator.

Onset and stage cells stay date-only. A final decision or revocation cell does not establish a whole-case end. `Q4_2024` is typed quarter source vintage, distinct from publication and acquisition. HTTP Last-Modified/Date and the landing's publication date do not become per-record release dates. Original publication/revision availability is unknown for every row. Actual acquisition at2026-10-08T23:28:31.246930+00:00 is the conservative known availability bound. No contemporaneous environment or historical feature join is reconstructed. Confounding/counterfactual attribution is not assessed; censoring is unknown.

`reports/coverage-matrix.v0.21.json` separates geography/time/actor/action/follow-up evidence from gaps. A source party label count is not resolved entity coverage, and a missing follow-up is not absence of a risk/event.

## Deterministic replay

Python3 with the existing reputable `xlrd` and `openpyxl` packages is required for read-only XLS/XLSX extraction. The pure trajectory adapter and fixture tests use only Python's standard library. No Windows or installed scheduler test is claimed.

Run offline source tests from this directory:

    python test-contract.py

Twenty meaningful guards cover saved reconstruction, global duplicate/orphan rejection, source-vintage drift, date/unknown precision, raw categorical codes, no numeric reward coercion, case-row identities, collective-label exclusion, no narrative leakage and no negative examples.

To reproduce the full pilot, restore the separately delivered external data archive into this directory, preserving `source-data/` and `receipts/`, then run:

    python extract-audit.py
    python build-pilot.py

The extractor preserves workbook digest, sheet, row and Excel epoch. It limits archive expansion to32 members/32MiB total/8MiB per member. No network is needed. Reconstructed13 chunks remain <=100 rows/256KiB and whole cases stay <=64KiB. The frozen manifests are evidence; reproduce into a fresh extraction for independent comparison rather than replacing a received frozen directory.

`acquire-pilot.py landing` and `acquire-pilot.py countervailing` are explicit foreground reproduction entrypoints for the two fixed public URLs. Each uses30s/256KiB landing or2MiB ZIP bounds, rejects redirects and records durable attempt/result receipts. Existing receipts suppress another request. A changed official link, larger body, access denial or429 stops the source. There is no crawler, scheduler, credential configuration, live Site import or automatic rights/profile migration. The Q4_2024 profile must be reviewed before admitting a different vintage.

## Core handoff

Use `data-local/manifest.json` with exact `contracts/source-profile.v0.21.json` and13 byte-pinned chunks. Core owns the separate outcome receiver, immutable versions/API, temporal grouping/export and basic GUI. These rows are not original intelligence items, automatic alerts, model rewards or ready-made leakage-free training examples. Core independently accepts and imports the batch; `reports/producer-ready.json` only states acquisition/source-validation readiness.
