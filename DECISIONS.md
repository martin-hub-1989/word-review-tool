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

---

## 2026-06-25 — 发音主动选最自然 voice（不依赖浏览器默认）

**决定**：`speak()` 增加 `bestEnglishVoice()`，按优先级主动挑英文 voice——神经网络自然音（`Natural`/`Aria`/`Jenny`/`Samantha`/`Google US English` 等）> 高质量本地音 > 默认英文。页面加载时预热 voice 列表（`getVoices()` + `onvoiceschanged`）。

**理由**：原 `speak()` 只设 `lang=en-US` 不指定 voice，把音色选择权交给浏览器默认。Windows 上第三方套壳浏览器（如豆包）常退化成旧 SAPI5 机器音（David/Zira），听感生硬——用户反馈"发音变生硬"即因此（非代码回归，`speak` 从未改）。主动选 voice 可在 voice 齐全的浏览器保证选到最自然音。

**影响**：
- 新增 `NATURAL_HINTS` / `GOOD_HINTS` 常量与 `bestEnglishVoice()` 函数，三版本经 build 脚本同步。
- **诚实限定**：若浏览器根本没加载任何自然 voice（被墙/离线/精简），代码无法凭空生成好音色，只能换浏览器。诊断页 `tools/语音诊断-Windows.html` 可查实际用了哪个 voice。
- voice 名称匹配靠关键字，未来新 voice 若不含已知关键字会落到"默认英文"档，需适时补 `NATURAL_HINTS`。

---

## 2026-06-25 — 拼写/完形填满后按回车提交（不自动判）

**决定**：拼写闯关 1/2 和完形填空模式，所有空格填满后**不自动提交**，停在已填满状态（可退格修改），按回车（物理 Enter 或虚拟键盘"⏎ 提交"键）才判对错。未填满按回车提示"还有 N 个字母没填"，不提交。

**理由**：原 `checkSpellDone()` 每输一字母即检查，填满即自动 `judge`——导致敲最后字母时若敲错没有修改余地就被判。用户明确要求改为回车提交。选择题（数字键 1-4）保持"选择即提交"不变，因不涉及"最后字母"问题。

**影响**：
- `checkSpellDone` 不再自动 `judge`，只标记 `spell.cursor=-1` + 显示"按回车提交"提示；新增 `submitSpell(it)` 承担原 judge 职责。
- 三模式复用同一 `spell` 结构，改一处全生效。
- 填满后 `cursor=-1`，继续敲字母会被挡（`handleLetter` 开头 `cursor<0 return`）；改字靠退格回退。若未来要支持"填满后覆盖最后字母"，需调整该判断。
- `keydown` 加 `Enter` 分支；虚拟键盘 `buildKeyboard` 加"⏎ 提交"键（触屏等价回车）。

---

## 2026-06-26 — 介词专项模式 prep（type=prep 隔离 + 选择即提交）

**决定**：新增第 6 种模式 `prep`（介词专项），仅哥哥可见。新词库 `grade4-prep.json`（50 组固定搭配，`type:"prep"`），用新 type 隔离：`isItemUsable("prep", it)` 只收 `type==="prep"&&it.prep`，原有 5 模式因判断 `word/phrase` 天然不收 prep 条目。题目展示含义 + 搭配带空格 + 例句带空格（两处联动），从 4 个介词选 1。干扰项优先 `confusables`（词库预置易混淆介词）> 同 `category` > 全局池 `PREP_POOL`。

**理由**：四年级介词固定搭配是考点专项，需独立模式强化辨析。用 `type:"prep"` 隔离避免介词搭配混进拼写/意思闯关。干扰项优先易混淆介词（呼应词库"易混淆搭配对比"节），教学价值最高。例句空格运行时正则定位（`\bprep\b` 首个），比词库预置位置灵活——例句改了不用改代码。

**影响**：
- 新增 `renderPrep`/`buildPrepOptions`/`choosePrep`/`fillPrepBlanks` + `PREP_POOL` 常量；`MODES` 加 prep、`isItemUsable` 加分支、`nextQuestion` render 映射加 prep。
- `enterScope` 改为过滤无可用题的模式（`scopeItems().some(isItemUsable)`）——这同时让弟弟词库模式页不显示介词专项（弟弟无 prep 条目）。**此改动是通用的**：今后任何只服务特定年级的模式都靠此机制隐藏。
- 介词模块**选择即提交**（同 mean1/mean2），不引入回车——介词四选一点一下即定，不存在"最后字母敲错来不及改"问题。
- 复用 `judge`/`speak`/错题本/冰淇淋/备份，无新 store 字段。
- prep 词库 `child:"哥哥"`，天然只在哥哥名下显示，无需硬编码身份判断。
- build-share 5 库 286 条、build-local 8 库 396 条；verify 断言同步更新。
