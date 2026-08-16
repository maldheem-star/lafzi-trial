// المحرّك يولّد بنكَي الاستماع/القراءة — لا اليد وحدها (طلب ١٦ أغسطس، بعد أن كشفت
// بيانات محمد أن بنك B1 الخماسي يتكرّر بأزمنة إجابة ٢-٩ ثوانٍ: حفظ موضع لا فهمٌ متكرّر).
// نفس نمط fetchGemini للفظي/العلمي: بنكٌ مؤلَّف قاعٌ فوري، والتوليد يُخصّب الجلسة القادمة
// في الخلفية بلا شاشة انتظار، حتى سقفٍ (GEN_BANK_MAX) ثم يتوقّف. ووضع "gen" في دالّة
// tutor نفسها — لا دالّة ثانية.
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
    r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({ok:true,reply:tutorReply})});
  });
  await page.goto('http://127.0.0.1:8931/index.html');
  await page.waitForFunction(()=>typeof parseGenBlock==='function');
  return page;
};

console.log('\n١) parseGenBlock: صيغة سليمة تُفكَّك بكل حقولها');
let page=await mk();
const GOOD_LISTEN=[
  'TEXT: My cousin lives in Riyadh with her family.',
  'Q: أين تعيش ابنة عمّها؟',
  'A: جدّة',
  'B: الرياض',
  'C: الدمّام',
  'CORRECT: B',
].join('\n');
let item=await page.evaluate(t=>parseGenBlock(t,'listen'),GOOD_LISTEN);
ok(!!item,'لم تعد null');
ok(item.audio==='My cousin lives in Riyadh with her family.','النصّ في audio للاستماع');
ok(item.q==='أين تعيش ابنة عمّها؟','والسؤال');
ok(JSON.stringify(item.c)===JSON.stringify(['جدّة','الرياض','الدمّام']),'والخيارات الثلاثة بترتيبها');
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
  'Q: كم يوماً ناموا في الصحراء؟',
  'A: يومان','B: ثلاثة أيام','C: أسبوع','CORRECT: B',
].join('\n');
const mItem=await page.evaluate(t=>parseGenBlock(t,'read'),MULTI);
ok(!!mItem&&mItem.passage.includes('camping')&&mItem.passage.includes('three days'),
  `النصّان اندمجا في فقرة واحدة (${mItem&&mItem.passage})`);

console.log('\n٣ب) تلوّثٌ عربي في TEXT يُرفَض — شكوى إلياس الحقيقية (١٦ أغسطس): «يسمع عربي وإنجليزي»');
// النموذج أحياناً يُسقط وسم Q: فيبتلع سطر السؤال العربي ضمن استمرار TEXT — وTEXT تُتلى
// بصوتٍ إنجليزي (listenPlay⇐speakEnglish)، فيُسمع عربي وإنجليزي معاً كما اشتكى فعلاً.
const LEAK_CONTINUATION=[
  'TEXT: My brother has a new bicycle.',
  'ما لون الدرّاجة؟',   // سطر عربي بلا وسم Q: — يُفترض أن يُرفض لا أن يُدمج في النصّ
  'Q: ما لون الدرّاجة؟',
  'A: أحمر','B: أزرق','C: أخضر','CORRECT: B',
].join('\n');
const leakItem=await page.evaluate(t=>parseGenBlock(t,'listen'),LEAK_CONTINUATION);
ok(!!leakItem,'العنصر يُقبل رغم السطر الشارد — لم يُفسد التحليل كلّه');
ok(leakItem&&!/[؀-ۿ]/.test(leakItem.audio),`ولم يتسرّب العربي إلى audio (${leakItem&&leakItem.audio})`);

const LEAK_SAMELINE=[
  'TEXT: My brother has a new bicycle. ما لون الدرّاجة؟',   // عربي على سطر TEXT نفسه
  'Q: ما لون الدرّاجة؟','A: أحمر','B: أزرق','C: أخضر','CORRECT: B',
].join('\n');
ok(await page.evaluate(t=>parseGenBlock(t,'listen'),LEAK_SAMELINE)===null,
  'وتلوّثٌ على سطر TEXT نفسه يُسقط العنصر كلّه — لا نصّ يُتلى مختلطاً');

console.log('\n٤) صيغة ناقصة تعود null — لا تخمين لحقلٍ غائب');
const BAD1=['TEXT: Something.','Q: سؤال؟','A: أ','B: ب','CORRECT: A'].join('\n'); // C غائب
const BAD2=['TEXT: Something.','Q: سؤال؟','A: أ','B: ب','C: ج'].join('\n'); // CORRECT غائب
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

console.log('\n٨) genTopUp: يطلب فقط إن كان البنك دون السقف، ويُخزَّن ما وصل');
await page.evaluate(()=>{try{lsDel(GEN_BANK_KEY_READ)}catch(e){}});
tutorReply=MULTI.replace(/Q:.*/,'Q: سؤال؟').split('\n').slice(0,4).concat(['A: أ','B: ب','C: ج','CORRECT: C']).join('\n');
tutorCalls=[];
await page.evaluate(()=>genTopUp('read',GEN_BANK_KEY_READ,'A1'));
await page.waitForTimeout(400);
ok(tutorCalls.length===1,'طلبٌ واحدٌ صدر — البنك دون السقف');
const afterTopUp=await page.evaluate(()=>genBankLoad(GEN_BANK_KEY_READ));
ok(afterTopUp.length===1,'وعنصرٌ جديد خُزِّن فعلاً');

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
  listenChoose(item.a);
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
  readChoose(0);
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
