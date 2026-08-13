const {chromium}=require('/opt/node22/lib/node_modules/playwright');
const path='/tmp/claude-0/-home-user-lafzi-trial/d5a80363-f01b-5f26-ba42-6a7c646126c1/scratchpad/package/dist/index.cjs';
let fails=0;const ok=(c,m)=>{console.log((c?'  ✓ ':'  ✗ FAIL ')+m);if(!c)fails++};
(async()=>{
let ref=null;try{ref=require(path)}catch(e){}
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'});
const page=await b.newPage({viewport:{width:420,height:900}});
page.on('pageerror',e=>{console.log('  ✗ PAGEERROR '+e.message);fails++});
await page.route('**/rest/v1/**',r=>r.fulfill({status:201,contentType:'application/json',body:'[]'}));
await page.addInitScript(()=>{
  Object.defineProperty(window,'speechSynthesis',{configurable:true,value:{speak(){},cancel(){},resume(){},pause(){},
    getVoices:()=>[{lang:'en-US',name:'X'}],speaking:false,pending:false}});
  window.SpeechSynthesisUtterance=function(t){this.text=t};
});
await page.goto('http://127.0.0.1:8931/index.html');
await page.waitForFunction(()=>typeof fsrsUpdate==='function');

console.log('\n١) الأوزان هي أوزان FSRS-6 المرجعية');
const W=await page.evaluate(()=>FSRS_W);
ok(W.length===21,`٢١ وزناً (${W.length})`);
ok(W[0]===0.212&&W[20]===0.1542,'وأولها وآخرها كما في المرجع');

console.log('\n٢) مقابلة الصيغ بمكتبة ts-fsrs الرسمية');
// نُقابل الصيغ نفسها لا مخرجات المُجدوِل: المكتبة تفرض ترتيباً بين الدرجات الأربع
// (hard < good < easy) فتزيد فاصل «good» يوماً، ونحن لا نعرض إلا درجتين — أصابت أو
// أخطأت. فالمقابلة على الرياضيات: الثبات والصعوبة والفاصل.
if(!ref){ok(false,'تعذّر تحميل المكتبة المرجعية — لا مقابلة');}
else{
  const {FSRS,generatorParameters}=ref;
  const alg=new FSRS(generatorParameters({enable_fuzz:false,enable_short_term:false,
    learning_steps:[],relearning_steps:[],maximum_interval:180,request_retention:0.9}));
  const near=(a,b,eps)=>Math.abs(a-b)<=(eps||1e-6);

  const initS=await page.evaluate(()=>[fsrsInitS(1),fsrsInitS(3)]);
  ok(near(initS[0],alg.init_stability(1))&&near(initS[1],alg.init_stability(3)),
     `الثبات الابتدائي: ${initS.join(' · ')}`);
  const initD=await page.evaluate(()=>[fsrsInitD(1),fsrsInitD(3),fsrsInitD(4)]);
  ok(initD.every((v,i)=>near(v,alg.init_difficulty([1,3,4][i]))),`والصعوبة الابتدائية الخام: ${initD.map(x=>x.toFixed(3)).join(' · ')}`);
  const cl=await page.evaluate(()=>[fsrsClampD(fsrsInitD(4)),fsrsClampD(fsrsInitD(1))]);
  ok(cl[0]===1&&cl[1]<=10,'والحصر [١،١٠] يقع على البطاقة الجديدة لا على الصيغة');

  let bad=0,worst=0;
  const cases=[];
  for(const d of [1,3,5,7,9.5]) for(const st of [0.2,1,5,20,90]) for(const t of [0,1,7,30]){
    cases.push([d,st,t]);
  }
  const mine=await page.evaluate(cs=>cs.map(function(c){
    const d=c[0],s=c[1],t=c[2],r=fsrsR(t,s);
    return[r,fsrsRecallS(d,s,r,3),fsrsForgetS(d,s,r),fsrsNextD(d,3),fsrsNextD(d,1),fsrsIvl(s)];
  }),cases);
  cases.forEach(function(c,i){
    const d=c[0],s=c[1],t=c[2];
    const r=alg.forgetting_curve(t,s);
    const want=[r,alg.next_recall_stability(d,s,r,3),alg.next_forget_stability(d,s,r),
      alg.next_difficulty(d,3),alg.next_difficulty(d,1),alg.next_interval(s,0)];
    want.forEach(function(w,j){
      const diff=Math.abs(w-mine[i][j]);
      // المرجع يُقرّب إلى ثماني منازل بعد كل خطوة ونحن لا نُقرّب، فيتراكم فرقٌ
      // في حدود جزء من مئة ألف — وفواصلنا بالأيام الصحيحة، فلا أثر له
      if(diff>1e-4){bad++;if(diff>worst)worst=diff}
    });
  });
  ok(bad===0,bad?`${bad} فرقاً، أكبره ${worst}`:`${cases.length*6} قيمة في ${cases.length} حالة — كلها مطابقة`);
}

console.log('\n٣) السلوك المطلوب: الخطأ يُقصّر، والإتقان يُطيل');
const beh=await page.evaluate(()=>{
  let good=null,bad=null,day=0;
  for(let i=0;i<4;i++){good=fsrsUpdate(good,true,day);day=good.due}
  day=0;for(let i=0;i<4;i++){bad=fsrsUpdate(bad,i===3,day);day=bad.due}
  const first=fsrsUpdate(null,true,0),firstBad=fsrsUpdate(null,false,0);
  return{goodIvl:good.due-good.last,badIvl:bad.due-bad.last,
    firstGood:first.due,firstBad:firstBad.due,gD:good.d,bD:bad.d};
});
ok(beh.goodIvl>beh.badIvl,`أربع إصابات ⇒ ${beh.goodIvl} يوماً، ومع الأخطاء ⇒ ${beh.badIvl} يوماً`);
ok(beh.firstGood>beh.firstBad,`وأول إصابة تُبعد أكثر من أول خطأ (${beh.firstGood} مقابل ${beh.firstBad})`);
ok(beh.gD<beh.bD,`والصعوبة تقلّ بالإصابة وتزيد بالخطأ (${Math.round(beh.gD*10)/10} مقابل ${Math.round(beh.bD*10)/10})`);
ok(beh.firstBad<=1,'والخطأ الأول يعود غداً');

console.log('\n٤) الحدود: لا موعد أبعد من ١٨٠ يوماً ولا أقرب من يوم');
const lim=await page.evaluate(()=>{
  let r=null,day=0;for(let i=0;i<25;i++){r=fsrsUpdate(r,true,day);day=r.due}
  return{ivl:r.due-r.last,min:fsrsIvl(0.0001),max:fsrsIvl(99999)};
});
ok(lim.max===180,`السقف ١٨٠ (${lim.max})`);
ok(lim.min===1,'والأرضية يوم');
ok(lim.ivl<=180,`وبعد ٢٥ إصابة: ${lim.ivl} يوماً`);

console.log('\n٥) الاسترجاع يتناقص بالزمن');
const R=await page.evaluate(()=>({d0:fsrsR(0,10),d10:fsrsR(10,10),d100:fsrsR(100,10)}));
ok(R.d0===1,'عند صفر يوم: احتمال تامّ');
ok(R.d10<R.d0&&R.d100<R.d10,`ويتناقص: ${R.d10.toFixed(2)} ثم ${R.d100.toFixed(2)}`);
ok(Math.abs(R.d10-0.9)<0.02,'وعند مدّة تساوي الثبات ⇒ ٩٠٪ (تعريف الثبات نفسه)');

console.log('\n٦) البيانات القديمة لا تنكسر');
const old=await page.evaluate(()=>{
  lsSet('mawhiba_eng_srs',JSON.stringify({u1_v1:{box:3,seen:5,due:srsToday()+8}}));
  srsUpdate('u1_v1',true);
  const r=JSON.parse(lsGet('mawhiba_eng_srs')).u1_v1;
  return{s:r.s,d:r.d,due:r.due,seen:r.seen,box:r.box};
});
ok(old.s>0&&old.d>0,'العنصر القديم (بلا ثبات) يبدأ ثباتاً جديداً بلا خطأ');
ok(old.seen===6,'وعدّاده يتراكم');
ok(typeof old.box==='number','وbox يبقى للعرض والتحليل');

console.log('\n٧) وتُطبَّق على الخطة والتحدّث معاً');
const both=await page.evaluate(()=>{
  lsDel('mawhiba_eng_srs');lsDel('mawhiba_speak_srs');
  srsUpdate('x1',true);speakSrsUpdate('y1',true);
  return{eng:JSON.parse(lsGet('mawhiba_eng_srs')).x1,spk:JSON.parse(lsGet('mawhiba_speak_srs')).y1};
});
ok(both.eng.s>0,'الخطة اليومية بثبات');
ok(both.spk.s>0,'والتحدّث كذلك');

console.log('\n٨) لا انحدار');
for(const [fn,md] of [["startEngPlan()",'engplan'],["startBasics('pimul')",'basics'],["startFade('seq')",'fade'],
  ["startDictation()",'dictation'],["startCoach()",'coach'],["home()",'home']]){
  const r=await page.evaluate(x=>{try{eval(x);return{m:mode}}catch(e){return{err:e.message}}},fn);
  ok(!r.err&&r.m===md,`${fn} → ${r.err||r.m}`);
}
ok((await page.evaluate(()=>censusMissing())).length===0,'وكل الدوال معرَّفة');
ok((await page.evaluate(()=>window.__ERRS.length))===0,'ولا خطأ');

await b.close();
console.log(fails?`\n=== ${fails} فشل ===`:'\n=== كل الاختبارات نجحت ===');
process.exit(fails?1:0);
})();
