const {chromium}=require('/opt/node22/lib/node_modules/playwright');
let fails=0;const ok=(c,m)=>{console.log((c?'  ✓ ':'  ✗ FAIL ')+m);if(!c)fails++};
(async()=>{
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'});
const logs=[];let calls=[],reply='لماذا اخترتِ "just" هنا؟ انظري إلى بداية الجملة.',mode='ok';
const mk=async()=>{
  const page=await b.newPage({viewport:{width:420,height:900}});
  page.on('pageerror',e=>{console.log('  ✗ PAGEERROR '+e.message);fails++});
  await page.route('**/rest/v1/**',async r=>{
    let x={};try{x=JSON.parse(r.request().postData()||'{}')}catch(e){}
    logs.push(x);r.fulfill({status:201,contentType:'application/json',body:'[]'});
  });
  await page.route('**/functions/v1/tutor',async r=>{
    let x={};try{x=JSON.parse(r.request().postData()||'{}')}catch(e){}
    calls.push(x);
    if(mode==='ok')return r.fulfill({status:200,contentType:'application/json',
      body:JSON.stringify({ok:true,engine:'groq',model:'llama-3.3-70b-versatile',keyName:'GROQ_API_KEY',reply})});
    if(mode==='nokey')return r.fulfill({status:200,contentType:'application/json',
      body:JSON.stringify({error:'not_configured',keyName:'',provider:'groq',checked:['GROQ_API_KEY','GEMINI_API_KEY','GOOGLE_API_KEY']})});
    if(mode==='badmodel')return r.fulfill({status:200,contentType:'application/json',
      body:JSON.stringify({error:'tutor_bad_model',status:404,model:'llama-x',provider:'groq',keyName:'GROQ_API_KEY'})});
    return r.abort();
  });
  await page.addInitScript(()=>{
    Object.defineProperty(window,'speechSynthesis',{configurable:true,value:{speak(){},cancel(){},resume(){},pause(){},getVoices:()=>[{lang:'en-US',name:'X'}],speaking:false,pending:false}});
    window.SpeechSynthesisUtterance=function(t){this.text=t};
  });
  await page.goto('http://127.0.0.1:8931/index.html');
  await page.waitForFunction(()=>typeof tutorStart==='function');
  return page;
};
const armWrong=page=>page.evaluate(()=>{
  startEngPlan();
  planItems=[{id:'u8_g1',t:'grammar',lesson:'l_pp_adv',q:'I\'ve ___ signed up for the gymnastics club.',
    c:['just','yet','ever','already'],a:0,w:'شرح'}];
  planIdx=0;planPicked=null;planLocked=false;planGateSecs=0;planGateLeft=0;
  cxDoneThisPlan=true;fixOn=false;tuOn=false;tuFail="";render();
  planChoose(1); // اختارت yet والصواب just — خطؤها الحقيقي
});

let page=await mk();

console.log('\n١) زرّ النقاش يظهر بعد الخطأ وحده');
await armWrong(page);
ok(await page.evaluate(()=>planLocked)===true,'الإجابة سُجّلت');
ok((await page.textContent('#app')).includes('ناقشيني فيها'),'وزرّ «ناقشيني» ظاهر');
await page.evaluate(()=>{planPicked=0;render()});
ok(!(await page.textContent('#app')).includes('ناقشيني فيها'),'ولا يظهر مع الإجابة الصحيحة — النقاش علاجٌ للخطأ');
await page.evaluate(()=>{planPicked=1;render()});

console.log('\n٢) ما يُرسَل إلى المعلّم: السؤال وجوابها والصواب — بلا شيء مكتوب لهذا الدرس');
calls.length=0;logs.length=0;
await page.click('button[onclick="planAskTutor()"]');
await page.waitForFunction(()=>tuOn&&!tuBusy,null,{timeout:5000});
const c0=calls[0]||{};
ok(c0.question&&c0.question.includes('signed up'),'نصّ السؤال');
ok(c0.studentAnswer==='yet',`وجوابها («${c0.studentAnswer}»)`);
ok(c0.correctAnswer==='just',`والصواب («${c0.correctAnswer}»)`);
ok(Array.isArray(c0.choices)&&c0.choices.length===4,'والخيارات الأربعة');
ok(c0.subject==='لغة إنجليزية'&&c0.age===11,'والمادة والعمر');
ok(c0.itemId==='u8_g1','ومعرّف العنصر');
ok(!('apiKey' in c0)&&!JSON.stringify(c0).includes('AIza'),'ولا مفتاح في الطلب — المفتاح لا يمرّ بالعميل أبداً');

console.log('\n٣) ردّه يظهر لها، ويُسجَّل');
let t=await page.textContent('#app');
ok(t.includes('نتناقش فيها'),'صندوق الحوار مفتوح');
ok(t.includes('انظري إلى بداية الجملة'),'وردّ المعلّم معروض');
await page.waitForTimeout(400);
let lg=logs.filter(l=>l.domain==='tutor');
ok(lg.length===1&&lg[0].qtype==='reply',`سطر واحد من نوع reply (${lg.length})`);
ok(lg[0].response&&lg[0].response.includes('بداية الجملة'),'وفيه نصّ الردّ');
ok(lg[0].q_text&&lg[0].q_text.includes('signed up'),'ومعه السؤال');

console.log('\n٤) ردّها يُرسَل مع التاريخ كاملاً — الدالّة بلا ذاكرة');
calls.length=0;logs.length=0;
reply='صحيح أن الجملة مثبتة. فأين يقع "just" — بعد have أم في آخر الجملة؟';
await page.evaluate(()=>{document.getElementById('tuIn').value='لأن الجملة فيها have';tutorSend()});
await page.waitForFunction(()=>!tuBusy,null,{timeout:5000});
const c1=calls[0]||{};
ok(Array.isArray(c1.history)&&c1.history.length===3,`التاريخ ثلاث رسائل (${c1.history&&c1.history.length})`);
ok(c1.history[0].role==='user'&&c1.history[0].text.includes('الإجابة الصحيحة'),'أولها نصّ الافتتاح نفسه');
ok(c1.history[1].role==='model','ثم ردّ المعلّم');
ok(c1.history[2].role==='user'&&c1.history[2].text==='لأن الجملة فيها have','ثم كلامها حرفياً');
t=await page.textContent('#app');
ok(t.includes('لأن الجملة فيها have'),'وكلامها معروض على الشاشة');
ok(t.includes('بعد have أم في آخر الجملة'),'وردّه الجديد كذلك');
await page.waitForTimeout(400);
lg=logs.filter(l=>l.domain==='tutor');
ok(lg.filter(l=>l.qtype==='ask').length===1&&lg.filter(l=>l.qtype==='reply').length===1,'وسطرا ask وreply');
ok(lg.find(l=>l.qtype==='ask').response==='لأن الجملة فيها have','ونصّها الخام محفوظ كما كتبته');

console.log('\n٥) الحوار محدود بخمس رسائل — تمرين لا محادثة');
for(let i=0;i<5;i++){
  const has=await page.evaluate(()=>!!document.getElementById('tuIn'));
  if(!has)break;
  await page.evaluate(n=>{document.getElementById('tuIn').value='ردّ '+n;tutorSend()},i);
  await page.waitForFunction(()=>!tuBusy,null,{timeout:5000});
}
ok(await page.evaluate(()=>tuMsgs.filter(m=>m.role==='user').length)===TUTOR_MAX_TURNS_EXPECT(),
   `توقّف عند ${TUTOR_MAX_TURNS_EXPECT()} رسائل منها`);
function TUTOR_MAX_TURNS_EXPECT(){return 5}
ok(await page.evaluate(()=>!document.getElementById('tuIn')),'وحقل الكتابة اختفى');
ok((await page.textContent('#app')).includes('اكتفينا هنا'),'ويُقال لها لماذا');

console.log('\n٦) الإغلاق يعيدها للتمرين');
await page.click('button[onclick="tutorClose()"]');
ok(await page.evaluate(()=>tuOn)===false,'الصندوق أُغلق');
ok((await page.textContent('#app')).includes('ناقشيني فيها'),'والزرّ عاد');
ok(await page.evaluate(()=>!!document.querySelector('button[onclick="planNext()"]')),'وزرّ الانتقال باقٍ — التمرين لم يتعطّل');

console.log('\n٧) غياب المفتاح لا يُعطّل شيئاً');
mode='nokey';page=await mk();
await armWrong(page);
await page.click('button[onclick="planAskTutor()"]');
await page.waitForFunction(()=>!tuBusy,null,{timeout:5000});
ok(await page.evaluate(()=>tuOn)===false,'الصندوق لا يبقى مفتوحاً على فراغ');
ok(await page.evaluate(()=>tuFail)==='not_configured','والسبب مسجَّل');
ok(await page.evaluate(()=>!!document.querySelector('button[onclick="planNext()"]')),'والتمرين يكمل كما كان');
ok(await page.evaluate(()=>tutorAvailable())===false,'ولا يُعرض الزرّ ثانيةً في الجلسة');
ok(!(await page.textContent('#app')).includes('ناقشيني فيها'),'فلا تضغط على ما لا يعمل');

console.log('\n٨) الفحص يقول أي مفتاح وُجد وأي نموذج — بلا كشف القيمة');
mode='ok';page=await mk();
await page.evaluate(()=>startAudioDiag());
ok((await page.textContent('#app')).includes('فحص المعلّم'),'قسم الفحص موجود');
await page.click('button[onclick="runTutorDiag()"]');
await page.waitForFunction(()=>tuDiag&&!tuDiag.running,null,{timeout:5000});
t=await page.textContent('#app');
ok(t.includes('المعلّم يعمل'),'يقول إنه يعمل');
ok(t.includes('llama-3.3-70b-versatile')&&t.includes('groq'),'ويُسمّي المزوّد والنموذج');
ok(t.includes(reply.slice(0,20)),'ويعرض ردّه كما هو');
const diagCall=calls[calls.length-1]||{};
ok(diagCall.question&&diagCall.correctAnswer==='yet','والفحص يُرسل سؤالاً حقيقياً لا نصّاً وهمياً');

console.log('\n٩) الأعطال تُسمّى بأسبابها المختلفة');
mode='badmodel';page=await mk();
await page.evaluate(()=>startAudioDiag());
await page.click('button[onclick="runTutorDiag()"]');
await page.waitForFunction(()=>tuDiag&&!tuDiag.running,null,{timeout:5000});
t=await page.textContent('#app');
ok(t.includes('اسم النموذج المحفوظ غير موجود'),'اسم نموذج خاطئ يُقال صراحةً');
ok(t.includes('GROQ_MODEL'),'ومعه اسم السرّ الذي يُعدَّل');
ok(t.includes('GROQ_API_KEY'),'ويُقال أي اسم وُجد المفتاح تحته');
ok(!t.includes('AIza'),'ولا تظهر قيمة المفتاح');
mode='nokey';page=await mk();
await page.evaluate(()=>startAudioDiag());
await page.click('button[onclick="runTutorDiag()"]');
await page.waitForFunction(()=>tuDiag&&!tuDiag.running,null,{timeout:5000});
t=await page.textContent('#app');
ok(t.includes('غير مُفعّل'),'وغياب المفتاح يُقال');
ok(t.includes('GROQ_API_KEY')&&t.includes('GEMINI_API_KEY'),'ومعه الأسماء التي بُحث عنها لكلا المزوّدين');

console.log('\n١١) الاختبار الشامل: المعلّم يعمل في المهارات الأربع بخُطّاف واحد');
mode='ok';page=await mk();
for(const [dom,subj] of [['quant','رياضيات'],['verbal','لغة عربية — لفظي'],['science','علوم'],['flex','تفكير ومرونة ذهنية']]){
  calls.length=0;
  await page.evaluate(d=>{
    filtered=[{q:'سؤال في '+d,d,c:['أ','ب','ج','د'],a:0,w:'شرح',id:d+'_1'}];
    idx=0;picked=null;locked=false;done=false;score=0;answered=[];
    mode="quiz";currentMode=d;tuOn=false;tuFail="";gateSecs=0;gateLeft=0;render();
    choose(1); // خطأ
  },dom);
  const has=(await page.textContent('#app')).includes('ناقشيني فيها');
  ok(has,`${dom}: زرّ النقاش ظاهر بعد الخطأ`);
  if(!has)continue;
  await page.click('button[onclick="quizAskTutor()"]');
  await page.waitForFunction(()=>tuOn&&!tuBusy,null,{timeout:5000});
  const c=calls[0]||{};
  ok(c.subject===subj,`  والمادة تُقرأ من مجال السؤال: «${c.subject}»`);
  ok(c.studentAnswer==='ب'&&c.correctAnswer==='أ','  وجوابها والصواب');
  await page.evaluate(()=>tutorClose());
}
// الإجابة الصحيحة لا تفتح نقاشاً
await page.evaluate(()=>{picked=0;render()});
ok(!(await page.textContent('#app')).includes('ناقشيني فيها'),'ولا يظهر مع الإجابة الصحيحة');

console.log('\n١٢) لا انحدار');
mode='ok';page=await mk();
for(const [fn,md] of [["startBasics('percent')",'basics'],["startBasics('multdiv')",'basics'],["startFactPlan()",'factplan'],
  ["startEngPlan()",'engplan'],["startDictation()",'dictation'],["startPronunciation()",'pron'],
  ["startFade('circle')",'fade'],["startAudioDiag()",'audiodiag'],["home()",'home']]){
  const r=await page.evaluate(x=>{try{eval(x);return{m:mode,len:document.getElementById('app').textContent.length}}catch(e){return{err:e.message}}},fn);
  ok(!r.err&&r.m===md&&r.len>40,`${fn} → ${r.err||r.m}`);
}
ok((await page.evaluate(()=>censusMissing())).length===0,'وكل الدوال معرَّفة');
ok((await page.evaluate(()=>window.__ERRS.length))===0,'ولا خطأ');

await b.close();
console.log(fails?`\n=== ${fails} فشل ===`:'\n=== كل الاختبارات نجحت ===');
process.exit(fails?1:0);
})();
