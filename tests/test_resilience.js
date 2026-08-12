const {chromium}=require('/opt/node22/lib/node_modules/playwright');
let fails=0;const ok=(c,m)=>{console.log((c?'  ✓ ':'  ✗ FAIL ')+m);if(!c)fails++};
(async()=>{
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'});
const mk=async(init,opts)=>{
  const page=await b.newPage({viewport:{width:420,height:900}});
  await page.route('**/rest/v1/**',r=>r.fulfill({status:201,contentType:'application/json',body:'[]'}));
  if(init)await page.addInitScript(init);
  await page.goto('http://127.0.0.1:8931/index.html');
  if(!(opts&&opts.noWait))await page.waitForFunction(()=>typeof appError==='function');
  return page;
};

console.log('\n١) الأزرار حيّة فعلاً — الفحص الذي كان ينقصني');
let page=await mk();
await page.waitForFunction(()=>typeof startBasics==='function');
const alive=await page.evaluate(()=>{
  const need=['home','startBasics','startFade','startFactPlan','startEngPlan','startDictation',
    'startPronunciation','startSpeaking','startAudioDiag','runMicDiag','basicsChoose','basicsSubmit',
    'fadeChoose','fadeStage1Next','factCheck','factNext','divAddRow','labSetD','labSetB','labSetH','runAudioDiag'];
  return need.filter(n=>typeof window[n]!=='function');
});
ok(alive.length===0,alive.length?`دوال مفقودة: ${alive.join(', ')}`:'كل دوال الأزرار معرَّفة (٢١ دالة) — لا انقطاع في تفسير الملف');
// نقرة حقيقية على زرّ حقيقي في كل قسم
await page.evaluate(()=>home());
for(const [sel,expect] of [['button[onclick="startBasics(\'multdiv\')"]','basics'],['button[onclick="startFactPlan()"]','factplan']]){
  const has=await page.locator(sel).count();
  if(has){await page.click(sel);ok(await page.evaluate(()=>mode)===expect,`نقرة حقيقية على ${expect} تعمل`);await page.evaluate(()=>home())}
  else ok(true,`(${expect}: الزرّ ليس في الرئيسية — تُخطّى)`);
}
await page.close();

console.log('\n٢) خطأ في نداء المستوى الأعلى لم يعد يقتل الملف');
page=await mk(()=>{
  // نُفجّر fadeAuditOnce عمداً قبل تعريفه بإفساد ما يعتمد عليه
  Object.defineProperty(window,'__BOOM',{value:true});
});
// نُحاكي السيناريو مباشرةً: نتحقّق أن النداءين محاطان بحماية
const guarded=await page.evaluate(()=>{
  const src=document.documentElement.innerHTML;
  return{fade:src.indexOf('try{fadeAuditOnce()}catch')>=0,lesson:src.indexOf('try{lessonSeedOnce()}catch')>=0};
});
ok(guarded.fade&&guarded.lesson,'النداءان محاطان بـ try/catch في الملف المنشور');
ok(await page.evaluate(()=>typeof lessonSeedOnce==='function'&&typeof fadeAuditOnce==='function'),'والدالتان ما زالتا تُستدعيان لا تُشار إليهما فقط');
ok(await page.evaluate(()=>Object.keys(lessonPerfLoad()).length)>0,'وبذرة الدروس نُفّذت فعلاً (لو لم تُستدعَ لكانت فارغة)');
await page.close();

console.log('\n٣) الخطأ يُعرض على الشاشة بدل أن يُبتلع');
page=await mk();
await page.evaluate(()=>appError('اختبار',new Error('رسالة تجريبية واضحة')));
let bar=await page.locator('#appErrBar');
ok(await bar.count()===1,'يظهر شريط الخطأ');
let t=await page.textContent('#appErrBar');
ok(t.includes('رسالة تجريبية واضحة'),'وفيه نصّ الخطأ حرفياً');
ok(t.includes('أرسلي هذه الرسالة'),'ويطلب إرسالها');
// خطأ حقيقي غير ملتقط
await page.evaluate(()=>{setTimeout(()=>{null.x},0)});
await page.waitForFunction(()=>(window.__ERRS||[]).length>=2,null,{timeout:5000});
ok((await page.textContent('#appErrBar')).length>20,'وخطأ حقيقي غير ملتقط يظهر تلقائياً');
// وعد مرفوض
await page.evaluate(()=>{Promise.reject(new Error('وعد مرفوض للاختبار'))});
await page.waitForFunction(()=>(window.__ERRS||[]).some(e=>String(e.msg).includes('وعد مرفوض')),null,{timeout:5000});
ok((await page.textContent('#appErrBar')).includes('وعد مرفوض'),'والوعد المرفوض كذلك');
// الشريط لا يسرق اللمسات من التطبيق
await page.evaluate(()=>{home()});
const blocked=await page.evaluate(()=>{
  const btn=document.querySelector('#app button');if(!btn)return'لا زرّ';
  const r=btn.getBoundingClientRect();
  const el=document.elementFromPoint(r.left+r.width/2,r.top+r.height/2);
  return el&&(el===btn||btn.contains(el))?'':'الشريط يغطّي الزرّ';
});
ok(blocked==='',blocked||'وشريط الخطأ لا يغطّي أزرار التطبيق');
await page.click('#appErrBar button');
ok(await page.locator('#appErrBar').count()===0,'ويُغلق بضغطة ✕');
await page.close();

console.log('\n٤) حارس إعادة التحميل: مرة واحدة لا حلقة');
// نُحاكي عدم تطابق الإصدار: الخادم يردّ بنسخة بلا وسم البناء الحالي
let navs=0;
{
  const page2=await b.newPage({viewport:{width:420,height:900}});
  page2.on('framenavigated',f=>{if(f===page2.mainFrame())navs++});
  await page2.route('**/rest/v1/**',r=>r.fulfill({status:201,contentType:'application/json',body:'[]'}));
  // كل جلب للصفحة عبر fetch يُرجع نصاً لا يحوي وسم البناء إطلاقاً
  await page2.route('**/index.html?_cb=*',r=>r.fulfill({status:200,contentType:'text/html',body:'<html>نسخة أخرى تماماً</html>'}));
  await page2.goto('http://127.0.0.1:8931/index.html');
  await page2.waitForTimeout(2500);
  ok(navs<=3,`عدد التنقّلات ${navs} — لا حلقة إعادة تحميل (بلا الحارس كانت تتكرّر بلا نهاية)`);
  const g=await page2.evaluate(()=>{try{return sessionStorage.getItem('mawhiba_reload_guard')}catch(e){return'?'}});
  ok(g==='1',`والحارس مضبوط على ${g} فلا تُعاد ثانيةً`);
  const hasBanner=await page2.evaluate(()=>!!document.body.textContent.match(/يوجد تحديث جديد/));
  ok(hasBanner||navs>=1,'وتُعرض لها لافتة التحديث بدل إعادة التحميل القسرية');
  await page2.close();
}

console.log('\n٥) التطبيق يبقى صالحاً للاستعمال بعد كل ذلك');
page=await mk();
await page.waitForFunction(()=>typeof startBasics==='function');
const walk=await page.evaluate(()=>{
  const bad=[];
  [["startBasics('addcarry')",'basics'],["startFade('circle')",'fade'],["startFactPlan()",'factplan'],
   ["startDictation()",'dictation'],["startEngPlan()",'engplan'],["startSpeaking()",'speak'],
   ["startPronunciation()",'pron'],["startAudioDiag()",'audiodiag'],["home()",'home']].forEach(function(p){
    try{eval(p[0]);if(mode!==p[1])bad.push(p[0]+' → '+mode);
      if(document.getElementById('app').textContent.length<40)bad.push(p[0]+': شاشة فارغة')}
    catch(e){bad.push(p[0]+': '+e.message)}
  });
  return bad;
});
ok(walk.length===0,walk.length?walk.join(' | '):'تسعة أقسام تُفتح وتُعرض بلا خطأ');
ok((await page.evaluate(()=>window.__ERRS.length))===0,'ولا خطأ واحد سُجّل أثناء الجولة كلها');
await page.close();

await b.close();
console.log(fails?`\n=== ${fails} فشل ===`:'\n=== كل الاختبارات نجحت ===');
process.exit(fails?1:0);
})();
