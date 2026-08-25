const {chromium}=require('/opt/node22/lib/node_modules/playwright');
let fails=0;const ok=(c,m)=>{console.log((c?'  ✓ ':'  ✗ FAIL ')+m);if(!c)fails++};
(async()=>{
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'});
const logs=[];let genCalls=[],genReply="";
const GOOD_GRAM_GEN=[
  "S1: My father go to work every day.","S1_OK: no","S1_WHY: الفاعل مفرد غائب فيحتاج -s",
  "S2: My father goes to work every day.","S2_OK: yes","S2_WHY: صحيحة — goes مع he/she/it",
  "S3: My father going to work every day.","S3_OK: no","S3_WHY: going تحتاج is قبلها",
  "S4: My father gone to work every day.","S4_OK: no","S4_WHY: gone يحتاج has قبلها"].join("\n");
const mk=async()=>{
  const page=await b.newPage({viewport:{width:420,height:900}});
  page.on('pageerror',e=>{console.log('  ✗ PAGEERROR '+e.message);fails++});
  await page.route('**/rest/v1/**',async r=>{
    let body={};try{body=JSON.parse(r.request().postData()||'{}')}catch(e){}
    logs.push(body);r.fulfill({status:201,contentType:'application/json',body:'[]'});
  });
  await page.route('**/functions/v1/tutor',async r=>{
    let x={};try{x=JSON.parse(r.request().postData()||'{}')}catch(e){}
    genCalls.push(x);
    r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({ok:true,reply:genReply||GOOD_GRAM_GEN})});
  });
  await page.addInitScript(()=>{
    Object.defineProperty(window,'speechSynthesis',{configurable:true,value:{speak(){},cancel(){},resume(){},pause(){},getVoices:()=>[{lang:'en-US',name:'X'}],speaking:false,pending:false}});
    window.SpeechSynthesisUtterance=function(t){this.text=t};
  });
  await page.goto('http://127.0.0.1:8931/index.html');
  await page.waitForFunction(()=>typeof itemStuck==='function');
  return page;
};
// يضع سؤالاً بعينه أول الخطة
const put=async(page,id)=>page.evaluate(x=>{
  const it=engPool().find(i=>i.id===x);
  planItems=[Object.assign({},it)];planIdx=0;planTotal=1;planScore=0;planDone=false;
  planPicked=null;planLocked=false;planInput="";mode="engplan";
  fixOn=false;fixItem=null;fixStep=0;
  if(fixNeeded(planItems[0]))fixStart(planItems[0]);else render();
},id);

console.log('\n١) البذرة: أسئلتها الثلاثة عشر معلّمة من أول تحميل');
let page=await mk();
const seeded=await page.evaluate(()=>{
  const m=itemErrLoad(),ids=Object.keys(m);
  return{n:ids.length,stuck:ids.filter(itemStuck).length,write:m.u1_g2,eat:m.u1_g1};
});
ok(seeded.n===13,`ثلاثة عشر سؤالاً مبذوراً (${seeded.n})`);
ok(seeded.stuck===13,'وكلها تتجاوز عتبة العلوق فوراً — بلا انتظار خطأين جديدين');
ok(seeded.write&&seeded.write.last==='write'&&seeded.write.wrong===3,'وu1_g2 محفوظ بجوابها «write» ثلاث مرات كما سُجّل');
ok(seeded.eat&&seeded.eat.last==='eat','وu1_g1 بجوابها «eat»');
ok(await page.evaluate(()=>itemStuck('u1_g3'))===false,'والأسئلة التي تُصيبها (u1_g3) غير معلّمة');

console.log('\n٢) السؤال العالق: لا خيارات قبل بطاقة التصحيح');
await put(page,'u1_g2');
ok(await page.evaluate(()=>fixOn)===true,'البوّابة مفتوحة');
ok(await page.evaluate(()=>document.querySelectorAll('.choice').length)===0,'ولا خيار واحد في الصفحة');
let t=await page.textContent('#app');
ok(t.includes('هذا السؤال بالذات يتكرّر خطؤه'),'والعنوان يُسمّي الحالة');
ok(t.includes('write'),'وجوابها الخاطئ مذكور حرفياً');
ok(t.includes('٣ مرات')||t.includes('٣'),'وعدد مرّاته');
ok(t.includes('is written'),'ومعه الصواب');
ok(t.includes('المبني للمجهول'),'وشرح القاعدة');

console.log('\n٣) التمارين: ثلاثة خيارات، والصواب يفتح الطريق');
await page.click('button[onclick="fixCardDone()"]');
ok(await page.evaluate(()=>fixStep)===1,'التمرين الأول');
ok(await page.evaluate(()=>document.querySelectorAll('.choice').length)===3,'بثلاثة خيارات لا أربعة ولا اثنين');
let opts=await page.evaluate(()=>fixDrills[0]._opts);
ok(opts.includes('is written')&&opts.includes('write'),`فيها الصواب وجوابها الخاطئ (${opts.join(' / ')})`);
ok(opts.length===3&&new Set(opts).size===3,'ومموّه ثالث مختلف — لا تلقيح ضدّ خطأ واحد');
let ai=await page.evaluate(()=>fixDrills[0]._ai);
await page.evaluate(i=>fixChoose(i),ai);
ok(await page.evaluate(()=>fixOkFlag)===true,'اختارت الصواب');
await page.click('button[onclick="fixNext()"]');
ok(await page.evaluate(()=>fixStep)===2,'ينتقل للتمرين الثاني');
t=await page.textContent('#app');
ok(!t.includes('This story'),'وجملته مختلفة — لا حفظ لجملة واحدة');
ok(t.includes('Insects'),'من الدرس نفسه (المبني للمجهول)');
ai=await page.evaluate(()=>fixDrills[1]._ai);
await page.evaluate(i=>fixChoose(i),ai);
await page.click('button[onclick="fixNext()"]');
ok(await page.evaluate(()=>fixOn)===false,'وبعدهما تُغلق البوّابة');
ok(await page.evaluate(()=>document.querySelectorAll('.choice').length)===4,'ويعود السؤال بخياراته الأربعة');

console.log('\n٤) الخطأ في التمرين يُعيد الشرح ولا يمرّر');
await put(page,'u1_g2');
await page.click('button[onclick="fixCardDone()"]');
ai=await page.evaluate(()=>fixDrills[0]._ai);
await page.evaluate(i=>fixChoose(i===0?1:0),ai);
ok(await page.evaluate(()=>fixOkFlag)===false,'أخطأت في التمرين');
t=await page.textContent('#app');
ok(t.includes('سنعيد الشرح مرة أخرى'),'وتُخبَر أن الشرح سيعود');
await page.click('button[onclick="fixNext()"]');
ok(await page.evaluate(()=>fixStep)===0,'وتعود إلى البطاقة فعلاً');
ok(await page.evaluate(()=>fixOn)===true,'والبوّابة ما زالت مقفلة');
ok(await page.evaluate(()=>document.querySelectorAll('.choice').length)===0,'ولا خيارات');
// ولا تُفتح بالإلحاح
for(let k=0;k<3;k++){
  await page.click('button[onclick="fixCardDone()"]');
  const a2=await page.evaluate(()=>fixDrills[0]._ai);
  await page.evaluate(i=>fixChoose(i===0?1:0),a2);
  await page.click('button[onclick="fixNext()"]');
}
ok(await page.evaluate(()=>fixOn)===true,'ثلاث محاولات خاطئة: ما زالت مقفلة');
ok(await page.evaluate(()=>fixWrong)===4,`والأخطاء محسوبة (${await page.evaluate(()=>fixWrong)})`);

console.log('\n٥) الإجابة الصحيحة تمسح العلامة، والخطأ الجديد يُعيدها');
page=await mk();
await page.evaluate(()=>{itemErrSave({});localStorage.removeItem('mawhiba_eng_item_seed_v1')});
await page.evaluate(()=>{
  const it=engPool().find(i=>i.id==='u1_g2');
  itemErrRecord('u1_g2',false,'write');
});
ok(await page.evaluate(()=>itemStuck('u1_g2'))===false,'خطأ واحد لا يكفي — قد يكون سهواً');
await page.evaluate(()=>itemErrRecord('u1_g2',false,'write'));
ok(await page.evaluate(()=>itemStuck('u1_g2'))===true,'وخطآن يكفيان');
ok(await page.evaluate(()=>itemErrOf('u1_g2').same)===1,'وتكرار الجواب نفسه مرصود');
await page.evaluate(()=>itemErrRecord('u1_g2',true,'is written'));
ok(await page.evaluate(()=>itemStuck('u1_g2'))===false,'والإجابة الصحيحة تمسح العلامة');
ok(await page.evaluate(()=>itemErrOf('u1_g2'))===null,'ولا يبقى أثر');

console.log('\n٦) التسجيل: بوّابة وتمارين تصل للخادم');
page=await mk();
logs.length=0;
await put(page,'u1_g1');
await page.click('button[onclick="fixCardDone()"]');
ai=await page.evaluate(()=>fixDrills[0]._ai);
await page.evaluate(i=>fixChoose(i),ai);
await page.waitForTimeout(400);
ok(logs.some(l=>l.qtype==='fix_open'&&l.item_id==='u1_g1'),'فتح البوّابة مُسجَّل مع معرّف السؤال');
ok(logs.some(l=>l.qtype==='fix_open'&&l.response==='eat'),'ومعه جوابها الخاطئ السابق');
const dr=logs.find(l=>l.qtype==='fix_drill');
ok(!!dr&&dr.is_correct===true&&dr.item_id==='u1_g1','ونتيجة التمرين مُسجَّلة');
ok(dr&&dr.lesson==='l_passive','ومعها الدرس');

console.log('\n٧) الأسئلة السليمة لا تُعطَّل');
page=await mk();
for(const id of ['u1_g3','u1_g4','u6_g3','u5_g4']){
  await put(page,id);
  const st=await page.evaluate(()=>({fix:fixOn,ch:document.querySelectorAll('.choice').length}));
  ok(!st.fix&&st.ch===4,`${id}: يُعرض مباشرةً بأربعة خيارات`);
}
// المفردات والإملاء لا تدخل البوّابة أصلاً
const other=await page.evaluate(()=>{
  const v=engPool().find(i=>i.t==='vocab'),d=engPool().find(i=>i.t==='dict');
  const bad=[];
  [v,d].forEach(function(x){if(!x)return;
    itemErrRecord(x.id,false,'z');itemErrRecord(x.id,false,'z');
    if(fixNeeded(x))bad.push(x.t+' دخل بوّابة القواعد');});
  return bad;
});
ok(other.length===0,other.length?other.join(' | '):'والمفردات والإملاء خارج البوّابة — هي للقواعد وحدها');

console.log('\n٨) جلسة كاملة بنقرات حقيقية: البوّابة لا تُوقف الخطة');
page=await mk();
await page.evaluate(()=>startEngPlan());
let guard=0,gates=0,reachedEnd=false;
while(guard++<300){
  const st=await page.evaluate(()=>({m:mode,done:planDone,fix:fixOn,step:fixStep,lock:fixLocked,
    cx:typeof cxOn!=='undefined'&&cxOn,cxs:typeof cxStep!=='undefined'?cxStep:0,
    cxwhy:typeof cxWhyOn!=='undefined'&&cxWhyOn&&cxWhyPicked==null,
    cxpre:typeof cxPreOn!=='undefined'&&cxPreOn,
    cxnp:typeof cxOn!=='undefined'&&cxOn&&!cxPreOn&&cxStep===0&&cxNoticePicked==null,cxlock:typeof cxLocked!=='undefined'&&cxLocked,
    t:planCur()?planCur().t:null,plock:planLocked,ai:planCur()?planCur().a:null,
    pg:typeof planGateOpen==='function'&&!planGateOpen()}));
  if(st.done){reachedEnd=true;break}
  // بطاقة التقابل أُضيفت بعد كتابة هذا الفحص — نمرّ بها كما تمرّ هي
  if(st.cx){
    // التصنيف قبل القاعدة في few_little: نُجيب صواباً حتى تنفتح
    if(st.cxpre){
      if(await page.evaluate(()=>cxPreFail)){await page.click('button[onclick="cxPreQuit()"]');continue}
      await page.evaluate(()=>{const cur=cxPreCur();
        let i=0;for(let k=0;k<cxPreOrder.length;k++){if(cxPair.sides[cxPreOrder[k]].k===cur.side){i=k;break}}
        cxPreChoose(i);cxPreNext()});
      continue;
    }
    if(st.cxs===-1){await page.click('button[onclick="cxFinish()"]');continue}
    if(st.cxnp){await page.click('button[onclick="cxNoticePick(0)"]');continue}
    if(st.cxs===0){await page.click('button[onclick="cxRuleDone()"]');continue}
    if(st.cxwhy){await page.click('button[onclick="cxWhyPick(0)"]');continue}
    if(!st.cxlock){const a=await page.evaluate(()=>cxDrills[cxStep-1]._ai);await page.evaluate(i=>cxChoose(i),a);continue}
    await page.click('button[onclick="cxNext()"]');continue;
  }
  if(st.fix){
    if(st.step===0){gates++;await page.click('button[onclick="fixCardDone()"]');continue}
    if(!st.lock){const a=await page.evaluate(()=>fixDrills[fixStep-1]._ai);await page.evaluate(i=>fixChoose(i),a);continue}
    await page.click('button[onclick="fixNext()"]');continue;
  }
  // بوّابة قراءة الإنجليزي أُضيفت بعد كتابة هذا الفحص — نفتحها كما تفعل هي بالانتظار
  if(st.pg){await page.evaluate(()=>{planGateLeft=0;planGateStop();render()});continue}
  if(st.t==='lesson'){await page.click('button[onclick="planLessonDone()"]');continue}
  if(st.plock){await page.click('button[onclick="planNext()"]');continue}
  if(st.t==='dict'){await page.evaluate(()=>{document.getElementById('planIn').value=planCur().w;planCheckDict()});continue}
  await page.evaluate(i=>planChoose(i),st.ai);
}
ok(reachedEnd,`الخطة تنتهي عند شاشة النتيجة (${guard} خطوة)`);
ok(gates>0,`والبوّابة اعترضت ${gates} سؤالاً عالقاً داخل جلسة حقيقية`);
ok((await page.evaluate(()=>window.__ERRS.length))===0,'ولا خطأ في الجلسة كلها');

console.log('\n٩) الإملاء صار يُسجّل الكلمة وما كتبته');
page=await mk();logs.length=0;
await page.evaluate(()=>{startDictation();dictSession[0]={w:"winter",m:"شتاء"};render()});
await page.evaluate(()=>{document.getElementById('dictIn').value="wintr";dictCheck()});
await page.waitForTimeout(400);
const dl=logs.find(l=>l.domain==='dictation_a1');
ok(!!dl,'السطر وصل');
ok(dl&&dl.response==='wintr',`وفيه ما كتبته حرفياً («${dl&&dl.response}») — كان null قبل اليوم`);
ok(dl&&dl.item_id==='winter'&&dl.q_text==='winter','ومعه الكلمة المطلوبة');
ok(dl&&typeof dl.elapsed_ms==='number','والزمن');
ok(dl&&dl.is_correct===false,'والنتيجة صحيحة الحساب');

console.log('\n١٠) لا انحدار');
page=await mk();
for(const [fn,md] of [["startBasics('percent')",'basics'],["startFade('circle')",'fade'],["startFactPlan()",'factplan'],
  ["startDictation()",'dictation'],["startEngPlan()",'engplan'],["startPronunciation()",'pron'],
  ["startAudioDiag()",'audiodiag'],["home()",'home']]){
  const r=await page.evaluate(x=>{try{eval(x);return{m:mode,len:document.getElementById('app').textContent.length}}catch(e){return{err:e.message}}},fn);
  ok(!r.err&&r.m===md&&r.len>40,`${fn} → ${r.err||r.m}`);
}
ok((await page.evaluate(()=>censusMissing())).length===0,'وكل الدوال معرَّفة');
ok((await page.evaluate(()=>window.__ERRS.length))===0,'ولا خطأ');

console.log('\n١١) البوّابة الجديدة: قواعد فوق مستواها بدرجتين لا تدخل الخطة "جديدة" (١٩ أغسطس)');
page=await mk();
const gate=await page.evaluate(()=>{
  const lv=profileOf().level; // A1 لهيا
  const cases=[["u1_g3","l_where","A2",true],["u2_g1","l_cond","B1",false],
    ["u3_g1","l_pp_q","B1",false],["u4_g4","l_rel","B1",false],["u7_g1","l_reported","B1",false]];
  return{lv,r:cases.map(([id,lesson,exp,want])=>{
    const it=engPool().find(i=>i.id===id);
    return{id,lesson,got:engLevelOk(it,lv),want};
  })};
});
ok(gate.lv==='A1','مستوى هيا A1 كما في PROFILES');
gate.r.forEach(c=>ok(c.got===c.want,`${c.id} (${c.lesson}): engLevelOk=${c.got} متوقَّع ${c.want}`));
// ومموّهاً حقيقياً: عناصر seed المخزونة (B1) تبقى تصل رغم أنها فوق المستوى بدرجتين — لأنها ليست "جديدة"
await page.evaluate(()=>{itemErrSave({});localStorage.removeItem('mawhiba_eng_item_seed_v1');itemSeedOnce();srsLoad()});
await put(page,'u1_g2'); // l_passive B1، مبذورة أصلاً فمستحقّة لا جديدة
ok(await page.evaluate(()=>mode)==='engplan','u1_g2 (B1، مبذورة) تُفتح عبر put مباشرة — البوّابة الجديدة لا تمسّ مساراً غير fresh');
// وخطة يوم كاملة فعلية: قواعد B1 التي لا أثر حقيقي لها إطلاقاً (لا ITEM_SEED ولا LESSON_SEED —
// عرضٌ أوّل بلا أي سجلّ سابق) يجب ألّا تدخل كـ"جديدة" أبداً. أمّا l_cond/l_pp_q/l_pp_vs/l_rel/
// l_passive فمعفاةٌ عمداً حتى بلا سجلّ عنصرٍ فردي: LESSON_SEED يُثبت ضعفاً حقيقياً على مستوى
// الدرس كلّه (جلسة ٥ أغسطس)، وإعادة التدريس تُخرج كل عناصر الدرس الضعيف لا العنصر المبذور وحده
// — وهذا تصميمٌ قائمٌ سابقٌ لهذا الإصلاح، لا ثغرة: مراجعة درسٍ أخطأته فعلاً غير عرض محتوًى بكرٍ.
const NEVER_SEEN_B1_LESSONS=['l_reported','l_repq','l_pp_adv']; // لا في أيّ بذرة — أعلى مستواها بدرجتين وبلا أي دليل مسبق
page=await mk();
const plan=await page.evaluate(()=>{
  localStorage.removeItem('mawhiba_eng_srs');
  const p=buildDailyPlan();
  return p.items.map(i=>({id:i.id,lesson:i.lesson,isNew:i._isNew}));
});
const badFresh=plan.filter(i=>i.isNew&&i.lesson&&NEVER_SEEN_B1_LESSONS.includes(i.lesson));
ok(badFresh.length===0,badFresh.length?`محتوًى B1 بكرٌ دخل كجديد: ${badFresh.map(i=>i.id).join(',')}`:'ولا عنصر B1 بكرٌ (بلا أي بذرة) دخل الخطة كجديد (خطة كاملة، لا حالة معزولة)');
// وتأكيدٌ أن المسار الآخر (إعادة تدريس الدرس الضعيف) ما زال يعمل كما صُمّم أصلاً — لم يُعطَّل بالخطأ.
// ===== ولماذا تغيّر الدرس المُختبَر من l_passive — ٢٥ أغسطس =====
// كان هذا السطر ينجح بجملة البناء `b_pass` وحدها: عنصر القواعد `u1_g2` (l_passive، B1)
// كان يُجمَّد فعلاً حتى في إعادة التدريس — أي أن **البوّابة تسبق إعادةَ التدريس في القواعد
// منذ ٢٢ أغسطس**، والبناء وحده كان يفلت لأن `engLevelOk` لم تكن تشمله. فدخولُ البناء
// البوّابةَ اليوم ليس تعطيلاً للآلية بل إتمامٌ لاتّساقها.
// وبيانات ٢٥ أغسطس هي التي أوجبته: هيا ٠ من ١١ في البناء، ومنها المبني للمجهول والشرط
// والمضارع التامّ — فوق A1 بدرجتين. فالمُختبَر الآن درسٌ ضعيفٌ **في مستواها** (l_few، A2،
// من LESSON_SEED نفسها) — نفس الآلية بالضبط، بلا تثبيت محتوًى كذّبته البيانات.
const WEAK_AT_LEVEL=['l_few','l_pastprog']; // كلاهما A2 وفي LESSON_SEED: مسموحان لـA1 بـi+1
const reteachInPlan=plan.some(i=>i.lesson&&WEAK_AT_LEVEL.includes(i.lesson));
ok(reteachInPlan,'ودرسٌ ضعيفٌ في مستواها (a few / a little) ما زال يصل عبر إعادة التدريس — لم تُعطَّل الآلية القائمة');
// وفوق-المستوى-بدرجتين لا يصل حتى عبر إعادة التدريس — لا فرق بين قاعدةٍ وبناء
const twoAbove=plan.filter(i=>i.lesson&&['l_passive','l_cond','l_pp_q','l_rel','l_pp_vs'].includes(i.lesson));
ok(twoAbove.length===0,twoAbove.length?`B1 وصل لـA1 عبر إعادة التدريس: ${twoAbove.map(i=>i.id).join(',')}`
  :'ولا درسَ B1 يصل A1 عبر أيّ مسار — القواعد والبناء سواء');

console.log('\n١٢) التوليد الآلي لـgram (٢٠ أغسطس) — علاج شكوى إلياس: ١٥٪ تمايز فقط بلا توليد');
page=await mk();
const gp=await page.evaluate(x=>({
  good:parseGenPickBlock(x.good,'gram',false),
  wrongCount:parseGenPickBlock(x.good.replace('S1_OK: no','S1_OK: yes'),'gram',false), // صارت صحيحتان
  arContam:parseGenPickBlock(x.good.replace('My father goes to work every day.','ذهب أبي إلى العمل'),'gram',false),
  dup:parseGenPickBlock(x.good.replace('My father going to work every day.','My father goes to work every day.'),'gram',false),
  missing:parseGenPickBlock('just some text','gram',false),
}),{good:GOOD_GRAM_GEN});
ok(!!gp.good&&gp.good.c.length===4&&gp.good.c.filter(c=>c.ok).length===1&&gp.good.ai===true,'نصٌّ سليمٌ يُقبل: أربع جملٍ، صحيحةٌ واحدة، ai:true');
ok(gp.good.c.every(c=>c.why&&c.why.length>0),'وكل خيارٍ ومعه سببه');
ok(gp.wrongCount===null,'وصفر أو صواب مزدوج (هنا: صواب مزدوج) يُرفض');
ok(gp.arContam===null,'وتلوّثٌ عربي في جملة يُرفض رغم شكلٍ سليم ظاهرياً');
ok(gp.dup===null,'وجملتان متطابقتان تُرفضان — لا مموّهاً حقيقياً');
ok(gp.missing===null,'ونصٌّ بلا وسم S1..S4 يُرفض');
await page.evaluate(()=>{try{lsDel(GEN_BANK_KEY_GRAM)}catch(e){}});
genCalls=[];genReply=GOOD_GRAM_GEN;
await page.evaluate(level=>gramGenTopUp(level),'A1');
await page.waitForTimeout(300);
ok(genCalls.some(c=>c.mode==='gen'&&c.domain==='gram'&&c.level==='A1'),'gramGenTopUp يطلب توليداً بمستواها');
const gramAiBank=await page.evaluate(()=>genBankLoad(GEN_BANK_KEY_GRAM));
ok(gramAiBank.length>=1&&gramAiBank[0].lv==='A1'&&gramAiBank[0].ai===true,'والعنصر المقبول يدخل بنك التوليد المحلّي');
const gramMerged=await page.evaluate(()=>gramBankFor('A1'));
ok(gramMerged.some(x=>x.ai===true)&&gramMerged.some(x=>!x.ai),'ويظهر ضمن gramBankFor مع البنك المؤلَّف — لا بديلاً عنه');
// ومعدّل التوليد رُفع لا نداءٌ واحد — بنكٌ صغيرٌ (٥) يُستهلك جلسةً واحدة كاملةً (GRAM_N=5)
const calls3=await page.evaluate(()=>genCallsFor(5,5));
ok(calls3>1,`ونداءاتٌ متعدّدة حين تستهلك الجلسة نصف البنك فأكثر (${calls3})`);
// السقف يُقرأ من الشيفرة لا يُثبَّت رقماً — درس «الأعداد المكتوبة في الاختبارات فخّ صامت»
const maxBank=await page.evaluate(()=>GEN_BANK_MAX);
const calls0=await page.evaluate(m=>genCallsFor(m,5),maxBank);
ok(calls0===0,'ولا نداء إضافي عند بلوغ السقف (GEN_BANK_MAX='+maxBank+')');

console.log('\n١٣) لا انحدار بعد وصل التوليد بـgram');
page=await mk();
await page.evaluate(()=>startGram());
await page.waitForTimeout(300);
ok((await page.evaluate(()=>window.__ERRS.length))===0,'ولا خطأ عند بدء الجلسة رغم نداء التوليد الصامت');
ok((await page.evaluate(()=>censusMissing())).length===0,'وكل الدوال معرَّفة');

await b.close();
console.log(fails?`\n=== ${fails} فشل ===`:'\n=== كل الاختبارات نجحت ===');
process.exit(fails?1:0);
})();
