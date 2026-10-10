# Second frozen evaluation protocol

The first study on seeds 300000–300095 is preserved. Its original practical rule produced exactly the no-action trajectory on all 96 seeds. Inspection explains inactivity: a receipt arriving tomorrow suppressed a needed transfer today; the authored 20-unit threshold did not use the fitted 26.65-unit public forecast; overnight temperature/fatigue kept staff/cooling triggers below thresholds. This is a passive-behaving toy baseline, not evidence about real/manual retail operations. First-study results prompted a baseline-design correction, so they cannot serve as a confirmatory test of the corrected baseline.

## New controller, frozen before new test

Version `dormathon.cover-thermal-myopic.v1`.

- Daily demand forecast is the one-step conditional mean of the public fitted OU lognormal model from its approximate observed-sales point belief. For future offset j, use t=j+1, phi=exp(-kappa*t), variance=sigma²*(1-phi²)/(2*kappa), mean=weekday_base*exp(phi*public_log_belief+variance/2). This is model-based expectation, not access to realized demand or exact latent posterior.
- Only unreceived orders reported due today count as available today. Tomorrow’s receipts do not suppress an urgent same-day transfer. Choose transfer40 when due-today stock covers less than one forecast day.
- Otherwise choose order100 only when total stock position arriving within the episode is below the remaining-horizon forecast and a three-day order can arrive before the horizon. Retain none otherwise. If the inventory choice is masked, use feasible none inventory choices.
- Among feasible staff/cooling combinations for that inventory choice, minimize declared deterministic one-day modeled cost at the same public forecast and authored outdoor mean 34°C. This is a local myopic controller, not a search tree or trained policy. Count and report every modeled transition.
- No threshold fitting, parameter search, learned-policy selection, new RL training or MCTS retuning based on first-study results.

## New untouched evaluation

Exactly 96 new seeds 400000–400095, disjoint from training, validation and the first study. Same opening balances, sole dynamics kernel, constraint/reward function, independent fixed evaluator world, fitted public model and observation access. Evaluate no-action, original passive practical rule, new calibrated cover/myopic controller, all three existing trained Q seeds and unchanged MCTS 32/128. Existing Q fallback and MCTS rollout remain the original practical rule, preserving the deployed prior policies. A defensive complete-effective-parameter Q validity check was added; it does not change valid frozen-model actions or learned values.

Freeze source/config/calibration/world/artifact digests before any 400000 seed is evaluated. Report every policy result, paired differences against the new controller, all losses/ties, runtime, Q fallback and model-call costs. Keep original study alongside it. Do not select the best RL seed or MCTS budget after looking at this test. Primary remains training seed 41, selected before training.

The point-belief forecast and scalar cost coefficients remain synthetic assumptions. Fresh seed holdout within one authored family is not real-company, temporal, causal or high-fidelity validation. Lower reward can coexist with different cash, shortage, heat and backlog outcomes.
