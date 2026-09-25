// ===== شحنة ٢٥ سبتمبر: ثلاثة أعطالٍ مقاسة من سجلّ ٢٠-٢٤ سبتمبر =====
// (١) انحيازُ موضعٍ عند هيا يبتلع أربعة أقسام: الزرّ الثاني ٢٤/٣٢ استماعاً و١١/١٥
//     قواعد و٢١/٣٢ مقروءاً — والصدفة ٣٣٪/٢٥٪. ودرجتُها فيها أثرُ موضعٍ لا فهم.
// (٢) `no_min` أسقط ١٥ عنصر كتابةٍ مولَّداً بين ١٩ و٢٤ سبتمبر، وصفرُ عنصرٍ وصل أحداً
//     منذ ٢٥ أغسطس.
// (٣) `rate_budget` ١١ مرّة عند هيا: نداءٌ ينجح وثلاثةٌ تُمنَع في الثانية نفسها، لأن
//     سقف الدقيقة ١٠٠٠ رمزاً والنداء يحجز ٨٠٠ — فالممكن نداءٌ واحد لا خمسة.
//
// **والنصوص هنا من السجلّ الحيّ حرفاً بحرف** لا أمثلةً مؤلَّفة.
const {chromium}=require('/opt/node22/lib/node_modules/playwright');
let fails=0;const ok=(c,m)=>{console.log((c?'  ✓ ':'  ✗ FAIL ')+m);if(!c)fails++};
(async()=>{
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'});
const p=await b.newPage({viewport:{width:420,height:900}});
p.on('pageerror',e=>{console.log('  ✗ PAGEERROR '+e.message);fails++});
const calls=[];
await p.route('**/rest/v1/**',r=>r.fulfill({status:200,contentType:'application/json',body:'[]'}));
await p.route('**/functions/v1/**',r=>{
  calls.push(r.request().url()+' :: '+(r.request().postData()||''));
  r.fulfill({status:200,contentType:'application/json',body:'{"ok":false}'});
});
await p.addInitScript(()=>{
  Object.defineProperty(window,'speechSynthesis',{configurable:true,value:{speak(){},cancel(){},getVoices:()=>[{lang:'en-US',name:'X'}],speaking:false,pending:false}});
  window.SpeechSynthesisUtterance=function(t){this.text=t};
});
await p.goto('http://127.0.0.1:8931/index.html');
await p.waitForFunction(()=>typeof posBiasArmed==='function'&&typeof parseGenWriteBlock==='function');

// ─────────────────────────────────────────────────────────────────────────────
console.log('\n١) `no_min`: الحالة الحيّة — MIN مهرَّبٌ داخل سطر PROMPT');
{
  const r=await p.evaluate(()=>{
    // شكلُ ما يُنتجه النموذج فعلاً: تعليمة الخادم «اكتب فواصل الأسطر حرفَي \\n»
    // تجعله يُهرّب كلَّ سطرٍ بعدها بما فيه سطر MIN، فيسقط داخل PROMPT.
    const reply='PROMPT: Write an email to your school principal asking for permission to start a part-time job after school. Include the following points:\\n• Explain why you want the job and what you hope to learn.\\n• Mention the type of work.\\nWrite about 80–100 words.\\nMIN: 70';
    const it=parseGenWriteBlock(reply,'B1');
    return it?{min:it.min,src:it.minSrc,tailInPrompt:/MIN:/i.test(it.prompt),len:it.prompt.length}:null;
  });
  ok(!!r,'العنصر لم يُسقَط — وكان يُسقَط بـ`no_min` قبل اليوم');
  ok(r&&r.min===70,'واستُخرج MIN=٧٠ فعلاً (وُجد '+(r&&r.min)+')');
  ok(r&&r.src==='inline','والمصدر مسمّى `inline` — أي أنه كان مهرَّباً لا غائباً');
  ok(r&&r.tailInPrompt===false,'وسطرُ MIN نُزع من نصّ المهمّة فلا تقرؤه ضمن التعليمة');
}

console.log('\n٢) والطبقة الثانية: عددُ الكلمات المطبوع داخل المهمّة نفسها');
{
  const r=await p.evaluate(()=>{
    const cases=[
      ['PROMPT: Write a short story that begins with this sentence: "It was raining."\\nWrite about 80–100 words.','B1'],
      ['PROMPT: Say:\\n• where you went\\n• who with\\n• what you did\\nWrite 25–35 words.','A2'],
      ['PROMPT: Give your opinion.\\nInclude these points:\\n• one\\n• two\\n• one point of your own\\nWrite 140–190 words.','B2'],
    ];
    return cases.map(function(c){const it=parseGenWriteBlock(c[0],c[1]);return it?{min:it.min,src:it.minSrc}:null});
  });
  ok(r[0]&&r[0].min===80&&r[0].src==='prompt','B1: «about 80–100 words» ⇐ ٨٠ من نصّ المهمّة');
  ok(r[1]&&r[1].min===25&&r[1].src==='prompt','A2: «25–35 words» ⇐ ٢٥');
  ok(r[2]&&r[2].min===140&&r[2].src==='prompt','B2: «140–190 words» ⇐ ١٤٠');
}

console.log('\n٣) والطبقة الثالثة: حدُّ المستوى حين لا رقمَ في النصّ إطلاقاً');
{
  const r=await p.evaluate(()=>{
    // وهي حالةٌ حيّة كذلك: أحد الأربعة المسجَّلة بلا أيّ عددٍ داخل النصّ
    const reply='PROMPT: Write a short story that begins with this sentence: "The family gathered around the table for dinner in their home in Jeddah." Include a description of the food that was served and a funny moment.';
    return{
      b1:(function(){const it=parseGenWriteBlock(reply,'B1');return it?{min:it.min,src:it.minSrc}:null})(),
      b2:(function(){const it=parseGenWriteBlock(reply,'B2');return it?{min:it.min,src:it.minSrc}:null})(),
      none:parseGenWriteBlock(reply,''),      // بلا مستوًى: لا اشتقاق، فيُسقَط كما كان
      noPrompt:parseGenWriteBlock('MIN: 70','B1'),
      table:WRITE_MIN_BY_LEVEL,
    };
  });
  ok(r.b1&&r.b1.min===70&&r.b1.src==='level','B1 ⇐ ٧٠ من جدول المستويات');
  ok(r.b2&&r.b2.min===130,'وB2 ⇐ ١٣٠ — لا يسقط بمحمد إلى حدٍّ أدنى');
  ok(r.table.C1===130,'وC1 ‏١٣٠ لا أكثر: الخادم بلا شكل C1 فيسقط إلى شكل B2');
  ok(r.none===null,'وبلا مستوًى يُسقَط العنصر — لا يُخترَع رقمٌ من العدم');
  ok(r.noPrompt===null,'وبلا PROMPT يُسقَط كما كان — الفحص لم يُرخَّ');
}

console.log('\n٤) وسطرُ التشخيص صار يحمل الذيل — وهو موضع MIN');
{
  const r=await p.evaluate(()=>{
    const rows=[];
    const orig=window.logAnswer;
    window.logAnswer=function(d,q,c,resp,id,el,ex){rows.push({q:q,t:(ex&&ex.q_text)||''})};
    // بلا مستوًى وبلا رقمٍ في النصّ ⇒ تُستنفَد الطبقات الثلاث فيُسقَط، وهي الحالة
    // الوحيدة الباقية — وبها يُفحَص الذيل.
    parseGenWriteBlock('PROMPT: '+('x '.repeat(200))+'\nSOMETHINGELSE: 9','');
    window.logAnswer=orig;
    return rows;
  });
  const row=r.find(x=>x.q==='parse_fail');
  ok(!!row,'سطرُ الإسقاط وصل');
  ok(row&&/…/.test(row.t),'وفيه الصدرُ والذيل معاً — فلا يعود سببُ الغياب مجهولاً');
  ok(row&&/SOMETHINGELSE/.test(row.t),'والذيل يُظهر آخر الردّ فعلاً');
}

// ─────────────────────────────────────────────────────────────────────────────
console.log('\n٥) تباعُد التوليد: نداءٌ واحد لكل جلسة، والأنواع تتناوب');
{
  const r=await p.evaluate(()=>{
    lsSet('quiz_gen_rot','0');
    const seen=[];for(let i=0;i<7;i++)seen.push(quizRotNext());
    return{seen:seen,types:QUIZ_TYPES};
  });
  ok(r.types.length===5,'خمسةُ أنواع: '+r.types.join('/'));
  ok(new Set(r.seen.slice(0,5)).size===5,'وخمسُ نداءاتٍ متتالية تُغطّي الخمسة بلا تكرار');
  ok(r.seen[5]===r.seen[0]&&r.seen[6]===r.seen[1],'ثمّ تدور من جديد — لا تعلق على نوع');
}

console.log('\n٦) وجلسةٌ حقيقية لا تُطلق شبكةً أثناء البناء ولا تتجاوز الميزانية');
{
  calls.length=0;
  await p.evaluate(()=>{quizTopUpDone=false;lsSet('quiz_gen_rot','0');
    try{lsSet('gemini_cache',JSON.stringify({}))}catch(e){}});
  const built=await p.evaluate(async()=>{
    const t0=performance.now();
    const qs=await buildDomain('verbal',12);
    return{n:qs.length,ms:Math.round(performance.now()-t0)};
  });
  ok(built.n===12,'الجلسة اثنا عشر عنصراً كما كانت ('+built.n+')');
  ok(built.ms<400,'وبُنيت فوراً بلا انتظار شبكة ('+built.ms+' ملّي)');
  const during=calls.filter(c=>/generate-question/.test(c)).length;
  ok(during===0,'وصفرُ نداءٍ أثناء البناء — كان أربعةً ('+during+')');
}

console.log('\n٧) والتخصيب نداءٌ واحد بعد العرض — لا خمسة');
{
  calls.length=0;
  await p.evaluate(()=>{quizTopUpDone=false;quizWinAt=0;quizWinSpent=0;quizOpenedAt=0;});
  await p.evaluate(()=>{quizGenTopUp();quizGenTopUp();quizGenTopUp()});
  await p.waitForTimeout(600);
  const gq=calls.filter(c=>/generate-question/.test(c));
  ok(gq.length===1,'نداءٌ واحد فقط رغم ثلاث استدعاءات ('+gq.length+')');
  const budget=await p.evaluate(()=>({left:quizBudgetLeft(),tpm:QUIZ_TPM,req:QUIZ_REQ_TOK}));
  ok(budget.req*1<=budget.tpm,'والنداء الواحد (٨٠٠) داخل سقف الدقيقة (١٠٠٠) — فلا `rate_budget`');
  ok(budget.req*2>budget.tpm,'ونداءان يتجاوزانه — وهو بعينه ما كان يقع خمس مرّات');
}

// ─────────────────────────────────────────────────────────────────────────────
console.log('\n٨) انحياز الموضع: يُقاس من الموضع المعروض، ويُسلَّح بعتبتين');
{
  const r=await p.evaluate(()=>{
    const out={};
    lsSet('pos_bias_listen','[]');posArmed.listen=false;posLogged.listen=false;
    // سبعُ ضغطاتٍ على الزرّ الثاني: دون الحدّ الأدنى للأدلّة فلا تسليح
    for(let i=0;i<7;i++)posRecord('listen',2,3);
    out.at7={armed:posBiasArmed('listen'),b:posBiasOf('listen')};
    // الثامنة تبلغ الحدّ الأدنى والنسبة ١٠٠٪
    posRecord('listen',2,3);
    out.at8={armed:posBiasArmed('listen'),b:posBiasOf('listen')};
    return out;
  });
  ok(r.at7.b===null,'سبعُ أدلّةٍ لا تكفي — الحدّ الأدنى ثمانية');
  ok(r.at7.armed===false,'فلا تسليح');
  ok(r.at8.armed===true,'والثامنة تُسلِّح');
  ok(r.at8.b&&r.at8.b.pos===2,'والموضع المرصود هو الثاني — وهو بعينه ما قاسه سجلّها');
}

console.log('\n٩) وتوزيعٌ متّزن لا يُسلِّح شيئاً — فلا تمسّ محمداً ولا إلياس');
{
  const r=await p.evaluate(()=>{
    // توزيع محمد المقاس في القواعد: ٤/٢/٢/٢ — متّزن
    lsSet('pos_bias_gram','[]');posArmed.gram=false;posLogged.gram=false;
    [1,1,1,1,2,2,3,3,4,4].forEach(function(x){posRecord('gram',x,4)});
    const a={armed:posBiasArmed('gram'),rate:posBiasOf('gram').rate};
    // وتوزيع إلياس المقاس في الاستماع: ٣ عشر مرّاتٍ من ١٦ = ٦٢٫٥٪ — **دون** ضِعف
    // الصدفة (٦٧٪ لثلاثة خيارات)، فلا يُسلَّح: سببُ درجته الزمن لا الموضع.
    lsSet('pos_bias_read','[]');posArmed.read=false;posLogged.read=false;
    [3,3,3,3,3,3,3,1,1,1,2,2].forEach(function(x){posRecord('read',x,3)});
    const e={armed:posBiasArmed('read'),rate:posBiasOf('read').rate};
    // وهيا في الاستماع: الزرّ الثاني ٩ من ١٢ = ٧٥٪ — فوقها فتُسلَّح
    lsSet('pos_bias_listen','[]');posArmed.listen=false;posLogged.listen=false;
    [2,2,2,2,2,2,2,2,2,1,1,3].forEach(function(x){posRecord('listen',x,3)});
    const h={armed:posBiasArmed('listen'),rate:posBiasOf('listen').rate,
      th:posBiasOf('listen').chance*POS_ARM_MULT};
    return{m:a,e:e,h:h};
  });
  ok(r.m.armed===false,'توزيع محمد المقاس (٤/٢/٢/٢) لا يُسلِّح — '+Math.round(r.m.rate*100)+'٪ والعتبة ٥٠٪');
  ok(r.e.armed===false,'وميلُ إلياس المقاس ('+Math.round(r.e.rate*100)+'٪) لا يُسلِّح — دون ضِعف الصدفة');
  ok(r.h.armed===true,'وميلُ هيا المقاس ('+Math.round(r.h.rate*100)+'٪) يُسلِّح — فوق العتبة ('+Math.round(r.h.th*100)+'٪)');
}

console.log('\n١٠) وعتبتان لا واحدة — فلا تتأرجح الحالة');
{
  const r=await p.evaluate(()=>{
    lsSet('pos_bias_step','[]');posArmed.step=false;posLogged.step=false;
    for(let i=0;i<12;i++)posRecord('step',2,4);
    const armed=posBiasArmed('step');
    // ثمّ تهبط إلى ٤٢٪ — فوق عتبة الانحلال (٣٧٫٥٪ لأربعة خيارات) فتبقى مُسلَّحة
    lsSet('pos_bias_step',JSON.stringify([[2,4],[2,4],[2,4],[2,4],[2,4],[1,4],[1,4],[1,4],[3,4],[3,4],[4,4],[4,4]]));
    const still=posBiasArmed('step');
    // ثمّ إلى ٢٥٪ (الصدفة تماماً) — دونها فتنحلّ
    lsSet('pos_bias_step',JSON.stringify([[2,4],[2,4],[2,4],[1,4],[1,4],[1,4],[3,4],[3,4],[3,4],[4,4],[4,4],[4,4]]));
    const cleared=posBiasArmed('step');
    return{armed:armed,still:still,cleared:cleared};
  });
  ok(r.armed===true,'تُسلَّح عند ١٠٠٪');
  ok(r.still===true,'وتبقى عند ٤٢٪ — فوق عتبة الانحلال (٣٧٫٥٪)');
  ok(r.cleared===false,'وتنحلّ عند الصدفة نفسها (٢٥٪)');
}

console.log('\n١١) والوسم يدخل السطر وهي مُسلَّحة — ولا يُغيَّر الحكم');
{
  const r=await p.evaluate(()=>{
    lsSet('pos_bias_listen','[]');posArmed.listen=false;posLogged.listen=false;
    for(let i=0;i<10;i++)posRecord('listen',2,3);
    posBiasArmed('listen');
    const on=posTagFor('listen');
    lsSet('pos_bias_video','[]');posArmed.video=false;
    const off=posTagFor('video');
    return{on:on,off:off};
  });
  ok(/تحيّز:موضع ٢/.test(r.on),'الوسم يحمل الموضع والنسبة: "'+r.on.trim()+'"');
  ok(r.off==='','ولا وسمَ لقسمٍ غير مُسلَّح — فلا يُلوَّث سطرُ من لا عَرَض عنده');
}

console.log('\n١٢) وسطرُ الرصد يُكتب مرّةً واحدة لا مع كل إجابة');
{
  const r=await p.evaluate(()=>{
    const rows=[];const orig=window.logAnswer;
    window.logAnswer=function(d,q,c,resp,id,el,ex){rows.push({d:d,q:q,resp:resp,t:(ex&&ex.q_text)||''})};
    lsSet('pos_bias_minpair','[]');posArmed.minpair=false;posLogged.minpair=false;
    for(let i=0;i<10;i++)posRecord('minpair',2,2);
    for(let i=0;i<5;i++)posBiasArmed('minpair');
    window.logAnswer=orig;
    return rows.filter(x=>x.q==='pos_bias');
  });
  ok(r.length===1,'سطرٌ واحد من خمس استدعاءات ('+r.length+')');
  ok(r[0]&&r[0].d==='gen','وفي `domain=gen` — سجلُّ ما يفعله النظام لا ما تفعله هي');
  ok(r[0]&&/انحياز موضع/.test(r[0].t),'وبنصٍّ مسمّى: "'+(r[0]?r[0].t.slice(0,60):'')+'…"');
}

console.log('\n١٣) وبوّابة التأكيد: نقرةٌ ثانية وهي مُسلَّحة، ولا شيء وهي منحلّة');
{
  const r=await p.evaluate(()=>{
    posPendClear();
    lsSet('pos_bias_listen','[]');posArmed.listen=false;posLogged.listen=false;
    const free=posConfirmOk('listen',1,'x');     // بلا أدلّة ⇒ لا بوّابة
    for(let i=0;i<10;i++)posRecord('listen',2,3);posBiasArmed('listen');
    const first=posConfirmOk('listen',1,'الخيار الأوّل');
    const pendHtml=posConfirmHTML('listen','listenChoose');
    const other=posConfirmOk('listen',2,'خيارٌ آخر');   // خيارٌ مختلف يُعيد الانتظار
    const second=posConfirmOk('listen',2,'خيارٌ آخر');  // نفسه ⇒ يُقفل
    const after=posPendOn('listen');
    return{free:free,first:first,pendHtml:pendHtml,other:other,second:second,after:after};
  });
  ok(r.free===true,'غيرُ مُسلَّحة ⇒ تمرّ النقرة الأولى بلا أثر');
  ok(r.first===false,'ومُسلَّحة ⇒ النقرة الأولى لا تُقفل');
  ok(/تأكيد/.test(r.pendHtml)&&/تراجع/.test(r.pendHtml),'ويظهر صندوقُ التأكيد والتراجع');
  ok(/الخيار الأوّل/.test(r.pendHtml),'وفيه نصُّ ما اختارته — لا رقمُ مقعد');
  ok(r.other===false,'وخيارٌ مختلف يُعيد الانتظار لا يُقفل');
  ok(r.second===true,'والنقرة الثانية على **نفسه** تُقفل');
  ok(r.after===false,'وتُمحى الحالة بعد القفل');
}

console.log('\n١٤) وجلسةُ استماعٍ حقيقية بنقراتٍ فعلية — مُسلَّحةً ومنحلّة');
{
  await p.evaluate(()=>{posPendClear();lsSet('pos_bias_listen','[]');posArmed.listen=false;posLogged.listen=false});
  await p.goto('http://127.0.0.1:8931/index.html');
  await p.waitForFunction(()=>typeof startListen==='function');
  await p.evaluate(()=>{posArmed.listen=false;lsSet('pos_bias_listen','[]');startListen()});
  await p.waitForTimeout(300);
  await p.evaluate(()=>{gateReveal()});
  await p.waitForTimeout(150);
  const before=await p.evaluate(()=>{
    const bs=[...document.querySelectorAll('.choices .choice')];
    if(bs.length<2)return null;
    bs[1].click();
    return{locked:listenLocked,box:!!document.querySelector('[data-poscx]')};
  });
  ok(before&&before.locked===true,'منحلّةً: نقرةٌ واحدة تقفل كما كانت');
  ok(before&&before.box===false,'ولا صندوقَ تأكيد');

  await p.evaluate(()=>{
    lsSet('pos_bias_listen',JSON.stringify([2,2,2,2,2,2,2,2,2,2]));posArmed.listen=false;
    posBiasArmed('listen');listenNext();gateReveal();
  });
  await p.waitForTimeout(200);
  const after=await p.evaluate(()=>{
    const bs=[...document.querySelectorAll('.choices .choice')];
    if(!bs.length)return null;
    bs[1].click();
    return{locked:listenLocked,box:!!document.querySelector('[data-poscx]')};
  });
  ok(after&&after.locked===false,'ومُسلَّحةً: النقرة الأولى لا تقفل');
  ok(after&&after.box===true,'ويظهر صندوق التأكيد على الشاشة فعلاً');
  const done=await p.evaluate(()=>{
    const bts=[...document.querySelectorAll('button')].filter(b=>/^تأكيد$/.test(b.textContent.trim()));
    if(!bts.length)return null;
    bts[0].click();
    return{locked:listenLocked};
  });
  ok(done&&done.locked===true,'وضغطُ «تأكيد» يقفل — فالمسار يكتمل');
}

console.log('\n١٥) والجلسة لا تنقص ولا تنكسر بوجود البوّابة');
{
  const r=await p.evaluate(async()=>{
    lsSet('pos_bias_read',JSON.stringify([2,2,2,2,2,2,2,2,2,2]));posArmed.read=false;posBiasArmed('read');
    startRead();await new Promise(r=>setTimeout(r,200));
    return{n:readItems.length,pend:posPendOn('read')};
  });
  ok(r.n>=8,'جلسة المقروء ثمانيةٌ فأكثر ('+r.n+')');
  ok(r.pend===false,'وتبدأ بلا انتظارٍ عالق من جلسةٍ سابقة');
}

await b.close();
console.log(fails?('\n✗ FAIL: '+fails):'\n✓ الكل نجح');
process.exit(fails?1:0);
})();
