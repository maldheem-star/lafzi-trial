// ثلاثة أُصلحت بعد فحص جلسة هيا الجارية — ٣٠ أغسطس.
// وكلُّها من صفوفٍ حقيقية في `mawhiba_answer_log`، لا من حالاتٍ مؤلَّفة.
const {chromium}=require('/opt/node22/lib/node_modules/playwright');
let fails=0;const ok=(c,m)=>{console.log((c?'  ✓ ':'  ✗ FAIL ')+m);if(!c)fails++};
(async()=>{
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'});
const ctx=await b.newContext({viewport:{width:420,height:900}});
await ctx.route('**/rest/v1/**',r=>r.fulfill({status:200,contentType:'application/json',body:'[]'}));
await ctx.route('**/functions/v1/**',r=>r.fulfill({status:200,contentType:'application/json',body:'{"ok":false}'}));
await ctx.addInitScript(()=>{
  Object.defineProperty(window,'speechSynthesis',{configurable:true,value:{
    speak(u){setTimeout(function(){u.onstart&&u.onstart()},0)},cancel(){},resume(){},pause(){},
    getVoices:()=>[{lang:'en-US',name:'X'}],speaking:false,pending:false}});
  window.SpeechSynthesisUtterance=function(t){this.text=t};
});
const p=await ctx.newPage();
p.on('pageerror',e=>{console.log('  ✗ PAGEERROR '+e.message);fails++});
await p.goto('http://127.0.0.1:8931/index.html');
await p.waitForFunction(()=>typeof azureToScore==='function'&&typeof wbStart==='function');

console.log('\n١) الاختصار يُفكَّك في الطرفين — الصفّان اللذان نالا ١٠٠٪ زوراً');
{
  // الصفّ الحقيقي: «I'll see you after class.» · دقّة ٩٢٪ · اكتمال ١٠٠٪ · وُسم misaligned
  // ونال ١٠٠٪ من مطابقة النصّ. Azure يُعيد I'll كلمةً واحدة، وهدفُنا i+will كلمتان.
  const r1=await p.evaluate(()=>azureToScore("I'll see you after class.",{
    pron:88,accuracy:92,fluency:90,completeness:100,
    words:[{w:"I'll",score:88,err:"None"},{w:"see",score:95,err:"None"},{w:"you",score:93,err:"None"},
           {w:"after",score:90,err:"None"},{w:"class",score:94,err:"None"}]}));
  ok(r1.aligned===true,'تحاذى بعد التفكيك — '+r1.aligned);
  ok(r1.total===6,'وستّة رموزٍ في الطرفين — '+r1.total);
  ok(r1.pct===88,'والدرجة من مسطرة Azure لا من مطابقة النصّ — '+r1.pct);
  ok(r1.disagree===false,'ولا تعارضَ يُوسَم');

  // والصفّ الثاني: دقّة ٧١٪ واكتمال ٧١٪ — كان ١٠٠٪، وصار دون العتبة
  const r2=await p.evaluate(()=>azureToScore("I can't remember the teacher's last name.",{
    pron:72,accuracy:71,fluency:80,completeness:71,
    words:[{w:"I",score:80,err:"None"},{w:"can't",score:70,err:"None"},{w:"remember",score:65,err:"None"},
           {w:"the",score:75,err:"None"},{w:"teacher's",score:70,err:"None"},{w:"last",score:72,err:"None"},
           {w:"name",score:74,err:"None"}]}));
  ok(r2.aligned===true,'الثاني تحاذى كذلك — '+r2.aligned);
  ok(r2.total===8,'وثمانية رموز — '+r2.total);
  ok(r2.pct===72,'ودرجته الحقيقية ٧٢٪ لا ١٠٠٪ — '+r2.pct);
  ok(r2.ok===false,'فلا يُحسب نجاحاً — وهذا هو الفرق الذي أوجب الإصلاح');
}

console.log('\n٢) وما لا يُفسّره الاختصار يبقى موسوماً — العلاج لسببٍ لا يُلغي المقياس');
{
  // حذفٌ حقيقي: قالت ثلاث كلماتٍ من ستّ. لا اختصار هنا، فيبقى الاختلال ويُوسَم.
  const r=await p.evaluate(()=>azureToScore("Can I have a glass of juice?",{
    pron:55,accuracy:50,fluency:60,completeness:43,lexical:"Can I have a juice",
    words:[{w:"Can",score:80,err:"None"},{w:"I",score:75,err:"None"},{w:"have",score:70,err:"None"}]}));
  ok(r.aligned===false,'لم يتحاذَ — والسبب حذفٌ لا اختصار');
  ok(r.total===7,'والهدف سبع كلمات — '+r.total);
}

console.log('\n٣) ولا تتبدّل الحالات التي كانت سليمة أصلاً');
{
  const r=await p.evaluate(()=>azureToScore("I can try that.",{
    pron:98,accuracy:97,fluency:99,completeness:100,
    words:[{w:"I",score:97,err:"None"},{w:"can",score:98,err:"None"},
           {w:"try",score:99,err:"None"},{w:"that",score:96,err:"None"}]}));
  ok(r.aligned===true&&r.pct===98,'الصفّ الذي نال ٩٨٪ فعلاً بقي ٩٨٪ — '+r.pct);
  // كلمةٌ مفردة: الدرجة من دقّة الأصوات لا من المركّبة (PRON_SHORT_REF)
  const w=await p.evaluate(()=>azureToScore("Concert",{
    pron:70,accuracy:92,completeness:100,words:[{w:"Concert",score:92,err:"None"}]}));
  ok(w.pct===92,'والكلمة المفردة تبقى على دقّة أصواتها — '+w.pct);
}

console.log('\n٤) بوّابة التسرّع على بنك الكلمات: الأرضيّة مشتقّة لا مختارة');
{
  const g=await p.evaluate(()=>({floor:SEC_GATE_FLOOR.build,cap:SEC_GATE_MAX.build}));
  ok(g.floor===4,'الأرضيّة ٤ث — نصفُ وسيطها المنخرط (٨٫٤ث) — '+g.floor);
  ok(g.cap===9,'والسقف ٩ث عند وسيطها المنخرط — '+g.cap);
  // **الشرط الذي يجعلها بوّابةً لا عقوبة**: أسرع إجابةٍ صحيحة أنتجتها قطّ ٤٫٣ث.
  ok(g.floor<4.3,'ودون أسرع إجابةٍ صحيحة سجّلتها (٤٫٣ث) — فلا تُحبَس محاولةٌ صادقة');
}

console.log('\n٥) والكلمات لا تظهر قبل الأرضيّة، والمطلوب يبقى معروضاً');
{
  await p.evaluate(()=>{wbStart("I drink water in the morning.",1)});
  const s1=await p.evaluate(()=>({open:gateOpen(),html:wbHTML()}));
  ok(s1.open===false,'البوّابة مغلقة عند بدء العنصر');
  ok(!/onclick="wbPick/.test(s1.html),'ولا كلمةَ قابلةً للضغط — '+(/wbPick/.test(s1.html)?'ظهرت':'محجوبة'));
  ok(/الكلمات ستظهر بعد/.test(s1.html),'ويُعرض العدّاد بدل صمتٍ يُربك');
  // ونصُّ الشريط يسمّي المحجوب هنا «الكلمات» لا «الخيارات» — لا كلمةَ «خيارات» على
  // شاشةٍ لا خيارات فيها. كشفه لقطةُ شاشةٍ لا اختبار، فصار محروساً.
  ok(!/الخيارات ستظهر/.test(s1.html),'ولا يُسمّي محجوباً غير المحجوب');
  ok(/اضغطي الكلمات بالترتيب/.test(s1.html),'وسطرُ المبنيّ باقٍ — فيُرى أنه فارغ');

  // وبعد انقضائها تظهر الكلمات كاملةً
  await p.evaluate(()=>{gateLeft=0;gateStop()});
  const s2=await p.evaluate(()=>({open:gateOpen(),html:wbHTML()}));
  ok(s2.open===true,'ثم تنفتح');
  ok((s2.html.match(/onclick="wbPick\(/g)||[]).length>=6,
     'وتظهر الكلمات كلّها — '+((s2.html.match(/onclick="wbPick\(/g)||[]).length));
}

console.log('\n٦) والبوّابة تُسلَّح عند كل عنصرٍ جديد — لا عند العنصر الأوّل وحده');
{
  await p.evaluate(()=>{gateLeft=0;gateStop();wbStart("My family lives in Riyadh.",1)});
  ok(await p.evaluate(()=>gateOpen())===false,'العنصر التالي بوّابته مسلَّحة كذلك');
  // ومرحلةُ الكتابة بلا بنكٍ أصلاً — فلا بوّابة على ما لا يُنقَر
  await p.evaluate(()=>{gateLeft=0;gateStop();wbStart("I like apples.",WB_STAGES.length)});
  ok(await p.evaluate(()=>gateOpen())===true,'ومرحلة الكتابة بلا بوّابة — لا كلمات تُنقَر فيها');
}

await b.close();
console.log(fails?`\n=== ${fails} فشل ===`:'\n=== كل الاختبارات نجحت ===');
process.exit(fails?1:0);
})();
