// قسم «اختبار موهبة تجريبي» — الاختبار الأول (٢٥ سؤالاً منقولةً من كتاب) — ٢٥ نوفمبر.
// يُثبت: البنية (٢٥ × ٤ خيارات، أ ب ج د بلا خلط)، وأنّ مفتاح الأسئلة الحسابية مؤكَّدٌ بإعادة الحساب
// المستقلّ، والتدفّق كاملاً (اختيار/تخطٍّ/نتيجة)، والتسجيل بأعراف المشروع، وأنّ القسم لهيا وحدها.
const {chromium}=require('/opt/node22/lib/node_modules/playwright');
let fails=0;const ok=(c,m)=>{console.log((c?'  ✓ ':'  ✗ FAIL ')+m);if(!c)fails++};
(async()=>{
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'});
const mk=async(q,rows)=>{const p=await b.newPage({viewport:{width:390,height:900}});
  p.on('pageerror',e=>{console.log('  ✗ PAGEERROR '+e.message);fails++});
  await p.route('**/rest/v1/**',r=>{try{const d=r.request().postData();if(d&&rows)rows.push(JSON.parse(d))}catch(e){};r.fulfill({status:201,contentType:'application/json',body:'[]'})});
  await p.route('**/functions/v1/**',r=>r.fulfill({status:200,contentType:'application/json',body:'{}'}));
  await p.goto('http://127.0.0.1:8931/index.html'+(q||''));await p.waitForFunction(()=>typeof startTrial==='function');
  await p.evaluate(()=>localStorage.clear());return p};
const rows=[];const p=await mk('',rows);

console.log('\n١) البنية');
const s=await p.evaluate(()=>{
  const ex=TRIAL_EXAMS[0],AR="٠١٢٣٤٥٦٧٨٩",num=t=>parseFloat(trialPlain(t).replace(/[٠-٩]/g,d=>AR.indexOf(d)));
  const it=ex.items,o={n:it.length,four:it.every(x=>x.c.length===4),idx:it.every(x=>x.a>=0&&x.a<4),
    latin:it.some(x=>/[A-Za-z]/.test(trialPlain(x.q)+x.c.map(trialPlain).join(""))),
    figs:it.map((x,i)=>x.fig?i+1:0).filter(Boolean),unsure:it.map((x,i)=>x.unsure?i+1:0).filter(Boolean)};
  // مفتاح الحسابيّة بإعادة الحساب المستقلّ
  const key=i=>it[i-1].c[it[i-1].a],chk={};
  chk.q1=trialPlain(key(1))==="٥/١٢"&&Math.abs((1-1/4-1/3)-5/12)<1e-9;
  chk.q2=num(key(2))===(()=>{let t;for(let a=-500;a<500;a++)if((a+3)+(a+4)+(a+5)===324)t=a+(a+1)+(a+2);return t})();
  chk.q3=num(key(3))===1; chk.q4=num(key(4))===2*36/18;
  chk.q5=num(key(5))===14/2&&num(key(5))*4===28;
  chk.q7=num(key(7))===6*6*(6/3);
  chk.q8=num(key(8))===100-4*(0.5*4*6);
  chk.q9=num(key(9))===(()=>{for(let x=1;x<200;x++)if(x+x/2+1===100)return x})();
  chk.q10=num(key(10))===72/12; chk.q11=num(key(11))===60*2+80;
  o.chk=chk;
  o.key=it.map(x=>x.a);o.letters=L.join("")==="أبجد";
  return o});
ok(s.n===25&&s.four&&s.idx,'٢٥ سؤالاً بأربعة خياراتٍ ومفتاحٍ في المدى — '+s.n);
ok(!s.latin,'ولا حرفَ لاتينيّ في النصوص');
ok(JSON.stringify(s.figs)==='[3,4,8,12,13,25]','الأشكال في ٣ و٤ و٨ و١٢ و١٣ و٢٥ — '+s.figs);
ok(Object.values(s.chk).every(Boolean),'مفتاح الأسئلة الحسابية مؤكَّدٌ بإعادة الحساب — '+JSON.stringify(s.chk));
ok(s.unsure.length===0,'لا سؤالَ باجتهاد: المفتاح من صفحة «حلول الاختبار الأول» — '+s.unsure);
ok(JSON.stringify(s.key)==='[3,2,1,2,0,3,0,2,0,1,0,3,1,2,0,0,3,3,1,0,3,3,1,0,2]','والمفتاحُ مطابقٌ لصفحة الحلول في الكتاب (٢٥ جواباً) — '+s.key);

console.log('\n٢) التدفّق والتسجيل');
rows.length=0;
const f=await p.evaluate(async()=>{
  goTrialMenu();const menu=/الاختبار الأول/.test(app.innerHTML);
  startTrial('t1');const first=/تذكّري/.test(app.innerHTML),btnOff=!!document.querySelector('button[disabled]');
  const ex=TRIAL_EXAMS[0];let ids=[];
  for(let i=0;i<ex.items.length;i++){
    // الخيارات بترتيبها الأصلي بلا خلط
    const letters=[...document.querySelectorAll('.choice .letter')].map(e=>e.textContent.trim()).join("");
    if(letters!=="أبجد")ids.push(i+1);
    if(i===5){trialNext(true)}                // تخطٍّ
    else{trialPick(i%4===ex.items[i].a?(ex.items[i].a+1)%4:ex.items[i].a);if(i===7)trialPick(ex.items[i].a);trialNext(false)}
  }
  const res=/الدرجة/.test(app.innerHTML),again=/أعيدي الاختبار/.test(app.innerHTML),skip=/⏭️/.test(app.innerHTML);
  return{menu,first,btnOff,res,again,skip,done:trialDone,got:trialRes.length,badOrder:ids}});
await p.waitForTimeout(300);
ok(f.menu&&f.first&&f.btnOff,'القائمة، وتعليمات الاختبار، و«التالي» معطَّل قبل الاختيار');
ok(f.done&&f.res&&f.again&&f.got===25,'ينتهي بنتيجةٍ ومراجعة — '+f.got);
ok(f.skip,'والمتروك يُعلَّم في المراجعة');
const leak=await p.evaluate(()=>({key:/الصواب:|اخترتِ:/.test(app.innerHTML),keyBox:!!document.querySelector('.tr-key'),wrong:document.querySelectorAll('.tr-row:not(.ok)').length}));
ok(!leak.key&&!leak.keyBox,'شاشة النتيجة لا تكشف الجواب الصحيح ولا اختيارها (لا تُفسد الإعادة)');
ok(leak.wrong>0,'وتبقى أرقام الأسئلة الخاطئة ظاهرة — '+leak.wrong);
ok(f.badOrder.length===0,'والخيارات تُعرض أ ب ج د بلا خلط في كل سؤال — '+f.badOrder);
const mine=rows.filter(r=>r.domain==='trial');
ok(mine.length===25,'سطرُ تسجيلٍ لكل سؤال — '+mine.length);
ok(mine.every(r=>/^t1_q\d\d$/.test(r.item_id)&&r.qtype==='t1'),'بمعرّف t1_q٠١…٢٥ ونوعٍ t1');
ok(mine.every(r=>/الخيارات:/.test(r.q_text)&&/ ✓/.test(r.q_text)&&/^\[اختبار تجريبي/.test(r.q_text)),'ونصّ السؤال بكل خياراته وموضع الصواب موسوم');
ok(mine.every(r=>/الصواب موضع/.test(r.response)),'والإجابة بموضعها وموضع الصواب — «موضع ٢ · الصواب موضع ١»');
ok(mine.filter(r=>/مفتاح:اجتهاد/.test(r.response)).length===0,'ولا سطرَ موسوماً باجتهاد');
ok(mine.find(r=>r.item_id==='t1_q06').response.startsWith('تُركت'),'والتخطّي يُسجَّل «تُركت بلا إجابة»');

console.log('\n٣) لهيا وحدها');
const home=await p.evaluate(()=>{home();return !!document.querySelector('[onclick="goTrialMenu()"]')});
ok(home,'زرّ القسم في رئيسة هيا');
const pm=await mk('?p=mohammed');
ok(!(await pm.evaluate(()=>{home();return !!document.querySelector('[onclick="goTrialMenu()"]')})),'وليس في صفحة محمد');
await b.close();console.log(fails?'=== '+fails+' فشل ===':'=== كل الاختبارات نجحت ===');process.exit(fails?1:0);
})();
