# Forecast-to-decision expansion

This is an additive implementation on the existing v0.4.1 synthetic MR D.I.Y. demonstration. It does not replace the approved product specification, the 40 stable case IDs, the baseline inventory-policy experiment, or the existing human-choice records.

## Product boundary

- Organization: selected supply cases expose a dated demand outlook and a stock/arrival trajectory. Missing lead time, stock or arrival completeness must yield abstention, not zero demand or invented stock.
- Strategy: the six deep cases may open the same whole-episode comparison. SC01/SC02 share a physical stock stream; SC17/SC18 share invoice-review state. A whole plan must not count those resources or outcomes twice.
- Advisor: deterministic whole-episode explanations are shown alongside the existing selected-case explanation. The optional paid LLM remains case-scoped and does not see or endorse the expanded plan calculation. Its provider request, limits, reservation ledger and validation controls are unchanged.
- All alternatives are conditional simulations from the same frozen snapshot, assumptions, demand and external session commitments. A displayed plan does not reserve resources or execute an order, payment, assignment or facility action.
- Existing case decisions remain case-scoped. New case-decision artifacts include the additional demand outlook inside their hashed predictive-mechanics object. Older objects are reopened as stored, without recomputing the new forecast or rewriting their schema.

## Evidence boundaries

Authored synthetic sales histories support demonstrations of calculation and integration only. Historical low/high scenarios are not calibrated forecast confidence intervals, company stockout probabilities, or evidence of realized savings. External-retailer benchmark findings retain their original entity and years and are not promoted into company validation.

The joint planner is a bounded, explicitly specified scenario comparison. It is not trained reinforcement learning and does not establish a causal effect in the real world.

## Verification

Implementation tests, emitted Worker tests, DOM-harness behavior tests, hosted API checks and browser visual checks are distinct gates. A Node/in-memory SQLite pass is not evidence of production persistence or visual acceptance. Current verification details are recorded in the integration report after the final source set is assembled.
