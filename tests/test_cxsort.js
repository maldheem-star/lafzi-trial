const {chromium}=require('/opt/node22/lib/node_modules/playwright');
let fails=0;const ok=(c,m)=>{console.log((c?'  ✓ ':'  ✗ FAIL ')+m);if(!c)fails++};
(async()=>{
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'});
const ctx=await b.newContext({viewport:{width:420,height:900}});
const logs=[];
const mk=async()=>{
  const page=await ctx.newPage();
  page.on('pageerror',e=>{console.log('  ✗ PAGEERROR '+e.message);fails++});
  await page.route('**/rest/v1/**',async r=>{
    let x={};try{x=JSON.parse(r.request().postData()||'{}')}catch(e){}
    logs.push(x);r.fulfill({status:201,contentType:'application/json',body:'[]'});
  });
  await page.addInitScript(()=>{
    Object.defineProperty(window,'speechSynthesis',{configurable:true,value:{speak(){},cancel(){},resume(){},pause(){},
      getVoices:()=>[{lang:'en-US',name:'X'}],speaking:false,pending:false}});
    window.SpeechSynthesisUtterance=function(t){this.text=t};
  });
  await page.goto('http://127.0.0.1:8931/index.html');
  await page.waitForFunction(()=>typeof cxPreStart==='function');
  return page;
};
// تُجيب إجابةً صحيحة أو خاطئة على الاسم المعروض
const answer=(page,right)=>page.evaluate(r=>{
  const cur=cxPreCur();
  let i=0;for(let k=0;k<cxPreOrder.length;k++){if((cxPair.sides[cxPreOrder[k]].k===cur.side)===r){i=k;break}}
  cxPreChoose(i);const w=cur.w,okk=cxPreOk;cxPreNext();return{w,okk};
},right);

let page=await mk();

console.log('\n١) بيانات التصنيف مكتملة ومتوازنة');
const P=await page.evaluate(()=>{
  const p=CONTRAST_PAIRS.filter(x=>x.id==='few_little')[0];
  const w=p.pre.words;
  return{n:w.length,a:w.filter(x=>x.k==='a').length,b:w.filter(x=>x.k==='b').length,
    ar:w.every(x=>/[؀-ۿ]/.test(x.ar)),en:w.every(x=>/^[a-z]+$/.test(x.w)),
    tips:!!(p.pre.tip.a&&p.pre.tip.b),
    others:CONTRAST_PAIRS.filter(x=>x.id!=='few_little').every(x=>!x.pre)};
});
ok(P.n===20,`${P.n} اسماً`);
ok(P.a===10&&P.b===10,`عشرة تُعدّ وعشرة تُقاس (${P.a}/${P.b}) — فلا ينفع تخمين طرف واحد`);
ok(P.ar&&P.en,'ولكلٍّ معناه بالعربية');
ok(P.tips,'ولكل نوع تفسيره');
ok(P.others,'والزوجان الآخران بلا خطوة تصنيف — لم يظهر لهما سبب');

console.log('\n٢) التقابل يبدأ بالتصنيف لا بالقاعدة');
await page.evaluate(()=>{startEngPlan();cxStart(CONTRAST_PAIRS.filter(x=>x.id==='few_little')[0])});
await page.waitForTimeout(150);
let t=await page.textContent('#app');
ok(await page.evaluate(()=>cxPreOn)===true,'نحن في التصنيف');
ok(t.includes('قبل القاعدة: صنّفي الاسم'),'وعنوانه');
ok(!t.includes('a few')||!t.includes('Add'),'ولا تدريب few/little بعد');
ok(await page.evaluate(()=>document.querySelectorAll('.choice').length)===2,'خياران: يُعدّ أو يُقاس');
ok(t.includes('يُعدّ حبّةً حبّة')&&t.includes('يُقاس ولا يُعدّ'),'بنصّهما');
ok(await page.evaluate(()=>!!cxPreCur().ar),'والاسم معه معناه');

console.log('\n٣) الخطأ يُصفّر العدّ ويُعيد الاسم قريباً');
await page.evaluate(()=>{cxPreStart()});
const r1=await answer(page,true);
ok(await page.evaluate(()=>cxPreStreak)===1,'صواب ⇒ ١');
const bad=await answer(page,false);
ok(await page.evaluate(()=>cxPreStreak)===0,'ثم خطأ ⇒ صفر');
const pos=await page.evaluate(w=>cxPreQ.findIndex(x=>x.w===w),bad.w);
ok(pos>=0&&pos<=3,`والاسم المُخطَأ يعود بعد ${pos+1} لا في آخر الطابور`);

console.log('\n٤) البوّابة: ستّ متتالية تفتح القاعدة');
await page.evaluate(()=>{cxPreStart()});
for(let i=0;i<5;i++){await answer(page,true)}
ok(await page.evaluate(()=>cxPreOn)===true,'خمس لا تكفي');
ok(await page.evaluate(()=>cxStep)===0&&await page.evaluate(()=>cxNoticePicked)===null,'ولم تُفتح الملاحظة');
await answer(page,true);
ok(await page.evaluate(()=>cxPreOn)===false,'والسادسة تفتحها');
t=await page.textContent('#app');
ok(t.includes('انظري قبل أن نشرح'),'ونحن الآن في الملاحظة');
ok(logs.some(l=>l.qtype==='cx_sort_done'&&l.is_correct===true),'والعبور مُسجَّل');

console.log('\n٥) خطأ في الأخيرة يُعيدها إلى الصفر — لا تمرّ بالمصادفة');
await page.evaluate(()=>{cxStart(CONTRAST_PAIRS.filter(x=>x.id==='few_little')[0]);
  const m=cxLoad();delete m.few_little;cxSave(m);cxPreStart()});
for(let i=0;i<5;i++){await answer(page,true)}
await answer(page,false);
ok(await page.evaluate(()=>cxPreOn)===true,'ما زلنا في التصنيف');
ok(await page.evaluate(()=>cxPreStreak)===0,'والعدّ من جديد');

console.log('\n٦) لا تُحبَس: سقف المحاولات يُكمل الخطة');
await page.evaluate(()=>{cxPreStart()});
for(let i=0;i<CX_MAX();i++){await answer(page,false)}
function CX_MAX(){return 22}
ok(await page.evaluate(()=>cxPreFail)===true,'بعد ٢٢ محاولة نقف');
t=await page.textContent('#app');
ok(t.includes('نقف هنا الليلة'),'ويُقال لها السبب بلا لوم');
ok(logs.some(l=>l.qtype==='cx_sort_done'&&l.is_correct===false),'ويُسجَّل التعثّر');
await page.click('button[onclick="cxPreQuit()"]');
await page.waitForTimeout(200);
ok(await page.evaluate(()=>cxOn)===false,'والتقابل يُغلق');
ok(await page.evaluate(()=>cxDoneThisPlan)===true,'والخطة تُكمل — لا تقف عندها');
ok(await page.evaluate(()=>cxStateOf('few_little').preDone)!==true,'ولا يُحتسب التصنيف مُتقناً');

console.log('\n٧) بعد الإتقان لا يُعاد التصنيف');
await page.evaluate(()=>{const m=cxLoad();m.few_little={runs:0,lastAt:0,mastered:false,preDone:true};cxSave(m);
  cxStart(CONTRAST_PAIRS.filter(x=>x.id==='few_little')[0])});
await page.waitForTimeout(120);
ok(await page.evaluate(()=>cxPreOn)===false,'يُتخطّى');
ok((await page.textContent('#app')).includes('انظري قبل أن نشرح'),'ونبدأ من الملاحظة');

console.log('\n٨) السجلّ يقول أي اسم أخطأت فيه');
const sorts=logs.filter(l=>l.qtype==='cx_sort');
ok(sorts.length>10,`${sorts.length} سطر تصنيف`);
ok(sorts.every(l=>l.q_text&&/^[a-z]+$/.test(l.q_text)),'كل سطر باسمه — فنعرف أي الأسماء يقاوم');
ok(sorts.some(l=>l.response&&l.response.includes('موضع')),'ومعه موضع الزرّ — الانحياز يُكشف لا يُخمَّن');
ok(sorts.some(l=>l.srs_box>=1),'ومعه العدّ المتتالي');

console.log('\n٩) الزوجان الآخران يبدآن بالملاحظة كما كانا');
for(const id of ['just_yet','comp_super']){
  await page.evaluate(x=>{cxStart(CONTRAST_PAIRS.filter(p=>p.id===x)[0])},id);
  await page.waitForTimeout(100);
  ok(await page.evaluate(()=>cxPreOn)===false&&(await page.textContent('#app')).includes('انظري قبل أن نشرح'),
     `${id}: بلا تغيير`);
}

console.log('\n١٠) لا انحدار');
for(const [fn,md] of [["startBasics('percent')",'basics'],["startEngPlan()",'engplan'],["startFactPlan()",'factplan'],
  ["startDictation()",'dictation'],["startPronunciation()",'pron'],["startCoach()",'coach'],["home()",'home']]){
  const r=await page.evaluate(x=>{try{eval(x);return{m:mode}}catch(e){return{err:e.message}}},fn);
  ok(!r.err&&r.m===md,`${fn} → ${r.err||r.m}`);
}
ok((await page.evaluate(()=>censusMissing())).length===0,'وكل الدوال معرَّفة');
ok((await page.evaluate(()=>window.__ERRS.length))===0,'ولا خطأ');

await b.close();
console.log(fails?`\n=== ${fails} فشل ===`:'\n=== كل الاختبارات نجحت ===');
process.exit(fails?1:0);
})();
