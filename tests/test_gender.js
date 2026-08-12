const {chromium}=require('/opt/node22/lib/node_modules/playwright');
let fails=0;const ok=(c,m)=>{console.log((c?'  ✓ ':'  ✗ FAIL ')+m);if(!c)fails++};
(async()=>{
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium',
  args:['--use-fake-device-for-media-stream','--use-fake-ui-for-media-stream']});
const ctx=await b.newContext({viewport:{width:420,height:900},permissions:['microphone']});
let calls=[];
const mk=async(q)=>{
  const page=await ctx.newPage();
  page.on('pageerror',e=>{console.log('  ✗ PAGEERROR '+e.message);fails++});
  await page.route('**/rest/v1/**',r=>r.fulfill({status:201,contentType:'application/json',body:'[]'}));
  await page.route('**/functions/v1/tutor',async r=>{
    let x={};try{x=JSON.parse(r.request().postData()||'{}')}catch(e){}
    calls.push(x);r.fulfill({status:200,contentType:'application/json',
      body:JSON.stringify({ok:true,reply:"لماذا اخترتِ هذا؟ جرّبي أن تعيدي القراءة.",model:"m",engine:"groq"})});
  });
  await page.addInitScript(()=>{
    Object.defineProperty(window,'speechSynthesis',{configurable:true,value:{
      speak(){},cancel(){},resume(){},pause(){},getVoices:()=>[{lang:'en-US',name:'X'}],speaking:false,pending:false}});
    window.SpeechSynthesisUtterance=function(t){this.text=t};
  });
  await page.goto('http://127.0.0.1:8931/'+(q||'index.html'));
  await page.waitForFunction(()=>typeof genderizeInit==='function');
  await page.waitForTimeout(300);
  return page;
};

console.log('\n١) صفحة هيا لا يمسّها التحويل إطلاقاً');
let h=await mk();
ok(await h.evaluate(()=>gzOn)===false,'المراقب غير منصوب أصلاً');
let t=await h.textContent('#app');
ok(t.includes('اسم المتدرّبة')&&t.includes('ابدئي التدريب'),'وخطابها كما هو: «اسم المتدرّبة» و«ابدئي»');
ok(t.includes('اختاري مهارة'),'و«اختاري»');

console.log('\n٢) صفحة محمد بخطاب المذكّر');
let m=await mk('mohammed.html');
t=await m.textContent('#app');
ok(t.includes('ابدأ المحادثة'),'«ابدأ المحادثة» لا «ابدئي»');
ok(t.includes('اضغط هنا')&&!t.includes('اضغطي'),'و«اضغط هنا» في رابط الصوت');
ok(!/اختاري|ابدئي|اضغطي|أعيدي|تكلّمي|عليكِ/.test(t),'ولا فعل مؤنّث واحد في صفحته');
// وصفحتها هي التي فيها «اسم المتدرّبة» — نتحقّق أن التذكير لم يتسرّب إليها
ok((await h.textContent('#app')).includes('اسم المتدرّبة'),'وخطابها هي لم يُمسّ');

console.log('\n٣) الأسماء المتشابهة لا تُمسّ');
const keep=await m.evaluate(()=>['الذي','التي','متوازي','العلوي','تمرين','التخمين','تحسين',
  'الرياضي','الثاني','يساوي','طلاقة ممتازة','جمل قصيرة جاهزة','بين','مرتين','السفليين']
  .map(w=>({w,g:genderizeText(w)})));
keep.forEach(k=>ok(k.g===k.w,`«${k.w}» تبقى كما هي${k.g===k.w?'':' → '+k.g}`));

console.log('\n٤) الماضي والضمائر');
const conv=await m.evaluate(()=>['أتقنتِ','جاوبتِ','أحسنتِ','نطقتِ','عليكِ','مستواكِ','يعلّمكِ','وقولي','فاضربي']
  .map(w=>({w,g:genderizeText(w)})));
const want={'أتقنتِ':'أتقنتَ','جاوبتِ':'جاوبتَ','أحسنتِ':'أحسنتَ','نطقتِ':'نطقتَ','عليكِ':'عليك',
  'مستواكِ':'مستواك','يعلّمكِ':'يعلّمك','وقولي':'وقل','فاضربي':'فاضرب'};
conv.forEach(c=>ok(c.g===want[c.w],`${c.w} → ${c.g}`));

console.log('\n٥) الشاشات الداخلية كذلك — لا الرئيسية وحدها');
for(const [fn,must] of [["startBasics('percent')",/اقرأ|اضغط|شاهد/],["startEngPlan()",/استمع|اختر|اضغط/],
  ["startDictation()",/استمع|اكتب/],["startPronunciation()",/اضغط|تكلّم|انطق/],["startCoach()",/اختر|تكلّم/]]){
  await m.evaluate(x=>eval(x),fn);
  await m.waitForTimeout(250);
  const s=await m.textContent('#app');
  const bad=(s.match(/اختاري|ابدئي|اضغطي|أعيدي|استمعي|اكتبي|تكلّمي|تتكلّمين|جرّبي|حاولي|تحقّقي|انطقي|اقرئي|شاهدي|أتقنتِ|عليكِ/g)||[]);
  ok(bad.length===0,`${fn}: ${bad.length?'بقي '+[...new Set(bad)].join('، '):'بلا خطاب مؤنّث'}`);
  ok(must.test(s),'  وفيها الصيغة المذكّرة');
}

console.log('\n٦) النصّ المتغيّر بعد الرسم يُحوَّل أيضاً (المراقب لا render وحده)');
await m.evaluate(()=>{document.getElementById('app').insertAdjacentHTML('afterbegin','<div id="zz">اختاري ثم اضغطي وأعيدي</div>')});
await m.waitForTimeout(200);
ok((await m.textContent('#zz'))==='اختر ثم اضغط وأعِد',`«${await m.textContent('#zz')}»`);

console.log('\n٧) جنس المتعلّم يصل إلى النموذج');
await m.evaluate(()=>home());
calls.length=0;
await m.evaluate(()=>tutorStart({subject:"لغة إنجليزية",question:"q",studentAnswer:"a",correctAnswer:"b"}));
await m.waitForTimeout(400);
ok(calls.length>0&&calls[0].learner&&calls[0].learner.gender==='male',`learner.gender=${calls[0]&&calls[0].learner&&calls[0].learner.gender}`);
ok(calls[0].learner.name==='محمد','واسمه معه');
await m.waitForTimeout(200);
const tt=await m.textContent('#app');
ok(!/اخترتِ|جرّبي/.test(tt),'وردّ النموذج المؤنّث يُحوَّل على الشاشة أيضاً — شبكة أمان ثانية');
ok((await m.evaluate(()=>tuMsgs.map(x=>x.text).join(' '))).includes('اخترتِ'),'  والأصل محفوظ في الذاكرة كما جاء — التحويل على العرض لا على البيانات');
calls.length=0;
const hp=await mk();
await hp.evaluate(()=>tutorStart({subject:"لغة إنجليزية",question:"q",studentAnswer:"a",correctAnswer:"b"}));
await hp.waitForTimeout(400);
ok(calls[0]&&calls[0].learner.gender==='female','وهيا female');
ok((await hp.evaluate(()=>tuMsgs.map(m=>m.text).join(' '))).includes('اخترتِ'),'وردّه إليها يبقى مؤنّثاً');

console.log('\n٨) لا انحدار في صفحة محمد');
for(const [fn,md] of [["startBasics('percent')",'basics'],["startFactPlan()",'factplan'],["startEngPlan()",'engplan'],
  ["startDictation()",'dictation'],["startPronunciation()",'pron'],["startCoach()",'coach'],
  ["startAudioDiag()",'audiodiag'],["home()",'home']]){
  const r=await m.evaluate(x=>{try{eval(x);return{m:mode,len:document.getElementById('app').textContent.length}}catch(e){return{err:e.message}}},fn);
  ok(!r.err&&r.m===md&&r.len>40,`${fn} → ${r.err||r.m}`);
}
ok((await m.evaluate(()=>censusMissing())).length===0,'وكل الدوال معرَّفة');
ok((await m.evaluate(()=>window.__ERRS.length))===0,'ولا خطأ');
ok((await h.evaluate(()=>window.__ERRS.length))===0,'ولا خطأ عندها');

await b.close();
console.log(fails?`\n=== ${fails} فشل ===`:'\n=== كل الاختبارات نجحت ===');
process.exit(fails?1:0);
})();
