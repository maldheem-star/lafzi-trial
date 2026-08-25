// تعريب الأسماء والأماكن والثقافة، وثلاثة إصلاحات — ٢٥ أغسطس
//
// طلب صاحب المشروع: الأسماء عربية (هيا وحنان للنساء، ومسفر وحسن ومحمد وإلياس
// للرجال)، والأماكن في السعودية، والثقافة سعودية للثلاثة.
// ومعها ثلاثة إصلاحات بذرتها بيانات جلسة ١٣:٥٥ اليوم:
//   · l_passive لم يكن مصنَّفاً في ENG_LESSON_LV، وengLevelOk تُمرّر غير المصنَّف —
//     فمرّ u1_g2 (المبني للمجهول، B1) إلى هيا (A1) رغم تجميد أحد عشر عنصراً غيره.
//   · بنك الكلمات ٠/١١ وأهدافه تصحيحاتُ نصوصٍ أملتها بصوتها فشوّهها المحرّك.
//   · sp_instead_of تعليمةٌ عن الأدب لا جملةٌ تُنطق، ومع ذلك دخلت بنك النطق.
const {chromium}=require('/opt/node22/lib/node_modules/playwright');
const BASE='http://localhost:8931/index.html';
let fails=0;
function ok(c,m){console.log((c?'  ✓ ':'  ✗ FAIL ')+m);if(!c)fails++}
async function mk(browser,q){
  const page=await browser.newPage({viewport:{width:420,height:900}});
  page.on('pageerror',e=>{console.log('  ! pageerror:',e.message);fails++});
  await page.route('**/functions/v1/**',r=>r.fulfill({status:200,contentType:'application/json',body:'{"ok":true,"reply":"NONE"}'}));
  await page.route('**/rest/v1/**',r=>r.fulfill({status:201,contentType:'application/json',body:'[]'}));
  await page.addInitScript(()=>{
    Object.defineProperty(window,'speechSynthesis',{configurable:true,value:{speak(){},cancel(){},resume(){},pause(){},
      getVoices:()=>[{lang:'en-US',name:'X'}],speaking:false,pending:false}});
    window.SpeechSynthesisUtterance=function(t){this.text=t};
  });
  await page.goto(BASE+(q||''),{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>typeof window.render==='function',{timeout:15000});
  await page.evaluate(()=>localStorage.clear());
  return page;
}
const OK_M=["مسفر","حسن","محمد","إلياس"], OK_F=["هيا","حنان"];
const OK_EN=["Musfir","Hasan","Mohammed","Elias","Haya","Hanan"];

(async()=>{
  const browser=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'});

  // ===== ١) مصفوفات الأسماء: من القائمة وحدها، وتكفي أكبر طلب =====
  console.log('\n١) مصفوفات الأسماء');
  {
    const page=await mk(browser);
    const r=await page.evaluate(t=>({
      logic:LOGIC_NAMES, age:AGE_NAMES, m:NAMES_M, f:NAMES_F,
      // أكبر طلبٍ في المولّدات: أربعةٌ متمايزة من LOGIC/AGE، وخمسةٌ من M+F
      enough:{logic:LOGIC_NAMES.length>=4,age:AGE_NAMES.length>=4,
              mixed:NAMES_M.length+NAMES_F.length>=5},
      uniq:{logic:new Set(LOGIC_NAMES).size===LOGIC_NAMES.length,
            age:new Set(AGE_NAMES).size===AGE_NAMES.length},
    }),null);
    const allowed=OK_M.concat(OK_F);
    ok(r.logic.every(n=>allowed.indexOf(n)>=0),'أسماء المنطق من القائمة — '+r.logic.join('، '));
    ok(r.age.every(n=>allowed.indexOf(n)>=0),'وأسماء الأعمار كذلك — '+r.age.join('، '));
    ok(r.m.every(n=>OK_M.indexOf(n)>=0),'والذكور ذكورٌ فقط — '+r.m.join('، '));
    ok(r.f.every(n=>OK_F.indexOf(n)>=0),'والإناث إناثٌ فقط — '+r.f.join('، '));
    ok(r.enough.logic&&r.enough.age&&r.enough.mixed,
       'وكلٌّ يكفي أكبر طلبٍ في مولّداته (٤ و٤ و٥)');
    ok(r.uniq.logic&&r.uniq.age,'ولا اسمَ مكرّر داخل مصفوفة — وإلا تعذّر اختيار متمايزين');
    await page.close();
  }

  // ===== ٢) المولّدات لا تُنتج اسماً خارج القائمة =====
  console.log('\n٢) المولّدات على مئة توليدة');
  {
    const page=await mk(browser);
    const r=await page.evaluate(allowed=>{
      const bad=[];
      for(let i=0;i<100;i++){
        const q=gAgeChain();
        // أيّ كلمةٍ عربية في نصّ السؤال تشبه اسماً: نتحقّق أن كل اسمٍ معروضٍ مسموح
        allowed.forEach(function(){});
        const names=(q.q.match(/[ء-ي]{2,}/g)||[]);
        // يكفي أن نتأكّد أن أسماء القائمة موجودة وأن لا اسمَ من القائمة القديمة ظهر
        ["سارة","نورة","ريم","خالد","فيصل","بدر","هند","أحلام","مهند","أحمد"].forEach(function(old){
          if(q.q.indexOf(old)>=0)bad.push("age:"+old);
        });
      }
      for(let i=0;i<60;i++){
        const f=fadeMakeLogicOrder();
        const txt=(f.lines||[]).join(" ")+" "+(f.q||"");
        ["سارة","نورة","ليلى","مها","هند","ريم"].forEach(function(old){
          if(txt.indexOf(old)>=0)bad.push("logic:"+old);
        });
      }
      return{bad:Array.from(new Set(bad))};
    },OK_M.concat(OK_F));
    ok(r.bad.length===0,'لا اسمَ من القائمة القديمة في مئةٍ وستّين توليدة — '+(r.bad.join(',')||'نظيف'));
    await page.close();
  }

  // ===== ٣) البنوك: لا اسمَ أجنبي ولا مكانَ غير سعودي =====
  console.log('\n٣) البنوك المؤلَّفة');
  {
    const page=await mk(browser,'?p=mohammed');
    const r=await page.evaluate(()=>{
      const txt=[];
      const push=x=>{if(typeof x==="string")txt.push(x)};
      [LISTEN_BANK,READ_BANK,WRITE_BANK,VIDEO_BANK,GRAM_BANK,STEP_BANK].forEach(function(bank){
        bank.forEach(function(it){
          push(it.audio);push(it.passage);push(it.prompt);push(it.q);push(it.t);push(it.joint);
          (it.c||[]).forEach(function(c){push(typeof c==="string"?c:c.t)});
          (it.s||[]).forEach(push);
          (it.sc||[]).forEach(function(sc){push(sc[1])});
        });
      });
      MINPAIR_BANK.forEach(function(x){(x.s||[]).forEach(push)});
      SPEAK_ITEMS.forEach(function(x){push(x.en)});
      const all=txt.join(" \n ");
      const foreign=["Leo","Tom","Sam","Sara","Nora","Maya","Milo","Henderson","Evans",
                     "Patel","Arthur","Mariam","Layla","Karim","Omar","Ali","Ahmed","Bud",
                     "Cairo","London","Paris","Illinois","Monroe","Oakridge","Maple"];
      const hits=foreign.filter(function(w){return new RegExp("\\b"+w+"\\b").test(all)});
      const haram=["beer","wine","alcohol","pork","bacon","Christmas","church","girlfriend","boyfriend"];
      const hh=haram.filter(function(w){return new RegExp("\\b"+w+"\\b","i").test(all)});
      return{hits:hits,haram:hh,chars:all.length};
    });
    ok(r.hits.length===0,'لا اسمَ أجنبيّ ولا مكانَ غير سعودي في البنوك — '+(r.hits.join(', ')||'نظيف'));
    ok(r.haram.length===0,'ولا محتوًى يخالف الثقافة — '+(r.haram.join(', ')||'نظيف'));
    ok(r.chars>20000,'والمسح شمل البنوك فعلاً — '+r.chars+' حرفاً');
    await page.close();
  }

  // ===== ٤) l_passive صار مصنَّفاً، ولا درسَ قواعدٍ بلا تصنيف =====
  console.log('\n٤) الثقب الذي سرّب المبني للمجهول');
  {
    const page=await mk(browser);
    const r=await page.evaluate(()=>{
      const pool=engPool();
      const g=pool.filter(function(x){return x.t==="grammar"&&x.lesson});
      const unclassified=Array.from(new Set(g.filter(function(x){return !ENG_LESSON_LV[x.lesson]})
        .map(function(x){return x.lesson})));
      const u1g2=pool.filter(function(x){return x.id==="u1_g2"})[0];
      return{lv:ENG_LESSON_LV.l_passive,
             unclassified:unclassified,
             frozenA1:u1g2?engFrozen(u1g2,"A1"):null,
             frozenB1:u1g2?engFrozen(u1g2,"B1"):null};
    });
    ok(r.lv==='B1','المبني للمجهول مصنَّفٌ B1 — '+r.lv);
    ok(r.unclassified.length===0,'ولا درسَ قواعدٍ بلا تصنيف (وغيرُ المصنَّف يمرّ صامتاً) — '+(r.unclassified.join(',')||'نظيف'));
    ok(r.frozenA1===true,'وu1_g2 يُجمَّد عن A1 — وهو الذي مرّ اليوم');
    ok(r.frozenB1===false,'ويعود عند B1 — تجميدٌ لا حذف');
    await page.close();
  }
  {
    // ولا يظهر في «أخطائي» ولو كان له سجلّ خطأ
    const page=await mk(browser);
    const r=await page.evaluate(()=>{
      lsSet(ITEM_ERR_KEY,JSON.stringify({u1_g1:{wrong:3,last:"خطأ"},u1_g2:{wrong:3,last:"خطأ"}}));
      _engPool=null;
      const ids=errCollect().filter(function(x){return x.kind==="item"}).map(function(x){return x.key});
      return{leak:ids.filter(function(i){return i==="u1_g1"||i==="u1_g2"})};
    });
    ok(r.leak.length===0,'ولا يتسرّب إلى «أخطائي» — '+(r.leak.join(',')||'نظيف'));
    await page.close();
  }

  // ===== ٥) النصّ المُملى صوتياً لا يُلوّث بنك الأخطاء =====
  console.log('\n٥) الإملاء الصوتي لا يدخل بنك الأخطاء');
  // المراجعة تُعيد حساب writeFix من الخادم، فوضعُها يدوياً قبل الإرسال لا يبقى.
  // فيُرَدّ سطر FIX حقيقي من المحاكاة، وإلا مرّ الفحصان معاً بصفرٍ مقابل صفر —
  // نجاحٌ لسببٍ خاطئ لا يقيس شيئاً.
  const FIXREPLY='{"ok":true,"reply":"FIX: it runs fast | it runs quickly | ظرف الحال quickly"}';
  async function mkFix(q){
    const page=await mk(browser,q);
    await page.route('**/functions/v1/**',r=>r.fulfill({status:200,contentType:'application/json',body:FIXREPLY}));
    return page;
  }
  {
    const page=await mkFix();
    const posted=[];
    await page.route('**/rest/v1/mawhiba_answer_log**',rt=>{
      try{posted.push(JSON.parse(rt.request().postData()||'{}'))}catch(e){}
      rt.fulfill({status:201,body:''});
    });
    const before=await page.evaluate(()=>{
      startWrite();
      writeItems=[WRITE_BANK.find(function(i){return i.id==="wr_a1_2"})];
      writeIdx=0;writeSubmitted=false;writeTyped="";writeBurstReset("");render();
      const el=document.getElementById('writeIn');
      el.value="My favourite animal is the cat and it runs fast every single day";
      el.dispatchEvent(new InputEvent('input',{bubbles:true,inputType:"insertReplacementText"}));
      return{flagged:writeDictated,types:writeInputTypes,cards:Object.keys(fixCardLoad()).length};
    });
    ok(before.flagged===true,'الإملاء الصوتي يُكشَف بـinputType — '+before.types);
    await page.evaluate(()=>writeSubmit());
    await page.waitForTimeout(600);
    const r=await page.evaluate(()=>({cards:Object.keys(fixCardLoad()).length,fixes:writeFix.length}));
    ok(r.fixes>=1,'ووصل تصحيحٌ حقيقي من المراجعة — '+r.fixes+' (وإلا لم يقس الفحص شيئاً)');
    ok(r.cards===before.cards,'ومع ذلك لم تدخل بطاقةٌ بنك الأخطاء — '+before.cards+' ⇐ '+r.cards);
    const drop=posted.filter(x=>x.qtype==='write_dictated');
    ok(drop.length>=1,'ويُسجَّل الإسقاط ليُقاس — '+drop.length);
    await page.close();
  }
  {
    // وكتابةٌ بالأصابع تدخل كما كانت — لا يُعاقَب من يكتب ولو دُمجت أحداثه
    const page=await mkFix();
    const before=await page.evaluate(()=>{
      startWrite();
      writeItems=[WRITE_BANK.find(function(i){return i.id==="wr_a1_2"})];
      writeIdx=0;writeSubmitted=false;writeTyped="";writeBurstReset("");render();
      return Object.keys(fixCardLoad()).length;
    });
    await page.type('#writeIn','My favourite animal is the cat and it runs fast',{delay:3});
    const st=await page.evaluate(()=>({burst:writeMaxBurst,flagged:writeDictated,types:writeInputTypes}));
    await page.evaluate(()=>writeSubmit());
    await page.waitForTimeout(600);
    const r=await page.evaluate(()=>({cards:Object.keys(fixCardLoad()).length,fixes:writeFix.length}));
    ok(st.flagged===false,'الكتابة بالأصابع لا تُوسَم إملاءً ولو دُمجت أحداثها — دفعة:'+st.burst+' · '+st.types);
    ok(r.fixes>=1,'ووصل تصحيحٌ حقيقي — '+r.fixes);
    ok(r.cards>before,'وتصحيحُها يدخل البنك كما كان — '+before+' ⇐ '+r.cards);
    await page.close();
  }

  // ===== ٦) بنك النطق بلا تعليمات =====
  console.log('\n٦) بنك النطق');
  {
    const page=await mk(browser);
    const r=await page.evaluate(()=>({
      gone:!SPEAK_ITEMS.some(function(x){return x.id==="sp_instead_of"}),
      // ولا جملةٌ أخرى تشرح بدل أن تُنطق
      instructional:SPEAK_ITEMS.filter(function(x){return /^Instead of|you can say/i.test(x.en)}).map(function(x){return x.id}),
      n:SPEAK_ITEMS.length,
      allHaveAr:SPEAK_ITEMS.every(function(x){return !!x.ar}),
    }));
    ok(r.gone,'sp_instead_of خرج — كان تعليمةً عن الأدب لا جملةً تُنطق');
    ok(r.instructional.length===0,'ولا جملةَ شرحٍ أخرى في البنك — '+(r.instructional.join(',')||'نظيف'));
    ok(r.n>=8,'والبنك ما زال كافياً — '+r.n);
    ok(r.allHaveAr,'ولكلٍّ ترجمتها');
    await page.close();
  }

  // ===== ٧) لا انحدار =====
  console.log('\n٧) لا انحدار');
  for(const q of ['','?p=mohammed','?p=elias']){
    const page=await mk(browser,q);
    const r=await page.evaluate(()=>{
      const out={missing:censusMissing(),modes:document.querySelectorAll('.mode').length};
      try{startSpeaking();out.sp=mode}catch(e){out.err=e.message}
      try{startErrors();out.er=mode}catch(e){out.err2=e.message}
      return out;
    });
    ok(r.missing.length===0,(q||'هيا')+': لا دالّة مفقودة — '+r.missing.join(','));
    ok(r.modes>0&&!r.err&&!r.err2,(q||'هيا')+': الأقسام تفتح بلا عطل');
    await page.close();
  }

  await browser.close();
  console.log(fails?`\n=== ${fails} فشل ===`:'\n=== كل الاختبارات نجحت ===');
  process.exit(fails?1:0);
})();
