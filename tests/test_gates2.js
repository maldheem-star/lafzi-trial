// وصل بوّابتين طُلبتا معاً بعد قياس ١٤-١٥ أغسطس:
//
// ١) بوّابة quot_off_one/quot_off_one_up في الأساسيات — ١٣ مرّة عبر يومين (fact_fluency
//    وbasics_multdiv معاً)، أكثر من أي خطأ مسمّى آخر. وثلاثٌ من خمس وقعت في المرحلتين
//    ٢ و٣ حيث basicsDivGated لا يعمل (يبدأ من المرحلة ٤). فالبوّابة الجديدة تسدّ هذا
//    تحديداً، بالأداة المبنية أصلاً (المصفوفة) لا بشيء جديد.
// ٢) بوّابتا الفجوات والاستلاف (ob1/bt) موصولتان إلى fact_fluency أيضاً — كانتا تعملان
//    في basics_subborrow وحده، وcount_all_not_gaps تكرّر في fact_fluency ٤ مرّات بلا
//    علاج رغم أن الآلية جاهزة. المشكلة توصيل لا بناء من جديد.
//
// وكشف الوصل خطأً كامناً: البوّابة كانت تُسلَّح بـ fam.a/fam.b مباشرةً، وفي القسمة هذان
// طرفا عائلة الضرب (٤×٩=٣٦) لا طرفي السؤال المعروض (٣٦÷٤ أو ٣٦÷٩) — فأُصلح إلى
// basicsOperands() قبل أن يُبنى عليه شيء.
const {chromium}=require('/opt/node22/lib/node_modules/playwright');
let fails=0;const ok=(c,m)=>{console.log((c?'  ✓ ':'  ✗ FAIL ')+m);if(!c)fails++};
(async()=>{
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'});
let logs=[];
const mk=async()=>{
  const page=await b.newPage({viewport:{width:420,height:900}});
  page.on('pageerror',e=>{console.log('  ✗ PAGEERROR '+e.message);fails++});
  await page.route('**/rest/v1/**',async r=>{
    let x={};try{x=JSON.parse(r.request().postData()||'{}')}catch(e){}
    logs.push(x);r.fulfill({status:201,contentType:'application/json',body:'[]'});
  });
  await page.goto('http://127.0.0.1:8931/index.html');
  await page.waitForFunction(()=>typeof quotArm==='function');
  return page;
};
const putDiv=async(page,a,b,stage)=>page.evaluate(([a,b,stage])=>{
  mode="basics";basicsSub="multdiv";basicsStage=stage;
  const q=a+" ÷ "+b, ans=a/b;
  basicsCur={fam:{a:b,b:ans,c:a},op:"div",qText:q,ansVal:ans};
  divArmArray(a,b);
  const m=mcNum(ans,[ans+1,ans-1,ans+10]);
  basicsCur.opts=m.choices;basicsCur.ai=m.answer;
  basicsLocked=false;basicsPicked=-1;basicsTyped="";render();
},[a,b,stage]);
const pickVal=async(page,value)=>page.evaluate(v=>{
  const i=basicsCur.opts.findIndex(o=>parseArNum(o)===v);
  if(i<0)return false;basicsChoose(i);return true;
},value);

console.log('\n١) basicsOperands لا fam.a/fam.b — الإصلاح الكامن أوّلاً');
let page=await mk();
const o=await page.evaluate(()=>{
  mode="basics";basicsSub="multdiv";basicsStage=2;
  basicsCur={fam:{a:4,b:9,c:36},op:"div",qText:"36 ÷ 4"};
  divArmArray(36,4);
  return basicsOperands();
});
ok(o.a===36&&o.b===4,`طرفا السؤال المعروض لا عائلة الضرب (${o.a},${o.b} لا 4,9)`);

console.log('\n٢) بوّابة quot_off_one_up تُسلَّح بتكرارها في المرحلة الثانية — حيث لا علاج كان موجوداً');
page=await mk();
await page.evaluate(()=>{try{lsDel('mawhiba_basics_shape_v1')}catch(e){}});
await putDiv(page,27,9,2);   // 27÷9=3، والخطأ +١ (٤) — quot_off_one_up
await pickVal(page,4);
ok(await page.evaluate(()=>quotGated())===false,'الخطأ الأول: بلا بوّابة — لا يُعاقَب من زلّ مرّة');
await page.evaluate(()=>basicsAdvance());
await putDiv(page,24,3,2);   // 24÷3=8، وخطأ +١ (٩)
await pickVal(page,9);
ok(await page.evaluate(()=>quotGated())===true,'والثاني يُسلّحها — في مرحلةٍ basicsDivGated لا يعمل فيها أصلاً');
ok(await page.evaluate(()=>basicsDivGated())===false,'وbasicsDivGated وحدها كانت لتُفوّت هذا (المرحلة <٤)');
let t=await page.textContent('#app');
ok(t.includes('لنراها بدل أن نحفظها'),'وتُعرض المصفوفة — الأداة المبنية أصلاً لا رسمٌ جديد');
ok(await page.evaluate(()=>document.querySelectorAll('button[onclick="basicsAdvance()"]').length)===0,'وزرّ الانتقال يختفي');
// والمصفوفة تُسلَّح بأرقام السؤال الصحيحة (٢٤،٣) لا عائلة الضرب
const armed=await page.evaluate(()=>({a:divA,b:divB}));
ok(armed.a===24&&armed.b===3,`ومصفوفتها على ٢٤÷٣ فعلاً (${armed.a}÷${armed.b})`);

console.log('\n٣) تُفتح بإكمال المصفوفة، وتُسجَّل بنتيجتها');
logs=[];
for(let i=0;i<8;i++)await page.click('button[onclick="divAddRow()"]');
ok(await page.evaluate(()=>divComplete())===true,'٨×٣=٢٤ — اكتملت');
ok(await page.evaluate(()=>quotGated())===false,'والبوّابة تُفتح');
await page.evaluate(()=>basicsAdvance());
await page.waitForTimeout(300);
const row=logs.find(l=>l.qtype==='array');
ok(!!row&&row.is_correct===true,`سطر العلاج وصل بنتيجته (${row&&row.is_correct})`);
ok(row&&row.q_text==='24 ÷ 3','ومعه السؤال الصحيح لا عائلته');
ok(await page.evaluate(()=>quotOn)===false,'وquotOn يُصفَّر بعد التسجيل');

console.log('\n٤) المرحلة ≥٤ كما كانت: العلاج على كل خطأ قسمة بلا شرط تكرار');
page=await mk();
await page.evaluate(()=>{try{lsDel('mawhiba_basics_shape_v1')}catch(e){}});
await putDiv(page,28,4,4);
await pickVal(page,8);   // خطأ أوّل فقط
ok(await page.evaluate(()=>basicsDivGated())===true,'basicsDivGated وحدها كافية هنا — لم تتغيّر');

console.log('\n٥) fact_fluency: بوّابتا الفجوات والاستلاف موصولتان — الآلية المبنية في الأساسيات نفسها');
page=await mk();
await page.evaluate(()=>{try{lsDel('mawhiba_basics_shape_v1')}catch(e){}});
logs=[];
const put=(a,b,ansTyped)=>page.evaluate(([a,b,ansTyped])=>{
  mode="factplan";factItems=[{op:"sub",a,b,ans:a-b,id:"f_test_"+a+"_"+b}];factIdx=0;factDone=false;
  factInput="";factLocked=false;factShownAt=Date.now()-2000;factCueOn=false;render();
  document.getElementById('factIn').value=String(ansTyped);
  factCheck();
},[a,b,ansTyped]);
await put(23,14,10);   // الصواب ٩، عدّت الأعداد لا الفجوات ⇒ count_all_not_gaps
ok(await page.evaluate(()=>factGated())===false,'الخطأ الأول في fact_fluency: بلا بوّابة كذلك');
await page.evaluate(()=>factNext());
await put(21,12,10);   // الصواب ٩، نفس الآلية مرّة ثانية
ok(await page.evaluate(()=>factGated())===true,'والثاني يُسلّح البوّابة هنا أيضاً — الحالة مشتركة مع الأساسيات');
t=await page.textContent('#app');
ok(t.includes('الفرق فجواتٌ لا أعداد'),'ونفس مربّع خطّ الأعداد يُعرض — لا بناء ثانٍ');
ok(t.includes('أكملي الخطوات أعلاه'),'ورسالة القفل تُميّز بوّابة الشكل عن بوّابة القسمة');
const jumps=await page.evaluate(()=>ob1Total());
for(let i=0;i<jumps;i++)await page.click('button[onclick="ob1Jump()"]');
ok(await page.evaluate(()=>factGated())===false,'وتُفتح بإكمالها');
await page.evaluate(()=>factNext());
await page.waitForTimeout(300);
const gapRow=logs.find(l=>l.domain==='fact_fluency'&&l.qtype==='gaps');
ok(!!gapRow&&gapRow.is_correct===true,`وتُسجَّل بنطاق fact_fluency (${gapRow&&gapRow.domain}/${gapRow&&gapRow.qtype})`);

console.log('\n٦) والقسمة في fact_fluency لم تتغيّر — علاجها العامّ بلا شرط تكرار كما كان');
page=await mk();
logs=[];
await put2(24,4,5);   // خطأ أوّل قسمة فقط
async function put2(a,b,ansTyped){await page.evaluate(([a,b,ansTyped])=>{
  mode="factplan";factItems=[{op:"div",a,b,ans:a/b,id:"f_div_"+a+"_"+b}];factIdx=0;
  factInput="";factLocked=false;factShownAt=Date.now()-2000;factCueOn=false;render();
  document.getElementById('factIn').value=String(ansTyped);
  factCheck();
},[a,b,ansTyped])}
ok(await page.evaluate(()=>factGated())===true,'المصفوفة تُعرض من الخطأ الأوّل — كما كانت دائماً');

console.log('\n٧) لا انحدار');
for(const [fn,md] of [["startBasics('multdiv')",'basics'],["startBasics('subborrow')",'basics'],
  ["startBasics('mixed')",'basics'],["startFactPlan()",'factplan'],["startListen()",'listen'],
  ["startEngPlan()",'engplan'],["startCoach()",'coach'],["home()",'home']]){
  const r=await page.evaluate(x=>{try{eval(x);return{m:mode}}catch(e){return{err:e.message}}},fn);
  ok(!r.err&&r.m===md,`${fn} → ${r.err||r.m}`);
}
ok((await page.evaluate(()=>censusMissing())).length===0,'وكل الدوال معرَّفة');
ok((await page.evaluate(()=>window.__ERRS.length))===0,'ولا خطأ');

console.log('\n'+(fails?`=== ${fails} فشل ===`:'=== كل الاختبارات نجحت ==='));
await b.close();process.exit(fails?1:0);
})();
