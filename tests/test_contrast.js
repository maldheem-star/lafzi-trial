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
  await page.waitForFunction(()=>typeof cxPairOf==='function');
  return page;
};
// حالتها الحقيقية: أخطأت في طرفَي كل زوج في جلسة ٩:٤٠
const confuse=p=>page.evaluate(()=>{
  localStorage.removeItem('mawhiba_contrast_v1');
  const m={};
  CONTRAST_PAIRS.forEach(P=>P.members.forEach(id=>{m[id]={wrong:1,last:"x",same:0}}));
  localStorage.setItem('mawhiba_eng_item_err_v1',JSON.stringify(m));
});
let page=await mk();

console.log('\n١) البيانات سليمة — الزوج يعرّف نفسه بالكامل');
const shape=await page.evaluate(()=>CONTRAST_PAIRS.map(P=>({
  id:P.id,members:P.members.length,sides:P.sides.length,drills:P.drills.length,
  opts:P.notice.opts.length,rightOpts:P.notice.opts.filter(o=>o.ok).length,
  sidesCovered:[...new Set(P.drills.map(d=>d.side))].sort().join(""),
  hasRule:!!P.rule&&P.rule.length>20,
  perItemOpts:P.drills.filter(d=>d.opts).length,
  badOpts:P.drills.filter(d=>d.opts&&d.opts.length!==2).length,
})));
shape.forEach(x=>{
  ok(x.members===2&&x.sides===2,`${x.id}: عضوان وطرفان`);
  ok(x.drills>=8,`  و${x.drills} عناصر تدريب`);
  ok(x.sidesCovered==='ab',`  والطرفان ممثَّلان فيها`);
  ok(x.rightOpts===1&&x.opts>=3,`  وسؤال الملاحظة له جواب واحد صحيح من ${x.opts}`);
  ok(x.hasRule,'  وقاعدة مكتوبة');
  ok(x.badOpts===0,'  وكل خيارات العناصر الخاصة زوجية');
});
ok(shape.length===3,`ثلاثة أزواج: ${shape.map(x=>x.id).join('، ')}`);

console.log('\n٢) الربط بعناصر الخطة الحقيقية — لا معرّفات متخيّلة');
const linked=await page.evaluate(()=>{
  const ids=new Set(engPool().map(i=>i.id));
  const miss=[];
  CONTRAST_PAIRS.forEach(P=>P.members.forEach(m=>{if(!ids.has(m))miss.push(P.id+"/"+m)}));
  return miss;
});
ok(linked.length===0,linked.length?`معرّفات غير موجودة: ${linked.join(', ')}`:'كل الأعضاء موجودون فعلاً في بنك الخطة');
const lookup=await page.evaluate(()=>({hit:cxPairOf('u2_g3')&&cxPairOf('u2_g3').id,miss:cxPairOf('u1_g1'),nul:cxPairOf(null)}));
ok(lookup.hit==='few_little','والبحث بالمعرّف يجد زوجه');
ok(lookup.miss===null&&lookup.nul===null,'وما لا زوج له يعود null بلا انهيار');

console.log('\n٣) لا يفتح إلا حين يظهر الالتباس فعلاً');
await page.evaluate(()=>{localStorage.removeItem('mawhiba_eng_item_err_v1');localStorage.removeItem('mawhiba_contrast_v1')});
ok(await page.evaluate(()=>cxDue(CONTRAST_PAIRS[0]))===false,'بلا أخطاء: لا يفتح');
await page.evaluate(()=>{localStorage.setItem('mawhiba_eng_item_err_v1',JSON.stringify({u2_g3:{wrong:1,last:"a little",same:0}}))});
ok(await page.evaluate(()=>cxDue(CONTRAST_PAIRS[0]))===false,'وخطأ واحد في طرف واحد: لا يفتح — قد يكون عارضاً');
await page.evaluate(()=>{localStorage.setItem('mawhiba_eng_item_err_v1',JSON.stringify({u2_g3:{wrong:1,last:"a little",same:0},u2_g4:{wrong:1,last:"many",same:0}}))});
ok(await page.evaluate(()=>cxDue(CONTRAST_PAIRS[0]))===true,'وخطأ في الطرفين: يفتح — هذا هو الالتباس');
await page.evaluate(()=>{localStorage.setItem('mawhiba_eng_item_err_v1',JSON.stringify({u2_g3:{wrong:2,last:"a little",same:1}}))});
ok(await page.evaluate(()=>cxDue(CONTRAST_PAIRS[0]))===true,'أو خطآن في طرف واحد: يفتح كذلك');

console.log('\n٤) التشبيك: لا ثلاثة من طرف واحد متتالية');
const inter=await page.evaluate(()=>{
  let worstRun=0,runsSeen=0;
  for(let n=0;n<300;n++){
    const P=CONTRAST_PAIRS[n%3];
    const out=cxInterleave(P.drills);
    if(out.length!==P.drills.length)return{err:"طول مختلف"};
    if(out.some(x=>P.drills.indexOf(x)<0))return{err:"عنصر غريب"};
    let run=1,mx=1;
    for(let i=1;i<out.length;i++){run=out[i].side===out[i-1].side?run+1:1;if(run>mx)mx=run}
    worstRun=Math.max(worstRun,mx);runsSeen++;
  }
  return{worstRun,runsSeen};
});
ok(!inter.err,inter.err||`${inter.runsSeen} ترتيباً`);
ok(inter.worstRun<=2,`أطول تتابع من الطرف نفسه: ${inter.worstRun} (المكتَّل هو ما نتجنّبه)`);

console.log('\n٥) الترتيب: الملاحظة ⇒ القاعدة ⇒ التدريب — لا القاعدة أولاً');
page=await mk();await confuse();
await page.evaluate(()=>{cxDoneThisPlan=false;mode="engplan";planItems=[{id:'u2_g3',t:'grammar',q:'x',c:['a few','a little'],a:0}];planIdx=0;
  const m=cxLoad();m.few_little=Object.assign({runs:0,lastAt:0,mastered:false},m.few_little||{},{preDone:true});cxSave(m);
  cxStart(CONTRAST_PAIRS[0])});
let t=await page.textContent('#app');
ok(t.includes('انظري قبل أن نشرح'),'تبدأ بالملاحظة');
ok(t.includes('strawberries')&&t.includes('salt'),'والجملتان معروضتان معاً');
ok(t.includes('الجملتان صحيحتان'),'ويُقال لها إن كلتيهما صحيحة');
ok(!t.includes('a few</b> لما يُعدّ'),'والقاعدة لم تُعرض بعد — هذا هو ترتيب Schwartz & Bransford');
ok(t.includes('لا صح ولا خطأ هنا'),'ولا تُحتسب عليها');
ok(await page.evaluate(()=>document.querySelectorAll('.choice').length)===3,'وثلاثة احتمالات للفرق');
await page.evaluate(()=>cxNoticePick(cxNoticeOrder.findIndex(oi=>cxPair.notice.opts[oi].ok)));
t=await page.textContent('#app');
ok(t.includes('الآن القاعدة'),'ثم تُعرض القاعدة');
ok(t.includes('لاحظتِ الفرق الصحيح'),'ويُقرّ لها بملاحظتها');
ok(t.includes('لما يُعدّ'),'ونصّ القاعدة');
await page.evaluate(()=>cxRuleDone());
ok(await page.evaluate(()=>cxStep)===1,'ثم التدريب');

console.log('\n٦) الخياران هما العضوان — تمييز لا إنتاج');
const opts=await page.evaluate(()=>({n:document.querySelectorAll('.choice').length,
  txt:[...document.querySelectorAll('.choice')].map(e=>e.textContent.trim())}));
ok(opts.n===2,'خياران فقط');
ok(opts.txt.slice().sort().join('|')==='a few|a little',`وهما العضوان: ${opts.txt.join(' · ')}`);

console.log('\n٧) الخطأ يستدعي سؤال «لماذا» ولا يمرّ قبله');
const wrongIdx=await page.evaluate(()=>1-cxDrills[cxStep-1]._ai);
await page.evaluate(i=>cxChoose(i),wrongIdx);
t=await page.textContent('#app');
ok(t.includes('لماذا؟'),'يظهر سؤال السبب');
ok(await page.evaluate(()=>document.querySelector('button[onclick="cxNext()"]'))===null,'ولا زرّ انتقال قبل الإجابة عنه');
// خيارات السبب وحدها: أزرار التدريب ما زالت في الصفحة معطّلة، فلا تُعدّ معها
const whyOpts=await page.evaluate(()=>[...document.querySelectorAll('button[onclick^="cxWhyPick"]')].map(e=>e.textContent.trim()));
ok(whyOpts.length===2&&whyOpts.some(x=>x.includes('تُعدّ'))&&whyOpts.some(x=>x.includes('يُقاس')),'والسببان هما سببا الطرفين لا عبارات عامّة');
await page.evaluate(()=>cxWhyPick(0));
ok(await page.evaluate(()=>!!document.querySelector('button[onclick="cxNext()"]')),'وبعد اختيارها يُفتح الانتقال');

console.log('\n٨) الجواب الصحيح يعرض السبب بلا سؤال');
await page.evaluate(()=>cxNext());
await page.evaluate(()=>cxChoose(cxDrills[cxStep-1]._ai));
t=await page.textContent('#app');
ok(t.includes('✓ صحيح'),'يُقال صحيح');
ok(!t.includes('لماذا؟'),'ولا يُسأل عن السبب — السؤال علاجٌ للخطأ لا ضريبة على الصواب');

console.log('\n٩) الإتقان: جولتان لا واحدة، ومتباعدتان');
page=await mk();await confuse();
const run=async(allRight)=>page.evaluate(right=>{
  cxDoneThisPlan=false;mode="engplan";
  planItems=[{id:'u2_g3',t:'grammar',q:'x',c:['a few','a little'],a:0}];planIdx=0;
  const m0=cxLoad();m0.few_little=Object.assign({runs:0,lastAt:0,mastered:false},m0.few_little||{},{preDone:true});cxSave(m0);
  cxStart(CONTRAST_PAIRS[0]);cxNoticePick(cxNoticeOrder.findIndex(oi=>cxPair.notice.opts[oi].ok));cxRuleDone();
  for(let i=0;i<cxDrills.length;i++){
    const d=cxDrills[cxStep-1];
    cxChoose(right?d._ai:(i===0?1-d._ai:d._ai));
    if(cxWhyOn&&cxWhyPicked==null)cxWhyPick(0);
    cxNext();
  }
  return cxStateOf('few_little');
},allRight);
let st=await run(true);
ok(st.runs===1&&st.mastered===false,`جولة كاملة ⇒ ${st.runs} من ٢، لا إتقان بعد`);
// المهلة تمنع الإعادة الفورية
ok(await page.evaluate(()=>cxDue(CONTRAST_PAIRS[0]))===false,'ولا يُعاد فوراً — التكرار الفوري إتقانٌ ظاهري');
await page.evaluate(()=>{const m=cxLoad();m.few_little.lastAt=Date.now()-25*3600*1000;cxSave(m)});
ok(await page.evaluate(()=>cxDue(CONTRAST_PAIRS[0]))===true,'وبعد يوم يُعاد');
st=await run(true);
ok(st.runs===2&&st.mastered===true,'وجولة ثانية ⇒ إتقان');
ok(await page.evaluate(()=>cxDue(CONTRAST_PAIRS[0]))===false,'ولا يعود بعد الإتقان');
// خطأ واحد يُعيد العدّ
page=await mk();await confuse();
st=await run(false);
ok(st.runs===0&&!st.mastered,'وخطأ واحد في الجولة يُصفّر العدّ — الإتقان أن يستقيم الطرفان معاً');

console.log('\n١٠) التسجيل يفصل الخطوات');
const kinds=[...new Set(logs.filter(l=>l.domain==='eng_plan'&&/^cx_/.test(l.qtype||'')).map(l=>l.qtype))].sort();
ok(kinds.join(',')==='cx_done,cx_drill,cx_notice,cx_open,cx_why',`الأنواع: ${kinds.join('، ')}`);
const dr=logs.filter(l=>l.qtype==='cx_drill');
ok(dr.length>0&&dr.every(l=>l.item_id&&l.q_text),'وسطور التدريب فيها الزوج ونصّ السؤال');
const dn=logs.filter(l=>l.qtype==='cx_done').slice(-1)[0];
ok(dn&&/^\d+\/\d+$/.test(dn.response||''),`وسطر الختام يحمل النتيجة «${dn&&dn.response}»`);

console.log('\n١١) الاندماج في الخطة: التقابل يسبق التصحيح الفردي، ومرّة واحدة');
page=await mk();
await page.evaluate(()=>{
  localStorage.removeItem('mawhiba_contrast_v1');
  localStorage.setItem('mawhiba_eng_item_err_v1',JSON.stringify({
    u2_g3:{wrong:3,last:"a little",same:2},u2_g4:{wrong:3,last:"many",same:2}}));
});
await page.evaluate(()=>{
  startEngPlan();
  planItems=[{id:'u2_g3',t:'grammar',q:'x',c:['a few','a little'],a:0,lesson:'l_few'},
             {id:'u2_g4',t:'grammar',q:'y',c:['a little','many'],a:0,lesson:'l_few'}];
  planIdx=-1;cxDoneThisPlan=false;planNext();
});
ok(await page.evaluate(()=>cxOn)===true,'التقابل يفتح');
ok(await page.evaluate(()=>fixOn)===false,'ولا تفتح بوّابة التصحيح معه — السبب قبل العَرَض');
await page.evaluate(()=>{cxNoticePick(0);cxRuleDone();
  for(let i=0;i<cxDrills.length;i++){cxChoose(cxDrills[cxStep-1]._ai);cxNext()}
  cxFinish()});
ok(await page.evaluate(()=>cxOn)===false,'ويُغلق بعد الانتهاء');
ok(await page.evaluate(()=>fixOn)===true,'ثم تعمل بوّابة التصحيح الفردي على السؤال نفسه');
await page.evaluate(()=>{fixOn=false;planNext()});
ok(await page.evaluate(()=>cxOn)===false,'والعنصر الثاني من الزوج نفسه لا يفتح تقابلاً ثانياً في الجلسة');

console.log('\n١٢) جلسة خطة كاملة بنقرات حقيقية');
page=await mk();
await page.evaluate(()=>{
  localStorage.removeItem('mawhiba_contrast_v1');
  localStorage.setItem('mawhiba_eng_item_err_v1',JSON.stringify({
    u2_g3:{wrong:3,last:"a little",same:2},u2_g4:{wrong:3,last:"many",same:2},
    u8_g1:{wrong:2,last:"yet",same:1},u5_g2:{wrong:2,last:"more good",same:1}}));
  startEngPlan();
});
let guard=0,cxSeen=0,end=false;
while(guard++<400){
  const st=await page.evaluate(()=>({m:mode,done:planDone,cx:cxOn,cxs:cxStep,why:cxWhyOn&&cxWhyPicked==null,
    cxpre:typeof cxPreOn!=='undefined'&&cxPreOn,
    npick:cxOn&&!cxPreOn&&cxStep===0&&cxNoticePicked==null,lock:cxLocked,
    fix:fixOn,fs:fixStep,flock:fixLocked,
    t:planCur()?planCur().t:null,plock:planLocked,ai:planCur()?planCur().a:null,pg:!planGateOpen()}));
  if(st.done){end=true;break}
  if(st.cx){
    // التصنيف أوّلاً في few_little: نُجيب صواباً حتى تنفتح القاعدة
    if(st.cxpre){
      if(await page.evaluate(()=>cxPreFail)){await page.click('button[onclick="cxPreQuit()"]');continue}
      await page.evaluate(()=>{const cur=cxPreCur();
        let i=0;for(let k=0;k<cxPreOrder.length;k++){if(cxPair.sides[cxPreOrder[k]].k===cur.side){i=k;break}}
        cxPreChoose(i);cxPreNext()});
      continue;
    }
    if(st.cxs===-1){await page.click('button[onclick="cxFinish()"]');cxSeen++;continue}
    if(st.npick){await page.click('button[onclick="cxNoticePick(0)"]');continue}
    if(st.cxs===0){await page.click('button[onclick="cxRuleDone()"]');continue}
    if(st.why){await page.click('button[onclick="cxWhyPick(0)"]');continue}
    if(!st.lock){const a=await page.evaluate(()=>cxDrills[cxStep-1]._ai);await page.evaluate(i=>cxChoose(i),a);continue}
    await page.click('button[onclick="cxNext()"]');continue;
  }
  if(st.fix){
    if(st.fs===0){await page.click('button[onclick="fixCardDone()"]');continue}
    if(!st.flock){const a=await page.evaluate(()=>fixDrills[fixStep-1]._ai);await page.evaluate(i=>fixChoose(i),a);continue}
    await page.click('button[onclick="fixNext()"]');continue;
  }
  if(st.pg){await page.evaluate(()=>{planGateLeft=0;planGateStop();render()});continue}
  if(st.t==='lesson'){await page.click('button[onclick="planLessonDone()"]');continue}
  if(st.plock){await page.click('button[onclick="planNext()"]');continue}
  if(st.t==='dict'){await page.evaluate(()=>{document.getElementById('planIn').value=planCur().w;planCheckDict()});continue}
  await page.evaluate(i=>planChoose(i),st.ai);
}
ok(end,`الخطة تنتهي عند شاشة النتيجة (${guard} خطوة)`);
ok(cxSeen===1,`وبطاقة تقابل واحدة في الجلسة (${cxSeen})`);
ok((await page.evaluate(()=>window.__ERRS.length))===0,'ولا خطأ في الجلسة');

console.log('\n١٤) الخلط: خيارات الملاحظة و«لماذا» لم تعد بترتيب ثابت');
page=await mk();await confuse();
const orders=await page.evaluate(()=>{
  const N=[],W=[];
  for(let i=0;i<40;i++){
    cxDoneThisPlan=false;mode="engplan";
    planItems=[{id:'u2_g3',t:'grammar',q:'x',c:['a few','a little'],a:0}];planIdx=0;
    (function(){const m=cxLoad();m.few_little=Object.assign({runs:0,lastAt:0,mastered:false},m.few_little||{},{preDone:true});cxSave(m)})();
    (function(){const m=cxLoad();m.few_little=Object.assign({runs:0,lastAt:0,mastered:false},m.few_little||{},{preDone:true});cxSave(m)})();
  cxStart(CONTRAST_PAIRS[0]);
    N.push(cxNoticeOrder.join(""));
    cxNoticePick(0);cxRuleDone();W.push(cxWhyOrder.join(""));
  }
  return{n:[...new Set(N)],w:[...new Set(W)]};
});
ok(orders.n.length>1,`ترتيب الملاحظة يتغيّر (${orders.n.length} ترتيبات في ٤٠ فتحة)`);
ok(orders.w.length>1,`وترتيب «لماذا» كذلك (${orders.w.length})`);
// الترتيب ثابت داخل السؤال الواحد فلا يقفز تحت إصبعها
const stable=await page.evaluate(()=>{
  const a=cxWhyOrder.join("");render();render();return a===cxWhyOrder.join("");
});
ok(stable,'وثابتٌ داخل التدريب الواحد — لا يقفز عند إعادة الرسم');

console.log('\n١٥) الاختيار يُنسَب لمحتواه لا لموضعه، والموضع يُسجَّل');
page=await mk();await confuse();
logs.length=0;
await page.evaluate(()=>{cxDoneThisPlan=false;mode="engplan";
  planItems=[{id:'u2_g3',t:'grammar',q:'x',c:['a few','a little'],a:0}];planIdx=0;
  (function(){const m=cxLoad();m.few_little=Object.assign({runs:0,lastAt:0,mastered:false},m.few_little||{},{preDone:true});cxSave(m)})();
  cxStart(CONTRAST_PAIRS[0]);
  cxNoticePick(cxNoticeOrder.findIndex(oi=>cxPair.notice.opts[oi].ok));});
await page.waitForTimeout(400);
let nl=logs.find(l=>l.qtype==='cx_notice');
ok(nl&&nl.is_correct===true,'الملاحظة الصحيحة تُحتسب صحيحة أياً كان موضعها');
ok(nl&&/موضع [٠-٩]/.test(nl.response||''),`والموضع مُسجَّل: «${nl&&nl.response}»`);
// و«لماذا»: نختار الخطأ عمداً ونتأكّد أنه يُحتسب خطأً
await page.evaluate(()=>{cxRuleDone();cxChoose(1-cxDrills[cxStep-1]._ai)});
logs.length=0;
await page.evaluate(()=>{
  const d=cxDrills[cxStep-1],right=cxSideOf(cxPair,d.side).why;
  const wrongPos=cxWhyOrder.findIndex(si=>cxPair.sides[si].why!==right);
  cxWhyPick(wrongPos);
});
await page.waitForTimeout(400);
let wl=logs.find(l=>l.qtype==='cx_why');
ok(wl&&wl.is_correct===false,'والسبب الخاطئ يُحتسب خطأً أياً كان موضعه');
ok(wl&&/موضع [٠-٩]/.test(wl.response||''),`ومعه موضعه: «${(wl&&wl.response||'').slice(-8)}»`);

console.log('\n١٦) لا انحدار');
for(const [fn,md] of [["startBasics('percent')",'basics'],["startBasics('multdiv')",'basics'],["startFactPlan()",'factplan'],
  ["startEngPlan()",'engplan'],["startDictation()",'dictation'],["startPronunciation()",'pron'],
  ["startFade('circle')",'fade'],["startAudioDiag()",'audiodiag'],["home()",'home']]){
  const x=await page.evaluate(s=>{try{eval(s);return{m:mode,len:document.getElementById('app').textContent.length}}catch(e){return{err:e.message}}},fn);
  ok(!x.err&&x.m===md&&x.len>40,`${fn} → ${x.err||x.m}`);
}
ok((await page.evaluate(()=>censusMissing())).length===0,'وكل الدوال معرَّفة');
ok((await page.evaluate(()=>window.__ERRS.length))===0,'ولا خطأ');

await b.close();
console.log(fails?`\n=== ${fails} فشل ===`:'\n=== كل الاختبارات نجحت ===');
process.exit(fails?1:0);
})();
