# Dormathon Pitch and Demo Runbook

Site v77 edition  /  10 October 2026  /  English presentation

Use the six main slides for a three-minute pitch, followed by two minutes of Q&A. Lead with the named Hormuz event and a human-confirmed hypothetical order exposure. The new daily simulator, trained policy and model update are distinct from the retained v76 weather and joint-plan demonstration.

### Schedule in Malaysia time

10 October: ready target 19:00, owner review 20:00.
11 October: submission deadline 09:00.
Pitch 3 minutes. Q&A 2 minutes.

### Run of show

00:00–00:15  The operations lead’s decision
00:15–00:50  Hormuz evidence and the assumed three-day delay
00:50–01:35  Same-episode policy comparison
01:35–02:10  Dated refit and disclosed old-policy fallback
02:10–02:40  Daily action and resource trace
02:40–03:00  Delivered review loop
03:00–05:00  Q&A: answer directly, then open one relevant appendix

### Preflight

- Open the deck on the actual presentation computer and check fonts, charts and hidden-slide navigation. All pages were rendered and inspected; native desktop PowerPoint was not tested.

- Use a fresh browser session with the shipped model. In Strategy, choose the Hormuz event, enter 3 additional arrival days and confirm hypothetical exposure. Use seed 400000 and MCTS 32 iterations per decision. Run the seven-day episode before going on stage.

- Verify the Q row shows MYR 140 new commitments and 9.011 unmet units, with 4 learned-table decisions and 3 fallback decisions. These are one illustrative stress run, not the held-out mean.

- Keep the update demonstration in a separate prepared session. A newer refit changes the active model and the episode basis; do not compare its result with the original screenshot as though only the policy changed.

- Use saved actual screenshots for the complete pitch. If rehearsed, show the precomputed comparison and one daily trace for 30–40 seconds during slides 3 and 5. Leave live fitting, search and solver runs for Q&A.

The deck contains 20 slides: 6 main, 10 evidence/Q&A appendices and 4 saved-screen fallbacks. The portable package includes full-resolution captures. The delivered v76 package remains an independent fallback.

Do not start a paid Advisor request or imply that an experiment executes purchases, staff assignments or facility controls.

## Three minute spoken script

Browser time is included. Use the screenshots if any live step stalls.

### Slide 1  00:00–00:15

A disruption makes headlines. Which order is exposed, and which response is worth its cost? Dormathon connects real evidence to explicit exposure and constrained choices, then updates as observations arrive.

### Slide 2  00:15–00:50

Our example is the US–Iran conflict and Hormuz disruption. EIA’s October update describes partial flows and continuing constraints. A headline alone does not establish company exposure. Here, the user explicitly assumes a demo order is affected and adds three arrival days. Every strategy receives that same assumption.

### Slide 3  00:50–01:35

We compare a practical controller, a trained policy and search in the same seven-day model. They share observations, feasible actions and resources. This displayed learned-policy run commits one hundred and forty ringgit in modeled new spending, while about nine units remain unmet. The controller protects more service and has lower heat exposure here, but spends more. The product makes that trade-off inspectable.

### Slide 4  01:35–02:10

Next, release a dated sales and temperature observation. The system actually refits the rolling window and records a new active model. It never rewrites earlier results or resets resource commitments. The old trained policy is not silently treated as current: a changed model triggers its disclosed fallback. Updating the model is different from retraining the policy.

### Slide 5  02:10–02:40

Open the daily trace to see the chosen action and its resource consequences. Transfers debit source stock. Orders reserve cash once. Staff, fuel and backup energy remain constrained, and receipts beyond the horizon remain outstanding. The lead can review the choice before any real action.

### Slide 6  02:40–03:00

Dormathon connects real external evidence to explicit business exposure and resource-constrained choices, then updates with new observations. That review loop is working today. The next proof is measured operating performance with real company data.

## Verified demonstration route

### The event and initial episode

- Open Strategy. Under Start with a real event, choose US-Iran conflict and Hormuz disruption. Read the October status: partial flows and ongoing constraints. The source date and historical closure are different facts.

- Choose hypothetical retail impact. Enter 3 additional days for DEMO_SHIP01 and explicitly confirm the fictional exposure and selected delay. The baseline day-5 receipt becomes day 8. It stays outstanding beyond the seven decision days.

- Under Compare policies, use seed 400000 and MCTS 32 iterations per decision. Choose Run the same seven-day episode. Every method receives the same initial state, receipt assumption and public observations.

- Show the comparison. The learned-policy row has score −332.712, unmet 9.011 units, new cash MYR 140 and heat 83.966°C·h. The controller has fewer unmet units, 3.393, but commits MYR 1713. This example is a cost/service trade-off.

- Select a method’s actual seven-day trajectory. Read its chosen actions, stock, cash and staff balances. Do not claim a planned action happened in the real world.

### Optional model update

Choose Update model. The first release, 25 September, reproduces the shipped 26 September calibration. Releasing 26 September next installs a genuinely newer 27 September model. A refit uses only its past rolling window. The frozen Q weights do not retrain; a model mismatch triggers their disclosed fallback. The old holdout has then been consumed, so its old before/after score is withheld.

### Optional dynamics inspection

Inspect dynamics runs a separate fixed schedule and exact RC versus trained PINN comparison. It does not inherit the event delay. Keep the small nonzero differences visible rather than rounding them into a claim of equality.

### If the site or Worker is unavailable

Say: “I’ll use the saved screens of the same verified workflow.” Return to the deck immediately. Slides 17–20 hold the event confirmation, comparison, updated model and daily trace. Do not debug on stage or imply an unavailable run succeeded.

https://dormathon-risk-private-20261007.liuyz8715.chatgpt.site/workbench.html

## Two minute Q and A

Answer only the question asked. Use one supporting appendix, not the whole evidence section.

### Is the business exposure real

“The event is sourced. The affected demo order and three-day delay are explicit assumptions. The source does not establish an MR D.I.Y. supplier link, delay or event probability.”

### Is the reinforcement learning actually trained

“Yes. Three tabular Q policies each trained through 20,000 seven-day episodes. The prespecified primary policy’s complete table and visit counts were independently reproduced. That verifies training and reproducibility, not business performance.”

### Does Q-learning beat a strong practical baseline

“No overall mean-score gain is established. On the fresh 96-seed test, the controller scores −266.65 and primary Q −271.24. Q reduces unmet units from 7.67 to 3.42 but raises new commitments from MYR 89.25 to MYR 144.21. Search also trails the controller on mean score.”

### Does the model update retrain the policy

“No. A dated rolling fit changes demand and thermal model parameters. Search and the controller use that calibration. The saved Q artifact remains frozen and uses a visible fallback when its effective model no longer matches.”

### Why use a PINN when an exact solution exists

“It is a genuine trained, bounded scalar surrogate, with a physics residual and checked holdout points. The exact RC solver is simpler and more accurate here. We retain it as the reference and do not claim a speed or accuracy advantage.”

### Can the methods see future demand

“No. Public observations exclude hidden demand, future events, evaluator seeds and reward diagnostics. Search uses independently hypothetical worlds from the public history. Those belief approximations still limit its performance.”

### What data and fidelity are established

“Public sources establish event context. Operating records, exposures, fitted observations and reward weights are synthetic. This is a compact coupled model, not a high-fidelity company digital twin or a real savings study.”

### What does the system execute

“Only a local, bounded comparison or fit. It does not place orders, dispatch stock, pay invoices or control facilities. The pre-existing optional LLM remains a selected-case explanation service.”

## Technical evidence and limits

### Learning and the corrected baseline

Primary Q seed 41 was fixed before training. Three runs have 20,000 episodes and 140,000 interaction updates each. The original heuristic chose no action on every first-study test case. A separately prespecified inventory-cover/myopic controller and a fresh 96-seed block corrected that weak comparison.

Protocol2 mean rewards: controller −266.649687; primary Q −271.243845; MCTS 32 −317.679240; MCTS 128 −304.803442. Q minus controller is −4.594158, with descriptive paired interval −14.96845 to +5.780135. Q loses 58/96 scenarios. It has 7 fallback choices among 672 decisions. Other trained seeds and severe failures remain disclosed; the primary was not switched after testing.

### Dated calibration

The generated extension has 180 dated sales rows and 720 thermometer rows. Fits use 56 days strictly before each as-of date and exclude censored sales. The same 26 September–9 October holdout contains 13 uncensored sales rows and 56 thermal rows. Models dated 3 August, 25 September and 26 September have demand MAE 7.1335, 1.8430 and 1.6896 units/day. The authored data include a demand-level change; this is a small synthetic demonstration. A later refit cannot keep claiming the consumed holdout.

### Coupled dynamics and physical assumptions

The seven-day model enforces stock, cash, receipt and capacity accounting. Demand uses an Ornstein–Uhlenbeck log-deviation SDE. Temperature uses a one-zone RC ODE; fatigue and service backlog use bounded positive dynamics. Demand and thermal coefficients are fitted. Fatigue, service, costs and capacities remain authored. The aggregate staff pool does not establish real role interchangeability.

### The trained thermal surrogate

The PINN has 37 parameters in one 12-unit tanh layer, 8,000 Adam steps, 41 residual locations and 4 exact synthetic labels. Its 100 validation points exclude training locations. Decay RMSE is 0.0000626; maximum daily mean temperature discrepancy in the frozen same-seed, same-schedule comparison is 0.0001488°C. The hosted run after the newer refit shows 0.000158134°C. These are different model versions. There are 224 neural workday calls; overnight and out-of-domain behavior use exact fallback. No advantage over exact RC is claimed.

### Three experiments remain separate

The displayed Hormuz +3-day episode, the frozen no-event 96-seed policy study and the separate fixed-schedule PINN comparison answer different questions. The v76 MET four-day-total-delay result (68 no-change unmet, zero in one static package, 1.3-hour gap) and its two-decision cost comparison belong to an older model. Never substitute those figures for the new RL or MCTS outcomes.

## Source and study register

### Real events

Hormuz: EIA’s 6 October 2026 report describes partial flows and continuing constraints. Its May report supports historical effective closure; July records reopening-related shipping increases. Do not describe uninterrupted complete closure as the October state.
https://www.eia.gov/outlooks/steo/report/global_oil.php
https://www.eia.gov/outlooks/steo/archives/may26.pdf
https://www.eia.gov/pressroom/releases/press590.php

Noto: JMA records the historical 1 January 2024 earthquake at 16:10 JST, JMA magnitude 7.6 and maximum intensity 7. No retailer supplier link is established.
https://www.jma.go.jp/jma/menu/20240101_noto_jishin.html

Red Sea: Maersk’s 5 January 2024 update 07 documents a dated carrier rerouting decision. It does not establish the status of all ships today or that ordinary China–Malaysia freight transits Suez.
https://www.maersk.com/news/articles/2023/12/15/maersk-operations-through-red-sea-gulf-of-aden

Kimi: SCMP’s 7 May 2026 funding report cites an adviser; direct primary financial confirmation was not obtained. Kimi’s 10 September enterprise announcement supports strategic context only. Neither funding nor valuation changes the retail simulator.
https://www.scmp.com/tech/article/3352751/kimi-developer-moonshot-ai-valued-us20b-it-navigates-chinas-new-ipo-rules
https://www.kimi.com/news/kimi-enterprise-partner-program

### Retail context and separate external demand research

MR D.I.Y. FY2025 public reporting supplies context, generally including Malaysia and Brunei. Internal company operations are synthetic; no endorsement or agreed pilot is implied.
https://mrdiy.listedcompany.com/misc/ar/MRDIY_AR2025.pdf

The exploratory UCI eight-fold result is weekly WAPE 69.73% versus same-fold mean28 77.21%, with daily WAPE 108.53%. Periods had prior exposure. The original November–December 2011 daily test retains mean28 MAE 6.974 and WAPE 103.41%; weekly-naive MAE 7.727 and ridge MAE 7.607. Ridge lost. Neither study validates company stockouts, and neither is the new synthetic model-update experiment.
Chen, D. (2012), Online Retail II, DOI 10.24432/C5CG6D, CC BY 4.0.
https://archive.ics.uci.edu/dataset/502/online+retail+ii

### Next proof

Validate with real observed stock, arrivals, fulfilled demand, service and temperature. Measure decision cost and service under comparable constraints. No current prototype result establishes causal company savings, calibrated event probabilities or production physical fidelity.