const {chromium}=require('/opt/node22/lib/node_modules/playwright');
let fails=0;const ok=(c,m)=>{console.log((c?'  ✓ ':'  ✗ FAIL ')+m);if(!c)fails++};
(async()=>{
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium',
  args:['--use-fake-device-for-media-stream','--use-fake-ui-for-media-stream','--autoplay-policy=no-user-gesture-required']});
const logs=[];let stt={ok:true,heard:"I want a hot chocolate please"},az=null,chat={ok:true,reply:"Great choice! Would you like it with milk?"},spoken=[];
const mk=async()=>{
  const page=await b.newPage({viewport:{width:420,height:900},permissions:['microphone']});
  page.on('pageerror',e=>{console.log('  ✗ PAGEERROR '+e.message);fails++});
  await page.route('**/rest/v1/**',async r=>{
    let x={};try{x=JSON.parse(r.request().postData()||'{}')}catch(e){}
    logs.push(x);r.fulfill({status:201,contentType:'application/json',body:'[]'});
  });
  await page.route('**/functions/v1/assess-pronunciation-groq',r=>
    r.fulfill({status:200,contentType:'application/json',body:JSON.stringify(stt)}));
  await page.route('**/functions/v1/assess-azure',r=>
    r.fulfill({status:200,contentType:'application/json',body:JSON.stringify(az||{ok:true,noAssessment:true,nbestKeys:[],hasWords:0,raw:"{}"})}));
  await page.route('**/functions/v1/tutor',async r=>{
    let x={};try{x=JSON.parse(r.request().postData()||'{}')}catch(e){}
    logs.push({__tutor:x});r.fulfill({status:200,contentType:'application/json',body:JSON.stringify(chat)});
  });
  await page.addInitScript(()=>{
    window.__SPOKE=[];
    Object.defineProperty(window,'speechSynthesis',{configurable:true,value:{
      speak(u){window.__SPOKE.push(u&&u.text)},cancel(){},resume(){},pause(){},
      getVoices:()=>[{lang:'en-US',name:'X'}],speaking:false,pending:false}});
    window.SpeechSynthesisUtterance=function(t){this.text=t};
  });
  await page.goto('http://127.0.0.1:8931/index.html');
  await page.waitForFunction(()=>typeof startCoach==='function');
  return page;
};
// جولة كاملة بلا ميكروفون حقيقي: نُشغّل المسار من coachFinish مباشرةً
const turn=page=>page.evaluate(()=>{coachElapsed=2.5;
  // مأخذ Azure يحتاج موجة حقيقية: بلا هذا يعود wav_empty ولا يُنادى التقييم أصلاً
  wavInRate=16000;wavBuf=[(function(){const n=16000,f=new Float32Array(n);
    for(let i=0;i<n;i++)f[i]=0.4*Math.sin(2*Math.PI*220*i/16000);return f})()];
coachChunks=[new Blob(["x"],{type:"audio/webm"})];
  coachRec={mimeType:"audio/webm",state:"inactive"};coachBusy=true;return coachFinish()});

let page=await mk();

console.log('\n١) المواقف بيانات، ومكتملة');
const scenes=await page.evaluate(()=>COACH_SCENES.filter(s=>!s.free).map(s=>({id:s.id,ar:!!s.ar,en:s.en.length,op:s.opener.length,
  opEn:!/[\u0600-\u06FF]/.test(s.opener)&&/[a-z]/i.test(s.opener)})));
ok(scenes.length>=6,`${scenes.length} مواقف مكتوبة`);
scenes.forEach(s=>ok(s.ar&&s.en>20&&s.op>10&&s.opEn,`${s.id}: عربيّ للعرض، ووصف وافتتاح بالإنجليزية`));
// والموقف الحرّ يُبنى عند الكتابة لا قبلها
const fr=await page.evaluate(()=>{const b=coachFreeScene("space");return{en:b.en.length,fo:b.focus.length,op:b.opener.length}});
ok(fr.en>60&&fr.fo>60&&fr.op>10,'والحرّ يُبنى من الموضوع حين يُكتب');

console.log('\n٢) الاختيار يبدأ الحديث وينطق الافتتاح');
await page.evaluate(()=>startCoach());
ok((await page.textContent('#app')).includes('اختاري موقفاً'),'شاشة الاختيار');
ok(await page.evaluate(()=>document.querySelectorAll('.choice').length)>=7,'والمواقف أزرار');
await page.click('button[onclick="coachPick(0)"]');
await page.waitForTimeout(200);
await page.click("button[onclick=\"coachMode('solo')\"]");
await page.waitForTimeout(600);
let t=await page.textContent('#app');
ok(t.includes('Sunny Café'),'افتتاح الشريك معروض');
ok((await page.evaluate(()=>window.__SPOKE)).some(x=>x&&x.includes('Sunny')),'ويُنطق بالصوت');
ok(t.includes('🎤 تكلّمي'),'وزرّ التكلّم ظاهر');

console.log('\n٣) دورة كاملة: تفريغ ⇒ تقييم صوتي ⇒ ردّ');
az={ok:true,engine:"azure",heard:"I want a hot chocolate please",lexical:"i want a hot chocolate please",
  pron:74,accuracy:74,fluency:80,completeness:100,
  words:"i want a hot chocolate please".split(" ").map(w=>({w,score:74,err:"None",
    phonemes:w==="chocolate"?[{p:"ch",score:41},{p:"k",score:88}]:[{p:"t",score:75}]})),
  weak:[{w:"chocolate",p:"ch",score:41}]};
logs.length=0;
await turn(page);
await page.waitForTimeout(500);
t=await page.textContent('#app');
ok(t.includes('I want a hot chocolate please'),'كلامها معروض كما فُرِّغ');
ok(t.includes('وضوح الأصوات'),'ومعه درجة وضوح الأصوات');
ok(t.includes('Would you like it with milk'),'وردّ الشريك');
ok((await page.evaluate(()=>window.__SPOKE)).some(x=>x&&x.includes('milk')),'ويُنطق الردّ');

console.log('\n٤) ما يُرسَل إلى الشريك: وضع محادثة والموقف والتاريخ');
const tc=logs.filter(l=>l.__tutor).map(l=>l.__tutor).slice(-1)[0]||{};
ok(tc.mode==='chat','الوضع chat لا تصحيح خطأ');
ok(tc.scene&&tc.scene.includes('barista'),'والموقف بالإنجليزية');
ok(tc.studentAnswer==='I want a hot chocolate please','وكلامها');
ok(Array.isArray(tc.history)&&tc.history.length===2,`والتاريخ (${tc.history&&tc.history.length} رسالتان: الافتتاح وكلامها)`);
ok(tc.history&&tc.history[0].role==='model','أوّله ردّ الشريك');

console.log('\n٥) التسجيل: كلامها ودرجتها وأصواتها الضعيفة');
const say=logs.filter(l=>l.domain==='coach'&&l.qtype==='say')[0];
ok(!!say,'سطر say وصل');
ok(say&&say.response==='I want a hot chocolate please','وفيه نصّها');
ok(say&&say.score_pct===74,`ودرجة الوضوح (${say&&say.score_pct}) — دقّة الأصوات لا الدرجة المركّبة`);
ok(say&&say.weak_phonemes==='ch:41',`وأضعف الأصوات «${say&&say.weak_phonemes}»`);
ok(say&&say.elapsed_ms>0,'وزمن كلامها');
ok(logs.some(l=>l.domain==='coach'&&l.qtype==='reply'),'وردّ الشريك مُسجَّل كذلك');

console.log('\n٦) الصوت غير الواضح لا يُحسب جملةً');
stt={ok:true,heard:"",lowConfidence:true};
const before=await page.evaluate(()=>coachMsgs.length);
await turn(page);await page.waitForTimeout(300);
ok(await page.evaluate(()=>coachMsgs.length)===before,'لا تُضاف رسالة');
ok((await page.textContent('#app')).includes('لم نسمع كلاماً واضحاً'),'ويُقال لها السبب');
ok(await page.evaluate(()=>coachBusy)===false,'والزرّ يعود صالحاً');

console.log('\n٧) تعذّر التقييم الصوتي لا يوقف المحادثة');
stt={ok:true,heard:"Yes with milk please"};az={ok:true,noAssessment:true,nbestKeys:[],hasWords:0,raw:"{}"};
await turn(page);await page.waitForTimeout(500);
t=await page.textContent('#app');
ok(t.includes('Yes with milk please'),'كلامها يظهر');
ok(await page.evaluate(()=>coachMsgs.filter(m=>m.role==='user').slice(-1)[0].pct)===null,'بلا درجة');
ok(t.includes('Would you like it with milk'),'والردّ يصل — المحادثة لم تتعطّل');

console.log('\n٨) الخلاصة تجمع أكثر الأصوات ضعفاً');
await page.evaluate(()=>{
  coachMsgs=[{role:"model",text:"hi"},
    {role:"user",text:"a",pct:70,weak:[{w:"x",p:"ch",score:40},{w:"y",p:"th",score:55}]},
    {role:"user",text:"b",pct:80,weak:[{w:"z",p:"ch",score:50}]},
    {role:"user",text:"c",pct:90,weak:[]}];
  coachDone=true;render();
});
t=await page.textContent('#app');
ok(t.includes('تكلّمتِ ٣ مرات'),'عدد جملها');
ok(t.includes('٨٠٪'),'ومتوسّط الوضوح');
const sum=await page.evaluate(()=>coachWeakSummary());
ok(sum[0].p==='ch'&&sum[0].n===2&&sum[0].avg===45,`وأكثرها تكراراً ch مرّتين بمعدّل ${sum[0].avg}`);
ok(t.includes('الأصوات التي تكرّر ضعفها'),'وتُعرض لها');
// جلسة بلا ضعف
await page.evaluate(()=>{coachMsgs=[{role:"user",text:"a",pct:95,weak:[]}];coachDone=true;render()});
// النصّ تغيّر مع تنظيف القياس: لا يُقال «كل أصواتك واضحة» بل «لا صوت تكرّر ضعفه»
ok((await page.textContent('#app')).includes('لا صوت تكرّر ضعفه'),'وبلا ضعف متكرّر تُطمأن');

console.log('\n٩) الحوار ينتهي عند الحدّ');
page=await mk();
stt={ok:true,heard:"ok"};az=null;
await page.evaluate(()=>{startCoach();coachPick(0);coachMode('solo')});
for(let i=0;i<COACH_MAX();i++){await turn(page);await page.waitForTimeout(120)}
function COACH_MAX(){return 8}
ok(await page.evaluate(()=>coachDone)===true,'ينتهي بعد ثماني جمل');
ok((await page.textContent('#app')).includes('تكلّمتِ'),'وتظهر الخلاصة');

console.log('\n٩ب) خطأ حقيقي عند إلياس (١٦ أغسطس): reply · null is not an object (evaluating \'coachScene.en\')');
// السبب: coachFinish غير متزامنة (تفريغ ثم تقييم صوتي ثم ردّ)، وكانت تقرأ coachScene
// العامّ مباشرةً عند إرسال الردّ. لو أعاد الطالب اختيار موضوع (أو خرج) في تلك الأثناء
// يُصفَّر coachScene قبل أن يصل هذا الدور إلى القراءة، فينهار. المحاكاة هنا: نُؤخّر ردّ
// tutor عمداً ونُصفّر coachScene أثناء الانتظار — تماماً كما يفعل ضغطٌ سريع على الجهاز.
page=await mk();
stt={ok:true,heard:"I want a hot chocolate please"};az=null;
let releaseTutor=null;
await page.route('**/functions/v1/tutor',async r=>{
  let x={};try{x=JSON.parse(r.request().postData()||'{}')}catch(e){}
  logs.push({__tutor:x});
  await new Promise(res=>{releaseTutor=res});
  r.fulfill({status:200,contentType:'application/json',body:JSON.stringify(chat)});
});
await page.evaluate(()=>{startCoach();coachPick(0);coachMode('solo')});
await page.waitForTimeout(300);
logs.length=0;
const finishPromise=turn(page);
await page.waitForTimeout(200);   // بعد التفريغ والتقييم، أثناء انتظار ردّ tutor المؤخَّر
await page.evaluate(()=>{coachScene=null});   // محاكاة إعادة اختيار موضوع في نفس اللحظة
await page.evaluate(()=>new Promise(r=>setTimeout(r,50)));
if(releaseTutor)releaseTutor();
await finishPromise;
await page.waitForTimeout(200);
ok((await page.evaluate(()=>window.__ERRS.length))===0,'لا ينهار — لا خطأ صفحة رغم التصفير أثناء المعالجة');
// اللقطة المحلّية أفضل من مجرّد عدم الانهيار: هذا الدور يُكمل بمشهده هو الذي بدأ به
// (لا يُهدَر تفريغٌ وتقييمٌ صوتي حقّقهما بالفعل)، والمشهد الجديد يبدأ نظيفاً بدوره التالي
const replyRow=logs.find(l=>l.domain==='coach'&&l.qtype==='reply');
ok(!!replyRow,'بل يُكمل الدور بردٍّ فعلي — لا فشلٌ ولا هدرٌ لما حقَّقه التفريغ والتقييم');
ok(await page.evaluate(()=>coachBusy)===false,'وزرّ التكلّم يعود صالحاً');

console.log('\n٩ج) tutor_bad_model حيّ عند إلياس ومحمد معاً (١٧ أغسطس): كانت تُسجَّل بشيفرة الخطأ وحدها');
// السجلّ القديم: response="reply · tutor_bad_model" — بلا اسم النموذج ولا نصّ الرفض
// الحقيقي، رغم أن الخادم يُعيدهما في الردّ نفسه (d.detail/d.provider/d.model) وكانا
// يُهمَلان قبل هذا الإصلاح. الآن يُسجَّلان معاً فيُعرف السبب الحقيقي من أوّل سطر.
page=await mk();
stt={ok:true,heard:"I want a hot chocolate please"};az=null;
chat={error:"tutor_bad_model",status:400,provider:"groq",model:"llama-3.3-70b-versatile",
  detail:"The model `llama-3.3-70b-versatile` has been decommissioned."};
await page.route('**/functions/v1/tutor',async r=>{
  let x={};try{x=JSON.parse(r.request().postData()||'{}')}catch(e){}
  logs.push({__tutor:x});r.fulfill({status:200,contentType:'application/json',body:JSON.stringify(chat)});
});
await page.evaluate(()=>{startCoach();coachPick(0);coachMode('solo')});
await page.waitForTimeout(300);
logs.length=0;
await turn(page);
await page.waitForTimeout(300);
const failRow=logs.find(l=>l.domain==='coach'&&l.qtype==='fail');
ok(!!failRow,'سطر الفشل وصل');
ok(failRow&&failRow.response.includes('tutor_bad_model'),`ومعه شيفرة الخطأ (${failRow&&failRow.response})`);
ok(failRow&&failRow.response.includes('groq/llama-3.3-70b-versatile'),'ومعه المزوّد والنموذج الحقيقيان — لا تخمين لاحقاً');
ok(failRow&&failRow.response.includes('decommissioned'),'ونصّ الرفض من المزوّد نفسه — السبب الحقيقي لا الشيفرة وحدها');
ok((await page.evaluate(()=>window.__ERRS.length))===0,'ولا خطأ صفحة');
chat={ok:true,reply:"Great choice! Would you like it with milk?"};   // إعادة الحالة الافتراضية لبقية الملفّ

console.log('\n١٠) لا انحدار');
page=await mk();
for(const [fn,md] of [["startBasics('percent')",'basics'],["startFactPlan()",'factplan'],["startEngPlan()",'engplan'],
  ["startDictation()",'dictation'],["startPronunciation()",'pron'],["startCoach()",'coach'],
  ["startAudioDiag()",'audiodiag'],["home()",'home']]){
  const r=await page.evaluate(x=>{try{eval(x);return{m:mode,len:document.getElementById('app').textContent.length}}catch(e){return{err:e.message}}},fn);
  ok(!r.err&&r.m===md&&r.len>40,`${fn} → ${r.err||r.m}`);
}
ok((await page.textContent('#app')).includes('تكلّمي بالإنجليزية'),'ومدخله في الرئيسية');
ok((await page.evaluate(()=>censusMissing())).length===0,'وكل الدوال معرَّفة');
ok((await page.evaluate(()=>window.__ERRS.length))===0,'ولا خطأ');

await b.close();
console.log(fails?`\n=== ${fails} فشل ===`:'\n=== كل الاختبارات نجحت ===');
process.exit(fails?1:0);
})();
