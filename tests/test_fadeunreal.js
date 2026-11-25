// تقوية «المقدّمة غير الواقعية» — ٢٥ نوفمبر. اختبارُ موهبة التجريبي ١ (٢٣ و٢٤ أخطأتهما في ١٫٨ و٢٫٨ث).
const {chromium}=require('/opt/node22/lib/node_modules/playwright');
let fails=0;const ok=(c,m)=>{console.log((c?'  ✓ ':'  ✗ FAIL ')+m);if(!c)fails++};
(async()=>{
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'});const p=await b.newPage({viewport:{width:390,height:1000}});
p.on('pageerror',e=>{console.log('  ✗ PAGEERROR '+e.message);fails++});
await p.route('**/rest/v1/**',r=>r.fulfill({status:201,contentType:'application/json',body:'[]'}));
await p.route('**/functions/v1/**',r=>r.fulfill({status:200,contentType:'application/json',body:'{}'}));
await p.goto('http://127.0.0.1:8931/index.html');await p.waitForFunction(()=>typeof fadeMakeUnreal==='function');
const r=await p.evaluate(()=>{
  const o={n:UNREAL_BANK.length,badBank:[],examDup:0,badGen:0,consec:0,gate:false,reg:false,tags:false};
  UNREAL_BANK.forEach(function(b,i){
    const all=[b.ans,b.real].concat(b.d);
    if(b.d.length!==2||new Set(all).size!==4||!b.p||!b.s||/[A-Za-z]/.test([b.p,b.r,b.s,b.ans,b.real].concat(b.d).join('')))o.badBank.push(i);
  });
  // لا بندَ يطابق أسئلة الاختبار التجريبي نفسه (يبقى قابلاً للإعادة)
  const ex=JSON.stringify(TRIAL_EXAMS[0].items.map(x=>x.q));
  UNREAL_BANK.forEach(function(b){if(ex.indexOf(b.p)>=0)o.examDup++});
  let prev=-1;
  for(let i=0;i<600;i++){const q=fadeMakeUnreal();
    if(q.kind!=="logic"||q.opts.length!==4||new Set(q.opts).size!==4||q.ai<0||q.opts[q.ai]!==UNREAL_BANK.find(b=>q.passage.indexOf(b.p)>=0).ans)o.badGen++;
    if(/<u>/.test(fadeQText(q)))o.tags=true;
    if(q.passage===prev)o.consec++;prev=q.passage}
  o.gate=fadeGateTopics.toString().indexOf('"reading","logic"')>=0&&(function(){const t=fadeTopic;fadeTopic="unreal";const g=fadeGateTopics();fadeTopic=t;return g})();
  o.reg=FADE_TOPICS.some(t=>t.key==="unreal")&&!!CLIP_MAKERS.unreal&&!!FADE_TERMS.unreal;
  localStorage.clear();startFade('unreal');o.screen=/تحتها خط|<u>/.test(app.innerHTML)||/المقدّمة غير الواقعية/.test(app.innerHTML);
  return o});
ok(r.n>=16&&r.badBank.length===0,'بنكٌ بلا عيب: '+r.n+' بنداً، لكلٍّ أربعةُ خياراتٍ متمايزة — '+r.badBank);
ok(r.examDup===0,'وبلا بندٍ من أسئلة الاختبار التجريبي نفسه');
ok(r.badGen===0,'٦٠٠ توليدٍ: أربعة خياراتٍ والجوابُ الصحيح هو جوابُ البند — '+r.badGen);
ok(r.consec===0,'ولا يتكرّر البندُ متتالياً');
ok(!r.tags,'وسجلّ السؤال بلا وسوم HTML');
ok(r.gate,'وبوّابة التسرّع تعمل لهذا الموضوع (ليس في المستثناة)');
ok(r.reg&&r.screen,'ومسجَّلٌ في الموضوعات والمقاطع والمصطلحات ويُفتح');
await b.close();console.log(fails?'=== '+fails+' فشل ===':'=== كل الاختبارات نجحت ===');process.exit(fails?1:0);
})();
