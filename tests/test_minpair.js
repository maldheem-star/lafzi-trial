// لعبة الاستماع (أزواج شبه متطابقة، chose/choose) — طلب صاحب المشروع (١٦ أغسطس)
// بعد لقطة شاشة من تطبيقٍ آخر: يسمع كلمة، يختار من كلمتين متشابهتي النطق، ثم يرى
// الكلمة الصحيحة داخل جملة تشرح معناها. نفس بنية الاستماع/القراءة بالضبط — بنكٌ
// بمستويات + fsrsUpdate للتباعد، لا آلية جديدة.
// بوّابة التسرّع (٢٢ أغسطس) تمنع النقر قبل زمنٍ أدنى، وهذه الاختبارات تنقر فوراً.
// فتُنهي العدّ أوّلاً — كما ينتظر المتعلّم — ثم تختار: gateLeft=0;gateStop().
// وهذا لا يُعطّل البوّابة ولا يُخفي انحدارها؛ فحصها نفسه في tests/test_rapidgate.js.
const {chromium}=require('/opt/node22/lib/node_modules/playwright');
let fails=0;const ok=(c,m)=>{console.log((c?'  ✓ ':'  ✗ FAIL ')+m);if(!c)fails++};
(async()=>{
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'});
let logs=[],calls=[];
let genReply="SENT: The choose word will be replaced per test.";
const mk=async(f)=>{
  const page=await b.newPage({viewport:{width:420,height:900}});
  page.on('pageerror',e=>{console.log('  ✗ PAGEERROR '+e.message);fails++});
  await page.route('**/rest/v1/**',async r=>{
    let x={};try{x=JSON.parse(r.request().postData()||'{}')}catch(e){}
    logs.push(x);r.fulfill({status:201,contentType:'application/json',body:'[]'});
  });
  await page.route('**/functions/v1/tutor',async r=>{
    let x={};try{x=JSON.parse(r.request().postData()||'{}')}catch(e){}
    calls.push(x);
    const reply=(x.domain==='minpair'&&x.word)?`SENT: Today the word ${x.word} appears right here.`:genReply;
    r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({ok:true,reply})});
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
ok(banks.n.a1>=10&&banks.n.a2>=10&&banks.n.b1>=10,`ولكلٍّ بنكٌ موسَّع (١٦ أغسطس) (${JSON.stringify(banks.n)})`);
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
  const it=minpairCur();gateLeft=0;gateStop();minpairChoose(minpairTarget);
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
  const other=1-minpairTarget;gateLeft=0;gateStop();minpairChoose(other);
  return{score:minpairScore,ok:minpairPicked===minpairTarget};
});
ok(wrong.score===0&&!wrong.ok,'الإجابة الخاطئة لا تُحتسب');
t=await page.textContent('#app');
ok(t.includes('الصحيحة بالأخضر'),'ورسالة التصحيح ظاهرة');

console.log('\n٦) القفل يمنع تغيير الاختيار');
const locked2=await page.evaluate(()=>{const before=minpairPicked;gateLeft=0;gateStop();minpairChoose(minpairTarget);return{before,after:minpairPicked}});
ok(locked2.before===locked2.after,'لا تغيير بعد القفل');

console.log('\n٧) التسجيل: نصّ السؤال والهدف وعدد الاستماعات، والإجابة النصّية');
logs=[];
await page.evaluate(()=>{startMinpair();gateLeft=0;gateStop();minpairChoose(minpairTarget)});
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

console.log('\n٨ب) نقصٌ لا خواءٌ تامّ — عنصرٌ مستحقٌّ واحد لا يُنتج جلسةً من سؤالٍ واحد (طلب صاحب المشروع، ١٨ أغسطس)');
const partial=await page.evaluate(()=>{
  const POOL=minpairBankFor(profileOf().level);
  const st={};
  POOL.forEach((i,idx)=>{st[i.id]={box:idx===0?0:2,due:idx===0?srsToday():srsToday()+30,seen:idx===0?0:3}});
  lsSet(MINPAIR_SRS_KEY,JSON.stringify(st));
  return {plan:buildMinpairPlan(),want:Math.min(MINPAIR_N,POOL.length)};
});
ok(partial.plan.length===partial.want,`عنصرٌ واحد مستحقّ ⇐ جلسةٌ كاملة (${partial.plan.length} من ${partial.want})، لا سؤالٌ واحد`);
ok(new Set(partial.plan.map(i=>i.id)).size===partial.plan.length,'بلا تكرار عنصرٍ مرّتين في نفس الجلسة');
await page.evaluate(()=>{try{lsDel('mawhiba_minpair_srs')}catch(e){}});

console.log('\n٩) جلسة كاملة، ثم النتيجة');
async function step(){
  const it=await page.evaluate(()=>minpairCur());
  if(!it)return;
  await page.evaluate(()=>{gateLeft=0;gateStop();minpairChoose(minpairTarget)});
  await page.evaluate(()=>minpairNext());
}
await page.evaluate(()=>startMinpair());
while(!(await page.evaluate(()=>minpairDone)))await step();
ok(await page.evaluate(()=>minpairDone)===true,'انتهت الجلسة');
t=await page.textContent('#app');
ok(/جلسة أخرى/.test(t),'وتُعرض شاشة النتيجة');

console.log('\n٩ب) التوليد الآلي (١٧ أغسطس): جملةٌ إضافية لزوجٍ موجود، لا زوجٌ جديد — رقابة قبلية');
const sentParse=await page.evaluate(()=>({
  ok:parseMinpairSentBlock("SENT: I chose the red bike yesterday.","chose"),
  wrongWord:parseMinpairSentBlock("SENT: I picked the red bike yesterday.","chose"),
  badAr:parseMinpairSentBlock("SENT: اخترت الدراجة الحمراء.","chose"),
  missing:parseMinpairSentBlock("no sent tag here","chose"),
}));
ok(sentParse.ok==="I chose the red bike yesterday.",'جملةٌ تحوي الكلمة الهدف بحدودها تُقبل');
ok(sentParse.wrongWord===null,'وجملةٌ لا تحوي الكلمة الهدف بالضبط تُرفض قبل أن تُخزَّن — لا بعد عرضها');
ok(sentParse.badAr===null,'وتلوّثٌ عربي يُرفض');
ok(sentParse.missing===null,'ونصٌّ بلا وسم SENT يُرفض');

calls=[];
await page.evaluate(()=>{try{lsDel('mawhiba_minpair_extra_v1')}catch(e){}});
await page.evaluate(()=>minpairGenTopUp('A1'));
await page.waitForTimeout(300);
// نداءان لا واحد (٢٠ أغسطس، رفع معدّل التوليد — ٥١٪ تكرار عند إلياس رغم وجود التوليد):
// كلٌّ يختار كلمةً عشوائية، فقد يقعان على الكلمة نفسها (تُدمَج بالتكرار) أو مختلفتين
const gcAll=calls.filter(c=>c.mode==='gen'&&c.domain==='minpair');
ok(gcAll.length===2&&gcAll.every(c=>c.level==='A1'&&!!c.word),`minpairGenTopUp يطلب نداءين لا واحداً (${gcAll.length})`);
const extraAfter=await page.evaluate(()=>minpairExtraLoad());
const extraCount=Object.values(extraAfter).reduce((n,a)=>n+a.length,0);
ok(extraCount>=1&&extraCount<=2,`والجملة/الجملتان المقبولتان تُخزَّنان محلّياً (${extraCount}) — لا يتغيّر بنك الأزواج نفسه (MINPAIR_BANK يبقى بشرياً بالكامل)`);
// الكلمة تُشتقّ من المفتاح المخزَّن فعلاً لا من نداءٍ بعينه — نداءان الآن لا واحد،
// وأيّهما دخل البنك أوّلاً (أو دُمج تكراره) لا يُفترَض
const cands=await page.evaluate(()=>{
  const k=Object.keys(minpairExtraLoad())[0];
  const [pairId,wordIdx]=[k.slice(0,k.lastIndexOf('_')),k.slice(k.lastIndexOf('_')+1)];
  const it=MINPAIR_BANK.find(x=>x.id===pairId);
  return{list:minpairSentencesFor(it,+wordIdx),fixed:it.s[+wordIdx],word:it.w[+wordIdx]};
});
ok(cands.list.length===2&&cands.list[0]===cands.fixed&&cands.list[1]===`Today the word ${cands.word} appears right here.`,
  'وminpairSentencesFor تضيف المولَّدة إلى الثابتة بدل استبدالها — الثابتة أولاً دائماً');

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
