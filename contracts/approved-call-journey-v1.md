# Approved-call prototype journey v1

This increment implements the owner's recovered call summary dated 9 October 2026 in the existing private Site. It does not change the teammate ownership of FR07, FR08 or Felix's FR12.

## Working experience

The five rooms are Home, Organization, Intelligence, Advisor and Strategy. Home and Organization share the same 14 explicitly fictional Serai Campus Services matters: four supply, four procurement, four service and two energy/food matters. Four unchanged scenarios carry authored probability examples. Edited quantities update bounded arithmetic and withdraw the original probability. A zero modeled gap is not an all-clear; missing quantities are rejected rather than converted to zero. Original process states remain separate from calculated quantities.

The route's `context_kind` distinguishes `organization` and `demo` across rooms and browser history. Demonstration matters have no owner project ID. Saved organizations and their records remain separate. Edited demonstration quantities persist within that browser session and retain their case identity; they are not saved as owner operations.

Advisor contains deterministic conditional comparisons and source suggestions. LLM generation is unconfigured. Intelligence still searches the existing retained corpus, preserving native source values, units, periods and original evidence. Source suggestions are retained for review and never fetched automatically.

## Sourced historical replay

`data/prototype/history-replay.v1.json` is the independently prepared ten-case fact pack. Its rationale-corrected v1.1 SHA256 is `340295c4f885ea503b04d4bbbb318673e35b4528d54acec0d6afda8ef9d0e76e`. The set has three employment/inflation cases, two food recalls, two port-throughput vintages, two EU policy/trade cases and one energy-supply restart. It is an authored walkthrough, not a prospective accuracy benchmark or global coverage claim. Original historical page snapshots are not held; one USDA outcome uses an explicitly identified official indexed excerpt.

- `GET /api/replay/cases` returns neutral case titles and cutoffs.
- `GET /api/replay/cases?id=...` returns only pre-cutoff facts and their source references, plus explicitly retrospective authored prediction examples. Outcome, confusion label and method update are omitted. Retrospective source notes and later revision metadata are also excluded from pre-reveal citations.
- `POST /api/replay/lock` saves immutable target/window/probability/threshold/method before reveal. Fields: `case_id`, `creation_key`, `probability`, `threshold`, `method_note`, `rule_version`, optional `method_update_id`. Probability and threshold use 0–1 numeric values.
- `POST /api/replay/advance` accepts a retained `lock_id` and `advance_to`, either an explicit zoned clock or `next_publication`. Before the safe source-availability bound, no outcome is returned. After it, the confusion category is calculated from the actual locked probability and threshold.
- `GET /api/replay/run?id=...` reopens the saved lock and any revealed result.
- `POST /api/replay/method-update` saves `reveal_id`, `creation_key` and `method_note`; it links a demonstrated method version to a different retest case. Carrying that saved method is validated by the next lock.

Physical onset lead time is unknown in this pack; publication/reveal gaps have a separate label. Port preliminary values and the CBAM FAQ's December revision are retained at their actual source vintages. A method edit and a scripted retest do not establish learning or improved performance. Parameter training is proposed, not executed; no reinforcement-learning pipeline runs.

## Private submissions and feedback

`journey_entries` is an additive append-only table. Existing owner cases, evidence, intelligence and outcomes are not rewritten. Identical retries with the same creation key return the original entry; changed payloads under that key reject. Hosted owner-private access and the existing same-origin mutation gate are retained. A real case is bound to its saved project; a demo case cannot be attached to an owner project.

`POST /api/journey/entries` accepts `kind`, `creation_key`, optional `project_id`/`case_id` and these kind-specific fields:

| Kind | Fields | Actual state |
| --- | --- | --- |
| `source_suggestion` | `source_url`, `note`, optional `title`, `institution`, `coverage` | Pending review; not fetched or integrated |
| `replay_submission` | `title`, `replay_at`, `target`, up to eight `references`, optional `note` | Pending review; not scheduled; no result or training |
| `replay_evidence` | Saved `supplement_to` request ID, one to eight `references`, optional `note` | Append-only supporting evidence; same pending review; original request retained |
| `action_feedback` | `advice_ref`, `advice_version`, `action_taken`, optional zoned `execution_at`, `result`, optional `conditions` | User report pending evaluation; no improvement claim |
| `private_note` | Saved `project_id`, `title`, `note` | Private storage; RAG indexing/retrieval and shared training not connected |

Demo feedback must cite `demo_advice_<case_id>` and `business-demo-v1`. References entered for real cases are explicitly user supplied and unverified. `GET /api/journey/entries?kind=...&project_id=...` reads retained submission status (supporting-evidence reads can additionally filter by `parent_id`), bounded to the latest 40 entries. It does not expose replay outcomes through the submission-list endpoint. No human review, scheduling, automatic ingestion or model training is implied by a saved request.

Settings places private notes and action feedback together with clear storage/training limits. Shared-model training defaults to off. Local profile and display preferences remain browser-only and are separate from the company context.

## Verification

Affected checks cover the actual client, emitted Worker, UTC availability, immutable lock/reveal/reopen, method transfer, explicit advice versions, owner/demo isolation, missing quantities and old-record preservation. Independent actual desktop/500px browser acceptance is required separately; a local pass is not a hosted visual acceptance claim.
