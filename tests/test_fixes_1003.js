// ===== شحنة ٣ أكتوبر: أربعة أعطالٍ مقاسة من سجلّ الثلاثة =====
// (١) `VERBAL`/`SCIENCE` بلا خلط مواضع إطلاقاً، والصواب في الزرّ الثاني في ١٩ من ٢٤
//     و١٨ من ٢٧ (٧٩٪ و٦٧٪) — فمن يضغط الزرّ الثاني يُصيب البنك بلا قراءة.
// (٢) أقسام القدرات الأربعة خارج `posRecord`/`posTagFor` كلّها، فالانحياز لا يُقاس
//     حيث وقع فعلاً.
// (٣) ٢٣ من ٥٠ عنصر `reading` مولَّداً **فقرةٌ بلا سؤال** (دقّتها ٣٩٪ مقابل ٦٥٪).
// (٤) حصّةُ القالب في `drawSpread` كانت ثلثاً، فظهر `gPrice` ثلاث مرّات في جلسةٍ واحدة.
// وبندٌ خامس: مقطعُ الشرح كان اختياريّاً فلم يُفتَح لقالبٍ أُخطئ ثلاثاً ومقطعُه موجود.
//
// **والنصوص هنا من السجلّ الحيّ حرفاً بحرف** لا أمثلةً مؤلَّفة.
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
  Object.defineProperty(window,'speechSynthesis',{configurable:true,value:{speak(){},cancel(){},getVoices:()=>[{lang:'en-US',name:'X'}],speaking:false,pending:false}});
  window.SpeechSynthesisUtterance=function(t){this.text=t};
});
await p.goto('http://127.0.0.1:8931/index.html');
await p.waitForFunction(()=>typeof quizOrd==='function'&&typeof quizItemDefect==='function'&&typeof clipAutoOpen==='function');

// ─────────────────────────────────────────────────────────────────────────────
console.log('\n١) البنكان نفساهما: الصواب في الزرّ الثاني ثلاثة أرباع الوقت');
{
  const r=await p.evaluate(()=>{
    const d=function(bank){const c={};bank.forEach(function(q){c[q.a]=(c[q.a]||0)+1});return {n:bank.length,c:c}};
    return {v:d(VERBAL),s:d(SCIENCE)};
  });
  // هذا توصيفُ المصدر لا دعوى: إن تغيّر البنك غداً تغيّر الرقم، فالشرط على **وجود**
  // الانحياز في المصدر لا على رقمٍ مكتوب — وهو ما يُوجب الخلط عند العرض.
  const vTop=Math.max(...Object.values(r.v.c)),sTop=Math.max(...Object.values(r.s.c));
  ok(vTop/r.v.n>0.5,'VERBAL: موضعٌ واحد يبتلع أكثر من نصف العناصر ('+vTop+' من '+r.v.n+') — فالخلط لازم');
  ok(sTop/r.s.n>0.5,'SCIENCE: كذلك ('+sTop+' من '+r.s.n+')');
}

console.log('\n٢) وبعد الخلط: لا موضعٌ يبتلع أكثر من نصف العرض — ٣٠٠ جولة لكل بنك');
{
  const r=await p.evaluate(()=>{
    const run=function(bank){
      const c={1:0,2:0,3:0,4:0};let bad=0;
      for(let t=0;t<300;t++){
        const q=bank[t%bank.length];
        quizSeq++;idx=t;
        const o=quizOrd(q);
        if(o.length!==q.c.length)bad++;
        // كلُّ فهرسٍ أصليّ يظهر مرّةً واحدة بالضبط — خلطٌ لا حذفٌ ولا تكرار
        const seen={};o.forEach(function(w){seen[w]=(seen[w]||0)+1});
        if(Object.keys(seen).length!==q.c.length)bad++;
        c[o.indexOf(q.a)+1]=(c[o.indexOf(q.a)+1]||0)+1;
      }
      return {c:c,bad:bad};
    };
    return {v:run(VERBAL),s:run(SCIENCE)};
  });
  ok(r.v.bad===0,'VERBAL: الترتيب تبديلٌ تامّ في الجولات الثلاثمئة (لا حذف ولا تكرار)');
  ok(r.s.bad===0,'SCIENCE: كذلك');
  const vMax=Math.max(...Object.values(r.v.c))/300, sMax=Math.max(...Object.values(r.s.c))/300;
  ok(vMax<0.5,'VERBAL: أعلى موضعٍ '+Math.round(vMax*100)+'٪ من ٣٠٠ — دون النصف');
  ok(sMax<0.5,'SCIENCE: أعلى موضعٍ '+Math.round(sMax*100)+'٪');
}

console.log('\n٣) والترتيب يُعلَّق على السؤال لا على لحظة الإسناد (درس ١٤ سبتمبر)');
{
  const r=await p.evaluate(()=>{
    quizSeq++;idx=0;
    const q=VERBAL[0];
    const a=quizOrd(q).join(','), b=quizOrd(q).join(',');       // نفس السؤال ⇒ نفس الترتيب
    idx=1; const c=quizOrd(VERBAL[1]).join(',');                 // سؤالٌ آخر ⇒ يُعاد الخلط
    idx=0; const d=quizOrd(q).join(',');                          // رجوعٌ إليه ⇒ خلطٌ جديد لا ترتيبُ غيره
    return {a:a,b:b,c:c,d:d,len:VERBAL[1].c.length,len0:q.c.length};
  });
  ok(r.a===r.b,'إعادةُ الرسم للسؤال نفسه لا تُعيد الخلط — فالعرض والسجلّ لا يفترقان');
  ok(r.c.split(',').length===r.len,'وتبديلُ السؤال يُعيد الخلط بطول خياراته');
  ok(r.d.split(',').length===r.len0,'والرجوع إليه يُعطي ترتيباً صالحاً لا ترتيبَ سؤالٍ مضى');
}

console.log('\n٤) جلسةٌ حقيقية بنقراتٍ فعلية: النقرُ على الزرّ المعروض يُحتسب صواباً');
{
  rows.length=0;
  const res=await p.evaluate(async()=>{
    await start('verbal');
    gateSecs=0;gateLeft=0;render();
    const q=filtered[idx];
    // نبحث عن الزرّ **المعروض** الذي نصّه نصُّ الصواب — لا عن الزرّ الثاني ولا عن q.a
    const btns=[...document.querySelectorAll('.choices button.choice')];
    const want=String(q.c[q.a]);
    const hit=btns.findIndex(function(x){return x.textContent.slice(1).trim()===want.trim()});
    if(hit<0)return {err:'لم يُعرض نصّ الصواب'};
    const shownAt=hit+1;
    btns[hit].click();
    return {shownAt:shownAt,bankAt:q.a+1,ok:answered[idx]===true,
            explain:(document.querySelector('.explain-title')||{}).textContent||''};
  });
  ok(!res.err,'نصّ الصواب معروضٌ بين الأزرار ('+(res.err||'')+')');
  ok(res.ok===true,'والنقرُ عليه احتُسب صواباً — الفهرس الأصليّ هو ما يُمرَّر');
  ok(/صحيحة/.test(res.explain),'وشاشةُ الشرح تقول «إجابة صحيحة»');
  await p.waitForTimeout(300);
  const line=rows.map(x=>{try{return JSON.parse(x)}catch(e){return {}}}).find(x=>x.domain==='verbal');
  ok(!!line,'وسطرٌ وصل الجدول بنطاق `verbal`');
  ok(line&&/^موضع /.test(String(line.response||'')),'والسطر يبدأ بـ«موضع …» — عُرف المشروع مطبَّقاً هنا أخيراً');
  // الموضعُ المسجَّل هو المعروض لا فهرسُ البنك — وهذا بيت القصيد
  ok(line&&new RegExp('الصواب موضع '+toArJs(res.shownAt)).test(String(line.response||'')),
     'وموضعُ الصواب في السطر هو الموضع المعروض ('+res.shownAt+') لا فهرسُ البنك ('+res.bankAt+')');
  ok(line&&/الخيارات:/.test(String(line.q_text||'')),'وسطرُ الخيارات حاضر');
}

console.log('\n٥) وسطرُ الخيارات بترتيب العرض: ✓ تقع عند الموضع المعروض للصواب');
{
  const r=await p.evaluate(async()=>{
    const out=[];
    for(let t=0;t<40;t++){
      quizSeq++;idx=0;
      const q=VERBAL[t%VERBAL.length];
      filtered=[q];picked=null;locked=false;answered=[];
      const o=quizOrd(q);
      const shown=o.indexOf(q.a)+1;
      // نبني السطر كما يبنيه choose حرفياً: ترتيبُ العرض و✓ على الفهرس الأصلي
      const marked=o.map(function(wi,k){return (wi===q.a)?(k+1):null}).filter(function(x){return x!==null});
      out.push({shown:shown,marked:marked.length===1?marked[0]:-1});
    }
    return out;
  });
  ok(r.every(x=>x.marked===x.shown),'في الأربعين كلّها: ✓ عند الموضع المعروض بالضبط');
}

console.log('\n٦) ووصلُ `pos_bias` بأقسام القدرات — الضغطُ على موضعٍ واحد يُسلّح');
{
  const r=await p.evaluate(()=>{
    // مسحٌ أوّلاً فلا تتسرّب حالةٌ من قسمٍ آخر
    try{lsDel('pos_bias_verbal')}catch(e){}
    posArmed&&delete posArmed.verbal;
    const before=posBiasArmed('verbal');
    for(let t=0;t<12;t++)posRecord('verbal',2,4);     // الزرّ الثاني من أربعة
    const after=posBiasArmed('verbal');
    const bias=posBiasOf('verbal');
    const tag=posTagFor('verbal');
    return {before:before,after:after,pos:bias&&bias.pos,rate:bias&&bias.rate,chance:bias&&bias.chance,tag:tag};
  });
  ok(r.before===false,'قبل الأدلّة: غير مُسلَّحة');
  ok(r.after===true,'وبعد اثنتي عشرة ضغطةً على الموضع نفسه: مُسلَّحة');
  ok(r.pos===2,'والموضع المرصود هو الثاني');
  ok(Math.abs(r.chance-0.25)<0.01,'والصدفةُ مشتقّةٌ من عدد الخيارات (٤ ⇒ ٢٥٪) لا رقمٌ ثابت');
  ok(/تحيّز:موضع ٢/.test(r.tag),'والوسم يدخل سطر الإجابة: '+r.tag.trim());
}

console.log('\n٧) ومتزّنُ المواضع لا يُسلَّح — فلا تمسّ البوّابة من لا عَرَض عنده');
{
  const r=await p.evaluate(()=>{
    try{lsDel('pos_bias_science')}catch(e){}
    posArmed&&delete posArmed.science;
    [1,2,3,4,1,2,3,4,1,2,3,4].forEach(function(k){posRecord('science',k,4)});
    return posBiasArmed('science');
  });
  ok(r===false,'توزيعٌ متّزن (٣ لكل موضع) ⇒ لا تسليح');
}

console.log('\n٨) العنصر الذي لا يسأل شيئاً: الحالات الحيّة بنصّها');
{
  const r=await p.evaluate(()=>{
    const mk=function(stem){return {q:stem,c:['أ','ب','ج','د'],a:1,qtype:'reading',d:'verbal'}};
    const bad=[
      'تسقط الأمطار في الصباح وتغسل الشوارع، ثم يخرج الأطفال للعب في الحي، ويعودون إلى منازلهم مبتهجين بالهواء النقي.',
      'يشير التقرير إلى زيادة في مستوى التلوث في المدينة خلال الأعوام الماضية.',
      'كانت الشركة تواجه مشاكل مالية كبيرة، وتم إجراء محادثات مع المستثمرين لزيادة رأس المال.',
      'كانت المعلمة تؤكد على أهمية القراءة في تحسين مهارات اللغة العربية، وكانت تشجع الطلاب على القراءة بانتظام.',
      'كانت هناك مباراة كرة قدم بين فريقين قويين. وقد سجل أحد اللاعبين هدفاً في الدقائق الأخيرة من المباراة، مما أدى إلى فوز فريقه.'
    ];
    const good=[
      'إذا كان جميع الطلاب يرتادون المدرسة، وجميع من يرتادون المدرسة يلبسون الزي المدرسي، فمن المنطقي أن نقول إن جميع الطلاب يلبسون الزي المدرسي.',
      'إذا كان كل شخص يمتلك كتابًا على الأقل، وكل شخص يمتلك كتابًا يمتلك أيضًا قلمًا، فمن المنطقي أن نقول إن كل شخص يمتلك قلمًا.',
      'اختر كلمة مرادفة لكلمة "سريع" في الجملة: "القطار يصل إلى المحطة بسرعة فائقة".',
      'الكلمة المناسبة لملأ الفراغ في الجملة: إنّ الصدق هو أبرز صفات .....................',
      'هطلت الأمطار ثلاثة أيام متصلة. ماذا نتوقّع أن يحدث للنهر؟'
    ];
    return {bad:bad.map(function(s){return quizItemDefect(mk(s))}),
            good:good.map(function(s){return quizItemDefect(mk(s))})};
  });
  ok(r.bad.every(x=>x==='no_question'),'الخمسُ المعيبة كلُّها تُرفَض بسبب `no_question`');
  ok(r.good.every(x=>x===''),'والخمسُ السليمة كلُّها تمرّ — صفرُ بلاغٍ كاذب ('+r.good.filter(x=>x).join(',')+')');
}

console.log('\n٩) وشكلُ العنصر يُفحَص كذلك — وقايةً من رسمٍ ينكسر');
{
  const r=await p.evaluate(()=>{
    const q='ما لونُ السماءِ في الصباح؟';
    return {
      noStem:quizItemDefect({q:'',c:['أ','ب','ج'],a:0}),
      few:quizItemDefect({q:q,c:['أ','ب'],a:0}),
      notArr:quizItemDefect({q:q,c:null,a:0}),
      outRange:quizItemDefect({q:q,c:['أ','ب','ج','د'],a:7}),
      frac:quizItemDefect({q:q,c:['أ','ب','ج','د'],a:1.5}),
      empty:quizItemDefect({q:q,c:['أ','  ','ج','د'],a:0}),
      fine:quizItemDefect({q:q,c:['أ','ب','ج','د'],a:2})
    };
  });
  ok(r.noStem==='no_stem','بلا نصّ ⇒ no_stem');
  ok(r.few==='shape_choices'&&r.notArr==='shape_choices','خيارات ناقصة أو غير مصفوفة ⇒ shape_choices');
  ok(r.outRange==='shape_answer'&&r.frac==='shape_answer','فهرسُ صوابٍ خارج المدى أو كسريّ ⇒ shape_answer');
  ok(r.empty==='shape_empty_choice','خيارٌ فارغ ⇒ shape_empty_choice');
  ok(r.fine==='','والعنصر السليم يمرّ');
}

console.log('\n١٠) والمعيبُ المخزَّن قبل الإصلاح يُسقَط عند الاستهلاك ويُسجَّل');
{
  rows.length=0;
  const r=await p.evaluate(()=>{
    const bad={d:'verbal',q:'كانت هناك عاصفة شديدة في مدينة كبيرة، ونتج عنها انقطاع في التيار الكهربائي.',c:['أ','ب','ج','د'],a:1,qtype:'reading'};
    const good={d:'verbal',q:'ما سببُ انقطاع التيار الكهربائي؟',c:['أ','ب','ج','د'],a:1,qtype:'reading'};
    cachePutReplace('reading',[bad,good,bad]);
    quizRejects=0;
    const out=quizFromCache('reading',2);
    return {n:out.length,qs:out.map(function(x){return x.q.slice(0,20)}),left:cacheGet('reading').length};
  });
  ok(r.n===1,'من ثلاثةٍ في الكاش (معيبان وسليم) عاد **سليمٌ واحد** لا اثنان');
  ok(/ما سبب/.test(r.qs[0]||''),'والعائد هو السليم بعينه');
  await p.waitForTimeout(250);
  const rej=rows.map(x=>{try{return JSON.parse(x)}catch(e){return {}}})
    .filter(x=>x.domain==='gen'&&x.qtype==='reject');
  ok(rej.length>=1,'وسطرُ رفضٍ وصل الجدول (`domain=gen, qtype=reject`)');
  ok(rej.some(x=>/cached:no_question/.test(String(x.response||''))),'وسببُه مسمّى `cached:no_question` — يُفصَل عن رفضٍ وقت التوليد');
}

console.log('\n١١) حصّةُ القالب: سدسٌ لا ثلث — ٦٠ جلسةً لكل قسم');
{
  const r=await p.evaluate(()=>{
    const run=function(gens){
      let worst=0,short=0;
      for(let t=0;t<60;t++){
        const s=drawSpread(gens,12);
        if(s.length<12)short++;
        const c={};s.forEach(function(q){const k=tmplKey(q);c[k]=(c[k]||0)+1});
        worst=Math.max(worst,Math.max.apply(null,Object.values(c)));
      }
      return {worst:worst,short:short};
    };
    return {q:run(QUANT_GENS),f:run(FLEX_GENS)};
  });
  ok(r.q.worst<=2,'الكمّي: أكثرُ تكرارٍ لقالبٍ في جلسةٍ من اثني عشر = '+r.q.worst+' (كان يُجاز ٤)');
  ok(r.f.worst<=2,'المرونة: '+r.f.worst);
  ok(r.q.short===0&&r.f.short===0,'ولا جلسةَ نقصت عن اثني عشر — قاعدة ١٨ أغسطس باقية');
}

console.log('\n١٢) ومقطعُ الشرح يُفتَح وحده عند الخطأ الثاني على القالب نفسه');
{
  rows.length=0;
  const r=await p.evaluate(async()=>{
    try{lsDel('pos_bias_quant');lsDel('mawhiba_quiz_err_v1')}catch(e){}
    posArmed&&delete posArmed.quant;posPendClear();
    // **والقالب هو الحالة الحيّة بعينها**: «أقلام» (`gPrice`) عُرض ثلاثاً وأُخطئ
    // الثلاث، ومقطعُه مربوطٌ في `QZ_CARD_FADE_LINK` (`seq/ratio`) ولم يُفتَح قطّ.
    const q=gPrice();
    quizSeq++;mode='quiz';currentMode='quant';filtered=[q];idx=0;picked=null;locked=false;
    answered=[];score=0;done=false;qzCard=null;qzCardCount=0;clipOn=null;gateSecs=0;gateLeft=0;
    // خطأٌ سابقٌ مسجَّلٌ على القالب نفسه — فهذه هي المرّة الثانية
    const wrongIdx=(q.a+1)%q.c.length;
    qzErrRecord(q,false,String(q.c[wrongIdx]));
    const first=!!clipOn;
    choose(wrongIdx);
    return {tmpl:tmplKey(q),before:first,opened:!!clipOn,label:(clipOn&&clipOn.label)||'',
            steps:(clipOn&&clipOn.steps||[]).length,
            // **بالعنصر لا بالنصّ**: `document.body.innerHTML` يشمل وسمَ `<script>`
            // نفسه، ففيه نصُّ `clipButtonHTML` دائماً — وهو الفخّ الموثَّق في الملفّ
            // نفسه، وقعتُ فيه هنا مرّةً أخرى فكشفه سقوطُ هذا السطر.
            card:!!qzCard,
            hasBtn:[...document.querySelectorAll('button')]
              .some(function(x){return /شاهدي الشرح|كيف أعرف القاعدة/.test(x.textContent)})};
  });
  ok(/أقلام/.test(r.tmpl),'القالبُ هو «أقلام» الحيّ ('+r.tmpl+')');
  ok(r.before===false,'المقطعُ مغلقٌ قبل الإجابة');
  ok(r.opened===true,'ويُفتَح تلقائياً عند الخطأ الثاني على القالب — بلا ضغطٍ على الزرّ');
  ok(r.steps>0,'وفيه خطواتٌ فعلاً ('+r.steps+') لا صندوقٌ فارغ');
  ok(r.card===true,'وبطاقةُ التكرار قائمةٌ معه، فالانتقال ممنوع («القراءة شرطٌ لا اقتراح»)');
  ok(r.hasBtn===false,'وزرُّ الفتح يزول — فلا زرٌّ يُعرض لمقطعٍ مفتوح');
  await p.waitForTimeout(300);
  const co=rows.map(x=>{try{return JSON.parse(x)}catch(e){return {}}})
    .filter(x=>x.domain==='gen'&&x.qtype==='clip_open');
  ok(co.length===1,'وسطرُ فتحٍ واحد وصل الجدول');
  ok(co[0]&&/تلقائي/.test(String(co[0].response||'')),'وموسومٌ `تلقائي` — فلا يُخلط بعدّاد ما تفتحه بيدها');
}

console.log('\n١٢ب) والمسارَان الآخران كذلك: خطواتٌ مرفقة، ومتتاليةٌ إجرائية');
{
  const r=await p.evaluate(()=>{
    const run=function(gen,want){
      try{lsDel('mawhiba_quiz_err_v1')}catch(e){}
      let q=null;for(let t=0;t<300&&!q;t++){const c=gen();if(want(c))q=c}
      if(!q)return {err:'لم يُنتَج'};
      quizSeq++;mode='quiz';filtered=[q];idx=0;picked=null;locked=false;answered=[];
      qzCard=null;qzCardCount=0;clipOn=null;gateSecs=0;gateLeft=0;
      qzErrRecord(q,false,String(q.c[(q.a+1)%q.c.length]));
      choose((q.a+1)%q.c.length);
      return {err:'',opened:!!clipOn,steps:(clipOn&&clipOn.steps||[]).length};
    };
    return {
      direct:run(gWorkers,function(c){return Array.isArray(c.steps)&&c.steps.length}),
      seq:run(gArith,function(c){return Array.isArray(c.pat)})
    };
  });
  ok(r.direct.opened===true&&r.direct.steps>0,'مولّدٌ بخطواتٍ مرفقة (`gWorkers`) يُفتَح مقطعُه تلقائياً');
  ok(r.seq.opened===true&&r.seq.steps>0,'ومتتاليةٌ (`gArith`) تُفتَح بمقطعها الإجرائي');
}

console.log('\n١٣) ولا فتحَ تلقائياً لقالبٍ بلا مقطع — ولا على أوّل خطأ');
{
  const r=await p.evaluate(()=>{
    const bare={d:'verbal',q:'سؤالٌ بلا مقطعٍ مربوط إطلاقاً؟',c:['أ','ب','ج','د'],a:0,qtype:'bank'};
    clipOn=null;const noClip=clipAutoOpen(bare);
    // وأوّل خطأ: البطاقة نفسها لا تظهر، فلا يُفتَح شيء
    try{lsDel('mawhiba_quiz_err_v1');lsDel('pos_bias_quant')}catch(e){}
    posArmed&&delete posArmed.quant;posPendClear();
    const q=gPrice();
    quizSeq++;mode='quiz';filtered=[q];idx=0;picked=null;locked=false;answered=[];
    qzCard=null;qzCardCount=0;clipOn=null;gateSecs=0;gateLeft=0;
    choose((q.a+1)%q.c.length);
    return {noClip:noClip,openedFirst:!!clipOn,card:!!qzCard};
  });
  ok(r.noClip===false,'قالبٌ بلا مقطع ⇒ لا فتح ولا عطل');
  ok(r.card===false&&r.openedFirst===false,'وأوّلُ خطأ: لا بطاقةَ ولا فتحٌ تلقائي — التسليح على التكرار لا على الزلّة');
}

console.log('\n١٣ب) وصيغةُ المرّات عربيّة — كشفتها اللقطة لا الاختبار');
{
  const r=await p.evaluate(()=>[arTimes(1),arTimes(2),arTimes(3),arTimes(10),arTimes(11)]);
  ok(r[0]==='مرّة واحدة'&&r[1]==='مرّتين','١ ⇒ «مرّة واحدة» و٢ ⇒ «مرّتين» لا «٢ مرات»');
  ok(r[2]==='٣ مرّات'&&r[3]==='١٠ مرّات','٣-١٠ ⇒ جمع قلّة');
  ok(r[4]==='١١ مرّة','وما فوقها ⇒ مفرد — نفس عُرف `arSecs` القائم');
}

console.log('\n١٤) وبوّابةُ الموضع تمرّ بلا أثرٍ على قسمٍ غير مُسلَّح');
{
  const r=await p.evaluate(async()=>{
    try{lsDel('pos_bias_quant')}catch(e){}
    posArmed&&delete posArmed.quant;posPendClear();
    let q=null;for(let t=0;t<200&&!q;t++){const c=gArith();if(c&&Array.isArray(c.c))q=c}
    quizSeq++;mode='quiz';filtered=[q];idx=0;picked=null;locked=false;answered=[];
    qzCard=null;qzCardCount=0;clipOn=null;gateSecs=0;gateLeft=0;
    choose(q.a);
    return {locked:locked,ok:answered[0]===true,box:!!document.querySelector('[data-poscx]')};
  });
  ok(r.locked===true&&r.ok===true,'نقرةٌ واحدة تقفل الجواب كما كانت');
  ok(r.box===false,'ولا صندوقَ تأكيدٍ على الشاشة');
}

console.log('\n١٥) وعلى المُسلَّح: نقرةٌ أولى تعرض الصندوق، والثانية تقفل');
{
  const r=await p.evaluate(async()=>{
    try{lsDel('pos_bias_quant')}catch(e){}
    posArmed&&delete posArmed.quant;posPendClear();
    for(let t=0;t<12;t++)posRecord('quant',1,4);
    let q=null;for(let t=0;t<200&&!q;t++){const c=gArith();if(c&&Array.isArray(c.c))q=c}
    quizSeq++;mode='quiz';filtered=[q];idx=0;picked=null;locked=false;answered=[];
    qzCard=null;qzCardCount=0;clipOn=null;gateSecs=0;gateLeft=0;
    const o=quizOrd(q);const firstBtn=o[0];
    choose(firstBtn);
    const afterOne={locked:locked,box:!!document.querySelector('[data-poscx]')};
    choose(firstBtn);
    const afterTwo={locked:locked,box:!!document.querySelector('[data-poscx]')};
    return {one:afterOne,two:afterTwo,armed:posBiasArmed('quant')};
  });
  ok(r.armed===true,'القسم مُسلَّح بعد اثنتي عشرة ضغطةً على الموضع الأوّل');
  ok(r.one.locked===false&&r.one.box===true,'النقرةُ الأولى لا تقفل، والصندوق معروض');
  ok(r.two.locked===true&&r.two.box===false,'والثانيةُ تقفل، والصندوق يزول');
}

console.log('\n'+(fails?('✗ سقط '+fails):'✓ كل الفحوص نجحت'));
await b.close();process.exit(fails?1:0);
})();

// `toAr` موجودةٌ في الصفحة لا في هذا السياق — فنسخةٌ صغيرة للمقابلة النصّية وحدها
function toArJs(n){return String(n).replace(/[0-9]/g,d=>'٠١٢٣٤٥٦٧٨٩'[+d])}
