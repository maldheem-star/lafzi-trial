const {chromium}=require('/opt/node22/lib/node_modules/playwright');
let fails=0;const ok=(c,m)=>{console.log((c?'  ✓ ':'  ✗ FAIL ')+m);if(!c)fails++};
(async()=>{
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'});
const page=await b.newPage({viewport:{width:420,height:900}});
page.on('pageerror',e=>{console.log('  ✗ PAGEERROR '+e.message);fails++});
await page.route('**/rest/v1/**',r=>r.fulfill({status:201,contentType:'application/json',body:'[]'}));
await page.goto('http://127.0.0.1:8931/index.html');
await page.waitForFunction(()=>typeof gateSecondsFor==='function');

console.log('\n١) أسئلتها الحقيقية من الاختبار — التي مرّت بلا بوّابة');
const real=await page.evaluate(()=>{
  const R=[
   ["reading","يلعب التفاعل الاجتماعي دوراً مهماً في تشكيل الشخصية. كيف يمكن أن يؤثر التفاعل الاجتماعي على تطور شخصية الفرد في المجتمع؟",2.4],
   ["reading","الطلاب يدرسون معلمهم بأدب واخلاق عالية. يعتبر هذا السلوك جزءاً من التعليم الجيد. ما الذي يعكسه سلوك الطلاب؟",1.6],
   ["logic","أعلنت الحكومة عن خطة لتطوير التعليم في البلد. ما هي النتيجة المتوقعة من هذه الخطة؟",2.1],
   ["logic","تم الاتفاق على عقد جديد بين شركة وطنية وموردين محليين لتوريد المواد الخام. ما النتيجة المرجّحة؟",2.3],
   ["reading","كانت الأمطار تتساقط بغزارة على المدينة، مما أدى إلى فيضان الشوارع. ما السبب الرئيسي لفيضان الشوارع؟",79.9]
  ];
  return R.map(function(x){return{t:x[0],was:x[2],old:(function(q){const w=q.trim().split(/\s+/).length;return w<25?0:Math.max(8,Math.round(w/90*60))})(x[1]),now:gateSecondsFor(x[1],x[0]),words:x[1].trim().split(/\s+/).length}});
});
real.forEach(function(r){
  ok(r.now>0,`${r.t} (${r.words} كلمة): البوّابة ${r.old} ث ← ${r.now} ث — وكانت تُجيب في ${r.was} ث`);
});
ok(real.every(r=>r.old===0),'وكلها كانت بلا بوّابة إطلاقاً قبل التغيير');

console.log('\n٢) البوّابة لا تعترض ما لا يحتاجها');
const others=await page.evaluate(()=>({
  analogy:gateSecondsFor("منزل : عمارة = شجرة : ؟","analogy"),
  vocab:gateSecondsFor("ضد الكلمة: طَويل","vocabulary"),
  quant:gateSecondsFor("٧ × ٨ = ؟","bank"),
  empty:gateSecondsFor("","reading"),
  none:gateSecondsFor("نصّ قصير جداً",undefined)
}));
ok(others.analogy===0,'التناظر بلا بوّابة (أصابت ٣/٣ في ٣ ثوانٍ — استرجاع لا قراءة)');
ok(others.vocab===0,'والمفردات كذلك');
ok(others.quant===0,'والكمّي كذلك');
ok(others.none===0,'وبلا نوع: يعود للسلوك القديم');
ok(others.empty>0,'ونصّ فارغ من نوع قراءة يُعطى الحدّ الأدنى لا صفراً');

console.log('\n٣) النصّ الطويل ما زال يأخذ زمناً أطول من الحدّ');
const long=await page.evaluate(()=>{
  const q=Array(60).fill("كلمة").join(" ");
  return{r:gateSecondsFor(q,"reading"),plain:gateSecondsFor(q,"bank"),cap:gateSecondsFor(Array(400).fill("ك").join(" "),"reading")};
});
ok(long.r===40&&long.plain===40,`٦٠ كلمة ⇒ ٤٠ ثانية بالطول لا بالحدّ الأدنى (${long.r})`);
ok(long.cap===45,`والسقف ٤٥ ثانية محفوظ (${long.cap})`);

console.log('\n٤) البوّابة تعمل فعلاً داخل الاختبار');
await page.evaluate(()=>{
  filtered=[{q:"الطلاب يدرسون معلمهم بأدب واخلاق عالية. ما الذي يعكسه سلوكهم؟",qtype:"reading",d:"verbal",c:["أ","ب","ج","د"],a:0,w:"شرح"},
            {q:"منزل : عمارة = شجرة : ؟",qtype:"analogy",d:"verbal",c:["أ","ب","ج","د"],a:0,w:"شرح"}];
  idx=0;picked=null;locked=false;done=false;loading=false;score=0;answered=[];
  mode="quiz";currentMode="verbal";gateStart(filtered[0].q,filtered[0].qtype);render();
});
let txt=await page.textContent('#app');
ok(await page.evaluate(()=>gateSecs)>0,'سؤال الفهم المقروء: البوّابة مُقفَلة');
ok(txt.includes('اقرئي النص كاملاً أولاً'),'وتُطلب القراءة');
ok(await page.evaluate(()=>document.querySelectorAll('.choice').length)===0,'والخيارات غير موجودة في الصفحة إطلاقاً');
await page.evaluate(()=>{gateLeft=0;gateStop();render()});
ok(await page.evaluate(()=>document.querySelectorAll('.choice').length)===4,'وبعد انقضاء الزمن تظهر الأربعة');
// الاستدلال: نصّ مختلف
await page.evaluate(()=>{gateStart("أعلنت الحكومة عن خطة لتطوير التعليم. ما النتيجة المتوقعة؟","logic");render()});
txt=await page.textContent('#app');
ok(txt.includes('اقرئي المقدّمة كاملة ثم استنتجي'),'والاستدلال له نصّه الخاص لا نصّ القراءة');
ok(txt.includes('الاستنتاج لا يُخمَّن'),'وسببه مذكور');
// التناظر يمرّ فوراً
await page.evaluate(()=>{idx=1;gateStart(filtered[1].q,filtered[1].qtype);render()});
ok(await page.evaluate(()=>gateOpen())===true,'والتناظر يفتح فوراً');
ok(await page.evaluate(()=>document.querySelectorAll('.choice').length)===4,'وخياراته ظاهرة بلا انتظار');

console.log('\n٥) العدّاد ينتهي فعلاً ولا يعلق');
await page.evaluate(()=>{gateStart("نصّ قراءة قصير للاختبار","reading")});
const s0=await page.evaluate(()=>gateSecs);
await page.waitForFunction(()=>gateLeft<gateSecs,null,{timeout:4000});
ok(true,`العدّاد ينقص فعلاً (بدأ من ${s0})`);
ok(await page.evaluate(()=>gateTimer!==null),'والمؤقّت يعمل');
await page.evaluate(()=>{gateStop();gateLeft=0});
ok(await page.evaluate(()=>gateOpen())===true,'ويُفتح عند الصفر');

console.log('\n٦) لا انحدار');
for(const [fn,md] of [["startBasics('pimul3')",'basics'],["startFade('circle')",'fade'],["startFactPlan()",'factplan'],
  ["startPronunciation()",'pron'],["startAudioDiag()",'audiodiag'],["home()",'home']]){
  const r=await page.evaluate(x=>{try{eval(x);return{m:mode}}catch(e){return{err:e.message}}},fn);
  ok(!r.err&&r.m===md,`${fn} → ${r.err||r.m}`);
}
ok((await page.evaluate(()=>censusMissing())).length===0,'وكل الدوال معرَّفة');
ok((await page.evaluate(()=>window.__ERRS.length))===0,'ولا خطأ');
await b.close();
console.log(fails?`\n=== ${fails} فشل ===`:'\n=== كل الاختبارات نجحت ===');
process.exit(fails?1:0);
})();
