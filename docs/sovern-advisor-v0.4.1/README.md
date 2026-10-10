# Final lifetime usability checkpoint

After successful hosted explanations and a confirmed no-charge duplicate replay, the owner authorized using the existing free credits within the same conservative RM5 app estimate. The final app ceiling is 100 distinct attempts, using one shared constant in public configuration, precheck and atomic SQL admission. The stricter RM5 derived-spend-plus-RM0.50-reservation guard still applies on every attempt, as do two-per-minute admission, one unresolved reservation, unknown/overrun halt, no automatic retry and deduplication. No provider hard cap is claimed.

This raises a count ceiling only; it does not reset the budget, rewrite paid results or alter applied migration 0010. The existing singleton base_request_count remains zero and its prior/base expense remains RM0.00300605; live effective totals derive from request rows. Its historical CHECK on the base count is unchanged. Known low-cost replies can use more than nine attempts; higher costs reach the same RM5 guard earlier. Mock tests cover both the 100-attempt ceiling and a high-cost sequence that stops after 15 admissions because another RM0.50 reserve would cross the cap. No actual provider request was made by the integrator.

Earlier checkpoint notes below are dated history; their nine-attempt limit is superseded by this final count-only change.

# Structured citation compatibility checkpoint

The release owner’s next controlled response was withheld with citation_mismatch. Current validation requires authoritative, nonempty citation_ids; it no longer requires those IDs to be repeated in brackets. The UI renders the validated source list itself. Optional inline groups such as [ID1, ID2] are tokenized and checked against the same authoritative allowlist, then included in the rendered source list. Unknown structured or inline IDs still reject the explanation. No source is invented or fetched from model text.

Citation rejection carries only bounded counts and booleans: citation list count, inline group/ID count, unknown-ID flags, grouped-reference flag and missing-inline flag. No raw citation strings, provider content, reasoning or secret is exposed. All existing numeric, probability, positive-company, scope, size and accounting safeguards remain. This fixes presentation compatibility; it does not establish semantic truth or independently verify a generated answer.

# Explanation-level citation checkpoint

The release owner’s second controlled hosted request exposed a sentence_citation_missing rejection. The per-sentence punctuation splitter was an unnecessarily strict presentation requirement and could reject a valid cited explanation because of decimals, dotted organization names, or uncited generic review/disclaimer language. Current validation requires a nonempty, allowlisted citation_ids list and matching valid inline references at the explanation level. It does not claim each sentence is independently verified. Generic uncertainty and human-review disclaimers need no extra source marker.

Unknown source IDs, unsupported numbers, numerical probabilities, positive actual-company claims, private identifiers, URLs/HTML and missing-input omissions remain guarded. The live label still states that output is not independently verified, with deterministic facts authoritative. The prompt reflects this explanation-level citation contract; its fingerprint changes with the prompt. Stored results, request keys and lifetime ledger are preserved, with no automatic call or retry.

# Output validation diagnostic checkpoint

The release owner’s first hosted request returned a known-accounted rule fallback. Its stored result contains no raw provider output, so the exact original validation failure cannot be reconstructed from that result. Review found a reproducible validator defect: the positive-claim pattern also rejected explicit negative disclaimers such as “No actual company outcome is established.” The patch masks only bounded negative disclaimers before checking positive claims; unsupported positive claims elsewhere remain rejected.

The parser accepts strict JSON, an existing message.content string, or one complete JSON code fence around strict JSON. It does not extract JSON from arbitrary prose or coerce free-form output. Output rejection now persists and shows only an allowlisted validation_failure enum (for example finish_length, json_parse, message_shape, citation_mismatch or guardphrase). Raw provider text, reasoning, errors and credentials are never included in this diagnostic. Live explanations remain explicitly unverified and subordinate to deterministic facts.

Lifetime accounting, applied migration 0010, fingerprint/version, stored paid results and no-retry rules are unchanged. Repeating the already-paid Explain intent returns its cached result; a release owner can explicitly check a different intent, such as Compare the options, within the same lifetime budget. The integrator made no actual provider calls.

# Native migration repair checkpoint

The first integrated v66 publish failed with `incomplete input: SQLITE_ERROR`. The release owner inspected hosted D1 and confirmed neither new Advisor table existed, so migration 0010 was unapplied. The repair regenerates that same unapplied migration and its Drizzle metadata as ordinary CREATE TABLE/INDEX statements only. No applied migration, existing table or prior record is changed. A regression executes the new file through both statement-breakpoint and simple semicolon splitting. The proprietary deployment parser was not available for direct inspection; its compound-trigger incompatibility is inferred from the failed deployment and eliminated by this repair.

Current concurrency control is trigger-free: request rows form the lifetime ledger. One atomic `INSERT ... SELECT ... WHERE ... ON CONFLICT DO NOTHING` checks the singleton initial/base expense plus SUM of booked request charges, base count plus COUNT of attempts, nine-attempt ceiling, RM0.50 reservation, two-per-minute admission and absence of reserved/unknown/overrun rows. A zero-row or failed insertion never calls the provider. Reconciliation is a single UPDATE guarded by request ID, unique attempt token, reserved state and full reservation. Row CHECK constraints permit a reduced charge only with an exact observed cost in complete/failed state. An unresolved, unknown or overrun row blocks future admissions. No mutable aggregate or compound trigger is required.

The singleton's `booked_nanomyr` and `request_count` now represent initial/base accounting, not live totals. Effective app totals are base plus request-ledger SUM/COUNT; stop state includes any reserved/unknown/billing_overrun row. The application has no ledger deletion/reset route. Manual administrator SQL is outside the app's budget enforcement and must not be used to reset the lifetime limit.

The owner-approved estimate and its limitations are unchanged. All current verification uses mock transports and local SQLite; no real provider call was made by the integrator. The historical upstream trigger implementation below is retained for provenance and is not the mounted implementation.

# Integrated Advisor add-on checkpoint

This copy accompanies the existing Dormathon v0.4.1 application. The canonical route is POST `/api/mrdiy/advisor`; GET `/api/mrdiy/advisor/config` exposes non-secret activation metadata only. The additive migration is `drizzle/0010_sovern_advisor_budget.sql`, registered at journal index 10. Sites applies its schema-only DDL before the Worker; the runtime initializes the lifetime budget once without resetting prior use. Existing migrations and owner records remain unchanged.

The final upstream estimate-mode module SHA256 was `2d048ddf4f9a534d89686841b2bc02e0e50257d4f4e8d98f56f13e2ad35564d9`. The integrated source changes its requested `max_tokens` from 384 to 2048, as approved for reasoning plus a bounded English explanation. Tests assert that delta. The RM0.50 reservation, nine-attempt lifetime ceiling, prompt and billed-completion accounting bounds, no-retry policy, unknown-accounting halt and explicit estimate-only disclosure are unchanged. The retained upstream SHA256SUMS/test-results describe the original isolated artifact, not this integrated source delta.

The integrated UI requires an explicit button click for each intent; loading Advisor performs no provider request. Rule fallback and live-generated output are visibly distinguished. The exact authoritative case/snapshot and citations are shown; generated text cannot select or execute actions. No actual provider call or secret access was made by the integrator. Real hosted/provider verification belongs to the release owner after publication.

## Original portable adapter notes

# Dormathon bounded SovernStack Advisor adapter

Implementation artifact, not a deployment. No paid request was made by this package.
Only this directory was edited. The canonical Site source was read as a reference.

## Integration

- Copy `worker/sovern-advisor.js` into the canonical Worker's module list before `index.js`. All module-level symbols are prefixed (`sovern*` or `SOVERN_ADVISOR_LIMITS`) for the existing single-file packager.
- Add the tables and custom SQL triggers from `drizzle/sovern-advisor-budget.sql` as the next schema-only migration in the existing Site-owned D1 database. The SQL is DDL-only; a bounded runtime INSERT with ON CONFLICT DO NOTHING initializes the prior-test expense and never resets an existing row. Reflect these tables in the Drizzle schema and preserve the triggers; do not create a second DB or do runtime DDL. The lifetime budget namespace must never be reset/reseeded to bypass the authorized cap.
- Add POST `/api/mrdiy/advisor`, using existing same-origin/security and bounded JSON parsing, then call `sovernAdvisorAnswer(env, body, {service:new MrdiyDemoService(store)})`; return its status/body with the normal secure JSON response helper.
- Body: `case_id`, `assumptions` (existing six numeric parameter-register fields), `commitments` (exact canonical feasible action resource claims, at most one per case), `intent` (`explain_basis`, `compare_options`, `missing_inputs`), `idempotency_key` (16–100 ASCII alphanumeric/underscore/hyphen). Arbitrary question text, model, endpoint, org/source, budget, or prompt fields are rejected.
- Keep the same idempotency key on repeats. The server also deduplicates equivalent authoritative prompt/context fingerprints, even with a new key. A changed context with an old key is a 409 conflict. A reserved/unknown in-flight record is a 202 rules response; no new paid request is made.
- The module rebuilds `open` (or `inspect`), `analyze`, and `compare` on the server. It never accepts a client-supplied evidence/context bundle. Projection includes the shared org/case/snapshot/revision/assumption-set/as-of envelope, conditional metrics, feasible actions, binding constraints and missing inputs. Citations come only from that case's authoritative synthetic/hypothetical evidence and public context. Provider input contains IDs and source modes; no external URLs, operational free text, employee information, uploaded data or credentials.
- Render `mode === 'live_llm'` explicitly as a live generated explanation with the verification warning, alongside the authoritative rule facts. `mode === 'rules'` retains the plain rule-based Advisor and displays `reason` as an unavailable/error/budget notice. All actions remain human review, planned-only. A generated explanation never becomes a probability, policy decision, calculation oracle or saved operational action.
- Replace the stale public-demo footer `Private workspace` with `Shared demo workspace`; do not change the Site's audience.
- Never include this server module, environment values, or billing identifier in client assets.

## Owner-approved conservative estimate mode

The owner explicitly approved running within a conservative RM5 estimate while acknowledging that the provider has no verified RM5 hard cap. Required server settings are `SOVERNSTACK_ADVISOR_ENABLED=1`, the owner-entered server Secret `SOVERNSTACK_USER_ID`, and `SOVERNSTACK_BUDGET_MODE=conservative_estimate_v1`. No verified-billing flag is used or implied. Root owns the actual enablement configuration; this artifact makes no paid calls.

The identifier is used only in the fixed gateway's `x-user-id` header. Do not obtain, print, copy, save in this package, put in a browser form on the owner's behalf, or expose the actual identifier. Do not copy the test placeholder into production.

The official gateway pricing is RM0.008/10,000 input tokens and RM0.0315/10,000 output tokens. The parent's provider-documentation check found only “Max tokens to generate” for max_tokens (default 1024), without proving reasoning inclusion, billed-token maxima or provider spend-cap semantics. The public GPT-OSS-120B model context size is 131,072 tokens, but model context size is NOT proof of gateway billing enforcement. This mode proceeds on the owner's expressly accepted estimate, with clear disclosures and stop-on-unknown controls.

## Budget behavior and limitations

- Integer nanomyr accounting (one MYR = 1,000,000,000 units). Rates are 800 units/input token and 3,150 units/output token. Integer multiplication avoids floating-point cost undercount.
- Runtime DML initializes the singleton D1 row with the prior tests' estimated RM0.00300605. INSERT ON CONFLICT DO NOTHING never resets spend, count or blocked state, including after a restart. The migration contains schema DDL only.
- A single SQL insertion and triggers reserve RM0.50 before HTTP. Lifetime maximum: nine new app attempts even when observed usage releases reservation. New-call reservations total RM4.50; with the prior estimate the modeled envelope is RM4.50300605. Remaining headroom is not permission for another call or unrelated provider spending.
- Conservative accounting thresholds: ≤12,288 prompt tokens and ≤131,072 completion tokens, including reasoning if reported within completion. At posted rates that models RM0.42270720 per request (completion-only RM0.41287680), below the RM0.50 reservation. These thresholds do not prove actual provider billing limits.
- Two unique app reservations per rolling minute globally; only one unresolved reservation may exist at admission. Unknown state permanently blocks new calls; a pending reserved record also blocks distinct calls after failed reconciliation. No automatic paid retries, redirect following, cascades, recharge or GPU rental.
- Fixed endpoint and model; temperature zero, requested max_tokens 2048 in this integrated build, no streaming. Unrequested SSE is rejected without retry.
- 12-second request/body deadline, ≤64 KiB response, ≤8 KiB prompt. Timeouts, uncertain/malformed usage and additional accounting detail retain the complete reservation and stop future app calls.
- Only observed camel-case usage `{promptTokens,completionTokens,totalTokens}` with safe nonnegative integers and matching total is reconciled. Additional reasoning/detail fields are ambiguous and retain reservation. A visible completion can exceed requested max_tokens due to reasoning; reported values above the conservative threshold trigger stop.
- Wrong returned model or reported accounting-threshold violation retains reserve and blocks future app calls. This cannot undo an already-incurred charge.
- DB failure before verified reservation yields rules without a live call. DB failure after a call keeps the reserved record; neither the same fingerprint nor a distinct request can trigger a new paid call while that record remains unresolved.
- The app cannot cap owner/manual requests, other applications, provider bugs, unknown minimum charges/fees, unannounced pricing changes, hidden unreported reasoning, or provider enforcement failures. Actual provider spending may exceed the estimate. No unconditional RM5 provider cap is claimed.

## Explanation safeguards

The model only explains server-recomputed facts. Output must be bounded JSON with ≤120-word English explanation, allowed citations in every sentence, uncertainty/conditional language and a human-review next step. Unknown-input cases must acknowledge missing/unknown data. Strong certainty, invented numbers, numerical probabilities, URLs/HTML, unsupported references, obvious secret echo and high-entropy identifiers trigger rule fallback. These syntactic checks do not constitute a semantic truth verifier: a surviving live explanation still requires review and never supersedes deterministic evidence.

## Verification

Run `node --check worker/sovern-advisor.js` and `npm test` in this directory (Node 24).
The tests use mock transports only and an actual local SQLite schema/trigger implementation. No production D1, billing call, Site deploy, or UI-browser QA was performed.

70 tests pass: explicit estimate-mode activation; schema-only migration; runtime initialization/restart/double-init; all 40 authoritative fixture projections; endpoint/model/secret boundaries; prompt injection/unauthorized overrides; exact canonical synthetic claims; idempotency and fingerprint deduplication; concurrent calls and global rate/budget admission; lifetime ceiling; timeout/HTTP/network/redirect/SSE/malformed/large-response failure; ambiguous/missing/reasoning accounting; model/accounting-threshold violations; unknown-accounting stop; pending-reservation stop; output citation/unknown/refusal guards; SQL reconciliation/delete guards; and DB failure fallback.

Test-only service import currently points to the read-only canonical source at `/workspace/scratch/c0aa03d4c335/dormathon-site-source/worker/mrdiy-service.js`. When importing tests into the canonical checkout, change it to `../worker/mrdiy-service.js`. Do not copy the test placeholder identifier into production settings. Existing Site aggregate regression and browser checks remain the integration engineer's responsibility.
