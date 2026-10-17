// قطعُ وجدان ٤٩ في قسم المقروء من ورقة تحديد المستوى — ١٤ أكتوبر
//
// الأمر الأصلي: «حط اختبار تحديد مستوى لاختبار step بشرط أن تكون الاسئلة نصاً من
// ملفات وجدان» ثمّ «أبغاك تغطي إلى ١٠٠٪». وقسمُ المقروء (٤٠٪ من وزن STEP) كان
// معلَّقاً لأن مفتاحَ القطع في طبقة الرسم ولا تُقرأ من هنا (الملفّ ٣٦٫٩ م.ب فوق حدّ
// تنزيل أداة درايف). فوصل المفتاح في ١٧ لقطةً من صاحب المشروع.
//
// وما يُفحَص هنا — والأوّلُ أهمُّها:
// ١) **كلُّ جوابٍ في البنك يُقابَل بملفّ المفاتيح `tools/wej_m49_read_keys.json`**
//    بنصّه لا بموضعه. ودرسُ ١٣ أكتوبر هو سببُه: ٣٩ مفتاحاً كان البنك يُدرّس بها
//    الخطأ الشائع صواباً، ولم يكشفها إلّا قراءةُ المصدر. فمصدرُ الحقيقة ملفٌّ واحد،
//    وأيُّ انحرافٍ بينه وبين البنك يُسقط هذا الاختبار.
// ٢) **بياناتُ الرسمَين تُقابَل بالمفتاح نفسه**: جوابُ «أدنى شهرٍ» و«يناير» يجب أن
//    يكونا صحيحين على الرسم المولَّد فعلاً — وإلّا عُرض رسمٌ يناقض جوابه، وهو أسوأ
//    من غياب السؤال («الدعم الذي يُعلّم خطأً أسوأ من غيابه»).
// ٣) سلامةُ كل عنصر، وتوزيعُ موضع الصواب، وخلطُ العرض والتسجيلُ بموضعه المعروض.
// ٤) البوّابةُ متّسقة: القسم لا يُفتَح دون طول ورقته، ويُفتَح متى بلغه (بمحاكاة).
// ٥) الرسمُ يُعرَض فعلاً في DOM، وبلا فيضانٍ أفقي على عرض الهاتف.
const {chromium}=require('/opt/node22/lib/node_modules/playwright');
const fs=require('fs');
let pass=0,fail=0;
const ok=(c,m)=>{c?(pass++,console.log('  ✓ '+m)):(fail++,console.log('  ✗ FAIL '+m))};
const BASE='http://127.0.0.1:8931/';
const KEYS=JSON.parse(fs.readFileSync(__dirname+'/../tools/wej_m49_read_keys.json','utf8'));

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
// كان هذا يُضيف عناصرَ وسمٍ لأن الأربعة الأخيرة (٥٧-٦٠) كان مفتاحُها غائباً. ووصل المفتاح
// (١٤ أكتوبر) فبلغ البنكُ طولَ ورقته، فصار **لا يُضيف شيئاً** ويُبقي الأقسام تعمل على
// العناصر الحقيقية. ويبقى لأنه يضمن الطول مهما تغيّر البنك، ويقول صراحةً كم أضاف.
const padToFull=p=>p.evaluate(()=>{
  const n=placeSecOf('read').n,base=PLACE_READ_BANK.length;
  for(let i=base;i<n;i++)PLACE_READ_BANK.push({id:"sim_"+i,q:"SIMULATED pad item "+i+"?",
    c:["x1","x2","x3","x4"],a:0,sk:"محاكاة",passage:"Simulated passage.",chart:null});
  return {base:base,now:PLACE_READ_BANK.length};
});
const tapLog=p=>p.evaluate(()=>{window.__rows=[];const o=window.logAnswer;
  window.logAnswer=function(){window.__rows.push([].slice.call(arguments));return o.apply(this,arguments)}});

// ===== ١) كلُّ جوابٍ في البنك = مفتاح الدورة، بنصّه =====
console.log('\n١) البنك يُقابَل بملفّ المفاتيح — نصّاً لا موضعاً');
{
  const p=await mk();
  const bank=await p.evaluate(()=>PLACE_READ_BANK.map(x=>({id:x.id,n:x.n,q:x.q,c:x.c,a:x.a,sk:x.sk})));
  ok(bank.length===KEYS.keys.length,
    'عددُ عناصر البنك = عددُ المفاتيح المحفوظة — '+bank.length+' مقابل '+KEYS.keys.length);
  const norm=s=>String(s).toLowerCase().replace(/[^a-z0-9%]+/g,' ').trim();
  const byN={};bank.forEach(x=>byN[x.n]=x);
  let bad=0,missing=0;
  KEYS.keys.forEach(k=>{
    const it=byN[k.q];
    if(!it){missing++;return}
    const ai='abcd'.indexOf(k.a);
    if(it.a!==ai){bad++;console.log('    ✗ س'+k.q+': البنك يقول ('+'abcd'[it.a]+') والمفتاح ('+k.a+')');return}
    const want=norm(k.text.replace(/\.\.\.|…/g,' ')),got=norm(it.c[it.a]);
    if(!(got.includes(want)||want.includes(got))){
      bad++;console.log('    ✗ س'+k.q+': نصُّ المفتاح «'+k.text+'» ≠ الخيار «'+it.c[it.a]+'»');
    }
  });
  ok(missing===0,'ولا مفتاحٌ بلا عنصرٍ يقابله — '+missing);
  ok(bad===0,'وكلُّ جوابٍ طابق المفتاح بموضعه وبنصّه — انحرافات '+bad);
  // ثلاثةٌ بأعيانها: هي التي كانت ترجيحاتي عليها **خاطئة** قبل ورود المفتاح، فحارسُها
  // بالاسم لا بالعدد — فلو عاد خطئي يوماً أسقط هذا السطر وحده.
  const anchors=[[44,'acceptable'],[49,'suggest and encourage'],[56,'Clubs are impatient']];
  let anchorBad=0;
  anchors.forEach(a=>{const it=byN[a[0]];
    if(!it||!norm(it.c[it.a]).includes(norm(a[1])))anchorBad++});
  ok(anchorBad===0,'والثلاثةُ التي أخطأتُ ترجيحَها (٤٤ · ٤٩ · ٥٦) على المفتاح لا على حكمي');
  await p.context().close();
}

// ===== ٢) سلامةُ كل عنصر =====
console.log('\n٢) سلامةُ كل عنصر');
{
  const p=await mk();
  const r=await p.evaluate(()=>{
    const AR=/[ء-ي]/;
    let nc=0,dupOpt=0,oob=0,noSrc=0,arab=0,noSk=0,empty=0;
    const ids={};let dupId=0;
    PLACE_READ_BANK.forEach(x=>{
      if(ids[x.id])dupId++;ids[x.id]=1;
      if(!x.c||x.c.length!==4)nc++;
      if(x.c&&new Set(x.c.map(s=>String(s).trim().toLowerCase())).size!==x.c.length)dupOpt++;
      if(!(x.a>=0&&x.a<(x.c||[]).length))oob++;
      if(!x.passage&&!x.chart)empty++;
      if(!x.sk)noSk++;
      if(x.src!=="وجدان ٤٩")noSrc++;
      if(AR.test(x.q+(x.c||[]).join(" ")+(x.passage||"")))arab++;
    });
    const sk={};PLACE_READ_BANK.forEach(x=>sk[x.sk]=(sk[x.sk]|0)+1);
    return {n:PLACE_READ_BANK.length,nc,dupOpt,oob,noSrc,arab,noSk,empty,dupId,sk,
      charts:PLACE_READ_BANK.filter(x=>x.chart).length};
  });
  ok(r.dupId===0,'لا معرّفٌ مكرّر — '+r.dupId);
  ok(r.nc===0,'وأربعةُ خيارات لكل عنصر — انحرافات '+r.nc);
  ok(r.dupOpt===0,'ولا خيارٌ مكرّرٌ داخل العنصر (فلا صوابان) — '+r.dupOpt);
  ok(r.oob===0,'وموضعُ الصواب داخل المدى — '+r.oob);
  ok(r.empty===0,'ولا عنصرَ بلا قطعةٍ ولا رسم — '+r.empty);
  ok(r.arab===0,'ولا تلوّثٌ عربي في النصّ الإنجليزي — '+r.arab);
  ok(r.noSk===0,'وكلُّ عنصرٍ موسومٌ بمهارته فتُقاس كلُّ مهارة على حدة — '+r.noSk);
  ok(r.noSrc===0,'ومصدرُه مُعلَنٌ في العنصر نفسه — '+r.noSrc);
  ok(Object.keys(r.sk).length>=5,'والمهارات أكثر من واحدة (بناءُ B2 First) — '+JSON.stringify(r.sk));
  ok(r.charts===4,'وأربعةُ عناصر معلّقةٌ برسمٍ بياني كما في المصدر — '+r.charts);
  await p.context().close();
}

// ===== ٣) الرسمُ لا يناقض جوابه — يُقابَل بالمفتاح =====
console.log('\n٣) بياناتُ الرسمَين مُقابَلةٌ بالمفتاح');
{
  const p=await mk();
  const r=await p.evaluate(()=>{
    const M=PLACE_CHART_MONTHS,v=PLACE_READ_CHARTS.visitors,rv=PLACE_READ_CHARTS.revenue;
    const lowest=M.slice().sort((a,b)=>v[a]-v[b])[0];
    const highest=M.slice().sort((a,b)=>rv[b]-rv[a])[0];
    return {months:M.length,lowestVisitors:lowest,janVisitors:v.Jan,
      highestRevenue:highest,janRevenue:rv.Jan,
      vAll:M.every(m=>typeof v[m]==="number"),rAll:M.every(m=>typeof rv[m]==="number")};
  });
  ok(r.months===12&&r.vAll&&r.rAll,'اثنا عشر شهراً بقيمةٍ لكلٍّ في الرسمين');
  // س٣٩ مفتاحُه December، فأدنى الأشهر في بياناتنا يجب أن يكون December فعلاً
  const k39=KEYS.keys.find(k=>k.q===39),k40=KEYS.keys.find(k=>k.q===40);
  const k41=KEYS.keys.find(k=>k.q===41),k42=KEYS.keys.find(k=>k.q===42);
  ok(r.lowestVisitors==='Dec'&&/december/i.test(k39.text),
    'أدنى أشهر الزوّار في الرسم = مفتاح س٣٩ ('+r.lowestVisitors+' / '+k39.text+')');
  ok(r.janVisitors===10000&&/10,?000/.test(k40.text),
    'وزوّارُ يناير في الرسم = مفتاح س٤٠ ('+r.janVisitors+' / '+k40.text+')');
  ok(r.highestRevenue==='Dec'&&/december/i.test(k41.text),
    'وأعلى أشهر الإيراد = مفتاح س٤١ ('+r.highestRevenue+' / '+k41.text+')');
  ok(r.janRevenue===300000&&/300,?000/.test(k42.text),
    'وإيرادُ يناير = مفتاح س٤٢ ('+r.janRevenue+' / '+k42.text+')');
  // والمموّهاتُ الثلاثة الباقية في س٣٩/٤١ يجب ألّا تصير صواباً ثانياً على الرسم
  const r2=await p.evaluate(()=>{
    const v=PLACE_READ_CHARTS.visitors,rv=PLACE_READ_CHARTS.revenue;
    return {tieLow:['Sep','Oct','Nov'].filter(m=>v[m]<=v.Dec).length,
            tieHigh:['Sep','Oct','Nov'].filter(m=>rv[m]>=rv.Dec).length};
  });
  ok(r2.tieLow===0,'ولا مموّهٌ في س٣٩ يساوي الأدنى أو يقلّ عنه — '+r2.tieLow);
  ok(r2.tieHigh===0,'ولا مموّهٌ في س٤١ يساوي الأعلى أو يزيد — '+r2.tieHigh);
  await p.context().close();
}

// ===== ٤) الـSVG يُولَّد من البيانات ويُرسَم داخل حدوده =====
console.log('\n٤) الـSVG مولَّدٌ من البيانات');
{
  const p=await mk();
  const r=await p.evaluate(()=>{
    const s=placeChartSvg('visitors'),t=placeChartSvg('revenue');
    const d=document.createElement('div');d.innerHTML=s;
    const svg=d.querySelector('svg');
    const texts=[].map.call(d.querySelectorAll('text'),e=>e.textContent);
    const pts=(svg.querySelector('polyline')||{}).getAttribute
      ?svg.querySelector('polyline').getAttribute('points').trim().split(/\s+/):[];
    const noFill=[].filter.call(svg.querySelectorAll('circle,rect,polyline'),
      e=>!e.getAttribute('fill')&&!e.getAttribute('stroke')).length;
    return {len:s.length,len2:t.length,hasSvg:!!svg,
      months:PLACE_CHART_MONTHS.filter(m=>texts.indexOf(m)>=0).length,
      pts:pts.length,noFill,bad:placeChartSvg('nope'),
      hasAria:!!svg.getAttribute('aria-label')};
  });
  ok(r.hasSvg&&r.len>500&&r.len2>500,'الرسمان يُولَّدان بطولٍ معقول — '+r.len+' و'+r.len2);
  ok(r.months===12,'وكلُّ شهرٍ مُعلَّمٌ على المحور — '+r.months);
  ok(r.pts===12,'وعددُ نقاط الخطّ = عددُ الأشهر — '+r.pts);
  ok(r.noFill===0,'وكلُّ شكلٍ مرسومٍ له لون صريح (لا يُورَث من الصفحة) — '+r.noFill);
  ok(r.hasAria,'وللرسم وصفٌ نصّي');
  ok(r.bad==='','ونوعٌ مجهولٌ يُعيد فراغاً بلا انكسار');
  // حارسُ ارتدادٍ على انقلابٍ وقع فعلاً: `<text>` داخل SVG يرث RTL من الصفحة، فكان
  // العنوان يُعرض «os (2009)» ورأسُه خارج اللوحة. والنصُّ في DOM سليمٌ تماماً، فلا
  // يمسكه إلّا **قياسُ موضع المحارف في عرضٍ حيّ** — لا قراءةُ النصّ.
  const bidi=await p.evaluate(()=>{
    const d=document.createElement('div');d.setAttribute('dir','rtl');
    d.style.cssText='position:fixed;left:0;top:0;width:322px';
    d.innerHTML=placeChartSvg('revenue');document.body.appendChild(d);
    const svg=d.querySelector('svg'),sr=svg.getBoundingClientRect();
    const t0=svg.querySelector('text'),b0=t0.getBoundingClientRect();
    const all=[].map.call(svg.querySelectorAll('text'),e=>e.getBoundingClientRect());
    const out={txt:t0.textContent,x:b0.x-sr.x,full:b0.width>40,
      outL:all.filter(r=>r.x<sr.x-0.5).length,outR:all.filter(r=>r.right>sr.right+0.5).length,
      dir:getComputedStyle(svg).direction};
    d.remove();return out;
  });
  ok(bidi.dir==='ltr','والرسم يفرض اتّجاهه من اليسار داخل صفحةٍ RTL — '+bidi.dir);
  ok(bidi.x>0&&bidi.full,'وعنوانُه كاملٌ يبدأ داخل اللوحة لا مقطوعَ الرأس — x='+Math.round(bidi.x));
  ok(bidi.outL===0&&bidi.outR===0,
    'ولا علامةَ تخرج عن حدّي اللوحة — يسار '+bidi.outL+' · يمين '+bidi.outR);
  await p.context().close();
}

// ===== ٥) البوّابة متّسقة: دون الطول لا يُفتَح، وعند الطول يُفتَح =====
console.log('\n٥) البوّابة متّسقة لا رقمٌ مكتوب');
{
  const p=await mk();
  // كُتب هذا القسم يوم كان البنك ٣٦ من ٤٠ فقِيس «قبل» على حاله الطبيعي. ووصل المفتاح
  // فبلغ الأربعين، فصارت الحالُ الطبيعية هي «بعد». والدعوى هي هي — **القيدُ بنكٌ لا
  // شيفرة** — فتُقاس الآن في الاتّجاهين بمحاكاةٍ في الاختبار وحده: يُقصَّر البنك فيُقفل،
  // ويُستعاد فيُفتَح. وهذا أقوى ممّا كان: يُثبت الطرفين لا طرفاً واحداً.
  const full=await p.evaluate(()=>({n:placeSecOf('read').n,size:placeBankSize('read'),
    ready:placeReady('read'),cov:placeCoverage(),pool:placePool('read').length}));
  ok(full.size===full.n,'البنك اليوم بطول ورقته — '+full.size+' من '+full.n);
  ok(full.ready===true,'فالقسم جاهز');
  ok(full.cov===100,'والتغطيةُ ١٠٠٪ — '+full.cov);
  ok(full.pool===full.n,'والورقة تمتلئ بطولها — '+full.pool);
  const short=await p.evaluate(()=>{
    window.__saved=PLACE_READ_BANK.splice(PLACE_READ_BANK.length-4,4);
    return {size:placeBankSize('read'),ready:placeReady('read'),
      cov:placeCoverage(),mode:(startPlaceSec('read'),mode)};
  });
  ok(short.size<full.n,'وبإنقاص أربعةٍ يصير أضيقَ من الورقة — '+short.size);
  ok(short.ready===false&&short.mode!=='place','فلا يُفتَح القسم — mode='+short.mode);
  ok(short.cov===60,'والتغطيةُ تهبط إلى ٦٠٪ بنفسها — '+short.cov);
  const back=await p.evaluate(()=>{
    PLACE_READ_BANK.push.apply(PLACE_READ_BANK,window.__saved);
    return {size:placeBankSize('read'),ready:placeReady('read'),cov:placeCoverage()};
  });
  ok(back.size===full.n&&back.ready===true&&back.cov===100,
    'وبإعادتها تُفتَح البوّابة بنفسها بلا تعديل شيفرة — '+back.size+' · '+back.cov+'٪');
  await p.context().close();
}

// ===== ٦) العرض: قطعةٌ نصّية ورسمٌ، والتسجيلُ بموضع العرض =====
console.log('\n٦) العرض والتسجيل');
{
  const p=await mk();
  await padToFull(p);
  await tapLog(p);
  // عنصرٌ نصّي أوّلاً: تُثبَّت الجلسة على عنصرٍ بعينه فلا يتقلّب الاختبار بالقرعة
  const txt=await p.evaluate(()=>{
    startPlaceSec('read');
    const it=PLACE_READ_BANK.find(x=>x.n===33);
    placeItems=[{sec:"read",it:it,lvl:null}];placeIdx=0;placeAns=[];placeDone=false;
    placeOrder=[shuffle(it.c.map((_,i)=>i))];render();
    const box=[].find.call(document.querySelectorAll('.card div'),
      e=>/Geraldo Alckmin/.test(e.textContent)&&/Sao Paulo/.test(e.textContent));
    return {hasPassage:!!box, dir:box?getComputedStyle(box).direction:null,
      q:(document.querySelector('.q')||{}).textContent||'',
      nBtn:document.querySelectorAll('.choices button').length,
      noSvg:!document.querySelector('.card svg')};
  });
  ok(txt.hasPassage,'القطعةُ النصّية معروضةٌ مع السؤال');
  ok(txt.dir==='ltr','وباتّجاهٍ من اليسار — فالنصّ إنجليزي');
  ok(/governor/.test(txt.q),'ونصُّ السؤال معروض');
  ok(txt.nBtn===4,'وأربعةُ أزرار — '+txt.nBtn);
  ok(txt.noSvg,'ولا رسمٌ في عنصرٍ نصّي');
  // ثمّ عنصرُ الرسم
  const ch=await p.evaluate(()=>{
    const it=PLACE_READ_BANK.find(x=>x.n===40);
    placeItems=[{sec:"read",it:it,lvl:null}];placeIdx=0;placeAns=[];placeDone=false;
    placeOrder=[shuffle(it.c.map((_,i)=>i))];render();
    const svg=document.querySelector('.card svg');
    const labels=svg?[].map.call(svg.querySelectorAll('text'),e=>e.textContent):[];
    return {hasSvg:!!svg,labels:labels.length,
      hasJan:labels.indexOf('Jan')>=0,hasDec:labels.indexOf('Dec')>=0,
      noPassageText:!/Muhammad Ali/.test(document.body.innerText)};
  });
  ok(ch.hasSvg,'وعنصرُ الرسم يعرض الرسم فعلاً في DOM');
  ok(ch.hasJan&&ch.hasDec&&ch.labels>12,'وفيه علاماتُ الأشهر والقيم — '+ch.labels+' علامة');
  // النقرُ يُسجَّل بموضع العرض لا بفهرس البنك (عُرف المشروع منذ ٢٥ أغسطس)
  const log=await p.evaluate(()=>{
    const it=PLACE_READ_BANK.find(x=>x.n===40);
    placeItems=[{sec:"read",it:it,lvl:null}];placeIdx=0;placeAns=[];placeDone=false;
    const ord=[3,2,1,0];placeOrder=[ord];render();
    window.__rows=[];
    document.querySelectorAll('.choices button')[0].click();
    const rows=window.__rows.filter(r=>r[0]==='wejplace'&&r[1]==='read');
    return {rows:rows.length,resp:rows.length?rows[0][3]:'',
      qt:rows.length?(rows[0][6]||{}).q_text||'':'' ,
      ansPick:placeAns.length?placeAns[0].pick:null,
      ansPos:placeAns.length?placeAns[0].pos:null,
      ansPosA:placeAns.length?placeAns[0].posA:null,
      // المتوقَّع يُشتقّ من الترتيب المعروض نفسه لا يُكتب رقماً — وإلّا كسره كلُّ ترتيبٍ
      // آخر وقال «انحدار» حيث السلوكُ صحيح (درس «الأعداد المكتوبة فخّ صامت»)
      wantPick:ord[0],wantPosA:ord.indexOf(it.a)+1};
  });
  ok(log.rows>=1,'والإجابة تصل السجلّ — '+log.rows);
  ok(log.ansPick===log.wantPick,'والنقرُ يمرّر الفهرس الأصلي لا موضعَ العرض — pick='+log.ansPick);
  ok(log.ansPos===1&&log.ansPosA===log.wantPosA,
    'والسطرُ يحمل موضعَ العرض وموضعَ الصواب — '+log.ansPos+'/'+log.ansPosA+' (المتوقَّع '+log.wantPosA+')');
  ok(/موضع/.test(log.resp),'وبصيغة «موضع ن · الصواب موضع م» كبقيّة الأقسام');
  ok(/تحديد مستوى · read/.test(log.qt),'ونصُّ السؤال في q_text — بلا هذا لا تشخيص');
  await p.context().close();
}

// ===== ٧) جلسةٌ كاملة بنقراتٍ حقيقية ⇒ تقرير =====
console.log('\n٧) جلسةٌ كاملة بنقراتٍ حقيقية');
{
  const p=await mk();
  await padToFull(p);
  await p.evaluate(()=>{startPlaceSec('read')});
  // بوّابةُ التسرّع المشروطة (١٥ أكتوبر) تُسلَّح بعد تسرّعَين، والنقرُ الآليّ أسرعُ من
  // أرضيّتها حتماً — فالخياراتُ تُخفى. والدعوى هي هي (أربعون نقرةً حقيقية تُكمل الورقة)،
  // والمُضافُ أن البوّابة تُكشَف بين العناصر كما يفعل المتعلّم بالانتظار، وأن نقرةً
  // قبل كشفها لا تُحتسَب إجابة — فيُقاس المنعُ ولا يُتجاوَز صمتاً.
  let clicks=0,gatedOnce=0,refused=0;
  for(let i=0;i<60;i++){
    const st=await p.evaluate(()=>({done:placeDone,open:gateOpen(),n:placeAns.length}));
    if(st.done)break;
    if(!st.open){
      gatedOnce++;
      // نقرةٌ والبوّابةُ مغلقة: لا زرَّ معروضاً أصلاً، والنداءُ المباشر يُردّ
      const before=st.n;
      const after=await p.evaluate(()=>{placeChoose(0);return placeAns.length});
      if(after===before)refused++;
      await p.evaluate(()=>gateReveal());
    }
    const btn=await p.$('.choices button');
    if(!btn)break;
    await btn.click();clicks++;
    await p.waitForTimeout(12);
  }
  const r=await p.evaluate(()=>({done:placeDone,n:placeAns.length,
    st:(placeLoad().read||{}),mode:mode,
    noFeedback:!/صحيح|خطأ|الصواب/.test(document.body.innerText)}));
  ok(gatedOnce>0,'والبوّابةُ سُلِّحت فعلاً على النقر الآليّ المتسرّع — '+gatedOnce+' مرّة');
  ok(refused===gatedOnce,'ولا نقرةَ احتُسبت إجابةً وهي مغلقة — '+refused+'/'+gatedOnce);
  ok(clicks===40,'أربعون نقرةً حقيقية أكملت الورقة — '+clicks);
  ok(r.done&&r.n===40,'والجلسةُ انتهت بأربعين إجابة — '+r.n);
  ok(r.st.n===40&&typeof r.st.ok==='number','والنتيجةُ محفوظة — '+r.st.ok+'/'+r.st.n);
  ok(typeof r.st.medMs==='number'&&r.st.medMs>=0,'ومعها الزمنُ الوسيط فيُوسَم النقرُ الأعمى');
  await p.context().close();
}

// ===== ٨) بلا فيضانٍ أفقي على عرض الهاتف =====
console.log('\n٨) العرض على عرض الهاتف');
{
  const p=await mk();
  await padToFull(p);
  const r=await p.evaluate(()=>{
    const it=PLACE_READ_BANK.find(x=>x.n===40);
    startPlaceSec('read');
    placeItems=[{sec:"read",it:it,lvl:null}];placeIdx=0;placeAns=[];placeDone=false;
    placeOrder=[shuffle(it.c.map((_,i)=>i))];render();
    const over=[].filter.call(document.querySelectorAll('.card *'),
      e=>e.getBoundingClientRect().right>420.5||e.getBoundingClientRect().left<-0.5).length;
    return {over,docW:document.documentElement.scrollWidth,
      svgW:(document.querySelector('.card svg')||{}).getBoundingClientRect
        ?document.querySelector('.card svg').getBoundingClientRect().width:0};
  });
  ok(r.docW<=420,'لا تمريرٌ أفقي للصفحة — '+r.docW+'px');
  ok(r.over===0,'ولا عنصرَ يتجاوز عرض الشاشة — '+r.over);
  ok(r.svgW>0&&r.svgW<=420,'والرسمُ داخل العرض — '+Math.round(r.svgW)+'px');
  // ثمّ قطعةٌ طويلة (مادغسكر، أطولُ القطع) بلا فيضان
  const r2=await p.evaluate(()=>{
    const it=PLACE_READ_BANK.find(x=>x.n===26);
    placeItems=[{sec:"read",it:it,lvl:null}];placeIdx=0;placeAns=[];placeDone=false;
    placeOrder=[shuffle(it.c.map((_,i)=>i))];render();
    return {docW:document.documentElement.scrollWidth,
      over:[].filter.call(document.querySelectorAll('.card *'),
        e=>e.getBoundingClientRect().right>420.5).length};
  });
  ok(r2.docW<=420&&r2.over===0,'وأطولُ قطعةٍ كذلك — '+r2.docW+'px · '+r2.over);
  await p.context().close();
}

// ===== ٩) مفتاحُ القراءة كاملٌ من المصدر، بلا فجوة =====
console.log('\n٩) المفتاح كاملٌ ٢١-٦٠');
{
  const qs=KEYS.keys.map(k=>k.q);
  ok(qs.length===40,'أربعون مفتاحاً — '+qs.length);
  ok(Math.min.apply(null,qs)===21&&Math.max.apply(null,qs)===60,
    'والمدى ٢١-٦٠ كترقيم قسم القراءة في النموذج ٤٩ — '+
    Math.min.apply(null,qs)+'-'+Math.max.apply(null,qs));
  let gaps=0;for(let q=21;q<=60;q++)if(qs.indexOf(q)<0)gaps++;
  ok(gaps===0,'وصفرُ فجوةٍ داخل المدى — '+gaps);
  // الأربعةُ الأخيرة بأعيانها: كانت اشتقاقاً عندي موسوماً «غير مصدَّق»، ثمّ وصل المفتاح
  // فطابقها أربعاً من أربع. فتُثبَّت بالاسم لا بالعدد — فلو عاد اشتقاقٌ مكان مفتاحٍ سقط.
  const norm=x=>String(x).toLowerCase().replace(/[^a-z0-9%]+/g,' ').trim();
  const last=[[57,'c','arrived later'],[58,'b','the day before'],[59,'c','minerals'],[60,'c','missing']];
  let bad=0;
  last.forEach(a=>{const k=KEYS.keys.find(x=>x.q===a[0]);
    if(!k||k.a!==a[1]||!norm(k.text).includes(norm(a[2])))bad++});
  ok(bad===0,'والأربعةُ الأخيرة (٥٧-٦٠) على المفتاح بنصّه — انحرافات '+bad);
  ok(/^لا شيء/.test(String(KEYS._pending||'').trim()),
    'وملفُّ المفاتيح يُعلن أن لا شيءَ معلَّقاً — «'+(KEYS._pending||'')+'»');
  ok(!KEYS._derived_unverified,'ولا اشتقاقَ غيرَ مصدَّقٍ باقٍ في الملفّ');
}

console.log('\n'+(fail?'✗ FAIL':'✓')+' نجح '+pass+' · فشل '+fail);
await b.close();
process.exit(fail?1:0);
})();
