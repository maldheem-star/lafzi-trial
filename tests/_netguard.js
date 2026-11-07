// ===== حارسُ الشبكة: لا اختبارَ يكتب في قاعدة الإنتاج ولا يستهلك حصّة Groq — ٧ نوفمبر =====
// يُحمَّل قبل كل ملفّ اختبار (`node -r` في run.sh). كانت ٤١ ملفّاً تفتح التطبيق بلا محاكاةٍ
// لـ`/functions/v1` وأربعةٌ بلا محاكاةٍ لـ`/rest/v1` — فكتبت جولةٌ واحدة ٢٦ صفّاً في
// `mawhiba_answer_log` الحقيقي (٧ نوفمبر) وأنفقت من حصّة التوليد المجانية.
// والعلاج هنا لا في الملفّات الواحد والأربعين: كل صفحةٍ يُنشئها الاختبار تُحجَب عنها
// Supabase **في سياقها**، ومحاكاةُ الاختبار نفسه (`page.route`) تتقدّم عليه بقاعدة
// Playwright (مسارُ الصفحة قبل مسار السياق) — فلا يتغيّر ما يقيسه أيُّ اختبار.
const PW=process.env.PW||'/opt/node22/lib/node_modules/playwright';
let pw;try{pw=require(PW)}catch(e){return}
const HOST=/^https:\/\/[a-z0-9-]+\.supabase\.co\//;
let blocked=0;global.__NETGUARD=true;
const guard=ctx=>ctx.route(HOST,r=>{blocked++;
  const u=r.request().url();
  // السجلّ يُقبل صامتاً (كأنه وصل) فلا يدخل طابورَ إعادة الإرسال؛ والدوالّ تفشل بهدوء كما تفشل بلا شبكة.
  if(/\/rest\/v1\//.test(u))return r.fulfill({status:201,contentType:'application/json',body:'[]'});
  return r.fulfill({status:503,contentType:'application/json',body:'{"ok":false,"error":"netguard"}'});
});
const origLaunch=pw.chromium.launch.bind(pw.chromium);
pw.chromium.launch=async(...a)=>{
  const b=await origLaunch(...a);
  const nc=b.newContext.bind(b);
  b.newContext=async(...x)=>{const c=await nc(...x);await guard(c);return c};
  b.newPage=async(...x)=>{const c=await b.newContext(...x);const p=await c.newPage();
    const close=p.close.bind(p);p.close=async(...y)=>{await close(...y);await c.close().catch(()=>{})};return p};
  return b;
};
process.on('exit',()=>{if(process.env.NETGUARD_VERBOSE)console.error('# netguard: حُجب '+blocked)});
