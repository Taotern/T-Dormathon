# Findings and limits

The implementation is runnable: actual observation-history UCT, interaction-trained standard tabular Q-learning, shared dynamic simulator, persisted artifacts, deterministic seeds and masked resource-feasible actions. The tests and independent reproduction establish implementation/reproducibility evidence. They do not establish real-business validity.

## Preserve the weak first baseline

The first 96-seed study retained a frozen practical rule that happened to choose no-action throughout. Its pending-arrival and temperature/fatigue thresholds made it passive. It is not a credible proxy for real manual retail operations, and gains over it must not be marketed as beating meaningful business practice. That diagnosis prompted a separately prespecified new controller and new untouched test block. The original study remains available unchanged.

## Fresh frozen protocol2 result

On seeds 400000–400095, the calibrated inventory-cover/myopic one-day controller has mean declared reward -266.65. The primary trained Q policy, selected before training, has mean reward -271.24. Its paired mean difference is -4.59; the descriptive approximate 95% interval spans -14.97 to +5.78. There is no demonstrated score gain over this controller. Primary Q loses 58 of 96 paired scenarios.

Q changes the trade-off: average unserved units fall 7.67→3.42 while new modeled cash commitments rise MYR 89.25→144.21. Mean heat exposure rises 63.94→66.82 degree-hours. Other cost/holding/backlog metrics are retained. The synthetic shortage and heat weights determine the declared score, not observed company profit or social value.

MCTS 32 and 128 mean rewards are -317.68 and -304.80. They lose 87 and 82 scenarios to the controller. Larger search budget improves this sample by 12.88 reward points but still trails the controller. Mean runtime is 229ms and 905ms per seven-day run versus 2.96ms for the controller and 1.58ms for primary Q. MCTS uses 86,016 and 344,064 model transitions across the 96-seed study; the controller uses 1,536 one-day modeled transitions. Offline RL training is amortized and not counted as equal online compute.

Primary Q fallback is 7 of 672 decisions(1.04%). Other trained seeds and their failures are retained; seed 47 has a severe individual -711.44 paired score failure. The primary is not switched to whichever trained seed looks best on test. A separate failure-case file includes two worst cases per learned/search policy, action histories, pending orders and resources.

## Tractable exact reference

A separate two-day/three-path miniature uses the same kernel and exact nonanticipative enumeration. Its oracle reward is -47.59. MCTS 32 returns -91.66, worse than the passive heuristic's -66.55; MCTS 256/1024 return -49.33, still 1.74 below the bounded oracle. Paths with identical public histories share a second action. The reference is exact only within that finite miniature, not a seven-day or global oracle. The seven-day learned Q is not relabeled as optimized for this different two-day objective.

## Evidence and operational boundary

- Three 20,000-episode trained policies, 140,000 interaction visits each, independent training RNG/environment seeds and disjoint validation/test blocks
- Primary policy 228,854-byte portable module; deterministic inference with explicit unknown-state/model-version/effective-parameter fallback
- Independent 20,000-episode seed 41 reproduction matches complete Qtable, visits and digest exactly; core validation metrics match
- Training peak 225.8MiB, final original evaluation 107.0MiB, second evaluation 95.1MiB; only one heavy process at a time
- 25 local tests plus independent reviewer probes; source/config/model/world/artifact digests frozen before the new block

All operational records, parameter fits, environmental scenarios and reward weights are generated/authored synthetic assumptions. Holdouts are seed draws in one model family with limited model misspecification, not real-company/temporal/causal validation. No purchase, dispatch, staffing change, payment or public publication happens. Preserve the existing v76 demonstration as fallback.
