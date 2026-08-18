// بنك الكلمات: خطّة التخفيف، وبوّابة الصدى، وأنه لا يُسدّ الطريق في أي حال.
//
// السبب: القياس قال إن هيا نسخت الجملة المعروضة في ٤ من ١٥ دوراً، وأن ٢١ من ٢٤ جملة
// أربع كلمات فأقلّ. والبنك هو الدرجة بين النسخ والتأليف. وهذا الاختبار يُثبت ثلاثة:
// أن الترتيب يُحكم عليه بالكلمات لا بالترقيم، وأن الدرجة تصعد وتنزل بالأداء، وأن
// البوّابة تُسلَّح على من ينسخ وتنحلّ عمّن يؤلّف.
const {chromium}=require('/opt/node22/lib/node_modules/playwright');
let fails=0;const ok=(c,m)=>{console.log((c?'  ✓ ':'  ✗ FAIL ')+m);if(!c)fails++};
(async()=>{
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
await page.waitForFunction(()=>typeof wbStart==='function');

console.log('\n١) الحكم على ترتيب الكلمات لا على الترقيم ولا حالة الأحرف');
const r1=await page.evaluate(()=>{
  wbStart("I went to the beach.",1);
  const tok=wbTok.slice();
  // نبني الجملة بالترتيب الصحيح من البنك المبعثر
  tok.forEach(t=>{const i=wbPool.findIndex((w,k)=>w===t&&wbPicked.indexOf(k)<0);wbPicked.push(i)});
  const built=wbBuilt();
  return {built,ok:wbCheck(),n:wbPool.length,tok:tok.length};
});
ok(r1.ok,`الترتيب الصحيح يُقبل: «${r1.built}»`);
ok(r1.n===r1.tok,`ودرجة أولى: الكلمات بالعدد بالضبط (${r1.n})`);
const r1b=await page.evaluate(()=>{
  wbStart("I went to the beach.",1);
  // بلا نقطة وبأحرف صغيرة — الترقيم ليس تأليفاً
  wbTyped="i went to the beach";wbStage=3;wbLocked=false;
  return wbNorm("i went to the beach")===wbNorm("I went to the beach.");
});
ok(r1b,'والترقيم وحالة الأحرف لا تُسقط جملة صحيحة');

console.log('\n٢) الترتيب الخاطئ يُرفض');
const r2=await page.evaluate(()=>{
  wbStart("I went to the beach.",1);
  // نعكس الترتيب
  const idx=wbPool.map((_,i)=>i).reverse();
  const tok=wbTok.slice();
  const correct=tok.map(t=>wbPool.findIndex(w=>w===t));
  const rev=correct.slice().reverse();
  wbPicked=rev;
  const built=wbBuilt();
  return {built,ok:wbCheck()};
});
ok(!r2.ok,`المعكوس يُرفض: «${r2.built}»`);

console.log('\n٣) الدرجة الثانية تُدخل كلمات دخيلة — ولا تكون من كلمات الجملة');
const r3=await page.evaluate(()=>{
  wbStart("He does not like cold weather.",2);
  const extra=wbPool.filter(w=>wbTok.indexOf(w)<0);
  const dup=extra.filter(w=>wbTok.some(t=>wbNorm(t)===wbNorm(w)));
  return {pool:wbPool.length,tok:wbTok.length,extra:extra.length,dup:dup.length};
});
ok(r3.pool>r3.tok,`البنك أوسع من الجملة (${r3.pool} مقابل ${r3.tok})`);
ok(r3.dup===0,'ولا دخيلةَ تُطابق كلمةً في الجملة — وإلا صار الصواب غامضاً');

console.log('\n٤) خطة التخفيف: تصعد بالإتقان وتنزل بالتعثّر');
const r4=await page.evaluate(()=>{
  try{localStorage.removeItem('mawhiba_wb_stage')}catch(e){}
  wbStage=1;wbStreak=0;wbMiss=0;
  const seen=[];
  for(let i=0;i<WB_REQ;i++){wbGrade(true);seen.push(wbStage)}
  const up=wbStage;
  wbGrade(false);wbGrade(false);
  return {up,down:wbStage,req:WB_REQ,back:WB_BACK,seen};
});
ok(r4.up===2,`${r4.req} صحيحات متتالية ⇒ الدرجة الثانية (صارت ${r4.up})`);
ok(r4.down===1,`و${r4.back} خطآن متتاليان ⇒ تعود الأولى (صارت ${r4.down})`);

console.log('\n٥) بوّابة الصدى: تُسلَّح على الناسخ وتنحلّ عن المؤلِّف');
const r5=await page.evaluate(()=>{
  const says=["I like cake.","I do not like cake."];
  try{localStorage.removeItem('mawhiba_echo_v1')}catch(e){}
  // مؤلِّف: جوابان من عنده
  echoRecord("I like chocolate very much",says);
  echoRecord("My mother makes it at home",says);
  const free=echoArmed();
  // ناسخ: يردّ بالجملة المعروضة حرفياً
  echoRecord("I like cake.",says);
  echoRecord("I do not like cake.",says);
  const copier=echoArmed();
  return {free,copier};
});
ok(r5.free===false,'من يؤلّف لا تُسلَّح عليه البوّابة');
ok(r5.copier===true,'ومن ينسخ مرّتين تُسلَّح عليه');

console.log('\n٥ب) النسخ يُحسب بالكلمات لا بالحرف: النقطة وحدها لا تُنجّي');
const r5b=await page.evaluate(()=>{
  try{localStorage.removeItem('mawhiba_echo_v1')}catch(e){}
  echoRecord("i like cake",["I like cake.","I do not like cake."]);
  echoRecord("I like cake!",["I like cake.","I do not like cake."]);
  return echoArmed();
});
ok(r5b===true,'«i like cake» صدىً لـ«I like cake.»');

console.log('\n٦) البنك ينحلّ عند الدرجة الأخيرة — لا يبقى عكازاً');
const r6=await page.evaluate(()=>{
  try{localStorage.setItem('mawhiba_echo_v1',JSON.stringify({r:[1,1,1,1]}))}catch(e){}
  const armedAt1=(()=>{try{localStorage.setItem('mawhiba_wb_stage','1')}catch(e){};
    coachMsgs=[{role:"model",text:"x",says:["I like cake.","I do not."]}];return coachBankOn()})();
  const armedAt3=(()=>{try{localStorage.setItem('mawhiba_wb_stage',String(WB_STAGES.length))}catch(e){};
    return coachBankOn()})();
  return {armedAt1,armedAt3};
});
ok(r6.armedAt1===true,'مسلَّح في الدرجة الأولى');
ok(r6.armedAt3===false,'ومحلولٌ في الدرجة الأخيرة — تعود الجملة جاهزة');

console.log('\n٧) بذرة هيا وحدها: قياسها ٤ أصداء من ١٥، وأخواها صفر');
// صفحة نظيفة: البذرة تُوضع مرّة عند التحميل، والاختبارات السابقة مسحت المفتاح
const p1=await b.newPage({viewport:{width:420,height:900}});
p1.on('pageerror',e=>{console.log('  ✗ PAGEERROR '+e.message);fails++});
await p1.route('**/rest/v1/**',r=>r.fulfill({status:201,contentType:'application/json',body:'[]'}));
await p1.goto('http://127.0.0.1:8931/index.html');
await p1.waitForFunction(()=>typeof echoArmed==='function');
const armedH=await p1.evaluate(()=>({seed:(JSON.parse(localStorage.getItem('mawhiba_echo_v1')||'{}').seed===true),armed:echoArmed()}));
ok(armedH.seed===true&&armedH.armed===true,'هيا مسلَّحة من أوّل جلسة — البذرة من قياسٍ وقع لا من ظنّ');
const p2=await b.newPage({viewport:{width:420,height:900}});
p2.on('pageerror',e=>{console.log('  ✗ PAGEERROR '+e.message);fails++});
await p2.route('**/rest/v1/**',r=>r.fulfill({status:201,contentType:'application/json',body:'[]'}));
await p2.goto('http://127.0.0.1:8931/index.html?p=mohammed');
await p2.waitForFunction(()=>typeof echoArmed==='function');
const armedM=await p2.evaluate(()=>echoArmed());
ok(armedM===false,'ومحمد بلا بذرة — لا يُعاقَب من لا يحتاج البوّابة');

console.log('\n٨) لا يُسدّ الطريق: الخطأ يكشف الصواب ويُمضي');
const r8=await page.evaluate(()=>{
  wbStart("I like cake.",1);
  wbPicked=[0];  // ترتيب ناقص متعمّد
  const res=wbCheck();
  return {res,locked:wbLocked,target:wbTarget};
});
ok(r8.res===false&&r8.locked===true,'الفحص يُقفل ويكشف الصواب بدل أن يمنع التقدّم');

console.log('\n٩) الجملة تُبنى فعلاً على الشاشة — في الإملاء وفي الخطة');
const p3=await b.newPage({viewport:{width:420,height:900}});
p3.on('pageerror',e=>{console.log('  ✗ PAGEERROR '+e.message);fails++});
await p3.route('**/rest/v1/**',r=>r.fulfill({status:201,contentType:'application/json',body:'[]'}));
await p3.addInitScript(()=>{
  Object.defineProperty(window,'speechSynthesis',{configurable:true,value:{speak(){},cancel(){},resume(){},pause(){},
    getVoices:()=>[{lang:'en-US',name:'X'}],speaking:false,pending:false}});
  window.SpeechSynthesisUtterance=function(t){this.text=t};
});
await p3.goto('http://127.0.0.1:8931/index.html');
await p3.waitForFunction(()=>typeof startDictation==='function');
// نقفز إلى أول جملة في جلسة الإملاء
const dictBuild=await p3.evaluate(async()=>{
  startDictation();
  while(!dictIsBuild()&&dictIdx<dictSession.length-1){dictIdx++}
  dictLocked=false;wbReset();render();
  const isB=dictIsBuild();
  const tiles=document.querySelectorAll('button[onclick^="wbPick"]').length;
  return {isB,tiles,n:dictSession.length,words:dictSession.filter(x=>!x.build).length};
});
ok(dictBuild.n===12&&dictBuild.words===8,`جلسة الإملاء: ${dictBuild.words} كلمات ثم ٤ جمل (${dictBuild.n} عنصراً)`);
ok(dictBuild.isB&&dictBuild.tiles>0,`وبنك الكلمات مرسوم على الشاشة (${dictBuild.tiles} كلمة)`);
// نبنيها بالضغط الحقيقي على الأزرار، ثم نتحقّق
const dictRes=await p3.evaluate(async()=>{
  const tok=wbTok.slice();
  for(const t of tok){
    const i=wbPool.findIndex((w,k)=>w===t&&wbPicked.indexOf(k)<0);
    const btn=document.querySelector(`button[onclick="wbPick(${i})"]`);
    if(btn)btn.click();
  }
  const before=dictScore;
  dictCheck();
  return {built:wbBuilt(),ok:wbOk,gained:dictScore-before,html:document.body.innerText.indexOf('الجملة صحيحة')>=0};
});
ok(dictRes.ok&&dictRes.gained===1,`الضغط الحقيقي يبني ويُحتسب: «${dictRes.built}»`);
ok(dictRes.html,'وتُعرض النتيجة على الشاشة');
const planBuild=await p3.evaluate(()=>{
  const P=engPool().filter(x=>x.t==="build");
  planItems=[P[0]];planIdx=0;planLocked=false;planScore=0;planDone=false;planMeta={secs:0};
  mode="engplan";wbStart(P[0].s);render();
  return {n:P.length,tiles:document.querySelectorAll('button[onclick^="wbPick"]').length,
          hasPrompt:document.body.innerText.indexOf('قولي بالإنجليزية')>=0};
});
ok(planBuild.n>0,`مخزون الخطة يضمّ ${planBuild.n} جملة بناء`);
ok(planBuild.tiles>0&&planBuild.hasPrompt,'وتُعرض في الخطة بطلبٍ عربي وبنكِ كلمات');

console.log('\n١٠) وضع أخطائي: بطاقة تصحيح من المحادثة تُبنى وتُجدوَل');
const errRes=await p3.evaluate(()=>{
  try{localStorage.removeItem('mawhiba_coach_fix_v1');localStorage.removeItem('mawhiba_dict_err_v1');
      localStorage.removeItem('mawhiba_eng_item_err_v1')}catch(e){}
  fixCardSave({said:"I go beach yesterday",fix:"I went to the beach yesterday.",why:"الحدث في الماضي"});
  const m=JSON.parse(localStorage.getItem('mawhiba_coach_fix_v1')||'{}');
  const k=Object.keys(m)[0];
  const sameDay=errCount();           // التصحيح عُرض للتوّ في الخلاصة — لا يُعاد في اليوم نفسه
  m[k].due=srsToday();                // الغد: نُقدّم الساعة بدل انتظاره
  localStorage.setItem('mawhiba_coach_fix_v1',JSON.stringify(m));
  const nextDay=errCount();
  startErrors();
  const c=errCur();
  const tiles=document.querySelectorAll('button[onclick^="wbPick"]').length;
  return {sameDay,nextDay,kind:c&&c.kind,tiles,saidShown:document.body.innerText.indexOf('I go beach yesterday')>=0};
});
ok(errRes.sameDay===0&&errRes.nextDay===1,'البطاقة لا تعود في يومها — عُرضت في الخلاصة، وتُستحقّ في موعدها');
ok(errRes.kind==='fix'&&errRes.tiles>0&&errRes.saidShown,'وتُعرض مع ما قاله هو، وتُبنى كلمةً كلمة');
const errGrade=await p3.evaluate(()=>{
  const tok=wbTok.slice();
  for(const t of tok){const i=wbPool.findIndex((w,k)=>w===t&&wbPicked.indexOf(k)<0);wbPicked.push(i)}
  errCheck();
  const after=JSON.parse(localStorage.getItem('mawhiba_coach_fix_v1')||'{}');
  const k=Object.keys(after)[0];
  return {ok:errOk,due:k?after[k].due:null,today:srsToday(),box:k?after[k].box:null};
});
ok(errGrade.ok,'الإصابة تُقبل');
ok(errGrade.due>errGrade.today,`وموعدها يُدفع إلى الأمام (بعد ${errGrade.due-errGrade.today} يوماً)`);
const errGone=await p3.evaluate(()=>{
  // ثلاث إصابات متتالية ⇒ لم تعد خطأً
  const m=JSON.parse(localStorage.getItem('mawhiba_coach_fix_v1')||'{}');
  const k=Object.keys(m)[0];
  fixCardGrade(k,true);fixCardGrade(k,true);
  return Object.keys(JSON.parse(localStorage.getItem('mawhiba_coach_fix_v1')||'{}')).length;
});
ok(errGone===0,'وثلاث إصابات تُخرجها من القائمة — لا تبقى تُثقلها أبداً');

console.log('\n١١) الأفعال المركّبة (phrasal verbs): شرحٌ سببي لا معنًى فقط (طلب صاحب المشروع، ١٨ أغسطس)');
// أخطأت هيا "look after"/"look like" بترجمةٍ حرفية كلمةً كلمة أكثر من مرّة — الشرح
// السببي (فعلٌ مركّب، لا يُترجَم جزءاً جزءاً) أُضيف لمعالجة سبب الخطأ لا معناه فقط
const phrasal=await p3.evaluate(()=>{
  const ids=['u1_v8','u1_v9','u2_v9','u8_v3'];
  const items=ids.map(id=>ENG_ITEMS.find(x=>x.id===id));
  const shape=items.every(it=>it&&/فعلٌ مركّب/.test(it.w));
  const it=items[0];
  errItems=[{kind:'item',it,key:it.id}];errIdx=0;errLocked=false;errOk=false;errPicked=null;render();
  errChoose(it.a);
  const shown=document.body.innerText.includes('فعلٌ مركّب');
  return {shape,shown};
});
ok(phrasal.shape,'الأربعة (look after/look like/fall over/sign up) تحمل السبب في حقل w');
ok(phrasal.shown,'ويظهر على الشاشة فعلياً بعد الإجابة — لا نصّاً محفوظاً بلا عرض');

console.log('\n'+(fails?`=== ${fails} فشل ===`:'=== كل الاختبارات نجحت ==='));
await b.close();process.exit(fails?1:0);
})();
