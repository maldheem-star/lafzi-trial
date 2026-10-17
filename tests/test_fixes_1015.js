// أربعةُ علاجاتٍ من ورقة إلياس الكاملة — ١٥ أكتوبر
//
// أكمل إلياس ورقةَ تحديد المستوى كاملةً (١٠٠ عنصر، أربعةُ أقسام، ٨٤ دقيقة) فكشفت
// أرقاماً لم تكن مقاسةً قبلها، وطُلب تنفيذُ الأربعة. وما يُفحَص هنا بأعيانه:
//
// ١) **معنى الكلمة في السياق** — ٠ من ١٠ في ورقته، وهو أكبرُ ثقبٍ منفرد في أكبر
//    وعاء نقاطٍ في STEP. فالبنكُ يُرشَّح من بنك الورقة نفسه بوسمه (لا مفتاحٌ ثانٍ)،
//    والكلمةُ الهدف **يُتحقَّق أنها في القطعة بحدود الكلمة** في كل عنصر — نفس
//    الرقابة القبليّة المفروضة على جملة أزواج الاستماع (١٧ أغسطس).
// ٢) **بوّابةُ تسرّعٍ مشروطة في قسم المقروء** — ١١ إجابةً دون عشر ثوانٍ بدقّة ٩٪.
//    ويُفحَص أنها **مشروطة فعلاً**: لا تمسّ أوّلَ عنصرٍ، ولا تمسّ قسماً آخر، وتنحلّ.
// ٣) **وسمُ المهارة يبلغ السجلّ** — كان محسوباً في البنك ويُرمى عند التسجيل.
// ٤) **سطرُ التقرير** — الدرجةُ الموزونة وتقديرُ CEFR كانا يُعرَضان ولا يُسجَّلان.
//
// وهو **يسقط على البناء السابق**: الدوالُّ الجديدة غير معرَّفة فيه، فتنهار أقسامه.
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

// ===== ١) بنكُ معنى السياق: الكلمةُ في قطعتها، والمفتاحُ من موضعٍ واحد =====
console.log('\n١) بنكُ معنى الكلمة في السياق');
{
  const p=await mk();
  const r=await p.evaluate(()=>{
    const bad=[],miss=[],dup=[],ar=[],short=[];
    const seen={},pos={1:0,2:0,3:0,4:0};
    VCTX_BANK.forEach(it=>{
      if(!it.c||it.c.length!==4||!(it.a>=0&&it.a<4))bad.push(it.id);
      if(new Set(it.c.map(x=>String(x).toLowerCase())).size!==4)dup.push(it.id);
      if(/[\u0621-\u064A]/.test(it.c.join(" ")+it.q))ar.push(it.id);
      if(!it.psg||it.psg.length<40)short.push(it.id);
      // الكلمةُ الهدف في القطعة **بحدود الكلمة** — لا باحتواءٍ نصّي
      const re=new RegExp("\\b"+it.w.replace(/[.*+?^${}()|[\]\\]/g,"\\$&")+"\\b","i");
      if(!re.test(it.psg||""))miss.push(it.id+":"+it.w);
      const k=String(it.w).toLowerCase();
      if(seen[k])dup.push("word:"+it.w);seen[k]=1;
      pos[it.a+1]++;
    });
    const fromFile=VCTX_BANK.filter(x=>x.src==="ملف");
    // المنقولُ يُطابق بنك الورقة نفسه: لا نسخةَ مفتاحٍ ثانية
    let keyBad=0;
    fromFile.forEach(it=>{
      const n=+String(it.id).replace("vc49_","");
      const src=PLACE_READ_RAW.filter(x=>x.q===n)[0];
      if(!src||src.a!==it.a||src.c.join("|")!==it.c.join("|"))keyBad++;
    });
    return {n:VCTX_BANK.length,bad,miss,dup,ar,short,pos,file:fromFile.length,
      made:VCTX_BANK.filter(x=>x.src==="مؤلَّف").length,keyBad,N:VCTX_N};
  });
  ok(r.miss.length===0,'كلُّ كلمةٍ هدف موجودةٌ في قطعتها بحدود الكلمة — '+(r.miss.join(", ")||"صفر انحراف"));
  ok(r.bad.length===0,'وكلُّ عنصرٍ أربعةُ خيارات ومفتاحٌ في المدى — '+(r.bad.join(", ")||"سليم"));
  ok(r.dup.length===0,'ولا خيارٌ مكرّر ولا كلمةٌ مكرّرة — '+(r.dup.join(", ")||"صفر"));
  ok(r.ar.length===0,'ولا تلوّثٌ عربي في سؤالٍ أو خيار — '+(r.ar.join(", ")||"صفر"));
  ok(r.short.length===0,'ولكلٍّ قطعةٌ حقيقية — '+(r.short.join(", ")||"صفر"));
  ok(r.keyBad===0,'والمنقولُ مفتاحُه من بنك الورقة نفسه لا نسخةٌ ثانية — انحرافات '+r.keyBad);
  ok(r.file===10&&r.made>=20,'عشرةٌ من المصدر و'+r.made+' مؤلَّفة');
  ok(r.n>=2*r.N,'والبنكُ ضِعفُ الجلسة على الأقلّ — '+r.n+' لجلسةٍ من '+r.N);
  const mx=Math.max(r.pos[1],r.pos[2],r.pos[3],r.pos[4]);
  ok(mx<=r.n/2,'ولا موضعَ يبتلع أكثر من نصف المفاتيح في البيانات — '+JSON.stringify(r.pos));
  await p.context().close();
}

// ===== ٢) جملةُ الكلمة تُستخرَج بحدود الكلمة، وتسقط بهدوء =====
console.log('\n٢) استخراجُ جملة الكلمة');
{
  const p=await mk();
  const r=await p.evaluate(()=>{
    const t="Animals rely on lower acidic levels. A reliable source is different. The end.";
    return {hit:vctxSentOf(t,"rely"),
      notPrefix:vctxSentOf(t,"reli"),
      none:vctxSentOf(t,"zzzz"),
      caps:vctxSentOf("Proponents of this idea believe it. Another one.","proponents"),
      real:VCTX_BANK.map(it=>!!vctxSentOf(it.psg,it.w)).filter(x=>!x).length};
  });
  ok(/rely on lower/.test(r.hit),'الجملةُ التي فيها الكلمة — «'+r.hit+'»');
  ok(r.notPrefix==="",'ولا تُطابق بادئةً داخل كلمةٍ أخرى (reli داخل reliable) — «'+r.notPrefix+'»');
  ok(r.none==="",'وكلمةٌ غائبة تُعيد فراغاً فيُعرَض النصُّ كما هو — لا شاشةٌ فارغة');
  ok(/Proponents of this idea/.test(r.caps),'والمطابقةُ لا تتعلّق بالحالة');
  ok(r.real===0,'وكلُّ عنصرٍ في البنك تُستخرَج جملتُه فعلاً — عناصرُ بلا جملة '+r.real);
  await p.context().close();
}

// ===== ٣) السلّمُ يتلاشى: إبرازٌ ثمّ بلا إبراز =====
console.log('\n٣) الدعمُ يتلاشى — ثلاثٌ صعوداً وخطآن نزولاً');
{
  const p=await mk();
  const r=await p.evaluate(()=>{
    localStorage.removeItem(VCTX_STAGE_KEY);
    const a=vctxStage();
    vctxStageBump(true);vctxStageBump(true);const mid=vctxStage();
    vctxStageBump(true);const up=vctxStage();
    vctxStageBump(false);const one=vctxStage();
    vctxStageBump(false);const down=vctxStage();
    return {a,mid,up,one,down,req:WB_REQ,back:WB_BACK};
  });
  ok(r.a===0,'تبدأ من الدرجة الصفرية (الجملةُ مُبرَزة)');
  ok(r.mid===0&&r.up===1,'وصوابان لا يرفعان وثلاثةٌ ترفع — نفس WB_REQ='+r.req);
  ok(r.one===1&&r.down===0,'وخطأٌ واحد لا يُنزل وخطآن يُنزلان — نفس WB_BACK='+r.back);
  // الإبرازُ في درجة ٠ **قبل** الإجابة، وفي درجة ١ بعد القفل وحده
  const hi=await p.evaluate(()=>{
    const out={};
    localStorage.setItem(VCTX_STAGE_KEY,JSON.stringify({s:0,up:0,dn:0}));
    startVctx();gateReveal();
    out.s0_before=/background:#FEF3C7/.test(app.innerHTML);
    localStorage.setItem(VCTX_STAGE_KEY,JSON.stringify({s:1,up:0,dn:0}));
    startVctx();gateReveal();
    out.s1_before=/background:#FEF3C7/.test(app.innerHTML);
    const it=vctxCur();vctxChoose(it.a);
    out.s1_after=/background:#FEF3C7/.test(app.innerHTML);
    out.teach=/المعنى في هذا السياق/.test(app.innerHTML);
    return out;
  });
  ok(hi.s0_before,'وفي الدرجة الصفرية تُبرَز الجملةُ قبل الاختيار — فيُجبَر الرجوع للسياق');
  ok(!hi.s1_before,'وفي الدرجة الأولى لا إبرازَ قبله — ظرفُ الاختبار نفسه');
  ok(hi.s1_after&&hi.teach,'ويُبرَز بعد القفل مع سطر المعنى — يُعلَّم من الخطأ');
  // والإبرازُ **مرئيّ** لا موجودٌ في DOM وحده: الصندوقُ بارتفاعٍ محدود، وجملةٌ في الفقرة
  // الثانية تقع تحت طيّه فيَعِد الشريطُ بما لا يُرى. كشفته لقطةُ شاشةٍ لا اختبار (١٥ أكتوبر).
  const vis=await p.evaluate(()=>{
    const out={n:0,seen:0,worst:null};
    localStorage.setItem(VCTX_STAGE_KEY,JSON.stringify({s:0,up:0,dn:0}));
    VCTX_BANK.forEach(function(it){
      vctxItems=[it];vctxIdx=0;vctxDone=false;vctxStageWas=0;
      vctxSetupRound();render();gateReveal();
      const box=document.getElementById("vctxPsg"),b=box&&box.querySelector("b");
      if(!b)return;out.n++;
      const rb=box.getBoundingClientRect(),r=b.getBoundingClientRect();
      // يُحتسَب مرئيّاً إن ظهر منه سطرٌ على الأقلّ داخل حدود الصندوق
      if(r.top<rb.bottom-4&&r.bottom>rb.top+4)out.seen++;else out.worst=it.id;
    });
    return out;
  });
  ok(vis.n>=30,'وكلُّ عنصرٍ في البنك يحمل إبرازاً فعلياً في الدرجة الصفرية — '+vis.n);
  ok(vis.seen===vis.n,'والجملةُ المُبرَزة **مرئيّةٌ** داخل صندوق القطعة لا تحت طيّه — '
    +vis.seen+'/'+vis.n+(vis.worst?' · أوّلُ ما سقط '+vis.worst:''));
  await p.context().close();
}

// ===== ٤) بوّابةُ معنى السياق، وجلسةٌ كاملة بنقراتٍ حقيقية =====
console.log('\n٤) البوّابةُ ثمّ جلسةٌ حقيقية ⇒ تسجيل');
{
  const p=await mk();
  await tapLog(p);
  const g=await p.evaluate(()=>{
    startVctx();
    const closed=!gateOpen(),hidden=!/class="choice"/.test(app.innerHTML),
      bar=/ستظهر بعد/.test(app.innerHTML),secs=gateSecs;
    const it=vctxCur();vctxChoose(it.a);
    return {closed,hidden,bar,secs,lockedWhileClosed:vctxLocked,ansN:vctxItems.length};
  });
  ok(g.closed&&g.secs>=5&&g.secs<=9,'البوّابةُ مغلقةٌ عند العرض بأرضيّة ٥-٩ث — '+g.secs+'ث');
  ok(g.hidden&&g.bar,'والخياراتُ مخفيّةٌ لا باهتة، والشريطُ يقول متى تظهر');
  ok(!g.lockedWhileClosed,'ونقرةٌ قبل انفتاحها لا تُقفل العنصر');
  const r=await p.evaluate(async()=>{
    startVctx();
    let clicks=0;
    while(!vctxDone&&clicks<40){
      gateReveal();
      const it=vctxCur();if(!it)break;
      const btns=[].slice.call(document.querySelectorAll('.choices button.choice'));
      if(!btns.length)break;
      // نقرةٌ حقيقية على الزرّ **المعروض** لا نداءٌ بفهرس البنك
      btns[0].click();clicks++;
      if(!vctxLocked)break;
      vctxNext();
    }
    return {clicks,done:vctxDone,n:vctxItems.length,
      rows:window.__rows.filter(x=>x[0]==='vctx'),
      result:/جلسة أخرى/.test(app.innerHTML)};
  });
  ok(r.clicks===r.n&&r.done,'نقراتٌ حقيقية أكملت الجلسة — '+r.clicks+' من '+r.n);
  ok(r.result,'وشاشةُ النتيجة ظهرت');
  ok(r.rows.length===r.n,'وسطرٌ لكل إجابة — '+r.rows.length);
  ok(r.rows.every(x=>/^s[01]$/.test(x[1])),'ونوعُ السطر درجةُ السلّم فيُقاس أثرُ التلاشي');
  ok(r.rows.every(x=>/موضع .* · الصواب موضع /.test(String(x[3]))),'وكلُّ سطرٍ بموضعه المعروض');
  ok(r.rows.every(x=>/معنى في سياق · درجة /.test(String((x[6]||{}).q_text||""))),'ونصُّ السؤال وخياراتُه في q_text');
  ok(r.rows.every(x=>/معنى كلمة · (ملف|مؤلَّف)/.test(String((x[6]||{})._sk||""))),'ومصدرُ العنصر موسومٌ فيُقاس المنقولُ مقابل المؤلَّف');
  await p.context().close();
}

// ===== ٥) تباعدُ FSRS: المُتقَن لا يعود، والمستحقّ يعود =====
console.log('\n٥) التباعد');
{
  const p=await mk();
  const r=await p.evaluate(()=>{
    const id=VCTX_BANK[0].id,st={};
    st[id]={box:5,seen:5,due:srsToday()+30,s:30,d:5,last:srsToday()};
    localStorage.setItem(VCTX_SRS_KEY,JSON.stringify(st));
    let seen=0;for(let i=0;i<20;i++)if(buildVctxPlan().some(x=>x.id===id))seen++;
    st[id].due=srsToday()-1;localStorage.setItem(VCTX_SRS_KEY,JSON.stringify(st));
    let due=0;for(let i=0;i<20;i++)if(buildVctxPlan().some(x=>x.id===id))due++;
    return {seen,due};
  });
  ok(r.seen===0,'المُتقَنُ البعيدُ موعدِه لا يعود في عشرين جلسة — '+r.seen);
  ok(r.due>=18,'والمستحقُّ يعود — '+r.due+' من ٢٠');
  await p.context().close();
}

// ===== ٦) بوّابةُ المقروء في الورقة: **مشروطة** =====
console.log('\n٦) بوّابةُ الورقة مشروطةٌ لا مفروضة');
{
  const p=await mk();
  await tapLog(p);
  const r=await p.evaluate(()=>{
    const out={};
    startPlaceSec('read');
    out.key=placeGateKey();
    out.firstOpen=gateOpen()&&gateSecs===0;          // أوّلُ عنصرٍ بلا بوّابة
    // تسرّعان ⇒ تُسلَّح
    placeShownAt=Date.now()-1000;placeChoose(0);
    out.afterOne=placeGateOn;
    placeShownAt=Date.now()-1000;placeChoose(0);
    out.afterTwo=placeGateOn;
    out.armedSecs=gateSecs;
    out.hidden=(render(),!/class="choice"/.test(app.innerHTML));
    out.refused=(function(){const n=placeAns.length;placeChoose(0);return placeAns.length===n})();
    // ثلاثُ إجاباتٍ منخرطة ⇒ تنحلّ
    for(let i=0;i<3;i++){gateReveal();placeShownAt=Date.now()-30000;placeChoose(0)}
    out.cleared=!placeGateOn;
    out.rush=window.__rows.filter(x=>x[0]==='gen'&&x[1]==='place_rush');
    return out;
  });
  ok(r.key==="place:read",'مفتاحُ الأرضيّة للمقروء وحده — '+r.key);
  ok(r.firstOpen,'وأوّلُ عنصرٍ بلا بوّابة — فلا تُفرَض على من لا عَرَض عنده');
  ok(!r.afterOne&&r.afterTwo,'وتسرّعٌ واحد لا يُسلّح وتسرّعان يُسلّحان — نفس SHAPE_ARM');
  ok(r.armedSecs>=5&&r.armedSecs<=9,'وأرضيّتُها ٥-٩ث (دون أسرع إجابةٍ صحيحة أنتجها: ٩٫١٨ث) — '+r.armedSecs+'ث');
  ok(r.hidden,'والخياراتُ مخفيّةٌ ما دامت مغلقة');
  ok(r.refused,'ونقرةٌ قبل انفتاحها لا تُحتسَب إجابة');
  ok(r.cleared,'وثلاثُ إجاباتٍ منخرطة تُحلّها — تنحلّ عند زوال العَرَض');
  ok(r.rush.length===1,'وسطرٌ واحد يقول إنها سُلِّحت — '+r.rush.length);
  ok(r.rush.length===1&&/بوّابة تسرّع · تحديد مستوى/.test(String((r.rush[0][6]||{}).q_text||"")),
    'ونصُّه يسمّي القسم والعدد');
  // ولا تمسّ قسماً آخر إطلاقاً
  const other=await p.evaluate(()=>{
    const out={};
    ['struct','write','listen'].forEach(k=>{
      startPlaceSec(k);out[k]={key:placeGateKey(),secs:gateSecs,open:gateOpen()};
      for(let i=0;i<4;i++){placeShownAt=Date.now()-500;placeChoose(0)}
      out[k].armed=placeGateOn;out[k].secsAfter=gateSecs;
    });
    return out;
  });
  ok(['struct','write','listen'].every(k=>other[k].key===null&&other[k].secs===0&&other[k].open),
    'والتراكيبُ والتحليلُ والاستماع بلا أرضيّةٍ إطلاقاً — '+JSON.stringify(other.struct));
  ok(['struct','write','listen'].every(k=>!other[k].armed&&other[k].secsAfter===0),
    'ولا تُسلَّح فيها ولو أُجيبت كلُّها في نصف ثانية — فالأداةُ لم تتغيّر على محمد');
  await p.context().close();
}

// ===== ٧) وسمُ المهارة يبلغ السجلّ =====
console.log('\n٧) `_sk` في قسم المقروء');
{
  const p=await mk();
  await tapLog(p);
  const r=await p.evaluate(()=>{
    startPlaceSec('read');
    const want=[];
    while(!placeDone){
      gateReveal();
      const x=placeCur();want.push({id:x.it.id,sk:x.it.sk});
      placeShownAt=Date.now()-30000;placeChoose(0);
    }
    const rows=window.__rows.filter(x=>x[0]==='wejplace'&&x[1]==='read');
    let okSk=0,okQ=0;
    want.forEach(w=>{
      const row=rows.filter(x=>x[4]===w.id)[0];if(!row)return;
      if(String((row[6]||{})._sk||"")===w.sk)okSk++;
      if(String((row[6]||{}).q_text||"").indexOf(" · "+w.sk+" · ")>=0)okQ++;
    });
    const skills=[...new Set(want.map(w=>w.sk))];
    return {n:want.length,okSk,okQ,skills,rows:rows.length};
  });
  ok(r.okSk===r.n&&r.n>0,'كلُّ سطرٍ يحمل مهارةَ عنصره في `_sk` — '+r.okSk+'/'+r.n);
  ok(r.okQ===r.n,'ونصُّ السطر يحملها كذلك فتُقرأ بالعين — '+r.okQ+'/'+r.n);
  ok(r.skills.length>=5,'والورقةُ تغطّي مهاراتٍ متعدّدة فيصير السؤال «أيُّها أضعف» قابلاً للقياس — '+r.skills.length);
  ok(r.skills.indexOf("معنى كلمة")>=0,'ومنها «معنى كلمة» — الثقبُ الذي كشفته ورقتُه');
  await p.context().close();
}

// ===== ٨) سطرُ التقرير: مرّةً لكل حالة =====
console.log('\n٨) التقريرُ يُسجَّل مرّةً لكل حالة');
{
  const p=await mk();
  await tapLog(p);
  const r=await p.evaluate(()=>{
    const st={listen:{n:20,ok:15,secs:700,d:"2026-10-14",medMs:26000,chance:33,
        byLevel:{A1:{n:4,ok:4},A2:{n:4,ok:4},B1:{n:4,ok:3},B2:{n:4,ok:2},C1:{n:4,ok:2}},
        byRule:{},byPos:{}},
      read:{n:40,ok:13,secs:1275,d:"2026-10-15",medMs:27000,chance:25,byLevel:{},byRule:{},byPos:{}}};
    placeSave(st);localStorage.removeItem(PLACE_REPORT_KEY);
    window.__rows=[];
    mode="placeReport";render();render();render();
    const first=window.__rows.filter(x=>x[0]==='wejplace'&&x[1]==='report');
    // قسمٌ ثالث يكتمل ⇒ سطرٌ جديد
    st.struct={n:30,ok:21,secs:2172,d:"2026-10-14",medMs:59000,chance:25,byLevel:{},byRule:{},byPos:{}};
    placeSave(st);render();
    const after=window.__rows.filter(x=>x[0]==='wejplace'&&x[1]==='report');
    return {first:first.length,after:after.length,
      row:first[0]?{r:first[0][3],x:first[0][6]}:null,
      second:after[1]?after[1][3]:null};
  });
  ok(r.first===1,'ثلاثُ رسماتٍ للشاشة ⇒ سطرٌ واحد — '+r.first);
  ok(r.after===2,'وقسمٌ ثالث يكتمل ⇒ سطرٌ ثانٍ — '+r.after);
  ok(r.row&&/٪/.test(String(r.row.r))&&(r.row.x||{}).score_pct===47,
    'والسطرُ يحمل الدرجةَ الموزونة — '+(r.row&&r.row.r));
  ok(r.row&&/A2/.test(String((r.row.x||{})._sk||"")),
    'وتقديرَ CEFR كما عُرض (أعلى درجةٍ بلغت ٨٥٪ = A2) — '+(r.row&&(r.row.x||{})._sk));
  ok(r.row&&/تقرير تحديد المستوى/.test(String((r.row.x||{}).q_text||"")),'ونصُّه يفصّل الأقسام');
  await p.context().close();
}

// ===== ٩) الظهورُ على الصفحات الثلاث، وبلا خطابٍ مؤنّث عند الأخوين =====
console.log('\n٩) الظهور والخطاب');
{
  for(const f of ['index.html','mohammed.html','elias.html']){
    const p=await mk(f);
    const r=await p.evaluate(()=>{
      homeToggleSubs();home();
      const t=app.innerText;
      return {has:/معنى الكلمة في السياق/.test(t),
        fem:/اختاري|ابدئي|ارجعي|أجيبي|تُبرَز لكِ/.test(t)};
    });
    ok(r.has,f+': الزرُّ ظاهر');
    if(f!=='index.html')ok(!r.fem,f+': وبلا خطابٍ مؤنّث');
    await p.context().close();
  }
}

// ===== ١٠) بلا فيضانٍ أفقي على عرض الهاتف =====
console.log('\n١٠) العرض على عرض الهاتف');
{
  const p=await mk();
  const r=await p.evaluate(()=>{
    localStorage.setItem(VCTX_STAGE_KEY,JSON.stringify({s:0,up:0,dn:0}));
    startVctx();gateReveal();
    const a=[].filter.call(document.querySelectorAll('.card *'),
      e=>e.getBoundingClientRect().right>420.5||e.getBoundingClientRect().left<-0.5).length;
    const it=vctxCur();vctxChoose(it.a);
    const bAfter=[].filter.call(document.querySelectorAll('.card *'),
      e=>e.getBoundingClientRect().right>420.5||e.getBoundingClientRect().left<-0.5).length;
    return {a,bAfter,docW:document.documentElement.scrollWidth};
  });
  ok(r.docW<=420,'لا تمريرٌ أفقي للصفحة — '+r.docW+'px');
  ok(r.a===0,'ولا عنصرَ يتجاوز العرض قبل الاختيار — '+r.a);
  ok(r.bAfter===0,'ولا بعده (صندوقُ المعنى) — '+r.bAfter);
  await p.context().close();
}

console.log('\n'+(fail?'✗ FAIL':'✓')+' نجح '+pass+' · فشل '+fail);
await b.close();
process.exit(fail?1:0);
})();
