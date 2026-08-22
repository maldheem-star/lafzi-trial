// ثلاث ممارسات معيارية بدل ثلاثة حلولٍ من بنائي:
//
// ١) مكتبة الأخطاء المنهجية — فهرس Brown & Burton (١٩٧٨) وما تلاه. الآليات الثلاث التي
//    «اكتشفتُها» في الطرح مسمّاةٌ فيه منذ نصف قرن. والخطأ **إجراءٌ يُحاكى** لا فرقٌ
//    يُطابَق: فرقُ +١٠ قد يخرج من إجراءين، والمحاكاة تفصل بينهما.
// ٢) التشابك — المكتّل يُتقن التنفيذ ولا يُعلّم اختيار الطريقة.
// ٣) معدّل الطلاقة (DCPM) — الطلاقة دقّةٌ مع سرعة، وكنّا نقيس الدقّة وحدها.
const {chromium}=require('/opt/node22/lib/node_modules/playwright');
let fails=0;const ok=(c,m)=>{console.log((c?'  ✓ ':'  ✗ FAIL ')+m);if(!c)fails++};
(async()=>{
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'});
let logs=[];
const page=await b.newPage({viewport:{width:420,height:900}});
page.on('pageerror',e=>{console.log('  ✗ PAGEERROR '+e.message);fails++});
await page.route('**/rest/v1/**',async r=>{
  let x={};try{x=JSON.parse(r.request().postData()||'{}')}catch(e){}
  logs.push(x);r.fulfill({status:201,contentType:'application/json',body:'[]'});
});
await page.addInitScript(()=>{
  Object.defineProperty(window,'speechSynthesis',{configurable:true,value:{speak(){},cancel(){},resume(){},pause(){},
    getVoices:()=>[{lang:'en-US',name:'X'}],speaking:false,pending:false}});
  window.SpeechSynthesisUtterance=function(t){this.text=t};
});
await page.goto('http://127.0.0.1:8931/index.html');
await page.waitForFunction(()=>typeof bugOf==='function');

console.log('\n١) الفهرس يُسمّي أخطاء ١٣ أغسطس الحقيقية بأسمائها المنشورة');
// كلّها من سجلّها هي، لا أمثلة مخترعة
const named=await page.evaluate(()=>[
  ["sub",81,73,18],["sub",83,45,48],["sub",30,13,27],["sub",51,37,24],   // +١٠
  ["sub",23,14,10],["sub",21,12,10],["sub",70,57,14],["sub",83,44,40],   // +١
  ["sub",81,55,25],["sub",41,14,26],["sub",81,65,15],["sub",91,64,26],   // −١
].map(([o,a,c,g])=>{const r=bugOf(o,a,c,g);return{q:a+"-"+c,g,id:r&&r.id}}));
const byId=id=>named.filter(x=>x.id===id).length;
ok(byId("borrow_no_decrement")===4,`الاستلاف بلا إنقاص: ٤ (${byId("borrow_no_decrement")})`);
ok(byId("count_all_not_gaps")===4,`عدّ الأعداد لا الفجوات: ٤ (${byId("count_all_not_gaps")})`);
ok(byId("drop_minuend_units")===4,`إسقاط آحاد المطروح منه: ٤ (${byId("drop_minuend_units")})`);
ok(named.every(x=>x.id),'ولا واحدة بلا اسم — اثنتا عشرة إجابة، اثنتا عشرة آلية مسمّاة');

console.log('\n٢) المحاكاة تفصل ما لا يفصله الفرق');
const sep=await page.evaluate(()=>{
  // ٨١−٧٣: الصواب ٨. «الاستلاف بلا إنقاص» يعطي ١٨، و«طرح الأصغر من الأكبر» يعطي ١٢ —
  // والفرق وحده (+١٠ و+٤) لا يقول أيّ إجراءٍ جرى.
  return {a:(bugOf("sub",81,73,18)||{}).id,b:(bugOf("sub",81,73,12)||{}).id,
          right:bugOf("sub",81,73,8)};
});
ok(sep.a==='borrow_no_decrement'&&sep.b==='smaller_from_larger',
   `الجوابان المختلفان يُسمّيان إجراءين مختلفين (${sep.a} · ${sep.b})`);
ok(sep.right===null,'والصواب بلا خطأ');

console.log('\n٣) وفرضيّة «قلب الأرقام» في الجمع تُفحص بالمحاكاة');
const rev=await page.evaluate(()=>[bugOf("add",55,35,108),bugOf("add",57,76,151)].map(x=>x&&x.id));
ok(rev[0]==='digit_reversal_b'&&rev[1]==='digit_reversal_a',
   `٥٥+٣٥⇐١٠٨ و٥٧+٧٦⇐١٥١ كلاهما قلبُ رقمين (${rev.join(' · ')})`);
const nofalse=await page.evaluate(()=>bugOf("add",37,65,92));
ok(nofalse&&nofalse.id==='carry_dropped','ونسيان الحمل يُسمّى بغيره لا يُخلط به');

console.log('\n٤) البوّابة معلّقة على اسم الخطأ لا على فرقٍ مكتوب في الشيفرة');
const gates=await page.evaluate(()=>Object.keys(BUG_GATES));
ok(gates.indexOf('count_all_not_gaps')>=0&&gates.indexOf('borrow_no_decrement')>=0
   &&gates.indexOf('quot_off_one')>=0&&gates.indexOf('quot_off_one_up')>=0,
   `جدول البوّابات: ${gates.join(' · ')}`);
// أضيفت بوّابة القسمة (١٥ أغسطس: ١٣ مرّة عبر يومين، أكثر من أيّ خطأ آخر) بالأداة
// المبنية أصلاً (المصفوفة) — سطرٌ في الجدول لا بناءٌ جديد. ثم surf_no_double (٢٢ أغسطس:
// ثلاثةٌ من خمسة أخطاءٍ في التقوية النصفَ بالضبط — تجمع الأوجه الثلاثة وتنسى ×٢).
// وعائلة −١ في الطرح تبقى بلا بوّابة بعد — تُقرَّر بعد أثر ما قبلها.
//
// والعدد وحده («أربع بوّابات») كان يحمل هذا المعنى كلّه، فكسرته كلُّ إضافةٍ مشروعة
// ولا يقول أيّ اسمٍ تغيّر — وهو حرفياً درس «الأعداد المكتوبة في الاختبارات فخّ صامت»
// (١٨ أغسطس). فيُثبَّت الجدول بأسمائه: إضافةٌ أو حذفٌ يُفشله ويُسمّي ما تغيّر.
const WANT=['count_all_not_gaps','borrow_no_decrement','quot_off_one','quot_off_one_up','surf_no_double'];
ok(WANT.every(g=>gates.indexOf(g)>=0)&&gates.length===WANT.length,
   `جدول البوّابات بأسمائه — ${gates.join(' · ')}`);
// وتُسلَّح فعلاً من الاسم
const armed=await page.evaluate(()=>{
  try{lsDel('mawhiba_basics_shape_v1')}catch(e){}
  mode="basics";startBasics('subborrow');
  const put=(a,bb)=>{basicsSub="subborrow";basicsStage=2;basicsCur={fam:{a:a,b:bb,c:a-bb}};
    basicsPrep();basicsLocked=false;basicsPicked=-1;render()};
  const hit=v=>{const i=basicsCur.opts.findIndex(o=>parseArNum(o)===v);basicsChoose(i)};
  put(23,14);hit(10);const first=basicsOb1Gated();
  basicsAdvance();put(21,12);hit(10);
  return {first,second:basicsOb1Gated(),bug:(basicsBugNow()||{}).id};
});
ok(armed.bug==='count_all_not_gaps','الخطأ يُسمّى وقت وقوعه');
ok(armed.first===false&&armed.second===true,'والبوّابة تُسلَّح على تكرار الاسم لا على أوّله');

console.log('\n٥) واسم الخطأ يدخل السجلّ');
logs=[];
await page.evaluate(()=>{
  mode="basics";startBasics('subborrow');basicsStage=2;
  basicsCur={fam:{a:81,b:73,c:8}};basicsPrep();basicsLocked=false;basicsPicked=-1;render();
  const i=basicsCur.opts.findIndex(o=>parseArNum(o)===18);basicsChoose(i);
});
await page.waitForTimeout(300);
let row=logs.filter(l=>String(l.qtype||'').indexOf('stage')===0).slice(-1)[0];
ok(row&&/borrow_no_decrement/.test(String(row.response)),`السطر يحمل الاسم (${row&&row.response})`);

console.log('\n٦) التشابك: الأربع عمليات في الجلسة الواحدة');
const mix=await page.evaluate(()=>{
  startBasics('mixed');
  const seen=[];
  for(let i=0;i<24;i++){seen.push(basicsSub);basicsNew()}
  const uniq=[...new Set(seen)];
  let adj=0;for(let i=1;i<seen.length;i++)if(seen[i]===seen[i-1])adj++;
  return {uniq,adj,mixOn:basicsMix,pool:BASICS_MIX};
});
ok(mix.mixOn===true,'الوضع المتشابك مُفعَّل');
ok(mix.uniq.length===mix.pool.length,`وكل العمليات ظهرت (${mix.uniq.join(' · ')})`);
ok(mix.adj===0,'ولا تتكرّر عمليةٌ مرّتين متتاليتين — وإلا صار تكتيلاً صغيراً');
// والمكتّل يبقى كما هو لمن يريده
const blocked=await page.evaluate(()=>{
  startBasics('subborrow');
  const seen=[];for(let i=0;i<8;i++){seen.push(basicsSub);basicsNew()}
  return {all:seen.every(x=>x==='subborrow'),mixOn:basicsMix};
});
ok(blocked.all&&blocked.mixOn===false,'والمكتّل باقٍ لمن اختاره');
// وكل ما بُني على basicsSub يعمل في المتشابك
const draws=await page.evaluate(()=>{
  // المرحلة الأولى مثالٌ محلول بلا خيارات عمداً، فنقيس من الثانية فصاعداً
  startBasics('mixed');basicsStage=2;basicsNew();const out=[];
  for(let i=0;i<18;i++){
    out.push({sub:basicsSub,q:!!(basicsCur&&basicsCur.qText),opts:(basicsCur.opts||[]).length});
    basicsNew();
  }
  return out;
});
ok(draws.every(d=>d.q),'ولكل سؤالٍ نصُّه');
ok(draws.every(d=>d.opts===4),'وأربعة خيارات — القاعدة والرسم والمموّهات تتبع العملية');

console.log('\n٧) معدّل الطلاقة: أرقامٌ صحيحة في الدقيقة لا نسبةُ صواب');
const dc=await page.evaluate(()=>{
  factLog=[
    {op:"add",ok:true,ms:5000,digits:2},   // رقمان صحيحان
    {op:"mul",ok:true,ms:5000,digits:2},
    {op:"div",ok:false,ms:5000,digits:1},  // خطأ: لا يُحتسب
    {op:"sub",ok:true,ms:5000,digits:1},
    {op:"div",remedy:true,taps:4,done:true,ms:9000},  // العلاج خارج الحساب
  ];
  return factDcpm();
});
ok(dc&&dc.digits===5,`الأرقام الصحيحة تُجمع بعددها لا بعدد الأسئلة (${dc&&dc.digits})`);
ok(dc&&dc.n===4,'والعلاج لا يدخل الزمن ولا العدّ');
ok(dc&&dc.dcpm===15,`٥ أرقام في ٢٠ ثانية = ١٥ في الدقيقة (${dc&&dc.dcpm})`);
const bands=await page.evaluate(()=>[factDcpmBand(45).t,factDcpmBand(25).t,factDcpmBand(8).t]);
ok(bands[0]!==bands[1]&&bands[1]!==bands[2],`ثلاثة نطاقات إرشادية (${bands.join(' · ')})`);
// الدقّة وحدها لا تكفي — وهذا هو بيت القصيد
const slow=await page.evaluate(()=>{
  factLog=[{op:"add",ok:true,ms:60000,digits:2},{op:"sub",ok:true,ms:60000,digits:2}];
  return factDcpm();
});
ok(slow.dcpm===2,`١٠٠٪ صواب في دقيقتين = ${slow.dcpm} في الدقيقة — الدقّة وحدها لا تكفي`);

console.log('\n٧ب) والمعدّل يُسجَّل فيُقارَن اليومُ بالأمس');
logs=[];
await page.evaluate(()=>{
  startFactPlan();
  factLog=[{op:"add",ok:true,ms:4000,digits:2},{op:"sub",ok:true,ms:4000,digits:2}];
  factIdx=factItems.length-1;factLocked=true;factInput=String(factCur().ans);
  factNext();
});
await page.waitForTimeout(300);
const d=logs.filter(l=>l.qtype==='dcpm')[0];
ok(!!d,'سطر المعدّل وصل');
ok(d&&/digits:4/.test(String(d.q_text)),`ومعه الأرقام والعدد (${d&&d.q_text})`);

console.log('\n٨) لا انحدار');
for(const [fn,md] of [["startBasics('mixed')",'basics'],["startBasics('multdiv')",'basics'],
  ["startBasics('percent')",'basics'],["startBasics('pimul')",'basics'],
  ["startFactPlan()",'factplan'],["startEngPlan()",'engplan'],["startDictation()",'dictation'],
  ["startCoach()",'coach'],["home()",'home']]){
  const r=await page.evaluate(x=>{try{eval(x);return{m:mode}}catch(e){return{err:e.message}}},fn);
  ok(!r.err&&r.m===md,`${fn} → ${r.err||r.m}`);
}
ok((await page.evaluate(()=>censusMissing())).length===0,'وكل الدوال معرَّفة');
ok((await page.evaluate(()=>window.__ERRS.length))===0,'ولا خطأ');

console.log('\n'+(fails?`=== ${fails} فشل ===`:'=== كل الاختبارات نجحت ==='));
await b.close();process.exit(fails?1:0);
})();
