const {chromium}=require('/opt/node22/lib/node_modules/playwright');
let fails=0;const ok=(c,m)=>{console.log((c?'  ✓ ':'  ✗ FAIL ')+m);if(!c)fails++};
(async()=>{
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium',
  args:['--use-fake-device-for-media-stream','--use-fake-ui-for-media-stream']});
const ctx=await b.newContext({viewport:{width:420,height:900},permissions:['microphone']});
const logs=[];let calls=[];
let chat={ok:true,reply:"That sounds fun!\nSAY: I went to the beach. | I went to the park."};
const mk=async()=>{
  const page=await ctx.newPage();
  page.on('pageerror',e=>{console.log('  ✗ PAGEERROR '+e.message);fails++});
  await page.route('**/rest/v1/**',async r=>{
    let x={};try{x=JSON.parse(r.request().postData()||'{}')}catch(e){}
    logs.push(x);r.fulfill({status:201,contentType:'application/json',body:'[]'});
  });
  await page.route('**/functions/v1/assess-pronunciation-groq',r=>
    r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({ok:true,heard:"I went to the beach"})}));
  await page.route('**/functions/v1/assess-azure',r=>
    r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({ok:true,noAssessment:true,nbestKeys:[],hasWords:0,raw:"{}"})}));
  await page.route('**/functions/v1/tutor',async r=>{
    let x={};try{x=JSON.parse(r.request().postData()||'{}')}catch(e){}
    calls.push(x);r.fulfill({status:200,contentType:'application/json',body:JSON.stringify(chat)});
  });
  await page.addInitScript(()=>{
    window.__SPOKE=[];
    Object.defineProperty(window,'speechSynthesis',{configurable:true,value:{speak(u){window.__SPOKE.push(u&&u.text)},cancel(){},resume(){},pause(){},
      getVoices:()=>[{lang:'en-US',name:'X'}],speaking:false,pending:false}});
    window.SpeechSynthesisUtterance=function(t){this.text=t};
  });
  await page.goto('http://127.0.0.1:8931/index.html');
  await page.waitForFunction(()=>typeof piPickBand==='function');
  return page;
};
const turn=page=>page.evaluate(()=>{coachElapsed=2.5;
  wavInRate=16000;wavBuf=[(function(){const n=16000,f=new Float32Array(n);
    for(let i=0;i<n;i++)f[i]=0.4*Math.sin(2*Math.PI*220*i/16000);return f})()];
  coachChunks=[new Blob(["x"],{type:"audio/webm"})];
  coachRec={mimeType:"audio/webm",state:"inactive"};coachBusy=true;return coachFinish()});

let page=await mk();

console.log('\n١) المحادثة: سؤال مفتوح كل ثالث دور، لا «هذا أم ذاك» ثماني مرّات');
await page.evaluate(()=>{startCoach();coachPick(4);coachMode('suggest')});
await page.waitForTimeout(300);
calls.length=0;
const opens=[];
for(let i=0;i<6;i++){await turn(page);await page.waitForTimeout(150);
  opens.push(!!(calls[calls.length-1]||{}).openTurn)}
ok(opens.filter(Boolean).length===2,`طُلب المفتوح مرّتين في ستّ (${opens.map(x=>x?'✓':'·').join('')})`);
ok(opens[2]===true&&opens[5]===true,'عند الثالث والسادس');
ok(opens[0]===false&&opens[1]===false,'ولا في كل دور — وإلا عاد الحمل الذي رفعناه');
ok((calls[0]||{}).easy===true&&(calls[0]||{}).suggest===true,'والوضع السهل قائم كما هو');

console.log('\n٢) وفي وضع «وحدي» لا معنى للتناوب — الأسئلة مفتوحة أصلاً');
await page.evaluate(()=>{startCoach();coachPick(4);coachMode('solo')});
await page.waitForTimeout(200);calls.length=0;
await turn(page);await page.waitForTimeout(150);
ok((calls[0]||{}).easy===false,'بلا تسهيل');

console.log('\n٣) بوّابة الرتبة في ٣٫١٤: تُحجب الخيارات حتى تُحدَّد الرتبة');
await page.evaluate(()=>{startBasics('pimul');basicsStage=4;basicsNew()});
await page.waitForTimeout(200);
let t=await page.textContent('#app');
ok(await page.evaluate(()=>piGateOn())===true,'البوّابة قائمة');
ok(t.includes('ما رتبة الجواب؟'),'ويُسأل عن الرتبة');
ok(t.includes('احسبي ٣ ×'),'ومعه الطريقة: ٣ × العدد');
ok(await page.evaluate(()=>document.querySelectorAll('.choice').length)===0,'ولا خيار جواب ظاهر');
const V=await page.evaluate(()=>({v:piVals(),a:basicsCur.fam.a,ans:basicsCur.fam.c}));
ok(V.v[1]!==V.v[0]&&V.v[1]!==V.v[2],`ثلاث رتب متمايزة: ${V.v.join(' · ')}`);
ok(Math.abs(V.v[0]*10-V.v[1])<1e-6||Math.abs(V.v[1]*10-V.v[2])<1e-6,'كلٌّ عشرة أضعاف التي قبلها');

console.log('\n٤) موضع الصواب يتغيّر — لا يُحفَظ بالضغط نفسه');
const spots=await page.evaluate(()=>{const s=[];for(let i=0;i<40;i++){piArm();s.push(piOrder.indexOf(1))}return s});
ok(new Set(spots).size===3,`الصواب يقع في المواضع الثلاثة (${[...new Set(spots)].sort().join(',')})`);

console.log('\n٥) الخطأ يُسمّي القاعدة، والصواب يفتح الحساب');
await page.evaluate(()=>{basicsStage=4;basicsNew();const w=piOrder.indexOf(1)===0?1:0;piPickBand(w)});
await page.waitForTimeout(150);
t=await page.textContent('#app');
ok(t.includes('٣٫١٤ أكبر قليلاً من ٣'),'يُقال لها لماذا');
ok(/٣ × [٠-٩]+ = [٠-٩]+/.test(t),'ومعه الحساب التقديري بالأرقام');
ok(await page.evaluate(()=>document.querySelectorAll('.choice').length)===0,'وتبقى الخيارات محجوبة');
await page.evaluate(()=>{piPickBand(piOrder.indexOf(1))});
await page.waitForTimeout(150);
ok(await page.evaluate(()=>piOk())===true,'وبالصواب تُفتح');
ok((await page.textContent('#app')).includes('الآن احسبيه بالضبط'),'ويُقال لها ما بعدها');
ok(await page.evaluate(()=>document.querySelectorAll('.choice').length)>0,'وتظهر الخيارات');

console.log('\n٦) والاختيار يُسجَّل بموضعه');
const mg=logs.filter(l=>l.qtype==='magnitude');
ok(mg.length>=2,`${mg.length} سطر رتبة`);
ok(mg.some(l=>l.is_correct===false)&&mg.some(l=>l.is_correct===true),'الخطأ والصواب كلاهما');
ok(mg.every(l=>/موضع/.test(l.response||'')),'ومعه الموضع');
ok(mg.every(l=>l.q_text&&l.q_text.includes('٣٫١٤')),'ونصّ المسألة');

console.log('\n٧) ولا تمسّ بقيّة الأساسيات');
for(const sub of ['multdiv','addcarry','subborrow']){
  await page.evaluate(x=>{startBasics(x);basicsStage=4;basicsNew()},sub);
  ok(await page.evaluate(()=>piGateOn())===false,`${sub}: بلا بوّابة رتبة`);
  ok(await page.evaluate(()=>document.querySelectorAll('.choice').length)>0,'  وخياراته ظاهرة');
}
await page.evaluate(()=>{startBasics('percent');basicsStage=4;basicsNew()});
ok((await page.textContent('#app')).includes('أين يقع الجواب تقريباً'),'والنسبة المئوية تُبقي بوّابتها هي');

console.log('\n٨) ولا في المرحلة الأولى (المثال المحلول)');
await page.evaluate(()=>{startBasics('pimul');basicsStage=1;basicsNew()});
ok(await page.evaluate(()=>piGateOn())===false,'المرحلة ١ بلا بوّابة');

console.log('\n٩) لا قالبان متطابقان متتاليان');
const rep=await page.evaluate(()=>{
  const bad={quant:0,flex:0},seen={quant:0,flex:0};
  for(let r=0;r<40;r++){
    ['quant','flex'].forEach(function(d){
      const L=(d==='quant')?drawSpread(QUANT_GENS,12):drawSpread(FLEX_GENS,12);
      for(let i=1;i<L.length;i++){seen[d]++;if(tmplKey(L[i])===tmplKey(L[i-1]))bad[d]++}
    });
  }
  return{bad,seen};
});
ok(rep.bad.quant===0,`الكمّي: ${rep.bad.quant} تتابع من ${rep.seen.quant} موضعاً`);
ok(rep.bad.flex===0,`والمرونة: ${rep.bad.flex} من ${rep.seen.flex}`);

console.log('\n١٠) والقالب يُعرَف بنزع الأرقام لا بوسم يدوي');
const k=await page.evaluate(()=>[
  tmplKey({q:"في الدائرة: العلوي = حاصل ضرب السفليين. إذا كان العلوي ٢٠ وأحد السفليين ٤، فما الآخر؟"}),
  tmplKey({q:"في الدائرة: العلوي = حاصل ضرب السفليين. إذا كان العلوي ١٢ وأحد السفليين ٤، فما الآخر؟"}),
  tmplKey({q:"أكمل المتتالية: ٧ ، ١٢ ، ١٧ ، ٢٢ ، ..."}),
]);
ok(k[0]===k[1],'السؤالان اللذان خدعاها ليلة أمس صارا قالباً واحداً');
ok(k[0]!==k[2],'ومتتالية مختلفة قالب آخر');
ok((await page.evaluate(()=>tmplKey({}))).length===0,'وسؤال بلا نصّ لا يكسر شيئاً');
// الحصّة: لا يزيد قالب واحد على ثلث الأسئلة، وإلا فلا ترتيب يُباعد بينها
const capChk=await page.evaluate(()=>{let worst=0;for(let r=0;r<30;r++){const L=drawSpread(FLEX_GENS,12),c={};
  L.forEach(x=>{const k=tmplKey(x);c[k]=(c[k]||0)+1});worst=Math.max(worst,Math.max.apply(null,Object.keys(c).map(k=>c[k])))}return worst});
ok(capChk<=4,`وأكثر قالب تكراراً في اثني عشر سؤالاً: ${capChk}`);

console.log('\n١١) وعدد الأسئلة لا ينقص');
const cnt=await page.evaluate(()=>drawSpread(FLEX_GENS,12).length);
ok(cnt===12,`اثنا عشر سؤالاً كما كانت (${cnt})`);

console.log('\n١٢) لا انحدار');
for(const [fn,md] of [["startBasics('pimul')",'basics'],["startEngPlan()",'engplan'],["startFade('seq')",'fade'],
  ["startDictation()",'dictation'],["startPronunciation()",'pron'],["startCoach()",'coach'],["home()",'home']]){
  const r=await page.evaluate(x=>{try{eval(x);return{m:mode}}catch(e){return{err:e.message}}},fn);
  ok(!r.err&&r.m===md,`${fn} → ${r.err||r.m}`);
}
ok((await page.evaluate(()=>censusMissing())).length===0,'وكل الدوال معرَّفة');
ok((await page.evaluate(()=>window.__ERRS.length))===0,'ولا خطأ');

await b.close();
console.log(fails?`\n=== ${fails} فشل ===`:'\n=== كل الاختبارات نجحت ===');
process.exit(fails?1:0);
})();
