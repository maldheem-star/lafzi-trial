// بطاقة الجهاز — البند الثالث من سدّ ثغرة SDLC (٢٩ أغسطس).
//
// كلُّ اختباراتنا Chromium بلا رأس على خادم لينكس، بمحاكاةٍ للنطق كتبتُها أنا.
// أي أنّي أختبر ضدّ **تصوّري** عن الأجهزة لا ضدّ الأجهزة — والعطل الذي فتح هذه
// الجلسة (`synthesis-failed` على Android 10) من صنفٍ لا يُمسك إلّا على جهازٍ حقيقي.
// فالبطاقة تجعل الفحصَ على جهازٍ حقيقي **لمسةً واحدة تصل السجلّ**، بدل أن يبقى
// إجراءً يدوياً يعتمد على أن يتذكّره أحد (وهذا صنفُ الآليات الذي يفشل حتماً —
// درس ١٨ أغسطس).
//
// وهذا الاختبار لا يدّعي أنه يفحص جهازاً حقيقياً — لا يستطيع. يفحص أن **الأداة**
// تجمع الحقول الصحيحة وتُرسلها، فتكون جاهزةً حين تُفتح على الجهاز.
const {chromium}=require('/opt/node22/lib/node_modules/playwright');
let fails=0;const ok=(c,m)=>{console.log((c?'  ✓ ':'  ✗ FAIL ')+m);if(!c)fails++};
(async()=>{
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'});
const logs=[];
const p=await b.newPage({viewport:{width:420,height:900}});
p.on('pageerror',e=>{console.log('  ✗ PAGEERROR '+e.message);fails++});
await p.route('**/rest/v1/**',async r=>{
  if(r.request().method()!=='POST')return r.fulfill({status:200,contentType:'application/json',body:'[]'});
  let x={};try{x=JSON.parse(r.request().postData()||'{}')}catch(e){}
  logs.push(x);r.fulfill({status:201,contentType:'application/json',body:'[]'});
});
await p.route('**/functions/v1/**',r=>r.fulfill({status:200,contentType:'application/json',body:'{"ok":false}'}));
await p.addInitScript(()=>{
  // جهازٌ يُحاكي حالة هيا: لهجةٌ بشرطةٍ سفلية، وصوتٌ إنجليزيٌّ واحد محلّي
  Object.defineProperty(window,'speechSynthesis',{configurable:true,value:{
    speak(u){setTimeout(function(){u.onstart&&u.onstart()},0)},cancel(){},resume(){},pause(){},
    getVoices:()=>[{lang:'en_US',name:'الإنجليزية الولايات المتحدة',localService:true},
                   {lang:'ar-SA',name:'العربية',localService:true}],
    speaking:false,pending:false}});
  window.SpeechSynthesisUtterance=function(t){this.text=t};
});
await p.goto('http://127.0.0.1:8931/index.html');
await p.waitForFunction(()=>typeof deviceReport==='function');

console.log('\n١) البطاقة تحمل الحقول التي أوجبتها أعطالٌ وقعت فعلاً');
{
  const t=await p.evaluate(()=>deviceReport());
  const need=[
    ["بيئة","تجريب/إنتاج — فلا يُقرأ فحصُ التجريب على أنه فحصُ ما يستعمله الأبناء"],
    ["بناء","وسم النسخة — درس ١٨ أغسطس: نسخةٌ مخزّنة حجبت التدريبات ١٦ ساعة"],
    ["لهجات","نصّ اللهجة الخام — درس `en_US` بالشرطة السفلية"],
    ["أصوات","عدد الأصوات"],["إنجليزي","وعدد الإنجليزية منها"],
    ["المختار","والصوت الذي يختاره التطبيق فعلاً"],
    ["مايك","دعم الميكروفون"],["صيغ","صيغ التسجيل المدعومة"],
    ["شاشة","المقاس — أعطال التنسيق"],["لغة","لغة الجهاز"],
    ["مخزون","هل يعمل localStorage أصلاً"],["اتصال","الشبكة"]
  ];
  // مطابقةٌ نصّية لا نمطية: التهريب في نمطٍ عربيٍّ داخل سلسلةٍ داخل ملفّ كان
  // يُنتج `\\s` بدل `\s`، فتسقط أحد عشر فحصاً والبطاقة سليمة. (وقع فعلاً.)
  need.forEach(function(n){
    const has=t.indexOf(n[0]+":")===0||t.indexOf(" · "+n[0]+":")>=0;
    ok(has,'«'+n[0]+'» حاضر — '+n[1]);
  });
  ok(/لهجات:en_US/.test(t),'واللهجة بنصّها الخام لا مُوحَّدة — '+t.match(/لهجات:[^·]*/));
}

console.log('\n٢) وتصل السجلّ — لا تبقى على الشاشة عند من فتحها');
{
  logs.length=0;
  await p.evaluate(()=>{startAudioDiag();runDeviceReport()});
  await p.waitForTimeout(400);
  const row=logs.filter(x=>x&&x.qtype==='device').pop();
  ok(!!row,'سطرٌ وصل الخادم');
  ok(row&&row.domain==='gen','في domain=gen — ما يفعله النظام لا ما تفعله هي');
  ok(row&&row.response==='إنتاج','ومعه البيئة — '+(row&&row.response));
  ok(row&&/\[بطاقة الجهاز\]/.test(String(row.q_text||'')),'وبطاقةٌ كاملة');
  ok(row&&/Mozilla|HeadlessChrome/.test(String(row.q_text||'')),'ووصفُ الجهاز — بلاه لا يُقارَن جهازٌ بجهاز');
}

console.log('\n٣) والزرّ على شاشة التشخيص، والنتيجة تُعرض');
{
  const t=await p.evaluate(()=>{startAudioDiag();return document.body.innerText});
  ok(/بطاقة الجهاز/.test(t),'الزرّ ظاهر');
  const after=await p.evaluate(()=>{runDeviceReport();return document.body.innerText});
  ok(/وصلت السجلّ/.test(after),'والنتيجة تُعرض بعد الضغط');
  ok(/بناء:/.test(after),'ومعها وسم البناء — فيُقرأ من الشاشة كذلك');
}

console.log('\n٤) ولا تنكسر البطاقة إن غاب شيءٌ من البيئة');
{
  const q=await b.newPage({viewport:{width:420,height:900}});
  q.on('pageerror',e=>{console.log('  ✗ PAGEERROR '+e.message);fails++});
  await q.route('**/rest/v1/**',r=>r.fulfill({status:200,contentType:'application/json',body:'[]'}));
  await q.route('**/functions/v1/**',r=>r.fulfill({status:200,contentType:'application/json',body:'{"ok":false}'}));
  // بلا نطقٍ إطلاقاً، وبلا MediaRecorder — أسوأ جهازٍ ممكن
  await q.addInitScript(()=>{
    try{delete window.speechSynthesis}catch(e){}
    try{delete window.MediaRecorder}catch(e){}
  });
  await q.goto('http://127.0.0.1:8931/index.html');
  await q.waitForFunction(()=>typeof deviceReport==='function');
  const t=await q.evaluate(()=>deviceReport());
  ok(typeof t==='string'&&t.length>20,'تُبنى بطاقةٌ رغم ذلك — '+t.slice(0,80));
  ok(/بيئة:|بناء:/.test(t),'وفيها ما لا يعتمد على المتصفّح');
  await q.close();
}

await b.close();
console.log(fails?`\n=== ${fails} فشل ===`:'\n=== كل الاختبارات نجحت ===');
process.exit(fails?1:0);
})();
