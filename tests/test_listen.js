// فهم الاستماع: قسمٌ جديد ينقص — الإملاء يقيس التفريغ الحرفي، والمحادثة تقيس
// الإنتاج، ولا شيء يقيس أن يُفهَم معنى ما يُقال بلا كتابته أو إنتاجه. والصيغة
// معياريّة (Cambridge YLE/KET/PET وTOEFL Junior): مقطعٌ قصير يُسمع، ثم اختيار من
// متعدّد عن معناه، والسؤال معروض قبل الاستماع لا بعده.
//
// ومستوى هيا نزل A2⇐A1 (١٥ أغسطس): إنتاجها المنطوق شظايا، ودقّة قواعدها على تراكيب
// فوق الأساسي ٣٥٪. فهذا الاختبار يتحقّق من أن كلّ متعلّم يرى مستواه هو، لا موحّداً.
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
  await page.addInitScript(()=>{
    Object.defineProperty(window,'speechSynthesis',{configurable:true,value:{speak(){},cancel(){},resume(){},pause(){},
      getVoices:()=>[{lang:'en-US',name:'X'}],speaking:false,pending:false}});
    window.SpeechSynthesisUtterance=function(t){this.text=t};
  });
  await page.goto('http://127.0.0.1:8931/'+f);
  await page.waitForFunction(()=>typeof startListen==='function');
  return page;
};

console.log('\n١) مستوى هيا صار A1 — والقياس الذي أوجبه');
let page=await mk('index.html');
const hLv=await page.evaluate(()=>PROFILES.filter(p=>p.id==='haya')[0].level);
ok(hLv==='A1','هيا A1 لا A2');

console.log('\n٢) كل متعلّم يرى بنك مستواه هو');
const banks=await page.evaluate(()=>({
  a1:listenBankFor('A1').every(x=>x.lv==='A1'),
  a2:listenBankFor('A2').every(x=>x.lv==='A2'),
  b1:listenBankFor('B1').every(x=>x.lv==='B1'),
  n:{a1:listenBankFor('A1').length,a2:listenBankFor('A2').length,b1:listenBankFor('B1').length},
}));
ok(banks.a1&&banks.a2&&banks.b1,'لا اختلاط بين المستويات');
ok(banks.n.a1>=8&&banks.n.a2>=8&&banks.n.b1>=5,`ولكلٍّ بنكٌ كافٍ (${JSON.stringify(banks.n)})`);
// وكل عنصر سؤالٌ صالح: أربعة حقول، والصواب داخل الخيارات
const shape=await page.evaluate(()=>LISTEN_BANK.every(x=>x.audio&&x.q&&Array.isArray(x.c)&&x.c.length>=3&&x.a>=0&&x.a<x.c.length));
ok(shape,'وكل عنصر بشكل سليم (صوتٌ وسؤالٌ وخياراتٌ وصوابٌ داخلها)');

console.log('\n٣) السؤال والخيارات معروضة قبل الاستماع — لا بعده (المعيار: تُصغى بانتقائية)');
await page.evaluate(()=>startListen());
const before=await page.evaluate(()=>({
  hasQ:document.querySelector('.q')&&document.querySelector('.q').textContent.length>0,
  choices:document.querySelectorAll('.choices .choice').length,
  played:listenPlays,
}));
ok(before.hasQ&&before.choices>=3,'السؤال والخيارات ظاهران فوراً');

console.log('\n٤) الاستماع مرّتين إرشاديّ للمبتدئ، ومرّة واحدة لِمن فوقه — إرشادٌ لا قفل');
const hints=await page.evaluate(()=>[listenPlaysHint('A1'),listenPlaysHint('A2'),listenPlaysHint('B1')]);
ok(/مرّتين/.test(hints[0])&&/مرّتين/.test(hints[1]),'A1/A2: مرّتين');
ok(/مرّة واحدة/.test(hints[2]),'B1: مرّة واحدة');
const plays3=await page.evaluate(()=>{listenPlay();listenPlay();listenPlay();return listenPlays});
ok(plays3>=3,'والزرّ لا يُقفَل تقنياً — لا فائدة تشخيصية من منعه');

console.log('\n٥) الإجابة تُحتسب وتُسجَّل بعدد مرّات الاستماع');
logs=[];
const r=await page.evaluate(()=>{
  const it=listenCur();listenChoose(it.a);
  return {picked:listenPicked,ok:listenPicked===it.a,score:listenScore};
});
ok(r.ok&&r.score===1,'الإجابة الصحيحة تُحتسب');
await page.waitForTimeout(300);
const row=logs.find(l=>l.domain==='listen');
ok(!!row,'سطرٌ وصل الخادم');
ok(row&&/plays:\d+/.test(String(row.q_text)),`ومعه عدد الاستماعات (${row&&row.q_text})`);
ok(row&&row.qtype==='A1','والمستوى في qtype — يُجمَّع بالاستعلام');

console.log('\n٦) التباعد: FSRS، لا سلّمٌ جديد');
const srs=await page.evaluate(()=>{
  const id=listenItems[listenIdx].id;
  listenSrsUpdate(id,true);
  const st=JSON.parse(lsGet('mawhiba_listen_srs')||'{}');
  return {hasDue:!!st[id]&&st[id].due>srsToday(),hasS:typeof st[id].s==='number'};
});
ok(srs.hasDue&&srs.hasS,'يُجدوَل بـfsrsUpdate نفسها — لا خوارزمية جديدة');

console.log('\n٧) جلسة كاملة، ثم النتيجة');
async function step(){
  const it=await page.evaluate(()=>listenCur());
  if(!it)return;
  await page.evaluate(a=>{listenChoose(a)},it.a);
  await page.evaluate(()=>listenNext());
}
while(!(await page.evaluate(()=>listenDone)))await step();
ok(await page.evaluate(()=>listenDone)===true,'انتهت الجلسة');
let t=await page.textContent('#app');
ok(/جلسة أخرى/.test(t),'وتُعرض شاشة النتيجة');

console.log('\n٨) يظهر على الصفحتين — الأخوان يريان مستواهما لا مستوى هيا');
const m=await mk('mohammed.html');
const mLv=await m.evaluate(()=>({level:profileOf().level,btn:document.body.innerText.indexOf('فهم الاستماع')>=0}));
ok(mLv.level==='B1'&&mLv.btn,`محمد B1 والزرّ ظاهر (${mLv.level})`);
await m.evaluate(()=>startListen());
const mBank=await m.evaluate(()=>listenItems.every(x=>x.lv==='B1'));
ok(mBank,'وجلسته من بنك B1 وحده');

const e=await mk('elias.html');
const eLv=await e.evaluate(()=>({level:profileOf().level,btn:document.body.innerText.indexOf('فهم الاستماع')>=0}));
ok(eLv.level==='A2'&&eLv.btn,`إلياس A2 والزرّ ظاهر (${eLv.level})`);

console.log('\n٩) لا انحدار');
for(const [pg,fn,md] of [['index.html',"startListen()",'listen'],['index.html',"startCoach()",'coach'],
  ['index.html',"startDictation()",'dictation'],['index.html',"home()",'home'],
  ['mohammed.html',"startListen()",'listen'],['mohammed.html',"startCoach()",'coach']]){
  const pp=await mk(pg);
  const r2=await pp.evaluate(x=>{try{eval(x);return{m:mode}}catch(err){return{err:err.message}}},fn);
  ok(!r2.err&&r2.m===md,`${pg} ${fn} → ${r2.err||r2.m}`);
  ok((await pp.evaluate(()=>censusMissing())).length===0,`${pg}: كل الدوال معرَّفة`);
  ok((await pp.evaluate(()=>window.__ERRS.length))===0,`${pg}: لا خطأ`);
}

console.log('\n'+(fails?`=== ${fails} فشل ===`:'=== كل الاختبارات نجحت ==='));
await b.close();process.exit(fails?1:0);
})();
