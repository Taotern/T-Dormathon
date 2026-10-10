# MR. DIY bounded operational package v0.4.1

This package implements the approved 40-case synthetic Malaysia hardware/household scenario. It contains 16 supply, 10 procurement, 8 service and 6 energy-security cases, an explicit stable-ID migration, six deep linked demonstrations, one shared stock/cash/capacity ledger, pure scenario mechanics and frozen human-decision records.

## Run

Node 24; no third-party runtime dependencies or network requests are required.

- `python scripts/generate_fixture.py` regenerates the deterministic authored fixture.
- `npm test` runs the functional/adversarial Node tests.
- `node scripts/report_fixture.mjs` regenerates the machine-readable fixture report and measures in-process latency.

The regeneration seed is 41010. Values are explicitly bounded scenario assumptions, not recovered company facts. The JSON file and generated Worker fixture must stay byte-equivalent after JSON parsing.

## Integration

Copy the new `worker`, `data/prototype`, `contracts`, and test files into the canonical source. Add `mrdiy-fixture.js` and `mrdiy-operations.js` to the existing Worker flattening module list before the consuming route service. The canonical integration owns route handling, persistence, UI, build, browser acceptance and any publication. The public validator is `validateMrdiySnapshot` to avoid an existing global binding collision. Private Worker bindings use the `mrdiy` prefix.

See `contracts/mrdiy-operations.v0.4.1.json` for exact signatures, response fields, editable assumption ranges, commitment schema, and persistence limits. Decision records include the entire immutable basis and can be around 190KB; the old 100KiB journey limit is unsuitable. Use the dedicated integration store with a bounded payload limit. The FNV-1a checksum detects accidental basis edits but is not a cryptographic signature or authentication mechanism.

Saving is a human planned choice only. It does not place an order, pay an invoice, reassign a person, control electrical equipment, or change shared fixture resources. Optional local sandbox commitments explicitly share stock, cash, qualified role time, fuel, transport, storage and backup-energy pools; repeated allocation is rejected. Pass only claims from feasible actions.

## Case and data boundaries

The original 14 IDs remain unchanged, with revised approved synthetic content and an explicit crosswalk. Twenty-six new IDs expand the scenario. SC01/02/17/18/27/35 share DEMO_ST01, SKU01, PO01, INV01, SHIP01 and TASK01. All 40 support open, inspection, analysis or truthful missing-input reasons, action comparison and save/reopen. SC16/26/34/40 are the insufficient-input paths.

There are eight hypothetical stores, two hypothetical distribution clusters, 24 household/storage/cleaning/stationery SKUs, six fictional supplier roles and three fictional carrier roles. Supplier ownership, origin, contracting entity, invoice currency and transport legs are separate. Roles contain necessary operational qualifications, availability, authorization, shift/rest rules and no named employees or sensitive private traits.

Public FY2025 report references retain PUBLIC_DISCLOSURE and provide context only. Internal records are SYNTHETIC_INTERNAL, assumed disruption records are HYPOTHETICAL_EVENT, and comparisons are SIMULATED_OUTCOME. Public context does not establish actual company incidents or backup autonomy. No factual company failure, customer relationship or endorsement is asserted. The 39-day synthetic sales history demonstrates the separate baseline forecast mechanics; external benchmark rows never enter these records.

## Arithmetic and constraints

The inventory simulator treats unmet demand as lost sales. Accepted goods receipts are already part of on-hand; only outstanding units appear in inbound shipments. Transfers conserve network units, supplier/order setup/holding/shortage/expediting costs retain units, and existing PO cash commitments are reserved once. Plans are compared with the same horizon and exogenous path. Cash remaining is MYR3,840 after MYR4,160 of explicit PO reserves from MYR8,000 opening cash.

Procurement analysis distinguishes unmatched receipt quantity, approval hold, missing documentation, duplicate review, currency mismatch, normal matched/paid invoices and unknown payments. The explicit synthetic bank-calendar rule rolls the Saturday due date to Monday; it is not a verified actual bank calendar. An incomplete ledger cannot prove nonpayment.

Service comparisons enforce operational qualification, authorization, qualification validity, shift, rest, capacity and required review. Internal targets are separate from formal SLAs. Unfinished outcomes remain censored and cancelled tasks are not relabelled as failures.

Energy-security scenarios use critical kW, usable kWh or fuel litres and explicit efficiency/conversion factors. Rated power, fuel, backup energy and runtime are checked separately. Safe partial continuity can remain feasible while explicitly showing a residual service gap. An attractive unsafe-load-shedding option is rejected. A tariff-only condition or unrelated grid notice cannot become an outage finding. No electrical switching or grid simulation is performed.

## Verification limits

`reports/node-tests.log` records 25 passing focused tests. `reports/functional-validation.v0.4.1.json` records all 40 complete pure workflows and separately labels in-process timing. This is not a browser acceptance report, full existing-suite result, deployment verification, generalized entity-resolution evaluation, observed company performance, AC11 data-readiness proof or AC12 predictive validation. Those remain separate integration/evidence responsibilities. Generic `reconstructState` exercises strict public/system-known version filtering; the operational fixture uses a synthetic snapshot and does not claim historical company reconstruction.
