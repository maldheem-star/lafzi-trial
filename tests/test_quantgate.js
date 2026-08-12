const {chromium}=require('/opt/node22/lib/node_modules/playwright');
let fails=0;const ok=(c,m)=>{console.log((c?'  ✓ ':'  ✗ FAIL ')+m);if(!c)fails++};
(async()=>{
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'});
const logs=[];
const page=await b.newPage({viewport:{width:420,height:900}});
page.on('pageerror',e=>{console.log('  ✗ PAGEERROR '+e.message);fails++});
await page.route('**/rest/v1/**',async r=>{
  let x={};try{x=JSON.parse(r.request().postData()||'{}')}catch(e){}
  logs.push(x);r.fulfill({status:201,contentType:'application/json',body:'[]'});
});
await page.goto('http://127.0.0.1:8931/index.html');
await page.waitForFunction(()=>typeof quantMultiStep==='function');

console.log('\n١) أسئلتها الكمّية الحقيقية من جلسة ٩ أغسطس — التي مرّت بلا بوّابة');
const real=await page.evaluate(()=>{
  // نماذج من مولّدات البنك نفسها بأشكالها الحقيقية
  const S=[
    {q:"أكمل المتتالية: ٣ ، ٧ ، ١١ ، ١٥ ، ...",d:"quant"},
    {q:"ما مساحة مستطيل طوله ١٢ سم وعرضه ٥ سم؟",d:"quant"},
    {q:"إذا كان ثمن القلم ٣ ريالات، فكم ثمن ٨ أقلام؟",d:"quant"},
    {q:"ما قياس الزاوية المتممة لزاوية قياسها ٣٧°؟",d:"quant"},
    {q:"٧ × ٨ = ؟",d:"quant"},
    {q:"٢٤ ÷ ٦ = ؟",d:"quant"},
  ];
  return S.map(function(x){return{q:x.q,multi:quantMultiStep(x),secs:gateSecondsFor(x)}});
});
real.forEach(function(r){
  const want=!/^[٠-٩0-9]+\s*[×÷+\-]\s*[٠-٩0-9]+\s*=/.test(r.q);
  ok(r.multi===want&&(want?r.secs>=8:r.secs===0),
     `${want?'متعدّد الخطوات ⇒ '+r.secs+' ث':'استرجاع بسيط ⇒ بلا بوّابة'} · «${r.q.slice(0,42)}»`);
});

console.log('\n٢) الرسم يُعطى وقتاً أطول');
const svg=await page.evaluate(()=>({
  withSvg:gateSecondsFor({q:"ما مساحة الشكل؟",d:"quant",svg:"<svg/>"}),
  noSvg:gateSecondsFor({q:"ما مساحة الشكل؟",d:"quant"}),
}));
ok(svg.withSvg===12,`سؤال برسم ⇒ ١٢ ثانية (${svg.withSvg})`);
ok(svg.noSvg===0,`ونفس النصّ بلا رسم وبرقم واحد أو صفر ⇒ بلا بوّابة (${svg.noSvg})`);

console.log('\n٣) ما لا يُبوَّب يبقى بلا بوّابة');
const others=await page.evaluate(()=>({
  analogy:gateSecondsFor({q:"منزل : عمارة = شجرة : ؟",d:"verbal",qtype:"analogy"}),
  vocab:gateSecondsFor({q:"ما ضد كلمة 'ساكن' في الجملة الآتية: 'البيت ساكن جداً'؟",d:"verbal",qtype:"vocabulary"}),
  vocabShort:gateSecondsFor({q:"ما مرادف كلمة 'سريع'؟",d:"verbal",qtype:"vocabulary"}),
  sci:gateSecondsFor({q:"أي مما يلي من الثدييات وله ٤ أرجل و٢ عين؟",d:"science"}),
  reading:gateSecondsFor({q:"كانت المدرسة تنظم رحلات ميدانية. ما الهدف؟",d:"verbal",qtype:"reading"}),
}));
ok(others.analogy===0,'التناظر بلا بوّابة (٣/٣ في ثانيتين — استرجاع)');
ok(others.vocab===0&&others.vocabShort===0,'والمفردات بلا بوّابة — الدليل قال إن البطء عندها صعوبة لا تسرّع');
ok(others.sci===0,'والعلوم بلا بوّابة رغم أرقامها (١٠/١٢ أصلاً)');
ok(others.reading===12,'والفهم المقروء ما زال ١٢ ثانية');

console.log('\n٤) البوّابة تعمل فعلاً داخل الاختبار');
await page.evaluate(()=>{
  filtered=[{q:"ما مساحة مستطيل طوله ١٢ سم وعرضه ٥ سم؟",d:"quant",c:["٦٠ سم²","١٧ سم²","٣٤ سم²","٧٢ سم²"],a:0,w:"شرح"},
            {q:"٧ × ٨ = ؟",d:"quant",c:["٥٦","٤٨","٦٣","٥٤"],a:0,w:"شرح"}];
  idx=0;picked=null;locked=false;done=false;loading=false;score=0;answered=[];
  mode="quiz";currentMode="quant";gateStart(filtered[0]);render();
});
let secs=await page.evaluate(()=>gateSecs);
ok(secs===8,`سؤال المساحة: البوّابة ${secs} ثوانٍ`);
ok(await page.evaluate(()=>document.querySelectorAll('.choice').length)===0,'ولا خيار واحد في الصفحة');
let t=await page.textContent('#app');
ok(t.includes('اقرئي المسألة وحُلّيها على الورقة'),'ونصّها خاصّ بالكمّي');
ok(t.includes('احسبي أولاً ثم ابحثي عن جوابك بين الخيارات'),'ويشرح السبب: الحساب قبل النظر للخيارات');
ok(!t.includes('اقرئي النص كاملاً'),'ولا يُستعمل نصّ القراءة');
await page.evaluate(()=>{gateLeft=0;gateStop();render()});
ok(await page.evaluate(()=>document.querySelectorAll('.choice').length)===4,'وبعد الزمن تظهر الأربعة');
// الاسترجاع البسيط يفتح فوراً
await page.evaluate(()=>{idx=1;gateStart(filtered[1]);render()});
ok(await page.evaluate(()=>gateOpen())===true,'و«٧ × ٨» يفتح فوراً');
ok(await page.evaluate(()=>document.querySelectorAll('.choice').length)===4,'وخياراته ظاهرة بلا انتظار');

console.log('\n٥) نصّ السؤال يُسجَّل الآن لكل سؤال — لا لأسئلة الذكاء الاصطناعي وحدها');
logs.length=0;
await page.evaluate(()=>{
  filtered=[{q:"ما مساحة مستطيل طوله ١٢ سم وعرضه ٥ سم؟",d:"quant",c:["٦٠ سم²","١٧ سم²","٣٤ سم²","٧٢ سم²"],a:0,w:"شرح"}];
  idx=0;picked=null;locked=false;done=false;score=0;answered=[];questionShownAt=Date.now()-3000;
  mode="quiz";currentMode="quant";gateStart(filtered[0]);gateLeft=0;gateStop();render();
});
await page.evaluate(()=>choose(1));
await page.waitForTimeout(500);
const qlog=logs.find(l=>l.domain==='quant');
ok(!!qlog,'سطر الكمّي وصل');
ok(qlog&&qlog.q_text&&qlog.q_text.includes('مساحة مستطيل'),`وفيه نصّ السؤال («${(qlog&&qlog.q_text||'').slice(0,30)}…») — كان null قبل اليوم`);
ok(qlog&&qlog.response==='١٧ سم²','ومعه إجابتها المختارة');
ok(qlog&&qlog.is_correct===false,'والنتيجة صحيحة الحساب');
ok(qlog&&typeof qlog.elapsed_ms==='number','والزمن');

console.log('\n٦) فحص شامل على بنك الكمّي الحقيقي');
const sweep=await page.evaluate(()=>{
  const bad=[],seen={gated:0,open:0};
  for(let i=0;i<250;i++){
    let it=null;
    try{it=uniqueFromGens(QUANT_GENS)}catch(e){}
    if(!it||it.d!=='quant')continue;
    const s=gateSecondsFor(it);
    if(s>0){seen.gated++;if(s<8||s>45)bad.push(`زمن شاذّ ${s}: ${String(it.q).slice(0,40)}`)}
    else{seen.open++;
      const w=String(it.q||"").trim().split(/\s+/).filter(Boolean).length;
      if(it.svg||w>=7)bad.push(`متعدّد الخطوات بلا بوّابة: ${String(it.q).slice(0,40)}`);
    }
  }
  return{bad,seen};
});
ok(sweep.bad.length===0,sweep.bad.length?sweep.bad.slice(0,3).join(' | '):
   `${sweep.seen.gated} سؤالاً مُبوَّباً و${sweep.seen.open} مفتوحاً — بلا زمن شاذّ ولا متعدّد خطوات أفلت`);
ok(sweep.seen.gated>0&&sweep.seen.open>0,'والبنك فيه النوعان فعلاً — البوّابة انتقائية لا شاملة');

console.log('\n٧) لا انحدار');
for(const [fn,md] of [["startBasics('percent')",'basics'],["startFactPlan()",'factplan'],["startEngPlan()",'engplan'],
  ["startDictation()",'dictation'],["startPronunciation()",'pron'],["startAudioDiag()",'audiodiag'],["home()",'home']]){
  const r=await page.evaluate(x=>{try{eval(x);return{m:mode}}catch(e){return{err:e.message}}},fn);
  ok(!r.err&&r.m===md,`${fn} → ${r.err||r.m}`);
}
ok((await page.evaluate(()=>censusMissing())).length===0,'وكل الدوال معرَّفة');
ok((await page.evaluate(()=>window.__ERRS.length))===0,'ولا خطأ');

await b.close();
console.log(fails?`\n=== ${fails} فشل ===`:'\n=== كل الاختبارات نجحت ===');
process.exit(fails?1:0);
})();
