// تجربةُ كل صوتٍ على حدة — قياسٌ على جهازها لا توصيةٌ عليه (٢٩ أغسطس).
//
// وصل من جهاز هيا سبعةُ صفوف `tts_fail` متطابقة: `speak_error:synthesis-failed`،
// أصوات:٨٩ · إنجليزي:١ · بديل:١ — أي أن المحرّك يردّ خطأً صريحاً على الصوت المختار
// **وعلى البديل معاً**، فليست شيفرتنا تبتلع النداء. وما لا يقوله السطر: أيُّ صوتٍ
// يفشل — واحدٌ بعينه أم كلُّها؟ فهذه الصفحة تُجرّب كل صوتٍ إنجليزي واحداً واحداً
// وتُرسل النتيجة إلى السجلّ، فيصل الجواب بلا أن يقرأ أحدٌ شيئاً لنا.
//
// وقد نُهيتُ صراحةً عن التوصية على الجهاز بلا دليل، وكان النهي في محلّه — فهذا
// مقياسٌ لا نصيحة: لا يقترح شيئاً، يقيس أيُّها يبدأ فعلاً.
const {chromium}=require('/opt/node22/lib/node_modules/playwright');
let fails=0;const ok=(c,m)=>{console.log((c?'  ✓ ':'  ✗ FAIL ')+m);if(!c)fails++};
(async()=>{
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'});
// mode: أيُّ الأصوات يعمل. الأسماء تُحاكي جهاز أندرويد بلغة واجهةٍ عربية كجهازها.
const mk=async(okNames)=>{
  const logs=[];
  const p=await b.newPage({viewport:{width:420,height:900}});
  p.on('pageerror',e=>{console.log('  ✗ PAGEERROR '+e.message);fails++});
  await p.route('**/rest/v1/**',async r=>{
    if(r.request().method()!=='POST')return r.fulfill({status:200,contentType:'application/json',body:'[]'});
    let x={};try{x=JSON.parse(r.request().postData()||'{}')}catch(e){}
    logs.push(x);r.fulfill({status:201,contentType:'application/json',body:'[]'});
  });
  await p.route('**/functions/v1/**',r=>r.fulfill({status:200,contentType:'application/json',body:'{"ok":false}'}));
  await p.addInitScript((names)=>{
    const voices=[
      {lang:'en-US',name:'الإنجليزية الولايات المتحدة',localService:true},
      {lang:'en_GB',name:'English United Kingdom',localService:true},   // شرطةٌ سفلية عمداً
      {lang:'en-AU',name:'Aussie Voice',localService:false},
      {lang:'ar-SA',name:'العربية',localService:true}                   // لا تُجرَّب
    ];
    window.__tried=[];
    const synth={speaking:false,pending:false,
      getVoices:()=>voices,cancel(){},resume(){},addEventListener(){},removeEventListener(){},
      speak(u){
        const n=(u.voice&&u.voice.name)||'(بلا صوت)';
        window.__tried.push(n);
        if(names.indexOf(n)>=0)setTimeout(()=>{u.onstart&&u.onstart()},5);
        else if(names.indexOf('ERR:'+n)>=0)setTimeout(()=>{u.onerror&&u.onerror({error:'synthesis-failed'})},5);
        // وإلّا: صمتٌ تامّ — لا onstart ولا onerror، وهي حالة هيا بعينها
      }};
    Object.defineProperty(window,'speechSynthesis',{configurable:true,value:synth});
    window.SpeechSynthesisUtterance=function(t){this.text=t};
  },okNames);
  await p.goto('http://127.0.0.1:8931/index.html');
  await p.waitForFunction(()=>typeof runAudioDiagAll==='function');
  p._logs=logs;return p;
};

console.log('\n١) يُجرَّب كل صوتٍ إنجليزي وحده — ولا يُجرَّب العربي');
{
  const p=await mk(['Aussie Voice']);
  await p.evaluate(()=>{startAudioDiag();runAudioDiagAll()});
  await p.waitForFunction(()=>audioDiagBusy===false&&audioDiagVoices,null,{timeout:20000});
  const r=await p.evaluate(()=>({
    n:audioDiagVoices.length,
    names:audioDiagVoices.map(v=>v.name),
    tried:window.__tried
  }));
  ok(r.n===3,'ثلاثة أصواتٍ إنجليزية جُرِّبت — '+r.n);
  ok(r.names.indexOf('العربية')<0,'والعربي خارجها');
  ok(r.names.indexOf('English United Kingdom')>=0,'و`en_GB` بشرطةٍ سفلية داخلها — نفس توحيد الفاصل المعتمد');
  ok(r.tried.length===3,'وكلٌّ جُرِّب مرّةً واحدة — '+r.tried.length);
  await p.close();
}

console.log('\n٢) والنتيجة تفرّق: أيُّها بدأ، وأيُّها أخطأ، وأيُّها صمت');
{
  const p=await mk(['Aussie Voice','ERR:الإنجليزية الولايات المتحدة']);
  await p.evaluate(()=>{startAudioDiag();runAudioDiagAll()});
  await p.waitForFunction(()=>audioDiagBusy===false,null,{timeout:20000});
  const r=await p.evaluate(()=>audioDiagVoices.map(v=>v.name+'|'+v.state+'|'+(v.reason||'')));
  ok(/Aussie Voice\|✓/.test(r.join(" ")),'العامل ✓ — '+r.join(' · '));
  ok(/الولايات المتحدة\|✗\|synthesis-failed/.test(r.join(" ")),'والمُخطئ ✗ بسببه — وهو بعينه ما ردّه جهازها');
  ok(/English United Kingdom\|✗\|silent/.test(r.join(" ")),'والصامت ✗ silent — حالةٌ ثالثة لا تُخلَط بالخطأ');
  await p.close();
}

console.log('\n٣) والنتيجة تصل السجلّ لا الشاشة وحدها');
{
  const p=await mk(['Aussie Voice']);
  await p.evaluate(()=>{startAudioDiag();runAudioDiagAll()});
  await p.waitForFunction(()=>audioDiagBusy===false,null,{timeout:20000});
  await p.waitForTimeout(400);
  const row=p._logs.filter(x=>x&&x.qtype==='tts_probe').pop();
  ok(!!row,'سطرٌ وصل الخادم');
  ok(row&&row.domain==='gen','في domain=gen — ما يفعله النظام لا ما تفعله هي');
  ok(row&&/1\/3/.test(String(row.response||'')),'ومعه العدد العامل من الإجمالي — '+(row&&row.response));
  ok(row&&/Aussie Voice\(en-AU\)✓/.test(String(row.q_text||'')),'وكل صوتٍ باسمه ولهجته وحاله');
  ok(row&&/silent|synthesis/.test(String(row.q_text||'')),'ومعه سببُ من لم يعمل');
  ok(row&&/Mozilla|HeadlessChrome/.test(String(row.q_text||'')),'ووصفُ الجهاز — بلاه لا يُقارَن جهازٌ بجهاز');
  await p.close();
}

console.log('\n٤) وحالة هيا بعينها: كلُّها تفشل ⇒ يُقال ذلك ولا يُدَّعى صوتٌ يعمل');
{
  const p=await mk([]);          // لا صوت يعمل إطلاقاً
  await p.evaluate(()=>{startAudioDiag();runAudioDiagAll()});
  await p.waitForFunction(()=>audioDiagBusy===false,null,{timeout:20000});
  const t=await p.textContent('#app');
  ok(/لم يبدأ أيُّ صوتٍ إنجليزي/.test(t),'الشاشة تقولها صراحةً');
  await p.waitForTimeout(400);
  const row=p._logs.filter(x=>x&&x.qtype==='tts_probe').pop();
  ok(row&&/^0\/3/.test(String(row.response||'')),'والسجلّ ٠ من ٣ — '+(row&&row.response));
  await p.close();
}

console.log('\n٥) الزرّ لا يُعاد إطلاقه أثناء عمله، ولا يعلق بعده');
{
  const p=await mk(['Aussie Voice']);
  await p.evaluate(()=>{startAudioDiag();runAudioDiagAll();runAudioDiagAll();runAudioDiagAll()});
  await p.waitForFunction(()=>audioDiagBusy===false,null,{timeout:20000});
  const r=await p.evaluate(()=>({tried:window.__tried.length,busy:audioDiagBusy}));
  ok(r.tried===3,'ثلاث محاولاتٍ لا تسع — الطلبات المتزامنة تُهمَل ('+r.tried+')');
  ok(r.busy===false,'ولا يبقى «جارٍ» بعد الانتهاء');
  await p.close();
}

console.log('\n٦) ولا انحدار: صفحة التشخيص القائمة كما هي');
{
  const p=await mk(['Aussie Voice']);
  const t=await p.evaluate(()=>{startAudioDiag();return document.body.innerText});
  ok(/تشخيص الصوت/.test(t),'العنوان');
  ok(/جربي النطق الآن/.test(t),'وزرُّ التجربة القائم');
  ok(/جرّبي كل صوتٍ على حدة/.test(t),'والزرُّ الجديد بجواره');
  await p.close();
}

await b.close();
console.log(fails?`\n=== ${fails} فشل ===`:'\n=== كل الاختبارات نجحت ===');
process.exit(fails?1:0);
})();
