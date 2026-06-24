// ============================================================
// 生成「单词闯关四年级通关版.html」——可分享的单文件
// 用法:  node tools/build-share.js
// 作用:  以 单词闯关开发版.html 为源,内嵌 4 个四年级词库,
//        去掉加载词库/PDF/管理词库等功能,产出纯固化分享版。
// 每处替换都断言唯一命中,不命中即报错(防静默失败)。
// ============================================================
const fs = require('fs');
const path = require('path');
const dir = path.resolve(__dirname, '..'); // 项目根
const SRC = '单词闯关开发版.html';
const OUT = '单词闯关四年级通关版.html';

let html = fs.readFileSync(path.join(dir, SRC), 'utf8');

// 读取 4 个四年级精品词库
const bankFiles = [
  'wordbanks/grade4-u1u2.json',
  'wordbanks/grade4-u3u4.json',
  'wordbanks/grade4-u5u6.json',
  'wordbanks/grade4-sihui.json',
];
const banks = bankFiles.map(f => JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8')));
const total = banks.reduce((n, b) => n + b.items.length, 0);
console.log(`内嵌词库: ${banks.length} 个子库, 共 ${total} 条`);

// 替换规则:每个 old 必须唯一命中,否则报错
const reps = [
  // 1. LS key 改为分享版独立存储 + 内嵌词库数据
  { desc: 'LS_KEY + 内嵌数据',
    old: `const LS_KEY = "wordReviewTool.v1";`,
    new: `const LS_KEY = "wordReviewTool.share.v1"; // 分享版独立存储,与开发版互不干扰
// 内嵌四年级精品词库(4 子库,共 ${total} 条),打开即用,无需加载
const EMBEDDED_BANKS = ${JSON.stringify(banks)};` },

  // 2. 首页"加载词库"按钮 → 删除(纯固化)
  { desc: '首页加载词库按钮',
    old: `        <span>
          <button class="btn green small filebtn">＋ 加载词库<input type="file" id="loadBank" accept=".json,.pdf" multiple></button>
        </span>`,
    new: `` },

  // 3. 首页 hint 文案
  { desc: '首页 hint 文案',
    old: `      <p class="hint">支持加载 JSON 词库,或 PDF 单词表(文字版可直接解析;扫描版请发给 Claude 生成)。已加载的词库会记住,下次自动出现。</p>`,
    new: `      <p class="hint">已内置四年级全部词库(U1U2 / U3U4 / U5U6 / 四会专项,共 ${total} 条),选一个开始闯关吧!进度和错题自动记住。</p>` },

  // 4. 首页按钮:去掉"管理词库"(纯固化不需要删内嵌词库)
  { desc: '首页按钮去管理词库',
    old: `        <button class="btn blue small filebtn">导入备份<input type="file" id="importBackup" accept=".json"></button>
        <button class="btn purple small" id="exportBackup">导出备份</button>
        <button class="btn gray small" id="manageBanks">管理词库</button>`,
    new: `        <button class="btn blue small filebtn">导入备份<input type="file" id="importBackup" accept=".json"></button>
        <button class="btn purple small" id="exportBackup">导出备份</button>` },

  // 5. PDF 弹窗整块 → 删除(纯固化无 PDF 加载)
  { desc: 'PDF modal 整块',
    old: `<!-- PDF 解析确认弹层 -->
<div id="pdfModal" class="modal-mask">
  <div class="modal">
    <h3 style="margin:0 0 4px">从 PDF 生成子库</h3>
    <p class="hint" style="text-align:left;margin:0 0 14px" id="pdfModalInfo"></p>
    <div class="field"><label>孩子:</label><input type="text" id="pdfChild" placeholder="如 哥哥 / 弟弟"></div>
    <div class="field"><label>子库名称:</label><input type="text" id="pdfTitle" placeholder="如 四年级下 Unit 5"></div>
    <div class="field"><label>年级:</label>
      <select id="pdfGrade">
        <option value="1">一年级</option><option value="2">二年级</option>
        <option value="3">三年级</option><option value="4" selected>四年级</option>
        <option value="5">五年级</option><option value="6">六年级</option>
      </select>
    </div>
    <p class="hint" style="text-align:left">下面是从 PDF 抽取的词条,可直接编辑(每行一条,格式:<b>英文 = 中文</b>)。音标、例句留待发我生成精品词库时补全。</p>
    <textarea id="pdfText" spellcheck="false"></textarea>
    <div class="btn-row" style="justify-content:flex-end;margin-top:14px">
      <button class="btn gray small" id="pdfCancel">取消</button>
      <button class="btn green small" id="pdfConfirm">生成子库</button>
    </div>
  </div>
</div>`,
    new: `` },

  // 6. lib/pdf.js 引用 + 初始化 → 删除(单文件不带 lib,防 404)
  { desc: 'lib pdf.js script',
    old: `<!-- 本地打包的 pdf.js(离线可用)。
     file:// 协议下浏览器禁止创建 Web Worker,因此把 worker 脚本也用普通 <script> 直接引入:
     这样 globalThis.pdfjsWorker 存在,pdf.js 会在主线程用 fake worker 解析,无需真 Worker。 -->
<script src="lib/pdf.min.js"></script>
<script src="lib/pdf.worker.min.js"></script>
<script>
  if(window.pdfjsLib){
    // 仍设 workerSrc 作为兜底;但因 pdfjsWorker 全局已存在,实际走主线程 fake worker
    pdfjsLib.GlobalWorkerOptions.workerSrc = "lib/pdf.worker.min.js";
  }
</script>`,
    new: `` },

  // 7. loadBank 文件加载事件绑定 → 删除(按钮已删,防 null 报错)
  { desc: 'loadBank 事件绑定',
    old: `$("loadBank").addEventListener("change",(e)=>{
  const files=[...e.target.files];
  files.forEach(f=>{
    const name=f.name.toLowerCase();
    if(name.endsWith(".pdf")){ handlePdfFile(f); }
    else {
      const r=new FileReader();
      r.onload=()=>{ try{ addBank(JSON.parse(r.result)); }catch(err){ toast("解析失败:"+f.name); } };
      r.readAsText(f);
    }
  });
  e.target.value="";
});`,
    new: `` },

  // 8. manageBanks / pdfCancel / pdfConfirm 绑定 → 删除(元素已删)
  { desc: 'manageBanks/pdfCancel/pdfConfirm 绑定',
    old: `$("manageBanks").onclick=manageBanks;
$("pdfCancel").onclick=closePdfModal;
$("pdfConfirm").onclick=confirmPdfModal;`,
    new: `` },

  // 9. 启动:渲染 → 注入内嵌词库(幂等)再渲染
  { desc: '启动注入',
    old: `// 启动:渲染已存词库
renderBanks();`,
    new: `// 启动:注入内嵌四年级词库(幂等——已存在则刷新内容,保留进度与错题),再渲染
EMBEDDED_BANKS.forEach(b=>{
  const id=bankId(b.meta);
  store.banks[id]={ meta:b.meta, items:b.items };
  if(!store.progress[id]) store.progress[id]={stars:0};
  if(!store.wrong[id]) store.wrong[id]=[];
});
saveStore();
renderBanks();` },

  // 10. _wrt 调试钩子移除 parseWordLines 引用(该函数将随 PDF 块删除)
  { desc: '_wrt 移除 parseWordLines',
    old: `                parseWordLines, store:()=>store, getScope:()=>scope };`,
    new: `                store:()=>store, getScope:()=>scope };` },
];

// 执行替换:断言每处唯一命中
for (const r of reps) {
  const cnt = html.split(r.old).length - 1;
  if (cnt !== 1) throw new Error(`[${r.desc}] 命中 ${cnt} 次,期望 1 —— old 字符串与 ${SRC} 不匹配`);
  html = html.split(r.old).join(r.new);
  console.log(`✅ ${r.desc}`);
}

// 11. 删除 PDF 解析 dead 函数块(handlePdfFile/groupLines/parseWordLines/openPdfModal/closePdfModal/confirmPdfModal)
// 纯固化版无 PDF 加载,这些函数引用已删元素,虽不调用也应移除以保代码干净
{
  const lines = html.split('\n');
  let s = lines.findIndex(l => l.includes('PDF 解析(浏览器内,本地 pdf.js)'));
  if (s < 0) throw new Error('PDF 块起始未找到');
  while (s > 0 && !lines[s].startsWith('/* ===')) s--; // 回溯到本块注释上边框
  if (!lines[s].startsWith('/* ===') || !lines[s + 1] || !lines[s + 1].includes('PDF 解析'))
    throw new Error('PDF 注释头定位异常 s=' + s);
  const e = lines.findIndex(l => l === 'function renderBanks(){');
  if (e < 0 || e <= s) throw new Error('renderBanks 定位失败');
  const removed = lines.splice(s, e - s);
  html = lines.join('\n');
  console.log(`✅ PDF dead 函数块删除 (${removed.length} 行)`);
}

const out = path.join(dir, OUT);
fs.writeFileSync(out, html, 'utf8');
console.log(`\n✅ 已生成: ${out}`);
console.log(`   大小: ${(fs.statSync(out).size / 1024).toFixed(1)} KB`);
console.log(`\n下一步: node tools/verify-share.js   # 校验生成的分享版`);
