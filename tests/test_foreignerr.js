// عطلٌ أجنبيّ لا يرفع الشريط الأحمر — ٧ نوفمبر (قرار صاحب المشروع: «أخف الشريط»)
//
// `xbrowser is not defined` صفرُ مرّةٍ في مستودعنا: سكربتٌ يحقنه متصفّحُ التطبيق المدمج
// على جهاز هيا. وظهر الشريطُ في أربع جلساتٍ من أربع منذ ٢٧ أكتوبر، وكلُّها انتهت مبكراً.
// فيُخفى الشريطُ لهذا الخطأ بعينه، **ويبقى السطرُ في السجلّ موسوماً** — ولا يُخفى غيرُه.
//
// والعطلُ يُحاكى كما يقع فعلاً: سكربتٌ مستقلّ يُحقَن ويرمي خطأً غيرَ ملتقط (حدث error
// الحقيقي)، لا نداءٌ مباشر لـ appError — وإلّا قاس الاختبارُ الدالّةَ لا المسارَ الحيّ.
const {chromium}=require('/opt/node22/lib/node_modules/playwright');
let pass=0,fail=0;
const ok=(c,m)=>{c?(pass++,console.log('  ✓ '+m)):(fail++,console.log('  ✗ FAIL '+m))};
const BASE='http://127.0.0.1:8931/';

(async()=>{
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'});
const mk=async()=>{
  const ctx=await b.newContext({viewport:{width:420,height:900}});
  const p=await ctx.newPage();
  const rows=[];
  await p.route('**/functions/v1/**',r=>r.fulfill({status:200,contentType:'application/json',body:'{}'}));
  await p.route('**/rest/v1/**',r=>{
    try{const d=r.request().postData();if(d){const j=JSON.parse(d);
      (Array.isArray(j)?j:[j]).forEach(x=>rows.push(x))}}catch(e){}
    r.fulfill({status:200,contentType:'application/json',body:'[]'});
  });
  await p.goto(BASE+'index.html',{waitUntil:'domcontentloaded'});
  await p.waitForFunction(()=>typeof render==='function'&&typeof logAnswer==='function',{timeout:20000});
  await p.waitForTimeout(400);
  rows.length=0;
  return {p,rows,ctx};
};
const inject=(p,code)=>p.evaluate(c=>{const s=document.createElement('script');s.textContent=c;document.body.appendChild(s)},code);
const barN=p=>p.evaluate(()=>document.querySelectorAll('#appErrBar').length);
const waitRows=async(rows,pred,ms=3000)=>{const t0=Date.now();while(Date.now()-t0<ms){if(rows.some(pred))return true;await new Promise(r=>setTimeout(r,100))}return rows.some(pred)};

console.log('١) الخطأ الأجنبيّ بنصّه الحيّ: لا شريط، والسطرُ يصل موسوماً');
{
  const {p,rows,ctx}=await mk();
  await inject(p,'xbrowser.init()');           // يرمي: ReferenceError: xbrowser is not defined
  const got=await waitRows(rows,x=>x.qtype==='app_error');
  ok(await barN(p)===0,'لا شريطَ أحمر');
  ok(got,'وسطرُ العطل وصل الجدول');
  const r=rows.find(x=>x.qtype==='app_error')||{};
  ok(/xbrowser is not defined/.test(r.q_text||''),'بنصّ الخطأ');
  ok(/مخفيّ:أجنبيّ/.test(r.q_text||''),'وموسوماً «مخفيّ:أجنبيّ»');
  ok(await p.evaluate(()=>window.__ERRS.length)===0,'ولا يدخل قائمةَ الشريط');
  await ctx.close();
}

console.log('\n٢) خطأٌ منّا بعده يرفع الشريط — ولا يحمل السطرَ الأجنبيّ');
{
  const {p,rows,ctx}=await mk();
  await inject(p,'xbrowser.init()');
  await inject(p,'null.x');
  await p.waitForFunction(()=>document.getElementById('appErrBar'),null,{timeout:5000}).catch(()=>{});
  ok(await barN(p)===1,'الشريطُ ظاهرٌ لخطأٍ حقيقي');
  const t=await p.evaluate(()=>{const d=document.getElementById('appErrBar');return d?d.innerText:''});
  ok(!/xbrowser/.test(t),'وليس فيه سطرُ xbrowser');
  await waitRows(rows,x=>x.qtype==='app_error'&&!/xbrowser/.test(x.q_text||''));
  const own=rows.find(x=>x.qtype==='app_error'&&!/xbrowser/.test(x.q_text||''))||{};
  ok(own.q_text&&!/مخفيّ/.test(own.q_text),'وسطرُ الخطأ الحقيقي غيرُ موسومٍ مخفيّاً');
  await ctx.close();
}

console.log('\n٣) القائمة مغلقة: رسالةٌ تشبهها ولا تطابقها تبقى ظاهرة');
{
  const {p,ctx}=await mk();
  await inject(p,'xbrowserX.init()');          // اسمٌ آخر — ليس المحقونَ المرصود
  await p.waitForFunction(()=>document.getElementById('appErrBar'),null,{timeout:5000}).catch(()=>{});
  ok(await barN(p)===1,'xbrowserX يرفع الشريط — لا إخفاءَ بالتشابه');
  await ctx.close();
}

await b.close();
console.log(`\n${fail?'✗ FAIL':'✓'} ${pass} نجحت · ${fail} فشلت`);
process.exit(fail?1:0);
})();
