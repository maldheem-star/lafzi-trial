// معيارُ الدمج يفحص ما يعرضه — درس ٢٩ أغسطس (ليلاً).
//
// كان المعيار سطراً واحداً: `lenOk && !writeFix.length` — عددُ كلماتٍ ونظافةٌ نحوية.
// بينما الشرطان المعروضان للمتعلّم («جملةٌ واحدة تجمع الجملتين — لا جملتان»، ثم
// الكلمة التي ينصّ عليها السؤال) **لا يُفحصان إطلاقاً**. والنتيجة في بياناتٍ حيّة:
//   • إلياس، «ادمج مستعملاً "who"» ⇐ «I have a friend **and** she lives in Riyadh.
//     She likes the beach…» — بلا "who"، ثلاث جمل، ٣٤ كلمة لهدفٍ من ٩. وسقط **لا
//     لهذا** بل لفاصلةٍ عارضة: أي أن الآلية سُجِّلت باسمٍ غير اسمها.
//   • وهيا، «اربطي بـ"and"» ⇐ «What kind of Jimmy today what hello okay comedy»
//     — **سُجِّل صواباً**: ثماني كلماتٍ فوق الحدّ (٧) وبلا تصحيحٍ عاد من المراجع.
// قياسُ السجلّ: عشر محاولاتٍ بكلمةٍ مطلوبة صريحة، خمسٌ أُغفلت فيها، وواحدةٌ مرّت.
//
// وهذا الاختبار يقيس الطرفين: ألّا يمرّ ما لم يؤدِّ المهمّة، **وألّا يسقط من أدّاها**
// — فالإجاباتُ الصحيحة هنا إجاباتُ محمد الحقيقية من السجلّ لا أمثلةً مؤلَّفة.
const {chromium}=require('/opt/node22/lib/node_modules/playwright');
let fails=0;const ok=(c,m)=>{console.log((c?'  ✓ ':'  ✗ FAIL ')+m);if(!c)fails++};
(async()=>{
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'});
let logs=[];
let review={ok:true,ltJudged:0,ltDropped:0,reply:"NONE"};
const mk=async(f)=>{
  const page=await b.newPage({viewport:{width:420,height:900}});
  page.on('pageerror',e=>{console.log('  ✗ PAGEERROR '+e.message);fails++});
  await page.route('**/rest/v1/**',async r=>{
    let x={};try{x=JSON.parse(r.request().postData()||'{}')}catch(e){}
    logs.push(x);r.fulfill({status:201,contentType:'application/json',body:'[]'});
  });
  await page.route('**/functions/v1/**',r=>r.fulfill({status:200,contentType:'application/json',body:JSON.stringify(review)}));
  await page.addInitScript(()=>{
    Object.defineProperty(window,'speechSynthesis',{configurable:true,value:{
      speak(u){setTimeout(function(){u.onstart&&u.onstart()},0)},cancel(){},resume(){},pause(){},
      getVoices:()=>[{lang:'en-US',name:'X'}],speaking:false,pending:false}});
    window.SpeechSynthesisUtterance=function(t){this.text=t};
  });
  await page.goto('http://127.0.0.1:8931/'+(f||'index.html'));
  await page.waitForFunction(()=>typeof writeCombineFaults==='function');
  return page;
};
const p=await mk();

console.log('\n١) كل عنصر دمجٍ يحمل شرطه، والشرط ليس صورياً');
{
  const r=await p.evaluate(()=>{
    const cs=WRITE_BANK.filter(function(x){return x.type==="combine"});
    const noReq=[],vacuous=[];
    cs.forEach(function(it){
      if(!it.req){noReq.push(it.id);return}
      if(it.req==="join")return;
      // الكلمة المطلوبة موجودةٌ أصلاً في الجملتين المصدر ⇒ الفحص لا يفحص شيئاً
      const src=String(it.prompt).split("\n").filter(function(l){return /^[12]\)/.test(l)}).join(" ");
      it.req.forEach(function(w){if(hasWordPhrase(src,w))vacuous.push(it.id+"←"+w)});
    });
    return{n:cs.length,noReq:noReq,vacuous:vacuous,join:cs.filter(function(x){return x.req==="join"}).length};
  });
  ok(r.n>=20,'عناصر الدمج — '+r.n);
  ok(r.noReq.length===0,'ولكلٍّ شرطُ ربطٍ مسجَّل — '+(r.noReq[0]||'الكلّ'));
  ok(r.vacuous.length===0,'ولا شرطَ موجودٌ أصلاً في الجملتين المصدر (فحصٌ صوريّ) — '+(r.vacuous[0]||'نظيف'));
  ok(r.join>=4,'والأسئلة المفتوحة («a joining word (…)») تقبل الطبقة المغلقة كلّها — '+r.join);
}

console.log('\n٢) الحالات الحيّة التي كذّبت المعيار القديم');
{
  const r=await p.evaluate(()=>{
    const by=function(id){return WRITE_BANK.find(function(x){return x.id===id})};
    const cases=[
      // إلياس، ٢٩ أغسطس — بلا "who"، وثلاث جمل
      ["wr_a2_sc6","I have a friend and she lives in Riyadh. She likes the beach but doesn’t like the water so I think it’s better for me just go out there for the beach"],
      // إلياس، ٢٩ أغسطس — بلا "after"، وجملتان
      ["wr_a2_sc4","We finished our dinner and then we went to watch film together, that’s ideas brother. After that we have the whole family together for dinner."],
      // هيا، ٢٤ أغسطس — كانت تمرّ ناجحةً: ثماني كلماتٍ فوق الحدّ وبلا تصحيح
      ["wr_a1_sc6","What kind of Jimmy today what hello okay comedy"]
    ];
    return cases.map(function(c){
      const it=by(c[0]),f=writeCombineFaults(it,c[1]);
      return{id:c[0],req:!!f.req,many:f.many,parts:writeSentenceCount(c[1])};
    });
  });
  ok(r[0].req===true&&r[0].many===true,'إلياس/"who": الكلمة غائبة **و**ثلاث جمل — '+JSON.stringify(r[0]));
  // وحدُّ الفحص يُقال بدل أن يُدَّعى: جوابه يحوي "After" فعلاً — لكن في **جملةٍ
  // ثانية** مستقلّة («After that we have the whole family…») لا رابطاً للجملتين.
  // فحصُ الوجود لا يعرف موضع الكلمة، وشرطُ الجملة الواحدة هو ما يُسقطه — والشرطان
  // معاً يكفيان: كلمةٌ داخل جملةٍ واحدة هي رابطها عملياً.
  ok(r[1].req===false&&r[1].many===true,'إلياس/"after": الكلمة حاضرةٌ في جملةٍ ثانية، فيُسقطه شرطُ الجملة الواحدة — '+JSON.stringify(r[1]));
  ok(r[2].req===true,'هيا/"and": غائبة — وكانت تمرّ ناجحةً قبل اليوم');
}

console.log('\n٣) ولا يسقط من أدّى المهمّة — إجابات محمد الحقيقية من السجلّ');
{
  const r=await p.evaluate(()=>{
    const by=function(id){return WRITE_BANK.find(function(x){return x.id===id})};
    const good=[
      ["wr_b1_sc3","Although the museum is very old, thousands of people visit it every year."],
      ["wr_b1_sc5","The bridge was built in 1990, which connects the two islands."],
      ["wr_b1_sc2","She works every weekend so that she can save money for university."],
      ["wr_b1_sc4","After he finished his homework, he watched a movie."],
      // وإجابةٌ صحيحة للسؤال الذي أخطأه إلياس — الشكل الذي كان يجب أن يُقبل
      ["wr_a2_sc6","I have a friend who lives in Riyadh with her family."],
      ["wr_a2_sc4","We watched a film together after we finished our dinner."]
    ];
    return good.map(function(c){
      const f=writeCombineFaults(by(c[0]),c[1]);
      return{id:c[0],bad:!!(f.req||f.many)};
    });
  });
  r.forEach(function(x){ok(x.bad===false,'«'+x.id+'» يمرّ بلا اعتراض')});
}

console.log('\n٤) عدّ الجمل لا ينخدع بالنقطة العشرية ولا بعلامة اقتباس');
{
  const r=await p.evaluate(()=>({
    dec:writeSentenceCount("The trip cost 3.5 riyals and we walked home"),
    end:writeSentenceCount("I have a friend who lives in Riyadh."),
    two:writeSentenceCount("I have a friend. She lives in Riyadh."),
    quote:writeSentenceCount('He said "stop." Then he left.'),
    excl:writeSentenceCount("It was cold! I wore my coat.")
  }));
  ok(r.dec===1,'«3.5» لا تُعدّ جملتين — '+r.dec);
  ok(r.end===1,'ونقطةُ النهاية وحدها جملةٌ واحدة — '+r.end);
  ok(r.two===2,'وجملتان تُعدّان اثنتين — '+r.two);
  ok(r.quote===2,'والاقتباس ثم جملة — '+r.quote);
  ok(r.excl===2,'وعلامةُ التعجّب تفصل كذلك — '+r.excl);
}

console.log('\n٤ب) وعلامة ✓ المعروضة تُشغَّل بنفس دالّة الحكم — لا ○ فوق جملةٍ صحيحة');
{
  const r=await p.evaluate(()=>{
    const it=WRITE_BANK.find(function(x){return x.id==="wr_a2_sc6"});
    return{
      met:writeCritState(it,"I have a friend who lives in Riyadh with her family.").req,
      unmet:writeCritState(it,"I have a friend and she lives in Riyadh today ok.").req,
      empty:writeCritState(it,"").req,
      // ونصٌّ حرّ بلا شرطٍ يبقى صحيحاً دائماً فلا يُعرض له سطر
      free:writeCritState(WRITE_BANK.find(function(x){return x.type!=="combine"}),"anything").req
    };
  });
  ok(r.met===true,'الجملة الحاوية للكلمة ⇐ ✓ (كانت ○ رغم وجودها — كشفته لقطة شاشة لا اختبار)');
  ok(r.unmet===false,'والخالية منها ⇐ ○');
  ok(r.empty===false,'وقبل الكتابة ⇐ ○');
  ok(r.free===true,'ولا يُعترض على نصٍّ حرّ');
}

console.log('\n٥) المعيار معروضٌ على الشاشة قبل الكتابة — لا شرطٌ خفيّ');
{
  const r=await p.evaluate(()=>{
    const it=WRITE_BANK.find(function(x){return x.id==="wr_a2_sc6"});
    const c=writeCriteria(it);
    return{keys:c.map(function(x){return x.k}),txt:c.map(function(x){return x.t}).join(" | ")};
  });
  ok(r.keys.indexOf("req")>=0,'سطرُ الكلمة المطلوبة حاضر');
  ok(/who/.test(r.txt),'وفيه الكلمة نفسها — '+r.txt);
  ok(r.keys.indexOf("one")>=0,'وشرطُ الجملة الواحدة باقٍ');
}

console.log('\n٦) جلسةٌ حقيقية: يسقط بالسبب المسمّى، ويُقال لها لماذا');
{
  const q=await mk();
  logs=[];
  await q.evaluate(()=>{
    startWrite();
    writeItems=[WRITE_BANK.find(function(x){return x.id==="wr_a2_sc6"})];
    writeIdx=0;writeDone=false;writeSubmitted=false;writeShownAt=Date.now();render();
  });
  await q.evaluate(()=>{
    const el=document.querySelector('textarea');
    el.value="I have a friend and she lives in Riyadh with her family today.";
    el.dispatchEvent(new Event('input',{bubbles:true}));
  });
  await q.evaluate(()=>writeSubmit());
  await q.waitForFunction(()=>writeSubmitted===true,null,{timeout:9000});
  const t=await q.textContent('#app');
  ok(/المهمّة تطلب/.test(t),'العنوان يسمّي المهمّة لا «تحتاج تصحيحاً»');
  ok(/who/.test(t),'ومعه الكلمة المطلوبة نفسها');
  await q.waitForTimeout(400);
  const row=logs.filter(x=>x&&x.domain==='write'&&x.qtype==='A2').pop();
  ok(!!row,'وسطرٌ وصل الخادم');
  ok(row&&row.is_correct===false,'مسجَّلاً سقوطاً');
  ok(row&&/missing_connector/.test(String(row.q_text||'')),'وبالسبب المسمّى — '+String(row&&row.q_text||'').slice(-120));

  // والصحيحة تمرّ في نفس الجلسة
  await q.evaluate(()=>{
    writeSubmitted=false;writeFix=[];writeFixFail="";writeTyped="";writeCount=0;writeCopy=false;
    writePasted=false;writeDictated=false;writeShownAt=Date.now();render();
  });
  await q.evaluate(()=>{
    const el=document.querySelector('textarea');
    el.value="I have a friend who lives in Riyadh with her family.";
    el.dispatchEvent(new Event('input',{bubbles:true}));
  });
  await q.evaluate(()=>writeSubmit());
  await q.waitForFunction(()=>writeSubmitted===true,null,{timeout:9000});
  const t2=await q.textContent('#app');
  ok(/جملة مدمَجة سليمة/.test(t2),'والصحيحة تُقبل في نفس الجلسة');
  await q.waitForTimeout(400);
  const row2=logs.filter(x=>x&&x.domain==='write'&&x.qtype==='A2').pop();
  ok(row2&&row2.is_correct===true,'وتُسجَّل نجاحاً');
  ok(row2&&/دمج:ok/.test(String(row2.q_text||'')),'وسطرُها يقول ok صراحةً — فيُقاس الطرفان');
  await q.close();
}

console.log('\n٧) لا انحدار في الكتابة الحرّة — الشرط يخصّ الدمج وحده');
{
  const r=await p.evaluate(()=>{
    const free=WRITE_BANK.find(function(x){return x.type!=="combine"});
    const f=writeCombineFaults(free,"one. two. three. four.");
    return{req:f.req,many:f.many,id:free.id};
  });
  ok(r.req===null&&r.many===false,'نصٌّ حرّ من أربع جملٍ لا يُعترض عليه ('+r.id+')');
}

await p.close();
await b.close();
console.log(fails?`\n=== ${fails} فشل ===`:'\n=== كل الاختبارات نجحت ===');
process.exit(fails?1:0);
})();
