const {chromium}=require('/opt/node22/lib/node_modules/playwright');
let fails=0;const ok=(c,m)=>{console.log((c?'  ✓ ':'  ✗ FAIL ')+m);if(!c)fails++};
(async()=>{
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium',
  args:['--use-fake-device-for-media-stream','--use-fake-ui-for-media-stream']});
const ctx=await b.newContext({viewport:{width:420,height:900},permissions:['microphone']});
let rest=0;
const mk=async(f)=>{
  const page=await ctx.newPage();
  page.on('pageerror',e=>{console.log('  ✗ PAGEERROR '+e.message);fails++});
  await page.route('**/rest/v1/**',r=>{rest++;r.fulfill({status:200,contentType:'application/json',body:'[]'})});
  await page.route('**/functions/v1/tutor',r=>r.fulfill({status:200,contentType:'application/json',
    body:JSON.stringify({ok:true,reply:"Hello there! What would you like today?"})}));
  await page.addInitScript(()=>{
    Object.defineProperty(window,'speechSynthesis',{configurable:true,value:{speak(){},cancel(){},resume(){},pause(){},
      getVoices:()=>[{lang:'en-US',name:'X'}],speaking:false,pending:false}});
    window.SpeechSynthesisUtterance=function(t){this.text=t};
  });
  await page.goto('http://127.0.0.1:8931/'+f);
  await page.waitForFunction(()=>typeof renderHomeCoachOnly==='function');
  await page.waitForTimeout(300);
  return page;
};

console.log('\n١) صفحة محمد: المحادثة والاستماع — ما يعمّم على الثلاثة لا منهج هيا');
const m=await mk('mohammed.html');
let t=await m.textContent('#app');
ok(t.includes('صفحة محمد'),'عنوان صفحته');
ok(t.includes('تكلّم بالإنجليزية'),'وعنوان القسم');
ok(t.includes('ابدأ المحادثة'),'وزرّ البدء');
ok(t.includes('فهم الاستماع'),'وزرّ الاستماع — يعمّم على الثلاثة كالمحادثة و«أخطائي»، لا خاصّاً بمنهج هيا');
ok(t.includes('فهم المقروء'),'وزرّ القراءة كذلك — نفس التعميم');
ok(t.includes('الكتابة'),'وزرّ الكتابة كذلك — نفس التعميم');
ok(t.includes('دقّة القواعد'),'وزرّ دقّة القواعد (اختيار الجملة الصحيحة من أربع) كذلك — نفس التعميم');
ok(t.includes('لعبة الاستماع'),'وزرّ لعبة الأزواج المتشابهة (chose/choose) كذلك — نفس التعميم');
ok(t.includes('فيديو تعليمي'),'وزرّ الفيديو التعليمي كذلك (١٩ أغسطس) — نفس التعميم');
const gone=['الاستدلال اللغوي','الرياضي والمكاني','الاستدلال العلمي','المرونة والأنماط',
  'محاكاة شاملة','وضع التقوية','متابعة التقدّم','عائلات الحقائق','طلاقة الحقائق',
  'خطة الإنجليزية اليومية','إملاء بالإنجليزية','تمرين النطق','جمل من كتابك','استراتيجيات موهبة',
  'برنامج موهبة المكثّف'];
gone.forEach(g=>ok(!t.includes(g),`«${g}» اختفى`));
// عشرة أزرار: الثمانية السابقة + تركيز الأسبوع (تسلسل التدريس) + لوحة القياس — ٢١ أغسطس.
// والعدد يبقى مكتوباً عمداً رغم كونه «فخّاً صامتاً» (درس ١٨ أغسطس): هو الحارس الوحيد
// الذي يمنع تسرّب قسمٍ من أقسام هيا إلى صفحة الأخوين، فيُحدَّث مع كل زرٍّ مقصود.
ok(await m.evaluate(()=>document.querySelectorAll('.mode').length)===11,
  `أحد عشر زرّاً لا أكثر — الثمانية + تركيز الأسبوع + لوحة القياس + المحاكاة (${await m.evaluate(()=>document.querySelectorAll('.mode').length)})`);
ok(t.includes('الصوت ما يشتغل؟'),'ورابط تشخيص الصوت باقٍ — بلا ميكروفون لا محادثة');
ok(!/اختاري|ابدئي|تكلّمي|اضغطي/.test(t),'وبلا خطاب مؤنّث');

console.log('\n٢) الزرّ يفتح المحادثة فعلاً');
await m.click('button[onclick="startCoach()"]');
await m.waitForTimeout(300);
ok(await m.evaluate(()=>mode)==='coach','دخلنا المحادثة');
ok((await m.textContent('#app')).includes('اختر موقفاً'),'وشاشة اختيار الموقف');
await m.evaluate(()=>{coachPick(0);coachMode('solo')});
await m.waitForTimeout(400);
ok(await m.evaluate(()=>!!coachScene),'والموقف بدأ');
ok((await m.textContent('#app')).includes('Sunny'),'والشريك تكلّم');

console.log('\n٣) الرجوع يعود إلى صفحة المحادثة لا إلى صفحتها');
rest=0;
await m.evaluate(()=>home());
await m.waitForTimeout(500);
t=await m.textContent('#app');
ok(t.includes('ابدأ المحادثة')&&!t.includes('محاكاة شاملة'),'رجعنا إلى القسم الواحد');
ok(rest===0,`ولا طلب نتائج إلى الخادم (${rest}) — لا اقتراح تقوية هنا`);

console.log('\n٤) إلياس مثله');
const e=await mk('elias.html');
t=await e.textContent('#app');
ok(t.includes('صفحة إلياس')&&t.includes('ابدأ المحادثة')&&t.includes('فهم الاستماع')&&t.includes('فهم المقروء')&&t.includes('الكتابة')&&t.includes('دقّة القواعد')&&t.includes('لعبة الاستماع')&&t.includes('فيديو تعليمي'),'المحادثة والاستماع والقراءة والكتابة ودقّة القواعد ولعبة الأزواج والفيديو');
ok(!t.includes('محاكاة شاملة')&&!t.includes('إملاء'),'وبقيّة الأقسام مخفيّة');
ok(await e.evaluate(()=>document.querySelectorAll('.mode').length)===11,'أحد عشر زرّاً لا أكثر');

console.log('\n٥) صفحة هيا لم تُمسّ — والاستماع والقراءة صارا عندها كذلك');
const h=await mk('index.html');
t=await h.textContent('#app');
['برنامج موهبة المكثّف','الاستدلال اللغوي','محاكاة شاملة','وضع التقوية','متابعة التقدّم',
 'عائلات الحقائق','طلاقة الحقائق','خطة الإنجليزية اليومية','إملاء بالإنجليزية','تمرين النطق',
 'تكلّمي بالإنجليزية','فهم الاستماع','فهم المقروء','الكتابة','جمل من كتابك','استراتيجيات موهبة','فيديو تعليمي'].forEach(g=>ok(t.includes(g),`«${g}» باقٍ عندها`));
ok(await h.evaluate(()=>document.querySelectorAll('.mode').length)>=14,'وكل أزرارها');
ok(t.includes('اسم المتدرّبة'),'وخطابها كما هو');

console.log('\n٦) لا انحدار: الأقسام نفسها تُفتح بالشيفرة عندهم لو استُدعيت');
for(const [fn,md] of [["startCoach()",'coach'],["startAudioDiag()",'audiodiag'],["home()",'home']]){
  const r=await m.evaluate(x=>{try{eval(x);return{m:mode}}catch(e){return{err:e.message}}},fn);
  ok(!r.err&&r.m===md,`${fn} → ${r.err||r.m}`);
}
ok((await m.evaluate(()=>censusMissing())).length===0,'وكل الدوال معرَّفة');
ok((await m.evaluate(()=>window.__ERRS.length))===0,'ولا خطأ عند محمد');
ok((await h.evaluate(()=>window.__ERRS.length))===0,'ولا عندها');

await b.close();
console.log(fails?`\n=== ${fails} فشل ===`:'\n=== كل الاختبارات نجحت ===');
process.exit(fails?1:0);
})();
