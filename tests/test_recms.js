// «المايك ما يشتغل» — بلاغ هيا ٢٩ أغسطس، وسببه تكميمُ عدّاد الزمن.
// الدليل من السجلّ: ثماني حالات `[too_short]` في النطق عبر ثمانية أيام وكلماتٍ
// مختلفة (hill/team/chess/stone/race/winter…)، زمنُها **٧٥٠ ملّي ثانية بالضبط**
// في كلٍّ منها. ولا إنسان يضغط بهذه الدقّة ثماني مرّات.
// و`pronElapsed` يتقدّم ٠٫٢٥ث كل نبضة، فقيمه ٠/٢٥٠/٥٠٠/٧٥٠/١٠٠٠ — و`PRON_MIN_MS=800`
// يقع بين ٧٥٠ و١٠٠٠، فكلُّ تسجيلٍ حقيقيّ طوله ٧٥٠-٩٩٩ ملّي ثانية يُرفض حتماً.
const {chromium}=require('/opt/node22/lib/node_modules/playwright');
let fails=0;const ok=(c,m)=>{console.log((c?'  ✓ ':'  ✗ FAIL ')+m);if(!c)fails++};
(async()=>{
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'});
const p=await b.newPage({viewport:{width:420,height:900}});
p.on('pageerror',e=>{console.log('  ✗ PAGEERROR '+e.message);fails++});
await p.route('**/rest/v1/**',r=>r.fulfill({status:200,contentType:'application/json',body:'[]'}));
await p.route('**/functions/v1/**',r=>r.fulfill({status:200,contentType:'application/json',body:'{"ok":false}'}));
await p.addInitScript(()=>{
  Object.defineProperty(window,'speechSynthesis',{configurable:true,value:{speak(){},cancel(){},getVoices:()=>[{lang:'en-US',name:'X'}],speaking:false,pending:false}});
  window.SpeechSynthesisUtterance=function(t){this.text=t};
});
await p.goto('http://127.0.0.1:8931/index.html');
await p.waitForFunction(()=>typeof recMs==='function');

console.log('\n١) الفجوة التي أوقعت البلاغ: عدّادٌ بخطوة ٠٫٢٥ث وحدٌّ ٨٠٠');
{
  const r=await p.evaluate(()=>({
    min:PRON_MIN_MS,
    // القيم الممكنة للعدّاد وحده
    ticks:[0,0.25,0.5,0.75,1,1.25].map(function(t){return{t:t,ms:t*1000,passOld:(t*1000>=PRON_MIN_MS)}}),
  }));
  ok(r.min===800,'الحدّ ٨٠٠ ملّي ثانية');
  const gap=r.ticks.filter(x=>x.ms>0&&x.ms<r.min);
  ok(gap.some(x=>x.ms===750),'و٧٥٠ من قيم العدّاد الممكنة وتقع تحته — وهي بعينها القيمة المسجَّلة ثماني مرّات');
  ok(r.ticks.find(x=>x.ms===1000).passOld===true,'والقيمة التالية ١٠٠٠ تعبر — فالمرفوض حقيقةً كلُّ ما دون ثانية');
}

console.log('\n٢) والقياس صار بالساعة لا بالنبضات');
{
  const r=await p.evaluate(async()=>{
    const out={};
    // تسجيلٌ حقيقيّ ٩٠٠ ملّي ثانية: العدّاد يقول ٧٥٠ (٣ نبضات) والساعة تقول ~٩٠٠
    const t0=Date.now();
    await new Promise(function(r){setTimeout(r,900)});
    out.real=recMs(t0,0.75);
    out.ticksOnly=0.75*1000;
    // وبلا مرساة يسقط إلى العدّاد بدل أن يُصفّر
    out.fallback=recMs(0,0.75);
    // وضغطةٌ عابرة حقيقية تبقى مرفوضة
    const t1=Date.now();
    out.tap=recMs(t1,0);
    return out;
  });
  ok(r.real>=850,'تسجيلُ ٩٠٠ملّي يُقرأ بزمنه الحقيقي — '+r.real+'ملّي');
  ok(r.real>=800,'  فيعبر الحدّ (كان يُرفض بقراءة ٧٥٠)');
  ok(r.ticksOnly===750,'  بينما العدّاد وحده يقول ٧٥٠ — الفرق هو العطل بعينه');
  ok(r.fallback===750,'وبلا مرساة يسقط إلى العدّاد لا إلى صفر — لا يُفتح باب قبولٍ أعمى');
  ok(r.tap<800,'وضغطةٌ عابرة تبقى مرفوضة — '+r.tap+'ملّي');
}

console.log('\n٢ب) والأطول من القراءتين — لا الساعة وحدها');
{
  // أوّل تنفيذٍ أخذ الساعة متى كانت موجبة فأسقط العدّاد ولو كان أكبر. وكشفه
  // `test_fix3` (قسما ٦ و٧) لا فحصي: تسجيلٌ ساعتُه قصيرة وعدّاده طويل صار يُرفض.
  // وهو حالةٌ حقيقية لا حيلةُ اختبار: ضبطُ ساعة الجهاز أثناء التسجيل يُقفزها للوراء.
  const r=await p.evaluate(()=>({
    clockJumped:recMs(Date.now()+1500,2),   // ساعةٌ قفزت للوراء ⇒ real سالب
    clockShort:recMs(Date.now()-100,2),     // ساعةٌ ١٠٠ملّي وعدّادٌ ٢ث
    normal:recMs(Date.now()-3000,2.75),     // الاستعمال العادي: الساعة أكبر
    tapWithTicks:recMs(Date.now(),0)        // ضغطةٌ عابرة بلا نبضات
  }));
  ok(r.clockJumped===2000,'ساعةٌ قفزت للوراء ⇒ يُؤخذ العدّاد — '+r.clockJumped+'ملّي');
  ok(r.clockShort===2000,'وساعةٌ أقصر من العدّاد ⇒ العدّاد — '+r.clockShort+'ملّي');
  ok(r.normal>=2900,'وفي العادي تفوز الساعة (العدّاد مكمَّم أدنى) — '+r.normal+'ملّي');
  ok(r.tapWithTicks<800,'والضغطة العابرة تبقى مرفوضة — '+r.tapWithTicks+'ملّي');
}

console.log('\n٣) والقسمان يستعملانه معاً — لا يُصلَح أحدهما ويُنسى الآخر');
{
  const r=await p.evaluate(()=>{
    const src=document.documentElement.innerHTML;
    return{
      pron:/const pronMs=recMs\(pronStartedAt,pronElapsed\)/.test(src),
      speak:/const speakMs=recMs\(speakStartedAt,speakElapsed\)/.test(src),
      pronAnchor:/pronListening=true;pronElapsed=0;pronStartedAt=Date\.now\(\)/.test(src),
      speakAnchor:/speakListening=true;speakElapsed=0;speakStartedAt=Date\.now\(\)/.test(src),
      // ولا يبقى حكمٌ على العدّاد الخام في أيٍّ منهما
      oldPron:/pronElapsed\*1000<PRON_MIN_MS/.test(src),
      oldSpeak:/speakElapsed\*1000<PRON_MIN_MS/.test(src)
    };
  });
  ok(r.pron&&r.speak,'النطق والجمل كلاهما يقيس بالساعة');
  ok(r.pronAnchor&&r.speakAnchor,'وكلاهما يضع مرساةً عند بدء التسجيل');
  ok(!r.oldPron&&!r.oldSpeak,'ولا يبقى حكمٌ على العدّاد الخام');
}

console.log('\n٤) وحدُّ المحادثة كان ينجو من الفجوة — وهذا ما فسّر التناقض');
{
  const r=await p.evaluate(()=>({coach:COACH_MIN_MS,pron:PRON_MIN_MS}));
  ok(r.coach===700,'حدّ المحادثة ٧٠٠ — تحت خطوة ٧٥٠ لا داخلها');
  ok(r.coach<750&&r.pron>750,'فنجحت المحادثة ١٣:٤٦:٣٠ وأُسقط النطق بعدها بستّ عشرة ثانية');
}

await b.close();
console.log(fails?`\n=== ${fails} فشل ===`:'\n=== كل الاختبارات نجحت ===');
process.exit(fails?1:0);
})();
