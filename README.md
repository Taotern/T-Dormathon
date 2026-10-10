# T-Dormathon 情报管线

## Current implementation entrypoint · v0.4.1 · 10 October 2026

The owner-approved [English specification](docs/specs/Dormathon_Product_Specifications_v0.4.1_EN.md), [Chinese specification](docs/specs/Dormathon_Product_Specifications_v0.4.1_ZH.md) and [approval record](docs/specs/approval-v0.4.1.json) govern current development. The existing Site's audience is public and unchanged. All 40 operational cases are isolated synthetic MR D.I.Y. Malaysia demonstrations (16 supply, 10 procurement, 8 service, 6 energy security/continuity), preserving the original 14 stable IDs. Six deep cases share one episode and resource snapshot.

The user and assistant own remaining integration; Felix is not a dependency. FR12 currently uses explicit arithmetic and safe baseline simulators, with optional RL unimplemented. The separate UCI benchmark retains its original UK-retailer identity and 2009–2011 years. Its high errors and failed candidate improvement are reported honestly; no MR D.I.Y. accuracy or real savings are established.

Current source is static/mrdiy-workspace.js and worker/mrdiy-*.js, with the retained source browser and legacy capabilities still available. Portable benchmark evidence is in docs/predictive-v0.4.1/. Operational package evidence is in docs/mrdiy-v0.4.1/. Tests exercise an in-memory node:sqlite D1-compatible adapter; actual hosted persistence, deployment and browser visual acceptance are separate gates.

### Private GitHub source checkpoint · native Site v71 · 10 October 2026

This normal private-main backup contains approved v0.4.1 source at `7ab8622d73c9fc916573e9e74da47b110abc31fd`. Native version 71 deployed successfully on the existing public Site. The optional explicit-click GPT-OSS 120B Advisor now explains authoritative synthetic case facts, with visible rules fallback and human-review boundaries. Actual SC01 conditional guidance and SC16 missing-input guidance passed on v70; repeated SC01 returned the same result without another provider request. v71 only raises the lifetime attempt ceiling to 100 while preserving the same RM5 estimated ledger, RM0.50 reservation, two-per-minute rate and unknown-accounting stop. No provider-enforced RM5 hard cap is claimed.

Current source passes 103 affected tests, syntax and all 11 exact-byte static assets in a separate publisher checkout. The prior v69 full suite passed 612 tests; it was not rerun for the final narrow compatibility/count changes. The repaired schema-only 0010 migration and applied metadata remain unchanged. See [current source-package verification](docs/releases/v0.4.1-20261010/source-package-verification.v71.json) for native deployment, provider-test scope, ledger continuity, exclusions and limits.

The 40 cases remain synthetic and the external UK-retailer benchmark still has 103.41% test WAPE. Two live scenarios do not validate all 40 model outputs or real company accuracy/savings. One Home helper still says LLM unavailable despite activation; that minor copy fix is separate. Server secrets, billing identifiers, raw UCI transactions, runtime state, build outputs, logs and screenshots are excluded. The upstream raw test-results.txt is omitted; its dated SHA256 manifest describes the original isolated artifact. Both original Chinese v0.3 documents and all approved v0.4.1 specifications are preserved. The [verified v65 baseline](https://github.com/Taotern/T-Dormathon/commit/6c20caa247742b7a8dcf9061b16cce8b04e6dbd2) remains in history.

The older sections below are retained historical handoff context. Their staffing, v0.3.1 scope, owner-private audience and dated corpus counts do not supersede this approved v0.4.1 entrypoint.


一个已有的 GPT-Site 产品：采集真实公开来源，按许可保留字段，去重与组织，保存不可变证据，提供可追溯的词项检索。队友负责在这些数据上实现客户分析与服务。本仓库当前界面是正式情报工作台：记录列表、证据阅读器和四类信息页面。展示型超前端已取消；旧版本只保留在 Git 历史中用于恢复。

## Product specs and team handoff · 产品规格与团队交接

Start with the complete [Chinese–English product specification](docs/specs/PRODUCT_SPEC_v0.3.1_ZH_EN.md) and [Chinese–English team handoff](docs/TEAM_HANDOFF_2026-10-09_ZH_EN.md). Translation edition 0.3.1 preserves the approved Chinese v0.3 requirements. Teammate 1 owns FR07, teammate 2 FR08, and Felix FR12; the user and assistant own all remaining requirements, intelligence/data, the unified frontend and integration. Interface examples are proposed contracts, not claims of deployed services.

The Hackathon product must be English-based, with English as the default and fully supported. Chinese and Malay are optional bonuses. The backend must be genuinely runnable and minimum viable; the frontend must show the complete product simply, directly and attractively. The user and assistant own later visual integration. Teammates currently deliver functionality, contracts and runnable examples, with no visual-design obligation. Implemented capabilities and runtime limitations remain documented separately below.

完整[中英双语产品规格](docs/specs/PRODUCT_SPEC_v0.3.1_ZH_EN.md)与[中英双语团队交接](docs/TEAM_HANDOFF_2026-10-09_ZH_EN.md)已发布。双语版 0.3.1 保留已批准中文 v0.3 的全部需求；队友 1 负责 FR07，队友 2 负责 FR08，Felix 负责 FR12，用户与助手负责其余需求、情报与数据、统一前端和集成。接口示例是拟议契约，不代表已部署服务。

Hackathon 产品必须以英语为默认语言并完整支持英语；中文和马来语是可选加分项。后端须最小可行且真实可运行，前端须抓眼、简洁直接地完整展示产品。前端装修由用户与助手后续负责，队友当前只交付功能、契约和可运行示例。已实现能力及限制仍以下文实际状态为准。原中文[规格阅读版](docs/specs/T-Dormathon_产品规格评审稿_v0.3.md)、[Word 文件](docs/specs/T-Dormathon_产品规格评审稿_v0.3.docx)和[中文交接](docs/TEAM_HANDOFF_2026-10-09.md)保持原样；入口汇总见[文档目录 / Documentation index](docs/README.md)。

## 最快开始

已验证平台：Linux、Node.js 24.19.0。需要 Node.js 24.x 自带的 `node:sqlite`；以下构建、测试与离线数据复现不需要 npm 安装、账号、密钥或网络。Windows 安装、启动器和自主日更仍未验证。

在仓库根目录执行：

```sh
node --version
npm test
npm run test:sources
npm run verify:artifact
npm run verify:data
npm run verify:local
npm run verify:handoff
```

`npm test` 先生成 Worker 常量，再运行后端和当前界面测试。`verify:data` 用仓库里的229个真实保留分片，在独立内存SQLite中复现校验 → 原子入库 → FTS索引 → 检索，预期20,644条（原批19,466 + EU/TWSE增量1,178），并明确报告外部历史批次未载入；不会请求来源或写线上 Site。`verify:local` 检查本地程序完整性和离线契约；`verify:handoff` 检查本地 v2 导出到 Site 接收器的兼容性。标明合成传输的测试数据不会播种到线上。

GDP历史的9,540行/111分片保持在三个独立外部数据包，不进Git。新的年度就业和每日 ECB FX 程序及字段合同见[来源准入说明](docs/EMPLOYMENT_FX_ADMISSION.md)，线上准入状态以该说明及实际批次回执为准。仓库内有少量实际源样例和离线边界测试；取得外部包后按[GDP程序说明](source-packs/worldbank-gdp/README.md)显式提供三个路径可复现全批。它不会因源码克隆而获得附件权限。

另有 [历史贸易救济案件说明](docs/TRADE_REMEDY_ADMISSION.md)：60 个 2020–2024 源日期筛选的案件，保留源阶段日期、产品 / 国家标签和有界关联行；资料版本 Q4_2024，当前实效与代码定义保持未知。五个完整分片在独立外部安全数据包中，不随源码克隆自动取得。

新增 [月度商品准入说明](docs/COMMODITY_MONTHLY_ADMISSION.md)：1990-01至2026-09的35条原生单位参考序列，共15,435单元格，含181源缺失；33条序列441个月都为数值。全球基准 / 定义中的地点参照不能等同国家或企业影响覆盖，底层 futures / forward 输入参照没有被改成可交易合约。完整价格向量和250分片保持在外部数据包；source-packs/commodity只保留代码/合同/许可/小样例及资格说明。

新增 [7 源确定性刷新与手动入库](docs/DETERMINISTIC_REFRESH.md)：来源配置和事实 / 单位限定、不可变取得回执与版本、失败保留最后良好状态、规范化载荷完整性及上传未验证来源分离。接收路径已在同一私有 Site 发布；一次 ECB 实际前台取得与手动上传已验证，未安装定时任务或自动同步。当前统一前台入口是 source-packs/history-refresh/refresh.py；US 可空 CFR / 超长可选 Action 的独立版本说明见 [US 刷新兼容说明](docs/US_REFRESH_SUCCESSOR.md)，其保留页重放没有作为新数据上传；Python3.12 / Node24 离线28项测试与 plan 可从完整克隆复现。

生成的发布产物是 `dist/server/index.js` 和 `dist/.openai/hosting.json`。`dist`、`worker/generated.js`、测试报告和本地运行数据库不进 Git。

## 实际支持的部署

主界面和 API 使用 GPT-Site 的 Worker ESM + 持久 D1，逻辑绑定名 `DB`，没有 R2、另一个 Site 或商业云部署。现有私有地址：

https://dormathon-risk-private-20261007.liuyz8715.chatgpt.site/workbench.html

仓库权限不等于这个私有 Site 的访问或部署权限。发布须由有权的 Site 编辑者走平台原生的源码、打包、版本及私有发布流程；本仓库不包含访问令牌或替代鉴权通道。已保存的线上数据与本地测试 SQLite 分开。改表结构时，用锁定版本的 Drizzle 生成并审查迁移；仅此开发步骤需要 `npm ci`，不在应用运行时建表。此仓库没有新增本地网页服务器、Docker 或通用云部署栈。

## 产品流程

1. 采集：11 个固定官方端点各有确定性适配器；拒绝任意 URL，限制时间、字节、条目、重试和并发，保留失败与最后良好版本。允许字段与空响应必须符合源契约。
2. 筛选：按来源、主题、语言、进入方式和首次见到日期过滤；统计记录另可按源观察期的年 / 月 / 日粒度与含首尾范围过滤，取得时钟与源周期分开。报告 / 登记辖区可按明确来源映射的国家代码过滤，并显示统计、法律、政治或登记 / 法定地址角色；不会从商品基准地点、币种、发布者或企业名称猜测国家。查询留在本产品。来源正文、许可不明内容、个人联系和税号字段不进入新审查批次。
3. 组织：来源限定的条目标识和语义版本保持独立；没有自动同名公司合并、人物匹配、业务影响或因果推断。界面分组明确只针对当前结果页。
4. 入库：来源回执、当前指针、不可变版本、允许文本与 FTS5/BM25 索引原子保存。用户可核验或导出证据，队友可读取稳定文档/分片与引用。

14 条新增上传记录来自已证明的单次 ECB 前台请求 / 手动入库；它们与既有审查序列分开，验证管线路径，不增加全球领域覆盖。

当前线上已验证：51,471 条目/版本/索引文档，0 待处理；369 本站直接取得、114 上传且来源未验证、50,988 已审查外部快照。原批204/204、EU/TWSE25/25以及三个同源GDP历史批次34/34、31/31、46/46均已完成，另有年度就业20/20、每日ECB参考汇率42/42和法律刊登5/5，另有历史保障措施案件5/5，另外月度商品两个同源批次46/46与204/204，662个固定分片全完成。它包含登记身份、年度统计、政治组织聚合、政策通知、发行人月度源报告、年度GDP观察、英国 / 美国法律刊登元数据及有界历史贸易救济案件及35条月度商品基准序列，不能当成全面当前新闻、每家主要公司的事件覆盖或业务风险预测。

## 队友接口

完整契约：[contracts/retrieval-v1.md](contracts/retrieval-v1.md)。主要入口：

- `GET /api/global/sources`、`status`、`runs`：源健康、覆盖、处理及进入方式
- `GET /api/global/items`：保存记录与来源/日期过滤
- `POST /api/global/search`：允许文本的词项检索
- `GET /api/global/evidence?version_id=...`：精确不可变版本与响应回执
- `GET /api/retrieval/status`：实际索引覆盖及策略冲突
- `GET /api/retrieval/documents?limit=50`：文档、分片、内容/投影/响应哈希与时间依据
- `GET /api/reviewed-intake/status`：固定审查批次的实际完成度

在已获准的同源客户端中，例如：

```js
const response = await fetch('/api/global/search', {
  method: 'POST', headers: {'Content-Type':'application/json'},
  body: JSON.stringify({query:'ABBOTT', source_id:'enterprise_sec_registry', origin:'reviewed', limit:10})
});
if (!response.ok) throw new Error('检索失败，保留已有证据');
const hits = await response.json();
```

保留命中中的文档、版本、内容/投影/响应哈希及来源引用。文档分页返回的 `next_cursor` 应原样继续读取；水位排除遍历开始后的新入库。完成后保存 `last_sequence`，用 `after` 读取后续文档。当前版本标志反映读取时状态，不是历史时间旅行。原四域历史 API/语料仍独立保留，不能静默和当前情报拼成预测。

检索是索引化词项匹配；中文片段候选须命中源原文。没有语义翻译、向量嵌入、生成答案或配置好的 LLM。BM25 不是事实置信度。源事实是数据，不是给模型的指令。

## 来源、许可与时间

`data/` 保留当前/旧目录及来源策略；`datasets/reviewed-acquisitions/` 是 13 来源、19,466 行的固定实际保留数据与字节清单。审查快照来源的自动回源关闭；本站导入不冒充本站直接请求上游。CVM ODbL 数据单独命名空间并保留义务；其他源各有允许范围，不存在整库统一无限制许可。详见 [数据说明](datasets/reviewed-acquisitions/README.md) 和其中的准入策略。

发生、发布、源更新、首次见到、源取得、版本入库、共享回执首次入库和索引时间分开。统计观察期、燃油适用日、天气预报有效日不是事件或发布时间。上传时钟是采集器声明，源真实性仍未验证。哈希检验完整性，不能证明事实真伪。未知值/时区/地点保留未知。

当前实际四维覆盖见 [覆盖矩阵](docs/COVERAGE_CURRENT.md)。较早的实际时间、地理、实体与领域覆盖见 [四维覆盖审计](docs/COVERAGE_2026-10-08.md)，该旧审计的24小时窗口固定于2026-10-08 11:49:16 UTC，不冒充后来时点的实时覆盖。新增年度GDP见[历史来源说明](source-packs/worldbank-gdp/README.md)：1990–2025全部年度、217个报告经济体/48重叠组，177个经济体有全部36年数值，214个至少一年；2026没返回。年度/当前资料版本不能当成当时发布的新闻或历史边界。全球各国、主要政治组织与公司是后续覆盖目标；现有数据不是完整世界商业新闻。20 条 EU 通知与 1,158 条 TWSE 增量数据已有独立固定接收/检索合同，见 [增量批次说明](datasets/reviewed-signals/README.md)。本批已通过真实保存/检索回读；API 的 batches 回执分别保留原批与增量完成度。

## 本地确定性程序

`local-collector/` 是同产品的附属 Node24/SQLite 采集程序。它不用模型或 Site 凭据，只有公开默认配置示例。离线诊断：

```sh
node local-collector/collector.mjs diagnose
```

需要真实网络采集时，在其目录执行 `node collector.mjs collect-source --source usgs` 或 `once`；`loop` 仅在电脑醒着、前台程序开放时按日检查。关闭期间不采集；恢复记录漏跑日期并取当前重叠窗口，不伪造历史补采。导出用 `export-site`，在工作台“入库/检索”手动选择并保存分片。没有自动同步、操作系统任务、隧道或持久机器授权。详见 [本地程序说明](local-collector/README.md) 和 [快照契约](docs/LOCAL_SNAPSHOT_HANDOFF.md)。

用户电脑执行器尚未通过启动前提；Linux 测试不代表 Windows 成功。个人助手临时任务已暂停，自主每日运行是明确未完成的运行门槛。现有 Site 暴露合同中没有找到可配置、可核验的独立代码时钟路径，见 [运行边界](docs/PRODUCT_SCHEDULER_BOUNDARY.md)。

## 仓库布局与恢复

- `worker/`、`db/`、`drizzle/`：生产 API、数据结构与迁移
- `static/`：仅当前普通工作台的三个源文件
- `scripts/`、`tests/`：支持的构建、校验与固定离线样例
- `data/`、`datasets/`：必要公开目录、来源策略与准入数据
- `local-collector/`：单一当前本地程序，不含运行状态
- `contracts/`、`docs/`：消费端合同、限制与来源历史

旧界面和完整工作备份在私有 Git 历史 `a7dfba514a8aab3072cd13f4ce227005ab26e4c9` 及更早提交中；当前清理不改写历史。后续工作是有选择地扩展有效来源、完善自主日更运行和消费端交接；不以存储量冒充语义或业务价值完成度。

## 历史行动与报告结果

新的独立观察轨迹层、实际171个CVD案例与9个来源辖区、逐字段未知/代码性质、时点可用性与队友数据集交接见[历史行动结果说明](docs/ACTOR_OUTCOME_PILOT.md)。它保留在独立表/API，不加入51,471情报记录；没有因果、RL奖励或无事件负样本。当前阶段与线上实际结果必须按该说明及对应准入回执分别核验。

## 当前前端与历史行动交接

活动产品使用四个独立信息页面：基础资料、状态与数值、事件与变化、解释与预期；另保留全部记录和待分类入口。页面分类来自已准入的源字段，服务端先分类/筛选再分页，同一不可变记录不会复制到多个信息类型。现有51,471条分别为12,872基础资料、37,727状态与数值、754事件与变化、118解释与预期、0待分类；这些数量表示当前语料类型，不表示全球覆盖率。

工作区支持真实词项检索、源观察期、报告/登记辖区、不可变证据与单独的历史行动层。展示型超前端已取消，不再列入后续开发；历史版本只用于恢复。CVD171案件已按完整13分片接收并独立核验，参见[实际内容与运行资格](docs/ACTOR_OUTCOME_PILOT.md)。这些源报告的程序代码与未知字段不是企业经济效果、因果标签或RL奖励。UCDP与CVM下一垂直的准备材料不计入当前已存覆盖。


实施中的四类读合同见 [信息类型接口](contracts/information-types-v1.md)。统计的源观察期与首次见到 UTC 日期可分别筛选，预警刊登不会变成灾害发生，法律资源刊登不会变成已生效。页面 URL 保存查询与筛选；窄屏从阅读器返回会恢复结果、焦点与位置。历史行动入口独立显示 CVD 案件的原始阶段代码、未知结果与当时可用性限制。

已验收私有 Site 当前版本36原生发布成功；实际1188×761桌面和500×761窄屏已走通查询→阅读→原证据、四类信息、空结果/失败保留及返回焦点。171条CVD历史层保持独立。完整版本/准入/验证边界见[本轮交付事实](docs/releases/CVD_FORMAL_WORKSPACE_2026-10-09.json)。


## English-first Hackathon vertical

The current prototype adds Risk & Decisions beside the preserved intelligence pages. Operating-case records are explicitly synthetic and editable; public evidence keeps its immutable source/version identity. Conditional rule calculations, a saved human decision and pending feedback are runnable. FR07 entity resolution, FR08 state reconstruction and Felix FR12 strategy/simulation are external ports and remain unsupported until connected. No gain, RL quality or self-improvement is inferred from a functional demo. See [current integration ports](contracts/prototype/ports-v0.2.md). The default interface is English; source quotations and units are preserved.

Walkthrough and actual limits: [English Hackathon vertical](docs/ENGLISH_HACKATHON_VERTICAL.md). [Version38 release facts](docs/releases/ENGLISH_HACKATHON_VERTICAL_2026-10-09.json) separate deployed code, public evidence, synthetic operating inputs and pending teammate services.
