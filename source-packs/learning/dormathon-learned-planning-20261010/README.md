# Runnable MCTS + interaction-trained discrete RL

This isolated additive prototype uses the sole daily synthetic dynamics module in `../dormathon-dynamics-expansion-20261010`. The frozen canonical site and v76 fallback were not edited, pushed or deployed.

Implemented:
- Real observation-history UCT: action/chance tree selection, expansion, feasible rollout and discounted backpropagation, explicit iterations/node/model-step limits
- Genuine plain-JS tabular Q-learning from sampled seven-day interactions, standard full feasible-action Bellman maximum, persisted learned Q values and interaction visits
- Three training seeds, training/validation curves, disjoint held-out environmental seed evaluation, paired differences, fallback rates, latency/model-call costs and all failures
- Exact nonanticipative enumeration in a tractable two-day/three-path miniature for checking MCTS approximation gaps
- Worker-safe inference and full runnable demo, deterministic seeded actual/model environments, no future/RNG/latent-demand policy inputs

All scenarios, records, score weights and model fits are synthetic MR DIY-inspired demonstration assumptions. These are not observed MR DIY savings, a validated high-fidelity simulator, a proven business-optimal policy, DDPG, or guaranteed improvements.

## Run

Node 24; no extra dependencies or paid compute.

```
npm test
node --max-old-space-size=128 scripts/train-retail-q.mjs calibration=artifacts/retail-training-calibration.json
node --max-old-space-size=96 --max-semi-space-size=8 scripts/evaluate-retail-planners.mjs calibration=artifacts/retail-training-calibration.json world=../dormathon-dynamics-expansion-20261010/artifacts/dynamics-fixed-world-evaluator-only.json
node scripts/export-portable-policy.mjs
node scripts/run-retail-demo.mjs world=../dormathon-dynamics-expansion-20261010/artifacts/dynamics-fixed-world-evaluator-only.json
node scripts/run-bounded-oracle-comparison.mjs
```

Only one training/evaluation process should run at a time. Training uses bounded 50,000-state cap and a conservative 240MiB observed RSS guard, in addition to a bounded Node heap. Keep the separate compiler work’s reserved memory untouched. Small tests are independent.

Artifacts include full q-tables/visits, compact JS primary policy, curves, metadata/digests, held-out per-seed outcomes and representative full trajectories, bounded oracle comparison and runnable demo. `docs/planning-integration-contract.md` describes APIs, limitations and integration. Change the single adapter import after copying the dynamics kernel beside it. No browser/server filesystem APIs are needed for inference.

Frontend should show tabular trained RL and approximate MCTS as methods actually implemented, report synthetic conditional score plus shortage/cash/heat/backlog trade-offs, and preserve fallback/negative results. Q falls back visibly on unseen states or changed model versions. MCTS consumes many online model calls; use a background/browser worker or saved traces on tight edge CPU budgets.
