// حارسُ قسم المفردات — ٩ أكتوبر
//
// العطل الذي يحرسه: سأل صاحب المشروع «هل عند هيا حفظ معاني ونطق وكتابة مفردات؟»،
// والقياس أثبت أن الثلاثة تعمل **على كلمتين مختلفتين تماماً** — بنك المعاني ٧٨ كلمة
// وبنك الإملاء/النطق ٢٦، وتقاطعُهما **صفر**. ودليلُه الحاسم في سجلّها: `gate` نُطقت
// ٢٠ مرّة بمتوسّط ٥٥٪، وكُتبت ١٣ مرّة بصفر صواب، وكتبت `kate` **١٢ مرّة من ١٣** —
// سببٌ صوتيّ واحد يُنتج عَرَضين في قسمين لا يرى أحدهما الآخر.
//
// والأمر: «نفذ ويجب ألا يقل عدد المفردات عن ٥٠٠ كلمة في المرحلة الأولى.. واذا أجادتها،
// عطني خبر للانتقال إلى المرحلة التالية».
//
// ===== وحدُّ هذا الاختبار يُقال قبل نتائجه =====
// يفحص البنك والبنية والتسجيل والإجادة بنقراتٍ وكتابةٍ حقيقية. **ولا يفحص**: صحّة
// الترجمة العربية لكل كلمة (حكمٌ لغويّ لا يُتحقَّق منه بقاعدة — فالمفحوص منها الشكلُ
// وعدمُ التكرار داخل الفئة)، ولا نطقَ الكلمة فعلياً (لا مخرجَ صوتٍ في Chromium بلا رأس،
// ونداء Azure محجوبٌ بسياسة الشبكة — نفس حدّ كل اختبارات الصوت في هذا المشروع).
const {chromium}=require('/opt/node22/lib/node_modules/playwright');
let fails=0,pass=0;
const ok=(c,m)=>{console.log((c?'  ✓ ':'  ✗ FAIL ')+m);c?pass++:fails++};
const BASE='http://127.0.0.1:8931/';

(async()=>{
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'});
let logs=[];
const mk=async(f)=>{
  const ctx=await b.newContext({viewport:{width:420,height:900},permissions:['clipboard-read','clipboard-write']});
  const page=await ctx.newPage();
  page.on('pageerror',e=>{console.log('  ✗ PAGEERROR '+e.message);fails++});
  await page.route('**/rest/v1/**',async r=>{
    let x={};try{x=JSON.parse(r.request().postData()||'{}')}catch(e){}
    if(r.request().method()==='POST')logs.push(x);
    r.fulfill({status:201,contentType:'application/json',body:'[]'});
  });
  await page.route('**/functions/v1/**',r=>r.fulfill({status:200,contentType:'application/json',body:'{"ok":true}'}));
  await page.addInitScript(()=>{
    Object.defineProperty(window,'speechSynthesis',{configurable:true,value:{
      speak(u){setTimeout(function(){u.onstart&&u.onstart()},0)},cancel(){},resume(){},pause(){},
      getVoices:()=>[{lang:'en-US',name:'X'}],speaking:false,pending:false}});
    window.SpeechSynthesisUtterance=function(t){this.text=t};
  });
  await page.goto(BASE+(f||'index.html'),{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>typeof vocabPlan==='function');
  await page.waitForTimeout(250);
  return page;
};
const p=await mk();
const reset=()=>p.evaluate(()=>{
  ['mawhiba_vocab_srs_v1','mawhiba_vocab_master_v1','mawhiba_vocab_stage_v1','mawhiba_seen_v1']
    .forEach(function(k){try{lsSet(k,'{}')}catch(e){}});
});

console.log('\n١) البنك: الحدّ الذي أمر به صاحب المشروع، وسلامةُ كل مدخل');
{
  const r=await p.evaluate(()=>{
    const dup={},dupW=[],badW=[],badM=[],longM=[],dupM=[],small=[];
    VOCAB_BANK.forEach(function(v){
      if(dup[v.w])dupW.push(v.w);else dup[v.w]=v.c;
      if(!/^[a-z]+$/.test(v.w))badW.push(v.w);
      if(!/[؀-ۿ]/.test(v.m)||/[A-Za-z]/.test(v.m))badM.push(v.w);
      if(v.m.length>22)longM.push(v.w);
    });
    Object.keys(VOCAB_BY_CAT).forEach(function(c){
      const m={};VOCAB_BY_CAT[c].forEach(function(v){
        const k=v.m.replace(/[ً-ْ]/g,'');
        if(m[k])dupM.push(c+':'+m[k]+'/'+v.w);else m[k]=v.w;
      });
      if(VOCAB_BY_CAT[c].length<4)small.push(c);
    });
    return {n:VOCAB_BANK.length,cats:Object.keys(VOCAB_BY_CAT).length,min:VOCAB_STAGE1_MIN,
      dupW:dupW,badW:badW,badM:badM,longM:longM,dupM:dupM,small:small,
      named:Object.keys(VOCAB_BY_CAT).filter(function(c){return !VOCAB_CATS[c]})};
  });
  ok(r.n>=500,`البنك ${r.n} كلمة — والحدّ المأمور ${r.min}`);
  ok(r.cats>=10&&!r.named.length,`${r.cats} فئة، كلُّها مسمّاة بالعربية`);
  ok(!r.dupW.length,`لا كلمةَ مكرّرة${r.dupW.length?' → '+r.dupW.slice(0,5).join(', '):''}`);
  ok(!r.badW.length,`كلُّ كلمةٍ حروفٌ لاتينية صغيرة متّصلة (الإملاء يقارن حرفاً بحرف)${r.badW.length?' → '+r.badW.slice(0,5):''}`);
  ok(!r.badM.length,`ولا معنًى بلا عربية أو ملوَّثٍ باللاتينية${r.badM.length?' → '+r.badM.slice(0,5):''}`);
  ok(!r.longM.length,`ولا معنًى يفيض على الزرّ${r.longM.length?' → '+r.longM.slice(0,5):''}`);
  // الأهمّ: معنًى مكرّرٌ داخل الفئة يصير **صواباً ثانياً** حين يُسحَب مموّهاً
  ok(!r.dupM.length,`ولا معنى مكرّراً داخل فئةٍ — وإلّا صار المموّه صواباً ثانياً${r.dupM.length?' → '+r.dupM.slice(0,4):''}`);
  ok(!r.small.length,`وكلُّ فئةٍ تكفي لأربعة خيارات${r.small.length?' → '+r.small:''}`);
}

console.log('\n٢) الكلمات التي تتدرّب عليها فعلاً اليوم كلُّها داخل البنك — فالمهارات تشترك');
{
  const r=await p.evaluate(()=>{
    const miss=DICTATION_A1.filter(function(x){return !VOCAB_BY_WORD[x.w.toLowerCase()]})
      .map(function(x){return x.w});
    return {miss:miss,n:DICTATION_A1.length,
      gate:!!VOCAB_BY_WORD['gate'],kate:(VOCAB_BY_WORD['gate']||{}).m};
  });
  // «exams» جمعٌ ومفردُه `exam` داخل البنك — بديلٌ مقصود: جمعٌ ومفردٌ في فئةٍ واحدة
  // يصيران مموّهَي بعضهما، وهو ما يرفضه معيار Haladyna نفسه.
  const left=r.miss.filter(w=>w!=='exams');
  ok(!left.length,`${r.n} كلمة إملاء/نطق، الغائب عن البنك: ${left.length?left.join(', '):'لا شيء (عدا «exams» جمعاً ومفردُه فيه)'}`);
  ok(r.gate&&/بواب/.test(r.kate||''),`و«gate» — الكلمة التي نالت صفراً من ١٣ — داخل البنك بمعناها «${r.kate}»`);
}

console.log('\n٣) المموّهات من نفس الفئة دائماً (قاعدة Haladyna: مموّهٌ معقول) — ٣٠٠ جولة');
{
  const r=await p.evaluate(()=>{
    let bad=0,noRight=0,dupOpt=0,n=0;
    for(let i=0;i<300;i++){
      const v=VOCAB_BANK[Math.floor(Math.random()*VOCAB_BANK.length)];
      const o=vocabOpts(v);n++;
      if(o.length!==4)bad++;
      if(o.filter(function(x){return x===v.m}).length!==1)noRight++;
      if(new Set(o).size!==o.length)dupOpt++;
      const cat=new Set(VOCAB_BY_CAT[v.c].map(function(x){return x.m}));
      if(o.some(function(x){return !cat.has(x)}))bad++;
    }
    return {n:n,bad:bad,noRight:noRight,dupOpt:dupOpt};
  });
  ok(r.bad===0,`${r.n} جولة: كلُّ خيارٍ من فئة الكلمة نفسها وأربعةٌ بالضبط`);
  ok(r.noRight===0,'والصواب حاضرٌ مرّةً واحدة لا صفراً ولا مرّتين');
  ok(r.dupOpt===0,'ولا خيارَين متطابقَين على الشاشة');
}

console.log('\n٤) البانية: نفس بنية البانيات الإحدى عشرة — وبلا تكرارٍ داخل الجلسة');
{
  await reset();
  const r=await p.evaluate(()=>{
    const out=[];
    for(let s=0;s<10;s++){
      const pl=vocabPlan();
      out.push({n:pl.length,uniq:new Set(pl.map(function(i){return i.id})).size,
        facets:new Set(pl.map(function(i){return i.facet})).size});
      pl.forEach(function(i){vocabSrsUpdate(i.id,true)});
    }
    return out;
  });
  ok(r.every(x=>x.n===10),`عشر جلسات، كلُّها ${r[0].n} عنصراً — لا تنقص عن حدّها`);
  ok(r.every(x=>x.uniq===x.n),'ولا عنصرَ مكرّراً داخل الجلسة الواحدة');
}

console.log('\n٥) الاسترجاع لا يُطلب قبل إصابة التعرّف (ترتيبُ Laufer & Goldstein)');
{
  await reset();
  const r=await p.evaluate(()=>{
    const before=vocabPlan().filter(function(i){return i.facet==='recall'}).length;
    // تعرّفٌ **خاطئ** لا يفتح الاسترجاع، وصحيحٌ يفتحه
    vocabSrsUpdate('recog:butterfly',false);
    const afterWrong=vocabPlan().filter(function(i){return i.facet==='recall'}).length;
    const st=vocabSrsLoad();
    vocabSrsUpdate('recog:butterfly',true);
    const items=vocabPlan.toString()?null:null;
    const all=(function(){const s=vocabSrsLoad(),o=[];
      VOCAB_BANK.forEach(function(v){const k='recog:'+v.w;
        if(s[k]&&(s[k].box|0)>0)o.push(v.w)});return o})();
    return {before:before,afterWrong:afterWrong,boxWrong:(st['recog:butterfly']||{}).box,open:all};
  });
  ok(r.before===0,'بلا أيّ سجلّ تعرّف: صفرُ سؤال استرجاع في الجلسة');
  ok(r.boxWrong===0&&r.afterWrong===0,'وتعرّفٌ خاطئ لا يفتحه (box=٠)');
  ok(r.open.length===1&&r.open[0]==='butterfly','وتعرّفٌ صحيحٌ يفتح كلمته وحدها');
}

console.log('\n٦) بوّابة التسرّع في التعرّف — الأرضيّة مشتقّةٌ من زمنها المقاس (٢٫٦ث)');
{
  await reset();
  await p.evaluate(()=>{startVocab()});
  await p.waitForTimeout(150);
  const g=await p.evaluate(()=>({floor:SEC_GATE_FLOOR['vocab:recog'],cap:SEC_GATE_MAX['vocab:recog'],
    secs:gateSecs,open:gateOpen(),facet:(vocabCur()||{}).facet,
    opts:document.querySelectorAll('button[onclick^="vocabChoose"]').length}));
  ok(g.floor>=2&&g.cap<=3,`الأرضيّة ${g.floor}ث والسقف ${g.cap}ث — دون وسيطها المنخرط فلا تُحبَس إجابةٌ صادقة`);
  ok(g.facet==='recog'&&!g.open&&g.opts===0,'والمعاني محجوبةٌ فعلاً قبل انقضاء الأرضيّة');
  await p.waitForTimeout(3300);
  const g2=await p.evaluate(()=>({open:gateOpen(),
    opts:document.querySelectorAll('button[onclick^="vocabChoose"]').length}));
  ok(g2.open&&g2.opts===4,`وتظهر أربعة خيارات بعدها (${g2.opts})`);
}

console.log('\n٧) جلسةٌ حقيقية بنقرةٍ على الزرّ المعروض — والموضع يُسجَّل لا فهرسُ البنك');
{
  logs=[];
  const r=await p.evaluate(()=>{
    const it=vocabCur(),right=vocabOrder.findIndex(function(oi){return vocabChoices[oi]===it.m});
    const btns=[...document.querySelectorAll('button[onclick^="vocabChoose"]')];
    btns[right].click();
    return {w:it.w,m:it.m,pos:right+1,locked:vocabLocked,score:vocabScore};
  });
  await p.waitForTimeout(400);
  const row=logs.map(x=>(x&&x.rows)||x).flat().filter(x=>x&&x.domain==='vocab'&&x.qtype==='recog').pop();
  ok(r.locked&&r.score===1,'النقر قُفل العنصر واحتُسب صواباً');
  ok(!!row,'ووصل السجلَّ سطرُ تعرّف');
  if(row){
    ok(row.item_id===r.w,`والمعرّف هو الكلمة نفسها (${row.item_id}) — فسجلُّ الإملاء/النطق القائم يشترك معه`);
    ok(new RegExp('موضع '+'٠١٢٣٤٥٦٧٨٩'[r.pos]).test(String(row.response||'')),
      `والموضعُ المعروض في السطر (${r.pos}) — لا ترتيبُ البنك`);
    ok(/الخيارات:/.test(String(row.q_text||''))&&/✓/.test(String(row.q_text||'')),'والخيارات الأربعة بموضع الصواب موسوماً');
    ok(/\[فئة:/.test(String(row.q_text||'')),'والفئةُ في السطر — فتُقاس كل فئةٍ على حدة');
  }
}

console.log('\n٨) الاسترجاع: تُكتب بالأصابع، وتُقاس، واللصقُ مغلق');
{
  await reset();
  await p.evaluate(()=>{
    vocabSrsUpdate('recog:butterfly',true);
    vocabItems=[{id:'recall:butterfly',facet:'recall',w:'butterfly',m:'فراشة',c:'animals'}];
    vocabIdx=0;vocabScore=0;vocabDone=false;mode='vocab';vocabSetupRound();render();
  });
  await p.waitForSelector('#vocabIn');
  const attrs=await p.evaluate(()=>{
    const el=document.getElementById('vocabIn');
    return {paste:!!el.getAttribute('onpaste'),drop:!!el.getAttribute('ondrop'),
      ac:el.getAttribute('autocorrect'),sp:el.getAttribute('spellcheck'),
      note:!!document.getElementById('vocabPasteNote'),dir:getComputedStyle(el).direction};
  });
  ok(attrs.paste&&attrs.drop,'حدثا paste وdrop مربوطان بصندوق الاسترجاع');
  ok(attrs.ac==='off'&&attrs.sp==='false','والتصحيحُ التلقائي والتدقيق مُطفآن — وإلّا سلّمها المتصفّحُ الكلمة');
  ok(attrs.note,'والسطر الثابت معروضٌ قبل أيّ محاولة — المعيار يُعلَن لا يُفاجئ');
  ok(attrs.dir==='ltr','والصندوق من اليسار (كلمةٌ إنجليزية في صفحةٍ عربية)');
  // لصقٌ حقيقي بلوحة المفاتيح — حدثٌ موثوق يُدرِج فعلاً لو لم يُمنَع
  logs=[];
  let real=true;
  try{
    await p.evaluate(()=>navigator.clipboard.writeText('butterfly'));
    await p.click('#vocabIn');
    await p.keyboard.press('Control+V');
    await p.waitForTimeout(250);
  }catch(e){real=false}
  const v=await p.evaluate(()=>document.getElementById('vocabIn').value);
  if(real)ok(v==='','ولصقٌ حقيقي بـCtrl+V لم يُدرِج شيئاً');
  else console.log('  — أذونات الحافظة متعذّرة هنا، فاللصق الحقيقي لم يُفحَص (لا يُدَّعى)');
  const noteTxt=await p.evaluate(()=>document.getElementById('vocabPasteNote').textContent);
  ok(/⛔/.test(noteTxt),'والتنبيه ظهر — فالردّ ليس صمتاً');
  const blocked=logs.map(x=>(x&&x.rows)||x).flat().filter(x=>x&&x.qtype==='vocab_paste_blocked');
  ok(blocked.length>=1,`ووصل السجلَّ سطرُ منع (${blocked.length}) — فيُقاس كم مرّةً تُحاوِل`);
}

console.log('\n٩) والكتابة الصحيحة تُحتسَب، والخاطئة تُقارَن حرفاً بحرف');
{
  logs=[];
  await p.evaluate(()=>{
    document.getElementById('vocabIn').value='buterfly';
    vocabTyped='buterfly';vocabCheck();
  });
  await p.waitForTimeout(350);
  const bad=logs.map(x=>(x&&x.rows)||x).flat().filter(x=>x&&x.domain==='vocab'&&x.qtype==='recall').pop();
  const diff=await p.evaluate(()=>document.querySelector('.explain-body').innerHTML);
  ok(bad&&bad.is_correct===false,'خطأٌ يُسجَّل خطأً');
  ok(bad&&/الصواب butterfly/.test(String(bad.response||'')),'ومعه الصواب في السطر');
  ok(/#DC2626/.test(diff),'والمقارنة حرفاً بحرف معروضة (الأحمر = حرفٌ خطأ أو ناقص)');
  const notMaster=await p.evaluate(()=>vocabMastered('butterfly'));
  ok(!notMaster,'ولا إجادةَ على خطأ');
}

console.log('\n١٠) الإجادة: استرجاعٌ فعّال، صوابان في يومين — لا في جلسةٍ واحدة');
{
  await reset();
  const r=await p.evaluate(()=>{
    const out={};
    vocabMasterRecord('cave',true);out.one=vocabMastered('cave');
    vocabMasterRecord('cave',true);out.twiceSameDay=vocabMastered('cave');   // نفس اليوم
    // يومٌ آخر: يُحاكى بإرجاع يوم السجلّ
    const m=vocabMasterLoad();m['cave'].d=srsToday()-1;lsSet('mawhiba_vocab_master_v1',JSON.stringify(m));
    vocabMasterRecord('cave',true);out.twoDays=vocabMastered('cave');
    out.count=vocabMasterCount();
    vocabMasterRecord('cave',false);out.afterWrong=vocabMastered('cave');
    out.countAfter=vocabMasterCount();
    // والتعرّفُ لا يُجيد: `vocabChoose` لا ينادي `vocabMasterRecord` إطلاقاً
    out.recogNeverCounts=!/vocabMasterRecord/.test(vocabChoose.toString());
    out.recallCounts=/vocabMasterRecord/.test(vocabCheck.toString());
    return out;
  });
  ok(!r.one,'صوابٌ واحد لا يُجيد');
  ok(!r.twiceSameDay,'وصوابان في اليوم نفسه لا يُجيدان — التباعدُ شرط');
  ok(r.twoDays&&r.count===1,'وصوابان في يومين مختلفين يُجيدان (العدّاد ١)');
  ok(!r.afterWrong&&r.countAfter===0,'وخطأٌ لاحق يُصفّر — لا إجادةَ بأثرٍ رجعي');
  ok(r.recogNeverCounts&&r.recallCounts,'والإجادة على الاسترجاع وحده لا على التعرّف');
}

console.log('\n١١) خبرُ اكتمال المرحلة: سطرٌ واحد عند ٥٠٠، ولا يتكرّر');
{
  await reset();logs=[];
  const r=await p.evaluate(()=>{
    const m={},d=srsToday();
    VOCAB_BANK.slice(0,VOCAB_STAGE1_MIN-1).forEach(function(v){m[v.w]={n:2,d:d}});
    lsSet('mawhiba_vocab_master_v1',JSON.stringify(m));
    const before=vocabStageCheck();
    const b2=vocabStageLoad().done1;
    m[VOCAB_BANK[VOCAB_STAGE1_MIN-1].w]={n:2,d:d};
    lsSet('mawhiba_vocab_master_v1',JSON.stringify(m));
    const after=vocabStageCheck();
    const again=vocabStageCheck();
    return {before:before,noFlag:!b2,after:after,again:again,flag:!!vocabStageLoad().done1};
  });
  await p.waitForTimeout(400);
  const rows=logs.map(x=>(x&&x.rows)||x).flat().filter(x=>x&&x.qtype==='vocab_stage_done');
  ok(r.before===499&&r.noFlag,`عند ${r.before} كلمة: لا خبر — والحدّ ٥٠٠`);
  ok(r.after===500&&r.flag,'وعند ٥٠٠ يُرفَع الخبر');
  ok(rows.length===1,`وسطرٌ واحد لا يتكرّر مع كل نداء (${rows.length})`);
  ok(rows[0]&&/المرحلة ١ مكتملة/.test(String(rows[0].q_text||'')),
    `ونصُّه يقول ما وقع — «${String(rows[0]&&rows[0].q_text||'').slice(0,54)}…»`);
}

console.log('\n١٢) الظهور لهيا وحدها (السؤال كان عنها) — وبلا فيضانٍ أفقي');
{
  await reset();
  await p.evaluate(()=>{home();render()});
  await p.waitForTimeout(250);
  const h=await p.evaluate(()=>({
    tile:[...document.querySelectorAll('button')].some(x=>(x.getAttribute('onclick')||'')==='startVocab()'),
    ovf:document.documentElement.scrollWidth>document.documentElement.clientWidth}));
  ok(h.tile,'بلاطةُ المفردات على رئيسة هيا');
  ok(!h.ovf,'وبلا تمريرٍ أفقي على عرض الهاتف');
  for(const f of ['mohammed.html','elias.html']){
    const q=await mk(f);
    const has=await q.evaluate(()=>[...document.querySelectorAll('button')]
      .some(x=>(x.getAttribute('onclick')||'')==='startVocab()'));
    ok(!has,`${f}: غائبةٌ كما هو مُعلَن — بنكُ المرحلة الأولى A1`);
    await q.close();
  }
}

console.log('\n١٣) جلسةٌ كاملة تمضي إلى شاشة النتيجة');
{
  await reset();
  await p.evaluate(()=>{startVocab()});
  for(let i=0;i<12;i++){
    const st=await p.evaluate(()=>({done:vocabDone,facet:(vocabCur()||{}).facet,open:gateOpen()}));
    if(st.done)break;
    if(!st.open){await p.waitForTimeout(3300)}
    // **الموضعُ يُنتقى صواباً لا دائماً الأوّل**: النقر على الزرّ الأوّل عشر مرّات
    // يُسلِّح بوّابةَ انحياز الموضع فعلاً (وهذا سلوكٌ صحيح)، فيُحجَب النقر بانتظار
    // تأكيد — وأوّل صياغةٍ لهذا القسم عَلِقت هناك. والصندوق إن ظهر يُؤكَّد لا يُتجاوَز.
    await p.evaluate(()=>{
      const it=vocabCur();
      if(!it)return;
      if(it.facet==='recog'){
        const k=vocabOrder.findIndex(function(oi){return vocabChoices[oi]===it.m});
        const btns=[...document.querySelectorAll('button[onclick^="vocabChoose"]')];
        if(btns[k])btns[k].click();
      }else{
        const el=document.getElementById('vocabIn');
        if(el){el.value=it.w;vocabTyped=it.w}
        vocabCheck();
      }
    });
    await p.waitForTimeout(200);
    await p.evaluate(()=>{
      if(document.querySelector('[data-poscx]')){
        const c=[...document.querySelectorAll('button')].find(function(x){
          return (x.getAttribute('onclick')||'').indexOf('vocabChoose')===0});
        if(c)c.click();
      }
    });
    await p.waitForTimeout(150);
    await p.evaluate(()=>{if(vocabLocked)vocabNext()});
    await p.waitForTimeout(150);
  }
  const fin=await p.evaluate(()=>({done:vocabDone,txt:document.body.innerText.indexOf('جلسة أخرى')>=0}));
  ok(fin.done&&fin.txt,'الجلسة انتهت إلى شاشة النتيجة');
}

await b.close();
console.log(`\n${fails?'✗ FAIL':'=== كل الاختبارات نجحت ==='} ${pass} ناجح · ${fails} ساقط`);
process.exit(fails?1:0);
})().catch(e=>{console.error('✗ FAIL '+e.message);process.exit(1)});
