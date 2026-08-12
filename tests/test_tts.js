const {chromium}=require('/opt/node22/lib/node_modules/playwright');
let fails=0;const ok=(c,m)=>{console.log((c?'  ✓ ':'  ✗ FAIL ')+m);if(!c)fails++};
const MIC=()=>{
  Object.defineProperty(navigator,'mediaDevices',{configurable:true,value:{getUserMedia:async()=>({getTracks:()=>[{stop(){}}],getAudioTracks:()=>[{label:'m',stop(){}}]})}});
  window.MediaRecorder=function(){this.state='recording';this.mimeType='audio/webm';this.start=()=>{};this.stop=()=>{this.state='inactive';if(this.onstop)this.onstop()}};
};
(async()=>{
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'});
const mk=async(tts)=>{const page=await b.newPage({viewport:{width:420,height:900}});
  page.on('pageerror',e=>{console.log('  ✗ PAGEERROR '+e.message);fails++});
  await page.route('**/rest/v1/**',r=>r.fulfill({status:201,contentType:'application/json',body:'[]'}));
  await page.addInitScript(MIC); await page.addInitScript(tts);
  await page.goto('http://127.0.0.1:8931/index.html');
  await page.waitForFunction(()=>typeof ttsMark==='function');return page};
const GOOD=()=>{Object.defineProperty(window,'speechSynthesis',{configurable:true,value:{
  speak(u){setTimeout(()=>u.onstart&&u.onstart(),5)},cancel(){},resume(){},pause(){},
  getVoices:()=>[{lang:'en-US',name:'US'}],speaking:false,pending:false}});
  window.SpeechSynthesisUtterance=function(t){this.text=t}};
const BAD=()=>{Object.defineProperty(window,'speechSynthesis',{configurable:true,value:{
  speak(u){setTimeout(()=>u.onerror&&u.onerror({error:'synthesis-failed'}),5)},cancel(){},resume(){},pause(){},
  getVoices:()=>[],speaking:false,pending:false}});
  window.SpeechSynthesisUtterance=function(t){this.text=t}};

console.log('\n١) الكلمة مكتوبة دائماً — العطل الحقيقي');
let page=await mk(GOOD);
await page.evaluate(()=>{startPronunciation();pronSession[pronIdx]={w:'circle',m:'دائرة'};render()});
let t=await page.textContent('#app');
ok(t.includes('circle'),'الكلمة الإنجليزية ظاهرة نصّاً قبل الإجابة');
ok(t.includes('دائرة'),'ومعناها بالعربية');
ok(await page.evaluate(()=>pronResult)===null,'وقبل أي إجابة — لا بعدها');
await page.close();

console.log('\n٢) حين يفشل النطق: الشاشة تتغيّر ولا تصمت');
page=await mk(BAD);
await page.evaluate(()=>{startPronunciation();pronSession[pronIdx]={w:'insect',m:'حشرة'};render();speakEnglish('insect')});
await page.waitForFunction(()=>ttsBroken===true,null,{timeout:5000});
t=await page.textContent('#app');
ok(t.includes('الصوت لا يعمل على هذا الجهاز'),'تُخبرها بصراحة أن الصوت معطّل');
ok(t.includes('اقرئي الكلمة المكتوبة'),'وتوجّهها لما تفعله بدلاً منه');
ok(t.includes('insect'),'والكلمة مكتوبة أمامها');
ok(t.includes('اقرئي الكلمة أعلاه، ثم اضغطي 🎤'),'ونصّ الإرشاد نفسه يتغيّر');
ok(!t.includes('اضغطي 🔊 لتسمعي، ثم 🎤 وانطقي —'),'ولا يطلب منها الاستماع إلى صوت لا يعمل');
ok(t.includes('لماذا؟ وكيف أُصلحه'),'ومعه طريق للعلاج');
await page.close();

console.log('\n٣) الراية تُرفع من كل مسارات الفشل وتُخفض عند النجاح');
page=await mk(BAD);
ok(await page.evaluate(()=>ttsBroken)===false,'تبدأ مطفأة (لا اتّهام قبل دليل)');
await page.evaluate(()=>speakEnglish('x'));
await page.waitForFunction(()=>ttsBroken===true,null,{timeout:5000});
ok(true,'خطأ synthesis-failed يرفعها');
await page.evaluate(()=>{Object.defineProperty(window,'speechSynthesis',{configurable:true,value:{
  speak(u){setTimeout(()=>u.onstart&&u.onstart(),5)},cancel(){},resume(){},pause(){},
  getVoices:()=>[{lang:'en-US',name:'US'}],speaking:false,pending:false}});speakEnglish('y')});
await page.waitForFunction(()=>ttsBroken===false,null,{timeout:5000});
ok(true,'ونجاح لاحق يُخفضها — فلا تبقى الرسالة بعد إصلاح الجهاز');
await page.close();

console.log('\n٤) لا تشويش حين يعمل الصوت');
page=await mk(GOOD);
await page.evaluate(()=>{startPronunciation();pronSession[pronIdx]={w:'circle',m:'دائرة'};render();speakEnglish('circle')});
await page.waitForFunction(()=>ttsChecked===true,null,{timeout:5000});
t=await page.textContent('#app');
ok(await page.evaluate(()=>ttsBroken)===false,'الراية مطفأة');
ok(!t.includes('الصوت لا يعمل'),'ولا تظهر رسالة العطل');
ok(t.includes('اضغطي 🔊 لتسمعي'),'والإرشاد الأصلي كما هو');
ok(t.includes('circle'),'والكلمة ما زالت مكتوبة — تحسين دائم لا علاج طارئ');
await page.close();

console.log('\n٥) لا انحدار');
page=await mk(GOOD);
for(const [fn,md] of [["startPronunciation()",'pron'],["startSpeaking()",'speak'],["startDictation()",'dictation'],
  ["startEngPlan()",'engplan'],["startBasics('pimul3')",'basics'],["startAudioDiag()",'audiodiag'],["home()",'home']]){
  const r=await page.evaluate(x=>{try{eval(x);return{m:mode,len:document.getElementById('app').textContent.length}}catch(e){return{err:e.message}}},fn);
  ok(!r.err&&r.m===md&&r.len>40,`${fn} → ${r.err||r.m}`);
}
ok((await page.evaluate(()=>censusMissing())).length===0,'وكل الدوال معرَّفة');
ok((await page.evaluate(()=>window.__ERRS.length))===0,'ولا خطأ');
await b.close();
console.log(fails?`\n=== ${fails} فشل ===`:'\n=== كل الاختبارات نجحت ===');
process.exit(fails?1:0);
})();
