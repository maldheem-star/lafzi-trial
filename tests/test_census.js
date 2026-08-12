const {chromium}=require('/opt/node22/lib/node_modules/playwright');
let fails=0;const ok=(c,m)=>{console.log((c?'  ✓ ':'  ✗ FAIL ')+m);if(!c)fails++};
const MOCK=()=>{
  Object.defineProperty(window,'speechSynthesis',{configurable:true,value:{speak(){},cancel(){},resume(){},pause(){},getVoices:()=>[{lang:'en-US',name:'X'}],speaking:false,pending:false}});
  window.SpeechSynthesisUtterance=function(t){this.text=t};
  Object.defineProperty(navigator,'mediaDevices',{configurable:true,value:{getUserMedia:async()=>({getTracks:()=>[{stop(){}}],getAudioTracks:()=>[{label:'m',stop(){}}]})}});
  window.MediaRecorder=function(){this.state='recording';this.mimeType='audio/webm';this.start=()=>{};
    this.stop=()=>{this.state='inactive';if(this.ondataavailable)this.ondataavailable({data:{size:4096}});if(this.onstop)this.onstop()}};
};
(async()=>{
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'});
const mk=async(extra)=>{const page=await b.newPage({viewport:{width:420,height:900}});
  await page.route('**/rest/v1/**',r=>r.fulfill({status:201,contentType:'application/json',body:'[]'}));
  await page.addInitScript(MOCK); if(extra)await page.addInitScript(extra);
  await page.goto('http://127.0.0.1:8931/index.html');
  await page.waitForFunction(()=>typeof censusMissing==='function');return page};

console.log('\n١) التعداد على تطبيق سليم');
let page=await mk();
await page.evaluate(()=>startAudioDiag());
ok((await page.evaluate(()=>censusMissing())).length===0,'لا دالة مفقودة');
let t=await page.textContent('#app');
ok(t.includes('كل دوال التطبيق')&&t.includes('نُفّذ كاملاً'),'وتُطمئن بوضوح');
ok(!t.includes('غير معرَّفة'),'ولا إنذار كاذب');

console.log('\n٢) التعداد يكشف التوقّف في منتصف الملف');
await page.evaluate(()=>{window.pronStart=undefined;window.speakStart=undefined});
await page.evaluate(()=>render());
t=await page.textContent('#app');
ok(t.includes('٢ دالة غير معرَّفة'),'يعدّ المفقود بدقّة');
ok(t.includes('pronStart')&&t.includes('speakStart'),'ويُسمّيها بأسمائها');
ok(t.includes('توقّف تنفيذ الملف')&&t.includes('لا تستجيب أزرارها'),'ويشرح المعنى: الزرّ سليم والدالة غائبة');
ok(t.includes('أرسلي هذه القائمة'),'ويطلب إرسالها');

console.log('\n٣) تتبّع التسجيل خطوة بخطوة');
page=await mk();
await page.evaluate(()=>startAudioDiag());
await page.click('button[onclick="traceRecord()"]');
await page.waitForFunction(()=>micTrace.length>=6,null,{timeout:12000});
t=await page.textContent('#micTrace');
ok(t.includes('وصلت الضغطة إلى الكود'),'١) اللمسة وصلت');
ok(t.includes('دالة التسجيل موجودة'),'٢) الدالة موجودة');
ok(t.includes('فُتح الميكروفون'),'٤) الميكروفون فُتح');
ok(t.includes('بدأ التسجيل'),'٥) بدأ التسجيل');
ok(t.includes('توقّف التسجيل')&&t.includes('بايت'),'٦) توقّف وحجم الصوت مذكور');
ok(t.includes('التسجيل يعمل تماماً'),'وخلاصة صريحة');

console.log('\n٤) التتبّع يتوقّف عند العطل ويُسمّيه');
page=await mk(()=>{Object.defineProperty(window,'__killPron',{value:1})});
await page.evaluate(()=>{startAudioDiag();window.pronStart=undefined});
await page.click('button[onclick="traceRecord()"]');
await page.waitForFunction(()=>micTrace.length>=2,null,{timeout:8000});
t=await page.textContent('#micTrace');
ok(t.includes('pronStart غير معرَّفة')&&t.includes('هنا العطل'),'الدالة الغائبة ⇒ يتوقّف ويُسمّي السبب');
ok(!t.includes('بدأ التسجيل'),'ولا يدّعي خطوات لم تحدث');
// إذن مرفوض
page=await mk(()=>{Object.defineProperty(navigator,'mediaDevices',{configurable:true,value:{getUserMedia:async()=>{const e=new Error('x');e.name='NotAllowedError';throw e}}})});
await page.evaluate(()=>startAudioDiag());
await page.click('button[onclick="traceRecord()"]');
await page.waitForFunction(()=>micTrace.length>=3,null,{timeout:8000});
t=await page.textContent('#micTrace');
ok(t.includes('رُفض الميكروفون')&&t.includes('NotAllowedError'),'والإذن المرفوض يُسمّى باسمه التقني');

console.log('\n٥) لا انحدار');
page=await mk();
for(const [fn,md] of [["startPronunciation()",'pron'],["startSpeaking()",'speak'],["startBasics('pimul3')",'basics'],["startFactPlan()",'factplan'],["home()",'home']]){
  const r=await page.evaluate(x=>{try{eval(x);return{m:mode}}catch(e){return{err:e.message}}},fn);
  ok(!r.err&&r.m===md,`${fn} → ${r.err||r.m}`);
}
ok((await page.evaluate(()=>window.__ERRS.length))===0,'ولا خطأ سُجّل');
await b.close();
console.log(fails?`\n=== ${fails} فشل ===`:'\n=== كل الاختبارات نجحت ===');
process.exit(fails?1:0);
})();
