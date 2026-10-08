# 英国 / 美国法律刊登元数据

本批已于 2026-10-08 16:10:21–16:11:47 UTC 实际保存并索引，5 / 5 分片、249 个文献资源。总计 35,962 个版本 / 索引文档、0 待处理，369 直接 / 100 上传未验证 / 35,493 外部快照与 8 条旧规则保持。独立于已经完成的 GDP / 就业 / ECB 数据。本轮只有四个固定源请求，各成功一次，无来源重试、正文或 PDF 爬取。

| 已取得范围 | 实际数据 | 时间 / 地理 / 关系边界 |
| --- | --- | --- |
| 英国 recent feed | 20 个资源，网页刊登日 2026-10-02–08 | 包含两个 2010 / 2025 法规关联的更正单，资源 ID 与相关法规 ID 分开；适用地域 / 实效未知 |
| 英国 2020 public general acts 列表 | 29 个，声明 29 个、无下一页 | 法规标识年份不等于网页发布时间；一条 2020 法规的网页发布时间在 2024，按源保留 |
| 美国 2026-10-01–08 | 605 个匹配项中的首页 100 个 | Rule / Proposed Rule / Notice 元数据；日期只有日，不能补 UTC 发布时间 |
| 美国 2020-01-01–07 | 306 个匹配项中的首页 100 个 | 2020 和当前局部页，2021–25 及完整两国档案均未取得 |

两个来源 / 249 个文献资源 / 5 个分片，不代表全球法律完整覆盖或连续 2020–现在历史。英国发布系统含 devolved 文献类别，territorial extent/application 保持未知；美国只涉及 federal publication。70 个美国 issuing-agency ID 是源部门参照，不是受影响企业或独立确认来源。部门上级、CFR、docket、RIN、Supersedes 只是源提供的关系参照。

英国使用 OGL v3.0，保留 Crown / database-right / 原始出处 / 标准化和无背书说明；本轮不含 EU-derived 或 pre1987 Westlaw 资源。美国保存官方标题和刊登事实，排除 abstracts、第三方重印和所有文献正文；API 是非官方在线呈现，govinfo 正式 PDF 只保存 URL，尚未下载或核验。[英国复用说明](https://legislation.github.io/data-documentation/reuse-licence.html)、[美国 Federal Register 说明](https://www.archives.gov/federal-register/the-federal-register/about.html)。

实际刊登、网页更新、CreationDate、法规年份、生效日期、comment deadline、取得、Site 入库分开。英国午夜的源 timestamp 保留精度未验证标记；网页更新不确立法律变更。binding_status / effectiveness_status 均为 unknown，事件国家 / 地点 / 时间为空。美国 date-only publication 留在 facts，不补 published_at。

准入 manifest SHA `d4743127295a5e6702ec77ccdcbcc3034e969199a21c9b3dd9eef34b4dbde429`，原来源政策 SHA `65210dc9d274470564b43260daeface8559999593165fdda6e64d5ee8fe58692`。原始 HTTP 响应指纹与安全元数据 payload 指纹各自保存，不能混称原始响应。完整原响应没有进入 portable 数据包；源保存的原始—安全投影一致性有独立回执，消费者可独立复核安全投影 / 分片。

Git 保留代码、许可、合同、八个独立真实样例和有界子集测试输入。完整 249 行 / 5 分片 / 安全 payload 留在外部 ZIP，SHA `a4d38d2461be6bfe616b8af07b75227439404648581e944877f160989b4090ef`。显式解压到自己的路径：

```sh
node scripts/build.mjs
node scripts/verify-legal-batch.mjs /path/Dormathon-Legal-Data
python source-packs/legal/run-slice.py reproduce --data-dir /path/Dormathon-Legal-Data
DORMATHON_LEGAL_REPORT_DIR=/path/temporary-report python source-packs/legal/run-slice.py test
```

这些是隔离 SQLite / 原字段复现，不会调用来源或 Site。新的 acquire-fixed.py 只提供固定请求与请求前回执，当前四个数据请求已取得，不能因导入或测试再抓一遍。每日无人运行、Windows、自动 Site 同步、连续历史和正式法律效力核验保持未完成。

实际接收 / 回读 / GUI：source `c3cfc7b7ec29f7baa61a664225ddcdb931f87e6f`，private deployment `appgdep_6ac7c02cef188191b962dfe3feb1ec69`。27 项实际只读回读、21 请求，独立来源对照 14 / 14 与保存数据复核 12 / 12 通过；249 个文档和 8 个不可变证据与原投影一致。普通 500px GUI 的 UK 更正单及 US Rule 查询 → 详情 → 返回 / 焦点流程通过，宽度 485px，无页面横向溢出。详见 [已验收发布身份](releases/LEGAL_METADATA_2026-10-08.json)。

英国发布 / 更新日志只有 2023 年 7 月之后的历史可靠性说明；较早源时间照原字段保留，不提升为完整当时发布记录或颁布时刻。未建立法域法律效力或商业适用结论。
