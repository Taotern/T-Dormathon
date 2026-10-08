# 年度就业与每日参考汇率

这两个受审快照是现有产品的独立新增来源合同。已于 2026-10-08 15:10:21 至 15:13:42 UTC 按精确准入字节完成 62 / 62 分片、5,060 个观察的实际保存及词项索引。总计 35,713 个不可变版本 / 文档、0 待处理；369 直接来源、100 上传未验证、35,244 外部受审快照和 8 条旧规则记录保持。30 项实际 API 回读和两个新来源的 500px 普通 GUI 查询 / 详情 / 返回流程通过；此结果不代表自主日更。

| 来源 | 已取得时间 | 实际信息范围 | 主要边界 |
| --- | --- | --- | --- |
| World Bank / ILOEST 失业率 | 2020–2025 年度 | 217 个报告经济体、48 个重叠汇总组；182 个经济体全六年有数值，187 个至少一年；1,590 行 | 模型估计、总劳动力百分比；1991–2019 未取得、2026 未返回；不是裁员、人才或公司事件 |
| ECB 参考汇率 | 2020-01-02 至 2026-10-08 日度 | USD/EUR 与 MYR/EUR 各 1,735 个源观察日，合计 3,470 行 | 只两条参考序列；不是实时成交价格；无 2020 前历史；缺日原因未分类，不补零或推断休市 |

就业指标 `SL.UEM.TOTL.ZS` 单位是 `percent_of_total_labor_force`、scale=1，确切模型口径和 ILOSTAT/ILOEST 原始来源保留。2026-01-17 是指标元数据注明的访问日期，模型发布日期仍未知；2026-07-13 是资料版本日期，二者都不会转成每条记录的 UTC 发布时间。

ECB 原始数值及全部 32 个 CSV 元数据字段保持。单位为 USD 或 MYR / 1 EUR，scale=1；禁止倒数、缩放、交叉汇率、插值和年化。日期仅指源观察日，TITLE_COMPL 的钟点不补成发布时间；原始 UNIT_INDEX_BASE 不当成这条汇率的指数基期。两来源的 occurrence、publication、update、国家位置均保持未知。

## 不可变准入身份

| 来源 | manifest SHA-256 | source policy SHA-256 | 行 / 分片 |
| --- | --- | --- | --- |
| 就业 | `a6f2b0051c47642cefcfa122c573fe6a15b387a8bcfd06aa363b39ae14dac9a1` | `277c7967b0d7ff47d473b747ff52e262de4f9462f022ef6f331dda673512537f` | 1,590 / 20 |
| ECB FX | `775f06b84e4c7efc6e3583073547b1456bb07d645bd7082ca0ac18b2bcb5d7ff` | `9125dba6da7ece4e683a419f1c107f6e39b700e555b869eb8f1d2579d6d42370` | 3,470 / 42 |

每个接收请求指定准确 manifest、policy、分片路径与原始 JSON 字节。接收器验证全文件字节/行数指纹、来源字段、单位/模型/日期和原始响应见证，才把记录、不可变版本、词项索引和分片完成回执原子保存。已有准确分片回执先读回；传输未知不能盲目重复。

`/api/retrieval/documents` 的 date_context 保持 year/day 粒度。quantitative_context 除 value/unit/missingness 外，新增可空 estimate_basis/reference_population/model_release_vintage/base_currency/quote_currency/reference_type；metadata 仍是精确源投影。取得时钟、此版本 Site 导入时钟和索引时钟分开。每版本政策来自取得回执，不能从当前目录猜测恢复。

允许的检索文本只来自标题与合同明确列出的数值/年日/源地理或货币字段。原许可、解析器、方法说明及无关 CSV 属性不当成情报内容命中。仍是 FTS5/BM25 词项检索，无嵌入、翻译或生成分析。源保留快照 origin 为 reviewed_external_snapshot，来源真实性通过保留见证审查，本站没有重新请求上游；上传未验证分支独立。

## 独立复现

Node24 / Python3 标准库。Git 保留代码、合同、公开见证、小真实样例；完整 JSON/CSV、分片和矩阵保持在独立外部数据包。

```sh
node scripts/build.mjs
node scripts/verify-statistical-batches.mjs /path/employment/delivery /path/fx/delivery
python source-packs/employment/run-slice.py --work-dir /path/employment --build --test
python source-packs/fx/run-slice.py --work-dir /path/fx --build --test
```

第一条接收复现会只写临时 SQLite，验证全部 62 分片 / 5,060 行、真实查询、空值、origin 和精确文档元数据；不会联网。后两条重现原取得输入，生成的外层报告时间不会替代冻结 manifest。实际外部包 SHA 分别为 `faebdffeead79c21594b752697aef3b4bf005fa444c4e8c459b8522b3c30eae3` 和 `f5ccc2171b5df87f517fbc8ad81b37b2038a79b2c08ceb3052e22abc2465038f`。

就业需保留 World Bank WDI、ILOSTAT/ILOEST、CC BY4.0、标准化及无背书说明。ECB 使用自有 ESCB 统计复用条款，保留原统计和元数据、ECB 署名及免费原始资料说明；未清权第三方资料仍排除。[就业确切指标](https://data.worldbank.org/indicator/SL.UEM.TOTL.ZS)、[ECB 统计复用条款](https://www.ecb.europa.eu/stats/ecb_statistics/governance_and_quality_framework/html/usage_policy.en.html)。

新取得是另一个明确操作，来源程序固定地址、期限、体积与请求前尝试回执，不自动重试。代码复现不证明 Windows、关闭进程后 OS 调度、自主日更或 Site 自动同步；这些仍为独立未完成运行时门槛。

## 实际验收范围

运行时 source commit 为 `1ea785b52112f0bab4e448e29af5cc77fec7fdd2`，owner-private deployment `appgdep_6ac7b16c79148191a0ed63ac33fc4506`，保存 / 索引回执时间与源取得时钟分开。4 个最大并发请求，62 个不同准入分片全部保存，无未确认请求、provider fetch、旧 340 分片重放或自动重试。终态 SHA `51db0085d9e3a9111d7e3c808b4f0d1f634ececff7506c7bd24fba9497a69e40`；保存回读 SHA `a2ccfb960c41a711f38e67dfb6f3d7612db3b954151e5a4b2e0470e20250c13a`。

独立纯来源审查 15 / 15 通过，实际源样例 / 值 / 日期 / 模型 / 原 32 字段 / 响应见证保持，未重复全套或来源请求。生产单文件 Worker 的实物测试包含实际样例和改变缩放拒绝；缺模块构建 guard 针对实际现有单行静态 import 形式，不声称支持所有 JS 导入语法。Git-only Linux / Node24 恢复通过 308 项测试与全部 62 分片 / 5,060 行外部明确路径消费。Windows、个人电脑部署、自主日更、自动同步及源连续性仍未证明。

数字日期是普通词项检索，不能当成 observation-date 精确过滤：例如 2026-10-08 的拆词可以匹配同样数字的 2026-08-10。GUI 显示确切源观察期，API 的 typed observation_period / granularity 可供下游明确筛选；尚未实现的 source-observation date filter 不会被假装可用。

独立保存数据复核 11 / 11 通过：8 个不可变证据投影和 300 个文档元数据 / 许可投影等于原取得数据，准确政策 / manifest / 原始响应见证及源取得 / Site 导入时钟保持。该复核不再次请求来源或 Site，SHA `de185ab21829abd5da9e00f893c8fae5a8eda6c3da33995703b2c60581f259f7`。
