# DECISIONS.md — 关键决策记录

> 每次做出影响后续的决策时追加记录。读到这里的决策不要自行推翻，需改先向用户确认。
> 格式：日期 - 标题，含 决定 / 理由 / 影响。

---

## 2026-06-23 — 单文件自包含 HTML，零依赖

**决定**：工具做成单个 HTML 文件，内嵌 CSS/JS，不依赖网络与任何框架。

**理由**：孩子 / 家长需要双击即用，不能要求装 Node、不能联网下载 CDN。跨平台（电脑/平板/手机浏览器）零安装门槛最低。

**影响**：
- 不引入任何 npm 前端框架，所有逻辑用原生 JS。
- 发音用浏览器 `speechSynthesis`，不生成音频文件。
- 衍生版把词库、照片全部 base64 内嵌进 HTML，单文件可离线分享。
- PDF 解析用本地打包的 `lib/pdf.js`（仅开发版需要，衍生版已删）。

---

## 2026-06-23 — 词库 JSON 格式（meta + items，type 区分词/短语/句）

**决定**：每个词库文件结构为 `{ meta:{child,title,grade}, items:[{word,meaning,ipa,type,example,exampleMeaning}] }`。`type` 取值 `word`/`phrase`/`sentence`，决定可进入哪些模式。

**理由**：需要同时支持单词、短语、整句练习；`type` 让渲染逻辑能按类型分发。`grade` 驱动难度自适应（一年级隐字少、提示多；四年级更难）。

**影响**：
- 任何新词库必须遵循此格式，否则 `addBank` 报「文件格式不对」。
- `isItemUsable(mode, it)` 按 type 过滤：拼写模式只要 word 或无空格 phrase；完形必须有 example。
- 词库由 Claude 离线生成精品版（补全音标例句），不在 HTML 内做 OCR。

---

## 2026-06-24 — 源→生成器→衍生品 三版本架构

**决定**：只维护 `单词闯关开发版.html` 一份源真相，用 `tools/build-share.js` 生成四年级版、`tools/build-local.js` 生成本地版。衍生版由脚本字符串替换生成，每处断言唯一命中。

**理由**：三个版本差异大（词库数、是否含身份选择、是否固化照片），手改三份会漂移出错。生成器保证可重现、可验证。断言唯一命中防止改了源却静默生成坏衍生品。

**影响**：
- **绝不能手改衍生版 HTML**，下次重编会覆盖。
- 改了开发版后，若 build 脚本的 `old` 串因源变动而失配，必须同步更新 build 脚本的 `old`/`new`，否则断言抛错。
- 任何源 HTML 结构变动（如改了某个 span 内容）都要检查两个 build 脚本的替换规则是否仍匹配。

---

## 2026-06-24 — 三版本 localStorage 隔离（独立 LS_KEY）

**决定**：开发版 `wordReviewTool.v1`、四年级版 `wordReviewTool.share.v1`、本地版 `wordReviewTool.local.v1`，各自独立存储键。

**理由**：三版本并存于同一浏览器时，进度、词库、身份不能互相覆盖。尤其本地版 vs 四年级版可能同机使用，必须隔离。

**影响**：
- 备份文件跨版本不通用（key 不同，store 结构同，导入后需手动适配 key，或仅在同版本间迁移）。
- 调试某版本时清缓存要清对应 key，不能误清。

---

## 2026-06-25 — loadStore 字段补全（migration），不信任旧数据

**决定**：`loadStore()` 解析旧 JSON 后逐字段补全——`banks` 为 null 修回对象，`correctTotal`/`iceCream` 缺失补 `{}`，`identity`/`photo` 做类型校验。默认值先建完整对象再合并。

**理由**：旧版本写入的 store 缺新字段时，`updateIceCreamDisplay()` 读 `store.iceCream[child]` 会因 `iceCream` 是 undefined 抛 `Cannot read properties of undefined`，导致**脚本在启动代码当场崩溃**——词库未注入、照片点击未绑定，用户看到「点击无效果 + 词库不见了」。这是用户报告的真实 bug，jsdom 复现确认。

**影响**：
- 今后新增 store 字段时，**必须同步在 `loadStore` 的补全逻辑里加兜底**，否则旧用户升级后同样会崩。
- 补全逻辑要防御 null（`JSON.parse` 出来的字段可能是 null 而非 undefined），用 `&& typeof === "object"` 判断。
- `renderBanks`/`enterTotal` 过滤行也加固：跳过无 meta/items 的损坏条目，而不是崩溃。

---

## 2026-06-25 — popping 动画 class 必须显式清除

**决定**：`enterIdentity` 在 380ms setTimeout 回调里 `classList.remove('popping')`；`switchIdentity` 回欢迎页前清掉所有卡片的 popping。

**理由**：`popping` class 对应 CSS `.id-card.popping{animation:popBurst .42s ease both;pointer-events:none}`——动画 `both` 保持末帧（opacity:.3），且 `pointer-events:none` 禁用点击。若不清除，点过的卡片永久禁用。哥哥玩一次+弟弟玩一次后两张卡都废，回欢迎页选不了——用户报告的真实 bug。

**影响**：
- 今后任何用 CSS 动画 class 控制交互状态的，都要在动画结束后或状态切换时显式移除，不能依赖动画自然结束（`both` 会保持末帧）。
- 改动 enterIdentity 的 setTimeout 时延时，popping 清除的时延要同步调整（当前都用 380ms）。

---

## 2026-06-25 — 冰淇淋彩蛋按身份独立统计

**决定**：`store.correctTotal` 和 `store.iceCream` 是按孩子名 key 的对象（`{哥哥:120, 弟弟:60}`），不是全局计数。每答对 1 个累加当前 `identity` 的计数，每满 50 且名额<5 触发。

**理由**：两个孩子各自累计，互不影响。否则哥哥答的词算到弟弟头上不公平。

**影响**：
- 冰淇淋进度随身份走，切换身份后统计切换。
- 备份导出 `JSON.stringify(store)` 自动覆盖这两个字段，无需特殊处理。
- 显示位置：欢迎页照片下方 `#iceBadge-{name}` + 首页身份栏旁。
