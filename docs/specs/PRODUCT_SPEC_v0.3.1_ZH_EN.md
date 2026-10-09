# T-Dormathon 产品规格 中英双语版 / Product Specification Chinese–English Edition

双语翻译版 0.3.1，2026 年 10 月 9 日。原中文逐节原样保留，英文为完整对应翻译；翻译不改变 FR／AC、接口、职责或范围。

Bilingual translation edition 0.3.1, 9 October 2026. Original Chinese is retained verbatim by section, followed by its complete English translation. Translation does not change FR/AC identifiers, interfaces, responsibilities or scope.

来源：[原中文文件](T-Dormathon_产品规格评审稿_v0.3.md)，私有仓库已发布提交 `3062a571e5931ad0d94bfa1a7b79f869bb7dd0e3`。原文保留评审时期措辞；实际已批准分工及后续补充以团队交接和最新补充为准，不表示所有目标已实现。

Source: [original Chinese file](T-Dormathon_产品规格评审稿_v0.3.md), published in private-repository commit `3062a571e5931ad0d94bfa1a7b79f869bb7dd0e3`. The original preserves review-era wording. The team handoff and latest addenda govern approved responsibilities and subsequent updates; not every target is already implemented.

配套双语文档 / Companion bilingual document: [打开 / Open](../TEAM_HANDOFF_2026-10-09_ZH_EN.md)

## 目录 / Contents

- [最新补充 / Latest addenda](#latest-addenda)
- [原文开头与版本说明 / Original opening and version note](#section-0)
- [1 产品决策摘要 / 1 Product Decision Summary](#section-1)
- [2 四类经营需求与追踪 / 2 Four Operational Requirements and Traceability](#section-2)
- [3 依赖暴露与外部经营条件 / 3 Dependency Exposure and External Operating Conditions](#section-3)
- [4 完整用户路径与相互影响 / 4 Complete User Journeys and Interactions](#section-4)
- [5 情报与正式产品工作台 / 5 Intelligence and the Formal Product Workbench](#section-5)
- [6 实体轴 时间轴与历史标签 / 6 Entity Axis, Time Axis and Historical Labels](#section-6)
- [7 岗位能力与运行安全 / 7 Role Capability and Operational Safety](#section-7)
- [8 风险 情景与受约束决策 / 8 Risk, Scenarios and Constrained Decisions](#section-8)
- [9 四个后端模块与拟议契约 / 9 Four Backend Modules and Proposed Contracts](#section-9)
- [10 验收 基线与完整性门槛 / 10 Acceptance, Baselines and Integrity Gates](#section-10)
- [11 安全 分阶段交付与批准项 / 11 Safety, Staged Delivery and Approval Decisions](#section-11)

<a id="latest-addenda"></a>

## 最新已确认补充 / Latest Confirmed Addenda

### 2026 年 10 月 9 日 产品语言 / Product Language

最终 hackathon 产品必须以英语为默认语言并完整支持英语，涵盖界面、消息、分析与演示。中文和马来语是可选加分项，不得延迟或阻碍英语交付。中英双语文档不等于产品必须双语。

The final hackathon product must be English-based, with English as the default and fully supported across the UI, messages, analysis and demonstration. Chinese and Malay are optional bonus languages and must not delay or block English delivery. Chinese–English documentation does not imply a bilingual-product requirement.

### 同日已发布的前端与产品意图 / Published Frontend and Product-Intent Notes

**2026 年 10 月 9 日前端补充：**整体产品前端由用户与助手负责，既要抓眼，也要简洁、直接地完整展示产品。后续视觉整合采用虚实解构的黑白灰、强构图、层次、数据重点与适当动效，同时验收视觉吸引力和可用性；不恢复已取消的超前端或 PPT 式展示。队友当前只承担对应后端功能、契约和可运行示例，不承担视觉装修任务。

**Frontend addendum dated 9 October 2026:** The user and assistant own the overall product frontend. It must be eye-catching while presenting the complete product simply and directly. Subsequent visual integration uses Xushi Deconstruction in black, white and gray, with strong composition, layering, data emphasis and appropriate motion. Acceptance evaluates both visual appeal and usability. Do not restore the canceled super-frontend or a slide-style presentation. Teammates currently own only their backend functionality, contracts and runnable examples, not visual styling.

**同日产品意图补充：**最小后端用于加快完整可用原型交付，不能因此做出薄弱原型。整体体验目标是串联全球数据、风险发现与预防建议、沙盘推演和 Agent 咨询；这是产品方向，已有能力与覆盖仍以实际验收为准。“自我改进”须有反馈、版本和评估证据后才作为能力声明。

**Product-intent addendum on the same date:** The minimum backend accelerates delivery of a complete usable prototype; it must not result in a weak prototype. The overall experience aims to connect global data, risk discovery and preventive recommendations, sandbox simulation and Agent consultation. This is product direction; implemented capability and coverage remain subject to actual acceptance. Claim ‘self-improvement’ only when supported by feedback, versions and evaluation evidence.

上述已发布补充来自[文档入口](../README.md)；它们补充原文，不把拟议接口或产品目标变成已实现能力。

The published notes above come from the [documentation index](../README.md). They supplement the original text without turning proposed interfaces or product targets into implemented capabilities.

<a id="section-0"></a>

### 中文原文 / Original Chinese

<!-- BEGIN_ZH_SECTION 0 -->
T-Dormathon 产品规格评审稿

Taotern 团队    2026 年 10 月 9 日    草案 0.3

已确认产品服务于 hackathon，而非投产。本稿请负责人先完善并批准问题、需求与验收，再开发展示。文中的“必须”是待批准要求，不表示能力已实现；完整目标与竞赛可运行范围分别说明。审批前不上传 GitHub，批准后按已授权私有仓库范围更新。


<!-- END_ZH_SECTION 0 -->

### English Translation / 英文翻译

<!-- BEGIN_EN_SECTION 0 -->
T-Dormathon Product Specification Review Draft

Taotern team    9 October 2026    Draft 0.3

The product is confirmed to serve the hackathon rather than production deployment. The owner should first refine and approve the problem, requirements, and acceptance criteria, then develop the demonstration. The word ‘must’ identifies requirements pending approval, not capabilities already implemented. The complete target and the runnable competition scope are described separately. Do not upload to GitHub before approval; after approval, update within the already-authorized private-repository scope.
<!-- END_EN_SECTION 0 -->

---

<a id="section-1"></a>

### 中文原文 / Original Chinese

<!-- BEGIN_ZH_SECTION 1 -->
## 1 产品决策摘要

### 我们要解决的问题

组织难以从分散的内部运营资料与外部信息中，提前识别供应库存履约、采购发票回款阻塞、服务业务流程延误、能源食物及其他经营浪费这四类相互关联的问题；也难以判断其影响，并在有限资金、人力、时间和资源约束下，选择有依据的应对。四个方向共同构成产品问题陈述。

产品必须把内部运营、交易对手能力／历史、实际依赖／暴露和外部经营条件组织成可核查的主体、关系与历史状态，发现可能变贵的经营问题，并比较可行行动及其代价。这四层都是核心输入；全球情报、实体轴、时间轴与 RL 沙盘支撑共同闭环。

### 目标用户与成功含义

核心用户是组织的运营、采购与财务、服务流程及资源管理负责人。用户需要知道：哪里可能出问题、会影响哪些业务对象、证据与未知是什么、现在有哪些可行行动，以及这些行动如何争用资源或改变其他问题。

成功应体现为更早且更准地发现重要问题、更快核查证据，以及在明确约束下得到可解释的行动比较。数据量、功能数量、图谱规模或采用 RL 本身均不构成成功证明。真实经营收益必须有适当运营数据与评估支持。

### 已确认目标与范围

Dormathon 为首要目标，可信性先于新颖性，每阶段都保持可使用、可演示。基线须完整覆盖前三类问题，第四类有实质入口；四类共用核心能力。全球国家、主要政治组织、主要企业，以及中小企业趋势、独角兽与跨领域信息仍是情报覆盖目标。历史最低 2020 年至今，1990 年起为优先扩展目标。

### 竞赛约束与评审提议

官方 Track 1 主题为 “How can AI spot problems before they become expensive, and help someone decide what to do about them?” [O1] 该主题是外部动机与约束，不替代上述产品问题陈述。10 月 10 至 11 日的详细竞赛任务仍待确认。

本稿提出的对象契约、分阶段方案、主演示路径与验收阈值均待评审。假设是：合法可用的公开资料能提供外部背景；经营记录由用户授权数据、公开基准或明确标记的合成数据支撑。外部资料不能单独证明库存、现金流、服务承诺／处理时限或能耗影响。SLA（Service Level Agreement，服务等级协议）用于明确对外服务质量与时限承诺；内部处理目标不一定构成 SLA。

来源：已确认方向与范围来自负责人 2026 年 10 月 9 日的项目讨论；接口、评测细则与主案例为本稿提议。[O1] Dormathon 2026 官方活动页。

https://www.aihackerdorm.com/events/dormathon-2026-malaysia-s-nationwide-hackathon-build-the-next-big-thing


---



<!-- END_ZH_SECTION 1 -->

### English Translation / 英文翻译

<!-- BEGIN_EN_SECTION 1 -->
## 1 Product Decision Summary

### The problem we are solving

Organizations struggle to identify four interconnected types of operational problem early from fragmented internal records and external information: supply, inventory and fulfilment; blockages in procurement, invoices and cash collection; delays in service and business processes; and waste of energy, food and other operating resources. They also struggle to assess the impact and choose evidence-grounded responses under limited funding, staffing, time and resources. These four directions together constitute the product problem statement.

The product must organize internal operations, counterparty capability/history, actual dependencies/exposure, and external operating conditions into verifiable entities, relationships and historical states, identify operational problems that may become costly, and compare feasible actions and their costs. All four layers are core inputs. Global intelligence, the entity axis, the time axis and the RL sandbox support this shared end-to-end workflow.

### Target users and what success means

Core users are organizational leads responsible for operations, procurement and finance, service processes, and resource management. They need to know where problems may arise, which business objects will be affected, what evidence and unknowns exist, which actions are currently feasible, and how those actions compete for resources or change other problems.

Success should mean earlier and more accurate identification of important problems, faster evidence verification, and explainable action comparisons under explicit constraints. Data volume, feature count, graph size or the use of RL alone does not demonstrate success. Claims of real operational benefit require appropriate operational data and evaluation.

### Confirmed goals and scope

Dormathon is the primary goal. Soundness takes priority over novelty, and every stage remains usable and demonstrable. The baseline must fully cover the first three problem types and provide a substantive entry point for the fourth; all four share core capabilities. Intelligence coverage goals still include countries worldwide, major political organizations and companies, SME trends, unicorns and information across domains. The minimum historical scope is 2020 to the present, with expansion back to 1990 prioritized.

### Competition constraints and review proposals

The official Track 1 theme asks how AI can identify problems before costs escalate and help someone choose a response. [O1] This is external motivation and a constraint, not a substitute for the product problem statement above. The detailed competition challenge for 10–11 October remains to be confirmed.

The object contracts, staged plan, main demonstration path and acceptance thresholds proposed in this draft remain subject to review. The assumption is that legally usable public information can provide external context, while operational records come from user-authorized data, public benchmarks or clearly labeled synthetic data. External information alone cannot establish effects on inventory, cash flow, service commitments/processing deadlines or energy consumption. SLA means Service Level Agreement and defines external service-quality and timing commitments; internal processing targets do not necessarily constitute an SLA.

Sources: confirmed direction and scope come from the owner's project discussion on 9 October 2026. Interfaces, evaluation details and the main case are proposals in this draft. [O1] Official Dormathon 2026 event page.

https://www.aihackerdorm.com/events/dormathon-2026-malaysia-s-nationwide-hackathon-build-the-next-big-thing
<!-- END_EN_SECTION 1 -->

---

<a id="section-2"></a>

### 中文原文 / Original Chinese

<!-- BEGIN_ZH_SECTION 2 -->
## 2 四类经营需求与追踪

四类业务对象共用四层核心输入：内部运营；交易对手的能力及有证据历史；路线、业务依赖和实际暴露；天气、政策、经营日历、当地需求习惯与安全条件。每类均输出风险、影响、可行行动、假设及可观测结果；缺少必要输入时限定结论，而非省略这一层。

### FR01 供应库存履约

输入包括 SKU、可用／预留库存、在途、需求、供应商／承运商能力与历史；路线分段、道路／港口／边境、方式、计划运输时间与替代路线；对应地点和时段的通行、天气、政策、假日／节庆拥堵及安全条件。沿订单暴露识别缺货、过量和履约风险，比较补货、重分配、替代对手、改道／改期／换方式、缓冲与加急。约束包括库存守恒、交期、容量和资金；结果记录履约、缺货、库存及总成本。

### FR02 采购发票回款阻塞

输入包括采购单、收货、发票、到期日、实际付款／收款、审批与现金；供应商／客户历史、合同付款依赖、物流节点与适用银行营业日、支付截止、政策及结算惯例。区分未到期、逾期、缺失和阻塞，定位现金缺口，比较补件、催办、处理次序与合法可行的改期／替代对手。销售日期不等于收款日；记录完整性未证明时，未见付款不能判定未付。假日是否顺延须依据适用规则，不作统一假设。

### FR03 服务业务流程延误

输入包括请求／任务、步骤、依赖、队列、岗位能力／授权／排班休息、服务商历史及服务承诺／处理时限；现场或上游路线暴露、营业日、假期、节庆需求与安全通行条件。识别瓶颈及超时风险，比较排程、合资格改派、升级和容量分配。结果记录完成时间、正式 SLA 违约／内部处理超时、等待与资源占用；区分暂停、取消、未完成与失败，不将内部目标称作正式协议。

### FR04 能源食物及其他经营浪费

输入包括实际能耗、产出、用量、损耗、食物批次／保质期、计价与处置规则；供应／冷链能力、运输与储存暴露、天气、营业日／节庆需求、适用政策与经营习惯。识别异常消耗、过期、过量和低效使用，比较节能排程、批量、周转、缓冲与运输替代。价格不等于消耗，费用与物理量分开。基线先做食物批次过期／报废，比较固定批量与先到期先出／批量调整，不要求同时完成全部浪费类别。

### 问题到验收再到演示

| 问题 | 需求 | 验收 | 必须展示的证据 |

| --- | --- | --- | --- |

| PS1 供应库存履约 | FR01 | AC01 | 同一订单链的风险、可行行动与履约／成本基线比较 |

| PS2 采购发票回款 | FR02 | AC02 | 单据与审批链、真实日期语义、逾期／缺口及处理比较 |

| PS3 服务流程延误 | FR03 | AC03 | 步骤与资源依赖、服务承诺／处理时限时钟、瓶颈与排程基线比较 |

| PS4 经营浪费 | FR04 | AC04 | 一种实质浪费记录、物理量与费用分离、减损行动比较 |



共同支撑：FR05–06 情报／工作台；FR07–09 实体／历史；FR10–13 决策；FR14–15 安全／复现；FR16 依赖暴露／经营条件；FR17 岗位能力／运行安全。演示须沿需求追踪证明结果。


---



<!-- END_ZH_SECTION 2 -->

### English Translation / 英文翻译

<!-- BEGIN_EN_SECTION 2 -->
## 2 Four Operational Requirements and Traceability

All four business-object types share four layers of core input: internal operations; counterparty capability and evidence-supported history; routes, business dependencies and actual exposure; and weather, policy, operating calendars, local demand practices and security conditions. Each produces risks, impacts, feasible actions, assumptions and observable outcomes. When necessary inputs are missing, limit the conclusion rather than omit the layer.

### FR01 Supply, Inventory and Fulfilment

Inputs include SKUs, available/reserved inventory, goods in transit, demand, and supplier/carrier capability and history; route legs, roads/ports/borders, transport mode, planned transit time and alternative routes; and passability, weather, policies, holiday/festival congestion and security conditions for the relevant location and time. Identify shortages, excess stock and fulfilment risk through order exposure. Compare replenishment, reallocation, alternative counterparties, rerouting/retiming/mode changes, buffers and expedited delivery. Constraints include inventory conservation, lead time, capacity and funding. Record fulfilment, shortages, inventory and total cost as outcomes.

### FR02 Blockages in Procurement, Invoices and Cash Collection

Inputs include purchase orders, goods receipts, invoices, due dates, actual payments/receipts, approvals and cash; supplier/customer history, contractual payment dependencies, logistics milestones, and applicable banking days, payment cutoffs, policies and settlement practices. Distinguish not-yet-due, overdue, missing and blocked states; locate cash gaps; and compare additional documentation, follow-up, processing order and legally feasible retiming/alternative counterparties. A sales date is not a cash-receipt date. When record completeness has not been established, the absence of a payment record cannot establish nonpayment. Whether holidays extend a deadline depends on the applicable rule, not a universal assumption.

### FR03 Delays in Service and Business Processes

Inputs include requests/tasks, steps, dependencies, queues, role capability/authorization/shift and rest schedules, service-provider history and service commitments/processing deadlines; and on-site or upstream route exposure, operating days, holidays, festival demand and safe-access conditions. Identify bottlenecks and timeout risk; compare scheduling, qualified reassignment, escalation and capacity allocation. Record completion time, formal SLA breaches/internal processing overruns, waiting and resource usage. Distinguish paused, canceled, incomplete and failed work; do not describe internal targets as formal agreements.

### FR04 Waste of Energy, Food and Other Operating Resources

Inputs include actual energy consumption, output, resource use, losses, food batches/shelf life, pricing and disposal rules; supply/cold-chain capability, transport and storage exposure, weather, operating-day/festival demand, applicable policies and operating practices. Identify abnormal consumption, expiry, excess and inefficient use; compare energy-saving schedules, batch size, stock rotation, buffers and transport alternatives. Price is not consumption; separate monetary costs from physical quantities. Start the baseline with food-batch expiry/write-offs, comparing fixed batches with first-expiring-first-out/batch adjustments; all waste categories need not be completed simultaneously.

### From Problem to Acceptance to Demonstration

| Problem | Requirement | Acceptance | Evidence that must be demonstrated |
| --- | --- | --- | --- |
| PS1 Supply, inventory and fulfilment | FR01 | AC01 | Risk and feasible actions on the same order chain, with fulfilment/cost baseline comparisons |
| PS2 Procurement, invoices and collections | FR02 | AC02 | Document and approval chains, correct date semantics, overdue/gap identification and processing comparisons |
| PS3 Service-process delays | FR03 | AC03 | Step and resource dependencies, service-commitment/processing-deadline clocks, bottlenecks and scheduling baseline comparisons |
| PS4 Operational waste | FR04 | AC04 | A substantive waste record, separation of physical quantities and costs, and waste-reduction action comparisons |

Shared support: FR05–06 intelligence/workbench; FR07–09 entities/history; FR10–13 decisions; FR14–15 safety/reproducibility; FR16 dependency exposure/operating conditions; FR17 role capability/operational safety. Demonstrations must establish results through this requirements traceability.
<!-- END_EN_SECTION 2 -->

---

<a id="section-3"></a>

### 中文原文 / Original Chinese

<!-- BEGIN_ZH_SECTION 3 -->
## 3 依赖暴露与外部经营条件

### FR16 四层输入的实际适用关系

内部记录定义业务对象和资源；交易对手层提供角色、能力、容量及有证据历史；依赖层说明业务实际使用哪些路线、节点、对手、设备、岗位或银行；条件层给出对应地点／主体与时段的天气、政策、日历、经营实践及安全信息。缺少暴露映射时，外部事件只能成为待核查线索，不能直接变成业务影响。

### 路线与空间时间暴露

Route／RouteLeg 保存起终点、分段与节点、道路／港口／边境、承运商、运输方式、计划通过时段／运输时间和可行替代。Exposure 把订单、物料、发票、任务或资源连到具体依赖、影响窗口及映射证据。通行条件必须匹配分段、方向与时段；国家级事件不能证明某条路线关闭。

同一条件对四方向的机制可能不同：绕行改变履约时间和运输成本；物流延误可能影响收货后的付款节点；假期改变银行营业日及服务计时；节庆需求或营业时段改变库存、食物报废与能耗。每条传播都需要业务关系及适用规则，不能仅凭时间同现。

### 天气 政策 日历与经营实践

OperationalCondition 保存观测／预测／公告类别、地理与主体适用范围、事件及生效区间、公开可用与获取时间、来源、版本、冲突和不确定性。政策须匹配辖区、业务／品类、适用主体和生效／撤销时间。假日、节庆、当地营业与银行营业日分别记录，不能假定所有国家、组织或业务同步停工。

文化输入仅限可观察且有依据的经营日历、需求季节性、营业／支付实践或具体交付约定，不把国籍、宗教或文化概括转成诚信／能力分数。安全条件按已报告事件、地点、时段、影响类型与证据状态处理；抗议、通行中断、暴力、盗窃和延误是不同断言。

### 交易对手的能力与历史

CounterpartyHistory 记录对应主体及角色、承诺／义务、时期、证据、事件状态、结果／解决情况与统计分母。经核实违约、正在争议、单方投诉和未查明情况分开；供应商、承运商、客户等角色的历史不能互相替代。没有负面记录只表示现有覆盖未见记录，不证明表现良好；不得生成“坏历史”黑名单。

### 假设演示与数据不足

法国某地抗议影响一段货运路线仅作为明确标记的假设 fixture，不代表已核实的当前事件。先检查实际路线、时段和官方／运营通行证据；条件不足时返回 insufficient_data。可比较改道、改期、换方式、缓冲与替代对手，说明成本和假设，不执行真实行动。


---



<!-- END_ZH_SECTION 3 -->

### English Translation / 英文翻译

<!-- BEGIN_EN_SECTION 3 -->
## 3 Dependency Exposure and External Operating Conditions

### FR16 Actual Applicability of the Four Input Layers

Internal records define business objects and resources. The counterparty layer supplies roles, capability, capacity and evidence-supported history. The dependency layer specifies which routes, nodes, counterparties, equipment, roles or banks the business actually uses. The conditions layer supplies weather, policy, calendars, operating practices and security information for the corresponding location/entity and time. Without an exposure mapping, an external event can only be a lead requiring verification, not a direct business impact.

### Routes and Spatial/Temporal Exposure

Route/RouteLeg retain origins and destinations, legs and nodes, roads/ports/borders, carriers, transport modes, planned passage windows/transit times and feasible alternatives. Exposure connects orders, materials, invoices, tasks or resources to specific dependencies, impact windows and mapping evidence. Passability conditions must match the leg, direction and time; a country-level event cannot establish that a particular route is closed.

The same condition can affect the four directions through different mechanisms: a detour changes fulfilment time and transport cost; logistics delays may affect post-receipt payment milestones; holidays change banking days and service clocks; festival demand or operating hours change inventory, food write-offs and energy consumption. Every propagation requires business relationships and applicable rules, not temporal co-occurrence alone.

### Weather, Policies, Calendars and Operating Practices

OperationalCondition retains the observation/forecast/announcement category, geographic and entity applicability, event and effective intervals, public-availability and acquisition times, sources, versions, conflicts and uncertainty. Policies must match the jurisdiction, business/product category, applicable entities and effective/withdrawal times. Holidays, festivals, local operating days and banking days are recorded separately; do not assume that all countries, organizations or businesses stop operating together.

Cultural inputs are restricted to observable and supported operating calendars, demand seasonality, operating/payment practices or specific delivery agreements. Do not turn generalizations about nationality, religion or culture into integrity/capability scores. Security conditions use reported events, locations, times, impact types and evidence status. Protests, access disruption, violence, theft and delays are distinct assertions.

### Counterparty Capability and History

CounterpartyHistory records the relevant entity and role, commitments/obligations, period, evidence, event status, outcome/resolution and statistical denominators. Separate verified breaches, ongoing disputes, unilateral complaints and unresolved matters. History in supplier, carrier, customer and other roles is not interchangeable. No negative records means only that none were found within the existing coverage, not proof of good performance. Do not generate a ‘bad history’ blacklist.

### Hypothetical Demonstration and Insufficient Data

A protest in part of France affecting a freight-route leg is only a clearly labeled hypothetical fixture, not a verified current event. First check the actual route, time and official/operational evidence of passability. Return insufficient_data when conditions are insufficient. Compare rerouting, retiming, mode changes, buffers and alternative counterparties, explaining costs and assumptions without executing real actions.
<!-- END_EN_SECTION 3 -->

---

<a id="section-4"></a>

### 中文原文 / Original Chinese

<!-- BEGIN_ZH_SECTION 4 -->
## 4 完整用户路径与相互影响

### J1 供应库存与履约负责人

设定组织、订单／物料、地区与时间 → 核查库存、交易对手历史、实际路线和经营条件 → 确认受影响订单与缺口 → 定义资金／容量／通行约束 → 比较不行动、规则补货、改道／改期及候选策略 → 人工选择并保存依据。返回资料页保留筛选、分页和焦点。未知库存、需求或暴露映射时限定为线索，不能伪造影响。

### J2 采购与财务负责人

进入采购／发票／回款队列 → 区分到期、缺失与阻塞 → 沿主键核查收货、审批、付款／收款及交易对手历史 → 检查物流依赖、适用政策与银行营业日 → 查看当时已知状态 → 设置资金、到期与资源约束 → 比较催办、补件、次序和可行改期 → 记录决定。系统不自动催款或付款。

### J3 服务流程负责人

选择请求／流程 → 核查步骤依赖、岗位能力／可用性、现场通行与经营日历 → 查看服务承诺／处理时限及暂停／取消规则 → 定位瓶颈 → 比较合资格改派、排程和升级 → 查看其他任务的挤占 → 保存决定。未完成结果保留删失，不把当前状态当最终结果。

### J4 资源管理负责人

选择能源、食物或资源 → 核查消耗、产出、损耗与供应／冷链能力 → 检查运输暴露、天气、营业／节庆需求和政策 → 设置产能、保质期、安全与服务约束 → 比较批量、周转、节能排程或运输替代 → 查看减损及其他方向影响 → 人工决定。仅价格资料不能证明能耗浪费。

### 跨问题的业务连接与取舍

四类问题只通过可靠业务主键或有证据的关系连接，例如 order_id、purchase_order_id、invoice_id、task_id、SKU／resource_id 与稳定主体标识。仅同名、同时发生或新闻同现不能创建业务依赖。链路缺失时显示“尚未建立关系”，允许用户核查。

行动比较必须呈现共同预算与取舍：加急补货可能增加现金占用；延后处理付款可能影响供应；改派人员可能转移服务延误风险；较大批量可能增加库存或报废。上述是待验证的情景机制，不能直接充当已观测因果结论。相同资源不能在多个方案中重复分配。

### 每次决定都保留的上下文

记录问题范围、业务对象、证据版本、主体与关系、knowledge_as_of、世界时间、目标与权重、硬约束、候选行动、基线、未知和假设。用户能核查来源、更换条件、比较方案，并否决系统建议。数据不足时给出缺失字段和可继续的有限路径。


---



<!-- END_ZH_SECTION 4 -->

### English Translation / 英文翻译

<!-- BEGIN_EN_SECTION 4 -->
## 4 Complete User Journeys and Interactions

### J1 Supply, Inventory and Fulfilment Lead

Set the organization, order/material, geography and time → verify inventory, counterparty history, actual routes and operating conditions → confirm affected orders and gaps → define funding/capacity/passability constraints → compare no action, rule-based replenishment, rerouting/retiming and candidate policies → make a human choice and save its evidence. Preserve filters, pagination and focus on returning to information pages. Unknown inventory, demand or exposure mappings limit the output to leads; do not fabricate impacts.

### J2 Procurement and Finance Lead

Enter the procurement/invoice/collections queue → distinguish due status, missing data and blockages → follow business keys to verify receipts, approvals, payments/collections and counterparty history → check logistics dependencies, applicable policies and banking days → view the state known at the time → set funding, deadline and resource constraints → compare follow-up, documentation, sequencing and feasible retiming → record the decision. The system does not automatically send collection reminders or make payments.

### J3 Service-Process Lead

Select a request/process → verify step dependencies, role capability/availability, on-site access and operating calendars → inspect service commitments/processing deadlines and pause/cancellation rules → locate bottlenecks → compare qualified reassignment, scheduling and escalation → inspect displacement of other tasks → save the decision. Preserve censoring for incomplete outcomes; do not treat the current state as the final result.

### J4 Resource-Management Lead

Select energy, food or resources → verify consumption, output, losses and supply/cold-chain capability → check transport exposure, weather, operating/festival demand and policies → set capacity, shelf-life, safety and service constraints → compare batch size, rotation, energy-saving schedules or transport alternatives → inspect waste reduction and effects on other directions → make a human decision. Price data alone cannot establish energy waste.

### Business Connections and Trade-offs Across Problems

Connect the four problem types only through reliable business keys or evidence-supported relationships, such as order_id, purchase_order_id, invoice_id, task_id, SKU/resource_id and stable entity identifiers. A shared name, simultaneous occurrence or news co-occurrence does not create a business dependency. If a link is missing, show ‘Relationship not yet established’ and allow verification.

Action comparisons must present shared budgets and trade-offs: expedited replenishment may tie up more cash; delayed payment processing may affect supply; staff reassignment may transfer service-delay risk; larger batches may increase inventory or write-offs. These are scenario mechanisms requiring validation, not observed causal conclusions. The same resources cannot be allocated repeatedly across plans.

### Context Retained for Every Decision

Record the problem scope, business objects, evidence versions, entities and relationships, knowledge_as_of, world time, objectives and weights, hard constraints, candidate actions, baselines, unknowns and assumptions. Users can verify sources, change conditions, compare plans and reject recommendations. When data are insufficient, show missing fields and the limited path that can still proceed.
<!-- END_EN_SECTION 4 -->

---

<a id="section-5"></a>

### 中文原文 / Original Chinese

<!-- BEGIN_ZH_SECTION 5 -->
## 5 情报与正式产品工作台

### FR05 证据采集筛选组织与 RAG

多源资料必须保留来源、定位、发布／获取时间、版本、许可与使用限制。检索、摘要和解释必须附可定位证据、适用时点、冲突与缺口。事实、来源观点、机器推断、预测与未知分开；没有找到不等于不存在。运营记录也要记录来源与质量，不能因其来自用户而免于核查。

交易对手历史、实际依赖／暴露与外部经营条件是核心状态输入，不仅是阅读背景。通过来源支持的主体、业务、空间及时间映射连接内部记录；一国 GDP、新闻数量或政治事件仍不能单独证明某个订单、发票或任务的影响。

### FR06 四类信息页面

| 页面名称 | 内容与边界 |

| --- | --- |

| 基础资料 | 主体身份、分类、稳定属性、别名、关系与来源；歧义可见。 |

| 状态与数值 | 库存、金额、时长、消耗等观测值；保留单位、频率、窗口和质量。 |

| 事件与变化 | 动作、变更、公告、实施、撤回及时间线；区分多种时钟。 |

| 解释与预期 | 解释、观点、预测、情景、策略、假设、置信与适用范围；不写成事实。 |



这四页是信息分类，与四类经营问题不同。统一风险／决策工作区可按四类问题筛选，复用上述资料与证据视图，无需扩展为八套彼此孤立的页面。查询、地区、时间与证据上下文共享；分页、返回位置和焦点须保留。表格、时间线、关系结构和文本阅读须按来源及任务选择。

正式前端采用克制的虚实解构黑白灰与精密结构线，服务阅读、核查和比较。视觉验收以信息层级、操作可理解性和来源可达性为主；不采用 PPT、游戏界面或电影式地球作为主要交互。

### 全球情报与历史覆盖目标

覆盖目标保留全球国家、主要政治组织、主要企业、中小企业趋势及独角兽，领域包括法律、政策、文化、汇率、期货、经济、就业、市场与人才。它们是四类经营问题可用的情报维度，不是新的主用户或另一个产品。

须公开主体类别 × 地区 × 领域 × 信息类型 × 年份 × 来源质量的覆盖矩阵，标明已验收、部分覆盖和缺口。最低历史范围是 2020 年至今，优先向 1990 年延伸。最低时间范围不等于声称每个主体和领域都有完整记录；扩展路线必须显式保留，不能以现有数据集代替目标范围。


---



<!-- END_ZH_SECTION 5 -->

### English Translation / 英文翻译

<!-- BEGIN_EN_SECTION 5 -->
## 5 Intelligence and the Formal Product Workbench

### FR05 Evidence Collection, Filtering, Organization and RAG

Multi-source information must retain sources, locators, publication/acquisition times, versions, licenses and usage restrictions. Retrieval, summaries and explanations must include locatable evidence, applicable times, conflicts and gaps. Separate facts, source opinions, machine inferences, forecasts and unknowns; not finding something does not mean it does not exist. Operational records also require provenance and quality information; user-supplied records are not exempt from verification.

Counterparty history, actual dependencies/exposure and external operating conditions are core state inputs, not merely reading context. Connect them to internal records through source-supported entity, business, spatial and temporal mappings. A country's GDP, news volume or political events still cannot alone establish impacts on a particular order, invoice or task.

### FR06 Four Information Pages

| Page name | Content and boundaries |
| --- | --- |
| Basic Information | Entity identity, classification, stable attributes, aliases, relationships and sources; ambiguities remain visible. |
| State and Metrics | Observed inventory, amounts, durations, consumption and other values; retain units, frequency, windows and quality. |
| Events and Changes | Actions, changes, announcements, implementation, withdrawal and timelines; distinguish the clocks. |
| Explanations and Expectations | Explanations, opinions, forecasts, scenarios, policies, assumptions, confidence and scope of validity; do not present them as facts. |

These four pages classify information, not the four operational problems. A unified risk/decision workspace can filter by the four problem types and reuse the information and evidence views; it need not become eight isolated page sets. Share query, geography, time and evidence context; preserve pagination, return position and focus. Choose tables, timelines, relationship structures and text views according to the source and task.

The formal frontend uses restrained Xushi Deconstruction styling in black, white and gray with precise structural lines, supporting reading, verification and comparison. Visual acceptance primarily considers information hierarchy, understandable interaction and access to sources. Do not use a slide presentation, game interface or cinematic globe as the main interaction.

### Global Intelligence and Historical Coverage Goals

Coverage goals retain countries worldwide, major political organizations and companies, SME trends and unicorns, spanning law, policy, culture, foreign exchange, futures, the economy, employment, markets and talent. These are intelligence dimensions supporting the four operational problems, not a new primary user or a separate product.

Publish a coverage matrix across entity type × geography × domain × information type × year × source quality, marking accepted coverage, partial coverage and gaps. The minimum historical range is 2020 to the present, prioritizing extension back to 1990. A minimum time range does not claim complete records for every entity and domain. Keep the expansion path explicit; existing datasets cannot substitute for target coverage.
<!-- END_EN_SECTION 5 -->

---

<a id="section-6"></a>

### 中文原文 / Original Chinese

<!-- BEGIN_ZH_SECTION 6 -->
## 6 实体轴 时间轴与历史标签

### FR07 自动主体消歧与证据关系融合

企业、政府、政党及国际组织使用稳定 entity_id，保存带有效期的名称、别名、外部标识、辖区和组织变化。消歧输出候选、证据与歧义状态；证据不足时拒绝强制合并。须测试同名、跨语种、改名、子母公司、政府任期、组织拆并与继承。

关系须有类型、方向、有效区间、证据及冲突状态。“同现”“所有权”“供应”“经过路线”“依赖收货／银行日历”不能混用。路线节点、场所、交易对手及岗位资源须稳定标识；暴露引用真实业务 ID 和分段／时间窗口。来源明示与推断分开，合并、拆分或修订留痕；新闻不生成业务主键。

### FR08 多时钟 as of 状态重建与回放

分别保存事件、影响、发布、获取、有效与修订时间；未知保留为空，记录粒度和来源时区。事件／有效时间可为区间，不能用一个日期替代全部时钟。查询同时指定 knowledge_as_of 与 world_time／区间。

knowledge_mode 必须明确：public_known 使用可证明的历史公开可用时间；system_known 使用系统实际 acquired_at。今天获取的旧文章不能伪称当年系统已持有。只有发布日期、无法证明历史可用性的记录标为 availability_proxy，严格回测排除或单独报告。

状态只使用截止 knowledge_as_of 可用的版本，并校验 world_time 时的实际有效性：路线条件、政策生效、经营／银行日历、对手历史与岗位资质均适用。后来的修订、撤回及结果不能进入当时输入。回放显示变化、冲突、适用性和缺口，可在冻结快照上复核。

### FR09 环境 主体动作 结果记录

数据集须系统收集企业、政府、政党与国际组织的历史环境、主体动作和结果，支撑世界状态与决策学习，不以少数案例代替。各业务方向还须保留对应订单、单据、任务或资源记录及其映射。

动作至少区分 announced、implemented、reversed 与 unknown；结果至少区分 observed、estimated、proxy 与 unknown。每项结果记录指标、单位、测量窗口、观察结束、修订和删失。实际付款／收款、任务完成、物理消耗等必须使用相应观测，不能用邻近字段代替。

缺少结果不是负面结果；事件之后发生不证明由该动作造成。标签须注明因果地位与使用限制，禁止从简单事后关联直接赋予因果奖励。历史环境只使用当时已知资料，跨主体／集团分组并按时间隔离训练与测试。

### 观察事实与反事实分离

历史已观测结果、估计／代理标签及反事实仿真输出使用不同标记。若只有假设转移模型，输出只能解释为该模型下的情景结果。资料回放、RAG 正确或界面可用均不能独立证明未来预测或 RL 策略质量。


---



<!-- END_ZH_SECTION 6 -->

### English Translation / 英文翻译

<!-- BEGIN_EN_SECTION 6 -->
## 6 Entity Axis, Time Axis and Historical Labels

### FR07 Automatic Entity Disambiguation and Evidence-Based Relationship Fusion

Companies, governments, political parties and international organizations use stable entity_id values. Retain time-valid names, aliases, external identifiers, jurisdictions and organizational changes. Disambiguation returns candidates, evidence and ambiguity status; refuse forced merging when evidence is insufficient. Tests must cover identical names, multiple languages, renaming, parent/subsidiary relationships, government terms, splits/mergers and succession.

Relationships require types, directions, valid intervals, evidence and conflict status. Do not conflate ‘co-occurrence,’ ‘ownership,’ ‘supply,’ ‘traverses route’ or ‘depends on receipt/banking calendar.’ Route nodes, locations, counterparties and role resources require stable identifiers. Exposure references real business IDs and route-leg/time windows. Separate explicit source statements from inferences; retain merge, split and revision history. News does not generate business keys.

### FR08 Multi-Clock As-of State Reconstruction and Replay

Store event, impact, publication, acquisition, effective and revision times separately. Unknown values remain null; record precision and source time zone. Event/effective times may be intervals; a single date cannot substitute for all clocks. Queries specify both knowledge_as_of and world_time/an interval.

knowledge_mode must be explicit: public_known uses provable historical public availability; system_known uses the system's actual acquired_at. An old article acquired today cannot be represented as having been held by the system at that historical time. Records with only a publication date and no proof of historical availability are marked availability_proxy and excluded from strict backtests or reported separately.

Use only versions available by knowledge_as_of, and verify actual validity at world_time. This applies to route conditions, policy effectiveness, operating/banking calendars, counterparty history and role credentials. Later revisions, withdrawals and outcomes cannot enter the historical input. Replay displays changes, conflicts, applicability and gaps and is verifiable on frozen snapshots.

### FR09 Environment, Actor Action and Outcome Records

The dataset must systematically collect historical environments, actor actions and outcomes for companies, governments, political parties and international organizations, supporting world states and decision learning rather than a handful of case studies. Each operational direction also retains its corresponding orders, documents, tasks or resources and their mappings.

Action status distinguishes at least announced, implemented, reversed and unknown. Outcome status distinguishes at least observed, estimated, proxy and unknown. Every outcome records the metric, unit, measurement window, observation end, revisions and censoring. Actual payments/collections, task completion and physical consumption require their corresponding observations, not nearby substitute fields.

Missing outcomes are not negative outcomes. An event followed by an outcome does not establish causation. Labels must state their causal status and usage restrictions; simple post-event associations cannot directly produce causal rewards. Historical environments use only information known at the time, with entity/group-based grouping and temporal separation of training and testing.

### Separating Observations from Counterfactuals

Use distinct labels for historically observed outcomes, estimated/proxy labels and counterfactual simulation outputs. If only an assumed transition model is available, interpret outputs only as scenario outcomes under that model. Information replay, correct RAG or a usable interface cannot independently establish future-prediction or RL-policy quality.
<!-- END_EN_SECTION 6 -->

---

<a id="section-7"></a>

### 中文原文 / Original Chinese

<!-- BEGIN_ZH_SECTION 7 -->
## 7 岗位能力与运行安全

### FR17 管理者与工作人员的岗位约束

对管理者和实际执行工作的员工均使用岗位相关能力与可用性：合法授权提供的资质、培训、执照、岗位／设备操作权限、工作记录、班次、休息及可用时段。用于核查能否安全、合资格地执行某项任务，而非推断人格、私人可靠性或心理危险性。缺失记录不等于不合格；不可确定时保留不足状态。

### 工作事件与核查状态

仅处理合法授权且与岗位相关的工作事件，记录来源、日期、角色、调查状态、认定与处理／解决结果。单方指控、正在调查和已确认事实必须分开；禁止把未经核实“黑历史”变成个人评分或黑名单。私生活、家庭／朋友状况或私人社交关系不作为工作能力或安全标签。

### 以运行控制处理安全风险

可支持班次／休息与疲劳约束、岗位和权限核查、职责分离、双人复核、事件上报、应急替补及资源备份。建议需说明具体任务、约束与事实依据。不得由相关性或负面故事推断某个人会犯罪、酗酒、伤害他人或造成事故。

### 健康与敏感画像的明确边界

本产品不设计家庭／朋友／社交媒体的心理状态或危险性推断，不采集这些信息形成员工评价、私人可靠性分数、黑名单或自动就业决定。健康、家庭及私人关系标签不进入 RL 状态或员工评价；人工复核也不能使这些推断成为可接受功能。

岗位医学适任判断只能由有资格且获授权的专业人员处理。若合法提供必要岗位限制，本产品仅接收最小必要的任务／时段可用性限制，不接收原始诊断或私人原因；优化服务只见运行约束，不见健康标签。产品不宣称已符合全球全部劳动、隐私或行业法规。

### 输入及结果契约

在既有任务／资源对象中增加 role_id、所需资质／授权、证据有效期、可用时段、班次休息、必要运行限制与复核状态。个人映射及事件依据按最小权限隔离；给 WorldState／RL 的输入仅保留任务相关能力、可用性及约束。结果只描述某动作的可行／不可行及需补证事项，不输出人员道德或危险性排名。

### AC10 岗位与敏感字段边界

验证无有效授权不能分配受限任务、休息或双人复核约束不被绕过、资质修订符合 as-of 语义。敏感心理、健康、家庭和社交关系标签须被拒绝进入状态／评价；合法必要限制以不带诊断及私人原因的运行字段表达。错误或指控不自动触发招聘、辞退、晋升或其他就业决定。


---



<!-- END_ZH_SECTION 7 -->

### English Translation / 英文翻译

<!-- BEGIN_EN_SECTION 7 -->
## 7 Role Capability and Operational Safety

### FR17 Role Constraints for Managers and Workers

For managers and employees performing the work, use job-relevant capability and availability: lawfully authorized qualifications, training, licenses, role/equipment-operation permissions, work records, shifts, rest and available time windows. These verify whether a particular task can be performed safely and by a qualified person, rather than infer personality, private reliability or psychological dangerousness. Missing records do not establish lack of qualification; retain an insufficient-data state when qualification is uncertain.

### Work Incidents and Verification Status

Process only lawfully authorized, job-relevant work incidents. Record source, date, role, investigation status, findings and handling/resolution. Separate unilateral allegations, ongoing investigations and confirmed facts. Do not turn unverified ‘dark history’ into personal scores or blacklists. Private life, family/friend circumstances and private social relationships are not work-capability or safety labels.

### Addressing Safety Through Operational Controls

The product may support shift/rest and fatigue constraints, role and permission checks, segregation of duties, two-person review, incident reporting, emergency replacements and backup resources. Recommendations identify the specific task, constraints and factual basis. Do not infer from correlations or negative stories that a particular person will commit a crime, misuse alcohol, harm others or cause an accident.

### Explicit Boundaries on Health and Sensitive Profiling

The product does not design psychological-state or dangerousness inference from family, friends or social media, or collect this information for employee evaluations, private reliability scores, blacklists or automated employment decisions. Health, family and private-relationship labels do not enter RL states or employee evaluations. Human review does not make such inferences acceptable features.

Medical fitness-for-duty assessments are handled only by qualified, authorized professionals. If necessary job restrictions are lawfully provided, the product receives only the minimum necessary task/time availability restrictions, not raw diagnoses or private reasons. Optimization services see operational constraints, not health labels. The product does not claim compliance with every labor, privacy or industry law worldwide.

### Input and Output Contracts

Extend existing task/resource objects with role_id, required qualifications/authorization, evidence validity, availability windows, shifts/rest, necessary operational restrictions and review status. Isolate personal mappings and incident evidence under least-privilege access. WorldState/RL inputs retain only task-relevant capability, availability and constraints. Outputs describe action feasibility/infeasibility and evidence still required, not rankings of people's morality or dangerousness.

### AC10 Role and Sensitive-Field Boundaries

Verify that restricted tasks cannot be allocated without valid authorization, rest/two-person-review constraints cannot be bypassed, and credential revisions follow as-of semantics. Reject sensitive psychological, health, family and social-relationship labels from states/evaluations. Express lawful necessary restrictions as operational fields without diagnoses or private reasons. Errors or allegations do not automatically trigger hiring, dismissal, promotion or other employment decisions.
<!-- END_EN_SECTION 7 -->

---

<a id="section-8"></a>

### 中文原文 / Original Chinese

<!-- BEGIN_ZH_SECTION 8 -->
## 8 风险 情景与受约束决策

### FR10 提前发现并解释经营风险

每条风险记录问题类别、受影响业务对象／主体、指标、证据、首次可发现时间、预测窗口、可能影响、置信与触发条件。明确分开 observation 已观测状态、anomaly 异常、prediction 预测与 recommendation 建议；来源意见另行标记。优先级依据业务重要性、可信性和可行动性；损失模型缺失时只展示线索，不虚构金额。

系统说明依据、缺失与失效条件；经营输入、暴露、条件适用性或标签不足时返回限定的 insufficient_data，不冒充质量达标。跨问题传播须沿已验证业务、路线与时间依赖。国家抗议不等于路线关闭，路线关闭也不自动证明暴力、盗窃或最终延误。

### FR11 同一状态下比较行动与取舍

输入固定 as-of 的四层状态、岗位运行约束、目标、动作与预算；输出收益／损失、成本、可行性、跨问题影响、假设和敏感性。动作包括改道、改期、换方式、缓冲、替代对手、处理次序与合资格改派。保留不行动／规则基线及适用的简单规划；条件改变后重算。

不允许库存、资金、人员或设备资源重复使用；不能推荐违反合同、容量、截止时间或安全要求的动作。不可行、数据不足或模型不支持的动作返回明确状态。观察事实与反事实结果分别显示，历史模拟不得宣传为已验证未来预测。

### FR12 Felix 的 RL 沙盘与策略服务

RL 是已选路线，必须明确状态 S、动作 A、转移 T、奖励 R、硬约束 C、终止与可行性。S 包含冻结的业务、对手能力／历史、路线暴露、经营条件和岗位运行字段；不含心理、健康、家庭或私人关系标签。T 区分观测规律与情景假设；R 的单位／权重对应经营目标；C 包含通行、生效规则、日历、容量、资金、资质、休息与必要复核。

服务必须说明训练动作支持范围、行为数据缺失、分布偏移、转移假设与奖励代理。先验证不行动、规则或简单规划，以及仿真可信性，再评估 RL 的增益。现金、履约、服务承诺／处理时限和浪费的权重取舍必须可审阅，不能把任意分数包装成业务收益。

历史离线评估和仿真须报告支持度、不可识别性及不确定性。不具备可信反事实评估时，只报告模拟结果。没有足够动作／结果数据时保留可使用的基线比较，明确 RL 暂不适用。

### FR13 人工选择与可复查决定

用户可以更换条件、查看基线、暂缓或否决建议。每次选择记录证据快照、对象与状态版本、目标、约束、候选行动、策略版本和假设。当前产品的决策闭环止于人的选择与依据保存，不自动执行真实下单、付款、交易、政策发布或第三方沟通。

### 不能用展示代替验证

来源可查证明证据链；实体／时间测试证明结构可信；风险回测证明有限范围内的预警表现；策略评估证明有限假设下的比较结果。每一种结论都必须对应自己的验证证据，不能互相替代。


---



<!-- END_ZH_SECTION 8 -->

### English Translation / 英文翻译

<!-- BEGIN_EN_SECTION 8 -->
## 8 Risk, Scenarios and Constrained Decisions

### FR10 Early Detection and Explanation of Operational Risk

Each risk record identifies the problem category, affected business objects/entities, metric, evidence, earliest discoverable time, prediction window, potential impact, confidence and trigger conditions. Explicitly separate observation, anomaly, prediction and recommendation; label source opinions separately. Prioritize by business importance, credibility and actionability. If a loss model is missing, show leads only, without invented monetary values.

Explain the basis, missing data and failure conditions. If operational inputs, exposure, condition applicability or labels are insufficient, return a scoped insufficient_data result rather than pretend quality criteria are met. Cross-problem propagation follows verified business, route and temporal dependencies. A protest in a country does not imply a route closure, and a route closure does not automatically establish violence, theft or eventual delay.

### FR11 Comparing Actions and Trade-offs from the Same State

Inputs are a fixed as-of four-layer state, role-operation constraints, objectives, actions and budget. Outputs include gains/losses, costs, feasibility, cross-problem effects, assumptions and sensitivity. Actions include rerouting, retiming, mode changes, buffers, alternative counterparties, processing order and qualified reassignment. Retain no-action/rule baselines and applicable simple-planning baselines; recompute when conditions change.

Do not use inventory, money, staff or equipment resources more than once. Do not recommend actions violating contracts, capacity, deadlines or safety requirements. Explicitly identify infeasible actions, insufficient data or model-unsupported actions. Display observed facts and counterfactual results separately. Historical simulations must not be promoted as validated predictions of the future.

### FR12 Felix's RL Sandbox and Policy Service

RL is the selected technical approach. Define state S, action A, transition T, reward R, hard constraints C, termination and feasibility. S includes frozen business data, counterparty capability/history, route exposure, operating conditions and role-operation fields; it excludes psychological, health, family and private-relationship labels. T distinguishes observed regularities from scenario assumptions. R's units/weights reflect business objectives. C includes passability, effective rules, calendars, capacity, funds, qualifications, rest and required review.

State the supported training-action range, missing behavioral data, distribution shift, transition assumptions and reward proxies. Validate no action, rules or simple planning and simulation credibility before evaluating RL gains. Trade-off weights for cash, fulfilment, service commitments/processing deadlines and waste must be reviewable. Arbitrary scores cannot be packaged as business benefits.

Historical offline evaluation and simulation report support, non-identifiability and uncertainty. Without credible counterfactual evaluation, report only simulated results. If action/outcome data are insufficient, retain usable baseline comparisons and explicitly state that RL is not currently applicable.

### FR13 Human Choice and Reviewable Decisions

Users may change conditions, inspect baselines, defer or reject recommendations. Each choice records evidence snapshots, object/state versions, objectives, constraints, candidate actions, policy versions and assumptions. The current product workflow ends with human choice and saved rationale; it does not automatically execute real orders, payments, trades, policy publication or third-party communications.

### Demonstration Cannot Substitute for Validation

Traceable sources establish the evidence chain; entity/time tests establish structural soundness; risk backtests establish warning performance within a limited scope; policy evaluation establishes comparison results under limited assumptions. Each conclusion requires its own validation evidence. These forms of evidence are not interchangeable.
<!-- END_EN_SECTION 8 -->

---

<a id="section-9"></a>

### 中文原文 / Original Chinese

<!-- BEGIN_ZH_SECTION 9 -->
## 9 四个后端模块与拟议契约

本规格 v0.3 拟议使用契约版本 0.2，承接前稿契约 0.1，增加核心经营条件与运行资源字段；版本号独立，不声称已有 API。四模块支撑四类问题，共用正式前端。

| 模块 | 职责与输出 | 拟议服务调用 |

| --- | --- | --- |

| M1 情报 | 采集／筛选／组织／RAG；Evidence、Claim 与覆盖／质量信息 | query_evidence(query, filters, knowledge_as_of) → 分页证据与声明 |

| M2 实体 | 自动消歧与证据关系融合；Entity、Relation、歧义与冲突 | resolve_entities(mentions, knowledge_as_of)；fuse_relations(claim_refs) |

| M3 时间 | 历史 as-of 世界状态、环境动作结果与回放；WorldState、EAORecord | reconstruct_state(scope, knowledge_as_of, world_time, knowledge_mode)；replay(interval) |

| M4 决策 | 基线／情景／RL 策略比较；ScenarioRun、PolicyComparison | compare_policies(state_ref, objectives, constraints, actions) |



### 公共信封与对象标识

信封包括 schema_version、request_id、input_refs、knowledge_as_of、world_time、knowledge_mode、data_revision、status、warnings，不使用模糊 as_of。状态为 ok、partial、insufficient_data、unsupported；保留单位、时区与窗口，未知不造默认值。

稳定标识包括 evidence_id、claim_id、entity_id、relation_id、state_id、record_id、run_id、comparison_id，以及已有的 order_id、purchase_order_id、invoice_id、task_id、resource_id。引用必须可解析到具体版本；不能按显示名称关联业务。

### 最小对象字段

Evidence／Claim 保留来源、定位、多时钟、可用性、权利、断言类型与证据。Entity／Relation 保留标识、类型、有效期及冲突。新增最小对象复用同一证据／时间信封：Route／RouteLeg 包含起终点／节点、模式／承运商、计划时段及替代；Exposure 包含业务引用、依赖引用、暴露窗口与映射证据。

OperationalCondition：条件类型、空间／主体范围、生效区间、适用规则、观测／预测／公告状态、证据及不确定性。CounterpartyHistory：主体及角色、承诺／义务、时期、指控／争议／核实状态、结果／解决情况、样本分母与证据。岗位能力／可用性扩展既有资源对象，不另建私人画像接口。

WorldState 引用业务、主体、路线／条件／暴露、对手历史及最小岗位约束，保留双时点／知识模式、适用性、缺口与修订。EAORecord 保留环境引用、主体动作、多时钟、结果单位／窗口、标签状态与删失。

ScenarioRun：state_ref、动作集、目标、约束、假设、模型版本、随机种子与输出。PolicyComparison：运行与基线引用、指标、单位、收益／损失范围、约束检查、适用范围和不确定性。

### 独立开发与集成规则

先冻结契约及四方向代表性 fixture，各模块可使用契约样本并行开发。fixture 标记为样本，不能作为真实经营结果展示。所有接口变更版本化，提供契约测试与可运行示例；共同核查 ID、时间、单位、错误及缺失语义。前端按模块状态渐进接入，服务失败仍能查看证据和基线。


---



<!-- END_ZH_SECTION 9 -->

### English Translation / 英文翻译

<!-- BEGIN_EN_SECTION 9 -->
## 9 Four Backend Modules and Proposed Contracts

Specification v0.3 proposes contract version 0.2, following the previous draft's contract 0.1 and adding core operating-condition and operational-resource fields. Contract and specification versions are independent; this does not claim that APIs already exist. The four modules support the four problem types through one formal frontend.

| Module | Responsibilities and outputs | Proposed service calls |
| --- | --- | --- |
| M1 Intelligence | Collection/filtering/organization/RAG; Evidence, Claim and coverage/quality information | query_evidence(query, filters, knowledge_as_of) → paginated evidence and claims |
| M2 Entities | Automatic disambiguation and evidence-based relationship fusion; Entity, Relation, ambiguity and conflicts | resolve_entities(mentions, knowledge_as_of); fuse_relations(claim_refs) |
| M3 Time | Historical as-of world state, environment-action-outcome records and replay; WorldState, EAORecord | reconstruct_state(scope, knowledge_as_of, world_time, knowledge_mode); replay(interval) |
| M4 Decisions | Baseline/scenario/RL policy comparisons; ScenarioRun, PolicyComparison | compare_policies(state_ref, objectives, constraints, actions) |

### Common Envelope and Object Identifiers

The envelope contains schema_version, request_id, input_refs, knowledge_as_of, world_time, knowledge_mode, data_revision, status and warnings; do not use an ambiguous as_of field. Status values are ok, partial, insufficient_data and unsupported. Retain units, time zones and windows; do not fabricate defaults for unknown values.

Stable identifiers include evidence_id, claim_id, entity_id, relation_id, state_id, record_id, run_id and comparison_id, together with existing order_id, purchase_order_id, invoice_id, task_id and resource_id. References must resolve to specific versions. Do not connect business records by display name.

### Minimum Object Fields

Evidence/Claim retain sources, locators, multiple clocks, availability, rights, assertion types and evidence. Entity/Relation retain identifiers, types, validity and conflicts. New minimum objects reuse the same evidence/time envelope: Route/RouteLeg include origins/destinations/nodes, mode/carrier, planned windows and alternatives; Exposure includes business references, dependency references, exposure windows and mapping evidence.

OperationalCondition includes condition type, spatial/entity scope, effective interval, applicability rules, observation/forecast/announcement status, evidence and uncertainty. CounterpartyHistory includes entity and role, commitment/obligation, period, allegation/dispute/verification status, outcome/resolution, sample denominator and evidence. Role capability/availability extends existing resource objects; do not create a separate private-profiling interface.

WorldState references business records, entities, routes/conditions/exposure, counterparty history and minimum role constraints, retaining the two time dimensions/knowledge mode, applicability, gaps and revisions. EAORecord retains environment references, actor actions, multiple clocks, outcome units/windows, label status and censoring.

ScenarioRun includes state_ref, action set, objectives, constraints, assumptions, model version, random seed and outputs. PolicyComparison includes run/baseline references, metrics, units, gain/loss ranges, constraint checks, scope of validity and uncertainty.

### Independent Development and Integration Rules

Freeze contracts and representative fixtures for the four directions first; modules may develop in parallel using contract samples. Mark fixtures as samples, not real operational results. Version every interface change and supply contract tests and runnable examples. Check IDs, times, units, errors and missing-value semantics together. Integrate modules progressively by service status; evidence and baselines remain viewable when a service fails.
<!-- END_EN_SECTION 9 -->

---

<a id="section-10"></a>

### 中文原文 / Original Chinese

<!-- BEGIN_ZH_SECTION 10 -->
## 10 验收 基线与完整性门槛

验收分为必须通过的完整性／功能门槛，以及待评审的质量提议。以下是测量设计，不是已实现结果。先冻结测试数据、规则、时间截点与基线；每次报告样本量、分组、置信区间和失败例。合成数据可证明限定的功能路径，不能替代真实预警／经营收益验证；缺输入或标签时质量验收为 insufficient_data。

| 验收 | 测量与基线 | 通过口径 |

| --- | --- | --- |

| AC01 供应履约 | 缺货误报／漏报、预警提前量、准时履约率、缺货量、库存占用与总成本；对比不行动及规则补货。 | 完整订单链可核查；库存／容量约束通过；收益结论注明真实观测或模拟。 |

| AC02 单据回款 | 逾期／阻塞识别、处理时长、到期未付／未收、现金峰值缺口；对比到期排序及固定处理规则。 | 单据／审批链可追溯；实际支付语义正确；未观测与未付款分开。 |

| AC03 服务流程 | 正式 SLA 违约／内部处理超时、等待与完成时长、超时量、资源占用；对比 FIFO／现有排程规则。 | 服务承诺／处理时限的计时可复核；依赖及资源可行；取消、暂停与删失不误标失败。 |

| AC04 经营浪费 | 单位产出耗能、损耗量／率、报废和费用；对比固定批量或现行资源规则。 | 至少一类实质浪费全链路；消耗／价格分离；减损动作及取舍可查看。 |



质量提议：同留出集、预算和约束下，成本加权损失不劣于基线；声称改善须报告差值及 95% 置信区间，跨零时不宣称已证明增益。业务成本与误报预算按主案例定标；小样本／合成数据只支持限定功能或仿真结论。

### AC05 证据与结果完整性

重要事实必须 100% 定位到证据版本，无来源事实零容忍。结果有类型、单位、窗口及观察状态；缺失不作负例，事后关联不作因果奖励。

### AC06 实体与时间可信性

盲测同名、改名、跨语种、拆并／冲突，报告 precision／recall、误合并、关系支持与拒判覆盖，对比字符串基线。时序金样本／对抗修订未来泄漏为零，覆盖晚发布／获取、撤回、时区和日期区间。

### AC07 预警与策略有效性

按主体／集团及时间隔离并滚动回测，防重复跨集。风险报告误报／漏报、提前量、校准与成本；策略对比不行动、规则、规划及 RL，报告收益分布、敏感性和支持度。硬约束违反为零，未验证仿真不作真实收益承诺。

### AC08 可使用的一体化路径

前三方向走通证据 → 四层状态 → 风险 → 行动／基线 → 人工选择；第四有实质减损入口。分页／焦点正确，缺失可恢复。固定环境报告 p50／p95；普通查看 p95 ≤ 3 秒为提议，长任务有进度。

### AC09 依赖 条件与历史适用性

测试路线／时段暴露、抗议／通行／暴力／盗窃的分离、政策／假日对业务及银行时钟的适用性、晚公布／修订泄漏。历史保留角色、状态、结果、时期与分母；无记录不输出“表现良好”。

AC10 岗位约束与敏感字段边界按第 7 节测试，不构成全球法律合规认证。


---



<!-- END_ZH_SECTION 10 -->

### English Translation / 英文翻译

<!-- BEGIN_EN_SECTION 10 -->
## 10 Acceptance, Baselines and Integrity Gates

Acceptance comprises mandatory integrity/functional gates and quality proposals pending review. The following is an evaluation design, not achieved results. Freeze test data, rules, temporal cutoffs and baselines first. Every report includes sample size, groups, confidence intervals and failure cases. Synthetic data can establish a limited functional path but cannot replace validation of real warnings/operational benefits. With missing inputs or labels, quality acceptance is insufficient_data.

| Acceptance | Measurements and baselines | Passing criteria |
| --- | --- | --- |
| AC01 Supply fulfilment | Shortage false positives/false negatives, warning lead time, on-time fulfilment, shortage quantity, inventory tied up and total cost; compare no action and rule-based replenishment. | The complete order chain is verifiable; inventory/capacity constraints pass; benefit claims distinguish real observations from simulations. |
| AC02 Documents and collections | Overdue/blockage detection, processing time, payments/collections outstanding when due and peak cash gap; compare due-date ordering and fixed processing rules. | Document/approval chains are traceable; actual-payment semantics are correct; unobserved and unpaid are distinct. |
| AC03 Service processes | Formal SLA breaches/internal processing overruns, waiting/completion time, overrun quantity and resource usage; compare FIFO/current scheduling rules. | Service-commitment/processing-deadline clocks are verifiable; dependencies/resources are feasible; cancellation, pausing and censoring are not mislabeled failures. |
| AC04 Operational waste | Energy per unit of output, loss quantity/rate, write-offs and costs; compare fixed batches or current resource rules. | At least one substantive waste type has an end-to-end workflow; consumption/price are separate; reduction actions and trade-offs are viewable. |

Quality proposal: with the same holdout set, budget and constraints, cost-weighted loss should be no worse than the baseline. Claims of improvement report differences and 95% confidence intervals; if an interval crosses zero, do not claim demonstrated gains. Calibrate business costs and false-positive budgets against the main case. Small samples/synthetic data support only limited functional or simulation conclusions.

### AC05 Evidence and Outcome Integrity

Important facts must be 100% locatable to evidence versions, with zero tolerance for unsupported facts. Outcomes have types, units, windows and observation status. Missing data are not negative labels; post-event associations do not create causal rewards.

### AC06 Entity and Temporal Soundness

Blind-test identical names, renaming, multiple languages and splits/mergers/conflicts. Report precision/recall, incorrect merges, relationship support and abstention coverage against a string-matching baseline. Temporal gold cases/adversarial revisions must have zero future leakage, covering late publication/acquisition, withdrawal, time zones and date intervals.

### AC07 Warning and Policy Effectiveness

Separate entities/groups and time and use rolling backtests to prevent duplicates across splits. Risk reports include false positives/false negatives, lead time, calibration and cost. Compare no action, rules, planning and RL; report gain distributions, sensitivity and support. Hard-constraint violations must be zero; unvalidated simulation cannot support real-benefit promises.

### AC08 Usable Integrated Journeys

The first three directions cover evidence → four-layer state → risk → action/baseline → human choice; the fourth provides a substantive waste-reduction entry point. Pagination/focus are correct, and missing-data states are recoverable. Report p50/p95 in a fixed environment. A p95 of at most 3 seconds for ordinary viewing is a proposal; long-running tasks display progress.

### AC09 Applicability of Dependencies, Conditions and History

Test route/time exposure; separation of protests/passability/violence/theft; policy/holiday applicability to business and banking clocks; and late-publication/revision leakage. History retains role, status, outcome, period and denominator. No records must not produce ‘good performance.’

AC10 role constraints and sensitive-field boundaries are tested according to Section 7; this is not certification of worldwide legal compliance.
<!-- END_EN_SECTION 10 -->

---

<a id="section-11"></a>

### 中文原文 / Original Chinese

<!-- BEGIN_ZH_SECTION 11 -->
## 11 安全 分阶段交付与批准项

### FR14 数据权利 隐私与安全

按来源权限、许可与最小必要原则使用，保留限制及版本，不擅自公开受限资料。私有运营数据在授权范围内隔离访问、导出和删除，明确保留期限。减少个人信息，禁入凭据；外部内容不得改写指令或触发行动。竞赛原型仍须遵守这些边界。

### FR15 可复现性

冻结数据、划分、配置、代码／模型版本、种子与运行记录，保留修订、缺失和删失，结果可复查。非确定输出报告容差；检索／界面不能替代预测／决策验证。

### 目标规格与竞赛可运行范围

S0 完整目标保留四方向、全球覆盖及实体／时间／决策能力，新增 FR 不等于即时派工。已确认先完善规格，再开发专为 hackathon 展示的产品；下述实际交付范围仍是待批准草案。审批前不上传 GitHub。

S1a 先做一条真实可运行的最小后端闭环：加载真实快照 → 检索 → 定位证据 → 分析与保存，配合正式可交互前端及限定情景比较。体现四层输入与必要岗位约束，缺失显式标记。S1b 仍以前三完整闭环、第四实质减损入口为竞赛基线目标，不以单方向代替。

S2／S3 目标能力逐步接入消歧／关系、历史重建／回放、覆盖与回测，以及验证后的 RL／敏感性报告。竞赛只对冻结主体、时期、数据与场景声明能力；预计算／样本须标明，不能伪装在线算法或已验证预测。全球与 1990 年扩展目标保留。

竞赛要求不包含全面实时采集、完整全球历史、生产高可用、企业部署和持续运维；基础权利、隐私、证据、时间与运行约束不能因演示而省略。高级服务未就绪时保留可用基线及不足状态。

### 需求推导后的协作边界提议

用户与助手负责 M1 情报及统一正式前端；Felix 负责 M4 RL 沙盘与策略服务；已确认加入的另外两位队友分别承担 M2 实体轴、M3 时间轴，姓名待补。这是供负责人确认的模块接口建议，尚不构成派工。各模块交付可调用服务、契约测试与固定示例，共用 ID、时间、单位和评测规则。

### 展示及范围边界

主演示以供应中断 → 履约为入口，用可核查 ID 关联路线暴露、经营条件、对手历史及单据／现金／流程取舍，另示食物减损与假日影响。可加合资格改派／休息约束，不评价私生活。法国抗议货运情景仅为假设 fixture；不拼接无关公开数据冒充同一公司。缺真实业务链时合成数据仅验证功能，不证明收益。展示基线与未知；Babel Street 仅参考。

非目标：自动执行真实经营动作、伪造完整全球历史、仅凭关联获得因果奖励、招募 beta 用户、另起品牌或照搬商业产品。

### 负责人需要确认的决定

建议采用本稿四方向 PS 与目标用户，主路径为供应／单据／服务联动，第四先做食物批次。优先合法真实运营数据或真实公开基准；缺失跨业务链可用明确标记的合成 fixture 验证功能，不替代预测／收益验收。默认指标是履约延误、现金缺口、服务流程等待与报废量；金额需真实成本输入。

需冻结三项：竞赛数据／场景／约束；首阶段覆盖与全球／1990 年扩展次序；业务损失及质量预算。提议用案例主体与有证据关系冻结评测集，采用完整性门槛、基线不劣及 p95 提议；未定参数不作收益承诺。规格批准后才开发，不将评审建议自动派工。
<!-- END_ZH_SECTION 11 -->

### English Translation / 英文翻译

<!-- BEGIN_EN_SECTION 11 -->
## 11 Safety, Staged Delivery and Approval Decisions

### FR14 Data Rights, Privacy and Safety

Use data according to source permissions, licenses and data minimization. Retain restrictions and versions; do not disclose restricted information without authorization. Isolate access, export and deletion of private operational data within the authorized scope, with an explicit retention period. Minimize personal information and exclude credentials. External content must not rewrite instructions or trigger actions. The competition prototype still follows these boundaries.

### FR15 Reproducibility

Freeze data, splits, configuration, code/model versions, seeds and run records. Preserve revisions, missingness and censoring so results can be verified. Report tolerances for nondeterministic outputs. Retrieval/interfaces cannot substitute for prediction/decision validation.

### Target Specification and Runnable Competition Scope

S0 retains the complete target: four directions, global coverage and entity/time/decision capabilities. New FRs do not constitute immediate work assignments. The confirmed sequence is to refine specifications first, then develop a product specifically for hackathon demonstration. The actual delivery scope below remains a draft pending approval. Do not upload to GitHub before approval.

S1a first builds one genuinely runnable minimum backend workflow: load real snapshots → retrieve → locate evidence → analyze and save, paired with a formal interactive frontend and bounded scenario comparisons. Reflect the four input layers and necessary role constraints; label missing inputs explicitly. S1b still targets complete workflows for the first three directions and a substantive waste-reduction entry point for the fourth as the competition baseline, not a single-direction substitute.

S2/S3 progressively introduce target capabilities for disambiguation/relationships, historical reconstruction/replay, coverage/backtesting, and validated RL/sensitivity reporting. Competition claims are limited to frozen entities, periods, data and scenarios. Label precomputed outputs/samples; do not disguise them as online algorithms or validated forecasts. Retain global coverage and extension to 1990 as goals.

Competition requirements exclude comprehensive real-time collection, complete global history, production high availability, enterprise deployment and ongoing operations. Basic rights, privacy, evidence, temporal and operational constraints cannot be omitted for a demonstration. Retain usable baselines and insufficient-data states when advanced services are not ready.

### Proposed Collaboration Boundaries Derived from Requirements

The user and assistant own M1 intelligence and the unified formal frontend. Felix owns M4 RL sandbox and policy services. The two other confirmed teammates take M2 entity and M3 time modules respectively; names remain to be filled in. These are proposed module boundaries for owner confirmation, not work assignments yet. Each module delivers callable services, contract tests and fixed examples, sharing IDs, times, units and evaluation rules.

### Demonstration and Scope Boundaries

The main demonstration enters through supply interruption → fulfilment, using verifiable IDs to connect route exposure, operating conditions, counterparty history and document/cash/process trade-offs, with a separate food-waste reduction and holiday example. Qualified reassignment/rest constraints may be included without evaluating private lives. The France protest/freight scenario is hypothetical only. Do not combine unrelated public data to impersonate one company's operations. Without a real cross-business chain, synthetic data establish functionality only, not benefits. Show baselines and unknowns. Babel Street is a reference only.

Non-goals: executing real operational actions automatically, fabricating complete global history, deriving causal rewards from associations alone, recruiting beta users, introducing a new brand or copying a commercial product.

### Decisions Requiring Owner Confirmation

The recommendation is to adopt the four-direction problem statement and target users in this draft, use a supply/documents/service-linked main path, and begin the fourth direction with food batches. Prioritize legally usable real operational data or real public benchmarks. Where cross-business links are missing, clearly labeled synthetic fixtures may establish functionality, not replace prediction/benefit acceptance. Default metrics are fulfilment delays, cash gaps, service-process waiting and write-offs; monetary metrics require real cost inputs.

Freeze three matters: competition data/scenarios/constraints; first-stage coverage and global/1990 expansion order; and business losses/quality budgets. The proposal is to freeze evaluation sets using case entities and evidence-supported relationships, apply integrity gates, baseline non-inferiority and the p95 proposal, and make no benefit promises from undecided parameters. Develop only after specification approval; do not automatically turn review proposals into work assignments.
<!-- END_EN_SECTION 11 -->

---

