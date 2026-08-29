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

await b.close();
console.log(fails?`\n=== ${fails} فشل ===`:'\n=== كل الاختبارات نجحت ===');
process.exit(fails?1:0);
})();
