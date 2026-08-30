const {chromium}=require('/opt/node22/lib/node_modules/playwright');
let fails=0;const ok=(c,m)=>{console.log((c?'  ✓ ':'  ✗ FAIL ')+m);if(!c)fails++};
(async()=>{
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium',
  args:['--use-fake-device-for-media-stream','--use-fake-ui-for-media-stream']});
const ctx=await b.newContext({viewport:{width:420,height:900},permissions:['microphone']});
const logs=[];let calls=[];
let chat={ok:true,reply:"A hot chocolate is a great choice. Would you like a small or a big one?\nSAY: I would like a big one, please. | A small one, please."};
const mk=async(f)=>{
  const page=await ctx.newPage();
  page.on('pageerror',e=>{console.log('  ✗ PAGEERROR '+e.message);fails++});
  await page.route('**/rest/v1/**',async r=>{
    let x={};try{x=JSON.parse(r.request().postData()||'{}')}catch(e){}
    logs.push(x);r.fulfill({status:201,contentType:'application/json',body:'[]'});
  });
  await page.route('**/functions/v1/assess-pronunciation-groq',r=>
    r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({ok:true,heard:"I want a hot chocolate"})}));
  await page.route('**/functions/v1/assess-azure',r=>
    r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({ok:true,noAssessment:true,nbestKeys:[],hasWords:0,raw:"{}"})}));
  await page.route('**/functions/v1/tutor',async r=>{
    let x={};try{x=JSON.parse(r.request().postData()||'{}')}catch(e){}
    calls.push(x);r.fulfill({status:200,contentType:'application/json',body:JSON.stringify(chat)});
  });
  await page.addInitScript(()=>{
    window.__SPOKE=[];
    Object.defineProperty(window,'speechSynthesis',{configurable:true,value:{
      speak(u){window.__SPOKE.push(u&&u.text)},cancel(){},resume(){},pause(){},
      getVoices:()=>[{lang:'en-US',name:'X'}],speaking:false,pending:false}});
    window.SpeechSynthesisUtterance=function(t){this.text=t};
  });
  await page.goto('http://127.0.0.1:8931/'+f);
  await page.waitForFunction(()=>typeof coachMode==='function');
  return page;
};
const turn=page=>page.evaluate(()=>{coachElapsed=2.5;
  wavInRate=16000;wavBuf=[(function(){const n=16000,f=new Float32Array(n);
    for(let i=0;i<n;i++)f[i]=0.4*Math.sin(2*Math.PI*220*i/16000);return f})()];
  coachChunks=[new Blob(["x"],{type:"audio/webm"})];
  coachRec={mimeType:"audio/webm",state:"inactive"};coachBusy=true;return coachFinish()});

let page=await mk('index.html');

console.log('\n١) بعد اختيار الموقف يُسأل: وحدك أم بجمل؟');
await page.evaluate(()=>{startCoach();coachPick(0)});
await page.waitForTimeout(200);
let t=await page.textContent('#app');
ok(t.includes('كيف تحبّين أن تبدئي'),'يُسأل قبل أن يبدأ الحديث');
ok(t.includes('أعطيني جملاً')&&t.includes('أتكلّم وحدي'),'والخياران');
ok(await page.evaluate(()=>coachScene)===null,'ولا موقف بدأ بعد');
ok(t.includes('في المقهى'),'واسم الموقف المختار ظاهر');

console.log('\n٢) هيا مسلَّحة ببوّابة الصدى: الجملة تُبنى قبل أن تُعطى');
logs.length=0;
await page.click("button[onclick=\"coachMode('suggest')\"]");
await page.waitForTimeout(500);
t=await page.textContent('#app');
ok(t.includes('Sunny Café'),'الافتتاح بدأ');
ok(await page.evaluate(()=>echoArmed()),'والبوّابة مسلَّحة — قياسها ٤ أصداء من ١٥');
ok(t.includes('ابني الجملة من كلماتها'),'فالجملة لا تُعطى جاهزة');
ok(!t.includes('جمل تصلح جواباً'),'ولا تُعرض الجمل بعد');
// بوّابة التسرّع على بنك الكلمات (٣٠ أغسطس) تحجب الكلمات أربع ثوانٍ. والاختبار هنا عن
// بوّابة الصدى لا عن بوّابة التسرّع — ولها اختبارها في `test_fixes_0830` — فتُقدَّم
// الساعة بدل انتظارٍ حقيقي. **والبوّابة نفسها لا تُضعَّف لأجل اختبار.**
ok(await page.evaluate(()=>!gateOpen()),'والكلمات محجوبةٌ أوّلاً — بوّابة التسرّع مسلَّحة');
await page.evaluate(()=>{gateLeft=0;gateStop();render()});
ok(await page.evaluate(()=>document.querySelectorAll('#app button[onclick^="wbPick"]').length)>0,'وبنك الكلمات معروض');
await page.waitForTimeout(400);
// تُستثنى نغمة التهيئة (" ") التي يُرسلها التطبيق أول لمسة لفكّ صوت الآيفون
let sp=await page.evaluate(()=>window.__SPOKE.filter(x=>x&&x.trim()));
ok(sp.length===1&&sp[0].includes('Sunny'),`ولا يُنطق إلا الافتتاح (${JSON.stringify(sp)})`);
// تبنيها بالضغط الحقيقي على الكلمات، فتظهر الجمل جاهزةً بعدها
await page.evaluate(()=>{
  for(const tk of wbTok){const i=wbPool.findIndex((w,k)=>w===tk&&wbPicked.indexOf(k)<0);
    const btn=document.querySelector(`button[onclick="wbPick(${i})"]`);if(btn)btn.click()}
});
await page.click('button[onclick="coachBankCheck()"]');
await page.waitForTimeout(300);
t=await page.textContent('#app');
ok(await page.evaluate(()=>wbOk),'الترتيب الصحيح يُقبل');
ok(await page.evaluate(()=>document.querySelectorAll('#app button[onclick^="coachSay"]').length)>=2,'وبعده تظهر الجملتان');
const first=await page.evaluate(()=>coachSaysNow()[0]);
// أزرار coachSay في الفقاعات كذلك (إعادة سماع كلام الشريك) — فنقصد زرّ الجملة بنصّها
await page.click(`button:has-text(${JSON.stringify(first)})`);
await page.waitForTimeout(250);
sp=await page.evaluate(()=>window.__SPOKE.filter(x=>x&&x.trim()));
ok(sp.some(x=>x.indexOf(first)>=0||first.indexOf(x)>=0),`والضغط يُسمعها («${first}» · ${JSON.stringify(sp)})`);
ok(logs.some(l=>String(l.qtype||'').indexOf('build')===0),'وبناؤها مُسجَّل — لتُقاس فائدة البنك');
const op=logs.filter(l=>l.qtype==='open')[0];
ok(op&&op.q_text==='help:suggest',`والاختيار مُسجَّل (${op&&op.q_text})`);

console.log('\n٢ب) ومن لا يَنسخ تُعطى له الجملة جاهزة كما كانت');
{
  // سياق مستقلّ: التخزين المحلّي مشترك بين صفحات السياق الواحد، وإطفاء البوّابة هنا
  // كان يُطفئها على بقيّة الاختبار — وهذا ما كشفه الفشل أوّل مرّة
  const ctx2=await b.newContext({viewport:{width:420,height:900},permissions:['microphone']});
  const free=await ctx2.newPage();
  free.on('pageerror',e=>{console.log('  ✗ PAGEERROR '+e.message);fails++});
  await free.route('**/rest/v1/**',r=>r.fulfill({status:201,contentType:'application/json',body:'[]'}));
  await free.route('**/functions/v1/tutor',r=>
    r.fulfill({status:200,contentType:'application/json',body:JSON.stringify(chat)}));
  await free.addInitScript(()=>{
    Object.defineProperty(window,'speechSynthesis',{configurable:true,value:{speak(){},cancel(){},resume(){},pause(){},
      getVoices:()=>[{lang:'en-US',name:'X'}],speaking:false,pending:false}});
    window.SpeechSynthesisUtterance=function(t){this.text=t};
  });
  await free.goto('http://127.0.0.1:8931/index.html');
  await free.waitForFunction(()=>typeof coachMode==='function');
  await free.evaluate(()=>{try{localStorage.setItem('mawhiba_echo_v1',JSON.stringify({r:[0,0,0,0]}))}catch(e){}});
  await free.evaluate(()=>{startCoach();coachPick(0)});
  await free.waitForTimeout(150);
  await free.click("button[onclick=\"coachMode('suggest')\"]");
  await free.waitForTimeout(600);
  const ft=await free.textContent('#app');
  ok(await free.evaluate(()=>echoArmed())===false,'بوّابته منحلّة');
  ok(ft.includes('جمل تصلح جواباً')&&!ft.includes('ابني الجملة من كلماتها'),'فالجمل جاهزة بلا بناء');
  await ctx2.close();
}

console.log('\n٣) المستوى يهبط مع الدعم: A1 وأسئلة سهلة');
calls.length=0;
await turn(page);await page.waitForTimeout(500);
const c=calls.slice(-1)[0]||{};
ok(c.level==='A1',`المستوى A1 (${c.level})`);
ok(c.easy===true,'وعلامة التسهيل');
ok(c.suggest===true,'وطلب الجمل');
t=await page.textContent('#app');
ok(t.includes('small or a big one'),'وردّ الشريك معروض');
ok(!t.includes('SAY:'),'ولا يظهر وسم SAY في كلامه');
ok(await page.evaluate(()=>coachMsgs.slice(-1)[0].text.indexOf('SAY')<0),'ولا يبقى في النصّ');
ok(await page.evaluate(()=>coachSaysNow()[0])==='I would like a big one, please.','والجمل الجديدة وصلت');
ok(await page.evaluate(()=>wbTarget)==='I would like a big one, please.','والبنك تحوّل إليها — لا يبقى على جملة الدور الماضي');
ok(!(await page.evaluate(()=>window.__SPOKE)).some(x=>x&&x.includes('big one, please')),'ولا تُنطق مع الردّ');

console.log('\n٤) وضع «وحدي»: بلا جمل، وزرّ ساعديني حاضر');
page=await mk('index.html');
await page.evaluate(()=>{startCoach();coachPick(0)});
await page.waitForTimeout(150);
await page.click("button[onclick=\"coachMode('solo')\"]");
await page.waitForTimeout(400);
t=await page.textContent('#app');
ok(!t.includes('جمل تصلح جواباً'),'لا جمل معروضة');
ok(t.includes('ساعديني بجملة'),'وزرّ المساعدة ظاهر');
calls.length=0;
await turn(page);await page.waitForTimeout(500);
// مستواها الحقيقي صار A1 (قياس ١٥ أغسطس)، وهو أصلاً قاع سلّم coachLevel — فوحدها
// تبقى عليه، ومع الدعم لا تهبط تحته (اختُبر في test_age.js)
ok((calls.slice(-1)[0]||{}).level==='A1','والمستوى يبقى A1 — وحدها بلا دعم');
ok((calls.slice(-1)[0]||{}).easy===false,'بلا تسهيل');
ok((calls.slice(-1)[0]||{}).suggest===true,'لكن الجمل تُطلب سرّاً — لتصل فوراً عند الضغط');

console.log('\n٥) الضغط على «ساعديني» يُظهرها في الحال ويُسهّل ما بعدها');
logs.length=0;
await page.click('button[onclick="coachAskHelp()"]');
await page.waitForTimeout(250);
t=await page.textContent('#app');
// هيا مسلَّحة، فالمساعدة تصل بنكاً لا جملةً جاهزة — والجملة هي جملة الدور الحالي
ok(t.includes('ابني الجملة من كلماتها'),'وصلت بلا انتظار دور جديد');
ok(await page.evaluate(()=>wbTarget)==='I would like a big one, please.','وهي جملة الدور الحالي');
ok(logs.some(l=>l.qtype==='help'),'والطلب مُسجَّل — لتُعرف الجلسات التي احتاجت دعماً');
calls.length=0;
await turn(page);await page.waitForTimeout(500);
ok((calls.slice(-1)[0]||{}).level==='A1','والمستوى هبط إلى A1 لبقيّة الجلسة');
ok(await page.evaluate(()=>coachHelp)==='suggest','ولا يعود إلى الصعب من نفسه');

console.log('\n٦) الفصل: الردّ والنصيحة والجمل ثلاثة أشياء لا شيء واحد');
const p=await page.evaluate(()=>coachParse(
  "Nice! I like tea too.\nTIP: You could say 'Could I have tea, please?'\nSAY: I like tea. | Tea, please."));
ok(p.text==='Nice! I like tea too.',`الكلام «${p.text}»`);
ok(p.tip.includes('Could I have tea'),'والنصيحة');
ok(p.says.length===2&&p.says[0]==='I like tea.','والجملتان');
const p2=await page.evaluate(()=>coachParse("Just a reply."));
ok(p2.text==='Just a reply.'&&p2.tip===''&&p2.says.length===0,'وردٌّ بلا ملحقات يبقى كما هو');
const p3=await page.evaluate(()=>coachParse("Hi.\nSAY: A. | B. | C. | D."));
ok(p3.says.length===3,'وأكثر من ثلاث جمل تُقصّ إلى ثلاث');

console.log('\n٦ب) الدورَان السابقان كانا تأليفاً لا صدى — فانحلّت البوّابة من نفسها');
ok(await page.evaluate(()=>echoArmed())===false,'جوابان من عندها ⇒ لا بنك بعدها');

console.log('\n٧) الموقف الحرّ يسأل عن الطريقة قبل الموضوع');
page=await mk('index.html');
// نُسلّح البوّابة صراحةً: الغرض إثبات أنها تتبع المتعلّم لا الموقف
await page.evaluate(()=>{try{localStorage.setItem('mawhiba_echo_v1',JSON.stringify({r:[1,1]}))}catch(e){}});
await page.evaluate(()=>{startCoach();coachPick(COACH_SCENES.length-1)});
await page.waitForTimeout(150);
ok((await page.textContent('#app')).includes('كيف تحبّين'),'الطريقة أولاً');
await page.click("button[onclick=\"coachMode('suggest')\"]");
await page.waitForTimeout(150);
ok((await page.textContent('#app')).includes('عن أي شيء'),'ثم الموضوع');
calls.length=0;
await page.fill('#coachTopicIn','الفضاء');
await page.click('button[onclick="coachTopicGo()"]');
await page.waitForTimeout(700);
ok((calls[0]||{}).level==='A1','والافتتاح نفسه يُطلب سهلاً');
ok((await page.textContent('#app')).includes('ابني الجملة من كلماتها'),'ومعه بنكه — البوّابة تتبع المتعلّم لا الموقف');

console.log('\n٨) جلسة جديدة تبدأ من الصفر');
await page.evaluate(()=>startCoach());
ok(await page.evaluate(()=>coachHelp)===''&&await page.evaluate(()=>coachHelpShown)===false,'الاختيار لا يُورَّث');
ok((await page.textContent('#app')).includes('اختاري موقفاً'),'ونعود للمواقف');

console.log('\n٩) عند محمد كذلك وبخطاب المذكّر');
const m=await mk('mohammed.html');
await m.evaluate(()=>{startCoach();coachPick(0)});
await m.waitForTimeout(250);
t=await m.textContent('#app');
ok(t.includes('كيف تحبّ أن تبدأ'),`«${(t.match(/كيف تحبّ[^؟]*/)||[''])[0]}»`);
ok(!/تحبّين|تبدئي|أعطيني|تسمعينها|تقولينها|تتكلّمين/.test(t),'بلا خطاب مؤنّث');
ok(t.includes('أعطني جملاً'),'و«أعطني» لا «أعطيني»');
await m.click("button[onclick=\"coachMode('solo')\"]");
await m.waitForTimeout(400);
ok((await m.textContent('#app')).includes('ساعدني بجملة'),'وزرّه «ساعدني»');

console.log('\n١٠) لا انحدار');
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
