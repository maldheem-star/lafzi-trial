// تقوية «الأعمار المتسلسلة» و«زاوية الساعة» — ٢٣ نوفمبر. الجواب يُعاد حسابه من نصّ السؤال،
// والمموّهات ثلاثةٌ متمايزة، وكلُّ سؤالٍ من gAgeChain/gClock في موهبة يجد موضوعه.
const {chromium}=require('/opt/node22/lib/node_modules/playwright');
let fails=0;const ok=(c,m)=>{console.log((c?'  ✓ ':'  ✗ FAIL ')+m);if(!c)fails++};
(async()=>{
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'});const p=await b.newPage();
p.on('pageerror',e=>{console.log('  ✗ PAGEERROR '+e.message);fails++});
await p.route('**/rest/v1/**',r=>r.fulfill({status:201,contentType:'application/json',body:'[]'}));
await p.route('**/functions/v1/**',r=>r.fulfill({status:200,contentType:'application/json',body:'{}'}));
await p.goto('http://127.0.0.1:8931/index.html');await p.waitForFunction(()=>typeof fadeMakeClock==='function');
const r=await p.evaluate(()=>{
  const AR="٠١٢٣٤٥٦٧٨٩",num=t=>parseInt(String(t).replace(/[٠-٩]/g,d=>AR.indexOf(d)));
  const NAMES=["","الواحدة","الثانية","الثالثة","الرابعة","الخامسة","السادسة"];
  let badA=0,badC=0,dup=0;
  for(let i=0;i<2000;i++){
    const a=fadeMakeAgeChain(),n=(a.q.match(/[٠-٩]+/g)||[]).map(num);
    if(n[3]-n[2]+n[1]-n[0]!==a.ans)badA++;
    const c=fadeMakeClock(),h=NAMES.findIndex((x,j)=>j&&c.q.indexOf(" "+x+" ")>=0);
    if(h*30!==c.ans)badC++;
    [a,c].forEach(x=>{if(new Set([x.ans].concat(fadeDedupe(x.ans,x.distractors))).size!==4)dup++});
  }
  let la=0,lc=0;for(let i=0;i<300;i++){if(QZ_CARD_FADE_LINK[tmplKey(gAgeChain())]==="agechain")la++;if(QZ_CARD_FADE_LINK[tmplKey(gClock())]==="clock")lc++}
  localStorage.clear();startFade('clock');const svg=/<svg/.test(app.innerHTML);
  return{badA,badC,dup,la,lc,svg,inTopics:["agechain","clock"].every(k=>FADE_TOPICS.some(t=>t.key===k)&&CLIP_MAKERS[k]&&FADE_TERMS[k])};
});
ok(r.badA===0,'الأعمار: الجواب = الحساب من نصّ السؤال — '+r.badA);
ok(r.badC===0,'الساعة: الجواب = عدد المسافات × ٣٠ — '+r.badC);
ok(r.dup===0,'وأربعة خيارات متمايزة دائماً — '+r.dup);
ok(r.la===300&&r.lc===300,'وكلُّ سؤال أعمارٍ/ساعةٍ في موهبة مربوطٌ بموضوعه — '+r.la+'/'+r.lc);
ok(r.inTopics,'ومسجَّلان في الموضوعات والمقاطع والمصطلحات');
ok(r.svg,'والساعة تُرسم');
await b.close();console.log(fails?'=== '+fails+' فشل ===':'=== كل الاختبارات نجحت ===');process.exit(fails?1:0);
})();
