// قسم رياضيات الصف السادس — ٢٢ أغسطس
// الفاحص الرياضيّ (staging/check_math6.js) يُثبت صحّة الأسئلة نفسها بـ٢٧٢ فحصاً.
// وهذا يفحص ما لا يفحصه ذاك: أن القسم **يعمل داخل التطبيق** — جلسةٌ كاملة بنقراتٍ
// حقيقية، وتسجيلٌ يصل، وتباعدٌ يُكتب، وبوّابةُ تسرّعٍ تمنع، وأنه لا يظهر لغير هيا.
const {chromium}=require('/opt/node22/lib/node_modules/playwright');
const BASE='http://localhost:8931/index.html';
let fails=0;
function ok(c,m){console.log((c?'  ✓ ':'  ✗ FAIL ')+m);if(!c)fails++}
async function mk(browser,q){
  const page=await browser.newPage();
  page.on('pageerror',e=>{console.log('  ! pageerror:',e.message);fails++});
  await page.route('**/functions/v1/tutor',r=>r.fulfill({status:200,contentType:'application/json',body:'{}'}));
  await page.route('**/rest/v1/**',r=>r.fulfill({status:201,contentType:'application/json',body:'[]'}));
  await page.goto(BASE+(q||''),{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>typeof window.render==='function',{timeout:15000});
  await page.evaluate(()=>localStorage.clear());
  return page;
}
const openGate=page=>page.evaluate(()=>{gateLeft=0;gateStop();render()});

(async()=>{
  const browser=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'});

  // ===== ١) الفهرس والمولّدات وصلت التطبيق سليمةً =====
  console.log('\n١) الفهرس داخل التطبيق');
  {
    const page=await mk(browser);
    const r=await page.evaluate(()=>({
      chapters:MATH6_PLAN.length,
      lessons:math6Lessons().length,
      ready:math6Ready().length,
      pool:math6Pool().length,
      perCh:MATH6_PLAN.map(c=>c.lessons.length),
      pages:math6Lessons().every(l=>l.p>0),
      skills:math6Lessons().every(l=>!!l.sk),
      prep:!!MATH6_PREP[1],
    }));
    ok(r.chapters===5,'خمسة فصول — '+r.chapters);
    ok(JSON.stringify(r.perCh)==='[8,5,10,8,4]','عدد دروس كل فصلٍ كما في الفهرس — '+r.perCh.join('،'));
    ok(r.lessons===35,'خمسةٌ وثلاثون درساً — '+r.lessons);
    ok(r.ready>=28,'أغلبها له مولّد — '+r.ready);
    ok(r.pool===r.ready+4,'والتهيئة تدخل المخزون (٤ مهارات) — '+r.pool);
    ok(r.pages&&r.skills,'لكل درسٍ صفحته ومهارته');
    ok(r.prep,'التهيئة موجودة');
    await page.close();
  }

  // ===== ٢) كل مولّدٍ يُنتج سؤالاً سليماً داخل المتصفّح لا في node وحده =====
  console.log('\n٢) المولّدات تعمل في المتصفّح');
  {
    const page=await mk(browser);
    const r=await page.evaluate(()=>{
      const bad=[],latin=[],dup=[];
      math6Pool().forEach(function(l){
        for(let i=0;i<40;i++){
          const it=l.gen();
          if(!it||!it.c||it.c.length!==4||!(it.a>=0&&it.a<4)||!it.w)bad.push(l.id);
          if(/[0-9]/.test(it.q)||it.c.some(c=>/[0-9]/.test(c)))latin.push(l.id);
          if(new Set(it.c).size!==4)dup.push(l.id);
        }
      });
      return{bad:Array.from(new Set(bad)),latin:Array.from(new Set(latin)),dup:Array.from(new Set(dup))};
    });
    ok(r.bad.length===0,'لا مولّدَ معطوباً — '+r.bad.join(','));
    ok(r.latin.length===0,'لا أرقام لاتينية — '+r.latin.join(','));
    ok(r.dup.length===0,'لا خيارَ مكرّراً — '+r.dup.join(','));
    await page.close();
  }

  // ===== ٣) جلسةٌ كاملة بنقراتٍ حقيقية =====
  console.log('\n٣) جلسة كاملة');
  {
    const page=await mk(browser);
    const posted=[];
    await page.route('**/rest/v1/mawhiba_answer_log**',r=>{
      try{posted.push(JSON.parse(r.request().postData()||'{}'))}catch(e){}
      r.fulfill({status:201,body:''});
    });
    await page.evaluate(()=>startMath6());
    await page.waitForTimeout(200);
    const n=await page.evaluate(()=>math6Items.length);
    ok(n>=5,'الجلسة لا تقلّ عن خمسة (قاعدة ١٨ أغسطس) — '+n);
    const firstQ=await page.evaluate(()=>math6Cur().q);
    for(let i=0;i<n;i++){
      await openGate(page);
      // نختار الصواب دائماً ليُقاس أن الدرجة تُحتسب فعلاً
      await page.evaluate(()=>{const a=math6Cur().a;document.querySelectorAll('.choice')[a].click()});
      await page.waitForTimeout(60);
      const st=await page.evaluate(()=>({locked:math6Locked,why:app.innerHTML.indexOf('افهم')>=0||app.innerHTML.indexOf('⇒')>=0}));
      if(i===0)ok(st.locked,'النقرة تُحتسب بعد انفتاح البوّابة');
      await page.evaluate(()=>{if(!math6Done)math6Next()});
      await page.waitForTimeout(60);
    }
    const end=await page.evaluate(()=>({done:math6Done,score:math6Score,total:math6Items.length,html:app.innerHTML}));
    ok(end.done===true,'الجلسة تنتهي طبيعياً');
    ok(end.score===end.total,'كل الإجابات الصحيحة احتُسبت — '+end.score+'/'+end.total);
    ok(/جلسة أخرى/.test(end.html),'وشاشة النتيجة تُرسم');
    ok(/✅/.test(end.html),'وتفصّل النتيجة بالدرس لا بالمجموع وحده');
    await page.waitForTimeout(200);
    const mine=posted.filter(x=>x.domain==='math6');
    ok(mine.length===n,'سطرُ تسجيلٍ لكل سؤال — '+mine.length+' من '+n);
    ok(mine.every(x=>x.q_text&&x.q_text.length>10),'ومعه نصّ السؤال — بلاه لا تشخيص');
    ok(mine.every(x=>/الخيارات:/.test(x.q_text||'')),'والخيارات بمواضعها وموضعُ الصواب موسوم');
    ok(mine.every(x=>x.item_id&&/^m/.test(x.item_id)),'ومعرّف الدرس');
    ok(mine.every(x=>x.elapsed_ms>0),'وزمن الإجابة');
    ok(new Set(mine.map(x=>x.qtype)).size===n,'ولكل درسٍ qtype خاصّ به — يُجمَّع بالاستعلام');
    ok(firstQ!==await page.evaluate(()=>math6Items[0].q)===false,'سؤال الجلسة ثابتٌ لا يتغيّر مع إعادة الرسم');
    await page.close();
  }

  // ===== ٤) بوّابة التسرّع تمنع النقر الأعمى =====
  console.log('\n٤) بوّابة التسرّع');
  {
    const page=await mk(browser);
    await page.evaluate(()=>startMath6());
    await page.waitForTimeout(150);
    const before=await page.evaluate(()=>({secs:gateSecs,open:gateOpen(),cap:SEC_GATE_MAX.math6,floor:SEC_GATE_FLOOR.math6}));
    await page.evaluate(()=>{const b=document.querySelectorAll('.choice');if(b.length)b[0].click()});
    await page.waitForTimeout(80);
    const after=await page.evaluate(()=>({locked:math6Locked,disabled:!!document.querySelector('.choice[disabled]')}));
    ok(before.floor>=3&&before.cap<=12,'الأرضيّة والسقف داخل المدى المقصود — '+before.floor+'-'+before.cap);
    ok(before.secs>0&&!before.open,'مسلَّحة عند العرض — '+before.secs+'ث');
    ok(after.locked===false,'والنقرة الفورية لا تُحتسب إجابة');
    ok(after.disabled,'والأزرار معطَّلة بصرياً');
    await page.close();
  }

  // ===== ٥) التباعد يُكتب فعلاً، والمستحقّ يعود =====
  console.log('\n٥) التباعد');
  {
    const page=await mk(browser);
    const r=await page.evaluate(()=>{
      startMath6();
      const ids=math6Items.map(x=>x._l.id);
      math6Items.forEach(function(it){math6SrsUpdate(it._l.id,true)});
      const st=math6SrsLoad();
      return{ids:ids,written:ids.filter(i=>!!st[i]).length,
             due:ids.map(i=>st[i].due),today:srsToday()};
    });
    ok(r.written===r.ids.length,'سجلّ تباعدٍ لكل درسٍ أُجيب — '+r.written);
    ok(r.due.every(d=>d>r.today),'ومواعيدها في المستقبل لا اليوم');
    await page.close();
  }
  {
    // لا يُعرَض ما لا مولّد له
    const page=await mk(browser);
    const r=await page.evaluate(()=>{
      const noGen=math6Lessons().filter(l=>!l.gen).map(l=>l.no);
      const pool=math6Pool().map(l=>l.no);
      return{noGen:noGen,leaked:noGen.filter(n=>pool.indexOf(n)>=0)};
    });
    ok(r.noGen.length===7,'سبعة دروسٍ تنتظر بقيّة الكتاب — '+r.noGen.join('،'));
    ok(r.leaked.length===0,'ولا يدخل المخزونَ درسٌ بلا مولّد');
    await page.close();
  }

  // ===== ٦) لا انحدار، والقسم لهيا وحدها =====
  console.log('\n٦) لا انحدار');
  for(const q of ['','?p=mohammed','?p=elias']){
    const page=await mk(browser,q);
    await page.evaluate(()=>render());
    const r=await page.evaluate(()=>({
      missing:censusMissing(),
      modes:document.querySelectorAll('.mode').length,
      hasMath:app.innerHTML.indexOf('رياضيات الصف السادس')>=0,
    }));
    ok(r.missing.length===0,(q||'هيا')+': لا دالّة مفقودة — '+r.missing.join(','));
    ok(r.modes>0,(q||'هيا')+': الصفحة تُرسم');
    if(!q)ok(r.hasMath,'هيا: زرّ الرياضيات ظاهر');
    else ok(!r.hasMath,(q)+': لا يظهر (صفحة المحادثة فقط)');
    await page.close();
  }

  await browser.close();
  console.log(fails?`\n=== ${fails} فشل ===`:'\n=== كل الاختبارات نجحت ===');
  process.exit(fails?1:0);
})();
