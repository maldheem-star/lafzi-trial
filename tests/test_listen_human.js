// شكوى فعلية: طلب الأب من هيا التمرّن على الاستماع فظهرت «لا شيء مستحقّ اليوم».
// السبب: بنك المستوى ثابتٌ صغير (١٠ عناصر)، وbuildListenPlan كان يعرض المستحقّ+الجديد
// فقط عبر FSRS — فإذا استُنفد الجديد وتأجّل المستحقّ (FSRS تُبعِد الموعد بعد إجابةٍ
// صحيحة) عادت قائمةً فارغة. والحلّ نفسه المطبَّق أصلاً في buildSpeakSession: مراجعة
// حرّة من البنك كلّه بدل شاشة فارغة — توصيل لا بناء من جديد.
//
// وطلب ثانٍ: صوتٌ «أكثر بشرية» للثلاثة. speakEnglish مشتركة بين الاستماع والإملاء
// والنطق عند الثلاثة، فتحسين اختيار الصوت فيها يعمّم بلا لمس ثلاثة أماكن.
const {chromium}=require('/opt/node22/lib/node_modules/playwright');
let fails=0;const ok=(c,m)=>{console.log((c?'  ✓ ':'  ✗ FAIL ')+m);if(!c)fails++};
(async()=>{
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'});
const page=await b.newPage({viewport:{width:420,height:900}});
page.on('pageerror',e=>{console.log('  ✗ PAGEERROR '+e.message);fails++});
await page.route('**/rest/v1/**',r=>r.fulfill({status:201,contentType:'application/json',body:'[]'}));
await page.addInitScript(()=>{
  Object.defineProperty(window,'speechSynthesis',{configurable:true,value:{speak(){},cancel(){},resume(){},pause(){},
    getVoices:()=>[{lang:'en-US',name:'X'}],speaking:false,pending:false}});
  window.SpeechSynthesisUtterance=function(t){this.text=t};
});
await page.goto('http://127.0.0.1:8931/index.html');
await page.waitForFunction(()=>typeof buildListenPlan==='function');

console.log('\n١) بنكٌ مستنفَد كلّه (كل عنصر مؤجَّل موعده) — كانت تعود فارغة، الآن مراجعة حرّة');
const out=await page.evaluate(()=>{
  const POOL=listenBankFor('A1');
  const st={};
  POOL.forEach(i=>{st[i.id]={box:2,due:srsToday()+30,seen:3}}); // كلّها مؤجَّلة، ولا شيء «جديد»
  lsSet(LISTEN_SRS_KEY,JSON.stringify(st));
  return buildListenPlan();
});
ok(out.length>0,`buildListenPlan لا تعود فارغة (${out.length} عنصراً)`);
ok(out.every(x=>x.lv==='A1'),'ومن بنك مستواها هو');

console.log('\n٢) startListen يعرض جلسة فعلاً في هذه الحالة — لا رسالة «لا شيء مستحقّ»');
await page.evaluate(()=>{try{lsDel(LISTEN_SRS_KEY)}catch(e){}
  const POOL=listenBankFor('A1');const st={};
  POOL.forEach(i=>{st[i.id]={box:2,due:srsToday()+30,seen:3}});
  lsSet(LISTEN_SRS_KEY,JSON.stringify(st));
  startListen();
});
let t=await page.textContent('#app');
ok(!t.includes('لا شيء مستحقّ اليوم'),'ولا تظهر رسالة القفل');
ok(!!(await page.evaluate(()=>listenItems.length)),'وعندها أسئلة فعلاً');

console.log('\n٣) بنكٌ طازج بلا سجلّ محلّي كذلك — الحالة الأصلية لم تتغيّر');
await page.evaluate(()=>{try{lsDel(LISTEN_SRS_KEY)}catch(e){}startListen()});
ok(await page.evaluate(()=>listenItems.length)>0,'أسئلةٌ من الجديد كما كانت');

console.log('\n٤) اختيار الصوت: يفضّل السحابي/الطبيعي على المحلّي الآلي — بلا خدمة خارجية');
const pick=await page.evaluate(()=>{
  const voices=[
    {lang:'en-US',name:'Robotic Local',localService:true},
    {lang:'en-US',name:'Aria Online (Natural)',localService:false},
    {lang:'en-GB',name:'Other',localService:true},
  ];
  return pickEnglishVoice(voices).name;
});
ok(pick==='Aria Online (Natural)','الصوت الطبيعي/السحابي يُختار أوّلاً');

const pick2=await page.evaluate(()=>{
  const voices=[{lang:'en-US',name:'Samantha',localService:true},{lang:'en-GB',name:'Daniel',localService:true}];
  return pickEnglishVoice(voices).name;
});
ok(pick2==='Samantha','ولو لم يوجد سحابي: en-US المحلّي أفضل من en-GB');

const pick3=await page.evaluate(()=>pickEnglishVoice([]));
ok(pick3===null,'وبلا أصوات أصلاً: null بلا انهيار');

console.log('\n٥) جهاز هيا فعلاً (صورة ١٦ أغسطس): يُسمّي اللهجة en_US بشرطة سفلية لا en-US');
// المطابقة الحرفية 'en-US' كانت تفشل بصمت على هذا الشكل فيقع الاختيار على أوّل صوتٍ
// بالقائمة (en_AU) لا الأمريكي — وكلّها محلّية هنا فلا فرق نقاطٍ يُنقذها.
const pickUnderscore=await page.evaluate(()=>{
  const voices=[
    {lang:'en_AU',name:'English (Australia)',localService:true},
    {lang:'en_GB',name:'English (UK)',localService:true},
    {lang:'en_IN',name:'English (India)',localService:true},
    {lang:'en_NG',name:'English (Nigeria)',localService:true},
    {lang:'en_US',name:'English (US)',localService:true},
  ];
  return pickEnglishVoice(voices).name;
});
ok(pickUnderscore==='English (US)','الأمريكية تُختار رغم الشرطة السفلية لا الأستراليّة الأولى بالقائمة');

console.log('\n٦) لا انحدار');
for(const [fn,md] of [["startListen()",'listen'],["startDictation()",'dictation'],["startCoach()",'coach'],["home()",'home']]){
  const r=await page.evaluate(x=>{try{eval(x);return{m:mode}}catch(e){return{err:e.message}}},fn);
  ok(!r.err&&r.m===md,`${fn} → ${r.err||r.m}`);
}
ok((await page.evaluate(()=>censusMissing())).length===0,'وكل الدوال معرَّفة');
ok((await page.evaluate(()=>window.__ERRS.length))===0,'ولا خطأ');

console.log('\n'+(fails?`=== ${fails} فشل ===`:'=== كل الاختبارات نجحت ==='));
await b.close();process.exit(fails?1:0);
})();
