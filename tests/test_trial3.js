// قسم «اختبار موهبة تجريبي» — الاختبار الثالث (٢٥ سؤالاً من كتاب، المفتاح من صفحة حلوله) — ٢٥ نوفمبر.
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
const s=await p.evaluate(()=>{const ex=TRIAL_EXAMS.filter(e=>e.id==='t3')[0],it=ex.items,AR="٠١٢٣٤٥٦٧٨٩",num=t=>parseFloat(trialPlain(t).replace(/[٠-٩]/g,d=>AR.indexOf(d)));
  const k=i=>it[i-1].c[it[i-1].a];
  return{has:!!ex,name:ex.name,n:it.length,four:it.every(x=>x.c.length===4),
   figs:it.map((x,i)=>x.fig?i+1:0).filter(Boolean),key:it.map(x=>x.a),unsure:it.filter(x=>x.unsure).length,
   latin:it.some(x=>/[A-Za-z]/.test(trialPlain(x.q)+x.c.map(trialPlain).join(""))),
   q1:num(k(1))===24*3/4-7,q2:num(k(2))===Math.pow(2*Math.cbrt(8),3),q3:num(k(3))===Math.floor(2.25/0.3+1e-9),q4:num(k(4))===42-42*5/6,
   q5:num(k(5))===Math.round(2100/1.05),q6:num(k(6))===2*3,q7:num(k(7))===(()=>{const sp=18/3,st=17-2*sp;return 19-sp-st})(),
   q9:num(k(9))===4*18/12,q10:num(k(10))===(()=>{const g=(a,b)=>b?g(b,a%b):a;return 2*(96+42)/g(96,42)})(),q11:num(k(11))===5+8,
   q12:num(k(12))===(()=>{for(let b=1;b<50;b++)if(b*(b+2)/2===24)return b})(),q14:num(k(14))===4*(90/5)-90/2,q23:num(k(23))===9-4-1,q24:num(k(24))===(40+34+46)/2,
   q8:num(k(8))*4===16&&3*2===6&&7*3===21,q22:trialPlain(k(22))==="أحمد.",n13:it[12].c.length}});
ok(s.has&&s.name==='الاختبار الثالث','الاختبار الثالث موجود باسمه');
ok(s.n===25&&s.four,'٢٥ سؤالاً بأربعة خيارات — '+s.n);
ok(JSON.stringify(s.key)==='[2,1,3,0,1,2,0,3,1,2,0,1,3,1,0,2,3,0,2,3,1,1,2,3,3]','المفتاح مطابقٌ لصفحة حلول الكتاب — '+s.key);
ok(JSON.stringify(s.figs)==='[1,6,7,8,11,13,14,23,25]','الأشكال في ١ و٦ و٧ و٨ و١١ و١٣ و١٤ و٢٣ و٢٥ — '+s.figs);
ok(!s.latin&&s.unsure===0,'بلا لاتيني ولا «اجتهاد»');
ok(['q1','q2','q3','q4','q5','q6','q7','q8','q9','q10','q11','q12','q14','q22','q23','q24'].every(k=>s[k]),'مفتاح ١٦ سؤالاً مؤكَّد بإعادة الحساب المستقلّ — '+JSON.stringify(s));
console.log('\n٢) التدفّق والتسجيل');
rows.length=0;
const f=await p.evaluate(async()=>{startTrial('t3');const ex=trialEx;let bad=[];
  for(let i=0;i<25;i++){const L=[...document.querySelectorAll('.choice .letter')].map(e=>e.textContent.trim()).join("");if(L!=="أبجد")bad.push(i+1);
   trialPick(ex.items[i].a);trialNext(false)}
  return{done:trialDone,got:trialRes.length,bad,res:/الدرجة/.test(app.innerHTML)}});
await p.waitForTimeout(300);
ok(f.done&&f.res&&f.got===25&&f.bad.length===0,'ينتهي بنتيجة، والخيارات أ ب ج د بلا خلط');
const mine=rows.filter(r=>r.domain==='trial');
ok(mine.length===25&&mine.every(r=>/^t3_q\d\d$/.test(r.item_id)&&r.qtype==='t3'&&r.is_correct===true),'٢٥ سطراً بمعرّف t3_q٠١…٢٥');
ok(mine.every(r=>/الخيارات:/.test(r.q_text)&&/الصواب موضع/.test(r.response)),'نصّ السؤال بخياراته وموضع الصواب');
ok(/\[رسم\]/.test(mine.find(r=>r.item_id==='t3_q13').q_text),'والرسم يُسجَّل [رسم]');
await b.close();console.log(fails?'=== '+fails+' فشل ===':'=== كل الاختبارات نجحت ===');process.exit(fails?1:0);
})();
