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
let genReply="PROMPT: Describe your favourite hobby and why you enjoy it.\nMIN: 20";
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
    if(x.mode==='gen')return r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({ok:true,reply:genReply})});
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
  // دمج الجمل (type:"combine") هدفٌ قصير عمداً (جملة واحدة لا فقرة) — يُستثنى من
  // ترتيب الطول الصاعد في المستويات الثلاثة كلّها (٢٤ أغسطس: بلغ A1/A2 أيضاً، لا
  // B1 وحده)، فهو معيارٌ مختلف (نظافة نحوية) لا امتداد الكتابة الحرّة.
  const free=lv=>writeBankFor(lv).filter(x=>x.type!=="combine").map(x=>x.min);
  const a1=Math.max(...free('A1'));
  const a2=Math.min(...free('A2'));
  const b1=Math.min(...free('B1'));
  return a1<a2&&a2<b1;
});
ok(rising,'وهدف الكلمات يرتفع مع المستوى — A1 < A2 < B1 (بلا دمج الجمل)');

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

console.log('\n٣ب) مثالٌ محلول لكل مستوى — لموضوعٍ آخر غير بنك الأسئلة، لا يُنسخ');
const models=await page.evaluate(()=>({
  a1:writeModelFor('A1'),a2:writeModelFor('A2'),b1:writeModelFor('B1'),
  a1Overlap:writeBankFor('A1').some(x=>x.prompt===writeModelFor('A1').prompt),
  a2Overlap:writeBankFor('A2').some(x=>x.prompt===writeModelFor('A2').prompt),
  b1Overlap:writeBankFor('B1').some(x=>x.prompt===writeModelFor('B1').prompt),
}));
ok(models.a1.text&&models.a2.text&&models.b1.text,'ولكلّ مستوى مثالٌ محلول');
ok(!models.a1Overlap&&!models.a2Overlap&&!models.b1Overlap,'وموضوعه مختلفٌ عن أيّ سؤالٍ في بنك مستواه — لا يصلح جواباً منسوخاً');

console.log('\n٣ج) الزرّ اختياريّ: مخفيٌّ افتراضياً، يظهر بالضغط، ويُسجَّل عدد مشاهداته لا يُمنع');
let t3=await page.textContent('#app');
ok(!t3.includes('مثال محلول'),'المثال مخفيٌّ حتى تطلبه');
await page.click('button[onclick="writeToggleModel()"]');
t3=await page.textContent('#app');
const cur=await page.evaluate(()=>writeCur());
ok(t3.includes('مثال محلول')&&t3.includes(cur.lv==='A1'?"grandmother's house":cur.lv==='A2'?'Mr Ahmed':'bus was late again'),'يظهر مثال مستواها بعد الضغط');
ok(await page.evaluate(()=>writeModelViews)===1,'وعدّاد المشاهدات ١');
await page.click('button[onclick="writeToggleModel()"]');
t3=await page.textContent('#app');
ok(!t3.includes('مثال محلول'),'ويُخفى بالضغط ثانية');
ok(await page.evaluate(()=>writeModelViews)===1,'دون أن يُنقَص العدّاد — القياس تراكميّ');
logs=[];
await page.fill('#writeIn','I like cats. They are very nice pets to have at home every day.');
await page.click('button[onclick="writeSubmit()"]');
await page.waitForTimeout(300);
const rowM=logs.find(l=>l.domain==='write'&&l.qtype!=='fix');
ok(!!rowM&&rowM.q_text.includes('مثال:1'),'وعدد مشاهداته يدخل السجلّ مع كل محاولة — لنقارن لاحقاً من فتحه بمن لم يفتحه');
await page.evaluate(()=>writeNext());
ok(await page.evaluate(()=>writeModelViews)===0,'ويُصفَّر عند الانتقال للسؤال التالي — لا يتراكم عبر الأسئلة');

console.log('\n٤) الإرسال يُقاس بعدد الكلمات لا بجوابٍ واحد صحيح');
logs=[];calls=[];
await page.close();page=await mk();
await page.evaluate(()=>{startWrite();writeItems[0]={id:'wr_test',lv:'A2',min:25,prompt:'test prompt'};writeIdx=0;render()});
await page.fill('#writeIn','Too short.');
await page.click('button[onclick="writeSubmit()"]');
await page.waitForTimeout(300);
let short=await page.evaluate(()=>({count:writeCount,submitted:writeSubmitted,score:writeScore}));
ok(short.submitted&&short.count===2&&short.score===0,`نصٌّ قصير: ${short.count} كلمة، لم يبلغ الهدف`);
let t=await page.textContent('#app');
ok(t.includes('عدد الكلمات أقلّ من الهدف'),'ويُقال ذلك صراحةً');

console.log('\n٥) الفراغ لا يُحرَق محاولة');
await page.close();page=await mk();
await page.evaluate(()=>startWrite());
await page.click('button[onclick="writeSubmit()"]');
await page.waitForTimeout(150);
ok(await page.evaluate(()=>writeSubmitted)===false,'لا شيء يُسجَّل على حقلٍ فارغ');

console.log('\n٦) التصحيح يمرّ على مسار المراجعة نفسه (review)، ويُرقَّم الجمل');
logs=[];calls=[];
await page.close();page=await mk();
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
ok(row.q_text.includes('review:fixes:1'),'وحال المراجعة صريح في السجلّ (وُجد تصحيح واحد) — لا مجرّد lt:٠/٠ غامض');

console.log('\n٨ب) «سليمة نحوياً» و«تعذّرت المراجعة» كانتا تُسجَّلان بالشكل نفسه — صار كلٌّ منهما صريحاً الآن');
review={ok:true,reply:"NONE"};
logs=[];calls=[];
page=await mk();
await page.evaluate(()=>{startWrite();writeItems[0]={id:'wr_clean',lv:'A1',min:3,prompt:'test clean'};writeIdx=0;render()});
await page.fill('#writeIn','I like cats a lot.');
await page.click('button[onclick="writeSubmit()"]');
await page.waitForTimeout(400);
const cleanRow=logs.find(l=>l.domain==='write'&&l.qtype!=='fix');
ok(cleanRow&&cleanRow.q_text.includes('review:none'),`النصّ السليم فعلاً يُسجَّل «review:none» صراحةً لا «lt:٠/٠» وحده (${cleanRow&&cleanRow.q_text})`);

console.log('\n٩) تعذّر المراجعة لا يمنع تسجيل عدد الكلمات ولا يوقف الجلسة');
reviewFail=true;
logs=[];calls=[];
await page.close();page=await mk();
await page.evaluate(()=>{startWrite();writeItems[0]={id:'wr_test3',lv:'A1',min:3,prompt:'test'};writeIdx=0;render()});
await page.fill('#writeIn','I like cats a lot.');
await page.click('button[onclick="writeSubmit()"]');
await page.waitForTimeout(400);
t=await page.textContent('#app');
ok(t.includes('تعذّرت مراجعة القواعد'),'يُقال بصراحة');
// «بلغتِ عدد الكلمات» صارت «بلغتِ الهدف» بعد أن صار الهدف مركّباً (كلماتٌ+نقاط) —
// ٢٤ أغسطس. النصّ تغيّر لا المعنى: تعذّرُ المراجعة لا يمنع الحكم على الطول.
ok(t.includes('بلغتِ الهدف'),'ودرجة الهدف سليمة رغم ذلك');
ok(await page.evaluate(()=>writeScore)===1,'واحتُسبت في النتيجة');
const failRow=logs.find(l=>l.domain==='write'&&l.qtype!=='fix');
ok(failRow&&failRow.q_text.includes('review:fail:network'),`والفشل نفسه صريحٌ في السجلّ الآن — لا يبدو كسلامةٍ نحوية (${failRow&&failRow.q_text})`);
reviewFail=false;

console.log('\n١٠) جلسة كاملة، ثم النتيجة');
review={ok:true,reply:"NONE"};
await page.close();page=await mk();
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

console.log('\n١٠ب) دمج الجمل (type:"combine") — النجاح نظافة نحوية لا طولٌ فقط');
// كانت محجوزةً لـB1 وحده، فبلغت A1/A2 كذلك (٢٤ أغسطس: صفر محاولة كتابة لإلياس،
// وهيا توقّفت بعد يومٍ واحد — «الجملة قبل الفقرة» أثرها ٠٫٥٠ في Writing Next
// ولا داعي لحجبه عن المبتدئَين تحديداً حيث الحاجة إليه أشدّ).
const combineShape=await page.evaluate(()=>{
  const c=WRITE_BANK.filter(x=>x.type==='combine');
  return{wellFormed:c.every(x=>x.prompt.includes('1)')&&x.prompt.includes('2)')),
    levels:Array.from(new Set(c.map(x=>x.lv)))};
});
ok(combineShape.wellFormed,'كل عناصر الدمج فيها جملتان مرقّمتان للدمج');
ok(['A1','A2','B1'].every(lv=>combineShape.levels.indexOf(lv)>=0),'وبلغت المستويات الثلاثة — كانت B1 وحدها');
const combineCount=await page.evaluate(()=>WRITE_BANK.filter(x=>x.type==='combine').length);
ok(combineCount>=5,`وعددٌ كافٍ منها (${combineCount})`);

// نُعيد استعمال نفس الصفحة المفتوحة (كبقية الاختبارات هنا) بدل فتح صفحةٍ جديدة
// لكل حالة — startWrite() يُصفّر الحالة كاملة، فلا حاجة لصفحةٍ منفصلة
review={ok:true,reply:"NONE"};
await page.evaluate(()=>{startWrite();writeItems[0]={id:'wr_c1',lv:'B1',min:8,type:'combine',prompt:'combine test'};writeIdx=0;render()});
await page.fill('#writeIn','Because it started raining, we went home early.');
await page.click('button[onclick="writeSubmit()"]');
await page.waitForTimeout(400);
let tc=await page.textContent('#app');
ok(tc.includes('جملة مدمَجة سليمة'),'طولٌ كافٍ + لا تصحيح ⇒ سليمة');
ok(await page.evaluate(()=>writeScore)===1,'واحتُسبت نجاحاً');

review={ok:true,ltJudged:1,ltDropped:0,reply:"FIX: It started raining we went home early | Because it started raining, we went home early. | جملة مركبة بلا أداة ربط"};
await page.evaluate(()=>{startWrite();writeItems[0]={id:'wr_c2',lv:'B1',min:8,type:'combine',prompt:'combine test'};writeIdx=0;render()});
await page.fill('#writeIn','It started raining hard and we went home early.');
await page.click('button[onclick="writeSubmit()"]');
await page.waitForTimeout(400);
tc=await page.textContent('#app');
ok(tc.includes('الجملة تحتاج تصحيحاً'),'طولٌ كافٍ لكن تصحيحٌ ⇒ غير سليمة رغم الطول');
ok(await page.evaluate(()=>writeScore)===0,'ولم تُحتسب نجاحاً — الفارق عن الكتابة الحرّة العادية');

await page.evaluate(()=>{startWrite();writeItems[0]={id:'wr_c3',lv:'B1',min:8,type:'combine',prompt:'combine test'};writeIdx=0;render()});
await page.fill('#writeIn','It rained.');
await page.click('button[onclick="writeSubmit()"]');
await page.waitForTimeout(400);
ok(await page.evaluate(()=>writeScore)===0,'قصيرة جداً ⇒ لا تُحتسب حتى لو مرّت المراجعة');

reviewFail=true;
await page.evaluate(()=>{startWrite();writeItems[0]={id:'wr_c4',lv:'B1',min:8,type:'combine',prompt:'combine test'};writeIdx=0;render()});
await page.fill('#writeIn','Because it started raining, we went home early.');
await page.click('button[onclick="writeSubmit()"]');
await page.waitForTimeout(400);
ok(await page.evaluate(()=>writeScore)===1,'تعذّر فحص القواعد + طولٌ كافٍ ⇒ لا تُعاقَب على عطلٍ ليس منها');
reviewFail=false;

console.log('\n١١) يظهر على الصفحات الثلاث — كلٌّ بمستواه');
await page.close();
const m=await mk('mohammed.html');
const mLv=await m.evaluate(()=>({level:profileOf().level,btn:document.body.innerText.indexOf('الكتابة')>=0}));
ok(mLv.level==='B1'&&mLv.btn,`محمد B1 والزرّ ظاهر (${mLv.level})`);
await m.evaluate(()=>startWrite());
const mBank=await m.evaluate(()=>writeItems.every(x=>x.lv==='B1'));
ok(mBank,'وجلسته من بنك B1 وحده');
await m.close();

const e=await mk('elias.html');
const eLv=await e.evaluate(()=>({level:profileOf().level,btn:document.body.innerText.indexOf('الكتابة')>=0}));
ok(eLv.level==='A2'&&eLv.btn,`إلياس A2 والزرّ ظاهر (${eLv.level})`);
await e.close();

const h=await mk('index.html');
const hBtn=await h.evaluate(()=>document.body.innerText.indexOf('الكتابة')>=0);
ok(hBtn,'وهيا كذلك — الثلاثة سواءً');
await h.close();

console.log('\n١٢) التباعد: FSRS، لا سلّمٌ جديد');
page=await mk();
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

console.log('\n١٣ب) نقصٌ لا خواءٌ تامّ — عنصرٌ مستحقٌّ واحد لا يُنتج جلسةً من سؤالٍ واحد (طلب صاحب المشروع، ١٨ أغسطس)');
const partial=await page.evaluate(()=>{
  const POOL=writeBankFor('A1');
  const st={};
  POOL.forEach((i,idx)=>{st[i.id]={box:idx===0?0:2,due:idx===0?srsToday():srsToday()+30,seen:idx===0?0:3}});
  lsSet(WRITE_SRS_KEY,JSON.stringify(st));
  return {plan:buildWritePlan(),want:Math.min(WRITE_N,POOL.length)};
});
ok(partial.plan.length===partial.want,`عنصرٌ واحد مستحقّ ⇐ جلسةٌ كاملة (${partial.plan.length} من ${partial.want})`);
await page.evaluate(()=>{try{lsDel('mawhiba_write_srs')}catch(e){}});

console.log('\n١٣ج) نسخ نصّ السؤال يُكتشَف — بيانات حيّة (١٧ أغسطس): أوّل ٣ محاولات كتابة');
// عدد الكلمات وحده لا يكشف النسخ — أُبلغ الهدف في إحدى الثلاث رغم كونها نسخاً بحتاً
const copy=await page.evaluate(()=>({
  c1:writeIsCopy("Write about your family","Write about your family.\n1) How many brothers or sisters do you have?\n2) What is one thing you like doing together?"),
  c2:writeIsCopy("Write about your school day. What time do you go to school?","Write about your school day.\n1) What time do you go to school?\n2) What is your favourite subject?"),
  c3:writeIsCopy("Write about your best friend.  What is their name?","Write about your best friend.\n1) What is their name?\n2) What do you both like doing?"),
  real1:writeIsCopy("I have two brothers and one sister. We like playing football together.","Write about your family.\n1) How many brothers or sisters do you have?\n2) What is one thing you like doing together?"),
}));
ok(copy.c1&&copy.c2&&copy.c3,'الثلاث محاولات الحقيقية المنسوخة تُكتشَف رغم اختلاف علامات الترقيم التوجيهية (1)/(2))');
ok(!copy.real1,'وإجابة حقيقية بنفس الموضوع لا تُتَّهم زوراً');
logs=[];calls=[];
page=await mk();
await page.evaluate(()=>{startWrite();writeItems[0]={id:'wr_copy',lv:'A1',min:10,
  prompt:"Write about your school day.\n1) What time do you go to school?\n2) What is your favourite subject?"};writeIdx=0;render()});
await page.fill('#writeIn','Write about your school day. What time do you go to school?');
await page.click('button[onclick="writeSubmit()"]');
await page.waitForTimeout(300);
const cst=await page.evaluate(()=>({writeCopy,writeScore,writeSubmitted}));
ok(cst.writeCopy===true,'النسخ يُكتشَف في المسار الحقيقي (writeSubmit) لا الدالة المعزولة وحدها');
ok(cst.writeScore===0,'ولا يُحتسب في الهدف رغم أن عدد كلماته يبلغه (١٢ كلمة، الهدف ١٠)');
ok(calls.filter(c=>c.mode==='review').length===0,'ولا طلب مراجعة نحوية — نصٌّ منسوخ سليمٌ نحوياً حتماً، فلا فائدة من الشبكة');
let ct=await page.textContent('#app');
ok(ct.includes('نسخٌ من نصّ السؤال'),'ويُقال لها ذلك صراحةً بدل «أحسنتِ» زائفة');
const crow=logs.find(l=>l.domain==='write'&&l.qtype!=='fix');
ok(crow&&crow.q_text.includes('نسخ:1'),'ويُسجَّل — فيُقاس تكرار النسخ لاحقاً لا يُخمَّن');
ok(crow&&crow.q_text.includes('review:skip:copy'),'وحال المراجعة "skip:copy" صراحةً — لا "none" الذي يوهم بمراجعةٍ جرت فعلاً');

console.log('\n١٣ج) التوليد الآلي (١٧ أغسطس): عنصرٌ مولَّدٌ من tutor يدخل البنك بعد رقابة العميل البعدية');
page=await mk();
const genParse=await page.evaluate(()=>({
  ok:parseGenWriteBlock("PROMPT: Describe your favourite hobby and why you enjoy it.\nMIN: 20"),
  badMin:parseGenWriteBlock("PROMPT: Hi.\nMIN: 2"),
  badAr:parseGenWriteBlock("PROMPT: صف يومك المدرسي.\nMIN: 20"),
  missing:parseGenWriteBlock("just some text"),
}));
ok(!!genParse.ok&&genParse.ok.min===20&&/hobby/.test(genParse.ok.prompt)&&genParse.ok.ai===true,'نصٌّ سليمٌ يُقبل ومعه علامة ai:true');
ok(genParse.badMin===null,'وحدٌّ أدنى ضعيف (٢ كلمة) يُرفض');
ok(genParse.badAr===null,'وتلوّثٌ عربي يُرفض رغم شكلٍ سليم ظاهرياً');
ok(genParse.missing===null,'ونصٌّ بلا وسم PROMT/MIN يُرفض');
await page.evaluate(()=>{try{lsDel(GEN_BANK_KEY_WRITE)}catch(e){}});
calls=[];
// التوقّع يُحسب من حجم البنك الفعلي قبل التوليد لا من صفر — البنك المؤلَّف ليس فارغاً
const wantWrite=await page.evaluate(()=>genCallsFor(writeBankFor('A1').length,WRITE_N));
await page.evaluate(level=>writeGenTopUp(level),'A1');
await page.waitForTimeout(300);
const genCall=calls.find(c=>c.mode==='gen'&&c.domain==='write');
ok(!!genCall&&genCall.level==='A1','writeGenTopUp يطلب توليداً بمستواها');
const aiBank=await page.evaluate(()=>genBankLoad(GEN_BANK_KEY_WRITE));
// العدد مُشتقٌّ من genCallsFor لا مثبَّت — الدفعة صارت متعدّدة (درس «الأعداد المكتوبة فخّ صامت»)
ok(aiBank.length===wantWrite&&aiBank.every(x=>x.lv==='A1'&&x.ai===true),
  `والعناصر المقبولة تدخل بنك التوليد المحلّي (${aiBank.length} من ${wantWrite})`);
const mergedBank=await page.evaluate(()=>writeBankFor('A1'));
ok(mergedBank.some(x=>x.ai===true),'ويظهر ضمن writeBankFor مع البنك المؤلَّف — لا بديلاً عنه');
ok(mergedBank.some(x=>!x.ai),'والبنك المؤلَّف الأصلي يبقى حاضراً كذلك');

console.log('\n١٣د) العنصر المولَّد يُسجَّل موسوماً «[مولَّد]» — لا يختلط بالمؤلَّف عند التشخيص');
logs=[];
await page.evaluate(()=>{startWrite();writeItems[0]=genBankLoad(GEN_BANK_KEY_WRITE)[0];writeIdx=0;render()});
await page.fill('#writeIn','This is a real answer with more than twenty words written to reach the minimum target for this generated writing prompt about hobbies today.');
await page.click('button[onclick="writeSubmit()"]');
await page.waitForTimeout(300);
const aiRow=logs.find(l=>l.domain==='write'&&l.qtype!=='fix');
ok(aiRow&&aiRow.q_text.startsWith('[مولَّد]'),`والسجلّ يُصرِّح بأنه مولَّد (${aiRow&&aiRow.q_text.slice(0,20)})`);

console.log('\n١٤) لا انحدار');
for(const [pg,fn,md] of [['index.html',"startWrite()",'write'],['index.html',"startRead()",'read'],
  ['index.html',"home()",'home'],['mohammed.html',"startWrite()",'write'],['elias.html',"startWrite()",'write']]){
  const pp=await mk(pg);
  const r2=await pp.evaluate(x=>{try{eval(x);return{m:mode}}catch(err){return{err:err.message}}},fn);
  ok(!r2.err&&r2.m===md,`${pg} ${fn} → ${r2.err||r2.m}`);
  ok((await pp.evaluate(()=>censusMissing())).length===0,`${pg}: كل الدوال معرَّفة`);
  ok((await pp.evaluate(()=>window.__ERRS.length))===0,`${pg}: لا خطأ`);
  await pp.close();
}

console.log('\n'+(fails?`=== ${fails} فشل ===`:'=== كل الاختبارات نجحت ==='));
await b.close();process.exit(fails?1:0);
})();
