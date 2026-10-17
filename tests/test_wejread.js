// مقروء وجدان + حارسُ جملة الدليل — ١٧ أكتوبر
// الأمر: «افتح كل شي». والمحبوسُ فعلاً ثلاثون سؤال فهمٍ من نموذج وجدان ٤٩ كانت
// تُستعمَل في ورقة تحديد المستوى وحدها (وعشرةٌ منها فُتحت ١٥ أكتوبر قسمَ `vctx`).
//
// **وأهمُّ ما يحرسه هذا الملفّ ليس القسم الجديد بل `decisiveEvidence`**: لقطةُ شاشةٍ
// كشفت أن الإبراز كان يقع على **العنوان** لا على جملة الدليل، لأن الترجيح بعدد
// الكلمات المشتركة يتعادل عند كلمةِ الموضوع المتكرّرة. والقياسُ على البنوك الأربعة
// قبل العلاج: `listen` ٥٦٪ · `wejl` ٦٢٪ · `read` ٣٨٪ · `wejr` ٥٦٪ **إبرازاً
// اعتباطياً من المُبرَز** — ومنها قسمٌ شُحن في اليوم نفسه. فالعيبُ صنفٌ لا حالة.
const {chromium}=require('/opt/node22/lib/node_modules/playwright');
let pass=0,fail=0;
const ok=(c,m)=>{c?(pass++,console.log('  ✓ '+m)):(fail++,console.log('  ✗ FAIL '+m))};
const BASE='http://127.0.0.1:8931/';

(async()=>{
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'});
const mk=async(file)=>{
  const ctx=await b.newContext({viewport:{width:420,height:900}});
  const p=await ctx.newPage();
  p.on('pageerror',e=>{fail++;console.log('  ✗ PAGEERROR '+e.message)});
  await p.route('**/functions/v1/**',r=>r.fulfill({status:200,contentType:'application/json',body:'{}'}));
  await p.route('**/rest/v1/**',r=>r.fulfill({status:200,contentType:'application/json',body:'[]'}));
  await p.goto(BASE+(file||'index.html'),{waitUntil:'domcontentloaded'});
  await p.waitForFunction(()=>typeof render==='function',{timeout:20000});
  await p.evaluate(()=>localStorage.clear());
  return p;
};
const openGate=p=>p.evaluate(()=>{gateLeft=0;gateStop();render()});
const tapLog=p=>p.evaluate(()=>{window.__rows=[];const o=window.logAnswer;
  window.logAnswer=function(){window.__rows.push([].slice.call(arguments));return o.apply(this,arguments)}});

// ===== ١) البنكُ نفسُ بنك الورقة مُرشَّحاً — لا نسخةَ ثانية تنحرف عن المفتاح =====
console.log('\n١) البنكُ مُرشَّحٌ من بنك الورقة لا منسوخ');
{
  const p=await mk();
  const r=await p.evaluate(()=>{
    const bad={opts:[],key:[],dup:[],ar:[],psg:[],id:[]};
    const ids={};
    WEJR_BANK.forEach(function(x){
      if(x.c.length!==4)bad.opts.push(x.id);
      if(!(x.a>=0&&x.a<x.c.length))bad.key.push(x.id);
      if(new Set(x.c.map(function(o){return o.toLowerCase().trim()})).size!==x.c.length)bad.dup.push(x.id);
      if(/[ء-غف-ي]/.test(x.q+x.c.join(' ')+x.passage))bad.ar.push(x.id);
      // أربعةُ عناصرَ معلّقةٌ برسمٍ بيانيّ **بلا قطعةٍ أصلاً** — بياناتُها في الرسم
      // وحده. فالشرطُ «قطعةٌ أو رسم» لا «قطعةٌ دائماً»، وصندوقُ القطعة لا يُرسَم فارغاً.
      if(!(x.passage&&x.passage.length>=40)&&!x.chart)bad.psg.push(x.id);
      if(ids[x.id])bad.id.push(x.id);ids[x.id]=1;
    });
    // كلُّ عنصرٍ موجودٌ **بعينه** في بنك الورقة بنفس مفتاحه — فمفتاحٌ واحد لا اثنان
    const drift=WEJR_BANK.filter(function(x){
      const src=PLACE_READ_BANK.filter(function(y){return y.id===x.id})[0];
      return !src||src.a!==x.a||src.c.join('|')!==x.c.join('|')||src.q!==x.q;
    }).map(function(x){return x.id});
    const vctxIds=new Set(VCTX_BANK.map(function(v){return v.id}));
    return {n:WEJR_BANK.length,place:PLACE_READ_BANK.length,vctx:VCTX_BANK.length,bad:bad,drift:drift,
      wordMeaning:WEJR_BANK.filter(function(x){return x.sk==="معنى كلمة"}).length,
      overlapVctx:WEJR_BANK.filter(function(x){return vctxIds.has(x.id)}).length,
      sks:Object.keys(WEJR_BANK.reduce(function(a,x){a[x.sk]=1;return a},{})).length,
      charts:WEJR_BANK.filter(function(x){return x.chart}).length,
      N:WEJR_N};
  });
  ok(r.n>=2*r.N,`البنك ${r.n} عنصراً — ضِعفُ الجلسة (${r.N}) على الأقلّ`);
  ok(r.n+10===r.place,`وهو بنكُ الورقة (${r.place}) ناقصاً العشرةَ التي صارت قسمَ معنى الكلمة`);
  ok(!r.drift.length,'ولا عنصرَ انحرف مفتاحُه أو خياراتُه عن بنك الورقة — مفتاحٌ واحد لا اثنان'
    +(r.drift.length?` — ${r.drift.slice(0,3)}`:''));
  ok(r.wordMeaning===0&&r.overlapVctx===0,'ولا تداخلَ مع قسم معنى الكلمة — فلا عنصرَ في بابين');
  ok(!r.bad.opts.length&&!r.bad.key.length,'وأربعةُ خيارات وفهرسُ صوابٍ داخل المدى');
  ok(!r.bad.dup.length,'ولا خيارَين متطابقين');
  ok(!r.bad.ar.length,'ولا تلوّثَ عربي في قطعةٍ أو سؤالٍ أو خيار');
  ok(!r.bad.psg.length,'ولكلِّ عنصرٍ قطعتُه أو رسمُه');
  ok(!r.bad.id.length,'ولا معرّفَ مكرّراً');
  ok(r.sks>=6,`ومهاراتُه ${r.sks} — فليست نوعاً واحداً`);
  ok(r.charts>=1,`ومنها ${r.charts} معلّقةٌ برسمٍ بيانيّ`);
  // وصندوقُ القطعة لا يُرسَم فارغاً لعنصرٍ بلا قطعة — كشفه هذا الاختبار لا الفحص
  const empty=await p.evaluate(()=>{
    const it=WEJR_BANK.filter(function(x){return x.chart&&!x.passage})[0];
    if(!it)return {skip:true};
    wejrItems=[it];wejrIdx=0;wejrPicked=-1;wejrLocked=false;wejrScore=0;wejrDone=false;
    wejrOrderId=null;mode="wejr";gateLeft=0;gateStop();render();
    const boxes=Array.from(document.querySelectorAll('.card div')).filter(function(d){
      return /FFFBEB|255, 251, 235/.test(d.getAttribute('style')||'')});
    return {boxes:boxes.length,svg:document.querySelectorAll('.card svg').length};
  });
  ok(empty.skip||empty.boxes===0,`ولا صندوقَ قطعةٍ فارغ لعنصر الرسم (${empty.boxes})`);
  ok(empty.skip||empty.svg>=1,`والرسمُ معروضٌ مكانَه (${empty.svg})`);
  // ونصُّ ما بعد القفل يوافق ما هو معروضٌ فعلاً: «موزَّعٌ في القطعة» على عنصرٍ **بلا
  // قطعة** دعوى كاذبة — كشفته اللقطة لا الاختبار، وهي نفسُ عائلة «اقرئي الكلمة
  // المكتوبة» على شاشةٍ لا كلمةَ فيها (٢٩ أغسطس).
  const chartTxt=await p.evaluate(()=>{
    const it=WEJR_BANK.filter(function(x){return x.chart&&!x.passage})[0];
    if(!it)return {skip:true};
    wejrItems=[it];wejrIdx=0;wejrPicked=-1;wejrLocked=false;wejrScore=0;wejrDone=false;
    wejrOrderId=null;mode="wejr";gateLeft=0;gateStop();render();
    wejrChoose(wejrOrd(it).filter(function(w){return w!==it.a})[0]);
    return {t:app.innerText};
  });
  ok(chartTxt.skip||chartTxt.t.indexOf('موزَّعٌ في القطعة')<0,'ولا يُقال «موزَّعٌ في القطعة» لعنصرٍ بلا قطعة');
  ok(chartTxt.skip||chartTxt.t.indexOf('يُقرأ من الرسم')>=0,'بل يُقال إن الجواب يُقرأ من الرسم');
  await p.context().close();
}

// ===== ٢) حارسُ جملة الدليل: الحالةُ التي كشفتها اللقطة بعينها =====
console.log('\n٢) لا تُبرَز جملةٌ إلّا إذا رجّحها النصّ وحدها');
{
  const p=await mk();
  const r=await p.evaluate(()=>{
    // العنصرُ الذي كشفته اللقطة: صوابُه «The Aral Sea got smaller» والعنوانُ كان يُبرَز
    const it=WEJR_BANK.filter(function(x){return /Aral Sea got smaller/i.test(x.c[x.a])})[0];
    const old=it?evidenceSentence(it.passage,it.c[it.a]):null;
    return {found:!!it,
      oldHead:old?/^The Aral Sea/.test(old.trim()):null,
      oldIsTitle:old?/large lake/i.test(old):null,
      now:it?decisiveEvidence(it.passage,it.c[it.a]):null,
      // والجملةُ الحقيقية موجودةٌ في القطعة — فالمشكلة ترجيحٌ لا غياب
      realInPassage:it?/lost 60%/.test(it.passage):null};
  });
  ok(r.found,'العنصرُ الذي كشفته اللقطة موجودٌ بعينه');
  ok(r.oldIsTitle===true,'والترجيحُ القديم كان يُبرز العنوانَ والجملةَ الأولى — لا الدليل');
  ok(r.realInPassage===true,'والدليلُ الحقيقي («lost 60%») في القطعة — فالعلّة ترجيحٌ لا غياب');
  ok(r.now==='','والحارسُ يمتنع عن الإبراز بدل أن يُبرز خطأً');
  // والامتناعُ يُقال على الشاشة ولا يُدَّعى دليلٌ غيرُ موجود
  await p.evaluate(()=>{
    const it=WEJR_BANK.filter(function(x){return /Aral Sea got smaller/i.test(x.c[x.a])})[0];
    wejrItems=[it];wejrIdx=0;wejrPicked=-1;wejrLocked=false;wejrScore=0;wejrDone=false;
    wejrOrderId=null;mode="wejr";gateLeft=0;gateStop();render();
    const wrong=wejrOrd(it).filter(function(w){return w!==it.a})[0];
    wejrChoose(wrong);
  });
  const t=await p.textContent('#app');
  ok(t.indexOf('الجملة المُبرَزة أعلاه هي الدليل')<0,'ولا تُدَّعى جملةُ دليلٍ حيث لا تُبرَز');
  ok(t.indexOf('موزَّعٌ في القطعة')>=0,'ويُقال للمتعلّم إن الدليل موزَّعٌ في القطعة');
  const bold=await p.evaluate(()=>document.querySelectorAll('.card b').length);
  ok(bold===0,'ولا وسمَ إبرازٍ في الصفحة إطلاقاً');
  await p.context().close();
}

// ===== ٣) وحين يكون الترجيح حاسماً يُبرَز ويُدَّعى =====
console.log('\n٣) والحاسمُ يُبرَز فعلاً');
{
  const p=await mk();
  const r=await p.evaluate(()=>{
    const it=WEJR_BANK.filter(function(x){return decisiveEvidence(x.passage,x.c[x.a])})[0];
    if(!it)return {none:true};
    const ev=decisiveEvidence(it.passage,it.c[it.a]);
    wejrItems=[it];wejrIdx=0;wejrPicked=-1;wejrLocked=false;wejrScore=0;wejrDone=false;
    wejrOrderId=null;mode="wejr";gateLeft=0;gateStop();render();
    const wrong=wejrOrd(it).filter(function(w){return w!==it.a})[0];
    wejrChoose(wrong);
    return {ev:ev,inPassage:it.passage.indexOf(ev)>=0,
      bold:document.querySelectorAll('.card b').length,
      claim:app.innerText.indexOf('الجملة المُبرَزة أعلاه هي الدليل')>=0};
  });
  ok(!r.none&&r.inPassage,'الجملةُ الحاسمة موجودةٌ في قطعتها حرفياً');
  ok(r.bold===1,`وتُبرَز مرّةً واحدة (${r.bold})`);
  ok(r.claim===true,'ويُقال إنها الدليل — فالادّعاءُ حيث يصحّ وحده');
  await p.context().close();
}

// ===== ٤) الحارسُ يسري على البنوك الأربعة لا على الجديد وحده =====
console.log('\n٤) الحارسُ صنفٌ لا حالة — والبنوكُ الأربعة');
{
  const p=await mk();
  const r=await p.evaluate(()=>{
    const f=function(bank,txt){
      return {n:bank.length,
        old:bank.filter(function(x){return evidenceSentence(txt(x),x.c[x.a])}).length,
        now:bank.filter(function(x){return decisiveEvidence(txt(x),x.c[x.a])}).length};
    };
    return {listen:f(LISTEN_BANK,function(x){return x.audio}),
            wejl:f(WEJL_BANK,function(x){return x.audio}),
            read:f(READ_BANK,function(x){return x.passage}),
            wejr:f(WEJR_BANK,function(x){return x.passage}),
            // وهدفُ القراءة الجهرية **لم يُمَسّ** — التعادلُ هناك غيرُ ضارّ
            raSrc:READ_BANK.filter(function(x){return evidenceSentence(x.passage,x.c[x.a])}).length};
  });
  let dropped=0;
  ['listen','wejl','read','wejr'].forEach(function(k){
    const x=r[k];dropped+=x.old-x.now;
    ok(x.now<=x.old,`${k}: ${x.old} ⇐ ${x.now} (أُسقط ${x.old-x.now})`);
  });
  ok(dropped>=50,`وأُسقط ${dropped} إبرازاً اعتباطياً إجمالاً — فالعلاجُ صنفيّ لا موضعيّ`);
  ok(r.read.now>0&&r.wejr.now>0,'ولم يُلغَ الإبرازُ بالكامل — الحاسمُ باقٍ');
  ok(r.raSrc===r.read.old,`وهدفُ القراءة الجهرية لم يُمَسّ (${r.raSrc}) — التعادلُ هناك غيرُ ضارّ`);
  await p.context().close();
}

// ===== ٥) الخلطُ والتسجيلُ بالموضع المعروض =====
console.log('\n٥) الخلطُ في العرض والتسجيلُ بالموضع');
{
  const p=await mk();
  const spread=await p.evaluate(()=>{
    const pos={},it=WEJR_BANK[0];
    for(let k=0;k<300;k++){wejrOrderId=null;const ord=wejrOrd(it);
      pos[ord.indexOf(it.a)+1]=(pos[ord.indexOf(it.a)+1]|0)+1}
    wejrOrderId=null;return pos;
  });
  const vals=[1,2,3,4].map(k=>spread[k]|0);
  ok(vals.every(v=>v>40),`الصوابُ يظهر في المواضع الأربعة (${vals.join('/')})`);
  await tapLog(p);
  const row=await p.evaluate(()=>{
    startWejr();gateLeft=0;gateStop();render();
    const it=wejrCur(),ord=wejrOrd(it);
    wejrChoose(ord[0]);
    const r=(window.__rows.filter(function(x){return x[0]==='wejr'})[0]||[]);
    return {resp:r[3]||'',qt:r[1]||'',q:(r[6]||{}).q_text||'',sk:(r[6]||{})._sk||'',
      id:r[4]||'',shown:it.c[ord[0]]};
  });
  ok(/^موضع ١ ·/.test(row.resp),`الإجابةُ تحمل موضعَها المعروض (${row.resp.slice(0,30)})`);
  ok(row.resp.indexOf(row.shown)>0,'ونصَّ ما اختير فعلاً');
  ok(/^pr49_/.test(row.id),`والمعرّفُ من بنك الورقة (${row.id})`);
  ok(row.q.indexOf('[مصدر:وجدان ٤٩]')===0,'وسطرُ السؤال يبدأ بوسم المصدر — فينجو من القصّ');
  ok(row.sk.length>0&&row.qt.length>0,`والمهارةُ تصل السطر (${row.sk} · ${row.qt})`);
  ok(/1\) .+ \| 2\) .+ \| 3\) .+ \| 4\) /.test(row.q)&&row.q.indexOf('✓')>0,'والخياراتُ بترتيب العرض وموضعُ الصواب موسوم');
  await p.context().close();
}

// ===== ٦) البوّابةُ مستعارةٌ من `place:read` ولا تُخترَع =====
console.log('\n٦) بوّابةُ التسرّع');
{
  const p=await mk();
  await p.evaluate(()=>startWejr());
  const before=await p.evaluate(()=>({left:gateLeft,btns:document.querySelectorAll('.choices .choice').length,
    floor:SEC_GATE_FLOOR["place:read"],max:SEC_GATE_MAX["place:read"],own:!!(SEC_GATE_FLOOR.wejr||SEC_GATE_MAX.wejr)}));
  ok(before.left>=before.floor&&before.left<=before.max,
    `الأرضيّةُ داخل مفتاح place:read المستعار (${before.left} في ${before.floor}-${before.max})`);
  ok(!before.own,'ولا مفتاحَ مخترَعٌ لهذا القسم');
  ok(before.btns===0,'ولا خيارَ معروضٌ قبلها');
  const blocked=await p.evaluate(()=>{wejrChoose(0);return wejrLocked});
  ok(blocked===false,'والنقرُ قبلها لا يُحرق العنصر');
  await openGate(p);
  ok(await p.evaluate(()=>document.querySelectorAll('.choices .choice').length)===4,'وبعدها تظهر الأربعة');
  await p.context().close();
}

// ===== ٧) التباعدُ وحجمُ الجلسة =====
console.log('\n٧) التباعد وحجمُ الجلسة');
{
  const p=await mk();
  const r=await p.evaluate(()=>{
    const st={},mastered=WEJR_BANK.slice(0,12).map(function(x){return x.id});
    mastered.forEach(function(id){st[id]={box:6,seen:6,due:srsToday()+40,s:60,d:5,last:srsToday()}});
    lsSet(WEJR_SRS_KEY,JSON.stringify(st));
    let back=0,total=0,sizes=[],worstDup=0;
    for(let k=0;k<20;k++){
      const plan=buildWejrPlan();total+=plan.length;sizes.push(plan.length);
      back+=plan.filter(function(x){return mastered.indexOf(x.id)>=0}).length;
      const c={};let m=0;plan.forEach(function(x){c[x.id]=(c[x.id]|0)+1;if(c[x.id]>m)m=c[x.id]});
      if(m>worstDup)worstDup=m;
    }
    return {back:back,total:total,min:Math.min.apply(null,sizes),N:WEJR_N,dup:worstDup};
  });
  ok(r.min===r.N,`كلُّ جلسةٍ بلغت حجمَها (${r.min}/${r.N}) — قاعدة ١٨ أغسطس`);
  ok(r.dup===1,`ولا عنصرَ مرّتين في جلسةٍ واحدة (${r.dup})`);
  ok(r.back<=Math.ceil(r.total*0.25),`والمُتقَنُ بعيدُ الموعد نادرٌ — ${r.back} من ${r.total} خانة (البنك ٣٠ والجلسة ٨، فالحشوُ لا مفرّ منه)`);
  const dueBack=await p.evaluate(()=>{
    const st={},due=WEJR_BANK.slice(20,28).map(function(x){return x.id});
    due.forEach(function(id){st[id]={box:2,seen:2,due:srsToday()-1,s:5,d:5,last:srsToday()-5}});
    lsSet(WEJR_SRS_KEY,JSON.stringify(st));
    return buildWejrPlan().filter(function(x){return due.indexOf(x.id)>=0}).length;
  });
  ok(dueBack>0,`والمستحقُّ يعود فعلاً (${dueBack} من ٨)`);
  await p.context().close();
}

// ===== ٨) جلسةٌ كاملة، والظهورُ على الصفحات الثلاث =====
console.log('\n٨) جلسةٌ كاملة والظهورُ على الصفحات الثلاث');
{
  const p=await mk();
  await tapLog(p);
  await p.evaluate(()=>startWejr());
  for(let k=0;k<8;k++){
    await openGate(p);
    const btns=await p.$$('.choices .choice');
    if(!btns.length){ok(false,'انقطعت الجلسة عند '+(k+1));break}
    const right=await p.evaluate(()=>{const it=wejrCur();return wejrOrd(it).indexOf(it.a)});
    await btns[right].click();
    await p.waitForTimeout(60);
    const nx=await p.$('button.btn');
    if(nx)await nx.click();
    await p.waitForTimeout(80);
  }
  const rows=await p.evaluate(()=>window.__rows.filter(function(x){return x[0]==='wejr'}));
  ok(rows.length===8,`ثماني إجاباتٍ مسجَّلة (${rows.length})`);
  ok(rows.every(r=>r[2]===true),'وكلُّها صوابٌ — فالمفتاح المعروض هو المحتسَب');
  ok(new Set(rows.map(r=>r[4])).size===8,'وثمانيةُ معرّفاتٍ متمايزة');
  const t=await p.textContent('#app');
  ok(t.indexOf('جلسة أخرى')>=0,'وشاشةُ النتيجة ظهرت');
  await p.context().close();
}
for(const f of ['index.html','mohammed.html','elias.html']){
  const p=await mk(f);
  const t=await p.textContent('#app');
  ok(t.indexOf('مقروء وجدان')>=0,`${f}: البلاطةُ معروضة`);
  ok(await p.evaluate(()=>{startWejr();return mode})==='wejr',`${f}: والزرُّ يفتح القسم بنقرةٍ واحدة`);
  await p.evaluate(()=>{gateLeft=0;gateStop();render()});
  await p.waitForTimeout(250);
  const scr=await p.textContent('#app');
  if(f!=='index.html')ok(!/اقرئي|اختاري|فهمتِ|عودي/.test(scr),`${f}: وبلا خطابٍ مؤنّث`);
  const over=await p.evaluate(()=>{
    const w=document.documentElement.clientWidth,bad=[];
    document.querySelectorAll('#app *').forEach(function(e){const r=e.getBoundingClientRect();
      if(r.width>0&&(r.right>w+1||r.left<-1))bad.push(e.className||e.tagName)});
    return {w:w,sw:document.documentElement.scrollWidth,n:bad.length,bad:bad.slice(0,3)};
  });
  ok(over.n===0&&over.sw<=over.w+1,`${f}: وصفرُ عنصرٍ يتجاوز ${over.w} بكسلاً`+(over.n?' — '+over.bad.join('، '):''));
  await p.context().close();
}

await b.close();
console.log(`\n${fail?'✗ FAIL':'✓'} ${pass} نجحت · ${fail} فشلت`);
process.exit(fail?1:0);
})();
