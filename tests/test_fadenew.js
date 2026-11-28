// تقوية «النسبة بين الأجزاء» و«التشبيه اللفظي» + خفض المتقنة (٢٨ نوفمبر) — من اختبار موهبة تجريبي ٣.
const {chromium}=require('/opt/node22/lib/node_modules/playwright');
let fails=0;const ok=(c,m)=>{console.log((c?'  ✓ ':'  ✗ FAIL ')+m);if(!c)fails++};
(async()=>{
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'});const p=await b.newPage({viewport:{width:390,height:1000}});
p.on('pageerror',e=>{console.log('  ✗ PAGEERROR '+e.message);fails++});
await p.route('**/rest/v1/**',r=>r.fulfill({status:201,contentType:'application/json',body:'[]'}));
await p.route('**/functions/v1/**',r=>r.fulfill({status:200,contentType:'application/json',body:'{}'}));
await p.goto('http://127.0.0.1:8931/index.html');await p.waitForFunction(()=>typeof fadeMakeAnalogy==='function'&&typeof fadeMakeRatioPart==='function');
const r=await p.evaluate(()=>{
  const AR="٠١٢٣٤٥٦٧٨٩",nums=t=>(String(t).replace(/<[^>]+>/g,"").match(/[٠-٩]+/g)||[]).map(x=>parseInt(x.replace(/[٠-٩]/g,d=>AR.indexOf(d)),10));
  const o={rBad:0,rExam:0,rKinds:{whole:0,part:0},rSteps:0};
  for(let i=0;i<800;i++){
    const q=fadeMakeRatioPart(),n=nums(q.q),row=RP_PEOPLE.find(pp=>q.q.indexOf(pp[0])>=0&&q.q.indexOf(pp[1])>=0);
    let exp;
    if(/إلى المجموع/.test(q.q)){o.rKinds.whole++;const[N,a,bb]=n;exp=N-N*a/bb;if(N===42&&a===5&&bb===6)o.rExam++}
    else{o.rKinds.part++;const[T,a,bb]=n,askY=new RegExp("عدد "+row[1]+"؟").test(q.q);exp=askY?T*bb/(a+bb):T*a/(a+bb)}
    const all=[q.ans].concat(q.distractors);
    if(q.ans!==exp||!Number.isInteger(exp)||new Set(all).size!==4||all.some(x=>!(x>0)))o.rBad++;
    if(!q.steps||q.steps.length<3||!q.ruleTxt)o.rSteps++;
  }
  // التشبيه
  o.aBad=[];const exStems=["ذهب","ذنب","سمك","ريشة","هلال","صورة","أحمر"];o.aExam=0;
  ANALOGY_BANK.forEach(function(x,i){
    const P=y=>y[0]+" : "+y[1],all=[P(x.ans),P(x.rev),P(x.fld),P(x.oth)];
    if(new Set(all).size!==4||x.rev[0]!==x.ans[1]||x.rev[1]!==x.ans[0]||/[A-Za-z0-9]/.test([x.rel,x.a,x.b,x.sent].concat(x.ans,x.rev,x.fld,x.oth).join(''))||P([x.a,x.b])===P(x.ans))o.aBad.push(i);
    if(exStems.indexOf(x.a)>=0)o.aExam++;
  });
  o.aN=ANALOGY_BANK.length;o.aRels=new Set(ANALOGY_BANK.map(x=>x.rel)).size;
  o.aGen=0;o.aConsec=0;let prev="";
  for(let i=0;i<600;i++){const q=fadeMakeAnalogy(),it=ANALOGY_BANK.find(x=>q.passage===x.a+" : "+x.b);
    if(!it||q.kind!=="logic"||q.opts.length!==4||new Set(q.opts).size!==4||q.opts[q.ai]!==it.ans[0]+" : "+it.ans[1]||q.opts.indexOf(it.rev[0]+" : "+it.rev[1])<0)o.aGen++;
    if(q.passage===prev)o.aConsec++;prev=q.passage}
  o.reg=["ratiopart","analogy"].every(k=>FADE_TOPICS.some(t=>t.key===k)&&!!CLIP_MAKERS[k]&&!!FADE_TERMS[k]);
  o.gate=["ratiopart","analogy"].every(k=>{const t=fadeTopic;fadeTopic=k;const g=fadeGateTopics();fadeTopic=t;return g});
  o.low=FADE_TOPICS.filter(t=>t.low).map(t=>t.key).sort().join();
  localStorage.clear();goFadeMenu();
  const keys=[...app.querySelectorAll('button.mode')].map(b=>(b.getAttribute('onclick').match(/'(\w+)'/)||[])[1]);
  o.lowLast=["median","cube","circle","perim"].every(k=>keys.indexOf(k)>=keys.length-4);o.badge=(app.innerHTML.match(/مراجعة خفيفة/g)||[]).length;
  startFade('ratiopart');o.s1=/نموذج|شريط|أجزاء/.test(app.innerHTML)||/النسبة بين الأجزاء/.test(app.innerHTML);
  startFade('analogy');o.s2=/التشبيه اللفظي/.test(app.innerHTML);
  return o});
ok(r.rBad===0,'٨٠٠ توليدٍ للنسبة: الجوابُ يطابق إعادة الحساب المستقلّ وأربعةُ خياراتٍ موجبة متمايزة — '+r.rBad);
ok(r.rKinds.whole>100&&r.rKinds.part>100,'ونوعا الصيغتين كلاهما حاضر — '+JSON.stringify(r.rKinds));
ok(r.rExam===0&&r.rSteps===0,'ولا يطابق س٤ (٥:٦ و٤٢) وكلّ سؤالٍ بخطواتٍ وقاعدة');
ok(r.aN>=18&&r.aBad.length===0,'بنك التشبيه '+r.aN+' بنداً ('+r.aRels+' علاقات) بأربعة أزواجٍ متمايزة وعكسٍ صحيح — '+r.aBad);
ok(r.aExam===0,'وبلا بندٍ من أزواج الاختبار نفسه');
ok(r.aGen===0&&r.aConsec===0,'٦٠٠ توليد: الجوابُ هو زوج البند، وعكسُ الترتيب بين الخيارات، بلا تكرارٍ متتالٍ');
ok(r.reg&&r.gate,'الموضوعان مسجَّلان (موضوعات/مقاطع/مصطلحات) وبوّابة التسرّع تعمل');
ok(r.low==='circle,cube,median,perim','الأربعة المخفَّضة بعلامة low فقط — '+r.low);
ok(r.lowLast&&r.badge===4,'وتأتي آخر القائمة بشارة «مراجعة خفيفة» — '+r.badge);
ok(r.s1&&r.s2,'والموضوعان يُفتحان');
await b.close();console.log(fails?'=== '+fails+' فشل ===':'=== كل الاختبارات نجحت ===');process.exit(fails?1:0);
})();
