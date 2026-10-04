// ===== شحنة ٤ أكتوبر: ما تفعله هيا ببوّابة الموضع، والإملاء الصوتي لا يُنجِح =====
// (١) البوّابة سُلِّحت ثلاث مرّات في ١ أكتوبر وستّاً في ٤ أكتوبر، وبعدها ضغطت هيا الزرّ
//     الثاني **١٢ من ١٢** في الاستماع (درجتُها ٣ من ٨). فقلتُ إن الفرضيّة ساقطة، **ولا
//     سطرَ في السجلّ يُثبت أن الصندوق عُرض أصلاً** — فتعذّر الفصل بين فرضيّةٍ فشلت
//     وفرضيّةٍ لم تُجرَّب. وهذا الحارس يُثبّت أن ما جرى صار مقروءاً.
// (٢) `write_dictated` أمسك إملاءها الصوتي (`insertCompositionText`، دفعة ٨) ومعه
//     `In my family, there are I love you very family and mom or dad to Grandma your
//     brother` — **ونال صواباً** لأن المعيار عددُ الكلمات (١٨ لهدف ١٠). فالحارس كان
//     يُسقط بطاقات التصحيح ويُبقي الدرجة، وهو معكوسُ ما أُصلح للصق في ٦ سبتمبر.
//
// **والنصوص هنا من سجلّ ٤ أكتوبر حرفاً بحرف** لا أمثلةً مؤلَّفة.
const {chromium}=require('/opt/node22/lib/node_modules/playwright');
let fails=0;const ok=(c,m)=>{console.log((c?'  ✓ ':'  ✗ FAIL ')+m);if(!c)fails++};
const BASE='http://127.0.0.1:8931/index.html';

(async()=>{
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'});
const rows=[];
const mk=async(q)=>{
  const ctx=await b.newContext({viewport:{width:420,height:900}});
  const p=await ctx.newPage();
  p.on('pageerror',e=>{console.log('  ✗ PAGEERROR '+e.message);fails++});
  await p.route('**/rest/v1/**',r=>{
    const d=r.request().postData()||'';
    if(r.request().method()==='POST'&&d)rows.push(d);
    r.fulfill({status:200,contentType:'application/json',body:'[]'});
  });
  await p.route('**/functions/v1/**',r=>r.fulfill({status:200,contentType:'application/json',body:'{"ok":false}'}));
  await p.addInitScript(()=>{
    Object.defineProperty(window,'speechSynthesis',{configurable:true,value:{
      speak(){},cancel(){},resume(){},pause(){},getVoices:()=>[{lang:'en-US',name:'X'}],speaking:false,pending:false}});
    window.SpeechSynthesisUtterance=function(t){this.text=t};
  });
  await p.goto(BASE+(q||''));
  await p.waitForFunction(()=>typeof posCxNote==='function'&&typeof writeCritHTML==='function');
  await p.waitForTimeout(250);
  return p;
};
// صفوفُ السجلّ التي تحمل وسماً بعينه — تُقرأ من جسم الطلب الفعلي لا من حالةٍ في الصفحة
const hits=re=>rows.filter(x=>re.test(x));
const clearRows=()=>{rows.length=0};

// ─────────────────────────────────────────────────────────────────────────────
// تسليحُ البوّابة ببيانات هيا الحقيقية: الزرّ الثاني في اثنتي عشرة إجابةٍ من ثلاثة
// خيارات — وهو ما سجّله `pos_bias` حرفياً يوم ٤ أكتوبر («الزرّ ٢ اختير ١٢ من ١٢»).
const ARM=`lsSet('pos_bias_listen',JSON.stringify(Array.from({length:12},()=>[2,3])))`;

console.log('\n١) البوّابة مُسلَّحةٌ فعلاً بالبيانات الحيّة — وإلّا لم يقس الاختبار شيئاً');
const p=await mk();
{
  const r=await p.evaluate(a=>{eval(a);return {armed:posBiasArmed('listen'),b:posBiasOf('listen')}},ARM);
  ok(r.armed===true,'`posBiasArmed(listen)` ⇐ true');
  ok(r.b&&r.b.hits===12&&r.b.n===12&&r.b.nOpt===3,`والقياس ${r.b&&r.b.hits}/${r.b&&r.b.n} بـ${r.b&&r.b.nOpt} خيارات`);
}

// جلسةُ استماعٍ حقيقية بنقرةٍ على الزرّ **المعروض** لا على فهرس البنك
async function openListen(){
  return p.evaluate(()=>{
    startListen();gateSecs=0;gateLeft=0;listenPlays=3;render();
    return (document.querySelectorAll('.choices button.choice')||[]).length;
  });
}
const clickNth=n=>p.evaluate(i=>{
  const btns=[...document.querySelectorAll('.choices button.choice')];
  if(!btns[i])return false;btns[i].click();return true;
},n);
const boxOn=()=>p.evaluate(()=>!!document.querySelector('[data-poscx="1"]'));

console.log('\n٢) عرضُ الصندوق يصل السجلّ — الثغرة المُعلَنة في ١ أكتوبر');
{
  await openListen();clearRows();
  const c1=await clickNth(0);
  ok(c1===true,'نُقر خيارٌ معروض');
  ok(await boxOn()===true,'وظهر صندوق التأكيد فعلاً');
  await p.waitForTimeout(150);
  const shown=hits(/pos_cx/);
  ok(shown.length===1,`وصل صفُّ \`pos_cx\` واحد (${shown.length})`);
  ok(shown.length>0&&/عُ?رض/.test(shown[0]),'ونوعُه «عُرض»');
  ok(shown.length>0&&/listen/.test(shown[0]),'ومعه اسمُ القسم');
}

console.log('\n٣) `تأكيد:مباشر` — عُرض فأكّدت نفس الخيار (الفرضيّة لم تُغيّر شيئاً)');
{
  clearRows();
  await clickNth(0);                       // النقرة الثانية على نفس الخيار = تأكيد
  await p.waitForTimeout(250);
  const ans=hits(/"domain":"listen"/);
  ok(ans.length===1,`قُفل الجواب وسُجّل (${ans.length} صفّاً)`);
  const s=ans[0]||'';
  ok(/تأكيد:مباشر/.test(s),'والسطرُ يحمل `تأكيد:مباشر`');
  ok(/تحيّز:موضع/.test(s),'ومعه وسمُ التحيّز كما كان — لا استبدال');
  ok(!/تراجعات/.test(s),'وبلا «تراجعات» (لم تتراجع)');
}

console.log('\n٤) `تأكيد:مبدَّل` — البوّابة غيّرت جوابها فعلاً، وهذا وحده دليلُ نجاحها');
{
  await p.evaluate(()=>listenNext());
  await p.evaluate(()=>{gateSecs=0;gateLeft=0;listenPlays=3;render()});
  clearRows();
  await clickNth(1);                       // عُرض الصندوق للخيار الثاني
  ok(await boxOn()===true,'ظهر الصندوق للخيار الثاني');
  await clickNth(0);                       // ثمّ اختارت غيره ⇒ يُعاد العرض له
  ok(await boxOn()===true,'ثمّ انتقلت إلى خيارٍ آخر فأُعيد العرض');
  await clickNth(0);                       // وأكّدت الجديد
  await p.waitForTimeout(250);
  const ans=hits(/"domain":"listen"/);
  ok(ans.length===1,`قُفل الجواب (${ans.length} صفّاً)`);
  const s=ans[0]||'';
  ok(/تأكيد:مبدَّل/.test(s),'والسطرُ يحمل `تأكيد:مبدَّل` لا «مباشر»');
  ok(/عرضاً/.test(s),'ومعه عددُ العروض — فلا يستوي من أكّد من أوّل عرضٍ ومن تردّد');
}

console.log('\n٥) «تراجع» يُسجَّل، ويُعدّ في سطر الإجابة بعده');
{
  await p.evaluate(()=>listenNext());
  await p.evaluate(()=>{gateSecs=0;gateLeft=0;listenPlays=3;render()});
  clearRows();
  await clickNth(0);
  await p.evaluate(()=>posCancel());
  await p.waitForTimeout(150);
  ok(hits(/pos_cx/).some(x=>/تراجع/.test(x)),'وصل صفُّ `pos_cx` بنوع «تراجع»');
  ok(await boxOn()===false,'والصندوق انطوى');
  await p.evaluate(()=>{gateSecs=0;gateLeft=0;listenPlays=3;render()});
  clearRows();
  await clickNth(0);await clickNth(0);
  await p.waitForTimeout(250);
  const s=(hits(/"domain":"listen"/)[0])||'';
  ok(/تراجعات:١/.test(s),`وسطرُ الإجابة يحمل «تراجعات:١» — ${(s.match(/تراجعات:\S+/)||[''])[0]}`);
}

console.log('\n٦) سقفُ الضجيج: سطران لكل سبب في عمر الصفحة لا سطرٌ لكل عرض');
{
  clearRows();
  // عروضٌ متتالية بلا تأكيد: ستٌّ منها، والمتوقَّع صفٌّ واحد (الأوّل استُهلك في القسم ٢)
  for(let k=0;k<6;k++){
    await p.evaluate(()=>listenNext());
    await p.evaluate(()=>{gateSecs=0;gateLeft=0;listenPlays=3;render()});
    await clickNth(0);await p.evaluate(()=>posCancel());
  }
  await p.waitForTimeout(250);
  const n=hits(/pos_cx/).length;
  ok(n<=2,`ستُّ عروضٍ وستُّ تراجعاتٍ ⇒ ${n} صفّاً فقط — لا إغراق`);
  ok(n>=1,'  وليس صفراً — فالسقف يحدّ ولا يُسكت');
}

console.log('\n٧) وبلا تسليحٍ لا وسمَ ولا صندوق — فلا تُمَسّ من لا عَرَض عنده');
{
  const q=await mk('?p=mohammed');
  const r=await q.evaluate(()=>{
    lsSet('pos_bias_listen','[]');
    startListen();gateSecs=0;gateLeft=0;listenPlays=3;render();
    const armed=posBiasArmed('listen');
    const btns=[...document.querySelectorAll('.choices button.choice')];
    btns[0].click();
    return {armed:armed,box:!!document.querySelector('[data-poscx="1"]'),locked:listenLocked};
  });
  ok(r.armed===false,'غيرُ مُسلَّحة');
  ok(r.box===false,'ولا صندوق');
  ok(r.locked===true,'والجواب يُقفَل من النقرة الأولى كما كان');
  await q.waitForTimeout(250);
  ok(!hits(/تأكيد:/).length||!hits(/"domain":"listen"/).some(x=>/تأكيد:/.test(x)&&/mohammed/.test(x)),
     'ولا وسمَ تأكيدٍ في سطره');
  await q.close();
}

// ─────────────────────────────────────────────────────────────────────────────
console.log('\n٨) الإملاء الصوتي لا يُنجِح — الحالة الحيّة بنصّها');
const w=await mk();
// نصُّ هيا الحقيقي من سجلّ ٤ أكتوبر ١٥:٥١:٠٧ — ١٨ كلمة لهدف ١٠
const DICT='In my family, there are I love you very family and mom or dad to Grandma your brother';
// **والعنصر يُثبَّت لا يُترَك للقرعة**: جلسةُ الكتابة تخلط عناصرها، وفيها نوعُ «دمج»
// يسقط بـ`missing_connector` — فلو وقعت القرعة عليه لسقط الاختبار **بسببٍ غير سببه**،
// وهو بعينه فخُّ «اختبارٌ يتقلّب بالقرعة» (٥ سبتمبر). فيُفرض عنصرُ كتابةٍ حرّة صراحةً.
async function writeOne(page,text,inputType){
  return page.evaluate(async a=>{
    startWrite();await new Promise(r=>setTimeout(r,120));
    const free=(writeBankFor(profileOf().level)||[]).filter(function(x){return x.type!=="combine"});
    if(!free.length)return {err:'لا عنصر كتابةٍ حرّة في البنك'};
    writeItems=[free[0]];writeIdx=0;writeSubmitted=false;writeFix=[];writeFixFail="";
    writeTyped="";writeCount=0;writeCopy=false;writeBurstReset("");render();
    await new Promise(r=>setTimeout(r,80));
    const el=document.getElementById('writeIn');
    if(!el)return {err:'لا صندوق كتابة'};
    el.value=a.t;
    // حدثٌ مُصطنَع بنوعٍ صريح: المفحوص هو حكمُنا على `inputType` لا سلوكُ المتصفّح
    writeLive({inputType:a.k});
    const it=writeCur(),g=writeGoalsNow(it);
    await writeSubmit();
    return {err:'',dict:writeDictated,words:writeCount,goal:g.words,type:it.type,
            screen:document.getElementById('app').textContent,lv:it.lv};
  },{t:text,k:inputType});
}
{
  clearRows();
  const r=await writeOne(w,DICT,'insertCompositionText');
  ok(!r.err,'جلسةُ كتابةٍ حقيقية ('+(r.err||'')+')');
  ok(r.type!=='combine','والعنصر كتابةٌ حرّة — فالسقوط لا يُنسَب لمعيار الدمج');
  ok(r.dict===true,'`writeDictated` مرفوعة بـ`insertCompositionText`');
  ok(r.words>=r.goal,`وعددُ الكلمات بالغٌ الهدف (${r.words} ≥ ${r.goal}) — فالسقوط ليس بسبب الطول`);
  await w.waitForTimeout(300);
  const ans=hits(/"domain":"write"/).filter(x=>!/"qtype":"fix"/.test(x));
  ok(ans.length>=1,`وسُجّل صفُّ الكتابة (${ans.length})`);
  const s=ans[0]||'';
  ok(/"is_correct":false/.test(s),'**ولم يُحتسب صواباً** — وكان يُحتسب قبل اليوم');
  ok(/إملاء:1/.test(s),'والسطرُ يحمل «إملاء:1» صراحةً');
  ok(/أُملي بالصوت/.test(r.screen),'والشاشةُ تقول السبب — لا «✓ بلغتِ الهدف» فوق صفر');
  // **وكشفته اللقطة لا الاختبار**: «تنجحين إذا» كانت تعرض ✓✓ فوق درجةٍ صفر
  const cr=await w.evaluate(()=>{
    const rows=[...document.querySelectorAll('div')]
      .filter(d=>/^[✓○⋯]/.test(d.textContent.trim())&&d.children.length===2)
      .map(d=>({mark:d.textContent.trim()[0],txt:d.textContent.trim().slice(1).trim(),
                markX:Math.round(d.children[0].getBoundingClientRect().x)}));
    return {rows:rows,overflowX:document.documentElement.scrollWidth>document.documentElement.clientWidth};
  });
  const bh=cr.rows.filter(x=>/بخطّ يدك/.test(x.txt))[0];
  ok(!!bh,'ومعيار «بخطّ يدك» معروضٌ في قائمة «تنجحين إذا» لا في هامشٍ رمادي');
  ok(bh&&bh.mark==='○',`وعلامتُه ○ لا ✓ — فالشاشة لا تناقض السجلّ (${bh&&bh.mark})`);
  ok(cr.rows.length>=3&&cr.rows.every(x=>x.markX===cr.rows[0].markX),'والعلامات على عمودٍ واحد يميناً — بلا انقلاب');
  ok(cr.overflowX===false,'ولا تمريرٌ أفقي');
  ok(hits(/write_dictated/).some(x=>/لم يُحتسب نجاحاً/.test(x)),
     'وصفُّ `write_dictated` صار يقول «ولم يُحتسب نجاحاً»');
}

console.log('\n٩) ولا انحدار على من يكتب بأصابعه — درس ٢٩ أغسطس');
{
  const w2=await mk();
  clearRows();
  // `insertText` العادي: لا إملاء ولا لصق. ونصٌّ سليمٌ بالغٌ الهدف.
  const r=await writeOne(w2,'I have one brother and one sister. We play football together every Friday.','insertText');
  ok(!r.err&&r.type!=='combine','عنصرُ كتابةٍ حرّة ('+(r.err||'')+')');
  ok(r.dict===false,'`writeDictated` منخفضة');
  await w2.waitForTimeout(300);
  const s=(hits(/"domain":"write"/).filter(x=>!/"qtype":"fix"/.test(x))[0])||'';
  ok(/إملاء:0/.test(s),'والسطر «إملاء:0»');
  ok(/"is_correct":true/.test(s),'والدرجة كما كانت — الطول وحده يكفي للكتابة الحرّة');
  const bh2=await w2.evaluate(()=>{
    const d=[...document.querySelectorAll('div')]
      .filter(x=>/^[✓○⋯]/.test(x.textContent.trim())&&x.children.length===2)
      .filter(x=>/بخطّ يدك/.test(x.textContent))[0];
    return d?d.textContent.trim()[0]:null;
  });
  ok(bh2==='✓',`ومعيار «بخطّ يدك» ✓ لمن كتب بأصابعه (${bh2})`);
  // والمعيار يُعرض في نوعَي الكتابة معاً — الحرّ والدمج
  const both=await w2.evaluate(()=>{
    const bank=writeBankFor(profileOf().level)||[];
    const free=bank.filter(x=>x.type!=="combine")[0],cmb=bank.filter(x=>x.type==="combine")[0];
    const K=it=>it?writeCriteria(it).map(c=>c.k):[];
    return {free:K(free).indexOf('byhand')>=0,combine:cmb?K(cmb).indexOf('byhand')>=0:null};
  });
  ok(both.free===true&&both.combine!==false,`وفي النوعين معاً (حرّ:${both.free} · دمج:${both.combine})`);
  // والتصحيحُ التلقائي في لوحة الهاتف بحجم كلمة يبقى كتابةً عادية (قياس ٢٩ أغسطس:
  // أكبر دفعةِ تصحيحٍ مرصودة عند إلياس ٩ محارف). **والصندوق يُفرَّغ أوّلاً** — وإلّا
  // قِيست الدفعةُ من نصٍّ سابق فصارت ٧٤ محرفاً، وهي حينها إدخالُ نصٍّ كامل بحقّ.
  const r2=await w2.evaluate(()=>{
    const el=document.getElementById('writeIn');if(el)el.value='';
    writeBurstReset('');
    if(el)el.value='family';            // تصحيحُ كلمةٍ واحدة: ستّة محارف
    writeLive({inputType:'insertReplacementText'});
    return {dict:writeDictated,burst:writeMaxBurst};
  });
  ok(r2.dict===false,`و\`insertReplacementText\` بحجم كلمة (${r2.burst} محرفاً) لا يُعَدّ إملاءً — لا عقوبةَ على هاتف`);
  await w2.close();
}

console.log('\n١٠) والمعيارُ يُعلَن قبل أن يُطبَّق — ويتحوّل في الاتّجاهين');
{
  const t=await w.evaluate(()=>{startWrite();render();return document.getElementById('app').textContent});
  ok(/الإملاء بالصوت لا يُحتسب/.test(t),'سطرٌ ثابت تحت الصندوق يقوله قبل المحاولة');
  ok(/اكتبي الجواب بأصابعك/.test(t),'وخطابُ هيا مؤنّث');
  const e=await mk('?p=elias');
  const te=await e.evaluate(()=>{startWrite();render();return new Promise(r=>setTimeout(()=>r(document.getElementById('app').textContent),400))});
  ok(/الإملاء بالصوت لا يُحتسب/.test(te),'وإلياس يراه كذلك');
  ok(/اكتب الجواب بأصابعك/.test(te)&&!/اكتبي الجواب/.test(te),'وبخطاب المذكّر — بلا مدخلٍ جديد في MASC_W');
  await e.close();
}

console.log('\n١١) ولا خطأ، وكلُّ الدوال معرَّفة');
{
  ok((await p.evaluate(()=>censusMissing())).length===0,'`censusMissing()` فارغة');
  ok((await p.evaluate(()=>window.__ERRS.length))===0,'ولا خطأ في صفحة الاستماع');
  ok((await w.evaluate(()=>window.__ERRS.length))===0,'ولا خطأ في صفحة الكتابة');
}

await p.close();await w.close();await b.close();
console.log(fails?`\n✗ FAIL ${fails} فشل`:'\n=== كل الاختبارات نجحت ===');
process.exit(fails?1:0);
})().catch(e=>{console.error('✗ FAIL '+e.message);process.exit(1)});
