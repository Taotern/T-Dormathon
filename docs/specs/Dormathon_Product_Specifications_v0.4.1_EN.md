# Dormathon Product Specifications

Implementation specification v0.4.1 · English · 10 October 2026

For the product owner and Taotern team. The product owner approved this implementation specification on 10 October 2026. Its requirements, contracts, delivery stages and acceptance criteria govern development. The Chinese edition has matching identifiers. MR D.I.Y. is the approved demo subject; application development, repository changes and deployment are authorized within this approved specification.

## S01 Product scope and changes

Dormathon helps operations, procurement and finance, service-process, and resource-management leads identify costly problems early and choose feasible responses. The product retains four business directions and their end-to-end workflows. Each decision combines operational records, counterparty capability and history, actual dependencies and exposure, and relevant external conditions.

The implementation retains four end-to-end workflows and one empirical forecasting study. All operational demonstrations centre on MR D.I.Y. Group (M) Berhad’s Malaysia business: a regional lead coordinates replenishment, procurement approval, service and energy-continuity exceptions alongside existing systems. Internal company records are synthetic. A separate external retail benchmark supplies measured forecasting evidence within its own scope; it does not validate MR D.I.Y. performance. FR02–FR04 remain functional decision workflows, not three additional validated predictive models.

### Official Track 1 requirements

The supplied official slides identify Track 1 as the Predictive Model Track. A solution should detect or forecast meaningful events, categorize the issue, prioritize by business impact, and explain decisions in understandable, actionable terms. Strong solutions identify a specific real-world problem and beneficiary, handle noisy or unfamiliar data, minimize false alarms, and demonstrate measurable impact under realistic assumptions. [O1–O3]

The central judging question is: “Does your model help someone make a better decision, and can you prove it?” [O2] Detection can be forecasting, failure prediction or anomaly detection; a binary classifier is not mandatory. The application examples are suggestions, not six required modules. The supplied slides contain no scoring weights, submission deadline, required dataset, or RL requirement. Those details must not be invented.

### Delta from versions 0.3.1 and 0.4

- Official slide requirements replace the previous statement that detailed Track 1 requirements are unknown. Product breadth is preserved and empirical proof is bounded to the defined study.
- FR07 entity resolution, FR08 historical state, FR09 environment–action–outcome records, and FR10–FR13 decisions remain. FR12 becomes a policy and scenario service with optional RL, rather than a dependency on an unavailable teammate.
- New AC11 data readiness and AC12 predictive evaluation gates distinguish a runnable interface from a defensible model result. No improvement metric is guaranteed in advance.
- v0.4.1 applies the approved MR D.I.Y. demo subject to every operational view and the approved 40-case working set. It adds entity boundaries, shared keys and visible data modes; FR02 emphasizes supplier invoices and payment approvals, while FR04 becomes Energy Security and Operational Continuity at the owner’s request. Cost and waste are subordinate objectives, not the primary direction.
- Factual, synthetic, simulated and unsupported capabilities remain separate. English is the default language; Chinese and Malay are optional.

### Present evidence boundary

The reported v63 baseline contains 14 fictional business cases, distributed 4/4/4/2 across FR01–FR04, one authored risk per category, ten sourced historical replays, and a deterministic action calculator. These are useful functional and explanation assets, not evidence of a trained forecast or RL policy. Earlier coverage documents describe lexical FTS5/BM25 retrieval and incomplete entity/time/policy integrations. Counts and live capability must be rechecked against the delivery snapshot; dated corpus totals are not current global coverage claims. [P1–P3]

## S02 Four business workflows

### MR D.I.Y. organization and operating boundary

The demo organization is MR D.I.Y. Group (M) Berhad’s Malaysia hardware and household retail operations. Official group reporting also covers Brunei; group figures must retain that scope. The wider global brand network and independently reported Indonesian business are not this entity. MR. DOLLAR, MR. TOY and mixed-format operations need explicit brand/scope tags before inclusion. No partnership, customer relationship or endorsement is implied.

Dormathon shall connect exceptions across existing forecasting, ERP/WMS, automated warehousing, procurement, fleet/route management and customer-service processes. It shall not present those established capabilities as missing from MR D.I.Y. Source-backed context is summarized in S11; no access to the company’s internal systems is implied. [MD1; MD2]

Public disclosures provide business context, not SKU/order/ETA, invoice-exception, power-interruption or meter-level ground truth. The operational scenario shall explicitly supply its own synthetic inputs and assumptions, without alleging real failures.

### Ownership dictionary and data modes

- Entity: ent_mrdiy_group_m_berhad is the real public reference. org_mrdiy_my_demo is a synthetic workspace scoped to Malaysia hardware/household operations; it is not an actual subsidiary or internal system identifier.
- Objects: DEMO_DC01–02, DEMO_ST01–08 and DEMO_SKU01–24 identify two hypothetical distribution clusters, eight stores and 24 storage/cleaning/stationery/household items. DEMO_PO, DEMO_GR, DEMO_INV, DEMO_SHIP and DEMO_TASK prefixes identify linked orders, receipts, invoices, shipments and tasks with unique suffixes. Locations, volumes and routes are assumptions, not real premises or incidents.
- Counterparties: DEMO_SUP01–06 and DEMO_CAR01–03 are fictional supplier/carrier roles, not owned group entities. Keep origin, contracting entity, invoice currency and route legs separate. Operations, procurement, finance, service and facilities/energy continuity are role resources, not named employees.
- Links: org_id, brand_scope, store_id, sku_id, po_id, receipt_id, invoice_id, shipment_id and task_id carry cross-view dependencies. Strategy and Advisor use the same snapshot. Preserve existing case_id values through an explicit revision crosswalk; do not create disconnected company-name copies.
- Display: scenarioDataMode is always visible in cases, risk cards, comparisons, Advisor and exports. Use SYNTHETIC_INTERNAL for internal fixtures and SIMULATED_OUTCOME for policy results; public claims retain PUBLIC_DISCLOSURE and sourced events retain SOURCED_EXTERNAL. Hypothetical disruption is HYPOTHETICAL_EVENT. Mixed screens identify each component; no single “real data” badge may cover the whole scenario.
- Isolation: EXTERNAL_BENCHMARK has its own dataset/entity namespace and evaluation report. It does not populate MR D.I.Y. operational records, rankings or apparent company history.

### Forty linked functional cases

The working dataset shall contain 40 cases: FR01 16, FR02 10, FR03 8 and FR04 6. Preserve the original 14 case_id values through a documented migration and add 26 unique IDs. SC01–SC40 below are scenario references, not replacements for stable IDs. Every case shall open its evidence/state, calculate applicable analysis, compare feasible actions or explain missing inputs, and save/reopen a human decision. Cards without a functioning workflow do not count.

Cases share the two distribution clusters, eight stores, 24 SKUs, purchase/receipt/invoice/shipment/task records and one reconciled stock/budget/capacity snapshot. An event may affect several cases through explicit keys; amounts, stock and capacity cannot be copied as independent resources. All incidents, company targets and operational records are synthetic.

- SC01–SC16 / FR01: demand-driven replenishment; inbound-delay response; store transfer; receipt variance; low-stock buffer; order consolidation; supplier-capacity allocation; delivery-window conflict; storage-capacity limit; slow-stock redistribution; excess-stock order reduction; return-to-stock reconciliation; partial receipt; alternative-carrier comparison; normal replenishment; unknown lead time.
- SC17–SC26 / FR02: PO–receipt–invoice mismatch; approval/calendar timing; duplicate-invoice review; missing supplier documentation; partial receipt/payment hold; advance reconciliation; currency/term check; budget competition; normal matched invoice; unknown payment status.
- SC27–SC34 / FR03: availability enquiry tied to delayed stock; damaged-item return; receiving-task handoff; authorized reassignment; competing priority requests; paused/cancelled work; normal completed service; unknown deadline or qualification.
- SC35–SC40 / FR04: store power-interruption continuity; warehouse critical-load constraint; fleet-fuel allocation; backup-runtime shortfall; normal energy availability; unknown backup/exposure. Cost and waste remain secondary outcomes.

Each category shall include normal, pending/action-needed, risk and unknown/insufficient-data states. These are case states, not four independent models. Every risk records cause, source/assumption, severity, affected objects and bounded likelihood; numerical probability requires validated support, otherwise use qualitative or conditional likelihood. Risk counts shall follow the scenario, without an arbitrary four-risk cap.

Six deep demonstrations are SC01, SC02, SC17, SC18, SC27 and SC35: two supply, two procurement, one service and one energy case. They follow the same replenishment episode across shared keys, expose baseline/alternative consequences and hard constraints, and save/reopen decisions. The remaining 34 cases must still be inspectable and analyzable through the same complete workflow, including truthful insufficient-data paths.

### FR01 Supply inventory and fulfilment

The beneficiary is the inventory or fulfilment lead deciding which items need attention, when, and what feasible action to take. Inputs include SKU-level sales or demand observations, available and reserved stock, inbound orders, supplier/carrier capability, route legs, lead times, operating calendars and relevant conditions. Unknown inventory or lead times remain unknown in real-business views; a sandbox may use explicitly entered assumptions.

The workflow is evidence → affected item/order → supported forecast or scenario risk → constrained action comparison → saved human choice. Compare replenishment, transfer, buffers, expediting, alternative counterparties, routing, timing and mode only when their inputs support them. Enforce stock conservation, capacity, funds, contractual dates and safety. The MR D.I.Y. hero uses synthetic sales/stock and assumed transport disruption; the external benchmark uses observed sales as a demand proxy with an assumed inventory environment. Neither supplies actual MR D.I.Y. stockout or delivery truth. Acceptance: AC01, AC07, AC11, AC12.

### FR02 Procurement invoices and collections

The beneficiary is the procurement or finance lead resolving document and cash-flow blockages. The MR D.I.Y. demo emphasizes purchase-order, goods-receipt and supplier-invoice matching, approval, due dates and payment scheduling. Consumer collections remain in the broader product scope, not the default retail story. Trace actual payments/receipts when available, bank calendars and contract dependencies; distinguish not yet due, overdue, blocked, missing and unknown. An incomplete ledger cannot prove nonpayment.

Compare additional documentation, follow-up, processing order and legally feasible retiming under cash and staffing constraints. Show the baseline, consequences for linked orders, and unresolved evidence before saving a human decision. No payment or collection message is executed. Keep the complete workflow as a functional demonstration until suitable operational labels support a separate model study. Acceptance: AC02, AC05, AC09.

### FR03 Service and business process delays

The beneficiary is the service-process lead allocating qualified capacity. Inputs are requests, steps, dependencies, queues, promised or internal target times, pauses/cancellations, staff authorization, availability, shifts/rest, provider history and applicable calendars or access conditions. Compare FIFO/current scheduling with qualified reassignment, sequencing, escalation and capacity changes.

Show bottlenecks, waiting, resource conflicts and effects on other tasks; retain evidence and the chosen action. Distinguish formal SLA breaches from internal target overruns. Unfinished work is censored rather than automatically failed; cancelled or paused work follows its own rules. This remains a complete functional workflow without an unsupported predictive-quality claim. Acceptance: AC03, AC08, AC10.

### FR04 Energy security and operational continuity

The beneficiary is the facilities or operations lead maintaining safe essential service under power interruption, poor power quality or fuel-supply constraints. Connect energy evidence to the specific facility, critical loads, backup capacity/runtime, fuel stock, affected stock/orders and time window. Distinguish power availability and quality from tariffs and cost: a price rise is not an outage. Existing solar or annual renewable shares do not establish backup autonomy.

Compare no change/current continuity rules with authorized backup allocation, load prioritization, rescheduling, stock/queue reallocation or transport alternatives. Enforce assumed power/fuel limits, duration, safety, qualified authorization and affected service commitments. Do not perform electrical switching or control equipment. Grid notices are evidence; probabilities require valid labels/models. Otherwise report conditional scenario risk. All six energy cases use synthetic facility loads, backup/fuel values and hypothetical disruptions; no actual MR D.I.Y. outage, generator or battery is asserted. Costs, emissions and waste remain secondary. No power-grid simulation is required. Acceptance: AC04, AC08, AC09.

## S03 Product experience and journeys

### FR06 Workbench and navigation

The main navigation is Home, Organization, Intelligence, Strategy and Advisor. Home is a very clean single search/LLM entry with concise risk status. Organization is the primary place to create or open a business case. Manual bookmarking and saving intelligence are outside this workflow; saving a human decision remains required. Every operational view remains bound to org_mrdiy_my_demo and its visible data modes. A case identifies its organization, problem category, business objects, beneficiary, decision horizon, data mode and current evidence status before analysis begins.

Organization holds active cases, the work queue, business context, linked objects, resources and constraints. Intelligence supports evidence inspection, coverage and historical context. Strategy compares actions from a frozen state. Advisor answers questions about that case with sources, assumptions and limits; it does not create undocumented probabilities or act externally.

The existing four information views remain available within the workbench: Basic Information; State and Metrics; Events and Changes; Explanations and Expectations. They classify information, not business problems. Filters, case_id, time context, pagination, draft edits and return focus survive navigation. Missing input or unsupported services give a recoverable path rather than an empty success state.

### J1 Main demonstration

1. Open SC01 and its linked SC02, SC17, SC18, SC27 and SC35 cases in the MR D.I.Y. cluster as the regional operations lead. Show synthetic internal-data and hypothetical-disruption badges, the FY2025 context period and scenario clock.
2. Follow a sourced external condition or hypothetical disruption through an explicitly assumed route/exposure to DEMO_SHIP01, stock and affected tasks. Without a supported mapping, abstain from company impact.
3. Inspect the scenario’s demand outlook, uncertainty and provenance. Separately open the evaluation report, if AC11/AC12 passed: its original dataset, years, untouched test period and baselines stay visible. External results are not MR D.I.Y. validation.
4. Rank linked replenishment pressure, invoice/approval blockage, service timing and resource constraints by declared cost, urgency and feasibility. Show the existing-system inputs the prototype would require.
5. Compare no change, a practical rule and candidate actions under identical synthetic stock, lead-time, budget and capacity assumptions. Vary transport delay or cost and expose changed recommendations and conflicts across all four workflows.
6. Save or reject the human-selected action. Reopen the exact sources, assumptions, model/policy versions and baseline. Include an insufficient-input case and a rejected infeasible action.

### J2 J3 and J4 Retained demonstration paths

J2 follows the same organization’s procurement–receipt–invoice–approval chain. J3 follows linked customer/store service and receiving tasks through timing/qualification constraints. J4 evaluates power or fuel continuity and its effects on the same stock, shipment and service tasks. Each path ends in a saved human choice. Synthetic provenance remains visible in every view, export and screenshot.

Cross-business effects require real keys or explicit fixture-declared links. A shared organization name, simultaneous news or a common country does not create a supply, payment or task dependency. Shared budgets cannot be spent twice across competing actions.

### Language visual and usability requirements

English must cover the complete UI, status/error text, analysis and demonstration. Optional Chinese/Malay cannot block delivery. Use restrained Xushi Deconstruction: black, white and gray, clear solid forms, precise structural lines, layered information and limited purposeful motion. Readability, evidence access, keyboard focus and responsive layouts take priority. Avoid slide-like navigation or a cinematic globe as the main task interface. Precomputed results are labelled; loading or unavailable states cannot masquerade as completed analysis.

## S04 Evidence and data readiness

### FR05 Evidence retrieval and coverage

Retain source, locator, version, license, publication/availability/acquisition times, units, quality and usage restrictions. Lexical retrieval is an acceptable working baseline. If retrieval-augmented generation or an LLM is added, each substantive factual claim must resolve to evidence; generated text must not supply missing labels, probability, exposure or causal effect.

Publish actual coverage by entity type, geography, domain, information type, time range and source quality. Show acquired, verified, partial and missing coverage separately. The long-term intelligence target retains countries, political organizations, major companies, SME trends and unicorns across relevant legal, economic, market and operating domains. The 2020-to-present goal and preferred extension toward 1990 remain goals, not blanket claims of complete history. The competition needs a frozen relevant subset, not a new global collection exercise.

### External forecasting benchmark and coverage

Use UCI Online Retail II as the primary external forecasting benchmark, subject to the mandatory AC11 acquisition and feasibility gate. It is not yet an accepted training asset. UCI describes UK online-retail sales from December 2009 to December 2011, with missing values, under CC BY 4.0; DOI 10.24432/C5CG6D. [DS1] It does not establish latent demand, inventory, suppliers, delivery outcomes, replenishment lead times or operating costs.

This specification adopts a historical exception to the 2020-to-present collection goal solely for that external study. Its original identity and years remain visible; it must never be renamed MR D.I.Y. or inserted into company operational records. Modern news cannot become a historical feature or cause of those sales. Downloadability, parsing and viable series remain to be verified in D1. MR D.I.Y. evidence covers public FY2025 context and separately dated disclosures, not complete internal history.

### AC11 Data readiness gate

Before training, produce a dated data card and runnable profiling report:

- Verify permitted use, attribution, download, file hash, schema, coverage dates, units/timezone and stable item/business keys. Avoid customer-level personal analysis when item aggregation is enough.
- Separate valid positive sales, cancellations/returns, non-product records, duplicates, missing fields and invalid prices/quantities with counts and reasons. Freeze handling rules; do not silently drop inconvenient periods or outliers.
- Verify the S06 daily-series eligibility, observation gaps and discontinuation rules. A missing row becomes zero only when observation completeness justifies it. Sales are demand-censored where stockouts could hide unmet demand.
- Record observation and label availability, late updates and right-censoring. Specify the eligible entity population, minimum history, horizon and split dates before looking at the final test set.
- Declare unavailable stock, lead-time and cost fields. Review the assumption approach and plausible ranges; engineers document values before test freeze within that scope. The register records parameter, unit, range, basis, owner role, scenario version and sensitivity. Invented values never become recovered facts.
- Keep company-scenario and external-benchmark manifests separate. Synthetic generation seeds and rules support repeatability, not empirical MR D.I.Y. validation. Actual company claims require appropriate operational ground truth.

AC11 passes only when the artefacts support the defined target and reproducible holdout. If it fails, mark the empirical path blocked and keep the functional demo truthful. Do not silently substitute a new target/dataset or fill missing real labels with synthetic truth. Any material replacement requires specification change approval.

## S05 Entities historical state and outcomes

### FR07 Entity resolution and relationships

Use stable entity_id values, time-valid names, aliases, external identifiers and jurisdictions for companies, governments, political parties and international organizations. Return candidates and evidence; abstain from an automatic merge when ambiguity remains. Test identical names, cross-language names, renaming, parent/subsidiary entities, government terms, mergers, splits and succession against a simple string-matching baseline.

Relations retain type, direction, validity, provenance and conflict status. Co-occurrence, ownership, supply and route exposure are distinct. Business objects, routes, nodes and role resources require stable identifiers; a news article cannot generate a business key. Corrections, merges and splits remain auditable. Unsupported resolution ports continue to report unsupported until independently tested.

### FR08 As of state reconstruction and replay

Store event time, impact interval, publication time, verified public availability, acquisition time, effective interval and revision time separately, preserving precision and timezone. Queries specify knowledge_as_of, world_time and knowledge_mode. public_known requires historical availability evidence; system_known uses actual acquired_at. An old document acquired today does not mean the system possessed it years ago.

When only publication date is known, label availability_proxy and exclude it from strict historical evaluation or report it separately. Select only versions available at the knowledge cutoff and valid for the requested world time. Later revisions, withdrawals, outcomes and future observations cannot enter historical features. Test late publication, late arrival, corrections, timezones and overlapping validity intervals.

For the retail benchmark, use a separately labelled retrospective transaction-time evaluation assumption unless real historical ingestion availability is established. Do not call that system_known replay. Reconstructed business state and a sourced historical story are different outputs; the ten existing replays do not by themselves validate automated reconstruction.

### FR09 Environment action and outcome records

Retain environment references, actor, action, business scope, multiple clocks, evidence and outcome status. Actions distinguish announced, implemented, reversed and unknown. Outcomes distinguish observed, estimated, proxy and unknown, with metric, unit, measurement window, observation end, revision and censoring. Simulated counterfactual outcomes use a separate explicit output type.

Missing outcome is not failure or success. Sales do not establish cash collection; unfinished tasks do not establish eventual breach; a price does not establish physical resource use. An outcome following an action does not identify the action's causal effect. Historical business, government and organizational action coverage remains a target that must be reported honestly rather than substituted with a handful of stories.

### FR16 Dependencies conditions and counterparties

Exposure connects a business object to a specific route leg, supplier, bank, role or resource and applicable time window, with mapping evidence. Conditions retain geographic/entity scope, applicability, effective period and observation/forecast/announcement status. Check weather, policy, holidays, festivals, bank calendars and operating practices against the actual business rule.

Counterparty history retains role, commitment, period, denominator, verification/dispute status and resolution. No recorded complaint is not proof of good performance. A national protest does not establish a closed route, violence, theft or a shipment delay. Only conditions with a demonstrated or explicitly assumed link may affect the MR D.I.Y. cluster. Unrelated legacy stories stay outside its operational case set; no country-level news implies a store or shipment incident. Cultural context is limited to evidenced calendars and operating practices, never stereotypes about integrity or capability.

## S06 Predictive model and evaluation design

### FR10 Detection categorization prioritization and explanation

Each output states the target, affected object, data/model version, earliest usable information, forecast horizon, output type, uncertainty, evidence and missing inputs. Distinguish observed status, anomaly, prediction, scenario and recommendation. Categorization must explain the operational issue. Priority uses business impact, urgency, credibility and feasible intervention, with disclosed units and assumptions. When monetary impact is unsupported, show a transparent qualitative rank rather than invented currency values.

The empirical target is daily positive item sales, a demand proxy, forecast seven days ahead on the separate external dataset. Use only fully observed calendar days, excluding an incomplete trailing day rather than filling it with zero. Start with the last 28 eligible calendar days as test and the preceding 28 as validation, with at least 180 earlier calendar days for training. Eligibility requires at least 26 nonzero sales days in training; verify observation completeness before filling absent dates. Freeze exact dates and eligible IDs after profiling, without test-based selection. If this design is infeasible, AC11 fails. Apply the same documented engine to synthetic MR D.I.Y. sequences only to demonstrate mechanics, never transfer accuracy claims.

### AC12 Predictive evaluation gate

Freeze target, eligible population, feature availability, baselines, temporal cutoffs, metrics, threshold-selection procedure and decision assumptions before final testing. Use a weekly seasonal-naive baseline and a trailing 28-day moving-average baseline, with all inputs available at the forecast origin. Evaluate one compact supervised lag/calendar model with lag-safe features and a documented training process; advanced models are unnecessary if the baselines are better supported. Use no test-derived preprocessing, item selection, future totals or realized lead times as prior knowledge.

Use chronological train/validation/test separation and rolling-origin evaluation where feasible. Group duplicate invoices and linked observations so they cannot contaminate splits. For recurring-SKU forecasts, past history of the same item is legitimate; report this as known-item temporal generalization. Separately hold out item/entity groups to test unfamiliar cases, or explicitly state that cold-start performance is not established. With one retailer, do not claim cross-company validation.

Report sample sizes, eligible/excluded items and periods, and performance by volume/sparsity group. Use MAE plus MASE where the training-only scaling denominator is nonzero, or WAPE with its total-actual-volume denominator and zero-volume handling stated. Do not average percentage errors over undefined denominators. If quantile forecasts are produced, report pinball loss and interval coverage/width by horizon; do not invent confidence intervals for a point-only model.

Show paired differences against every selected baseline with uncertainty that respects time/item dependence, for example a declared block bootstrap. Report failure slices, sensitivity to excluded returns and realistic missing-data/noise tests. Never guarantee an improvement percentage. If the model is no better than the baseline, retain the better supported baseline and report the result.

### Alerts and proof of a better decision

False positives, false negatives, precision/recall and warning lead time require a defined event, its observation window, actual evaluable labels and an alert unit/deduplication rule. Tune thresholds only on validation data against an explicit cost or alert-budget assumption. Report counts, denominators, late/missed warnings and uncertainty on the untouched test set. Forecast error alone does not establish reduced false alarms.

When shortages are generated only by an inventory simulator, call these simulated event labels and simulated warning results. Measurable decision impact compares policies under identical declared conditions in S07. Forecast accuracy, simulated utility and observed causal business benefit are separate claims. AC12 can establish limited predictive validity; it cannot certify real savings without operational evaluation.

## S07 Decisions sandbox and human control

### FR11 Comparable feasible actions

Every comparison uses the same frozen state, horizon, objectives, costs, capacities, information cutoff and exogenous test path. Include no-action and a practical rule baseline; add simple planning when supported. Display feasibility before ranking, showing the binding constraint and what would make an infeasible action possible. Do not double-allocate stock, money, staff or equipment.

For inventory decisions, compare no replenishment, a fixed/reorder-point policy and forecast-informed replenishment. Declare initial/on-order stock, review cadence, order quantities, delivery timing, supplier capacity, budget, shortage treatment and stock conservation. State whether unmet demand is lost sales or backorder; the retail data cannot identify it. Return handling and terminal inventory valuation must be consistent across policies.

Costs are a scenario model: procurement, order setup, holding, shortage and optional expediting terms each need units, currency, time basis and plausible ranges. Sales price is not procurement cost or shortage penalty. Report service level, shortage units, stock held, order quantities and simulated total cost, exposing the component totals. Vary lead times and cost ratios; show where the preferred action changes. A simulation assumption is never an observed saving.

### FR12 Policy and scenario service with optional RL

FR12 retains a reusable sandbox and policy-comparison contract. The current deterministic calculator must be identified as arithmetic or rule-based scenario analysis. A credible baseline simulator is a valid first implementation. Real reinforcement learning is optional, requires a separate readiness decision, and is not an official Track 1 requirement.

An RL extension must define state, action, transition, reward, hard constraints, episode termination, action support, training method and model version. Explain which transitions are observed and which are assumed. Establish baseline simulator validity first; disclose distribution shift, reward proxies and counterfactual uncertainty. Unsupported offline actions or unidentifiable effects cannot be turned into confident policy gains. Feedback collection alone does not establish learning or self-improvement.

Felix is no longer a delivery dependency. The user and assistant own the remaining integration and temporary implementation. Existing teammate services can plug into the versioned contracts when available. Do not block the four functional workflows on an unready advanced policy model.

### FR13 Human choice and decision record

The user may inspect evidence, edit assumptions, compare alternatives, defer or reject advice, and save a chosen action. Freeze case and state references, input/evidence revisions, objective and constraint values, model/policy versions, baseline outputs, limitations and rationale. Record planned versus implemented action separately. Reopening must reproduce the saved basis even after source revisions.

The workflow ends at human choice and saved rationale. It does not autonomously place orders, transfer funds, send collection messages, execute trades, publish policies or contact counterparties. Advisor suggestions follow the same boundary. A future real action requires its own authorization and integration.

### Cross direction interpretation

Expediting may increase cash tied up; delaying invoice work may affect supply; staff reassignment may move delay to another queue; larger batches may increase write-offs. These mechanisms require actual keys and constraints or an explicit linked fixture. Unrelated public datasets must not impersonate one organization's integrated operations.

## S08 Contracts portability and safety

### Four modules and a shared envelope

M1 Intelligence supplies Evidence, Claim and coverage through query_evidence. M2 Entities supplies Entity, Relation and ambiguity through resolve_entities and fuse_relations. M3 Time supplies WorldState, EAORecord and replay through reconstruct_state and replay. M4 Decisions supplies forecasts where applicable, ScenarioRun and PolicyComparison through versioned forecast and compare_policies interfaces. These are contract targets, not assertions that live services exist.

Every response retains org_id, brand_scope, scenarioDataMode, provenance_refs, assumption_set_id, schema_version, request_id, input_refs, knowledge_as_of, world_time, knowledge_mode, data_revision, status and warnings. Status is ok, partial, insufficient_data or unsupported. References resolve to immutable versions. Preserve units, currency, timezone and observation windows; unknown is null with a reason, not a fabricated default.

ForecastRun adds target_definition, entity/item set, horizon, training cutoff, feature-availability policy, split/configuration hashes, model/baseline versions, prediction type and metrics. ScenarioRun references that forecast and separately records assumed inventory/cost/transition parameters. Energy cases additionally require facility_id, energy_type, critical_load_kw, backup_capacity_kwh or rated_power_kw, usable_fuel_quantity and unit, estimated_runtime_hours, disruption_window, qualified_role and linked_order_ids, linked_task_ids; unknowns remain null. Runtime is calculated from declared load/efficiency assumptions, not inferred from solar capacity. PolicyComparison keeps baseline/run references, constraint checks, component outcomes, uncertainty and scope. Existing Evidence, Entity, Route/RouteLeg, Exposure, OperationalCondition, CounterpartyHistory and EAORecord preserve the semantics in S04–S05.

### FR15 Reproducible and portable delivery

Deliver bounded scripts or modules for data profiling, feature generation, training, backtesting and scenario evaluation, with pinned dependencies, configuration, seeds and a small runnable example. Keep full data outside code when rights or size require it; document download, checksum and preparation. Retain run manifests, input/split hashes, model artefacts and machine-readable results. State nondeterministic tolerances and measured resource needs.

The frontend consumes versioned outputs and reports whether they are live, precomputed or unavailable. A missing advanced service leaves evidence, saved cases and safe baselines accessible. Avoid building an unrelated large platform for the hackathon. Local tests, browser acceptance, deployment status and model validation are distinct checks.

### FR14 Data rights privacy and security

Use only permitted sources and the minimum necessary data; retain attribution, license and restrictions. Public/shared demonstrations use fictional, safely aggregated or otherwise approved non-sensitive data. Do not add private customer, employee or operational records to a shared demo without appropriate isolation and authorization. Keep credentials out of fixtures, prompts, exports and logs. Access, export, retention and deletion of private records follow the approved scope.

Treat retrieved material as evidence rather than instructions. Source content cannot initiate tool actions, alter access or override product safeguards. Make all externally visible claims and exports preserve data mode, source, assumptions and limitations.

### FR17 Role constraints and sensitive field boundaries

Represent lawfully supplied job qualifications, authorization, availability, shifts/rest and necessary task restrictions. Enforce capacity, required review and qualification validity at the relevant time. Missing evidence means uncertainty, not automatic disqualification. Work incidents distinguish allegation, investigation and verified findings with source and resolution.

Do not infer personality, mental state, dangerousness or private reliability from family, friends, social media, health or other sensitive personal information. Do not create employee blacklists or automated hiring, firing or promotion decisions. Qualified professionals handle medical fitness; the optimizer receives only necessary operational availability/restrictions without diagnoses or private reasons. These controls are not a claim of worldwide legal certification.

## S09 Acceptance register

The criteria below are mandatory implementation requirements. “Pass” requires a dated report and reproducible evidence for the frozen scope. A functioning screen, source citation or synthetic fixture cannot substitute for predictive validity. Integrity failures block the associated claim; an inconclusive empirical result remains inconclusive.

### AC01 Supply inventory and fulfilment

Open the complete FR01 chain and compare feasible baseline/candidate actions. Verify inventory conservation, arrivals, capacity and funds. Record forecast metrics where evaluated; label stockouts, service and cost as observed or simulated. No sales-only dataset may be presented as actual stockout or delivery ground truth.

### AC02 Procurement and collections

Trace purchase order, receipt, invoice, approval and payment evidence. Check due-date/bank-calendar rules; distinguish missing, blocked and overdue. Compare due-date/current-rule processing with candidate actions. An incomplete ledger must return unknown payment status.

### AC03 Service processes

Recompute deadlines, pauses, waiting and resource conflicts. Compare FIFO/current scheduling with feasible alternatives. Formal SLA and internal targets remain distinct. Cancellation and right-censoring do not become failure labels; unqualified assignments are rejected.

### AC04 Energy security and continuity

Complete all six energy-continuity fixtures, with SC35 as the deep demonstration: evidence/assumption → facility/critical load → affected order/service → constrained action → saved decision. Test missing backup data, insufficient fuel/runtime, an attractive but unsafe option and an unrelated grid notice. Unknown availability cannot become a probability or guaranteed service. Recompute power/energy/fuel units and cross-workflow capacity; label all simulated impacts. Tariffs alone cannot trigger an outage finding.

### AC05 Evidence and outcome integrity

Every material factual claim resolves to its source and version; unsupported facts are rejected. Labels contain type, unit, window and observation status. Show missingness, conflict and censoring. Test that post-event association is not emitted as causal impact.

### AC06 Entity and temporal integrity

Run blind entity cases and report incorrect merges, precision/recall, abstention and coverage against the simple baseline. Temporal adversarial tests must have zero future leakage, including late arrival, revisions and timezone boundaries. Unsupported services are visibly unsupported.

### AC07 Warning and decision effectiveness

Use frozen holdouts and unchanged constraints for baseline comparisons. Report FP/FN and lead time only with eligible event labels; include alert counts and uncertainty. Report policy utility, sensitivity and all hard-constraint checks. Zero hard-constraint violations is mandatory. A gain claim requires support from the declared evaluation; no non-inferiority or improvement is assumed.

### AC08 Integrated usable workflows

Retain all four paths and 40 functioning cases in the 16/10/8/6 distribution, including the six deep demonstrations in S02. Preserve the original 14 IDs and add 26 new IDs; verify normal, action-needed, risk and unknown cases in every category. Verify one organization, stable-ID crosswalk, shared business keys, visible modes and consistent Strategy/Advisor state; no external-benchmark row appears as a company transaction. Check create/open, back, drafts, pagination, focus and recoverable errors on desktop/narrow screens. Measure p50/p95 in a fixed environment; ordinary-view p95 shall be at most 3 seconds for the frozen fixture and recorded test environment. Long tasks show progress.

### AC09 Exposure conditions and history

Test route-leg/time applicability, business/bank calendars, policy effective dates, counterparty role/status/denominator and unknowns. Reject unsupported propagation from country events and stereotypes. Preserve distinctions between protest, closure, violence, theft and delay.

### AC10 Role and privacy boundaries

Reject prohibited sensitive fields and unsafe/unqualified actions. Enforce rest, authorization and review requirements. Confirm safe demo data and appropriate access separation. An allegation cannot trigger an employment decision.

### AC11 Data readiness and AC12 Predictive evaluation

AC11 passes only with the complete S04 data card, profiling, target feasibility and rights/availability evidence. AC12 passes only with the S06 frozen evaluation, baseline results, leakage checks and honest limitations. Neither gate passes by promising future data or substituting authored examples. Record pass, fail, partial or not evaluated per criterion.

## S10 Official traceability and demonstration evidence

The mapping below is an implementation traceability checklist, not an official weighting scheme. Demo steps refer to J1 in S03, with the retained J2–J4 paths for product breadth.

| Official expectation | Requirements | Acceptance | Evidence in demonstration |
| --- | --- | --- | --- |
| Detect meaningful future values failures or unusual patterns | FR01 FR10 FR15 | AC01 AC11 AC12 | J1 step 3: separate evaluation report, target, test period and baselines; disclose any missing proof |
| Categorize the issue | FR01–FR04 FR10 | AC01–AC04 AC08 | J1 step 4 and J2–J4: named business issue and affected object |
| Prioritize by cost operational risk or urgency | FR10 FR11 | AC07 AC09 | J1 steps 4–5: disclosed ranking factors and feasible intervention |
| Explain understandable actionable decisions | FR05 FR11 FR13 | AC05 AC08 | J1 steps 5–6: sources, assumptions, alternatives and saved choice |
| Specific problem and beneficiary | FR01–FR04 FR06 | AC08 AC11 | J1 step 1: regional operations lead; linked finance, service and facilities roles |
| Robustness to noise or unfamiliar data | FR07 FR08 FR10 FR15 | AC06 AC12 | Missing-data tests, volume/sparsity slices and entity holdout limits |
| Minimize false alarms | FR10 FR11 | AC07 AC12 | Validation-set threshold rationale; eligible labelled test events only |
| Measurable impact with realistic assumptions | FR11 FR12 FR15 | AC01 AC07 AC12 | Equal-condition policy comparison, cost/lead-time sensitivity and limits |

### Evidence that must be ready

The demonstration package contains the source/data card, coverage view, frozen split manifest, model and baseline report, uncertainty/failure slices, simulation assumptions, policy comparison, integrity tests and a reopenable decision record. Precomputed artefacts are acceptable when labelled and reproducible; they must not be presented as live training or live inference.

Show at least one case where the system abstains because the necessary input or exposure is missing. Show a case where a hard constraint rejects a superficially attractive action. These demonstrate the boundaries of the product without replacing the empirical evaluation.

### Claims permitted by different evidence

- Fictional cases and deterministic rules demonstrate interaction, arithmetic and business semantics within those fixtures.
- Source-linked historical replays demonstrate traceable context; they do not prove general entity fusion, strict historical availability or forecasting ability.
- A clean time-held-out study supports prediction claims for its declared target, population and period. An entity-held-out study supports only its actual unfamiliar-case scope.
- A calibrated simulator supports conditional scenario comparisons. Observed real-world savings or causal impact require an appropriate operational study beyond the simulator.

If the data or model gate remains unmet, the demo must explicitly state that empirical predictive validation is pending. A truthful functional prototype may still be shown, but it must not be described as having completed the core predictive proof. Do not conceal that limitation behind corpus size, visual polish, an LLM narrative or an RL label.

## S11 Delivery stages approval and sources

### Staged usable delivery after approval

D0 Approval: the owner approves this specification and the approved version is recorded. Until then, do not activate it, modify the application, push repository changes or deploy. Subsequent work follows D1–D4 without repeated approval for ordinary technical choices within scope.

D1 Preserve and prepare: migrate the original 14 cases and create 26 additional cases for the unified 40-case MR D.I.Y. working dataset, shared keys and data modes; keep all four workflows usable. Freeze source dates, ownership dictionary, assumptions, scenario clock and contracts. Profile the separately identified benchmark and run AC11, reporting feasibility even if it fails.

D2 Establish predictive evidence: build reproducible baselines, freeze evaluation, then test the candidate model. Run AC12 and leakage/robustness checks. Keep the best supported baseline if the advanced model fails to improve; report the result rather than changing the test to obtain a win.

D3 Connect the decision: validate the bounded simulator, compare policies under shared assumptions, expose uncertainty and integrate versioned outputs into J1. Keep J2–J4 functional and clearly labelled. Verify AC01–AC10, the complete English experience and source access.

D4 Rehearse and freeze: run the official traceability checklist, reopen decisions, test unavailable-service states and prepare a portable demo package. Freeze data/code/model versions and all public claims. Optional multilingual polish or RL follows only when it does not jeopardize the validated core.

No official deadline is inferred from the slides. Scheduling depends on the actual submission rules and team availability. The user and assistant own the remaining delivery, including the unified frontend, intelligence and module integration. Existing entity, time and decision services can connect through the agreed contracts when available. Delivery does not depend on Felix or a new staffing decision.

### Change control

The approved scope fixes the single-organization synthetic operational demo, the separate external forecasting study, all four workflows, 40 cases in the 16/10/8/6 distribution, six deep demonstrations and the acceptance gates. Engineers shall document ordinary parameter choices and assumption ranges before test freeze. Changes to entity scope, dataset/target, safety boundaries or performance claims require a versioned specification amendment. Optional RL and additional languages follow the accepted core and are not release dependencies.

### Source register and concise operating context

O1–O3 Owner-supplied official Track 1 slides: problem/expected outcome, strong solution/core question and example applications; image timestamps 20261010-022036, 022037 and 022038 respectively.

P1 Product specifications v0.3.1 (9 October 2026) and original v0.3; P2 project coverage report (8 October 2026) and English-first vertical handoff; P3 v63 review context (10 October 2026). These dated records establish the starting scope, not a current acceptance certificate; D1 reconfirms the snapshot.

DS1 UCI Online Retail II, DOI 10.24432/C5CG6D; metadata checked 10 October 2026. https://archive.ics.uci.edu/dataset/502/online+retail+ii

Company context: FY2025 reports existing SKU/store analytics, automated warehousing and replenishment, supplier consolidation, CRM/chatbot, LARK and GPS-enabled route/fleet management. The 2020 prospectus describes historical exporter/consolidation, Malaysian trading-house import and distribution steps. This informs fictional business dependencies; it does not verify present routes, backup systems or incidents. Procurement origin, invoice currency and payment terms remain separate. [MD1 pp17–18,44,174; MD2 pp33,37–40,49; MD3 pp103–104]

MD1 MR D.I.Y. Group (M) Berhad Integrated Annual Report 2025, FY ended 31 December 2025; pp17–18 and 44 procurement/operating model, p160 supplier advances, p174 payables. Official annual-report index: https://corporate.mrdiy.com/ar.html ; PDF: https://mrdiy.listedcompany.com/misc/ar/MRDIY_AR2025.pdf

MD2 Sustainability Report 2025; p2 entity scope, p33 supply chain, pp37–40 service and automation, pp47–49 energy/climate and fleet management, p51 packaging. https://corporate.mrdiy.com/misc/sustainability/MRDIY-Sustainability_Report_2025.pdf

MD3 Prospectus dated 6 October 2020, pp103–104 historical procurement/logistics architecture. Historical only; not current route or counterparty verification. https://corporate.mrdiy.com/misc/prospectus/MRDIY_Prospectus_06102020.pdf

MD4 Unaudited interim results for the period ended 30 June 2026, issued 11 August 2026. Public financial context only, not operational labels. https://corporate.mrdiy.com/newsroom/Bursa_Announcement_DIY-2QFY2026_20260811.pdf

Company sources checked 10 October 2026. Page numbers above are printed pages. Retain period, scope and verification date in evidence; do not blend unresolved store-count definitions or financial-highlights website ratios into operational facts.

Approval status: approved by the product owner. Approved version: v0.4.1. Approval date: 10 October 2026.
