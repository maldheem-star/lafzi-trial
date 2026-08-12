const {chromium}=require('/opt/node22/lib/node_modules/playwright');
let fails=0;const ok=(c,m)=>{console.log((c?'  ✓ ':'  ✗ FAIL ')+m);if(!c)fails++};
(async()=>{
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium',
  args:['--use-fake-device-for-media-stream','--use-fake-ui-for-media-stream']});
const ctx=await b.newContext({viewport:{width:420,height:900},permissions:['microphone']});
const logs=[];let calls=[];
let chat={ok:true,reply:"Nice.\nSAY: I need a card. | I want a card."};
let review={ok:true,reply:"FIX: I have a work that I haven't worked to do | I have some work to do. | كلمة work لا تُعدّ، فلا يُقال a work\nFIX: studying my new college | I am studying for my new college. | الجملة تحتاج فاعلاً وفعلاً"};
let reviewFail=false;
const mk=async(f)=>{
  const page=await ctx.newPage();
  page.on('pageerror',e=>{console.log('  ✗ PAGEERROR '+e.message);fails++});
  await page.route('**/rest/v1/**',async r=>{
    let x={};try{x=JSON.parse(r.request().postData()||'{}')}catch(e){}
    logs.push(x);r.fulfill({status:201,contentType:'application/json',body:'[]'});
  });
  await page.route('**/functions/v1/assess-pronunciation-groq',r=>
    r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({ok:true,heard:"I need a card"})}));
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
    window.__SPOKE=[];
    Object.defineProperty(window,'speechSynthesis',{configurable:true,value:{speak(u){window.__SPOKE.push(u&&u.text)},cancel(){},resume(){},pause(){},
      getVoices:()=>[{lang:'en-US',name:'X'}],speaking:false,pending:false}});
    window.SpeechSynthesisUtterance=function(t){this.text=t};
  });
  await page.goto('http://127.0.0.1:8931/'+f);
  await page.waitForFunction(()=>typeof coachReview==='function');
  return page;
};

let page=await mk('index.html');

console.log('\n١) تنظيف قياس النطق: الصفر المتناقض يُهمَل');
const clean=await page.evaluate(()=>({
  contra:weakClean([{w:"a",p:"t",score:0},{w:"b",p:"r",score:40}],100).map(x=>x.p),
  low:weakClean([{w:"a",p:"t",score:0},{w:"b",p:"r",score:40}],55).map(x=>x.p),
  edge:weakClean([{w:"a",p:"t",score:0}],90).length,
  keep:weakClean([{w:"a",p:"t",score:12}],95).map(x=>x.p),
}));
ok(clean.contra.join()==='r','درجة ١٠٠٪ مع صوت بصفر ⇒ يُهمَل الصفر');
ok(clean.low.join()==='t,r','ودرجة ٥٥٪ تُبقيه — التناقض هو الشرط لا الصفر');
ok(clean.edge===0,'وعند ٩٠٪ يُهمَل كذلك');
ok(clean.keep.join()==='t','والصوت الضعيف لا الصفر يبقى مهما علت الدرجة');

console.log('\n٢) ولا يُسمّى صوتٌ ضعيفاً إلا في كلمتين');
const sum=await page.evaluate(()=>{
  coachMsgs=[{role:"user",text:"a",pct:70,weak:[{w:"card",p:"r",score:40}]},
             {role:"user",text:"b",pct:70,weak:[{w:"morning",p:"r",score:50}]},
             {role:"user",text:"c",pct:70,weak:[{w:"card",p:"k",score:30}]}];
  return coachWeakSummary();
});
ok(sum.length===1&&sum[0].p==='r',`الصوت r وحده (${sum.map(x=>x.p).join()}) — وk في كلمة واحدة فلا يُتّهم`);
ok(sum[0].words.length===2&&sum[0].words.indexOf('card')>=0,`ومعه كلماته: ${sum[0].words.join(' · ')}`);

console.log('\n٣) الكلمات تُعرض مع الصوت في الخلاصة');
await page.evaluate(()=>{mode='coach';coachUnsupported=false;coachScene=COACH_SCENES[0];
  coachDone=true;coachFix=[];coachFixBusy=false;render()});
let t=await page.textContent('#app');
ok(t.includes('card')&&t.includes('morning'),'الكلمتان معروضتان');
ok(t.includes('اسمعي الكلمة ثم كرّريها'),'ومعهما ما تفعله');

console.log('\n٤) صفحة التصحيح تُطلب عند نهاية الجلسة');
page=await mk('index.html');
await page.evaluate(()=>{startCoach();coachPick(0);coachMode('solo')});
await page.waitForTimeout(200);
await page.evaluate(()=>{coachMsgs=[{role:"model",text:"hi"},
  {role:"user",text:"I have a work that I haven't worked to do",pct:80,weak:[]},
  {role:"user",text:"studying my new college",pct:70,weak:[]}]});
calls.length=0;logs.length=0;
await page.click('button[onclick="coachEnd()"]');
await page.waitForTimeout(600);
const rv=calls.filter(c=>c.mode==='review')[0]||{};
ok(!!rv.mode,'طُلبت المراجعة');
ok(rv.studentAnswer&&rv.studentAnswer.includes('1. I have a work'),'وجمله مُرقّمة');
ok(rv.studentAnswer.indexOf('hi')<0,'وبلا كلام الشريك — تُراجَع جمله هو');
ok(rv.learner&&rv.learner.age===11,'ومعها عمره ومستواه');

console.log('\n٥) وتُعرض: ما قال، وما الصحيح، ولماذا');
t=await page.textContent('#app');
ok(t.includes('جملك بعد التعديل'),'العنوان');
ok(t.includes("I have a work that I haven't worked to do"),'ما قاله');
ok(t.includes('I have some work to do.'),'والصحيح');
ok(t.includes('لا تُعدّ'),'والسبب بالعربية');
ok(t.includes('لم نقاطعك في أثناء الحديث'),'ويُقال لماذا جاء التصحيح متأخّراً');
ok(await page.evaluate(()=>document.querySelectorAll('#app button[onclick^="coachSay"]').length)>=2,'ولكل تصحيح زرّ نطق');
await page.click('button:has-text("اسمعي الصحيحة")');
await page.waitForTimeout(200);
ok((await page.evaluate(()=>window.__SPOKE.filter(x=>x&&x.trim()))).some(x=>x.includes('some work to do')),'والضغط يُسمع الصحيحة لا الخاطئة');

console.log('\n٦) والتصحيح يُسجَّل — فيُقاس أثره في الجلسة التالية');
const fx=logs.filter(l=>l.qtype==='fix');
ok(fx.length===2,`سطران للتصحيح (${fx.length})`);
ok(fx[0].response.includes('⇐'),'فيهما ما قال وما الصحيح');
ok(!!fx[0].q_text,'والسبب معهما');

console.log('\n٧) القراءة: أربعة تصحيحات على الأكثر، والفارغ يُهمَل');
const p1=await page.evaluate(()=>coachFixParse("FIX: a | b | c\nFIX: d | e\nFIX: bad line\nFIX: f | g | h\nFIX: i | j | k\nFIX: l | m | n"));
ok(p1.length===4,`أربعة لا ستّة (${p1.length})`);
ok(p1[1].why==='','وتصحيحٌ بلا سبب مقبول');
ok((await page.evaluate(()=>coachFixParse("NONE"))).length===0,'وNONE ⇒ لا شيء');
ok((await page.evaluate(()=>coachFixParse("Hello there"))).length===0,'وكلامٌ عاديّ يُهمَل');

console.log('\n٨) تعذّر المراجعة لا يُفسد الخلاصة');
reviewFail=true;
page=await mk('index.html');
await page.evaluate(()=>{startCoach();coachPick(0);coachMode('solo');
  coachMsgs=[{role:"user",text:"I go school",pct:80,weak:[]}]});
await page.waitForTimeout(150);
await page.click('button[onclick="coachEnd()"]');
await page.waitForTimeout(700);
t=await page.textContent('#app');
ok(t.includes('تعذّرت مراجعة الجمل'),'يُقال بصراحة');
ok(t.includes('والدرجات أعلاه سليمة'),'ولا تُشكَّك بقيّة الخلاصة');
ok(t.includes('تكلّمتِ'),'والخلاصة معروضة');
reviewFail=false;

console.log('\n٩) جلسة بلا أخطاء تُقال كما هي');
review={ok:true,reply:"NONE"};
page=await mk('index.html');
await page.evaluate(()=>{startCoach();coachPick(0);coachMode('solo');
  coachMsgs=[{role:"user",text:"I went to the beach.",pct:95,weak:[]}]});
await page.waitForTimeout(150);
await page.click('button[onclick="coachEnd()"]');
await page.waitForTimeout(700);
ok((await page.textContent('#app')).includes('لا جملة تحتاج تعديلاً'),'لا تُختلق أخطاء');

console.log('\n١٠) وعند محمد وإلياس كذلك، بأعمارهم');
review={ok:true,reply:"FIX: I go | I went. | الماضي"};
for(const [f,age] of [['mohammed.html',19],['elias.html',18]]){
  const p=await mk(f);
  await p.evaluate(()=>{startCoach();coachPick(0);coachMode('solo');
    coachMsgs=[{role:"user",text:"I go yesterday",pct:80,weak:[]}]});
  await p.waitForTimeout(150);
  calls.length=0;
  await p.click('button[onclick="coachEnd()"]');
  await p.waitForTimeout(600);
  const c=calls.filter(x=>x.mode==='review')[0]||{};
  ok(c.learner&&c.learner.age===age,`${f}: عمره ${c.learner&&c.learner.age}`);
  const tt=await p.textContent('#app');
  ok(tt.includes('جملك بعد التعديل')&&!/تكلّمتِ|اسمعي/.test(tt),'وبخطاب المذكّر');
  await p.close();
}

console.log('\n١١) لا انحدار');
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
