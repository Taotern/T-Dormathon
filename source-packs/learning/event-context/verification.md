# Real-event backdrop verification

Prepared 10 October 2026, UTC. These files are ready for integration but do not modify or deploy the canonical site. The verified facts are external context. All retailer exposure and numeric stress settings are authored hypothetical assumptions.

## What to integrate

- `events.json`: four compact English cards, source provenance, exposure gates, user-selected bridge and limitations.
- First three cards: retail sensitivity experiments. Their single supported bridge is a user-chosen 0–5 whole-day delay for synthetic `DEMO_SHIP01`, with baseline zero. Selecting an event does not select a delay.
- Kimi: a strategic AI procurement discussion card, with no physical supply or demand shock and no simulator parameters. Keep its model-run control disabled or navigate to contextual review.
- Retain the existing official MET weather replay. Do not relabel its data as internal operational measurements or feed headlines into the synthetic learner.

## Source checks and dated conclusions

### US-Iran conflict / Hormuz

1. [EIA May 2026 archived STEO](https://www.eia.gov/outlooks/steo/archives/may26.pdf), released 12 May. Full PDF text retrieved, 60 pages. Relevant report pages 5 and 7, corresponding to zero-based PDF pages 5 and 7. This supports historical military-action, effective-closure and tanker-disruption context. The report's anticipated reopening and future prices are forecasts, not observed outcomes. Primary text check: 08:23:05 UTC.
2. [EIA July press release](https://www.eia.gov/pressroom/releases/press590.php), dated 7 July. Full primary HTML read, opening paragraph. This prevents wrongly carrying the May closure assessment unchanged into October. Check: 08:24:36 UTC.
3. [EIA October global oil markets](https://www.eia.gov/outlooks/steo/report/global_oil.php), release date 6 October, forecast completed 1 October, next release 10 November. Full primary HTML read, oil-price section paragraphs 3–6. The appropriate current label is constrained/partial flows rather than complete uninterrupted closure. Check: 08:23:27 UTC.
4. [October archive PDF](https://www.eia.gov/outlooks/steo/archives/oct26.pdf) appeared in the publisher-indexed search results, but repeated full-PDF retrieval timed out. The verified October text is from the dated primary HTML. Its live URL can change next month, so the JSON records release date, forecast date and retrieval time. Do not claim the October archive was fully read.

Not used: the June 2025 Hormuz explanation to establish October 2026 status. A historical chokepoint article cannot replace the later reports.

### Noto, Japan

- [JMA maintained event index](https://www.jma.go.jp/jma/menu/20240101_noto_jishin.html), earthquake table, 1 January 2024 at 16:10 JST row. Official record checked in full primary HTML at 08:23:55 UTC. The magnitude scale should remain JMA magnitude rather than silently becoming USGS moment magnitude.
- [JMA 5 January report 9](https://www.jma.go.jp/jma/press/2401/05b/202401051400.html), dated historical official warning. Summary and precautions checked at 08:22:56 UTC.
- [JMA English event page](https://www.jma.go.jp/jma/en/2024_Noto_Peninsula_Earthquake/index.html) is an additional navigational context link. The exact earthquake facts are grounded in the detailed Japanese index and dated release, not solely the sparse English landing page.

No MR DIY supplier in Noto has been established; no contemporary earthquake alert or recurrence forecast is claimed.

### Red Sea carrier rerouting

- [Maersk operations page](https://www.maersk.com/news/articles/2023/12/15/maersk-operations-through-red-sea-gulf-of-aden), explicitly the **05 January 2024, Update 07** section. Full primary HTML checked at 08:24:01 UTC. The URL's December 2023 date is the page's origin, not the date of the selected update.
- This is a dated carrier decision. Do not extrapolate it to every ship or today's route status. No actual Malaysian domestic route or China–Malaysia Suez transit is asserted.
- No observed voyage-delay number is imported. A 0–5 day demo range is not a real rerouting estimate or maximum.

### Kimi funding / AI procurement

- [SCMP dated report](https://www.scmp.com/tech/article/3352751/kimi-developer-moonshot-ai-valued-us20b-it-navigates-chinas-new-ipo-rules), 7 May 2026, published 18:27 HKT, updated 19:52 HKT. Accessible opening report text explicitly cites the deal's financial adviser. Checked at 08:24:36 UTC. Status is reported financing; the original adviser statement was not directly obtained.
- [Kimi enterprise-partner announcement](https://www.kimi.com/news/kimi-enterprise-partner-program), updated 10 September 2026. Direct official company text checked at 08:24:36 UTC. This supports a strategic deployment-review discussion, not the funding amounts.
- A later Bloomberg October article was found in publisher-indexed results, but direct fetch failed; it relied on unnamed sources. It is intentionally omitted from the integrated card. The card's funding date is historical May 2026, not a current-company-valuation claim.
- No claim is made that MR DIY uses Kimi, that financing improves task performance, or that AI procurement already changed physical supply.

## Truth and UX boundaries

1. Show the real-world fact and date before the hypothetical retailer assumption.
2. Require the user's receipt exposure and numerical delay selection before a simulation. Default zero and a no-impact path must be available.
3. Keep factual source text, hypothetical exposure, chosen inputs and simulated outputs visibly distinct.
4. A simulation uses the same initial state, receipt schedule and selected exogenous assumption for every policy under comparison. Policies must not receive future realized demand or event-related hidden information.
5. Delay the pending receipt once before a new episode. Do not erase existing reservations, reset cash, inject fake stock or rewrite elapsed history. Rebuilding an episode is a new sensitivity comparison, not a continuation of real operations.
6. The audited daily model's seven decision days are day 0 through day 6. A baseline day-5 receipt with an extra 2–5 days remains outstanding outside that horizon; it is not canceled. Report terminal outstanding receipts honestly.
7. No source-backed event probability, loss, shipment ETA, supplier outage, fuel-price coefficient or demand multiplier is calibrated here. Additional dimensions would require an explicit implemented and audited adapter.
8. Discussion choices never book transport, contact vendors, order stock, spend money or accept agreements.

## Reproducibility

`validate_contract.py` verifies source-ID links, stable IDs, strategic isolation, explicit user selection and the permitted bridge. `test_delay_bridge.mjs` tests all six delay settings against the existing isolated audited model without changing that model. `checks.json` records results when these checks are run.

## Short Chinese handoff

已整理四张可接入的真实事件卡：美伊冲突与霍尔木兹航运扰动、日本能登地震、红海绕行，以及 Kimi 融资与企业 AI 评估。前三张有官方或当事方材料；Kimi 融资明确标为 2026 年 5 月媒体援引财务顾问的报道，并用 9 月公司公告支撑 AI 采购讨论。

关键更正：霍尔木兹不能写成“截至今天一直全面封锁”；10 月 EIA 材料说明部分流量与持续约束并存。日本地震和红海案例是明确标日期的历史案例。

模拟只改变用户手动选择的演示到货延迟，默认零；真实新闻不会自动生成缺货、概率或延迟。Kimi 卡只供战略评估，不制造实体供应链冲击。现有官方天气回放保留。
