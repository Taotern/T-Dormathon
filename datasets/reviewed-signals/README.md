# EU / TWSE 受审查增量快照

本目录是与原 13 来源批次分开的真实保留数据：25 个固定分片，1,178 条，三个来源。它没有采集代码定时器，也不代表本站直接请求上游。

| 来源 | 实际内容 | 时间精度 | 许可和边界 |
| --- | --- | --- | --- |
| `stat_twse_monthly_revenue` | 1,086 个 TWSE 发行人的月度报告行，八个源指标 | 观察期 2026-08，表格日 2026-09-17；UTC 发布/发生时间未知 | 台湾政府资料开放授权条款第 1 版；提供机构署名。金额币种和缩放单位未核验，百分比仅取源字段明示单位 |
| `enterprise_notice_twse` | 72 个发行人公告标题与允许的日期/条款元数据 | 公告日 2026-10-07；当地时钟的时区未确立。四个源事实日期晚于原取得日，发生未确认 | 同上；说明正文、备注、联系方式、税号不保留。源声明未经独立核验；派生标题身份不能证明完整修订关系 |
| `political_eu_council_releases_fr` | 20 个 EU Council 通知标题/链接与源更新时间 | 发布/发生时间未知；源更新时间保留显式时区，其中一项晚于原取得时刻 | Council 许可要求注明来源、不误导含义，排除第三方/特别限制内容。法文栏目返回英文标题，栏目 `fr` 和未核验内容语言 `und` 分开 |

只有已取得快照中的这些范围通过准入；不覆盖全部台湾公司动态、完整 EU 通知历史或世界商业/政策新闻。年度历史最低 2020 至今、尽可能延伸到 1990 的更广覆盖仍是开发目标。新来源没有自动回源或已验证日更。

## 完整性与转换

`manifest.json` 固定每个分片的 UTF-8 字节数、SHA-256、来源和行数。`policies/admitted-signal-policies.json` 固定字段/检索/许可/取得回执策略。原 TWSE 分片字节完全保留；EU 投影仅新增相对原取得时刻的未来更新标记及栏目/内容语言字段。原取得文件和回执在 `provenance/` 可复核。

TWSE 原取得回执采用 `http_status_nullable`、`bytes_read_nullable`、`upstream_raw_sha256_nullable`。准入策略给它们增加同值规范别名，原字段也完整保留。接收器缺少真实响应 SHA、200 状态或正字节数会在写入前拒绝。文件/响应哈希是完整性与取得见证，不是独立事实验证。

语义版本排除取得时钟、全表更新日以及相对取得的派生标记，保留源数值、月度观察期、公告日期/时钟、标题和 per-record 更新时间；原元数据及响应/分片指纹仍进入不可变证据。旧批次所有字节、政策与语义版本规则不变。

## 可复现接收与检索

在仓库根执行 `npm test`、`npm run verify:data`。后者使用所有已登记的 229 分片，在独立 SQLite 中复现 20,644 条 reviewed 版本，不请求任何来源或线上 Site。`tests/reviewed-signals.test.mjs` 单独验证此增量的响应指纹、月度/当地日期语义、许可字段边界、重复导入、语义去重和检索。

部署后的授权同源客户端可用 `POST /api/reviewed-intake/chunk` 提交四字段对象：`chunk_path`、`chunk_text`、`manifest_sha256`、`policy_sha256`。后二者使用本批实际 manifest 字节 SHA 和 manifest 中的 policy SHA。响应提供固定分片回执。传输结果未确认时先读取持久回执，禁止盲目重复未知写入。不要提交原批次或已完成分片。

`GET /api/reviewed-intake/status` 的 `batches` 分别列出原批次和本批次；`complete` 指所有登记批次完成。顶层原 manifest/policy 字段仅为旧消费者兼容，不能用于识别全部批次。`GET /api/retrieval/documents` 返回 exact version/content/response/policy 指纹和 typed `date_context`；原四业务域仍独立。

例如 `query: '台泥', source_id: 'stat_twse_monthly_revenue', origin: 'reviewed'` 检索发行人月度源行，`query: 'Russia', source_id: 'political_eu_council_releases_fr', origin: 'reviewed'` 检索原标题。没有翻译、语义嵌入、生成分析、金融换算或风险推断。
