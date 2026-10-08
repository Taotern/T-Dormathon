# Dormathon 本地每日信息采集器

这是一份可解压运行的本地采集器。主界面仍然是 GPT-Site。
采集器不用模型，不需要 npm 安装、账号、密钥、付费计划或新增云服务。
它只请求已经固定登记的十个官方公开来源。

## Windows 快速开始

1. 完整解压 ZIP 到自己可写的普通文件夹，例如 `Documents\DormathonCollector`。不要在 ZIP 内直接运行，也不要用受保护的系统目录或同步中的网络文件夹。
2. 需要 **Node.js 24.x**。如果电脑没有，请从官方 https://nodejs.org/en/download 获取 Windows 版。也可以把官方独立 `node.exe` 放在本包的 `bin` 文件夹；启动器会优先用它。包内不附带 Node，也不会自动下载安装、改 PATH 或修改系统设置。
3. 双击 `01-diagnose.cmd`。应显示 `status: passed`。这个检查不请求上游来源。若失败，保留输出；不要忽略权限或安全警告。
4. 双击 `02-run-once.cmd`，执行当前应跑日期的一次采集并导出快照。部分来源失败时退出码为 3，数据仍保留；启动每日循环会按限制重试。
5. 双击 `03-start-daily-loop.cmd`，保持这个窗口和电脑开启。默认每天 **08:00 Asia/Kuching**；失败来源每至少 16 分钟才重试，每来源每天最多 3 次采集，每次最多 2 个网络请求。
6. 需要手动交给 GPT-Site 时，双击 `04-export-snapshot.cmd`，选取 `exports` 文件夹里的最新 `dormathon-snapshot-...-part...json`。若分成多个文件，逐个导入。界面只有在该版本具备本地快照导入功能时才能接收；不会自动同步。

用 Ctrl+C 停止循环。等待显示 `Stopped` 后再关闭窗口或备份。
不用安装 Windows 服务或计划任务，也不用开防火墙端口。本包不执行这些系统操作。

## 它什么时候能跑

- 程序窗口开放、电脑醒着且有网络时，本地代码按时检查。
- 关窗、关机或休眠时不能执行。恢复后只采集当前仍可取得的重叠来源窗口，同时记录错过的日期；不会把今天的内容伪装成过去每天采到的数据。
- RSS 和即时天气警告的遗漏可能无法补回。十个端点约来自七个发布方，不等于全球完整覆盖或独立交叉确认。
- 来源发布、事件、首次本地观察、采集和分析时间分开保存。未知时间、地点、首次上游出现和延迟不会被编造。
- 本地与 Site 分别持有数据。初期通过手动快照导入。文件 SHA-256 是损坏检测，不是来源真实性保证；导入界面应把文件内容视为不受信任的数据。

## 本地文件和设置

`config.json` 默认明确指定 `Asia/Kuching` 和每天 `08:00`。此版本每日时间固定为 08:00，可改为其他有效 IANA 时区。已经有数据的运行目录不能静默改时区；需要在配置中选择另一个本地 `data_directory` 重新建立账本。

持久数据保存在 `data-local\collector.sqlite`，使用 SQLite WAL 和事务。已有未知数据库不会被覆盖。单独的进程锁防止两个采集窗口并行。异常退出后锁记录会保留，确认原进程已消失后才可自动恢复；不会终止其他进程。

启动阶段另有短暂的 `collector-startup.json` 排他检查。如果恰好在启动阶段异常退出，会安全停下并提示人工检查这个文件。确认其中 PID 对应的进程已退出后，才把这个启动记录移到别处再重试；不要删除数据库。正常停止和已经进入循环后的异常退出不需要这一动作。

快照默认包含最多 1000 个按首次观察时间排序的当前条目，当前版本，以及这些条目的每份规则警报所指向的历史版本和来源采集回执。其他历史修订仍在 SQLite。文件明确记录已选/省略条目数量，不能称作完整历史导入。每个 Site 导入分片最多 1.5 MiB / 1000 条目 / 2000 版本 / 500 回执 / 1000 规则警报；不会破坏原数据库。

在本包目录打开终端后，可使用：

    node collector.mjs status
    node collector.mjs collect-source --source usgs
    node collector.mjs export-site --limit 200
    node collector.mjs verify "exports\某个快照.json"
    node collector.mjs archive
    node scripts/test.mjs

`collect-source --source 注册ID` 只处理这个来源，复用同一个每日任务、持久回执、冷却和重试预算。其它未选来源不会消耗次数；单源成功会明确报告 `operation_status: succeeded`，十源每日任务仍可能是 `in_progress`，不会被单源成功伪装为全部完成。可选 ID 为 `usgs`、`gdacs`、`eonet`、`my_warning`、`my_fuel_latest`、`un_zh`、`ecb`、`bis_press`、`bis_speeches`、`nasa_metadata`；不接受任意 URL。每个操作可能按原瞬时错误策略发起最多两个网络尝试，单独报告 `request_count`；明确拒绝访问不重试。命令不会自动反复调用自身。同一天已成功的来源会跳过请求。

`archive` 是最多 25 MiB 的完整历史 JSON，供本地审阅，不用于 Site 导入。大于上限时会报错并保持数据库完整。
最可靠的完整备份方式是先 Ctrl+C 停止，再复制整个解压目录，包括 `data-local`。不要只复制仍运行中的单个 SQLite 文件；WAL 中可能还有数据。

## 已验证和未验证

代码在隔离的 Linux / Node 24.19.0 环境测试，使用固定离线样例和合成压力案例。
十个实际适配器和共享解析/采集代码与指定 Site 版本逐字节一致，独立 74 个来源契约测试全部通过；本地运行时另有恢复、冷却、事务、时间与快照测试。导出时间在一致性读取完成后才记录，避免同时采集时出现观察时间晚于导出时间。测试不会请求上游。

**Windows 启动器已准备但未在用户的 Windows 上执行验证。** 该电脑的执行器在首条命令执行前遇到访问控制错误；没有通过别的路线绕开。不能据此称本地安装或每日时钟已经验收。

## Provenance and boundaries

- Source Site commit: `e197857444fa3c5386d1e896f10c0cc8814d2f9b`
- Prepared sidecar commit: `4cdbb2202eb06046529dbe819bbbc09279efcece`
- Catalog SHA-256: `8cb6d74e029b066e4dc6660ec32e804078f3e2c941b5140566052fc94191ef27`
- `data/adapter-provenance.json` pins the original adapter/shared code bytes. Production uses `runtime/supervisor.mjs`, not the copied cloud scheduled wrapper. No cloud deployment configuration is included or required.
- `tests/source-contracts` is an independent fixed-golden fixture pack. Retained safe projections are reconstructed envelopes, not preserved original HTTP responses or fresh observations. Its runner has only a portable URL-to-path fix; golden cases/fixtures are unchanged.
- The package has no private Site token or machine ingestion credential, and performs no publication or external commercial deployment.
