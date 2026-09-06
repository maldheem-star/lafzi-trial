// اللصق مغلقٌ في صندوق الكتابة للثلاثة — أمر صاحب المشروع، ٦ سبتمبر.
//
// العطل الذي يحرسه: حارس ٢٩ أغسطس كان **يُسقط الدرجة بعد اللصق ولا يمنعه**. وقياس
// ٦ سبتمبر أثبت أن ذلك لا يكفي — محمد لصق إجاباته الثلاث كلَّها (`insertFromPaste`
// صريحاً، دفعات ٩٥ و٤٥١ و٤٨٣ محرفاً) فنال **٠ من ٣**، ونصوصه سليمةٌ لغةً ومعيار
// الدمج نفسه نجح في أولاها (`دمج:ok · جمل:1`). فالعقوبة كانت تقع بلا أن يُعرف سببها.
//
// ===== وحدُّ هذا الاختبار يُقال قبل نتائجه =====
// الحدثُ المُصطنَع (`dispatchEvent`) **لا يُنفّذ الفعل الافتراضي في المتصفّح أصلاً**:
// حدثٌ غير موثوق (`isTrusted:false`) لا يُدرِج نصّاً حتى لو لم يُمنَع. فاختبارٌ يقيس
// «هل تغيّرت القيمة؟» على حدثٍ مُصطنَع **ينجح ولو لم يُبنَ الحجب** — وهو بعينه فخّ
// «اختبارٌ ينجح بحظّ القرعة» الذي وقع أربع مرّات في يومٍ واحد (٥ سبتمبر).
// فالقياس هنا على ثلاثة أشياء لا تقع إلّا إذا عمل المُعالِج فعلاً: `defaultPrevented`،
// وظهورُ التنبيه، ووصولُ السطر. **ويُقاس معها لصقٌ حقيقي بلوحة المفاتيح** (حافظةٌ
// حقيقية + Ctrl+V ⇐ حدثٌ موثوق يُدرِج فعلاً) — فإن تعذّرت أذونات الحافظة في هذه
// البيئة قيل ذلك صراحةً ولم يُدَّعَ أنه فُحص.
const {chromium}=require('/opt/node22/lib/node_modules/playwright');
let fails=0;const ok=(c,m)=>{console.log((c?'  ✓ ':'  ✗ FAIL ')+m);if(!c)fails++};
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
  await page.route('**/functions/v1/**',r=>r.fulfill({status:200,contentType:'application/json',body:'{"ok":true,"reply":"NONE"}'}));
  await page.addInitScript(()=>{
    Object.defineProperty(window,'speechSynthesis',{configurable:true,value:{
      speak(u){setTimeout(function(){u.onstart&&u.onstart()},0)},cancel(){},resume(){},pause(){},
      getVoices:()=>[{lang:'en-US',name:'X'}],speaking:false,pending:false}});
    window.SpeechSynthesisUtterance=function(t){this.text=t};
  });
  await page.goto('http://127.0.0.1:8931/'+(f||'index.html'));
  await page.waitForFunction(()=>typeof writePasteBlock==='function');
  await page.evaluate(()=>{startWrite()});
  await page.waitForSelector('#writeIn');
  return page;
};

console.log('\n١) الحدثان الملغيان مربوطان بالصندوق — لا اختصاراتٌ تُحصى');
const p=await mk();
{
  const r=await p.evaluate(()=>{
    const el=document.getElementById('writeIn');
    return{paste:!!el.getAttribute('onpaste'),drop:!!el.getAttribute('ondrop'),
      note:!!document.getElementById('writePasteNote')};
  });
  ok(r.paste,'حدث paste مربوط');
  ok(r.drop,'وحدث drop كذلك — فالإفلات مُغطّى لا اللصق وحده');
  ok(r.note,'والسطر الثابت معروضٌ قبل أيّ محاولة — المعيار يُعلَن لا يُفاجئ');
}

console.log('\n٢) المنع يقع فعلاً — defaultPrevented لا «القيمة لم تتغيّر»');
{
  const r=await p.evaluate(()=>{
    const el=document.getElementById('writeIn');
    const out={};
    ['paste','drop'].forEach(function(kind){
      const dt=new DataTransfer();dt.setData('text/plain','PASTED ESSAY TEXT');
      const ev=(kind==='paste')
        ? new ClipboardEvent('paste',{clipboardData:dt,bubbles:true,cancelable:true})
        : new DragEvent('drop',{dataTransfer:dt,bubbles:true,cancelable:true});
      el.dispatchEvent(ev);
      out[kind]=ev.defaultPrevented;
    });
    out.note=(document.getElementById('writePasteNote')||{}).textContent||'';
    out.tries=writePasteTries;
    return out;
  });
  ok(r.paste===true,'اللصق مُنع (defaultPrevented)');
  ok(r.drop===true,'والإفلات مُنع كذلك');
  ok(/مغلق/.test(r.note)&&/⛔/.test(r.note),'والتنبيه ظهر بنصّه — لا صمت · «'+r.note.trim()+'»');
  ok(r.tries===2,'وعُدّت المحاولتان — '+r.tries);
}

console.log('\n٣) ولا يُمحى ما كُتب بالأصابع — اتّجاه الخطأ آمن');
{
  await p.click('#writeIn');
  await p.type('#writeIn','I went to the park with my brother.',{delay:8});
  const before=await p.inputValue('#writeIn');
  await p.evaluate(()=>{
    const el=document.getElementById('writeIn');
    const dt=new DataTransfer();dt.setData('text/plain','STOLEN');
    el.dispatchEvent(new ClipboardEvent('paste',{clipboardData:dt,bubbles:true,cancelable:true}));
  });
  const after=await p.inputValue('#writeIn');
  ok(before.indexOf('park')>=0,'كُتب نصٌّ حقيقي بالأصابع أوّلاً — وإلّا لم يُقَس شيء');
  ok(after===before,'وبقي كما هو بعد محاولة اللصق — لا حذفَ نصٍّ دخل');
  const pasted=await p.evaluate(()=>writePasted);
  ok(pasted===false,'ولم تُرفع راية اللصق على من لم يلصق شيئاً فعلاً');
}

console.log('\n٤) السطر يصل السجلّ بسقفٍ للضجيج');
{
  // السقف عمرُ الصفحة لا الجلسة (كنظيرَيه `TTS_LOG_CAP`/`GEN_GATE_LOG_CAP`)، وقد
  // استُهلك في القسمين قبله. فيُصفَّر هنا صراحةً — وإلّا قاس القسمُ صفراً وسمّاه
  // «لم يُغرِق السجلّ»، وهو نجاحٌ بحظّ القرعة لا دليلَ فيه على شيء.
  logs=[];
  await p.evaluate(()=>{writePasteLogged=0;writePasteTries=0});
  await p.evaluate(()=>{
    for(let i=0;i<6;i++){
      const dt=new DataTransfer();dt.setData('text/plain','X');
      document.getElementById('writeIn').dispatchEvent(
        new ClipboardEvent('paste',{clipboardData:dt,bubbles:true,cancelable:true}));
    }
  });
  await p.waitForTimeout(350);
  const rows=logs.filter(x=>x&&x.qtype==='write_paste_blocked');
  ok(rows.length===2,'وصل السجلَّ سطرا منعٍ بالضبط من ستّ محاولات — لا صفرٌ ولا ستّة · '+rows.length);
  ok(rows[0]&&rows[0].domain==='gen','وفي domain=gen — ما يفعله النظام لا ما تفعله هي');
  ok(rows[0]&&/لصق مُنع/.test(String(rows[0].q_text||'')),'ومعه نصّه — '+String(rows[0]&&rows[0].q_text||'').slice(0,60));
}

console.log('\n٥) لصقٌ حقيقي بلوحة المفاتيح — حدثٌ موثوق يُدرِج فعلاً لو لم يُمنَع');
{
  await p.evaluate(()=>{const el=document.getElementById('writeIn');el.value='';writeBurstReset('')});
  let armed=false;
  try{
    await p.evaluate(()=>navigator.clipboard.writeText('REAL CLIPBOARD ESSAY'));
    armed=await p.evaluate(()=>navigator.clipboard.readText().then(t=>t==='REAL CLIPBOARD ESSAY').catch(()=>false));
  }catch(e){armed=false}
  if(!armed){
    console.log('  ⚠ تعذّرت الحافظة الحقيقية في هذه البيئة — لم يُفحَص اللصق الموثوق، ولا يُدَّعى أنه فُحص');
  }else{
    await p.click('#writeIn');
    await p.keyboard.press('Control+V');
    await p.waitForTimeout(200);
    const v=await p.inputValue('#writeIn');
    ok(v.indexOf('REAL CLIPBOARD')<0,'لصقُ Ctrl+V الحقيقي لم يُدرِج شيئاً — القيمة: «'+v+'»');
    const note=await p.evaluate(()=>(document.getElementById('writePasteNote')||{}).textContent||'');
    ok(/مغلق/.test(note),'والتنبيه ظهر على اللصق الموثوق كذلك');
  }
}

console.log('\n٦) الكتابة بالأصابع لم تُمَسّ — لا انحدار');
{
  await p.evaluate(()=>{const el=document.getElementById('writeIn');el.value='';writeBurstReset('')});
  await p.click('#writeIn');
  await p.type('#writeIn','My family and I visited the old market in Riyadh last Friday morning.',{delay:6});
  const r=await p.evaluate(()=>({
    val:document.getElementById('writeIn').value,
    pasted:writePasted,dictated:writeDictated,
    crit:(document.getElementById('writeCrit')||{}).innerHTML||''
  }));
  ok(r.val.split(/\s+/).filter(Boolean).length>=12,'دخل النصّ كاملاً بالكتابة — '+r.val.split(/\s+/).filter(Boolean).length+' كلمة');
  ok(r.pasted===false&&r.dictated===false,'ولا رايةَ لصقٍ ولا إملاء');
  ok(r.crit.length>40,'ومعيار النجاح يُحدَّث حيّاً كما كان');
}

console.log('\n٧) للثلاثة كلّهم — لا لصفحةٍ واحدة');
{
  for(const f of ['index.html','mohammed.html','elias.html']){
    const q=await mk(f);
    const r=await q.evaluate(()=>{
      const el=document.getElementById('writeIn');
      const dt=new DataTransfer();dt.setData('text/plain','P');
      const ev=new ClipboardEvent('paste',{clipboardData:dt,bubbles:true,cancelable:true});
      el.dispatchEvent(ev);
      return{prevented:ev.defaultPrevented,
        note:!!document.getElementById('writePasteNote'),
        bound:!!el.getAttribute('onpaste')&&!!el.getAttribute('ondrop')};
    });
    ok(r.prevented&&r.note&&r.bound,f+' — الحجب والتنبيه حاضران');
    await q.context().close();
  }
}

console.log('\n٨) وحارس الدرجة القديم باقٍ شبكةً احتياطية');
{
  const r=await p.evaluate(()=>{
    writePasted=true;               // كأنّ لصقاً أفلت من الحدثين على متصفّحٍ لا يُطلقهما
    const it=writeCur();
    return{types:WRITE_PASTE_TYPES.slice(),
      stillGuards:/writeCopy\|\|writePasted/.test(String(writeSubmit)),
      lv:it&&it.lv};
  });
  ok(r.types.indexOf('insertFromPaste')>=0&&r.types.indexOf('insertFromDrop')>=0,
    'وسما المواصفة باقيان في القائمة');
  ok(r.stillGuards,'وحكمُ الدرجة ما زال يُسقط اللصق إن أفلت — لا اعتمادَ على الحجب وحده');
  const miss=await p.evaluate(()=>censusMissing());
  ok(miss.length===0,'ولا دالّة مفقودة — '+miss.join(','));
}

console.log('\n٩) والشبكة الاحتياطية لا تكذب — شاشةُ اللصق تشرح سببها');
{
  // العطل الذي يحرسه: `writeFinish` يُسقط الدرجة على `writeCopy` **و**`writePasted`
  // معاً منذ ٢٩ أغسطس، وشاشةُ النتيجة كانت تشرح الأوّل وحده — فمن لصق يرى «✓ سليمة»
  // ودرجتُه صفر. وهو بعينه ما وقع لمحمد اليوم: ٠ من ٣ بنصوصٍ سليمة بلا سببٍ معروض.
  const q=await mk();
  const r=await q.evaluate(()=>{
    const it=writeCur();
    writeTyped="After he finished his homework, he watched a movie with his family.";
    writeSubmitted=true;writeBusy=false;writeFix=[];writeCount=12;writeSent=1;
    const clean=renderWriteFeedback(it);
    writePasted=true;
    const dirty=renderWriteFeedback(it);
    writePasted=false;writeCopy=true;
    const copied=renderWriteFeedback(it);
    return{clean:clean,dirty:dirty,copied:copied};
  });
  ok(!/ملصوق/.test(r.clean),'بلا لصقٍ لا تظهر رسالته');
  ok(/ملصوق/.test(r.dirty)&&/لا يُحتسب/.test(r.dirty),
    'ومع اللصق يُقال السبب بدل «✓ سليمة» — لا صفرٌ غامض');
  ok(!/جملة مدمَجة سليمة/.test(r.dirty)&&!/✓/.test(r.dirty),
    'ولا تُعرض معه علامةُ نجاحٍ تناقض الدرجة');
  ok(/نسخٌ من نصّ السؤال/.test(r.copied),'ورسالة النسخ باقيةٌ كما كانت — لا انحدار');
  await q.context().close();
}

await b.close();
console.log(fails?`\n=== ${fails} فشل ===`:'\n=== كل الاختبارات نجحت ===');
process.exit(fails?1:0);
})();
