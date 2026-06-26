// ============================================================
// 生成「单词闯关本地版.html」——全家精装分享版
// 用法:  node tools/build-local.js
// 作用:  以 单词闯关开发版.html 为源,内嵌哥哥(四下,含介词专项)+弟弟(一下)共 8 个子库,
//        照片 base64 内嵌,保留身份选择欢迎页,产出纯固化全功能版。
// ============================================================
const fs = require('fs');
const path = require('path');
const dir = path.resolve(__dirname, '..');

const SRC = '单词闯关开发版.html';
const OUT = '单词闯关本地版.html';

let html = fs.readFileSync(path.join(dir, SRC), 'utf8');

// 读取全部 8 个子库(哥哥5含介词专项 + 弟弟3)
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
const banks = bankFiles.map(f => JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8')));
const total = banks.reduce((n, b) => n + b.items.length, 0);
console.log(`内嵌词库: ${banks.length} 个子库 (哥哥 4 + 弟弟 3), 共 ${total} 条`);

// 读取照片并 base64 编码(超Q版,先压缩到300px)
const { execSync } = require('child_process');
const gegeSrc = path.join(dir, '照片/哥哥-超Q版.jpg');
const didiSrc = path.join(dir, '照片/弟弟-超Q版.jpg');
const gegeTmp = '/tmp/gege_q_300.jpg';
const didiTmp = '/tmp/didi_q_300.jpg';
if (!fs.existsSync(gegeTmp)) execSync('sips -Z 300 "' + gegeSrc + '" --out "' + gegeTmp + '"');
if (!fs.existsSync(didiTmp)) execSync('sips -Z 300 "' + didiSrc + '" --out "' + didiTmp + '"');
const gegeB64 = fs.readFileSync(gegeTmp).toString('base64');
const didiB64 = fs.readFileSync(didiTmp).toString('base64');
console.log(`照片 base64(超Q版): 哥哥 ${(gegeB64.length/1024).toFixed(0)}KB, 弟弟 ${(didiB64.length/1024).toFixed(0)}KB`);

// 替换规则
const reps = [
  // 1. LS key 改为本地版独立存储 + 内嵌全部词库
  { desc: 'LS_KEY + 内嵌数据',
    old: `const LS_KEY = "wordReviewTool.v1";`,
    new: `const LS_KEY = "wordReviewTool.local.v1"; // 本地版独立存储
// 内嵌哥哥(四下)+弟弟(一下)精品词库(8 子库,共 ${total} 条)
const EMBEDDED_BANKS = ${JSON.stringify(banks)};` },

  // 2. 照片路径 → base64 data URI(超Q版)
  { desc: '哥哥照片→base64',
    old: `src="照片/哥哥-超Q版.jpg"`,
    new: `src="data:image/jpeg;base64,${gegeB64}"` },
  { desc: '弟弟照片→base64',
    old: `src="照片/弟弟-超Q版.jpg"`,
    new: `src="data:image/jpeg;base64,${didiB64}"` },

  // 3. 首页"加载词库"按钮 → 删除(纯固化)。保留切换按钮。
  { desc: '首页加载词库按钮',
    old: `          <button class="btn green small filebtn">＋ 加载词库<input type="file" id="loadBank" accept=".json,.pdf" multiple></button>
`,
    new: `` },

  // 4. 首页 hint 文案
  { desc: '首页 hint 文案',
    old: `      <p class="hint">支持加载 JSON 词库,或 PDF 单词表(文字版可直接解析;扫描版请发给 Claude 生成)。已加载的词库会记住,下次自动出现。</p>`,
    new: `      <p class="hint">已内置哥哥(四下)和弟弟(一下)全部词库,共 ${total} 条。在欢迎页选身份,或点「🔄 切换」换人。进度和错题自动记住。</p>` },

  // 5. 首页按钮:去掉"管理词库"(纯固化不需要删内嵌词库)
  { desc: '首页按钮去管理词库',
    old: `        <button class="btn blue small filebtn">导入备份<input type="file" id="importBackup" accept=".json"></button>
        <button class="btn purple small" id="exportBackup">导出备份</button>
        <button class="btn gray small" id="manageBanks">管理词库</button>`,
    new: `        <button class="btn blue small filebtn">导入备份<input type="file" id="importBackup" accept=".json"></button>
        <button class="btn purple small" id="exportBackup">导出备份</button>` },

  // 6. PDF 弹窗整块 → 删除
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

  // 7. lib/pdf.js 引用 + 初始化 → 删除
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

  // 8. loadBank 文件加载事件绑定 → 删除
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

  // 9. manageBanks / pdfCancel / pdfConfirm 绑定 → 删除
  { desc: 'manageBanks/pdfCancel/pdfConfirm 绑定',
    old: `$("manageBanks").onclick=manageBanks;
$("pdfCancel").onclick=closePdfModal;
$("pdfConfirm").onclick=confirmPdfModal;`,
    new: `` },

  // 10. 启动:注入内嵌词库(幂等) → 在 renderBanks 调用之前插入
  { desc: '启动注入',
    old: `updateIceCreamDisplay();
if(store.identity){
  renderBanks();
} else {
  show("welcome");
}
bindWelcomeCards();`,
    new: `// 启动:注入内嵌全部词库(幂等),再按身份状态决定进欢迎页还是首页
updateIceCreamDisplay();
EMBEDDED_BANKS.forEach(b=>{
  const id=bankId(b.meta);
  store.banks[id]={ meta:b.meta, items:b.items };
  if(!store.progress[id]) store.progress[id]={stars:0};
  if(!store.wrong[id]) store.wrong[id]=[];
});
saveStore();
if(store.identity){
  renderBanks();
} else {
  show("welcome");
}
bindWelcomeCards();` },

  // 11. _wrt 调试钩子移除 parseWordLines 引用
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

// 12. 删除 PDF 解析 dead 函数块
{
  const lines = html.split('\n');
  let s = lines.findIndex(l => l.includes('PDF 解析(浏览器内,本地 pdf.js)'));
  if (s < 0) throw new Error('PDF 块起始未找到');
  while (s > 0 && !lines[s].startsWith('/* ===')) s--;
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
const sizeKB = (fs.statSync(out).size / 1024).toFixed(1);
console.log(`\n✅ 已生成: ${out}`);
console.log(`   大小: ${sizeKB} KB (含照片+7词库)`);

// 快速自检
const check = (label, pattern, expect) => {
  const cnt = html.split(pattern).length - 1;
  if (cnt !== expect) { console.log(`⚠️  自检:${label} 命中 ${cnt} 次(期望 ${expect})`); process.exitCode = 1; }
};
// 注:两张 JPEG 的 base64 头部(EXIF/JFIF)前 ~120 字符相同,故用整串校验唯一性
check('哥哥 base64', gegeB64, 1);
check('弟弟 base64', didiB64, 1);
check('无照片文件路径', 'src="照片/', 0);
check('无外部 script src', '<script src="lib/', 0);
check('EMBEDDED_BANKS', 'const EMBEDDED_BANKS', 1);
check('LS_KEY local v1', 'wordReviewTool.local.v1', 1);
check('wordbank total items', '内嵌哥哥(四下)+弟弟(一下)精品词库(8 子库,共 '+total+' 条)', 1);
if (!process.exitCode) console.log('✅ 自检全部通过');
