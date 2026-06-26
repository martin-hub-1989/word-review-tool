# 介词专项闯关模块 — 设计文档

日期：2026-06-26
面向用户：哥哥（四年级）
素材：`词库/四年级下学期英语介词固定搭配表.md`（50 组固定搭配）

## 1. 目标

新增第 6 种闯关模式 `prep`（介词专项），**仅哥哥可见**。题目展示固定搭配的中文含义与带空格的搭配，把核心介词隐去，让孩子从 4 个介词中选 1 填入。下方附带同样带空格的例句作为语境提示。强化四年级常考介词固定搭配的辨析与记忆。

## 2. 数据：新词库文件

新文件 `wordbanks/grade4-prep.json`：

```json
{
  "meta": { "child": "哥哥", "title": "四下·介词固定搭配", "grade": 4 },
  "items": [
    {
      "word": "be good at",
      "meaning": "擅长……",
      "type": "prep",
      "prep": "at",
      "category": "形容词+介词",
      "example": "I'm good at swimming.",
      "exampleMeaning": "我擅长游泳。",
      "confusables": ["for", "with", "in"]
    }
  ]
}
```

**字段**：
- `word`：完整搭配（核对 / 发音用）
- `meaning`：中文含义（主判断区展示）
- `type`：固定 `"prep"`（隔离，原有 5 模式不收）
- `prep`：要考的核心介词（唯一正确答案）
- `category`：`"动词+介词"` / `"形容词+介词"` / `"介词短语"`（干扰项来源）
- `confusables`：易混淆介词数组（优先作干扰项）
- `example` / `exampleMeaning`：例句及其中文（复用现有字段，语境区）

**多介词搭配只考 1 个核心介词**（隐去 1 个介词位）：
- `take care of` 考 `of`；`a pair of` 考 `of`；`in front of` 考 `of`；`a lot of` 考 `of`
- `help ... with ...` 考 `with`
- `by bus / car / bike` 考 `by`，例句 `I go to school ___ bus.`

**50 条来源**：词库 md 三张表逐条转——动词+介词 20 组、形容词+介词 15 组、介词短语 15 组。每条 `confusables` 依据"四、易混淆搭配对比"节 + 同类近义介词人工标注，保证干扰项真"易混淆"。

## 3. 架构嵌入

### 3.1 模式注册

`MODES` 数组追加（仅哥哥模式页显示，见 3.6）：
```js
{id:"prep", emoji:"🔤", title:"介词专项", sub:"选对介词填空"}
```

### 3.2 模式分发

`startGame` 的 render 映射追加：
```js
const render={spell1:...,mean1:...,cloze:renderCloze,prep:renderPrep}[game.mode];
```

### 3.3 类型隔离

`isItemUsable` 追加分支——`prep` 模式只收 `prep` 类，且 `prep` 条目不进其他模式：
```js
if(mode==="prep") return it.type==="prep";
```
（原有 5 模式的 `isItemUsable` 不会匹配 `type==="prep"`，天然隔离）

### 3.4 渲染 `renderPrep(it)`

布局：
```json
        擅长……              ← it.meaning（大字，主判断区）
   🔊 听发音
   be good ___               ← 搭配带空格（高亮空格）
   I'm good ___ swimming.    ← 例句带空格（语境，联动同一空格）
   [at] [for] [with] [in]     ← 4 个介词选项（数字键1-4 / 点击）
```
- 搭配空格：`word` 字段里把 `prep` 替换成 `<span class="prep-blank">___</span>`。
- 例句空格：**运行时正则**定位 `example` 中的目标介词（`\bat\b` 整词匹配，忽略大小写），替换成空格 span。若例句中该介词出现多次，**只隐去首个**（其余保留）。搭配与例句的空格联动——选中介词后两处同时填入。
- 空格填入用 DOM class 切换（`prep-blank` → 填入字母），不重渲染整题。

### 3.5 选项生成 `buildPrepOptions(it)`

1. 正确介词 = `it.prep`
2. 干扰项优先取 `it.confusables`（易混淆，词库预置）
3. 不足 3 个 → 从**同 `category`** 其他条目的介词补
4. 还不足 → 全局高频介词池 `["in","on","at","for","of","to","with","about","after","from"]` 补
5. 4 个打乱顺序

### 3.6 仅哥哥可见

`renderBanks` 按 `meta.child` 过滤，prep 词库 `child:"哥哥"` → 天然只在哥哥名下显示。模式选择页 `renderModes` 渲染 MODES 时，对弟弟隐藏 `prep`（弟弟词库无 prep 条目，`prep` 模式可选数 0，渲染时跳过无可用题的模式即可，无需硬编码身份判断）。

## 4. 交互

- **选择即提交**（与 mean1/mean2 选择题一致，不引入回车）。介词四选一点一下即定，不存在"最后字母敲错来不及改"问题。
- 数字键 1-4 + 点击选项均可（复用现有 `keydown` 选择题分支与 `chooseOption` 机制）。
- 答对：复用 `flash(true)`，进下一题。
- 答错：复用"显示正确答案 3 秒"逻辑，正确介词标绿。

## 5. 复用现有机制（无需特判）

- **错题本**：答错/超时入库 `itemKey(bid,it)`，复用现有机制。错题练习入口选可用模式时，`prep` 条目只能用 `prep` 模式重练（`isItemUsable` 保证）。
- **冰淇淋彩蛋**：介词答对累加 `correctTotal[identity]`，正常触发 50/100...。
- **发音**：`speak(it.word)` 读完整搭配（"be good at" 连读）。
- **备份**：`JSON.stringify(store)` 自动覆盖进度，无新字段。

## 6. 工程约束

- **改源不改衍生**：在 `单词闯关开发版.html` 实现，用 build 脚本重编两衍生版。
- **build-share.js**：bankFiles 追加 `wordbanks/grade4-prep.json`（四年级版 → 5 库）；更新词库数断言。
- **build-local.js**：bankFiles 追加同一文件（本地版 → 8 库，prep 归哥哥）。
- **verify-share.js**：更新子库数（4→5）与条目数断言（生成后定实际数）。
- **改后必校验**：JS 语法检查 + verify-share 全断言 + jsdom 模拟介词选择场景。

## 7. 非目标（YAGNI）

- 不做"填入介词后整句发音"之外的额外动画。
- 不为介词模块单独做进度统计页（复用现有星级/错题数）。
- 不做介词的自由输入（敲字母填介词）——四选一足够，且与"回车提交"无关。
- 弟弟不加介词模块（素材是四年级专用）。
