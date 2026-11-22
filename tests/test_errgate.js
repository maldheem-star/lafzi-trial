// ٢٢ نوفمبر: بوّابة التسرّع لبطاقات «سؤال عالق» (أرقام step:gap المستعارة)، وفصلُ السؤال المخلوط سطرين.
const {chromium}=require('/opt/node22/lib/node_modules/playwright');
let fails=0;const ok=(c,m)=>{console.log((c?'  ✓ ':'  ✗ FAIL ')+m);if(!c)fails++};
(async()=>{
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'});const p=await b.newPage({viewport:{width:390,height:900}});
p.on('pageerror',e=>{console.log('  ✗ PAGEERROR '+e.message);fails++});
await p.route('**/rest/v1/**',r=>r.fulfill({status:201,contentType:'application/json',body:'[]'}));
await p.route('**/functions/v1/**',r=>r.fulfill({status:200,contentType:'application/json',body:'{}'}));
await p.goto('http://127.0.0.1:8931/index.html');await p.waitForFunction(()=>typeof errGateStart==='function');
const r=await p.evaluate(()=>{
  localStorage.clear();
  const it={q:'اختاري الصحيح: "We ___ the train tomorrow."',c:['took','are taking','takes','taken'],a:1,w:'—'};
  errItems=[{kind:'item',key:'t1',it:it}];errIdx=0;errDone=false;errLocked=false;mode="errors";errGateStart();render();
  const o={secs:gateSecs,floor:SEC_GATE_FLOOR["step:gap"],cap:SEC_GATE_MAX["step:gap"],shut:!gateOpen()};
  errChoose(0);o.blocked=!errLocked;gateLeft=0;gateStop();errChoose(1);o.after=errLocked&&errOk;
  const qs=engPool().map(x=>x.q).filter(q=>q&&/["“]/.test(q)&&/[؀-ۿ]/.test(q));
  o.mixed=qs.length;o.split=qs.filter(q=>qMixHTML(q).indexOf('class="q-en"')>=0).length;
  o.plain=qMixHTML('ما ناتج ٣ + ٤؟')==='ما ناتج ٣ + ٤؟';
  return o});
ok(r.secs>=r.floor&&r.secs<=r.cap,'بوّابةٌ بين أرضيّة step:gap وسقفها — '+r.secs+'ث');
ok(r.shut&&r.blocked,'والنقرُ قبلها لا يُحتسب');
ok(r.after,'وبعدها يُحتسب');
ok(r.mixed>0&&r.split===r.mixed,'كلّ سؤالٍ مخلوطٍ في الخطة يُفصَل سطرين — '+r.split+' من '+r.mixed);
ok(r.plain,'والسؤالُ بلا تنصيصٍ إنجليزيّ يبقى كما هو');
await b.close();console.log(fails?'=== '+fails+' فشل ===':'=== كل الاختبارات نجحت ===');process.exit(fails?1:0);
})();
