const {chromium}=require('/opt/node22/lib/node_modules/playwright');
let fails=0;const ok=(c,m)=>{console.log((c?'  ✓ ':'  ✗ FAIL ')+m);if(!c)fails++};
(async()=>{
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'});
const page=await b.newPage();
page.on('pageerror',e=>{console.log('  ✗ PAGEERROR '+e.message);fails++});
await page.route('**/rest/v1/**',r=>r.fulfill({status:201,contentType:'application/json',body:'[]'}));
await page.route('**/rest/v1/mawhiba_answer_log*',async r=>{
  await page.evaluate(x=>{(window.__LOGS=window.__LOGS||[]).push(JSON.parse(x))},r.request().postData());
  await r.fulfill({status:201,contentType:'application/json',body:'[]'})});
await page.goto('http://127.0.0.1:8931/index.html');
await page.waitForFunction(()=>typeof divArrayHTML==='function');

console.log('\n١) مصفوفة القسمة تستجيب ليدها');
await page.evaluate(()=>{divArmArray(36,4);startBasics('multdiv');basicsCur={fam:{a:9,b:4,c:36}};divArmArray(36,4);basicsStage=1;basicsPrep();render()});
let txt=await page.textContent('#app');
ok(txt.includes('كوّني صفوفاً من ٤'),'السؤال القسمي: كم مجموعة من ٤؟');
ok(txt.includes('اضغطي «+ صفّ»'),'وتبدأ فارغة — تبنيها هي');
ok(await page.evaluate(()=>document.querySelectorAll('#app span[style*="border-radius:50%"]').length)===36,'٣٦ نقطة معروضة كلها في «الباقي»');
await page.click('button[onclick="divAddRow()"]');
txt=await page.textContent('#app');
ok(txt.includes('١ × ٤ = ٤')&&txt.includes('بقي ٣٢'),'صفّ واحد ⇒ العدّاد يستجيب لحظياً: ١×٤=٤ وبقي ٣٢');
for(let i=0;i<8;i++)await page.click('button[onclick="divAddRow()"]');
ok(await page.evaluate(()=>divRows)===9,'تسعة صفوف');
txt=await page.textContent('#app');
ok(txt.includes('٩ صفوف × ٤ = ٣٦')&&txt.includes('٣٦ ÷ ٤ = ٩'),'وعند انتهاء النقاط تظهر القسمة نفسها: ٣٦ ÷ ٤ = ٩');
ok(!txt.includes('بقي'),'ولا يبقى شيء');
await page.click('button[onclick="divAddRow()"]');
ok(await page.evaluate(()=>divRows)===9,'ولا تتجاوز المجموع مهما ضغطت');
await page.click('button[onclick="divDelRow()"]');
ok(await page.evaluate(()=>divRows)===8,'والتراجع يعمل');
await page.click('button[onclick="divResetRows()"]');
ok(await page.evaluate(()=>divRows)===0,'وإعادة الضبط تُفرغها');
await page.click('button[onclick="divDelRow()"]');
ok(await page.evaluate(()=>divRows)===0,'ولا تنزل تحت الصفر');

console.log('\n٢) الرياضيات صحيحة على كل حقيقة قسمة في البنك');
const sweep=await page.evaluate(()=>{
  let bad=null;
  factBank().filter(i=>i.op==='div').forEach(i=>{
    divArmArray(i.a,i.b);
    let guard=0;while(guard++<40){if(!divTryAdd())break}
    if(divRows!==i.ans)bad=bad||`${i.id}: المصفوفة أعطت ${divRows} والصحيح ${i.ans}`;
    if(divRows*i.b!==i.a)bad=bad||`${i.id}: ${divRows}×${i.b}≠${i.a}`;
  });
  return{bad,n:factBank().filter(i=>i.op==='div').length};
});
ok(!sweep.bad,sweep.bad||`ملء المصفوفة يعطي خارج القسمة الصحيح في ${sweep.n} حقيقة قسمة`);

console.log('\n٣) تظهر بعد خطأ القسمة في الطلاقة — لا في غيرها');
await page.evaluate(()=>{localStorage.removeItem('mawhiba_fact_srs');window.__LOGS=[];startFactPlan();
  factItems=[{id:'div_36_4',op:'div',a:36,b:4,ans:9},{id:'sub_15_8',op:'sub',a:15,b:8,ans:7}];
  factIdx=0;factInput="";factLocked=false;factArm();render()});
await page.evaluate(()=>{document.getElementById('factIn').value='5';factCheck()});
txt=await page.textContent('#app');
ok(txt.includes('كوّني صفوفاً من ٤'),'خطأ في القسمة ⇒ تظهر المصفوفة التفاعلية');
ok(await page.evaluate(()=>divA)===36&&await page.evaluate(()=>divB)===4,'ومسلَّحة بأرقام السؤال نفسه');
await page.click('button[onclick="divAddRow()"]');
ok(await page.evaluate(()=>document.getElementById('factIn').value)==='5','والتفاعل معها لا يمسح ما كتبته');
ok(await page.evaluate(()=>factLocked)===true&&await page.evaluate(()=>factIdx)===0,'ولا ينتقل السؤال');
// البوّابة الجديدة: لا انتقال قبل إكمال المصفوفة
await page.evaluate(()=>factNext());
ok(await page.evaluate(()=>factIdx)===0,'وصفٌّ واحد لا يفتح البوّابة');
while(await page.evaluate(()=>factGated()))await page.click('button[onclick="divAddRow()"]');
await page.evaluate(()=>factNext());
ok(await page.evaluate(()=>factIdx)===1,'وبعد إكمالها تنتقل');
await page.evaluate(()=>{document.getElementById('factIn').value='8';factCheck()});
txt=await page.textContent('#app');
ok(!txt.includes('كوّني صفوفاً'),'وخطأ الطرح لا تظهر معه (لكل عملية علاجها)');
ok(txt.includes('اصعدي عبر العشرة'),'بل يظهر الصعود عبر العشرة');
// السجلّ يصل عبر معترض غير متزامن: القراءة فوراً بعد الإجابة تلتقط أحياناً سطرين
// من ثلاثة، فيفشل الاختبار بلا عطل في التطبيق. ننتظر وصولها قبل الحكم.
await page.waitForFunction(()=>(window.__LOGS||[]).filter(l=>l.qtype!=='array').length>=2,null,{timeout:5000}).catch(()=>{});
const logs=await page.evaluate(()=>window.__LOGS);
ok(logs.filter(l=>l.qtype!=='array').length===2&&logs.filter(l=>l.qtype!=='array').every(l=>typeof l.elapsed_ms==='number'),'والتسجيل بالزمن لم ينكسر');

console.log('\n٤) المرحلة الخامسة تُكتَب لا تُختار');
for(const sub of ['multdiv','addcarry','subborrow','percent','pimul']){
  await page.evaluate(s=>{startBasics(s);basicsStage=5;basicsFinalSupport=false;basicsNew()},sub);
  // النسبة المئوية لها بوّابة تقدير قبل الحقل: نتحقّق من القفل ثم من ظهور الحقل بعد فتحه
  if(sub==='percent'){
    const g=await page.evaluate(()=>({gated:pctGated(),inp:!!document.getElementById('basicsIn'),ch:document.querySelectorAll('.choice').length}));
    ok(g.gated&&!g.inp&&g.ch===0,`${sub}: بوّابة التقدير تسبق الحقل (مقفلة، بلا حقل، بلا خيارات)`);
    await page.evaluate(()=>pctPickBand(pctBandOf(basicsCur.fam.a,basicsCur.fam.b)));
    const a=await page.evaluate(()=>({inp:!!document.getElementById('basicsIn'),ch:document.querySelectorAll('.choice').length}));
    ok(a.inp&&a.ch===0,`${sub}: وبعد النطاق حقل كتابة بلا خيارات (خيارات=${a.ch})`);
    continue;
  }
  // والضرب في ٣٫١٤ صارت له بوّابة رتبة مثلها: الفاصلة كانت كل أخطائها
  if(sub==='pimul'){
    const g=await page.evaluate(()=>({gated:piGated(),inp:!!document.getElementById('basicsIn'),ch:document.querySelectorAll('.choice').length}));
    ok(g.gated&&!g.inp&&g.ch===0,`${sub}: بوّابة الرتبة تسبق الحقل (مقفلة، بلا حقل، بلا خيارات)`);
    await page.evaluate(()=>piPickBand(piOrder.indexOf(1)));
    const a=await page.evaluate(()=>({inp:!!document.getElementById('basicsIn'),ch:document.querySelectorAll('.choice').length}));
    ok(a.inp&&a.ch===0,`${sub}: وبعد الرتبة حقل كتابة بلا خيارات (خيارات=${a.ch})`);
    continue;
  }
  const st=await page.evaluate(()=>({inp:!!document.getElementById('basicsIn'),ch:document.querySelectorAll('.choice').length}));
  ok(st.inp&&st.ch===0,`${sub}: حقل كتابة بلا خيارات (خيارات=${st.ch})`);
}
await page.evaluate(()=>{startBasics('addcarry');basicsStage=2;basicsNew()});
ok((await page.evaluate(()=>document.querySelectorAll('.choice').length))===4&&await page.evaluate(()=>!document.getElementById('basicsIn')),
   'والمراحل ٢-٤ ما زالت اختياراً من أربعة');
for(const s of [3,4]){
  await page.evaluate(x=>{basicsStage=x;basicsNew()},s);
  ok((await page.evaluate(()=>document.querySelectorAll('.choice').length))===4,`المرحلة ${s}: أربعة خيارات كما كانت`);
}

console.log('\n٥) قبول الجواب المكتوب: عربي/لاتيني/فاصلة');
const parse=await page.evaluate(()=>({
  ar:parseArNum('٩٤٫٢'),lat:parseArNum('94.2'),comma:parseArNum('94,2'),arComma:parseArNum('٩٤،٢'),
  mixed:parseArNum(' ٩٤.٢ '),plain:parseArNum('١٤١'),empty:parseArNum(''),junk:parseArNum('abc'),
  space:parseArNum('  '),neg:parseArNum('-5')}));
ok(parse.ar===94.2&&parse.lat===94.2&&parse.comma===94.2&&parse.arComma===94.2&&parse.mixed===94.2,
   'كل صيغ ٩٤٫٢ مقبولة (عربي · لاتيني · فاصلة عربية · فاصلة لاتينية · مختلط)');
ok(parse.plain===141,'والأعداد الصحيحة بالعربي');
ok(Number.isNaN(parse.empty)&&Number.isNaN(parse.junk)&&Number.isNaN(parse.space),'والفارغ والحروف ⇒ NaN');
ok(parse.neg===-5,'والسالب يُقرأ (وإن لم يكن جواباً هنا)');

console.log('\n٦) التصحيح والتسجيل في المرحلة المكتوبة');
await page.evaluate(()=>{window.__LOGS=[];startBasics('pimul');basicsStage=5;basicsFinalSupport=false;
  basicsMasteryStreak=0;basicsFinalCount=0;basicsCur={fam:{a:30,b:314,c:94.2}};basicsPrep();basicsLocked=false;basicsTyped="";
  piArm();piPick=1;render()}); // نفتح بوّابة الرتبة يدوياً: المقصود هنا فحص الجواب المكتوب
ok(await page.evaluate(()=>basicsCur.ansVal)===94.2,'الجواب المرجعي محفوظ رقماً');
await page.evaluate(()=>{document.getElementById('basicsIn').value='٩٫٤٢';basicsSubmit()});
ok(await page.evaluate(()=>basicsMasteryStreak)===0,'خطؤها الحقيقي (٩٫٤٢ بدل ٩٤٫٢) يُحتسب خطأً');
txt=await page.textContent('#app');
ok(txt.includes('الصحيح: ٩٤٫٢'),'ويظهر الصحيح بالفاصلة العربية');
ok(await page.evaluate(()=>document.getElementById('basicsIn').value)==='٩٫٤٢','وما كتبته يبقى ظاهراً');
let lg=(await page.evaluate(()=>window.__LOGS))[0];
ok(lg.response==='٩٫٤٢','والسجلّ يحفظ ما كتبته حرفياً — فأعرف نوع الخطأ لا وقوعه فقط');
ok(lg.is_correct===false&&lg.qtype==='stage5'&&typeof lg.elapsed_ms==='number','مع المرحلة والزمن');
await page.evaluate(()=>{basicsFinalNext();basicsCur={fam:{a:30,b:314,c:94.2}};basicsPrep();basicsLocked=false;basicsTyped="";
  piArm();piPick=1;render()});
await page.evaluate(()=>{document.getElementById('basicsIn').value='94.2';basicsSubmit()});
txt=await page.textContent('#app');
ok(txt.includes('حللتِها وحدك'),'والجواب الصحيح بالنقطة اللاتينية مقبول');

console.log('\n٧) الحقل الفارغ لا يحرق محاولة إتقان');
await page.evaluate(()=>{window.__LOGS=[];startBasics('multdiv');basicsStage=5;basicsFinalCount=0;basicsNew()});
const before=await page.evaluate(()=>basicsFinalCount);
await page.evaluate(()=>{document.getElementById('basicsIn').value='';basicsSubmit()});
ok(await page.evaluate(()=>basicsFinalCount)===before,'ضغطة على حقل فارغ ⇒ لا تُحتسب');
ok(await page.evaluate(()=>basicsLocked)===false,'والسؤال يبقى مفتوحاً');
ok((await page.evaluate(()=>window.__LOGS)).length===0,'ولا يُرسَل سجلّ');
await page.evaluate(()=>{document.getElementById('basicsIn').value='   ';basicsSubmit()});
ok(await page.evaluate(()=>basicsLocked)===false,'والمسافات وحدها كذلك');

console.log('\n٨) مسار الإتقان كاملاً بالكتابة');
await page.evaluate(()=>{startBasics('addcarry');basicsStage=5;basicsFinalSupport=false;
  basicsMasteryStreak=0;basicsFinalCount=0;basicsNotYet=false;basicsNew()});
let g=0;
while(await page.evaluate(()=>mode)==='basics'&&g++<20){
  await page.evaluate(()=>{document.getElementById('basicsIn').value=String(basicsCur.ansVal);basicsSubmit()});
  await page.evaluate(()=>{if(mode==='basics')basicsFinalNext()});
}
ok(await page.evaluate(()=>mode)==='basicsDone','خمس إجابات صحيحة متتالية ⇒ إتقان');
ok(await page.evaluate(()=>basicsNotYet)===false,'وليست شاشة «لم يكتمل»');
txt=await page.textContent('#app');
ok(txt.includes('أتقنتِ')||txt.includes('إتقان')||txt.includes('🎉'),'وشاشة الإتقان تظهر');
// والسقف يعمل مع الكتابة أيضاً
await page.evaluate(()=>{startBasics('addcarry');basicsStage=5;basicsFinalSupport=false;
  basicsMasteryStreak=0;basicsFinalCount=0;basicsNotYet=false;basicsNew()});
g=0;
while(await page.evaluate(()=>mode)==='basics'&&g++<30){
  await page.evaluate(()=>{document.getElementById('basicsIn').value='0';basicsSubmit()});
  await page.evaluate(()=>{if(mode==='basics')basicsFinalNext()});
}
ok(await page.evaluate(()=>basicsFinalCount)<=10,`سقف العشرة يعمل مع الكتابة (${await page.evaluate(()=>basicsFinalCount)})`);
ok(await page.evaluate(()=>basicsNotYet)===true,'وتظهر شاشة «لم يكتمل» لا حلقة لا تنتهي');

console.log('\n٩) لا حقن عبر الحقل المكتوب');
await page.evaluate(()=>{startBasics('multdiv');basicsStage=5;basicsNew();
  document.getElementById('basicsIn').value='"><img src=x onerror=alert(1)>';basicsSubmit()});
ok(await page.evaluate(()=>document.querySelectorAll('#app img').length)===0,'مدخل خبيث لا يُحقَن');
ok(await page.evaluate(()=>!!document.getElementById('basicsIn')),'والصفحة سليمة');

console.log('\n١٠) لا انحدار');
for(const [fn,md] of [["startFade('circle')",'fade'],["startDictation()",'dictation'],["startEngPlan()",'engplan'],["startFactPlan()",'factplan']]){
  const r=await page.evaluate(x=>{try{eval(x);return{m:mode,len:document.getElementById('app').textContent.length}}catch(e){return{err:e.message}}},fn);
  ok(!r.err&&r.m===md&&r.len>50,`${fn} → ${r.err||r.m}`);
}
for(const sub of ['multdiv','addcarry','subborrow','percent','pimul']){
  const r=await page.evaluate(s=>{try{startBasics(s);const t=document.getElementById('app').textContent;
    basicsStage1Next();return{ok:t.length>80&&document.getElementById('app').textContent.length>80}}catch(e){return{err:e.message}}},sub);
  ok(!r.err&&r.ok,`${sub}: المرحلة ١ والانتقال منها ${r.err||'سليمان'}`);
}

await b.close();
console.log(fails?`\n=== ${fails} فشل ===`:'\n=== كل الاختبارات نجحت ===');
process.exit(fails?1:0);
})();
