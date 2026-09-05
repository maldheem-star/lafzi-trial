// فشلُ مولّد اللفظي/العلمي صار مسموعاً — درس ٤ سبتمبر
//
// شكت هيا «الأسئلة متكرّرة» فصدّقها القياس: اللفظي ١٢ من ١٢ مما عُرض عليها رأته
// من قبل (أحدها ١٣ مرّة، أجابته في ٠٫٩ ثانية)، والعلمي ١٢ من ١٢. وعلى ١٤ يوماً:
// ١٨٩ عرضاً لفظياً على ٢٤ نصّاً متمايزاً — وهو **بالضبط** حجم البنك المؤلَّف،
// أي أنه مستنفَدٌ ١٠٠٪ ولم يصلها عنصرٌ مولَّدٌ واحد.
//
// والسبب: `generate-question` كانت تطلب `llama-3.3-70b-versatile` الذي أوقفته Groq
// في ١٦ أغسطس، فتعود 502 في كل نداء — أسبوعين ونصفاً. **ولم يكن في السجلّ سطرٌ
// واحد** لأن `fetchGemini` فيها `catch(e){}` عارية و`if(res.ok)` بلا فرع آخر.
//
// فهذا الاختبار يحرس الصمت لا النجاح: أن يُسمَّى كلُّ فشلٍ في السجلّ، وأن يبقى
// السلوك كما كان (البنك المؤلَّف يعمل وحده)، وألّا يصير التسجيل نفسه نقطة عطل.
const {chromium}=require('/opt/node22/lib/node_modules/playwright');
let fails=0;const ok=(c,m)=>{console.log((c?'  ✓ ':'  ✗ FAIL ')+m);if(!c)fails++};

(async()=>{
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'});
let logs=[];
// حالة الدالّة الحيّة تُحاكى: `mode` يحدّد ماذا يردّ وسيط التوليد
const mk=async(mode)=>{
  logs=[];
  const p=await b.newPage({viewport:{width:420,height:900}});
  p.on('pageerror',e=>{console.log('  ✗ PAGEERROR '+e.message);fails++});
  await p.route('**/rest/v1/**',async r=>{
    let x={};try{x=JSON.parse(r.request().postData()||'{}')}catch(e){}
    logs.push(x);r.fulfill({status:201,contentType:'application/json',body:'[]'});
  });
  // الترتيب مقصود: Playwright يُقدّم آخر مسارٍ سُجِّل، فالعامّ أوّلاً والخاصّ بعده
  // ليفوز. (سُجِّل العكسُ أوّلاً فابتلع العامُّ نداءَ التوليد كلَّه، فبدت كل الحالات
  // «ردّاً سليماً بلا أسئلة» — وهو عيبٌ في الاختبار كشفه الاختبار نفسه.)
  await p.route('**/functions/v1/**',r=>r.fulfill({status:200,contentType:'application/json',body:'{}'}));
  await p.route('**/functions/v1/generate-question',async r=>{
    if(mode==='dead_model')  // العطل الحقيقي بنصّه: 502 · all_engines_failed
      return r.fulfill({status:502,contentType:'application/json',body:JSON.stringify(
        {error:"all_engines_failed",errors:{groq:{status:404,detail:"model_decommissioned: llama-3.3-70b-versatile",model:"llama-3.3-70b-versatile"},gemini:"no_key"}})});
    if(mode==='empty')       // ردٌّ سليم بلا أسئلة (فلتر العربية أسقط كلَّ ما وُلِّد)
      return r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({type:"verbal",engine:"groq",model:"openai/gpt-oss-120b",questions:[]})});
    if(mode==='network')return r.abort();
    // نجاح: سؤالٌ عربيٌّ سليم
    return r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({type:"verbal",engine:"groq",model:"openai/gpt-oss-120b",
      questions:[{q:"ما ضدّ كلمة «الشجاعة»؟",choices:["الجبن","الإقدام","القوّة","العزم"],why:"ضدّ الشجاعة الجبن.",answer:0}]})});
  });
  await p.goto('http://127.0.0.1:8931/index.html');
  await p.waitForFunction(()=>typeof fetchGemini==='function'&&typeof genFailLog==='function');
  await p.evaluate(()=>{try{lsDel("gemini_cache");lsDel("gemini_day")}catch(e){}});
  return p;
};
const genRows=()=>logs.filter(x=>x&&x.domain==='gen'&&x.qtype==='gen_fail');

console.log('\n١) العطل الحقيقي (502 · نموذجٌ ميّت) يُسمّى في السجلّ بحالته وتفصيله');
{
  const p=await mk('dead_model');
  const got=await p.evaluate(()=>fetchGemini('verbal',3));
  await p.waitForTimeout(400);
  const row=genRows().pop();
  ok(Array.isArray(got)&&got.length===0,'لا أسئلة تعود — كما كان تماماً');
  ok(!!row,'وسطرٌ وصل الخادم (كان صفراً قبل اليوم)');
  ok(row&&/http_502/.test(String(row.response||'')),'وبالحالة صريحةً — '+(row&&row.response));
  ok(row&&/quiz:verbal/.test(String(row.response||'')),'ومعه القسم الذي سقط');
  ok(row&&/llama-3\.3-70b-versatile/.test(String(row.q_text||'')),'وتفصيلُ الردّ نفسه يذكر النموذج الميّت — وهو ما كان يُرمى');
  ok(row&&/gemini/.test(String(row.q_text||'')),'وحالُ المحرّك الاحتياطي كذلك، فيُعرف أيّهما سقط');
  await p.close();
}

console.log('\n٢) ردٌّ سليمٌ بلا أسئلة ليس نجاحاً — يُسمّى no_questions');
{
  const p=await mk('empty');
  await p.evaluate(()=>fetchGemini('verbal',3));
  await p.waitForTimeout(400);
  const row=genRows().pop();
  ok(row&&/no_questions/.test(String(row.response||'')),'يُسجَّل صراحةً — '+(row&&row.response));
  ok(row&&/gpt-oss/.test(String(row.q_text||'')),'ومعه اسم النموذج الذي أنتج فراغاً');
  await p.close();
}

console.log('\n٣) تعذّر الشبكة يُسمّى كذلك — ولا يبقى `catch(e){}` صامتة');
{
  const p=await mk('network');
  await p.evaluate(()=>fetchGemini('science',3));
  await p.waitForTimeout(400);
  const row=genRows().pop();
  ok(row&&/network/.test(String(row.response||'')),'سطرُ شبكة — '+(row&&row.response));
  ok(row&&/quiz:science/.test(String(row.response||'')),'ومعه القسم');
  await p.close();
}

console.log('\n٤) الحدّ اليومي سببٌ مشروع — ويُسمّى ليُفصَل عن العطل لا ليُخلط به');
{
  const p=await mk('ok');
  await p.evaluate(()=>{lsSet("gemini_day",JSON.stringify({date:new Date().toISOString().slice(0,10),count:DAILY_CAP+5}))});
  await p.evaluate(()=>fetchGemini('verbal',3));
  await p.waitForTimeout(400);
  const row=genRows().pop();
  ok(row&&/daily_cap/.test(String(row.response||'')),'يُسجَّل باسمه لا كعطل — '+(row&&row.response));
  await p.close();
}

console.log('\n٥) والنجاح لا يُسجَّل شيئاً — لا بلاغ كاذب');
{
  const p=await mk('ok');
  const got=await p.evaluate(()=>fetchGemini('verbal',1));
  await p.waitForTimeout(400);
  ok(got&&got.length===1,'السؤال المولَّد يعود فعلاً');
  ok(got&&/الشجاعة/.test(got[0].q||''),'بنصّه العربي');
  ok(genRows().length===0,'وبلا أيّ سطر فشل — '+genRows().length);
  await p.close();
}

console.log('\n٦) والتسجيل لا يصير نقطة عطل: غيابُ genFailLog لا يكسر تحميل الأسئلة');
{
  const p=await mk('dead_model');
  const r=await p.evaluate(async()=>{
    genFailLog=undefined;              // نحاكي تعذّر وصولها
    let threw=false,out=null;
    try{out=await fetchGemini('verbal',3)}catch(e){threw=true}
    return{threw,isArr:Array.isArray(out)};
  });
  ok(r.threw===false,'لا استثناء — الحارس يسقط بهدوء');
  ok(r.isArr,'والدالّة تُكمل وتعيد قائمة كما كانت');
  await p.close();
}

console.log('\n٧) لا انحدار: البنك المؤلَّف يعمل وحده حين يسقط التوليد');
{
  const p=await mk('dead_model');
  const r=await p.evaluate(async()=>{
    const qs=await buildDomain('verbal',12);
    return{n:qs.length,allHaveQ:qs.every(x=>x&&x.q),
      distinct:new Set(qs.map(x=>qIdent(x))).size};  // السؤال = صدرُه وخياراته
  });
  ok(r.n===12,'جلسةٌ كاملة رغم موت المولّد — '+r.n);
  ok(r.allHaveQ,'وكل عنصرٍ بنصّه');
  // التمايز يُقاس بـ`qIdent` لا بالصدر وحده: «أي كلمة لا تنتمي إلى المجموعة؟» ثلاثة
  // أسئلةٍ مختلفة محتواها في خياراتها. والدعوى القديمة (`x.q` وحده) كانت تنجح بحظّ
  // القرعة — إصلاحُ اليوم أطلق العنصرين المحجوبَين فصار وقوعُ اثنين منها في جلسةٍ
  // واحدة ممكناً، وهو **نجاحُ الإصلاح** لا انحداراً. (درس ٢٢ أغسطس: اختبارٌ يُثبّت
  // تصميماً كذّبته البيانات يُراجَع لا يُدهَس.)
  ok(r.distinct===12,'وبلا تكرارٍ داخل الجلسة — '+r.distinct);

  // وحارسُ ارتدادٍ حتميّ على الإصلاح نفسه: العناصر الثلاثة المتشاركة الصدر كانت
  // تنهار إلى واحد، فيُحجب اثنان **حجباً دائماً** بينما الشكوى أصلاً من ضيق البنك.
  const reach=await p.evaluate(()=>{
    const same=VERBAL.filter(x=>x.q==="أي كلمة لا تنتمي إلى المجموعة؟");
    return{n:same.length,ids:new Set(same.map(x=>qIdent(x))).size};
  });
  ok(reach.n===3,'ثلاثة عناصر تتشارك الصدر — '+reach.n);
  ok(reach.ids===3,'وكلٌّ منها هويّةٌ مستقلّة لا تُبتلَع — '+reach.ids);
  await p.close();
}

console.log('\n٨) ولا خطأ على الصفحات الثلاث');
for(const q of ['index.html','mohammed.html','elias.html']){
  const p=await b.newPage();
  p.on('pageerror',e=>{console.log('  ✗ PAGEERROR '+e.message);fails++});
  await p.route('**/rest/v1/**',r=>r.fulfill({status:201,body:'[]'}));
  await p.goto('http://127.0.0.1:8931/'+q);
  await p.waitForFunction(()=>typeof render==='function');
  const r=await p.evaluate(()=>({missing:censusMissing().length,errs:window.__ERRS.length,guard:typeof quizGenFail}));
  ok(r.missing===0,q+': لا دالّة مفقودة');
  ok(r.errs===0,q+': لا خطأ');
  ok(r.guard==='function',q+': الحارس معرَّف');
  await p.close();
}

await b.close();
console.log(fails?`\n=== ${fails} فشل ===`:'\n=== كل الاختبارات نجحت ===');
process.exit(fails?1:0);
})();
