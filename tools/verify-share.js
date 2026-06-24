// ============================================================
// 校验「单词闯关四年级通关版.html」——分享前的体检
// 用法:  node tools/verify-share.js
// 检查: 语法 / 词库完整 / 无外部依赖 / 无悬空引用 /
//       开关逻辑(默认关、highlightKey 门控) / 音标已移除
// ============================================================
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const dir = path.resolve(__dirname, '..');
const FILE = '单词闯关四年级通关版.html';
const html = fs.readFileSync(path.join(dir, FILE), 'utf8');
let ok = true;
const fail = (m) => { ok = false; console.log('❌ ' + m); };
const pass = (m) => console.log('✅ ' + m);

// 1. 剥离 HTML 注释,逐内联 script 块语法检查
let h = html.replace(/<!--[\s\S]*?-->/g, '');
const re = /<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/g;
let m, blocks = [], i = 0;
while ((m = re.exec(h))) { if (m[1].trim()) blocks.push({ i: i++, code: m[1] }); }
console.log('内联 script 块数: ' + blocks.length + ' (期望 1: 仅主逻辑)');
for (const b of blocks) {
  try { new vm.Script(b.code); pass('块' + b.i + ' 语法OK (' + b.code.length + '字符)'); }
  catch (e) { fail('块' + b.i + ' 语法错误: ' + e.message); }
}

// 2. EMBEDDED_BANKS 数据完整
try {
  const arrStr = html.split('const EMBEDDED_BANKS = ')[1].split(';\n')[0];
  const emb = JSON.parse(arrStr);
  emb.length === 4 ? pass('4 个子库: ' + emb.length) : fail('子库数 ' + emb.length);
  const tot = emb.reduce((n, b) => n + b.items.length, 0);
  tot === 236 ? pass('共 236 条: ' + tot) : fail('条目数 ' + tot);
  emb.forEach(b => console.log('   - ' + b.meta.child + '｜' + b.meta.title + ': ' + b.items.length + '条, grade=' + b.meta.grade));
  const bad = emb.flatMap(b => b.items).filter(it => !it.word || !it.type);
  bad.length === 0 ? pass('所有条目字段完整') : fail(bad.length + ' 条缺字段');
} catch (e) { fail('EMBEDDED_BANKS 解析失败: ' + e.message); }

// 3. 无外部依赖
!/lib\/pdf/.test(html) ? pass('无 lib/pdf 引用(防 404)') : fail('仍引用 lib/pdf');
!/pdf\.worker/.test(html) ? pass('无 pdf.worker 引用') : fail('仍引用 pdf.worker');
!/<script[^>]*src=/.test(html) ? pass('无任何外部 script src(完全自包含)') : fail('仍有外部 script src');

// 4. 无对已删元素的引用(防运行时 null 报错)
['loadBank', 'manageBanks', 'pdfModal', 'pdfCancel', 'pdfConfirm', 'pdfChild', 'pdfTitle', 'pdfGrade', 'pdfText', 'pdfModalInfo'].forEach(id => {
  const ref = new RegExp('\\("' + id + '"\\)').test(html) || new RegExp('id="' + id + '"').test(html);
  if (ref) fail('仍引用已删元素: ' + id);
});
pass('已删元素无残留引用');

// 5. LS_KEY 独立 + 启动注入
/wordReviewTool\.share\.v1/.test(html) ? pass('LS_KEY = wordReviewTool.share.v1 (独立存储)') : fail('LS_KEY 未隔离');
/EMBEDDED_BANKS\.forEach\(b=>/.test(html) ? pass('启动注入循环存在') : fail('缺启动注入');

// 6. 字母提示开关逻辑(本次新增)
const code = blocks.map(b => b.code).join('\n');
/timing:\{\}, hintOn:false \}/.test(code) ? pass('store 默认 hintOn:false') : fail('store 缺 hintOn 默认值');
/if\(!store\.hintOn \|\| !ch\) return;/.test(code) ? pass('highlightKey 门控(防御式): 先清高亮, hintOn 关时不点亮') : fail('highlightKey 缺门控');
/id="hintToggle"/.test(html) ? pass('模式页有字母提示开关按钮') : fail('缺 hintToggle 按钮');
/\$\("hintToggle"\)\.onclick/.test(code) ? pass('hintToggle 已绑定') : fail('hintToggle 未绑定');
/function updateHintToggle\(\)/.test(code) ? pass('updateHintToggle 函数在') : fail('缺 updateHintToggle');

// 7. 核心函数仍在
['renderSpell1', 'renderSpell2', 'renderMean1', 'renderMean2', 'renderCloze', 'drawSpell', 'addBank', 'judge', 'speak', 'renderBanks', 'startGame', 'buildKeyboard', 'highlightKey', 'keyFeedback'].forEach(f => {
  new RegExp('function ' + f + '\\b').test(code) ? pass(f + ' 已定义') : fail(f + ' 缺失');
});

// 8. 音标修改保留(拼写/完形不显示音标)
const spellIpa = /<div class="prompt-ipa">\$\{it\.ipa\}<\/div>/.test(code);
const clozeIpa = /it\.ipa\?\(. ?\+it\.ipa\):/.test(code);
!spellIpa ? pass('拼写模块音标已移除') : fail('拼写仍显示音标');
!clozeIpa ? pass('完形填空音标已移除') : fail('完形仍显示音标');

console.log(ok ? '\n✅ 全部通过 —— 可分享' : '\n❌ 有问题见上,勿分享');
process.exit(ok ? 0 : 1);
