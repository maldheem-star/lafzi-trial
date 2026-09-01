// خمسة علاجاتٍ لمشكلاتٍ حقيقية عند إلياس (١ سبتمبر):
// ١) تكرار الخطأ نفسه في القواعد (gram) — تذكيرٌ يُسلَّح بـshapeArmed لكل عنصر.
// ٢) ضعف الترتيب في STEP (٦٠٪) — تلميح منهجٍ عامّ يُسلَّح على النوع.
// ٣) الأصوات الضعيفة تتراكم عبر الجلسات لا داخلها وحدها.
// ٤/٥) فخّ «رقمان متقاربان» في الاستماع، وضعف الاستنتاج في المقروء — تمييز جملة الدليل بعد القفل.
const {chromium}=require('/opt/node22/lib/node_modules/playwright');
const BASE='http://localhost:8931/index.html';
let fails=0;
function ok(c,m){console.log((c?'  ✓ ':'  ✗ FAIL ')+m);if(!c)fails++}
async function mk(browser){
  const page=await browser.newPage();
  page.on('pageerror',e=>{console.log('  ! pageerror:',e.message);fails++});
  await page.route('**/rest/v1/**',r=>r.fulfill({status:201,contentType:'application/json',body:'[]'}));
  await page.route('**/functions/v1/**',r=>r.fulfill({status:200,contentType:'application/json',body:'{}'}));
  await page.goto(BASE,{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>typeof window.render==='function',{timeout:15000});
  await page.evaluate(()=>localStorage.clear());
  return page;
}

(async()=>{
  const browser=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'});

  // ===== ١) تكرار خطأ القواعد =====
  console.log('\n١) تذكير القواعد المتكرّرة');
  {
    const page=await mk(browser);
    const r=await page.evaluate(()=>{
      const out={};
      out.notArmedAtStart=shapeArmed("gram:zzz_test");
      shapeRecord("gram:zzz_test",true);   // خطأ أوّل
      out.armedAfterOne=shapeArmed("gram:zzz_test");
      shapeRecord("gram:zzz_test",true);   // خطأ ثانٍ
      out.armedAfterTwo=shapeArmed("gram:zzz_test");
      shapeRecord("gram:zzz_test",false);  // صواب: يتراجع
      out.afterCorrect=shapeArmed("gram:zzz_test");
      return out;
    });
    ok(r.notArmedAtStart===false,'غير مسلَّحة قبل أي خطأ');
    ok(r.armedAfterOne===false,'زلّةٌ واحدة لا تُسلِّح (SHAPE_ARM=2)');
    ok(r.armedAfterTwo===true,'خطآن على نفس العنصر يُسلِّحان');
    ok(r.afterCorrect===false,'وصوابٌ تالٍ يُريح البوّابة');

    // جولة حقيقية: نفس عنصر gram يُخطأ مرّتين فيظهر التذكير قبل الاختيار الثالث
    const r2=await page.evaluate(()=>{
      gramItems=[{id:"zzz_gram_it",lv:"A2",c:[
        {t:"right one",ok:true,why:"قاعدةٌ تجريبية للاختبار"},
        {t:"wrong one",ok:false,why:"خطأ"},
        {t:"wrong two",ok:false,why:"خطأ"},
        {t:"wrong three",ok:false,why:"خطأ"}]}];
      gramIdx=0;gramScore=0;gramDone=false;mode="gram";gramSetupRound();
      gateLeft=0;gateStop();
      const wrongIdx=gramItems[0].c.findIndex(c=>!c.ok);
      gramChoose(wrongIdx);
      render();
      const afterFirst=app.innerHTML.indexOf('أخطأتِ هذا السؤال من قبل')>=0;
      gramSetupRound();gateLeft=0;gateStop();
      gramChoose(wrongIdx);
      render();
      const afterSecond=app.innerHTML.indexOf('أخطأتِ هذا السؤال من قبل')>=0;
      // الجولة الثالثة: التذكير يظهر قبل الاختيار (armed من الجولتين السابقتين)
      gramSetupRound();gateLeft=0;gateStop();render();
      const hintBeforeThird=app.innerHTML.indexOf('أخطأتِ هذا السؤال من قبل')>=0;
      return{afterFirst,afterSecond,hintBeforeThird};
    });
    ok(r2.afterFirst===false,'خطأٌ أوّل: لا تذكير بعد (لم يُسلَّح بعد)');
    ok(r2.hintBeforeThird===true,'وبعد خطأين: التذكير يظهر قبل الاختيار الثالث فعلاً');
    await page.close();
  }

  // ===== ٢) تلميح منهج ترتيب STEP =====
  console.log('\n٢) تلميح منهج ترتيب STEP');
  {
    const page=await mk(browser);
    const r=await page.evaluate(()=>{
      shapeRecord("step:order",true);shapeRecord("step:order",true);
      return shapeArmed("step:order");
    });
    ok(r===true,'خطآن في نوع order يُسلِّحان (على النوع لا العنصر)');
    const r2=await page.evaluate(()=>{
      const it=STEP_BANK.find(x=>x.type==="order");
      stepItems=[it];stepIdx=0;stepScore=0;stepDone=false;mode="step";stepSetupRound();
      gateLeft=0;gateStop();render();
      return app.innerHTML.indexOf('رأس الفقرة')>=0;
    });
    ok(r2===true,'وصندوق المنهج العامّ يظهر قبل بلاطات الترتيب حين مُسلَّح');
    await page.close();
  }

  // ===== ٣) تراكم الأصوات الضعيفة =====
  console.log('\n٣) الأصوات الضعيفة تتراكم عبر الجلسات');
  {
    const page=await mk(browser);
    const r=await page.evaluate(()=>{
      const out={};
      out.emptyAtStart=pronWeakPersistedTop([])===null;
      // ٦ صفوف "r" ضعيفة في كلمتين مختلفتين — يعبر شرط WEAK_MIN_WORDS ون=٦
      for(let i=0;i<6;i++){
        pronWeakRecord([{p:"r",score:40,w:(i%2?"red":"car")}],70);
      }
      const top=pronWeakPersistedTop([]);
      out.topIsR=top&&top.p==="r";
      out.nIsSix=top&&top.n===6;
      // استبعادُ صوتٍ ظهر في ملخّص اليوم نفسه
      out.excludedWhenInToday=pronWeakPersistedTop(["r"])===null;
      // أقلّ من ٦ لا يُسلَّح
      pronWeakSave({});
      for(let i=0;i<3;i++)pronWeakRecord([{p:"s",score:40,w:"see"}],70);
      out.underThresholdNull=pronWeakPersistedTop([])===null;
      return out;
    });
    ok(r.emptyAtStart,'لا شيء متراكمٌ قبل أي تسجيل');
    ok(r.topIsR,'الصوت الأضعف تراكمياً هو r كما سُجِّل');
    ok(r.nIsSix,'وعدده يتراكم عبر النداءات الستّة');
    ok(r.excludedWhenInToday,'ويُستبعَد إن كان أصلاً في ملخّص اليوم — لا تكرار عرض');
    ok(r.underThresholdNull,'وأقلّ من ستّ مرّاتٍ لا يُعرَض بعد (لا بلاغٌ كاذبٌ مبكرّ)');
    await page.close();
  }

  // ===== ٤/٥) تمييز جملة الدليل =====
  console.log('\n٤/٥) تمييز جملة الدليل بعد القفل');
  {
    const page=await mk(browser);
    const r=await page.evaluate(()=>{
      const text="A: Can I work on Saturdays? B: No, we are closed on weekends, but you can start on Monday at nine.";
      const s=evidenceSentence(text,"On Monday");
      return{sentence:s,contains:s.indexOf("Monday")>=0,
        bold:boldEvidence(text,s).indexOf("<b")>=0};
    });
    ok(r.contains,'تُحدَّد الجملة الحاوية للجواب الصحيح فعلاً — '+JSON.stringify(r.sentence));
    ok(r.bold,'وتُبرَز بوسمٍ داخل النصّ');

    // القراءة: الجملة تُبرَز داخل الفقرة المرئية أصلاً بعد القفل، لا قبله
    const r2=await page.evaluate(()=>{
      const it=READ_BANK[0];
      readItems=[it];readIdx=0;readScore=0;readDone=false;mode="read";
      readShownAt=Date.now();readPicked=-1;readLocked=false;
      secGateStart("read",it.passage);gateLeft=0;gateStop();render();
      const beforeHasBold=app.innerHTML.indexOf('<b style="background:#FEF3C7')>=0;
      readChoose(it.a);render();
      const afterHasBold=app.innerHTML.indexOf('<b style="background:#FEF3C7')>=0;
      return{beforeHasBold,afterHasBold};
    });
    ok(r2.beforeHasBold===false,'لا تمييز قبل الإجابة (الفقرة نصّها العادي)');
    ok(r2.afterHasBold===true,'وبعد القفل: جملة الدليل مُبرَزة داخل الفقرة نفسها');

    // الاستماع: النصّ المسموع يظهر الآن نصّاً بعد القفل فقط، مع تمييز جملة الدليل
    const r3=await page.evaluate(()=>{
      const it=LISTEN_BANK.find(x=>x.audio&&x.audio.split(/[.!?]/).length>2)||LISTEN_BANK[0];
      listenItems=[it];listenIdx=0;listenScore=0;listenDone=false;mode="listen";
      listenShownAt=Date.now();listenPicked=-1;listenLocked=false;listenPlays=1;
      secGateStart("listen",it.audio);gateLeft=0;gateStop();render();
      const beforeShowsAudio=app.innerHTML.indexOf(it.audio.slice(0,15))>=0;
      listenChoose(it.a);render();
      const afterShowsAudio=app.innerHTML.indexOf(esc(it.audio.slice(0,15)))>=0||app.innerHTML.indexOf(it.audio.slice(0,15))>=0;
      return{beforeShowsAudio,afterShowsAudio};
    });
    ok(r3.beforeShowsAudio===false,'النصّ المسموع لا يظهر قبل الإجابة — الصوت وحده كما كان');
    ok(r3.afterShowsAudio===true,'ويظهر بعد القفل فقط، فالمعنى يصل ولو أخطأ الفهم السمعي');
    await page.close();
  }

  // ===== ٦) لا انحدار =====
  console.log('\n٦) لا انحدار');
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
