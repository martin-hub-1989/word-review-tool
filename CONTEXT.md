# CONTEXT.md — 项目背景与核心假设

> 本文件定义项目背景、术语、核心假设。新 Agent 先读本文件建立全局认知。
> 很少更新，仅当对项目的理解发生根本变化时修改。

## 项目是什么

**单词闯关乐园** —— 给家里的两个孩子（哥哥 / 四年级、弟弟 / 一年级）用的英文单词与句子复习工具。自包含单文件 HTML，双击即用，跨平台（电脑 / 平板 / 手机浏览器），零安装、零网络依赖。

核心价值三合一：**复习内容 + 练键盘 + 错题强化**。

仓库：`https://github.com/martin-hub-1989/word-review-tool.git`，分支 `main`。

## 术语表

| 术语 | 含义 |
|------|------|
| **开发版** | `单词闯关开发版.html` —— 源真相，可加载任意 JSON/PDF 词库，开发调试用 |
| **四年级通关版** | `单词闯关四年级通关版.html` —— 内嵌四年级 4 词库 236 条的固化分享版，仅哥哥 |
| **本地版** | `单词闯关本地版.html` —— 内嵌哥哥+弟弟共 7 词库 346 条、含身份选择欢迎页的全家版 |
| **子库** | 每个词库文件 = 一个子库（如「四下 Unit 1-2」），可单独专项练习 |
| **总库** | 同一孩子名下 ≥2 个子库时自动生成的合并卡片，把该孩子所有子库一起练 |
| **身份 / identity** | 当前玩家 = `哥哥` 或 `弟弟`，决定显示哪套词库、独立统计进度 |
| **精品词库** | 带准确释义、音标、例句的 JSON 词库（vs 文字版 PDF 抽取的粗坯） |
| **错题本** | 答错或答对但超时(μ+1σ)的题自动入库，连续答对 3 次毕业移出 |
| **冰淇淋彩蛋** | 隐藏功能：某孩子累计答对每 50 个词兑换 1 个 🍦 名额，封顶 5 个，显示在照片后 |

## 核心假设

1. **词库由 Claude 离线生成**，不在 HTML 内做照片 OCR。
2. **发音用浏览器 Web Speech API**（`speechSynthesis`），不生成音频文件。
3. **进度存浏览器 localStorage**，换设备用导出/导入备份迁移，不做云端账号/同步。
4. **三版本隔离存储**，各自独立 LS_KEY，互不干扰（见 [DECISIONS.md](DECISIONS.md)）。
5. **源→生成器→衍生品架构**：只改开发版，衍生版由 build 脚本生成，不手改衍生版 HTML。

## 存储键隔离（关键，勿混）

| 版本 | LS_KEY |
|------|--------|
| 开发版 | `wordReviewTool.v1` |
| 四年级通关版 | `wordReviewTool.share.v1` |
| 本地版 | `wordReviewTool.local.v1` |

> ⚠️ localStorage 跨版本不互通。旧版本写入的 store 可能缺新字段（`correctTotal`/`iceCream`），`loadStore()` 已做字段补全（migration），见 [DECISIONS.md](DECISIONS.md)。

## 目录结构

```
背单词小游戏/
├── 单词闯关开发版.html      # 源真相(改这里)
├── 单词闯关四年级通关版.html  # build-share.js 生成(哥哥专用分享)
├── 单词闯关本地版.html       # build-local.js 生成(全家版分享)
├── wordbanks/              # 精品词库 JSON(7 个:4 哥哥 + 3 弟弟)
├── 照片/                    # 哥哥.jpg / 弟弟.jpg(身份选择+游戏头像)
├── 词库/                    # 原始素材:PDF 知识清单 + md 转录 + 一年级单词表
├── lib/                     # 本地打包 pdf.js(开发版 PDF 解析用,离线)
├── tools/                   # build-share.js / build-local.js / verify-share.js
├── docs/superpowers/specs/  # 设计文档(面向用户的功能说明)
├── README.md                # 面向用户的说明
└── CONTEXT/PLAN/PROGRESS/DECISIONS.md  # 面向 Agent 的状态文件(本组)
```

## 关键运行机制速查

- **屏幕切换**：`show(screen)` 移除所有 `.screen` 的 `active`，给目标加 `active`。CSS `.screen{display:none}` / `.screen.active{display:block}`，欢迎页特殊用 `#screen-welcome.active{display:flex}`（注意带 `.active`，否则 ID 选择器优先级过高会盖住首页）。
- **身份切换**：点照片 → `enterIdentity(child)`（pop 动画 → 380ms 后渲染词库）。「🔄 切换」按钮 → `switchIdentity()` 回欢迎页。popping class 必须在动画后/切换时清除，否则卡片永久禁用。
- **词库注入**：衍生版启动时 `EMBEDDED_BANKS.forEach` 幂等注入，按 `meta.child` 过滤显示。
- **冰淇淋**：`judge()` 里每答对 1 个累加 `correctTotal[identity]`，每满 50 且名额<5 触发 toast 并加 🍦。
