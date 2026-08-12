const {chromium}=require('/opt/node22/lib/node_modules/playwright');
let fails=0;const ok=(c,m)=>{console.log((c?'  ✓ ':'  ✗ FAIL ')+m);if(!c)fails++};
(async()=>{
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'});
const page=await b.newPage({viewport:{width:420,height:900}});
page.on('pageerror',e=>{console.log('  ✗ PAGEERROR '+e.message);fails++});
page.on('dialog',d=>d.dismiss());
await page.route('**/rest/v1/**',r=>r.fulfill({status:201,contentType:'application/json',body:'[]'}));
await page.goto('http://127.0.0.1:8931/index.html');
await page.waitForFunction(()=>typeof copyAzRaw==='function');

// ردّ Azure الحقيقي كما وصفه العطل: نجاح، ونصّ صحيح، ومصفوفة كلمات بلا تقييم
const RAW='{"RecognitionStatus":"Success","Offset":4600000,"Duration":7300000,"DisplayText":"Gate.","NBest":[{"Confidence":0.93,"Lexical":"gate","ITN":"gate","MaskedITN":"gate","Display":"Gate.","Words":[{"Word":"gate","Offset":4600000,"Duration":7300000}]}]}';

console.log('\n١) التشخيص يعرض الردّ الخام حين يغيب التقييم');
await page.evaluate(raw=>{
  startAudioDiag();
  azDiag={fail:"azure_no_assessment",detail:"Confidence,Lexical,ITN,MaskedITN,Display,Words",bytes:95152,
    info:{noAssessment:true,heard:"Gate.",lexical:"gate",nbestKeys:["Confidence","Lexical","ITN","MaskedITN","Display","Words"],
      hasWords:1,raw:raw,region:"centralindia"}};
  render();
},RAW);
let t=await page.textContent('#app');
ok(t.includes('ردّ Azure الخام'),'العنوان ظاهر');
ok(t.includes('موجودة (١ كلمة) بلا درجات'),'ويقول صراحةً إن مصفوفة الكلمات موجودة بلا درجات — وهذا ما كان استنتاجاً');
ok(t.includes('MaskedITN'),'ومفاتيح NBest معروضة');
ok(t.includes('"RecognitionStatus":"Success"'),'والردّ الخام نفسه معروض حرفياً');
ok(t.includes('Gate.'),'وفيه ما سمعه');
ok(!t.includes('&quot;'),'والتهريب لا يتسرّب إلى الشاشة');

console.log('\n٢) الحالة المقابلة: مصفوفة غائبة');
await page.evaluate(raw=>{azDiag.info.hasWords=0;render()},RAW);
ok((await page.textContent('#app')).includes('غائبة'),'يقولها كما هي لا كما نتمنّى');

console.log('\n٣) النسخ يعمل ولا يرمي خطأً');
await page.evaluate(()=>{azDiag.info.hasWords=1;render()});
await page.click('button[onclick="copyAzRaw()"]');
await page.waitForTimeout(300);
ok(await page.evaluate(()=>window.__ERRS.length)===0,'زرّ النسخ بلا خطأ');

console.log('\n٤) لا يظهر الصندوق في الأعطال الأخرى');
for(const f of ['not_configured','azure_auth','azure_unreachable','wav_empty']){
  await page.evaluate(x=>{azDiag={fail:x,bytes:100,info:{region:"centralindia",keyRawLength:32,keyCleanLength:32,keyBad:[]}};render()},f);
  ok(!(await page.textContent('#app')).includes('ردّ Azure الخام'),`${f}: لا صندوق خام`);
}
// ولا حين ينجح
await page.evaluate(()=>{azDiag={ok:true,bytes:95152,pron:100,heard:"Hello.",rate:16000};render()});
ok(!(await page.textContent('#app')).includes('ردّ Azure الخام'),'وعند النجاح كذلك');

console.log('\n٥) التهريب نفسه');
const e=await page.evaluate(()=>[esc('<script>x</script>'),esc('a"b&c'),esc(null),esc(undefined)]);
ok(e[0]==='&lt;script&gt;x&lt;/script&gt;','الوسوم تُهرَّب');
ok(e[1]==='a&quot;b&amp;c','والاقتباس والعطف');
ok(e[2]===''&&e[3]==='','والفارغ لا يكسر');

console.log('\n٦) لا انحدار');
for(const [fn,md] of [["startBasics('percent')",'basics'],["startBasics('multdiv')",'basics'],["startFactPlan()",'factplan'],
  ["startEngPlan()",'engplan'],["startDictation()",'dictation'],["startPronunciation()",'pron'],
  ["startFade('circle')",'fade'],["startAudioDiag()",'audiodiag'],["home()",'home']]){
  const r=await page.evaluate(x=>{try{eval(x);return{m:mode,len:document.getElementById('app').textContent.length}}catch(e){return{err:e.message}}},fn);
  ok(!r.err&&r.m===md&&r.len>40,`${fn} → ${r.err||r.m}`);
}
ok((await page.evaluate(()=>censusMissing())).length===0,'وكل الدوال معرَّفة');
ok((await page.evaluate(()=>window.__ERRS.length))===0,'ولا خطأ');

await b.close();
console.log(fails?`\n=== ${fails} فشل ===`:'\n=== كل الاختبارات نجحت ===');
process.exit(fails?1:0);
})();
