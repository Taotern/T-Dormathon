# 历史保障措施案件

本批于2026-10-08 16:54:34–16:55:43 UTC 实际保存并索引，60个案件 /5个分片。当前36,022个索引文档、0待处理；369直接、100上传未验证、35,553已审查外部快照与8旧规则保持。本站接收固定安全快照，未重新请求上游。

来源是世界银行 TTBD 的 global-safeguard 工作簿，资料标签Q4_2024。按原 WTO_INIT_DATE 日历单元格选择2020–2024，有61个候选，其中同名 CASE_ID THA-SG-5 对应2020铝箔与2016型钢的冲突，先于时间筛选全局隔离；该ID及其相关表行均不接收，没有补后缀或猜测关联。实际保留60个案件、16个源实施国家 / 集团标签：China、Egypt、European Union、India、Indonesia、Jordan、Madagascar、Malaysia、Morocco、Peru、Philippines、South Africa、Tunisia、Turkey、USA、Ukraine。2020至2024各年分别21、9、5、12、13个。原工作簿源日期覆盖1995–2024，较早源行未在本批整理或入库；2025–2026政策动态不在此批。

产品例子包括马来西亚陶瓷砖、中国牛肉、印度PVC树脂、印度尼西亚地毯、EU合金元素与马达加斯加面粉。391产品源行、292措施源行在原 CASE_ID 下保留；每案产品上限24、措施12、配额12、豁免24，分别有4个产品组与11个措施组截断。匹配数、保留数、上限和截断各自明确。空表不证明没有措施 / 豁免。HS数值、位数、subset与所有单位/决定标志保留原样，没有补零、税率 / 币种换算、HS版本映射或企业适用推断。

实际下载的通用codebook是反倾销字段说明，未能核验全部保障措施字段含义。阶段日期保留源列名、原Excel序号 / MI / IF / 点标志 / 空值、单元格类型和 nullable 日历日期。WTO_INIT_DATE 不能被提升为已确认立案 / 通报定义或UTC发生时刻；源 publication/update/event 都为空。binding/current_effectiveness、适用地域和企业关系均未知。Q4_2024是资料标签，不是各案发布日。linked WTO / national 原始文献正文没有下载。

[World Bank Dataset0039583](https://datacatalog.worldbank.org/search/dataset/0039583/temporary-trade-barriers-database-including-the-global-antidumping-database)实际HTTP200 JSON-LD注明CC BY4，并将[当前TTBD落地页](https://www.worldbank.org/en/data/interactive/2021/03/02/temporary-trade-barriers-database)列为分发，该页链接此保障措施ZIP。保留World Bank / 作者 / CC BY4 / 标准化 / 无背书出处。落地页链接经官方阅读器检查，其原字节没有保留，digest保持未知；codebook不匹配不会授权重新解释字段。原ZIP、XLS成员、许可页面、安全投影和分片指纹分开；NOTES / 联系人 / 个人 / 文献正文均排除。

准入manifest SHA：9b604e01ab7648285e05837127744dc5b30c45fc15f9e2a38d82dd22c04942b4。原源policy SHA：b1c7c17e568fd664f4aa6ec3e71f2405e8a580a3cf86efb4d7b56d48ecd7de61。完整安全数据ZIP SHA：21cd7cee71e017583e470d964dc8ac4c451864290f99722f766f0e9e8e708a38，须自行取得并解压；不随Git源码复制。

源码/许可/合同、小样例与原始–安全一致性/冲突见证放在source-packs/trade。明确提供外部安全数据路径，可复现全部60行和5个原分片：

```sh
node scripts/build.mjs
node scripts/verify-trade-batch.mjs /path/Dormathon-Trade-Data
python source-packs/trade/run-slice.py reproduce --data-dir /path/Dormathon-Trade-Data
DORMATHON_TRADE_REPORT_DIR=/path/temporary-report python source-packs/trade/run-slice.py test
```

安全数据复现使用Python3标准库和Node24；无需网络/账号或npm安装。新的原始BIFF提取另需xlrd与明确外置原文件，并重新审查schema / vintage / conflict / rights，现有固定请求不能因导入或测试重抓。未建立Windows、OS调度、自主日更或自动Site同步。

实际production Worker/default.fetch/静态资产连接已验证；316项core测试、34项source测试、17项60行隔离接收、13项独立源parity、22项实际回读和12项独立保存数据对照通过。普通500px GUI查询Malaysia Ceramic → 真实MYS-SG-6详情 → 源阶段日期展开 → 返回原query/行焦点通过，宽485px无横向溢出。详见[发布身份](releases/TRADE_REMEDY_2026-10-08.json)。这是有界历史贸易救济案件，不能充当当前全球贸易法规或企业风险覆盖。
