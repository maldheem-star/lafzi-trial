// دقّة القواعد: اختاري الجملة الصحيحة من أربع (Grammaticality Judgment Task) — طلب
// صاحب المشروع تدريباً داخل قسم الكتابة، مع شرح كل خيار لا الصحيحة وحدها (توصيةٌ
// اعتُمدت بعد عرض بدائل). نفس بنية الاستماع/القراءة/لعبة الاستماع بالضبط — بنكٌ
// بمستويات + fsrsUpdate للتباعد، لا آلية جديدة.
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
  await page.goto('http://127.0.0.1:8931/'+f);
  await page.waitForFunction(()=>typeof startGram==='function');
  return page;
};

console.log('\n١) كل مستوى يرى بنكه هو، وكل عنصر بشكل سليم — أربع خيارات وصحيحةٌ واحدة بالضبط');
let page=await mk('index.html');
const banks=await page.evaluate(()=>({
  a1:gramBankFor('A1').every(x=>x.lv==='A1'),
  a2:gramBankFor('A2').every(x=>x.lv==='A2'),
  b1:gramBankFor('B1').every(x=>x.lv==='B1'||x.lv==='B1+'),
  n:{a1:gramBankFor('A1').length,a2:gramBankFor('A2').length,b1:gramBankFor('B1').length},
  shape:GRAM_BANK.every(x=>Array.isArray(x.c)&&x.c.length===4
    &&x.c.filter(o=>o.ok).length===1
    &&x.c.every(o=>o.t&&o.t.length>5&&o.why&&o.why.length>3)
    &&new Set(x.c.map(o=>o.t)).size===4&&x.lv),
}));
ok(banks.a1&&banks.a2&&banks.b1,'لا اختلاط بين المستويات');
ok(banks.n.a1>=5&&banks.n.a2>=5&&banks.n.b1>=5,`ولكلٍّ بنكٌ كافٍ (${JSON.stringify(banks.n)})`);
ok(banks.shape,'وكل عنصر بشكل سليم: أربع جملٍ مختلفة، صحيحةٌ واحدة بالضبط، وشرحٌ لكلٍّ');

console.log('\n١ب) تمديد B1+ (شرطٌ مختلط ومبنيٌّ للمجهول) — يُضاف إلى B1 وحده، بلا تسرّب');
const ext=await page.evaluate(()=>({
  b1HasPlus:gramBankFor('B1').some(x=>x.lv==='B1+'),
  a1NoPlus:!gramBankFor('A1').some(x=>x.lv==='B1+'),
  a2NoPlus:!gramBankFor('A2').some(x=>x.lv==='B1+'),
  plusCount:GRAM_BANK.filter(x=>x.lv==='B1+').length,
}));
ok(ext.b1HasPlus,'بنك B1 يحوي عناصر B1+');
ok(ext.a1NoPlus&&ext.a2NoPlus,'ولا تتسرّب إلى A1/A2');
ok(ext.plusCount>=5,`وعددٌ كافٍ منها (${ext.plusCount})`);

console.log('\n٢) بدء الجلسة: ترتيب عرضٍ عشوائي — لا انحياز موضع');
await page.evaluate(()=>startGram());
const firsts=new Set();
for(let i=0;i<30;i++){
  await page.evaluate(()=>gramSetupRound());
  firsts.add(await page.evaluate(()=>gramOrder[0]));
}
ok(firsts.size>1,'ترتيب العرض يتنوّع عبر الجولات');

console.log('\n٣) قبل القفل: لا شرح ظاهر، والخيارات الأربعة معروضة');
await page.evaluate(()=>startGram());
let t=await page.textContent('#app');
const it0=await page.evaluate(()=>gramCur());
ok(it0.c.every(o=>t.includes(o.t)),'الجمل الأربع كلّها ظاهرة');
ok(!it0.c.some(o=>t.includes(o.why)),'ولا شرح واحد ظاهر قبل الاختيار');
ok(await page.evaluate(()=>document.querySelectorAll('.choices .choice').length)===4,'أربعة أزرار بالضبط');

console.log('\n٤) اختيار الصحيحة يُحتسب، وتظهر شروح الأربعة كلّها بعد القفل');
const okIdx=await page.evaluate(()=>gramCur().c.findIndex(o=>o.ok));
const r=await page.evaluate(i=>{gramChoose(i);return{score:gramScore,locked:gramLocked}},okIdx);
ok(r.locked&&r.score===1,'الإجابة الصحيحة تُحتسب ويُقفل الاختيار');
t=await page.textContent('#app');
ok(it0.c.every(o=>t.includes(o.why)),'شرح كل خيارٍ من الأربعة ظاهر — لا الصحيحة وحدها');

console.log('\n٥) اختيار خاطئ لا يُحتسب');
await page.evaluate(()=>startGram());
const wrongIdx=await page.evaluate(()=>gramCur().c.findIndex(o=>!o.ok));
const r2=await page.evaluate(i=>{gramChoose(i);return{score:gramScore,ok:gramCur().c[i].ok}},wrongIdx);
ok(r2.score===0&&!r2.ok,'الإجابة الخاطئة لا تُحتسب');

console.log('\n٦) القفل يمنع تغيير الاختيار');
const before=await page.evaluate(()=>gramPicked);
await page.evaluate(i=>gramChoose(i),okIdx);
ok(await page.evaluate(()=>gramPicked)===before,'لا تغيير بعد القفل');

console.log('\n٧) التسجيل: نصّ السؤال بكل الخيارات وموضع الصواب، والإجابة النصّية المختارة');
logs=[];
await page.evaluate(()=>{startGram();const i=gramCur().c.findIndex(o=>o.ok);gramChoose(i)});
await page.waitForTimeout(300);
const row=logs.find(l=>l.domain==='gram');
ok(!!row,'سطرٌ وصل الخادم');
ok(row&&/\d\) .+ ✓/.test(row.q_text),`وموضع الصواب موسومٌ في السؤال (${row&&row.q_text&&row.q_text.slice(0,50)})`);
ok(row&&row.qtype==='sentence','ونوع السؤال');
ok(row&&row.is_correct===true,'والنتيجة صحيحة');

console.log('\n٨) التباعد: FSRS، لا سلّمٌ جديد');
const srs=await page.evaluate(()=>{
  const id=gramCur().id;
  gramSrsUpdate(id,true);
  const st=JSON.parse(lsGet('mawhiba_gram_srs')||'{}');
  return {hasDue:!!st[id]&&st[id].due>srsToday(),hasS:typeof st[id].s==='number'};
});
ok(srs.hasDue&&srs.hasS,'يُجدوَل بـfsrsUpdate نفسها — لا خوارزمية جديدة');

console.log('\n٨ب) نقصٌ لا خواءٌ تامّ — عنصرٌ مستحقٌّ واحد لا يُنتج جلسةً من سؤالٍ واحد (طلب صاحب المشروع، ١٨ أغسطس)');
const partial=await page.evaluate(()=>{
  const POOL=gramBankFor(profileOf().level);
  const st={};
  POOL.forEach((i,idx)=>{st[i.id]={box:idx===0?0:2,due:idx===0?srsToday():srsToday()+30,seen:idx===0?0:3}});
  lsSet(GRAM_SRS_KEY,JSON.stringify(st));
  return {plan:buildGramPlan(),want:Math.min(GRAM_N,POOL.length)};
});
ok(partial.plan.length===partial.want,`عنصرٌ واحد مستحقّ ⇐ جلسةٌ كاملة (${partial.plan.length} من ${partial.want})، لا سؤالٌ واحد`);
ok(new Set(partial.plan.map(i=>i.id)).size===partial.plan.length,'بلا تكرار عنصرٍ مرّتين في نفس الجلسة');
await page.evaluate(()=>{try{lsDel('mawhiba_gram_srs')}catch(e){}});

console.log('\n٩) جلسة كاملة، ثم النتيجة');
async function step(){
  const it=await page.evaluate(()=>gramCur());
  if(!it)return;
  const i=await page.evaluate(()=>gramCur().c.findIndex(o=>o.ok));
  await page.evaluate(i=>gramChoose(i),i);
  await page.evaluate(()=>gramNext());
}
await page.evaluate(()=>startGram());
while(!(await page.evaluate(()=>gramDone)))await step();
ok(await page.evaluate(()=>gramDone)===true,'انتهت الجلسة');
t=await page.textContent('#app');
ok(/جلسة أخرى/.test(t),'وتُعرض شاشة النتيجة');

console.log('\n١٠) يظهر على الصفحات الثلاث، بجوار زرّ الكتابة');
const h=await mk('index.html');
ok(await h.evaluate(()=>document.body.innerText.indexOf('دقّة القواعد')>=0),'هيا: الزرّ ظاهر');
const m=await mk('mohammed.html');
const mLv=await m.evaluate(()=>({level:profileOf().level,btn:document.body.innerText.indexOf('دقّة القواعد')>=0}));
ok(mLv.level==='B1'&&mLv.btn,`محمد B1 والزرّ ظاهر (${mLv.level})`);
await m.evaluate(()=>startGram());
const mBank=await m.evaluate(()=>gramItems.every(x=>x.lv==='B1'||x.lv==='B1+'));
ok(mBank,'وجلسته من بنك B1 (ومعه تمديد B1+) وحده');
const e=await mk('elias.html');
const eLv=await e.evaluate(()=>({level:profileOf().level,btn:document.body.innerText.indexOf('دقّة القواعد')>=0}));
ok(eLv.level==='A2'&&eLv.btn,`إلياس A2 والزرّ ظاهر (${eLv.level})`);

console.log('\n١١) لا انحدار');
for(const [pg,fn,md] of [['index.html',"startGram()",'gram'],['index.html',"startWrite()",'write'],
  ['index.html',"startMinpair()",'minpair'],['index.html',"home()",'home'],
  ['mohammed.html',"startGram()",'gram'],['mohammed.html',"startCoach()",'coach']]){
  const pp=await mk(pg);
  const r3=await pp.evaluate(x=>{try{eval(x);return{m:mode}}catch(err){return{err:err.message}}},fn);
  ok(!r3.err&&r3.m===md,`${pg} ${fn} → ${r3.err||r3.m}`);
  ok((await pp.evaluate(()=>censusMissing())).length===0,`${pg}: كل الدوال معرَّفة`);
  ok((await pp.evaluate(()=>window.__ERRS.length))===0,`${pg}: لا خطأ`);
}

console.log('\n'+(fails?`=== ${fails} فشل ===`:'=== كل الاختبارات نجحت ==='));
await b.close();process.exit(fails?1:0);
})();
