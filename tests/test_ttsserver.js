// صوتٌ من الخادم حين يعجز الجهاز — ٣٠ أغسطس.
//
// القياس الذي أوجبه، من جهاز هيا نفسه (`qtype='tts_probe'`):
//   0/5 صوتاً بدأ فعلاً — en_AU · en_GB · en_IN · en_NG · en_US، كلُّها
//   `synthesis-failed`. أي أن العطل في محرّك جهازها لا في اختيارنا للصوت ولا في
//   شيفرتنا، ولا علاج له من داخل المتصفّح. وأقسامها الصوتية الستّة معطّلة بسببه.
//
// **وحدُّ هذا الاختبار يُقال بدل أن يُدَّعى**: يفحص المسار — أن يُطلب الخادم عند
// الفشل وحده، وأن يُبلَّغ النجاح، وأن يُخزَّن فلا يُعاد، وأن يُقاس الاستهلاك.
// ولا يفحص **نداء Azure الحقيقي** ولا تشغيل الصوت فعلاً: الأوّل محجوبٌ بسياسة
// الشبكة هنا، والثاني يحتاج مخرجَ صوتٍ حقيقياً. فيبقيان غير مُثبَتين حتى يُفتح
// على جهاز — ولا يُدَّعى غير ذلك.
const {chromium}=require('/opt/node22/lib/node_modules/playwright');
let fails=0;const ok=(c,m)=>{console.log((c?'  ✓ ':'  ✗ FAIL ')+m);if(!c)fails++};
(async()=>{
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'});

// mode: كيف يتصرّف محرّك الجهاز · azure: كيف يردّ الخادم
const mk=async(mode,azure)=>{
  const logs=[],calls=[];
  const p=await b.newPage({viewport:{width:420,height:900}});
  p.on('pageerror',e=>{console.log('  ✗ PAGEERROR '+e.message);fails++});
  await p.route('**/rest/v1/**',async r=>{
    if(r.request().method()!=='POST')return r.fulfill({status:200,contentType:'application/json',body:'[]'});
    let x={};try{x=JSON.parse(r.request().postData()||'{}')}catch(e){}
    logs.push(x);r.fulfill({status:201,contentType:'application/json',body:'[]'});
  });
  // ===== الترتيب مقصود: Playwright يُطابق الأحدثَ تسجيلاً أوّلاً =====
  // سُجّلت القاعدة العامّة أوّلاً فابتلعت الخاصّة، فلم يصل الخادمَ نداءٌ واحد وسقط
  // ستّة عشر فحصاً والشيفرة سليمة. فالعامّة أوّلاً والخاصّة بعدها لتفوز.
  await p.route('**/functions/v1/**',r=>r.fulfill({status:200,contentType:'application/json',body:'{"ok":false}'}));
  await p.route('**/functions/v1/assess-azure',async r=>{
    let x={};try{x=JSON.parse(r.request().postData()||'{}')}catch(e){}
    calls.push(x);
    if(azure==='fail')return r.fulfill({status:200,contentType:'application/json',
      body:JSON.stringify({error:"azure_tts_auth",status:401,detail:"bad key"})});
    if(azure==='down')return r.abort();
    // نجاح: بايتاتٌ بنوع audio — محتواها لا يُفحص هنا، فالتشغيل مُستبدَل بمحاكاة
    r.fulfill({status:200,contentType:'audio/mpeg',
      headers:{'X-Tts-Chars':String((x.text||'').length)},body:'ID3AUDIOBYTES'});
  });
  await p.addInitScript((m)=>{
    // محرّك الجهاز
    const synth={speaking:false,pending:false,
      getVoices:()=>[{lang:'en_US',name:'الإنجليزية الولايات المتحدة',localService:true}],
      cancel(){},resume(){},addEventListener(){},removeEventListener(){},
      speak(u){
        if(m==='silent')return;                                  // لا حدث إطلاقاً
        if(m==='error')return setTimeout(()=>u.onerror&&u.onerror({error:'synthesis-failed'}),5);
        setTimeout(()=>u.onstart&&u.onstart(),5);                // يعمل
      }};
    Object.defineProperty(window,'speechSynthesis',{configurable:true,value:synth});
    window.SpeechSynthesisUtterance=function(t){this.text=t};
    // تشغيلُ الصوت مُحاكًى: مخرجُ الصوت الحقيقي غير متاح هنا، والمقصود فحصُ المسار
    window.__played=[];
    window.Audio=function(src){
      window.__played.push(src);
      const a={src:src,play:function(){setTimeout(function(){a.onplaying&&a.onplaying()},5);
        return{catch:function(){return null}}}};
      return a;
    };
  },mode);
  await p.goto('http://127.0.0.1:8931/index.html');
  await p.waitForFunction(()=>typeof ttsServerSpeak==='function');
  p._logs=logs;p._calls=calls;return p;
};

console.log('\n١) محرّكٌ يردّ synthesis-failed ⇒ يُطلب الخادم ويُبلَّغ النجاح');
{
  const p=await mk('error','ok');
  const r=await p.evaluate(()=>new Promise(res=>{
    speakEnglish('Hello there.',function(i){res(i)});
    setTimeout(()=>res({timeout:true}),6000);
  }));
  ok(r&&r.ok===true,'النطق نجح عبر الخادم — '+JSON.stringify(r));
  ok(r&&r.engine==='azure','والمحرّك المُبلَّغ عنه azure');
  ok(p._calls.length===1,'ونداءٌ واحد للخادم — '+p._calls.length);
  ok(p._calls[0]&&p._calls[0].mode==='tts','بوضع tts');
  ok(p._calls[0]&&p._calls[0].text==='Hello there.','ومعه النصّ — '+(p._calls[0]&&p._calls[0].text));
  ok(await p.evaluate(()=>ttsBroken)===false,'والراية نزلت — لا «لا صوت» فوق صوتٍ يعمل');
  ok(await p.evaluate(()=>window.__played.length)===1,'وشُغّل مقطعٌ واحد');
  await p.close();
}

console.log('\n٢) وجهازٌ صامتٌ تماماً ⇒ نفس المسار');
{
  const p=await mk('silent','ok');
  const r=await p.evaluate(()=>new Promise(res=>{
    speakEnglish('Good morning.',function(i){res(i)});
    setTimeout(()=>res({timeout:true}),7000);
  }));
  ok(r&&r.ok===true,'نجح عبر الخادم — '+JSON.stringify(r));
  ok(p._calls.length===1,'ونداءٌ واحد');
  await p.close();
}

console.log('\n٣) وجهازٌ يعمل ⇒ **لا يُطلب الخادم إطلاقاً** — لا يُنفَق طلبٌ بلا حاجة');
{
  const p=await mk('ok','ok');
  const r=await p.evaluate(()=>new Promise(res=>{
    speakEnglish('It works.',function(i){res(i)});
    setTimeout(()=>res({timeout:true}),3000);
  }));
  ok(r&&r.ok===true,'نجح على الجهاز');
  ok(!r.engine,'بلا وسم خادم');
  await p.waitForTimeout(400);
  ok(p._calls.length===0,'وصفرُ نداءات للخادم — '+p._calls.length);
  await p.close();
}

console.log('\n٤) وفشلُ الخادم لا يُنتج نجاحاً كاذباً — يُبلَّغ عطلُ الجهاز كما هو');
{
  const p=await mk('error','fail');
  const r=await p.evaluate(()=>new Promise(res=>{
    speakEnglish('Try this.',function(i){res(i)});
    setTimeout(()=>res({timeout:true}),6000);
  }));
  ok(r&&r.ok===false,'لا نجاح — '+JSON.stringify(r&&r.reason));
  ok(r&&r.reason==='speak_error','والسببُ المُبلَّغ عطلُ الجهاز الأصلي لا عطلُ الخادم');
  ok(await p.evaluate(()=>ttsBroken)===true,'والراية مرفوعة');
  await p.waitForTimeout(400);
  const row=p._logs.filter(x=>x&&x.qtype==='tts_server').pop();
  ok(!!row,'وسببُ فشل الخادم يصل السجلّ');
  ok(row&&/azure_tts_auth/.test(String(row.response||'')+String(row.q_text||'')),
    'باسمه لا مبهماً — '+(row&&row.response));
  await p.close();
}

console.log('\n٥) وتعذّرُ الشبكة يُسمّى كذلك، ولا يُعاد النداء بعد ثبوت الفشل');
{
  const p=await mk('error','down');
  await p.evaluate(()=>new Promise(res=>{
    speakEnglish('One.',function(){res(1)});setTimeout(()=>res(0),6000);}));
  const first=p._calls.length;
  await p.evaluate(()=>new Promise(res=>{
    speakEnglish('Two.',function(){res(1)});setTimeout(()=>res(0),6000);}));
  ok(first===1,'نداءٌ أوّل — '+first);
  ok(p._calls.length===1,'ولا نداءَ ثانٍ بعد ثبوت الفشل في الجلسة — '+p._calls.length);
  await p.waitForTimeout(300);
  const row=p._logs.filter(x=>x&&x.qtype==='tts_server').pop();
  ok(row&&/network/.test(String(row.response||'')),'والسبب مسمّى — '+(row&&row.response));
  await p.close();
}

console.log('\n٦) والجملة الواحدة تُطلب مرّةً واحدة — والاستهلاك يُقاس بالمحارف');
{
  const p=await mk('error','ok');
  await p.evaluate(()=>new Promise(res=>{speakEnglish('Same text.',()=>res(1));setTimeout(()=>res(0),6000)}));
  await p.evaluate(()=>new Promise(res=>{speakEnglish('Same text.',()=>res(1));setTimeout(()=>res(0),6000)}));
  ok(p._calls.length===1,'نداءٌ واحد لجملتين متطابقتين — '+p._calls.length);
  ok(await p.evaluate(()=>window.__played.length)===2,'وشُغّلت مرّتين من المخزون');
  await p.evaluate(()=>new Promise(res=>{speakEnglish('Other text here.',()=>res(1));setTimeout(()=>res(0),6000)}));
  ok(p._calls.length===2,'ونصٌّ مختلف يُطلب — '+p._calls.length);
  await p.waitForTimeout(400);
  const row=p._logs.filter(x=>x&&x.qtype==='tts_server').pop();
  ok(row&&/محارف:/.test(String(row.q_text||'')),'والاستهلاك مُسجَّل بالمحارف — «الطبقة المجانية» دعوى تحتاج عدّاداً');
  await p.close();
}

console.log('\n٧) والخادم: وضع tts داخل دالّة Azure نفسها — لا مورد ولا مفتاح جديد');
{
  const fs=require('fs');
  const t=fs.readFileSync('supabase-functions-assess-azure.ts','utf8');
  ok(/mode === "tts"/.test(t),'الفرع موجود في assess-azure');
  ok(/tts\.speech\.microsoft\.com/.test(t),'ونقطة التركيب في Azure');
  ok(/AZURE_SPEECH_KEY/.test(t)&&t.indexOf('AZURE_SPEECH_KEY')<t.indexOf('mode === "tts"'),
     'وبعد التحقّق من نفس المفتاح — لا مسار مفاتيح ثانٍ');
  ok(/X-Tts-Chars/.test(t),'ويُعيد عدد المحارف ليُقاس الاستهلاك');
  ok(/audio-24khz-48kbitrate-mono-mp3/.test(t),'وبصيغة MP3 يقرؤها كل متصفّح');
  // حقنُ SSML: اسم الصوت مُقيَّد شكلاً، والنصّ يُهرَّب
  ok(/Neural\$\/\.test\(vRaw\)/.test(t),'واسم الصوت مُقيَّد شكلاً فلا يُحقَن في SSML');
  ok(/replace\(\/&\/g, "&amp;"\)/.test(t),'والنصّ يُهرَّب قبل بنائه');
  ok(/mode !== "tts" && \(!audioB64/.test(t),'وحارسُ التقييم لا يرفض طلب التركيب');
}

await b.close();
console.log(fails?`\n=== ${fails} فشل ===`:'\n=== كل الاختبارات نجحت ===');
process.exit(fails?1:0);
})();
