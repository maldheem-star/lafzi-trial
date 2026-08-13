// ثلاثة من جلسات إلياس: التصحيح لا ينتظر النهاية، والفشل يُسجَّل، والأذن تُحيَّز بالموقف.
//
// السبب: ثلاث جلسات ولم يرَ صفحة التصحيح ولا مرّة — يخرج من الجلسة كما هي، والمراجعة
// تعمل عند «إنهاء» أو بعد ثماني جمل. وجلسته الأخيرة ماتت بلا جملة واحدة ولم أعرف لماذا،
// لأن حالات الفشل تُعرض ولا تُسجَّل. وجلسة المتجر بُنيت على «an address» والأرجح «a dress».
const {chromium}=require('/opt/node22/lib/node_modules/playwright');
let fails=0;const ok=(c,m)=>{console.log((c?'  ✓ ':'  ✗ FAIL ')+m);if(!c)fails++};
(async()=>{
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium',
  args:['--use-fake-device-for-media-stream','--use-fake-ui-for-media-stream']});
const ctx=await b.newContext({viewport:{width:420,height:900},permissions:['microphone']});
let logs=[],calls=[],stt=[];
let sttReply={ok:true,heard:"I need a dress for my sister"};
let chat={ok:true,reply:"Nice. What size do you need?\nSAY: I need a small one. | I need a big one."};
let review={ok:true,reply:"FIX: I need a dress for my sister | I need a dress for my sister, please. | الطلب في المتجر يُلطَّف بـplease",ltJudged:1,ltDropped:0};
const mk=async(f)=>{
  const page=await ctx.newPage();
  page.on('pageerror',e=>{console.log('  ✗ PAGEERROR '+e.message);fails++});
  await page.route('**/rest/v1/**',async r=>{
    let x={};try{x=JSON.parse(r.request().postData()||'{}')}catch(e){}
    logs.push(x);r.fulfill({status:201,contentType:'application/json',body:'[]'});
  });
  await page.route('**/functions/v1/assess-pronunciation-groq',async r=>{
    let x={};try{x=JSON.parse(r.request().postData()||'{}')}catch(e){}
    stt.push(x);r.fulfill({status:200,contentType:'application/json',body:JSON.stringify(sttReply)});
  });
  await page.route('**/functions/v1/assess-azure',r=>
    r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({ok:true,noAssessment:true,nbestKeys:[],hasWords:0,raw:"{}"})}));
  await page.route('**/functions/v1/tutor',async r=>{
    let x={};try{x=JSON.parse(r.request().postData()||'{}')}catch(e){}
    calls.push(x);
    r.fulfill({status:200,contentType:'application/json',
      body:JSON.stringify(String(x.mode||"")==="review"?review:chat)});
  });
  await page.addInitScript(()=>{
    Object.defineProperty(window,'speechSynthesis',{configurable:true,value:{speak(){},cancel(){},resume(){},pause(){},
      getVoices:()=>[{lang:'en-US',name:'X'}],speaking:false,pending:false}});
    window.SpeechSynthesisUtterance=function(t){this.text=t};
  });
  await page.goto('http://127.0.0.1:8931/'+f);
  await page.waitForFunction(()=>typeof coachLeave==='function');
  return page;
};
const turn=page=>page.evaluate(()=>{coachElapsed=2.5;
  wavInRate=16000;wavBuf=[(function(){const n=16000,f=new Float32Array(n);
    for(let i=0;i<n;i++)f[i]=0.4*Math.sin(2*Math.PI*220*i/16000);return f})()];
  coachChunks=[new Blob(["x"],{type:"audio/webm"})];
  coachRec={mimeType:"audio/webm",state:"inactive"};coachBusy=true;return coachFinish()});
// موقف المتجر (٣) ووضع «وحدي»
const openShop=async(page)=>{
  await page.evaluate(()=>{startCoach();coachPick(2)});
  await page.waitForTimeout(150);
  await page.click("button[onclick=\"coachMode('solo')\"]");
  await page.waitForTimeout(400);
};

console.log('\n١) الأذن تُحيَّز بكلمات الموقف — لا بجملة متوقَّعة');
let page=await mk('elias.html');
stt=[];await openShop(page);await turn(page);await page.waitForTimeout(400);
const s0=stt[0]||{};
ok(typeof s0.hint==='string'&&s0.hint.length>0,`التفريغ يحمل كلمات الموقف (${String(s0.hint).slice(0,52)}…)`);
ok(/dress/.test(s0.hint||''),'ومنها dress — الكلمة التي ضاعت في جلسته');
ok(Array.isArray(s0.targetWords)&&s0.targetWords.length===0,'وبلا كلمات هدف — فهي محادثة لا تمرين نطق');
ok(String(s0.hint).length<=220,'والتحيّز محدود الطول: مجالُ حديثٍ لا نصٌّ يُملى');
const scenesOk=await page.evaluate(()=>COACH_SCENES.filter(s=>!s.free).every(s=>typeof s.words==='string'&&s.words.length>10));
ok(scenesOk,'وكل موقفٍ له كلماته');
const freeHint=await page.evaluate(()=>{coachScene=coachFreeScene("space travel");return coachHintNow()});
ok(freeHint==='space travel','والموقف الحرّ موضوعُه كلمتُه');

console.log('\n١ب) وتمرين النطق يبقى على قراره: لا تحيّز حيث توجد كلمات هدف');
// نفس القرار المكتوب في الدالّة منذ البداية — التحيّز هناك «نجاح كاذب»
stt=[];
await page.evaluate(()=>{startPronunciation()});
await page.waitForTimeout(200);
const pronCall=await page.evaluate(()=>{
  // نقرأ ما يُرسله تمرين النطق: لا حقل hint فيه أصلاً
  return typeof pronSession!=='undefined'&&pronSession.length>0;
});
ok(pronCall,'تمرين النطق يعمل');
const srcNoHint=await page.evaluate(()=>{
  const src=String(window.pronStop||'')+String(window.speakStop||'');
  return src.indexOf('hint:')<0;
});
ok(srcNoHint,'ولا يمرّر hint من شيفرته');

console.log('\n٢) فشل المحادثة يُسجَّل بنوعه — «ولم أعرف لماذا ماتت جلسته»');
page=await mk('elias.html');
logs=[];
await openShop(page);
// تسجيل قصير جداً
await page.evaluate(()=>{coachElapsed=0.3;coachChunks=[new Blob(["x"],{type:"audio/webm"})];
  coachRec={mimeType:"audio/webm",state:"inactive"};coachBusy=true;return coachFinish()});
await page.waitForTimeout(400);
let f=logs.filter(l=>l.qtype==='fail');
ok(f.length===1,`سطر فشل واحد (${f.length})`);
ok(f[0]&&/^short/.test(String(f[0].response)),`ونوعه short (${f[0]&&f[0].response})`);
ok(f[0]&&f[0].is_correct===false,'ويُحتسب فشلاً لا مجهولاً');
ok(f[0]&&f[0].lesson==='shop','ومعه الموقف');
ok(f[0]&&f[0].q_text==='said:0','وكم جملة قيلت قبله — فيُعرف أمات في أوّله أم في آخره');
// وتفريغ بلا كلام واضح
logs=[];sttReply={ok:true,heard:"",lowConfidence:true,conf:{noSpeech:0.9}};
await turn(page);await page.waitForTimeout(400);
f=logs.filter(l=>l.qtype==='fail');
ok(f.length===1&&/^unclear/.test(String(f[0].response)),`وunclear كذلك (${f[0]&&f[0].response})`);
ok(f[0]&&/noSpeech/.test(String(f[0].response)),'ومعه دليل من Whisper نفسه لا تخميننا');
sttReply={ok:true,heard:"I need a dress for my sister"};

console.log('\n٣) الخروج من جلسةٍ فيها كلام يمرّ على الخلاصة');
page=await mk('elias.html');
await openShop(page);
await turn(page);await page.waitForTimeout(500);
ok(await page.evaluate(()=>coachMsgs.filter(m=>m.role==='user').length)===1,'جملة واحدة قيلت');
await page.click('button[onclick="coachLeave()"]');
await page.waitForTimeout(700);
ok(await page.evaluate(()=>mode)==='coach','لا يخرج إلى الرئيسية');
ok(await page.evaluate(()=>coachDone)===true,'بل يرى الخلاصة');
ok((await page.textContent('#app')).includes('please'),'ومعها تصحيح ما قاله');
// ومن الخلاصة يخرج بلا اعتراض
await page.evaluate(()=>coachLeave());
await page.waitForTimeout(300);
ok(await page.evaluate(()=>mode)==='home','ومن الخلاصة يخرج');

console.log('\n٣ب) ومن لم يتكلّم يخرج بلا اعتراض — لا نحبس من لا شيء لديه');
page=await mk('elias.html');
await openShop(page);
await page.click('button[onclick="coachLeave()"]');
await page.waitForTimeout(300);
ok(await page.evaluate(()=>mode)==='home','خرج مباشرةً');

console.log('\n٤) المراجعة الصامتة عند الجملة الرابعة — فلا يضيع ما قيل بالخروج');
page=await mk('elias.html');
await page.evaluate(()=>{try{lsDel('mawhiba_coach_fix_v1')}catch(e){}});
logs=[];calls=[];
await openShop(page);
for(let i=0;i<3;i++){await turn(page);await page.waitForTimeout(350)}
ok(logs.filter(l=>l.qtype==='autoreview').length===0,'ولا مراجعة صامتة بعد');
await turn(page);await page.waitForTimeout(900);
ok(await page.evaluate(()=>coachMsgs.filter(m=>m.role==='user').length)===4,'وعند الرابعة');
const ar=logs.filter(l=>l.qtype==='autoreview');
ok(ar.length===1,`تجري المراجعة صامتةً (${ar.length})`);
ok(ar[0]&&ar[0].is_correct===true&&/fixes:1/.test(String(ar[0].response)),`ونتيجتها مُسجَّلة (${ar[0]&&ar[0].response})`);
ok(ar[0]&&/lt:1\/0/.test(String(ar[0].q_text)),'ومعها حكم LanguageTool');
// مفتاح إلياس مسبوق باسمه (pkey) — يُقرأ بـlsGet لا بالاسم الخام
const cards=await page.evaluate(()=>Object.keys(JSON.parse(lsGet('mawhiba_coach_fix_v1')||'{}')).length);
ok(cards===1,`والبطاقة محفوظة قبل أن يخرج (${cards})`);
ok(await page.evaluate(()=>coachDone)===false,'والحديث لم يتوقّف — الصامتة لا تُقاطع');
// ولا تتكرّر في الجلسة نفسها
logs=[];
await turn(page);await page.waitForTimeout(700);
ok(logs.filter(l=>l.qtype==='autoreview').length===0,'ولا تتكرّر في الجلسة نفسها');
// وجلسة جديدة تُعيد تسليحها
await page.evaluate(()=>startCoach());
ok(await page.evaluate(()=>coachAutoReviewed)===false,'وجلسة جديدة تُعيد تسليحها');

console.log('\n٥) لا انحدار');
page=await mk('index.html');
for(const [fn,md] of [["startCoach()",'coach'],["startDictation()",'dictation'],
  ["startEngPlan()",'engplan'],["startBasics('subborrow')",'basics'],["home()",'home']]){
  const r=await page.evaluate(x=>{try{eval(x);return{m:mode}}catch(e){return{err:e.message}}},fn);
  ok(!r.err&&r.m===md,`${fn} → ${r.err||r.m}`);
}
ok((await page.evaluate(()=>censusMissing())).length===0,'وكل الدوال معرَّفة');
ok((await page.evaluate(()=>window.__ERRS.length))===0,'ولا خطأ');

console.log('\n'+(fails?`=== ${fails} فشل ===`:'=== كل الاختبارات نجحت ==='));
await b.close();process.exit(fails?1:0);
})();
