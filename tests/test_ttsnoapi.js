// الشكلُ الثالث لعطل الصوت: واجهةُ النطق غائبةٌ أصلاً — ٢٩ أكتوبر.
//
// القياسُ الذي أوجبه، من جهاز هيا نفسه (`domain='gen'`, `qtype='tts_fail'`):
//   `[نطق:unsupported] أصوات:? · إنجليزي:0 · المختار:— · بديل:0`
//   على WebView داخل تطبيق (`Android 14; Z2453; WV` · `Version/4.0`)،
//   **وصفرُ صفّ `tts_server` بعده** — أي أن الخادم لم يُطلب إطلاقاً.
//
// والسببُ سطرٌ واحد: فرعُ `unsupported` في `speakEnglish` كان يعود **قبل فرعَي
// السقوط كليهما** (`speak_error` و`silent`). وهذا يُكذّب ما كُتب في ٣٠ أغسطس:
// «كلتاهما يغطّيها صوتُ الخادم — مسارُ `onerror` يلتقط الأولى ومهلةُ الصمت
// الثانية» — فالشكلُ الثالث لم يكن في الحساب، وهو أحوجُ الأجهزة إلى الخادم.
//
// **وحدُّ هذا الاختبار يُقال بدل أن يُدَّعى**: يفحص المسار — أن يُطلب الخادمُ حين
// تغيب الواجهة، وأن يُبلَّغ المُستدعي **مرّةً واحدة** (عدّادُ الاستماع نحكم به على
// المستوى)، وأن يبقى جهازٌ سليمٌ بصفرِ نداء، وأن يَمنع القاطعُ كما يمنع لأخويه.
// ولا يفحص **نداء Azure الحقيقي** ولا تشغيلَ الصوت فعلاً: الأوّل محجوبٌ بسياسة
// الشبكة هنا، والثاني يحتاج مخرجَ صوتٍ حقيقياً. فيبقيان غير مُثبَتين حتى يُفتح
// على جهاز — ولا يُدَّعى غير ذلك.
const {chromium}=require(process.env.PW||'/opt/node22/lib/node_modules/playwright');
let fails=0;const ok=(c,m)=>{console.log((c?'  ✓ ':'  ✗ FAIL ')+m);if(!c)fails++};
(async()=>{
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'});

// api: 'none' تحذف `speechSynthesis` كما يفعل WebView · 'works' محرّكٌ سليم
// azure: كيف يردّ الخادم
const mk=async(api,azure)=>{
  const logs=[],calls=[];
  const p=await b.newPage({viewport:{width:420,height:900}});
  p.on('pageerror',e=>{console.log('  ✗ PAGEERROR '+e.message);fails++});
  await p.route('**/rest/v1/**',async r=>{
    if(r.request().method()!=='POST')return r.fulfill({status:200,contentType:'application/json',body:'[]'});
    let x={};try{x=JSON.parse(r.request().postData()||'{}')}catch(e){}
    logs.push(x);r.fulfill({status:201,contentType:'application/json',body:'[]'});
  });
  // الترتيب مقصود: Playwright يُطابق الأحدثَ تسجيلاً أوّلاً (درس ٣٠ أغسطس)
  await p.route('**/functions/v1/**',r=>r.fulfill({status:200,contentType:'application/json',body:'{"ok":false}'}));
  await p.route('**/functions/v1/assess-azure',async r=>{
    let x={};try{x=JSON.parse(r.request().postData()||'{}')}catch(e){}
    calls.push(x);
    if(azure==='fail')return r.fulfill({status:200,contentType:'application/json',
      body:JSON.stringify({error:"azure_tts_auth",status:401,detail:"bad key"})});
    if(azure==='down')return r.abort();
    r.fulfill({status:200,contentType:'audio/mpeg',
      headers:{'X-Tts-Chars':String((x.text||'').length)},body:'ID3AUDIOBYTES'});
  });
  await p.addInitScript((o)=>{
    if(o.api==='none'){
      // ===== هذا هو الجهاز المقاس: لا واجهةَ نطقٍ إطلاقاً =====
      // WebView داخل تطبيق يُبلغ `إنجليزي:0`، و`'speechSynthesis' in window` كاذبة.
      try{delete window.speechSynthesis}catch(e){}
      try{delete window.SpeechSynthesisUtterance}catch(e){}
      // وإن كانت غيرَ قابلةٍ للحذف (خاصّيةُ نموذجٍ لا نسخة) تُحجَب بالتعريف
      if('speechSynthesis' in window){
        try{Object.defineProperty(window,'speechSynthesis',{configurable:true,get(){return undefined}})}catch(e){}
      }
    }else{
      const synth={speaking:false,pending:false,
        getVoices:()=>[{lang:'en-US',name:'Samantha',localService:false}],
        cancel(){},resume(){},addEventListener(){},removeEventListener(){},
        speak(u){window.__spoke.push(u.text);setTimeout(()=>u.onstart&&u.onstart(),5)}};
      Object.defineProperty(window,'speechSynthesis',{configurable:true,value:synth});
      window.SpeechSynthesisUtterance=function(t){this.text=t};
    }
    // تشغيلُ الصوت مُحاكًى: مخرجُ الصوت الحقيقي غير متاح هنا، والمقصود فحصُ المسار.
    window.__played=[];window.__spoke=[];
    window.__TTS_SILENT="data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQAAAAA=";
    window.Audio=function(){
      const a={src:'',play:function(){
        if(a.src&&a.src!==window.__TTS_SILENT)window.__played.push(a.src);
        setTimeout(function(){a.onplaying&&a.onplaying()},5);
        return{catch:function(){return null}}}};
      return a;
    };
  },{api:api});
  await p.goto('http://127.0.0.1:8931/index.html');
  await p.waitForFunction(()=>typeof speakEnglish==='function');
  p._logs=logs;p._calls=calls;return p;
};

// يُبلَّغ المُستدعي: تُجمَع **كلُّ** بلاغاته لا أوّلُها — فحارسُ «مرّةً واحدة» هو
// الغرضُ من نصف هذا الملفّ، ولا يُقاس بأخذ الأوّل وإهمال ما بعده.
const say=(p,t,ms)=>p.evaluate(({t,ms})=>new Promise(res=>{
  const got=[];
  speakEnglish(t,i=>{got.push(i)});
  setTimeout(()=>res(got),ms||1500);
}),{t:t,ms:ms});

console.log('\n١) الواجهةُ غائبة والخادمُ يعمل ⇒ يُطلب الخادمُ ويُبلَّغ النجاح');
{
  const p=await mk('none','ok');
  ok(await p.evaluate(()=>!('speechSynthesis' in window))===true,
     'الواجهةُ غائبةٌ فعلاً — فالحالةُ المفحوصة هي المقاسة لا محاكاةٌ أخرى');
  const got=await say(p,'I have three books on the table.');
  ok(p._calls.length===1,'نداءٌ واحد وصل الخادم — بعد أن كان صفراً ('+p._calls.length+')');
  ok(p._calls[0]&&p._calls[0].mode==='tts','بوضع tts');
  ok(p._calls[0]&&p._calls[0].text==='I have three books on the table.',
     'وبالنصّ المطلوب نفسه لا بنصٍّ آخر');
  ok(got.length===1,'والمُستدعي بُلِّغ مرّةً واحدة بالضبط ('+got.length+')');
  ok(got[0]&&got[0].ok===true,'بنجاح');
  ok(got[0]&&got[0].engine==='azure','ومحرّكُه azure فيُعرَف من السطر لاحقاً');
  ok(await p.evaluate(()=>ttsBroken)===false,
     'والرايةُ نزلت — لا «لا صوت» فوق صوتٍ يعمل');
  ok(await p.evaluate(()=>window.__played.length)===1,'وشُغّل مقطعٌ واحد');
  const f=p._logs.filter(x=>x.qtype==='tts_fail');
  ok(f.length===1&&f[0].response==='unsupported',
     'وعطلُ الجهاز مُسجَّلٌ باسمه (unsupported) — فلا يُخفيه نجاحُ الخادم');
  ok(/إنجليزي:0/.test((f[0]&&f[0].q_text)||''),'ومعه وصفُ الجهاز كما وصل من جهازها');
  const s=p._logs.filter(x=>x.qtype==='tts_server');
  ok(s.length===1&&s[0].response==='ok','وسطرُ الخادم ok — وهو ما كان غائباً');
  await p.close();
}

console.log('\n٢) الواجهةُ غائبة والخادمُ يفشل ⇒ يُبلَّغ عطلُ الجهاز الأصلي مرّةً واحدة');
{
  const p=await mk('none','fail');
  const got=await say(p,'Open the window please.');
  ok(p._calls.length===1,'الخادمُ جُرِّب');
  ok(got.length===1,'والمُستدعي بُلِّغ مرّةً واحدة بالضبط ('+got.length+')');
  ok(got[0]&&got[0].ok===false&&got[0].reason==='unsupported',
     'بعطل الجهاز الأصلي لا بعطل الخادم — المُستدعي يعنيه أن النطق لم يقع، والتفصيل في السجلّ');
  ok(await p.evaluate(()=>ttsBroken)===true,'والرايةُ مرفوعة');
  ok(await p.evaluate(()=>window.__played.length)===0,'ولا شيءَ شُغِّل');
  ok(p._logs.filter(x=>x.qtype==='tts_server'&&x.response==='azure_tts_auth').length===1,
     'وسببُ فشل الخادم مُسمّى في السجلّ');
  await p.close();
}

console.log('\n٣) والشبكةُ ساقطة ⇒ نفسُ الحكم، بلا بلاغٍ مزدوج');
{
  const p=await mk('none','down');
  const got=await say(p,'The bus leaves at eight.',3000);
  ok(p._calls.length===1,'الخادمُ جُرِّب');
  ok(got.length===1,'وبلاغٌ واحد ('+got.length+')');
  ok(got[0]&&got[0].reason==='unsupported','بعطل الجهاز');
  ok(p._logs.filter(x=>x.qtype==='tts_server'&&x.response==='network').length===1,
     'وتعذّرُ الشبكة مُسجَّل');
  await p.close();
}

console.log('\n٤) ولا انحدار: جهازٌ نطقُه يعمل ⇒ صفرُ نداءٍ للخادم');
{
  const p=await mk('works','ok');
  const got=await say(p,'This device speaks fine.');
  ok(got.length===1&&got[0].ok===true,'نجح على الجهاز');
  ok(p._calls.length===0,'وصفرُ نداءٍ للخادم — فلا يُنفَق طلبٌ على متعلّمٍ صوتُه يعمل');
  ok(await p.evaluate(()=>ttsBroken)===false,'والرايةُ نازلة');
  ok(p._logs.filter(x=>x.qtype==='tts_fail').length===0,'ولا سطرَ عطلٍ كاذب');
  await p.close();
}

console.log('\n٥) والقاطعُ يمنع هنا كما يمنع لأخويه — ولا إقفالَ للأبد');
{
  const p=await mk('none','fail');
  // ثلاثُ فشلاتٍ متتالية تفتح القاطع (TTS_CB_FAILS)
  for(let i=0;i<3;i++)await say(p,'Line number '+i+' here.');
  const n0=p._calls.length;
  ok(n0===3,'ثلاثُ محاولاتٍ وصلت الخادم ('+n0+')');
  ok(await p.evaluate(()=>ttsServerFails)>=3,'والقاطعُ فُتح');
  const got=await say(p,'One more line now.');
  ok(p._calls.length===n0,'فالنداءُ الرابع مُنِع — لا طَرقٌ بلا حدّ');
  ok(got.length===1&&got[0].reason==='unsupported',
     'والمُستدعي بُلِّغ مرّةً واحدة رغم المنع — فلا تعلق الشاشةُ على انتظارٍ لا يُفَكّ');
  // وبعد التهدئة تُسمح محاولةُ تحسّسٍ واحدة
  await p.evaluate(()=>{ttsServerOpenedAt=Date.now()-TTS_CB_COOL-1000});
  await say(p,'After the cooldown line.');
  ok(p._calls.length===n0+1,'وبعد التهدئة جرت محاولةُ تحسّسٍ واحدة — فلا إقفالَ للأبد');
  await p.close();
}

console.log('\n٦) وبلا نصٍّ لا يُطلب خادم');
{
  const p=await mk('none','ok');
  const got=await say(p,'');
  ok(p._calls.length===0,'صفرُ نداء — لا يُنفَق طلبٌ على نصٍّ فارغ');
  ok(got.length===1&&got[0].reason==='unsupported','ويُبلَّغ المُستدعي مرّةً واحدة');
  await p.close();
}

console.log('\n٧) والتشغيلُ التلقائي مرّةٌ واحدة لكل عنصر — على جهازٍ سليم وعلى جهازٍ بلا واجهة');
{
  // **الأرقامُ المقاسة قبل الإصلاح** (نفس السكربت، نفس الشاشة):
  //   جهازٌ سليم: فتحُ القسم plays=1 · العنصرُ الثاني **plays=2** ونطقٌ محلّيٌّ مرّتين
  //   بلا واجهة:  فتحُ القسم **plays=3** · العنصرُ الثاني **plays=4** و٧ تشغيلاتٍ تراكمية
  for(const api of ['works','none']){
    const p=await mk(api,'ok');
    await p.evaluate(()=>startListen());
    await p.waitForTimeout(1600);
    const a=await p.evaluate(()=>({plays:listenPlays,spoke:(window.__spoke||[]).length,played:window.__played.length}));
    ok(a.plays===1,'['+api+'] فتحُ القسم: التشغيلُ التلقائي مرّةٌ واحدة ('+a.plays+')');
    ok((api==='works'?a.spoke:a.played)===1,'['+api+'] وسُمِع مرّةً واحدة فعلاً لا مرّتين');
    await p.evaluate(()=>{listenChoose(0)});
    await p.waitForTimeout(250);
    await p.evaluate(()=>{listenNext()});
    await p.waitForTimeout(1600);
    const c=await p.evaluate(()=>({plays:listenPlays,spoke:(window.__spoke||[]).length,played:window.__played.length}));
    ok(c.plays===1,'['+api+'] والعنصرُ الثاني كذلك مرّةً واحدة ('+c.plays+')');
    ok((api==='works'?c.spoke:c.played)===2,'['+api+'] فالتراكمي اثنان لعنصرين — لا أربعة');
    // وزرُّ 🔊 بيدها يُعَدّ: الإعادةُ المقصودة ليست مقيَّدة
    await p.evaluate(()=>{listenPlay()});
    await p.waitForTimeout(1200);
    ok(await p.evaluate(()=>listenPlays)===2,'['+api+'] وزرُّ 🔊 بيدها زاد العدّاد — لا يُقيَّد');
    await p.close();
  }
}

console.log('\n٨) والبابُ واحدٌ للخمسة — لا رقعةٌ في كلّ قسم');
{
  const p=await mk('works','ok');
  // المصدرُ يُجلَب نصّاً لا يُقرأ من DOM — عدٌّ على مستوى الشيفرة، مقصودٌ صريحاً
  const sites=await p.evaluate(async()=>{
    const src=await (await fetch('/index.html')).text();
    return{once:(src.match(/autoPlayOnce\(/g)||[]).length,
           arm:(src.match(/autoPlayArm\(\)/g)||[]).length,
           old:(src.match(/Plays===0\)setTimeout/g)||[]).length};
  });
  ok(sites.once>=6,'خمسةُ حرّاسٍ في الرسم يمرّون بالدالّة الواحدة ('+sites.once+' موضعاً مع تعريفها)');
  ok(sites.arm>=6,'والتسليحُ عند فتح كلِّ قسمٍ من الخمسة ('+sites.arm+')');
  ok(sites.old===0,'ولا بقيَ حارسٌ على العدّاد (`Plays===0`) — فلا يعود الكذبُ من بابٍ تُرك');
  await p.close();
}

console.log('\n٩) وعدّادُ الاستماع لا يزيد إلّا مرّةً — في شاشةٍ حقيقية');
{
  // العدّادُ نحكم به على المستوى (إرشادُ «استمع مرّتين»)، فبلاغٌ مزدوج يُفسد الحكم.
  const p=await mk('none','ok');
  await p.evaluate(()=>{startListen()});
  // الشاشةُ تُشغّل المقطع تلقائياً مرّةً عند الرسم (`listenPlays===0`) — فيُنتظَر
  // استقرارُها قبل القياس، وإلّا قِيست لحظةٌ وسطى لا حكمٌ (درس «الاختبار يقيس
  // اللحظة الخاطئة»، ١٣ سبتمبر).
  await p.waitForTimeout(1500);
  const before=await p.evaluate(()=>typeof listenPlays==='number'?listenPlays:-1);
  const callsBefore=p._calls.length;
  ok(before===1,'التشغيلُ التلقائي وقع مرّةً واحدة وعدّادُه واحد ('+before+')');
  ok(callsBefore===1,'ومرّ على الخادم فعلاً من داخل الشاشة لا في اختبارٍ معزول');
  await p.evaluate(()=>{listenPlay()});
  await p.waitForTimeout(1200);
  const after=await p.evaluate(()=>listenPlays);
  ok(after===before+1,'وزاد واحداً على ضغطةٍ واحدة ('+before+' ⇐ '+after+')');
  ok(p._calls.length===callsBefore,'والنصُّ نفسه لم يُطلب ثانيةً — `TTS_CACHE` يمنع');
  await p.close();
}

await b.close();
console.log(fails?('\n✗ '+fails+' فحصاً فشل'):'\n✓ الكلّ نجح');
process.exit(fails?1:0);
})();
