// تقوية «المساحة المظلّلة» و«المحيط» و«زوايا الخط والمثلث» — ٢٣ نوفمبر.
// الجواب يُعاد حسابه من نصّ السؤال، والمموّهات متمايزة وموجبة، وأسئلة موهبة الأربعة تجد موضوعها،
// و«الضلع من المحيط» (عكس ما يُعلّمه الموضوع) لا يُربَط.
const {chromium}=require('/opt/node22/lib/node_modules/playwright');
let fails=0;const ok=(c,m)=>{console.log((c?'  ✓ ':'  ✗ FAIL ')+m);if(!c)fails++};
(async()=>{
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'});const p=await b.newPage();
p.on('pageerror',e=>{console.log('  ✗ PAGEERROR '+e.message);fails++});
await p.route('**/rest/v1/**',r=>r.fulfill({status:201,contentType:'application/json',body:'[]'}));
await p.route('**/functions/v1/**',r=>r.fulfill({status:200,contentType:'application/json',body:'{}'}));
await p.goto('http://127.0.0.1:8931/index.html');await p.waitForFunction(()=>typeof fadeMakeShaded==='function');
const r=await p.evaluate(()=>{
  const AR="٠١٢٣٤٥٦٧٨٩",nums=t=>(t.match(/[٠-٩]+/g)||[]).map(x=>parseInt(x.replace(/[٠-٩]/g,d=>AR.indexOf(d))));
  let bs=0,bp=0,ba=0,dup=0;
  for(let i=0;i<2000;i++){
    const s=fadeMakeShaded(),n=nums(s.q);if((/مستطيل/.test(s.q)?n[0]*n[1]-n[2]*n[3]:n[0]*n[0]/2)!==s.ans)bs++;
    const q=fadeMakePerim(),m=nums(q.q);if((/مربّع/.test(q.q)?4*m[0]:2*(m[0]+m[1]))!==q.ans)bp++;
    const a=fadeMakeAngleSum(),t=nums(a.q);if(180-t[0]-t[1]!==a.ans)ba++;
    [s,q,a].forEach(x=>{if(x.ans<=0||new Set([x.ans].concat(fadeDedupe(x.ans,x.distractors))).size!==4)dup++});
  }
  const lk=(g,t,flt)=>{let c=0,tot=0;for(let i=0;i<300;i++){const q=g();if(flt&&!flt(q))continue;tot++;if(QZ_CARD_FADE_LINK[tmplKey(q)]===t)c++}return[c,tot]};
  return{bs,bp,ba,dup,sh:lk(gShadedArea,'shaded'),pe:lk(gPerim,'perim',q=>/كم محيطه/.test(q.q)),pn:lk(gPerim,'perim',q=>!/كم محيطه/.test(q.q)),tr:lk(gAngleTriangle,'anglesum'),li:lk(gAngleLine,'anglesum'),
    reg:["shaded","perim","anglesum"].every(k=>FADE_TOPICS.some(t=>t.key===k)&&CLIP_MAKERS[k]&&FADE_TERMS[k])};
});
ok(r.bs===0&&r.bp===0&&r.ba===0,'الجواب = الحساب من نصّ السؤال (المظلّل/المحيط/الزوايا) — '+[r.bs,r.bp,r.ba]);
ok(r.dup===0,'والمموّهات متمايزة وموجبة — '+r.dup);
ok(r.sh[0]===r.sh[1]&&r.tr[0]===r.tr[1]&&r.li[0]===r.li[1]&&r.pe[0]===r.pe[1],'أسئلة موهبة الأربعة تجد موضوعها');
ok(r.pn[1]>0&&r.pn[0]===0,'و«الضلع من المحيط» لا يُربَط — '+r.pn[0]+'/'+r.pn[1]);
ok(r.reg,'والثلاثة مسجَّلة في الموضوعات والمقاطع والمصطلحات');
await b.close();console.log(fails?'=== '+fails+' فشل ===':'=== كل الاختبارات نجحت ===');process.exit(fails?1:0);
})();
