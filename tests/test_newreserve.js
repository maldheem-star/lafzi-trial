// حصّةُ الجديد في خطّة الإنجليزية — درس ٢٩ أغسطس.
// العطل الذي يحرسه: المستحقُّ كان يستهلك ميزانية الوقت كاملةً فلا يدخل عنصرٌ جديد
// أبداً (`is_new` = false في ٣٦٤ صفّاً على تسعة أيام في سجلّ هيا)، و`NEW_CAP` سقفُ
// عددٍ معطَّلٌ تحت ميزانية وقتٍ مشتركة.
// وحالتان أُسقطتا بالقياس ويحرسهما هذا الملفّ كذلك: ترتيبُ المستحقّ بالنطاق كان
// يُصفّر القواعد، وتشبيكُه على الأنواع كان يقلب تركيبة الجلسة.
const {chromium}=require('/opt/node22/lib/node_modules/playwright');
let fails=0;const ok=(c,m)=>{console.log((c?'  ✓ ':'  ✗ FAIL ')+m);if(!c)fails++};
(async()=>{
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'});
const mk=async()=>{
  const page=await b.newPage({viewport:{width:420,height:900}});
  page.on('pageerror',e=>{console.log('  ✗ PAGEERROR '+e.message);fails++});
  await page.route('**/rest/v1/**',r=>r.fulfill({status:200,contentType:'application/json',body:'[]'}));
  await page.route('**/functions/v1/**',r=>r.fulfill({status:200,contentType:'application/json',body:'{"ok":false}'}));
  await page.addInitScript(()=>{
    Object.defineProperty(window,'speechSynthesis',{configurable:true,value:{speak(){},cancel(){},getVoices:()=>[{lang:'en-US',name:'X'}],speaking:false,pending:false}});
    window.SpeechSynthesisUtterance=function(t){this.text=t};
  });
  await page.goto('http://127.0.0.1:8931/index.html');
  await page.waitForFunction(()=>typeof buildDailyPlan==='function');
  return page;
};
// حالةٌ تحاكي هيا: مستحقٌّ متراكم يغرق الميزانية. keepFresh ⇒ تبقى عناصر A1 بكراً.
const shape=(p,keepFresh)=>p.evaluate((keepFresh)=>{
  const POOL=engPool(),today=srsToday(),st={};
  POOL.forEach(function(i){
    if(keepFresh&&String(i.id).indexOf('b_a1_')===0)return;
    st[i.id]={due:today-1,ivl:1,s:1,d:9,reps:4,lapses:3,last:today-1,box:1};
  });
  srsSave(st);
  const plan=buildDailyPlan(),items=plan.items;
  const byT={};items.forEach(function(i){byT[i.t]=(byT[i.t]||0)+1});
  const buildIds=items.filter(function(i){return i.t==='build'}).map(function(i){return i.id});
  return{n:items.length,
    secs:items.reduce(function(a,i){return a+(ENG_SECS[i.t]||30)},0),
    budget:PLAN_SECS, newCap:NEW_CAP, reserve:plan.reserve, planSecs:plan.secs,
    byType:byT,
    newN:items.filter(function(i){return i._isNew}).length,
    newIds:items.filter(function(i){return i._isNew}).map(function(i){return i.id}),
    dueN:items.filter(function(i){return !i._isNew}).length,
    buildIds:buildIds,
    freshAvail:POOL.filter(function(i){return !st[i.id]}).length,
    aboveLv:items.filter(function(i){return planBand(i,ENG_LV_RANK[profileOf().level||'A1'])>0}).length,
    frozen:items.filter(function(i){return engFrozen(i,profileOf().level)}).length};
},keepFresh);

console.log('\n١) الجديد يدخل رغم غرق المستحقّ — العطل نفسه');
const A=await(async()=>{const p=await mk();const r=await shape(p,true);await p.close();return r})();
ok(A.freshAvail===10,'عشرة عناصر بكرٍ متاحة — '+A.freshAvail);
ok(A.newN>0,'ويدخل الجديدُ الخطّة فعلاً — '+A.newN+' عنصراً (كان صفراً)');
ok(A.newN===A.freshAvail,'وكلُّها تدخل لا بعضُها — '+A.newN+'/'+A.freshAvail);
ok(A.newIds.every(x=>x.indexOf('b_a1_')===0),'وكلُّها في مستواها هي — '+A.newIds.slice(0,3).join(','));
ok(A.newN<=A.newCap,'ولا تتجاوز NEW_CAP — '+A.newN+' ≤ '+A.newCap);

console.log('\n٢) والمستحقّ لم يُخنَق بدوره — لا نوعَ صُفِّر');
ok(A.dueN>=A.newN*2,'المستحقّ ما زال أغلب الجلسة — '+A.dueN+' مقابل '+A.newN+' جديداً');
// الارتداد الذي وقع فعلاً في أوّل تنفيذ: القواعد صارت صفراً
ok((A.byType.grammar||0)>0,'والقواعد حاضرة — '+(A.byType.grammar||0)+' (أوّل تنفيذٍ صفّرها)');
['vocab','dict','build'].forEach(function(t){
  ok((A.byType[t]||0)>0,'ونوع «'+t+'» حاضر — '+(A.byType[t]||0));
});
// الكمّية القاطعة هي عدّاد الاختيار نفسه (`plan.secs`)، لا مجموعُ عناصر الخطّة:
// الأخير يشمل بطاقات الشرح المُقحَمة **بعد** حساب الميزانية، فيتذبذب بعددها.
ok(A.planSecs<=A.budget,'والاختيار لم يتجاوز الميزانية — '+A.planSecs+'ث من '+A.budget);

console.log('\n٣) وبلا جديدٍ لا تُقتطع دقيقة — الحصّة الأدنى بين الحاجة والسقف');
const B=await(async()=>{const p=await mk();const r=await shape(p,false);await p.close();return r})();
ok(B.freshAvail===0,'لا عنصر بكر — '+B.freshAvail);
ok(B.newN===0,'ولا جديد في الخطّة');
// القياس القاطع هو الحصّة نفسها لا زمن الجلسة: الزمن يتذبذب لسببٍ قائمٍ قبل هذا
// التعديل (المجمَّد يُحذف من `chosen` ولا يُنقَص من `secs`)، فلا يصلح حارساً.
ok(B.reserve===0,'والحصّة صفرٌ فعلاً — لا اقتطاع بلا جديدٍ يشغله ('+B.reserve+'ث)');
ok(A.reserve>0,'وموجبةٌ حين يوجد جديد — '+A.reserve+'ث');
ok(A.reserve<=Math.floor(A.budget*0.25),'ولا تتجاوز ربع الميزانية — '+A.reserve+' ≤ '+Math.floor(A.budget*0.25));
ok(B.n>=40,'وعددُ عناصرها لم ينكمش — '+B.n);

console.log('\n٤) بوّابة المستوى ما زالت تعمل — الحصّة لا تفتح ثغرة');
ok(A.frozen===0,'لا عنصر مجمَّد فوق المستوى بدرجتين في خطّة A1');
ok(B.frozen===0,'ولا في الحالة الثانية');

console.log('\n٥) وما في مستواها يسبق ما فوقه في العرض — إصلاح ٢٦ أغسطس باقٍ');
{
  const firstAbove=A.buildIds.findIndex(x=>x.indexOf('b_a1_')!==0);
  const lastAt=A.buildIds.reduce((a,x,i)=>x.indexOf('b_a1_')===0?i:a,-1);
  ok(A.buildIds.length>0,'الخطّة تحمل عناصر بناء — '+A.buildIds.length);
  ok(lastAt>=0,'ومنها ما في مستواها');
  ok(firstAbove<0||lastAt<firstAbove,'وكلُّ ما في مستواها يسبق ما فوقه — '+A.buildIds.slice(0,4).join(','));
}

console.log('\n٦) والنظير: طلاقة الحقائق كانت فيها البنية نفسها');
{
  const p=await mk();
  const F=await p.evaluate(()=>{
    const POOL=factBank(),today=srsToday(),st={},freshIds={};
    POOL.forEach(function(i,k){
      if(k>=POOL.length-20){freshIds[i.id]=1;return}
      st[i.id]={due:today-1,ivl:1,s:1,d:9,reps:4,lapses:3,last:today-1,box:1};
    });
    factSrsSave(st);
    const pl=buildFactPlan(),items=pl.items||pl;
    return{n:items.length,cap:FACT_NEW_CAP,
      capacity:Math.floor(FACT_PLAN_SECS/FACT_SECS),
      newN:items.filter(function(i){return freshIds[i.id]}).length,
      dueN:items.filter(function(i){return !freshIds[i.id]}).length};
  });
  ok(F.newN>0,'الجديد يدخل رغم ٢٠٦ مستحقّاً — '+F.newN+' (كان صفراً)');
  ok(F.newN<=F.cap,'ولا يتجاوز FACT_NEW_CAP — '+F.newN+' ≤ '+F.cap);
  ok(F.dueN>=F.newN,'والمستحقّ ما زال أغلب الجلسة — '+F.dueN);
  ok(F.n===F.capacity,'وحجم الجلسة لم ينكمش — '+F.n+' من '+F.capacity);
  await p.close();
}

// ===== ٤) نفس العطل في البانيات العشر — كشفه إلياس، ٥ سبتمبر =====
// قال صاحب المشروع: يخرج ويدخل ستّ مرّات علّ الأسئلة تتغيّر. ولا تتغيّر، لأن
// `due.concat(fresh).slice(0,N)` يُقدّم المستحقّ دائماً — فإن بلغ حجمَ الجلسة لم
// يصل عنصرٌ بكرٌ **أبداً**. وهو نفس عطل ٢٩ أغسطس أعلاه، لم يُبحَث عن نظيره حينها.
console.log('\n٤) البانيات العشر: البكر يصل رغم تراكم المستحقّ');
{
  const p=await mk();
  // ١) الدالّة نفسها — الحالتان اللتان يجب ألّا تتغيّرا إطلاقاً
  const pure=await p.evaluate(()=>{
    const D=[1,2,3,4,5,6,7,8].map(function(n){return{id:'d'+n}});
    const F=[1,2,3,4,5].map(function(n){return{id:'f'+n}});
    const ids=function(a){return a.map(function(x){return x.id}).join(',')};
    return{
      noFresh:ids(planNewMix(D,[],5)),      oldNoFresh:ids(D.concat([]).slice(0,5)),
      noDue:ids(planNewMix([],F,5)),        oldNoDue:ids([].concat(F).slice(0,5)),
      shortDue:ids(planNewMix(D.slice(0,2),F,5)), oldShortDue:ids(D.slice(0,2).concat(F).slice(0,5)),
      mixed3:ids(planNewMix(D,F,3)),
      mixed8:ids(planNewMix(D,F,8)),
      empty:planNewMix([],[],5).length,
    };
  });
  ok(pure.noFresh===pure.oldNoFresh,'بلا بكرٍ: الناتج كما كان حرفاً بحرف — '+pure.noFresh);
  ok(pure.noDue===pure.oldNoDue,'وبلا مستحقٍّ كذلك — '+pure.noDue);
  ok(pure.shortDue===pure.oldShortDue,'ومستحقٌّ أقصر من الجلسة: كما كان — '+pure.shortDue);
  ok(/f1/.test(pure.mixed3),'وجلسةٌ من ٣ تحمل خانةً بكراً واحدة — '+pure.mixed3);
  ok(pure.mixed3.split(',').length===3,'وحجمها لم ينكمش — '+pure.mixed3);
  ok((pure.mixed8.match(/f\d/g)||[]).length===2,'وجلسةٌ من ٨ تحمل اثنتين (ربعُ الجلسة) — '+pure.mixed8);
  ok(pure.mixed8.split(',').length===8,'وحجمها ثمانية — '+pure.mixed8);
  ok(pure.empty===0,'وبلا شيءٍ إطلاقاً لا ينكسر');
  // ٢) وعلى البانيات الحيّة بحالٍ تحاكي إلياس: مستحقٌّ = الجلسة+٢، والباقي بكر
  const live=await p.evaluate(()=>{
    const specs=[['الكتابة','buildWritePlan','WRITE_N','WRITE_SRS_KEY','writeBankFor'],
                 ['القواعد','buildGramPlan','GRAM_N','GRAM_SRS_KEY','gramBankFor'],
                 ['STEP','buildStepPlan','STEP_N','STEP_SRS_KEY','stepBankFor'],
                 ['الأزواج','buildMinpairPlan','MINPAIR_N','MINPAIR_SRS_KEY','minpairBankFor'],
                 ['الفيديو','buildVideoPlan','VIDEO_N','VIDEO_SRS_KEY','videoBankFor']];
    const g=function(n){try{return eval(n)}catch(e){return null}};
    return specs.map(function(s){
      const build=g(s[1]),N=g(s[2]),KEY=g(s[3]),bankFor=g(s[4]);
      const lv=profileOf().level||"A2",pool=bankFor(lv);
      if(pool.length<N+3)return{name:s[0],skip:true};
      const st={},today=srsToday(),seen=pool.slice(0,N+2),ids={};
      seen.forEach(function(i){st[i.id]={box:2,seen:3,due:today-1,s:5,d:5,last:today-2};ids[i.id]=1});
      lsSet(KEY,JSON.stringify(st));
      let freshSlots=0,short=0;
      for(let k=0;k<20;k++){
        const plan=build()||[];
        if(plan.length<N)short++;
        plan.forEach(function(i){if(i&&!ids[i.id])freshSlots++});
      }
      lsSet(KEY,"{}");
      return{name:s[0],N:N,fresh:pool.length-seen.length,freshSlots:freshSlots,short:short};
    });
  });
  live.forEach(function(r){
    if(r.skip)return;
    ok(r.freshSlots>0,r.name+': البكر يصل رغم تراكم المستحقّ — '+r.freshSlots+' خانة في ٢٠ جلسة (كان صفراً)');
    ok(r.short===0,r.name+': ولا جلسةَ نقصت عن حدّها — '+r.short);
  });
  ok(live.filter(x=>!x.skip).length>=4,'وقِيست أربع بانياتٍ فأكثر فعلاً — وإلّا فالفحص فارغ');
  await p.close();
}

await b.close();
console.log(fails?`\n=== ${fails} فشل ===`:'\n=== كل الاختبارات نجحت ===');
process.exit(fails?1:0);
})();
