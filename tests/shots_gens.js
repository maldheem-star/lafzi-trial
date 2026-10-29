// لقطاتُ المولّدات المُمعَّرة — ٢٩ أكتوبر.
// قاعدةُ العرض البصري: أيُّ تعديلٍ يمسّ شكلاً أو اتّجاهاً ⇒ لقطةٌ إلزامية، **وتُقاس
// بالإحداثيات قبل أن تُنظَر** (درس ٢٥ أغسطس: «اختبارٌ يقرأ النصّ لا يرى الاتّجاه»).
// التشغيل: node tests/shots_gens.js   (يحتاج الخادم على ٨٩٣١)
const {chromium}=require(process.env.PW||'/opt/node22/lib/node_modules/playwright');
const fs=require('fs');
const OUT=process.env.SHOT_DIR||'/tmp/claude-0/-home-user-lafzi-trial/d5a80363-f01b-5f26-ba42-6a7c646126c1/scratchpad/shots_gens';
let fails=0;const ok=(c,m)=>{console.log((c?'  ✓ ':'  ✗ FAIL ')+m);if(!c)fails++};
(async()=>{
fs.mkdirSync(OUT,{recursive:true});
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'});
const page=await b.newPage({viewport:{width:420,height:900},deviceScaleFactor:2});
page.on('pageerror',e=>{console.log('  ✗ PAGEERROR '+e.message);fails++});
await page.route('**/rest/v1/**',r=>r.fulfill({status:r.request().method()==='GET'?200:201,
  contentType:'application/json',body:'[]'}));
await page.route('**/functions/v1/**',r=>r.fulfill({status:200,contentType:'application/json',body:'{"ok":false}'}));
await page.addInitScript(()=>{
  Object.defineProperty(window,'speechSynthesis',{configurable:true,value:{speak(){},cancel(){},
    getVoices:()=>[{lang:'en-US',name:'X'}],speaking:false,pending:false}});
  window.SpeechSynthesisUtterance=function(t){this.text=t};
});
await page.goto('http://127.0.0.1:8931/index.html');
await page.waitForFunction(()=>typeof start==='function'&&typeof gMirrorReflect==='function');

// يُعرَض عنصرٌ بعينه في شاشة الاختبار الحقيقية — لا في صفحةٍ مصطنَعة
const show=async(gen,pred)=>page.evaluate(async({gen,pred})=>{
  await start('flex');
  const g=window[gen]||eval(gen);
  let o=null;
  for(let i=0;i<4000;i++){const x=g();if(!pred||eval('('+pred+')')(x)){o=x;break}}
  if(!o)return null;
  filtered=[o];idx=0;picked=null;locked=false;
  gateStop();gateSecs=0;gateLeft=0;gateSeen=true;
  render();
  return{q:o.q,w:o.w};
},{gen,pred});

// قياسٌ بالإحداثيات: لا فيضانٌ أفقي، وكلُّ عنصرٍ داخل عرض الشاشة
const measure=async(name)=>page.evaluate((name)=>{
  const dw=document.documentElement.scrollWidth,vw=window.innerWidth;
  const over=[...document.querySelectorAll('#app *')].filter(el=>{
    const r=el.getBoundingClientRect();return r.width>0&&(r.right>vw+1||r.left<-1)}).length;
  const svgs=[...document.querySelectorAll('#app svg')].length;
  const btns=[...document.querySelectorAll('#app .choices button')].length;
  return{name,scrollW:dw,vw,over,svgs,btns};
},name);

const cases=[
  ['gRavenCount','مصفوفة-النقاط-ضرب','o=>/×/.test(o.w)'],
  ['gRavenCount','مصفوفة-النقاط-تنازلي','o=>/ينقص/.test(o.w)'],
  ['gRavenRotate','مصفوفة-الدوران',null],
  ['gMirrorReflect','الانعكاس-محور-رأسي','o=>/يمين|يسار/.test(o.q)'],
  ['gMirrorReflect','الانعكاس-محور-أفقي','o=>/أسفل|أعلى/.test(o.q)'],
  ['gShapeRotateSeq','الدوران-عكس-العقارب','o=>/بعكس/.test(o.q)'],
  ['gShapeSeries','سلسلة-الأشكال-تنازلية','o=>/ينقص/.test(o.w)'],
  ['gSpeedGraph','الرسم-البياني-معاكس','o=>/أيُّ وصفٍ/.test(o.q)'],
  ['gCube','المكعّب-في-ثلاثة','o=>/في ٣/.test(o.q)'],
  ['fSq','مربّعات-ببداية-أخرى','o=>/٦²|٦\\u00b2/.test(o.w)'],
];
for(const [gen,name,pred] of cases){
  const r=await show(gen,pred);
  ok(!!r,name+': العنصرُ المطلوب وُجد وعُرض');
  if(!r)continue;
  const m=await measure(name);
  ok(m.over===0&&m.scrollW<=m.vw,name+': صفرُ عنصرٍ يتجاوز عرض الشاشة ('+m.scrollW+' ≤ '+m.vw+'، خارجون '+m.over+')');
  ok(m.btns===4,name+': أربعةُ أزرار خيارٍ معروضة ('+m.btns+')');
  await page.screenshot({path:OUT+'/'+name+'.png',fullPage:true});
  console.log('     ↪ '+OUT+'/'+name+'.png  — '+String(r.q).slice(0,70));
}
await b.close();
console.log(fails?('\n✗ '+fails+' فحصاً فشل'):'\n✓ الكلّ نجح');
process.exit(fails?1:0);
})();
