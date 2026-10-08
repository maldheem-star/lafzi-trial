// فهرسُ كتاب الرياضيات شاشةً، والنوعُ معروضاً — ٨ أكتوبر
// الأمر: «حط قسم للرياضيات وصنف الاسئلة لكل موضوع في الفهرس.. لكي تعلم هيا اسم ونوع
// كل سؤال حينما تتدرب وتحل الاسئلة».
//
// وما يُفحَص هنا هو **العرض** لا التصنيف: التصنيف كان مبنيّاً في `MATH6_PLAN` منذ
// ٢٢ أغسطس ويحرسه `test_math6.js`. فهذا يفحص: أن الفهرس يُعرض كاملاً (لا دروسَ
// محذوفة)، وأن كل صفٍّ يحمل اسمَه ونوعَه، وأن النوع يصل **بطاقة السؤال نفسها**
// أثناء الحلّ، وأن نطاق الفصل يحصر الجلسة فعلاً ولا يُسرّب درساً من فصلٍ آخر.
const {chromium}=require('/opt/node22/lib/node_modules/playwright');
let pass=0,fail=0;
const ok=(c,m)=>{c?(pass++,console.log('  ✓ '+m)):(fail++,console.log('  ✗ FAIL '+m))};
const BASE='http://127.0.0.1:8931/index.html';

(async()=>{
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'});
const mk=async q=>{
  const ctx=await b.newContext({viewport:{width:420,height:900}});
  const p=await ctx.newPage();
  p.on('pageerror',e=>{fail++;console.log('  ✗ PAGEERROR '+e.message)});
  await p.route('**/functions/v1/**',r=>r.fulfill({status:200,contentType:'application/json',body:'{}'}));
  await p.route('**/rest/v1/**',r=>r.fulfill({status:200,contentType:'application/json',body:'[]'}));
  await p.goto(BASE+(q||''),{waitUntil:'domcontentloaded'});
  await p.waitForFunction(()=>typeof render==='function',{timeout:15000});
  await p.evaluate(()=>localStorage.clear());
  return p;
};
const openGate=p=>p.evaluate(()=>{gateLeft=0;gateStop();render()});

// ===== ١) كلُّ درسٍ في الفهرس معروضٌ باسمه ونوعه =====
console.log('\n١) الفهرس معروضٌ كاملاً');
{
  const p=await mk();
  const r=await p.evaluate(()=>{
    goMath6Menu();
    const txt=document.getElementById('app').innerText;
    const L=math6Lessons();
    return {
      txt:txt,
      missNo:L.filter(x=>txt.indexOf(x.no)<0).map(x=>x.no),
      missT:L.filter(x=>txt.indexOf(x.t)<0).map(x=>x.t),
      // النوعُ يُعرض وسماً حيث يُضيف، والعنوانُ هو النوع حيث تطابقا. **والقياسُ على
      // الصفّ نفسه لا على نصّ الصفحة**: أوّلُ صياغةٍ بحثت عن «🏷️ س» في الصفحة كلّها
      // فاتّهمت الدرسَ ٧-٣ بوسمٍ يملكه جارُه ٦-٣ («ضرب الكسور العشرية» عنوانُ ذاك
      // ونوعُ هذا) — بلاغٌ كاذب من مقياسٍ لا يعرف لمن الوسم.
      rows:L.map(function(x){
        const sp=[...document.querySelectorAll('#app span')]
          .filter(n=>n.textContent.indexOf(x.no+' · '+x.t)===0)[0];
        if(!sp)return {no:x.no,found:false};
        const row=sp.parentElement.parentElement;
        const tag=[...row.querySelectorAll('span')].filter(n=>n.textContent.indexOf('🏷️')===0)[0];
        return {no:x.no,found:true,t:x.t,sk:x.sk||"",tag:tag?tag.textContent.replace('🏷️ ','').trim():""};
      }),
      chapters:MATH6_PLAN.filter(c=>txt.indexOf(c.name)<0).map(c=>c.name),
      lessons:L.length,prep:txt.indexOf(MATH6_PREP[1].name)>=0
    };
  });
  ok(r.lessons>=31,`الفهرس فيه ${r.lessons} درساً (الكتاب أكثر من ثلاثين)`);
  ok(!r.missNo.length,'ولا رقمَ درسٍ غائب عن الشاشة'+(r.missNo.length?' — '+r.missNo.join(','):''));
  ok(!r.missT.length,'ولا عنوانَ درسٍ غائباً'+(r.missT.length?' — '+r.missT.join(' | '):''));
  const lost=r.rows.filter(x=>!x.found).map(x=>x.no);
  ok(!lost.length,'وكلُّ صفٍّ موجودٌ في DOM بعينه'+(lost.length?' — '+lost.join(','):''));
  const missTag=r.rows.filter(x=>x.found&&x.sk&&x.sk!==x.t&&x.tag!==x.sk);
  ok(!missTag.length,'وكلُّ عائلةِ مهارةٍ تختلف عن عنوانها لها وسمٌ في صفّها — فالتصنيف مرئيٌّ لا مسجَّلٌ وحده'
    +(missTag.length?' — '+missTag.map(x=>x.no).join(','):''));
  const dup=r.rows.filter(x=>x.found&&x.tag&&x.tag===x.t);
  ok(!dup.length,'ولا وسمَ يكرّر عنوانَ صفّه'+(dup.length?' — '+dup.map(x=>x.no).join(','):''));
  ok(r.rows.filter(x=>x.tag).length>=10,
    `ووسومُ النوع ظاهرةٌ فعلاً (${r.rows.filter(x=>x.tag).length} صفّاً) — فالقسمُ لا يمرّ فحصاً فارغاً`);
  ok(!r.chapters.length,'وأسماءُ الفصول الخمسة كما في الكتاب'+(r.chapters.length?' — '+r.chapters.join(' | '):''));
  ok(r.prep,'والتهيئة صفٌّ باسمها لا «من الكتاب»');
  // والدرسُ بلا أسئلة يُقال لا يُحذَف
  ok(/لا أسئلة بعد/.test(r.txt),'والدروسُ بلا أسئلة تُعلَن صريحةً («لا أسئلة بعد»)');
  ok(/أسئلةٌ تتولّد/.test(r.txt),'والمولَّد يُفرَّق عن المنقول في العرض');
  await p.context().close();
}

// ===== ٢) النوعُ يصل بطاقةَ السؤال أثناء الحلّ — وهو عينُ ما طُلب =====
console.log('\n٢) الاسمُ والنوع على بطاقة السؤال');
{
  const p=await mk();
  const r=await p.evaluate(()=>{startMath6('');return {n:math6Items.length}});
  ok(r.n>0,`جلسةٌ شاملة بـ${r.n} أسئلة`);
  await openGate(p);
  // **والدرسُ يُثبَّت لا يُترَك للقرعة**: نوعُ ستّةَ عشرَ درساً يساوي عنوانَه فلا وسمَ
  // له، فلو وقعت القرعةُ عليه مرّ القسمُ بلا أن يفحص ما بُني له — وهو فخُّ «اختبارٌ
  // يتقلّب بالقرعة» (٥ سبتمبر). فتُفحَص الحالتان بأعيانهما: درسٌ نوعُه يختلف وآخرُ يطابق.
  const c=await p.evaluate(()=>{
    const out=[];
    [["diff",x=>x.sk&&x.sk!==x.t],["same",x=>x.sk&&x.sk===x.t]].forEach(function(pr){
      const L=math6Ready().filter(pr[1])[0];
      if(!L){out.push({kind:pr[0],found:false});return}
      math6Items=[Object.assign(L.gen(),{_l:L})];math6Idx=0;math6Done=false;
      math6Setup();gateLeft=0;gateStop();render();
      const t=document.getElementById('app').innerText;
      out.push({kind:pr[0],found:true,no:L.no,title:L.t,sk:L.sk,
        hasNo:t.indexOf(L.no)>=0,hasT:t.indexOf(L.t)>=0,
        hasType:/🏷️ النوع:/.test(t),typeTxt:(t.match(/🏷️ النوع: (.+)/)||[])[1]||"",
        hasChName:t.indexOf(math6ChName(L.ch))>=0});
    });
    return out;
  });
  const diff=c.filter(x=>x.kind==='diff')[0],same=c.filter(x=>x.kind==='same')[0];
  ok(diff&&diff.found&&diff.hasNo&&diff.hasT,
    `رقمُ الدرس وعنوانه على البطاقة (${diff?diff.no+' · '+diff.title:'—'})`);
  ok(diff&&diff.hasType&&diff.typeTxt===diff.sk,
    `ونوعُه معروضٌ بوسم «النوع:» حيث يختلف عن العنوان (${diff?diff.sk:'—'})`);
  ok(diff&&diff.hasChName,'واسمُ الفصل كما في الفهرس');
  ok(same&&same.found&&!same.hasType&&same.hasT,
    `وحيث يطابق النوعُ العنوانَ فلا وسمَ مكرَّر (${same?same.title:'—'})`);
  // ويُعاد بناءُ الجلسة الشاملة بعد العبث بالحالة، فيبقى القسمُ التالي على جلسةٍ حقيقية
  await p.evaluate(()=>{startMath6('')});
  await openGate(p);
  // وشاشةُ النتيجة تحمل النوع كذلك
  const res=await p.evaluate(async()=>{
    while(!math6Done){gateLeft=0;gateStop();math6Choose(0);math6Next()}
    const t=document.getElementById('app').innerText;
    const sks=[...new Set(math6Items.map(x=>math6TypeOf(x._l)).filter(Boolean))];
    return {miss:sks.filter(s=>t.indexOf(s)<0),n:sks.length};
  });
  ok(res.n>0&&!res.miss.length,`وشاشةُ النتيجة تُفصِّل بالنوع (${res.n} نوعاً)`
    +(res.miss.length?' — غاب: '+res.miss.join(' | '):''));
  await p.context().close();
}

// ===== ٣) نطاقُ الفصل يحصر الجلسة فعلاً — عشرُ جلساتٍ لكل فصلٍ مؤهَّل =====
console.log('\n٣) جلسةُ الفصل محصورةٌ في فصلها');
{
  const p=await mk();
  const r=await p.evaluate(()=>{
    const out=[];
    MATH6_PLAN.forEach(function(c){
      if(math6ScopePool(c.ch).length<MATH6_CH_MIN)return;
      let leak=0,n=0,min=99;
      for(let i=0;i<10;i++){
        localStorage.clear();
        startMath6(String(c.ch));
        n+=math6Items.length;min=Math.min(min,math6Items.length);
        math6Items.forEach(function(it){if(Number(it._l.ch)!==Number(c.ch))leak++});
      }
      out.push({ch:c.ch,leak:leak,avg:n/10,min:min,pool:math6ScopePool(c.ch).length});
    });
    return out;
  });
  ok(r.length>=3,`${r.length} فصولٍ مؤهَّلةٍ لجلسةٍ مستقلّة (العتبة ${3})`);
  r.forEach(function(x){
    ok(x.leak===0,`الفصل ${x.ch}: صفرُ تسريبٍ من فصلٍ آخر في عشر جلسات`);
    ok(x.min>=Math.min(6,x.pool),`  وأقصرُ جلسةٍ فيه ${x.min} (المتاح ${x.pool})`);
  });
  await p.context().close();
}

// ===== ٤) والجلسةُ الشاملة لم تتغيّر — حارسُ انحدار =====
console.log('\n٤) الشاملة كما كانت');
{
  const p=await mk();
  const r=await p.evaluate(()=>{
    startMath6('');
    const chs=[...new Set(math6Items.map(x=>Number(x._l.ch)))];
    return {n:math6Items.length,chs:chs.length,scope:math6Chapter};
  });
  ok(r.n>=6,`الشاملة ${r.n} أسئلة`);
  ok(r.scope==='','ونطاقُها فارغٌ (كلُّ الفصول)');
  // ونداءٌ بلا معامل — كما تناديه الاختبارات القائمة — يبقى شاملاً
  const bare=await p.evaluate(()=>{startMath6();return {scope:math6Chapter,n:math6Items.length}});
  ok(bare.scope===''&&bare.n>=6,'ونداءٌ بلا معامل يبقى شاملاً (لا انحدارَ على ما يناديها)');
  await p.context().close();
}

// ===== ٥) الفهرس بابُ القسم، ولغير هيا لا يظهر =====
console.log('\n٥) الباب والظهور');
{
  const p=await mk();
  const r=await p.evaluate(()=>{
    home();
    const b=[...document.querySelectorAll('button')].map(x=>x.getAttribute('onclick')||'');
    return {menu:b.filter(x=>/goMath6Menu/.test(x)).length,direct:b.filter(x=>/startMath6/.test(x)).length};
  });
  ok(r.menu===1,'زرٌّ واحد في الرئيسية يفتح الفهرس');
  ok(r.direct===0,'ولا يُقتحَم القسمُ بلا فهرس');
  await p.context().close();
  for(const f of ['mohammed.html','elias.html']){
    const q=await b.newContext({viewport:{width:420,height:900}});
    const pg=await q.newPage();
    await pg.goto('http://127.0.0.1:8931/'+f,{waitUntil:'domcontentloaded'});
    await pg.waitForFunction(()=>typeof render==='function',{timeout:15000});
    await pg.waitForTimeout(300);
    const has=await pg.evaluate(()=>[...document.querySelectorAll('button')]
      .some(x=>/Math6/.test(x.getAttribute('onclick')||'')));
    ok(!has,`ولا يظهر في ${f}`);
    await q.close();
  }
}

// ===== ٦) اتّجاهُ أرقام الدروس: مقيسٌ بموضع المحارف لا منظوراً =====
// «١٠-٣» رقمٌ هنديّ ثمّ شرطةٌ ثمّ رقم — وهو بعينه شكلُ ما انقلب أربع مرّات في قسم
// الإحصاء (٢٥ أغسطس). والدعوى **ليست** «لا ينقلب» بل ما يقوله الكتاب: الحقلُ مخزَّنٌ
// بترتيب «الدرس-الفصل»، والعربيةُ تقلبه عرضاً فيُقرأ «الفصل-الدرس» كما يُطبَع في
// الفهرس بالضبط («٣-١٠» للدرس العاشر من الفصل الثالث). فالمقياسُ هو المطابقة لذلك.
//
// **وأوّلُ صياغةٍ لهذا القسم أسقطت رسماً سليماً**: اشترطتُ مواضعَ رتيبةً عبر المقطع
// كلِّه، وذلك لا يصحّ أصلاً — مقطعُ الأرقام يُرسَم من اليسار داخلَه (فـ«١٠» عشرةٌ لا
// صفرٌ وواحد) ومقاطعُه تُصفَّ من اليمين. فقِيست الخمسةُ والثلاثون كلُّها فإذا الرسم
// صحيحٌ فيها جميعاً، وصُحِّح الاختبار لا الشيفرة.
console.log('\n٦) الاتّجاه مقيسٌ لا منظور');
{
  const p=await mk();
  const r=await p.evaluate(()=>{
    goMath6Menu();
    const nodes=[...document.querySelectorAll('#app span')];
    return math6Lessons().map(function(L){
      const el=nodes.filter(n=>n.textContent.indexOf(L.no+' · ')===0)[0];
      if(!el)return {no:L.no,found:false};
      const tn=el.firstChild,rg=document.createRange(),arr=[];
      for(let i=0;i<L.no.length;i++){
        rg.setStart(tn,i);rg.setEnd(tn,i+1);
        arr.push([L.no[i],rg.getBoundingClientRect().left]);
      }
      arr.sort(function(a,c){return a[1]-c[1]});           // الترتيبُ البصريّ من اليسار
      const pr=L.no.split('-');
      return {no:L.no,found:true,visual:arr.map(x=>x[0]).join(''),
        want:pr.length===2?(pr[1]+'-'+pr[0]):L.no};
    });
  });
  ok(r.length>=31&&r.every(x=>x.found),`${r.length} رقمَ درسٍ مقيسٌ بموضع محارفه`);
  const bad=r.filter(x=>x.found&&x.visual!==x.want);
  ok(!bad.length,'وكلُّها تُقرأ «الفصل-الدرس» كما يُطبَع الفهرس'
    +(bad.length?' — انقلب: '+bad.map(x=>x.no+'⇒'+x.visual).join(' , '):''));
  const two=r.filter(x=>x.found&&x.no.length>3);
  ok(two.length>0&&two.every(x=>x.visual===x.want),
    `ومنها ذو الخانتين بأعيانه (${two.map(x=>x.visual).join(' , ')})`);
  await p.context().close();
}

await b.close();
console.log(`\n${fail?'✗ FAIL':'✓'} ${pass} نجحت · ${fail} فشلت`);
process.exit(fail?1:0);
})();
