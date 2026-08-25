const {chromium}=require('/opt/node22/lib/node_modules/playwright');
let fails=0;const ok=(c,m)=>{console.log((c?'  ✓ ':'  ✗ FAIL ')+m);if(!c)fails++};
// الانتظار بشرطٍ لا بمهلة ثابتة: التسجيل غير متزامن، ومهلة ٦٠٠ مللي تكفي وحدها حتى
// يعمل طقم آخر بجوارها فتتأخّر الطلبات وتسقط الاختبارات بلا عطل في التطبيق.
const until=async(fn,ms=6000)=>{const t0=Date.now();
  while(Date.now()-t0<ms){if(await fn())return true;await new Promise(r=>setTimeout(r,50))}
  return false};
(async()=>{
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'});
// خادم وهمي يُحاكي PostgREST: يرفض أي سطر فيه عمود غير معروف بـ400، كما يفعل الحقيقي
const mk=async(known)=>{
  const page=await b.newPage({viewport:{width:420,height:900}});
  page.on('pageerror',e=>{console.log('  ✗ PAGEERROR '+e.message);fails++});
  const seen=[];
  // نُسجّل في Node مباشرةً: العبور بالصفحة كان يستدعي page.evaluate من داخل معترض
  // قد يبقى طائراً بعد إغلاق الصفحة، فينهار الطقم عند التفكيك لا عند عطل حقيقي
  await page.route('**/rest/v1/**',async r=>{
    // ٢٥ أغسطس: يُعدّ الكتابةَ وحدها. صار للتطبيق قراءةٌ واحدة عند الإقلاع
    // (`seenSeed` تبذر سجلّ العرض من الخادم)، وعدُّها مع الكتابات كان يزيد كلَّ
    // رقمٍ في هذا الملفّ واحداً ويُدخل صفّاً وهمياً بلا domain. والمقصود هنا
    // «كم طلبَ تسجيلٍ أُرسل» لا «كم مرّة لُمس REST».
    if(r.request().method()!=='POST')
      return r.fulfill({status:200,contentType:'application/json',body:'[]'});
    let body={};try{body=JSON.parse(r.request().postData()||'{}')}catch(e){}
    const bad=Object.keys(body).filter(k=>known.indexOf(k)<0);
    seen.push({keys:Object.keys(body),bad,domain:body.domain});
    if(bad.length)return r.fulfill({status:400,contentType:'application/json',
      body:JSON.stringify({code:"PGRST204",message:`Could not find the '${bad[0]}' column`})});
    r.fulfill({status:201,contentType:'application/json',body:'[]'});
  });
  await page.goto('http://127.0.0.1:8931/index.html');
  await page.waitForFunction(()=>typeof logAnswer==='function');
  return {page,seen};
};
const COLS=["student_alias","domain","qtype","is_correct","created_at","response","item_id",
  "elapsed_ms","is_new","srs_box","score_pct","judged_by","q_text","lesson","engine","azure_fail"];

console.log('\n١) إعادة إنتاج العطل بالضبط: عمود غير موجود يُسقط السطر كلّه');
let {page,seen}=await mk(COLS.filter(c=>c!=="engine"&&c!=="azure_fail")); // قاعدة بلا العمودين
await page.evaluate(()=>logAnswer("pronunciation_a1","word",true,"Insects","insect",1500,{score_pct:100,engine:"azure"}));
await until(()=>seen.length>=2);
ok(seen.length===2,`أُرسل طلبان لا واحد: الكامل ثم الأساسي (${seen.length})`);
ok(seen[0].bad.includes('engine'),'الأول رُفض بسبب engine');
ok(seen[1]&&seen[1].bad.length===0,'والثاني بلا أي عمود مجهول — فيُقبل');
ok(seen[1]&&seen[1].keys.indexOf('score_pct')<0,'الإضافيّات كلها أُسقطت في المحاولة الثانية');
ok(seen[1]&&seen[1].keys.indexOf('response')>=0&&seen[1].keys.indexOf('is_correct')>=0,'والإجابة نفسها محفوظة — وهي المهمّة');
ok(seen[1].domain==='pronunciation_a1','والمجال صحيح');
await page.unrouteAll({behavior:'ignoreErrors'});await page.close();

console.log('\n٢) بعد إضافة العمودين: لا إعادة إرسال ولا فقدان');
({page,seen}=await mk(COLS));
await page.evaluate(()=>logAnswer("pronunciation_a1","word",true,"Insects","insect",1500,{score_pct:100,engine:"azure"}));
await until(()=>seen.length>=1);
ok(seen.length===1,`طلب واحد فقط (${seen.length})`);
ok(seen[0].keys.includes('engine')&&seen[0].keys.includes('score_pct'),'وكل الحقول وصلت بما فيها engine');
await page.evaluate(()=>logAnswer("pronunciation_a1","word",false,"x","y",1500,{score_pct:0,engine:"groq",azure_fail:"azure_auth"}));
await until(()=>seen.length>=2);
ok(seen.length===2&&seen[1].keys.includes('azure_fail'),'وسبب تعثّر Azure يُسجَّل كذلك');
await page.unrouteAll({behavior:'ignoreErrors'});await page.close();

console.log('\n٣) السطر بلا إضافيّات لا يُعاد إرساله مهما حدث');
({page,seen}=await mk([])); // كل شيء مرفوض
await page.evaluate(()=>logAnswer("basics_percent","stage5",true,"٢١٠",null,3000));
await until(()=>seen.length>=1);await page.waitForTimeout(300);
ok(seen.length===1,`محاولة واحدة فقط بلا حلقة إعادة (${seen.length})`);
await page.unrouteAll({behavior:'ignoreErrors'});await page.close();

console.log('\n٤) فشل الشبكة كلياً لا يرمي خطأً في الصفحة');
{
  const p2=await b.newPage({viewport:{width:420,height:900}});
  p2.on('pageerror',e=>{console.log('  ✗ PAGEERROR '+e.message);fails++});
  await p2.route('**/rest/v1/**',r=>r.abort());
  await p2.goto('http://127.0.0.1:8931/index.html');
  await p2.waitForFunction(()=>typeof logAnswer==='function');
  await p2.evaluate(()=>logAnswer("x","y",true,"z",null,1,{score_pct:1,engine:"azure"}));
  await p2.waitForTimeout(700);
  ok((await p2.evaluate(()=>window.__ERRS.length))===0,'لا خطأ ولا وعد مرفوض غير ملتقط');
  await p2.close();
}

console.log('\n٥) كل مسارات التسجيل الحيّة ما زالت تُرسل');
({page,seen}=await mk(COLS));
await page.evaluate(()=>{startBasics('percent');basicsStage=5;basicsNew();
  pctPickBand(pctBandOf(basicsCur.fam.a,basicsCur.fam.b));
  document.getElementById('basicsIn').value=String(basicsCur.ansVal);basicsSubmit()});
await until(()=>seen.some(x=>x.domain==='basics_percent'));
ok(seen.some(s=>s.domain==='basics_percent'),'الأساسيات/النسبة تُسجَّل');
await page.unrouteAll({behavior:'ignoreErrors'});await page.close();

console.log('\n٦) سطر الحدث (بلا صواب/خطأ) يصل');
({page,seen}=await mk(COLS));
await page.evaluate(()=>logAnswer("eng_plan","fix_open",null,"write","u1_g2",null,{lesson:"l_passive"}));
await until(()=>seen.length>=1);
ok(seen.length===1&&seen[0].keys.includes('is_correct'),'يُرسَل بطلب واحد');
const ev=await page.evaluate(()=>1);
ok(seen[0].domain==='eng_plan','ومجاله صحيح');
await page.unrouteAll({behavior:'ignoreErrors'});await page.close();

console.log('\n٧) لا انحدار');
({page,seen}=await mk(COLS));
for(const [fn,md] of [["startBasics('percent')",'basics'],["startFactPlan()",'factplan'],["startEngPlan()",'engplan'],
  ["startPronunciation()",'pron'],["startAudioDiag()",'audiodiag'],["home()",'home']]){
  const r=await page.evaluate(x=>{try{eval(x);return{m:mode}}catch(e){return{err:e.message}}},fn);
  ok(!r.err&&r.m===md,`${fn} → ${r.err||r.m}`);
}
ok((await page.evaluate(()=>censusMissing())).length===0,'وكل الدوال معرَّفة');
ok((await page.evaluate(()=>window.__ERRS.length))===0,'ولا خطأ');
await page.unrouteAll({behavior:'ignoreErrors'});await page.close();

await b.close();
console.log(fails?`\n=== ${fails} فشل ===`:'\n=== كل الاختبارات نجحت ===');
process.exit(fails?1:0);
})();
