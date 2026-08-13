// أربع بوّابات من جلسة ١٣ أغسطس: صفر صواب من خمس عشرة في الطرح.
//
// وما أوجبها ليس الصفر بل شكلُه: خمسة عشر خطأً، ولا واحد رقمٌ عشوائي — سبعة تساوي
// الصواب+١ بالضبط (عدّت الأعداد لا الفجوات)، وأربعة الصواب+١٠ (استلفت ولم تُنقص)،
// وأربعة الصواب−١ وكلّها مطروحٌ منه ينتهي بـ١. والمرحلة لا تهبط في هذا الوضع أصلاً،
// فجلست على الدرجة نفسها خمس عشرة مرّة بلا مثالٍ محلول.
const {chromium}=require('/opt/node22/lib/node_modules/playwright');
let fails=0;const ok=(c,m)=>{console.log((c?'  ✓ ':'  ✗ FAIL ')+m);if(!c)fails++};
(async()=>{
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'});
const logs=[];
const mk=async()=>{
  const page=await b.newPage({viewport:{width:420,height:900}});
  page.on('pageerror',e=>{console.log('  ✗ PAGEERROR '+e.message);fails++});
  await page.route('**/rest/v1/**',async r=>{
    let x={};try{x=JSON.parse(r.request().postData()||'{}')}catch(e){}
    logs.push(x);r.fulfill({status:201,contentType:'application/json',body:'[]'});
  });
  await page.goto('http://127.0.0.1:8931/index.html');
  await page.waitForFunction(()=>typeof basicsErrDelta==='function');
  return page;
};
// يضع طرحاً بعينه في مرحلة بعينها، ويجعل الخيار الخاطئ المطلوب هو المضغوط
const putSub=async(page,a,bb,stage)=>page.evaluate(([a,bb,stage])=>{
  mode="basics";basicsSub="subborrow";basicsStage=stage;
  basicsCur={fam:{a:a,b:bb,c:a-bb}};basicsPrep();
  basicsLocked=false;basicsPicked=-1;basicsTyped="";render();
},[a,bb,stage]);
// تضغط الخيار الذي قيمته value (المموّهات عندنا ans±١ وans+١٠ — وهي أخطاؤها بعينها)
const pickVal=async(page,value)=>page.evaluate(v=>{
  const i=basicsCur.opts.findIndex(o=>parseArNum(o)===v);
  if(i<0)return false;basicsChoose(i);return true;
},value);

console.log('\n١) شكل الخطأ يُقاس لا يُوصف');
let page=await mk();
await putSub(page,23,14,2);
ok(await pickVal(page,10),'اختارت ١٠ في ٢٣ − ١٤ (الصواب ٩)');
ok(await page.evaluate(()=>basicsErrDelta())===1,'والفرق +١ بالضبط');
await putSub(page,81,73,2);
ok(await pickVal(page,18),'واختارت ١٨ في ٨١ − ٧٣ (الصواب ٨)');
ok(await page.evaluate(()=>basicsErrDelta())===10,'والفرق +١٠');
await putSub(page,23,14,2);
await page.evaluate(()=>basicsChoose(basicsCur.ai));
ok(await page.evaluate(()=>basicsErrDelta())===null,'والصواب بلا فرق');

console.log('\n٢) المموّه الذي تقع عليه معروضٌ فعلاً — ولهذا خرجت صفراً من ١٥ وهي تختار من أربعة');
const opts=await page.evaluate(()=>{basicsSub="subborrow";basicsStage=2;
  basicsCur={fam:{a:23,b:14,c:9}};basicsPrep();
  return basicsCur.opts.map(parseArNum)});
ok(opts.includes(10)&&opts.includes(8),`الخيارات تضمّ ٩±١ (${opts.join(' · ')})`);

console.log('\n٣) بوّابة «الفرق فجواتٌ لا أعداد»: تُسلَّح بالتكرار لا بأول زلّة');
page=await mk();
await page.evaluate(()=>{try{localStorage.removeItem('mawhiba_basics_shape_v1')}catch(e){}});
await putSub(page,23,14,2);
await pickVal(page,10);
ok(await page.evaluate(()=>basicsOb1Gated())===false,'الخطأ الأول: بلا بوّابة — لا يُعاقَب من زلّ مرّة');
await page.evaluate(()=>basicsAdvance());
await putSub(page,21,12,2);
await pickVal(page,10);
ok(await page.evaluate(()=>basicsOb1Gated())===true,'والثاني يُسلّحها');
let t=await page.textContent('#app');
ok(t.includes('الفرق فجواتٌ لا أعداد'),'وتُسمّى المفهوم المقلوب باسمه');
ok(t.includes('اقفزي على خطّ الأعداد أعلاه للانتقال'),'وزرّ الانتقال يختفي — المنع لا التنبيه');
ok(await page.evaluate(()=>document.querySelectorAll('button[onclick="basicsAdvance()"]').length)===0,'ولا وجود له في الصفحة');
await page.evaluate(()=>basicsAdvance());
ok(await page.evaluate(()=>basicsOb1Gated())===true,'ونداء الانتقال مباشرةً لا يتجاوزها');

console.log('\n٤) وتُفتح بالقفز بيدها لا بالقراءة');
const jumps=await page.evaluate(()=>ob1Total());
for(let i=0;i<jumps;i++)await page.click('button[onclick="ob1Jump()"]');
ok(await page.evaluate(()=>ob1Complete())===true,`${jumps===1?'قفزة واحدة':'قفزتان'} ⇒ اكتملت`);
ok(await page.evaluate(()=>basicsOb1Gated())===false,'والبوّابة تُفتح');
t=await page.textContent('#app');
ok(t.includes('وهذا الفرق'),'ويُعرض المجموع = الفرق');
logs.length=0;
await page.evaluate(()=>basicsAdvance());
await page.waitForTimeout(300);
const gapLog=logs.find(l=>l.qtype==='gaps');
ok(!!gapLog&&gapLog.is_correct===true,'والعلاج مُسجَّل بنتيجته');
ok(gapLog&&gapLog.q_text==='21 - 12',`ومعه الطرح نفسه (${gapLog&&gapLog.q_text})`);

console.log('\n٥) بوّابة «أنقصي العشرة» لعائلة +١٠');
page=await mk();
// المفاتيح صارت أسماء الفهرس المنشور لا أسماءً من عندي
await page.evaluate(()=>{try{localStorage.setItem('mawhiba_basics_shape_v1',JSON.stringify({borrow_no_decrement:1}))}catch(e){}});
await putSub(page,81,73,2);
await pickVal(page,18);
ok(await page.evaluate(()=>basicsBtGated())===true,'الخطأ الثاني من نوعه يُسلّحها');
t=await page.textContent('#app');
ok(t.includes('استلفتِ العشرة ونسيتِ أن تُنقصيها'),'وتُسمّى الآلية باسمها');
ok(t.includes('استلفي عشرة'),'ومعها الفعل المطلوب');
await page.click('button[onclick="btBorrow()"]');
ok(await page.evaluate(()=>btComplete())===true,'والضغط يُنفّذ الاستلاف');
t=await page.textContent('#app');
ok(t.includes('٧ − ٧ = ٠'),'وتظهر العشرات بعد النقص: ٧ − ٧ لا ٨ − ٧');
ok(t.includes('لا ٨ − ٧'),'ومعها ما كانت تفعله صريحاً');
ok(await page.evaluate(()=>basicsBtGated())===false,'والبوّابة تُفتح');

console.log('\n٦) النزول: خطآن متتاليان يُرجعان درجة — وهذا ما لم يكن موجوداً');
page=await mk();
await page.evaluate(()=>{try{localStorage.removeItem('mawhiba_basics_shape_v1')}catch(e){}});
await page.evaluate(()=>{startBasics('subborrow');basicsStage=3});
// نختار خطأ الصواب−١ عمداً: لا بوّابة له، فيُقاس النزول وحده. (وهو رابع آلياتها
// وليست له بوّابة بعد — تُقرَّر بعد أن نرى أثر الثلاث.)
await putSub(page,40,33,3);
await pickVal(page,6);
ok(await page.evaluate(()=>basicsDropPending)===false,'خطأ واحد: لا نزول');
await page.evaluate(()=>basicsAdvance());
await putSub(page,70,57,3);
await pickVal(page,12);
ok(await page.evaluate(()=>basicsDropPending)===true,'وخطآن متتاليان ⇒ نزول');
ok(await page.evaluate(()=>basicsOb1Gated()||basicsBtGated())===false,'وبلا بوّابة شكلٍ تعترض');
ok((await page.textContent('#app')).includes('راجعي المثال'),'ويتغيّر نصّ الزرّ فتعرف لماذا');
await page.evaluate(()=>basicsAdvance());
ok(await page.evaluate(()=>basicsStage)===2,'المرحلة ٣ ⇒ ٢');
await putSub(page,23,14,2);
await pickVal(page,10);
await page.evaluate(()=>basicsAdvance());
await putSub(page,21,12,2);
await pickVal(page,10);
await page.evaluate(()=>{ob1Reset();btReset();basicsAdvance()});
ok(await page.evaluate(()=>basicsStage)===1,'والمرحلة ٢ ⇒ المثال المحلول');
ok((await page.textContent('#app')).includes('رجعنا خطوة إلى الوراء'),'ويُقال لها لماذا رجعت');
ok((await page.textContent('#app')).includes('مثال محلول'),'ومعه المثال');
// والصواب يُصفّر العدّاد فلا تهبط بخطأين متباعدين
await page.evaluate(()=>{basicsStage=3;basicsMiss=0;basicsDropPending=false});
await putSub(page,40,33,3);
await pickVal(page,6);
await page.evaluate(()=>basicsAdvance());
await putSub(page,23,14,3);
await page.evaluate(()=>basicsChoose(basicsCur.ai));
await page.evaluate(()=>basicsAdvance());
await putSub(page,70,57,3);
await pickVal(page,12);
ok(await page.evaluate(()=>basicsDropPending)===false,'وخطآن بينهما صواب لا يُنزلان');

console.log('\n٧) شكل الخطأ في السجلّ — «ما لا يُسجَّل الآن لا يُشخَّص لاحقاً»');
logs.length=0;
page=await mk();
await putSub(page,81,55,2);
await pickVal(page,25);
await page.waitForTimeout(300);
const row=logs.filter(l=>String(l.qtype||'').indexOf('stage')===0).slice(-1)[0];
ok(!!row,'سطر الإجابة وصل');
ok(row&&row.q_text==='٨١ - ٥٥ = ؟',`ومعه السؤال (${row&&row.q_text})`);
ok(row&&/الصواب ٢٦/.test(String(row.response)),`ومعه الصواب (${row&&row.response})`);
ok(row&&/فرق −١/.test(String(row.response)),'ومعه شكل الخطأ: فرق −١');

console.log('\n٨) خيارات الأسئلة المولَّدة تُسجَّل — سؤالان بالجواب نفسه ولم أستطع الحكم');
logs.length=0;
page=await mk();
const qlog=await page.evaluate(()=>{
  filtered=[{d:"verbal",qtype:"logic",q:"إذا كان جميع الصيادين يذهبون إلى البحر…",
    c:["يذهبون إلى البحر","يذهبون إلى المستشفيات","يأكلون السمك","ينامون"],a:0}];
  idx=0;picked=null;locked=false;questionShownAt=Date.now();
  choose(1);return true;
});
await page.waitForTimeout(300);
const vrow=logs.filter(l=>l.domain==='verbal').slice(-1)[0];
ok(!!vrow,'سطر السؤال المولَّد وصل');
ok(vrow&&/الخيارات:/.test(vrow.q_text),'ومعه الخيارات');
ok(vrow&&/1\) يذهبون إلى البحر ✓/.test(vrow.q_text),'والصواب موسومٌ بموضعه');
ok(vrow&&/2\) يذهبون إلى المستشفيات/.test(vrow.q_text),`وما اختارته موجودٌ فيها (${(vrow.q_text||'').slice(-90)})`);
ok(vrow&&vrow.response==='يذهبون إلى المستشفيات','ونصّ اختيارها كما هو');

console.log('\n٨ب) والرسوم تُسجَّل بموضعها لا بشيفرتها');
logs.length=0;
await page.evaluate(()=>{
  filtered=[{d:"flex",qtype:"bank",q:"ما الشكل التالي؟",
    c:['<svg viewBox="0 0 50 50"><polygon points="1,2"/></svg>',"ب","ج","د"],a:0}];
  idx=0;picked=null;locked=false;questionShownAt=Date.now();choose(0);
});
await page.waitForTimeout(300);
const frow=logs.filter(l=>l.domain==='flex').slice(-1)[0];
ok(frow&&/1\) \[رسم\] ✓/.test(frow.q_text),'الرسم يُسجَّل [رسم]');
ok(frow&&frow.q_text.indexOf('<svg')<0,'ولا يدخل SVG في السجلّ');

console.log('\n٩) لا انحدار');
page=await mk();
for(const [fn,md] of [["startBasics('subborrow')",'basics'],["startBasics('addcarry')",'basics'],
  ["startBasics('multdiv')",'basics'],["startBasics('percent')",'basics'],["startBasics('pimul')",'basics'],
  ["startFactPlan()",'factplan'],["startEngPlan()",'engplan'],["startDictation()",'dictation'],["home()",'home']]){
  const r=await page.evaluate(x=>{try{eval(x);return{m:mode}}catch(e){return{err:e.message}}},fn);
  ok(!r.err&&r.m===md,`${fn} → ${r.err||r.m}`);
}
ok((await page.evaluate(()=>censusMissing())).length===0,'وكل الدوال معرَّفة');
ok((await page.evaluate(()=>window.__ERRS.length))===0,'ولا خطأ');

console.log('\n'+(fails?`=== ${fails} فشل ===`:'=== كل الاختبارات نجحت ==='));
await b.close();process.exit(fails?1:0);
})();
