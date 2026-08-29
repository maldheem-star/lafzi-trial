// «لا صوت» بلا رايةٍ ولا خطأ — لقطة ٢٩ أغسطس (مساءً) من شاشة الاستماع.
// حالةٌ ثالثة لم تكن تُسجَّل: `onerror` يُسجَّل، و`onstart` نجاح — أمّا ألّا يقع
// أيٌّ منهما (المتصفح يتجاهل `speak()` بصمت) فلا أثر له إطلاقاً.
const {chromium}=require('/opt/node22/lib/node_modules/playwright');
let fails=0;const ok=(c,m)=>{console.log((c?'  ✓ ':'  ✗ FAIL ')+m);if(!c)fails++};
(async()=>{
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'});
// mode: 'silent' لا يُطلق حدثاً إطلاقاً · 'ok' يبدأ · 'error' يُخطئ
const mk=async(mode)=>{
  const logs=[];
  const p=await b.newPage({viewport:{width:420,height:900}});
  p.on('pageerror',e=>{console.log('  ✗ PAGEERROR '+e.message);fails++});
  await p.route('**/rest/v1/**',async r=>{
    if(r.request().method()!=='POST')return r.fulfill({status:200,contentType:'application/json',body:'[]'});
    let x={};try{x=JSON.parse(r.request().postData()||'{}')}catch(e){}
    logs.push(x);r.fulfill({status:201,contentType:'application/json',body:'[]'});
  });
  await p.route('**/functions/v1/**',r=>r.fulfill({status:200,contentType:'application/json',body:'{"ok":false}'}));
  await p.addInitScript((m)=>{
    const synth={speaking:false,pending:false,
      getVoices:()=>[{lang:'en-US',name:'Google US English',localService:false}],
      cancel(){},resume(){},addEventListener(){},removeEventListener(){},
      speak(u){ if(m==='silent')return;                       // يُتجاهَل بصمت
        setTimeout(()=>{ if(m==='error'){u.onerror&&u.onerror({error:'synthesis-failed'})}
                         else {u.onstart&&u.onstart()} },5); }};
    Object.defineProperty(window,'speechSynthesis',{configurable:true,value:synth});
    window.SpeechSynthesisUtterance=function(t){this.text=t};
  },mode);
  await p.goto('http://127.0.0.1:8931/index.html');
  await p.waitForFunction(()=>typeof speakEnglish==='function');
  p._logs=logs;return p;
};

console.log('\n١) طلبٌ يُتجاهَل بصمت يُرصد ويُسجَّل — الحالة التي لم يكن لها أثر');
{
  const p=await mk('silent');
  await p.evaluate(()=>speakEnglish('taxi'));
  await p.waitForTimeout(2600);
  const row=p._logs.find(x=>x&&x.qtype==='tts_fail'&&/silent/.test(String(x.response||'')));
  ok(!!row,'سطرٌ وصل الخادم بسبب «silent»');
  ok(row&&row.domain==='gen','في domain=gen');
  ok(row&&/أصوات:1/.test(String(row.q_text||'')),'ومعه وصف الجهاز — '+String(row&&row.q_text||'').slice(0,60));
  ok(await p.evaluate(()=>ttsBroken)===true,'والراية تُرفع فتظهر لها الرسالة والمخرج');
  await p.close();
}

console.log('\n٢) ولا تُرفَع راية «صمت» على نطقٍ ناجح — لا بلاغ كاذب');
{
  const p=await mk('ok');
  await p.evaluate(()=>new Promise(r=>speakEnglish('taxi',()=>r())));
  await p.waitForTimeout(2600);
  ok(p._logs.filter(x=>x&&x.qtype==='tts_fail').length===0,'لا سطر فشل');
  ok(await p.evaluate(()=>ttsBroken)===false,'والراية منخفضة');
  await p.close();
}

console.log('\n٣) عدّاد الاستماع لا يزيد إلّا إن بدأ النطق فعلاً');
{
  const p=await mk('silent');
  await p.evaluate(()=>{startListen();listenPlays=0;listenPlay()});
  await p.waitForTimeout(600);
  ok(await p.evaluate(()=>listenPlays)===0,'صمتٌ ⇒ العدّاد صفر (كان يزيد على الطلب فيكذب)');
  await p.close();
  const q=await mk('ok');
  await q.evaluate(()=>{startListen();listenPlays=0;listenPlay()});
  await q.waitForTimeout(400);
  ok(await q.evaluate(()=>listenPlays)>=1,'ونطقٌ ناجح ⇒ يزيد');
  await q.close();
}

console.log('\n٤) وكل شاشةٍ صوتية فيها مخرج — لا شاشة النطق وحدها');
{
  const p=await mk('ok');
  const r=await p.evaluate(()=>{
    const out={};
    const runs=[["listen",()=>startListen()],["dictation",()=>{try{startDictation()}catch(e){}}],
                ["minpair",()=>startMinpair()],["video",()=>startVideo()],
                ["speak",()=>startSpeaking()],["pron",()=>{try{startPron()}catch(e){}}]];
    runs.forEach(function(x){
      try{x[1]();render();out[x[0]]=document.body.innerHTML.indexOf('startAudioDiag')>=0}
      catch(e){out[x[0]]='ERR'}
    });
    return out;
  });
  Object.keys(r).forEach(function(k){
    ok(r[k]===true,'شاشة «'+k+'» فيها زرّ فحص الصوت — '+r[k]);
  });
  await p.close();
}

console.log('\n٥) وصفحة التشخيص لا تعلق على «جارٍ التجربة» في حالة الصمت');
{
  const p=await mk('silent');
  await p.evaluate(()=>{startAudioDiag();runAudioDiag()});
  await p.waitForTimeout(2600);
  const r=await p.evaluate(()=>({
    res:audioDiagResult&&audioDiagResult.reason,
    stuck:!!(audioDiagResult&&audioDiagResult.status),
    shown:document.body.innerText
  }));
  ok(r.stuck===false,'لم تبقَ على حالة الانتظار');
  ok(r.res==='silent','بل أبلغت بالسبب — '+r.res);
  ok(/لم يبدأ النطق/.test(r.shown),'وشرحته للمستخدمة نصّاً');
  ok(/بيانات اللغة الإنجليزية/.test(r.shown),'ومعه الخطوة العملية على الجهاز');
  await p.close();
}

await b.close();
console.log(fails?`\n=== ${fails} فشل ===`:'\n=== كل الاختبارات نجحت ===');
process.exit(fails?1:0);
})();
