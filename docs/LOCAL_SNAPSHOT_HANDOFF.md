# Local collection and manual private-Site handoff

The owner selected local deployment for the deterministic routine that cannot currently be provisioned through the exposed GPT-Site trigger contract. The GUI remains on the same owner-private GPT-Site. The local package is a separate Node24 + built-in SQLite program; its running foreground process has daily due/catch-up logic. It requires an awake computer and open process. No OS scheduled task, firewall change, tunnel, credential or commercial-cloud deployment is configured.

The local executor preflight was rejected before the first shell command by an exec-server ACL service error. Cloud package tests do not establish successful Windows installation or execution. No bypass was attempted.

## Manual handoff

Run the local package's `export-site` command and select a JSON partition in the Site's Global Intelligence page. Choosing a file only reads it; the separate save button performs validation and one atomic D1 batch. Import each numbered partition. Repeating a file is idempotent. Independent exports retain stable imported item/version identities; newer local observations advance current pointers, older uploads preserve them. Conflicting immutable evidence identifiers reject the entire file.

`POST /api/global/import-snapshot` accepts exactly `{snapshot: <object>}`. It is protected by the existing owner-private Site access and same-origin request guard. The route does not fetch any URL or invoke an LLM.

Accepted schema: `dormathon.local-intel.snapshot.v1`. Each partition is at most1,572,864UTF-8 bytes,1000items,2000versions,500original run receipts and1000rule records. The referenced current versions, historical rule-evidence versions and source runs must be present; row identities, content hashes, source declarations, counts, clocks, limited facts and deterministic rule references are checked. The whole payload excluding `integrity` must match its stableJSON-v1 SHA256.

SHA256 detects damage; it does not authenticate a collector or source. Imported records are isolated under `local__` identifiers, marked `local_snapshot_upload` / `uploaded_unverified`, and disabled for Site direct collection. The same public event may exist in both direct-fetched and uploaded collections. Totals disclose the two classes. Source-provided metadata and immutable content hashes remain unchanged; import timestamps and upload fingerprints are kept separately. Local first-seen/analysis times are uploader claims, never relabelled as the Site's observations.

`GET /api/global/status` returns the five most recent upload integrity receipts and separate direct/uploaded counts. Items, lexical search and version evidence carry origin/verification fields. No automatic sync or independent trigger is claimed. The uploaded local scheduling declaration does not change the Site's registered temporary assistant task.

The export is a selected-current-item and rule-evidence projection. It explicitly declares omissions, partition index/count and incomplete history; full older revisions remain in the local SQLite database. Closing the collector records missed-day gaps on restart and fetches the current overlapping source windows. It does not fabricate historical backfill.

## Verification limits

Importer tests use a pinned synthetic reconstruction of retained provider metadata, never a new live observation. The fixture is tests-only and is not seeded or uploaded to the deployed Site. Local SQLite restart/rollback, HTTP contracts and mock DOM checks establish the bounded code path. They do not verify execution on the blocked user computer or an actual owner local-data upload.

## Separately admitted forecast branch

Version1 and catalog SHA8cb6d74e029b066e4dc6660ec32e804078f3e2c941b5140566052fc94191ef27 retain the exact ten-source contract. Version2 requires catalog SHA551dcc4030a9448cfe6b4951e03fa4821873a3cbe0cc2bd4e17f574950c22f9d and adds the MET Sarawak forward-forecast projection. It preserves date-only validity, unknown occurrence/publication/issue clocks, named area without coordinates and bounded attribution/forecast facts. Unknown nested body fields are rejected even if the hashes are recomputed. The current local1.1.0 producer has not been upgraded to the new catalog; v2 support is a receiver admission boundary, not a local runtime claim.
