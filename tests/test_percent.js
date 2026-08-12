const {chromium}=require('/opt/node22/lib/node_modules/playwright');
let fails=0;const ok=(c,m)=>{console.log((c?'  ✓ ':'  ✗ FAIL ')+m);if(!c)fails++};
(async()=>{
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'});
const page=await b.newPage({viewport:{width:420,height:900}});
page.on('pageerror',e=>{console.log('  ✗ PAGEERROR '+e.message);fails++});
await page.route('**/rest/v1/**',r=>r.fulfill({status:201,contentType:'application/json',body:'[]'}));
await page.goto('http://127.0.0.1:8931/index.html');
await page.waitForFunction(()=>typeof percentDiagnose==='function');

// يضع سؤال نسبة بعينه في مرحلة بعينها
const put=async(a,bb,stage)=>page.evaluate(([a,bb,stage])=>{
  startBasics('percent');basicsStage=stage;
  basicsCur={fam:{a,b:bb,c:a*bb/100,onePercent:a/100}};
  basicsLocked=false;basicsPicked=-1;basicsTyped="";basicsPrep();pctArm();render();
},[a,bb,stage]);

console.log('\n١) كل خطأ حقيقي وقعت فيه يُسمّى باسمه');
// الأعمدة: النسبة، الكل، ما كتبته، ما يجب أن يُذكر في التشخيص
const REAL=[
  [50,1000,"٥٠٠٠٠","ونسيتِ القسمة على ١٠٠"],
  [40,500,"٢٠٠٠٠","ونسيتِ القسمة على ١٠٠"],
  [25,400,"١٠٠٠٠","ونسيتِ القسمة على ١٠٠"],
  [75,100,"٧٥٠٠","ونسيتِ القسمة على ١٠٠"],
  [40,1000,"١٠","قيمة ١٪ فقط"],
  [90,500,"٥","قيمة ١٪ فقط"],
  [70,300,"٧٠","رقم النسبة نفسه"],
  [75,1000,"٧٥","رقم النسبة نفسه"],
  [50,800,"٨٠","١٠٪ فقط"],
  [70,400,"٤٠","١٠٪ فقط"],
  [40,100,"٤٠٠","المنزلة خطأ"],
  [25,100,"٥٢","أصغر من"],
];
const got=await page.evaluate(R=>R.map(x=>percentDiagnose(x[1],x[0],x[1]*x[0]/100,x[2])),REAL);
REAL.forEach((x,i)=>ok(got[i].includes(x[3]),`${x[0]}٪ من ${x[1]} ← «${x[2]}»: ${got[i]||'(بلا تشخيص)'}`));
// الزلّتان الحسابيّتان لا تُشخَّصان تشخيصاً مفاهيمياً كاذباً
const slips=await page.evaluate(()=>[percentDiagnose(1000,70,700,"٧١٠"),percentDiagnose(400,40,160,"١٥٦"),percentDiagnose(300,70,210,"٢١٠")]);
ok(slips[0]===""&&slips[1]==="",'والزلّتان الحسابيّتان (٧١٠ و١٥٦) بلا تشخيص مفاهيمي كاذب');
ok(slips[2]==="",'والجواب الصحيح لا يُشخَّص إطلاقاً');

console.log('\n٢) بوّابة التقدير تمنع الجواب قبل تحديد الحجم');
await put(300,70,5);
ok(await page.evaluate(()=>pctGated())===true,'٧٠٪ من ٣٠٠ (مرحلة ٥): مُقفلة');
ok(await page.locator('#basicsIn').count()===0,'وحقل الكتابة غير موجود في الصفحة إطلاقاً');
let t=await page.textContent('#app');
ok(t.includes('أين يقع الجواب تقريباً؟'),'ويُطلب تحديد النطاق');
ok(t.includes('بين ١٥٠ و٣٠٠')&&t.includes('أكبر من ٣٠٠'),'والنطاقات بأرقام حقيقية لا بكلام عام');
// محاولة الكتابة قبل النطاق لا تُحتسب
await page.evaluate(()=>{basicsTyped="٢١٠";basicsSubmit()});
ok(await page.evaluate(()=>basicsLocked)===false,'ونداء التحقّق قبل النطاق لا يُحتسب محاولة');

console.log('\n٣) النطاق الخطأ يُسمّى سببه ولا يفتح البوّابة');
await page.evaluate(()=>pctPickBand(3));
t=await page.textContent('#app');
ok(t.includes('مستحيل')&&t.includes('أقل من ١٠٠٪'),'«أكبر من الكل» ⇒ مستحيل — وهو بالضبط فخّ الضرب بلا قسمة');
ok(await page.evaluate(()=>pctGated())===true,'والبوّابة ما زالت مقفلة');
ok(await page.locator('#basicsIn').count()===0,'والحقل ما زال غائباً');
await page.evaluate(()=>pctPickBand(0));
t=await page.textContent('#app');
ok(t.includes('أصغر من اللازم'),'ونطاق أصغر من اللازم يُسمّى كذلك');
ok(await page.evaluate(()=>pctBandTries)===2,'والمحاولات تُعدّ (٢)');

console.log('\n٤) النطاق الصحيح يفتحها');
await page.evaluate(()=>pctPickBand(pctBandOf(basicsCur.fam.a,basicsCur.fam.b)));
ok(await page.evaluate(()=>pctGated())===false,'النطاق الصحيح يفتح البوّابة');
ok(await page.locator('#basicsIn').count()===1,'ويظهر حقل الكتابة');
ok((await page.textContent('#app')).includes('الآن احسبيه بالضبط'),'مع توجيه صريح');
await page.evaluate(()=>{document.getElementById('basicsIn').value="٢١٠";basicsSubmit()});
ok(await page.evaluate(()=>basicsLocked)===true,'والجواب بعدها يُحتسب');
ok((await page.textContent('#app')).includes('حللتِها وحدك'),'وصحيح');

console.log('\n٥) النطاق الصحيح لكل نسبة — فحص شامل لا عيّنة');
const bands=await page.evaluate(()=>{
  const bad=[];
  [100,200,300,400,500,600,800,1000].forEach(a=>[10,20,25,30,40,50,60,70,75,80,90].forEach(b=>{
    const ans=a*b/100,i=pctBandOf(a,b),lo=[0,a/4,a/2,a][i],hi=[a/4,a/2,a,Infinity][i];
    if(!(ans>=lo&&ans<=hi))bad.push(`${b}% من ${a}: ${ans} ليس في [${lo},${hi}]`);
    if(i===3)bad.push(`${b}% من ${a}: صُنّف «أكبر من الكل» وهو مستحيل`);
  }));
  return bad;
});
ok(bands.length===0,bands.length?bands.slice(0,3).join(' | '):'٨٨ تركيبة: كل جواب داخل نطاقه، ولا واحدة تقع في النطاق المستحيل');

console.log('\n٦) خطوات مرساة الـ١٠٪ تنتهي بالجواب فعلاً — فحص شامل');
const steps=await page.evaluate(()=>{
  const bad=[];
  [100,200,300,400,500,600,800,1000].forEach(a=>[10,20,25,30,40,50,60,70,75,80,90].forEach(b=>{
    const ans=a*b/100,S=percentSteps(a,b);
    if(!S.length)bad.push(`${b}% من ${a}: بلا خطوات`);
    const last=S[S.length-1],digits=String(ans).split("").map(d=>"٠١٢٣٤٥٦٧٨٩"[+d]).join("");
    if(last.indexOf("<b>"+digits+"</b>")<0)bad.push(`${b}% من ${a}: الخطوة الأخيرة لا تذكر ${ans} — «${last}»`);
    if(/NaN|undefined/.test(S.join(" ")))bad.push(`${b}% من ${a}: قيمة معطوبة`);
  }));
  return bad;
});
ok(steps.length===0,steps.length?steps.slice(0,3).join(' | '):'٨٨ تركيبة: كل سلسلة خطوات تنتهي بالجواب صريحاً ولا قيمة معطوبة');
const rules=await page.evaluate(()=>{
  const bad=[];
  [100,200,300,400,500,600,800,1000].forEach(a=>[10,20,25,30,40,50,60,70,75,80,90].forEach(b=>{
    const r=percentRule(a,b);
    if(!r||/NaN|undefined/.test(r))bad.push(`${b}% من ${a}`);
  }));
  return bad;
});
ok(rules.length===0,rules.length?rules.slice(0,3).join(' | '):'ونصّ القاعدة سليم في ٨٨ تركيبة');

console.log('\n٧) البوّابة في المراحل المستقلة فقط');
await put(300,70,2);
ok(await page.evaluate(()=>pctGateOn())===false,'مرحلة ٢ (مع القاعدة): بلا بوّابة');
ok(await page.evaluate(()=>document.querySelectorAll('.choice').length)===4,'وخياراتها الأربعة ظاهرة');
await put(300,70,3);
ok(await page.evaluate(()=>pctGateOn())===false,'ومرحلة ٣ كذلك');
await put(300,70,4);
ok(await page.evaluate(()=>pctGateOn())===true,'ومرحلة ٤ (بلا تذكير): البوّابة تعمل');
ok(await page.evaluate(()=>document.querySelectorAll('.choice').length)===0,'وخيارات الاختيار من متعدّد محجوبة قبل النطاق');
await page.evaluate(()=>basicsChoose(0));
ok(await page.evaluate(()=>basicsLocked)===false,'والاختيار قبل النطاق لا يُحتسب');
await page.evaluate(()=>pctPickBand(pctBandOf(basicsCur.fam.a,basicsCur.fam.b)));
ok(await page.evaluate(()=>document.querySelectorAll('.choice').length)===4,'وبعد النطاق تظهر الأربعة');

console.log('\n٨) التشخيص يظهر لها على الشاشة فعلاً');
await put(1000,50,5);
await page.evaluate(()=>pctPickBand(pctBandOf(1000,50)));
await page.evaluate(()=>{document.getElementById('basicsIn').value="٥٠٠٠٠";basicsSubmit()});
// جواب خارج نطاقها يُواجَه قبل أن يُقفل — ثم يمرّ إن أصرّت
t=await page.textContent('#app');
ok(t.includes('خارج ما قدّرتِه بنفسك'),'٥٠٠٠٠ يُواجَه بتناقضه مع نطاقها قبل القفل');
ok(await page.evaluate(()=>basicsLocked)===false,'ولا يُحتسب بعد');
await page.evaluate(()=>{document.getElementById('basicsIn').value="٥٠٠٠٠";basicsSubmit()});
t=await page.textContent('#app');
ok(t.includes('أين اختلّت'),'وبعد إصرارها يظهر صندوق التشخيص');
ok(t.includes('ونسيتِ القسمة على ١٠٠'),'وفيه اسم خطئها بالضبط');
ok(t.includes('الصحيح: ٥٠٠'),'ومعه الجواب الصحيح');
// جواب صحيح ⇒ لا تشخيص
await put(1000,50,5);
await page.evaluate(()=>pctPickBand(pctBandOf(1000,50)));
await page.evaluate(()=>{document.getElementById('basicsIn').value="٥٠٠";basicsSubmit()});
ok(!(await page.textContent('#app')).includes('أين اختلّت'),'ولا يظهر عند الجواب الصحيح');

console.log('\n٩) المثال المحلول صار بمرساة الـ١٠٪');
await put(300,70,1);
t=await page.textContent('#app');
ok(t.includes('مرساة الـ١٠٪'),'مرحلة ١: العنوان الجديد');
ok(t.includes('احذفي صفراً واحداً'),'والخطوة الأولى: احذفي صفراً');
ok(t.includes('تحقّقي بالحجم'),'ومعها فحص الحجم');
ok(t.includes('طريقة ١٪'),'وطريقة ١٪ باقية كبديل اختياري لا كأصل');

console.log('\n١٠) لا انحدار');
for(const [fn,md] of [["startBasics('multdiv')",'basics'],["startBasics('addcarry')",'basics'],["startBasics('subborrow')",'basics'],
  ["startBasics('pimul')",'basics'],["startBasics('pimul3')",'basics'],["startBasics('percent')",'basics'],
  ["startFade('circle')",'fade'],["startFactPlan()",'factplan'],["startDictation()",'dictation'],
  ["startEngPlan()",'engplan'],["startPronunciation()",'pron'],["startAudioDiag()",'audiodiag'],["home()",'home']]){
  const r=await page.evaluate(x=>{try{eval(x);return{m:mode,len:document.getElementById('app').textContent.length}}catch(e){return{err:e.message}}},fn);
  ok(!r.err&&r.m===md&&r.len>40,`${fn} → ${r.err||r.m}`);
}
// الأقسام الأخرى لم تكتسب بوّابة نسبة
const other=await page.evaluate(()=>{
  const bad=[];
  ['multdiv','addcarry','subborrow','pimul','pimul3'].forEach(s=>{
    startBasics(s);basicsStage=5;basicsNew();
    if(pctGateOn())bad.push(s+': اكتسب بوّابة النسبة');
    if(pctGated())bad.push(s+': محجوب');
  });
  return bad;
});
ok(other.length===0,other.length?other.join(' | '):'وبقيّة أنواع الأساسيات الخمسة بلا بوّابة نسبة');
ok((await page.evaluate(()=>censusMissing())).length===0,'وكل الدوال معرَّفة');
ok((await page.evaluate(()=>window.__ERRS.length))===0,'ولا خطأ سُجّل في الجولة كلها');

await b.close();
console.log(fails?`\n=== ${fails} فشل ===`:'\n=== كل الاختبارات نجحت ===');
process.exit(fails?1:0);
})();
