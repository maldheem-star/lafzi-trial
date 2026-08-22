// فهم المقروء: نفس بنية الاستماع بالضبط، نصٌّ بدل صوت — طلب صاحب المشروع إضافتها
// للثلاثة (١٦ أغسطس). لا شيء كان يقيس فهم نصٍّ مكتوب بلا نسخه حرفياً أو إنتاجه.
// نفس الصيغة المعياريّة (Cambridge YLE/KET/PET، TOEFL Junior)، ونفس التباعد (fsrsUpdate)،
// ونفس مراجعة البنك الحرّة عند الاستنفاد — مبنيّة من أوّل يوم لا بعد شكوى كما الاستماع.
// بوّابة التسرّع (٢٢ أغسطس) تمنع النقر قبل زمنٍ أدنى، وهذه الاختبارات تنقر فوراً.
// فتُنهي العدّ أوّلاً — كما ينتظر المتعلّم — ثم تختار: gateLeft=0;gateStop().
// وهذا لا يُعطّل البوّابة ولا يُخفي انحدارها؛ فحصها نفسه في tests/test_rapidgate.js.
const {chromium}=require('/opt/node22/lib/node_modules/playwright');
let fails=0;const ok=(c,m)=>{console.log((c?'  ✓ ':'  ✗ FAIL ')+m);if(!c)fails++};
(async()=>{
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'});
let logs=[];
const mk=async(f)=>{
  const page=await b.newPage({viewport:{width:420,height:900}});
  page.on('pageerror',e=>{console.log('  ✗ PAGEERROR '+e.message);fails++});
  await page.route('**/rest/v1/**',async r=>{
    let x={};try{x=JSON.parse(r.request().postData()||'{}')}catch(e){}
    logs.push(x);r.fulfill({status:201,contentType:'application/json',body:'[]'});
  });
  await page.goto('http://127.0.0.1:8931/'+(f||'index.html'));
  await page.waitForFunction(()=>typeof startRead==='function');
  return page;
};

console.log('\n١) كل متعلّم يرى بنك مستواه هو');
let page=await mk();
const banks=await page.evaluate(()=>({
  a1:readBankFor('A1').every(x=>x.lv==='A1'),
  a2:readBankFor('A2').every(x=>x.lv==='A2'),
  b1:readBankFor('B1').every(x=>x.lv==='B1'),
  n:{a1:readBankFor('A1').length,a2:readBankFor('A2').length,b1:readBankFor('B1').length},
}));
ok(banks.a1&&banks.a2&&banks.b1,'لا اختلاط بين المستويات');
ok(banks.n.a1>=8&&banks.n.a2>=8&&banks.n.b1>=5,`ولكلٍّ بنكٌ كافٍ (${JSON.stringify(banks.n)})`);
const shape=await page.evaluate(()=>READ_BANK.every(x=>x.passage&&x.q&&Array.isArray(x.c)&&x.c.length>=3&&x.a>=0&&x.a<x.c.length));
ok(shape,'وكل عنصر بشكل سليم (نصٌّ وسؤالٌ وخياراتٌ وصوابٌ داخلها)');

console.log('\n٢) النصّ يبقى مرئياً أثناء الإجابة — خلاف الصوت العابر، لا حاجة لزرّ إعادة');
await page.evaluate(()=>startRead());
let t=await page.textContent('#app');
const it0=await page.evaluate(()=>readCur());
ok(t.includes(it0.passage.slice(0,20)),'النصّ ظاهرٌ على الشاشة');
await page.evaluate(()=>{const it=readCur();gateLeft=0;gateStop();readChoose(it.a)});
t=await page.textContent('#app');
ok(t.includes(it0.passage.slice(0,20)),'وما زال ظاهراً بعد الإجابة — يمكن مراجعته');
ok(!t.includes('🔊'),'ولا زرّ استماع هنا — نصٌّ لا صوت');

console.log('\n٣) الإجابة تُحتسب وتُسجَّل');
logs=[];
page=await mk();
const r=await page.evaluate(()=>{startRead();const it=readCur();gateLeft=0;gateStop();readChoose(it.a);return {picked:readPicked,ok:readPicked===it.a,score:readScore}});
ok(r.ok&&r.score===1,'الإجابة الصحيحة تُحتسب');
await page.waitForTimeout(300);
const row=logs.find(l=>l.domain==='read');
ok(!!row,'سطرٌ وصل الخادم');
ok(row&&row.qtype==='A1','والمستوى في qtype — يُجمَّع بالاستعلام');

console.log('\n٤) التباعد: FSRS، لا سلّمٌ جديد');
const srs=await page.evaluate(()=>{
  const id=readItems[readIdx].id;
  readSrsUpdate(id,true);
  const st=JSON.parse(lsGet('mawhiba_read_srs')||'{}');
  return {hasDue:!!st[id]&&st[id].due>srsToday(),hasS:typeof st[id].s==='number'};
});
ok(srs.hasDue&&srs.hasS,'يُجدوَل بـfsrsUpdate نفسها — لا خوارزمية جديدة');

console.log('\n٥) بنكٌ مستنفَد كلّه — مراجعة حرّة من أوّل يوم، لا بعد شكوى كما الاستماع');
const out=await page.evaluate(()=>{
  const POOL=readBankFor('A1');
  const st={};
  POOL.forEach(i=>{st[i.id]={box:2,due:srsToday()+30,seen:3}});
  lsSet(READ_SRS_KEY,JSON.stringify(st));
  return buildReadPlan();
});
ok(out.length>0,`buildReadPlan لا تعود فارغة (${out.length} عنصراً)`);
await page.evaluate(()=>{try{lsDel('mawhiba_read_srs')}catch(e){}});

console.log('\n٥ب) نقصٌ لا خواءٌ تامّ — عنصرٌ مستحقٌّ واحد لا يُنتج جلسةً من سؤالٍ واحد (طلب صاحب المشروع، ١٨ أغسطس)');
const partial=await page.evaluate(()=>{
  const POOL=readBankFor('A1');
  const st={};
  POOL.forEach((i,idx)=>{st[i.id]={box:idx===0?0:2,due:idx===0?srsToday():srsToday()+30,seen:idx===0?0:3}});
  lsSet(READ_SRS_KEY,JSON.stringify(st));
  return {plan:buildReadPlan(),want:Math.min(READ_N,POOL.length)};
});
ok(partial.plan.length===partial.want,
  `عنصرٌ واحد مستحقّ ⇐ جلسةٌ كاملة (${partial.plan.length} من ${partial.want})، لا سؤالٌ واحد`);
ok(new Set(partial.plan.map(i=>i.id)).size===partial.plan.length,'بلا تكرار عنصرٍ مرّتين في نفس الجلسة');
await page.evaluate(()=>{try{lsDel('mawhiba_read_srs')}catch(e){}});

console.log('\n٦) جلسة كاملة، ثم النتيجة');
async function step(){
  const it=await page.evaluate(()=>readCur());
  if(!it)return;
  await page.evaluate(a=>{gateLeft=0;gateStop();readChoose(a)},it.a);
  await page.evaluate(()=>readNext());
}
await page.evaluate(()=>startRead());
while(!(await page.evaluate(()=>readDone)))await step();
ok(await page.evaluate(()=>readDone)===true,'انتهت الجلسة');
t=await page.textContent('#app');
ok(/جلسة أخرى/.test(t),'وتُعرض شاشة النتيجة');

console.log('\n٧) يظهر على الصفحتين — الأخوان يريان مستواهما لا مستوى هيا');
const m=await mk('mohammed.html');
const mLv=await m.evaluate(()=>({level:profileOf().level,btn:document.body.innerText.indexOf('فهم المقروء')>=0}));
ok(mLv.level==='B1'&&mLv.btn,`محمد B1 والزرّ ظاهر (${mLv.level})`);
await m.evaluate(()=>startRead());
const mBank=await m.evaluate(()=>readItems.every(x=>x.lv==='B1'));
ok(mBank,'وجلسته من بنك B1 وحده');

const e=await mk('elias.html');
const eLv=await e.evaluate(()=>({level:profileOf().level,btn:document.body.innerText.indexOf('فهم المقروء')>=0}));
ok(eLv.level==='A2'&&eLv.btn,`إلياس A2 والزرّ ظاهر (${eLv.level})`);

const h=await mk('index.html');
const hBtn=await h.evaluate(()=>document.body.innerText.indexOf('فهم المقروء')>=0);
ok(hBtn,'وهيا كذلك — الثلاثة سواءً');

console.log('\n٨) لا انحدار');
for(const [pg,fn,md] of [['index.html',"startRead()",'read'],['index.html',"startListen()",'listen'],
  ['index.html',"startCoach()",'coach'],['index.html',"home()",'home'],
  ['mohammed.html',"startRead()",'read'],['mohammed.html',"startCoach()",'coach']]){
  const pp=await mk(pg);
  const r2=await pp.evaluate(x=>{try{eval(x);return{m:mode}}catch(err){return{err:err.message}}},fn);
  ok(!r2.err&&r2.m===md,`${pg} ${fn} → ${r2.err||r2.m}`);
  ok((await pp.evaluate(()=>censusMissing())).length===0,`${pg}: كل الدوال معرَّفة`);
  ok((await pp.evaluate(()=>window.__ERRS.length))===0,`${pg}: لا خطأ`);
}

console.log('\n'+(fails?`=== ${fails} فشل ===`:'=== كل الاختبارات نجحت ==='));
await b.close();process.exit(fails?1:0);
})();
