// الكتابة: إنتاجٌ حرّ لا اختيارٌ من متعدد — طلب صاحب المشروع إضافتها للثلاثة.
// بنك الكلمات (wb*) يقيس ترتيب كلماتٍ جاهزة، لا تأليف نصٍّ من الصفر — وهذا القسم
// يسدّ تلك الفجوة تحديداً. الصيغة معياريّة (Cambridge Movers/Flyers، A2 Key Part 6،
// B1 Preliminary Part 2)، والتصحيح موصولٌ بمسار مراجعة المحادثة نفسه (mode:"review"
// في tutor، محكوماً بـLanguageTool)، وتصحيحاته تدخل بطاقات «أخطائي» (fixCardSave)
// كتصحيحات المحادثة سواءً — لا مسار تصحيح ثانٍ.
const {chromium}=require('/opt/node22/lib/node_modules/playwright');
let fails=0;const ok=(c,m)=>{console.log((c?'  ✓ ':'  ✗ FAIL ')+m);if(!c)fails++};
(async()=>{
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'});
let logs=[],calls=[];
let review={ok:true,ltJudged:1,ltDropped:0,reply:"FIX: I go school every day | I go to school every day. | تحتاج حرف جرّ to قبل school"};
let reviewFail=false;
const mk=async(f)=>{
  const page=await b.newPage({viewport:{width:420,height:900}});
  page.on('pageerror',e=>{console.log('  ✗ PAGEERROR '+e.message);fails++});
  await page.route('**/rest/v1/**',async r=>{
    let x={};try{x=JSON.parse(r.request().postData()||'{}')}catch(e){}
    logs.push(x);r.fulfill({status:201,contentType:'application/json',body:'[]'});
  });
  await page.route('**/functions/v1/tutor',async r=>{
    let x={};try{x=JSON.parse(r.request().postData()||'{}')}catch(e){}
    calls.push(x);
    if(reviewFail)return r.abort();
    r.fulfill({status:200,contentType:'application/json',body:JSON.stringify(review)});
  });
  await page.goto('http://127.0.0.1:8931/'+(f||'index.html'));
  await page.waitForFunction(()=>typeof startWrite==='function');
  return page;
};

console.log('\n١) كل متعلّم يرى بنك مستواه هو، وكل عنصر بشكل سليم');
let page=await mk();
const banks=await page.evaluate(()=>({
  a1:writeBankFor('A1').every(x=>x.lv==='A1'),
  a2:writeBankFor('A2').every(x=>x.lv==='A2'),
  b1:writeBankFor('B1').every(x=>x.lv==='B1'),
  n:{a1:writeBankFor('A1').length,a2:writeBankFor('A2').length,b1:writeBankFor('B1').length},
}));
ok(banks.a1&&banks.a2&&banks.b1,'لا اختلاط بين المستويات');
ok(banks.n.a1>=5&&banks.n.a2>=5&&banks.n.b1>=5,`ولكلٍّ بنكٌ كافٍ (${JSON.stringify(banks.n)})`);
const shape=await page.evaluate(()=>WRITE_BANK.every(x=>x.prompt&&x.min>0));
ok(shape,'وكل عنصر بشكل سليم (سؤالٌ وهدف كلماتٍ)');
const rising=await page.evaluate(()=>{
  const a1=Math.max(...writeBankFor('A1').map(x=>x.min));
  const a2=Math.min(...writeBankFor('A2').map(x=>x.min));
  const b1=Math.min(...writeBankFor('B1').map(x=>x.min));
  return a1<a2&&a2<b1;
});
ok(rising,'وهدف الكلمات يرتفع مع المستوى — A1 < A2 < B1');

console.log('\n٢) عدّاد الكلمات وتقسيم الجمل يعملان بشكل صحيح');
const wc=await page.evaluate(()=>({
  a:writeWordCount("I have two brothers."),
  b:writeWordCount("   "),
  c:writeWordCount("I don't know, but it's fine."),
  s:writeSentences("I went to the park. It was fun! Did you go?"),
}));
ok(wc.a===4,`أربع كلمات (${wc.a})`);
ok(wc.b===0,'حقلٌ فارغ = صفر');
ok(wc.c===6,`الاختصارات تُحتسب كلمةً واحدة (${wc.c})`);
ok(wc.s.length===3,`ثلاث جمل (${wc.s.length})`);
ok(wc.s[0]==='I went to the park.','والأولى كاملة بعلامتها');

console.log('\n٣) جلسةٌ قصيرة عمداً — أثقل من اختيار إجابة');
await page.evaluate(()=>startWrite());
const n=await page.evaluate(()=>writeItems.length);
ok(n>0&&n<=3,`٣ عناصر على الأكثر (${n})`);

console.log('\n٤) الإرسال يُقاس بعدد الكلمات لا بجوابٍ واحد صحيح');
logs=[];calls=[];
page=await mk();
await page.evaluate(()=>{startWrite();writeItems[0]={id:'wr_test',lv:'A2',min:25,prompt:'test prompt'};writeIdx=0;render()});
await page.fill('#writeIn','Too short.');
await page.click('button[onclick="writeSubmit()"]');
await page.waitForTimeout(300);
let short=await page.evaluate(()=>({count:writeCount,submitted:writeSubmitted,score:writeScore}));
ok(short.submitted&&short.count===2&&short.score===0,`نصٌّ قصير: ${short.count} كلمة، لم يبلغ الهدف`);
let t=await page.textContent('#app');
ok(t.includes('عدد الكلمات أقلّ من الهدف'),'ويُقال ذلك صراحةً');

console.log('\n٥) الفراغ لا يُحرَق محاولة');
page=await mk();
await page.evaluate(()=>startWrite());
await page.click('button[onclick="writeSubmit()"]');
await page.waitForTimeout(150);
ok(await page.evaluate(()=>writeSubmitted)===false,'لا شيء يُسجَّل على حقلٍ فارغ');

console.log('\n٦) التصحيح يمرّ على مسار المراجعة نفسه (review)، ويُرقَّم الجمل');
logs=[];calls=[];
page=await mk();
await page.evaluate(()=>{startWrite();writeItems[0]={id:'wr_test2',lv:'A2',min:5,prompt:'test prompt'};writeIdx=0;render()});
await page.fill('#writeIn','I go school every day. I like it a lot.');
await page.click('button[onclick="writeSubmit()"]');
await page.waitForTimeout(400);
const rv=calls.filter(c=>c.mode==='review')[0]||{};
ok(!!rv.mode,'طُلبت المراجعة');
ok(rv.studentAnswer&&rv.studentAnswer.startsWith('1. I go school every day.'),'وجمله مُرقّمة كنظيرتها في المحادثة');
ok(rv.learner&&rv.learner.age===11,'ومعها عمره ومستواه');
t=await page.textContent('#app');
ok(t.includes('I go school every day.')&&t.includes('I go to school every day.'),'ما قالته والصحيح يُعرضان');
ok(t.includes('تحتاج حرف جرّ'),'والسبب بالعربية');

console.log('\n٧) وتصحيحه يدخل بطاقات «أخطائي» — نفس مسار المحادثة، لا بطاقة جديدة');
// fixCardSave تُجدوِل بـfsrsUpdate(...,false,...) كنظيرتها في المحادثة: أوّل خطأ
// يستحقّ غداً لا اليوم (حدّ FSRS الأدنى يومٌ واحد) — فالفحص على fixCardLoad نفسها
// لا على errCollect المفلترة بتاريخ الاستحقاق
const fc=await page.evaluate(()=>Object.values(fixCardLoad()).filter(x=>x.said&&x.said.includes('I go school every day')));
ok(fc.length===1,'البطاقة دخلت مخزن بطاقات التصحيح بـfixCardSave نفسها');
ok(fc[0]&&fc[0].fix==='I go to school every day.','ومعها الصواب');
const fx=logs.filter(l=>l.qtype==='fix'&&l.domain==='write');
ok(fx.length===1&&fx[0].response.includes('⇐'),'وسطرٌ منفصل للتصحيح في السجلّ');

console.log('\n٨) q_text وresponse كاملان — بلا هذين لا تشخيص');
const row=logs.find(l=>l.domain==='write'&&l.qtype!=='fix');
ok(!!row,'سطرٌ وصل الخادم');
ok(row.response==='I go school every day. I like it a lot.','النصّ الكامل مسجَّل');
ok(row.q_text&&row.q_text.includes('test prompt')&&row.q_text.includes('كتبت'),'والسؤال وعدد الكلمات معه');

console.log('\n٩) تعذّر المراجعة لا يمنع تسجيل عدد الكلمات ولا يوقف الجلسة');
reviewFail=true;
page=await mk();
await page.evaluate(()=>{startWrite();writeItems[0]={id:'wr_test3',lv:'A1',min:3,prompt:'test'};writeIdx=0;render()});
await page.fill('#writeIn','I like cats a lot.');
await page.click('button[onclick="writeSubmit()"]');
await page.waitForTimeout(400);
t=await page.textContent('#app');
ok(t.includes('تعذّرت مراجعة القواعد'),'يُقال بصراحة');
ok(t.includes('بلغتِ عدد الكلمات'),'ودرجة عدد الكلمات سليمة رغم ذلك');
ok(await page.evaluate(()=>writeScore)===1,'واحتُسبت في النتيجة');
reviewFail=false;

console.log('\n١٠) جلسة كاملة، ثم النتيجة');
review={ok:true,reply:"NONE"};
page=await mk();
await page.evaluate(()=>startWrite());
async function step(){
  const has=await page.evaluate(()=>!!writeCur());
  if(!has)return;
  await page.fill('#writeIn','This is a full sentence that should be long enough to pass the word count target for the level being tested right now in this session.');
  await page.click('button[onclick="writeSubmit()"]');
  await page.waitForTimeout(200);
  await page.click('button.btn');
}
while(!(await page.evaluate(()=>writeDone)))await step();
t=await page.textContent('#app');
ok(/جلسة أخرى/.test(t),'وتُعرض شاشة النتيجة');

console.log('\n١١) يظهر على الصفحات الثلاث — كلٌّ بمستواه');
const m=await mk('mohammed.html');
const mLv=await m.evaluate(()=>({level:profileOf().level,btn:document.body.innerText.indexOf('الكتابة')>=0}));
ok(mLv.level==='B1'&&mLv.btn,`محمد B1 والزرّ ظاهر (${mLv.level})`);
await m.evaluate(()=>startWrite());
const mBank=await m.evaluate(()=>writeItems.every(x=>x.lv==='B1'));
ok(mBank,'وجلسته من بنك B1 وحده');

const e=await mk('elias.html');
const eLv=await e.evaluate(()=>({level:profileOf().level,btn:document.body.innerText.indexOf('الكتابة')>=0}));
ok(eLv.level==='A2'&&eLv.btn,`إلياس A2 والزرّ ظاهر (${eLv.level})`);

const h=await mk('index.html');
const hBtn=await h.evaluate(()=>document.body.innerText.indexOf('الكتابة')>=0);
ok(hBtn,'وهيا كذلك — الثلاثة سواءً');

console.log('\n١٢) التباعد: FSRS، لا سلّمٌ جديد');
const srs=await page.evaluate(()=>{
  const id='wr_a1_1';
  writeSrsUpdate(id,true);
  const st=JSON.parse(lsGet('mawhiba_write_srs')||'{}');
  return {hasDue:!!st[id]&&st[id].due>srsToday(),hasS:typeof st[id].s==='number'};
});
ok(srs.hasDue&&srs.hasS,'يُجدوَل بـfsrsUpdate نفسها — لا خوارزمية جديدة');

console.log('\n١٣) بنكٌ مستنفَد كلّه — مراجعة حرّة لا شاشة فارغة');
const out=await page.evaluate(()=>{
  const POOL=writeBankFor('A1');
  const st={};
  POOL.forEach(i=>{st[i.id]={box:2,due:srsToday()+30,seen:3}});
  lsSet(WRITE_SRS_KEY,JSON.stringify(st));
  return buildWritePlan();
});
ok(out.length>0,`buildWritePlan لا تعود فارغة (${out.length} عنصراً)`);
await page.evaluate(()=>{try{lsDel('mawhiba_write_srs')}catch(e){}});

console.log('\n١٤) لا انحدار');
for(const [pg,fn,md] of [['index.html',"startWrite()",'write'],['index.html',"startRead()",'read'],
  ['index.html',"home()",'home'],['mohammed.html',"startWrite()",'write'],['elias.html',"startWrite()",'write']]){
  const pp=await mk(pg);
  const r2=await pp.evaluate(x=>{try{eval(x);return{m:mode}}catch(err){return{err:err.message}}},fn);
  ok(!r2.err&&r2.m===md,`${pg} ${fn} → ${r2.err||r2.m}`);
  ok((await pp.evaluate(()=>censusMissing())).length===0,`${pg}: كل الدوال معرَّفة`);
  ok((await pp.evaluate(()=>window.__ERRS.length))===0,`${pg}: لا خطأ`);
}

console.log('\n'+(fails?`=== ${fails} فشل ===`:'=== كل الاختبارات نجحت ==='));
await b.close();process.exit(fails?1:0);
})();
