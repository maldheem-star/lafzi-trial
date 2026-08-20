// نمط أسئلة اختبار STEP — طلبٌ صريح من صاحب المشروع (١٨ أغسطس) بعد عرضه صفحة تدريبٍ
// حقيقية: «أضف نوعية هذه الأسئلة للثلاثة كلٌ حسب مستواه مع الشرح بعد الإجابة».
// الأنواع الثلاثة من الاختبار نفسه لا من حدسٍ: قسم القواعد (٤٠٪) يشمل «التحليل الكتابي»
// = الترقيم وترتيب الجمل واختيار الجملة الأصحّ والكبتلة.
const {chromium}=require('/opt/node22/lib/node_modules/playwright');
let fails=0;const ok=(c,m)=>{console.log((c?'  ✓ ':'  ✗ FAIL ')+m);if(!c)fails++};
(async()=>{
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'});
let logs=[],genCalls=[],genReply="";
const GOOD_STEP_GEN=[
  "TAG: ترتيب الكلمات",
  "S1: Always my brother reads at night.","S1_OK: no","S1_WHY: always يقع قبل الفعل الأساسي لا في أوّل الجملة",
  "S2: My brother always reads at night.","S2_OK: yes","S2_WHY: صحيحة — الظرف قبل الفعل الأساسي",
  "S3: My brother reads always at night.","S3_OK: no","S3_WHY: always لا تقع بعد الفعل مباشرةً",
  "S4: Reads my brother always at night.","S4_OK: no","S4_WHY: الفعل لا يسبق الفاعل هكذا"].join("\n");
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
    r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({ok:true,reply:genReply||GOOD_STEP_GEN})});
  });
  await page.goto('http://127.0.0.1:8931/'+(f||'index.html'));
  await page.waitForFunction(()=>typeof startStep==='function');
  return page;
};

console.log('\n١) كل متعلّم يرى بنك مستواه، وكل عنصر بشكلٍ سليم');
let page=await mk();
const banks=await page.evaluate(()=>({
  a1:stepBankFor('A1').every(x=>x.lv==='A1'),
  a2:stepBankFor('A2').every(x=>x.lv==='A2'),
  b1:stepBankFor('B1').every(x=>x.lv==='B1'),
  n:{a1:stepBankFor('A1').length,a2:stepBankFor('A2').length,b1:stepBankFor('B1').length},
  ids:new Set(STEP_BANK.map(x=>x.id)).size===STEP_BANK.length,
  // كل عنصر اختيارٍ: أربعة خيارات، صحيحةٌ واحدة بالضبط، ولكلٍّ شرح
  choiceShape:STEP_BANK.filter(x=>x.type!=='order').every(x=>
    Array.isArray(x.c)&&x.c.length===4&&x.c.filter(o=>o.ok).length===1&&x.c.every(o=>o.t&&o.why)),
  // كل عنصر ترتيب: ثلاث جملٍ فأكثر، ولها شرحُ منهجٍ لا جوابٌ فقط
  orderShape:STEP_BANK.filter(x=>x.type==='order').every(x=>
    Array.isArray(x.s)&&x.s.length>=3&&x.s.every(t=>t&&t.length>5)&&x.why&&x.why.length>20),
  types:[...new Set(STEP_BANK.map(x=>x.type))].sort(),
}));
ok(banks.a1&&banks.a2&&banks.b1,'لا اختلاط بين المستويات');
ok(banks.n.a1>=5&&banks.n.a2>=5&&banks.n.b1>=5,`ولكلٍّ بنكٌ كافٍ (${JSON.stringify(banks.n)})`);
ok(banks.ids,'ولا معرّف مكرّر');
ok(banks.choiceShape,'أربعة خيارات وصحيحةٌ واحدة بالضبط، ولكل خيارٍ شرح — لا خيار بلا تفسير');
ok(banks.orderShape,'وعناصر الترتيب فيها شرحُ منهجٍ (رأس الفقرة وكلمات الإشارة) لا الجواب وحده');
ok(JSON.stringify(banks.types)==='["gap","order","pick"]',`والأنواع الثلاثة كلّها موجودة (${banks.types})`);

console.log('\n٢) الأنواع الثلاثة موجودة في كل مستوى — لا مستوى ينقصه نوع');
const perLv=await page.evaluate(()=>{
  const o={};['A1','A2','B1'].forEach(L=>{o[L]=[...new Set(stepBankFor(L).map(x=>x.type))].sort()});
  return o;
});
['A1','A2','B1'].forEach(L=>ok(JSON.stringify(perLv[L])==='["gap","order","pick"]',`${L}: ${perLv[L]}`));

console.log('\n٣) جلسةٌ مخلوطة كالاختبار، وفيها عنصر ترتيبٍ واحد على الأقلّ');
let hasOrder=0;
for(let i=0;i<12;i++){
  const r=await page.evaluate(()=>{startStep();return{n:stepItems.length,ord:stepItems.filter(x=>x.type==='order').length}});
  if(r.ord>0)hasOrder++;
  if(r.n>6){ok(false,'الجلسة تجاوزت الحدّ');break}
}
ok(hasOrder===12,`كل جلسة تحوي عنصر ترتيب (${hasOrder}/12) — لا يغيب أثقل الأنواع بحكم الاحتمال`);

console.log('\n٤) الاختيار: الصحيح يُحتسب، والشرح يظهر لكل الخيارات الأربعة بعد الإجابة');
await page.evaluate(()=>{startStep();stepItems=[STEP_BANK.find(x=>x.id==='st_a1_3')];stepIdx=0;stepScore=0;stepSetupRound();render()});
let t=await page.textContent('#app');
ok(!t.includes('نضيف -s للفعل'),'الشرح مخفيٌّ قبل الإجابة — لا يُكشف الجواب مسبقاً');
const rightIdx=await page.evaluate(()=>stepCur().c.findIndex(o=>o.ok));
await page.evaluate(i=>stepChoose(i),rightIdx);
const st4=await page.evaluate(()=>({score:stepScore,locked:stepLocked}));
ok(st4.score===1&&st4.locked,'الإجابة الصحيحة تُحتسب وتُقفل');
t=await page.textContent('#app');
const whys=await page.evaluate(()=>stepCur().c.map(o=>o.why));
ok(whys.every(w=>t.includes(w)),'وشرحُ كل خيارٍ من الأربعة ظاهر — لا الصحيح وحده');

console.log('\n٥) الخطأ لا يُحتسب، ويُعرض الصواب مع سببه');
await page.evaluate(()=>{startStep();stepItems=[STEP_BANK.find(x=>x.id==='st_b1_5')];stepIdx=0;stepScore=0;stepSetupRound();render()});
const wrongIdx=await page.evaluate(()=>stepCur().c.findIndex(o=>!o.ok));
await page.evaluate(i=>stepChoose(i),wrongIdx);
ok(await page.evaluate(()=>stepScore)===0,'الخطأ لا يُحتسب');
t=await page.textContent('#app');
ok(t.includes('unless = if not'),'ويُشرح الصواب صراحةً (unless)');

console.log('\n٦) القفل يمنع تغيير الإجابة');
const lk=await page.evaluate(()=>{const before=stepPicked;stepChoose((stepPicked+1)%4);return{before,after:stepPicked}});
ok(lk.before===lk.after,'لا تغيير بعد القفل');

console.log('\n٧) ترتيب الجمل: تُعرض مخلوطةً، وتُبنى بالضغط، ولا تُحرَق ناقصةً');
await page.evaluate(()=>{startStep();stepItems=[STEP_BANK.find(x=>x.type==='order'&&x.lv==='A1')];stepIdx=0;stepScore=0;stepSetupRound();render()});
const shuf=await page.evaluate(()=>({seq:stepSeq.slice(),n:stepCur().s.length}));
ok(shuf.seq.length===shuf.n,'كل الجمل معروضة');
let shuffledOnce=0;
for(let i=0;i<15;i++){
  const s=await page.evaluate(()=>{stepSetupRound();return stepSeq.slice()});
  if(s.some((v,k)=>v!==k))shuffledOnce++;
}
ok(shuffledOnce>0,'وترتيب العرض مخلوطٌ فعلاً — لا تظهر مرتّبةً أصلاً');
await page.evaluate(()=>{stepSetupRound();stepSeqSubmit()});
ok(await page.evaluate(()=>stepLocked)===false,'الإرسال بترتيبٍ ناقص لا يُحرق العنصر');

console.log('\n٨) الترتيب الصحيح يُحتسب، والخاطئ يُعرض معه الصواب ومنهجُ الحلّ');
await page.evaluate(()=>{stepSetupRound();stepCur().s.forEach((_,k)=>stepSeqPick(k));stepSeqSubmit()});
ok(await page.evaluate(()=>stepScore)===1,'الترتيب الصحيح يُحتسب');
t=await page.textContent('#app');
ok(t.includes('الترتيب صحيح'),'ويُقال ذلك صراحةً');
await page.evaluate(()=>{stepScore=0;stepSetupRound();const n=stepCur().s.length;
  [...Array(n).keys()].reverse().forEach(k=>stepSeqPick(k));stepSeqSubmit()});
ok(await page.evaluate(()=>stepScore)===0,'والترتيب المعكوس لا يُحتسب');
t=await page.textContent('#app');
const w=await page.evaluate(()=>stepCur().why);
ok(t.includes('الترتيب الصحيح'),'ويُعرض الترتيب الصحيح كاملاً');
ok(t.includes(w),'ومعه منهج الحلّ (رأس الفقرة وكلمات الإشارة) لا الجواب وحده');

console.log('\n٩) التسجيل: q_text وresponse كاملان — بلا هذين لا تشخيص');
logs=[];
await page.evaluate(()=>{startStep();stepItems=[STEP_BANK.find(x=>x.id==='st_a2_4')];stepIdx=0;stepSetupRound();render();
  stepChoose(stepCur().c.findIndex(o=>o.ok))});
await page.waitForTimeout(300);
let row=logs.find(l=>l.domain==='step');
ok(!!row,'سطرٌ وصل الخادم');
ok(row&&row.response==='went','وإجابته النصّية مسجَّلة');
ok(row&&/✓/.test(row.q_text)&&/1\)/.test(row.q_text),'والخيارات كلّها مع موضع الصواب موسوماً');
ok(row&&row.q_text.includes('[الماضي البسيط]'),'ونوع المهارة موسومٌ — فتُقاس كل مهارة على حدة');
ok(row&&row.qtype==='gap','ونوع السؤال في qtype');
logs=[];
await page.evaluate(()=>{startStep();stepItems=[STEP_BANK.find(x=>x.type==='order'&&x.lv==='A1')];stepIdx=0;stepSetupRound();render();
  stepCur().s.forEach((_,k)=>stepSeqPick(k));stepSeqSubmit()});
await page.waitForTimeout(300);
row=logs.find(l=>l.domain==='step'&&l.qtype==='order');
ok(!!row&&/^\d+(-\d+)+$/.test(row.response),`وترتيبها المُختار يُسجَّل كتسلسل (${row&&row.response}) — فيُعرف أين اختلّ لا أنها أخطأت فقط`);
ok(row&&row.q_text.includes('الصواب'),'ومعه الترتيب الصحيح');

console.log('\n١٠) التباعد: FSRS نفسها، لا سلّمٌ جديد');
const srs=await page.evaluate(()=>{
  const id=STEP_BANK[0].id;stepSrsUpdate(id,true);
  const st=JSON.parse(lsGet('mawhiba_step_srs')||'{}');
  return{hasDue:!!st[id]&&st[id].due>srsToday(),hasS:typeof st[id].s==='number'};
});
ok(srs.hasDue&&srs.hasS,'يُجدوَل بـfsrsUpdate نفسها');

console.log('\n١١) بنكٌ مستنفَد كلّه — مراجعة حرّة لا شاشة فارغة');
const out=await page.evaluate(()=>{
  const P=stepBankFor(profileOf().level),st={};
  P.forEach(i=>{st[i.id]={box:2,due:srsToday()+30,seen:3}});
  lsSet('mawhiba_step_srs',JSON.stringify(st));
  return buildStepPlan().length;
});
ok(out>0,`buildStepPlan لا تعود فارغة (${out})`);
await page.evaluate(()=>{try{lsDel('mawhiba_step_srs')}catch(e){}});

console.log('\n١١ب) نقصٌ لا خواءٌ تامّ — عنصرٌ مستحقٌّ واحد لا يُنتج جلسةً من سؤالٍ واحد (طلب صاحب المشروع، ١٨ أغسطس)');
// دليلٌ ميداني: جلسة قواعد لمحمد ٠٩:٠٩ أعطت عنصرين والحدّ خمسة — نفس عيب buildXPlan
// الخمسة الأخرى (الاستماع/المقروء/الكتابة/القواعد/الأزواج)، وSTEP بانيةٌ سادسة على
// النمط نفسه فوُصلت بنفس المساعد المشترك (topUpPlan)
const partial=await page.evaluate(()=>{
  const POOL=stepBankFor(profileOf().level);
  const st={};
  POOL.forEach((i,idx)=>{st[i.id]={box:idx===0?0:2,due:idx===0?srsToday():srsToday()+30,seen:idx===0?0:3}});
  lsSet(STEP_SRS_KEY,JSON.stringify(st));
  return {plan:buildStepPlan(),want:Math.min(STEP_N,POOL.length)};
});
ok(partial.plan.length===partial.want,`عنصرٌ واحد مستحقّ ⇐ جلسةٌ كاملة (${partial.plan.length} من ${partial.want})، لا سؤالٌ واحد`);
ok(new Set(partial.plan.map(i=>i.id)).size===partial.plan.length,'بلا تكرار عنصرٍ مرّتين في نفس الجلسة');
await page.evaluate(()=>{try{lsDel('mawhiba_step_srs')}catch(e){}});

console.log('\n١١ج) ضمانان عبر مئة جلسة عشوائية: عنصر ترتيبٍ دائماً، ولا تجاوز STEP_N أبداً');
// ليس ضماناً واحداً كافياً — topUpPlan وضمان الترتيب يعملان معاً في كل استدعاء،
// وحالةٌ واحدة رُهنت أعلاه؛ هذا يُثبته عبر عشوائيةٍ حقيقية لا حالةً مُدبَّرة
const stress=await page.evaluate(()=>{
  const TRIALS=100;let hasOrder=0,fail=null;
  for(let i=0;i<TRIALS;i++){
    try{lsDel('mawhiba_step_srs')}catch(e){}
    const plan=buildStepPlan();
    const r={n:plan.length,ord:plan.filter(function(x){return x.type==="order"}).length};
    if(r.ord>0)hasOrder++;                 // ١) عنصر ترتيبٍ في كل جلسة
    if(r.n>6){fail={i:i,n:r.n};break}      // ٢) وألّا تتجاوز STEP_N
  }
  return {hasOrder:hasOrder,fail:fail,trials:TRIALS};
});
ok(!stress.fail,stress.fail?`الجلسة ${stress.fail.i} تجاوزت الحدّ (${stress.fail.n})`:'لا جلسةٌ تجاوزت STEP_N=6 عبر مئة محاولة');
ok(stress.hasOrder===stress.trials,`عنصر ترتيبٍ في كل الجلسات (${stress.hasOrder}/${stress.trials})`);
await page.evaluate(()=>{try{lsDel('mawhiba_step_srs')}catch(e){}});

console.log('\n١٢) جلسة كاملة ثم النتيجة');
await page.close();page=await mk();
await page.evaluate(()=>startStep());
for(let g=0;g<10;g++){
  const done=await page.evaluate(()=>stepDone);if(done)break;
  await page.evaluate(()=>{const it=stepCur();
    if(it.type==='order'){it.s.forEach((_,k)=>stepSeqPick(k));stepSeqSubmit()}
    else stepChoose(it.c.findIndex(o=>o.ok));
    stepNext()});
}
ok(await page.evaluate(()=>stepDone)===true,'انتهت الجلسة');
t=await page.textContent('#app');
ok(/جلسة أخرى/.test(t),'وتُعرض شاشة النتيجة');

console.log('\n١٣) يظهر على الصفحات الثلاث — كلٌّ ببنك مستواه');
for(const [f,lv] of [['index.html','A1'],['mohammed.html','B1'],['elias.html','A2']]){
  const pg=await mk(f);
  const r=await pg.evaluate(()=>({lv:profileOf().level,btn:document.body.innerText.indexOf('نمط اختبار STEP')>=0}));
  ok(r.lv===lv&&r.btn,`${f}: المستوى ${r.lv} والزرّ ظاهر`);
  const same=await pg.evaluate(()=>{startStep();return stepItems.every(x=>x.lv===profileOf().level)});
  ok(same,`${f}: وجلسته من بنك مستواه وحده`);
}

console.log('\n١٤) التوليد الآلي لنوع pick وحده (٢٠ أغسطس) — gap/order يبقيان بلا توليد عمداً');
page=await mk();
const sp=await page.evaluate(x=>({
  good:parseGenPickBlock(x.good,'step',true),
  badTag:parseGenPickBlock(x.good.replace('TAG: ترتيب الكلمات','TAG: شيءٌ غير معروف'),'step',true),
  arContam:parseGenPickBlock(x.good.replace('My brother always reads at night.','أخي يقرأ دائماً في الليل'),'step',true),
  missing:parseGenPickBlock('just some text','step',true),
}),{good:GOOD_STEP_GEN});
ok(!!sp.good&&sp.good.type==='pick'&&sp.good.tag==='ترتيب الكلمات'&&sp.good.c.length===4,'نصٌّ سليمٌ يُقبل بنوعه ووسمه (tag) الصحيحين');
ok(sp.good.c.filter(c=>c.ok).length===1,'وصحيحةٌ واحدة بالضبط');
ok(!!sp.badTag&&sp.badTag.tag==='ترتيب الكلمات','ووسمٌ غير معروف يُستبدَل بأوّل وسمٍ صالح لا يُرفَض العنصر كلّه');
ok(sp.arContam===null,'وتلوّثٌ عربي في جملة يُرفض');
ok(sp.missing===null,'ونصٌّ بلا وسم S1..S4 يُرفض');
await page.evaluate(()=>{try{lsDel('mawhiba_step_aibank_v1')}catch(e){}});
genCalls=[];genReply=GOOD_STEP_GEN;
await page.evaluate(level=>stepGenTopUp(level),'A1');
await page.waitForTimeout(300);
ok(genCalls.some(c=>c.mode==='gen'&&c.domain==='step'&&c.level==='A1'),'stepGenTopUp يطلب توليداً بمستواها');
const stepAiBank=await page.evaluate(()=>genBankLoad('mawhiba_step_aibank_v1'));
ok(stepAiBank.length>=1&&stepAiBank[0].type==='pick'&&stepAiBank[0].ai===true,'والعنصر المقبول (pick) يدخل بنك التوليد المحلّي');
const stepMerged=await page.evaluate(()=>stepBankFor('A1'));
ok(stepMerged.some(x=>x.ai===true)&&stepMerged.some(x=>!x.ai),'ويظهر ضمن stepBankFor مع البنك المؤلَّف');
ok(stepMerged.every(x=>x.ai!==true||x.type==='pick'),'وكل عنصرٍ مولَّد نوعه pick — لا gap ولا order مولَّدين');

console.log('\n١٤ب) لا انحدار بعد وصل التوليد بـstep');
page=await mk();
await page.evaluate(()=>startStep());
await page.waitForTimeout(300);
ok((await page.evaluate(()=>window.__ERRS.length))===0,'ولا خطأ عند بدء الجلسة رغم نداء التوليد الصامت');

console.log('\n١٥) لا انحدار');
for(const [pg,fn,md] of [['index.html',"startStep()",'step'],['index.html',"startGram()",'gram'],
  ['index.html',"startWrite()",'write'],['index.html',"home()",'home'],
  ['mohammed.html',"startStep()",'step'],['elias.html',"startStep()",'step']]){
  const pp=await mk(pg);
  const r2=await pp.evaluate(x=>{try{eval(x);return{m:mode}}catch(err){return{err:err.message}}},fn);
  ok(!r2.err&&r2.m===md,`${pg} ${fn} → ${r2.err||r2.m}`);
  ok((await pp.evaluate(()=>censusMissing())).length===0,`${pg}: كل الدوال معرَّفة`);
  ok((await pp.evaluate(()=>window.__ERRS.length))===0,`${pg}: لا خطأ`);
}

console.log('\n'+(fails?`=== ${fails} فشل ===`:'=== كل الاختبارات نجحت ==='));
await b.close();process.exit(fails?1:0);
})();
