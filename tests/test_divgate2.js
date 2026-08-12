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
  await page.waitForFunction(()=>typeof basicsDivGated==='function');
  return page;
};
// يضع سؤال قسمة بعينه في مرحلة بعينها
const putDiv=async(page,a,bb,stage)=>page.evaluate(([a,bb,stage])=>{
  startBasics('multdiv');basicsStage=stage;
  basicsCur={fam:{a:bb,b:a/bb,c:a}};
  basicsCur.qText=`${toAr(a)} ÷ ${toAr(bb)} = ؟`;basicsCur.op="div";
  basicsCur.ansVal=a/bb;divArmArray(a,bb);
  const m=mcNum(a/bb,[a/bb+1,a/bb-1,a/bb+10]);basicsCur.opts=m.choices;basicsCur.ai=m.answer;
  basicsLocked=false;basicsPicked=-1;basicsTyped="";divRemedyAt=0;render();
},[a,bb,stage]);

console.log('\n١) الخطأ في القسمة يفتح المصفوفة ويحجب الانتقال (المرحلة ٥)');
let page=await mk();
await putDiv(page,48,6,5);   // الخطأ الحقيقي: ٤٨ ÷ ٦ ← ٥
await page.evaluate(()=>{document.getElementById('basicsIn').value="5";basicsSubmit()});
ok(await page.evaluate(()=>basicsLocked)===true,'الإجابة الخاطئة تُحتسب');
ok(await page.evaluate(()=>basicsDivGated())===true,'والبوّابة تُقفل');
let t=await page.textContent('#app');
ok(t.includes('كوّني الصفوف حتى تنتهي النقاط'),'وتظهر المصفوفة مع توجيهها');
ok(t.includes('أكملي المصفوفة أعلاه للانتقال'),'وبدل زرّ الانتقال رسالة صريحة');
ok(await page.evaluate(()=>document.querySelectorAll('button[onclick="basicsFinalNext()"]').length)===0,'وزرّ «سؤال جديد» غير موجود في الصفحة');
await page.evaluate(()=>basicsFinalNext());
ok(await page.evaluate(()=>basicsLocked)===true,'ونداء الانتقال مباشرةً لا يتجاوزها');

console.log('\n٢) المصفوفة تُسلَّح بالقسمة المعروضة نفسها');
ok(await page.evaluate(()=>divA)===48&&await page.evaluate(()=>divB)===6,`المصفوفة على ٤٨ ÷ ٦ (${await page.evaluate(()=>divA)} ÷ ${await page.evaluate(()=>divB)})`);
// وبناء الصفوف يفتحها
for(let i=0;i<8;i++)await page.click('button[onclick="divAddRow()"]');
ok(await page.evaluate(()=>divComplete())===true,'ثمانية صفوف × ٦ = ٤٨ ⇒ اكتملت');
ok(await page.evaluate(()=>basicsDivGated())===false,'والبوّابة تُفتح');
t=await page.textContent('#app');
ok(t.includes('٤٨ ÷ ٦ = ')&&t.includes('٨'),'وتُعرض القسمة نفسها محلولةً بيدها');
ok(await page.evaluate(()=>document.querySelectorAll('button[onclick="basicsFinalNext()"]').length)===1,'ويعود زرّ الانتقال');

console.log('\n٣) العلاج يُسجَّل بزمنه وعدد لمساته');
logs.length=0;
await page.click('button[onclick="basicsFinalNext()"]');
await page.waitForTimeout(400);
const rem=logs.find(l=>l.qtype==='array');
ok(!!rem,'سطر العلاج وصل');
ok(rem&&rem.domain==='basics_multdiv'&&rem.q_text==='48 ÷ 6','ومعه القسمة');
ok(rem&&rem.is_correct===true&&Number(rem.response)>=8,`وعدد اللمسات ${rem&&rem.response}`);
ok(rem&&typeof rem.elapsed_ms==='number'&&rem.elapsed_ms>0,'وزمن المكوث');
await page.close();

console.log('\n٤) الضرب والإجابة الصحيحة لا تُعطَّلان');
page=await mk();
await page.evaluate(()=>{startBasics('multdiv');basicsStage=5;
  basicsCur={fam:{a:3,b:7,c:21},qText:"٣ × ٧ = ؟",op:"mul",ansVal:21};
  const m=mcNum(21,[22,20,31]);basicsCur.opts=m.choices;basicsCur.ai=m.answer;
  basicsLocked=false;basicsTyped="";render()});
await page.evaluate(()=>{document.getElementById('basicsIn').value="12";basicsSubmit()});
ok(await page.evaluate(()=>basicsDivGated())===false,'ضرب خاطئ: بلا بوّابة (المصفوفة عن القسمة)');
ok((await page.textContent('#app')).includes('سؤال جديد'),'وزرّ الانتقال ظاهر');
await putDiv(page,36,9,5);
await page.evaluate(()=>{document.getElementById('basicsIn').value="4";basicsSubmit()});
ok(await page.evaluate(()=>basicsDivGated())===false,'وقسمة صحيحة: بلا بوّابة');
ok((await page.textContent('#app')).includes('حللتِها وحدك'),'وتُهنَّأ');
await page.close();

console.log('\n٥) المراحل ١-٣ بلا بوّابة (فيها الشرح أصلاً)');
page=await mk();
for(const st of [2,3]){
  await putDiv(page,24,6,st);
  await page.evaluate(()=>basicsChoose(basicsCur.ai===0?1:0));
  ok(await page.evaluate(()=>basicsDivGated())===false,`المرحلة ${st}: بلا بوّابة`);
  ok((await page.textContent('#app')).includes('التالي'),`  وزرّ التالي ظاهر`);
}
await putDiv(page,24,6,4);
await page.evaluate(()=>basicsChoose(basicsCur.ai===0?1:0));
ok(await page.evaluate(()=>basicsDivGated())===true,'والمرحلة ٤ فيها البوّابة');
await page.close();

console.log('\n٦) خطأ القسمة الحقيقي: ١٨ ÷ ٦ ← ٩ (قسمت على ٢)');
page=await mk();
await putDiv(page,18,6,5);
await page.evaluate(()=>{document.getElementById('basicsIn').value="9";basicsSubmit()});
ok(await page.evaluate(()=>basicsDivGated())===true,'البوّابة تُقفل');
ok(await page.evaluate(()=>divA)===18&&await page.evaluate(()=>divB)===6,'والمصفوفة على ١٨ ÷ ٦');
// صفّان فقط لا يكفيان
await page.click('button[onclick="divAddRow()"]');
await page.click('button[onclick="divAddRow()"]');
ok(await page.evaluate(()=>basicsDivGated())===true,'صفّان لا يكفيان — ما زالت مقفلة');
await page.click('button[onclick="divAddRow()"]');
ok(await page.evaluate(()=>divRows)===3&&await page.evaluate(()=>basicsDivGated())===false,'وثلاثة صفوف تُنهيها: ١٨ ÷ ٦ = ٣');
// لا تتجاوز المجموع
await page.click('button[onclick="divAddRow()"]');
ok(await page.evaluate(()=>divRows)===3,'ولا تزيد فوق المجموع');
await page.close();

console.log('\n٧) النسبة: الجواب خارج النطاق الذي اختارته هي');
page=await mk();
await page.evaluate(()=>{startBasics('percent');basicsStage=5;
  basicsCur={fam:{a:600,b:70,c:420,onePercent:6}};basicsPrep();pctArm();render()});
await page.evaluate(()=>pctPickBand(pctBandOf(600,70)));
ok(await page.evaluate(()=>pctGated())===false,'اختارت النطاق الصحيح «بين ٣٠٠ و٦٠٠»');
await page.evaluate(()=>{document.getElementById('basicsIn').value="60";basicsSubmit()});
ok(await page.evaluate(()=>basicsLocked)===false,'كتبت ٦٠: لا تُقفل الإجابة');
t=await page.textContent('#app');
ok(t.includes('خارج ما قدّرتِه بنفسك'),'وتُواجَه بتناقضها');
ok(t.includes('بين ٣٠٠ و٦٠٠')&&t.includes('٦٠'),'ومعه النطاق والرقم معاً');
// تصحيحها يمرّ بلا تحذير
await page.evaluate(()=>{document.getElementById('basicsIn').value="420";basicsSubmit()});
ok(await page.evaluate(()=>basicsLocked)===true,'وتصحيحها يُقبل');
ok(await page.evaluate(()=>basicsAnsOk())===true,'وصحيح');
await page.close();

console.log('\n٨) التحذير مرة واحدة لا حبس');
page=await mk();
await page.evaluate(()=>{startBasics('percent');basicsStage=5;
  basicsCur={fam:{a:600,b:70,c:420,onePercent:6}};basicsPrep();pctArm();render()});
await page.evaluate(()=>pctPickBand(pctBandOf(600,70)));
await page.evaluate(()=>{document.getElementById('basicsIn').value="60";basicsSubmit()});
ok(await page.evaluate(()=>basicsLocked)===false,'التحذير الأول');
await page.evaluate(()=>{document.getElementById('basicsIn').value="60";basicsSubmit()});
ok(await page.evaluate(()=>basicsLocked)===true,'وإصرارها على الرقم نفسه يمرّ — لا تُحبَس');
ok(await page.evaluate(()=>basicsAnsOk())===false,'ويُحتسب خطأً');
t=await page.textContent('#app');
ok(t.includes('هذه ١٠٪ فقط'),'ومع التشخيص الصحيح');
// الجواب داخل النطاق لا يُحذَّر أصلاً
await page.evaluate(()=>{startBasics('percent');basicsStage=5;
  basicsCur={fam:{a:600,b:70,c:420,onePercent:6}};basicsPrep();pctArm();render();
  pctPickBand(pctBandOf(600,70))});
await page.evaluate(()=>{document.getElementById('basicsIn').value="420";basicsSubmit()});
ok(await page.evaluate(()=>basicsLocked)===true&&await page.evaluate(()=>pctWarn)==="",'والجواب داخل النطاق يمرّ بلا تحذير');
await page.close();

console.log('\n٩) جلسة كاملة بنقرات حقيقية — الضرب والقسمة من ١ إلى الإتقان');
page=await mk();
await page.evaluate(()=>startBasics('multdiv'));
let guard=0,gates=0,end=false;
while(guard++<200){
  const st=await page.evaluate(()=>({m:mode,stage:basicsStage,lock:basicsLocked,gate:basicsDivGated(),
    typed:basicsTypedStage(),ans:basicsCur?basicsCur.ansVal:null,ai:basicsCur?basicsCur.ai:null}));
  if(st.m==='basicsDone'){end=true;break}
  if(st.stage===1){await page.click('button[onclick="basicsStage1Next()"]');continue}
  if(st.gate){gates++;
    let g=0;while(await page.evaluate(()=>!divComplete())&&g++<60)await page.click('button[onclick="divAddRow()"]');
    continue;}
  if(st.lock){
    const sel=await page.evaluate(()=>{const b=[...document.querySelectorAll('#app button')]
      .find(x=>/basicsAdvance|basicsFinalNext/.test(x.getAttribute('onclick')||''));return b?b.getAttribute('onclick'):null});
    if(!sel){ok(false,'شاشة مقفلة بلا مخرج');break}
    await page.click(`button[onclick="${sel}"]`);continue;
  }
  // نُخطئ عمداً في أول قسمة لنُشغّل البوّابة، ثم نُصيب
  if(st.typed){
    const wrong=gates===0&&await page.evaluate(()=>basicsCur.op==='div');
    await page.fill('#basicsIn',String(wrong?st.ans+1:st.ans));
    await page.click('button[onclick="basicsSubmit()"]');
    if(await page.evaluate(()=>!basicsLocked))await page.click('button[onclick="basicsSubmit()"]');
  }else await page.evaluate(i=>basicsChoose(i),st.ai);
}
ok(end,`الجلسة تنتهي عند شاشة النتيجة (${guard} خطوة)`);
ok(gates>0,`والبوّابة اعترضت ${gates} مرة بلا طريق مسدود`);
ok((await page.evaluate(()=>window.__ERRS.length))===0,'ولا خطأ');
await page.close();

console.log('\n١٠) لا انحدار');
page=await mk();
for(const [fn,md] of [["startBasics('multdiv')",'basics'],["startBasics('percent')",'basics'],
  ["startBasics('addcarry')",'basics'],["startBasics('subborrow')",'basics'],["startBasics('pimul3')",'basics'],
  ["startFactPlan()",'factplan'],["startEngPlan()",'engplan'],["startDictation()",'dictation'],
  ["startPronunciation()",'pron'],["home()",'home']]){
  const r=await page.evaluate(x=>{try{eval(x);return{m:mode,len:document.getElementById('app').textContent.length}}catch(e){return{err:e.message}}},fn);
  ok(!r.err&&r.m===md&&r.len>40,`${fn} → ${r.err||r.m}`);
}
// الطلاقة: بوّابتها الأصلية سليمة
ok(await page.evaluate(()=>typeof factGated==='function'&&typeof divArrayHTML==='function'),'وبوّابة الطلاقة الأصلية باقية');
ok((await page.evaluate(()=>censusMissing())).length===0,'وكل الدوال معرَّفة');
ok((await page.evaluate(()=>window.__ERRS.length))===0,'ولا خطأ');

await b.close();
console.log(fails?`\n=== ${fails} فشل ===`:'\n=== كل الاختبارات نجحت ===');
process.exit(fails?1:0);
})();
