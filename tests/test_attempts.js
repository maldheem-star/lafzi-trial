// «مَن جُرِّب قبله» يصل السطر — ١٦ سبتمبر
//
// جلسة هيا (١٥ سبتمبر ١٢:١٠): محادثتها ماتت بعد جملةٍ واحدة، وثلاثةُ نداءات توليدٍ
// سقطت، وكلُّها تقول `gemini/gemini-flash-latest` — **وgroq لم يُذكَر في خمسة أيّام**
// بينما `generate-question` استعمله بنجاح ١٢ و١٣ و١٤ سبتمبر بنفس اسمَي السرّ.
// فالسؤال الحاسم — أفشل Groq أم لم يُجرَّب أصلاً — جوابُه في `attempts` الذي يُعيده
// الخادم في كل ردٍّ فاشل **وكان العميل يرميه**.
//
// وما يحرسه هذا الملفّ **سلوكٌ لا نصّ**: أن يصل الحقل، وأن ينجوَ من القصّ (وهو
// موضعُ العطل الحقيقي: سطرٌ يحمل الجواب ويُقصّ قبله لا يختلف عن سطرٍ لا يحمله)،
// وألّا يُنطَق حين لا يكون هناك ما يُقال.
const {chromium}=require('/opt/node22/lib/node_modules/playwright');
let fails=0;const ok=(c,m)=>{console.log((c?'  ✓ ':'  ✗ FAIL ')+m);if(!c)fails++};

// ردُّ الخادم بنصّه الحقيقي من سجلّ ١٥ سبتمبر — لا مثالاً مؤلَّفاً
const LIVE_BODY='{\n  "error": {\n    "code": 429,\n    "message": "Your prepayment credits are depleted. Please purchase more to continue using the API.",\n    "status": "RESOURCE_EXHAUSTED"\n  }\n}';
const LIVE={ error:"tutor_quota", status:429, provider:"gemini", model:"gemini-flash-latest",
             detail:"429 :: "+LIVE_BODY, attempts:["groq:tutor_quota","gemini:tutor_quota"] };

(async()=>{
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'});
const page=await b.newPage({viewport:{width:420,height:900}});
page.on('pageerror',e=>{console.log('  ✗ PAGEERROR '+e.message);fails++});
await page.goto('http://127.0.0.1:8931/index.html');
await page.waitForFunction(()=>typeof genErrDetail==='function');

console.log('\n١) الحالة الحيّة: «مَن جُرِّب» يدخل السطر، وترتيبُه يحفظ ما قبله');
{
  const r=await page.evaluate(L=>({s:genErrDetail(L)}),LIVE);
  ok(/groq:tutor_quota/.test(r.s),'اسمُ groq وحالتُه حاضران — وهو الفرق بين «فشل» و«لم يُجرَّب»');
  ok(/جُرِّب:/.test(r.s),'موسومٌ بالعربية كبقية السطر: '+r.s.slice(0,90));
  ok(r.s.indexOf('tutor_quota')===0,'ونوعُ الخطأ يبقى أوّلاً — فلا ينكسر بحثٌ قائم عن «tutor_quota»');
  ok(r.s.indexOf('gemini/gemini-flash-latest')<r.s.indexOf('جُرِّب:'),'والمزوّد/النموذج قبله كما كانا');
}

console.log('\n٢) وينجو من القصّ — وهذا موضعُ العطل لا شكلُه');
{
  // ٢٠٠ في `genFailLog` و١٤٠ في `coachSetFail`: الحقل بلا نفعٍ إن وقع خلفهما
  const r=await page.evaluate(L=>{const s=genErrDetail(L);
    return {at200:s.slice(0,200),at140:s.slice(0,140),len:s.length}},LIVE);
  ok(/groq:tutor_quota/.test(r.at200),'داخل ٢٠٠ محرفاً (قصُّ التوليد)');
  ok(/groq:tutor_quota/.test(r.at140),'وداخل ١٤٠ (قصُّ المحادثة) — وهو الأضيق');
  ok(/429|RESOURCE_EXHAUSTED|prepayment/.test(r.at200),'والردُّ الخام ما زال يظهر بعده، لم يُزحزَح كلُّه');
}

console.log('\n٣) ولا يُنطَق بما ليس فيه');
{
  const r=await page.evaluate(()=>({
    none:genErrDetail({error:"tutor_quota",provider:"groq",model:"m"}),
    empty:genErrDetail({error:"x",attempts:[]}),
    nul:genErrDetail(null),
    fin:genErrDetail({error:"tutor_no_text",finishReason:"length",provider:"groq",model:"gpt-oss"})
  }));
  ok(!/جُرِّب/.test(r.none),'ردٌّ بلا `attempts` لا يُضيف الوسم');
  ok(!/جُرِّب/.test(r.empty),'وقائمةٌ فارغة كذلك — لا وسمَ بلا محتوى');
  ok(r.nul===null,'وردٌّ غائبٌ يبقى null كما كان');
  ok(/finish:length/.test(r.fin),'و`finishReason` صار يصل التوليد كما يصل المحادثة (درس ١٧ أغسطس)');
}

console.log('\n٤) والمحادثة تمرّ على نفس الدالّة — لا نسخةَ موازية');
{
  // كان السطرُ مكتوباً مرّتين، فكلُّ حقلٍ يُضاف في إحداهما يغيب عن الأخرى.
  const r=await page.evaluate(()=>{
    const src=String(coachFinish);
    return {parallel:/d\.provider\?" · "\+d\.provider/.test(src), uses:/genErrDetail\(d\)/.test(src)};
  });
  ok(r.uses===true,'`coachFinish` تستدعي genErrDetail');
  ok(!r.parallel,'ولم تبقَ النسخة الموازية (درس writeSentenceParts، ٢٩ أغسطس)');
}

console.log('\n٥) ومساراتُ المراجعة الثلاثة تُسجّل التفصيل — وكانت تكتفي بشيفرة الخطأ');
{
  const r=await page.evaluate(()=>({
    review:/genErrDetail\(d\)/.test(String(coachReview)),
    auto:/genErrDetail\(d\)/.test(String(coachAutoReview)),
    write:/genErrDetail\(d\)/.test(String(writeSubmit))
  }));
  ok(r.review,'مراجعة المحادثة اليدوية');
  ok(r.auto,'والمراجعة الصامتة عند الجملة الرابعة');
  ok(r.write,'ومراجعة الكتابة');
}

console.log('\n٦) وجولةٌ حقيقية: ردُّ ١٥ سبتمبر يصل `mawhiba_answer_log` بنصّه');
{
  const sent=[];
  await page.route('**/rest/v1/mawhiba_answer_log*',route=>{
    try{sent.push(JSON.parse(route.request().postData()||'{}'))}catch(e){}
    route.fulfill({status:201,body:'[]'});
  });
  await page.route('**/functions/v1/tutor*',route=>route.fulfill({
    status:200,contentType:'application/json',body:JSON.stringify(LIVE)}));
  const r=await page.evaluate(async L=>{
    genFailLogged=0;
    await fetchTutorGen('listen','A1',0);
    return true;
  },LIVE);
  await page.waitForTimeout(400);
  const rows=sent.flat().filter(x=>x&&x.qtype==='gen_fail');
  ok(rows.length>=1,`سطرُ gen_fail وصل (${rows.length})`);
  const q=rows.length?String(rows[0].q_text||''):'';
  ok(/groq:tutor_quota/.test(q),'وفيه «جُرِّب:groq» فعلاً بعد القصّ الحقيقي: '+q.slice(0,120));
  ok(q.length<=220,`والسطر لم يطُل بلا حدّ (${q.length} محرفاً)`);
  ok(/listen\/A1/.test(String(rows.length?rows[0].response:'')),'وحقلُ response لم يُعَد تشكيله');
}

console.log(`\nسقط ${fails}`);
await b.close();
process.exit(fails?1:0);
})();
