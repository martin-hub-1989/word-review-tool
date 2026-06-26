# 介词专项闯关模块 实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 新增第 6 种闯关模式 `prep`（介词专项，仅哥哥），从 50 组固定搭配中出题，展示含义 + 搭配带空格 + 例句带空格，孩子从 4 个易混淆介词中选 1 填入。

**Architecture:** 新增一个精品词库 `wordbanks/grade4-prep.json`（type=prep 隔离），在开发版 HTML 加一个 `renderPrep(it)` 渲染函数 + `buildPrepOptions(it)` 选项生成 + `isItemUsable`/`MODES`/`enterScope`/`startGame` 的接入点。改源不改衍生，改完用 build 脚本重编两个衍生版。

**Tech Stack:** 原生 JS、Web Speech API、localStorage、jsdom 测试、Node build 脚本。

## Global Constraints

- 源真相是 `单词闯关开发版.html`，**改完必须重编** `tools/build-share.js` 与 `tools/build-local.js` 产出衍生版，绝不手改衍生版。
- 改完内联 JS 后用 `node -e` 语法检查（见 memory: feedback_verify_inline_js）。
- 衍生版产出后跑 `node tools/verify-share.js`，全断言须过。
- 新增 store 字段必须同步 `loadStore` 补全兜底（见 DECISIONS.md）——本模块无新 store 字段，但 `type:"prep"` 是新 type，`isItemUsable` 须显式处理。
- 三版本 LS_KEY 隔离：开发 `.v1`、四年级 `.share.v1`、本地 `.local.v1`。
- 词库格式：`{meta:{child,title,grade}, items:[...]}`，新字段 `type:"prep"`、`prep`、`category`、`confusables`。

---

## File Structure

- **Create**: `wordbanks/grade4-prep.json` — 50 组介词固定搭配词库（type=prep）
- **Modify**: `单词闯关开发版.html` — `MODES` 加 prep、`isItemUsable` 加 prep 分支、`enterScope` 过滤无可用题模式、`nextQuestion` render 映射加 prep、新增 `renderPrep`/`buildPrepOptions`/`fillPrepBlanks`、CSS 加 `.prep-blank`/`.prep-q`/`.prep-example`
- **Modify**: `tools/build-share.js` — bankFiles 加 grade4-prep.json，更新词库数断言
- **Modify**: `tools/build-local.js` — bankFiles 加 grade4-prep.json
- **Modify**: `tools/verify-share.js` — 子库数断言 4→5，条目数断言更新
- **Test**: `/tmp/wr-test/jsdom-prep.js` — jsdom 模拟介词选择场景

---

## Task 1: 生成介词词库 JSON

**Files:**
- Create: `wordbanks/grade4-prep.json`

**Interfaces:**
- Produces: 一个标准词库文件，`meta={child:"哥哥",title:"四下·介词固定搭配",grade:4}`，items 每条含 `{word,meaning,type:"prep",prep,category,example,exampleMeaning,confusables}`。后续 Task 2-4 的渲染逻辑依赖这些字段。

- [ ] **Step 1: 生成 50 条词库数据**

把 `词库/四年级下学期英语介词固定搭配表.md` 三张表逐条转成 JSON。规则：
- `word`=完整搭配；`meaning`=表中含义；`type`="prep"
- `prep`=要考的核心介词（多介词搭配只取 1 个，见 spec 第 2 节）
- `category`="动词+介词"/"形容词+介词"/"介词短语"
- `example`/`exampleMeaning`=表中例句及中文
- `confusables`=易混淆介词（依据词库"四、易混淆搭配对比"节 + 同类近义）

写入 `wordbanks/grade4-prep.json`。结构示例（首条 + 末条示意）：

```json
{
  "meta": { "child": "哥哥", "title": "四下·介词固定搭配", "grade": 4 },
  "items": [
    {"word":"look at","meaning":"看……","type":"prep","prep":"at","category":"动词+介词","example":"Look at the blackboard.","exampleMeaning":"看黑板。","confusables":["for","after","like"]},
    {"word":"be good at","meaning":"擅长……","type":"prep","prep":"at","category":"形容词+介词","example":"I'm good at swimming.","exampleMeaning":"我擅长游泳。","confusables":["for","with","in"]},
    {"word":"by bus","meaning":"乘公交","type":"prep","prep":"by","category":"介词短语","example":"I go to school by bus.","exampleMeaning":"我乘公交上学。","confusables":["on","in","at"]}
  ]
}
```

- [ ] **Step 2: 校验词库格式**

Run: `node -e "const b=require('./wordbanks/grade4-prep.json'); console.log('items:', b.items.length); console.log('all prep:', b.items.every(i=>i.type==='prep'&&i.prep&&i.category&&i.confusables)); console.log('categories:', [...new Set(b.items.map(i=>i.category))]);"`
Expected: items: 50, all prep: true, categories 含 3 类

- [ ] **Step 3: 提交**

```bash
git add wordbanks/grade4-prep.json
git commit -m "feat: 新增四年级介词固定搭配词库(50 组,type=prep)"
```

---

## Task 2: 开发版接入 prep 模式（注册 + 隔离 + 分发 + 过滤）

**Files:**
- Modify: `单词闯关开发版.html`

**Interfaces:**
- Consumes: `wordbanks/grade4-prep.json` 的字段（type/prep/category/confusables）
- Produces: `MODES` 含 prep、`isItemUsable` 识别 prep、`nextQuestion` 能分发到 `renderPrep`（Task 3 实现）、`enterScope` 过滤无可用题模式

- [ ] **Step 1: MODES 数组追加 prep 模式**

定位 `const MODES=[` 数组，在 cloze 后追加：

```js
const MODES=[
  {id:"spell1", emoji:"✏️", title:"拼写闯关 1", sub:"补全缺字母的单词"},
  {id:"spell2", emoji:"⌨️", title:"拼写闯关 2", sub:"看释义默写整词"},
  {id:"mean1",  emoji:"🤔", title:"意思闯关 1", sub:"看单词选意思"},
  {id:"mean2",  emoji:"🔤", title:"意思闯关 2", sub:"看意思选单词"},
  {id:"cloze",  emoji:"📝", title:"完形填空",   sub:"句子里敲出单词"},
  {id:"prep",   emoji:"🧩", title:"介词专项",   sub:"选对介词填空"},
];
```

- [ ] **Step 2: isItemUsable 加 prep 分支**

定位 `function isItemUsable(mode,it){`，在 cloze 分支后、`return true` 前加：

```js
function isItemUsable(mode,it){
  if(mode==="spell1"||mode==="spell2") return it.type==="word"||(it.type==="phrase"&&!it.word.includes(" "));
  if(mode==="mean1"||mode==="mean2") return (it.type==="word"||it.type==="phrase")&&it.meaning;
  if(mode==="cloze") return it.example && it.example.split(" ").length>=2;
  if(mode==="prep") return it.type==="prep" && !!it.prep;
  return true;
}
```

- [ ] **Step 3: nextQuestion render 映射加 prep**

定位 `const render={spell1:renderSpell1,spell2:renderSpell2,mean1:renderMean1,mean2:renderMean2,cloze:renderCloze}[game.mode];`，改为：

```js
const render={spell1:renderSpell1,spell2:renderSpell2,mean1:renderMean1,mean2:renderMean2,cloze:renderCloze,prep:renderPrep}[game.mode];
```

- [ ] **Step 4: enterScope 过滤无可用题的模式**

定位 `MODES.forEach(m=>{` 块（在 `enterScope` 内），改为过滤后渲染——只有该作用域有可用题的模式才显示卡片：

```js
  MODES.forEach(m=>{
    const hasUsable = scopeItems().some(it=>isItemUsable(m.id, it));
    if(!hasUsable) return; // 该作用域无此类题(如弟弟无 prep)则不显示此模式卡片
    const tile=document.createElement("div");
    tile.className="tile";
    tile.innerHTML=`<span class="emoji">${m.emoji}</span><div class="t-title">${m.title}</div><div class="t-sub">${m.sub}</div>`;
    tile.onclick=()=>startGame(m.id,false);
    grid.appendChild(tile);
  });
```

- [ ] **Step 5: 校验 JS 语法**

Run: `node -e "const fs=require('fs'),vm=require('vm');const html=fs.readFileSync('单词闯关开发版.html','utf8');const re=/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/g;let m,code='';while((m=re.exec(html.replace(/<!--[\s\S]*?-->/g,'')))){if(m[1].trim())code+=m[1]+'\n';}try{new vm.Script(code);console.log('✅ 语法OK');}catch(e){console.log('❌',e.message);process.exit(1);}"`
Expected: ✅ 语法OK

- [ ] **Step 6: 提交**

```bash
git add 单词闯关开发版.html
git commit -m "feat: 开发版接入 prep 模式(注册/隔离/分发/模式过滤)"
```

---

## Task 3: 实现 renderPrep 与 buildPrepOptions

**Files:**
- Modify: `单词闯关开发版.html`
- Test: `/tmp/wr-test/jsdom-prep.js`

**Interfaces:**
- Consumes: `chooseOption(it, node, isRight, answer)`（现有选择题判定）、`speak(text)`、`judge(it, isRight)`、`buildKeyboard(false)`
- Produces: `renderPrep(it)`、`buildPrepOptions(it)`、`fillPrepBlanks(prep)` 三个函数

- [ ] **Step 1: 写 jsdom 测试（先写失败的测试）**

Create `/tmp/wr-test/jsdom-prep.js`：

```js
const { JSDOM } = require('jsdom');
const fs = require('fs');
const html = fs.readFileSync('/Users/martin_ai/Desktop/背单词小游戏/单词闯关本地版.html', 'utf8');
const errors = [];
const dom = new JSDOM(html, {
  runScripts: 'dangerously', resources: 'usable', pretendToBeVisual: true,
  url: 'https://example.com/',
  beforeParse(window) {
    window.speechSynthesis = { cancel(){}, speak(){}, getVoices:()=>[] };
    window.SpeechSynthesisUtterance = function(){};
    window.onerror = (msg, src, line) => errors.push(`UNCAUGHT ${msg} (line ${line})`);
  },
});
const window = dom.window, document = window.document;
const wait = ms => new Promise(r => setTimeout(r, ms));

(async () => {
  await wait(200);
  // 选哥哥
  document.querySelector('.id-card[data-child="哥哥"]').click();
  await wait(500);
  // 找 prep 词库 tile(标题含"介词")
  const bankTiles = document.querySelectorAll('#bankList .tile');
  let prepTile = null;
  bankTiles.forEach(t => { if(t.textContent.includes('介词')) prepTile = t; });
  if(!prepTile){ console.log('❌ 没找到介词词库卡片'); process.exit(1); }
  prepTile.click(); await wait(100);
  // 找介词专项模式卡片
  const modeTiles = document.querySelectorAll('#modeGrid .tile');
  let prepMode = null;
  modeTiles.forEach(t => { if(t.textContent.includes('介词专项')) prepMode = t; });
  if(!prepMode){ console.log('❌ 没找到介词专项模式卡片'); process.exit(1); }
  prepMode.click(); await wait(200);

  const game = window._wrt.getGame();
  const it = game.queue[game.idx];
  console.log('当前题:', it.word, '| prep:', it.prep);
  // 验证: 题目含空格 + 4 个选项 + 含正确介词
  const cardText = document.getElementById('gameCard').textContent;
  console.log('题目含空格 ___:', cardText.includes('___'));
  const opts = document.querySelectorAll('#opts .option');
  console.log('选项数:', opts.length, '(应4)');
  const optTexts = [...opts].map(o=>o.textContent.replace(/\d/g,'').trim());
  console.log('选项含正确介词', it.prep, ':', optTexts.includes(it.prep));
  // 点正确选项 → 判对
  const correctIdx = optTexts.indexOf(it.prep);
  opts[correctIdx].click(); await wait(50);
  console.log('答对后 correct(应1):', game.correct);

  const pass = opts.length===4 && optTexts.includes(it.prep) && game.correct===1 && errors.length===0;
  console.log(pass ? '✅ 介词模块通过' : '❌ 失败');
  if(errors.length) errors.forEach(e=>console.log(' ',e));
  process.exit(pass?0:1);
})();
```

- [ ] **Step 2: 运行测试确认失败**

Run: `cd /tmp/wr-test && node jsdom-prep.js`
Expected: FAIL（renderPrep 未实现，但此时 build-local 还没含 prep 词库——所以这步需在 Task 5 重编后跑。**暂跳过，标记为 Task 5 后验证**）

> 注：此测试依赖衍生版含 prep 词库，故真正运行放在 Task 5 重编本地版之后。先继续实现。

- [ ] **Step 3: 实现 renderPrep + buildPrepOptions + fillPrepBlanks**

在 `单词闯关开发版.html` 的完形填空块之后（`/* 复用 handleLetter...` 注释前）插入。先读现有 `chooseOption` 与 `drawChoice` 确认接口，然后插入：

```js
/* =========================================================
   模式 ⑥ 介词专项 — 看含义选介词填空
   ========================================================= */
function renderPrep(it){
  const card=$("gameCard");
  // 搭配空格: word 中把 prep 整词替换成空格
  const blankHTML='<span class="prep-blank">___</span>';
  const colHTML = it.word.replace(
    new RegExp("\\b"+escapeReg(it.prep)+"\\b","i"),
    blankHTML
  );
  // 例句空格: example 中 prep 整词(首个)替换成空格
  let exHTML = it.example || "";
  if(exHTML){
    exHTML = exHTML.replace(
      new RegExp("\\b"+escapeReg(it.prep)+"\\b","i"),
      m=>'<span class="prep-blank">'+m.replace(/./g,"_").slice(0,Math.max(3,m.length))+'</span>'
    );
  }
  card.innerHTML=`
    <div class="prompt-cn">${it.meaning}</div>
    <button class="btn small speakbtn" id="spk">🔊 听发音</button>
    <div class="prep-q">${colHTML}</div>
    ${exHTML?`<div class="prep-example">${exHTML}</div>`:""}
    <div class="options" id="opts"></div>
    <p class="hint">用键盘按 1 / 2 / 3 / 4 选择</p>`;
  $("spk").onclick=()=>speak(it.word);
  const opts=buildPrepOptions(it);
  const wrap=$("opts");
  opts.forEach((o,i)=>{
    const d=document.createElement("div"); d.className="option"; d.dataset.val=o;
    d.innerHTML=`<span class="num">${i+1}</span><span>${o}</span>`;
    d.onclick=()=>choosePrep(it, d, o===it.prep);
    wrap.appendChild(d);
  });
  buildKeyboard(false);
  game._opts={answer:it.prep, nodes:[...wrap.children]};
  speak(it.word);
}
// 全局高频介词池(干扰项兜底)
const PREP_POOL=["in","on","at","for","of","to","with","about","after","from"];
function buildPrepOptions(it){
  const correct=it.prep;
  let distract=[...(it.confusables||[])]
    .filter(p=>p!==correct);
  // 不足3个: 从同 category 其他条目的 prep 补
  if(distract.length<3){
    const sameCat=scopeItems()
      .filter(x=>x.type==="prep"&&x.category===it.category&&x.prep!==correct)
      .map(x=>x.prep);
    for(const p of shuffle(sameCat)){ if(distract.length>=3) break; if(!distract.includes(p)&&p!==correct) distract.push(p); }
  }
  // 还不足: 全局池补
  if(distract.length<3){
    for(const p of PREP_POOL){ if(distract.length>=3) break; if(!distract.includes(p)&&p!==correct) distract.push(p); }
  }
  distract=distract.slice(0,3);
  return shuffle([correct, ...distract]);
}
// 介词选择判定(复用 judge, 答错标出正确介词)
function choosePrep(it, node, isRight){
  if(game.attempted) return;
  node.classList.add(isRight?"right":"wrong");
  if(!isRight){
    game._opts.nodes.forEach(n=>{ if(n.dataset.val===it.prep) n.classList.add("right"); });
  }
  judge(it, isRight);
}
// 选中介词后填入空格(视觉反馈)
function fillPrepBlanks(prep){
  document.querySelectorAll(".prep-blank").forEach(el=>{
    el.textContent=prep; el.classList.add("filled");
  });
}
```

并修改 `choosePrep` 内填空——在 `judge` 前调用 `fillPrepBlanks`：

```js
function choosePrep(it, node, isRight){
  if(game.attempted) return;
  node.classList.add(isRight?"right":"wrong");
  if(!isRight){
    game._opts.nodes.forEach(n=>{ if(n.dataset.val===it.prep) n.classList.add("right"); });
  }
  fillPrepBlanks(it.prep); // 答完填入正确介词
  judge(it, isRight);
}
```

- [ ] **Step 4: 加 CSS 样式**

在 `.feedback.show-answer .ans-mean{...}` 后（或 `</style>` 前）加：

```css
  .prep-q{font-size:clamp(24px,5vw,34px);font-weight:800;text-align:center;margin:14px 0;letter-spacing:.5px;}
  .prep-example{font-size:clamp(17px,3.5vw,21px);text-align:center;color:var(--muted);margin:6px 0 18px;}
  .prep-blank{display:inline-block;min-width:42px;color:var(--primary);border-bottom:3px solid var(--primary);margin:0 3px;text-align:center;}
  .prep-blank.filled{color:var(--green);border-color:var(--green);}
```

- [ ] **Step 5: 校验 JS 语法**

Run: `node -e "const fs=require('fs'),vm=require('vm');const html=fs.readFileSync('单词闯关开发版.html','utf8');const re=/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/g;let m,code='';while((m=re.exec(html.replace(/<!--[\s\S]*?-->/g,'')))){if(m[1].trim())code+=m[1]+'\n';}try{new vm.Script(code);console.log('✅ 语法OK');}catch(e){console.log('❌',e.message);process.exit(1);}console.log('renderPrep:', /function renderPrep/.test(code));console.log('buildPrepOptions:', /function buildPrepOptions/.test(code));console.log('choosePrep:', /function choosePrep/.test(code));"`
Expected: ✅ 语法OK, renderPrep/buildPrepOptions/choosePrep 全 true

- [ ] **Step 6: 提交**

```bash
git add 单词闯关开发版.html
git commit -m "feat: 实现 renderPrep/buildPrepOptions 介词专项渲染与选项生成"
```

---

## Task 4: 更新 build 脚本与 verify-share 断言

**Files:**
- Modify: `tools/build-share.js`
- Modify: `tools/build-local.js`
- Modify: `tools/verify-share.js`

**Interfaces:**
- Consumes: `wordbanks/grade4-prep.json`
- Produces: 衍生版含 prep 词库；verify 断言更新为 5 库

- [ ] **Step 1: build-share.js 加 prep 词库**

定位 `const bankFiles = [`（build-share.js），追加：

```js
const bankFiles = [
  'wordbanks/grade4-u1u2.json',
  'wordbanks/grade4-u3u4.json',
  'wordbanks/grade4-u5u6.json',
  'wordbanks/grade4-sihui.json',
  'wordbanks/grade4-prep.json',
];
```

- [ ] **Step 2: build-local.js 加 prep 词库**

定位 `const bankFiles = [`（build-local.js），追加：

```js
const bankFiles = [
  'wordbanks/grade4-u1u2.json',
  'wordbanks/grade4-u3u4.json',
  'wordbanks/grade4-u5u6.json',
  'wordbanks/grade4-sihui.json',
  'wordbanks/grade1-people-places.json',
  'wordbanks/grade1-body-animals.json',
  'wordbanks/grade1-clothes-sports.json',
  'wordbanks/grade4-prep.json',
];
```

- [ ] **Step 3: verify-share.js 更新库数与条目数断言**

定位 verify-share.js 中 `emb.length === 4` 与 `tot === 236`，改为 5 库与新条目数。先生成词库后取实际数：

Run: `node -e "const b=require('./wordbanks/grade4-prep.json');console.log('prep条数:',b.items.length);"`
（记下数字 N）

改 verify-share.js：
- `emb.length === 4 ? pass('4 个子库...` → `emb.length === 5 ? pass('5 个子库: ' + emb.length)`
- `tot === 236 ? pass('共 236 条...` → `tot === (236+N) ? pass('共 '+(236+N)+' 条: ' + tot)`

- [ ] **Step 4: 重编并校验**

Run:
```bash
node tools/build-share.js && node tools/build-local.js && node tools/verify-share.js
```
Expected: 三脚本全过，verify 全部通过

- [ ] **Step 5: 提交**

```bash
git add tools/build-share.js tools/build-local.js tools/verify-share.js 单词闯关四年级通关版.html 单词闯关本地版.html
git commit -m "build: build 脚本含 prep 词库 + verify 断言更新为 5 库"
```

---

## Task 5: jsdom 端到端验证

**Files:**
- Test: `/tmp/wr-test/jsdom-prep.js`（Task 3 Step 1 已创建）

- [ ] **Step 1: 运行介词模块端到端测试**

Run: `cd /tmp/wr-test && node jsdom-prep.js`
Expected: `✅ 介词模块通过`（4 选项、含正确介词、答对 correct=1、无报错）

- [ ] **Step 2: 补充"答错 + 弟弟看不到 prep"场景测试**

在 jsdom-prep.js 末尾前追加（或新建 jsdom-prep2.js）验证：
- 答错一个选项 → attempted=true，正确介词标绿
- 切换到弟弟 → 进词库页 → prep 词库卡片**不出现**（child 过滤）；若进任意弟弟词库，模式页**无"介词专项"卡片**（enterScope 过滤）

Run: `cd /tmp/wr-test && node jsdom-prep2.js`
Expected: 两场景通过

- [ ] **Step 3: 提交测试脚本（可选，测试不进仓库）**

测试在 /tmp，无需提交。若发现 bug 回到对应 Task 修复。

---

## Self-Review

**1. Spec coverage:**
- 第 1 节目标 → Task 1+2+3 实现新模式 ✓
- 第 2 节数据 → Task 1 ✓
- 3.1 模式注册 → Task 2 Step 1 ✓
- 3.2 模式分发 → Task 2 Step 3 ✓
- 3.3 类型隔离 → Task 2 Step 2 ✓
- 3.4 渲染 → Task 3 Step 3 ✓
- 3.5 选项生成 → Task 3 Step 3 (buildPrepOptions) ✓
- 3.6 仅哥哥可见 → Task 2 Step 4 (enterScope 过滤) + Task 5 Step 2 验证 ✓
- 第 4 节交互 → Task 3 (choosePrep 选择即提交 + 答错标绿) ✓
- 第 5 节复用 → 复用 judge/speak/错题本/冰淇淋，无新 store 字段 ✓
- 第 6 节工程约束 → Task 4 (build/verify) ✓

**2. Placeholder scan:** 无 TBD/TODO。Task 3 Step 3 代码完整。Task 4 Step 3 的条目数待生成后填入实际值——这是有意的（依赖 Task 1 产出），不算占位。

**3. Type consistency:** `renderPrep`/`buildPrepOptions`/`choosePrep`/`fillPrepBlanks` 命名在 Task 3 定义，Task 5 测试调用一致。`prep` 模式 id 在 MODES/render 映射/enterScope/startGame 全程一致。`type:"prep"` 字段在词库/isItemUsable/scopeItems 过滤一致。
