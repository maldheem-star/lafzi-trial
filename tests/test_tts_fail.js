const {chromium}=require('/opt/node22/lib/node_modules/playwright');
let fails=0;const ok=(c,m)=>{console.log((c?'  ✓ ':'  ✗ FAIL ')+m);if(!c)fails++};
(async()=>{
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'});
const mk=async(voicesMode,failMode)=>{
  const logs=[];
  const p=await b.newPage({viewport:{width:420,height:900}});
  p.on('pageerror',e=>{console.log('  ✗ PAGEERROR '+e.message);fails++});
  await p.route('**/rest/v1/**',async r=>{
    if(r.request().method()!=='POST')return r.fulfill({status:200,contentType:'application/json',body:'[]'});
    let x={};try{x=JSON.parse(r.request().postData()||'{}')}catch(e){}
    logs.push(x);r.fulfill({status:201,contentType:'application/json',body:'[]'});
  });
  await p.route('**/functions/v1/**',r=>r.fulfill({status:200,contentType:'application/json',body:'{"ok":false}'}));
  await p.addInitScript(([vm,fm])=>{
    const listeners={};
    let voices = vm==='none' ? [] : [{lang:'en-US',name:'Google US English',localService:false}];
    const synth={
      speaking:false,pending:false,
      getVoices:()=>voices,
      cancel(){},resume(){},
      addEventListener(t,fn){ (listeners[t]=listeners[t]||[]).push(fn) },
      removeEventListener(t,fn){ if(listeners[t]) listeners[t]=listeners[t].filter(x=>x!==fn) },
      speak(u){
        setTimeout(()=>{
          if(fm==='error'){ if(u.onerror)u.onerror({error:'synthesis-failed'}) }
          else if(vm==='late' && voices.length===0){ if(u.onerror)u.onerror({error:'synthesis-failed'}) }
          else { if(u.onstart)u.onstart() }
        },5);
      }
    };
    Object.defineProperty(window,'speechSynthesis',{configurable:true,value:synth});
    window.SpeechSynthesisUtterance=function(t){this.text=t};
    if(vm==='late'){
      setTimeout(()=>{ voices=[{lang:'en_US',name:'Android TTS',localService:true}];
        (listeners['voiceschanged']||[]).slice().forEach(fn=>fn()); },900);
    }
  },[voicesMode,failMode]);
  await p.goto('http://127.0.0.1:8931/index.html');
  await p.waitForFunction(()=>typeof speakEnglish==='function');
  p._logs=logs;return p;
};

console.log('\n١) فشلٌ حقيقي يُسجَّل بسببه ومعه وصف الجهاز');
{
  const p=await mk('ok','error');
  await p.evaluate(()=>new Promise(r=>{speakEnglish('taxi',()=>r())}));
  await p.waitForTimeout(400);
  const row=p._logs.find(x=>x&&x.qtype==='tts_fail');
  ok(!!row,'سطرٌ وصل الخادم');
  ok(row&&row.domain==='gen','في domain=gen');
  ok(row&&/speak_error/.test(String(row.response||'')),'والسبب مسمّى — '+(row&&row.response));
  ok(row&&/أصوات:1/.test(String(row.q_text||'')),'ومعه عدد الأصوات');
  ok(row&&/إنجليزي:1/.test(String(row.q_text||'')),'وهل فيها إنجليزي');
  ok(await p.evaluate(()=>ttsBroken)===true,'والراية مرفوعة');
  await p.close();
}

console.log('\n٢) ولا يتكرّر السطر لنفس السبب — سقفُ الضجيج');
{
  const p=await mk('ok','error');
  await p.evaluate(async()=>{for(let i=0;i<5;i++)await new Promise(r=>speakEnglish('taxi',()=>r()))});
  await p.waitForTimeout(400);
  ok(p._logs.filter(x=>x&&x.qtype==='tts_fail').length===1,'خمس محاولات ⇐ سطرٌ واحد');
  await p.close();
}

console.log('\n٣) وقائمةُ أصواتٍ متأخّرة لا تُرفَع لها راية — الحالة التي تكسر أندرويد');
{
  const p=await mk('late','');
  const res=await p.evaluate(()=>new Promise(r=>{
    let last=null;
    speakEnglish('taxi',function(i){last=i;if(i&&i.ok)r({ok:true,i:i})});
    setTimeout(()=>r({ok:false,i:last}),3500);
  }));
  ok(res.ok===true,'النطق نجح بعد وصول الأصوات — '+(res.i&&res.i.voiceName));
  ok(await p.evaluate(()=>ttsBroken)===false,'والراية غير مرفوعة');
  await p.waitForTimeout(300);
  ok(p._logs.filter(x=>x&&x.qtype==='tts_fail').length===0,'ولا سطر فشلٍ كاذب');
  await p.close();
}

console.log('\n٤) والنجاح العادي يخفض الراية');
{
  const p=await mk('ok','');
  const r=await p.evaluate(()=>new Promise(res=>{ttsBroken=true;speakEnglish('taxi',i=>res(i))}));
  ok(r&&r.ok===true,'نطقٌ ناجح');
  ok(await p.evaluate(()=>ttsBroken)===false,'والراية انخفضت — لا تعلق مرفوعةً بعد نجاح');
  await p.close();
}

await b.close();
console.log(fails?`\n=== ${fails} فشل ===`:'\n=== كل الاختبارات نجحت ===');
process.exit(fails?1:0);
})();
