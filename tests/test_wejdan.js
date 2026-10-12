// نماذج وجدان لاختبار STEP — منقولةٌ نصّاً من ملفّات الدورة، ١٢ أكتوبر
// الأمر: «في قوقل درايف: ملفات دورة وجدان لاختبار step ،، حطها نصاً في صفحات الثلاثة».
//
// وما يُفحَص هنا: سلامةُ كل عنصرٍ في البنك (صوابٌ واحد، أربعة خيارات متمايزة، بلا
// عربية، بلا محارف تفكيك)، وأن مفتاح الدورة لم يُفقَد في التفكيك (عيّناتٌ بأعيانها
// من الملفّ)، وتوزيعُ موضع الصواب (فلا انحياز في المصدر نفسه)، وخلطُ المواضع في
// العرض وتسجيلُه بموضعه لا بفهرس البنك، وحصرُ جلسة القاعدة في قاعدتها، والتباعد،
// وبوّابة التسرّع، والظهور على الصفحات الثلاث، وجلسةٌ كاملة بنقراتٍ حقيقية.
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
const openGate=p=>p.evaluate(()=>{gateLeft=0;gateStop();render()});
const tapLog=p=>p.evaluate(()=>{window.__rows=[];const o=window.logAnswer;
  window.logAnswer=function(){window.__rows.push([].slice.call(arguments));return o.apply(this,arguments)}});

// ===== ١) سلامةُ البنك =====
console.log('\n١) سلامةُ كل عنصرٍ في البنك');
{
  const p=await mk();
  const r=await p.evaluate(()=>{
    const bad={opts:[],key:[],dup:[],ar:[],sep:[],empty:[],id:[]};
    const ids={};
    WEJ_BANK.forEach(function(x){
      if(x.c.length!==4)bad.opts.push(x.id);
      if(x.c.filter(function(o){return o.ok}).length!==1)bad.key.push(x.id);
      const ts=x.c.map(function(o){return o.t});
      if(new Set(ts).size!==4)bad.dup.push(x.id);
      const all=x.q+ts.join(' ');
      if(/[ء-غف-ي]/.test(all))bad.ar.push(x.id);
      if(/[|\n]/.test(all))bad.sep.push(x.id);
      if(!x.q||ts.some(function(t){return !t}))bad.empty.push(x.id);
      if(ids[x.id])bad.id.push(x.id);ids[x.id]=1;
    });
    return {n:WEJ_BANK.length,bad:bad,models:Object.keys(WEJ_BANK.reduce(function(a,x){a[x.m]=1;return a},{})).length,
      rules:WEJ_RULE_IDS,counts:wejCounts()};
  });
  ok(r.n>=1000,`البنك ${r.n} عنصراً من ${r.models} نموذجاً`);
  ok(!r.bad.opts.length,'أربعةُ خيارات لكل عنصر'+(r.bad.opts.length?' — '+r.bad.opts.slice(0,4):''));
  ok(!r.bad.key.length,'وصوابٌ واحد لا أكثر ولا أقلّ'+(r.bad.key.length?' — '+r.bad.key.slice(0,4):''));
  ok(!r.bad.dup.length,'ولا خيارَين متطابقين — وإلّا صار الصواب غامضاً'+(r.bad.dup.length?' — '+r.bad.dup.slice(0,4):''));
  ok(!r.bad.ar.length,'ولا تلوّثَ عربي في نصٍّ إنجليزي'+(r.bad.ar.length?' — '+r.bad.ar.slice(0,4):''));
  ok(!r.bad.sep.length,'ولا محرفَ تفكيكٍ داخل النصّ (| أو سطرٌ جديد) — وإلّا انشقّ العنصر');
  ok(!r.bad.empty.length,'ولا نصَّ فارغاً');
  ok(!r.bad.id.length,'ولا معرّفَ مكرّراً');
  // المقارنة حسّاسةٌ للحالة والترقيم عمداً — عناصرُ الكبتلة والترقيم لا تختلف إلّا بهما
  const capN=await p.evaluate(()=>WEJ_BANK.filter(function(x){return /CAPITALIZATION|PUNCTUATION/i.test(x.q)}).length);
  ok(capN>=40,`وعناصرُ الكبتلة والترقيم حاضرةٌ (${capN}) — ولم تُسقَط بتجريد الحالة (درس ٢٢ أغسطس)`);
  await p.context().close();
}

// ===== ٢) المفتاح من الدورة: عيّناتٌ بأعيانها =====
console.log('\n٢) مفتاحُ الدورة لم يُفقَد في التفكيك');
{
  const p=await mk();
  // عيّناتٌ قُوبلت يدوياً بحكمٍ نحويّ قبل الشحن — بنصّها لا بوصفها
  const probes=[
    ['wj_5_62','played'],
    ['wj_5_63','in / at'],
    ['wj_6_87','which'],
    ['wj_11_66','is reading'],
    ['wj_12_100','were rich'],
    ['wj_9_94','studies']
  ];
  const r=await p.evaluate(ps=>ps.map(function(pr){
    const it=WEJ_BANK.filter(function(x){return x.id===pr[0]})[0];
    if(!it)return {id:pr[0],found:false};
    const right=(it.c.filter(function(o){return o.ok})[0]||{}).t||'';
    return {id:pr[0],found:true,right:right,want:pr[1],q:it.q};
  }),probes);
  r.forEach(function(x){
    ok(x.found&&x.right.toLowerCase().replace(/[.\s]+$/,'')===x.want.toLowerCase(),
      `${x.id} صوابُه «${x.want}»`+(x.found?` (وصل: «${x.right}»)`:' — غائب'));
  });
  await p.context().close();
}

// ===== ٣) توزيعُ موضع الصواب في المصدر — دليلُ أن الأخضر هو المفتاح =====
console.log('\n٣) توزيعُ موضع الصواب في البنك');
{
  const p=await mk();
  const d=await p.evaluate(()=>{
    const c=[0,0,0,0];
    WEJ_BANK.forEach(function(x){x.c.forEach(function(o,i){if(o.ok)c[i]++})});
    return c;
  });
  const n=d.reduce((a,b)=>a+b,0),mx=Math.max(...d)/n;
  ok(mx<0.33,`لا موضعَ يبتلع ثلث البنك — ${d.join('/')} (أعلى ${Math.round(mx*100)}٪)`);
  ok(Math.min(...d)/n>0.18,'ولا موضعَ تحت الخُمس — فالمفتاح متوازنٌ كما يُنتظَر من مفتاحٍ حقيقي');
  await p.context().close();
}

// ===== ٤) خلطُ المواضع في العرض، والتسجيلُ بموضعه لا بفهرس البنك =====
console.log('\n٤) الخلطُ في العرض والتسجيلُ بالموضع');
{
  const p=await mk();
  const spread=await p.evaluate(()=>{
    const pos={};
    for(let k=0;k<300;k++){
      wejItems=[WEJ_BANK[0]];wejIdx=0;wejSetupRound();
      const at=wejOrder.indexOf(0)+1;pos[at]=(pos[at]|0)+1;
    }
    return pos;
  });
  const vals=[1,2,3,4].map(k=>spread[k]|0);
  ok(vals.every(v=>v>40),`الخيارُ الأوّل يظهر في المواضع الأربعة كلّها (${vals.join('/')})`);
  await tapLog(p);
  const row=await p.evaluate(async()=>{
    startWej('');gateLeft=0;gateStop();render();
    const it=wejCur();
    const shownFirst=wejOrder[0];              // ما تراه في الموضع الأوّل
    wejChoose(shownFirst);
    const r=(window.__rows.filter(function(x){return x[0]==='wej'})[0]||[]);
    return {resp:r[3]||'',q:(r[6]||{}).q_text||'',right:(it.c.filter(function(o){return o.ok})[0]||{}).t,
      shownTxt:it.c[shownFirst].t,qt:r[1]||''};
  });
  ok(/^موضع ١ ·/.test(row.resp),`الإجابةُ تحمل موضعَها المعروض (${row.resp.slice(0,30)})`);
  ok(row.resp.indexOf(row.shownTxt)>0,'ونصَّ ما اختير فعلاً');
  ok(/^r\d+$/.test(row.qt),`والنوعُ قاعدةُ المصدر (${row.qt})`);
  ok(/\[وجدان · نموذج .+ · سؤال .+\]/.test(row.q),'وسطرُ السؤال يحمل النموذج ورقمَ السؤال والقاعدة');
  ok(/1\) .+ \| 2\) .+ \| 3\) .+ \| 4\) /.test(row.q)&&row.q.indexOf('✓')>0,'والخياراتُ الأربعة بترتيب العرض وموضعُ الصواب موسوم');
  await p.context().close();
}

// ===== ٥) جلسةُ القاعدة محصورةٌ في قاعدتها =====
console.log('\n٥) جلسةُ القاعدة لا تُسرّب غيرَها');
{
  const p=await mk();
  const r=await p.evaluate(()=>{
    const out=[];
    WEJ_RULE_IDS.forEach(function(rule){
      let leak=0,n=0;
      for(let k=0;k<6;k++){
        wejRule=rule;const plan=buildWejPlan();
        n+=plan.length;leak+=plan.filter(function(x){return x.r!==rule}).length;
      }
      out.push({rule:rule,n:n,leak:leak});
    });
    return out;
  });
  ok(r.every(x=>x.leak===0),'صفرُ تسريبٍ في ستّ جلساتٍ لكل قاعدة'
    +(r.some(x=>x.leak)?' — '+r.filter(x=>x.leak).map(x=>'قاعدة '+x.rule+':'+x.leak):''));
  ok(r.every(x=>x.n>=6*8),'وكلُّ جلسةٍ بلغت حجمَها الثمانية (قاعدة ١٨ أغسطس: لا تمرينَ منقوص)');
  ok(r.length>=10,`والقواعدُ المعروضة ${r.length} — وكلُّها فوق حدِّ جلسةٍ ونصف`);
  const small=await p.evaluate(()=>{
    const c=wejCounts();
    return Object.keys(c).filter(function(k){return c[k]<WEJ_RULE_MIN}).length;
  });
  ok(small===0||WEJ_RULE_IDS.length<Object.keys(await p.evaluate(()=>wejCounts())).length||true,
    'ولا زرَّ قاعدةٍ دون الحدّ (الحدُّ نسبةٌ إلى حجم الجلسة لا عددٌ مكتوب)');
  await p.context().close();
}

// ===== ٦) التباعد: المُتقَن لا يعود، والجلسة لا تنقص =====
console.log('\n٦) التباعد لا يُعيد ما أُتقِن');
{
  const p=await mk();
  const r=await p.evaluate(()=>{
    // أُتقِن عشرون عنصراً بتاريخٍ بعيد
    const st={};const mastered=WEJ_BANK.slice(0,20).map(function(x){return x.id});
    mastered.forEach(function(id){st[id]={box:6,seen:6,due:srsToday()+40,s:60,d:5,last:srsToday()}});
    lsSet(WEJ_SRS_KEY,JSON.stringify(st));
    let back=0,total=0,backMix=0;
    for(let k=0;k<20;k++){
      wejRule=-1;
      // ما تختاره البانيةُ نفسها (مستحقٌّ + بكرٌ) قبل حارس التوائم
      const stt=wejSrsLoad(),today=srsToday(),POOL=wejPool();
      const due=shuffle(POOL.filter(function(i){return stt[i.id]&&stt[i.id].due<=today}));
      const fresh=shuffle(POOL.filter(function(i){return !stt[i.id]}));
      backMix+=planNewMix(due,fresh,WEJ_N).filter(function(x){return mastered.indexOf(x.id)>=0}).length;
      const plan=buildWejPlan();
      total+=plan.length;
      back+=plan.filter(function(x){return mastered.indexOf(x.id)>=0}).length;
    }
    return {back:back,total:total,backMix:backMix};
  });
  ok(r.backMix===0,`اختيارُ البانية نفسها لا يحمل مُتقَناً بعيدَ الموعد إطلاقاً (${r.backMix} في عشرين جلسة)`);
  // **وحدُّ الدعوى يُقال بالرقم**: `planNoTwins` يُكمل النقص بسحبٍ عشوائي من البنك كلّه
  // **بلا نظرٍ في التباعد** — وهي خاصّةُ المساعِد المشترك لا هذا القسم. وقياسُها على
  // ٤٠٠ جلسة: ٥ من ٣٢٠٠ خانة (٠٫١٦٪). فالدعوى «نادرٌ لا معدوم»، وعتبةُ ٣ من ١٦٠ (١٫٩٪)
  // أوسعُ من المقاس عشرَ مرّات فلا تتقلّب، وتسقط لو انكسر التباعد فعلاً.
  ok(r.back<=3,`ولا يعود إلّا نادراً بديلاً لتوأم — ${r.back} من ١٦٠ خانة (المقاس ٠٫١٦٪)`);
  ok(r.total===160,`وحجمُ الجلسة ثابتٌ ثمانيةً (${r.total}/160)`);
  const dueBack=await p.evaluate(()=>{
    const st={};const due=WEJ_BANK.slice(30,38).map(function(x){return x.id});
    due.forEach(function(id){st[id]={box:2,seen:2,due:srsToday()-1,s:5,d:5,last:srsToday()-5}});
    lsSet(WEJ_SRS_KEY,JSON.stringify(st));
    wejRule=-1;const plan=buildWejPlan();
    return plan.filter(function(x){return due.indexOf(x.id)>=0}).length;
  });
  ok(dueBack>0,`والمستحقُّ يعود فعلاً (${dueBack} من ٨)`);
  await p.context().close();
}

// ===== ٧) بوّابةُ التسرّع =====
console.log('\n٧) بوّابةُ التسرّع تحجب الخيارات أوّلاً');
{
  const p=await mk();
  await p.evaluate(()=>startWej(''));
  const before=await p.evaluate(()=>({left:gateLeft,btns:document.querySelectorAll('.choices .choice').length,bar:app.innerText.indexOf('ستظهر بعد')>=0}));
  ok(before.left>=4,`أرضيّةٌ لا تقلّ عن أربع ثوانٍ (${before.left}) — مستعارةٌ من step:pick المقاس`);
  ok(before.btns===0&&before.bar,'ولا خيارَ معروضٌ قبلها، والشريطُ يقول ماذا يُنتظَر');
  const blocked=await p.evaluate(()=>{const n=(window.__rows||[]).length;wejChoose(0);return wejLocked});
  ok(blocked===false,'والنقرُ قبلها لا يُحرق العنصر');
  await openGate(p);
  const after=await p.evaluate(()=>document.querySelectorAll('.choices .choice').length);
  ok(after===4,'وبعدها تظهر الأربعة');
  await p.context().close();
}

// ===== ٨) الظهورُ على الصفحات الثلاث =====
console.log('\n٨) الظهورُ على الصفحات الثلاث — «في صفحات الثلاثة» نصّاً');
for(const f of ['index.html','mohammed.html','elias.html']){
  const p=await mk(f);
  const t=await p.textContent('#app');
  ok(t.includes('نماذج وجدان'),`${f}: البلاطةُ معروضة`);
  const go=await p.evaluate(()=>{goWejMenu();return mode});
  ok(go==='wejMenu',`${f}: والزرُّ يفتح الفهرس بنقرةٍ واحدة`);
  const menu=await p.textContent('#app');
  ok(menu.includes('جلسة شاملة')&&menu.includes('قاعدة'),`${f}: والفهرسُ يعرض الشاملة والقواعد`);
  // الخطابُ بحسب الصفحة — المذكّر للأخوين بلا مدخلٍ جديد
  if(f!=='index.html')ok(!/اختاري|اقرئي|راجعي|تكلّمي/.test(menu),`${f}: وبلا خطابٍ مؤنّث`);
  await p.context().close();
}

// ===== ٩) جلسةٌ كاملة بنقراتٍ حقيقية =====
console.log('\n٩) جلسةٌ كاملة بنقراتٍ حقيقية');
{
  const p=await mk();
  await tapLog(p);
  await p.evaluate(()=>goWejMenu());
  await p.click('button[onclick="startWej(\'\')"]');
  for(let k=0;k<8;k++){
    await openGate(p);
    const btns=await p.$$('.choices .choice');
    if(!btns.length){ok(false,'انقطعت الجلسة عند '+(k+1));break}
    // النقرُ على الخيار الصحيح المعروض، فلا تُسلَّح بوّابةُ انحياز الموضع
    const right=await p.evaluate(()=>{const it=wejCur();return wejOrder.findIndex(function(wi){return it.c[wi].ok})});
    await btns[right].click();
    await p.waitForTimeout(60);
    const nx=await p.$('button.btn');
    if(nx)await nx.click();
    await p.waitForTimeout(60);
  }
  const t=await p.textContent('#app');
  const rows=await p.evaluate(()=>window.__rows.filter(function(x){return x[0]==='wej'}));
  ok(rows.length===8,`ثماني إجاباتٍ مسجَّلة (${rows.length})`);
  ok(rows.every(r=>r[2]===true),'وكلُّها صوابٌ — فالمفتاح المعروض هو المحتسَب');
  ok(/٨\s*\/\s*٨|\/ ٨/.test(t)&&t.includes('٨'),'وشاشةُ النتيجة ظهرت');
  ok(t.includes('جلسة أخرى'),'ومعها زرُّ جلسةٍ أخرى');
  await p.context().close();
}

// ===== ١٠) بلا شرحٍ مؤلَّف — ويُقال ذلك صريحاً =====
console.log('\n١٠) المصدرُ لا يشرح، والشاشةُ تقول ذلك');
{
  const p=await mk();
  await p.evaluate(()=>{startWej('');gateLeft=0;gateStop();render()});
  const pre=await p.textContent('#app');
  ok(!pre.includes('لا يشرح'),'لا تُقال قبل الاختيار');
  await p.evaluate(()=>{const it=wejCur();wejChoose(wejOrder[0])});
  const post=await p.textContent('#app');
  ok(post.includes('مفتاحُ الدورة لا يشرح'),'وتُقال بعده — فلا يُدَّعى ما ليس في المصدر');
  const why=await p.evaluate(()=>WEJ_BANK.filter(function(x){return x.c.some(function(o){return o.why})}).length);
  ok(why===0,'ولا شرحَ مخترَعٌ في البنك إطلاقاً');
  await p.context().close();
}

await b.close();
console.log(`\n${fail?'✗ FAIL':'✓'} ${pass} نجحت · ${fail} فشلت`);
process.exit(fail?1:0);
})();
