const {chromium}=require('/opt/node22/lib/node_modules/playwright');
let fails=0;const ok=(c,m)=>{console.log((c?'  ✓ ':'  ✗ FAIL ')+m);if(!c)fails++};
(async()=>{
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'});
const logs=[];
const page=await b.newPage({viewport:{width:420,height:900}});
page.on('pageerror',e=>{console.log('  ✗ PAGEERROR '+e.message);fails++});
await page.route('**/rest/v1/**',async r=>{
  let x={};try{x=JSON.parse(r.request().postData()||'{}')}catch(e){}
  logs.push(x);r.fulfill({status:201,contentType:'application/json',body:'[]'});
});
await page.goto('http://127.0.0.1:8931/index.html');
await page.waitForFunction(()=>typeof weakPhonemeStr==='function');

// حالتها الحقيقية من جلسة ٩:٣٤: قالت «Space space.» فحُسبت ٥٩٪ وهي تنطق سليماً.
// Azure يُعلّم التكرار Insertion ويخصم على الاكتمال، فتهبط الدرجة المركّبة.
const SPACE_TWICE={ok:true,engine:"azure",heard:"Space space.",lexical:"space space",
  pron:59,accuracy:96,fluency:40,completeness:50,
  words:[{w:"space",score:96,err:"None",phonemes:[{p:"s",score:97},{p:"p",score:95},{p:"ey",score:96},{p:"s",score:94}]},
         {w:"space",score:95,err:"Insertion",phonemes:[]}],
  weak:[]};
const SPACE_ONCE={ok:true,engine:"azure",heard:"Space.",lexical:"space",
  pron:96,accuracy:96,fluency:98,completeness:100,
  words:[{w:"space",score:96,err:"None",phonemes:[{p:"s",score:97}]}],weak:[]};
// نطق ضعيف حقيقي: الدقّة نفسها منخفضة — لا يُنقَذ بالقاعدة الجديدة
const BAD={ok:true,engine:"azure",heard:"Kate.",lexical:"kate",pron:38,accuracy:38,fluency:90,completeness:100,
  words:[{w:"gate",score:38,err:"Mispronunciation",phonemes:[{p:"g",score:22},{p:"ey",score:80},{p:"t",score:70}]}],
  weak:[{w:"gate",p:"g",score:22}]};
// جملة: الطلاقة والاكتمال جزء من الحكم فعلاً
const SENT={ok:true,engine:"azure",heard:"Can I ask you something?",lexical:"can i ask you something",
  pron:72,accuracy:88,fluency:55,completeness:100,
  words:["can","i","ask","you","something"].map(w=>({w,score:88,err:"None",phonemes:[{p:"k",score:88}]})),weak:[]};

const sc=async d=>page.evaluate(x=>azureToScore(x.t,x.d),d);

console.log('\n١) التكرار لم يعد يُحسب خطأً في النطق');
let r=await sc({t:"space",d:SPACE_TWICE});
ok(r.pct===96,`«Space space.» ⇒ ${r.pct}٪ من دقّة الأصوات — كانت ٥٩٪ من الدرجة المركّبة`);
ok(r.ok===true,'وتُحتسب صحيحة');
ok(r.repeats===1,`ويُعدّ التكرار (${r.repeats}) لا يُهمَل`);
ok(r.total===1&&r.got===1,'والكلمة الواحدة تبقى واحدة');

console.log('\n٢) وبلا تكرار لا يتغيّر شيء');
r=await sc({t:"space",d:SPACE_ONCE});
ok(r.pct===96&&r.repeats===0,`«Space.» ⇒ ${r.pct}٪ بلا تكرار`);

console.log('\n٣) القاعدة لا تُنقذ نطقاً ضعيفاً فعلاً');
r=await sc({t:"gate",d:BAD});
ok(r.pct===38,`«Kate» بدل «gate» ⇒ ${r.pct}٪`);
ok(r.ok===false,'وتبقى خطأً');
ok(r.weak.length===1&&r.weak[0].p==='g','ومعها الصوت المسؤول: g');

console.log('\n٤) الجملة تبقى على الدرجة المركّبة — الطلاقة فيها حكمٌ حقيقي');
r=await sc({t:"can I ask you something",d:SENT});
ok(r.pct===72,`جملة من خمس كلمات ⇒ ${r.pct}٪ (الدرجة المركّبة لا الدقّة ٨٨)`);

console.log('\n٥) سطر الأصوات الضعيفة للسجلّ');
const s=await page.evaluate(()=>[
  weakPhonemeStr([{w:"insect",p:"t",score:45},{w:"insect",p:"s",score:52}]),
  weakPhonemeStr([]),weakPhonemeStr(null),
  weakPhonemeStr([1,2,3,4,5,6].map(i=>({p:"p"+i,score:i}))),
]);
ok(s[0]==='t:45,s:52',`«${s[0]}» — الرمز ودرجته، من الأضعف`);
ok(s[1]===null&&s[2]===null,'والفارغ يُعطي null لا سلسلة فارغة');
ok(s[3].split(',').length===4,'ولا يزيد على أربعة أصوات');
const n=await page.evaluate(()=>[num0(91),num0(0),num0(null),num0(undefined),num0(NaN),num0("91")]);
ok(n[0]===91&&n[1]===0,'num0 يمرّر الأرقام');
ok(n[2]===null&&n[3]===null&&n[4]===null&&n[5]===null,'ويُحوّل ما ليس رقماً إلى null — عمود smallint يرفض غيره');

console.log('\n٦) السطر المُسجَّل يحمل التفاصيل — لم تكن تُحفظ قبل اليوم');
logs.length=0;
await page.evaluate(d=>{
  startPronunciation();
  pronSession=[{w:"insect",m:"حشرة"}];pronIdx=0;pronElapsed=2.4;pronBusy=true;pronScore=0;
  const s=azureToScore("insect",d);
  pronResult={heard:d.heard,ok:s.ok,sc:s,note:"",engine:"azure"};
  logAnswer("pronunciation_a1","word",s.ok,d.heard,"insect",Math.round(pronElapsed*1000),
    {score_pct:s.pct,engine:"azure",accuracy_pct:num0(s.accuracy),fluency_pct:num0(s.fluency),
     completeness_pct:num0(s.completeness),weak_phonemes:weakPhonemeStr(s.weak),repeats:s.repeats||0});
  pronBusy=false;render();
},{ok:true,engine:"azure",heard:"Insect.",lexical:"insect",pron:90,accuracy:91,fluency:78,completeness:100,
   words:[{w:"insect",score:91,err:"None",phonemes:[{p:"s",score:52},{p:"t",score:45}]}],
   weak:[{w:"insect",p:"t",score:45},{w:"insect",p:"s",score:52}]});
await page.waitForTimeout(500);
const lg=logs.find(l=>l.domain==='pronunciation_a1');
ok(!!lg,'السطر وصل');
ok(lg&&lg.accuracy_pct===91,`ودقّة الأصوات (${lg&&lg.accuracy_pct}) — كانت null`);
ok(lg&&lg.fluency_pct===78&&lg.completeness_pct===100,'والطلاقة والاكتمال');
ok(lg&&lg.weak_phonemes==='t:45,s:52',`وأضعف الأصوات: «${lg&&lg.weak_phonemes}»`);
ok(lg&&lg.repeats===0,'وعدّاد التكرار');
ok(lg&&lg.engine==='azure'&&lg.score_pct===91,'والدرجة والمحرّك');

console.log('\n٧) الشاشة تطمئنها على التكرار');
await page.evaluate(d=>{
  startPronunciation();
  pronSession=[{w:"space",m:"فضاء"}];pronIdx=0;pronListening=false;pronBusy=false;
  const s=azureToScore("space",d);
  pronResult={heard:d.heard,ok:s.ok,sc:s,note:"",engine:"azure"};render();
},SPACE_TWICE);
let t=await page.textContent('#app');
ok(t.includes('قلتِها ٢ مرات'),'يُقال لها كم مرة قالتها');
ok(t.includes('لم نخصم عليكِ'),'ويُطمئنها أنها لم تُعاقَب');
ok(t.includes('✓ نطق صحيح'),'والنتيجة صحيحة');
// وبلا تكرار لا تظهر الملاحظة
await page.evaluate(d=>{
  pronResult={heard:d.heard,ok:true,sc:azureToScore("space",d),note:"",engine:"azure"};render();
},SPACE_ONCE);
ok(!(await page.textContent('#app')).includes('مرة واحدة تكفي'),'وبلا تكرار لا ملاحظة');

console.log('\n٨) لا انحدار');
for(const [fn,md] of [["startBasics('percent')",'basics'],["startBasics('multdiv')",'basics'],["startFactPlan()",'factplan'],
  ["startEngPlan()",'engplan'],["startDictation()",'dictation'],["startPronunciation()",'pron'],
  ["startFade('circle')",'fade'],["startAudioDiag()",'audiodiag'],["home()",'home']]){
  const x=await page.evaluate(s=>{try{eval(s);return{m:mode,len:document.getElementById('app').textContent.length}}catch(e){return{err:e.message}}},fn);
  ok(!x.err&&x.m===md&&x.len>40,`${fn} → ${x.err||x.m}`);
}
ok((await page.evaluate(()=>censusMissing())).length===0,'وكل الدوال معرَّفة');
ok((await page.evaluate(()=>window.__ERRS.length))===0,'ولا خطأ');

await b.close();
console.log(fails?`\n=== ${fails} فشل ===`:'\n=== كل الاختبارات نجحت ===');
process.exit(fails?1:0);
})();
