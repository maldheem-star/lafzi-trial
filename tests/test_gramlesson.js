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
    const its=bank.filter(x=>gramSkNorm(x.sk)===sk);if(!its.length){out.orphan.push(sk);return}
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
  bank.filter(x=>!gramLessonOf(x)).forEach(function(it){gramItems=[it];gramIdx=0;gramSetupRound();render();
    if(document.querySelector('.gram-lesson'))out.notShown.push(it.id)});
  out.norm=['الفعل “be”','الفعل "be"',"الفعل 'be'",'اتفاق الفعل مع الفاعل','«المضارع البسيط مع -s»'].every(function(k){return !!gramLessonOf({sk:k})});
  out.normEx=gramSkNorm('الفعل “be”')+' · '+gramSkNorm('اتفاق الفعل مع الفاعل');
  return out;
});
ok(r.sks>=5,'دروسٌ للمهارات — '+r.sks);
  ok(r.norm,'وأسماءُ المولَّد تُوحَّد: '+r.normEx);
ok(r.orphan.length===0,'كلّ درسٍ له أسئلةٌ في البنك — '+r.orphan.join(','));
ok(r.shown.length>=5,'ويظهر فوق أسئلة مهارته — '+r.shown.join(','));
ok(r.notShown.length===0,'ولا يظهر فوق مهارةٍ بلا درس — '+r.notShown.join(','));
ok(r.leak.length===0,'والأمثلةُ ليست جملَ الأسئلة — '+r.leak.join(','));
ok(r.mixedAr.length===0,'سطرُ القاعدة عربيّ (كلمةٌ لاتينية واحدة على الأكثر، بلا ترقيمٍ ملاصق) — '+r.mixedAr.join(' | '));
ok(r.arInEx.length===0,'وسطرُ المثال إنجليزيّ خالص — '+r.arInEx.join(' | '));
// ٢) السطرُ يحمل المهارةَ وظهورَ الدرس — بلاهما لا يُقاس الأثر
{
  const posted=[];
  await p.route('**/rest/v1/mawhiba_answer_log**',r=>{try{posted.push(JSON.parse(r.request().postData()||'{}'))}catch(e){};r.fulfill({status:201,body:''})});
  for(const id of ['gr_a1_1','gr_a1_13']){
    await p.evaluate(id=>{startGram();gramItems=[gramBankFor('A1').find(x=>x.id===id)];gramIdx=0;gramSetupRound();gateLeft=0;gateStop();render();
      gramAckLesson();document.querySelectorAll('.choice')[0].click()},id);
    await p.waitForTimeout(150);
  }
  const g=posted.filter(x=>x.domain==='gram');
  const a=g.find(x=>x.item_id==='gr_a1_1')||{},c=g.find(x=>x.item_id==='gr_a1_13')||{};
  ok(/مهارة:تصريف الغائب · درس:ظهر/.test(a.response||''),'سطرُ مهارةٍ لها درس: '+(a.response||'—').slice(-40));
  ok(/مهارة:can · درس:لا/.test(c.response||''),'وسطرُ مهارةٍ بلا درس: '+(c.response||'—').slice(-40));
}
// ٣) «فهمت القاعدة»: الخيارات لا تظهر قبل الضغطة، والضغطةُ لا تعمل قبل انتهاء البوّابة، وبلا درسٍ تظهر مباشرة
{
  const r=await p.evaluate(()=>{
    const bank=gramBankFor('A1'),withL=bank.find(x=>x.sk==='تصريف الغائب'),noL=bank.find(x=>!gramLessonOf(x));
    const o={};
    startGram();gramItems=[withL];gramIdx=0;gramSetupRound();render();
    o.noChoicesGated=document.querySelectorAll('.choice').length===0;o.btnDisabled=!!document.querySelector('button[onclick="gramAckLesson()"][disabled]');
    gramAckLesson();o.stillHidden=document.querySelectorAll('.choice').length===0;
    gateLeft=0;gateStop();render();o.btnEnabled=!document.querySelector('button[onclick="gramAckLesson()"][disabled]');
    gramAckLesson();o.shownAfter=document.querySelectorAll('.choice').length===4;
    gramItems=[noL];gramIdx=0;gramSetupRound();gateLeft=0;gateStop();render();o.noLessonDirect=document.querySelectorAll('.choice').length===4&&!document.querySelector('button[onclick="gramAckLesson()"]');
    o.skills=['المضارع المستمرّ','there is / there are'].every(k=>!!GRAM_A1_LESSONS[k])&&!!gramLessonOf({sk:'«الفعل مع -s»'});
    return o});
  ok(r.noChoicesGated&&r.btnDisabled,'بدرسٍ: لا خيارات والزرّ معطَّلٌ ما دامت البوّابة');
  ok(r.stillHidden,'والضغطةُ قبل انتهاء البوّابة لا تُظهرها');
  ok(r.btnEnabled&&r.shownAfter,'وبعد انتهائها وضغطةِ «فهمت» تظهر الجمل الأربع');
  ok(r.noLessonDirect,'وبلا درسٍ تظهر الخيارات مباشرة بلا زرّ');
  ok(r.skills,'ودرسا المضارع المستمرّ وthere is/are و«الفعل مع -s» موصولة');
}
await b.close();
console.log(fails?'=== '+fails+' فشل ===':'=== كل الاختبارات نجحت ===');process.exit(fails?1:0);
})();
