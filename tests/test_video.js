// فيديو تعليمي: طلب صاحب المشروع "سو فديو للثلاثة كل حسب مستواه" (١٩ أغسطس).
// لا فيديو حقيقي — نفس جدار الترخيص الذي واجهناه مع LISTEN_BANK (لا بنك فيديو مفتوح
// الرخصة يصلح)، فالحلّ نفسه: نؤلّف قصّة قصيرة بأنفسنا، تُعرض مشهداً مشهداً (رمزٌ كبير
// + جملة مسرودة بصوت speakEnglish)، ثم سؤال فهمٍ كـLISTEN_BANK/READ_BANK بالضبط.
// بوّابة التسرّع (٢٢ أغسطس) تمنع النقر قبل زمنٍ أدنى، وهذه الاختبارات تنقر فوراً.
// فتُنهي العدّ أوّلاً — كما ينتظر المتعلّم — ثم تختار: gateLeft=0;gateStop().
// وهذا لا يُعطّل البوّابة ولا يُخفي انحدارها؛ فحصها نفسه في tests/test_rapidgate.js.
const {chromium}=require('/opt/node22/lib/node_modules/playwright');
let fails=0;const ok=(c,m)=>{console.log((c?'  ✓ ':'  ✗ FAIL ')+m);if(!c)fails++};
(async()=>{
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'});
let logs=[],genCalls=[],genReply="";
const GOOD_VIDEO_GEN=[
  "TITLE: Rainy Day",
  "SCENE1_EMOJI: 🌧️","SCENE1_TEXT: It is raining outside today.",
  "SCENE2_EMOJI: 📖","SCENE2_TEXT: I stay home and read a book.",
  "SCENE3_EMOJI: ☕","SCENE3_TEXT: My mother makes hot tea for us.",
  "Q: What is the weather like?","A: Sunny","B: Rainy","C: Snowy","CORRECT: B"].join("\n");
const mk=async(f)=>{
  const page=await b.newPage({viewport:{width:420,height:900}});
  page.on('pageerror',e=>{console.log('  ✗ PAGEERROR '+e.message);fails++});
  await page.route('**/rest/v1/**',async r=>{
    let x={};try{x=JSON.parse(r.request().postData()||'{}')}catch(e){}
    logs.push(x);r.fulfill({status:201,contentType:'application/json',body:'[]'});
  });
  await page.route('**/functions/v1/tutor',async r=>{
    let x={};try{x=JSON.parse(r.request().postData()||'{}')}catch(e){}
    genCalls.push(x);
    r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({ok:true,reply:genReply||GOOD_VIDEO_GEN})});
  });
  await page.addInitScript(()=>{
    Object.defineProperty(window,'speechSynthesis',{configurable:true,value:{speak(){},cancel(){},resume(){},pause(){},
      getVoices:()=>[{lang:'en-US',name:'X'}],speaking:false,pending:false}});
    window.SpeechSynthesisUtterance=function(t){this.text=t};
  });
  await page.goto('http://127.0.0.1:8931/'+f);
  await page.waitForFunction(()=>typeof startVideo==='function');
  return page;
};

console.log('\n١) كل متعلّم يرى بنك مستواه هو، وكل عنصر بشكلٍ سليم');
let page=await mk('index.html');
const banks=await page.evaluate(()=>({
  a1:videoBankFor('A1').every(x=>x.lv==='A1'),
  a2:videoBankFor('A2').every(x=>x.lv==='A2'),
  b1:videoBankFor('B1').every(x=>x.lv==='B1'),
  n:{a1:videoBankFor('A1').length,a2:videoBankFor('A2').length,b1:videoBankFor('B1').length},
}));
ok(banks.a1&&banks.a2&&banks.b1,'لا اختلاط بين المستويات');
ok(banks.n.a1>=5&&banks.n.a2>=5&&banks.n.b1>=5,`ولكلٍّ بنكٌ لا يقلّ عن خمسة (${JSON.stringify(banks.n)})`);
const shape=await page.evaluate(()=>VIDEO_BANK.every(x=>Array.isArray(x.sc)&&x.sc.length>=3&&x.sc.every(s=>s[0]&&s[1])&&x.q&&Array.isArray(x.c)&&x.c.length>=3&&x.a>=0&&x.a<x.c.length));
ok(shape,'وكل عنصر بشكل سليم (٣ مشاهد فأكثر، كلٌّ برمزٍ وجملة، وسؤالٌ وخياراتٌ وصوابٌ داخلها)');

console.log('\n٢) الجلسة تبدأ من المشهد الأول، لا السؤال مباشرة');
await page.evaluate(()=>startVideo());
const first=await page.evaluate(()=>({qOn:videoQOn,scene:videoScene,hasScene:!!document.querySelector('.vscene')}));
ok(!first.qOn&&first.scene===0&&first.hasScene,'يبدأ بالمشهد الأول لا بالسؤال');

console.log('\n٣) التقدّم بين المشاهد، ثم السؤال يظهر بعد آخر مشهد');
const it0=await page.evaluate(()=>videoCur());
for(let i=0;i<it0.sc.length-1;i++){
  await page.evaluate(()=>videoNextScene());
}
const midQ=await page.evaluate(()=>videoQOn);
ok(midQ===false,'لم يصل السؤال بعد — بقي مشهدٌ واحد أخير');
await page.evaluate(()=>videoNextScene());
const afterLast=await page.evaluate(()=>({qOn:videoQOn,choices:document.querySelectorAll('.choices .choice').length}));
ok(afterLast.qOn===true&&afterLast.choices>=3,'وبعد آخر مشهد يظهر السؤال بخياراته');

console.log('\n٤) الإجابة تُحتسب وتُسجَّل، ومعها عنوان القصّة وعدد المشاهد');
logs=[];
const r=await page.evaluate(()=>{
  const it=videoCur();gateLeft=0;gateStop();videoChoose(it.a);
  return {picked:videoPicked,ok:videoPicked===it.a,score:videoScore};
});
ok(r.ok&&r.score===1,'الإجابة الصحيحة تُحتسب');
await page.waitForTimeout(300);
const row=logs.find(l=>l.domain==='video');
ok(!!row,'سطرٌ وصل الخادم');
ok(row&&/مشاهد:\d+/.test(String(row.q_text)),`ومعه عدد المشاهد (${row&&row.q_text})`);
ok(row&&['A1','A2','B1'].includes(row.qtype),'والمستوى في qtype — يُجمَّع بالاستعلام');

console.log('\n٥) التباعد: FSRS، لا سلّمٌ جديد');
const srs=await page.evaluate(()=>{
  const id=videoItems[videoIdx].id;
  videoSrsUpdate(id,true);
  const st=JSON.parse(lsGet('mawhiba_video_srs')||'{}');
  return {hasDue:!!st[id]&&st[id].due>srsToday(),hasS:typeof st[id].s==='number'};
});
ok(srs.hasDue&&srs.hasS,'يُجدوَل بـfsrsUpdate نفسها — لا خوارزمية جديدة');

console.log('\n٦) نقصٌ لا خواءٌ تامّ — عنصرٌ مستحقٌّ واحد لا يُنتج جلسةً من سؤالٍ واحد (نفس درس بنك الاستماع)');
const partial=await page.evaluate(()=>{
  const POOL=videoBankFor(profileOf().level);
  const st={};
  POOL.forEach((i,idx)=>{st[i.id]={box:idx===0?0:2,due:idx===0?srsToday():srsToday()+30,seen:idx===0?0:3}});
  lsSet(VIDEO_SRS_KEY,JSON.stringify(st));
  return {plan:buildVideoPlan(),want:Math.min(VIDEO_N,POOL.length)};
});
ok(partial.plan.length===partial.want,`عنصرٌ واحد مستحقّ ⇐ جلسةٌ كاملة (${partial.plan.length} من ${partial.want})، لا سؤالٌ واحد`);
ok(new Set(partial.plan.map(i=>i.id)).size===partial.plan.length,'بلا تكرار عنصرٍ مرّتين في نفس الجلسة');
await page.evaluate(()=>{try{lsDel('mawhiba_video_srs')}catch(e){}});

console.log('\n٧) جلسة كاملة بنقرات حقيقية، ثم النتيجة');
page=await mk('index.html');
await page.evaluate(()=>startVideo());
let guard=0;
while(guard++<200){
  const st=await page.evaluate(()=>({done:videoDone,qOn:videoQOn,locked:videoLocked,ai:videoCur()?videoCur().a:null}));
  if(st.done)break;
  if(!st.qOn){await page.evaluate(()=>videoNextScene());continue}
  if(!st.locked){await page.evaluate(a=>{gateLeft=0;gateStop();videoChoose(a)},st.ai);continue}
  await page.evaluate(()=>videoNext());
}
ok(await page.evaluate(()=>videoDone)===true,`انتهت الجلسة (${guard} خطوة)`);
let t=await page.textContent('#app');
ok(/جلسة أخرى/.test(t),'وتُعرض شاشة النتيجة');
ok((await page.evaluate(()=>window.__ERRS.length))===0,'ولا خطأ في الجلسة كلها');

console.log('\n٨) يظهر على الصفحات الثلاث — كلٌّ يرى مستواه');
const m=await mk('mohammed.html');
const mLv=await m.evaluate(()=>({level:profileOf().level,btn:document.body.innerText.indexOf('فيديو تعليمي')>=0}));
ok(mLv.level==='B1'&&mLv.btn,`محمد B1 والزرّ ظاهر (${mLv.level})`);
await m.evaluate(()=>startVideo());
const mBank=await m.evaluate(()=>videoItems.every(x=>x.lv==='B1'));
ok(mBank,'وجلسته من بنك B1 وحده');

const e=await mk('elias.html');
const eLv=await e.evaluate(()=>({level:profileOf().level,btn:document.body.innerText.indexOf('فيديو تعليمي')>=0}));
ok(eLv.level==='A2'&&eLv.btn,`إلياس A2 والزرّ ظاهر (${eLv.level})`);

const h=await mk('index.html');
const hBtn=await h.evaluate(()=>document.body.innerText.indexOf('فيديو تعليمي')>=0);
ok(hBtn,'وهيا كذلك — الزرّ ظاهر على صفحتها');

console.log('\n٩) التوليد الآلي (٢٠ أغسطس) — شُحن الفيديو بلا توليد، وبنيته مطابقةٌ لشكل gram المتكرّر');
page=await mk('index.html');
const vp=await page.evaluate(x=>({
  good:parseGenVideoBlock(x.good),
  fewScenes:parseGenVideoBlock(x.good.split("\n").filter(l=>!l.startsWith("SCENE3")).join("\n")),
  gapScene:parseGenVideoBlock(x.good.replace(/SCENE2/g,"SCENE4")), // ١ ثم ٤ ثم ٣: فجوة
  arContam:parseGenVideoBlock(x.good.replace('It is raining outside today.','السماء تمطر اليوم')),
  missing:parseGenVideoBlock('just some text'),
}),{good:GOOD_VIDEO_GEN});
ok(!!vp.good&&vp.good.sc.length===3&&vp.good.t==='Rainy Day'&&vp.good.ai===true,'نصٌّ سليمٌ يُقبل: ثلاثة مشاهد، عنوانٌ، ai:true');
ok(vp.good.sc[0][0]==='🌧️'&&vp.good.sc[0][1]==='It is raining outside today.','وكل مشهدٍ برمزه وجملته بالترتيب');
ok(vp.good.c.length===3&&vp.good.a===1,'والسؤال بخياراته وموضع الصواب');
ok(vp.fewScenes===null,'وأقلّ من ثلاثة مشاهد يُرفض');
ok(vp.gapScene===null,'ومشاهد بفجوة رقمية (١،٣،٤ بلا ٢) تُرفض');
ok(vp.arContam===null,'وتلوّثٌ عربي في جملة مشهدٍ يُرفض');
ok(vp.missing===null,'ونصٌّ بلا وسم TITLE/SCENE يُرفض');
await page.evaluate(()=>{try{lsDel('mawhiba_video_aibank_v1')}catch(e){}});
genCalls=[];genReply=GOOD_VIDEO_GEN;
await page.evaluate(level=>videoGenTopUp(level),'A1');
await page.waitForTimeout(300);
ok(genCalls.some(c=>c.mode==='gen'&&c.domain==='video'&&c.level==='A1'),'videoGenTopUp يطلب توليداً بمستواها');
const videoAiBank=await page.evaluate(()=>genBankLoad('mawhiba_video_aibank_v1'));
ok(videoAiBank.length>=1&&videoAiBank[0].lv==='A1'&&videoAiBank[0].ai===true,'والعنصر المقبول يدخل بنك التوليد المحلّي');
const videoMerged=await page.evaluate(()=>videoBankFor('A1'));
ok(videoMerged.some(x=>x.ai===true)&&videoMerged.some(x=>!x.ai),'ويظهر ضمن videoBankFor مع البنك المؤلَّف — لا بديلاً عنه');
// وبما أن VIDEO_N=5 من بنك ٦/مستوى، نصف البنك فأكثر يُستهلك بجلسةٍ واحدة — فمعدّل التوليد مرفوع
const vCalls=await page.evaluate(()=>genCallsFor(6,5));
ok(vCalls>1,`ونداءاتٌ متعدّدة لبنكٍ صغيرٍ كبنك الفيديو (${vCalls})`);

console.log('\n٩ب) لا انحدار بعد وصل التوليد بالفيديو');
page=await mk('index.html');
await page.evaluate(()=>startVideo());
await page.waitForTimeout(300);
ok((await page.evaluate(()=>window.__ERRS.length))===0,'ولا خطأ عند بدء الجلسة رغم نداء التوليد الصامت');

console.log('\n١٠) لا انحدار');
for(const [pg,fn,md] of [['index.html',"startVideo()",'video'],['index.html',"startListen()",'listen'],
  ['index.html',"home()",'home'],['mohammed.html',"startVideo()",'video'],['mohammed.html',"startCoach()",'coach']]){
  const pp=await mk(pg);
  const r2=await pp.evaluate(x=>{try{eval(x);return{m:mode}}catch(err){return{err:err.message}}},fn);
  ok(!r2.err&&r2.m===md,`${pg} ${fn} → ${r2.err||r2.m}`);
  ok((await pp.evaluate(()=>censusMissing())).length===0,`${pg}: كل الدوال معرَّفة`);
  ok((await pp.evaluate(()=>window.__ERRS.length))===0,`${pg}: لا خطأ`);
}

console.log('\n'+(fails?`=== ${fails} فشل ===`:'=== كل الاختبارات نجحت ==='));
await b.close();process.exit(fails?1:0);
})();
