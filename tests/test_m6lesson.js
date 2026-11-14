// تدريبٌ على درسٍ بعينه في رياضيات السادس — ١٤ نوفمبر. الجلسة المجدولة لا تضمن
// ظهور درسٍ تحتاجه الآن (٩-٣ لم يظهر منذ ١٦ سبتمبر وورقة المدرسة فيه).
const {chromium}=require('/opt/node22/lib/node_modules/playwright');
let fails=0;const ok=(c,m)=>{console.log((c?'  ✓ ':'  ✗ FAIL ')+m);if(!c)fails++};
(async()=>{
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'});
const p=await b.newPage({viewport:{width:390,height:844}});
const posted=[];p.on('pageerror',e=>{console.log('  ✗ PAGEERROR '+e.message);fails++});
// في Playwright يتقدّم المسارُ المسجَّل أخيراً — فالعامّ أوّلاً والخاصّ بعده
await p.route('**/rest/v1/**',r=>r.fulfill({status:201,contentType:'application/json',body:'[]'}));
await p.route('**/rest/v1/mawhiba_answer_log**',r=>{try{posted.push(JSON.parse(r.request().postData()||'{}'))}catch(e){};r.fulfill({status:201,body:''})});
await p.route('**/functions/v1/**',r=>r.fulfill({status:200,contentType:'application/json',body:'{}'}));
await p.goto('http://127.0.0.1:8931/index.html');await p.waitForFunction(()=>typeof goMath6Menu==='function');
await p.evaluate(()=>{localStorage.clear();goMath6Menu()});await p.waitForTimeout(200);
const m=await p.evaluate(()=>({btn:document.querySelectorAll('.m6-lesson-btn').length,
  withGen:math6Lessons().filter(l=>math6Ready().some(r=>r.id===l.id)).length,
  has39:!!document.querySelector('.m6-lesson-btn[onclick*="m3_9"]')}));
ok(m.btn===m.withGen,'زرّ تدريبٍ لكل درسٍ له مولّد — '+m.btn+' من '+m.withGen);
ok(m.has39,'ومنها ٩-٣ القسمة على كسر عشري');
await p.click('.m6-lesson-btn[onclick*="m3_9"]');await p.waitForTimeout(150);
const s=await p.evaluate(()=>({n:math6Items.length,N:MATH6_N,ids:[...new Set(math6Items.map(i=>i._l.id))],uniq:new Set(math6Items.map(i=>i.q)).size}));
ok(s.n===s.N,'الجلسة '+s.n+' أسئلة = MATH6_N');
ok(s.ids.length===1&&s.ids[0]==='m3_9','كلّها من الدرس نفسه — '+s.ids.join(','));
ok(s.uniq===s.n,'ولا سؤالَ مكرّر — '+s.uniq);
for(let i=0;i<s.n;i++){
  await p.evaluate(()=>{gateLeft=0;gateStop();render()});
  await p.evaluate(()=>{document.querySelectorAll('.choice')[math6Cur().a].click()});await p.waitForTimeout(30);
  await p.evaluate(()=>{if(!math6Done)math6Next()});await p.waitForTimeout(30);
}
await p.waitForTimeout(200);
const e=await p.evaluate(()=>({done:math6Done,score:math6Score,seen:(JSON.parse(localStorage.getItem(MATH6_SRS_KEY)||'{}').m3_9||{}).seen,
  again:/startMath6Lesson\('m3_9'\)/.test(app.innerHTML),rowsQ:(app.innerHTML.match(/÷/g)||[]).length}));
ok(e.done&&e.score===s.n,'تنتهي وتُحتسب كلّها — '+e.score);
ok(e.seen===1,'والتباعدُ يُحدَّث بأوّل إجابةٍ وحدها (seen='+e.seen+') — لا ست مراجعاتٍ في دقيقة');
ok(e.again,'وزرُّ النتيجة يعيد الدرس نفسه');
ok(e.rowsQ>=s.n,'وسطرُ النتيجة يعرض السؤال لا اسم الدرس مكرّراً');
const mine=posted.filter(x=>x.domain==='math6');
ok(mine.length===s.n&&mine.every(x=>x.item_id==='m3_9'),'وسطرُ تسجيلٍ لكل إجابة بمعرّف الدرس — '+mine.length);
await p.evaluate(()=>startMath6(''));
ok(await p.evaluate(()=>math6LessonId===''),'والجلسةُ المجدولة بعدها تعود مجدولة');
await b.close();
console.log(fails?'=== '+fails+' فشل ===':'=== كل الاختبارات نجحت ===');process.exit(fails?1:0);
})();
