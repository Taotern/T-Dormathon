# 世界银行年度 GDP 来源程序

一个来源，三个不可变取得批次，合计 1990–2025 的 9,540 个年度报告行。不是三个新来源。报告维度是 217 个世界银行经济体和 48 个重叠汇总组；其中 177 个经济体在全部 36 年有数值、214 个至少一年有数值，411 个经济体—年份单元由源返回 null。VGB/GIB/PRK 全时段没有数值。2026 没有返回观察行，不补成零或假数据。

单位为源注明的当年价格美元，scale=1；不是固定价格、PPP、实际增长率或风险预测。分类来自当前保留维度，不重建历史边界。全批只有一个资料版本日 2026-07-13，不是历史发布版本或每条观察的更新时间。来源/许可依据和年度口径保留在三个 source manifest 中，CC BY4.0 署名及资料条款适用于下游消费。

## 代码和数据分离

Git 保留一个确定性 GDP parser、统一七范围的固定请求/复现程序、三个批次的 source/delivery manifest，以及少量实际源字段样例。当前源码清单在 `MANIFEST-SHA256.txt`；原 producer 清单在 `provenance/`，只是输入身份，不宣称所有外部数据已在 Git。

完整原始响应、国家—年份矩阵和 111 分片在三个独立外部数据包，完整性身份为：

| 批次 | 年份 | 行 / 分片 | 外部 ZIP SHA-256 |
| --- | --- | --- | --- |
| v0.9.1 | 1990–94、2020–25 | 2,915 / 34 | `efbe41e76dd578002941d0592f01fabdcf93650acdb7534eace1e0c92985935e` |
| v0.10.0 | 1995–2004 | 2,650 / 31 | `832fff95af756500f1cd7f13dc2bd1b942129b0051ec820bc258487e4586c386` |
| v0.11.0 | 2005–2019 | 3,975 / 46 | `0d5aa2d4e709f79d89eebb040ffe51038ae967a1d0291f27a94d54349825b7bb` |

存放路径由操作者明确提供，不包含账号、密钥、安装中的数据库或隐藏工作区依赖。仓库克隆不自动获得拥有者的外部附件或私有 Site 权限。

## 离线检查

仓库根目录 `npm test` 检查四个保留真实样例、字段/年份/单位/缺失值、同源多批完成状态、版本策略引用和索引消费合同。不需要外部数据、网络或账号。

取得三个数据包并在各自目录解压后，可在仓库根执行：

```sh
node scripts/build.mjs
node scripts/verify-history-batch.mjs /path/v09/delivery /path/v10/delivery /path/v11/delivery
```

该命令核对全部原字节指纹，分别原子导入到独立 SQLite，证明 111 分片/9,540 行、同源批次独立完成、源 null/名义单位/年份、允许词项和错误进入方式无命中。不会请求来源或写线上产品。普通 `npm run verify:data` 仍只复现 Git 内的 229 分片/20,644 行，并明确报告外部批次未载入。

## 一套明确有界的取得程序

Python3 和 Node24 标准库，无 npm 依赖。统一入口覆盖七个固定年度范围，来源适配器仍是原已验收 v0.9 的同一字节文件：

```sh
python source-packs/worldbank-gdp/run.py routes
python source-packs/worldbank-gdp/run.py acquire --data-dir /path/new-acquisition --metadata
python source-packs/worldbank-gdp/run.py acquire --data-dir /path/new-acquisition --slice wb_gdp_1995_1999 --slice wb_gdp_2000_2004
python source-packs/worldbank-gdp/run.py reproduce --input-root /path/foundation --input-root /path/middle --input-root /path/completion --output-dir /path/derived
```

范围固定为 1990–94、1995–99、2000–04、2005–09、2010–14、2015–19、2020–2026（实际近期包只返回至 2025）。每次调用至多两个明示请求。请求意图先保存、Linux 总期限 30 秒、体积上限 2 MiB、拒绝跳转、任意地址与自动重试。已有尝试先读取保存结果；拒绝与限流锁保持，真实 Retry-After 留存。统一入口本身的验证没有再次请求来源。

原 v0.9 的三个固定范围脚本已由统一入口替换，原源码与取得记录仍可从 Git 历史及输入清单恢复。旧 socket-timeout 限制回执只解释历史取得，不代表新入口采用相同期限实现。统一入口的生产新取得、Windows、OS 调度及自动 Site 同步仍未验收。

从三个独立外部数据包的实际根目录，可以运行同一入口的离线检查：

```sh
DORMATHON_GDP_TEST_INPUT_ROOTS='["/path/foundation","/path/middle","/path/completion"]' python source-packs/worldbank-gdp/test-offline.py
```

12 个离线检查重现 111 个原分片 / 9,540 行以及固定真实样例，检查有界请求、已记尝试、拒绝/限流与请求前回执。支持只加载一个或两个原包，报告未加载的批次，不把局部复现提升为完整历史。

新取得数据应按实际字节生成新的审查批次；旧准入哈希不会自动许可新响应。生产发布和机器鉴权需要既有 Site 权限，源码不提供个人令牌替代通道。
