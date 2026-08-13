const {chromium}=require('/opt/node22/lib/node_modules/playwright');
let fails=0;const ok=(c,m)=>{console.log((c?'  ✓ ':'  ✗ FAIL ')+m);if(!c)fails++};
(async()=>{
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium',
  args:['--use-fake-device-for-media-stream','--use-fake-ui-for-media-stream']});
const ctx=await b.newContext({viewport:{width:420,height:900},permissions:['microphone']});
const logs=[];let calls=[];
let heardText="I had dust";
let chat={ok:true,reply:"Nice.\nSAY: I had toast. | I ate eggs."};
let review={ok:true,reply:"NONE"},reviewFail=false;
const mk=async()=>{
  const page=await ctx.newPage();
  page.on('pageerror',e=>{console.log('  ✗ PAGEERROR '+e.message);fails++});
  await page.route('**/rest/v1/**',async r=>{
    let x={};try{x=JSON.parse(r.request().postData()||'{}')}catch(e){}
    logs.push(x);r.fulfill({status:201,contentType:'application/json',body:'[]'});
  });
  await page.route('**/functions/v1/assess-pronunciation-groq',r=>
    r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({ok:true,heard:heardText})}));
  await page.route('**/functions/v1/assess-azure',r=>
    r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({ok:true,noAssessment:true,nbestKeys:[],hasWords:0,raw:"{}"})}));
  await page.route('**/functions/v1/tutor',async r=>{
    let x={};try{x=JSON.parse(r.request().postData()||'{}')}catch(e){}
    calls.push(x);
    if(x.mode==='review'){if(reviewFail)return r.abort();
      return r.fulfill({status:200,contentType:'application/json',body:JSON.stringify(review)})}
    r.fulfill({status:200,contentType:'application/json',body:JSON.stringify(chat)});
  });
  await page.addInitScript(()=>{
    Object.defineProperty(window,'speechSynthesis',{configurable:true,value:{speak(){},cancel(){},resume(){},pause(){},
      getVoices:()=>[{lang:'en-US',name:'X'}],speaking:false,pending:false}});
    window.SpeechSynthesisUtterance=function(t){this.text=t};
  });
  await page.goto('http://127.0.0.1:8931/index.html');
  await page.waitForFunction(()=>typeof snapToSuggestion==='function');
  return page;
};
const turn=page=>page.evaluate(()=>{coachElapsed=2.5;
  wavInRate=16000;wavBuf=[(function(){const n=16000,f=new Float32Array(n);
    for(let i=0;i<n;i++)f[i]=0.4*Math.sin(2*Math.PI*220*i/16000);return f})()];
  coachChunks=[new Blob(["x"],{type:"audio/webm"})];
  coachRec={mimeType:"audio/webm",state:"inactive"};coachBusy=true;return coachFinish()});

let page=await mk();

console.log('\n١) التثبيت على الجملة المقترحة عند تقارب الحروف');
const S=await page.evaluate(()=>{
  const says=["I had toast.","I ate eggs."];
  return{
    dust:snapToSuggestion("I had dust",says),
    exact:snapToSuggestion("I had toast.",says),
    eggs:snapToSuggestion("I ate eggs",says),
    far:snapToSuggestion("I went to the shop yesterday",says),
    other:snapToSuggestion("I like cake very much",says),
    short:snapToSuggestion("Yes",["Yes it is.","No it is not."]),
    none:snapToSuggestion("I had dust",[]),
  };
});
ok(S.dust==='I had toast.',`«I had dust» ⇐ «${S.dust}» — الحالة التي وقعت فعلاً`);
ok(S.exact===null,'والمطابق تماماً لا يُثبَّت (لا شيء يتغيّر)');
ok(S.eggs==='I ate eggs.','وفرقُ النقطة يُثبَّت');
ok(S.far===null,'وجملة بعيدة لا تُثبَّت');
ok(S.other===null,'وكلامٌ آخر يبقى كما هو — لا نضع في فمها ما لم تقله');
ok(S.short===null,'والجمل القصيرة جداً لا تُثبَّت — «Yes» و«No» تتشابهان بلا معنى');
ok(S.none===null,'وبلا اقتراحات لا تثبيت');

console.log('\n٢) والنسبة تُقيَّد: ثلاثة أحرف في جملة قصيرة كثير');
const R=await page.evaluate(()=>({
  ten:snapToSuggestion("I like cak",["I like cake."]),      // حرف واحد في ١٢
  big:snapToSuggestion("I lk cak vry much",["I like cake very much."]),
}));
ok(R.ten==='I like cake.','حرف واحد يُثبَّت');
ok(R.big===null,'وأربعة أحرف لا تُثبَّت مهما طالت الجملة');

console.log('\n٣) في الجلسة: يُعرض المثبَّت، ويُسجَّل الخام معه');
await page.evaluate(()=>{startCoach();coachPick(0);coachMode('suggest')});
await page.waitForTimeout(300);
heardText="I would like a hot chocolate, please."; // الدور الأول: اقتراحات الافتتاح
await turn(page);
await page.waitForTimeout(400);
logs.length=0;heardText="I had dust";
await turn(page);
await page.waitForTimeout(400);
const say=logs.filter(l=>l.qtype==='say').slice(-1)[0]||{};
ok(say.response==='I had toast.',`المعروض والمُسجَّل «${say.response}»`);
ok(String(say.q_text||'').includes('I had dust'),`والخام محفوظ معه: «${say.q_text}»`);
ok((await page.textContent('#app')).includes('I had toast.'),'وهو ما يظهر لها على الشاشة');
ok(!(await page.textContent('#app')).includes('I had dust'),'ولا يظهر ما سُمع خطأً');

console.log('\n٤) وما لا يُثبَّت يُسجَّل بلا خام');
logs.length=0;heardText="I went to the park with my sister";
await turn(page);await page.waitForTimeout(400);
const s2=logs.filter(l=>l.qtype==='say').slice(-1)[0]||{};
ok(s2.response.includes('park'),'كلامها كما سُمع');
ok(!s2.q_text,'وبلا حقل خام — لا تثبيت وقع');

console.log('\n٥) نتيجة المراجعة تُسجَّل دائماً: none');
page=await mk();
await page.evaluate(()=>{startCoach();coachPick(0);coachMode('solo');
  coachMsgs=[{role:"user",text:"I went to the beach.",pct:95,weak:[]}]});
await page.waitForTimeout(150);logs.length=0;
await page.click('button[onclick="coachEnd()"]');
await page.waitForTimeout(700);
let rv=logs.filter(l=>l.qtype==='review')[0]||{};
ok(rv.response==='none',`«${rv.response}» — لا خطأ عندها، لا فشلٌ عندنا`);
ok(rv.is_correct===true,'والمراجعة نجحت');
ok(String(rv.q_text||'').indexOf('said:1')===0,`ومعها عدد جملها وحكم LanguageTool («${rv.q_text}»)`);

console.log('\n٦) وfixes حين تُصحَّح');
review={ok:true,reply:"FIX: I go | I went. | الماضي\nFIX: I like cake | I like cake. | نقطة"};
page=await mk();
await page.evaluate(()=>{startCoach();coachPick(0);coachMode('solo');
  coachMsgs=[{role:"user",text:"I go",pct:80,weak:[]},{role:"user",text:"I like cake",pct:80,weak:[]}]});
await page.waitForTimeout(150);logs.length=0;
await page.click('button[onclick="coachEnd()"]');
await page.waitForTimeout(700);
rv=logs.filter(l=>l.qtype==='review')[0]||{};
ok(rv.response==='fixes:2',`«${rv.response}»`);
ok(rv.srs_box===2,'والعدد في حقله');
ok(logs.filter(l=>l.qtype==='fix').length===2,'ومعها سطرا التصحيح');

console.log('\n٧) وfail حين يتعذّر — فأعرف الفرق');
reviewFail=true;
page=await mk();
await page.evaluate(()=>{startCoach();coachPick(0);coachMode('solo');
  coachMsgs=[{role:"user",text:"I go",pct:80,weak:[]}]});
await page.waitForTimeout(150);logs.length=0;
await page.click('button[onclick="coachEnd()"]');
await page.waitForTimeout(900);
rv=logs.filter(l=>l.qtype==='review')[0]||{};
ok(String(rv.response||'').indexOf('fail:')===0,`«${rv.response}»`);
ok(rv.is_correct===false,'وتُسجَّل فشلاً');
reviewFail=false;

console.log('\n٨) لا انحدار');
for(const [fn,md] of [["startBasics('pimul')",'basics'],["startEngPlan()",'engplan'],["startFade('seq')",'fade'],
  ["startDictation()",'dictation'],["startCoach()",'coach'],["home()",'home']]){
  const r=await page.evaluate(x=>{try{eval(x);return{m:mode}}catch(e){return{err:e.message}}},fn);
  ok(!r.err&&r.m===md,`${fn} → ${r.err||r.m}`);
}
ok((await page.evaluate(()=>censusMissing())).length===0,'وكل الدوال معرَّفة');
ok((await page.evaluate(()=>window.__ERRS.length))===0,'ولا خطأ');

await b.close();
console.log(fails?`\n=== ${fails} فشل ===`:'\n=== كل الاختبارات نجحت ===');
process.exit(fails?1:0);
})();
