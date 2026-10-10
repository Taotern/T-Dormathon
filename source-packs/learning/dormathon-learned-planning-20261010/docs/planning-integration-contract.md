# Runnable learned planning contract

Additive isolated build; canonical frozen baseline `b100ca9f157fe03946e1b87a48bf4514a7c862d0` remains untouched. The existing v76 sequential enumeration remains a fallback, with its own seven-day/two-epoch lexicographic contract. This new compact daily module is a different explicitly synthetic experiment; do not imply its scalar rewards prove improvement on that older objective.

## Sole simulator and policy inputs

`retail-dynamics-adapter.js` reexports the sibling `dormathon-dynamics-expansion-20261010/worker/mrdiy-dynamics.js`. Integration must copy that one kernel to the destination and change the adapter import to `./mrdiy-dynamics.js`. Never fork dynamics into an alternate planning/training simulator. Its public state, feasible masks and declared scalar reward are identical for all policies. Actual environment PRNG/latent demand stay private. Policies receive `observation` and `legal action IDs` only, never evaluator `info`, scenario labels, evaluation seeds, unseen demand, future trajectories or actual latent/RNG state.

`planMcts({observation, createEnvironment, calibration, rolloutPolicy, iterations, maxNodes, scenarioPoolSize, seed, horizon})` returns selected action, visit counts/mean returns, tree/depth/rollout counts and exact model-transition budget. A newly independently seeded planning environment starts from public state. UCT performs selection, expansion, feasible rollout and discounted backpropagation. Each action has public-observation chance branches scoped by its complete parent action/observation history. Sampled hypothetical worlds are reused in a finite pool to grow a multi-level tree. This is approximate belief/history search, not exact POMDP filtering; root decision does not know the held-out world. Default 256 iterations, 2,048 nodes, 16 independently sampled model worlds; online computational cost is visible. No optimality/improvement guarantee.

`createQPolicy(trainedArtifact,{fallback:practicalPolicy})` returns deterministic masked `choose(observation,legalActions)` and fallback diagnostics. Method is interaction-trained tabular Q-learning with discrete actions, not DDPG/deep RL. The coarse key uses day, inventory/source/cash/resource bins, fatigue/backlog/temperature bins, public log-demand-belief bins, outstanding order ETA/units and feasible-action mask. This aggregation is not proven Markov or convergence-preserving. Unseen/untrained states/actions use a disclosed feasible practical fallback. Changed calibration version also triggers fallback; an old artifact is not silently called valid for a new model.

## Training and evaluation

Small plain-Node CPU trainer has no heavy library dependency and requires no paid compute. Training seeds 41/43/47 and disjoint environment blocks starting 100000/130000/160000. Default 20,000 seven-day interactions per run; validation seeds 200000–200047. Primary artifact seed 41 is chosen before training; validation is diagnostic, never checkpoint/model selection. Q targets are sampled reward plus gamma=1 maximum over ALL feasible numeric Q estimates, initialized at zero including unvisited actions; portable inference exports zero-visit entries as null. The target is the standard feasible-action Q-learning update, learned without oracle labels. Q values, action visit counts, curves, metadata, digests and run seeds are persisted.

Held-out evaluation uses seeds 300000 onward (default 96). This is a scenario-seed holdout from a synthetic generating family, not a temporal or real-company holdout. Evaluation can use a separate evaluator-only fixed world with slight demand-model misspecification relative to fitted training/planning. All policies have identical opening resources, action masks, scalar reward function and evaluation demand-noise streams; script verifies equal realized demand paths across policies. Metrics retain shortage/fulfillment/cash/heat/holding/backlog, paired return differences, runtime, MCTS model calls and Q fallback rates. All negative paired results are retained. Offline training versus online MCTS compute is deliberately disclosed; no equal-compute claim.

## Tractable oracle

`boundedTwoDayOracle` exactly enumerates a separate two-day/three-path miniature using the same simulator/resources/reward. It optimizes second actions by exact public observation groups; paths with identical histories share one action and their future distributions remain uncertain. This is exact only within that explicit finite scope, not seven-day/global optimality. The finite MCTS comparison uses its own independently sampled model worlds and reports the oracle gap. The seven-day Q artifact is not falsely evaluated as a trained two-day- objective policy.

## Portable integration and runtime

`retail-browser-worker.js` is a ready dedicated module Web Worker entry with demo/mcts/learned_action operations and request IDs. It returns {request_id,status,result} or bounded error messages; no external requests. Serve all imported modules under the same origin and allow worker-src self in the app CSP. Main-thread UI should ignore stale request IDs and terminate the worker for Cancel/navigation.

`runRetailPlanningDemo` is Worker-safe pure ES modules, returns no-action/practical/trained Q/MCTS seven-day traces with all diagnostics. Pass `artifact` from generated `retail-trained-policy.js`; no filesystem/Node APIs in worker modules. `simulation_seed` appears in the final evaluator envelope only, never passed to a policy. The per-policy traces preserve public input plus separate evaluator diagnostics.

Interactive demo can be CPU-heavy (MCTS model transitions). Run it in an appropriate background/browser worker or use saved benchmark traces on tight edge CPU budgets; do not claim arbitrary cloud-edge limits were tested. Portable table inference is a deterministic bounded lookup, whereas full MCTS/dynamic comparison needs many model transitions. Integration must retain current v76 fallback and cannot execute purchases, dispatches, staffing actions or public publication. Frontend labels must explicitly say synthetic, tabular trained RL, approximate observation-history MCTS, declared conditional score and bounded oracle.

## Reproduce

1. `npm test`
2. After the dynamics calibration training slot is released: `node --max-old-space-size=128 scripts/train-retail-q.mjs calibration=/absolute/path/to/fitted-calibration.json`
3. `node --max-old-space-size=96 --max-semi-space-size=8 scripts/evaluate-retail-planners.mjs calibration=/absolute/path/to/fitted-calibration.json`
4. `node scripts/export-portable-policy.mjs`
5. `node scripts/run-retail-demo.mjs calibration=/absolute/path/to/fitted-calibration.json`
6. `node scripts/run-bounded-oracle-comparison.mjs`

Primary references: Kocsis & Szepesvári, Bandit Based Monte-Carlo Planning (2006), https://www.cs.utexas.edu/~shivaram/readings/b2hd-KocsisSzepesvari2006.html; Sutton & Barto, Reinforcement Learning: An Introduction, Chapter6 off-policy Q-learning, https://people.cs.umass.edu/~barto/courses/cs687/Chapter%206.pdf. These identify the methods; they do not validate this synthetic retail model or establish algorithmic superiority.
