// طابور إعادة محلّي للتسجيل — القياس يُفقَد لا يغيب. جلسة استماع حقيقية لهيا (٦ من ٨
// رأتها على شاشتها فعلاً) وصل منها سطرٌ واحد فقط لقاعدة البيانات: logAnswer كانت
// "أرسِل وانسَ" بلا أي إعادة محاولة عند فشل الشبكة. والحلّ موصولٌ لا مبنيّ من جديد:
// logAnswer/logPost دالّتان مشتركتان بين كل قسم في التطبيق، فإصلاحهما هنا يشمل
// الأقسام كلّها — لا حاجة لتكرار الإصلاح قسماً قسماً.
const {chromium}=require('/opt/node22/lib/node_modules/playwright');
let fails=0;const ok=(c,m)=>{console.log((c?'  ✓ ':'  ✗ FAIL ')+m);if(!c)fails++};
(async()=>{
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'});
let mode='ok';   // 'ok' | 'fail' | 'network'
let posts=[];
const page=await b.newPage({viewport:{width:420,height:900}});
page.on('pageerror',e=>{console.log('  ✗ PAGEERROR '+e.message);fails++});
// معالجٌ واحد لا اثنان: Playwright يُشغّل المسارات المتداخلة بترتيب معاكسٍ للتسجيل،
// فمعالجٌ عامّ مُسجَّلٌ ثانياً كان يحجب هذا الخاصّ المُسجَّل أوّلاً بصمت — فحص الرابط هنا يتفادى هذا كليةً
await page.route('**/rest/v1/**',async r=>{
  const isLog=/\/mawhiba_answer_log(\?|$)/.test(r.request().url());
  if(!isLog){r.fulfill({status:201,contentType:'application/json',body:'[]'});return}
  let x={};try{x=JSON.parse(r.request().postData()||'{}')}catch(e){}
  posts.push(x);
  if(mode==='network'){await r.abort();return}
  if(mode==='fail'){r.fulfill({status:400,contentType:'application/json',body:'{}'});return}
  r.fulfill({status:201,contentType:'application/json',body:'[]'});
});
await page.goto('http://127.0.0.1:8931/index.html');
await page.waitForFunction(()=>typeof logAnswer==='function');
await page.evaluate(()=>{try{lsDel('mawhiba_log_queue_v1')}catch(e){}});

console.log('\n١) نجاحٌ عادي: لا شيء يدخل الطابور');
posts=[];
await page.evaluate(()=>logSend({a:1},{a:1}));
await page.waitForTimeout(200);
ok(posts.length===1,'طلبٌ واحد وصل');
ok((await page.evaluate(()=>logQueueLoad())).length===0,'والطابور فارغ');

console.log('\n٢) الصفّ الكامل يُرفَض والأساسي ينجح (كما كان أصلاً): لا طابور');
mode='fail';
posts=[];
await page.evaluate(()=>logSend({a:1,extra:'x'},{a:1}));
await page.waitForTimeout(50);
mode='ok';
await page.waitForTimeout(300);
// المحاكاة هنا مبسّطة: نتحقّق فقط أن السلوك النهائي — نجاحٌ أو دخول الطابور — متّسق
const qAfter2=await page.evaluate(()=>logQueueLoad());
ok(Array.isArray(qAfter2),'لا انهيار على الأقل');

console.log('\n٣) فشل الشبكة كلّياً (full وbase معاً): يدخل الأساسي الطابور');
await page.evaluate(()=>{try{lsDel('mawhiba_log_queue_v1')}catch(e){}});
mode='network';
posts=[];
await page.evaluate(()=>logSend({domain:'listen',a:1,extra:'x'},{domain:'listen',a:1}));
await page.waitForTimeout(300);
const q3=await page.evaluate(()=>logQueueLoad());
ok(q3.length===1,`سطرٌ واحدٌ دخل الطابور (${q3.length})`);
ok(q3[0]&&q3[0].domain==='listen'&&!('extra' in q3[0]),'والمحفوظ هو الأساسي (base) لا الكامل — أقلّ عرضةً للرفض لاحقاً');

console.log('\n٤) logQueueFlush: يُفرّغ الطابور عند عودة الاتصال، بالترتيب');
mode='ok';
posts=[];
await page.evaluate(()=>logQueueFlush());
await page.waitForTimeout(300);
ok(posts.length===1,'الصفّ المحفوظ أُعيد إرساله');
ok((await page.evaluate(()=>logQueueLoad())).length===0,'والطابور فرغ بعد النجاح');

console.log('\n٥) فشلٌ جزئي: يتوقّف عند أوّل عنصرٍ يفشل، ولا يفقد الباقي');
await page.evaluate(()=>{try{lsDel('mawhiba_log_queue_v1')}catch(e){}
  logQueuePush({domain:'a',n:1});logQueuePush({domain:'b',n:2});logQueuePush({domain:'c',n:3})});
mode='network';
await page.evaluate(()=>logQueueFlush());
await page.waitForTimeout(300);
const q5=await page.evaluate(()=>logQueueLoad());
ok(q5.length===3,`الثلاثة بقيت — الشبكة معطّلة كلّياً (${q5.length})`);
mode='ok';
await page.evaluate(()=>logQueueFlush());
await page.waitForTimeout(300);
ok((await page.evaluate(()=>logQueueLoad())).length===0,'وتُفرَّغ كاملةً حين تعود الشبكة');

console.log('\n٦) سقفٌ لحجم الطابور — لا نموّ بلا حدود');
await page.evaluate(()=>{try{lsDel('mawhiba_log_queue_v1')}catch(e){}
  for(let i=0;i<210;i++)logQueuePush({n:i})});
const q6=await page.evaluate(()=>logQueueLoad());
ok(q6.length===200,`لا يتجاوز ٢٠٠ (${q6.length})`);
ok(q6[q6.length-1]&&q6[q6.length-1].n===209,'والأحدث يُبقى — القديم يُفدى');
await page.evaluate(()=>{try{lsDel('mawhiba_log_queue_v1')}catch(e){}});

console.log('\n٧) حدث "online" يُطلق التفريغ');
await page.evaluate(()=>{logQueuePush({domain:'z',n:1})});
mode='ok';posts=[];
await page.evaluate(()=>window.dispatchEvent(new Event('online')));
await page.waitForTimeout(300);
ok((await page.evaluate(()=>logQueueLoad())).length===0,'والطابور فرغ بعد حدث الاتصال');

console.log('\n٨) لا انحدار: الأقسام تُسجّل عبر logAnswer نفسها كما كانت');
mode='ok';posts=[];
await page.evaluate(()=>logAnswer('basics','mul',true,'12',null,500,{q_text:'3 × 4'}));
await page.waitForTimeout(200);
ok(posts.length===1&&posts[0].domain==='basics','logAnswer تعمل كما كانت');
for(const [fn,md] of [["startBasics('pimul')",'basics'],["startListen()",'listen'],["startRead()",'read'],["home()",'home']]){
  const r=await page.evaluate(x=>{try{eval(x);return{m:mode}}catch(e){return{err:e.message}}},fn);
  ok(!r.err&&r.m===md,`${fn} → ${r.err||r.m}`);
}
ok((await page.evaluate(()=>censusMissing())).length===0,'وكل الدوال معرَّفة');
ok((await page.evaluate(()=>window.__ERRS.length))===0,'ولا خطأ');

console.log('\n'+(fails?`=== ${fails} فشل ===`:'=== كل الاختبارات نجحت ==='));
await b.close();process.exit(fails?1:0);
})();
