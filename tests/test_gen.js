// المحرّك يولّد بنكَي الاستماع/القراءة — لا اليد وحدها (طلب ١٦ أغسطس، بعد أن كشفت
// بيانات محمد أن بنك B1 الخماسي يتكرّر بأزمنة إجابة ٢-٩ ثوانٍ: حفظ موضع لا فهمٌ متكرّر).
// نفس نمط fetchGemini للفظي/العلمي: بنكٌ مؤلَّف قاعٌ فوري، والتوليد يُخصّب الجلسة القادمة
// في الخلفية بلا شاشة انتظار، حتى سقفٍ (GEN_BANK_MAX) ثم يتوقّف. ووضع "gen" في دالّة
// tutor نفسها — لا دالّة ثانية.
// بوّابة التسرّع (٢٢ أغسطس) تمنع النقر قبل زمنٍ أدنى، وهذه الاختبارات تنقر فوراً.
// فتُنهي العدّ أوّلاً — كما ينتظر المتعلّم — ثم تختار: gateLeft=0;gateStop().
// وهذا لا يُعطّل البوّابة ولا يُخفي انحدارها؛ فحصها نفسه في tests/test_rapidgate.js.
const {chromium}=require('/opt/node22/lib/node_modules/playwright');
let fails=0;const ok=(c,m)=>{console.log((c?'  ✓ ':'  ✗ FAIL ')+m);if(!c)fails++};
(async()=>{
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'});
let logs=[],tutorCalls=[],tutorReply=null;
const mk=async()=>{
  const page=await b.newPage({viewport:{width:420,height:900}});
  page.on('pageerror',e=>{console.log('  ✗ PAGEERROR '+e.message);fails++});
  await page.route('**/rest/v1/**',async r=>{
    let x={};try{x=JSON.parse(r.request().postData()||'{}')}catch(e){}
    logs.push(x);r.fulfill({status:201,contentType:'application/json',body:'[]'});
  });
  await page.route('**/functions/v1/tutor',async r=>{
    let x={};try{x=JSON.parse(r.request().postData()||'{}')}catch(e){}
    tutorCalls.push(x);
    if(tutorReply===null){r.fulfill({status:500,contentType:'application/json',body:'{}'});return}
    // ٢٦ أغسطس: صار للبنك رفضُ توأمٍ عند التخزين، فردٌّ ثابتٌ لكل النداءات يعني
    // عناصر متطابقة — وهي في الواقع خطأُ مولّدٍ يُرفَض بحقّ. فيتغيّر الردّ لكل نداء
    // كما يتغيّر فعلاً، ويبقى اختبار «التوأم يُرفَض» في test_fixes_0826 على حدة.
    const rep=typeof tutorReply==='function'?tutorReply(tutorCalls.length):tutorReply;
    r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({ok:true,reply:rep})});
  });
  await page.goto('http://127.0.0.1:8931/index.html');
  await page.waitForFunction(()=>typeof parseGenBlock==='function');
  return page;
};

console.log('\n١) parseGenBlock: صيغة سليمة تُفكَّك بكل حقولها');
let page=await mk();
const GOOD_LISTEN=[
  'TEXT: My cousin lives in Riyadh with her family.',
  'Q: Where does her cousin live?',
  'A: Jeddah',
  'B: Riyadh',
  'C: Dammam',
  'CORRECT: B',
].join('\n');
let item=await page.evaluate(t=>parseGenBlock(t,'listen'),GOOD_LISTEN);
ok(!!item,'لم تعد null');
ok(item.audio==='My cousin lives in Riyadh with her family.','النصّ في audio للاستماع');
ok(item.q==='Where does her cousin live?','والسؤال');
ok(JSON.stringify(item.c)===JSON.stringify(['Jeddah','Riyadh','Dammam']),'والخيارات الثلاثة بترتيبها');
ok(item.a===1,'وموضع الصواب B ⇐ فهرس ١');
ok(item.ai===true,'ووُسم أنه مولَّد');
ok(typeof item.id==='string'&&item.id.indexOf('ai_listen_')===0,'ومعرّفٌ يبدأ بـai_listen_');

console.log('\n٢) وللقراءة: passage لا audio');
const readItem=await page.evaluate(t=>parseGenBlock(t,'read'),GOOD_LISTEN.replace('TEXT:','TEXT:'));
ok(!!readItem.passage&&!readItem.audio,'passage لا audio في وضع القراءة');

console.log('\n٣) TEXT يمتدّ سطرين — لا يُفقَد شيء');
const MULTI=[
  'TEXT: Last summer my family and I went camping in the desert.',
  'We stayed there for three days and watched the stars every night.',
  'Q: How many days did they sleep in the desert?',
  'A: Two days','B: Three days','C: A week','CORRECT: B',
].join('\n');
const mItem=await page.evaluate(t=>parseGenBlock(t,'read'),MULTI);
ok(!!mItem&&mItem.passage.includes('camping')&&mItem.passage.includes('three days'),
  `النصّان اندمجا في فقرة واحدة (${mItem&&mItem.passage})`);

console.log('\n٣ب) تلوّثٌ عربي في TEXT يُرفَض — شكوى إلياس الحقيقية (١٦ أغسطس): «يسمع عربي وإنجليزي»');
// النموذج أحياناً يُسقط وسم Q: فيبتلع سطراً شارداً ضمن استمرار TEXT — وTEXT تُتلى بصوتٍ
// إنجليزي (listenPlay⇐speakEnglish)، فيُسمع عربي وإنجليزي معاً كما اشتكى فعلاً. والعربي هنا
// أثرٌ تاريخي من حين كانت Q عربية — الحارس نفسه يصلح لأيّ سطرٍ غير إنجليزي شارد، أياً كان.
const LEAK_CONTINUATION=[
  'TEXT: My brother has a new bicycle.',
  'ما لون الدرّاجة؟',   // سطر عربي شارد بلا وسم Q: — يُفترض أن يُرفض لا أن يُدمج في النصّ
  'Q: What colour is the bicycle?',
  'A: Red','B: Blue','C: Green','CORRECT: B',
].join('\n');
const leakItem=await page.evaluate(t=>parseGenBlock(t,'listen'),LEAK_CONTINUATION);
ok(!!leakItem,'العنصر يُقبل رغم السطر الشارد — لم يُفسد التحليل كلّه');
ok(leakItem&&!/[؀-ۿ]/.test(leakItem.audio),`ولم يتسرّب العربي إلى audio (${leakItem&&leakItem.audio})`);

const LEAK_SAMELINE=[
  'TEXT: My brother has a new bicycle. ما لون الدرّاجة؟',   // عربي على سطر TEXT نفسه
  'Q: What colour is the bicycle?','A: Red','B: Blue','C: Green','CORRECT: B',
].join('\n');
ok(await page.evaluate(t=>parseGenBlock(t,'listen'),LEAK_SAMELINE)===null,
  'وتلوّثٌ على سطر TEXT نفسه يُسقط العنصر كلّه — لا نصّ يُتلى مختلطاً');

console.log('\n٣ج) تلوّثٌ عربي في Q أو في خيار — لا في TEXT — يُسقط العنصر كذلك (العنصر كلّه إنجليزي الآن)');
const LEAK_IN_Q=['TEXT: My brother has a new bicycle.','Q: ما لون الدرّاجة؟','A: Red','B: Blue','C: Green','CORRECT: B'].join('\n');
const LEAK_IN_CHOICE=['TEXT: My brother has a new bicycle.','Q: What colour is the bicycle?','A: أحمر','B: Blue','C: Green','CORRECT: B'].join('\n');
ok(await page.evaluate(t=>parseGenBlock(t,'listen'),LEAK_IN_Q)===null,'عربيٌّ في Q وحدها ⇒ null');
ok(await page.evaluate(t=>parseGenBlock(t,'listen'),LEAK_IN_CHOICE)===null,'عربيٌّ في خيارٍ واحد وحده ⇒ null');

console.log('\n٤) صيغة ناقصة تعود null — لا تخمين لحقلٍ غائب');
const BAD1=['TEXT: Something.','Q: A question?','A: a','B: b','CORRECT: A'].join('\n'); // C غائب
const BAD2=['TEXT: Something.','Q: A question?','A: a','B: b','C: c'].join('\n'); // CORRECT غائب
ok(await page.evaluate(t=>parseGenBlock(t,'read'),BAD1)===null,'خيارٌ ناقص ⇒ null');
ok(await page.evaluate(t=>parseGenBlock(t,'read'),BAD2)===null,'CORRECT ناقص ⇒ null');
ok(await page.evaluate(()=>parseGenBlock('',  'read'))===null,'نصٌّ فارغ ⇒ null بلا انهيار');

console.log('\n٥) fetchTutorGen: نجاحٌ يُرجع عنصراً بمستواه، وفشلٌ يعود null بهدوء');
tutorReply=GOOD_LISTEN;tutorCalls=[];
const got=await page.evaluate(()=>fetchTutorGen('listen','B1'));
ok(!!got&&got.lv==='B1','العنصر يحمل المستوى المطلوب');
ok(tutorCalls.length===1&&tutorCalls[0].mode==='gen'&&tutorCalls[0].domain==='listen'&&tutorCalls[0].level==='B1',
  'والطلب بالشكل الصحيح (mode:gen، domain، level)');
tutorReply=null;   // يحاكي فشل الشبكة/المفتاح
const gotFail=await page.evaluate(()=>fetchTutorGen('listen','B1'));
ok(gotFail===null,'وفشل الشبكة يعود null — لا استثناء، كبقية نداءات tutor هنا');

console.log('\n٦) genBankAdd/Load: تخزينٌ محلّي بلا تكرار');
await page.evaluate(()=>{try{lsDel('test_gen_bank')}catch(e){}});
await page.evaluate(()=>{
  genBankAdd('test_gen_bank',{id:'x1',lv:'A1',q:'q1'});
  genBankAdd('test_gen_bank',{id:'x1',lv:'A1',q:'q1-dup'}); // نفس المعرّف — لا يُضاف ثانية
  genBankAdd('test_gen_bank',{id:'x2',lv:'A1',q:'q2'});
});
const stored=await page.evaluate(()=>genBankLoad('test_gen_bank'));
ok(stored.length===2,`عنصران فقط رغم محاولة التكرار (${stored.length})`);

console.log('\n٧) listenBankFor/readBankFor: البنك المولَّد ينضمّ للمستوى الصحيح فقط');
await page.evaluate(()=>{try{lsDel(GEN_BANK_KEY_LISTEN)}catch(e){}
  genBankAdd(GEN_BANK_KEY_LISTEN,{id:'ai_listen_x',lv:'B1',q:'gen-q',c:['a','b','c'],a:0,ai:true,audio:'text'});
});
const b1Bank=await page.evaluate(()=>listenBankFor('B1'));
const a1Bank=await page.evaluate(()=>listenBankFor('A1'));
ok(b1Bank.some(x=>x.id==='ai_listen_x'),'B1 يرى العنصر المولَّد');
ok(!a1Bank.some(x=>x.id==='ai_listen_x'),'وA1 لا يراه — لا اختلاط مستويات');
await page.evaluate(()=>{try{lsDel(GEN_BANK_KEY_LISTEN)}catch(e){}});

console.log('\n٨) genTopUp: يطلب حسب genCallsFor لا نداءً واحداً ثابتاً — درس ٢٠ أغسطس');
// معدّل التوليد رُفع (شكوى إلياس عن التكرار، ٢٠ أغسطس): بنكٌ يُستهلك أكثر من نصفه في
// جلسةٍ واحدة يحتاج أكثر من نداءٍ صامتٍ واحد، وإلا استُنفد أسرع مما ينمو — genCallsFor
// تحسب العدد فعلياً بدل رقمٍ مكتوب هنا يفلت من الاختبار عند تغييره (نفس درس ١٨ أغسطس:
// "الأعداد المكتوبة في الاختبارات فخّ صامت")
await page.evaluate(()=>{try{lsDel(GEN_BANK_KEY_READ)}catch(e){}});
tutorReply=function(n){return ['TEXT: '+['Hanan visits the souq in Abha and buys fresh dates for her family.',
  'The bus to Yanbu leaves at seven and arrives before noon on Tuesday.',
  'Misfer helps his father repair the garden gate after school in Hail.',
  'A science club in Tabuk built a small solar oven from a cardboard box.',
  'Haya wrote a report about the old wells of Al-Aflaj for her class.',
  'The football final in Qassim ended with a late goal from the youngest player.'][n%6],
  'Q: A question?','A: a','B: b','C: c','CORRECT: C'].join('\n')};
tutorCalls=[];
const expectCalls=await page.evaluate(()=>genCallsFor(readBankFor('A1').length,READ_N));
ok(expectCalls>=1,`البنك دون السقف فيحتاج توليداً (متوقَّعٌ ${expectCalls} نداء)`);
await page.evaluate(()=>genTopUp('read',GEN_BANK_KEY_READ,'A1'));
await page.waitForTimeout(400);
ok(tutorCalls.length===expectCalls,`عدد النداءات يطابق genCallsFor (${tutorCalls.length} من ${expectCalls})`);
const afterTopUp=await page.evaluate(()=>genBankLoad(GEN_BANK_KEY_READ));
ok(afterTopUp.length===expectCalls,'وكل عنصرٍ مقبولٍ خُزِّن فعلاً — بعددٍ يطابق النداءات');

console.log('\n٩) وحين يبلغ البنك السقف: لا طلب إضافي — لا استنزاف بلا داعٍ');
await page.evaluate(max=>{
  const arr=[];for(let i=0;i<max;i++)arr.push({id:'ai_read_pad'+i,lv:'A1',q:'q'+i,c:['a','b','c'],a:0,ai:true,passage:'p'});
  genBankSave(GEN_BANK_KEY_READ,arr);
},await page.evaluate(()=>GEN_BANK_MAX));
tutorCalls=[];
await page.evaluate(()=>genTopUp('read',GEN_BANK_KEY_READ,'A1'));
await page.waitForTimeout(300);
ok(tutorCalls.length===0,'ولا نداء شبكة — البنك بلغ سقفه');
await page.evaluate(()=>{try{lsDel(GEN_BANK_KEY_READ)}catch(e){}});

console.log('\n١٠) startListen/startRead يستدعيان التخصيب في الخلفية بلا حجب العرض');
tutorReply=GOOD_LISTEN;tutorCalls=[];
await page.evaluate(()=>{try{lsDel(GEN_BANK_KEY_LISTEN)}catch(e){}startListen()});
let t=await page.textContent('#app');
ok(t.length>40,'الجلسة عُرضت فوراً — لم تنتظر الشبكة');
await page.waitForTimeout(400);
ok(tutorCalls.some(c=>c.mode==='gen'&&c.domain==='listen'),'وطلب توليدٍ صدر في الخلفية');

console.log('\n١١) التسجيل: العنصر المولَّد يُسجَّل بنصّه وخياراته وموضع الصواب — كعُرف اللفظي/العلمي');
logs=[];
await page.evaluate(item=>{
  mode='listen';listenItems=[item];listenIdx=0;listenPicked=-1;listenLocked=false;listenPlays=1;listenShownAt=Date.now();
  gateLeft=0;gateStop();listenChoose(item.a);
},{id:'ai_listen_test1',lv:'B1',q:'سؤال تجريبي',c:['واحد','اثنان','ثلاثة'],a:1,ai:true,audio:'A short test passage.'});
await page.waitForTimeout(300);
const row=logs.find(l=>l.domain==='listen');
ok(!!row,'سطرٌ وصل');
ok(row&&row.q_text.includes('[مولَّد]')&&row.q_text.includes('سؤال تجريبي'),'ومعه علامة التوليد ونصّ السؤال');
ok(row&&row.q_text.includes('A short test passage.'),'ونصّ المقطع نفسه — لا يُعرف لاحقاً بلا هذا');
ok(row&&/2\) اثنان ✓/.test(row.q_text),'وموضع الصواب موسوم كعُرف اللفظي/العلمي');
ok(row&&row.q_text.includes('1) واحد')&&row.q_text.includes('3) ثلاثة'),'وبقيّة الخيارات معها');

console.log('\n١٢) وعنصر البنك الثابت (غير مولَّد) يبقى كما كان — بلا إطالة');
logs=[];
await page.evaluate(()=>{
  mode='read';readItems=[{id:'rd_a1_1',lv:'A1',passage:'p',q:'ثابت',c:['a','b','c'],a:0}];
  readIdx=0;readPicked=-1;readLocked=false;readShownAt=Date.now();
  gateLeft=0;gateStop();readChoose(0);
});
await page.waitForTimeout(300);
const row2=logs.find(l=>l.domain==='read');
ok(row2&&row2.q_text==='ثابت','نصّ السؤال وحده — لا [مولَّد] ولا خيارات لعنصر البنك الثابت');

console.log('\n١٣) لا انحدار');
for(const [fn,md] of [["startListen()",'listen'],["startRead()",'read'],["startCoach()",'coach'],["home()",'home']]){
  const r=await page.evaluate(x=>{try{eval(x);return{m:mode}}catch(e){return{err:e.message}}},fn);
  ok(!r.err&&r.m===md,`${fn} → ${r.err||r.m}`);
}
ok((await page.evaluate(()=>censusMissing())).length===0,'وكل الدوال معرَّفة');
ok((await page.evaluate(()=>window.__ERRS.length))===0,'ولا خطأ');

console.log('\n'+(fails?`=== ${fails} فشل ===`:'=== كل الاختبارات نجحت ==='));
await b.close();process.exit(fails?1:0);
})();
