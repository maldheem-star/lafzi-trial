// دروس A1 قبل أسئلة القواعد — ١٤ نوفمبر. يُثبت: كلّ درسٍ مربوطٌ بمهارةٍ موجودة في البنك،
// ويظهر فوق أسئلتها لا غيرها، وكلّ سطرٍ لغةٌ واحدة (الخليطُ قلب القوسَ والنقطة في أوّل صياغة)،
// والأمثلةُ ليست جملَ الأسئلة نفسها.
const {chromium}=require('/opt/node22/lib/node_modules/playwright');
let fails=0;const ok=(c,m)=>{console.log((c?'  ✓ ':'  ✗ FAIL ')+m);if(!c)fails++};
(async()=>{
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'});
const p=await b.newPage({viewport:{width:390,height:900}});
p.on('pageerror',e=>{console.log('  ✗ PAGEERROR '+e.message);fails++});
await p.route('**/rest/v1/**',r=>r.fulfill({status:201,contentType:'application/json',body:'[]'}));
await p.route('**/functions/v1/**',r=>r.fulfill({status:200,contentType:'application/json',body:'{}'}));
await p.goto('http://127.0.0.1:8931/index.html');await p.waitForFunction(()=>typeof startGram==='function');
const r=await p.evaluate(()=>{
  localStorage.clear();startGram();
  const bank=gramBankFor('A1'),sks=Object.keys(GRAM_A1_LESSONS),out={sks:sks.length,orphan:[],shown:[],leak:[],mixedAr:[],arInEx:[],notShown:[]};
  sks.forEach(function(sk){
    const its=bank.filter(x=>x.sk===sk);if(!its.length){out.orphan.push(sk);return}
    its.forEach(function(it){
      gramItems=[it];gramIdx=0;gramSetupRound();render();
      if(document.querySelector('.gram-lesson'))out.shown.push(it.id);
      const exs=GRAM_A1_LESSONS[sk].r.map(x=>x[1].replace(/<[^>]+>/g,''));
      it.c.forEach(function(c){if(exs.some(e=>e.indexOf(c.t.replace(/\.$/,''))>=0))out.leak.push(it.id)});
    });
    GRAM_A1_LESSONS[sk].r.forEach(function(x){
      // سطرُ القاعدة: كلمةٌ لاتينيةٌ واحدة على الأكثر، ولا لاتينيّ ملاصقٌ لعلامة ترقيم
      const lat=(x[0].match(/[A-Za-z’']+/g)||[]);
      if(lat.length>1||/[A-Za-z][.,:()]|[.,:()][A-Za-z]/.test(x[0]))out.mixedAr.push(sk+': '+x[0]);
      if(/[؀-ۿ]/.test(x[1]))out.arInEx.push(sk+': '+x[1]);
    });
  });
  bank.filter(x=>!GRAM_A1_LESSONS[x.sk]).forEach(function(it){gramItems=[it];gramIdx=0;gramSetupRound();render();
    if(document.querySelector('.gram-lesson'))out.notShown.push(it.id)});
  return out;
});
ok(r.sks===5,'خمسة دروس — '+r.sks);
ok(r.orphan.length===0,'كلّ درسٍ له أسئلةٌ في البنك — '+r.orphan.join(','));
ok(r.shown.length>=5,'ويظهر فوق أسئلة مهارته — '+r.shown.join(','));
ok(r.notShown.length===0,'ولا يظهر فوق مهارةٍ بلا درس — '+r.notShown.join(','));
ok(r.leak.length===0,'والأمثلةُ ليست جملَ الأسئلة — '+r.leak.join(','));
ok(r.mixedAr.length===0,'سطرُ القاعدة عربيّ (كلمةٌ لاتينية واحدة على الأكثر، بلا ترقيمٍ ملاصق) — '+r.mixedAr.join(' | '));
ok(r.arInEx.length===0,'وسطرُ المثال إنجليزيّ خالص — '+r.arInEx.join(' | '));
await b.close();
console.log(fails?'=== '+fails+' فشل ===':'=== كل الاختبارات نجحت ===');process.exit(fails?1:0);
})();
