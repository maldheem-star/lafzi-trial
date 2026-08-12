const {chromium}=require('/opt/node22/lib/node_modules/playwright');
let fails=0;const ok=(c,m)=>{console.log((c?'  ✓ ':'  ✗ FAIL ')+m);if(!c)fails++};
(async()=>{
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'});
const page=await b.newPage({viewport:{width:420,height:900}});
page.on('pageerror',e=>{console.log('  ✗ PAGEERROR '+e.message);fails++});
await page.route('**/rest/v1/**',r=>r.fulfill({status:201,contentType:'application/json',body:'[]'}));
await page.addInitScript(()=>{
  Object.defineProperty(window,'speechSynthesis',{configurable:true,value:{speak(){},cancel(){},resume(){},pause(){},getVoices:()=>[],speaking:false,pending:false}});
  window.SpeechSynthesisUtterance=function(t){this.text=t};
});
await page.goto('http://127.0.0.1:8931/index.html');
await page.waitForFunction(()=>typeof hardReload==='function');

console.log('\n١) رقم النسخة ظاهر على الشاشة');
const bld=await page.evaluate(()=>window.__BUILD);
ok(/^build-\d{8}-\d{4}$/.test(bld||''),`رقم البناء مكشوف للتطبيق: ${bld}`);
await page.evaluate(()=>startAudioDiag());
let t=await page.textContent('#app');
ok(t.includes(bld),'ومطبوع في شاشة التشخيص حرفياً');
ok(t.includes('النسخة التي تعمل الآن'),'بعنوان واضح');
ok(t.includes('نسخة مخزّنة'),'مع تفسير معنى عدم المطابقة');

console.log('\n٢) القسمان الجديدان حاضران فعلاً');
ok(t.includes('تعداد الدوال')||t.includes('كل دوال التطبيق'),'تعداد الدوال معروض');
ok(t.includes('اختبار زرّ التسجيل'),'واختبار التسجيل معروض');
ok(t.includes('تشخيص الميكروفون')&&t.includes('تشخيص الصوت'),'والقسمان القديمان باقيان');

console.log('\n٣) التحديث القسري');
ok(await page.evaluate(()=>typeof hardReload)==='function','الدالة معرَّفة');
ok(t.includes('تحديث قسري'),'وزرّه ظاهر');
const before=page.url();
await page.click('button[onclick="hardReload()"]');
await page.waitForFunction(u=>location.href!==u,before,{timeout:5000});
ok(/\?_r=\d+/.test(page.url()),`ينتقل لرابط جديد يتخطّى التخزين (${page.url().split('/').pop()})`);
await page.waitForFunction(()=>typeof hardReload==='function');
ok(await page.evaluate(()=>{try{return sessionStorage.getItem('mawhiba_reload_guard')}catch(e){return'?'}})===null,'ويُصفّر حارس إعادة التحميل');
ok((await page.evaluate(()=>window.__ERRS.length))===0,'ولا خطأ');

console.log('\n٤) لا انحدار');
for(const [fn,md] of [["startPronunciation()",'pron'],["startBasics('pimul3')",'basics'],["startFactPlan()",'factplan'],["home()",'home']]){
  const r=await page.evaluate(x=>{try{eval(x);return{m:mode}}catch(e){return{err:e.message}}},fn);
  ok(!r.err&&r.m===md,`${fn} → ${r.err||r.m}`);
}
await b.close();
console.log(fails?`\n=== ${fails} فشل ===`:'\n=== كل الاختبارات نجحت ===');
process.exit(fails?1:0);
})();
