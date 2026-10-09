# Hackathon module ports — v0.2

This is integration glue for the approved specification, not a replacement implementation of FR07, FR08 or FR12. The current Site keeps evidence retrieval, source versions and the separate CVD dataset. New operating-case inputs are explicitly synthetic fixtures with user edits. They are not customer records or actual business gains.

Owners: teammate1 resolves entities/relations (FR07); teammate2 reconstructs/replays state (FR08); Felix compares policies/simulations (FR12). We supply evidence, operating/EAO records, risk observations, the complete frontend journey and human decisions/feedback. Teammates need callable contracts and runnable examples, not frontend styling.

All ports carry schema_version, request_id, input_refs, knowledge_as_of, world_time, knowledge_mode, data_revision, status and warnings. Status is ok, partial, insufficient_data or unsupported. Unknown stays null. Source quotes, units and source names are preserved; English interface explanation does not rewrite evidence.

## Existing adapters, pending services

- FR07: resolve_entities(mentions, knowledge_as_of), fuse_relations(claim_refs). Fixture-declared business IDs are not automatically resolved entity IDs.
- FR08: reconstruct_state(scope, knowledge_as_of, world_time, knowledge_mode), replay(interval). Our availability checks are not a full state reconstructor. Fixture clocks do not prove historical availability.
- FR12: compare_policies(state_ref, objectives, constraints, actions). Policy ranking, simulation and RL belong to Felix. With no service/state, the live integration reports unsupported, not a guessed strategy.

No endpoint/token is invented and no external request runs. The minimal request examples in port-examples.v0.2.json let modules develop independently. Replace fixture references only with exact versioned references from actual modules.

## Current runnable Site flow

GET /api/prototype reads the fixture and explicit unsupported ports; it does not create a case.
POST /api/prototype/start {fixture_id:'linked-operations-v0.2'} idempotently creates one labelled case and immutable operating snapshot in the existing workspace tables.
POST /api/prototype/analyze {case_id,inputs} recalculates bounded rule observations without a write. Stock, ledger completeness, open-task internal targets and expiry assumptions remain separate.
POST /api/prototype/save-analysis uses the same input and freezes exact inputs, hashes, evidence and pending module states as a review.
POST /api/workspace/evidence attaches an existing immutable global version with an explicit possible/user-reviewed/rejected association. Matching a public source does not prove impact.
POST /api/prototype/decide {case_id,analysis_id,title,note} freezes the saved analysis and its cited evidence with a human-selected action. It does not execute it.
POST /api/prototype/feedback {case_id,action_id,feedback,note} stores user-reported feedback as pending evaluation. Feedback alone does not establish learning, improvement or reward truth.

Public evidence and prototype reviews do not alter the original operating corpus, 51,471 intelligence versions or CVD171. No migration, scheduler, new credentials or production service is introduced.
