// إحصاء ١٠٢ — قسمٌ لمحمد وحده. يحرس أربعة أشياء تكسر بصمت:
// (١) صحّة البنك نفسه (خيارٌ صحيحٌ واحد لا صفر ولا اثنان، ولا خيارَين متطابقين)،
// (٢) ظهوره عند محمد وغيابه عند الآخَرين — الطلب كان «في صفحة محمد» نصّاً،
// (٣) الجلسة تبلغ الحدّ ولا تُكرّر عنصراً، والتباعد يُسجَّل،
// (٤) التسجيل يحمل نصّ السؤال وكل الخيارات وموضع الصواب — عُرف المشروع، وبلاه لا تشخيص.
const {chromium}=require('/opt/node22/lib/node_modules/playwright');
let fails=0;const ok=(c,m)=>{console.log((c?'  ✓ ':'  ✗ FAIL ')+m);if(!c)fails++};
(async()=>{
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'});
let logs=[];
const mk=async(f)=>{
  const page=await b.newPage({viewport:{width:420,height:900}});
  page.on('pageerror',e=>{console.log('  ✗ PAGEERROR '+e.message);fails++});
  await page.route('**/rest/v1/**',async r=>{
    let body={};try{body=JSON.parse(r.request().postData()||'{}')}catch(e){}
    logs.push(body);r.fulfill({status:201,contentType:'application/json',body:'[]'});
  });
  await page.route('**/functions/v1/tutor',r=>r.fulfill({status:200,contentType:'application/json',
    body:JSON.stringify({ok:true,reply:"hi"})}));
  await page.addInitScript(()=>{
    Object.defineProperty(window,'speechSynthesis',{configurable:true,value:{speak(){},cancel(){},resume(){},pause(){},
      getVoices:()=>[{lang:'en-US',name:'X'}],speaking:false,pending:false}});
    window.SpeechSynthesisUtterance=function(t){this.text=t};
  });
  await page.goto('http://127.0.0.1:8931/'+f);
  await page.waitForFunction(()=>typeof startStat==='function');
  await page.waitForTimeout(200);
  return page;
};

console.log('\n١) البنك سليمٌ بنيوياً — عنصرٌ واحدٌ معطوب يُفسد سؤالاً كاملاً بصمت');
const m=await mk('mohammed.html');
const audit=await m.evaluate(()=>{
  const seen={},bad=[];
  STAT_BANK.forEach(it=>{
    const p=[];
    if(seen[it.id])p.push('معرّف مكرّر');seen[it.id]=1;
    if(!it.q||!it.sol||!it.ch||!it.src)p.push('حقل ناقص');
    if(!it.c||it.c.length!==4)p.push('عدد الخيارات '+(it.c?it.c.length:0));
    else{
      const n=it.c.filter(x=>x.ok).length;
      if(n!==1)p.push('عدد الصحيح '+n);
      if(it.c.some(x=>!x.t||!x.why))p.push('خيار بلا نصّ أو شرح');
      if(new Set(it.c.map(x=>x.t)).size!==it.c.length)p.push('خيارات متطابقة');
    }
    if(STAT_CHAPTERS.indexOf(it.ch)<0)p.push('فصل غير معروف');
    if(['ملف','مؤلَّف'].indexOf(it.src)<0)p.push('مصدر غير معروف');
    if(p.length)bad.push(it.id+': '+p.join(' | '));
  });
  const bySrc={};STAT_BANK.forEach(x=>bySrc[x.src]=(bySrc[x.src]||0)+1);
  const byCh={};STAT_BANK.forEach(x=>byCh[x.ch]=(byCh[x.ch]||0)+1);
  return{n:STAT_BANK.length,bad,bySrc,byCh,chapters:STAT_CHAPTERS.length};
});
ok(audit.bad.length===0,'كل العناصر سليمة'+(audit.bad.length?': '+audit.bad.slice(0,4).join(' / '):''));
ok(audit.n>=80,`البنك ${audit.n} عنصراً — كبيرٌ بما يكفي فلا يُستنفَد بجلسة (الحدّ ٨)`);
ok(audit.bySrc['ملف']>0&&audit.bySrc['مؤلَّف']>0,
  `الصنفان موجودان: ${audit.bySrc['ملف']} من الملفّات و${audit.bySrc['مؤلَّف']} مؤلَّفة لما ورد بلا أسئلة`);
ok(audit.chapters===13&&Object.keys(audit.byCh).length===13,'وثلاثة عشر فصلاً كلّها ممثَّلة');
ok(Object.keys(audit.byCh).every(k=>audit.byCh[k]>=3),'وأقلّ فصلٍ فيه ثلاثة أسئلة فأكثر — فمراجعة الفصل وحده تعطي جلسةً لا سؤالاً');

console.log('\n٢) الظهور عند محمد وحده');
let t=await m.textContent('#app');
ok(t.includes('إحصاء ١٠٢'),'الزرّ عند محمد');
for(const f of ['elias.html','index.html']){
  const p=await mk(f);
  ok(!(await p.textContent('#app')).includes('إحصاء ١٠٢'),`ولا يظهر في ${f}`);
  await p.close();
}

console.log('\n٣) قائمة الفصول ثم جلسة');
await m.evaluate(()=>goStatMenu());
await m.waitForTimeout(200);
t=await m.textContent('#app');
ok(await m.evaluate(()=>mode)==='statMenu','فُتحت قائمة الفصول');
ok(t.includes('كل الفصول'),'وفيها الجلسة الشاملة');
ok(t.includes('الاحتمال')&&t.includes('التوزيع الثنائي')&&t.includes('المجموعات'),'وأسماء الفصول');

console.log('\n٤) الجلسة الشاملة: تبلغ الحدّ بلا تكرار');
const N=await m.evaluate(()=>STAT_N);
for(let i=0;i<10;i++){
  const r=await m.evaluate(()=>{startStat('');return{n:statItems.length,u:new Set(statItems.map(x=>x.id)).size}});
  if(r.n!==N||r.u!==r.n){ok(false,`جلسة ${i+1}: ${r.n} عنصراً و${r.u} متمايزاً`);break}
  if(i===9)ok(true,`عشر جلسات متتالية: ${N} عنصراً متمايزاً في كلٍّ`);
}

console.log('\n٥) جلسة فصلٍ بعينه لا تخرج عنه');
const one=await m.evaluate(()=>{startStat('الاحتمال');return statItems.map(x=>x.ch)});
ok(one.length===N&&one.every(c=>c==='الاحتمال'),`ثمانية أسئلة كلّها من «الاحتمال» (${new Set(one).size} فصلاً)`);

console.log('\n٦) الإجابة: النتيجة والتباعد والحلّ المعروض');
logs=[];
await m.evaluate(()=>{startStat('');statSetupRound()});
await m.waitForTimeout(150);
const before=await m.evaluate(()=>Object.keys(statSrsLoad()).length);
const first=await m.evaluate(()=>{
  const it=statCur(),i=it.c.findIndex(x=>x.ok);
  statChoose(i);return{id:it.id,sol:it.sol.slice(0,20)};
});
await m.waitForTimeout(300);
ok(await m.evaluate(()=>statScore)===1,'الإجابة الصحيحة زادت النتيجة');
ok(await m.evaluate(()=>statLocked)===true,'والسؤال أُقفل فلا تُغيَّر الإجابة بعد رؤية الحلّ');
ok(await m.evaluate(()=>Object.keys(statSrsLoad()).length)>before,'ودخل مخزون التباعد FSRS');
t=await m.textContent('#app');
ok(t.includes('الحلّ خطوةً خطوة'),'وظهر صندوق الحلّ');
ok(t.includes(first.sol.slice(0,12)),'وفيه نصّ حلّ هذا السؤال بعينه');

console.log('\n٧) التسجيل يحمل ما يلزم للتشخيص');
const L=logs.filter(x=>x.domain==='stat');
ok(L.length===1,`سطرٌ واحد للإجابة (${L.length})`);
const rec=L[0]||{};
ok(!!rec.q_text&&rec.q_text.length>30,'ومعه نصّ السؤال');
ok(/✓/.test(rec.q_text||''),'وموضع الصواب موسومٌ داخل الخيارات');
ok((rec.q_text||'').split('|').length>=3,'وكل الخيارات مسجَّلة لا الصحيح وحده');
ok(/\[.+ · (ملف|مؤلَّف)\]/.test(rec.q_text||''),'والفصل والمصدر في أوّل السطر — فيُقاس أيّ الصنفين أنفع');
ok(!!rec.response&&!!rec.item_id&&rec.is_correct===true,'والإجابة والمعرّف والصواب');

console.log('\n٨) جلسة كاملة بنقرات حقيقية حتى شاشة النتيجة');
await m.evaluate(()=>startStat(''));
await m.waitForTimeout(200);
for(let k=0;k<N;k++){
  await m.evaluate(()=>{const it=statCur();statChoose(it.c.findIndex(x=>x.ok))});
  await m.waitForTimeout(60);
  const btn=await m.$('button.btn');
  if(btn)await btn.click();
  await m.waitForTimeout(60);
}
t=await m.textContent('#app');
ok(await m.evaluate(()=>statDone)===true,'انتهت الجلسة');
ok(t.includes('١٠٠'),'وظهرت النتيجة كاملة');

console.log('\n٩) اتّجاه العرض — عطلٌ يشحن حلولاً مقلوبة بلا أن يُسقط اختباراً واحداً');
const bidi=await m.evaluate(()=>{
  // كل سطرٍ بلا حرفٍ عربيّ قويّ يجب أن يُعرض من اليسار، وإلّا انقلبت المعادلة على الشاشة
  const bad=[],wide=[];
  STAT_BANK.forEach(it=>{
    [it.sol,it.pre||'',it.q].join('\n').split('\n').forEach(L=>{
      const t=L.trim();if(!t)return;
      const html=statBidiLine(L);
      const wantLtr=!STAT_AR_RE.test(t);
      const isLtr=/direction:ltr/.test(html);
      if(wantLtr!==isLtr)bad.push(it.id+' | '+t.slice(0,50));
      // ولا معادلةٌ طويلة محشورةٌ في جملةٍ عربية: تنكسر في منتصفها عند الالتفاف
      if(STAT_AR_RE.test(t)){
        const runs=t.split(/[\u0600-\u06FF\u00AB\u00BB]+/).map(x=>x.trim()).filter(x=>/[0-9]/.test(x));
        if(Math.max(0,...runs.map(x=>x.length))>=30)wide.push(it.id+' | '+t.slice(0,50));
      }
    });
  });
  // حالاتٌ بعينها كسرت فعلاً قبل الإصلاح
  const cases=[
    ['= 736 ÷ 9 = 81.78.',true],            // بلا حرفٍ قويّ إطلاقاً
    ['= 0.527 × 100 = 52.7٪.',true],        // ٪ عربيّةُ الكتلة لكنّها محايدة لا حرفاً
    ['P(X = r) = nCr · pʳ',true],
    ['المقام = 3 + 2 + 4 = 9',false],       // عربيّةٌ ⇐ من اليمين
  ];
  const wrong=cases.filter(c=>/direction:ltr/.test(statBidiLine(c[0]))!==c[1]).map(c=>c[0]);
  return{bad,wide,wrong};
});
ok(bidi.bad.length===0,`كل سطرٍ بلا عربية يُعرض من اليسار (${bidi.bad.length} مخالفاً)`+(bidi.bad.length?': '+bidi.bad.slice(0,3).join(' / '):''));
ok(bidi.wrong.length===0,'والحالات التي انكسرت فعلاً قبل الإصلاح صارت صحيحة'+(bidi.wrong.length?': '+bidi.wrong.join(' / '):''));
ok(bidi.wide.length===0,`ولا معادلة ≥٣٠ محرفاً محشورةٌ داخل جملةٍ عربية (${bidi.wide.length})`+(bidi.wide.length?': '+bidi.wide.slice(0,3).join(' / '):''));
const shown=await m.evaluate(()=>{
  statItems=[STAT_BANK.find(x=>x.id==='sa_cen_5')];statIdx=0;statScore=0;statDone=false;
  mode='stat';statSetupRound();statChoose(statCur().c.findIndex(x=>x.ok));
  return document.getElementById('app').innerHTML;
});
ok(/direction:ltr[^"]*">= 736 ÷ 9 = 81\.78\./.test(shown.replace(/&nbsp;/g,' ')),
  'وسطر الحلّ النهائي معروضٌ فعلاً من اليسار في DOM الحيّ لا في الدالّة وحدها');

console.log('\n١٠) لا انحدار في بقيّة الأقسام');
ok((await m.evaluate(()=>censusMissing())).length===0,'وكل دوال التطبيق معرَّفة');
ok((await m.evaluate(()=>window.__ERRS.length))===0,'ولا خطأ في وحدة التحكّم');

await b.close();
console.log(fails?`\n=== ${fails} فشل ===`:'\n=== كل الاختبارات نجحت ===');
process.exit(fails?1:0);
})();
