# Local integration verification · 10 October 2026

This record describes local executable checks only, before root deployment/browser acceptance.

- Serial full regression: 663 tests executed; 662 passed. The sole failure was the old exact static-asset allowlist, which did not yet list the new separate rolling-study JSON asset. The allowlist was updated and its five-test suite passed.
- Final forecast helper additionally rejects malformed/absent origin, clocks and scope before calculating risk. No model, evaluation grid or fixture changed in that hardening step.
- Final affected suites: 77/77 passed, covering demand/stock engine, Python–JavaScript parity fixtures, joint-plan invariants, direct forecast/whole-plan daily trajectory parity, mounted read-only API, emitted Worker routes, frozen-decision backward compatibility, actual client DOM harness, original asset contract, and unchanged mocked Advisor behavior.
- After independent review, a narrow UI clarification made the history-derived/all-arrivals story primary and collapsed the retained original selected-case arithmetic. Its basis (20 units/day and five-day arrival for SC01), separate 28-day moving-average experiment and case-only saved choices are explicit. The affected UI/API/emitted-Worker suites passed 32/32. No calculation or model changed in that clarification.
- Final emitted artifact validation passed: default.fetch links successfully and all 12 static assets retain exact source bytes.
- Source diff whitespace/error check passed.
- Separate rolling-study audit reports 12 passed checks. The clean portable evaluator reproduces the recorded fold, aggregate, quantile and descriptive-bootstrap values. These checks do not convert previously exposed data into pristine holdout evidence or establish real operational stockout accuracy.

No production database was touched by these checks. Existing 40 case IDs, original benchmark, saved-decision namespace and old artifact verification remain intact. No schema migration, hosting/audience change, provider payload/budget configuration change or paid provider call was made by the expansion integration.

## Remaining gates

Root must publish using the existing Site identity and current audience, verify actual hosted read-back, inspect desktop/mobile layouts and repeated navigation, and preserve the known-good previous version. Node DOM harnesses are not browser screenshots. Mock provider tests are not evidence of an actual provider invocation. No actual company outcomes or calibrated company-risk probabilities are claimed.

## Source components

- `worker/demand-risk-engine.js`: model candidates, past-only selection and conditional stock paths.
- `worker/mrdiy-demand-outlook.js`: explicit 196-day authored company history and authoritative fixture/arrival/commitment adapter.
- `worker/mrdiy-joint-planner.js`: bounded whole-episode alternatives and one aggregate resource ledger.
- `worker/mrdiy-service.js`, `worker/index.js`: two read-only routes and additive freezing of demand outlook in new per-case decisions.
- `static/mrdiy-workspace.js`, `.css`: progressive Organization/Strategy/Advisor presentation; separate exploratory Intelligence report.
- `data/forecast-rolling-report.v1.json`: publication-safe external-study projection, with original hashes and limitations preserved.
- `portable-reproduction/`: explicit external-input evaluation workflow and provenance; no dataset or executor-specific default paths.
