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

  // ===== ٣) المحاكاة =====
  console.log('\n٣) المحاكاة الأسبوعية');
  {
    const page=await mk(browser,'?p=elias');
    const r=await page.evaluate(()=>{
      const p=buildMockPaper();
      const secs={};p.items.forEach(x=>secs[x.sec]=(secs[x.sec]||0)+1);
      return{n:p.items.length,secs:secs,lv:p.lv,reused:p.reused,
        order:p.items.map(x=>x.sec),
        noOrderType:p.items.filter(x=>x.sec==='step').every(x=>x.it.type!=='order')};
    });
    ok(r.n>0,'الورقة تُبنى — '+r.n+' عنصراً');
    ok(Object.keys(r.secs).length===4,'أربعة أقسام — '+JSON.stringify(r.secs));
    ok(r.order[0]==='listen','الاستماع أوّلاً كما ترتّب الورقة الحقيقية');
    ok(r.order[r.order.length-1]==='step','التحليل الكتابي آخراً');
    ok(r.noOrderType,'نوع الترتيب مستبعَد (لا يُجاب باختيارٍ واحد)');
    ok(r.lv==='A2','مستوى المتعلّم — '+r.lv);

    // استبعاد ما رآه مؤخراً، وارتخاؤه بدل انهيار الورقة
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

    // درجات كامبردج التقريبية
    const bands=await page.evaluate(()=>({
      a:mockBand(95).g,b:mockBand(85).g,c:mockBand(75).g,low:mockBand(65).g,bottom:mockBand(10).g}));
    ok(bands.a==='A'&&bands.b==='B'&&bands.c==='C','نطاقات الدرجات — '+JSON.stringify(bands));
    ok(bands.low==='—'&&bands.bottom==='—','ما دون النجاح بلا درجة');
    await page.close();
  }
  {
    // جلسةٌ كاملة بنقراتٍ حقيقية: بلا تصحيحٍ أثناء الورقة، ونتيجةٌ في آخرها
    const page=await mk(browser,'?p=elias');
    await page.route('**/functions/v1/tutor',r=>r.fulfill({status:200,contentType:'application/json',body:'{}'}));
    const posted=[];
    await page.route('**/rest/v1/mawhiba_answer_log**',r=>{
      try{posted.push(JSON.parse(r.request().postData()||'{}'))}catch(e){}
      r.fulfill({status:201,body:''});
    });
    await page.evaluate(()=>startMock());
    const total=await page.evaluate(()=>mockPaper.items.length);
    let sawFeedback=false;
    for(let i=0;i<total;i++){
      const html=await page.evaluate(()=>app.innerHTML);
      // «صحيحة» ترد في نصّ سؤال القواعد نفسه، فالفحص على أثر التصحيح لا على الكلمة:
      // صندوق الشرح، أو تعليم خيارٍ بصواب/خطأ، أو كشف الإجابة
      if(/explain-title|class="opt (ok|bad|right|wrong)|✓|✗/.test(html))sawFeedback=true;
      await page.evaluate(()=>{const b=document.querySelectorAll('.opt');if(b.length)b[0].click()});
      await page.waitForTimeout(30);
    }
    const end=await page.evaluate(()=>({done:mockDone,html:app.innerHTML,ans:mockAns.length}));
    ok(!sawFeedback,'بلا تغذيةٍ راجعة أثناء الورقة');
    ok(end.done===true&&end.ans===total,'كل الأسئلة أُجيبت وانتهت الورقة — '+end.ans+'/'+total);
    ok(end.html.indexOf('نتيجة المحاكاة')>=0,'شاشة النتيجة تُعرض');
    ok(/فهم الاستماع|دقّة القواعد/.test(end.html),'تفصيلٌ لكل قسم على حدة');
    const paper=posted.filter(x=>x.domain==='mock'&&x.qtype==='paper');
    const items=posted.filter(x=>x.domain==='mock'&&x.qtype!=='paper');
    ok(items.length===total,'كل عنصر يُسجَّل على حدة — '+items.length);
    ok(paper.length===1&&typeof paper[0].score_pct==='number','ودرجةٌ جامعة للورقة — '+(paper[0]&&paper[0].score_pct));
    ok(/موضع/.test(items[0].response||''),'موضع الاختيار يُسجَّل (انحياز الموضع)');
    await page.close();
  }

  // ===== ٤) لا انحدار =====
  console.log('\n٤) لا انحدار');
  for(const q of ['','?p=mohammed','?p=elias']){
    const page=await mk(browser,q);
    await page.evaluate(()=>render());
    const r=await page.evaluate(()=>({
      missing:censusMissing(),
      mock:app.innerHTML.indexOf('محاكاة الاختبار')>=0,
      modes:document.querySelectorAll('.mode').length,
    }));
    ok(r.missing.length===0,(q||'هيا')+': لا دالّة مفقودة — '+r.missing.join(','));
    ok(r.mock,(q||'هيا')+': زرّ المحاكاة ظاهر');
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
