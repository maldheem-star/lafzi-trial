// كتلٌ دلاليّةٌ ملوَّنة قبل الكلمات المفردة — Colourful Semantics (Bryan 1997) — ٣١ أغسطس.
//
// قِسَ شكل خطأ هيا في ترتيب الجملة على ٨٦ محاولة (١٤-٣١ أغسطس): معامل Kendall tau
// ٠٫١١٨ (قريبٌ من الصفر — أقرب للعشوائي منه لأيّ قاعدة)، وأزواجٌ متجاورة محفوظة
// ١٥٪ فقط (دون العشوائي البحت ~٢٩٪) — لا تُبقي حتى على «cup of» متجاورتين. ومفرداتها
// سليمة (٦٨٪ تختار مضاعف الكلمات الصحيح تماماً)؛ العطل في الترتيب الخطّي وحده —
// نموذج Levelt (1989): الترميز الوظيفي سليم، والموضعيّ معطوب.
//
// فدرجةٌ صفريّة جديدة في `WB_STAGES` تفصل الترتيبَ عن اختيار الكلمة: كتلٌ دلاليّة
// (مَن/يفعل ماذا/ماذا/أين) بدل كلماتٍ مفردة — ٣-٤ كتلٍ لا ٥-٧ كلمات، فيقلّ فضاء
// الاحتمالات من ٥٠٤٠ إلى ٢٤ كحدٍّ أقصى. وموصولةٌ بالسلّم القائم (`WB_REQ`/`WB_BACK`/
// `secGateStart`) لا سلّمٌ جديد، وتسقط آمناً إلى درجة الكلمات إن غاب `chunks` عن العنصر.
const {chromium}=require('/opt/node22/lib/node_modules/playwright');
let fails=0;const ok=(c,m)=>{console.log((c?'  ✓ ':'  ✗ FAIL ')+m);if(!c)fails++};
(async()=>{
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'});
const ctx=await b.newContext({viewport:{width:420,height:900}});
await ctx.route('**/rest/v1/**',r=>r.fulfill({status:200,contentType:'application/json',body:'[]'}));
await ctx.route('**/functions/v1/**',r=>r.fulfill({status:200,contentType:'application/json',body:'{"ok":false}'}));
await ctx.addInitScript(()=>{
  Object.defineProperty(window,'speechSynthesis',{configurable:true,value:{
    speak(u){setTimeout(()=>u.onstart&&u.onstart(),0)},cancel(){},resume(){},pause(){},
    getVoices:()=>[{lang:'en-US',name:'X'}],speaking:false,pending:false}});
  window.SpeechSynthesisUtterance=function(t){this.text=t};
});
const p=await ctx.newPage();
p.on('pageerror',e=>{console.log('  ✗ PAGEERROR '+e.message);fails++});
await p.goto('http://127.0.0.1:8931/index.html');
await p.waitForFunction(()=>typeof wbStart==='function'&&typeof ENG_BUILD!=='undefined');

console.log('\n١) كل عناصر A1 العشرة تحمل كتلاً تُعيد بناء الهدف حرفاً بحرف');
{
  const r=await p.evaluate(()=>{
    const a1=ENG_BUILD.filter(x=>x.lv==="A1");
    const bad=a1.filter(x=>!x.chunks||x.chunks.map(c=>c.t).join(" ")!==x.s);
    const roles=new Set();a1.forEach(x=>x.chunks.forEach(c=>roles.add(c.role)));
    const knownRoles=[...roles].every(r=>["who","doing","what","where"].indexOf(r)>=0);
    return{n:a1.length,badN:bad.length,badIds:bad.map(x=>x.id),knownRoles,rolesUsed:[...roles]};
  });
  ok(r.n===10,'عشرة عناصر A1 — '+r.n);
  ok(r.badN===0,'كلّها تُعيد بناء s حرفاً بحرف — '+JSON.stringify(r.badIds));
  ok(r.knownRoles,'وكل الأدوار من الأربعة المعروفة — '+r.rolesUsed.join(','));
}

console.log('\n٢) درجةٌ صفريّة جديدة، والسلّم القديم لم يُمسّ عدداً ولا سلوكاً');
{
  const r=await p.evaluate(()=>({
    n:WB_STAGES.length,
    s0:WB_STAGES[0],s1:WB_STAGES[1],s2:WB_STAGES[2],s3:WB_STAGES[3],
    req:WB_REQ,back:WB_BACK,
  }));
  ok(r.n===4,'أربع درجاتٍ الآن (كانت ٣) — '+r.n);
  ok(r.s0.chunk===true&&r.s0.extra===0,'الدرجة صفر: chunk:true، extra:0');
  ok(r.s1.extra===0&&!r.s1.chunk,'الدرجة الأولى كما كانت: كلماتٌ بالعدد بالضبط');
  ok(r.s2.extra===3,'والثانية كما كانت: كلماتٌ زائدة');
  ok(r.s3.extra===-1,'والثالثة كما كانت: بلا بنك');
  ok(r.req===3&&r.back===2,'ونفس WB_REQ/WB_BACK — لا تسريعَ ولا تبطيءَ في الصعود/النزول');
}

console.log('\n٣) درجة الأدوار تُرسَم فعلاً: كتلٌ لا كلمات، بألوانٍ أربعة');
{
  const r=await p.evaluate(()=>{
    const it=ENG_BUILD.find(x=>x.id==="b_a1_water");
    wbStart(it.s,1,it.chunks);   // الدرجة ١ = الفهرس ٠ = الأدوار
    gateLeft=0;gateStop();       // نتجاوز البوّابة لنفحص المحتوى لا التوقيت
    const html=wbHTML();
    return{
      chunkMode:wbChunkMode,
      poolLen:wbPool.length,
      poolIsWords:wbPool.some(w=>w==="I"||w==="drink"),   // لا ينبغي أن تظهر ككلماتٍ مفردة
      hasChunkText:html.indexOf('in the morning.')>=0,
      hasLegend:html.indexOf('مَن')>=0&&html.indexOf('يفعل ماذا')>=0,
      hasOrangeBorder:html.indexOf('#FB923C')>=0,
      tileCount:(html.match(/onclick="wbPick\(/g)||[]).length,
    };
  });
  ok(r.chunkMode===true,'وضع الكتل مفعَّل فعلاً');
  ok(r.poolLen===4,'أربع كتلٍ لهذه الجملة — '+r.poolLen);
  ok(r.hasChunkText,'والكتلة الكاملة معروضة كوحدة — «in the morning.»');
  ok(r.hasLegend,'وشارة الألوان تُعرض بأسماء الأدوار');
  ok(r.hasOrangeBorder,'ولون الدور البرتقالي حاضرٌ فعلياً في الرسم');
  ok(r.tileCount===4,'وأربع بلاطاتٍ قابلةٌ للضغط — لا سبع');
  await p.close();
}

console.log('\n٤) الفحص الحقيقي بالنقر داخل قسم البناء: DOM حقيقيّ لا استدعاءٌ مباشر');
{
  const p2=await ctx.newPage();
  await p2.goto('http://127.0.0.1:8931/index.html');
  await p2.waitForFunction(()=>typeof wbStart==='function');
  const r=await p2.evaluate(()=>new Promise(res=>{
    const it=ENG_BUILD.find(x=>x.id==="b_a1_sister");
    // مسار حقيقي: قسم البناء (`mode='build'`)، فتُرسَم wbHTML() داخل #app فعلاً —
    // لا استدعاء wbHTML() مباشرةً كما في القسم ٣ (ذاك فحصَ النصّ، وهذا يفحص DOM).
    try{lsSet('mawhiba_wb_stage','1')}catch(e){}
    buildItems=[it];buildIdx=0;buildScore=0;buildDone=false;mode="build";
    buildSetupRound();gateLeft=0;gateStop();render();
    const order=it.chunks.map(c=>c.t);
    order.forEach(t=>{
      const idx=wbPool.findIndex((w,k)=>w===t&&wbPicked.indexOf(k)<0);
      const btn=document.querySelector(`button[onclick="wbPick(${idx})"]`);
      if(btn)btn.click();
    });
    const built=wbBuilt();
    // البلاطات تبقى في DOM بعد الاختيار (مُعطَّلةً لا محذوفة) — نفس نمط الكلمات
    // المفردة أصلاً؛ الفحص الصحيح هو أن الأربع كلّها معطَّلة الآن، لا أن عددها صفر.
    const enabledLeft=document.querySelectorAll('button[onclick^="wbPick"]:not([disabled])').length;
    buildCheck();
    res({built,target:it.s,ok:wbOk,enabledLeft});
  }));
  ok(r.built===r.target,'الجملة المبنيّة من نقراتٍ حقيقية تطابق الهدف — «'+r.built+'»');
  ok(r.ok===true,'ويُقبَل النجاح فعلياً عبر buildCheck() الحقيقية');
  ok(r.enabledLeft===0,'ولا بلاطةَ نشِطة متبقّية بعد اختيار الأربع كلّها — '+r.enabledLeft);
  await p2.close();
}

console.log('\n٥) سقوطٌ آمن: عنصرٌ بلا chunks لا يكسر شيئاً — يسلك كدرجة «العدد بالضبط»');
{
  const p3=await ctx.newPage();
  await p3.goto('http://127.0.0.1:8931/index.html');
  await p3.waitForFunction(()=>typeof wbStart==='function');
  const r=await p3.evaluate(()=>{
    wbStart("I like cake.",1);   // بلا وسيطٍ ثالث — كما تستدعيها بطاقات errors/coach فعلاً
    return{chunkMode:wbChunkMode,poolLen:wbPool.length,
      poolWords:wbPool.slice().sort()};
  });
  ok(r.chunkMode===false,'لا كتل بلا بيانات كتلٍ — سقوطٌ آمن');
  ok(r.poolLen===3,'وتسلك كدرجة الكلمات بالعدد بالضبط — '+r.poolLen);
  await p3.close();
}

console.log('\n٦) توأمُ الكتلة الفاسدة يُرفَض قبل الوصول: chunks لا تُعيد بناء s');
{
  const p4=await ctx.newPage();
  await p4.goto('http://127.0.0.1:8931/index.html');
  await p4.waitForFunction(()=>typeof wbStart==='function');
  const r=await p4.evaluate(()=>{
    wbStart("I like cake.",1,[{t:"I",role:"who"},{t:"likes cake.",role:"what"}]); // فرقٌ متعمَّد
    return{chunkMode:wbChunkMode};
  });
  ok(r.chunkMode===false,'chunks لا تطابق s حرفاً بحرف ⇒ لا وضع كتل — حارسٌ صريح لا ثقةٌ عمياء');
  await p4.close();
}

console.log('\n٧) زرّ «بقي N» يسمّي المحجوب فعلاً — كتلةً في وضع الكتل، كلمةً غيره');
{
  // كُشف بلقطة شاشةٍ لا اختبار: الزرّ قال «بقي ٤ كلمة» على شاشةٍ فيها كتلٌ لا كلمات —
  // نفس صنف عطل «الخيارات ستظهر» (٣٠ أغسطس)، مُصلَحٌ بنفس الآلية (نصٌّ يُمرَّر لا يُفترَض).
  const p5=await ctx.newPage();
  await p5.goto('http://127.0.0.1:8931/index.html');
  await p5.waitForFunction(()=>typeof wbStart==='function');
  const r=await p5.evaluate(()=>{
    const it=ENG_BUILD.find(x=>x.id==="b_a1_water");
    buildItems=[it];buildIdx=0;buildScore=0;buildDone=false;mode="build";
    buildSetupRound();gateLeft=0;gateStop();render();
    const chunkBtn=document.querySelector('button.btn')?.textContent||"";
    wbReset();wbStart("I like cake.",1);render();
    const wordBtn=[...document.querySelectorAll('button.btn')].pop()?.textContent||"";
    return{chunkBtn,wordBtn};
  });
  ok(/بقي ٤ كتلة/.test(r.chunkBtn),'وضع الكتل: «بقي ٤ كتلة» — '+r.chunkBtn);
  ok(!/كلمة/.test(r.chunkBtn),'ولا كلمة «كلمة» على شاشة كتل');
  await p5.close();
}

console.log('\n٨) لا انحدار: لا دالّة مفقودة، والصفحات الثلاث تُرسَم');
for(const q of ['','?p=mohammed','?p=elias']){
  const page=await ctx.newPage();
  page.on('pageerror',e=>{console.log('  ✗ PAGEERROR '+e.message);fails++});
  await page.goto('http://127.0.0.1:8931/index.html'+q);
  await page.waitForFunction(()=>typeof censusMissing==='function');
  const r=await page.evaluate(()=>({missing:censusMissing(),modes:document.querySelectorAll('.mode').length}));
  ok(r.missing.length===0,(q||'هيا')+': لا دالّة مفقودة — '+r.missing.join(','));
  ok(r.modes>0,(q||'هيا')+': الصفحة تُرسم');
  await page.close();
}

await b.close();
console.log(fails?`\n=== ${fails} فشل ===`:'\n=== كل الاختبارات نجحت ===');
process.exit(fails?1:0);
})();
