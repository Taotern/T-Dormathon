# Historical actor actions and reported outcomes

This is a separate, source-qualified observational dataset. It does not replace intelligence records, infer causality, generate rewards, or label a missing report as a negative outcome. The first licensed source pilot will determine the populated fields and coverage; this contract does not promise a complete history across actors or domains.

## Immutable row

`dormathon.outcome-trajectory.v1` has exactly these fields:

- `schema_version`, `source_id`, `source_record_id`, `event_group_id`, `domain`, `title`
- `actors`: source-qualified `actor_id`, `actor_type`, `name`, `role`, `identity_basis`, and optional exact-source `registry_refs`
- `event`: `event_type`, typed `onset` and `end`, and source-supplied `geography`
- `actions`: `action_id`, `actor_ids`, `action_type`, `status`, typed `time`, and a bounded `evidence` field pointer
- `outcomes`: `metric_id`, `name`, `value_type`, `value`, `value_status`, `unit`, `label_kind`, `measurement_window`, `basis`, `related_action_ids`, and `attribution_status`, and a raw `evidence` field pointer
- `environment`: `snapshot_asof`, `reconstruction_status`, and bounded `source_context` field/value pairs
- `confounding`: `assessment_status`, `concurrent_event_ids`, `notes`
- `availability`: typed `publication`, `source_asof`, `revision`, actual `acquired_at`, and `historical_availability_status`
- `completeness`: `monitored_universe`, `window`, `source_record_status`, `censoring`, `negative_label_supported`, `limitations`
- `provenance`: `source_url`, `license_name`, `license_url`, `source_snapshot_id`, `raw_response_sha256`, `safe_projection_sha256`, `parser_version`

A typed time is `{value, precision, timezone, basis}`. Precision is `year`, `quarter`, `month`, `day`, `timestamp`, or `unknown`; unknown means `value=null`. Only timestamp values have a verified UTC/offset clock. Date-only values are never promoted to a publication or occurrence timestamp.

Action status is `announced`, `implemented`, `reversed`, `reported`, or `unknown`, and must be justified by the approved source profile. A procedural decision is not a downstream business effect. Actor types are `company`, `government`, `government_jurisdiction`, `political_party`, `international_organization`, `organization`, or `unknown`; this dataset excludes individual political profiling. Registry links require a supplied exact identifier or a separately reviewed crosswalk.

Outcome value types are `numeric` or `categorical`. A supplied zero is a value; missing/unknown/censored values stay null. Label kinds are `observed`, `estimated`, `proxy`, or `reported`, according to the source. Measurement windows and units remain explicit. Attribution is `not_established`, `source_claimed`, or `independently_supported`; the first source pilot does not establish causal effects. Oversized narratives, contact details and arbitrary labels are outside this schema.

## Receiver and reads

Only byte-pinned, rights-reviewed source chunks can enter the outcome lane. Each import transaction preserves its manifest/policy/chunk, acquisition witness, immutable event version and source identity. A repeat is idempotent. Conflicting stable identity/group assignments or unknown policies fail before writes. Existing intelligence tables and rule state are untouched.

Planned same-origin API:

- `GET /api/outcomes/status`: actual sources, events, versions, metrics and pinned batch completion
- `GET /api/outcomes/events`: paginated source-qualified events, with explicit source/domain/onset filters (`onset_grain=year|month|day`, matched YYYY/YYYY-MM/YYYY-MM-DD bounds)
- `GET /api/outcomes/evidence?version_id=...`: exact immutable trajectory and acquisition/import provenance
- `GET /api/outcomes/export`: bounded cursor/watermark export, event-group IDs, temporal partition flags and censoring/coverage fields
- `GET /api/outcomes/context?version_id=...&decision_at=...`: optional availability-only intelligence candidates at an explicit timezone-qualified decision clock
- `POST /api/outcomes/import-chunk`: the approved manifest/policy/path/text only; no arbitrary URL, model labels or inferred reward

## Training limits and leakage

The source snapshot's actual acquisition time is the conservative availability bound when historical publication or revision availability is unverified. A 2020 action acquired in 2026 does not prove its outcome or context was available in 2020. Current revised macroeconomic vintages cannot silently become historical features.

An intelligence context candidate must be an exact retained version available on the Site by `decision_at`; later versions are excluded. Uploaded-unverified claims are excluded from this first feature-candidate route. Candidates remain unreviewed associations. The endpoint does not infer actor relevance or causality and does not silently join today's intelligence to a historical action.

Temporal export partitions whole source-qualified event groups. Unknown onset or a group spanning a requested split boundary is flagged/excluded from assigned train/validation/test partitions. The export records the partition rule, exact versions, label availability and measurement/censoring status. Event-time partitioning alone is not proof of a leakage-free historical training set. A dataset with no historical context returns that limitation explicitly.

No event-free negative, counterfactual, causal reward or model-ready numeric encoding is produced unless the monitored universe, observation window and source completeness support it. The teammate owns modeling, action/reward design and training.

Source onset filters exclude records coarser than the requested grain rather than guessing finer dates. Temporal partitions use explicit calendar uncertainty bounds for coarse source periods; these bounds are not inferred occurrence timestamps.
