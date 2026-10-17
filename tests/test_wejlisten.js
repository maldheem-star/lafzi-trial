// استماع وجدان — التفريغُ مؤلَّفٌ على صيغة أسئلتها، ١٧ أكتوبر
// الأمر: «ملف استماع وجدان في قوقل درايف،، ضفه» ثمّ، بعد عرض الطريقين، «ب».
//
// **وما لا يفحصه هذا الملفّ يُقال أوّلاً**: لا يفحص أن المفتاح يُطابق تسجيلَ الدورة —
// لا تسجيلَ في اليد ولا تفريغَ له (مفصَّلٌ في CLAUDE.md: ١٣٩ سؤالاً بلا تسجيلٍ ولا
// مفتاح، والملفّان فوق حدّ التنزيل). المفتاحُ هنا صحيحٌ **بالبناء**: التفريغُ مؤلَّفٌ
// ليُجيب عن سؤاله. وهذا بعينه ما يُوجب ألّا يُوسَم العنصر «[مصدر:وجدان]» — ويُفحَص.
//
// فالمفحوص: سلامةُ كل عنصر، وقاعدتا Haladyna (المفتاحُ لا يكون أطولَ الخيارات، ولا
// يُكرّر لفظَ الصدر)، وتوزيعُ موضع الصواب في البنك نفسه (فلا انحيازٌ مكتوب كما كاد
// يقع في طبقة C1)، وخلطُ العرض والتسجيلُ بالموضع المعروض، والبوّابةُ المستعارة من
// `listen`، والتباعدُ وحجمُ الجلسة، وجملةُ الدليل **ومداها المقاس**، وجلسةٌ كاملة
// بنقراتٍ حقيقية، والظهورُ على الصفحات الثلاث بلا خطابٍ مؤنّث عند الأخوين.
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

// ===== ١) سلامةُ كل عنصرٍ في البنك =====
console.log('\n١) سلامةُ كل عنصرٍ في البنك');
{
  const p=await mk();
  const r=await p.evaluate(()=>{
    const bad={opts:[],key:[],dup:[],ar:[],sep:[],empty:[],id:[],wc:[],punct:[],type:[]};
    const ids={},wcs=[];
    WEJL_BANK.forEach(function(x){
      if(x.c.length<3||x.c.length>4)bad.opts.push(x.id);
      if(!(x.a>=0&&x.a<x.c.length))bad.key.push(x.id);
      if(new Set(x.c.map(function(o){return o.toLowerCase().trim()})).size!==x.c.length)bad.dup.push(x.id);
      const all=x.audio+' '+x.q+' '+x.c.join(' ');
      if(/[ء-غف-ي]/.test(all))bad.ar.push(x.id);
      if(/[|\n]/.test(all))bad.sep.push(x.id);
      if(!x.audio||!x.q||x.c.some(function(t){return !t}))bad.empty.push(x.id);
      if(ids[x.id])bad.id.push(x.id);ids[x.id]=1;
      const w=x.audio.split(/\s+/).filter(Boolean).length;wcs.push(w);
      if(w<25||w>95)bad.wc.push(x.id+':'+w);
      if(!/[.!?]/.test(x.audio))bad.punct.push(x.id);
      if(!WEJL_TYPES[x.t])bad.type.push(x.id);
    });
    const counts={};WEJL_BANK.forEach(function(x){counts[x.t]=(counts[x.t]|0)+1});
    return {n:WEJL_BANK.length,bad:bad,counts:counts,types:Object.keys(WEJL_TYPES).length,
      wmin:Math.min.apply(null,wcs),wmax:Math.max.apply(null,wcs),N:WEJL_N};
  });
  ok(r.n>=2*r.N,`البنك ${r.n} عنصراً — ضِعفُ الجلسة (${r.N}) على الأقلّ، حدٌّ نسبيٌّ لا عددٌ مكتوب`);
  ok(!r.bad.opts.length,'ثلاثةُ خيارات أو أربعة لكل عنصر — كما في المصدر'+(r.bad.opts.length?' — '+r.bad.opts.slice(0,4):''));
  ok(!r.bad.key.length,'وفهرسُ الصواب داخل المدى'+(r.bad.key.length?' — '+r.bad.key.slice(0,4):''));
  ok(!r.bad.dup.length,'ولا خيارَين متطابقين — وإلّا صار الصواب غامضاً'+(r.bad.dup.length?' — '+r.bad.dup.slice(0,4):''));
  ok(!r.bad.ar.length,'ولا تلوّثَ عربي في تفريغٍ أو سؤالٍ أو خيار'+(r.bad.ar.length?' — '+r.bad.ar.slice(0,4):''));
  ok(!r.bad.sep.length,'ولا محرفَ تفكيكٍ داخل النصّ (| أو سطرٌ جديد) — وإلّا انشقّ العنصر');
  ok(!r.bad.empty.length,'ولا نصَّ فارغاً');
  ok(!r.bad.id.length,'ولا معرّفَ مكرّراً — والمعرّفُ بصمةُ المحتوى فلا يُزيحه إدراجٌ لاحق');
  ok(!r.bad.wc.length,`وطولُ التفريغ في المدى ٢٥-٩٥ كلمة (${r.wmin}-${r.wmax})`+(r.bad.wc.length?' — '+r.bad.wc.slice(0,4):''));
  ok(!r.bad.punct.length,'وكلُّ تفريغٍ فيه نهايةُ جملة — وبلاها لا تُستخرَج جملةُ الدليل');
  ok(!r.bad.type.length,'وكلُّ نوعٍ مسمًّى في WEJL_TYPES');
  // الأنواعُ العشرة من **تصنيفِ المصدر المقاس** لا من تصنيفٍ اخترعتُه
  ok(r.types===10&&Object.keys(r.counts).length===10,
    `والأنواعُ العشرةُ كلُّها ممثَّلة (${Object.keys(r.counts).length}/10) — ${Object.entries(r.counts).sort((a,b)=>b[1]-a[1]).map(([k,v])=>k+'='+v).join(' · ')}`);
  ok(r.counts.det===Math.max.apply(null,Object.values(r.counts)),
    'و«تفصيلٌ من الحديث» أكبرُها كما هو في المصدر (٧٦ من ١٣٩) — فالنسبُ محفوظة');
  await p.context().close();
}

// ===== ٢) قاعدتا Haladyna, Downing & Rodriguez 2002 =====
// المعيارُ المعتمَد في المشروع أصلاً. وهما القاعدتان القابلتان للفحص آلياً: المفتاحُ
// لا يكون أطولَ الخيارات (دليلٌ يلتقطه الممتحَن)، ولا يُكرّر لفظَ **الصدر** فيُصاب
// بمطابقة كلمةٍ لا بفهم. وعشرُ مخالفاتٍ للأولى كانت في تأليفي أنا وأُصلحت قبل الشحن.
console.log('\n٢) قاعدتا Haladyna — المفتاحُ ليس أطولَ الخيارات ولا يُكرّر لفظَ الصدر');
{
  const p=await mk();
  const r=await p.evaluate(()=>{
    const STOP=new Set(("a an the to of in on at for and or but is are was were be been do does did "+
      "will would can could he she it they we you i his her its their my your that this these those "+
      "what when where who why how which not no yes with from by as if so than then there here").split(" "));
    const words=s=>String(s).toLowerCase().replace(/[^a-z0-9\s]/g," ").split(/\s+/).filter(Boolean);
    function contentRun(a,b){
      const A=words(a),B=words(b);
      for(let i=0;i<A.length;i++)for(let j=0;j<B.length;j++){
        let k=0;while(i+k<A.length&&j+k<B.length&&A[i+k]===B[j+k])k++;
        if(k>=2){for(let x=0;x<k;x++)if(!STOP.has(A[i+x]))return true}
      }
      return false;
    }
    function longestRun(a,b){
      const A=words(a),B=words(b);let best=0;
      for(let i=0;i<A.length;i++)for(let j=0;j<B.length;j++){
        let k=0;while(i+k<A.length&&j+k<B.length&&A[i+k]===B[j+k])k++;
        if(k>best)best=k;
      }
      return best;
    }
    const longest=[],echo=[],spread=[];
    WEJL_BANK.forEach(function(x){
      const lens=x.c.map(function(o){return words(o).length});
      const others=lens.filter(function(_,i){return i!==x.a});
      if(lens[x.a]>Math.max.apply(null,others))longest.push(x.id+' ('+lens.join('/')+')');
      if(Math.max.apply(null,lens)>3*Math.min.apply(null,lens))spread.push(x.id+' ('+lens.join('/')+')');
      const runs=x.c.map(function(o){return longestRun(o,x.q)});
      const others2=runs.filter(function(_,i){return i!==x.a});
      if(runs[x.a]>=2&&runs[x.a]>Math.max.apply(null,others2)&&contentRun(x.c[x.a],x.q))
        echo.push(x.id+' ('+runs.join('/')+')');
    });
    return {longest:longest,echo:echo,spread:spread,n:WEJL_BANK.length};
  });
  ok(!r.longest.length,`لا مفتاحَ هو أطولُ الخيارات في ${r.n} عنصراً`+(r.longest.length?` — ${r.longest.slice(0,4).join('، ')}`:''));
  ok(!r.spread.length,'ولا تفاوتَ أطوالٍ فوق الضِعف الثلاثة — فالطولُ لا يدلّ'+(r.spread.length?` — ${r.spread.slice(0,3).join('، ')}`:''));
  ok(!r.echo.length,'ولا مفتاحَ يُكرّر لفظَ الصدر — فلا يُصاب بمطابقة كلمة'+(r.echo.length?` — ${r.echo.slice(0,3).join('، ')}`:''));
  await p.context().close();
}

// ===== ٣) الوسمُ يقول «مؤلَّف» لا «وجدان» — وهذا جوهرُ الطريق (ب) =====
// المفتاحُ صحيحٌ بالبناء لا بالنقل، فوسمُه بالمصدر كذبٌ: الجوابُ الصحيح ما أثبتُّه
// أنا في التفريغ لا ما يقوله تسجيلُ الدورة، وصعوبتُه صعوبتي لا صعوبةَ الاختبار.
console.log('\n٣) الوسمُ «مؤلَّف على صيغة وجدان» لا «مصدر:وجدان»');
{
  const p=await mk();
  const r=await p.evaluate(()=>{
    const srcs=Array.from(new Set(WEJL_BANK.map(function(x){return x.src})));
    return {srcs:srcs,tag:srcTag(WEJL_BANK[0]),sk:skOf(WEJL_BANK[0]),
      wejSrc:Array.from(new Set((typeof WEJ_BANK!=="undefined"?WEJ_BANK:[]).slice(0,1).map(function(x){return x.src||""})))};
  });
  ok(r.srcs.length===1&&r.srcs[0]==='مؤلَّف على صيغة وجدان',`المصدرُ واحدٌ معلَن: «${r.srcs[0]}»`);
  ok(r.tag.indexOf('[مصدر:وجدان]')<0&&r.tag.indexOf('مؤلَّف')>0,`والوسمُ في السجلّ لا يدّعي النقل — «${r.tag.trim()}»`);
  ok(/^استماع وجدان · /.test(r.sk),`والمهارةُ موسومةٌ بنوعها — «${r.sk}»`);
  // والشاشةُ تقولها كذلك بعد القفل، فلا يُقرأ العنصر على أنه منقولٌ من التسجيلات
  await p.evaluate(()=>{startWejl();gateLeft=0;gateStop();render()});
  const pre=await p.textContent('#app');
  ok(pre.indexOf('لا منقولٌ من تسجيلاتها')<0,'ولا تُقال قبل الاختيار — فلا تُشوّش السؤال');
  await p.evaluate(()=>{wejlChoose(wejlOrd(wejlCur())[0])});
  const post=await p.textContent('#app');
  ok(post.indexOf('التفريغُ مؤلَّفٌ على صيغة أسئلة وجدان، لا منقولٌ من تسجيلاتها')>=0,
    'وتُقال بعده صريحةً على الشاشة');
  await p.context().close();
}

// ===== ٤) توزيعُ موضع الصواب في البنك — مُدوَّرٌ بسكربت لا مكتوبٌ بيدي =====
// درس ١٣ سبتمبر: ثمانيةَ عشرَ عنصراً في طبقة C1 كُتبت كلُّها `a:0` فكاد يُشحَن
// انحيازُ موضعٍ تامّ. فالتدويرُ في `tools/wejl_build.js`، والقياسُ هنا بالنسبة.
console.log('\n٤) توزيعُ موضع الصواب في البنك نفسه');
{
  const p=await mk();
  const d=await p.evaluate(()=>{
    const c={},by4={};
    WEJL_BANK.forEach(function(x){c[x.a]=(c[x.a]|0)+1;if(x.c.length===4)by4[x.a]=(by4[x.a]|0)+1});
    return {c:c,by4:by4,n:WEJL_BANK.length,n4:WEJL_BANK.filter(function(x){return x.c.length===4}).length};
  });
  const vals=[0,1,2,3].map(k=>d.c[k]|0);
  const mx=Math.max(...vals)/d.n;
  ok(mx<0.4,`لا موضعَ يبتلع خُمسَي البنك — ${vals.join('/')} (أعلى ${Math.round(mx*100)}٪)`);
  ok(vals.filter(v=>v>0).length===4,'والمواضعُ الأربعة كلُّها مستعملة');
  ok((d.by4[3]|0)/d.n4>0.1,`وموضعُ الرابع ليس مهملاً في عناصر الأربعة (${d.by4[3]|0} من ${d.n4})`);
  await p.context().close();
}

// ===== ٥) خلطُ العرض، والتسجيلُ بالموضع المعروض =====
console.log('\n٥) الخلطُ في العرض والتسجيلُ بالموضع');
{
  const p=await mk();
  const spread=await p.evaluate(()=>{
    const pos={};
    for(let k=0;k<300;k++){
      wejlOrderId=null;wejlOrder=[];
      const it=WEJL_BANK[0];
      // الترتيبُ مُعلَّقٌ على معرّف العنصر — فيُصفَّر صراحةً لقياس التوزيع
      wejlOrderId=null;const ord=wejlOrd(it);
      const at=ord.indexOf(it.a)+1;pos[at]=(pos[at]|0)+1;
      wejlOrderId=null;
    }
    return pos;
  });
  const vals=[1,2,3,4].map(k=>spread[k]|0);
  ok(vals.every(v=>v>40),`الصوابُ يظهر في المواضع الأربعة كلّها (${vals.join('/')})`);
  // والترتيبُ **يثبت** ما دام العنصرُ نفسه معروضاً — فلا يتبدّل بين رسمٍ ورسم
  const stable=await p.evaluate(()=>{
    wejlOrderId=null;const it=WEJL_BANK[0];
    const a=wejlOrd(it).join(),b=wejlOrd(it).join(),c=wejlOrd(it).join();
    wejlOrderId=null;
    return a===b&&b===c;
  });
  ok(stable,'والترتيبُ ثابتٌ ما دام العنصرُ معروضاً — والعرضُ والسجلُّ يقرآن الدالّة نفسها');
  await tapLog(p);
  const row=await p.evaluate(async()=>{
    startWejl();gateLeft=0;gateStop();render();
    const it=wejlCur(),ord=wejlOrd(it);
    const shownFirst=ord[0];
    wejlChoose(shownFirst);
    const r=(window.__rows.filter(function(x){return x[0]==='wejl'})[0]||[]);
    return {resp:r[3]||'',qt:r[1]||'',q:(r[6]||{}).q_text||'',sk:(r[6]||{})._sk||'',
      shownTxt:it.c[shownFirst],id:r[4]||'',ms:r[5]};
  });
  ok(/^موضع ١ ·/.test(row.resp),`الإجابةُ تحمل موضعَها المعروض (${row.resp.slice(0,34)})`);
  ok(row.resp.indexOf(row.shownTxt)>0,'ونصَّ ما اختير فعلاً');
  ok(/^(det|num|why|place|inf|sup|who|idiom|main|exc)$/.test(row.qt),`والنوعُ من تصنيف المصدر (${row.qt})`);
  ok(/^wl_/.test(row.id),`والمعرّفُ من البنك (${row.id})`);
  ok(typeof row.ms==='number'&&row.ms>=0,'ومعها زمنُ الإجابة');
  ok(/^استماع وجدان · /.test(row.sk),`و_sk يصل السطر (${row.sk})`);
  ok(row.q.indexOf('[مصدر:مؤلَّف على صيغة وجدان]')===0,'وسطرُ السؤال يبدأ بوسم المصدر — فينجو من القصّ');
  ok(/plays:\d+/.test(row.q),'ويحمل عدَّ الاستماعات — فيُعرَف أقِيس بصوتٍ أم بلا صوت');
  ok(/1\) .+ \| 2\) .+ \| 3\) /.test(row.q)&&row.q.indexOf('✓')>0,'والخياراتُ بترتيب العرض وموضعُ الصواب موسوم');
  await p.context().close();
}

// ===== ٦) بوّابةُ التسرّع — مستعارةٌ من `listen` ويُقال ذلك =====
console.log('\n٦) بوّابةُ التسرّع تحجب الخيارات أوّلاً');
{
  const p=await mk();
  await p.evaluate(()=>startWejl());
  const before=await p.evaluate(()=>({left:gateLeft,btns:document.querySelectorAll('.choices .choice').length,
    bar:app.innerText.indexOf('ستظهر بعد')>=0,floor:SEC_GATE_FLOOR.listen,max:SEC_GATE_MAX.listen}));
  ok(before.left>=before.floor&&before.left<=before.max,
    `الأرضيّةُ داخل مفتاح listen المستعار (${before.left} في ${before.floor}-${before.max})`);
  ok(before.btns===0&&before.bar,'ولا خيارَ معروضٌ قبلها، والشريطُ يقول ماذا يُنتظَر');
  const blocked=await p.evaluate(()=>{wejlChoose(0);return wejlLocked});
  ok(blocked===false,'والنقرُ قبلها لا يُحرق العنصر');
  await openGate(p);
  const after=await p.evaluate(()=>document.querySelectorAll('.choices .choice').length);
  ok(after>=3,`وبعدها تظهر الخيارات (${after})`);
  // ولا مفتاحَ خاصٌّ بـwejl — الاستعارةُ مقصودةٌ ومعلَنة حتى يُقاس زمنُه هو
  const own=await p.evaluate(()=>!!(SEC_GATE_FLOOR.wejl||SEC_GATE_MAX.wejl));
  ok(!own,'ولا مفتاحَ أرضيّةٍ مخترَعٌ لهذا القسم — مستعارٌ حتى يُقاس زمنُه الحقيقي');
  await p.context().close();
}

// ===== ٧) التباعدُ وحجمُ الجلسة =====
console.log('\n٧) التباعد لا يُعيد ما أُتقِن، والجلسةُ لا تنقص');
{
  const p=await mk();
  const r=await p.evaluate(()=>{
    const st={},mastered=WEJL_BANK.slice(0,20).map(function(x){return x.id});
    mastered.forEach(function(id){st[id]={box:6,seen:6,due:srsToday()+40,s:60,d:5,last:srsToday()}});
    lsSet(WEJL_SRS_KEY,JSON.stringify(st));
    let back=0,total=0,backMix=0,sizes=[];
    for(let k=0;k<20;k++){
      const stt=wejlSrsLoad(),today=srsToday(),POOL=WEJL_BANK;
      const due=shuffle(POOL.filter(function(i){return stt[i.id]&&stt[i.id].due<=today}));
      const fresh=shuffle(POOL.filter(function(i){return !stt[i.id]}));
      backMix+=planNewMix(due,fresh,WEJL_N).filter(function(x){return mastered.indexOf(x.id)>=0}).length;
      const plan=buildWejlPlan();
      total+=plan.length;sizes.push(plan.length);
      back+=plan.filter(function(x){return mastered.indexOf(x.id)>=0}).length;
    }
    return {back:back,total:total,backMix:backMix,min:Math.min.apply(null,sizes),N:WEJL_N};
  });
  ok(r.backMix===0,`اختيارُ البانية نفسها لا يحمل مُتقَناً بعيدَ الموعد إطلاقاً (${r.backMix} في عشرين جلسة)`);
  // وحدُّ الدعوى يُقال: `planNoTwins` يُكمل النقص بسحبٍ من البنك كلّه بلا نظرٍ في
  // التباعد — خاصّةُ المساعِد المشترك لا هذا القسم (قِيست في test_wejdan §٦).
  ok(r.back<=4,`ولا يعود إلّا نادراً بديلاً لتوأم — ${r.back} من ${r.total} خانة`);
  ok(r.min===r.N,`وكلُّ جلسةٍ بلغت حجمَها (${r.min}/${r.N}) — قاعدة ١٨ أغسطس: لا تمرينَ منقوص`);
  const dueBack=await p.evaluate(()=>{
    const st={},due=WEJL_BANK.slice(30,38).map(function(x){return x.id});
    due.forEach(function(id){st[id]={box:2,seen:2,due:srsToday()-1,s:5,d:5,last:srsToday()-5}});
    lsSet(WEJL_SRS_KEY,JSON.stringify(st));
    return buildWejlPlan().filter(function(x){return due.indexOf(x.id)>=0}).length;
  });
  ok(dueBack>0,`والمستحقُّ يعود فعلاً (${dueBack} من ٨)`);
  // ولا تكرارَ داخل الجلسة الواحدة
  const dup=await p.evaluate(()=>{
    let worst=0;
    for(let k=0;k<30;k++){
      const plan=buildWejlPlan(),ids={};let m=0;
      plan.forEach(function(x){ids[x.id]=(ids[x.id]|0)+1;if(ids[x.id]>m)m=ids[x.id]});
      if(m>worst)worst=m;
    }
    return worst;
  });
  ok(dup===1,`ولا عنصرَ مرّتين في جلسةٍ واحدة (أقصى تكرارٍ ${dup} في ثلاثين جلسة)`);
  // وعتبةُ التوأم **قِيست ولم تُفترَض** (كما قِيست للكتابة في ٢٦ أغسطس وللوجدان في
  // ١٢ أكتوبر): `itemText` تُعيد التفريغَ وحده هنا، والعتبةُ القائمة `GEN_TWIN=0.02`
  // تتجاوزها ٣ أزواجٍ من ١٠٨١ (٠٫٢٨٪) — فلا تخنق البنك ولا تحتاج رقماً ثالثاً.
  const thr=await p.evaluate(()=>{
    const B=WEJL_BANK,sims=[];
    for(let i=0;i<B.length;i++)for(let j=i+1;j<B.length;j++)
      sims.push(twinSim(itemText(B[i]),itemText(B[j])));
    const t=twinThrFor("wejl");
    return {n:sims.length,thr:t,over:sims.filter(function(s){return s>=t}).length,
      max:Math.max.apply(null,sims),audio:itemText(B[0])===B[0].audio};
  });
  ok(thr.audio,'ومقياسُ التوأم يقرأ التفريغَ نفسه (`itemText` تُقدّم `audio`) لا الخيارات');
  ok(thr.over/thr.n<0.03,
    `والعتبةُ القائمة ${thr.thr} تتجاوزها ${thr.over} من ${thr.n} زوجاً (${(100*thr.over/thr.n).toFixed(2)}٪، أقصى ${thr.max.toFixed(4)}) — فلا رقمَ ثالثٌ يُخترَع`);
  await p.context().close();
}

// ===== ٨) جملةُ الدليل — ومداها المقاس يُقال لا يُدَّعى =====
// `evidenceSentence` تُطابق كلماتِ المفتاح بجملٍ من التفريغ، فتعمل حيث يكون الجوابُ
// منصوصاً. **و١٣ من ٤٧ لا تُنتج جملةً، وذلك صحيحٌ بالبناء لا عيب**: مفاتيحُ
// `place`/`who`/`idiom` **إعادةُ صياغةٍ** لا نقل (و«أين يقع الحديث» لا يُقال في
// التسجيل أبداً — وهذا هو المقيس)، ومفاتيحُ `num` أرقامٌ والتفريغُ ينطقها كلماتٍ
// («four, zero, six, one»، «ten past seven») كما يفعل الاختبار نفسه. والسقوطُ
// آمنٌ: `boldEvidence` تُعيد التفريغَ كاملاً بلا إبراز، فلا يُفقَد شيءٌ غيرُ الإبراز.
console.log('\n٨) جملةُ الدليل — والسقوطُ آمنٌ حيث لا تُستخرَج');
{
  const p=await mk();
  const r=await p.evaluate(()=>{
    const hit=[],miss=[],byType={};
    WEJL_BANK.forEach(function(x){
      const ev=evidenceSentence(x.audio,x.c[x.a]);
      byType[x.t]=byType[x.t]||[0,0];byType[x.t][1]++;
      if(ev){
        byType[x.t][0]++;
        hit.push({id:x.id,inside:x.audio.indexOf(ev)>=0,bold:boldEvidence(x.audio,ev).indexOf('<b ')>=0});
      }else{
        const html=boldEvidence(x.audio,ev);
        miss.push({id:x.id,t:x.t,full:html.indexOf('<b ')<0&&html.length>=x.audio.length-10});
      }
    });
    return {hit:hit,miss:miss,byType:byType,n:WEJL_BANK.length};
  });
  ok(r.hit.every(x=>x.inside),`كلُّ جملةِ دليلٍ مستخرَجة موجودةٌ في تفريغها حرفياً (${r.hit.length})`);
  ok(r.hit.every(x=>x.bold),'وتُبرَز فعلاً في العرض — لا وسمَ ضائع');
  ok(r.miss.every(x=>x.full),`والسقوطُ آمن: ${r.miss.length} عنصراً تُعرَض تفريغَها كاملاً بلا إبراز`);
  ok(r.hit.length>=30,`والمدى المقاس ${r.hit.length} من ${r.n} — ${Object.entries(r.byType).map(([k,v])=>k+'='+v[0]+'/'+v[1]).join(' · ')}`);
  // والأنواعُ التي لا تُنتج جملةً هي بعينها التي مفتاحُها إعادةُ صياغة — لا عيبٌ عشوائي
  const types=Array.from(new Set(r.miss.map(x=>x.t))).sort();
  ok(types.every(t=>['place','who','idiom','num','det','inf'].indexOf(t)>=0),
    `وأنواعُها معروفةٌ مفسَّرة (${types.join('، ')}) — إعادةُ صياغةٍ أو رقمٌ منطوقٌ كلماتٍ`);
  await p.context().close();
}

// ===== ٩) جلسةٌ كاملة بنقراتٍ حقيقية =====
console.log('\n٩) جلسةٌ كاملة بنقراتٍ حقيقية');
{
  const p=await mk();
  await tapLog(p);
  await p.evaluate(()=>startWejl());
  for(let k=0;k<8;k++){
    await openGate(p);
    const btns=await p.$$('.choices .choice');
    if(!btns.length){ok(false,'انقطعت الجلسة عند '+(k+1));break}
    // النقرُ على الصواب المعروض، فلا تُسلَّح بوّابةُ انحياز الموضع
    const right=await p.evaluate(()=>{const it=wejlCur();return wejlOrd(it).indexOf(it.a)});
    await btns[right].click();
    await p.waitForTimeout(60);
    const nx=await p.$('button.btn');
    if(nx)await nx.click();
    await p.waitForTimeout(80);
  }
  const t=await p.textContent('#app');
  const rows=await p.evaluate(()=>window.__rows.filter(function(x){return x[0]==='wejl'}));
  ok(rows.length===8,`ثماني إجاباتٍ مسجَّلة (${rows.length})`);
  ok(rows.every(r=>r[2]===true),'وكلُّها صوابٌ — فالمفتاح المعروض هو المحتسَب');
  ok(new Set(rows.map(r=>r[4])).size===8,'وثمانيةُ معرّفاتٍ متمايزة');
  ok(/٨/.test(t)&&t.indexOf('جلسة أخرى')>=0,'وشاشةُ النتيجة ظهرت ومعها زرُّ جلسةٍ أخرى');
  await p.context().close();
}

// ===== ١٠) الظهورُ على الصفحات الثلاث، والخطابُ في الاتّجاهين =====
console.log('\n١٠) الظهورُ على الصفحات الثلاث');
for(const f of ['index.html','mohammed.html','elias.html']){
  const p=await mk(f);
  const t=await p.textContent('#app');
  ok(t.indexOf('استماع وجدان')>=0,`${f}: البلاطةُ معروضة`);
  // والشرحُ تحت الزرّ **مُخفًى عند الراحة** (الكشف التدريجي، ٤ أكتوبر) — فيُفتَح
  // صراحةً قبل قياسه، وإلّا قاس الاختبارُ غيابَ عنصرٍ من DOM لا نصّاً خاطئاً.
  await p.evaluate(()=>{if(!homeSubsOn())homeToggleSubs()});
  const sub=await p.textContent('#app');
  ok(sub.indexOf('مؤلَّفٌ على صيغتها لا منقولٌ من تسجيلاتها')>=0,`${f}: والشرحُ يقول إن التفريغ مؤلَّف`);
  const go=await p.evaluate(()=>{startWejl();return mode});
  ok(go==='wejl',`${f}: والزرُّ يفتح القسم بنقرةٍ واحدة`);
  await p.waitForTimeout(250);                       // المراقبُ يُحوّل الخطاب بعد الرسم
  const scr=await p.textContent('#app');
  if(f==='index.html'){
    ok(/استمعي/.test(scr),`${f}: والخطابُ مؤنّثٌ على الأساس`);
  }else{
    ok(!/استمعي|اختاري|افحصي|عودي|فهمتِ|استمعتِ/.test(scr),`${f}: وبلا خطابٍ مؤنّث`);
    ok(/استمع/.test(scr),`${f}: والمذكّرُ حاضرٌ بلا مدخلٍ جديد`);
  }
  // ولا فيضانَ أفقي على عرض الهاتف
  const over=await p.evaluate(()=>{
    const w=document.documentElement.clientWidth,bad=[];
    document.querySelectorAll('#app *').forEach(function(e){
      const r=e.getBoundingClientRect();
      if(r.width>0&&(r.right>w+1||r.left<-1))bad.push(e.className||e.tagName);
    });
    return {w:w,bad:bad.slice(0,4),n:bad.length,sw:document.documentElement.scrollWidth};
  });
  ok(over.n===0&&over.sw<=over.w+1,`${f}: وصفرُ عنصرٍ يتجاوز ${over.w} بكسلاً`+(over.n?' — '+over.bad.join('، '):''));
  await p.context().close();
}

await b.close();
console.log(`\n${fail?'✗ FAIL':'✓'} ${pass} نجحت · ${fail} فشلت`);
process.exit(fail?1:0);
})();
