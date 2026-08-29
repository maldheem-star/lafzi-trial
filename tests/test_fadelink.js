// بطاقة الخطأ المتكرّر (qzCard) ⇐ رابطٌ مباشر لشرحٍ موجودٍ أصلاً — طُلبت بعد قراءة
// بيانات هيا الحيّة (١٧ أغسطس): أخطأت زاوية المروحة (gAngleEqualRays) ٣ من ٣ باختيار
// المجموع غير المقسوم بالضبط، وqzCard كانت تُنبّه بلا أن تشرح رغم أن الشرح موجودٌ أصلاً
// في وضع التقوية لهذا النوع بالذات (FADE_TOPICS key="angles"). فبدل شرحٍ ثانٍ، القالب
// المتكرّر يُربَط بالموضوع الجاهز — سطرٌ في جدول (QZ_CARD_FADE_LINK) لا آلية جديدة.
// ومعها: تصحيح موّهٍ في gAgeChain كان يتصادف عددياً مع «توقّفت عند الحلقة قبل الأخيرة»
// كلّما كان الفرق الأخير = ٢ (وقع فعلاً مرّتين في نفس اليوم)، فصار المموّه bAge نفسه
// لا رقماً ثابتاً — قياسٌ أدقّ، لا علاجاً بعد (لا فادة موضوع لسلسلة الأعمار بعد).
const {chromium}=require('/opt/node22/lib/node_modules/playwright');
let fails=0;const ok=(c,m)=>{console.log((c?'  ✓ ':'  ✗ FAIL ')+m);if(!c)fails++};
(async()=>{
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'});
const page=await b.newPage({viewport:{width:420,height:900}});
page.on('pageerror',e=>{console.log('  ✗ PAGEERROR '+e.message);fails++});
await page.route('**/rest/v1/**',r=>r.fulfill({status:201,contentType:'application/json',body:'[]'}));
await page.goto('http://127.0.0.1:8931/index.html');
await page.waitForFunction(()=>typeof QZ_CARD_FADE_LINK!=='undefined');

console.log('\n١) خريطة الربط مبنيّة من مولّدات حقيقية — لا نصّ مكرَّر يدوياً');
const link=await page.evaluate(()=>QZ_CARD_FADE_LINK);
const keys=Object.keys(link);
// حدٌّ أدنى لا عدد: القائمة «تُوسَّع بسطر واحد كلّما تأكّد قالبٌ آخر» بنصّ تعليقها،
// فتثبيتُ العدد يكسر كلَّ توسعةٍ مشروعة ولا يقول أيُّ ربطٍ تغيّر — درس ١٨ أغسطس.
ok(keys.length>=5,`القوالب المربوطة لا تقلّ عن خمسة (${keys.length})`);
// والصحّة تُقاس بوجود الموضوع في FADE_TOPICS نفسها لا بقائمةٍ مكتوبة هنا تتقادم
const topics=await page.evaluate(()=>FADE_TOPICS.map(t=>t.key));
const badLinks=Object.values(link).filter(v=>topics.indexOf(v)<0);
ok(badLinks.length===0,'وكلّها لمواضيع تقوية موجودة فعلاً'+(badLinks.length?' — دخيل: '+badLinks.join(','):''));
// وقيمةُ الربط مفتاحٌ نقيّ يقبله startFade — لا مفتاحٌ مركّب («seq/ratio») يكسره
ok(Object.values(link).every(v=>String(v).indexOf('/')<0),'وقيمتها مفتاحٌ نقيّ يقبله startFade');
{
  const varOk=await page.evaluate(()=>{
    const keys=Object.keys(CLIP_VARIANT);
    return keys.length>0&&keys.every(function(k){return QZ_CARD_FADE_LINK[k]==="seq"});
  });
  ok(varOk,'والنوع الفرعي في جدولٍ منفصل، ولا يُستعمل إلا لقوالب seq');
}
const anglesKey=keys.find(k=>link[k]==='angles');
ok(!!anglesKey&&anglesKey.includes('مقسومة بأشعّة')&&anglesKey.includes('#'),'ومفتاح الزوايا بلا أرقام (منزوعة بـ#) فيطابق أيّ مثيل من نفس القالب');

console.log('\n٢) خطأ ثانٍ على قالب «زاوية المروحة» ⇒ بطاقة تحمل زرّ التقوية المباشر');
await page.evaluate(()=>{qzErrSave({});qzCard=null;qzCardCount=0});
async function answerWrongTwice(genFn){
  return await page.evaluate((fn)=>{
    const g=window[fn];
    const q1=g();filtered=[q1];idx=0;picked=null;locked=false;done=false;score=0;answered=[];
    questionShownAt=Date.now();currentMode='flex';mode='quiz';loading=false;
    choose(q1.c.findIndex((_,i)=>i!==q1.a));
    const q2=g();filtered=[q1,q2];idx=1;picked=null;locked=false;questionShownAt=Date.now();
    choose(q2.c.findIndex((_,i)=>i!==q2.a));
    return {hasCard:!!qzCard,key:qzCard&&qzCard.k};
  },genFn);
}
const r1=await answerWrongTwice('gAngleEqualRays');
ok(r1.hasCard,'البطاقة ظهرت بعد ثاني خطأ على نفس القالب');
let t=await page.textContent('#app');
ok(t.includes('تدرّبي عليه خطوة بخطوة'),'وزرّ التقوية المباشر ظاهر — لا تنبيهاً فارغاً');
ok(await page.evaluate(()=>document.querySelector('button[onclick*="startFade(\'angles\'"]'))!==null,'ويفتح موضوع "angles" تحديداً');
await page.click('button[onclick*="startFade(\'angles\'"]');
await page.waitForTimeout(200);
ok(await page.evaluate(()=>mode)==='fade'&&await page.evaluate(()=>fadeTopic)==='angles','والضغط ينقلها فعلاً إلى الشرح — لا رابطاً معطَّلاً');

console.log('\n٣) قالبٌ بلا موضوع تقوية جاهز ⇒ البطاقة القديمة بلا زرٍّ إضافي — لا انحدار');
await page.evaluate(()=>{home();qzErrSave({});qzCard=null;qzCardCount=0});
const r2=await answerWrongTwice('gWorkers'); // لا يوجد فادينج مطابق له
ok(r2.hasCard,'البطاقة تظهر كما كانت دائماً');
t=await page.textContent('#app');
ok(t.includes('قرأتُ التفسير')&&!t.includes('تدرّبي عليه خطوة بخطوة'),'بلا زرّ تقوية وهمي لموضوعٍ لا يوجد له شرحٌ جاهز');

console.log('\n٤) gAgeChain: المموّه الآن bAge نفسه — لا رقماً ثابتاً يتصادف معه أحياناً');
const age=await page.evaluate(()=>{
  const out=[];
  for(let i=0;i<25;i++){
    const q=gAgeChain();
    out.push({hasFour:q.c.length===4,answerValid:q.a>=0&&q.a<q.c.length});
  }
  return out;
});
ok(age.every(x=>x.hasFour),'كل الأسئلة أربعة خيارات كما كانت');
ok(age.every(x=>x.answerValid),'وموضع الصواب سليم دائماً');
const src=await page.evaluate(()=>gAgeChain.toString());
ok(src.includes('[bAge,aAge-2,dAge-p]'),'وقائمة المموّهات الفعلية هي [bAge,aAge-2,dAge-p] — لا [aAge+2,aAge-2,dAge-p] القديمة المتصادفة');

console.log('\n٥) لا انحدار');
for(const [fn,md] of [["startFade('angles')",'fade'],["startFade('percent')",'fade'],["home()",'home']]){
  const r=await page.evaluate(x=>{try{eval(x);return{m:mode}}catch(e){return{err:e.message}}},fn);
  ok(!r.err&&r.m===md,`${fn} → ${r.err||r.m}`);
}
ok((await page.evaluate(()=>censusMissing())).length===0,'وكل الدوال معرَّفة');
ok((await page.evaluate(()=>window.__ERRS.length))===0,'ولا خطأ');

await b.close();
console.log(fails?`\n=== ${fails} فشل ===`:'\n=== كل الاختبارات نجحت ===');
process.exit(fails?1:0);
})();
