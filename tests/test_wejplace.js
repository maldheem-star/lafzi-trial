// تحديد المستوى بنمط STEP — ١٣ أكتوبر
// الأمر: «حط اختبار تحديد مستوى لاختبار step بشرط أن تكون الاسئلة نصاً من ملفات وجدان»،
// ثمّ «أبغاك تغطي إلى ١٠٠٪»، ثمّ «١» (الاستماع من بنك التطبيق بوسم مصدر).
//
// وما يُفحَص هنا: الأوزان أوزانُ STEP لا أوزاني، ومخطَّطُ التراكيب يُطابق خانةً خانة
// في جلساتٍ متعدّدة ولا يغيب عنه قاعدة، وصفرُ عنصرٍ بلا وسمٍ (ر٠) يتسرّب، وقسمُ
// الاستماع يمتدّ على المستويات الخمسة من البنك **المؤلَّف** لا المولَّد، والتغطية
// رقمٌ محسوبٌ من البنوك غير الفارغة، وقسمُ المقروء **معلَّقٌ لا مكسور**، وخلطُ
// المواضع وتسجيلُه بموضع العرض، و**لا تغذيةَ راجعة** أثناء القسم، و**لا تُحدَّث
// جدولة FSRS**، والتهدئةُ تستبعد ما رُئي قريباً وتُرخّى بدل أن تنهار الورقة،
// وتقديرُ CEFR يُعلَن عند ٨٥٪ ولا يُعلَن دونها، ووسمُ النقر الأعمى، وجلسةٌ كاملة
// بنقراتٍ حقيقية، والظهور على الصفحات الثلاث بلا خطابٍ مؤنّث عند الأخوين.
const {chromium}=require('/opt/node22/lib/node_modules/playwright');
let pass=0,fail=0;
const ok=(c,m)=>{c?(pass++,console.log('  ✓ '+m)):(fail++,console.log('  ✗ FAIL '+m))};
const BASE='http://127.0.0.1:8931/';

(async()=>{
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'});
const mk=async(file,q)=>{
  const ctx=await b.newContext({viewport:{width:420,height:900}});
  const p=await ctx.newPage();
  p.on('pageerror',e=>{fail++;console.log('  ✗ PAGEERROR '+e.message)});
  await p.route('**/functions/v1/**',r=>r.fulfill({status:200,contentType:'application/json',body:'{}'}));
  await p.route('**/rest/v1/**',r=>r.fulfill({status:200,contentType:'application/json',body:'[]'}));
  await p.goto(BASE+(file||'index.html')+(q||''),{waitUntil:'domcontentloaded'});
  await p.waitForFunction(()=>typeof render==='function',{timeout:20000});
  await p.evaluate(()=>localStorage.clear());
  return p;
};
const tapLog=p=>p.evaluate(()=>{window.__rows=[];const o=window.logAnswer;
  window.logAnswer=function(){window.__rows.push([].slice.call(arguments));return o.apply(this,arguments)}});

// ===== ١) الأوزان من STEP، والطول مشتقٌّ منها =====
console.log('\n١) الأوزان والأطوال من STEP نفسه');
{
  const p=await mk();
  const r=await p.evaluate(()=>({
    w:PLACE_SECTIONS.map(s=>[s.k,s.w,s.n]),
    sumW:PLACE_SECTIONS.reduce((a,s)=>a+s.w,0),
    sumN:PLACE_SECTIONS.reduce((a,s)=>a+s.n,0),
    plan:Object.keys(PLACE_STRUCT_PLAN).reduce((a,k)=>a+PLACE_STRUCT_PLAN[k],0),
    rules:Object.keys(PLACE_STRUCT_PLAN).map(Number).sort((a,b)=>a-b),
    per:PLACE_LISTEN_PER*PLACE_LISTEN_LEVELS.length,
  }));
  ok(r.sumW===100,'الأوزان تجمع ١٠٠٪ — '+r.sumW);
  ok(r.sumN===100,'والأطوال تجمع ١٠٠ عنصراً كترقيم النموذج ٤٩ (٢١-١٠٠ + ٢٠ استماع) — '+r.sumN);
  const m={};r.w.forEach(x=>m[x[0]]=x);
  ok(m.listen[1]===20&&m.listen[2]===20,'الاستماع ٢٠٪ و٢٠ عنصراً');
  ok(m.read[1]===40&&m.read[2]===40,'المقروء ٤٠٪ و٤٠ عنصراً');
  ok(m.struct[1]===30&&m.struct[2]===30,'التراكيب ٣٠٪ و٣٠ عنصراً');
  ok(m.write[1]===10&&m.write[2]===10,'التحليل الكتابي ١٠٪ و١٠ عناصر');
  ok(r.plan===30,'ومخطَّطُ التراكيب يجمع ثلاثين خانة — '+r.plan);
  ok(r.rules.length===13&&r.rules[0]===1&&r.rules[12]===13,
    'على القواعد ١-١٣ كلّها بلا غياب — '+r.rules.length+' قاعدة');
  ok(r.per===20,'والاستماع ٤ لكل درجةٍ من خمس = ٢٠');
  await p.context().close();
}

// ===== ٢) التغطية محسوبةٌ لا مُعلَنة، والمقروء معلَّقٌ لا مكسور =====
console.log('\n٢) التغطية رقمٌ يُحسب من البنوك');
{
  const p=await mk();
  const r=await p.evaluate(()=>({
    cov:placeCoverage(),
    ready:PLACE_SECTIONS.map(s=>[s.k,placeReady(s.k),placeBankSize(s.k)]),
    readPool:placePool('read').length,
    readN:placeSecOf('read').n,
    weights:PLACE_SECTIONS.reduce((a,s)=>(a[s.k]=s.w,a),{}),
    lens:PLACE_SECTIONS.reduce((a,s)=>(a[s.k]=s.n,a),{}),
  }));
  const m={};r.ready.forEach(x=>m[x[0]]=x);
  // هذا القسم قال أوّلاً «بنكُ المقروء صفر» ثمّ «٣٦ من ٤٠» — وكلاهما كان صحيحاً يومه،
  // ووصل المفتاح كاملاً (١٤ أكتوبر) فبلغ الأربعين. والدعوى هي هي — **التغطيةُ تُحسب من
  // البنوك لا تُعلَن** — فصارت تُقابَل بمجموع أوزان الأقسام الجاهزة فعلاً، لا برقمٍ
  // مكتوب ينكسر مع كل بنكٍ يكتمل (درس «الأعداد المكتوبة في الاختبارات فخّ صامت»).
  const wantCov=r.ready.reduce((a,x)=>a+(x[1]?r.weights[x[0]]:0),0);
  ok(r.cov===wantCov,'التغطيةُ = مجموعُ أوزان الجاهز — '+r.cov+'٪ مقابل '+wantCov+'٪');
  ok(r.ready.every(x=>x[1]===(x[2]>=r.lens[x[0]])),
    'والجهوزيةُ في كل قسم = بنكٌ يبلغ طولَ ورقته — '+JSON.stringify(r.ready));
  ok(m.listen[1]&&m.struct[1]&&m.write[1]&&m.read[1],'والأقسام الأربعة جاهزة اليوم');
  ok(r.readPool===r.readN,'ومجمعُ المقروء يمتلئ بطول ورقته — '+r.readPool);
  // و«معلَّقٌ لا مكسور» يبقى مقيساً بمحاكاةٍ في الاختبار وحده: بنكٌ أضيقُ من ورقته
  // لا يُفتَح ولا ينكسر — فالحارسُ باقٍ وإن لم تَقَع حالتُه اليوم في الإنتاج.
  const short=await p.evaluate(()=>{
    const saved=PLACE_READ_BANK.splice(PLACE_READ_BANK.length-4,4);
    const out={cov:placeCoverage(),ready:placeReady('read'),
      pool:placePool('read').length,mode:(startPlaceSec('read'),mode)};
    PLACE_READ_BANK.push.apply(PLACE_READ_BANK,saved);
    return out;
  });
  ok(short.ready===false&&short.mode!=='place','ولا يُفتَح قسمٌ بنكُه أضيقُ من ورقته');
  ok(short.cov===wantCov-40,'وتهبط التغطيةُ بوزنه وحده — '+short.cov+'٪');
  ok(short.pool<=r.readN,'ومجمعُه لا ينكسر ولا يتجاوز الورقة — '+short.pool);
  await p.context().close();
}

// ===== ٣) المخطَّط يُطابق خانةً خانة، وصفرُ تسرّبٍ من ر٠ =====
console.log('\n٣) المخطَّط مُطابَقٌ في عشر جلسات');
{
  const p=await mk();
  const r=await p.evaluate(()=>{
    let badPlan=0,zero=0,dup=0,shortN=0,r14=0;
    for(let t=0;t<10;t++){
      const q=placePool('struct');
      if(q.length!==30)shortN++;
      if(new Set(q.map(x=>x.it.id)).size!==q.length)dup++;
      const by={};q.forEach(x=>{by[x.it.r]=(by[x.it.r]|0)+1;if(x.it.r===0)zero++;if(x.it.r===14)r14++});
      Object.keys(PLACE_STRUCT_PLAN).forEach(k=>{if(by[k]!==PLACE_STRUCT_PLAN[k])badPlan++});
      const w=placePool('write');
      if(w.length!==10)shortN++;
      if(w.some(x=>x.it.r!==14))badPlan++;
    }
    return {badPlan,zero,dup,shortN,r14};
  });
  ok(r.badPlan===0,'كل خانةٍ بعددها المقرَّر في العشر جلسات — انحرافات '+r.badPlan);
  ok(r.shortN===0,'ولا ورقةَ ناقصة — '+r.shortN);
  ok(r.dup===0,'ولا عنصرَ مكرّرٌ داخل الورقة — '+r.dup);
  ok(r.zero===0,'وصفرُ عنصرٍ بلا وسم (ر٠) يتسرّب إلى القياس — '+r.zero);
  ok(r.r14===0,'وصفرُ عنصرِ تحليلٍ كتابي داخل التراكيب — '+r.r14);
  await p.context().close();
}

// ===== ٤) الاستماع يمتدّ على المستويات، ومن المؤلَّف وحده =====
console.log('\n٤) الاستماع يمتدّ على الدرجات الخمس');
{
  const p=await mk();
  const r=await p.evaluate(()=>{
    // بنكٌ مولَّد مزروعٌ صراحةً — يجب ألّا يدخل ورقةَ تحديد المستوى (قابليّةُ المقابلة)
    genBankAdd(GEN_BANK_KEY_LISTEN,{id:'ai_zz_place',lv:'A1',ai:true,
      audio:'A fake generated clip.',q:'Fake?',c:['a','b','c'],a:0});
    let bad=0,aiIn=0;
    const dist={};
    for(let t=0;t<10;t++){
      const q=placePool('listen');
      if(q.length!==20)bad++;
      const by={};q.forEach(x=>{by[x.lvl]=(by[x.lvl]|0)+1;
        if(String(x.it.id).indexOf('ai_')===0)aiIn++;
        dist[x.lvl]=(dist[x.lvl]|0)+1});
      PLACE_LISTEN_LEVELS.forEach(lv=>{if(by[lv]!==PLACE_LISTEN_PER)bad++});
    }
    return {bad,aiIn,dist,gen:genBankLoad(GEN_BANK_KEY_LISTEN).length};
  });
  ok(r.gen>0,'(زُرع عنصرٌ مولَّد فعلاً، فالفحص ليس فارغاً — '+r.gen+')');
  ok(r.bad===0,'أربعةٌ من كل درجة في العشر جلسات — انحرافات '+r.bad);
  ok(r.aiIn===0,'ولا عنصرَ مولَّد يدخل الورقة — '+r.aiIn+' (قابليّةُ المقابلة بين الأبناء)');
  ok(PLACE_LISTEN_LEVELS_OK(r.dist),'وكلُّ الدرجات حاضرة — '+JSON.stringify(r.dist));
  await p.context().close();
}
function PLACE_LISTEN_LEVELS_OK(d){return ['A1','A2','B1','B2','C1'].every(l=>d[l]===40)}

// ===== ٥) لا تغذيةَ راجعة، ولا تُحدَّث جدولة FSRS =====
console.log('\n٥) يقيس ولا يُدرّس — ولا يمسّ التباعد');
{
  const p=await mk();
  await p.evaluate(()=>startPlaceSec('write'));
  const r=await p.evaluate(()=>{
    const before=JSON.stringify(wejSrsLoad());
    const html=app.innerHTML;
    placeChoose(0);
    const after=JSON.stringify(wejSrsLoad());
    return {srsSame:before===after,
      noGreen:!/ECFDF5|الصحيحة بالأخضر|✓ فهمت/.test(html),
      hasNote:/يقيس ولا يُدرّس/.test(html),
      idx:placeIdx,ansN:placeAns.length};
  });
  ok(r.srsSame,'جدولةُ FSRS لم تُمَسّ بعد الإجابة — كما لا تمسّها المحاكاة');
  ok(r.noGreen,'ولا صوابٌ معروضٌ أثناء القسم');
  ok(r.hasNote,'والسببُ مُعلَنٌ على الشاشة لا في التعليق وحده');
  ok(r.idx===1&&r.ansN===1,'والإجابة تُسجَّل وينتقل فوراً');
  await p.context().close();
}

// ===== ٦) خلطُ المواضع وتسجيلُه بموضع العرض =====
console.log('\n٦) الموضع المعروض لا فهرس البنك');
{
  const p=await mk();
  const r=await p.evaluate(()=>{
    let shuffled=0,trials=0;
    for(let t=0;t<40;t++){
      startPlaceSec('struct');
      placeOrder.forEach(o=>{trials++;if(o.join()!=='0,1,2,3')shuffled++});
    }
    return {shuffled,trials};
  });
  ok(r.shuffled>0&&r.shuffled/r.trials>0.7,
    'الترتيبُ مخلوطٌ في أغلب العناصر — '+r.shuffled+'/'+r.trials);
  await tapLog(p);
  const rows=await p.evaluate(async()=>{
    startPlaceSec('write');
    const want=[];
    while(!placeDone){
      const x=placeCur(),Q=placeQ(x),ord=placeOrder[placeIdx];
      want.push({id:x.it.id,shownPosOfRight:ord.indexOf(Q.a)+1});
      placeChoose(0);
    }
    return {want:want,rows:window.__rows.filter(r=>r[0]==='wejplace'&&r[1]==='write')};
  });
  let posOk=0;
  rows.want.forEach(w=>{
    const row=rows.rows.filter(r=>r[4]===w.id)[0];
    if(row&&String(row[3]).indexOf('الصواب موضع '+toArJs(w.shownPosOfRight))>=0)posOk++;
  });
  ok(posOk===rows.want.length&&posOk>0,
    'وكلُّ سطرٍ يحمل موضعَ الصواب كما عُرض — '+posOk+'/'+rows.want.length);
  ok(rows.rows.every(r=>/موضع /.test(String(r[3]))),'وكلُّ إجابةٍ بموضعها');
  await p.context().close();
}
function toArJs(n){return String(n).replace(/[0-9]/g,d=>'٠١٢٣٤٥٦٧٨٩'[+d])}

// ===== ٧) جلسةٌ كاملة بنقراتٍ حقيقية ⇒ تقرير =====
console.log('\n٧) جلسةٌ كاملة بنقراتٍ على الأزرار المعروضة');
{
  const p=await mk();
  await tapLog(p);
  await p.evaluate(()=>startPlaceSec('write'));
  for(let i=0;i<10;i++){
    const btns=await p.$$('#app .choice');
    if(!btns.length)break;
    await btns[i%btns.length].click();
    await p.waitForTimeout(40);
  }
  const r=await p.evaluate(()=>({
    mode:mode,done:placeDone,
    txt:app.innerText,
    stored:placeLoad().write||null,
    secRow:window.__rows.filter(r=>r[0]==='wejplace'&&r[1]==='section').length,
    itemRows:window.__rows.filter(r=>r[0]==='wejplace'&&r[1]==='write').length,
    qtext:(window.__rows.filter(r=>r[0]==='wejplace'&&r[1]==='write')[0]||[])[6],
    cov:placeCoverage(),
  }));
  ok(r.done,'القسمُ انتهى بعشر نقراتٍ حقيقية');
  ok(r.itemRows===10,'وعشرةُ سطورٍ للعناصر — '+r.itemRows);
  ok(r.secRow===1,'وسطرٌ واحد للقسم');
  ok(!!r.stored&&r.stored.n===10,'والنتيجةُ محفوظةٌ محلّياً — '+JSON.stringify(r.stored&&{n:r.stored.n,ok:r.stored.ok}));
  ok(r.qtext&&/تحديد مستوى · write · ر14/.test(r.qtext.q_text||''),
    'ونصُّ السؤال وقاعدتُه في السجلّ — '+((r.qtext&&r.qtext.q_text)||'').slice(0,60));
  ok(/ليست درجةَ STEP/.test(r.txt),'والتقريرُ يُعلن أنها ليست درجةَ STEP');
  // كان يشترط «٦٠٪» حرفياً، واكتملت القراءةُ فصارت ١٠٠٪. والدعوى هي هي — **التقريرُ
  // يُعلن كم من وزن الاختبار غطّته الأقسامُ المكتملة** — والرقم يُشتقّ من الحيّ.
  ok(new RegExp(toArJs(r.cov)+'٪ من وزن').test(r.txt),
    'ويُعلن التغطيةَ المحسوبة — '+r.cov+'٪');
  ok(/إشاراتٌ لا درجات/.test(r.txt)||!/التراكيب — إشارة/.test(r.txt),
    'وإن عُرضت قواعدُ فبوصفها إشاراتٍ لا درجات');
  await p.context().close();
}

// ===== ٨) تقديرُ CEFR يُعلَن عند ٨٥٪ ولا يُعلَن دونها =====
console.log('\n٨) تقديرُ CEFR من المحتوى لا من رقم');
{
  const p=await mk();
  const r=await p.evaluate(()=>({
    hi:placeCefr({A1:{n:4,ok:4},A2:{n:4,ok:4},B1:{n:4,ok:4},B2:{n:4,ok:2},C1:{n:4,ok:0}}),
    none:placeCefr({A1:{n:4,ok:3},A2:{n:4,ok:2},B1:{n:4,ok:1},B2:{n:4,ok:0},C1:{n:4,ok:0}}),
    thin:placeCefr({C1:{n:2,ok:2}}),
    top:placeCefr({A1:{n:4,ok:4},A2:{n:4,ok:4},B1:{n:4,ok:4},B2:{n:4,ok:4},C1:{n:4,ok:4}}),
  }));
  ok(r.hi==='B1','ثلاثُ درجاتٍ بـ١٠٠٪ ⇒ B1 (أعلى درجةٍ بلغت ٨٥٪) — '+r.hi);
  ok(r.none===null,'و٧٥٪ في A1 لا تُعلن درجةً — '+r.none);
  ok(r.thin===null,'وعنصران لا يكفيان لإعلان درجة — '+r.thin);
  ok(r.top==='C1','والخمسُ كلُّها ⇒ C1 — '+r.top);
  // ٨٥٪ ليست رقماً مخترَعاً: هي قاعدة الـ٨٥٪ المعتمَدة في المشروع (Wilson 2019)
  const src=await p.evaluate(()=>String(placeCefr));
  ok(/0\.85/.test(src),'والعتبة ٠٫٨٥ لا رقمٌ آخر');
  await p.context().close();
}

// ===== ٩) خطُّ الصدفة مشتقٌّ من الخيارات، والنقرُ الأعمى يُوسَم =====
console.log('\n٩) الصدفة والنقر الأعمى');
{
  const p=await mk();
  const r=await p.evaluate(()=>({
    three:placeChance([{nc:3},{nc:3},{nc:3}]),
    four:placeChance([{nc:4},{nc:4}]),
    mix:placeChance([{nc:3},{nc:4}]),
    empty:placeChance([]),
  }));
  ok(r.three===33,'ثلاثةُ خيارات ⇒ ٣٣٪ — '+r.three);
  ok(r.four===25,'وأربعةٌ ⇒ ٢٥٪ — '+r.four);
  ok(r.mix===29,'والخلطُ يُحسب لا يُقرَّب جزافاً — '+r.mix);
  ok(r.empty===0,'وورقةٌ فارغة لا تكسر الحساب');
  const blind=await p.evaluate(()=>{
    placeSave({write:{n:10,ok:2,secs:20,d:todayStr(),medMs:1200,chance:25,
      byLevel:{},byRule:{14:{n:10,ok:2}},byPos:{}}});
    mode='placeReport';render();
    const t=app.innerText;
    placeSave({write:{n:10,ok:9,secs:200,d:todayStr(),medMs:20000,chance:25,
      byLevel:{},byRule:{14:{n:10,ok:9}},byPos:{}}});
    render();
    return {flagged:/لا تقيس فهماً/.test(t),clean:!/لا تقيس فهماً/.test(app.innerText)};
  });
  ok(blind.flagged,'١٫٢ث ودقّةٌ ٢٠٪ ⇒ يُوسَم نقراً أعمى');
  ok(blind.clean,'و٢٠ث ودقّةٌ ٩٠٪ ⇒ بلا وسم (لا بلاغ كاذب)');
  await p.context().close();
}

// ===== ١٠) التهدئة تستبعد ما رُئي قريباً وتُرخّى بدل الانهيار =====
console.log('\n١٠) تهدئةُ إعادة الاختبار');
{
  const p=await mk();
  const r=await p.evaluate(()=>{
    // كلُّ عناصر ر١٢ (أضيقُ قاعدة) رُئيت اليوم ⇒ الورقةُ تُرخّي ولا تنقص
    const st={};WEJ_BANK.filter(x=>x.r===12).forEach(x=>{st[x.id]={box:1,seen:1,last:srsToday(),due:srsToday()+9}});
    lsSet(WEJ_SRS_KEY,JSON.stringify(st));
    const q=placePool('struct');
    const by={};q.forEach(x=>by[x.it.r]=(by[x.it.r]|0)+1);
    // وعنصرٌ واحد فقط من ر١٣ رُئي ⇒ يُستبعَد لصالح البكر
    const st2={};const r13=WEJ_BANK.filter(x=>x.r===13);
    st2[r13[0].id]={box:1,seen:1,last:srsToday(),due:srsToday()+9};
    lsSet(WEJ_SRS_KEY,JSON.stringify(st2));
    let hitSeen=0;
    for(let t=0;t<20;t++){
      placePool('struct').forEach(x=>{if(x.it.id===r13[0].id)hitSeen++});
    }
    return {n:q.length,r12:by[12]||0,hitSeen};
  });
  ok(r.n===30&&r.r12===1,'الورقةُ ثلاثون وخانةُ ر١٢ قائمة رغم أن كلَّ عناصرها رُئيت — تُرخّى ولا تنهار');
  ok(r.hitSeen===0,'وعنصرٌ رُئي اليوم يُستبعَد متى وُجد بكرٌ بديل — '+r.hitSeen+'/٢٠');
  await p.context().close();
}

// ===== ١١) الظهور على الصفحات الثلاث، والخطاب في الاتّجاهين =====
console.log('\n١١) الظهور والخطاب');
{
  for(const [f,q,who] of [['index.html','','هيا'],['index.html','?p=mohammed','محمد'],['index.html','?p=elias','إلياس']]){
    const p=await mk(f,q);
    // **التحويل إلى خطاب المذكّر يقع في مراقب DOM لا في الرسم** — فقراءةُ النصّ فور
    // `render()` تقيس ما قبل التحويل، وتُسقط الاختبارَ على نصٍّ صحيح (درس ١٣ سبتمبر).
    const btn=await p.evaluate(()=>/goPlaceMenu\(\)/.test(app.innerHTML));
    await p.evaluate(()=>goPlaceMenu());
    await p.waitForTimeout(500);
    const menu=await p.evaluate(()=>app.innerText);
    await p.evaluate(()=>startPlaceSec('struct'));
    await p.waitForTimeout(500);
    const run=await p.evaluate(()=>app.innerText);
    // الدعوى «الشاشةُ تُفتَح بنقرة» كانت تُقابَل بعنوانها المكتوب («تحديد المستوى»)،
    // فكسرها تسميةُ ١٨ أكتوبر («ورقة STEP الكاملة») وهي تغييرٌ مشروع لا انحدار.
    // فصارت تُقابَل بعناوين الأقسام **المشتقّة من `PLACE_SECTIONS` الحيّة** لا بنصٍّ
    // مكتوب — درس «الأعداد (والأسماء) المكتوبة في الاختبارات فخّ صامت».
    const secs=await p.evaluate(()=>PLACE_SECTIONS.map(x=>x.t));
    const r={btn:btn,menu:menu,run:run,
      opened:secs.length>0&&secs.every(t=>menu.indexOf(t)>=0)};
    ok(r.btn,who+': الزرُّ على رئيسيته');
    ok(r.opened,'وشاشةُ الأقسام تُفتَح بنقرة — '+secs.join('، '));
    if(who==='هيا'){
      ok(/ابدئي|أعيدي/.test(r.menu),'وخطابُها مؤنّث');
      ok(/استمعي|اقرئي|عودي|ابدئي|أعيدي/.test(r.menu+r.run),'وصيغةُ الأمر مؤنّثة');
    }else{
      ok(!/ابدئي|أعيدي|اختاري|استمعي|اقرئي|عودي|أكملي/.test(r.menu+r.run),
        'وبلا صيغةِ أمرٍ مؤنّثة — '+(r.menu+r.run).replace(/\s+/g,' ').slice(0,80));
      ok(!/[ةي]ِ\b/.test(r.menu),'وبلا كسرةِ مخاطَبةٍ ظاهرة');
    }
    await p.context().close();
  }
}

await b.close();
console.log(`\n${fail?'✗ FAIL':'✓'} ${pass} نجحت · ${fail} فشلت`);
process.exit(fail?1:0);
})();
