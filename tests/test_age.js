const {chromium}=require('/opt/node22/lib/node_modules/playwright');
let fails=0;const ok=(c,m)=>{console.log((c?'  ✓ ':'  ✗ FAIL ')+m);if(!c)fails++};
(async()=>{
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium',
  args:['--use-fake-device-for-media-stream','--use-fake-ui-for-media-stream']});
const ctx=await b.newContext({viewport:{width:420,height:900},permissions:['microphone']});
let calls=[];
const mk=async(f)=>{
  const page=await ctx.newPage();
  page.on('pageerror',e=>{console.log('  ✗ PAGEERROR '+e.message);fails++});
  await page.route('**/rest/v1/**',r=>r.fulfill({status:201,contentType:'application/json',body:'[]'}));
  await page.route('**/functions/v1/assess-pronunciation-groq',r=>
    r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({ok:true,heard:"I need a card"})}));
  await page.route('**/functions/v1/assess-azure',r=>
    r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({ok:true,noAssessment:true,nbestKeys:[],hasWords:0,raw:"{}"})}));
  await page.route('**/functions/v1/tutor',async r=>{
    let x={};try{x=JSON.parse(r.request().postData()||'{}')}catch(e){}
    calls.push(x);r.fulfill({status:200,contentType:'application/json',
      body:JSON.stringify({ok:true,reply:"Sure.\nSAY: I need a card. | I want a card."})});
  });
  await page.addInitScript(()=>{
    Object.defineProperty(window,'speechSynthesis',{configurable:true,value:{speak(){},cancel(){},resume(){},pause(){},
      getVoices:()=>[{lang:'en-US',name:'X'}],speaking:false,pending:false}});
    window.SpeechSynthesisUtterance=function(t){this.text=t};
  });
  await page.goto('http://127.0.0.1:8931/'+f);
  await page.waitForFunction(()=>typeof coachLevel==='function');
  return page;
};
const turn=page=>page.evaluate(()=>{coachElapsed=2.5;
  wavInRate=16000;wavBuf=[(function(){const n=16000,f=new Float32Array(n);
    for(let i=0;i<n;i++)f[i]=0.4*Math.sin(2*Math.PI*220*i/16000);return f})()];
  coachChunks=[new Blob(["x"],{type:"audio/webm"})];
  coachRec={mimeType:"audio/webm",state:"inactive"};coachBusy=true;return coachFinish()});

console.log('\n١) العمر والمستوى في الملفّ');
let page=await mk('index.html');
const P=await page.evaluate(()=>PROFILES.map(p=>({id:p.id,age:p.age,level:p.level})));
ok(P.every(p=>p.age>0&&p.level),`لكلٍّ عمره ومستواه: ${P.map(p=>p.id+' '+p.age+'/'+p.level).join(' · ')}`);
ok(P.filter(p=>p.id==='mohammed')[0].age===19,'ومحمد ١٩');
ok(P.filter(p=>p.id==='haya')[0].age===11,'وهيا ١١');

console.log('\n٢) هيا: A2 وحدها، وA1 مع الدعم');
await page.evaluate(()=>{startCoach();coachPick(0);coachMode('solo')});
ok(await page.evaluate(()=>coachLevel())==='A2','وحدها A2');
await page.evaluate(()=>{startCoach();coachPick(0);coachMode('suggest')});
ok(await page.evaluate(()=>coachLevel())==='A1','ومع الجمل A1');
calls.length=0;await turn(page);await page.waitForTimeout(200);
ok((calls[0]||{}).learner.age===11&&(calls[0]||{}).learner.level==='A2','وعمرها ومستواها الأصلي يصلان مع الطلب');
ok((calls[0]||{}).level==='A1','ومستوى الحديث المخفَّض معه');

console.log('\n٣) محمد: B1 وحده، وA2 مع الدعم — لا يهبط إلى مستواها');
const m=await mk('mohammed.html');
await m.evaluate(()=>{startCoach();coachPick(0);coachMode('solo')});
ok(await m.evaluate(()=>coachLevel())==='B1','وحده B1');
await m.evaluate(()=>{startCoach();coachPick(0);coachMode('suggest')});
ok(await m.evaluate(()=>coachLevel())==='A2','ومع الجمل A2 — درجة واحدة لا هبوطاً إلى A1');
calls.length=0;await turn(m);await m.waitForTimeout(200);
const c=calls[0]||{};
ok(c.learner.age===19,`وعمره يصل (${c.learner.age})`);
ok(c.learner.gender==='male'&&c.learner.name==='محمد','ومعه اسمه وجنسه');

console.log('\n٤) والمعلّم في بقيّة الأقسام يعرف العمر كذلك');
calls.length=0;
await page.evaluate(()=>tutorStart({subject:"لغة إنجليزية",question:"q",studentAnswer:"a",correctAnswer:"b",age:(profileOf().age||11)}));
await page.waitForTimeout(300);
ok((calls[0]||{}).age===11,`هيا ١١ (${(calls[0]||{}).age})`);

console.log('\n٥) لا انحدار');
for(const [fn,md] of [["startBasics('pimul')",'basics'],["startEngPlan()",'engplan'],["startCoach()",'coach'],["home()",'home']]){
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
