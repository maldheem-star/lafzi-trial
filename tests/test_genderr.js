// تفصيلُ الخادم يصل السجلّ — ١٢ سبتمبر.
//
// العطل الذي يحرسه: `quotaSummary` شُحن في tutor نسخة ٣٣ (٨ سبتمبر) ليحسم أهو
// `too_large` الدائم أم `rate_limited` العارض، وهو يعمل على الخادم فعلاً — **والعميل
// كان يرمي `detail`**. سطرُ إلياس الحيّ ١١ سبتمبر: «[توليد:no_reply] tutor_quota»
// بلا رقمٍ واحد، ثلاث مرّات. نفس صنف `coachSetFail` (١٧ أغسطس).
//
// **وأهمُّ ما يفحصه القصّ**: `genFailLog` تقصّ التفصيل عند ٢٠٠ محرف، فترتيبُ الحقول
// هو ما يُنجي الأرقام. اختبارٌ يفحص التمرير ولا يفحص القصّ يمرّ على عطلٍ باقٍ.
//
// **وحدُّه يُقال**: لا نداءَ حقيقياً لـtutor (محجوبٌ بسياسة الشبكة هنا) — تُحاكى
// الردود، فالمفحوص مسارُ العميل لا الخادم.
const {chromium}=require('/opt/node22/lib/node_modules/playwright');
let fails=0;const ok=(c,m)=>{console.log((c?'  ✓ ':'  ✗ FAIL ')+m);if(!c)fails++};

// ردُّ الخادم بنصّه كما يبنيه supabase-functions-tutor.ts عند ٤٢٩ من Groq
const QUOTA={ok:false,error:"tutor_quota",status:429,provider:"groq",model:"qwen3.6-27b",
  keyName:"GROQ_API_KEY",
  detail:"429 · rate_limited · per_minute · limit=1000, · requested=800 · retry_after=2 :: "
    +'{"error":{"message":"Rate limit reached for model `qwen3.6-27b` in organization `org_01abc'
    +'defghijklmnopqrstuv` service tier `on_demand` on tokens per minute (TPM): Limit 1000, Used '
    +'251, Requested 800. Please try again in 2s.","type":"tokens","code":"rate_limit_exceeded"}}'};
const TOOBIG=Object.assign({},QUOTA,{detail:"429 · too_large · per_minute · limit=1000, · requested=1340 :: raw"});

(async()=>{
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'});
const page=await b.newPage({viewport:{width:420,height:900}});
page.on('pageerror',e=>{console.log('  ✗ PAGEERROR '+e.message);fails++});
const rows=[];
await page.route('**/rest/v1/**',async r=>{
  try{const d=r.request().postData();if(d){const j=JSON.parse(d);(Array.isArray(j)?j:[j]).forEach(x=>rows.push(x))}}catch(e){}
  await r.fulfill({status:201,contentType:'application/json',body:'[]'});
});
await page.goto('http://127.0.0.1:8931/index.html');
await page.waitForFunction(()=>typeof genErrDetail==='function'&&typeof genFailLog==='function');

console.log('\n١) genErrDetail يجمع ما كان يُرمى');
{
  const r=await page.evaluate(q=>({
    full:genErrDetail(q),
    bare:genErrDetail({error:"tutor_quota"}),
    none:genErrDetail(null),
    empty:genErrDetail({}),
    noDetail:genErrDetail({error:"tutor_http",status:503}),
  }),QUOTA);
  ok((r.full.match(/429/g)||[]).length===1,'والحالة مرّةً واحدة — لا «429 · 429» يقتطع من المقصوص');
  ok(/tutor_http · 503/.test(r.noDetail),'وتظهر وحدها حين لا تفصيلَ يحملها — '+r.noDetail);
  ok(/^tutor_quota/.test(r.full),'نوعُ الخطأ أوّلاً — فلا ينكسر ما يبحث عنه في السطر');
  ok(/groq\/qwen3\.6-27b/.test(r.full),'ومعه المزوّد والنموذج');
  ok(/\b429\b/.test(r.full),'وحالةُ HTTP');
  ok(/rate_limited/.test(r.full)&&/limit=1000/.test(r.full)&&/requested=800/.test(r.full),
     'والأرقام التي بُني quotaSummary لأجلها');
  ok(!/keyName|GROQ_API_KEY/.test(r.full),'ولا اسمَ سرٍّ ولا مادّةَ مفتاح');
  ok(r.bare==='tutor_quota','وردٌّ بلا تفصيل يُعيد ما كان يُعيده بالضبط — لا انحدار');
  ok(r.none===null&&r.empty===null,'وردٌّ فارغ أو غائب ⇒ null كما كان');
}

console.log('\n٢) والأرقام تنجو من قصّ الـ٢٠٠ محرف — وهو موضع العطل الحقيقي');
{
  rows.length=0;
  await page.evaluate(q=>{genFailLogged=0;genFailLog("listen","B1","no_reply",genErrDetail(q))},QUOTA);
  await page.waitForTimeout(200);
  const g=rows.filter(x=>x.domain==='gen'&&x.qtype==='gen_fail');
  const qt=String((g[0]||{}).q_text||"");
  ok(g.length===1,'وصل الصفّ');
  ok(/tutor_quota/.test(qt),'ونوعُ الخطأ فيه — كما كان قبل اليوم');
  ok(/limit=1000/.test(qt)&&/requested=800/.test(qt),'**والأرقام داخل المقصوص** — '+qt.slice(0,120));
  ok(/rate_limited/.test(qt),'والسبب مسمّى: عارضٌ لا دائم');
  ok(String((g[0]||{}).response||"").indexOf('listen/B1 · no_reply')===0,
     'وحقلُ الإجابة على شكله القديم — لم يُعَد تشكيله');
}

console.log('\n٣) والفرق بين العطلين يُقرأ من السطر — وهو السؤال المفتوح منذ ٨ سبتمبر');
{
  rows.length=0;
  await page.evaluate(q=>{genFailLogged=0;genFailLog("gram","B1","no_reply",genErrDetail(q))},TOOBIG);
  await page.waitForTimeout(200);
  const qt=String((rows.filter(x=>x.domain==='gen')[0]||{}).q_text||"");
  ok(/too_large/.test(qt)&&!/rate_limited/.test(qt),'too_large يُميَّز عن rate_limited — '+qt.slice(0,90));
  ok(/requested=1340/.test(qt),'ومعه الطلب الذي تجاوز الحدّ');
}

console.log('\n٤) المواضع الستّة كلُّها تمرّر التفصيل — لا خمسة');
{
  const src=await (await fetch('http://127.0.0.1:8931/index.html')).text();
  const passed=(src.match(/"no_reply",genErrDetail\(data\)\)/g)||[]).length;
  const dropped=(src.match(/"no_reply",data&&data\.error\)/g)||[]).length;
  ok(passed===6,`ستّة مواضع تُمرّر genErrDetail (${passed})`);
  ok(dropped===0,'ولا موضعَ باقٍ يرمي التفصيل');
}

console.log('\n٥) ومولّد الأزواج لم يعد صامتاً — وكان وحده بلا سطرٍ إطلاقاً');
{
  rows.length=0;
  await page.route('**/functions/v1/tutor',r=>r.fulfill({status:200,
    contentType:'application/json',body:JSON.stringify(QUOTA)}));
  const out=await page.evaluate(async()=>{
    genFailLogged=0;
    return await fetchTutorGenMinpair("A1","ship");
  });
  await page.waitForTimeout(300);
  const g=rows.filter(x=>x.domain==='gen'&&x.qtype==='gen_fail');
  ok(out===null,'والتصرّف كما كان: null بهدوء — «فشل التوليد ليس عطلاً»');
  ok(g.length===1,'وسطرٌ واحد وصل السجلّ');
  ok(/^minpair\//.test(String((g[0]||{}).response||"")),'باسم القسم — '+String((g[0]||{}).response||""));
  ok(/limit=1000/.test(String((g[0]||{}).q_text||"")),'ومعه أرقام الحدّ');
}

console.log('\n٦) وسقفُ الضجيج لم يُكسَر');
{
  rows.length=0;
  const capped=await page.evaluate(q=>{
    genFailLogged=0;let n=0;
    for(let i=0;i<GEN_FAIL_LOG_CAP+5;i++)if(genFailLog("x","A1","no_reply",genErrDetail(q))===null)n++;
    return {cap:GEN_FAIL_LOG_CAP,tried:GEN_FAIL_LOG_CAP+5,nulls:n};
  },QUOTA);
  await page.waitForTimeout(250);
  const g=rows.filter(x=>x.domain==='gen'&&x.qtype==='gen_fail');
  ok(g.length===capped.cap,`سطورٌ بعدد السقف بالضبط (${g.length} من ${capped.tried} محاولة، السقف ${capped.cap})`);
  ok(capped.nulls===capped.tried,'وكلُّها تُعيد null — المُستدعي لا يتغيّر سلوكه');
}

console.log(fails?`\n=== ${fails} فشل ===`:'\n=== كل الاختبارات نجحت ===');
await b.close();process.exit(fails?1:0);
})();
