// ===== حارسُ الحارس: الجولةُ لا تصل Supabase الحقيقية — ٧ نوفمبر =====
// يُشغَّل من run.sh خلف `node -r _netguard.js`. يفتح صفحةً بلا أيّ محاكاة ويطلب
// السجلَّ والدوالّ من مضيف الإنتاج: يجب أن يردّ الحارسُ لا الخادم. ولو أُزيل `-r` من
// run.sh لسقط هذا الملفّ — فلا يعود التلوّث صامتاً كما بقي حتى ٧ نوفمبر.
const {chromium}=require(process.env.PW||'/opt/node22/lib/node_modules/playwright');
let fails=0;const ok=(c,m)=>{console.log((c?'  ✓ ':'  ✗ FAIL ')+m);if(!c)fails++};
(async()=>{
  if(!global.__NETGUARD){ok(false,'الحارس غير محمَّل — run.sh يجب أن يُشغّل node -r _netguard.js (ولا طلبَ يُرسَل بدونه)');process.exit(1)}
  const b=await chromium.launch();
  const p=await b.newPage();
  await p.goto('http://127.0.0.1:8931/index.html');
  const r=await p.evaluate(async()=>{
    const base='https://yzznkerweqkmhrtbidrl.supabase.co';
    const a=await fetch(base+'/rest/v1/mawhiba_answer_log',{method:'POST',body:'{}'}).then(x=>x.status).catch(e=>'err');
    const f=await fetch(base+'/functions/v1/tutor',{method:'POST',body:'{}'}).then(x=>x.text()).catch(e=>'err');
    return {a,f};
  });
  ok(r.a===201,'السجلّ يُقبل من الحارس لا من الإنتاج ('+r.a+')');
  ok(/netguard/.test(r.f),'الدوالّ يردّها الحارس');
  // ومحاكاةُ الاختبار نفسه تتقدّم عليه
  await p.route('**/functions/v1/**',x=>x.fulfill({status:200,body:'mine'}));
  const m=await p.evaluate(()=>fetch('https://yzznkerweqkmhrtbidrl.supabase.co/functions/v1/tutor').then(x=>x.text()));
  ok(m==='mine','محاكاةُ الاختبار تتقدّم على الحارس');
  await b.close();
  console.log(fails?'=== '+fails+' فشل':'=== نجح');process.exit(fails?1:0);
})();
