// ما بقي من الفحص النقدي، منفَّذاً — ٢١ أغسطس
//   ١) BKT: احتمال الإتقان بدل عتبةٍ مُخترَعة (Corbett & Anderson 1994، عتبة ٠٫٩٥)
//   ٢) ثراء المفردات: Lexical Frequency Profile (Laufer & Nation 1995)
//   ٣) المحاكاة الأسبوعية: ورقةٌ بصيغة كامبردج، بلا تغذيةٍ راجعة، تتجنّب ما رآه مؤخراً
const {chromium}=require('/opt/node22/lib/node_modules/playwright');
const BASE='http://localhost:8931/index.html';
let fails=0;
function ok(c,m){console.log((c?'  ✓ ':'  ✗ FAIL ')+m);if(!c)fails++}
async function mk(browser,q){
  const page=await browser.newPage();
  page.on('pageerror',e=>{console.log('  ! pageerror:',e.message);fails++});
  await page.goto(BASE+(q||''),{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>typeof window.render==='function',{timeout:15000});
  await page.evaluate(()=>localStorage.clear());
  return page;
}

(async()=>{
  const browser=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'});

  // ===== ١) BKT =====
  console.log('\n١) BKT — احتمال الإتقان');
  {
    const page=await mk(browser,'?p=elias');
    const r=await page.evaluate(()=>{
      const out={};
      // الصيغة المنشورة: إصابةٌ ترفع الاحتمال، وخطأٌ يخفضه
      out.up=bktStep(0.5,true,0.25,0.10,0.15);
      out.down=bktStep(0.5,false,0.25,0.10,0.15);
      // معامل التخمين يغيّر الحكم فعلاً: إصابةٌ بخيارين تُرجّح الإتقان أقلّ من إصابةٍ بأربعة
      out.g2=bktStep(0.5,true,0.50,0.10,0.15);
      out.g4=bktStep(0.5,true,0.25,0.10,0.15);
      // حدودٌ لا تنكسر
      out.zero=bktStep(0,true,0.25,0.10,0.15);
      out.one=bktStep(1,false,0.25,0.10,0.15);
      out.finite=[out.up,out.down,out.g2,out.g4,out.zero,out.one].every(x=>Number.isFinite(x)&&x>=0&&x<=1);
      return out;
    });
    ok(r.up>0.5,'إصابةٌ ترفع احتمال الإتقان — '+r.up.toFixed(3));
    ok(r.down<0.5,'خطأٌ يخفضه — '+r.down.toFixed(3));
    ok(r.g4>r.g2,'تخمينٌ أقلّ (٤ خيارات) ⇒ إصابةٌ أدلّ على الإتقان — '+r.g4.toFixed(3)+' > '+r.g2.toFixed(3));
    ok(r.finite,'كل القيم داخل [٠،١] ولا قسمة على صفر');

    const seq=await page.evaluate(()=>{
      localStorage.clear();
      const out={start:bktOf('gram','sentence')};
      for(let i=0;i<3;i++)bktRecord('gram','sentence',true);
      out.after3=bktOf('gram','sentence');
      out.left3=bktToMastery('gram','sentence');
      out.earlyMastery=bktMastered('gram','sentence');   // احتمالٌ قد يبلغ، لكن الأدلّة لم تبلغ
      for(let i=0;i<20;i++)bktRecord('gram','sentence',true);
      out.after23=bktOf('gram','sentence');
      out.mastered=bktMastered('gram','sentence');
      bktRecord('gram','sentence',false);bktRecord('gram','sentence',false);
      out.afterMiss=bktOf('gram','sentence').p;
      // قسمٌ خارج الجدول لا يُسجَّل، وسطرٌ بلا صواب/خطأ لا يلوّث
      for(let i=0;i<5;i++)bktRecord('basics','x',true);
      out.basics=bktOf('basics','x');
      for(let i=0;i<5;i++)bktRecord('read','A2',null);
      out.nullSafe=bktOf('read','A2');
      // مهارتان مختلفتان لا تختلطان
      bktRecord('step','pick',true);bktRecord('step','gap',false);
      out.split=bktOf('step','pick').p!==bktOf('step','gap').p;
      return out;
    });
    ok(seq.start===null,'بلا محاولات: لا سجلّ');
    ok(seq.after3.p>0.2&&seq.after3.n===3,'ثلاث إصابات ترفع الاحتمال وتُحصى — '+seq.after3.p.toFixed(3));
    ok(seq.left3>0,'المتبقّي للإتقان رقمٌ معروض لا مبهم — '+seq.left3);
    ok(seq.earlyMastery===false,'ثلاث إصابات لا تكفي: حدّ الأدلّة يمنع الإتقان المبكّر');
    ok(seq.mastered===true,'إصاباتٌ متتالية تبلغ عتبة ٠٫٩٥ — '+seq.after23.p.toFixed(3));
    ok(seq.afterMiss<seq.after23.p,'خطآن بعد الإتقان يخفضان الاحتمال — '+seq.afterMiss.toFixed(3));
    ok(seq.basics===null,'قسمٌ خارج جدول التخمين لا يُسجَّل');
    ok(seq.nullSafe===null,'سطرٌ بلا صواب/خطأ لا يُسجَّل');
    ok(seq.split,'مهارتان مختلفتان (pick/gap) تُتتبَّعان منفصلتين');

    // موصولٌ بـlogAnswer نفسها: تغييرٌ واحد يخدم كل قسم
    const viaLog=await page.evaluate(()=>{
      localStorage.clear();
      const before=bktOf('listen','A2');
      logAnswer('listen','A2',true,'x','ls_1',100,{});
      return{before:before,after:bktOf('listen','A2')};
    });
    ok(viaLog.before===null&&viaLog.after&&viaLog.after.n===1,'logAnswer تُغذّي BKT تلقائياً');
    await page.close();
  }

  // ===== ٢) ثراء المفردات =====
  console.log('\n٢) ثراء المفردات — LFP');
  {
    const page=await mk(browser,'?p=mohammed');
    const r=await page.evaluate(()=>({
      k1size:K1_WORDS.length,
      ascii:K1_WORDS.every(w=>/^[a-z']+$/.test(w)),
      basic:writeLfp("the cat is on the table"),
      rich:writeLfp("astronomical phenomena fascinate meteorologists considerably"),
      empty:writeLfp(""),
      targets:VOCAB_TARGET,
    }));
    ok(r.k1size>400,'قائمة K1 ذات حجمٍ معتبر — '+r.k1size);
    ok(r.ascii,'لا محرف دخيل في القائمة');
    ok(r.basic.pct<=20,'نصٌّ من الشائع ⇒ نسبةٌ منخفضة فوق K1 — '+r.basic.pct+'%');
    ok(r.rich.pct>=80,'نصٌّ متقدّم ⇒ نسبةٌ عالية فوق K1 — '+r.rich.pct+'%');
    ok(r.rich.pct>r.basic.pct,'المقياس يفرّق بين النصّين فعلاً');
    ok(r.empty.n===0&&r.empty.pct===0,'نصٌّ فارغ ⇒ صفر لا خطأ');
    ok(r.targets.A1===1000&&r.targets.A2===2000&&r.targets.B1===3250,'أحجام المفردات المرجعية لكل درجة');
    await page.close();
  }

  // ===== ٣) ورقةُ STEP الكاملة (كانت «المحاكاة الأسبوعية» حتى ١٨ أكتوبر) =====
  // **الدعوى رُوجعت ولم تُدهَس**: ما جاء له هذا القسم — ورقةٌ كاملة بأقسامٍ مرتَّبة،
  // بلا تغذيةٍ راجعة حتى النهاية، تستبعد ما رآه مؤخراً، وتُسجّل كلَّ عنصرٍ بموضعه —
  // **باقٍ بحرفه**. والذي سقط حرفُه: محرّك العشرين (`buildMockPaper`) حُذف بأمر صاحب
  // المشروع (١٨ أكتوبر) بعد أن أكمل إلياس ورقةً من عشرين وقال «٢٠ سؤال فقط!!»،
  // فصارت المحاكاةُ هي ورقةَ STEP نفسها (مئةُ عنصر بأوزانه، كلُّ قسمٍ جلسة).
  // فيُقاس المحرّكُ الباقي بالدعاوى نفسها — لا تُحذَف الدعوى لأن اسمَ الدالّة تغيّر.
  console.log('\n٣) ورقةُ STEP الكاملة');
  {
    const page=await mk(browser,'?p=elias');
    const r=await page.evaluate(()=>{
      const secs=PLACE_SECTIONS.map(s=>({k:s.k,w:s.w,n:s.n,ready:placeReady(s.k)}));
      return{secs:secs,total:placeItemTotal(),wSum:secs.reduce((a,b)=>a+b.w,0),
        mix:placeMixLine(),cov:placeCoverage(),
        // الورقةُ تسحب من بنوك وجدان لا من بنكِ درجةٍ واحدة — وهذا ما يجعلها بصعوبة
        // الاختبار: بنوك المحاكاة القديمة الأربعة مجموعُها ٤١ عنصراً عند B1 (مقاسٌ
        // ١٧ أكتوبر)، فورقةُ مئةٍ منها مستحيلة.
        struct:placePool('struct').length,write:placePool('write').length,
        noBand:typeof mockBand==='undefined'&&typeof MOCK_BANDS==='undefined',
        noOldEngine:typeof buildMockPaper==='undefined'&&typeof startMock==='undefined',
      };
    });
    ok(r.wSum===100,'الأوزان تجمع ١٠٠٪ — '+r.wSum);
    ok(r.total===100,'وطولُ الورقة مئةُ عنصر كترقيم النموذج ٤٩ — '+r.total);
    ok(r.secs.length===4,'أربعة أقسام — '+r.mix);
    ok(r.secs[0].k==='listen'&&r.secs[3].k==='write',
      'الاستماع أوّلاً والتحليل الكتابي آخراً كترتيب الورقة الحقيقية');
    ok(r.cov===100,'التغطية مئةٌ بالمئة من وزن الاختبار — '+r.cov+'٪');
    ok(r.struct===30&&r.write===10,'كلُّ قسمٍ يبني طولَه كاملاً — تراكيب '+r.struct+' وتحليل '+r.write);
    // **حذفٌ مقصود يُحرَس**: نطاقاتُ كامبردج لا تُسقَط على ورقة STEP — لا جدولَ
    // مواءمةٍ منشوراً بينهما (بُحث ١٣ أكتوبر)، فإسقاطُها استشهادٌ بمعيارٍ في غير موضعه.
    ok(r.noBand,'لا نطاقاتِ كامبردج على ورقة STEP');
    ok(r.noOldEngine,'ومحرّكُ العشرين محذوفٌ فلا مصدرَي حقيقةٍ للورقة');

    // استبعاد ما رآه مؤخراً، وارتخاؤه بدل انهيار الورقة (الاحترازُ نفسه، بأسمائه التاريخية)
    const cd=await page.evaluate(()=>{
      const today=srsToday();
      return{
        recent:mockSeenRecently({a:{last:today}},'a'),
        old:mockSeenRecently({a:{last:today-30}},'a'),
        none:mockSeenRecently({},'a'),
        // بنكٌ كلّه مرئيٌّ مؤخراً: يُرخّى الشرط ولا تعود الورقة فارغة
        relaxed:mockPickFrom([{id:'a'},{id:'b'},{id:'c'}],
          {a:{last:today},b:{last:today},c:{last:today}},3).length,
        prefersFresh:mockPickFrom([{id:'a'},{id:'b'}],{a:{last:srsToday()}},1)[0].id,
      };
    });
    ok(cd.recent===true,'عنصرٌ أُجيب اليوم يُعدّ مرئياً مؤخراً');
    ok(cd.old===false,'عنصرٌ قديم لا يُستبعَد');
    ok(cd.none===false,'عنصرٌ بلا سجلّ لا يُستبعَد');
    ok(cd.relaxed===3,'بنكٌ مستنفَد: يُرخّى الشرط ولا تنهار الورقة — '+cd.relaxed);
    ok(cd.prefersFresh==='b','البكر يُقدَّم على المُعاد');
    await page.close();
  }
  {
    // جلسةٌ كاملة بنقراتٍ حقيقية: بلا تصحيحٍ أثناء القسم، وتقريرٌ في آخره.
    // والقسمُ المُختار هو التحليل الكتابي (عشرة عناصر، وبلا بوّابة تسرّعٍ فهي للمقروء
    // وحده) — فالنقراتُ الآلية لا تُسلِّح شيئاً ولا تُقاس بوّابةٌ لم تُدَّعَ هنا.
    const page=await mk(browser,'?p=elias');
    await page.route('**/functions/v1/tutor',r=>r.fulfill({status:200,contentType:'application/json',body:'{}'}));
    const posted=[];
    await page.route('**/rest/v1/mawhiba_answer_log**',r=>{
      try{posted.push(JSON.parse(r.request().postData()||'{}'))}catch(e){}
      r.fulfill({status:201,body:''});
    });
    await page.evaluate(()=>startPlaceSec('write'));
    const total=await page.evaluate(()=>placeItems.length);
    let sawFeedback=false;
    for(let i=0;i<total;i++){
      const html=await page.evaluate(()=>app.innerHTML);
      // «صحيحة» ترد في نصّ السؤال نفسه، فالفحص على أثر التصحيح لا على الكلمة
      if(/explain-title|class="choice (ok|bad|right|wrong)|✓|✗/.test(html))sawFeedback=true;
      // الخيارات تُختار **بحاويتها لا باسم صنفها** — درس ١٧ أكتوبر على اسم الصنف
      await page.evaluate(()=>{const b=document.querySelectorAll('#app .choices button');
        if(b.length)b[0].click()});
      await page.waitForTimeout(30);
    }
    const end=await page.evaluate(()=>({done:placeDone,html:app.innerHTML,ans:placeAns.length,
      hist:paperLogOf('write').length}));
    ok(total===10,'قسمُ التحليل الكتابي عشرةُ عناصر — '+total);
    ok(!sawFeedback,'بلا تغذيةٍ راجعة أثناء القسم');
    ok(end.done===true&&end.ans===total,'كل الأسئلة أُجيبت وانتهى القسم — '+end.ans+'/'+total);
    ok(end.html.indexOf('تقرير الورقة')>=0,'شاشة التقرير تُعرض');
    ok(/التحليل الكتابي/.test(end.html),'تفصيلٌ لكل قسم على حدة');
    const sec=posted.filter(x=>x.domain==='wejplace'&&x.qtype==='section');
    const items=posted.filter(x=>x.domain==='wejplace'&&x.qtype==='write');
    ok(items.length===total,'كل عنصر يُسجَّل على حدة — '+items.length);
    ok(sec.length===1&&typeof sec[0].score_pct==='number','ودرجةٌ جامعة للقسم — '+(sec[0]&&sec[0].score_pct));
    ok(/موضع/.test(items[0].response||''),'موضع الاختيار يُسجَّل (انحياز الموضع)');
    // **سجلُّ الأوراق** — شرطُ أن تكون «محاكاةً» لا قياساً مرّةً واحدة: `placeSave`
    // يُطبِق على السابق، فبلا سطرٍ هنا لا يُرى تقدّمٌ بين ورقةٍ وورقة.
    ok(end.hist===1,'ورقةٌ واحدة ⇒ سطرٌ واحد في سجلّ الأوراق — '+end.hist);
    const again=await page.evaluate(async()=>{
      startPlaceSec('write');
      for(let i=0;i<placeItems.length;i++){placeChoose(0)}
      return{hist:paperLogOf('write').length,
        keys:Object.keys(paperLogOf('write')[0]||{}).sort().join(','),
        shown:(function(){goPlaceMenu();return app.innerHTML.indexOf('أوراقُك السابقة')>=0})()};
    });
    ok(again.hist===2,'وإعادةُ القسم تُضيف سطراً لا تُطبِق عليه — '+again.hist);
    ok(/chance/.test(again.keys)&&/pct/.test(again.keys),
      'والسطر يحمل خطَّ الصدفة مع الدرجة فلا تُقارَن درجةٌ من ثلاثة خيارات بأخرى من أربعة');
    ok(again.shown,'وسجلُّ الأوراق يُعرض في القائمة من ورقتين فأكثر');
    await page.close();
  }

  // ===== ٤) لا انحدار =====
  console.log('\n٤) لا انحدار');
  for(const q of ['','?p=mohammed','?p=elias']){
    const page=await mk(browser,q);
    await page.evaluate(()=>render());
    const r=await page.evaluate(()=>({
      missing:censusMissing(),
      // **بالدالّة لا بنصّ الزرّ**: الدعوى «زرُّ الورقة مبلوغ» لا «اسمُه كذا».
      // وقد كُسرت بإعادة تسميةٍ مشروعة مرّتين (٤ أكتوبر، ثمّ ١٨ أكتوبر حين صارت
      // المحاكاةُ ورقةَ STEP نفسها) — فهو درس «الأعداد المكتوبة في الاختبارات فخّ
      // صامت» واقعاً على **النصوص** المكتوبة لا الأعداد وحدها.
      mock:[...document.querySelectorAll('button')]
        .filter(b=>(b.getAttribute('onclick')||'').trim()==='goPlaceMenu()').length,
      modes:document.querySelectorAll('.mode').length,
    }));
    ok(r.missing.length===0,(q||'هيا')+': لا دالّة مفقودة — '+r.missing.join(','));
    // **زرٌّ واحد لا زرّان**: هذا ما أُمر به في ١٨ أكتوبر — فلو عاد زرٌّ ثانٍ للورقة
    // (بأيّ اسم) سقط هذا السطر، وهو الحارسُ على الدمج نفسه لا على وجود الزرّ.
    ok(r.mock===1,(q||'هيا')+': زرُّ ورقة STEP ظاهرٌ **مرّةً واحدة** — '+r.mock);
    ok(r.modes>0,(q||'هيا')+': الأزرار تُرسم ('+r.modes+')');
    await page.close();
  }
  {
    // لوحة القياس تعرض الإتقان بلا شبكة
    const page=await mk(browser,'?p=elias');
    await page.route('**/rest/v1/mawhiba_answer_log**',r=>r.abort());
    await page.evaluate(()=>{for(let i=0;i<25;i++)bktRecord('gram','sentence',true)});
    await page.evaluate(async()=>{await loadKpi()});
    const s=await page.evaluate(()=>({html:app.innerHTML}));
    ok(s.html.indexOf('احتمال الإتقان')>=0,'لوحة القياس تعرض احتمال الإتقان');
    ok(s.html.indexOf('مُتقَن')>=0,'وتُعلِّم المهارة المُتقَنة');
    await page.close();
  }

  await browser.close();
  console.log(fails?`\n=== ${fails} فشل ===`:'\n=== كل الاختبارات نجحت ===');
  process.exit(fails?1:0);
})();
