// بيئة التجريب — اعتُمدت بعد سؤال «هل طبّقت كل مراحل SDLC؟» وجوابه: لا.
// ثلاثٌ كانت متروكة: لا بيئة تجريب، ولا خطّة تراجع، ولا جهاز حقيقي في المسار.
//
// و`/preview` و`/` على **نفس الأصل**، فيتشاركان `localStorage` كلّه. أي أن فتح نسخة
// التجريب على جهاز هيا كان سيكتب في مخزونها الحقيقي — جدولة FSRS، وسجلّ ما عُرض،
// والبنوك المولَّدة — فيُفسد بيانات التشخيص التي يقوم عليها المشروع، من حيث أردنا
// أن نحميها. وهذا الاختبار يحرس الفصل، وهو أهمّ ما في هذه الميزة.
const {chromium}=require('/opt/node22/lib/node_modules/playwright');
const fs=require('fs'),path=require('path');
let fails=0;const ok=(c,m)=>{console.log((c?'  ✓ ':'  ✗ FAIL ')+m);if(!c)fails++};
const ROOT=path.resolve(__dirname,'..');
const PV=path.join(ROOT,'preview');

// نسخةٌ حقيقية لا رمزية: خادم الاختبار قد لا يتبع الروابط الرمزية، والغرض محاكاة
// ما ينشره الإجراء فعلاً (نسخة فرع التطوير في مجلّد فرعي).
function mkPreview(){
  fs.mkdirSync(PV,{recursive:true});
  ["index.html","mohammed.html","elias.html"].forEach(function(f){
    fs.copyFileSync(path.join(ROOT,f),path.join(PV,f));
  });
  fs.writeFileSync(path.join(PV,"PREVIEW.txt"),"preview · test");
}
function rmPreview(){try{fs.rmSync(PV,{recursive:true,force:true})}catch(e){}}

(async()=>{
rmPreview();mkPreview();
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'});
// ===== سياقٌ **واحد** لكل الصفحات — وهذا شرط صحّة هذا الاختبار =====
// `browser.newPage()` يُنشئ سياقاً جديداً لكلّ صفحة، فيكون مخزونها معزولاً أصلاً —
// وعندئذٍ ينجح الاختبار حتى لو لم يُبنَ العزل إطلاقاً، وهو أسوأ من فشله. والواقع
// الذي نحاكيه هو العكس: `/preview` و`/` على نفس الأصل في متصفّحٍ واحد، فمخزونهما
// واحد. فسياقٌ مشترك، وإلّا فالاختبار زينة. (كشفه سقوطه أوّل مرّة.)
const ctx=await b.newContext({viewport:{width:420,height:900}});
await ctx.route('**/rest/v1/**',r=>r.fulfill({status:200,contentType:'application/json',body:'[]'}));
await ctx.route('**/functions/v1/**',r=>r.fulfill({status:200,contentType:'application/json',body:'{"ok":false}'}));
await ctx.addInitScript(()=>{
  Object.defineProperty(window,'speechSynthesis',{configurable:true,value:{
    speak(u){setTimeout(function(){u.onstart&&u.onstart()},0)},cancel(){},resume(){},pause(){},
    getVoices:()=>[{lang:'en-US',name:'X'}],speaking:false,pending:false}});
  window.SpeechSynthesisUtterance=function(t){this.text=t};
});
const mk=async(url)=>{
  const p=await ctx.newPage();
  p.on('pageerror',e=>{console.log('  ✗ PAGEERROR '+e.message);fails++});
  await p.goto(url);
  await p.waitForFunction(()=>typeof pkey==='function');
  return p;
};
try{

console.log('\n١) العزل: التجريب لا يكتب في مخزون الإنتاج');
{
  // الإنتاج يكتب قيمةً حقيقية
  const prod=await mk('http://127.0.0.1:8931/index.html');
  await prod.evaluate(()=>{localStorage.clear();lsSet("mawhiba_listen_srs",'{"REAL":1}')});
  const prodKeys=await prod.evaluate(()=>Object.keys(localStorage).sort());
  ok(prodKeys.indexOf("mawhiba_listen_srs")>=0,'الإنتاج يكتب بالمفتاح المعروف — '+prodKeys.join(','));

  // ثم التجريب يكتب قيمةً أخرى بنفس الاسم المنطقي
  const pv=await mk('http://127.0.0.1:8931/preview/index.html');
  await pv.evaluate(()=>lsSet("mawhiba_listen_srs",'{"PREVIEW":1}'));
  const all=await pv.evaluate(()=>{
    const o={};Object.keys(localStorage).forEach(function(k){o[k]=localStorage.getItem(k)});return o;});
  ok(all["pv::mawhiba_listen_srs"]==='{"PREVIEW":1}','والتجريب يكتب ببادئة pv:: — '+Object.keys(all).join(','));
  ok(all["mawhiba_listen_srs"]==='{"REAL":1}','**ومخزون الإنتاج لم يُمَسّ** — وهذا هو الخطر الذي بُني العزل له');

  // والقراءة من التجريب لا ترى قيمة الإنتاج ولا العكس
  ok(await pv.evaluate(()=>lsGet("mawhiba_listen_srs"))==='{"PREVIEW":1}','والتجريب يقرأ قيمته هو');
  ok(await prod.evaluate(()=>lsGet("mawhiba_listen_srs"))==='{"REAL":1}','والإنتاج يقرأ قيمته هو');
  await pv.close();await prod.close();
}

console.log('\n٢) وفصلُ الأبناء بعضهم عن بعض يبقى داخل التجريب — بادئةٌ فوق بادئة لا بدلها');
{
  const p=await mk('http://127.0.0.1:8931/preview/index.html?p=mohammed');
  const r=await p.evaluate(()=>({key:pkey("x"),id:profileId(),pv:isPreview()}));
  ok(r.pv===true,'يُعرَف أنه تجريب');
  ok(r.id==='mohammed','والهويّة من الرابط كما هي');
  ok(r.key==='pv::mohammed::x','والمفتاح يحمل الاثنين — '+r.key);
  await p.close();
  const q=await mk('http://127.0.0.1:8931/index.html?p=mohammed');
  ok(await q.evaluate(()=>pkey("x"))==='mohammed::x','وفي الإنتاج بلا بادئة تجريب');
  await q.close();
}

console.log('\n٣) الشارة ظاهرة في التجريب وغائبة عن الإنتاج — لا تُفتح نسخةٌ على أنها الأخرى');
{
  const p=await mk('http://127.0.0.1:8931/preview/index.html');
  ok(await p.isVisible('#pvBadge'),'الشارة ظاهرة');
  ok(/ليست نسخة الأبناء/.test(await p.textContent('#pvBadge')),'وتقولها صراحةً');
  await p.close();
  const q=await mk('http://127.0.0.1:8931/index.html');
  ok(!(await q.isVisible('#pvBadge')),'وغائبة عن الإنتاج — الأبناء لا يرونها');
  await q.close();
}

console.log('\n٤) وفحص النسخة يقارن التجريب بالتجريب — لا حلقةَ إعادة تحميل');
{
  // درس ١٨ أغسطس: بلاغٌ كاذب عن قِدَم النسخة = حلقةُ إعادة تحميل تسرق كل لمسة.
  // ولو بُني رابط الفحص من الجذر لقارن التجريبُ نفسه بالإنتاج فاختلف الطولان دائماً.
  const p=await ctx.newPage();
  const fetched=[];
  p.on('request',r=>{const u=r.url();if(/index\.html/.test(u))fetched.push(u)});
  await p.goto('http://127.0.0.1:8931/preview/index.html');
  await p.waitForFunction(()=>typeof pkey==='function');
  await p.waitForTimeout(1200);
  const outside=fetched.filter(u=>!/\/preview\//.test(u));
  ok(fetched.length>0,'جرى فحصُ النسخة فعلاً — '+fetched.length+' طلباً');
  ok(outside.length===0,'ولم يُطلب index.html خارج /preview — '+(outside[0]||'نظيف'));
  ok(!/_r=/.test(p.url()),'ولم تقع إعادة تحميل — '+p.url());
  await p.close();
}

console.log('\n٥) والإجراء نفسه: الجذر من main دائماً، والتجريب إضافةٌ لا شرط');
{
  const y=fs.readFileSync(path.join(ROOT,'.github/workflows/deploy-pages.yml'),'utf8');
  ok(/ref:\s*main/.test(y),'الجذر يُسحب من main صراحةً — لا من الفرع الذي أطلق التشغيل');
  ok(/path:\s*preview/.test(y),'وفرع التطوير في preview/');
  ok(/continue-on-error:\s*true/.test(y),'وفشلُ سحب الفرع لا يمنع نشر الإنتاج');
  // الوسم قبل النزع، وإلّا قرأ بصمة main فكذب على الفاحص
  ok(y.indexOf('Mark preview')<y.indexOf('Strip nested git metadata'),'والوسم قبل نزع git — وإلّا حمل بصمة main');
  ok(/rm -rf preview\/\.git/.test(y),'وتُنزَع بيانات git من القطعة المنشورة');
}

}finally{
  await b.close();
  rmPreview();          // لا يبقى أثرٌ في المستودع — وهو مُستثنًى في .gitignore كذلك
}
console.log(fails?`\n=== ${fails} فشل ===`:'\n=== كل الاختبارات نجحت ===');
process.exit(fails?1:0);
})();
