// حارسُ ترتيب الصفحة الرئيسة — ٤ أكتوبر
// الأمر: «قصر او رتب الصفحة الرئيسية حسب الحاجة والمعايير العلمية».
// وأخطرُ ما في إعادة الترتيب أن يضيع زرٌّ بصمت، فالقسم الأوّل يقيس ذلك بالاسم لا بالعدد.
const {chromium}=require('/opt/node22/lib/node_modules/playwright');
let pass=0,fail=0;
const ok=(c,m)=>{c?(pass++,console.log('  ✓ '+m)):(fail++,console.log('  ✗ FAIL '+m))};
const BASE='http://127.0.0.1:8931/';

// الأقسامُ التي يجب أن تبقى مبلوغةً بنقرةٍ واحدة — **بأسمائها لا بعددها**،
// فإضافةُ زرٍّ مشروعة غداً لا تكسر الحارس، وحذفُ زرٍّ قائم يكسره (درس ١٨ أغسطس).
const MUST={
  haya:["start('verbal')","start('quant')","start('science')","start('flex')","start('full')",
    "goFadeMenu()","loadProgress()","loadKpi()","startBasics('mixed')","startBasics('multdiv')",
    // قسمُ الرياضيات بابُه شاشةُ الفهرس الآن (٨ أكتوبر) لا الجلسةُ مباشرةً — نفس شكل
    // `goStatMenu()` عند محمد. والدعوى هي هي: القسم مبلوغٌ بنقرةٍ واحدة ولم يضع.
    "startFactPlan()","goMath6Menu()","startEngPlan()","startDictation()","startListen()",
    "startRead()","startWrite()","startGram()","startStep()","startMinpair()","startSeq()",
    "startVideo()","startMock()","startPronunciation()","startCoach()","startSpeaking()",
    "startAudioDiag()"],
  mohammed:["startCoach()","startListen()","startRead()","startWrite()","startGram()",
    "startBuildSec()","startStep()","startMinpair()","startSeq()","startVideo()",
    "goStatMenu()","loadKpi()","startMock()","startAudioDiag()"],
  elias:["startCoach()","startListen()","startRead()","startWrite()","startGram()",
    "startBuildSec()","startStep()","startMinpair()","startSeq()","startVideo()",
    "loadKpi()","startMock()","startAudioDiag()"]
};
const PAGES=[['haya','index.html'],['mohammed','mohammed.html'],['elias','elias.html']];

(async()=>{
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'});
const mk=async f=>{
  const ctx=await b.newContext({viewport:{width:420,height:900}});
  const p=await ctx.newPage();
  p.on('pageerror',e=>{fail++;console.log('  ✗ PAGEERROR '+e.message)});
  await p.goto(BASE+f,{waitUntil:'domcontentloaded'});
  await p.waitForFunction(()=>typeof homeGroupsHTML==='function');
  await p.waitForTimeout(400);
  return p;
};
const snap=p=>p.evaluate(()=>{
  const btns=[...document.querySelectorAll('button')];
  return {
    handlers:btns.map(x=>(x.getAttribute('onclick')||'').trim()).filter(Boolean),
    heads:[...document.querySelectorAll('.section-title span')].map(x=>x.textContent.trim()),
    tiles:document.querySelectorAll('.mode.tile').length,
    tileSubs:document.querySelectorAll('.mode.tile .m-sub').length,
    pills:[...document.querySelectorAll('.due-pill')].map(x=>x.textContent.trim()),
    h:document.documentElement.scrollHeight,
    overflowX:document.documentElement.scrollWidth>document.documentElement.clientWidth,
    emptyModes:[...document.querySelectorAll('.modes')].filter(m=>!m.children.length).length
  };
});

console.log('\n١) لا زرَّ ضائعاً — كلُّ قسمٍ قائمٍ ما زال مبلوغاً');
const pages={};
for(const [name,file] of PAGES){
  const p=await mk(file);pages[name]=p;
  const s=await snap(p);
  const miss=MUST[name].filter(h=>!s.handlers.includes(h));
  ok(miss.length===0,`${name}: ${miss.length?'ضائع → '+miss.join('، '):'الأقسام كلّها حاضرة ('+MUST[name].length+')'}`);
  const dup=s.handlers.filter((h,i)=>s.handlers.indexOf(h)!==i);
  ok(dup.length===0,`  ولا زرَّ مكرّراً${dup.length?' → '+[...new Set(dup)].join('، '):''}`);
}

console.log('\n٢) مجموعاتٌ دلاليّة بحدودٍ بصرية — لا قائمةٌ مسطّحة');
for(const [name] of PAGES){
  const s=await snap(pages[name]);
  ok(s.heads.length>=5,`${name}: ${s.heads.length} مجموعة`);
  ok(new Set(s.heads).size===s.heads.length,'  ولا عنوانَ مكرّراً');
  ok(s.emptyModes===0,'  ولا مجموعةَ فارغة لها عنوان');
}

console.log('\n٣) صدرُ الصفحة وأوّلُ مجموعةٍ متوافقان (موضعُ الهدف — Bailly)');
ok((await snap(pages.haya)).heads[0].includes('القدرات'),'هيا: «القدرات — موهبة» أوّلاً');
for(const n of ['mohammed','elias'])
  ok((await snap(pages[n])).heads[0].includes('إنتاج'),`${n}: «إنتاجٌ ونطق» أوّلاً — حيث المحادثة`);

console.log('\n٤) الكشفُ التدريجي: الشرحُ يُخفى لا يُحذَف، وبلا عمقٍ إضافي');
{
  const p=pages.haya;
  const off=await snap(p);
  ok(off.tiles>0&&off.tileSubs===0,`عند الراحة: ${off.tiles} بلاطة بلا شرح`);
  await p.evaluate(()=>homeToggleSubs());await p.waitForTimeout(300);
  const on=await snap(p);
  ok(on.tileSubs===on.tiles,`وبعد الزرّ: الشرحُ على ${on.tileSubs} بلاطة من ${on.tiles}`);
  ok(on.h>off.h,`والصفحةُ أطول بالشرح (${off.h}px ⇐ ${on.h}px) — فالإخفاء يُقصّر فعلاً`);
  ok(on.handlers.length===off.handlers.length,'وعددُ الأزرار لم يتغيّر — لا شيء دُفن');
  ok(await p.evaluate(()=>lsGet('mawhiba_home_subs_v1'))==='1','والاختيارُ محفوظ');
  await p.evaluate(()=>homeToggleSubs());await p.waitForTimeout(300);
  ok((await snap(p)).tileSubs===0,'ويُطوى مرّةً أخرى');
}

console.log('\n٥) شارةُ المستحقّ: رقمٌ حقيقي من مخزون FSRS لا زينة');
{
  const p=pages.haya;
  const n=await p.evaluate(()=>{
    const today=Math.floor(Date.now()/86400000);
    const pool=listenBankFor(profileOf().level)||[];const st={};
    pool.slice(0,3).forEach(it=>{st[it.id]={box:2,seen:3,due:today-1,s:5,d:5,last:today-3}});
    lsSet('mawhiba_listen_srs',JSON.stringify(st));render();
    return 3;
  });
  await p.waitForTimeout(300);
  const s=await snap(p);
  ok(s.pills.length>=1,`ظهرت ${s.pills.length} شارة`);
  ok(s.pills.some(x=>x.indexOf('٣')===0),`والعدد يطابق المبذور (${n}) → «${s.pills[0]}»`);
  // بلا مستحقٍّ لا شارة — فلا تُعرض صفرٌ ولا يُعدّ البكر
  await p.evaluate(()=>{lsSet('mawhiba_listen_srs','{}');render()});
  await p.waitForTimeout(300);
  ok((await snap(p)).pills.length===0,'وتختفي حين لا مستحقّ — ولا تُعدّ البكر');
  // ومخزونٌ فاسد لا يُسقط الصفحة
  await p.evaluate(()=>{lsSet('mawhiba_listen_srs','{{{ليس JSON');render()});
  await p.waitForTimeout(300);
  const broke=await snap(p);
  ok(broke.handlers.length>=20,`ومخزونٌ فاسد لا يكسر الصفحة (${broke.handlers.length} زرّاً)`);
  await p.evaluate(()=>{lsDel?lsDel('mawhiba_listen_srs'):lsSet('mawhiba_listen_srs','{}');render()});
  await p.waitForTimeout(250);
}

console.log('\n٦) المستحقُّ يُشار إليه ولا يُعيد الترتيب (التمرّس — وعُرف Anki)');
{
  const p=pages.haya;
  const before=(await snap(p)).handlers.join('|');
  await p.evaluate(()=>{
    const today=Math.floor(Date.now()/86400000);
    const mk=(bank,key)=>{const pool=bank(profileOf().level)||[],st={};
      pool.forEach(it=>{st[it.id]={box:2,seen:3,due:today-5,s:5,d:5,last:today-9}});
      lsSet(key,JSON.stringify(st))};
    mk(gramBankFor,'mawhiba_gram_srs');mk(minpairBankFor,'mawhiba_minpair_srs');render();
  });
  await p.waitForTimeout(300);
  const after=await snap(p);
  ok(after.handlers.join('|')===before,'الترتيبُ ثابتٌ رغم امتلاء المستحقّ');
  ok(after.pills.length>=2,`والشارات ظهرت (${after.pills.length}) — فالمستحقّ مقروءٌ فعلاً`);
}

console.log('\n٧) الاتّجاه والعرض — لا فيضانَ أفقي على عرض الهاتف');
for(const [name] of PAGES){
  const s=await snap(pages[name]);
  ok(!s.overflowX,`${name}: بلا تمريرٍ أفقي`);
}
{
  const m=await pages.haya.evaluate(()=>{
    const t=document.querySelector('.mode.tile'),cs=getComputedStyle(t);
    return {r:parseFloat(cs.borderRightWidth),l:parseFloat(cs.borderLeftWidth),dir:cs.direction};
  });
  ok(m.dir==='rtl'&&m.r>m.l,`وشريطُ اللون على حافّة البدء (يمين RTL): يمين ${m.r}px · يسار ${m.l}px`);
}

console.log('\n٨) الخطابُ يتحوّل في الاتّجاهين — زرُّ الكشف مشترَك');
{
  ok((await pages.haya.textContent('#app')).includes('اعرضي'),'هيا ترى «اعرضي»');
  for(const n of ['mohammed','elias']){
    const t=await pages[n].textContent('#app');
    ok(t.includes('اعرض ')&&!t.includes('اعرضي'),`${n} يرى «اعرض» لا «اعرضي»`);
  }
  await pages.elias.evaluate(()=>homeToggleSubs());await pages.elias.waitForTimeout(300);
  const t=await pages.elias.textContent('#app');
  ok(t.includes('أخفِ')&&!t.includes('أخفي'),'وبعد الكشف: «أخفِ» لا «أخفي»');
  await pages.elias.evaluate(()=>homeToggleSubs());
}

console.log('\n٩) كلُّ زرٍّ ما زال نقرةً واحدة (العريضُ الضحل — Landauer & Nachbar)');
{
  const p=pages.mohammed;
  for(const [go,want] of [["startListen()","listen"],["startGram()","gram"],
                          ["startCoach()","coach"],["goStatMenu()","statMenu"]]){
    await p.evaluate(()=>home());await p.waitForTimeout(150);
    const clicked=await p.evaluate(g=>{
      const el=[...document.querySelectorAll('button')].find(b=>(b.getAttribute('onclick')||'').trim()===g);
      if(!el)return null;el.click();return true;},go);
    await p.waitForTimeout(400);
    const md=await p.evaluate(()=>mode);
    ok(clicked&&md===want,`${go} → ${md}`);
  }
  await p.evaluate(()=>home());
}

await b.close();
console.log(`\n${fail?'✗ FAIL':'=== كل الاختبارات نجحت ==='} ${pass} ناجح · ${fail} ساقط`);
process.exit(fail?1:0);
})().catch(e=>{console.error('✗ FAIL '+e.message);process.exit(1)});
