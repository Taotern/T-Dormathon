# T-Dormathon 竞赛原型分工 中英双语版 / Hackathon Prototype Responsibilities Chinese–English Edition

[English](#english) · [中文](#chinese)

<a id="english"></a>

# English version

Bilingual translation edition 0.3.1, 9 October 2026. Translation does not change FR/AC identifiers, interfaces, responsibilities or scope.

Source: [original Chinese file](TEAM_HANDOFF_2026-10-09.md), published in private-repository commit `3062a571e5931ad0d94bfa1a7b79f869bb7dd0e3`. The original preserves review-era wording. The team handoff and latest addenda govern approved responsibilities and subsequent updates; not every target is already implemented.

Companion bilingual document: [Open](specs/PRODUCT_SPEC_v0.3.1_ZH_EN.md#english)

## Contents

- [Latest addenda](#en-latest-addenda)
- [Original opening and version note](#en-section-0)
- [Current Responsibilities](#en-section-1)
- [Three Independently Developable Backend Parts](#en-section-2)
- [Shared Boundaries](#en-section-3)
- [Interface Examples and the First Integration Path](#en-section-4)

<a id="en-latest-addenda"></a>

## Latest Confirmed Addenda

### Product Language

The final hackathon product must be English-based, with English as the default and fully supported across the UI, messages, analysis and demonstration. Chinese and Malay are optional bonus languages and must not delay or block English delivery. Chinese–English documentation does not imply a bilingual-product requirement.

### Published Frontend and Product-Intent Notes

**Frontend addendum dated 9 October 2026:** The user and assistant own the overall product frontend. It must be eye-catching while presenting the complete product simply and directly. Subsequent visual integration uses Xushi Deconstruction in black, white and gray, with strong composition, layering, data emphasis and appropriate motion. Acceptance evaluates both visual appeal and usability. Do not restore the canceled super-frontend or a slide-style presentation. Teammates currently own only their backend functionality, contracts and runnable examples, not visual styling.

**Product-intent addendum on the same date:** The minimum backend accelerates delivery of a complete usable prototype; it must not result in a weak prototype. The overall experience aims to connect global data, risk discovery and preventive recommendations, sandbox simulation and Agent consultation. This is product direction; implemented capability and coverage remain subject to actual acceptance. Claim ‘self-improvement’ only when supported by feedback, versions and evaluation evidence.

The published notes above come from the [documentation index](README.md). They supplement the original text without turning proposed interfaces or product targets into implemented capabilities.

<a id="en-section-0"></a>

# T-Dormathon Hackathon Prototype Responsibilities

On 9 October 2026, the owner approved uploading [product specification v0.3](specs/T-Dormathon_产品规格评审稿_v0.3.md) to this private repository and implementing the hackathon prototype in parallel under the responsibilities below. The original specification files are retained in full. Their review-stage wording does not mean that every target is already implemented or introduce production-system commitments.

<a id="en-section-1"></a>

## Current Responsibilities

| Owner | Implementation scope |
| --- | --- |
| Teammate 1 | FR07 automatic entity disambiguation and evidence-based relationship fusion |
| Teammate 2 | FR08 multi-clock as-of state reconstruction and replay |
| Felix | FR12 RL sandbox and policy service |
| User and assistant | All remaining requirements, intelligence and data, the unified formal frontend, and integration |

Teammates' current deliverables focus on functionality, versioned contracts, contract tests and runnable examples. The user and assistant own the unified frontend and subsequent visual styling. FR07, FR08 and Felix do not receive additional visual-design acceptance tasks.

<a id="en-section-2"></a>

## Three Independently Developable Backend Parts

**Teammate 1, FR07:** Generate stable Entity/Relation objects from evidence-supported entity mentions and claims, retaining candidates, ambiguity, relationship type/direction, valid intervals, evidence and conflicts. Refuse forced merges when evidence is insufficient. Follow specification AC06 to cover identical names, multiple languages, renaming, parent/subsidiary relationships, splits/mergers/succession and conflicts, and compare against a string-matching baseline. Do not treat co-occurrence as ownership or a business dependency.

**Teammate 2, FR08:** Reconstruct WorldState and replay from evidence and entity versions with explicit knowledge_as_of, world_time/an interval and knowledge_mode. Separate public_known and system_known; keep unknown clocks, availability_proxy, later revisions/withdrawals and gaps visible. Use frozen temporal examples to verify that late publication/acquisition, time zones, intervals and revisions do not leak future information.

**Felix, FR12:** Provide baseline/scenario/RL policy comparisons under the same frozen state, objectives, actions and hard constraints. Define S, A, T, R, C, termination, supported scope and assumptions. Validate no action, rules or simple planning before evaluating RL. If data are insufficient or counterfactual evaluation is not credible, return limited baseline/simulation conclusions without promising real operational benefits.

<a id="en-section-3"></a>

## Shared Boundaries

The user and assistant continue to own FR09 environment, actor-action and outcome records and source data. FR08 owns as-of reconstruction and replay of those versions. Felix consumes frozen states and EAORecord objects with usage restrictions; he does not repeat collection or reconstruct a separate data layer.

The user and assistant own FR10/FR11 risk presentation, explanation, the action-comparison experience and integration. Computation involving sandbox or policy comparisons calls Felix's service, rather than creating a parallel computation engine. Human choice and saved rationale are part of the product workflow. Real operational actions are not executed automatically.

<a id="en-section-4"></a>

## Interface Examples and the First Integration Path

The following calls directly reuse proposed contract version 0.2 from Section 9 of specification v0.3. They are development-alignment examples, not claims that these service routes are already deployed:

- Intelligence: `query_evidence(query, filters, knowledge_as_of)` → paginated evidence and claims
- FR07: `resolve_entities(mentions, knowledge_as_of)`; `fuse_relations(claim_refs)` → entities, relationships, ambiguity and conflicts
- FR08: `reconstruct_state(scope, knowledge_as_of, world_time, knowledge_mode)`; `replay(interval)` → frozen world state and replay
- FR12: `compare_policies(state_ref, objectives, constraints, actions)` → ScenarioRun/PolicyComparison

The common envelope retains schema_version, request_id, input_refs, knowledge_as_of, world_time, knowledge_mode, data_revision, status and warnings. Status values are ok, partial, insufficient_data and unsupported. Retain units, time zones, windows and references that resolve to specific versions.

The first path follows ‘supply interruption → fulfilment’ from the specification. Use the same business IDs, route exposure, operating conditions and counterparty history to connect evidence, entities, the state available at the time, baselines and candidate actions. Where a real business chain is missing, use explicitly labeled fixed examples to verify functionality. Do not combine unrelated public data to impersonate one company's operations or real benefits.

Align versioned contracts and representative fixtures for the four directions first. Each part can then run independently, supply calling instructions and contract tests, and connect to the unified frontend. The backend implements a genuinely runnable minimum viable version; the frontend presents the complete product journey. The competition prototype does not expand into a production-high-availability, complete global real-time coverage or ongoing-operations project. See the [repository README](../README.md) for capabilities already implemented and runtime limitations.


---

<a id="chinese"></a>

# 中文版本

双语翻译版 0.3.1，2026 年 10 月 9 日。翻译不改变 FR／AC、接口、职责或范围。

来源：[原中文文件](TEAM_HANDOFF_2026-10-09.md)，私有仓库已发布提交 `3062a571e5931ad0d94bfa1a7b79f869bb7dd0e3`。原文保留评审时期措辞；实际已批准分工及后续补充以团队交接和最新补充为准，不表示所有目标已实现。

配套双语文档：[打开](specs/PRODUCT_SPEC_v0.3.1_ZH_EN.md#chinese)

## 目录

- [最新补充](#zh-latest-addenda)
- [原文开头与版本说明](#zh-section-0)
- [当前分工](#zh-section-1)
- [三个可独立开发的后端部分](#zh-section-2)
- [共享边界](#zh-section-3)
- [接口示例与第一条集成路径](#zh-section-4)

<a id="zh-latest-addenda"></a>

## 最新已确认补充

### 2026 年 10 月 9 日 产品语言

最终 hackathon 产品必须以英语为默认语言并完整支持英语，涵盖界面、消息、分析与演示。中文和马来语是可选加分项，不得延迟或阻碍英语交付。中英双语文档不等于产品必须双语。

### 同日已发布的前端与产品意图

**2026 年 10 月 9 日前端补充：**整体产品前端由用户与助手负责，既要抓眼，也要简洁、直接地完整展示产品。后续视觉整合采用虚实解构的黑白灰、强构图、层次、数据重点与适当动效，同时验收视觉吸引力和可用性；不恢复已取消的超前端或 PPT 式展示。队友当前只承担对应后端功能、契约和可运行示例，不承担视觉装修任务。

**同日产品意图补充：**最小后端用于加快完整可用原型交付，不能因此做出薄弱原型。整体体验目标是串联全球数据、风险发现与预防建议、沙盘推演和 Agent 咨询；这是产品方向，已有能力与覆盖仍以实际验收为准。“自我改进”须有反馈、版本和评估证据后才作为能力声明。

上述已发布补充来自[文档入口](README.md)；它们补充原文，不把拟议接口或产品目标变成已实现能力。

<a id="zh-section-0"></a>

# T-Dormathon 竞赛原型分工

2026 年 10 月 9 日，负责人已批准将[产品规格 v0.3](specs/T-Dormathon_产品规格评审稿_v0.3.md)上传至本私有仓库，并按以下职责并行实现 hackathon 原型。规格原文件完整保留；其中评审阶段的措辞不代表所有目标已实现，也不新增生产系统承诺。



<a id="zh-section-1"></a>

## 当前分工

| 负责人 | 实现范围 |
| --- | --- |
| 队友 1 | FR07 自动主体消歧与证据关系融合 |
| 队友 2 | FR08 多时钟 as of 状态重建与回放 |
| Felix | FR12 RL 沙盘与策略服务 |
| 用户与助手 | 其余需求、情报与数据、统一正式前端和集成 |

队友当前交付聚焦功能、版本化契约、契约测试和可运行示例。统一前端及后续视觉装修由用户与助手负责，不给 FR07、FR08 或 Felix 增加视觉设计验收任务。



<a id="zh-section-2"></a>

## 三个可独立开发的后端部分

**队友 1，FR07：**从带证据的主体提及与声明生成稳定 Entity／Relation，保留候选、歧义、关系类型／方向、有效区间、证据及冲突。证据不足时拒绝强制合并。按规格 AC06 覆盖同名、跨语种、改名、子母公司、拆并／继承及冲突，并与字符串基线比较；不把同现当作所有权或业务依赖。

**队友 2，FR08：**使用证据和主体版本，在明确 knowledge_as_of、world_time／区间及 knowledge_mode 的条件下重建 WorldState 并回放。public_known 与 system_known 分开；未知时钟、availability_proxy、后来修订／撤回及缺口保留可见。用冻结时序样例验证晚发布／获取、时区、区间与修订不会泄漏未来信息。

**Felix，FR12：**提供在同一冻结状态、目标、动作和硬约束下的基线／情景／RL 策略比较，明确 S、A、T、R、C、终止、支持范围与假设。先验证不行动、规则或简单规划，再评估 RL；数据不足或反事实不可信时返回有限基线／模拟结论，不承诺真实经营收益。



<a id="zh-section-3"></a>

## 共享边界

FR09 的环境、主体动作、结果记录及来源数据仍由用户与助手负责。FR08 负责这些版本的 as-of 重建与回放；Felix 消费冻结状态和带使用限制的 EAORecord，不重复采集或重建另一套数据层。

FR10／FR11 的风险展示、解释、行动比较体验和集成由用户与助手负责。涉及沙盘或策略比较的计算调用 Felix 的服务，不另建平行计算引擎。人工选择与保存依据属于产品闭环；不自动执行真实经营动作。



<a id="zh-section-4"></a>

## 接口示例与第一条集成路径

以下调用直接沿用规格 v0.3 第 9 节的拟议契约版本 0.2，是开发对齐示例，不声称这些服务路由已经部署：

- 情报：`query_evidence(query, filters, knowledge_as_of)` → 分页证据与声明
- FR07：`resolve_entities(mentions, knowledge_as_of)`；`fuse_relations(claim_refs)` → 主体、关系、歧义与冲突
- FR08：`reconstruct_state(scope, knowledge_as_of, world_time, knowledge_mode)`；`replay(interval)` → 冻结世界状态与回放
- FR12：`compare_policies(state_ref, objectives, constraints, actions)` → ScenarioRun／PolicyComparison

公共信封沿用 schema_version、request_id、input_refs、knowledge_as_of、world_time、knowledge_mode、data_revision、status、warnings。状态使用 ok、partial、insufficient_data、unsupported；保留单位、时区、窗口及可解析的具体版本引用。

第一条路径沿用规格中的“供应中断 → 履约”：以同一业务 ID、路线暴露、经营条件和交易对手历史连接证据、主体、当时可用状态、基线及候选行动。缺少真实业务链时使用明确标记的固定样例验证功能，不拼接无关公开数据冒充同一公司或真实收益。

先对齐版本化契约和四方向代表性 fixture，各部分即可独立运行、提供调用说明并做契约测试，随后接入统一前端。后台做真实可运行的最小可行版本；前端完整展示产品路径。竞赛原型不扩展为生产高可用、完整全球实时覆盖或持续运维项目。现有已实现能力及运行限制见[仓库 README](../README.md)。


