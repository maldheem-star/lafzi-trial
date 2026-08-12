const {chromium}=require('/opt/node22/lib/node_modules/playwright');
let fails=0;const ok=(c,m)=>{console.log((c?'  ✓ ':'  ✗ FAIL ')+m);if(!c)fails++};
(async()=>{
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'});
const page=await b.newPage({viewport:{width:420,height:900}});
page.on('pageerror',e=>{console.log('  ✗ PAGEERROR '+e.message);fails++});
await page.route('**/rest/v1/**',r=>r.fulfill({status:201,contentType:'application/json',body:'[]'}));
await page.addInitScript(()=>{
  Object.defineProperty(window,'speechSynthesis',{configurable:true,value:{speak(){},cancel(){},resume(){},pause(){},
    getVoices:()=>[{lang:'en-US',name:'X'}],speaking:false,pending:false}});
  window.SpeechSynthesisUtterance=function(t){this.text=t};
});
await page.goto('http://127.0.0.1:8931/index.html');
await page.waitForFunction(()=>typeof qzErrRecord==='function');

const SAL="دفع سالم ٥٠% من راتبه إيجاراً و٣٠% مصروفات، وتبقّى له ٢٤٠٠ ريال. كم راتبه؟";
const SAL2="دفع سالم ٤٠% من راتبه إيجاراً و٢٠% مصروفات، وتبقّى له ٣٦٠٠ ريال. كم راتبه؟";

console.log('\n١) الذاكرة على القالب لا على نصّ السؤال');
await page.evaluate(()=>{lsDel('mawhiba_quiz_err_v1')});
const same=await page.evaluate(([a,b])=>tmplKey({q:a})===tmplKey({q:b}),[SAL,SAL2]);
ok(same,'مسألتا الراتب بأرقام مختلفة قالب واحد');
await page.evaluate(q=>{qzErrRecord({q},false,"١١٠٠٠")},SAL);
await page.evaluate(q=>{qzErrRecord({q},false,"١٠٠٠٠")},SAL2);
const e=await page.evaluate(q=>qzErrOf(tmplKey({q})),SAL);
ok(e&&e.wrong===2,`خطآن على القالب (${e&&e.wrong})`);
ok(e&&e.seen===2,'ومرّتا عرض');
ok(e&&e.last==='١٠٠٠٠','وآخر إجابة خاطئة محفوظة');

console.log('\n٢) الصواب يُنقص العدّ ولا يمحوه');
await page.evaluate(q=>{qzErrRecord({q},true,"١٢٠٠٠")},SAL);
ok(await page.evaluate(q=>qzErrOf(tmplKey({q})).wrong,SAL)===1,'صواب ⇒ واحد');
await page.evaluate(q=>{qzErrRecord({q},true,"١٢٠٠٠")},SAL);
ok(await page.evaluate(q=>qzErrOf(tmplKey({q})).wrong,SAL)===0,'وصوابان ⇒ صفر');
await page.evaluate(q=>{qzErrRecord({q},true,"١٢٠٠٠")},SAL);
ok(await page.evaluate(q=>qzErrOf(tmplKey({q})).wrong,SAL)===0,'ولا ينزل تحت الصفر');

console.log('\n٣) تكرار الإجابة الخاطئة نفسها يُحسب');
await page.evaluate(()=>{lsDel('mawhiba_quiz_err_v1')});
for(let i=0;i<3;i++)await page.evaluate(q=>{qzErrRecord({q},false,"المشتري")},"أي كوكب يُعرف بالكوكب الأحمر؟");
const mars=await page.evaluate(()=>qzErrOf(tmplKey({q:"أي كوكب يُعرف بالكوكب الأحمر؟"})));
ok(mars.wrong===3&&mars.same===2,`ثلاثة أخطاء، والإجابة نفسها تكرّرت مرّتين (same=${mars.same}) — إصرار لا تخمين`);

console.log('\n٤) المستحقّ يُقحَم في الجولة التالية');
await page.evaluate(()=>{lsDel('mawhiba_quiz_err_v1')});
const dueK=await page.evaluate(()=>{
  // نُسجّل خطأين على قالب موجود في مولّدات المرونة
  let it=null;for(let i=0;i<40&&!it;i++){const c=uniqueFromGens(FLEX_GENS);if(/النرد|المتقابل/.test(c.q||""))it=c}
  if(!it)return null;
  qzErrRecord(it,false,"٣");qzErrRecord(it,false,"٣");
  return tmplKey(it);
});
ok(!!dueK,`قالب مستحقّ: «${String(dueK).slice(0,40)}…»`);
ok((await page.evaluate(()=>qzDueKeys())).length===1,'ويُعدّ مستحقّاً واحداً');
const hits=await page.evaluate(k=>{let n=0;for(let r=0;r<12;r++){
  const L=qzInjectDue(drawSpread(FLEX_GENS,12),FLEX_GENS,null);
  if(L.some(x=>tmplKey(x)===k))n++}return n},dueK);
// السحب أفضل جهد: لا نختلق سؤالاً لا يُنتجه المولّد. وفي هذا الفحص تُستنزف ذاكرة
// «ما عُرض» بعد اثنتي عشرة جولة متتالية، وهو ما لا يقع في جلسة حقيقية (جولة واحدة).
ok(hits>=9,`ظهر في ${hits} من ١٢ جولة متتالية — لا يُترك للصدفة`);

console.log('\n٥) والإقحام لا يُطيل الاختبار ولا يُجاور');
const shape=await page.evaluate(()=>{const L=qzInjectDue(drawSpread(FLEX_GENS,12),FLEX_GENS,null);
  let adj=0;for(let i=1;i<L.length;i++)if(tmplKey(L[i])===tmplKey(L[i-1]))adj++;
  return{n:L.length,adj}});
ok(shape.n===12,`اثنا عشر سؤالاً (${shape.n})`);
ok(shape.adj===0,'وبلا تجاور');

console.log('\n٦) وحدّ المستحقّين اثنان — لا يصير الاختبار مراجعةً كلّه');
await page.evaluate(()=>{const m={};for(let i=0;i<6;i++)m['قالب رقم '+i+' #']={wrong:5,seen:9,last:"x",same:0,at:Date.now()};
  lsSet('mawhiba_quiz_err_v1',JSON.stringify(m))});
ok((await page.evaluate(()=>qzDueKeys())).length===2,'قالبان لا ستّة');

console.log('\n٧) بطاقة التكرار: تظهر عند الخطأ الثاني وتحجب الانتقال');
await page.evaluate(()=>{lsDel('mawhiba_quiz_err_v1');
  qzErrRecord({q:"سؤال تجريبي عن ٣ أشياء"},false,"أ");
  start('quant');});
await page.waitForTimeout(400);
await page.evaluate(()=>{filtered=[{q:"سؤال تجريبي عن ٥ أشياء",c:["أ","ب","ج","د"],a:1,w:"التفسير هنا",d:"quant"},
  {q:"سؤال آخر",c:["أ","ب"],a:0,w:"شرح",d:"quant"}];
  idx=0;picked=null;locked=false;done=false;score=0;answered=[];qzCard=null;qzCardCount=0;
  gateStop();gateSecs=0;render()});
await page.evaluate(()=>choose(0));
await page.waitForTimeout(200);
let t=await page.textContent('#app');
ok(t.includes('هذا النوع من الأسئلة أخطأتِه من قبل'),'البطاقة ظهرت');
ok(t.includes('اخترتِ')&&t.includes('أ'),'ومعها إجابتها السابقة');
ok(t.includes('التفسير هنا'),'والتفسير معروض فوقها');
ok(await page.evaluate(()=>document.querySelectorAll('button').length>0&&!/السؤال التالي/.test(document.getElementById('app').textContent)),'وزرّ الانتقال محجوب');
await page.click('button[onclick="qzCardDone()"]');
await page.waitForTimeout(150);
ok((await page.textContent('#app')).includes('السؤال التالي'),'وبعد الإقرار يظهر الانتقال');
ok(await page.evaluate(()=>qzCard)===null,'والبطاقة تُغلق');

console.log('\n٨) ولا تظهر في الخطأ الأول');
await page.evaluate(()=>{lsDel('mawhiba_quiz_err_v1');
  filtered=[{q:"سؤال جديد تماماً ٧",c:["أ","ب"],a:1,w:"شرح",d:"quant"}];
  idx=0;picked=null;locked=false;qzCard=null;qzCardCount=0;render();choose(0)});
await page.waitForTimeout(150);
ok(await page.evaluate(()=>qzCard)===null,'أول خطأ بلا بطاقة — التنبيه للتكرار لا للخطأ');
ok((await page.textContent('#app')).includes('إنهاء ومشاهدة النتيجة'),'والانتقال متاح');

console.log('\n٩) وحدّها بطاقتان في الجولة');
const cards=await page.evaluate(()=>{
  lsDel('mawhiba_quiz_err_v1');
  ['أ','ب','ج','د'].forEach((x,i)=>qzErrRecord({q:"قالب "+i+" فيه ٣"},false,"س"));
  qzCard=null;qzCardCount=0;let n=0;
  for(let i=0;i<4;i++){
    filtered=[{q:"قالب "+i+" فيه ٩",c:["س","ص"],a:1,w:"w",d:"quant"}];
    idx=0;picked=null;locked=false;choose(0);
    if(qzCard){n++;qzCardDone()}
  }
  return n;
});
ok(cards===2,`فُتحت بطاقتان من أربع مستحقّات (${cards})`);

console.log('\n١٠) والذاكرة تفصل بين الملفّات');
ok((await page.evaluate(()=>pkey('mawhiba_quiz_err_v1')))==='mawhiba_quiz_err_v1','مفتاح هيا بلا بادئة');
const mo=await b.newPage({viewport:{width:420,height:900}});
await mo.route('**/rest/v1/**',r=>r.fulfill({status:201,body:'[]'}));
await mo.goto('http://127.0.0.1:8931/mohammed.html');
await mo.waitForFunction(()=>typeof qzErrOf==='function');
ok((await mo.evaluate(()=>pkey('mawhiba_quiz_err_v1')))==='mohammed::mawhiba_quiz_err_v1','ومحمد بمفتاحه');
ok(Object.keys(await mo.evaluate(()=>qzErrLoad())).length===0,'ولا يرث أخطاءها');

console.log('\n١١) لا انحدار');
for(const [fn,md] of [["startBasics('pimul')",'basics'],["startEngPlan()",'engplan'],["startFade('seq')",'fade'],
  ["startDictation()",'dictation'],["startCoach()",'coach'],["home()",'home']]){
  const r=await page.evaluate(x=>{try{eval(x);return{m:mode}}catch(e){return{err:e.message}}},fn);
  ok(!r.err&&r.m===md,`${fn} → ${r.err||r.m}`);
}
const q=await page.evaluate(async()=>{await start('flex');return{n:filtered.length,m:mode}});
ok(q.n===12&&q.m==='quiz','واختبار المرونة اثنا عشر سؤالاً');
ok((await page.evaluate(()=>censusMissing())).length===0,'وكل الدوال معرَّفة');
ok((await page.evaluate(()=>window.__ERRS.length))===0,'ولا خطأ');

await b.close();
console.log(fails?`\n=== ${fails} فشل ===`:'\n=== كل الاختبارات نجحت ===');
process.exit(fails?1:0);
})();
