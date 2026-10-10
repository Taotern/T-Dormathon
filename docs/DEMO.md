# T-Dormathon demo guide

## English

Open the English product on desktop: https://dormathon-risk-private-20261007.liuyz8715.chatgpt.site/workbench.html

### Suggested three-minute review
1. **0–20s · Home.** Click **Explore real-event scenarios →**.
2. **20–55s · Evidence and assumption.** Choose **US-Iran conflict and Hormuz disruption**. Read the dated EIA fact. Enter **3** fictional delay days and confirm the exposure.
3. **55–100s · Comparison.** Click **Compare responses**. Read **Unmet units**, **Spend MYR** and **Score ↑**. Inspect a timeline day. Higher score means lower weighted model costs; it is not a probability.
4. **100–145s · Search and history.** Open **MCTS search → Inspect actual search**. The diagram shows exported root actions, not a complete deep tree. Open **Learning & history** for the **60-day synthetic replay**. These are authored observations. Recorded Q/PINN charts show saved training checkpoints.
5. **145–180s · Case review.** Open **Organization → SC01**, then **Advisor → Explain with case rules**. Check coverage, arrival and uncovered demand in the answer. This Advisor basis is the selected synthetic business case, separate from the Hormuz simulation.

### Questions to ask
- Which text is a source fact, and which is your assumption?
- Are the units, fallback choices and next action understandable?
- Does the Advisor answer “why” with evidence?

### Limits
Synthetic outcomes are conditional; no company incident or automatic action is established. Optional live AI uses provider budget. Narrow MCTS needs horizontal panning. The reviewed narrow width was 492px; no 390px or full accessibility certification is claimed. Intelligence may briefly show its older layout while loading.


## Implementation notes

See [learning integration](learning-integration.md) for refitting, safe fallback and exact-RC/PINN behavior. Q/MCTS do not establish superiority over the stronger heldout controller. Screenshots show the actual v82 interface on 10 October 2026; their hashes are in the [image manifest](images/v82/manifest.json).
