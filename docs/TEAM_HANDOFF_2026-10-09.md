# T-Dormathon 竞赛原型分工

2026 年 10 月 9 日，负责人已批准将[产品规格 v0.3](specs/T-Dormathon_产品规格评审稿_v0.3.md)上传至本私有仓库，并按以下职责并行实现 hackathon 原型。规格原文件完整保留；其中评审阶段的措辞不代表所有目标已实现，也不新增生产系统承诺。

## 当前分工

| 负责人 | 实现范围 |
| --- | --- |
| 队友 1 | FR07 自动主体消歧与证据关系融合 |
| 队友 2 | FR08 多时钟 as of 状态重建与回放 |
| Felix | FR12 RL 沙盘与策略服务 |
| 用户与助手 | 其余需求、情报与数据、统一正式前端和集成 |

队友当前交付聚焦功能、版本化契约、契约测试和可运行示例。统一前端及后续视觉装修由用户与助手负责，不给 FR07、FR08 或 Felix 增加视觉设计验收任务。

## 三个可独立开发的后端部分

**队友 1，FR07：**从带证据的主体提及与声明生成稳定 Entity／Relation，保留候选、歧义、关系类型／方向、有效区间、证据及冲突。证据不足时拒绝强制合并。按规格 AC06 覆盖同名、跨语种、改名、子母公司、拆并／继承及冲突，并与字符串基线比较；不把同现当作所有权或业务依赖。

**队友 2，FR08：**使用证据和主体版本，在明确 knowledge_as_of、world_time／区间及 knowledge_mode 的条件下重建 WorldState 并回放。public_known 与 system_known 分开；未知时钟、availability_proxy、后来修订／撤回及缺口保留可见。用冻结时序样例验证晚发布／获取、时区、区间与修订不会泄漏未来信息。

**Felix，FR12：**提供在同一冻结状态、目标、动作和硬约束下的基线／情景／RL 策略比较，明确 S、A、T、R、C、终止、支持范围与假设。先验证不行动、规则或简单规划，再评估 RL；数据不足或反事实不可信时返回有限基线／模拟结论，不承诺真实经营收益。

## 共享边界

FR09 的环境、主体动作、结果记录及来源数据仍由用户与助手负责。FR08 负责这些版本的 as-of 重建与回放；Felix 消费冻结状态和带使用限制的 EAORecord，不重复采集或重建另一套数据层。

FR10／FR11 的风险展示、解释、行动比较体验和集成由用户与助手负责。涉及沙盘或策略比较的计算调用 Felix 的服务，不另建平行计算引擎。人工选择与保存依据属于产品闭环；不自动执行真实经营动作。

## 接口示例与第一条集成路径

以下调用直接沿用规格 v0.3 第 9 节的拟议契约版本 0.2，是开发对齐示例，不声称这些服务路由已经部署：

- 情报：`query_evidence(query, filters, knowledge_as_of)` → 分页证据与声明
- FR07：`resolve_entities(mentions, knowledge_as_of)`；`fuse_relations(claim_refs)` → 主体、关系、歧义与冲突
- FR08：`reconstruct_state(scope, knowledge_as_of, world_time, knowledge_mode)`；`replay(interval)` → 冻结世界状态与回放
- FR12：`compare_policies(state_ref, objectives, constraints, actions)` → ScenarioRun／PolicyComparison

公共信封沿用 schema_version、request_id、input_refs、knowledge_as_of、world_time、knowledge_mode、data_revision、status、warnings。状态使用 ok、partial、insufficient_data、unsupported；保留单位、时区、窗口及可解析的具体版本引用。

第一条路径沿用规格中的“供应中断 → 履约”：以同一业务 ID、路线暴露、经营条件和交易对手历史连接证据、主体、当时可用状态、基线及候选行动。缺少真实业务链时使用明确标记的固定样例验证功能，不拼接无关公开数据冒充同一公司或真实收益。

先对齐版本化契约和四方向代表性 fixture，各部分即可独立运行、提供调用说明并做契约测试，随后接入统一前端。后台做真实可运行的最小可行版本；前端完整展示产品路径。竞赛原型不扩展为生产高可用、完整全球实时覆盖或持续运维项目。现有已实现能力及运行限制见[仓库 README](../README.md)。
