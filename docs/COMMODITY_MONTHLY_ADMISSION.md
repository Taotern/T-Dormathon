# 月度商品基准与历史

本批2026-10-08 17:49:09–17:56:58 UTC实际接收，35条月度名义商品参考序列、15,435单元格 /250固定分片。先接收2020-01–2026-09的2,835格 /46分片，再接收不重叠的1990-01–2019-12的12,600格 /204分片。当前总51,457索引文档、0待处理；369直接、100上传未验证、50,988外部快照与8旧规则保持。所有旧412分片未重放；本站没有请求来源。

实际来源是[World Bank Pink Sheet](https://www.worldbank.org/en/research/commodity-markets)2026-10-02版历史Monthly Prices工作簿，以及同版当前PDF定义 / 单位说明。取得各一次。范围包括能源、工业与贵金属、农业、原材料、木材和肥料。保留Brent/原油平均、煤与天然气、铝铜铅锡镍锌、金银铂、棕榈油/大豆/豆粕/玉米/米/小麦/可可/咖啡/糖、大麦、棉/橡胶、马来西亚木材和尿素/DAP/磷矿等35条参考序列。不是实时交易报价、世界各国价格、所有商品或企业风险覆盖。

每条441个月；33条全段是数值，TSR20有108早期缺失、barley有73近期缺失，合计181源缺失原样保留，不补零、插值或同源替代。70个名义价格列中选择35，另有34未选、Iron ore 1条分母冲突隔离；第71个非空数据列是natural-gas index，排除。工作簿Iron ore单位$/dmtu与当前PDF$/dmt不一致，未换算或假定历史口径一致。

单位为源提供的美元/桶、吨、million Btu、千克、troy ounce或立方米，scale1。没有年化、换汇、换单位或通胀调整。地名与底层提供者是原始基准定义参照，未变为事件国家、运营足迹、企业关系或地图坐标。描述内的settlement/futures/forward输入照源保留；到期、合约标识和可交易性未验证，此记录不是交易合同。

历史定义和原方法变更备注保留，不能假设441个月同一规格。LNG的最近两个月均值估算规则相对最后观察月2026-09，当前窗口2026-08/09在immutable见证中；Source没有逐格估算标志，数字不等于confirmed-observed。South Africa coal等估算期/替换/修正也保留。A108单星号描述forecast series；A109双星号与当前PDF是近期变更注记，两个标记不混用。实际A2/A4名义价格 / 版次表头经保留原文纠正并单独绑定；source_forecast=false只指历史Monthly Prices单元格，不能解释为该系列没有独立预测产品或全部未经估算。未来月2026-10及之后未导入。

[Dataset0038238](https://datacatalog.worldbank.org/search/dataset/0038238/commodity-prices-history-and-projections)注明Public /CC BY4并链接当前Commodity Markets资产；保留World Bank Prospects Group、许可、选择 / 标准化和无背书出处。提供者名称是编制出处，不授予Bloomberg等专有feed、文章、软件或logo的访问/使用权。完整XLSX/PDF、其它工作表/预测/年期/实值指数、个人联系和文章正文不进产品或Git。

原policy SHA aa7cb30c93f06c579199053d5d2c0286af00166f463d9a823c9d6f20d2cbf856；当前manifest885b953b49c9c04aa45e40440aed7967a25232e312441091ac76fd9a1cca107c，历史manifest877ce998aeb2988796a9db74278bde7377a6afaed262feb3b6935b343b81edda。工作簿raw SHA与2.86MiB安全向量 /分片指纹分开。完整版安全数据外部ZIP SHA ed1bd935d8d370266c4fb884499aca56b468622bc8e7389f3a53f86a74bc02eb，须自行取得/解压；源码克隆没有附件或私人Site权限。

```sh
node scripts/build.mjs
DORMATHON_COMMODITY_REPORT_DIR=/path/temporary-report python source-packs/commodity/run-slice.py test
python source-packs/commodity/run-slice.py reproduce --data-dir /path/Dormathon-Commodity-Data
node scripts/verify-commodity-batches.mjs /path/Dormathon-Commodity-Data
```

Linux、Python3标准库、Node24足够；隔离复现全部15,435格 /250原分片，32源检查、26原子入库 /检索检查无网络。Source只保留代码、许可、合同、9个原样例、方法 / 缺失范围和关键资格见证；raw body、完整vector/chunks、runtime/cache/report/private state在外部。World Bank声明second-business-day monthly更新，下一次2026-11-03；自主采集、Windows、OS调度、自动Site同步均未验证。

实际入库runtime cea25c8，状态词修正 /源码依赖整理runtime3985074；原价格数据及索引不变。320core检查、32源检查、13来源parity、6资格连接、实际250分片、30回读（9immutable证据+300有界文档+负例）通过。最终回读复用15份早期已核验响应，再做6个只读请求；两个runtime分开绑定，首GET timeout及reader-local变量错误原回执保留，不涉及写入重放。普通500px查询Brent数值/单位和Barley真实缺失→详情→返回query /行焦点通过，485px无横向溢出。独立来源13、资格6、保存数据14项复核均通过；[发布身份](releases/COMMODITY_MONTHLY_2026-10-08.json)单独绑定入库与状态修正runtime。
