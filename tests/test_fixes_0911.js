// ثلاثة علاجاتٍ كشفها فحصُ جلسة هيا ٩-١١ سبتمبر — والحارس عليها.
//
// ١) الخيار المرسوم كان يُسجَّل شيفرةَ SVG خاماً في حقل `response`: ٥٣ صفّاً في أربعة
//    عشر يوماً، أطولها ٥٦٤ محرفاً — وكلُّها بلا موضعٍ وبلا فرقٍ وبلا اسم آلية، أي أن
//    انحياز الموضع وشكل الخطأ غيرُ قابلَين للقياس في كل سؤالٍ مرسوم.
// ٢) نداءا التوليد التالِيان لنداءٍ ناجح كانا يُرسَلان وهما محكومان بالفشل: ٥٠٥+٨٠٠
//    فوق حدّ الدقيقة (١٠٠٠)، والقاطع لا يُفتح إلّا **بعد** ٤٢٩.
// ٣) و«إن أخطأتها رابعةً فالتنبيه لا يكفي» — عدّادُ تكرار الاختيار نفسه (`e.same`)
//    كان محسوباً منذ بنائه ولا يقرؤه أحد.
//
// **وحدُّه يُقال**: يفحص التسجيل والمنع وشكلَ البطاقة، **ولا يفحص نداءً حقيقياً لـGroq**
// (محجوبٌ بسياسة الشبكة هنا) ولا انقلابَ الاتّجاه بصرياً — وذاك للقطة الشاشة.
const {chromium}=require('/opt/node22/lib/node_modules/playwright');
let fails=0;const ok=(c,m)=>{console.log((c?'  ✓ ':'  ✗ FAIL ')+m);if(!c)fails++};
const SVG='<svg viewBox="0 0 60 60"><circle cx="30" cy="30" r="20" fill="#3B82F6"/></svg>';
(async()=>{
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'});
const page=await b.newPage({viewport:{width:420,height:900}});
page.on('pageerror',e=>{console.log('  ✗ PAGEERROR '+e.message);fails++});
const rows=[];
await page.route('**/rest/v1/**',async r=>{
  try{const d=r.request().postData();if(d){const j=JSON.parse(d);(Array.isArray(j)?j:[j]).forEach(x=>rows.push(x))}}catch(e){}
  await r.fulfill({status:201,contentType:'application/json',body:'[]'});
});
await page.route('**/functions/v1/**',r=>r.fulfill({status:200,contentType:'application/json',body:'{"ok":false}'}));
await page.addInitScript(()=>{
  Object.defineProperty(window,'speechSynthesis',{configurable:true,value:{speak(){},cancel(){},resume(){},pause(){},
    getVoices:()=>[{lang:'en-US',name:'X'}],speaking:false,pending:false}});
  window.SpeechSynthesisUtterance=function(t){this.text=t};
});
await page.goto('http://127.0.0.1:8931/index.html');
await page.waitForFunction(()=>typeof choose==='function'&&typeof quizBudgetOk==='function');

// ============ ١) الخيار المرسوم: موضعٌ لا شيفرة ============
console.log('\n١) الخيار المرسوم يُسجَّل بموضعه — لا شيفرة SVG في حقل الإجابة');
{
  rows.length=0;
  await page.evaluate(svg=>{
    lsDel('mawhiba_quiz_err_v1');
    start('flex');
  },SVG);
  await page.waitForTimeout(350);
  await page.evaluate(svg=>{
    filtered=[{q:"أيُّ الأشكال يُكمل النمط؟",c:[svg,svg.replace('#3B82F6','#EF4444'),svg.replace('20','12'),svg.replace('circle','rect')],
      a:2,w:"شرح",d:"flex",qtype:"pattern"}];
    idx=0;picked=null;locked=false;done=false;score=0;answered=[];qzCard=null;qzCardCount=0;
    gateStop();gateSecs=0;render();
  },SVG);
  await page.evaluate(()=>choose(1));
  await page.waitForTimeout(250);
  const r=rows.filter(x=>x.domain==='flex');
  const resp=r.length?String(r[0].response||""):"";
  const qt=r.length?String(r[0].q_text||""):"";
  ok(r.length>0,'وصل صفٌّ للسجلّ');
  ok(!/<svg/i.test(resp),'حقل الإجابة بلا شيفرة SVG — '+resp.slice(0,60));
  ok(/موضع ٢/.test(resp),'وفيه موضعُ ما اختارته (٢)');
  ok(/الصواب موضع ٣/.test(resp),'وموضعُ الصواب (٣) — فينكشف انحياز الموضع');
  ok(!/فرق/.test(resp),'وبلا «فرق»: موضعٌ ناقصُ موضعٍ ليس آليةَ خطأ بل رقمُ مقعد');
  ok(!/<svg/i.test(qt),'وسطرُ الخيارات بلا شيفرة كذلك — '+(qt.match(/\[رسم\]/g)||[]).length+' رسوم');
}

console.log('\n١ب) ولا تُسمّى آليةٌ من رقم المقعد — الفخّ الذي صنعه الإصلاح نفسه');
{
  // نصُّ السؤال يحوي ٢ و٣، والخياران مرسومان. لولا الحارس لقرأت `stemNumberName`
  // «موضع ٢» عدداً فأطلقت اسماً كاذباً — بلاغٌ كاذب لا يحرس شيئاً بل يُدرِّب على تجاهله.
  rows.length=0;
  await page.evaluate(svg=>{
    filtered=[{q:"إذا كان مع سارة ٢ من الأشكال و٣ من غيرها، فأيُّ شكلٍ يُكمل النمط؟",
      c:[svg,svg.replace('20','12'),svg.replace('circle','rect')],a:0,w:"شرح",d:"quant",qtype:"pattern"}];
    idx=0;picked=null;locked=false;qzCard=null;qzCardCount=0;render();choose(1);
  },SVG);
  await page.waitForTimeout(250);
  const r=rows.filter(x=>x.domain==='quant');
  const resp=r.length?String(r[0].response||""):"";
  ok(r.length>0,'وصل الصفّ');
  ok(!/stem_number|mult_as_add|seq_end|cube_scale/.test(resp),'بلا اسم آليةٍ مختلَق — '+resp.slice(0,70));
  ok(/موضع ٢ · الصواب موضع ١/.test(resp),'والسطر موضعان كما يجب');
}

console.log('\n١ج) والسؤال النصّي لم يتغيّر — الفرق والاسم كما كانا');
{
  rows.length=0;
  await page.evaluate(()=>{
    filtered=[{q:"دالةٌ قاعدتها: اضربي المُدخَل في ٤ ثم أضيفي ٨. ما المُخرَج عندما يكون المُدخَل ٥؟",
      c:["٢٨","٥٢","٢٠","١٧"],a:0,w:"شرح",d:"quant",qtype:"quant"}];
    idx=0;picked=null;locked=false;qzCard=null;qzCardCount=0;render();choose(3);
  });
  await page.waitForTimeout(250);
  const resp=String((rows.filter(x=>x.domain==='quant')[0]||{}).response||"");
  ok(/فرق/.test(resp),'الفرق مسجَّل — '+resp.slice(0,80));
  ok(/mult_as_add/.test(resp),'والآلية مسمّاة كما كانت قبل تعديل اليوم');
}

// ============ ٢) ميزانية الدقيقة ============
console.log('\n٢) ميزانيةُ الدقيقة: النداء المحكوم بالفشل يُمنَع قبل إرساله');
{
  const r=await page.evaluate(()=>{
    quizWinAt=0;quizWinSpent=0;
    const fresh=quizBudgetOk();
    quizBudgetSpend(505);                 // النداء الناجح في ١٥:٢٤:٣٦ حرفياً
    const after=quizBudgetOk(), left=quizBudgetLeft();
    quizWinAt=Date.now()-61000;           // انقضت النافذة
    const rolled=quizBudgetOk();
    return{fresh,after,left,rolled,tpm:QUIZ_TPM,req:QUIZ_REQ_TOK};
  });
  ok(r.tpm===1000&&r.req===800,`الحدّ ${r.tpm} والحجز ${r.req} — كلاهما من ردّ المزوّد لا مختار`);
  ok(r.fresh===true,'نافذةٌ خالية ⇒ يُسمح');
  ok(r.left===495,`وبعد ٥٠٥ يبقى ${r.left} رمزاً`);
  ok(r.after===false,'و٤٩٥ لا تتّسع لحجز ٨٠٠ ⇒ يُمنَع');
  ok(r.rolled===true,'وبانقضاء الدقيقة تُفتح النافذة من جديد — لا إقفالَ للأبد');
}

console.log('\n٢ب) والمنعُ يُسجَّل باسمه المستقلّ — لا يُخلط بردّ المزوّد');
{
  rows.length=0;
  await page.evaluate(async()=>{
    quizWinAt=Date.now();quizWinSpent=990;
    genFailCount={};                       // سقفُ الضجيج لا يبتلع القياس
    await fetchGemini('verbal',3);
  }).catch(()=>{});
  await page.waitForTimeout(400);
  const g=rows.filter(x=>x.domain==='gen');
  const budget=g.filter(x=>/rate_budget/.test(String(x.response||"")));
  ok(budget.length>=1,'وصل سطرُ rate_budget — '+String((budget[0]||{}).response||"").slice(0,90));
  ok(!g.some(x=>/rate_window/.test(String(x.response||""))),'ولا يُسمّى rate_window: ذاك ردُّ المزوّد وهذا منعُنا استباقاً');
  const d=String((budget[0]||{}).q_text||"")+String((budget[0]||{}).response||"");
  ok(/تبقّى/.test(d),'ومعه كم يتبقّى من النافذة — فيُعرف أهو تأخيرٌ أم عطل');
}

console.log('\n٢ج) ولا يُمنَع نداءٌ تتّسع له النافذة');
{
  rows.length=0;
  const sent=await page.evaluate(async()=>{
    quizWinAt=0;quizWinSpent=0;genFailCount={};
    let hit=false;const f=window.fetch;
    window.fetch=function(u,o){if(/generate-question/.test(String(u)))hit=true;return f.apply(this,arguments)};
    try{await fetchGemini('verbal',3)}catch(e){}
    window.fetch=f;return hit;
  });
  await page.waitForTimeout(300);
  const blocked=rows.filter(x=>x.domain==='gen'&&/rate_budget/.test(String(x.response||"")));
  ok(blocked.length===0,'لا سطرَ منعٍ على نافذةٍ خالية');
  ok(sent===true,'والنداء غادر فعلاً');
}

// ============ ٣) البطاقة التعليمية ============
console.log('\n٣) نفس الاختيار أربع مرّات ⇒ بطاقةٌ تعليمية لا تنبيهٌ رابع');
{
  const Q="أيُّ كوكبٍ يُعرف بالكوكب الأحمر؟";
  const mk=()=>({q:Q,c:["المريخ","المشتري","زحل","عطارد"],a:0,w:"شرح",d:"science",qtype:"science"});
  const step=async n=>page.evaluate(([q,i])=>{
    filtered=[q];idx=0;picked=null;locked=false;qzCard=null;qzCardCount=0;render();choose(i);
    return qzCard?{teach:!!qzCard.teach,times:qzCard.times,prev:qzCard.prev,right:qzCard.right}:null;
  },[mk(),n]);
  await page.evaluate(()=>{lsDel('mawhiba_quiz_err_v1')});
  const c1=await step(1), c2=await step(1), c3=await step(1);
  rows.length=0;
  const c4=await step(1);
  await page.waitForTimeout(250);
  ok(c1===null,'الأولى: بلا بطاقة إطلاقاً (الخطأ الأوّل)');
  ok(c2&&c2.teach===false,'الثانية: التنبيه الأحمر كما كان');
  ok(c3&&c3.teach===false,'الثالثة: أحمر كذلك — لا تصعيد مبكّر');
  ok(c4&&c4.teach===true,'والرابعة: البطاقة التعليمية');
  ok(c4&&c4.times===4,`وتقول «${c4&&c4.times}» مرات — لا ٣ ولا ٥`);
  ok(c4&&c4.prev==='المشتري'&&c4.right==='المريخ','ومعها اختيارها المتكرّر بإزاء الصواب');
  const t=await page.textContent('#app');
  ok(/تختارين الإجابة نفسها/.test(t),'والعنوان يُسمّي الارتباط لا الخطأ');
  ok(/٤ مرات/.test(t),'والعدد بالعربية في الشاشة');
  ok(/المشتري/.test(t)&&/المريخ/.test(t),'والمقابلة معروضة');
  const lg=rows.filter(x=>x.domain==='gen'&&x.qtype==='repeat_card');
  ok(lg.length===1,'ويُسجَّل سطرٌ واحد — فيُقاس كم مرّةً بلغت الحالة هذا الحدّ');
  ok(/٤/.test(String(lg[0]&&lg[0].response||"")),'ومعه العدد — '+String((lg[0]||{}).response||"").slice(0,60));
  await page.click('button[onclick="qzCardDone()"]');
  await page.waitForTimeout(150);
  ok(await page.evaluate(()=>qzCard)===null,'وتُغلق بالإقرار');
}

console.log('\n٣ب) واختيارٌ مختلفٌ كل مرّة يبقى تنبيهاً — تذبذبٌ لا ارتباط');
{
  const Q="أيُّ كوكبٍ هو الأقرب إلى الشمس؟";
  const mk=()=>({q:Q,c:["عطارد","الزهرة","الأرض","المريخ"],a:0,w:"شرح",d:"science",qtype:"science"});
  const step=async n=>page.evaluate(([q,i])=>{
    filtered=[q];idx=0;picked=null;locked=false;qzCard=null;qzCardCount=0;render();choose(i);
    return qzCard?{teach:!!qzCard.teach,wrong:qzCard.wrong}:null;
  },[mk(),n]);
  await page.evaluate(()=>{lsDel('mawhiba_quiz_err_v1')});
  await step(1);await step(2);await step(3);
  const last=await step(1);
  ok(last&&last.teach===false,`أربعة أخطاء بأربعة اختيارات ⇒ تنبيهٌ لا تعليم (wrong=${last&&last.wrong})`);
}

console.log('\n٣ج) والسؤال المرسوم بلا بطاقةٍ تعليمية — «موضع ٢ ← موضع ٤» تُعلّم مقعداً');
{
  const step=async()=>page.evaluate(svg=>{
    filtered=[{q:"أيُّ شكلٍ يُكمل النمط الآن؟",c:[svg,svg.replace('20','12'),svg.replace('circle','rect')],
      a:0,w:"شرح",d:"flex",qtype:"pattern"}];
    idx=0;picked=null;locked=false;qzCard=null;qzCardCount=0;render();choose(1);
    return qzCard?{teach:!!qzCard.teach}:null;
  },SVG);
  await page.evaluate(()=>{lsDel('mawhiba_quiz_err_v1')});
  await step();await step();await step();
  const c4=await step();
  ok(c4!==null,'البطاقة الحمراء تبقى له كما كانت');
  ok(c4&&c4.teach===false,'ولا تعليمَ بالمقابلة: الصواب موضعٌ لا مفهوم');
  const t=await page.textContent('#app');
  ok(!/<svg/i.test(t)&&!/viewBox/.test(t),'ولا شيفرةَ معروضة في البطاقة');
}

console.log('\n٤) لا انحدار: البطاقة الحمراء القديمة على حالها');
{
  await page.evaluate(()=>{lsDel('mawhiba_quiz_err_v1');
    qzErrRecord({q:"سؤال تجريبي عن ٣ أشياء"},false,"أ");
    filtered=[{q:"سؤال تجريبي عن ٥ أشياء",c:["أ","ب","ج","د"],a:1,w:"التفسير هنا",d:"quant"}];
    idx=0;picked=null;locked=false;qzCard=null;qzCardCount=0;render();choose(0)});
  await page.waitForTimeout(200);
  const t=await page.textContent('#app');
  ok(/هذا النوع من الأسئلة أخطأتِه من قبل/.test(t),'العنوان الأحمر كما كان');
  ok(/التفسير هنا/.test(t),'والتفسير معروض فوقها');
}

console.log(fails?`\n=== ${fails} فشل ===`:'\n=== كل الاختبارات نجحت ===');
await b.close();process.exit(fails?1:0);
})();
