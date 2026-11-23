// ٢٣ نوفمبر: (١) الكتابة لا تحتسب نصّاً تتكرّر فيه خمسُ كلماتٍ متتالية مرّتين — وقِيس على نصوص هيا الحيّة،
// (٢) الإملاء يعرض معنى الكلمة بالعربية مع السمّاعة.
const {chromium}=require('/opt/node22/lib/node_modules/playwright');
let fails=0;const ok=(c,m)=>{console.log((c?'  ✓ ':'  ✗ FAIL ')+m);if(!c)fails++};
(async()=>{
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'});const p=await b.newPage({viewport:{width:390,height:900}});
p.on('pageerror',e=>{console.log('  ✗ PAGEERROR '+e.message);fails++});
await p.route('**/rest/v1/**',r=>r.fulfill({status:201,contentType:'application/json',body:'[]'}));
await p.route('**/functions/v1/**',r=>r.fulfill({status:200,contentType:'application/json',body:'{}'}));
await p.goto('http://127.0.0.1:8931/index.html');await p.waitForFunction(()=>typeof writeLoopCheck==='function');
const r=await p.evaluate(()=>{
  const loops=["But I love you too baby girl I love you too baby girl I love you too baby girl I love you",
   "And get the rest of the day off and get the rest of the day off and get the rest of the day off and get the rest",
   "Rest of the day off and get the rest of the day off and",
   "My best friend isn't that the day off and get the rest of the day off and get the rest of the day off and get",
   "I go to school athletics staff directory and get the rest of the day off and get the rest of the day off",
   "You too baby girl I love you my friend I you too baby girl I love you too baby girl I love you too"];
  const legit=["I like to play football. I like to play tennis. I like to play chess.","My name is Haya and my name is Haya",
   "I go to school every day. I go to school by bus. I go to school with my sister.","In my family, there are I love you very family and mom or dad to Grandma your brother",
   "Today the weather is love and Lovato is a bit of","My best friend is Haya. She likes drawing and she likes swimming."];
  const o={loops:loops.filter(writeLoopCheck).length,loopsN:loops.length,legit:legit.filter(writeLoopCheck).length,legitN:legit.length};
  localStorage.clear();startDictation();const w=dictSession.findIndex(x=>!x.build);dictIdx=w;render();
  o.mean=!!document.querySelector('.dict-mean')&&/معناها:/.test(document.querySelector('.dict-mean').textContent);
  o.wordsAll=dictSession.filter(x=>!x.build).every(x=>!!x.m);
  return o});
ok(r.loops===r.loopsN,'كلّ الحلقات الحيّة تُكتشف — '+r.loops+'/'+r.loopsN);
ok(r.legit===0,'ولا نصّاً مشروعاً (إطارٌ متكرّر/جملة قصيرة) — '+r.legit+'/'+r.legitN);
ok(r.mean&&r.wordsAll,'والإملاء يعرض «معناها:» لكلّ كلمة');
await b.close();console.log(fails?'=== '+fails+' فشل ===':'=== كل الاختبارات نجحت ===');process.exit(fails?1:0);
})();
