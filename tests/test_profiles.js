const {chromium}=require('/opt/node22/lib/node_modules/playwright');
let fails=0;const ok=(c,m)=>{console.log((c?'  ✓ ':'  ✗ FAIL ')+m);if(!c)fails++};
(async()=>{
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium',
  args:['--use-fake-device-for-media-stream','--use-fake-ui-for-media-stream']});
const ctx=await b.newContext({viewport:{width:420,height:900},permissions:['microphone']});
const logs=[];let calls=[];
let chat={ok:true,reply:"That sounds lovely. What kind of coffee do you enjoy most?"};
const mk=async(q)=>{
  const page=await ctx.newPage();
  page.on('pageerror',e=>{console.log('  ✗ PAGEERROR '+e.message);fails++});
  await page.route('**/rest/v1/**',async r=>{
    let x={};try{x=JSON.parse(r.request().postData()||'{}')}catch(e){}
    logs.push(x);r.fulfill({status:201,contentType:'application/json',body:'[]'});
  });
  await page.route('**/functions/v1/assess-pronunciation-groq',r=>
    r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({ok:true,heard:"I want coffee"})}));
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
  await page.goto('http://127.0.0.1:8931/'+(q||'index.html'));
  await page.waitForFunction(()=>typeof profileBarHTML==='function');
  return page;
};
const turn=page=>page.evaluate(()=>{coachElapsed=2.5;
  wavInRate=16000;wavBuf=[(function(){const n=16000,f=new Float32Array(n);
    for(let i=0;i<n;i++)f[i]=0.4*Math.sin(2*Math.PI*220*i/16000);return f})()];
  coachChunks=[new Blob(["x"],{type:"audio/webm"})];
  coachRec={mimeType:"audio/webm",state:"inactive"};coachBusy=true;return coachFinish()});

let page=await mk();

console.log('\n١) ثلاث صفحات، وهيا هي الرئيسية');
const P=await page.evaluate(()=>({list:PROFILES.map(p=>({id:p.id,name:p.name,alias:p.alias})),cur:profileId()}));
ok(P.list.length===3,`ثلاث صفحات: ${P.list.map(x=>x.name).join('، ')}`);
ok(P.cur==='haya','وفتح index.html بلا شيء ⇒ هيا — فلا يتغيّر شيء عندها');
ok(P.list.some(x=>x.id==='mohammed')&&P.list.some(x=>x.id==='elias'),'ومحمد وإلياس موجودان');
ok(!(await page.textContent('#app')).includes('صفحة من؟'),'ولا مبدِّل في صفحتها');
ok(await page.evaluate(()=>typeof profileSet)==='undefined','ولا دالّة تبديل أصلاً');
ok(await page.evaluate(()=>profileBarHTML())==='','ولا عنوان فوق رئيسيّتها');

console.log('\n٢) هيا بلا بادئة — بياناتها القديمة كما هي');
const keys=await page.evaluate(()=>({haya:pkey("mawhiba_eng_item_err_v1")}));
ok(keys.haya==='mawhiba_eng_item_err_v1','مفتاح هيا هو المفتاح القديم نفسه — لا يُضيَّع شهر عمل');
ok(await page.evaluate(()=>alias())==='بنتي','واسمها في السجلّ «بنتي» كما كان');

console.log('\n٣) لكلٍّ رابطه: mohammed.html و elias.html');
for(const [file,id,name] of [['mohammed.html','mohammed','محمد'],['elias.html','elias','إلياس']]){
  const pg=await ctx.newPage();
  await pg.goto('http://127.0.0.1:8931/'+file);
  await pg.waitForFunction(()=>typeof profileBarHTML==='function');
  ok(pg.url().includes('p='+id),`${file} ⇒ ${pg.url().split('/').pop()}`);
  ok(await pg.evaluate(()=>profileId())===id,`وصاحبها ${name}`);
  ok((await pg.textContent('#app')).includes('صفحة '+name),'وعنوان صفحته ظاهر فوقها');
  await pg.close();
}

console.log('\n٤) الرابط يفصل التخزين المحلّي فصلاً تامّاً');
await page.evaluate(()=>{lsSet("mawhiba_eng_item_err_v1",JSON.stringify({u2_g3:{wrong:9,last:"هيا",same:8}}))});
let mo=await mk('index.html?p=mohammed');
ok(await mo.evaluate(()=>profileId())==='mohammed','صفحة محمد');
ok(await mo.evaluate(()=>pkey("mawhiba_eng_item_err_v1"))==='mohammed::mawhiba_eng_item_err_v1','ومفاتيحه مبدوءة باسمه');
ok(await mo.evaluate(()=>lsGet("mawhiba_eng_item_err_v1"))===null,'ولا يرى أخطاء هيا إطلاقاً');
ok(await mo.evaluate(()=>alias())==='محمد','واسمه في السجلّ «محمد» لا «بنتي»');
await mo.evaluate(()=>{lsSet("mawhiba_eng_item_err_v1",JSON.stringify({u5_g1:{wrong:2,last:"محمد",same:1}}))});
logs.length=0;
await mo.evaluate(()=>logAnswer("coach","say",null,"hello","cafe",1000,{}));
await mo.waitForTimeout(400);
ok(logs.some(l=>l.student_alias==='محمد'),'وسطره على الخادم باسمه — فلا يختلط صوتان بعد اليوم');
await mo.close();
// وهيا: بياناتها سليمة، ولا يجرّها فتحُ أخيها إلى صفحته
page=await mk();
ok(await page.evaluate(()=>profileId())==='haya','ورجوعها إلى index.html يفتح صفحتها هي');
const back=await page.evaluate(()=>JSON.parse(lsGet("mawhiba_eng_item_err_v1")||"{}"));
ok(back.u2_g3&&back.u2_g3.wrong===9,'وبياناتها كما تركناها');
ok(!back.u5_g1,'وبيانات محمد لم تتسرّب إليها');
logs.length=0;
await page.evaluate(()=>logAnswer("coach","say",null,"hello","cafe",1000,{}));
await page.waitForTimeout(400);
ok(logs.some(l=>l.student_alias==='بنتي'),'وسطرها باسمها');

console.log('\n٤ب) رابط مجهول لا يفتح صفحة أحد إلا هيا');
const bad=await mk('index.html?p=zzz');
ok(await bad.evaluate(()=>profileId())==='haya','p=zzz ⇒ هيا');
await bad.close();

console.log('\n٥) الأسلوب: لكل موقف أسلوبه، ويصل إلى الشريك');
const foci=await page.evaluate(()=>COACH_SCENES.filter(s=>!s.free).map(s=>({id:s.id,f:s.focus||"",len:(s.focus||"").length})));
foci.forEach(f=>ok(f.len>40,`${f.id}: أسلوب مكتوب (${f.f.slice(0,46)}…)`));
ok(foci.some(f=>/polite/i.test(f.f)),'والمقهى أسلوبه الطلب المهذّب');
ok(foci.some(f=>/story|past/i.test(f.f)),'والرحلة سرد بالماضي');
ok(foci.some(f=>/opinion|because/i.test(f.f)),'والحيوانات إبداء رأي مع سبب');

console.log('\n٦) نصيحة الأسلوب كل ثالثة جملة لا في كل دور');
await page.evaluate(()=>{startCoach();coachPick(0);coachMode('solo')});
calls.length=0;
const tips=[];
for(let i=0;i<6;i++){await turn(page);await page.waitForTimeout(150);
  tips.push(!!(calls[calls.length-1]||{}).styleTip)}
ok(tips.filter(Boolean).length===2,`طُلبت النصيحة مرّتين في ستّ جمل (${tips.map(x=>x?'✓':'·').join('')})`);
ok(tips[2]===true&&tips[5]===true,'عند الثالثة والسادسة تحديداً');
ok(tips[0]===false&&tips[1]===false,'ولا تُطلب في كل دور — التصحيح الدائم يقطع الحديث');
ok((calls[0]||{}).focus&&calls[0].focus.length>40,'وأسلوب الموقف يُمرَّر مع كل طلب');

console.log('\n٧) النصيحة تُعرض مستقلّة ولا تُنطق مع الردّ');
chat={ok:true,reply:"Of course, one black coffee coming up.\nTIP: You could say 'Could I have a black coffee, please?'"};
await page.evaluate(()=>{startCoach();coachPick(0);coachMode('solo')});
await page.evaluate(()=>{window.__SPOKE.length=0});
await turn(page);await page.waitForTimeout(500);
let t=await page.textContent('#app');
ok(t.includes('Of course, one black coffee coming up.'),'الردّ معروض');
ok(t.includes("Could I have a black coffee, please?"),'والنصيحة معروضة');
ok(t.includes('💡'),'ومميّزة بعلامتها');
const spoke=await page.evaluate(()=>window.__SPOKE.filter(Boolean));
ok(spoke.some(x=>x.includes('coming up')),'والردّ يُنطق');
ok(!spoke.some(x=>x.includes('Could I have')),'والنصيحة لا تُنطق — صوتها يكسر الموقف');
ok(await page.evaluate(()=>coachMsgs.slice(-1)[0].text.indexOf('TIP')<0),'ولا يبقى وسم TIP في نصّ الردّ');

console.log('\n٨) ردّ بلا نصيحة يبقى كما هو');
chat={ok:true,reply:"That sounds nice. What do you usually drink in the morning?"};
await page.evaluate(()=>{startCoach();coachPick(0);coachMode('solo')});
await turn(page);await page.waitForTimeout(400);
ok(await page.evaluate(()=>coachMsgs.slice(-1)[0].tip)===null,'بلا نصيحة');
ok((await page.textContent('#app')).includes('What do you usually drink'),'والردّ كامل');

console.log('\n٩) لا انحدار');
for(const [fn,md] of [["startBasics('percent')",'basics'],["startFactPlan()",'factplan'],["startEngPlan()",'engplan'],
  ["startDictation()",'dictation'],["startPronunciation()",'pron'],["startCoach()",'coach'],
  ["startAudioDiag()",'audiodiag'],["home()",'home']]){
  const r=await page.evaluate(x=>{try{eval(x);return{m:mode,len:document.getElementById('app').textContent.length}}catch(e){return{err:e.message}}},fn);
  ok(!r.err&&r.m===md&&r.len>40,`${fn} → ${r.err||r.m}`);
}
ok((await page.evaluate(()=>censusMissing())).length===0,'وكل الدوال معرَّفة');
ok((await page.evaluate(()=>window.__ERRS.length))===0,'ولا خطأ');

await b.close();
console.log(fails?`\n=== ${fails} فشل ===`:'\n=== كل الاختبارات نجحت ===');
process.exit(fails?1:0);
})();
