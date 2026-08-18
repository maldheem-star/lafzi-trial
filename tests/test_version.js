// فحص النسخة: عيبان حقيقيان كشفهما تشخيص محمد (١٨ أغسطس).
// (١) BUILD لم يُحدَّث ثماني شحنات، فبقي على نسخةٍ لا تصلها تدريباته — نسخته تحمل الوسم
//     والصفحة الحيّة تحمله أيضاً فيُطابق نفسه. والعيب سبق أن أُصلح ثم عاد، لأنه معلّقٌ
//     على تذكّر إنسان. فأُضيف فحصٌ ثانٍ تلقائي: طول المخزّنة مقابل الحيّة.
// (٢) وإعادة التحميل كانت تُسقط ?p=mohammed فتُعيد الأخوين إلى صفحة هيا بلا أن يشعرا —
//     والهويّة من الرابط وحده، فهذا تبديلُ متعلّمٍ بمتعلّم لا مجرّد إزعاج.
const {chromium}=require('/opt/node22/lib/node_modules/playwright');
let fails=0;const ok=(c,m)=>{console.log((c?'  ✓ ':'  ✗ FAIL ')+m);if(!c)fails++};
(async()=>{
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'});

// يُقرأ الملفّ الحقيقي فتُختبر الدوال كما تعمل في المتصفّح لا كنسخةٍ مكتوبة في الاختبار
const mk=async(search)=>{
  const page=await b.newPage();
  page.on('pageerror',e=>{console.log('  ✗ PAGEERROR '+e.message);fails++});
  await page.route('**/rest/v1/**',r=>r.fulfill({status:201,contentType:'application/json',body:'[]'}));
  await page.goto('http://127.0.0.1:8931/index.html'+(search||''));
  await page.waitForFunction(()=>typeof render==='function');
  return page;
};

console.log('\n١) وسم البناء حُدِّث فعلاً — وإلا فالفحص الأوّل يُطابق نفسه');
let page=await mk();
const build=await page.evaluate(()=>window.__BUILD||'');
ok(/^build-\d{8}-\d{4}$/.test(build),`الوسم بشكلٍ سليم (${build})`);
const src=require('fs').readFileSync('index.html','utf8');
const live=(src.match(/var BUILD="([^"]+)"/)||[])[1];
ok(build===live,'ووسم الصفحة العاملة هو وسم الملفّ نفسه');
ok(build>'build-20260817-1500',`وأحدث من الوسم العالق الذي أبقى محمداً على نسخته (${build})`);

console.log('\n٢) إعادة التحميل تصون الهويّة — وكانت تُسقطها فتُعيد الأخوين لصفحة هيا');
for(const [q,who] of [['?p=mohammed','mohammed'],['?p=elias','elias'],['','هيا']]){
  const pg=await mk(q);
  const u=await pg.evaluate(()=>window.__reloadUrl());
  const kept=q? u.includes('p='+who) : !/p=/.test(u);
  ok(kept,`${q||'(بلا استعلام)'} ⇒ ${u.split('/').pop()}`);
  ok(/[?&]_r=\d+/.test(u),'  ومعه وسم كسر التخزين _r');
  await pg.close();
}

console.log('\n٣) ولا يتراكم _r مرّةً بعد مرّة في الرابط');
page=await mk('?p=mohammed&_r=111');
const u2=await page.evaluate(()=>window.__reloadUrl());
ok((u2.match(/_r=/g)||[]).length===1,`_r واحدٌ لا اثنان (${u2.split('?')[1]})`);
ok(u2.includes('p=mohammed'),'والهويّة محفوظة رغم وجود _r سابق');
page=await mk('?_r=222');
const u3=await page.evaluate(()=>window.__reloadUrl());
ok((u3.match(/_r=/g)||[]).length===1&&!/[?&]&/.test(u3),`ولا فاصلٌ زائد حين لا استعلام غيره (${u3.split('?')[1]})`);

console.log('\n٤) الفحص الثاني تلقائي: يقرأ المخزّنة بالرابط الكامل لا بالمسار وحده');
ok(/location\.href\.split\("#"\)\[0\]/.test(src),'fetchCached تطلب الرابط الكامل — مفتاح التخزين هو الرابط بالاستعلام');
ok(/cache:"force-cache"/.test(src),'وبـforce-cache لتُقرأ نسخة المتصفّح لا نسخةٌ حيّة جديدة');
ok(/cached!==null&&cached\.length!==live\.length/.test(src),'والمقارنة تُتجاهَل إن تعذّرت القراءة — لا إنذار كاذب');
ok(!/location\.href=location\.pathname\+"\?_r="/.test(src),'ولم يبقَ في الملفّ أيّ إعادة تحميل تُسقط الاستعلام');

console.log('\n٤ب) وزرّ التحديث القسري نفسه — وهو الموصى بضغطه عند تعذّر التحديث');
ok(!/location\.replace\(location\.pathname\+"\?_r="/.test(src),'لم يعد يُسقط ?p= فيُنزل الأخوين في ملفّ هيا');
ok(/window\.__reloadUrl\?window\.__reloadUrl\(\)/.test(src),'بل يستعمل المساعِد الصائن للهويّة نفسه');
const hr=await page.evaluate(()=>typeof window.__reloadUrl==='function');
ok(hr,'والمساعِد مُصدَّرٌ فعلاً ليصل إليه الزرّ خارج الغلاف');

console.log('\n٥) لا انحدار: الصفحة تعمل والهويّة تُقرأ من الرابط كما كانت');
for(const [q,lv] of [['?p=mohammed','B1'],['?p=elias','A2'],['','A1']]){
  const pg=await mk(q);
  const r=await pg.evaluate(()=>({lv:profileOf().level,errs:window.__ERRS.length,miss:censusMissing().length}));
  ok(r.lv===lv&&r.errs===0&&r.miss===0,`${q||'(هيا)'} ⇒ ${r.lv}، بلا أخطاء ولا دوال ناقصة`);
  await pg.close();
}

console.log('\n'+(fails?`=== ${fails} فشل ===`:'=== كل الاختبارات نجحت ==='));
await b.close();process.exit(fails?1:0);
})();
