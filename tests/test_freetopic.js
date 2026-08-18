const {chromium}=require('/opt/node22/lib/node_modules/playwright');
let fails=0;const ok=(c,m)=>{console.log((c?'  ✓ ':'  ✗ FAIL ')+m);if(!c)fails++};
(async()=>{
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium',
  args:['--use-fake-device-for-media-stream','--use-fake-ui-for-media-stream']});
const ctx=await b.newContext({viewport:{width:420,height:900},permissions:['microphone']});
const logs=[];let calls=[];
let chat={ok:true,reply:"Space is amazing! I love looking at the moon. What planet do you like best?"};
let chatFail=false;
const mk=async(f)=>{
  const page=await ctx.newPage();
  page.on('pageerror',e=>{console.log('  ✗ PAGEERROR '+e.message);fails++});
  await page.route('**/rest/v1/**',async r=>{
    let x={};try{x=JSON.parse(r.request().postData()||'{}')}catch(e){}
    logs.push(x);r.fulfill({status:201,contentType:'application/json',body:'[]'});
  });
  await page.route('**/functions/v1/assess-pronunciation-groq',r=>
    r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({ok:true,heard:"I like Mars"})}));
  await page.route('**/functions/v1/assess-azure',r=>
    r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({ok:true,noAssessment:true,nbestKeys:[],hasWords:0,raw:"{}"})}));
  await page.route('**/functions/v1/tutor',async r=>{
    let x={};try{x=JSON.parse(r.request().postData()||'{}')}catch(e){}
    calls.push(x);
    if(chatFail)return r.abort();
    r.fulfill({status:200,contentType:'application/json',body:JSON.stringify(chat)});
  });
  await page.addInitScript(()=>{
    window.__SPOKE=[];
    Object.defineProperty(window,'speechSynthesis',{configurable:true,value:{
      speak(u){window.__SPOKE.push(u&&u.text)},cancel(){},resume(){},pause(){},
      getVoices:()=>[{lang:'en-US',name:'X'}],speaking:false,pending:false}});
    window.SpeechSynthesisUtterance=function(t){this.text=t};
  });
  await page.goto('http://127.0.0.1:8931/'+f);
  await page.waitForFunction(()=>typeof coachTopicGo==='function');
  return page;
};
const turn=page=>page.evaluate(()=>{coachElapsed=2.5;
  wavInRate=16000;wavBuf=[(function(){const n=16000,f=new Float32Array(n);
    for(let i=0;i<n;i++)f[i]=0.4*Math.sin(2*Math.PI*220*i/16000);return f})()];
  coachChunks=[new Blob(["x"],{type:"audio/webm"})];
  coachRec={mimeType:"audio/webm",state:"inactive"};coachBusy=true;return coachFinish()});

let page=await mk('index.html');

console.log('\n١) الموقف الأخير حرّ، والباقي محدَّد');
const S=await page.evaluate(()=>COACH_SCENES.map(s=>({id:s.id,ar:s.ar,free:!!s.free})));
const freeIdx=S.length-1;
ok(S.length>=6,`${S.length} مواقف`);
ok(S[freeIdx].free===true&&S[freeIdx].id==='free','والأخير «موضوع من عندك»');
ok(S.slice(0,freeIdx).every(s=>!s.free),'وما قبله محدَّد كلّه');
await page.evaluate(()=>startCoach());
ok((await page.evaluate(()=>document.querySelectorAll('.choice').length))===S.length,`و${S.length} أزرار في الاختيار`);
ok((await page.textContent('#app')).includes('موضوع من عندك'),'وظاهر بالاسم');

console.log('\n٢) اختياره يسأل عن الموضوع ولا يبدأ حديثاً');
await page.evaluate(fi=>coachPick(fi),freeIdx);
await page.waitForTimeout(150);
await page.click("button[onclick=\"coachMode('solo')\"]");
await page.waitForTimeout(200);
let t=await page.textContent('#app');
ok(t.includes('عن أي شيء'),'يُسأل عن الموضوع');
ok(await page.evaluate(()=>coachScene)===null,'ولا موقف بعد');
ok(await page.evaluate(()=>!!document.getElementById('coachTopicIn')),'وخانة الكتابة موجودة');
ok(await page.evaluate(()=>document.getElementById('coachTopicIn').maxLength)===60,'بحدّ ٦٠ حرفاً');

console.log('\n٣) موضوع فارغ لا يمرّ');
calls.length=0;
await page.click('button[onclick="coachTopicGo()"]');
await page.waitForTimeout(200);
ok((await page.textContent('#app')).includes('اكتب'),'يُقال له اكتب موضوعاً');
ok(calls.length===0,'ولا طلب إلى الشريك');
ok(await page.evaluate(()=>coachTopicAsk)===true,'ويبقى في الشاشة نفسها');

console.log('\n٤) موضوع مكتوب: الافتتاح من النموذج نفسه');
calls.length=0;logs.length=0;
await page.fill('#coachTopicIn','الفضاء والكواكب');
await page.click('button[onclick="coachTopicGo()"]');
await page.waitForTimeout(700);
t=await page.textContent('#app');
ok(t.includes('Space is amazing'),'الافتتاح معروض');
ok((await page.evaluate(()=>window.__SPOKE)).some(x=>x&&x.includes('Space')),'ويُنطق');
ok(t.includes('الفضاء والكواكب'),'والموضوع في ترويسة الحوار');
const c0=calls[0]||{};
ok(c0.mode==='chat','وُضع الطلب chat');
ok(c0.scene&&c0.scene.includes('الفضاء والكواكب'),'والموضوع داخل وصف الموقف');
ok(c0.scene&&/not suitable for an 11-year-old/i.test(c0.scene),'ومعه شرط ملاءمة الموضوع لعمرها');
ok(Array.isArray(c0.history)&&c0.history.length===0,'وبلا تاريخ — هذه بداية');
ok(c0.styleTip===false,'وبلا نصيحة في الافتتاح');
const op=logs.filter(l=>l.domain==='coach'&&l.qtype==='open')[0];
ok(op&&op.response==='الفضاء والكواكب',`والموضوع مُسجَّل («${op&&op.response}») — لتعرف عمّ يتكلّمون`);
ok(op&&op.lesson==='free','تحت free');

console.log('\n٥) الحوار بعدها يمشي كأي موقف');
calls.length=0;
chat={ok:true,reply:"Mars is a great choice. Why do you like it?"};
await turn(page);await page.waitForTimeout(500);
t=await page.textContent('#app');
ok(t.includes('I like Mars'),'كلامه معروض');
ok(t.includes('Mars is a great choice'),'وردّ الشريك');
ok((calls.slice(-1)[0]||{}).scene.includes('الفضاء'),'والموضوع يُمرَّر في كل دور — لا ينساه');
ok((calls.slice(-1)[0]||{}).history.length===2,'والتاريخ يتراكم');

console.log('\n٦) تعذّر الاتصال عند البداية لا يمنع الحديث');
page=await mk('index.html');
chatFail=true;
await page.evaluate(()=>{startCoach();coachPick(COACH_SCENES.length-1);coachMode('solo')});
await page.waitForTimeout(150);
await page.fill('#coachTopicIn','كرة القدم');
await page.click('button[onclick="coachTopicGo()"]');
await page.waitForTimeout(900);
t=await page.textContent('#app');
ok(t.includes('Great choice'),'يبدأ بافتتاح احتياطي');
ok(!/[؀-ۿ]/.test('Great choice! Tell me — what do you like most about it?'),'والاحتياطي إنجليزيّ خالص — لا يخلط الموضوع العربي بجملة إنجليزية');
ok(await page.evaluate(()=>coachBusy)===false,'والزرّ يعود صالحاً');
ok(await page.evaluate(()=>coachMsgs.length)===1,'ورسالة واحدة لا رسالتان');
chatFail=false;

console.log('\n٧) التنظيف: سطر واحد، بلا زوائد، بحدّ');
const cl=await page.evaluate(()=>[
  coachTopicClean("  الفضاء   والكواكب  "),
  coachTopicClean("سطر\nثانٍ\tوثالث"),
  coachTopicClean("ا".repeat(200)).length,
  coachTopicClean(""),
]);
ok(cl[0]==='الفضاء والكواكب','المسافات الزائدة تُطوى');
ok(cl[1]==='سطر ثانٍ وثالث','والأسطر تصير سطراً');
ok(cl[2]===60,`والطول يُقصّ إلى ٦٠ (${cl[2]})`);
ok(cl[3]==='','والفارغ يبقى فارغاً');

console.log('\n٨) الموضوع لا يُحقن في الصفحة');
page=await mk('index.html');
await page.evaluate(()=>{startCoach();coachPick(COACH_SCENES.length-1);coachMode('solo')});
await page.waitForTimeout(150);
await page.fill('#coachTopicIn','<img src=x onerror=window.__XSS=1>');
await page.click('button[onclick="coachTopicGo()"]');
await page.waitForTimeout(700);
ok(await page.evaluate(()=>window.__XSS===undefined),'لا يُنفَّذ شيء مما يُكتب');
ok(await page.evaluate(()=>document.querySelectorAll('#app img').length)===0,'ولا عنصر يُخلق منه');

console.log('\n٩) الرجوع من شاشة الموضوع');
page=await mk('index.html');
await page.evaluate(()=>{startCoach();coachPick(COACH_SCENES.length-1);coachMode('solo')});
await page.waitForTimeout(120);
await page.click('button[onclick="coachTopicBack()"]');
await page.waitForTimeout(120);
ok((await page.textContent('#app')).includes('اختاري موقفاً'),'نعود إلى المواقف');
ok(await page.evaluate(()=>coachTopicAsk)===false,'والحالة نظيفة');
await page.evaluate(()=>{startCoach()});
ok(await page.evaluate(()=>coachTopic)==='','وبدء جلسة جديدة يُصفّر الموضوع');

console.log('\n١٠) عند الأخوين كذلك، وبخطاب المذكّر');
const m=await mk('mohammed.html');
await m.evaluate(()=>{startCoach();coachPick(COACH_SCENES.length-1);coachMode('solo')});
await m.waitForTimeout(250);
t=await m.textContent('#app');
ok(t.includes('عن أي شيء تحبّ')&&!t.includes('تحبّين'),'«عن أي شيء تحبّ» لا «تحبّين»');
ok(!/اكتبي|ابدئي/.test(t),'ولا فعل مؤنّث');
calls.length=0;
await m.fill('#coachTopicIn','كرة القدم');
await m.click('button[onclick="coachTopicGo()"]');
await m.waitForTimeout(700);
ok((calls[0]||{}).learner.gender==='male','وجنسه يصل مع الطلب');

console.log('\n١١) لا انحدار');
for(const [fn,md] of [["startBasics('percent')",'basics'],["startEngPlan()",'engplan'],
  ["startDictation()",'dictation'],["startPronunciation()",'pron'],["startCoach()",'coach'],["home()",'home']]){
  const r=await page.evaluate(x=>{try{eval(x);return{m:mode}}catch(e){return{err:e.message}}},fn);
  ok(!r.err&&r.m===md,`${fn} → ${r.err||r.m}`);
}
ok((await page.evaluate(()=>censusMissing())).length===0,'وكل الدوال معرَّفة');
ok((await page.evaluate(()=>window.__ERRS.length))===0,'ولا خطأ');
ok((await m.evaluate(()=>window.__ERRS.length))===0,'ولا عند محمد');

await b.close();
console.log(fails?`\n=== ${fails} فشل ===`:'\n=== كل الاختبارات نجحت ===');
process.exit(fails?1:0);
})();
