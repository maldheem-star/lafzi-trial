// سقالة الكتابة: معايير نجاح + بناءٌ مشترك + سلّم SRSD + دمج الجمل للمبتدئَين — ٢٤ أغسطس
//
// بياناتٌ حيّة بذرت هذا كلّه (استعلام domain='write' منذ ١٧ أغسطس):
//   · إلياس **صفر محاولة** منذ شُحن القسم — شكواه «لا أفهم المطلوب».
//   · هيا ٣ محاولات في يومٍ واحد ثم توقّفت؛ محمد ٢١/٢٤.
//   · نسخُ نصّ السؤال في خانة الإجابة وقع مرّتين من متعلّمَين مختلفين.
//   · المثال المحلول فُتح مرّةً واحدة من ٢٧ (مثال:0 في ٢٦).
// والأسماء المنشورة: Writing Next (Graham & Perin 2007) لأحجام الأثر، وSRSD
// (Harris & Graham) لسلّم POW، ودورة سيدني (Rothery & Martin) للبناء المشترك،
// وHattie لمعايير النجاح.
const {chromium}=require('/opt/node22/lib/node_modules/playwright');
const BASE='http://localhost:8931/index.html';
let fails=0;
function ok(c,m){console.log((c?'  ✓ ':'  ✗ FAIL ')+m);if(!c)fails++}
async function mk(browser,q){
  const page=await browser.newPage({viewport:{width:420,height:900}});
  page.on('pageerror',e=>{console.log('  ! pageerror:',e.message);fails++});
  await page.route('**/functions/v1/**',r=>r.fulfill({status:200,contentType:'application/json',body:'{"ok":true,"reply":"NONE"}'}));
  await page.route('**/rest/v1/**',r=>r.fulfill({status:201,contentType:'application/json',body:'[]'}));
  await page.goto(BASE+(q||''),{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>typeof window.render==='function',{timeout:15000});
  await page.evaluate(()=>localStorage.clear());
  return page;
}

(async()=>{
  const browser=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'});

  // ===== ١) دمج الجمل بلغ A1/A2 — كان محجوزاً لـB1 وحده =====
  console.log('\n١) الجملة قبل الفقرة للمبتدئَين');
  {
    const page=await mk(browser);
    const r=await page.evaluate(()=>{
      const by={};
      WRITE_BANK.forEach(function(i){
        const k=i.lv+(i.type==="combine"?":combine":":free");
        by[k]=(by[k]||0)+1;
      });
      const a1c=WRITE_BANK.filter(function(i){return i.lv==="A1"&&i.type==="combine"});
      return{by:by,
        a1n:a1c.length,
        a1English:a1c.every(function(i){return !/[؀-ۿ]/.test(i.prompt)}),
        a1Conj:a1c.every(function(i){return /because|and|but|so/i.test(i.prompt)}),
        a1Min:a1c.every(function(i){return i.min>=5&&i.min<=12}),
        ids:new Set(WRITE_BANK.map(function(i){return i.id})).size===WRITE_BANK.length};
    });
    ok(r.by["A1:combine"]>0,'A1 صار له دمجُ جمل — '+JSON.stringify(r.by));
    ok(r.by["A2:combine"]>0,'وA2 كذلك');
    ok(r.by["B1:combine"]>0,'وB1 كما كان — لا انتقاص');
    ok(r.a1Conj,'وكلّها على أدوات Hochman (because/and/but/so)');
    ok(r.a1English,'وإنجليزيةٌ خالصة');
    ok(r.a1Min,'وهدفها جملةٌ قصيرة لا فقرة — '+r.a1n+' عنصراً');
    ok(r.ids,'ولا معرّف مكرّر في البنك');
  }

  // ===== ٢) معايير النجاح عربية وظاهرة ومطابقة للمهمّة =====
  console.log('\n٢) معايير النجاح (Hattie ٠٫٨٨)');
  {
    const page=await mk(browser);
    const r=await page.evaluate(()=>{
      const a1=WRITE_BANK.find(function(i){return i.id==="wr_a1_2"});      // ٣ أسئلة موجَّهة
      const a2=WRITE_BANK.find(function(i){return i.id==="wr_a2_1"});      // ٣ نقاط •
      const b1=WRITE_BANK.find(function(i){return i.id==="wr_b1_1"});      // قصّة حرّة
      const sc=WRITE_BANK.find(function(i){return i.id==="wr_a1_sc1"});    // دمج
      return{
        ptsA1:writePoints(a1),ptsA2:writePoints(a2),ptsB1:writePoints(b1),
        gA2:writeGoals(a2),gB1:writeGoals(b1),gSc:writeGoals(sc),
        critA2:writeCriteria(a2).map(function(c){return c.t}),
        critSc:writeCriteria(sc).map(function(c){return c.t}),
        arabic:writeCriteria(a2).every(function(c){return /[؀-ۿ]/.test(c.t)}),
      };
    });
    ok(r.ptsA1===3,'نقاط A1 تُقرأ من «1) 2) 3)» — '+r.ptsA1);
    ok(r.ptsA2===3,'ونقاط A2 من «•» — '+r.ptsA2);
    ok(r.ptsB1===0,'وB1 بلا نقاطٍ مفروضة — كتابةٌ حرّة');
    // ===== نُقض هذا السطر بالذات في ٣٠ أغسطس، ولم يُدهَس — نفس درس ٢٢ أغسطس =====
    // كان `gA2.sentences===3` (جملةٌ لكل نقطة)، وكُتب حينها تحذيرٌ صريح بجانبه: قد
    // تُغطّى ٣ نقاطٍ في جملتين فتُحسب رسوباً — خطرٌ مفترَض. وفحص جلسة إلياس حوّله
    // إلى واقع: رسالتان بلغتا هدف الكلمات بمسافة وربطتا نقاطهما بأدواتٍ صحيحة في
    // جملةٍ متماسكة واحدة، فسقطتا لعدد الجمل وحده. فأُسقط الشرط: Cambridge A2 Key
    // Part 6 لا تُحصي جمل المتعلّم، وعدّ الجمل آلياً وعدٌ لا نتحقّق منه فعلاً —
    // فالباقي (عدد الكلمات) هو المعيار الوحيد المضمون. والدعوى القديمة صُحِّحت.
    ok(r.gA2.sentences===0,'فA2 صار بلا شرط جمل — لا يُشدَّد بما لا تُتحقّق منه الأداة فعلاً');
    ok(r.gB1.sentences===0,'وB1 بلا شرط جمل — لا يُشدَّد بما لا تنصّ عليه مهمّته');
    ok(r.gSc.sentences===0&&r.gSc.combine===true,'والدمج يُقاس بغير هذا');
    ok(r.arabic,'والمعايير عربيةٌ كلّها — وهي أصل الشكوى');
    ok(r.critA2.join(' ').indexOf('جملةً لكل نقطة')<0,'ولا يُعرض شرطٌ لم يعد يُقاس — '+r.critA2.join(' | '));
    ok(r.critSc.join(' ').indexOf('جملةٌ واحدة')>=0,'ومعيار الدمج ينصّ على جملةٍ واحدة');
  }

  // ===== ٣) البناء المشترك: الجملة الأولى تُكتب ولا تُخفّض المطلوب =====
  console.log('\n٣) البناء المشترك (دورة سيدني)');
  {
    const page=await mk(browser);
    const r=await page.evaluate(()=>{
      const a1=WRITE_BANK.find(function(i){return i.id==="wr_a1_2"});
      const b1=WRITE_BANK.find(function(i){return i.id==="wr_b1_1"});
      const withJoint=writeGoals(a1);
      // الهدف الأصلي + كلمات البادئة = ما تُنتجه هي لم يتغيّر
      return{
        joint:writeJointFor(a1),
        jw:withJoint.jointWords,
        target:withJoint.words,
        base:a1.min,
        b1NoJoint:writeJointFor(b1),
        a1Count:WRITE_BANK.filter(function(i){return i.lv==="A1"&&!i.type}).every(function(i){return !!i.joint}),
        a2Count:WRITE_BANK.filter(function(i){return i.lv==="A2"&&!i.type}).every(function(i){return !!i.joint}),
        // البادئة بنيوية لا معلومة عنها: لا تذكر حيواناً ولا اسماً بعينه
        stemOpen:/^My favourite animal is$/.test(a1.joint||""),
      };
    });
    ok(!!r.joint,'A1 له جملةٌ أولى');
    // الهدف = حدّ المهمّة كما هو، لا يرتفع بكلمات البادئة. أوّل ليلةٍ حيّة (٢٤ أغسطس)
    // أثبتت أن الرفع يُنتج هدفاً **فوق سقف المهمّة المطبوع** («٣٦ كلمة» مقابل
    // «Write 25–35 words») فيستحيل بلوغه ضمن حدودها — ورسب إلياس بذلك مرّتين.
    ok(r.target===r.base,'والهدف حدُّ المهمّة نفسه لا يرتفع بالبادئة ('+r.target+')');
    ok(r.stemOpen,'والبادئة بنيويةٌ مفتوحة لا تضع في فمها معلومة — «'+r.joint+'»');
    ok(r.a1Count&&r.a2Count,'وكل عناصر A1/A2 الحرّة لها بادئة');
    ok(!r.b1NoJoint,'وB1 بلا بادئة — كتابةٌ مستقلّة');
  }

  // ===== ٤) السقالة تتلاشى بالنجاح وتعود بالتعثّر =====
  console.log('\n٤) التلاشي والنزول عند التعثّر');
  {
    const page=await mk(browser);
    const r=await page.evaluate(()=>{
      const out={};
      out.onAtStart=writeScafOn("A1");
      writeScafRecord("A1",true);out.after1=writeScafOn("A1");
      writeScafRecord("A1",true);out.after2=writeScafOn("A1");
      writeScafRecord("A1",true);out.after3=writeScafOn("A1");
      out.otherLevel=writeScafOn("B1");           // مستوًى آخر لا يتأثّر
      writeScafRecord("A1",false);out.afterFail=writeScafOn("A1");
      out.wins=writeScafWins("A1");
      return out;
    });
    ok(r.onAtStart===true,'السقالة تعمل من أوّل يوم');
    ok(r.after1===true&&r.after2===true,'ولا تُطفأ بنجاحٍ أو نجاحين');
    ok(r.after3===false,'وتُطفأ بثلاثة متتالية (WRITE_SCAF_OFF)');
    ok(r.otherLevel===true,'وكل مستوًى على حدة');
    ok(r.afterFail===true&&r.wins===0,'وتعثّرٌ واحد يُعيدها كاملة — النزول عند التعثّر');
  }

  // ===== ٥) جلسةٌ حقيقية بنقرات: النسخ يسقط، والإكمال ينجح =====
  console.log('\n٥) جلسةٌ حقيقية');
  {
    const page=await mk(browser);
    const posted=[];
    await page.route('**/rest/v1/mawhiba_answer_log**',rt=>{
      try{posted.push(JSON.parse(rt.request().postData()||'{}'))}catch(e){}
      rt.fulfill({status:201,body:''});
    });
    await page.evaluate(()=>{
      // نُثبّت عنصراً واحداً معلوماً بدل ما تختاره الخطّة
      startWrite();
      writeItems=[WRITE_BANK.find(function(i){return i.id==="wr_a1_2"})];
      writeIdx=0;writeSubmitted=false;writeTyped="";render();
    });
    const pre=await page.inputValue('#writeIn');
    ok(pre==="My favourite animal is",'البادئة معبّأةٌ في المربّع فعلاً — «'+pre+'»');
    const html=await page.content();
    ok(html.indexOf("تنجحين إذا")>=0,'ومعايير النجاح ظاهرة');
    ok(html.indexOf("قبل أن تكتبي")>=0,'وسلّم POW ظاهر');
    ok(html.indexOf("الجملة الأولى مكتوبةٌ لكِ")>=0,'ويُقال لها إن الجملة الأولى لها');
    // التحديث الحيّ: العدّاد يتحرّك بلا إرسال
    await page.fill('#writeIn','My favourite animal is the cat.');
    const live1=await page.textContent('#writeCrit');
    ok(/٦ كلمة|كلمة/.test(live1),'والعدّاد حيٌّ وهي تكتب — '+live1.replace(/\s+/g,' ').slice(-40));
    // نسخُ نصّ السؤال يسقط ولو بلغ الطول (الحالة الحقيقية التي وقعت مرّتين)
    await page.evaluate(()=>{
      writeItems=[WRITE_BANK.find(function(i){return i.id==="wr_a1_5"})];
      writeIdx=0;writeSubmitted=false;writeTyped="";render();
    });
    await page.fill('#writeIn','Write about your best friend. What is their name? What do you both like doing?');
    await page.evaluate(()=>writeSubmit());
    await page.waitForTimeout(400);
    const r2=await page.evaluate(()=>({copy:writeCopy,sub:writeSubmitted,score:writeScore}));
    ok(r2.copy===true,'نسخُ نصّ السؤال يُكشف');
    ok(r2.score===0,'ولا يُحتسب نجاحاً رغم بلوغه الطول');
    const t2=await page.textContent('#app');
    ok(t2.indexOf('هذا نسخٌ من نصّ السؤال')>=0,'ويُقال لها ذلك صراحةً');
    await page.close();
  }

  // ===== ٦) سطر بدء الجلسة — الذي كان غائباً فتعذّر تشخيص إلياس =====
  console.log('\n٦) بدء الجلسة يُسجَّل');
  {
    const page=await mk(browser,'?p=elias');
    const posted=[];
    await page.route('**/rest/v1/mawhiba_answer_log**',rt=>{
      try{posted.push(JSON.parse(rt.request().postData()||'{}'))}catch(e){}
      rt.fulfill({status:201,body:''});
    });
    await page.evaluate(()=>startWrite());
    await page.waitForTimeout(400);
    // domain='gen' لا domain='write' — نفس عُرف إسقاط التوأم: ما يفعله النظام
    // (فتحُ جلسة) لا ما تفعله هي بسؤال، وإلا التقطه كل استعلامٍ يبحث عن أوّل صفّ
    // write. كشفه فشلٌ حقيقي في test_write.js بعد الشحن الأوّل لهذا السطر.
    const st=posted.filter(x=>x.domain==='gen'&&x.qtype==='write_start');
    ok(st.length===1,'سطرٌ واحد عند الفتح — '+st.length);
    ok(st.length&&st[0].is_correct===null,'بلا نتيجة (لا يُلوّث حساب الدقّة)');
    ok(st.length&&/سقالة:(on|off)/.test(st[0].q_text||''),'ومعه حال السقالة — '+(st[0]&&String(st[0].q_text).slice(0,70)));
    ok(st.length&&/العناصر:/.test(st[0].q_text||''),'وأيّ عناصر عُرضت عليه');
    await page.close();
  }

  // ===== ٧) المسوّدة لا تُمسح بفتح المثال =====
  console.log('\n٧) المسوّدة');
  {
    const page=await mk(browser);
    await page.evaluate(()=>{
      startWrite();
      writeItems=[WRITE_BANK.find(function(i){return i.id==="wr_a1_2"})];
      writeIdx=0;writeSubmitted=false;writeTyped="";render();
    });
    await page.fill('#writeIn','My favourite animal is the horse and it runs fast');
    await page.evaluate(()=>writeToggleModel());
    const kept=await page.inputValue('#writeIn');
    ok(/horse/.test(kept),'فتحُ المثال لا يمسح ما كتبته — «'+kept.slice(0,45)+'»');
    await page.close();
  }

  // ===== ٨) لا انحدار =====
  console.log('\n٨) لا انحدار');
  for(const q of ['','?p=mohammed','?p=elias']){
    const page=await mk(browser,q);
    const r=await page.evaluate(()=>{
      const out={missing:censusMissing(),modes:document.querySelectorAll('.mode').length};
      startWrite();out.n=writeItems.length;out.mode=mode;
      return out;
    });
    ok(r.missing.length===0,(q||'هيا')+': لا دالّة مفقودة — '+r.missing.join(','));
    ok(r.modes>0,(q||'هيا')+': الصفحة تُرسم');
    ok(r.n>0&&r.mode==='write',(q||'هيا')+': جلسة كتابة تُبنى — '+r.n+' عناصر');
    await page.close();
  }

  // ===== ٩) الحالتان الحقيقيتان اللتان أوجبتا الإصلاح — ٣٠ أغسطس =====
  // نصّا إلياس نفسهما من السجلّ الحيّ (`wr_a2_3`, `wr_a2_2`)، لا حالتان مؤلَّفتان:
  // بلغا الهدف بمسافة (٣٦ و٣١ كلمة لحدّ ٢٥) وربطا نقاطهما بأدوات ربطٍ صحيحة في
  // جملةٍ واحدة متماسكة — وكانا يسقطان لعدد الجمل وحده. يُثبَّتان بأعيانهما.
  console.log('\n٩) حالتا إلياس الحقيقيتان لم تعودا تسقطان على عدد الجمل');
  {
    const page=await mk(browser);
    const r=await page.evaluate(()=>{
      const it3={id:"wr_a2_3",lv:"A2",min:25,type:undefined,
        prompt:"You cannot go to football practice tomorrow. Write a message to your coach.\nSay:\n• why you cannot come\n• when you can come next\n• say sorry\nWrite 25–35 words."};
      const it2={id:"wr_a2_2",lv:"A2",min:25,type:undefined,
        prompt:"Your English pen friend wants to know about your weekend. Write them an email.\nSay:\n• what you did on Saturday\n• who you were with\n• how you felt\nWrite 25–35 words."};
      const txt3="Dear Coach,\nI am sorry, but I cannot come tomorrow because I'm going to be in the hospital for two days so I'm going out of the way and then I'm not going back until Friday.";
      const txt2="Hi Hasan,\nLast Saturday I was thinking about you and wondering if you had any idea of what time you would be coming in tomorrow to help me with the car.";
      const st3=writeCritState(it3,txt3),st2=writeCritState(it2,txt2);
      return{s3:st3.g.sentences,words3:st3.words,sent3:st3.sentences,w3:st3.w,
             s2:st2.g.sentences,words2:st2.words,sent2:st2.sentences,w2:st2.w};
    });
    ok(r.words3&&r.sent3,'wr_a2_3: ٣٦ كلمةً بجملةٍ واحدة — تنجح الآن — كلمات:'+r.words3+' جمل:'+r.sent3);
    ok(r.words2&&r.sent2,'wr_a2_2: ٣١ كلمةً بجملةٍ واحدة — تنجح الآن — كلمات:'+r.words2+' جمل:'+r.sent2);
    await page.close();
  }

  await browser.close();
  console.log(fails?`\n=== ${fails} فشل ===`:'\n=== كل الاختبارات نجحت ===');
  process.exit(fails?1:0);
})();
