# PROGRESS.md — 实时进度追踪

> 每完成一个子任务后立即更新本文件，再向用户汇报。

## 最后更新：2026-06-25

## 当前状态

维护期，无进行中任务。三版本稳定可用，工作区干净，最新提交 `0eaa126` 已推送至 `origin/main`。

## 已完成

### 词库建设
- [x] 四年级精品词库 4 个子库（U1U2/U3U4/U5U6/四会专项，共 236 条）→ `wordbanks/grade4-*.json`
- [x] 一年级精品词库 3 个子库（人物方位与数字/身体与动物/服装运动与活动，共 110 条）→ `wordbanks/grade1-*.json`

### 三版本架构
- [x] 开发版（源真相，可加载 JSON/PDF，含 lib/pdf.js 离线解析）→ `单词闯关开发版.html`
- [x] 四年级通关版（内嵌 4 词库 236 条，固定哥哥，固化分享）→ `单词闯关四年级通关版.html`（由 `tools/build-share.js` 生成）
- [x] 本地版（内嵌 7 词库 346 条，照片 base64，身份选择欢迎页）→ `单词闯关本地版.html`（由 `tools/build-local.js` 生成）

### 身份与个性化
- [x] 欢迎页照片卡片选择身份（哥哥/弟弟）→ 开发版 + 本地版
- [x] 游戏界面右上角显示当前玩家照片（`store.photo`）
- [x] 切换玩家按钮（`switchIdentity`）
- [x] 按身份过滤词库（`renderBanks` 按 `meta.child` 筛选）

### 功能特性
- [x] 五种闯关模式（拼写1/拼写2/意思1/意思2/完形）+ 难度按 grade 自适应
- [x] 虚拟键盘高亮 + 字母提示开关（学习高亮、闯关不提示，防错字母变红泄漏）
- [x] 错题本（分子库/总库，答错或超时 μ+1σ 入库，连对 3 次毕业）
- [x] 题数「全部」选项（考前查缺补漏，每词各一次）
- [x] 冰淇淋彩蛋（累计答对每 50 词兑换 🍦，封顶 5 个，按身份独立统计）
- [x] 屏幕切换动画（fadeSlideIn）+ 照片弹出特效（popBurst）
- [x] 备份导入/导出（`JSON.stringify(store)`，自动覆盖所有字段含冰淇淋进度）
- [x] 发音主动选最自然 voice（`bestEnglishVoice`：自然音 > 高质量本地 > 默认；页面加载预热 voice 列表）→ 提交 `bff07d3`
- [x] 拼写/完形回车提交（填满不自动判，按回车或"⏎ 提交"键才判；未填满回车提示剩余数）→ 提交 `a9fd814`
- [x] 介词专项模式 prep（仅哥哥，type=prep 隔离；含义+搭配带空格+例句带空格联动；干扰项易混淆优先；选择即提交）→ 提交 `7614255`/`c65bd9c`/`3b7de4e`/`0eaa126`

### Bug 修复（近期，含根因）
- [x] `loadStore` 字段补全（migration）→ 旧版 localStorage 缺 `correctTotal`/`iceCream` 或 `banks=null` 导致启动崩溃（`updateIceCreamDisplay` 抛异常，词库未注入、点击未绑定）→ 提交 `4edf28a`
- [x] `renderBanks`/`enterTotal` 过滤行加固 → 跳过无 meta/items 的损坏 bank 条目 → `4edf28a`
- [x] `switchIdentity`/`enterIdentity` 清除 popping → popping 残留导致切换后卡片永久禁用 → `43a02c3`
- [x] `#screen-welcome.active`（带 .active）→ ID 选择器优先级过高盖住首页 → `a885b4f`
- [x] 冰淇淋"没出现"排查 → 逻辑代码正确（纯函数验证 ct=50/100/150/200/250 各触发一次，封顶 5）；根因是旧 localStorage 启动崩溃（`4edf28a` 已修），崩溃发生在 judge 之前导致 correctTotal 未累加 → 复核确认 `bff07d3` 后正常

### 验证工具
- [x] `tools/verify-share.js`（44 项断言：语法/词库完整/无外部依赖/无悬空引用/开关逻辑/冰淇淋字段）
- [x] jsdom 真实 DOM 模拟测试套件（localStorage 污染 6 场景 + 反复切换玩家场景）→ `/tmp/wr-test/`

## 下一步

- [ ] 无明确待办。等用户提出新需求。

## 阻塞项

无。

> 历史阻塞已全部清除。最近一次阻塞是 GitHub 网络不通导致 push 超时，已恢复并推送。
