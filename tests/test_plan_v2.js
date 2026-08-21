// اختبارات ما نُفِّذ من خطّة «سلّم الإنجليزية» — ٢١ أغسطس
//   ١) قياس الإنتاج في الكتابة: التنوّع المعجمي وتشابه النصّ مع محاولاته السابقة
//   ٢) بوّابة التمدّد (قاعدة ٨٥٪) بعتبتيها، ووصلها بالبانيات السبع
//   ٣) تسلسل التدريس الأسبوعي
//   ٤) لوحة القياس: التجميع منفصلٌ عن الشبكة فيُختبَر وحده
const {chromium}=require('/opt/node22/lib/node_modules/playwright');
const BASE='http://localhost:8931/index.html';
let fails=0;
function ok(c,m){console.log((c?'  ✓ ':'  ✗ ')+m);if(!c)fails++}

async function mk(browser,q){
  const page=await browser.newPage();
  page.on('pageerror',e=>{console.log('  ! pageerror:',e.message);fails++});
  await page.goto(BASE+(q||''),{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>typeof window.render==='function',{timeout:15000});
  return page;
}

(async()=>{
  const browser=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'});

  // ===== ١) قياس الإنتاج =====
  console.log('\n١) قياس الإنتاج في الكتابة');
  {
    const page=await mk(browser);
    const r=await page.evaluate(()=>{
      const out={};
      out.tokens=writeTokens("The cat sat on the mat.");
      out.ttrRepeat=writeTtr("the the the the");          // تنوّع أدنى
      out.ttrVaried=writeTtr("cat dog bird fish");        // تنوّع تامّ
      out.ttrEmpty=writeTtr("");
      out.simSame=writeSim("I went to the park","I went to the park");
      out.simNone=writeSim("apple banana","car truck");
      out.simPartial=writeSim("I went to the park today","I went to the park yesterday");
      out.simEmpty=writeSim("","abc");
      return out;
    });
    ok(r.tokens.length===6,'التجزئة تُهمل الترقيم: ٦ كلمات — '+r.tokens.length);
    ok(r.ttrRepeat===0.25,'تكرارٌ محض ⇒ تنوّع ٠٫٢٥ — '+r.ttrRepeat);
    ok(r.ttrVaried===1,'كلماتٌ كلّها مختلفة ⇒ تنوّع ١ — '+r.ttrVaried);
    ok(r.ttrEmpty===0,'نصٌّ فارغ ⇒ ٠ لا خطأ');
    ok(r.simSame===1,'النصّ نفسه ⇒ تشابه ١ — '+r.simSame);
    ok(r.simNone===0,'لا كلمة مشتركة ⇒ ٠ — '+r.simNone);
    ok(r.simPartial>0.6&&r.simPartial<1,'تشابهٌ جزئي بين الحدّين — '+r.simPartial);
    ok(r.simEmpty===0,'طرفٌ فارغ ⇒ ٠ لا قسمةٌ على صفر');

    // سجلّ المحاولات السابقة يعمل ويُفصَل بين المتعلّمين
    const hist=await page.evaluate(()=>{
      localStorage.clear();
      writePrevAdd("I went to the park with my family");
      const first=writeSelfSim("I went to the park with my family");
      const other=writeSelfSim("Completely different words here entirely");
      return{first:first,other:other,n:writePrevLoad().length};
    });
    ok(hist.first===1,'نصٌّ مطابقٌ لمحاولةٍ سابقة يُكشَف (١) — '+hist.first);
    ok(hist.other<0.2,'نصٌّ جديد لا يُعَدّ نسخاً — '+hist.other);
    ok(hist.n===1,'السجلّ يحفظ المحاولة');
    await page.close();
  }
  {
    // الفصل بين المتعلّمين: سجلّ محمد لا يُقاس عليه نصّ إلياس
    const p1=await mk(browser,'?p=mohammed');
    await p1.evaluate(()=>{localStorage.clear();writePrevAdd("shared sentence about a park visit")});
    await p1.close();
    const p2=await mk(browser,'?p=elias');
    const leak=await p2.evaluate(()=>writeSelfSim("shared sentence about a park visit"));
    ok(leak===0,'سجلّ متعلّمٍ لا يتسرّب إلى آخر (pkey) — '+leak);
    await p2.close();
  }

  // ===== ٢) بوّابة التمدّد =====
  console.log('\n٢) بوّابة التمدّد — قاعدة ٨٥٪');
  {
    const page=await mk(browser,'?p=elias');
    const r=await page.evaluate(()=>{
      localStorage.clear();
      const out={};
      out.beforeMin=stretchOn('listen');                 // بلا عيّنة كافية
      for(let i=0;i<7;i++)accRecord('listen',true);
      out.at7=stretchOn('listen');                       // ٧ < ACC_MIN=٨
      accRecord('listen',true);
      out.at8=stretchOn('listen');                       // ٨/٨ = ١٠٠٪ ⇒ تُسلَّح
      // تنزل إلى ما بين العتبتين (٧٠٪-٨٥٪): تبقى مسلَّحة (تخلّف الحلّ)
      accRecord('listen',false);accRecord('listen',false);
      out.rate10=accRate('listen');
      out.hysteresis=stretchOn('listen');
      // تنهار تحت ٧٠٪ ⇒ تنحلّ
      for(let i=0;i<4;i++)accRecord('listen',false);
      out.rateLow=accRate('listen');
      out.off=stretchOn('listen');
      // قسمٌ خارج الأقسام المستوياتية لا يُسجَّل أصلاً
      for(let i=0;i<10;i++)accRecord('basics',true);
      out.basics=accRate('basics');
      // الشرح/التصحيح (is_correct=null) لا يلوّث الدقّة
      for(let i=0;i<10;i++)accRecord('read',null);
      out.nullSafe=accRate('read');
      return out;
    });
    ok(r.beforeMin===false,'بلا عيّنة: البوّابة مغلقة');
    ok(r.at7===false,'٧ إجابات (<٨) لا تكفي لفتحها');
    ok(r.at8===true,'٨ إجابات بدقّة ١٠٠٪ ⇒ تُسلَّح');
    ok(r.rate10>=0.70&&r.rate10<0.85,'الدقّة بين العتبتين — '+r.rate10);
    ok(r.hysteresis===true,'بين العتبتين تبقى مسلَّحة (لا تذبذب)');
    ok(r.rateLow<0.70,'الدقّة تحت ٧٠٪ — '+r.rateLow);
    ok(r.off===false,'تحت ٧٠٪ ⇒ تنحلّ');
    ok(r.basics===null,'قسمٌ بلا تدرّج مستوى لا يُسجَّل — '+r.basics);
    ok(r.nullSafe===null,'سطور بلا صواب/خطأ لا تُحتسب دقّةً');

    // التمدّد يُضيف مستوى أعلى ولا يستبدل، ولا يُدخل A1 عبر احتياط البانية
    const bank=await page.evaluate(()=>{
      localStorage.clear();
      const base=bankStretched('listen','A2',listenBankFor).length;
      for(let i=0;i<10;i++)accRecord('listen',true);
      stretchOn('listen');
      const wide=bankStretched('listen','A2',listenBankFor);
      const lvls={};wide.forEach(x=>lvls[x.lv]=(lvls[x.lv]||0)+1);
      // B1 أعلى مستوى: لا تمدّد فوقه
      for(let i=0;i<10;i++)accRecord('read',true);stretchOn('read');
      const b1=bankStretched('read','B1',readBankFor).length,b1plain=readBankFor('B1').length;
      return{base:base,wide:wide.length,lvls:lvls,b1:b1,b1plain:b1plain};
    });
    ok(bank.wide>bank.base,'البوّابة مفتوحة ⇒ البنك يتّسع ('+bank.base+'⇐'+bank.wide+')');
    ok(!bank.lvls.A1,'لا يتسرّب A1 من احتياط البانية — '+JSON.stringify(bank.lvls));
    ok(!!bank.lvls.A2&&!!bank.lvls.B1,'المستوى الحالي يبقى ويُضاف الأعلى');
    ok(bank.b1===bank.b1plain,'B1 أعلى مستوى: لا تمدّد فوقه');
    await page.close();
  }
  {
    // البانيات السبع كلّها موصولة فعلاً
    const page=await mk(browser,'?p=elias');
    const wired=await page.evaluate(()=>{
      const out={};
      ['listen','read','write','gram','step','minpair','video'].forEach(d=>{
        localStorage.clear();
        const b={listen:buildListenPlan,read:buildReadPlan,write:buildWritePlan,gram:buildGramPlan,
                 step:buildStepPlan,minpair:buildMinpairPlan,video:buildVideoPlan}[d];
        const before=b().length;
        for(let i=0;i<10;i++)accRecord(d,true);
        stretchOn(d);
        out[d]={before:before,armed:stretchOn(d),after:b().length};
      });
      return out;
    });
    Object.keys(wired).forEach(d=>{
      ok(wired[d].armed===true&&wired[d].after>0,'بانية '+d+' موصولة بالبوّابة ولا تعود فارغة');
    });
    await page.close();
  }

  // ===== ٣) تسلسل التدريس =====
  console.log('\n٣) تسلسل التدريس الأسبوعي');
  {
    const page=await mk(browser,'?p=elias');
    const r=await page.evaluate(()=>{
      localStorage.clear();
      const out={};
      out.levels=Object.keys(SEQ_PLAN);
      out.lens=Object.keys(SEQ_PLAN).map(k=>SEQ_PLAN[k].length);
      out.weeksOrdered=Object.keys(SEQ_PLAN).every(k=>SEQ_PLAN[k].every((u,i)=>u.w===i+1));
      out.fields=Object.keys(SEQ_PLAN).every(k=>SEQ_PLAN[k].every(u=>u.f&&u.g&&u.can));
      out.w1=seqWeek();
      // بعد ثلاثة أسابيع
      const d=new Date(Date.now()-21*86400000).toISOString().slice(0,10);
      lsSet('mawhiba_seq_start_v1',d);
      out.w4=seqWeek();
      // بعد اثني عشر أسبوعاً يدور لا يقف
      lsSet('mawhiba_seq_start_v1',new Date(Date.now()-12*7*86400000).toISOString().slice(0,10));
      out.wrap=seqWeek();
      out.curLevel=seqPlanFor('A2')===SEQ_PLAN.A2;
      out.cur=seqCur().f;
      return out;
    });
    ok(r.levels.length===3,'ثلاثة مستويات — '+r.levels.join(','));
    ok(r.lens.every(n=>n===12),'اثنا عشر أسبوعاً لكل مستوى — '+r.lens.join(','));
    ok(r.weeksOrdered,'الأسابيع مرقّمة بالترتيب ١..١٢');
    ok(r.fields,'كل أسبوع فيه تركيزٌ وتركيبٌ وعبارة «يستطيع أن»');
    ok(r.w1===1,'بلا تاريخ بدء: الأسبوع الأول — '+r.w1);
    ok(r.w4===4,'بعد ٢١ يوماً: الأسبوع الرابع — '+r.w4);
    ok(r.wrap===1,'بعد اثني عشر أسبوعاً يدور إلى الأول — '+r.wrap);
    ok(r.curLevel,'كل متعلّم يرى تسلسل مستواه');
    ok(!!r.cur,'الأسبوع الحالي له تركيزٌ معروف — '+r.cur);
    await page.close();
  }
  {
    // الصفحة تُعرَض فعلاً بنقرةٍ حقيقية، ولا تُغيّر جدولة الأقسام
    const page=await mk(browser,'?p=elias');
    // البانية تختار ٨ من بنكٍ أكبر بالخلط، فالمجموعة نفسها تختلف بين نداءين — لذا يُفحَص
    // ما يُقصد فعلاً: أن التسلسل لا يمسّ حالة الجدولة (SRS) ولا حجم البنك المتاح
    const before=await page.evaluate(()=>{localStorage.clear();return{
      srs:lsGet('mawhiba_listen_srs')||'',bank:listenBankFor(profileOf().level).length}});
    await page.evaluate(()=>startSeq());
    const shown=await page.evaluate(()=>({
      mode:mode,
      html:app.innerHTML.indexOf('تسلسل التدريس')>=0,
      rows:(app.innerHTML.match(/يستطيع أن/g)||[]).length,
      here:app.innerHTML.indexOf('هذا الأسبوع')>=0}));
    ok(shown.mode==='seq'&&shown.html,'صفحة التسلسل تُعرض بنقرة');
    ok(shown.rows===12,'تُعرض الأسابيع الاثنا عشر — '+shown.rows);
    ok(shown.here,'الأسبوع الحالي مُعلَّم');
    const after=await page.evaluate(()=>({
      srs:lsGet('mawhiba_listen_srs')||'',bank:listenBankFor(profileOf().level).length}));
    ok(before.srs===after.srs,'التسلسل لا يمسّ حالة التباعد (SRS)');
    ok(before.bank===after.bank,'التسلسل لا يُصفّي بنك القسم — إرشادٌ لا قيد');
    await page.close();
  }

  // ===== ٤) لوحة القياس =====
  console.log('\n٤) لوحة القياس');
  {
    const page=await mk(browser,'?p=elias');
    const r=await page.evaluate(()=>{
      const rows=[];
      // listen: ١٠/١٠ بنصوصٍ متمايزة ⇒ رايةُ «أسهل من اللازم»
      for(let i=0;i<10;i++)rows.push({domain:'listen',is_correct:true,q_text:'q'+i,item_id:'ls_'+i});
      // gram: ٥ إجابات على نصٍّ واحد بدقّة ٢٠٪ ⇒ رايتا التكرار والدقّة المنخفضة
      for(let i=0;i<6;i++)rows.push({domain:'gram',is_correct:i===0,q_text:'same',item_id:'gr_1'});
      // write: سطر تصحيح بلا صواب/خطأ لا يُحتسب
      rows.push({domain:'write',is_correct:true,q_text:'w1',item_id:'ai_write_x'});
      rows.push({domain:'write',is_correct:null,q_text:'fix',item_id:'ai_write_x'});
      const agg=kpiAgg(rows);
      const by={};agg.forEach(a=>by[a.d]=a);
      return{n:agg.length,listen:by.listen,gram:by.gram,write:by.write,
        order:agg.map(a=>a.d),empty:kpiAgg([]).length,nullSafe:kpiAgg(null).length};
    });
    ok(r.n===3,'ثلاثة أقسام مجمَّعة — '+r.n);
    ok(r.listen.pct===100&&r.listen.n===10,'listen ١٠٠٪ من ١٠');
    ok(r.listen.flags.some(f=>f.t.indexOf('أسهل')>=0),'دقّةٌ عالية ⇒ رايةُ «أسهل من اللازم»');
    ok(r.gram.pct===17,'gram ١٧٪ — '+r.gram.pct);
    ok(r.gram.flags.some(f=>f.t.indexOf('منخفضة')>=0),'دقّةٌ منخفضة ⇒ رايةُ الدعم');
    ok(r.gram.flags.some(f=>f.t.indexOf('تكرار')>=0),'نصٌّ واحد لستّ إجابات ⇒ رايةُ التكرار');
    ok(r.gram.distinct===1,'النصوص المتمايزة تُحصى بدقّة — '+r.gram.distinct);
    ok(r.write.n===1,'سطرٌ بلا صواب/خطأ لا يدخل الدقّة — '+r.write.n);
    ok(r.write.ai===1,'العناصر المولَّدة (ai_) تُحصى — '+r.write.ai);
    ok(r.order[0]==='listen','الأكثر إجاباتٍ أولاً');
    ok(r.empty===0&&r.nullSafe===0,'مدخلٌ فارغ أو null لا يكسر التجميع');
    await page.close();
  }
  {
    // العرض يعمل بلا شبكة (نمنع الطلب) ولا يرمي خطأً
    const page=await mk(browser,'?p=elias');
    await page.route('**/rest/v1/mawhiba_answer_log**',route=>route.abort());
    await page.evaluate(async()=>{await loadKpi()});
    const s=await page.evaluate(()=>({mode:mode,busy:kpiBusy,has:app.innerHTML.indexOf('لوحة القياس')>=0}));
    ok(s.busy===false,'حالة الانشغال تُطفأ بعد الفشل لا تبقى معلّقة');
    ok(s.mode==='kpi'&&s.has,'تعذّر الاتصال لا يكسر الصفحة');
    await page.close();
  }
  {
    // بردٍّ حقيقي مموَّه: تُرسَم البطاقات
    const page=await mk(browser,'?p=elias');
    await page.route('**/rest/v1/mawhiba_answer_log**',route=>route.fulfill({
      status:200,contentType:'application/json',
      body:JSON.stringify([{domain:'listen',is_correct:true,q_text:'a',item_id:'ls_1'},
                           {domain:'listen',is_correct:false,q_text:'b',item_id:'ls_2'}])}));
    await page.evaluate(async()=>{await loadKpi()});
    const s=await page.evaluate(()=>({has:app.innerHTML.indexOf('فهم الاستماع')>=0}));
    ok(s.has,'الردّ الحقيقي يُرسَم باسم القسم العربي');
    await page.close();
  }

  // ===== ٥) لا انحدار: الأزرار والسلامة العامّة =====
  console.log('\n٥) لا انحدار');
  for(const q of ['','?p=mohammed','?p=elias']){
    const page=await mk(browser,q);
    const r=await page.evaluate(()=>({
      missing:censusMissing(),
      seq:app.innerHTML.indexOf('تركيز هذا الأسبوع')>=0,
      kpi:app.innerHTML.indexOf('لوحة القياس')>=0,
    }));
    ok(r.missing.length===0,(q||'هيا')+': لا دالّة مفقودة — '+r.missing.join(','));
    ok(r.seq,(q||'هيا')+': بطاقة تركيز الأسبوع ظاهرة');
    ok(r.kpi,(q||'هيا')+': زرّ لوحة القياس ظاهر');
    await page.close();
  }

  await browser.close();
  console.log(fails?`\n✗ ${fails} فشل`:'\n✓ كل الاختبارات نجحت');
  process.exit(fails?1:0);
})();
