// قسم «اختبار موهبة تجريبي» — الاختبار الثاني (٢٥ سؤالاً من كتاب، المفتاح من صفحة حلوله) — ٢٥ نوفمبر.
const {chromium}=require('/opt/node22/lib/node_modules/playwright');
let fails=0;const ok=(c,m)=>{console.log((c?'  ✓ ':'  ✗ FAIL ')+m);if(!c)fails++};
(async()=>{
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'});
const p=await b.newPage({viewport:{width:390,height:900}});const rows=[];
p.on('pageerror',e=>{console.log('  ✗ PAGEERROR '+e.message);fails++});
await p.route('**/rest/v1/**',r=>{try{const d=r.request().postData();if(d)rows.push(JSON.parse(d))}catch(e){};r.fulfill({status:201,contentType:'application/json',body:'[]'})});
await p.route('**/functions/v1/**',r=>r.fulfill({status:200,contentType:'application/json',body:'{}'}));
await p.goto('http://127.0.0.1:8931/index.html');await p.waitForFunction(()=>typeof startTrial==='function');
await p.evaluate(()=>localStorage.clear());
console.log('\n١) البنية والمفتاح');
const s=await p.evaluate(()=>{const ex=TRIAL_EXAMS.filter(e=>e.id==='t2')[0],it=ex.items,AR="٠١٢٣٤٥٦٧٨٩",num=t=>parseFloat(trialPlain(t).replace(/[٠-٩]/g,d=>AR.indexOf(d)));
  const k=i=>it[i-1].c[it[i-1].a];
  return{has:!!ex,name:ex.name,n:it.length,four:it.every(x=>x.c.length===4),
   figs:it.map((x,i)=>x.fig?i+1:0).filter(Boolean),key:it.map(x=>x.a),unsure:it.filter(x=>x.unsure).length,
   latin:it.some(x=>/[A-Za-z]/.test(trialPlain(x.q)+x.c.map(trialPlain).join(""))),
   q1:num(k(1))===84000*2/3,q2:Math.abs(num(k(2))-8/(6*4/15))<1e-9,q4:num(k(4))===Math.round(2700/0.3),q5:num(k(5))===2*37+1,q6:num(k(6))===6,
   q7:Math.abs(24.5/7.5-1/15-48/15)<1e-9&&trialPlain(k(7))==="صفر",q8:(()=>{for(let b=1;b<20;b++)for(let g=1;g<20;g++)if(b-1===g&&b===2*(g-1))return b+g===num(k(8))})(),
   q21:trialPlain(k(21))==="هند.",hexDots:(()=>{const d=h=>(h.match(/<circle/g)||[]).length;return it[16].c.map(d).concat(d(it[16].fig))})()}});
ok(s.has&&s.name==='الاختبار الثاني','الاختبار الثاني موجود باسمه');
ok(s.n===25&&s.four,'٢٥ سؤالاً بأربعة خيارات — '+s.n);
ok(JSON.stringify(s.key)==='[2,3,1,0,1,1,3,2,2,0,3,1,3,2,1,0,0,2,1,0,1,3,0,3,1]','المفتاح مطابقٌ لصفحة حلول الكتاب — '+s.key);
ok(JSON.stringify(s.figs)==='[3,12,13,17,24,25]','الأشكال في ٣ و١٢ و١٣ و١٧ و٢٤ و٢٥ — '+s.figs);
ok(!s.latin&&s.unsure===0,'بلا لاتيني ولا «اجتهاد»');
ok(s.q1&&s.q2&&s.q4&&s.q5&&s.q6&&s.q7&&s.q8&&s.q21,'المفتاح الحسابي/المنطقي مؤكَّد بإعادة الحساب');
ok(s.hexDots.slice(0,4).every(n=>n===6)&&s.hexDots[4]===24,'الشكل ١٧: كل خيار ٦ نقاط (نمط الكتاب) وأشكال التسلسل ٢٤ — '+s.hexDots);
console.log('\n٢) التدفّق والتسجيل');
rows.length=0;
const f=await p.evaluate(async()=>{startTrial('t2');const ex=trialEx;let bad=[];
  for(let i=0;i<25;i++){const L=[...document.querySelectorAll('.choice .letter')].map(e=>e.textContent.trim()).join("");if(L!=="أبجد")bad.push(i+1);
   trialPick(ex.items[i].a);trialNext(false)}
  return{done:trialDone,got:trialRes.length,bad,res:/الدرجة/.test(app.innerHTML)}});
await p.waitForTimeout(300);
ok(f.done&&f.res&&f.got===25&&f.bad.length===0,'ينتهي بنتيجة، والخيارات أ ب ج د بلا خلط');
const mine=rows.filter(r=>r.domain==='trial');
ok(mine.length===25&&mine.every(r=>/^t2_q\d\d$/.test(r.item_id)&&r.qtype==='t2'&&r.is_correct===true),'٢٥ سطراً بمعرّف t2_q٠١…٢٥');
ok(mine.every(r=>/الخيارات:/.test(r.q_text)&&/الصواب موضع/.test(r.response)),'نصّ السؤال بخياراته وموضع الصواب');
ok(/\[رسم\]/.test(mine.find(r=>r.item_id==='t2_q17').q_text),'والرسم يُسجَّل [رسم]');
await b.close();console.log(fails?'=== '+fails+' فشل ===':'=== كل الاختبارات نجحت ===');process.exit(fails?1:0);
})();
