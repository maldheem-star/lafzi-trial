// ===== القراءة الجهرية إجبارية — أمرُ صاحب المشروع، ٣ أكتوبر =====
// بُنيت اختياريّةً في ١٣ سبتمبر، فحصيلتُها ثمانية عشر يوماً **صفّان في يومٍ واحد**.
// فأُمر: «حط القراءة الجهرية اجبارية». وهذا الحارس يُثبّت الشرط **ومخارجَه**:
// لا يُقفَل الطريق على من أثبت جهازُه أنه بلا ميكروفون (سناب شات يحجبه حجباً
// موثَّقاً، وإلياس يفتح منه) ولا على عطل خادم — وإلّا كان الإجبار عطلاً أوسع.
const {chromium}=require('/opt/node22/lib/node_modules/playwright');
let fails=0;const ok=(c,m)=>{console.log((c?'  ✓ ':'  ✗ FAIL ')+m);if(!c)fails++};
(async()=>{
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'});
const p=await b.newPage({viewport:{width:420,height:900}});
p.on('pageerror',e=>{console.log('  ✗ PAGEERROR '+e.message);fails++});
const rows=[];
await p.route('**/rest/v1/**',r=>{
  const d=r.request().postData()||'';
  if(r.request().method()==='POST'&&d)rows.push(d);
  r.fulfill({status:200,contentType:'application/json',body:'[]'});
});
await p.route('**/functions/v1/**',r=>r.fulfill({status:200,contentType:'application/json',body:'{"ok":false}'}));
await p.addInitScript(()=>{
  Object.defineProperty(window,'speechSynthesis',{configurable:true,value:{speak(){},cancel(){},getVoices:()=>[],speaking:false,pending:false}});
  window.SpeechSynthesisUtterance=function(t){this.text=t};
});
await p.goto('http://127.0.0.1:8931/index.html');
await p.waitForFunction(()=>typeof raSatisfied==='function'&&typeof raBlockHint==='function');

// جلسةٌ حقيقية: تُفتَح، وتُفتَح بوّابة التسرّع، ويُقفل الجواب بنقرةٍ على زرٍّ معروض
async function answerOne(){
  return p.evaluate(async()=>{
    await startRead();
    gateSecs=0;gateLeft=0;render();
    const btns=[...document.querySelectorAll('.choices button.choice')];
    if(!btns.length)return {err:'لا خيارات'};
    btns[0].click();
    return {err:'',locked:readLocked,target:readAloudTarget(readCur())};
  });
}

// ─────────────────────────────────────────────────────────────────────────────
console.log('\n١) بعد الإجابة: الانتقال مقفولٌ والسببُ مكتوب');
{
  const r=await answerOne();
  ok(!r.err,'الجلسة فُتحت وقُفل الجواب ('+(r.err||'')+')');
  ok(!!r.target,'وللعنصر هدفُ قراءةٍ فعلاً ('+String(r.target).slice(0,40)+'…)');
  const g=await p.evaluate(()=>{
    const el=document.querySelector('[data-ragate]');
    const nxt=[...document.querySelectorAll('button')].filter(function(x){return /onclick/.test(x.outerHTML)&&/readNext/.test(x.getAttribute('onclick')||'')});
    return {gate:!!el,txt:el?el.textContent.trim():'',disabled:el?el.disabled:null,nextBtns:nxt.length,
            sat:raSatisfied(readCur()),idx:readIdx};
  });
  ok(g.sat===false,'`raSatisfied` تقول: الشرط غير محقَّق');
  ok(g.gate===true&&g.disabled===true,'وزرُّ الانتقال معروضٌ **معطَّلاً** لا غائباً');
  ok(g.nextBtns===0,'ولا زرَّ انتقالٍ فعّال على الشاشة');
  ok(/اقرئي/.test(g.txt),'ونصُّه يقول ما المطلوب — '+g.txt);
}

console.log('\n٢) والحارس في الدالّة لا في الزرّ وحده');
{
  const r=await p.evaluate(()=>{
    const before=readIdx;
    readNext();                 // نداءٌ مباشر يتجاوز العرض
    readNext();readNext();
    return {before:before,after:readIdx,done:readDone};
  });
  ok(r.after===r.before&&r.done===false,'ثلاثةُ نداءاتٍ مباشرة لم تُقدّم العنصر — '+r.before+'⇐'+r.after);
}

console.log('\n٣) ومحاولةٌ قصيرةٌ تُهمَل لا تُرضي الشرط');
{
  const r=await p.evaluate(()=>{
    raResult={discarded:true,why:'short'};raDone=false;render();
    const el=document.querySelector('[data-ragate]');
    return {sat:raSatisfied(readCur()),txt:el?el.textContent.trim():''};
  });
  ok(r.sat===false,'الشرط ما زال غير محقَّق');
  ok(/أعيدي|قصير/.test(r.txt),'والنصّ يقول إنها قصيرة — '+r.txt);
}

console.log('\n٤) والتقييم الناجح يفتح الطريق');
{
  const r=await p.evaluate(()=>{
    raResult={ok:true,sc:{pct:88,weak:[],ok:true}};raDone=true;render();
    const nxt=[...document.querySelectorAll('button')].filter(function(x){return /readNext/.test(x.getAttribute('onclick')||'')});
    const before=readIdx;
    if(nxt.length)nxt[0].click();
    return {sat:raSatisfied(readCur()),btn:nxt.length,before:before,after:readIdx,gate:!!document.querySelector('[data-ragate]')};
  });
  ok(r.sat===true,'`raSatisfied` تقول: محقَّق');
  ok(r.btn===1&&r.gate===false,'وزرُّ الانتقال فعّالٌ والصندوق المعطَّل زال');
  ok(r.after===r.before+1,'والنقرُ عليه انتقل فعلاً ('+r.before+'⇐'+r.after+')');
}

console.log('\n٥) وتعثّرُ Azure لا يَحبس — «وهذا لا يُحتسب عليكِ» باقٍ بحرفه');
{
  const r=await p.evaluate(()=>{
    raReset();readLocked=true;render();
    const blocked=raSatisfied(readCur());
    raResult={fail:'azure_no_assessment'};render();
    return {blocked:blocked,after:raSatisfied(readCur())};
  });
  ok(r.blocked===false,'قبل أيّ محاولة: محبوس');
  ok(r.after===true,'وبعد تعثّرٍ مسجَّل من Azure: مفتوح');
}

console.log('\n٦) والميكروفون المحجوب يفتح الطريق — ويُسجَّل حين يقع');
{
  rows.length=0;
  const r=await p.evaluate(async()=>{
    raReset();readLocked=true;raSkipLogged=0;render();
    const blocked=raSatisfied(readCur());
    // جهازٌ بلا واجهة ميكروفون إطلاقاً — نفس حال المتصفّحات المدمجة الموثَّقة
    const md=navigator.mediaDevices;
    try{Object.defineProperty(navigator,'mediaDevices',{configurable:true,value:undefined})}catch(e){}
    await raStart();
    try{Object.defineProperty(navigator,'mediaDevices',{configurable:true,value:md})}catch(e){}
    return {blocked:blocked,err:(raResult||{}).err,after:raSatisfied(readCur())};
  });
  ok(r.blocked===false,'قبل الضغط: محبوس — فلا يُعفى أحدٌ قبل أن يُجرّب');
  ok(r.err==='no_api','والضغطةُ أعادت سببَ التعذّر مسمّى ('+r.err+')');
  ok(r.after===true,'وبعدها: مفتوح — فلا يُقفل قسم المقروء على من يفتح من متصفّحٍ مدمج');
  await p.waitForTimeout(300);
  const sk=rows.map(x=>{try{return JSON.parse(x)}catch(e){return {}}})
    .filter(x=>x.domain==='gen'&&x.qtype==='ra_skip');
  ok(sk.length>=1,'وسطرُ المخرج وصل الجدول (`domain=gen, qtype=ra_skip`)');
  ok(sk[0]&&/no_api/.test(String(sk[0].response||'')),'وسببُه مسمّى — '+(sk[0]&&sk[0].response));
}

console.log('\n٧) ولا إقفالَ للأبد: تقييمٌ لا يُسلَّم يُكنَس بعمرٍ مقاس');
{
  // **ولا يُحاكى الكانسُ بإعادة كتابته** — وإلّا نجح الاختبار ولو لم يُبنَ: تُلتقَط
  // دالّةُ المؤقّت الحقيقية من `setTimeout` عند عمرها المقاس، ثمّ تُستدعى هي نفسها.
  const r=await p.evaluate(()=>{
    raReset();readLocked=true;
    const real=window.setTimeout;let captured=null,capturedMs=0;
    window.setTimeout=function(fn,ms){
      if(ms===RA_BUSY_TTL){captured=fn;capturedMs=ms;return 0}
      return real.apply(window,arguments);
    };
    // مُسجِّلٌ لا يُطلق `onstop` إطلاقاً — وهو ما كان سيحبسها أبداً
    raListening=true;raRec={state:'recording',stop:function(){ /* صمت */ }};
    raStop();
    window.setTimeout=real;
    const mid={busy:raBusy,sat:raSatisfied(readCur())};
    if(captured)captured();              // نفس الدالّة التي يُشغّلها المؤقّت
    return {mid:mid,armed:!!captured,ms:capturedMs,ttl:RA_BUSY_TTL,net:NET_TIMEOUT_MS,
            busy:raBusy,sat:raSatisfied(readCur()),fail:(raResult||{}).fail};
  });
  ok(r.mid.busy===true&&r.mid.sat===false,'أثناء الانتظار: محبوسٌ كما يجب');
  ok(r.armed===true&&r.ms===r.ttl,'والكانسُ مُسلَّحٌ فعلاً بعمره ('+r.ms+'ملّي)');
  ok(r.ttl>=r.net*2,'والعمرُ مشتقٌّ من مهلة الشبكة لا مختار ('+r.net+'×٢+هامش)');
  ok(r.busy===false&&r.sat===true,'وبعد انقضائه: يُفتَح الطريق');
  ok(r.fail==='stalled','وبسببٍ مسمّى يُفصَل عن غيره ('+r.fail+')');
}

console.log('\n٨) والمفتاح واحد، والشرط لا يُفرَض على عنصرٍ بلا هدف');
{
  const r=await p.evaluate(()=>{
    const flag=RA_REQUIRED;
    raReset();readLocked=true;
    const withT=raSatisfied(readCur());
    // عنصرٌ بلا نصّ: لا شيء يُقرأ، فلا شرط
    const saved=readItems[readIdx];
    readItems[readIdx]=Object.assign({},saved,{passage:""});
    const noT=raSatisfied(readCur());
    readItems[readIdx]=saved;
    // وقبل القفل لا شرط إطلاقاً
    readLocked=false;const preLock=raSatisfied(readCur());
    readLocked=true;
    return {flag:flag,withT:withT,noT:noT,preLock:preLock};
  });
  ok(r.flag===true,'`RA_REQUIRED` مفتاحٌ واحد معلن');
  ok(r.withT===false,'عنصرٌ له هدف ⇒ الشرط قائم');
  ok(r.noT===true,'وعنصرٌ بلا نصّ ⇒ لا شرط على ما لا وجود له');
  ok(r.preLock===true,'وقبل الإجابة ⇒ لا شرط (الصندوق لا يظهر أصلاً)');
}

console.log('\n٩) والصندوق يقول «مطلوبة» لا «اختياري» — وفي الاتّجاهين');
{
  const r=await p.evaluate(()=>{
    raReset();readLocked=true;render();
    // بالعنصر لا بالنصّ (درس `data-poscx`): البحث النصّي في الصفحة يلتقط ما ليس
    // الصندوق — ويطبع سطراً لا يُقرأ.
    const box=document.querySelector('[data-rabox]');
    return {txt:box?box.textContent.replace(/\s+/g,' ').trim():'لا صندوق'};
  });
  ok(/مطلوبة قبل الانتقال/.test(r.txt),'عند هيا: «مطلوبة قبل الانتقال» — '+r.txt);
  ok(!/\(اختياري\)/.test(r.txt),'ولا تبقى كلمة «اختياري»');
}

console.log('\n١٠) وعلى صفحة إلياس كذلك — الإجبار للثلاثة لا لواحد');
{
  const p2=await b.newPage({viewport:{width:420,height:900}});
  p2.on('pageerror',e=>{console.log('  ✗ PAGEERROR(elias) '+e.message);fails++});
  await p2.route('**/rest/v1/**',r=>r.fulfill({status:200,contentType:'application/json',body:'[]'}));
  await p2.route('**/functions/v1/**',r=>r.fulfill({status:200,contentType:'application/json',body:'{"ok":false}'}));
  await p2.goto('http://127.0.0.1:8931/elias.html');
  await p2.waitForFunction(()=>typeof raSatisfied==='function');
  const r=await p2.evaluate(async()=>{
    await startRead();
    gateSecs=0;gateLeft=0;render();
    const btns=[...document.querySelectorAll('.choices button.choice')];
    if(!btns.length)return {err:'لا خيارات'};
    btns[0].click();
    const el=document.querySelector('[data-ragate]');
    return {err:'',sat:raSatisfied(readCur()),gate:!!el,txt:el?el.textContent.trim():'',
            whole:readAloudWhole(readCur()),id:profileId()};
  });
  ok(!r.err,'جلسةُ إلياس فُتحت ('+(r.err||'')+')');
  ok(r.id!=='haya','وهو ليس هيا ('+r.id+')');
  ok(r.sat===false&&r.gate===true,'والانتقال مقفولٌ عنده كذلك');
  // الخطابُ يتحوّل بمراقب DOM لا في الرسم — فيُنتظَر دورةٌ قبل القراءة
  await p2.waitForTimeout(250);
  const g=await p2.evaluate(()=>{const el=document.querySelector('[data-ragate]');return el?el.textContent.trim():''});
  ok(!/[ا-ي]ي\b/.test(g.replace(/اقرئي/,'X'))||/اقرأ/.test(g),'ونصُّه بخطاب المذكّر — '+g);
}

console.log('\n'+(fails?('✗ سقط '+fails):'✓ كل الفحوص نجحت'));
await b.close();process.exit(fails?1:0);
})();
