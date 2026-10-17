// صنفٌ بلا تعريف، ونصٌّ يُهرَّب داخل سمة — ١٧ أكتوبر
//
// أرسل صاحب المشروع لقطةً من جهازٍ حقيقي ومعها «؟»: شريطٌ أحمر
// `SyntaxError: Unexpected token '}' سطر 1`، وخيارات ورقة المحاكاة **نصّاً مرصوصاً
// في سطرٍ واحد** لا أزراراً. والقياس في متصفّحٍ حيّ أعاد الاثنين بالرقم:
//
//   • `class="opt"` **لا تعريف له في CSS إطلاقاً** — فالزرّ يرث مظهر المتصفّح:
//     `display:inline-block` وعرض **٢٧٫٥ بكسل** وخلفية `#EFEFEF` وحشوٌ صفر، وثلاثتُها
//     **على سطرٍ واحد**. وهو بعينه صنفُ `.btn` بلا خلفية (١٣ أكتوبر) — أُصلح هناك
//     ولم يُبحث عن نظيره، وهذا ما تُغلقه هذه المجموعة.
//   • `onclick="speakEnglish(${JSON.stringify(...)})"` — و`JSON.stringify` يُعيد النصّ
//     **بين علامتَي تنصيص مزدوجتين**، فتُنهي السمةَ مبكّراً: قياسُ السمة أعاد
//     `speakEnglish(` وحدها، وكلماتُ الجملة صارت سماتٍ شاردة
//     (`i,have,three,books,on,the,table."` …). فالمعالج لا يُترجَم، والضغطُ يرمي
//     SyntaxError (يسمّيه Chromium «Unexpected end of input» ويسمّيه متصفّحُ الجهاز
//     «Unexpected token '}'» — عطلٌ واحد بصياغتين). والنمط الصحيح قائمٌ في المشروع
//     في **ثلاثة** مواضع (`JSON.stringify(x).replace(/"/g,'&quot;')`) وغاب عن اثنين.
//
// **وحدُّ هذه المجموعة يُقال**: تفحص الصنف المعرَّف والسمة المُهرَّبة — لا تفحص جمال
// التنسيق ولا تشغّل صوتاً حقيقياً (Chromium بلا رأس، والنطق محجوب). وهي تسقط على
// البناء السابق فعلاً، فتقيس الإصلاح لا تُصادقه.
const fs=require('fs');
const {chromium}=require('/opt/node22/lib/node_modules/playwright');
let pass=0,fail=0;
const ok=(c,m)=>{c?(pass++,console.log('  ✓ '+m)):(fail++,console.log('  ✗ FAIL '+m))};
const BASE='http://127.0.0.1:8931/';
const SRC=fs.readFileSync(__dirname+'/../index.html','utf8');

// أصنافٌ تحمل تنسيقَها كاملاً في سمة style، فهي **مرابطُ استعلام لا أصنافُ تنسيق**.
// تُستثنى بالاسم لا بالعدد، فإضافةُ صنفٍ جديد بلا تعريف تُسقط الفحص.
const HOOKS=['why','svgbox'];

(async()=>{
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'});
const mk=async(q)=>{
  const ctx=await b.newContext({viewport:{width:420,height:900}});
  const p=await ctx.newPage();
  p.on('pageerror',e=>{fail++;console.log('  ✗ PAGEERROR '+e.message)});
  await p.route('**/functions/v1/**',r=>r.fulfill({status:200,contentType:'application/json',body:'{}'}));
  await p.route('**/rest/v1/**',r=>r.fulfill({status:200,contentType:'application/json',body:'[]'}));
  await p.goto(BASE+'index.html'+(q||''),{waitUntil:'domcontentloaded'});
  await p.waitForFunction(()=>typeof render==='function',{timeout:20000});
  await p.evaluate(()=>localStorage.clear());
  return p;
};

// ===== ١) كلُّ صنفٍ مستعملٍ في الوسم معرَّفٌ في CSS (أو مِرْبطٌ مُسمّى) =====
console.log('\n١) جردُ الأصناف — المستعمَل مقابل المعرَّف');
{
  const css=(SRC.match(/<style>([\s\S]*?)<\/style>/g)||[]).join('\n');
  const defined=new Set((css.match(/\.[A-Za-z][\w-]*/g)||[]).map(s=>s.slice(1)));
  const used=new Map();
  const re=/class="([^"${}]*)"/g;let x;
  while((x=re.exec(SRC)))x[1].trim().split(/\s+/).filter(Boolean).forEach(c=>used.set(c,(used.get(c)||0)+1));
  ok(defined.size>40&&used.size>20,`قِيس فعلاً: ${used.size} صنفاً مستعمَلاً مقابل ${defined.size} معرَّفاً`);
  const miss=[...used.keys()].filter(c=>!defined.has(c)&&HOOKS.indexOf(c)<0);
  ok(miss.length===0,'ولا صنفَ بلا تعريفٍ ولا اسمٍ في قائمة المرابط'+(miss.length?' — '+miss.map(c=>'.'+c).join('، '):''));
  ok(!used.has('opt'),'و`.opt` لم يعد مستعمَلاً — استُبدل بـ`.choice` المعرَّف المُجرَّب');
  ok(defined.has('sub'),'و`.sub` صار معرَّفاً (كان بلا تعريفٍ في عشرين موضعاً)');
  HOOKS.forEach(h=>{
    const uses=SRC.split('class="'+h+'"').length-1;
    if(!uses)return;
    const inline=SRC.split('class="'+h+'"').slice(1).every(s=>/^\s+style="/.test(s));
    ok(inline,`ومِربط \`.${h}\` يحمل تنسيقَه في style (${uses} موضعاً) فليس صنفاً ضائعاً`);
  });
}

// ===== ٢) لا `JSON.stringify` عارياً داخل سمة معالج =====
console.log('\n٢) النصّ داخل سمة المعالج — مُهرَّبٌ لا عارٍ');
{
  const re=/on[a-z]+="[^"]*\$\{JSON\.stringify\(/g;
  const all=[];let x;
  const reAll=/on[a-z]+="[^"]*?\$\{JSON\.stringify\(([\s\S]*?)\)\s*(\.replace\([^)]*\))?\}/g;
  while((x=reAll.exec(SRC)))all.push({raw:x[0],esc:!!x[2]});
  ok(all.length>=5,`قِيس فعلاً: ${all.length} موضعاً يُدرج نصّاً في سمة معالج`);
  const bare=all.filter(a=>!a.esc||!/&quot;/.test(a.raw));
  ok(bare.length===0,'وكلُّها تُهرّب التنصيص بـ`&quot;`'+(bare.length?' — '+bare.length+' عارياً':''));
  // ومرباطان على الموضعين اللذين كانا عاريَين بأعيانهما — فلا يعودان بصمت
  const sites=[['ورقة المحاكاة','onclick="speakEnglish(${JSON.stringify(x.it.audio||"")'],
               ['أزواج الاستماع','onclick="speakEnglish(${JSON.stringify(minpairShowSent||it.s[minpairTarget])']];
  sites.forEach(function(s){
    const at=SRC.indexOf(s[1]);
    ok(at>0&&SRC.slice(at,at+s[1].length+40).indexOf("&quot;")>0,`و${s[0]}: النصُّ مُهرَّبٌ عند موضعه`);
  });
}

// ===== ٣) ورقة المحاكاة: الخيارات أزرارٌ كاملة العرض متتابعة لا نصٌّ مرصوص =====
console.log('\n٣) خيارات المحاكاة — أزرارٌ لا نصّ');
{
  const p=await mk();
  const r=await p.evaluate(()=>{
    startMock();
    for(let k=0;k<mockPaper.items.length;k++){if(mockPaper.items[k].sec==='listen'){mockIdx=k;break}}
    render();
    const b=[...document.querySelectorAll('#app .choices .choice')];
    const cs=b.length?getComputedStyle(b[0]):null;
    return {sec:mockCur().sec,n:b.length,
      w:cs&&parseFloat(cs.width),fs:cs&&parseFloat(cs.fontSize),
      bg:cs&&cs.backgroundColor,rad:cs&&parseFloat(cs.borderRadius),pad:cs&&parseFloat(cs.paddingTop),
      sameLine:b.length>1?(b[0].getBoundingClientRect().top===b[1].getBoundingClientRect().top):null,
      opt:document.querySelectorAll('#app .opt').length};
  });
  ok(r.sec==='listen'&&r.n>=2,`العنصر استماعٌ وخياراته ${r.n}`);
  ok(r.opt===0,'ولا زرَّ بصنف `.opt` في الصفحة');
  ok(r.w>=300,`والزرّ كامل العرض — ${Math.round(r.w)} بكسلاً لا ٢٧٫٥`);
  ok(r.fs>=15,`وحجمُ خطّه ${r.fs} لا ١٣٫٣`);
  ok(r.bg==='rgb(255, 255, 255)'&&r.rad>0&&r.pad>0,'وله خلفيةٌ بيضاء وحوافُّ وحشو — لا مظهرُ المتصفّح الخام');
  ok(r.sameLine===false,'والخيارات متتابعةٌ لا على سطرٍ واحد');
  // والنقر يقفل ويتقدّم فعلاً
  const adv=await p.evaluate(()=>{const i=mockIdx,c=document.querySelector('#app .choices .choice');
    if(!c)return {none:true};c.click();return {from:i,to:mockIdx,ans:mockAns.length}});
  ok(!adv.none&&adv.ans===1&&adv.to===adv.from+1,'والنقرُ على الزرّ المعروض يُسجّل إجابةً ويتقدّم');
  await p.context().close();
}

// ===== ٤) زرّ الاستماع في المحاكاة: معالجٌ سليم، ولا سماتٍ شاردة، ولا خطأ عند الضغط =====
console.log('\n٤) زرّ الاستماع — معالجٌ يُترجَم');
{
  const p=await mk();
  const r=await p.evaluate(()=>{
    startMock();
    for(let k=0;k<mockPaper.items.length;k++){if(mockPaper.items[k].sec==='listen'){mockIdx=k;break}}
    render();
    const a=[...document.querySelectorAll('#app button')].find(x=>x.textContent.indexOf('استمع')>=0);
    if(!a)return {none:true};
    return {attrs:[...a.attributes].map(x=>x.name),handler:typeof a.onclick==='function',
      oc:a.getAttribute('onclick')||'',audio:(mockCur().it.audio||'')};
  });
  ok(!r.none,'زرّ الاستماع معروض');
  ok(r.handler===true,'ومعالجُه يُترجَم فعلاً (كان `false` قبل الإصلاح)');
  ok(!r.none&&r.attrs.join(',')==='class,style,onclick',`ولا سماتٍ شاردة — ${(r.attrs||[]).join('،')}`);
  ok(!r.none&&r.oc.indexOf(r.audio.slice(0,12))>0,'والنصّ المنطوق كاملٌ داخل السمة لا مقطوعاً');
  // ضغطةٌ حقيقية: لا خطأ ولا شريطٌ أحمر (النطق نفسه لا يُفحَص — لا صوت هنا)
  await p.evaluate(()=>{const a=[...document.querySelectorAll('#app button')]
    .find(x=>x.textContent.indexOf('استمع')>=0);a&&a.click()});
  await p.waitForTimeout(250);
  const bar=await p.evaluate(()=>{const d=document.getElementById('appErrBar');return d?d.innerText:null});
  ok(bar===null,'والضغطةُ الحقيقية لا ترفع شريط الخطأ'+(bar?' — '+bar.slice(0,90):''));
  await p.context().close();
}

// ===== ٥) زرّ إعادة الجملة في أزواج الاستماع — نفس العطل، نفس الفحص =====
console.log('\n٥) جملة أزواج الاستماع — إعادةٌ تعمل');
{
  const p=await mk();
  const r=await p.evaluate(()=>{
    startMinpair();minpairSetupRound&&0;
    minpairLocked=true;minpairPicked=minpairTarget;render();
    const box=document.querySelector('#app .explain');
    if(!box)return {none:true};
    const a=[...box.querySelectorAll('button')].pop();
    if(!a)return {none:true};
    return {attrs:[...a.attributes].map(x=>x.name),handler:typeof a.onclick==='function',
      oc:a.getAttribute('onclick')||''};
  });
  ok(!r.none,'صندوق الشرح معروضٌ بعد القفل');
  ok(r.handler===true,'ومعالجُ 🔊 يُترجَم (كان `false` منذ ١٧ أغسطس)');
  ok(!r.none&&r.attrs.indexOf('type')>=0&&r.attrs.length<=4,`ولا سماتٍ شاردة — ${(r.attrs||[]).join('،')}`);
  ok(!r.none&&/^speakEnglish\("/.test(r.oc)&&/"\)$/.test(r.oc),'والنصّ مُهرَّبٌ داخل السمة كاملاً');
  await p.waitForTimeout(50);
  await p.context().close();
}

// ===== ٦) والنصُّ الثانوي صار أهدأ من المتن — ولا فيضانَ أفقي =====
console.log('\n٦) الهرم البصري والعرض');
{
  const p=await mk();
  const r=await p.evaluate(()=>{
    startMock();
    for(let k=0;k<mockPaper.items.length;k++){if(mockPaper.items[k].sec==='listen'){mockIdx=k;break}}
    render();
    const s=document.querySelector('#app .sub'),q=document.querySelector('#app .q');
    const cs=s&&getComputedStyle(s),cq=q&&getComputedStyle(q);
    const w=document.documentElement.clientWidth,bad=[];
    document.querySelectorAll('#app *').forEach(function(e){
      const b=e.getBoundingClientRect();
      if(b.width>0&&(b.right>w+1||b.left<-1))bad.push(e.className||e.tagName)});
    return {sub:cs&&parseFloat(cs.fontSize),col:cs&&cs.color,q:cq&&parseFloat(cq.fontSize),
      w:w,sw:document.documentElement.scrollWidth,n:bad.length,bad:bad.slice(0,3)};
  });
  ok(r.sub&&r.q&&r.sub<r.q,`النصُّ الثانوي ${r.sub} دون السؤال ${r.q}`);
  ok(r.col==='rgb(100, 116, 139)','ولونُه رماديٌّ هادئ لا لونَ المتن');
  ok(r.n===0&&r.sw<=r.w+1,`وصفرُ عنصرٍ يتجاوز ${r.w} بكسلاً`+(r.n?' — '+r.bad.join('، '):''));
  await p.context().close();
}

// ===== ٧) العطل نفسه صار يُسجَّل — لا شريطاً أحمر وحده =====
console.log('\n٧) أثرُ العطل في الجدول');
{
  const ctx=await b.newContext({viewport:{width:420,height:900}});
  const p=await ctx.newPage();
  const rows=[];
  await p.route('**/functions/v1/**',r=>r.fulfill({status:200,contentType:'application/json',body:'{}'}));
  await p.route('**/rest/v1/**',r=>{
    try{const d=r.request().postData();if(d){const j=JSON.parse(d);
      (Array.isArray(j)?j:[j]).forEach(x=>rows.push(x))}}catch(e){}
    r.fulfill({status:200,contentType:'application/json',body:'[]'});
  });
  await p.goto(BASE+'index.html',{waitUntil:'domcontentloaded'});
  await p.waitForFunction(()=>typeof render==='function',{timeout:20000});
  await p.evaluate(()=>localStorage.clear());
  rows.length=0;
  await p.evaluate(()=>{appError("خطأ",{message:"SyntaxError: Unexpected token '}'",lineno:1})});
  await p.waitForTimeout(600);
  const err=rows.filter(x=>x.domain==='gen'&&x.qtype==='app_error');
  ok(err.length===1,`سطرٌ واحد وصل الجدول — ${err.length}`);
  ok(err.length>0&&/SyntaxError/.test(err[0].q_text||''),'ونصُّ الخطأ فيه');
  ok(err.length>0&&/سطر 1/.test(err[0].q_text||''),'ورقمُ السطر معه');
  ok(err.length>0&&/وضع:/.test(err[0].q_text||''),'والوضعُ الذي وقع فيه');
  // سقفُ الضجيج: تكرارُ نفس الخطأ لا يُغرق الجدول
  rows.length=0;
  await p.evaluate(()=>{for(let i=0;i<8;i++)appError("خطأ",{message:"SyntaxError: Unexpected token '}'",lineno:1})});
  await p.waitForTimeout(500);
  ok(rows.filter(x=>x.qtype==='app_error').length===0,'وتكرارُه لا يُضيف سطراً');
  // رسائلُ مختلفة تُسجَّل حتى السقف ثمّ تتوقّف
  rows.length=0;
  await p.evaluate(()=>{for(let i=0;i<6;i++)appError("خطأ",{message:"TypeError رقم "+i,lineno:9})});
  await p.waitForTimeout(500);
  const n=rows.filter(x=>x.qtype==='app_error').length;
  ok(n>0&&n<=2,`ورسائلُ مختلفة تتوقّف عند السقف — ${n}`);
  await p.context().close();
}

await b.close();
console.log(`\n${fail?'✗ FAIL':'✓'} ${pass} نجحت · ${fail} فشلت`);
process.exit(fail?1:0);
})();
