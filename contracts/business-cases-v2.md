# Business-case entry and bounded review v2

Approved owner feedback 9 October 2026: business cases replace manual evidence bookmarking as the primary activity. Organization profiles remain context. Existing projects, profile revisions, legacy investigations, evidence associations, actions and immutable source records are preserved; there is no destructive migration.

## Four primary case types

`supply`, `procurement`, `service`, and `energy` correspond to the four approved operational problem tracks. Weather, price, policy and calendar are optional evidence factors, not case types or verified risks.

POST `/api/workspace/business-cases` accepts project_id, creation_key, case_type, title, counterparties (at most 8), locations (at most 8), route, window_start/window_end/deadline (real ISO calendar dates), amount/currency, notes, operations, and optional drivers. Context must exist in the same Site-owned private database. A stable case ID is derived from project ID and creation key; exact retry is idempotent, changed input under an existing key returns 409.

Inputs are frozen in an append-only `business_case_inputs` review. Automatic retained-source queries use up to 8 explicit case location/counterparty/route/factor terms, independently rather than requiring an organization-name match. Candidates preserve exact version/hash/item IDs, metadata, acquired clocks, input-match rationale and explicit time-match status. Retrieval is lexical, not semantic identity resolution. At most 40 unique version candidates are frozen in `automatic_case_evidence`; hit limits remain visible. No manually saved workspace_evidence row is required or created. Source or organization records are not changed.

GET `/api/workspace/business-cases?id=…&project_id=…` checks the case belongs to the selected organization and returns inputs, frozen automatic evidence review, comparisons and human reviews. Legacy investigations retain their original route and contract.

## Bounded comparison

POST `/api/workspace/business-compare` accepts case_id/project_id, action_name, assumption_note, nonnegative change and cost. It appends a deterministic comparison with frozen case input and source version/hash references. The current operating assumption and one explicitly changed lever are compared:

- Supply: stock / daily use gives coverage; earlier delivery changes uncovered demand.
- Procurement: additional assumed payment changes outstanding amount. No overdue/nonpayment claim is inferred.
- Service: additional qualified capacity changes uncovered work hours. No completion or formal SLA breach is inferred.
- Resource waste: smaller food batch changes potential unsold quantity at expiry, under constant demand/shelf-life assumptions. This does not estimate energy use.

Missing input yields `insufficient_operating_inputs`. Every result identifies user-entered assumptions, additional action cost, deterministic arithmetic, trained_rl=false and automatic_execution=false. Feasibility, route exposure, counterparty capability and causal impact remain to be verified. LLM configuration is unchanged and no generated advisor answer is fabricated.

## Source interpretation and interaction

Weather records with equal summaries but different validity dates remain separate observations. The frontend groups them by source/location series with expandable dated rows; repeated exact version IDs alone are deduplicated in presentation. The default row prefers a date inside the case window and then current acquisition/version clocks. Revision history remains selectable through GET `/api/global/source-history?version_id=…`; no source versions are rewritten.

A source sheet renders retained structured facts as a readable table. Live JSON provider URLs are labeled `Raw API data (live provider endpoint)` and distinguished from the captured record; real PDF links are labeled `Open source PDF`. No original PDF or full source document is invented. Manual browsing selects a chip/filter state and applies it only on explicit Search. Clicking chips does not query.

The four rooms and existing query/history/state APIs remain. The v46 navigation boundary stays `button[data-view]`; BODY[data-view] never receives navigation listeners. Case and organization editors retain input/caret state and have explicit Cancel/Back paths.
