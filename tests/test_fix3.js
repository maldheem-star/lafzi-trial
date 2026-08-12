const {chromium}=require('/opt/node22/lib/node_modules/playwright');
let fails=0;const ok=(c,m)=>{console.log((c?'  ✓ ':'  ✗ FAIL ')+m);if(!c)fails++};
(async()=>{
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium',
  args:['--use-fake-device-for-media-stream','--use-fake-ui-for-media-stream']});
const mk=async(routes)=>{
  const page=await b.newPage({viewport:{width:420,height:900}});
  page.on('pageerror',e=>{console.log('  ✗ PAGEERROR '+e.message);fails++});
  await page.route('**/rest/v1/**',r=>r.fulfill({status:201,contentType:'application/json',body:'[]'}));
  await page.addInitScript(()=>{
    Object.defineProperty(window,'speechSynthesis',{configurable:true,value:{speak(){},cancel(){},resume(){},pause(){},getVoices:()=>[{lang:'en-US',name:'X'}],speaking:false,pending:false}});
    window.SpeechSynthesisUtterance=function(t){this.text=t};
    Object.defineProperty(navigator,'mediaDevices',{configurable:true,value:{getUserMedia:async()=>({getTracks:()=>[{stop(){}}],getAudioTracks:()=>[{label:'m',stop(){}}]})}});
    window.MediaRecorder=function(){this.state='recording';this.mimeType='audio/webm';this.start=()=>{};
      this.stop=()=>{this.state='inactive';if(this.ondataavailable)this.ondataavailable({data:new Blob(['x'],{type:'audio/webm'})});if(this.onstop)this.onstop()}};
  });
  await page.goto('http://127.0.0.1:8931/index.html');
  if(routes)await routes(page);
  await page.waitForFunction(()=>typeof pronDiscardReason==='function');
  return page;
};
const put=async(page,id)=>page.evaluate(x=>{
  const it=engPool().find(i=>i.id===x);
  planItems=[Object.assign({},it)];planIdx=0;planTotal=1;planScore=0;planDone=false;
  planPicked=null;planLocked=false;planInput="";mode="engplan";fixOn=false;fixItem=null;fixStep=0;
  if(fixNeeded(planItems[0]))fixStart(planItems[0]);else render();
},id);

console.log('\n١) التمرين صار بثلاثة خيارات — والمموّه الثالث حاضر');
let page=await mk();
await put(page,'u3_g3');   // السؤال الذي سقطت فيه على «while»
await page.click('button[onclick="fixCardDone()"]');
ok(await page.evaluate(()=>document.querySelectorAll('.choice').length)===3,
   `ثلاثة خيارات لا اثنان (${await page.evaluate(()=>document.querySelectorAll('.choice').length)})`);
let opts=await page.evaluate(()=>fixDrills[0]._opts);
ok(opts.includes('since'),'فيها الصواب since');
ok(opts.includes('for'),'وجوابها الخاطئ المسجَّل for');
ok(opts.includes('while')||opts.includes('from'),`ومموّه ثالث لم تره من قبل (${opts.join(' / ')})`);
ok(new Set(opts).size===3,'وكلها مختلفة');
let ai=await page.evaluate(()=>fixDrills[0]._ai);
ok(opts[ai]==='since','ومؤشّر الصواب يشير إلى since فعلاً');

console.log('\n٢) اختيار المموّه الثالث يُحتسب خطأً ويُعيد الشرح');
const wrongIdx=await page.evaluate(()=>[0,1,2].filter(i=>i!==fixDrills[0]._ai)[1]);
await page.evaluate(i=>fixChoose(i),wrongIdx);
ok(await page.evaluate(()=>fixOkFlag)===false,'المموّه الثالث خطأ');
await page.click('button[onclick="fixNext()"]');
ok(await page.evaluate(()=>fixStep)===0,'ويُعيد البطاقة');
ok(await page.evaluate(()=>fixOn)===true,'والبوّابة مقفلة');

console.log('\n٣) المسار الصحيح ما زال يفتحها');
await page.click('button[onclick="fixCardDone()"]');
ai=await page.evaluate(()=>fixDrills[0]._ai);
await page.evaluate(i=>fixChoose(i),ai);
await page.click('button[onclick="fixNext()"]');
ok(await page.evaluate(()=>fixStep)===2,'التمرين الثاني');
ok(await page.evaluate(()=>document.querySelectorAll('.choice').length)===3,'وهو بثلاثة خيارات كذلك');
ai=await page.evaluate(()=>fixDrills[1]._ai);
await page.evaluate(i=>fixChoose(i),ai);
await page.click('button[onclick="fixNext()"]');
ok(await page.evaluate(()=>fixOn)===false,'وتُغلق البوّابة');
ok(await page.evaluate(()=>document.querySelectorAll('.choice').length)===4,'ويعود السؤال بأربعة');
await page.close();

console.log('\n٤) فحص شامل: كل سؤال عالق يُنتج تمارين بخيارات صحيحة');
page=await mk();
const sweep=await page.evaluate(()=>{
  const bad=[];
  Object.keys(ITEM_SEED).forEach(function(id){
    const it=engPool().find(x=>x.id===id);
    if(!it){bad.push(id+": غير موجود");return}
    const ds=fixBuild(it);
    if(!ds.length){bad.push(id+": بلا تمارين");return}
    ds.forEach(function(d,i){
      if(!d.opts||d.opts.length<3)bad.push(`${id}/تمرين${i+1}: ${d.opts?d.opts.length:0} خيارات فقط`);
      if(d.opts.indexOf(d.right)<0)bad.push(`${id}/تمرين${i+1}: الصواب ليس ضمن الخيارات`);
      if(new Set(d.opts).size!==d.opts.length)bad.push(`${id}/تمرين${i+1}: خيار مكرّر`);
    });
    // تمرين ١ لا بدّ أن يحوي جوابها الخاطئ المسجَّل
    const seedBad=ITEM_SEED[id][0];
    if(it.c.indexOf(seedBad)>=0&&ds[0].opts.indexOf(seedBad)<0)bad.push(`${id}: جوابها الخاطئ «${seedBad}» غائب عن التمرين`);
  });
  return bad;
});
ok(sweep.length===0,sweep.length?sweep.slice(0,4).join(' | '):'ثلاثة عشر سؤالاً عالقاً: كل تمارينها ٣ خيارات، الصواب فيها، بلا تكرار، وجوابها الخاطئ حاضر');

console.log('\n٥) الإهمال في النطق: الخطأ الحقيقي لم يعد يُبتلع');
const cases=await page.evaluate(()=>{
  const C=[
    // [الهدف, ما سُمع, ثقة, هل يُهمَل؟, وصف]
    ["race","Rice.",{noSpeech:0.1,avgLogprob:-1.4},true,"نطق خاطئ لكلمة قريبة (ثقة نسخ منخفضة، لكن هناك كلام)"],
    ["medicine","merrison",{noSpeech:0.2,avgLogprob:-1.6},true,"نطق خاطئ مشوّه"],
    ["winter","Wonder.",{noSpeech:0.15,avgLogprob:-1.1},true,"حركة خاطئة"],
    ["pocket","Park it.",{noSpeech:0.2,avgLogprob:-0.9},true,"حدود كلمات خاطئة"],
    ["insect","",{noSpeech:0.1,avgLogprob:-0.2},false,"لا شيء"],
    ["insect","Insect.",{noSpeech:0.9,avgLogprob:-0.3},false,"Whisper يقول: لا كلام"],
    ["insect","Thank you for watching this video please subscribe",{noSpeech:0.3,avgLogprob:-1.5},false,"هلوسة نصّ طويل"],
  ];
  return C.map(function(c){
    const scored=pronDiscardReason(c[0],{ok:true,heard:c[1],conf:c[2],lowConfidence:c[2].noSpeech>0.6||c[2].avgLogprob<-1.0})==="";
    return{t:c[0],h:c[1],want:c[3],got:scored,d:c[4]};
  });
});
cases.forEach(function(c){
  ok(c.got===c.want,`${c.t} ← «${c.h||'(فارغ)'}» ${c.want?'يُقيَّم':'يُهمَل'} — ${c.d}`);
});
// التكرار المتواصل ما زال يُهمَل
ok(await page.evaluate(()=>pronDiscardReason("bread",{ok:true,heard:"bread bread bread bread bread bread",conf:{noSpeech:0.2,avgLogprob:-0.5}}))!=="",
   'وحلقة التكرار ما زالت تُهمَل');
ok(await page.evaluate(()=>pronDiscardReason("bread",{ok:true,heard:"x",garbled:true,conf:{noSpeech:0.1,avgLogprob:-0.3}}))==="garbled",
   'وحكم النموذج «ليست محاولة» يُحترم');

console.log('\n٦) الخطأ المُقيَّم يصل للشاشة بدرجته');
page=await mk(async p=>{
  await p.route('**/functions/v1/assess-azure',r=>r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({error:"not_configured"})}));
  await p.route('**/functions/v1/assess-pronunciation-groq',r=>r.fulfill({status:200,contentType:'application/json',
    body:JSON.stringify({ok:true,heard:"Rice.",lowConfidence:true,conf:{noSpeech:0.1,avgLogprob:-1.4}})}));
});
await page.evaluate(()=>{startPronunciation();pronSession[pronIdx]={w:'race',m:'سباق'}});
await page.evaluate(()=>pronStart());
await page.waitForFunction(()=>pronListening===true,null,{timeout:5000});
await page.evaluate(()=>{pronElapsed=2;pronStop()});
await page.waitForFunction(()=>pronResult!==null,null,{timeout:9000});
let r=await page.evaluate(()=>({noisy:!!pronResult.noisy,pct:pronResult.sc?pronResult.sc.pct:null,heard:pronResult.heard}));
ok(r.noisy===false,'race ← "Rice." لم تُهمَل');
ok(r.pct===0,`وأُعطيت ٠٪ — أي خطأ صريح لا اختفاء (${r.pct})`);
let t=await page.textContent('#app');
ok(t.includes('Rice.'),'وتُعرض لها ما سُمع منها');
ok(t.includes('race'),'مع الكلمة المطلوبة');
ok(!t.includes('لم تُحتسب'),'ولا تُقال إنها غير محتسبة');
await page.close();

console.log('\n٧) المُهمَلة فعلاً تُقال بسببها ولا تُحتسب صفراً');
page=await mk(async p=>{
  await p.route('**/functions/v1/assess-azure',r=>r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({error:"not_configured"})}));
  await p.route('**/functions/v1/assess-pronunciation-groq',r=>r.fulfill({status:200,contentType:'application/json',
    body:JSON.stringify({ok:true,heard:"Insect.",lowConfidence:true,conf:{noSpeech:0.95,avgLogprob:-0.3}})}));
});
await page.evaluate(()=>{startPronunciation();pronSession[pronIdx]={w:'insect',m:'حشرة'}});
await page.evaluate(()=>pronStart());
await page.waitForFunction(()=>pronListening===true,null,{timeout:5000});
await page.evaluate(()=>{pronElapsed=2;pronStop()});
await page.waitForFunction(()=>pronResult!==null,null,{timeout:9000});
ok(await page.evaluate(()=>pronResult.noisy)===true,'ثقة «لا كلام» ⇒ تُهمَل');
t=await page.textContent('#app');
ok(t.includes('لم تُحتسب هذه المحاولة'),'ويُقال ذلك صراحةً');
ok(t.includes('التسجيل بلا كلام واضح'),'ومعه السبب');
ok(t.includes('لم تُحسب عليك'),'وتُطمأن أنها ليست خطأً');
ok(t.includes('أعيدي التسجيل'),'ومعه ما تفعله');
await page.close();

console.log('\n٨) لا انحدار');
page=await mk();
for(const [fn,md] of [["startBasics('percent')",'basics'],["startBasics('multdiv')",'basics'],["startFactPlan()",'factplan'],
  ["startEngPlan()",'engplan'],["startDictation()",'dictation'],["startPronunciation()",'pron'],
  ["startSpeaking()",'speak'],["startAudioDiag()",'audiodiag'],["home()",'home']]){
  const rr=await page.evaluate(x=>{try{eval(x);return{m:mode,len:document.getElementById('app').textContent.length}}catch(e){return{err:e.message}}},fn);
  ok(!rr.err&&rr.m===md&&rr.len>40,`${fn} → ${rr.err||rr.m}`);
}
ok((await page.evaluate(()=>censusMissing())).length===0,'وكل الدوال معرَّفة');
ok((await page.evaluate(()=>window.__ERRS.length))===0,'ولا خطأ');

await b.close();
console.log(fails?`\n=== ${fails} فشل ===`:'\n=== كل الاختبارات نجحت ===');
process.exit(fails?1:0);
})();
