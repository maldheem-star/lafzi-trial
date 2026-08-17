// لعبة الاستماع (أزواج شبه متطابقة، chose/choose) — طلب صاحب المشروع (١٦ أغسطس)
// بعد لقطة شاشة من تطبيقٍ آخر: يسمع كلمة، يختار من كلمتين متشابهتي النطق، ثم يرى
// الكلمة الصحيحة داخل جملة تشرح معناها. نفس بنية الاستماع/القراءة بالضبط — بنكٌ
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
  await page.addInitScript(()=>{
    window.__spoken=[];
    Object.defineProperty(window,'speechSynthesis',{configurable:true,value:{speak(u){window.__spoken.push(u.text)},cancel(){},resume(){},pause(){},
      getVoices:()=>[{lang:'en-US',name:'X'}],speaking:false,pending:false}});
    window.SpeechSynthesisUtterance=function(t){this.text=t};
  });
  await page.goto('http://127.0.0.1:8931/'+f);
  await page.waitForFunction(()=>typeof startMinpair==='function');
  return page;
};

console.log('\n١) كل مستوى يرى بنكه هو، وكل عنصر بشكل سليم');
let page=await mk('index.html');
const banks=await page.evaluate(()=>({
  a1:minpairBankFor('A1').every(x=>x.lv==='A1'),
  a2:minpairBankFor('A2').every(x=>x.lv==='A2'),
  b1:minpairBankFor('B1').every(x=>x.lv==='B1'),
  n:{a1:minpairBankFor('A1').length,a2:minpairBankFor('A2').length,b1:minpairBankFor('B1').length},
  shape:MINPAIR_BANK.every(x=>Array.isArray(x.w)&&x.w.length===2&&Array.isArray(x.ph)&&x.ph.length===2
    &&Array.isArray(x.s)&&x.s.length===2&&Array.isArray(x.m)&&x.m.length===2&&x.m[0]&&x.m[1]&&x.w[0]!==x.w[1]&&x.lv),
}));
ok(banks.a1&&banks.a2&&banks.b1,'لا اختلاط بين المستويات');
ok(banks.n.a1>=5&&banks.n.a2>=5&&banks.n.b1>=5,`ولكلٍّ بنكٌ كافٍ (${JSON.stringify(banks.n)})`);
ok(banks.shape,'وكل عنصر بشكل سليم (كلمتان مختلفتان، ونُطقان، وجملتان)');

console.log('\n٢) بدء الجلسة: هدفٌ عشوائي وترتيبٌ عشوائي — لا انحياز موضع');
await page.evaluate(()=>startMinpair());
const targets=new Set(),firsts=new Set();
for(let i=0;i<40;i++){
  await page.evaluate(()=>{minpairSetupRound()});
  const s=await page.evaluate(()=>({t:minpairTarget,f:minpairOrder[0]}));
  targets.add(s.t);firsts.add(s.f);
}
ok(targets.has(0)&&targets.has(1),'الهدف يتنوّع بين الكلمتين عبر الجولات');
ok(firsts.has(0)&&firsts.has(1),'وترتيب العرض يتنوّع كذلك');

console.log('\n٣) الصوت يُنطق الكلمة الهدف تحديداً');
await page.evaluate(()=>{startMinpair();window.__spoken=[];minpairPlay()});
const spoken=await page.evaluate(()=>({said:window.__spoken[0],target:minpairCur().w[minpairTarget],plays:minpairPlays}));
ok(spoken.said===spoken.target,`نُطقت الكلمة الهدف («${spoken.said}»)`);
ok(spoken.plays===1,'وعدّاد الاستماعات زاد');

console.log('\n٤) اختيار صحيح يُحتسب، وتظهر الجملة الشارحة والمعنى العربي بعد القفل');
await page.evaluate(()=>startMinpair());
let r=await page.evaluate(()=>{
  const it=minpairCur();minpairChoose(minpairTarget);
  return{picked:minpairPicked,locked:minpairLocked,ok:minpairPicked===minpairTarget,score:minpairScore,
    sentence:it.s[minpairTarget],meaning:it.m[minpairTarget],word:it.w[minpairTarget]};
});
ok(r.ok&&r.score===1,'الإجابة الصحيحة تُحتسب');
let t=await page.textContent('#app');
ok(t.includes(r.sentence),'والجملة الشارحة ظاهرة على الشاشة');
ok(t.includes(r.meaning)&&t.includes(r.word),`والمعنى العربي ظاهر مع الكلمة («${r.meaning} = ${r.word}») — سبب طلب صاحب المشروع`);
ok(t.includes('سمعتِها صح'),'ورسالة النجاح ظاهرة');

console.log('\n٥) اختيار خاطئ لا يُحتسب، والصحيحة تلوّن بالأخضر');
await page.evaluate(()=>startMinpair());
const wrong=await page.evaluate(()=>{
  const other=1-minpairTarget;minpairChoose(other);
  return{score:minpairScore,ok:minpairPicked===minpairTarget};
});
ok(wrong.score===0&&!wrong.ok,'الإجابة الخاطئة لا تُحتسب');
t=await page.textContent('#app');
ok(t.includes('الصحيحة بالأخضر'),'ورسالة التصحيح ظاهرة');

console.log('\n٦) القفل يمنع تغيير الاختيار');
const locked2=await page.evaluate(()=>{const before=minpairPicked;minpairChoose(minpairTarget);return{before,after:minpairPicked}});
ok(locked2.before===locked2.after,'لا تغيير بعد القفل');

console.log('\n٧) التسجيل: نصّ السؤال والهدف وعدد الاستماعات، والإجابة النصّية');
logs=[];
await page.evaluate(()=>{startMinpair();minpairChoose(minpairTarget)});
await page.waitForTimeout(300);
const row=logs.find(l=>l.domain==='minpair');
ok(!!row,'سطرٌ وصل الخادم');
ok(row&&/الهدف:/.test(row.q_text)&&/استماعات:/.test(row.q_text),`وفيه الهدف وعدد الاستماعات (${row&&row.q_text})`);
ok(row&&row.qtype==='pair','ونوع السؤال');

console.log('\n٨) التباعد: FSRS، لا سلّمٌ جديد');
const srs=await page.evaluate(()=>{
  const id=minpairCur().id;
  minpairSrsUpdate(id,true);
  const st=JSON.parse(lsGet('mawhiba_minpair_srs')||'{}');
  return {hasDue:!!st[id]&&st[id].due>srsToday(),hasS:typeof st[id].s==='number'};
});
ok(srs.hasDue&&srs.hasS,'يُجدوَل بـfsrsUpdate نفسها — لا خوارزمية جديدة');

console.log('\n٩) جلسة كاملة، ثم النتيجة');
async function step(){
  const it=await page.evaluate(()=>minpairCur());
  if(!it)return;
  await page.evaluate(()=>minpairChoose(minpairTarget));
  await page.evaluate(()=>minpairNext());
}
await page.evaluate(()=>startMinpair());
while(!(await page.evaluate(()=>minpairDone)))await step();
ok(await page.evaluate(()=>minpairDone)===true,'انتهت الجلسة');
t=await page.textContent('#app');
ok(/جلسة أخرى/.test(t),'وتُعرض شاشة النتيجة');

console.log('\n١٠) يظهر على الصفحات الثلاث');
const h=await mk('index.html');
ok((await h.evaluate(()=>document.body.innerText.indexOf('لعبة الاستماع')>=0)),'هيا: الزرّ ظاهر');
const m=await mk('mohammed.html');
const mLv=await m.evaluate(()=>({level:profileOf().level,btn:document.body.innerText.indexOf('لعبة الاستماع')>=0}));
ok(mLv.level==='B1'&&mLv.btn,`محمد B1 والزرّ ظاهر (${mLv.level})`);
await m.evaluate(()=>startMinpair());
const mBank=await m.evaluate(()=>minpairItems.every(x=>x.lv==='B1'));
ok(mBank,'وجلسته من بنك B1 وحده');
const e=await mk('elias.html');
const eLv=await e.evaluate(()=>({level:profileOf().level,btn:document.body.innerText.indexOf('لعبة الاستماع')>=0}));
ok(eLv.level==='A2'&&eLv.btn,`إلياس A2 والزرّ ظاهر (${eLv.level})`);

console.log('\n١١) لا انحدار');
for(const [pg,fn,md] of [['index.html',"startMinpair()",'minpair'],['index.html',"startListen()",'listen'],
  ['index.html',"startRead()",'read'],['index.html',"home()",'home'],
  ['mohammed.html',"startMinpair()",'minpair'],['mohammed.html',"startCoach()",'coach']]){
  const pp=await mk(pg);
  const r2=await pp.evaluate(x=>{try{eval(x);return{m:mode}}catch(err){return{err:err.message}}},fn);
  ok(!r2.err&&r2.m===md,`${pg} ${fn} → ${r2.err||r2.m}`);
  ok((await pp.evaluate(()=>censusMissing())).length===0,`${pg}: كل الدوال معرَّفة`);
  ok((await pp.evaluate(()=>window.__ERRS.length))===0,`${pg}: لا خطأ`);
}

console.log('\n'+(fails?`=== ${fails} فشل ===`:'=== كل الاختبارات نجحت ==='));
await b.close();process.exit(fails?1:0);
})();
