const {chromium}=require('/opt/node22/lib/node_modules/playwright');
let fails=0;const ok=(c,m)=>{console.log((c?'  ✓ ':'  ✗ FAIL ')+m);if(!c)fails++};
(async()=>{
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'});
const page=await b.newPage({viewport:{width:420,height:900}});
page.on('pageerror',e=>{console.log('  ✗ PAGEERROR '+e.message);fails++});
await page.route('**/rest/v1/**',r=>r.fulfill({status:201,contentType:'application/json',body:'[]'}));
await page.addInitScript(()=>{
  Object.defineProperty(window,'speechSynthesis',{configurable:true,value:{speak(){},cancel(){},resume(){},pause(){},getVoices:()=>[{lang:'en-US',name:'X'}],speaking:false,pending:false}});
  window.SpeechSynthesisUtterance=function(t){this.text=t};
});
await page.goto('http://127.0.0.1:8931/index.html');
await page.waitForFunction(()=>typeof flexMultiStep==='function');

console.log('\n١) أسئلتها الحقيقية من جلسة ١١:١٤ — التي مرّت كلها بلا بوّابة');
const real=await page.evaluate(()=>{
  const S=[
    {q:"زاوية كبيرة قياسها ٤٢° مقسومة بأشعّة إلى ٣ زوايا متساوية (الأقواس الخضراء بالرسم). ما قياس الزاوية ص؟",d:"flex",svg:"<svg/>",want:true,why:"أجابت ٤٢° في ١٫٤ ثانية — صدى الرقم"},
    {q:"لغز الأشكال: ★ + ● + ● = ٢٠، وكانت ● = ٦. فما قيمة ★؟",d:"flex",want:true,why:"أجابت ٦ في ٢٫٨ ثانية — أعادت قيمة ●"},
    {q:"دائرة مقسومة: العلوي = مجموع السفليين. إذا كان السفليان ٩ و ٢، فما العلوي؟",d:"flex",svg:"<svg/>",want:true,why:"أجابت ١٣ في ١٫٦ ثانية والصواب ١١"},
    {q:"هرم عددي: مجموع العددين السفليين × ٢ = العلوي. ما العدد الناقص؟",d:"flex",svg:"<svg/>",want:true,why:"رسم — يحتاج مسحاً بصرياً"},
    {q:"لاحظي دوران الشكل في التسلسل (باتجاه عقارب الساعة)، ما الشكل التالي؟",d:"flex",svg:"<svg/>",want:true,why:"رسم"},
    {q:"أكمل النمط: ٣ ، ٩ ، ٢٧ ، ٨١ ، ...",d:"flex",want:true,why:"أربعة أرقام — حساب"},
    {q:"ما ضدّ كلمة «طويل»؟",d:"flex",want:false,why:"استرجاع كلمة — كالمفردات، لا تُبوَّب"},
  ];
  return S.map(x=>({q:x.q,want:x.want,why:x.why,got:flexMultiStep(x),secs:gateSecondsFor(x)}));
});
real.forEach(r=>{
  ok(r.got===r.want&&(r.want?r.secs>=8:r.secs===0),
     `${r.want?'يُبوَّب ('+r.secs+' ث)':'بلا بوّابة'} — ${r.why}`);
});

console.log('\n٢) الرسم يُعطى وقتاً أطول');
const t2=await page.evaluate(()=>({withSvg:gateSecondsFor({q:"ما الشكل التالي؟",d:"flex",svg:"<svg/>"}),
  nums:gateSecondsFor({q:"★ + ● = ١٢ و● = ٥",d:"flex"})}));
ok(t2.withSvg===12,`رسم ⇒ ١٢ ثانية (${t2.withSvg})`);
ok(t2.nums===8,`وأرقام بلا رسم ⇒ ٨ ثوانٍ (${t2.nums})`);

console.log('\n٣) لا يمسّ المجالات الأخرى');
const others=await page.evaluate(()=>({
  vocab:gateSecondsFor({q:"ما مرادف كلمة 'سريع'؟",d:"verbal",qtype:"vocabulary"}),
  sci:gateSecondsFor({q:"أي مما يلي من الثدييات وله ٤ أرجل و٢ عين؟",d:"science"}),
  quantSimple:gateSecondsFor({q:"٧ × ٨ = ؟",d:"quant"}),
  reading:gateSecondsFor({q:"نصّ طويل. ما الهدف؟",d:"verbal",qtype:"reading"}),
}));
ok(others.vocab===0,'المفردات بلا بوّابة كما كانت');
ok(others.sci===0,'والعلوم كذلك رغم أرقامها');
ok(others.quantSimple===0,'و«٧ × ٨» يبقى مفتوحاً');
ok(others.reading===12,'والفهم المقروء ١٢ ثانية');

console.log('\n٤) البوّابة تعمل على الشاشة بنصّها الخاصّ');
await page.evaluate(()=>{
  filtered=[{q:"زاوية كبيرة قياسها ٤٢° مقسومة بأشعّة إلى ٣ زوايا متساوية. ما قياس الزاوية ص؟",d:"flex",svg:"<svg width='10' height='10'></svg>",
    c:["١٤°","٤٢°","٢١°","٧°"],a:0,w:"شرح"}];
  idx=0;picked=null;locked=false;done=false;loading=false;score=0;answered=[];
  mode="quiz";currentMode="flex";gateStart(filtered[0]);render();
});
ok(await page.evaluate(()=>gateSecs)===12,'اثنتا عشرة ثانية');
ok(await page.evaluate(()=>gateKind)==='flex','ونوعها flex');
ok(await page.evaluate(()=>document.querySelectorAll('.choice').length)===0,'ولا خيار واحد ظاهر');
let t=await page.textContent('#app');
ok(t.includes('تأمّلي الشكل والأرقام قبل الخيارات'),'ونصّها خاصّ بالمرونة');
ok(t.includes('الجواب ليس رقماً مذكوراً في السؤال'),'ويُسمّي خطأها بالاسم: صدى الرقم');
await page.evaluate(()=>{gateLeft=0;gateStop();render()});
ok(await page.evaluate(()=>document.querySelectorAll('.choice').length)===4,'وبعد الزمن تظهر الأربعة');

console.log('\n٥) فحص شامل على بنك المرونة الحقيقي');
const sweep=await page.evaluate(()=>{
  const bad=[],seen={gated:0,open:0},openQ=[];
  for(let i=0;i<300;i++){
    let it=null;try{it=uniqueFromGens(FLEX_GENS)}catch(e){break}
    if(!it||it.d!=='flex')continue;
    const s=gateSecondsFor(it);
    if(s>0){seen.gated++;if(s<8||s>45)bad.push(`زمن شاذّ ${s}`)}
    else{seen.open++;openQ.push(String(it.q||"").slice(0,40))}
  }
  return{bad,seen,openSample:[...new Set(openQ)].slice(0,5)};
});
ok(sweep.bad.length===0,sweep.bad.length?sweep.bad.slice(0,3).join(' | ')
  :`${sweep.seen.gated} سؤالاً مُبوَّباً و${sweep.seen.open} مفتوحاً`);
ok(sweep.seen.gated>0,'والبنك فيه ما يُبوَّب');
console.log('   المفتوح منها: '+(sweep.openSample.join(' · ')||'لا شيء'));

console.log('\n٦) حدّ بوّابات التصحيح: اثنتان في الجلسة لا أربع');
await page.evaluate(()=>{
  localStorage.setItem('mawhiba_eng_item_err_v1',JSON.stringify({
    g1:{wrong:3,last:"x",same:2},g2:{wrong:3,last:"x",same:2},
    g3:{wrong:3,last:"x",same:2},g4:{wrong:3,last:"x",same:2}}));
});
const opened=await page.evaluate(()=>{
  startEngPlan();
  planItems=['g1','g2','g3','g4'].map(id=>({id,t:'grammar',lesson:'l_x',q:'q '+id,c:['a','b'],a:0,w:'w'}));
  planIdx=-1;cxDoneThisPlan=true;fixCountThisPlan=0;
  let n=0;
  for(let i=0;i<4;i++){
    planNext();
    if(fixOn){n++;fixOn=false;fixItem=null}
    planLocked=true; // نُقفل لنسمح بالانتقال
  }
  return{n,count:fixCountThisPlan};
});
ok(opened.n===2,`فُتحت بوّابتان من أربع مستحقّات (${opened.n})`);
ok(opened.count===2,'والعدّاد يطابق');
ok(await page.evaluate(()=>{startEngPlan();return fixCountThisPlan})===0,'ويُصفَّر مع كل خطة جديدة');

console.log('\n٧) لا انحدار');
for(const [fn,md] of [["startBasics('percent')",'basics'],["startFactPlan()",'factplan'],["startEngPlan()",'engplan'],
  ["startDictation()",'dictation'],["startPronunciation()",'pron'],["startCoach()",'coach'],
  ["startAudioDiag()",'audiodiag'],["home()",'home']]){
  const r=await page.evaluate(x=>{try{eval(x);return{m:mode}}catch(e){return{err:e.message}}},fn);
  ok(!r.err&&r.m===md,`${fn} → ${r.err||r.m}`);
}
ok((await page.evaluate(()=>censusMissing())).length===0,'وكل الدوال معرَّفة');
ok((await page.evaluate(()=>window.__ERRS.length))===0,'ولا خطأ');

await b.close();
console.log(fails?`\n=== ${fails} فشل ===`:'\n=== كل الاختبارات نجحت ===');
process.exit(fails?1:0);
})();
