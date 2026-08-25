const {chromium}=require('/opt/node22/lib/node_modules/playwright');
let fails=0;const ok=(c,m)=>{console.log((c?'  ✓ ':'  ✗ FAIL ')+m);if(!c)fails++};
(async()=>{
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'});
const page=await b.newPage({viewport:{width:420,height:900}});
page.on('pageerror',e=>{console.log('  ✗ PAGEERROR '+e.message);fails++});
const logs=[];
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
await page.waitForFunction(()=>typeof fadeQText==='function');

// تُجيب في المرحلة المطلوبة: صواباً أو خطأً
const ans=(right)=>page.evaluate(r=>{
  const i=r?fadeCur.ai:(fadeCur.ai===0?1:0);
  fadeChoose(i);const o=fadeCur.opts?fadeCur.opts[i]:null;fadeAdvance();return{i,o};
},right);

console.log('\n١) كل إجابة تُسجَّل بسؤالها واختيارها');
for(const topic of ['seq','percent','mirror','logic','reading','cube','pyramid','prismvol','angles']){
  logs.length=0;
  await page.evaluate(t=>{startFade(t);fadeStage=4;fadeRush=0;fadeGateStop();fadeNew()},topic);
  await ans(true);await page.waitForTimeout(120);
  const row=logs.filter(l=>l.domain==='fade_'+topic&&l.qtype==='stage4')[0]||{};
  ok(!!row.q_text&&row.q_text.length>3,`${topic}: نصّ السؤال «${String(row.q_text||'').slice(0,42)}…»`);
  ok(!!row.response,`  واختيارها «${String(row.response||'').slice(0,44)}»`);
  ok(!/<svg|<div|style=/i.test(String(row.q_text)+String(row.response)),'  وبلا شيفرة رسم في السجلّ');
}

console.log('\n٢) الخيارات المرسومة تُسجَّل بموضعها');
await page.evaluate(()=>{startFade('mirror');fadeStage=4;fadeRush=0;fadeGateStop();fadeNew()});
logs.length=0;await ans(false);await page.waitForTimeout(120);
let row=logs.filter(l=>l.qtype==='stage4')[0]||{};
ok(/موضع/.test(row.response||''),`«${row.response}» — الموضع هو ما يُحلَّل، فينكشف انحياز الزرّ`);
ok(row.is_correct===false,'وخطؤها مُسجَّل خطأً');

console.log('\n٣) الإجابة الرقمية تُسجَّل ومعها الصواب');
await page.evaluate(()=>{startFade('percent');fadeStage=4;fadeRush=0;fadeGateStop();fadeNew()});
logs.length=0;await ans(false);await page.waitForTimeout(120);
row=logs.filter(l=>l.qtype==='stage4')[0]||{};
ok(/الصواب/.test(row.response||''),`«${row.response}» — نعرف ماذا اختارت وما الصواب في سطر واحد`);

console.log('\n٤) المتتاليات تُسجَّل بأرقامها');
// مولّد المتتاليات يُنتج نوعين: متتالية أرقام ومسألة نسبة. نُلزمه بالمتتالية
await page.evaluate(()=>{startFade('seq');fadeStage=4;fadeRush=0;fadeGateStop();fadeNew();
  for(let i=0;i<30&&fadeCur.kind!=='seq';i++)fadeNew();});
const kind=await page.evaluate(()=>fadeCur.kind);
logs.length=0;await ans(true);await page.waitForTimeout(120);
row=logs.filter(l=>l.qtype==='stage4')[0]||{};
ok(kind!=='seq'||/^[\d ,?]+$/.test(row.q_text||''),`«${row.q_text}» — فيُعرف أي نمط يقاوم`);
ok((row.q_text||'').length>3,'  ولكل نوع نصّه');

console.log('\n٥) بوّابة التسرّع: لا تُنصَّب على المتأنّية');
await page.evaluate(()=>{startFade('percent');fadeStage=4;fadeRush=0;fadeGateStop();fadeNew()});
ok(await page.evaluate(()=>fadeGateOn)===false,'أول سؤال بلا بوّابة');
await page.evaluate(()=>{fadeShownAt=Date.now()-9000;fadeChoose(fadeCur.ai);fadeAdvance()});
ok(await page.evaluate(()=>fadeRush)===0,'وإجابة في تسع ثوانٍ لا تُسلّح شيئاً');
ok(await page.evaluate(()=>fadeGateOn)===false,'ولا بوّابة');

console.log('\n٦) وتُنصَّب بعد إجابتين تحت ثانيتين');
await page.evaluate(()=>{fadeShownAt=Date.now()-800;fadeChoose(fadeCur.ai);fadeAdvance()});
ok(await page.evaluate(()=>fadeRush)===1,'واحدة: لا شيء بعد');
ok(await page.evaluate(()=>fadeGateOn)===false,'ولا بوّابة');
await page.evaluate(()=>{fadeShownAt=Date.now()-700;fadeChoose(fadeCur.ai);fadeAdvance()});
ok(await page.evaluate(()=>fadeRush)===2,'والثانية تُسلّحها');
ok(await page.evaluate(()=>fadeGateOn)===true,'فتُحجب الخيارات');
let t=await page.textContent('#app');
ok(t.includes('إجابتاك الأخيرتان'),'ويُقال لها السبب صراحةً');
ok(t.includes('ما المعطى؟ وما المطلوب؟'),'ومعه ما تفعله في أثنائها');
ok(await page.evaluate(()=>document.querySelectorAll('.choice').length)===0,'ولا خيار واحد ظاهر');
ok(await page.evaluate(()=>fadeGateLeft)>=6,`وستّ ثوانٍ فأكثر (${await page.evaluate(()=>fadeGateLeft)})`);

console.log('\n٧) والسؤال يبقى أمامها — البوّابة تُبطئ ولا تُخفي');
ok(t.includes('٪')||t.length>200,'نصّ المسألة معروض في أثناء الانتظار');

console.log('\n٨) بعد انقضائها تظهر الخيارات ويبدأ الزمن من جديد');
await page.evaluate(()=>{fadeGateLeft=1});
await page.waitForTimeout(1400);
ok(await page.evaluate(()=>fadeGateOn)===false,'انفتحت');
ok(await page.evaluate(()=>document.querySelectorAll('.choice').length)===4,'وأربعة خيارات');
const dt=await page.evaluate(()=>Date.now()-fadeShownAt);
ok(dt<2500,`والزمن يُقاس من ظهور الخيارات (${dt} مللي) — لا من ظهور السؤال، فلا تُخفى سرعتها`);

console.log('\n٩) وتنحلّ حين تُبطئ');
await page.evaluate(()=>{fadeShownAt=Date.now()-8000;fadeChoose(fadeCur.ai);fadeAdvance()});
ok(await page.evaluate(()=>fadeRush)===0,'العدّاد صفر');
ok(await page.evaluate(()=>fadeGateOn)===false,'ولا بوّابة في التالي');

console.log('\n١٠) لا تُنصَّب في المنطق والفهم المقروء');
for(const topic of ['logic','reading']){
  await page.evaluate(t=>{startFade(t);fadeStage=4;fadeNew()},topic);
  await page.evaluate(()=>{for(let k=0;k<3;k++){fadeShownAt=Date.now()-500;fadeChoose(fadeCur.ai);fadeAdvance()}});
  ok(await page.evaluate(()=>fadeGateOn)===false,`${topic}: بلا بوّابة رغم السرعة`);
  ok(await page.evaluate(()=>fadeRush)>=2,'  والعدّاد يعدّ (فلو غيّرنا رأينا فالبيانات موجودة)');
}

// ٢٢ أغسطس: كانت البوّابة تُنصَّب في المرحلة ٤ وحدها، فأجابت هيا في المرحلة ٢ بـ١٫١ث
// و١٫٣ث خطأً بلا مانع. والاعتراض القديم («الدعم معروض») صحيحٌ جزئياً: المرحلة ٢ تعرض
// **القاعدة** لا الجواب، فمن يحفظها قد يُجيب بسرعةٍ صادقة. فالحلّ يُجيب الاعتراض بدل
// تجاهله: في ٢-٣ لا تُحسب السرعة تسرّعاً إلا إذا اقترنت بخطأ؛ وفي ٤ السرعة وحدها تكفي.
console.log('\n١١) في المرحلتين ٢-٣: السرعة وحدها لا تكفي — لا بدّ أن تقترن بخطأ');
await page.evaluate(()=>{startFade('percent');fadeStage=2;fadeRush=0;fadeNew();
  fadeShownAt=Date.now()-200;fadeChoose(fadeCur.ai);          // سريعةٌ ومصيبة
  fadeNew();fadeShownAt=Date.now()-200;fadeChoose(fadeCur.ai);});
ok(await page.evaluate(()=>fadeRush)===0,'سريعةٌ مصيبةٌ مرّتين لا تُراكم تسرّعاً');
ok(await page.evaluate(()=>fadeGateOn)===false,'ولا تُنصَّب البوّابة عليها');
// المرحلة ٣ كذلك: يُبنى العدّاد بإجاباتٍ حقيقية لا بفرض fadeRush=5، وإلا لم يُفحص
// الشرط الجديد أصلاً (السرعة مع الخطأ) بل قُفز فوقه.
await page.evaluate(()=>{startFade('percent');fadeStage=3;fadeRush=0;fadeNew();
  fadeShownAt=Date.now()-200;fadeChoose(fadeCur.ai);
  fadeNew();fadeShownAt=Date.now()-200;fadeChoose(fadeCur.ai);});
ok(await page.evaluate(()=>fadeGateOn)===false,'وكذلك ٣ ما دامت الإجابة صحيحة');
// أمّا السريعة المخطئة فتُراكم وتُنصَّب — وهي حال هيا بالضبط
await page.evaluate(()=>{startFade('percent');fadeStage=2;fadeRush=0;fadeNew();
  const wrong=function(){const w=(fadeCur.ai+1)%fadeCur.opts.length;
    fadeShownAt=Date.now()-200;fadeLocked=false;fadeChoose(w)};
  wrong();fadeNew();wrong();fadeNew();});
ok(await page.evaluate(()=>fadeRush)>=2,'وسريعةٌ مخطئةٌ مرّتين تُراكم — '+await page.evaluate(()=>fadeRush));
ok(await page.evaluate(()=>fadeGateOn)===true,'فتُنصَّب البوّابة في المرحلة ٢');

console.log('\n١٢) الخروج يُوقف المؤقّت');
await page.evaluate(()=>{startFade('percent');fadeStage=4;fadeRush=5;fadeNew()});
ok(await page.evaluate(()=>fadeGateOn)===true,'بوّابة قائمة');
await page.evaluate(()=>home());
await page.waitForTimeout(200);
ok(await page.evaluate(()=>fadeGateOn)===false&&await page.evaluate(()=>fadeGateTimer)===null,'والرجوع للرئيسية يُوقفها');
await page.evaluate(()=>{startFade('percent');fadeStage=4;fadeRush=5;fadeNew();goFadeMenu()});
ok(await page.evaluate(()=>fadeGateTimer)===null,'وكذلك تغيير المهارة');

console.log('\n١٣) لا انحدار');
for(const [fn,md] of [["startBasics('percent')",'basics'],["startEngPlan()",'engplan'],["startFade('seq')",'fade'],
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
