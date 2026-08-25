// تجميد ما فوق المستوى بدرجتين، وبوّابة تسرّعٍ للقواعد والمفردات — ٢٢ أغسطس
//
// بياناتٌ حيّة قاطعة: ثمانية عناصر B1 عُرضت على هيا (A1) ٩٣ مرّة منذ ٥ أغسطس بـ٢٤
// صواباً (٢٦٪ — تحت التخمين من أربعة خيارات). وu3_g3 وحدها ١٦ مرّة بثلاث إصابات.
// والسبب: engLevelOk كانت تُطبَّق على حلقة «الجديد» وحدها، فما دخل مخزون التباعد
// عاد إلى الأبد بلا فحص مستوى — وخطؤها يُقرّب موعده فيعود أسرع.
const {chromium}=require('/opt/node22/lib/node_modules/playwright');
const BASE='http://localhost:8931/index.html';
let fails=0;
function ok(c,m){console.log((c?'  ✓ ':'  ✗ FAIL ')+m);if(!c)fails++}
async function mk(browser){
  const page=await browser.newPage();
  page.on('pageerror',e=>{console.log('  ! pageerror:',e.message);fails++});
  await page.route('**/functions/v1/tutor',r=>r.fulfill({status:200,contentType:'application/json',body:'{}'}));
  await page.route('**/rest/v1/**',r=>r.fulfill({status:201,contentType:'application/json',body:'[]'}));
  await page.goto(BASE,{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>typeof window.render==='function',{timeout:15000});
  await page.evaluate(()=>localStorage.clear());
  return page;
}
// عناصر الفخّ الحقيقية من سجلّها هي — لا عناصر مخترعة للاختبار
const TRAP=['u3_g1','u3_g2','u3_g3','u7_g3','u7_g4','u2_g1','u2_g2'];

(async()=>{
  const browser=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'});

  // ===== ١) تصنيف العناصر الحقيقية =====
  console.log('\n١) العناصر التي أخطأتها ١٨ يوماً — تصنيفها');
  {
    const page=await mk(browser);
    const r=await page.evaluate(t=>{
      const pool=engPool();
      const info={};
      t.forEach(function(id){
        const it=pool.filter(function(x){return x.id===id})[0];
        info[id]=it?{lesson:it.lesson,lv:ENG_LESSON_LV[it.lesson]||null,
                     a1ok:engLevelOk(it,"A1"),frozenA1:engFrozen(it,"A1"),
                     frozenB1:engFrozen(it,"B1")}:null;
      });
      return info;
    },TRAP);
    TRAP.forEach(function(id){
      const v=r[id];
      ok(!!v,id+': موجودٌ في المخزون');
      if(v){
        ok(v.lv==='B1',id+': مصنّفٌ B1 ('+v.lesson+' · '+v.lv+')');
        ok(v.frozenA1===true,id+': يُجمَّد عن A1');
        ok(v.frozenB1===false,id+': ويعود لو صارت B1 — تجميدٌ لا حذف');
      }
    });
    await page.close();
  }

  // ===== ٢) A2 يبقى: i+1 مسموح، والتجميد على +٢ فأكثر =====
  console.log('\n٢) i+1 مسموحٌ كما كان');
  {
    const page=await mk(browser);
    const r=await page.evaluate(()=>{
      const pool=engPool();
      const few=pool.filter(function(x){return x.id==='u2_g4'})[0];
      const anyA2=pool.filter(function(x){return x.t==='grammar'&&ENG_LESSON_LV[x.lesson]==='A2'});
      const anyVocab=pool.filter(function(x){return x.t==='vocab'}).slice(0,5);
      return{fewLv:few?ENG_LESSON_LV[few.lesson]:null,
             fewFrozen:few?engFrozen(few,"A1"):null,
             a2AllOk:anyA2.every(function(x){return !engFrozen(x,"A1")}),a2n:anyA2.length,
             vocabOk:anyVocab.every(function(x){return !engFrozen(x,"A1")})};
    });
    ok(r.fewLv==='A2','«a few / a little» مصنّفٌ A2 — '+r.fewLv);
    ok(r.fewFrozen===false,'ولا يُجمَّد عن A1: درجةٌ واحدة أعلى مسموحة (Krashen i+1)');
    ok(r.a2AllOk,'ولا عنصرَ A2 يُجمَّد إطلاقاً — '+r.a2n+' عنصراً');
    ok(r.vocabOk,'والمفردات لا تُقاس بهذا المعيار (لا تصنيف نحويّ لها)');
    await page.close();
  }

  // ===== ٣) الفخّ نفسه: مستحقٌّ وله سجلّ خطأ — وكان يمرّ قبل اليوم =====
  console.log('\n٣) المستحقّ لم يعد يمرّ');
  {
    const page=await mk(browser);
    const r=await page.evaluate(t=>{
      // نُحاكي حالتها بالضبط: سجلّ تباعدٍ مستحقٌّ اليوم + سجلّ خطأٍ حقيقي
      const today=srsToday(),srs={},err={};
      t.forEach(function(id){srs[id]={box:1,due:today-1,seen:9,s:1,d:6,last:today-1};
                             err[id]={wrong:6,last:"خطأ"}});
      lsSet(SRS_KEY,JSON.stringify(srs));
      lsSet(ITEM_ERR_KEY,JSON.stringify(err));
      _engPool=null;
      const plan=buildDailyPlan();
      const ids=plan.items.map(function(i){return i.id});
      // تأكيدٌ أن البذرة وصلت فعلاً: لولا هذا لمرّ الفحص لسببٍ خاطئ (المفتاح كان
      // mawhiba_eng_srs_v1 لا mawhiba_eng_srs، فلم تكن العناصر مستحقّةً أصلاً).
      const st=srsLoad();
      return{leaked:t.filter(function(id){return ids.indexOf(id)>=0}),
             total:plan.items.length,
             seeded:t.filter(function(id){return st[id]&&st[id].due<=today}).length,
             stuckStill:t.filter(function(id){return itemStuck(id)}).length};
    },TRAP);
    ok(r.seeded===TRAP.length,'البذرة وصلت: السبعة مستحقّةٌ فعلاً — '+r.seeded+' من '+TRAP.length);
    ok(r.leaked.length===0,'ولا عنصرَ B1 يدخل الخطّة رغم أنه مستحقٌّ وله سجلّ خطأ — '+r.leaked.join(','));
    ok(r.total>0,'والخطّة تُبنى ولا تخوى — '+r.total+' عنصراً');
    ok(r.stuckStill===TRAP.length,'وسجلّ الخطأ باقٍ كما هو (تجميدٌ لا محو) — '+r.stuckStill);
    await page.close();
  }
  {
    // ولو صارت B1 عادت بتاريخها
    const page=await mk(browser);
    const r=await page.evaluate(t=>{
      const today=srsToday(),srs={};
      t.forEach(function(id){srs[id]={box:1,due:today-1,seen:9,s:1,d:6,last:today-1}});
      lsSet(SRS_KEY,JSON.stringify(srs));
      _engPool=null;
      const pool=engPool().filter(function(x){return t.indexOf(x.id)>=0});
      return{backAtB1:pool.filter(function(x){return !engFrozen(x,"B1")}).length,n:pool.length};
    },TRAP);
    ok(r.backAtB1===r.n,'وترتفع بارتفاع مستواها المقاس — '+r.backAtB1+' من '+r.n);
    await page.close();
  }

  // ===== ٣ب) الخطّة لا تجوع نوعاً — كشفه فشلٌ حقيقي لا حدس =====
  // إضافة تسع مفردات (أيّام الأسبوع) قلبت خطّة A1 كاملةً إلى ٢٣ مفردة و٢ إملاء و**صفر
  // قواعد وصفر قراءة**: الالتقاط كان بترتيب المخزون، والمخزون مرتَّبٌ بالوحدات (عشر
  // مفردات ثم قواعدها)، فامتلأ السقف مفرداتٍ قبل أن يبلغ قاعدةً واحدة — وزاد الأمرَ أن
  // فحص المستوى صار يتخطّى قواعد B1 فيملأ مكانها مفردات. فصار الالتقاط يتشابك كالعرض.
  console.log('\n٣ب) الخطّة تتشابك في الاختيار لا في العرض وحده');
  {
    const page=await mk(browser);
    const r=await page.evaluate(()=>{
      localStorage.clear();_engPool=null;
      const plan=buildDailyPlan();
      const by={};plan.items.forEach(function(i){by[i.t]=(by[i.t]||0)+1});
      return{by:by,n:plan.items.length,
             types:Object.keys(by).filter(function(t){return t!=="lesson"}),
             maxShare:Math.max.apply(null,Object.keys(by).filter(function(t){return t!=="lesson"})
               .map(function(t){return by[t]}))/plan.items.length};
    });
    ok(r.by.grammar>0,'قواعدُ في خطّة A1 — كانت صفراً '+JSON.stringify(r.by));
    ok(r.by.reading>0,'وقراءة — كانت صفراً');
    ok(r.by.vocab>0,'ومفردات');
    ok(r.by.build>0,'وبناءُ جملة — وكان يُختار ثم يُسقَط صامتاً لغيابه من ترتيب التوزيع');
    ok(r.maxShare<0.5,'ولا نوعَ يبتلع نصف الخطّة — أكبر حصّة '+Math.round(r.maxShare*100)+'٪');
    await page.close();
  }

  // ===== ٤) بوّابة التسرّع في القواعد والمفردات =====
  console.log('\n٤) البوّابة تشمل القواعد والمفردات');
  {
    const page=await mk(browser);
    const r=await page.evaluate(()=>({
      gram:planGateSecondsFor({t:"grammar",q:"اختاري الصحيح: \"She ___ to school every day.\"",c:["go","goes","going","gone"]}),
      vocab:planGateSecondsFor({t:"vocab",q:"ما معنى kitchen؟",c:["مطبخ","حديقة","مدرسة","سيارة"]}),
      read:planGateSecondsFor({t:"reading",passage:new Array(60).fill("word").join(" "),q:"Q?"}),
      build:planGateSecondsFor({t:"build",s:"I go to school."}),
      dict:planGateSecondsFor({t:"dict",w:"cat"}),
      cfg:ENG_GATE,
    }));
    ok(r.gram>=3&&r.gram<=6,'القواعد لها أرضيّة داخل المدى — '+r.gram+'ث');
    ok(r.vocab>=2&&r.vocab<=5,'والمفردات كذلك — '+r.vocab+'ث');
    ok(r.gram<r.read,'وأقصر من بوّابة القراءة — الجملة ليست فقرة');
    ok(r.read>=15,'والقراءة كما كانت بلا مساس — '+r.read+'ث');
    ok(r.build===0&&r.dict===0,'والبناء والإملاء بلا بوّابة (كتابةٌ لا اختيار)');
    await page.close();
  }
  {
    // منعٌ فعليّ: الخيارات لا تُرسم أصلاً قبل انقضاء الزمن
    const page=await mk(browser);
    const r=await page.evaluate(()=>{
      startEngPlan();
      let guard=0;
      while(planCur()&&planCur().t!=="grammar"&&guard++<60){
        if(planCur().t==="lesson")planLessonDone();else{planLocked=true;planNext()}
      }
      if(!planCur()||planCur().t!=="grammar")return{reached:false};
      render();
      const before=app.innerHTML;
      const shown=document.querySelectorAll('.choices .choice').length;
      planChoose(0);
      const locked=planLocked;
      planGateLeft=0;planGateStop();render();
      const after=document.querySelectorAll('.choices .choice').length;
      return{reached:true,secs:planGateSecs,shown:shown,locked:locked,after:after,
             bar:before.indexOf("الخيارات ستظهر بعد")>=0,
             wording:before.indexOf("اقرئي الجملة بتمهّل")>=0};
    });
    ok(r.reached,'بُلغ عنصرُ قواعدٍ في خطّةٍ حقيقية');
    if(r.reached){
      ok(r.secs>=3&&r.secs<=6,'وله بوّابة داخل المدى — '+r.secs+'ث');
      ok(r.shown===0,'والخيارات لا تُرسم قبل انقضائها');
      ok(r.locked===false,'والنقرة قبلها لا تُحتسب إجابة');
      ok(r.bar&&r.wording,'وشريط العدّ ظاهرٌ بصياغةٍ تناسب الجملة لا النصّ');
      ok(r.after>0,'والخيارات تظهر بانقضاء الزمن');
    }
    await page.close();
  }

  // ===== ٥) لا انحدار =====
  console.log('\n٥) لا انحدار');
  for(const q of ['','?p=mohammed','?p=elias']){
    const page=await browser.newPage();
    page.on('pageerror',e=>{console.log('  ! pageerror:',e.message);fails++});
    await page.route('**/rest/v1/**',r=>r.fulfill({status:201,body:'[]'}));
    await page.goto(BASE+q,{waitUntil:'domcontentloaded'});
    await page.waitForFunction(()=>typeof window.render==='function',{timeout:15000});
    const r=await page.evaluate(()=>({missing:censusMissing(),modes:document.querySelectorAll('.mode').length}));
    ok(r.missing.length===0,(q||'هيا')+': لا دالّة مفقودة — '+r.missing.join(','));
    ok(r.modes>0,(q||'هيا')+': الصفحة تُرسم');
    await page.close();
  }

  await browser.close();
  console.log(fails?`\n=== ${fails} فشل ===`:'\n=== كل الاختبارات نجحت ===');
  process.exit(fails?1:0);
})();
