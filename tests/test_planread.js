const {chromium}=require('/opt/node22/lib/node_modules/playwright');
let fails=0;const ok=(c,m)=>{console.log((c?'  ✓ ':'  ✗ FAIL ')+m);if(!c)fails++};
(async()=>{
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'});
const logs=[];
const mk=async()=>{
  const page=await b.newPage({viewport:{width:420,height:900}});
  page.on('pageerror',e=>{console.log('  ✗ PAGEERROR '+e.message);fails++});
  await page.route('**/rest/v1/**',async r=>{
    let x={};try{x=JSON.parse(r.request().postData()||'{}')}catch(e){}
    logs.push(x);r.fulfill({status:201,contentType:'application/json',body:'[]'});
  });
  await page.addInitScript(()=>{
    Object.defineProperty(window,'speechSynthesis',{configurable:true,value:{speak(){},cancel(){},resume(){},pause(){},getVoices:()=>[{lang:'en-US',name:'X'}],speaking:false,pending:false}});
    window.SpeechSynthesisUtterance=function(t){this.text=t};
  });
  await page.goto('http://127.0.0.1:8931/index.html');
  await page.waitForFunction(()=>typeof planGateSecondsFor==='function');
  return page;
};
const put=async(page,id)=>page.evaluate(x=>{
  const it=engPool().find(i=>i.id===x);
  planItems=[Object.assign({},it)];planIdx=0;planTotal=1;planScore=0;planDone=false;
  planPicked=null;planLocked=false;planInput="";mode="engplan";fixOn=false;fixItem=null;fixStep=0;
  planShownAt=Date.now();planGateStart(planItems[0]);render();
},id);

console.log('\n١) نصوص القراءة الحقيقية في خطة الإنجليزي — التي كانت بلا بوّابة');
let page=await mk();
const reads=await page.evaluate(()=>{
  return engPool().filter(i=>i.t==="reading").slice(0,6).map(function(it){
    const w=(String(it.passage||"")+" "+String(it.q||"")).trim().split(/\s+/).filter(Boolean).length;
    return{id:it.id,w,secs:planGateSecondsFor(it)};
  });
});
reads.forEach(function(r){
  ok(r.secs>=15&&r.secs<=30,`${r.id}: ${r.w} كلمة ⇒ ${r.secs} ثانية (كان صفراً)`);
});
ok(reads.length>0,`وعددها ${reads.length} نصّاً في العيّنة`);

console.log('\n٢) ما ليس قراءةً يبقى بلا بوّابة');
const others=await page.evaluate(()=>{
  const P=engPool();
  const g=P.find(i=>i.t==="grammar"),v=P.find(i=>i.t==="vocab"),d=P.find(i=>i.t==="dict");
  return{g:planGateSecondsFor(g),v:planGateSecondsFor(v),d:planGateSecondsFor(d),none:planGateSecondsFor(null)};
});
ok(others.g===0,'القواعد بلا بوّابة (لها بوّابة التصحيح الخاصة)');
ok(others.v===0,'والمفردات بلا بوّابة');
ok(others.d===0,'والإملاء بلا بوّابة');
ok(others.none===0,'وعنصر فارغ لا يكسر شيئاً');

console.log('\n٣) البوّابة تعمل فعلاً على الشاشة');
const rid=await page.evaluate(()=>engPool().find(i=>i.t==="reading").id);
await put(page,rid);
ok(await page.evaluate(()=>planGateOpen())===false,'مُقفلة');
ok(await page.evaluate(()=>document.querySelectorAll('.choice').length)===0,'ولا خيار واحد في الصفحة');
let t=await page.textContent('#app');
ok(t.includes('اقرئي النصّ الإنجليزي كاملاً أولاً'),'ونصّها خاصّ بالإنجليزية');
ok(t.includes('القراءة بلغة ثانية تحتاج وقتاً أطول'),'ويطمئنها أن البطء طبيعي');
// النصّ نفسه معروض أثناء الانتظار
const passage=await page.evaluate(()=>planCur().passage.slice(0,20));
ok(t.includes(passage),'والنصّ الإنجليزي معروض أثناء الانتظار — البوّابة تُخفي الخيارات لا النصّ');
// النقر قبل الفتح لا يُحتسب
await page.evaluate(()=>planChoose(0));
ok(await page.evaluate(()=>planLocked)===false,'والاختيار قبل انقضاء الزمن لا يُحتسب');
await page.evaluate(()=>{planGateLeft=0;planGateStop();render()});
ok(await page.evaluate(()=>document.querySelectorAll('.choice').length)===4,'وبعد الزمن تظهر الأربعة');
ok((await page.textContent('#app')).includes('خذي وقتك'),'مع تشجيع على المراجعة');

console.log('\n٤) زمن الإجابة يُسجَّل — كان null في خطة الإنجليزي كلّها');
logs.length=0;
await page.evaluate(()=>{planShownAt=Date.now()-4000;planChoose(0)});
await page.waitForTimeout(500);
const lg=logs.find(l=>l.domain==='eng_plan');
ok(!!lg,'السطر وصل');
ok(lg&&typeof lg.elapsed_ms==='number'&&lg.elapsed_ms>3000,`وفيه الزمن (${lg&&lg.elapsed_ms} مللي) — كان null`);
ok(lg&&lg.q_text&&lg.q_text.length>3,'ونصّ السؤال');
ok(lg&&lg.qtype==='reading','ونوعه');

console.log('\n٥) العدّاد ينقص فعلاً ولا يعلق');
await put(page,rid);
const s0=await page.evaluate(()=>planGateSecs);
await page.waitForFunction(()=>planGateLeft<planGateSecs,null,{timeout:4000});
ok(true,`العدّاد ينقص (بدأ من ${s0})`);
ok(await page.evaluate(()=>planGateTimer!==null),'والمؤقّت يعمل');
await page.evaluate(()=>{planGateLeft=0;planGateStop()});
ok(await page.evaluate(()=>planGateOpen())===true,'ويُفتح عند الصفر');

console.log('\n٦) تحذير النطاق يُسجَّل: هل ظهر؟ وهل تجاوزته؟');
page=await mk();
// حالة أ: تُصرّ على رقم خارج نطاقها
await page.evaluate(()=>{startBasics('percent');basicsStage=5;
  basicsCur={fam:{a:500,b:50,c:250,onePercent:5}};basicsPrep();pctArm();render();
  pctPickBand(pctBandOf(500,50))});
logs.length=0;
await page.evaluate(()=>{document.getElementById('basicsIn').value="50";basicsSubmit()});
ok(await page.evaluate(()=>basicsLocked)===false,'٥٠٪ من ٥٠٠ ← «٥٠»: التحذير يظهر ولا تُقفل');
ok((await page.textContent('#app')).includes('خارج ما قدّرتِه بنفسك'),'ونصّه ظاهر');
await page.evaluate(()=>{document.getElementById('basicsIn').value="50";basicsSubmit()});
await page.waitForTimeout(500);
let pl=logs.find(l=>l.domain==='basics_percent');
ok(!!pl&&/تجاوزت التحذير/.test(pl.response||''),`وإصرارها يُسجَّل: «${pl&&pl.response}»`);
ok(pl&&pl.is_correct===false,'وتُحتسب خطأً');

// حالة ب: تُحذَّر فتُصحّح
page=await mk();
await page.evaluate(()=>{startBasics('percent');basicsStage=5;
  basicsCur={fam:{a:500,b:50,c:250,onePercent:5}};basicsPrep();pctArm();render();
  pctPickBand(pctBandOf(500,50))});
logs.length=0;
await page.evaluate(()=>{document.getElementById('basicsIn').value="50";basicsSubmit()});
await page.evaluate(()=>{document.getElementById('basicsIn').value="250";basicsSubmit()});
await page.waitForTimeout(500);
pl=logs.find(l=>l.domain==='basics_percent');
ok(!!pl&&/حُذّرت فصحّحت/.test(pl.response||''),`والتصحيح بعد التحذير يُسجَّل كذلك: «${pl&&pl.response}»`);
ok(pl&&pl.is_correct===true,'وتُحتسب صحيحة');

// حالة ج: جواب داخل النطاق ⇒ لا تحذير ولا وسم
page=await mk();
await page.evaluate(()=>{startBasics('percent');basicsStage=5;
  basicsCur={fam:{a:500,b:50,c:250,onePercent:5}};basicsPrep();pctArm();render();
  pctPickBand(pctBandOf(500,50))});
logs.length=0;
await page.evaluate(()=>{document.getElementById('basicsIn').value="250";basicsSubmit()});
await page.waitForTimeout(500);
pl=logs.find(l=>l.domain==='basics_percent');
ok(!!pl&&!/تحذير|حُذّرت/.test(pl.response||''),`وبلا تحذير لا يُضاف وسم: «${pl&&pl.response}»`);
ok(pl&&/نطاق×/.test(pl.response||''),'وعدّاد النطاق باقٍ');

console.log('\n٧) جلسة خطة كاملة بنقرات حقيقية');
page=await mk();
await page.evaluate(()=>startEngPlan());
let guard=0,gates=0,end=false;
while(guard++<300){
  const st=await page.evaluate(()=>({m:mode,done:planDone,fix:fixOn,step:fixStep,lock:fixLocked,
    cx:typeof cxOn!=='undefined'&&cxOn,cxs:typeof cxStep!=='undefined'?cxStep:0,
    cxwhy:typeof cxWhyOn!=='undefined'&&cxWhyOn&&cxWhyPicked==null,
    cxpre:typeof cxPreOn!=='undefined'&&cxPreOn,
    cxnp:typeof cxOn!=='undefined'&&cxOn&&!cxPreOn&&cxStep===0&&cxNoticePicked==null,cxlock:typeof cxLocked!=='undefined'&&cxLocked,
    t:planCur()?planCur().t:null,plock:planLocked,ai:planCur()?planCur().a:null,pg:!planGateOpen()}));
  if(st.done){end=true;break}
  // بطاقة التقابل أُضيفت بعد كتابة هذا الفحص — نمرّ بها كما تمرّ هي
  if(st.cx){
    // خطوة التصنيف (cx_sort) صارت أول التقابل: نُجيبها صواباً حتى تنفتح القاعدة
    if(st.cxpre){
      if(await page.evaluate(()=>cxPreFail)){await page.click('button[onclick="cxPreQuit()"]');continue}
      await page.evaluate(()=>{const cur=cxPreCur();
        let i=0;for(let k=0;k<cxPreOrder.length;k++){if(cxPair.sides[cxPreOrder[k]].k===cur.side){i=k;break}}
        cxPreChoose(i);cxPreNext()});
      continue;
    }
    if(st.cxs===-1){await page.click('button[onclick="cxFinish()"]');continue}
    if(st.cxnp){await page.click('button[onclick="cxNoticePick(0)"]');continue}
    if(st.cxs===0){await page.click('button[onclick="cxRuleDone()"]');continue}
    if(st.cxwhy){await page.click('button[onclick="cxWhyPick(0)"]');continue}
    if(!st.cxlock){const a=await page.evaluate(()=>cxDrills[cxStep-1]._ai);await page.evaluate(i=>cxChoose(i),a);continue}
    await page.click('button[onclick="cxNext()"]');continue;
  }
  if(st.fix){
    if(st.step===0){await page.click('button[onclick="fixCardDone()"]');continue}
    if(!st.lock){const a=await page.evaluate(()=>fixDrills[fixStep-1]._ai);await page.evaluate(i=>fixChoose(i),a);continue}
    await page.click('button[onclick="fixNext()"]');continue;
  }
  if(st.pg){gates++;await page.evaluate(()=>{planGateLeft=0;planGateStop();render()});continue}
  if(st.t==='lesson'){await page.click('button[onclick="planLessonDone()"]');continue}
  if(st.plock){await page.click('button[onclick="planNext()"]');continue}
  if(st.t==='dict'){await page.evaluate(()=>{document.getElementById('planIn').value=planCur().w;planCheckDict()});continue}
  await page.evaluate(i=>planChoose(i),st.ai);
}
ok(end,`الخطة تنتهي عند شاشة النتيجة (${guard} خطوة)`);
ok(gates>0,`وبوّابة القراءة اعترضت ${gates} مرة`);
ok((await page.evaluate(()=>window.__ERRS.length))===0,'ولا خطأ في الجلسة');

console.log('\n٨) لا انحدار');
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
