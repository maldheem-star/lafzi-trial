// معيار السلامة النحوية في الدمج كان يُفحَص ولا يُعرض — ٦ سبتمبر.
//
// العطل الذي يحرسه، ببياناتٍ حيّة لا مثالٍ مؤلَّف: إلياس ٦ سبتمبر ١٨:٣٨ كتب
//   «I have friend who is name sarh and she lives in Riyadh.»
// لسؤال «Combine … using "who"» — ١٢ كلمةً لهدفٍ ٩، و`دمج:ok`، و`جمل:1`. أي أنه
// حقّق **المعايير الثلاثة المعروضة كلَّها** في «تنجحين إذا»، وسقط لأن `writeFinish`
// يشترط زيادةً `!writeFix.length` وقد عاد تصحيحٌ واحد (`review:fixes:1`).
//
// **والأسوأ أن الأمر معكوسٌ في نفس الجلسة**: قطعتاه الحرّتان (١٨:٤٢ و١٨:٤٦) مرّتا
// ناجحتين ومعهما تصحيحٌ واحد وثلاثة — لأن الحرّ يُحكم بالطول وحده. فخطأٌ واحد يُسقط
// الدمج وثلاثةٌ لا تُسقط الحرّ، بعد أربع دقائق، لنفس الطالب.
//
// **وحدُّ الإصلاح يُقال**: المعيار **يُعلَن ولا يُغيَّر** — الحكم كما كان بالضبط،
// والمضاف سطرٌ في القائمة بحالةٍ ثلاثيّة (النحو يعود بعد الإرسال فلا يُعرف قبله،
// و○ فوق «سليمة نحوياً» قبل الإرسال تقرأ «فيها خطأ» وهي كذب).
const {chromium}=require('/opt/node22/lib/node_modules/playwright');
let fails=0;const ok=(c,m)=>{console.log((c?'  ✓ ':'  ✗ FAIL ')+m);if(!c)fails++};
(async()=>{
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'});
const mk=async(f)=>{
  const ctx=await b.newContext({viewport:{width:420,height:900}});
  const page=await ctx.newPage();
  page.on('pageerror',e=>{console.log('  ✗ PAGEERROR '+e.message);fails++});
  await page.route('**/rest/v1/**',r=>r.fulfill({status:201,contentType:'application/json',body:'[]'}));
  await page.route('**/functions/v1/**',r=>r.fulfill({status:200,contentType:'application/json',body:'{"ok":true,"reply":"NONE"}'}));
  await page.goto('http://127.0.0.1:8931/'+(f||'index.html'));
  await page.waitForFunction(()=>typeof writeCritState==='function');
  return page;
};
const p=await mk();

// عنصر الدمج الحيّ الذي سقط عليه، ونصُّه حرفاً بحرف
const LIVE=`(function(){
  const it=(WRITE_BANK||[]).filter(function(x){return x.type==="combine"&&x.req})[0];
  window.__it=it; return !!it;
})()`;

console.log('\n١) العنصر الحيّ موجود — وإلّا لم يُقَس شيء');
{
  const has=await p.evaluate(LIVE);
  ok(has,'وُجد عنصر دمجٍ بكلمةٍ مطلوبة في البنك');
}

console.log('\n٢) المعيار صار معروضاً — وكان غائباً');
{
  const r=await p.evaluate(()=>{
    const keys=writeCriteria(window.__it).map(function(c){return c.k});
    const free=(WRITE_BANK||[]).filter(function(x){return x.type!=="combine"})[0];
    return{combine:keys,freeKeys:free?writeCriteria(free).map(function(c){return c.k}):[]};
  });
  ok(r.combine.indexOf('clean')>=0,'قائمة الدمج تذكر السلامة النحوية — '+r.combine.join(','));
  ok(r.combine.indexOf('one')>=0&&r.combine.indexOf('req')>=0&&r.combine.indexOf('words')>=0,
    'والثلاثة القديمة باقيةٌ كما كانت — لا انحدار');
  ok(r.freeKeys.indexOf('clean')<0,
    'ولا تُذكر في الكتابة الحرّة — لأن الحرّ لا يُحكم بالنحو أصلاً · '+r.freeKeys.join(','));
}

console.log('\n٣) حالةٌ ثلاثيّة: معلَّقٌ قبل الإرسال لا مُخفَق');
{
  const r=await p.evaluate(()=>{
    const it=window.__it;
    writeSubmitted=false;writeBusy=false;writeFix=[];writeFixFail="";
    const txt="I have friend who is name sarh and she lives in Riyadh.";
    const before=writeCritState(it,txt);
    const html=writeCritHTML(it,txt);
    return{clean:before.clean,one:before.one,req:before.req,words:before.words,
      pend:/⋯/.test(html),falseMark:/○[^]{0,80}سليمة نحوياً/.test(html)};
  });
  ok(r.clean===null,'قبل الإرسال الحالة null — معلَّقةٌ لا مُخفَقة');
  ok(r.pend,'وتُرسم ⋯ في الصندوق');
  ok(!r.falseMark,'ولا ○ فوق «سليمة نحوياً» — فلا يُقال له إن جملته خاطئة قبل فحصها');
  ok(r.one===true&&r.req===true&&r.words===true,
    '**والثلاثة المعروضة محقّقةٌ في جوابه الحيّ** — one/req/words، وهو ما جعل سقوطه بلا إعلان');
}

console.log('\n٤) وبعد الإرسال تُحسم — بنفس شرط الحكم حرفاً');
{
  const r=await p.evaluate(()=>{
    const it=window.__it,txt="I have friend who is name sarh and she lives in Riyadh.";
    const out={};
    writeSubmitted=true;
    writeBusy=true;writeFix=[];writeFixFail="";
    out.busy=writeCritState(it,txt).clean;
    writeBusy=false;writeFix=[{said:"x",fix:"y"}];
    out.dirty=writeCritState(it,txt).clean;
    out.dirtyHtml=/○[^]{0,80}سليمة نحوياً/.test(writeCritHTML(it,txt));
    writeFix=[];
    out.clean=writeCritState(it,txt).clean;
    out.cleanHtml=/✓[^]{0,80}سليمة نحوياً/.test(writeCritHTML(it,txt));
    // تعذّرُ المراجعة يُعدّ نجاحاً في `writeFinish` — فليكن هنا كذلك لا عكسه
    writeFix=[{said:"x",fix:"y"}];writeFixFail="net";
    out.failPass=writeCritState(it,txt).clean;
    writeFixFail="";writeFix=[];writeSubmitted=false;
    return out;
  });
  ok(r.busy===null,'أثناء المراجعة تبقى ⋯');
  ok(r.dirty===false&&r.dirtyHtml,'ومع تصحيحٍ عائد تصير ○');
  ok(r.clean===true&&r.cleanHtml,'وبلا تصحيحٍ تصير ✓');
  ok(r.failPass===true,'وتعذُّرُ المراجعة يُعدّ نجاحاً — نفس `writeFixFail?true:` في writeFinish');
}

console.log('\n٥) والحكم نفسه لم يتغيّر — إعلانٌ لا تخفيف');
{
  const r=await p.evaluate(()=>{
    const src=String(writeSubmit)+String(window.writeFinish||"");
    return{guard:/writeFixFail\?true:!writeFix\.length/.test(src)};
  });
  ok(r.guard,'شرط `writeFixFail?true:!writeFix.length` باقٍ في الحكم بحرفه');
}

console.log('\n٦) جولةٌ حقيقية بنقراتٍ فعلية — الصندوق يُرسم بلا كسر');
{
  const q=await mk();
  await q.evaluate(()=>{
    const bank=(WRITE_BANK||[]).filter(function(x){return x.type==="combine"&&x.req});
    buildWritePlan=function(){return bank.slice(0,1)};
    startWrite();
  });
  await q.waitForSelector('#writeIn');
  await q.type('#writeIn','I have friend who is name sarh and she lives in Riyadh.',{delay:4});
  const r=await q.evaluate(()=>{
    const h=(document.getElementById('writeCrit')||{}).innerHTML||"";
    return{rows:(h.match(/⋯|✓|○/g)||[]).length,pend:/⋯/.test(h),
      hasClean:/سليمة نحوياً/.test(h),len:h.length};
  });
  ok(r.hasClean&&r.pend,'السطر معروضٌ حيّاً بعلامته المعلَّقة');
  ok(r.rows===4,'وأربعة شروطٍ لا ثلاثة — '+r.rows);
  await q.context().close();
}

console.log('\n٧) للثلاثة، ولا دالّة مفقودة');
{
  for(const f of ['index.html','mohammed.html','elias.html']){
    const q=await mk(f);
    const r=await q.evaluate(()=>{
      const it=(WRITE_BANK||[]).filter(function(x){return x.type==="combine"&&x.req})[0];
      return{k:it?writeCriteria(it).map(function(c){return c.k}).indexOf('clean')>=0:false,
        miss:censusMissing()};
    });
    ok(r.k&&r.miss.length===0,f+' — المعيار معروضٌ ولا دالّة مفقودة '+r.miss.join(','));
    await q.context().close();
  }
}

console.log('\n٨) وصندوق إلياس بخطاب المذكّر — عيبٌ كشفته اللقطة لا الاختبار');
{
  // اللقطةُ الإلزامية أظهرت «تستعملين كلمة ربط» و«قبل أن تكتبي» على صفحته وهو ذكر.
  // والكاشفُ أبلغ عن ثالثةٍ **كاذبة**: «أيّ الجملتين تأتي أوّلاً» غائبٌ عن الجملة
  // لا خطابٌ للقارئة — فتُستثنى بنصّها، ولا يُوسَّع النمط ليبتلعها.
  const q=await mk('elias.html');
  await q.evaluate(()=>{
    const bank=(WRITE_BANK||[]).filter(function(x){return x.type==="combine"&&x.req});
    buildWritePlan=function(){return bank.slice(0,1)};startWrite();
  });
  await q.waitForSelector('#writeIn');
  await q.waitForTimeout(300);
  const r=await q.evaluate(()=>{
    const fem=/^(ت[ء-ي]{2,}(ين|ي)|ا[ء-ي]{2,}ي)$/;
    const bad=[...new Set(document.body.innerText.split(/[^ء-ي]+/).filter(Boolean)
      .filter(function(w){return fem.test(w)&&!MASC_W[w]}))];
    return{bad:bad,box:(document.getElementById('writeCrit')||{}).innerText||""};
  }).catch(()=>null);
  ok(r&&r.bad.length===1&&r.bad[0]==='تأتي',
    'لم يبقَ على شاشته مؤنّثٌ إلّا البلاغ الكاذب — '+(r?r.bad.join(','):'تعذّر'));
  // بلا `\b`: حدُّ الكلمة في JS يقوم على محارف ASCII، فلا يقع بعد حرفٍ عربي أصلاً
  // — وأوّل صياغةٍ لهذا الشرط سقطت على صندوقٍ نصُّه صحيح. الشرطُ على النفي هو الحاسم.
  ok(r&&/تستعمل /.test(r.box)&&!/تستعملين/.test(r.box),
    'ومعيار الدمج يخاطبه «تستعمل»');
  const g=await q.evaluate(()=>({a:MASC_W["تستعملين"],b:MASC_W["تكتبي"],c:MASC_W["تأتي"]}));
  ok(g.a==='تستعمل'&&g.b==='تكتب','والمدخلان في الجدول');
  ok(!g.c,'و«تأتي» ليست فيه — لا يُصلَح ما ليس عطلاً');
  await q.context().close();
}

await b.close();
console.log(fails?`\n=== ${fails} فشل ===`:'\n=== كل الاختبارات نجحت ===');
process.exit(fails?1:0);
})();
