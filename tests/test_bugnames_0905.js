// آليّتا خطأٍ سمّاهما فحصُ جلسة هيا — ٥ سبتمبر.
//
// العطل الذي يحرسه: عشرُ إجاباتٍ خاطئة متتالية بأزمنةٍ منخرطة، وواحدةٌ فقط حملت اسم
// آلية — والتسع «فرقٌ» بلا اسم، فتُقرأ ضعفاً عامّاً بينما فيها عائلتان بأعيانهما.
// والحالات الأربع أدناه **من سجلّها الحيّ حرفاً بحرف**، لا أمثلةٌ مؤلَّفة.
//
// **وحدُّه يُقال**: يفحص التسمية والتسجيل، **ولا بوّابة** — قياسٌ لا علاج بنفس قرار
// `quizErrDelta` (١٦ أغسطس)، حتى يُثبت توزيعٌ حقيقي أنها عائلةٌ مستقرّة لا صدفة مرّتين.
const {chromium}=require('/opt/node22/lib/node_modules/playwright');
let fails=0;const ok=(c,m)=>{console.log((c?'  ✓ ':'  ✗ FAIL ')+m);if(!c)fails++};
(async()=>{
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'});
const p=await b.newPage({viewport:{width:420,height:900}});
p.on('pageerror',e=>{console.log('  ✗ PAGEERROR '+e.message);fails++});
await p.route('**/rest/v1/**',r=>r.fulfill({status:201,contentType:'application/json',body:'[]'}));
await p.route('**/functions/v1/**',r=>r.fulfill({status:200,contentType:'application/json',body:'{"ok":false}'}));
await p.goto('http://127.0.0.1:8931/index.html');
await p.waitForFunction(()=>typeof multAsAddName==='function');

console.log('\n١) الجمعُ مكان الضرب — الحالتان الحيّتان');
{
  const r=await p.evaluate(()=>{
    // رياضيات ٦ · ١٥:٣٦:٣٩ — أجابت ١٧ = ٥+٤+٨
    const q1={d:"math6",q:"دالةٌ قاعدتها: اضربي المُدخَل في ٤ ثم أضيفي ٨. ما المُخرَج عندما يكون المُدخَل ٥؟",
      c:["٢٨","٥٢","٢٠","١٧"],a:0};
    // رياضيات ٦ · ١٥:٣٧:١١ — أجابت ٢٨ = ٢٥+٣
    const q2={d:"math6",q:"إذا كان عدد الرميات الناجحة لنوّاف ٣ أمثال رميات سليمان ٢٥، فما عدد رميات نوّاف؟",
      c:["٧٥","٢٨","٥٠","٢٢"],a:0};
    return{
      one:multAsAddName(q1,17), oneRight:multAsAddName(q1,28),
      two:multAsAddName(q2,28), twoRight:multAsAddName(q2,75),
      // ولا بلاغ كاذب: نصٌّ بلا دلالةِ ضرب، ومجموعٌ يُصادف الصواب
      noMult:multAsAddName({d:"math6",q:"أوجدي ناتج الطرح: ٤٣ − ٧",c:["٣٦","٣٤"],a:0},50),
      sumIsAnswer:multAsAddName({d:"math6",q:"اضربي ٢ في ٢",c:["٤","٥"],a:0},4),
    };
  });
  ok(!!r.one,'«اضربي في ٤ ثم أضيفي ٨» ⇐ ١٧ يُسمّى — '+r.one);
  ok(!!r.two,'و«٣ أمثال ٢٥» ⇐ ٢٨ كذلك — '+r.two);
  ok(!r.oneRight&&!r.twoRight,'ولا يُسمّى الصواب آليةَ خطأ');
  ok(!r.noMult,'ولا نصٌّ بلا دلالة ضرب');
  ok(!r.sumIsAnswer,'ولا حين يكون المجموع هو الصواب نفسه (٢+٢=٤) — فلا دلالة فيه');
}

console.log('\n٢) اختيارُ عددٍ من نصّ السؤال — الحالتان الحيّتان');
{
  const r=await p.evaluate(()=>{
    // كمّي · ١٥:٣٣:٢٠ — أجابت ٥ وهي «٥ أوراق» في النصّ
    const q1={d:"quant",q:"إذا كان مع محمد ٣٥٠ ريالاً من فئة ٥٠ و١٠٠ ريال، وكان عدد الأوراق النقدية ٥ أوراق، فكم ورقة معه من فئة ٥٠ ريالاً؟",
      c:["٣","٥","٢","٤"],a:0};
    // كمّي · ١٥:٣٦:٠٥ — أجابت ٥ وهي «٥ أيام» في النصّ
    const q2={d:"quant",q:"يستطيع ٣ عمّال دهن بيت في ١٠ يوماً. كم عاملاً يدهنون نفس البيت في ٥ أيام؟",
      c:["٨","٥","٦","٧"],a:2};
    return{
      one:stemNumberName(q1,5), two:stemNumberName(q2,5),
      right:stemNumberName(q2,6),
      notInStem:stemNumberName(q1,4),
      isAnswer:stemNumberName({d:"quant",q:"كم عدد أضلاع المثلّث ٣؟",c:["٣","٤"],a:0},3),
    };
  });
  ok(!!r.one,'«٥ أوراق» ⇐ ٥ يُسمّى — '+r.one);
  ok(!!r.two,'و«٥ أيام» ⇐ ٥ كذلك — '+r.two);
  ok(!r.right,'ولا يُسمّى الصواب');
  ok(!r.notInStem,'ولا عددٌ ليس في النصّ');
  ok(!r.isAnswer,'ولا حين يكون العدد المعروض هو الصواب');
}

console.log('\n٣) الاسم يدخل السطر فعلاً — بنقرةٍ حقيقية');
{
  const posted=[];
  await p.route('**/rest/v1/**',async r=>{
    if(r.request().method()==='POST'){
      let x={};try{x=JSON.parse(r.request().postData()||'{}')}catch(e){}
      posted.push(x);
    }
    r.fulfill({status:201,contentType:'application/json',body:'[]'});
  });
  // ===== عبر مسار math6 نفسه لا مسار الاختبار =====
  // الحالتان الحيّتان وقعتا في قسم رياضيات ٦، و`choose()` لا تمرّ به إطلاقاً (له
  // عارضه الخاصّ) — فلو فُحصت الآلية عبر `choose` وحدها لَشهد الاختبار بما لا يقع.
  await p.evaluate(()=>{
    math6Items=[{q:"دالةٌ قاعدتها: اضربي المُدخَل في ٤ ثم أضيفي ٨. ما المُخرَج عندما يكون المُدخَل ٥؟",
      c:["٢٨","٥٢","٢٠","١٧"],a:0,w:"٥×٤=٢٠ ثم +٨",
      _l:{id:"m1_6",sk:"قاعدة الدالّة"},_src:"مولَّد"}];
    math6Idx=0;math6Locked=false;math6Picked=-1;math6Score=0;math6Done=false;
    math6ShownAt=Date.now();mode="math6";
    if(typeof gateLeft!=='undefined')gateLeft=0;
    m6Clear();
    math6Choose(3);   // ١٧
  });
  await p.waitForTimeout(400);
  const row=posted.filter(x=>x&&x.domain==='math6').pop();
  ok(!!row,'وصل السجلَّ صفُّ إجابة');
  ok(row&&/mult_as_add/.test(String(row.response||'')),
    'ومعه اسم الآلية لا «فرقٌ» وحده — '+(row&&String(row.response||'').slice(0,120)));
  ok(row&&/فرق/.test(String(row.response||'')),'والفرقُ باقٍ كما كان — الاسم إضافةٌ لا استبدال');
}

console.log('\n٤) قياسٌ لا بوّابة — وحدُّه معلن');
{
  const r=await p.evaluate(()=>({
    // العدّاد يُجمَّع (فيُقاس التوزيع)، ولا دالّةَ بوّابةٍ مُعلَّقة على هذين الاسمين
    recorded:typeof shapeRecord==='function',
    noGate:(typeof window.multAddGated==='undefined')&&(typeof window.stemNumGated==='undefined'),
  }));
  ok(r.recorded,'العدّاد المشترك يُجمّع الاسم');
  ok(r.noGate,'ولا بوّابةَ بُنيت لهما — قياسٌ حتى يثبت التوزيع');
  const miss=await p.evaluate(()=>censusMissing());
  ok(miss.length===0,'ولا دالّة مفقودة — '+miss.join(','));
}

await b.close();
console.log(fails?`\n=== ${fails} فشل ===`:'\n=== كل الاختبارات نجحت ===');
process.exit(fails?1:0);
})();
