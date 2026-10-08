# Existing Dormathon evidence workspace — v1 contract

Scope: one functioning watch → real saved event → evidence investigation → explicit scenario → human review/action path. Four original domain pages, global collector/search, imported/direct provenance and data remain. No new Site. Workspace identity/association is user-declared or unknown; no automatic identity resolution, causal attribution, probability or historical/current-data join.

## Bootstrap

GET /api/workspace → {projects, objects, cases, actions, capabilities}. Each row has id/created_at/updated_at. capabilities: {lead_matching:'lexical_explicit_terms', semantic:false, identity_resolution:'not_implemented', impact:'explicit_user_input_scenarios', llm:{configured,...}, autonomy:'local_foreground_process_only_not_verified_on_owner_computer'}.

## Projects and watched objects

POST /api/workspace/projects {title, objective, domain:'supply'|'procurement'|'service'|'energy'|'global'} → {project}.
POST /api/workspace/objects {project_id, type:'supplier'|'facility'|'commodity'|'route'|'service'|'energy_asset'|'topic', name, keywords:[string], identifiers:[{kind,value}], notes?, identity_basis:'user_declared'|'unknown'} → {object}.
No watch strings are sent to external providers. Maximum8keywords/20identifiers; strings are bounded and plain text. Name/identifiers are claims, not verified entity identity.
GET /api/workspace/leads?object_id=ID → {object, leads:[existing global item/version projections + matched_terms + association_status:'unconfirmed'], matching_mode:'lexical_explicit_terms', semantic:false, limitations}. At most20saved candidates; source/version/hash/origin visible. No matches stays empty. Matching is a lead, not established relation.

## Investigations/issue inbox

POST /api/workspace/cases {project_id, object_id?, title, question, priority:'low'|'medium'|'high', version_id?} → {case}. Optional initial version creates possible/unconfirmed evidence, never confirmed relation.
GET /api/workspace/cases?id=ID → {case,project,object,evidence,reviews,actions,impact_scenarios}.
PATCH /api/workspace/cases {id,status:'draft'|'investigating'|'review_ready'|'closed',priority?,review_note?} → {case}.
POST /api/workspace/evidence {case_id,version_id,association_status:'possible'|'confirmed_by_user'|'rejected',association_note} → {evidence}.
PATCH /api/workspace/evidence {id,association_status,association_note} → {evidence}.
Every evidence row contains snapshot: the exact immutable global version metadata, collection receipt/content hash, origin/verification and rule records as observed when attached. Review edits alter association fields only; they do not replace the source snapshot. Uploaded provenance stays uploaded/unverified. No external article scraping is invoked.
POST /api/workspace/reviews {case_id,conclusion:'needs_information'|'possible_impact'|'no_supported_impact'|'action_required',note} → {review}. The reviewer authored the conclusion. Review history is append-only.

## Explicit first business scenario

POST /api/workspace/impact {case_id,kind:'supply_coverage',input_basis:'hypothetical'|'user_supplied_unverified',sku_or_item,unit,stock_units,daily_use_units,days_until_delivery,delay_assumption_days,assumption_note} → {impact_scenario}.
All numbers finite, nonnegative; daily_use_units>0. coverage_days=stock_units/daily_use_units. baseline_gap_days=max(days_until_delivery−coverage_days,0). assumed_gap_days=max(days_until_delivery+delay_assumption_days−coverage_days,0). assumed_shortfall_units=assumed_gap_days×daily_use_units. Event evidence does not infer the delay. Supply domain only; other domains show their input boundary and retain existing source-backed analysis. No automatic use of historical business data. Output labels assumptions, calculation and evidence snapshot; it is not a prediction or confirmed loss.

## Actions/assistant

POST /api/workspace/actions {case_id,title,owner?,due_at?,notes?,status:'open'|'in_progress'|'done'|'dismissed'} → {action}.
PATCH /api/workspace/actions {id,status,owner?,due_at?,notes?} → {action}.
Actions freeze attached evidence/version/hash and current scenario/review references at creation. They never auto-execute tools or send messages. Original operational /api/actions remains independent.
POST /api/workspace/assist {case_id,question} →409 when LLMunconfigured. Any later configured provider interface must use only selected frozen evidence as untrusted context, expose exact citations and require reviewer validation. No generated conclusion is displayed without a real call.

## Frontend boundary

GUIworker returns additive static/preparation.js and static/preparation.css outside the Site checkout. Accepted export: createPreparationWorkspace({request,esc,safeURL,time,toast,isCurrent,getHost}) → {render,bind,load,dispose}. Core adds #prepare/native navigation, delegates refresh/load and disposes pending state on navigation. The factory may maintain its own bounded view state (overview/project/object/case), without private localStorage persistence or external requests. All controls map to the APIs above. Existing global/status and saved items can show source-only real evidence when watch setup is empty. No seeded watched company or hypothetical case is presented as real.
