// ===== «يتكرر في المحاكاة وفي الأقسام.. ولا تغيير حتى في الأرقام» — ٢٤ أكتوبر =====
// لقطةٌ من جهاز هيا ومعها هذه الجملة. والقياس صدّقها في نصفيها معاً:
//
// (أ) **داخل الجلسة**: ١٧٨ من ٢٠٠ جلسة كمّي و١٩٨ من ٢٠٠ مرونة و**٤٠ من ٤٠** محاكاة
//     فيها قالبٌ مُعاد، **وأدنى مسافةٍ بين نسختيه = ٢ في كل حالةٍ بلا استثناء**.
//     والسبب `spreadTemplates`: ترتيبُ `flat` من الأكثر تكراراً يضع نسختَي القالب في
//     أوّل خانتين زوجيّتين (٠ و٢). وجلسةُ هيا الحيّة ١١:٠٢-١١:٠٨ مطابقةٌ للمتوقَّع
//     حرفاً: الأول·محيط·الأول·بستان·وسيط·كسور·وسيط.
//     والحصّةُ (سدسٌ = ٢ من ١٢) هي ما **أجاز** الإعادة أصلاً: ٢٩ مولّداً كمّياً
//     و١٨ مرونةً لجلسةٍ من ١٢، فالإعادة تصادفٌ لا ضرورة.
//
// (ب) **عبر الأيّام**: قياسُ فضاء كل مولّدٍ (٤٠٠٠ سحبة لكلٍّ) أظهر **١٤ مولّداً من ٤٧
//     يُنتج نسخةً واحدة** — سؤالٌ واحد بأرقامه لا يتغيّر أبداً. وسجلُّ العرض العابر
//     للأيّام يُكتَب لهذين القسمين فعلاً (`item_id = tmplKey`) **و`drawSpread` لم تكن
//     تقرؤه قطّ**. وقياسٌ بجلسة أمسٍ مبذورة: ٣٫٧ من ١٢ قالباً في الكمّي و٥٫٨ في المرونة.
//
// **والفحص يقيس الإصلاح لا يُصادقه**: القسم ٢ يُعرِّف الدالّتين القديمتين نصّاً
// ويُثبت أنهما تسقطان في نفس المقياس — فلو كان المقياس أعمى لمرَّتا.
const {chromium}=require('/opt/node22/lib/node_modules/playwright');
let fails=0;const ok=(c,m)=>{console.log((c?'  ✓ ':'  ✗ FAIL ')+m);if(!c)fails++};
const BASE='http://127.0.0.1:8931/index.html';

(async()=>{
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'});
const rows=[];
const mk=async(q)=>{
  const ctx=await b.newContext({viewport:{width:420,height:900}});
  const p=await ctx.newPage();
  p.on('pageerror',e=>{console.log('  ✗ PAGEERROR '+e.message);fails++});
  await p.route('**/rest/v1/**',r=>{
    const d=r.request().postData()||'';
    if(r.request().method()==='POST'&&d)rows.push(d);
    r.fulfill({status:200,contentType:'application/json',body:'[]'});
  });
  await p.route('**/functions/v1/**',r=>r.fulfill({status:200,contentType:'application/json',body:'{"ok":false}'}));
  await p.goto(BASE+(q||''));
  await p.waitForFunction(()=>typeof drawSpread==='function'&&typeof spreadTemplates==='function');
  await p.waitForTimeout(200);
  return p;
};
const p=await mk();

// أدواتُ القياس تُحمَّل في الصفحة مرّةً: أدنى مسافة بين نسختين من قالبٍ واحد
await p.evaluate(()=>{
  window.__stat=function(list){
    const pos={};
    list.forEach(function(x,i){const k=tmplKey(x);(pos[k]=pos[k]||[]).push(i)});
    let dup=0,minGap=1/0,adj=0;
    Object.keys(pos).forEach(function(k){
      const a=pos[k];
      for(let i=1;i<a.length;i++){dup++;minGap=Math.min(minGap,a[i]-a[i-1]);if(a[i]-a[i-1]===1)adj++}
    });
    return {n:list.length,uniq:Object.keys(pos).length,dup:dup,adj:adj,
            minGap:dup?minGap:null};
  };
});

console.log('\n١) داخل الجلسة: صفرُ إعادةٍ في ٦٠ جلسةً لكل قسم، ولا جلسةَ تنقص');
{
  const r=await p.evaluate(()=>{
    const run=function(gens){
      let dup=0,sess=0,short=0,uniq=0,adj=0;
      for(let t=0;t<60;t++){
        try{lsDel(SEEN_KEY)}catch(e){}
        sessionSeenQuestions.clear();
        const s=window.__stat(drawSpread(gens,12));
        dup+=s.dup;uniq+=s.uniq;adj+=s.adj;
        if(s.dup)sess++;
        if(s.n<12)short++;
      }
      return {dup:dup,sess:sess,short:short,uniq:(uniq/60).toFixed(1),adj:adj};
    };
    const out={q:run(QUANT_GENS),f:run(FLEX_GENS)};
    try{lsDel(SEEN_KEY)}catch(e){}
    return out;
  });
  ok(r.q.sess===0,`الكمّي: ${r.q.sess} من ٦٠ جلسةً فيها إعادة (كان ١٧٨ من ٢٠٠)`);
  ok(r.f.sess===0,`المرونة: ${r.f.sess} من ٦٠ (كان ١٩٨ من ٢٠٠)`);
  ok(r.q.uniq==='12.0'&&r.f.uniq==='12.0',`والقوالبُ المتمايزة ١٢ من ١٢ (كمّي ${r.q.uniq} · مرونة ${r.f.uniq}؛ كانت ١٠٫٤ و٩٫٥)`);
  ok(r.q.short===0&&r.f.short===0,'ولا جلسةَ نقصت عن اثني عشر — قاعدة ١٨ أغسطس باقية');
  ok(r.q.adj===0&&r.f.adj===0,'ولا قالبان متجاوران');
}

console.log('\n٢) والمقياسُ يُميّز: الدالّتان القديمتان تسقطان فيه — مسافة ٢ دائماً');
{
  const r=await p.evaluate(()=>{
    // نصُّ الدالّتين كما كان قبل ٢٤ أكتوبر، حرفاً بحرف
    function oldSpread(list){
      const n=list.length;
      if(n<3)return list.slice();
      const groups={};
      list.forEach(function(x){const k=tmplKey(x);(groups[k]=groups[k]||[]).push(x)});
      const keys=Object.keys(groups).sort(function(a,b){return groups[b].length-groups[a].length});
      const flat=[];keys.forEach(function(k){groups[k].forEach(function(x){flat.push(x)})});
      const out=new Array(n);let i=0;
      for(let q=0;q<n;q+=2)out[q]=flat[i++];
      for(let q=1;q<n;q+=2)out[q]=flat[i++];
      return out.every(Boolean)?out:list.slice();
    }
    function oldDraw(gens,n){
      const cap=Math.max(2,Math.ceil(n/6)),count={},out=[];
      for(let i=0;i<n;i++){
        let it=null;
        for(let t=0;t<12;t++){
          const c=uniqueFromGens(gens);
          if(!c)break;
          it=it||c;
          if((count[tmplKey(c)]||0)<cap){it=c;break}
        }
        if(!it)break;
        const k=tmplKey(it);count[k]=(count[k]||0)+1;out.push(it);
      }
      return oldSpread(out);
    }
    let sess=0,gaps=[];
    for(let t=0;t<60;t++){
      try{lsDel(SEEN_KEY)}catch(e){}
      sessionSeenQuestions.clear();
      const s=window.__stat(oldDraw(FLEX_GENS,12));
      if(s.dup){sess++;gaps.push(s.minGap)}
    }
    try{lsDel(SEEN_KEY)}catch(e){}
    return {sess:sess,worstGap:gaps.length?Math.max.apply(null,gaps):null,
            allTwo:gaps.length>0&&gaps.every(function(g){return g===2})};
  });
  ok(r.sess>=40,`القديمةُ أعادت قالباً في ${r.sess} من ٦٠ جلسة — فالفحصُ يرى العيب`);
  ok(r.allTwo===true,`وأدنى مسافةٍ = ٢ في **كل** جلسةٍ منها (أقصى أدنى مسافة ${r.worstGap})`);
}

console.log('\n٣) التوزيعُ الدوريّ: المسافةُ = عددُ القوالب المتمايزة لا اثنين');
{
  const r=await p.evaluate(()=>{
    // **ولا أرقامَ في أسماء القوالب المُصطنَعة**: `tmplKey` يمحو الأرقام، فـ«ج١» و«ج٢»
    // قالبٌ واحد — وقد كتبتُها مرقَّمةً أوّلاً فانهارت ثمانيةُ مفرداتٍ إلى قالبٍ من ثمانية،
    // فأبلغ الفحصُ عن تجاورٍ هو حدُّ الخطوة المُعلَن لا عيبٌ فيها. والكاشفُ أمسك خطأَ
    // مُدخَلي أنا، وهذا بعينه ما يُرجى منه.
    const W=["دار","بحر","نهر","جبل","سهل","واد","روض","غار"];
    const mkq=function(t){return {q:t+" كم عددها؟"}};
    const list=[mkq("أول"),mkq("أول"),mkq("ثان"),mkq("ثان")];
    W.forEach(function(w){list.push(mkq(w))});
    const s=window.__stat(spreadTemplates(list));
    // وحدُّ الخطوة يُقال ويُقاس: قالبٌ يتجاوز نصفَ العدد يتجاور حتماً (مبدأ الحمام)،
    // والحصّةُ في `drawSpread` تمنع ذلك — والمفحوصُ هنا أنه لا يكسر ولا يُقصّر.
    const heavy=[];for(let i=0;i<8;i++)heavy.push(mkq("ثقيل"));
    heavy.push(mkq("أول"),mkq("أول"),mkq("ثان"),mkq("ثان"));
    const h=window.__stat(spreadTemplates(heavy));
    return {s:s,h:h,uniq:s.uniq};
  });
  ok(r.s.n===12,`الطولُ محفوظ (${r.s.n})`);
  ok(r.s.adj===0,'ولا تجاور');
  ok(r.s.minGap===r.uniq,`وأدنى مسافةٍ ${r.s.minGap} = عددُ القوالب المتمايزة (${r.uniq}) — كانت ٢ بالخطوة السابقة`);
  ok(r.h.n===12&&r.h.uniq===3,`وقالبٌ فوق النصف لا يكسر الخطوة ولا يُقصّر (${r.h.n} عنصراً · ${r.h.uniq} قوالب)`);
}

console.log('\n٤) والحصّةُ تُشتقّ من حجم المجمع — فمجمعٌ صغيرٌ لا يُقصّر الجلسة');
{
  const r=await p.evaluate(()=>{
    try{lsDel(SEEN_KEY)}catch(e){}
    let short=0,worst=0;
    for(let t=0;t<30;t++){
      sessionSeenQuestions.clear();
      const L=drawSpread([gPerim,gSides,gCube],12);   // ثلاثةُ مولّداتٍ لاثنتي عشرة خانة
      if(L.length<12)short++;
      const c={};L.forEach(function(x){const k=tmplKey(x);c[k]=(c[k]||0)+1});
      worst=Math.max(worst,Math.max.apply(null,Object.keys(c).map(function(k){return c[k]})));
    }
    try{lsDel(SEEN_KEY)}catch(e){}
    return {short:short,worst:worst};
  });
  ok(r.short===0,`صفرُ جلسةٍ ناقصة من ثلاثين (${r.short})`);
  ok(r.worst>=2&&r.worst<=6,`والحصّةُ ارتفعت تلقائياً إلى ${r.worst} (ceil(12/3)=4) — لا رقمٌ ثابت`);
}

console.log('\n٥) وعبر الأيّام: سجلُّ العرض يُقرأ — جلسةُ أمسٍ مبذورة');
{
  const r=await p.evaluate(()=>{
    const run=function(gens,rounds){
      let tot=0;
      for(let t=0;t<rounds;t++){
        try{lsDel(SEEN_KEY)}catch(e){}
        sessionSeenQuestions.clear();
        const y=drawSpread(gens,12);
        // تُسجَّل جلسةُ الأمس كما يسجّلها `logAnswer`: بمفتاح القالب بتاريخ أمس
        const o={};y.forEach(function(x){o[tmplKey(x)]={last:seenDay()-1,n:1,ok:1}});
        lsSet(SEEN_KEY,JSON.stringify(o));
        sessionSeenQuestions.clear();
        const d=drawSpread(gens,12);
        const yk={};y.forEach(function(x){yk[tmplKey(x)]=1});
        tot+=d.filter(function(x){return yk[tmplKey(x)]}).length;
      }
      try{lsDel(SEEN_KEY)}catch(e){}
      return tot/rounds;
    };
    return {q:run(QUANT_GENS,30),f:run(FLEX_GENS,30)};
  });
  ok(r.q<=1.0,`الكمّي: ${r.q.toFixed(1)} من ١٢ قالباً رأتها أمسِ (كان ٣٫٧)`);
  ok(r.f<=3.5,`المرونة: ${r.f.toFixed(1)} من ١٢ (كان ٥٫٨ — و١٨ مولّداً لا تتيح صفراً)`);
}

console.log('\n٦) ولا إقصاء: كلُّ القوالب محجوبةٌ ⇒ الجلسةُ كاملةٌ كما هي');
{
  const r=await p.evaluate(()=>{
    sessionSeenQuestions.clear();
    try{lsDel(SEEN_KEY)}catch(e){}
    // تُبذَر كلُّ قوالب المجمع بتاريخ اليوم — أسوأُ حالٍ ممكنة لسجلّ العرض
    const o={};
    for(let i=0;i<400;i++){try{o[tmplKey(pick(FLEX_GENS)())]={last:seenDay(),n:9,ok:9}}catch(e){}}
    lsSet(SEEN_KEY,JSON.stringify(o));
    sessionSeenQuestions.clear();
    const L=drawSpread(FLEX_GENS,12);
    try{lsDel(SEEN_KEY)}catch(e){}
    return {n:L.length,keys:Object.keys(o).length};
  });
  ok(r.keys>=12,`بُذر ${r.keys} قالباً بتاريخ اليوم`);
  ok(r.n===12,`والجلسةُ اثنا عشر سؤالاً (${r.n}) — الترتيبُ لا إقصاء`);
}

console.log('\n٧) والمحاكاة ٤٨: الإعادةُ الباقية هي «الشاذّ» اللفظيّ بالتصميم');
{
  const r=await p.evaluate(async()=>{
    let dup=0,sess=0,gaps=[],stems={},lens=[];
    for(let t=0;t<12;t++){
      try{lsDel(SEEN_KEY)}catch(e){}
      sessionSeenQuestions.clear();
      const L=await buildFull();lens.push(L.length);
      const pos={};
      L.forEach(function(x,i){const k=tmplKey(x);(pos[k]=pos[k]||[]).push(i)});
      let d=0;
      Object.keys(pos).forEach(function(k){
        const a=pos[k];
        for(let i=1;i<a.length;i++){d++;gaps.push(a[i]-a[i-1]);stems[k]=(stems[k]||0)+1}
      });
      dup+=d;if(d)sess++;
    }
    try{lsDel(SEEN_KEY)}catch(e){}
    return {dup:dup,sess:sess,minGap:gaps.length?Math.min.apply(null,gaps):null,
            stems:Object.keys(stems),lens:lens};
  });
  ok(r.lens.every(x=>x===48),`ورقةُ ثمانيةٍ وأربعين محفوظة (${r.lens[0]})`);
  ok(r.sess<=3,`${r.sess} من ١٢ ورقةً فيها إعادة (كان ٤٠ من ٤٠)`);
  ok(r.minGap===null||r.minGap>=10,`وأدنى مسافةٍ ${r.minGap} (كانت ٢ دائماً)`);
  ok(r.stems.every(k=>/لا تنتمي/.test(k)),
     `والمُعاد — إن وُجد — هو «أيّ كلمة لا تنتمي» وحده: ${r.stems.join(' | ')||'لا شيء'}`);
}

console.log('\n٨) جلسةٌ حقيقية بنقراتٍ فعلية — لا انحدار');
{
  rows.length=0;
  const r=await p.evaluate(async()=>{
    try{lsDel(SEEN_KEY)}catch(e){}
    await start('quant');
    const seen=[];
    for(let k=0;k<4;k++){
      gateSecs=0;gateLeft=0;render();
      const btns=[...document.querySelectorAll('#app .choices button')];
      if(!btns.length)return {err:'لا خيارات في الجولة '+k};
      seen.push(tmplKey(filtered[idx]));
      btns[0].click();
      await new Promise(r2=>setTimeout(r2,60));
      next();
      await new Promise(r2=>setTimeout(r2,60));
    }
    return {err:'',seen:seen};
  });
  ok(!r.err,'أربعُ جولاتٍ بنقراتٍ حقيقية ('+(r.err||'')+')');
  ok(r.seen&&new Set(r.seen).size===4,`وأربعةُ قوالبَ متمايزة (${r.seen&&new Set(r.seen).size})`);
  await p.waitForTimeout(300);
  const ans=rows.filter(x=>/"domain":"quant"/.test(x));
  ok(ans.length>=4,`ووصلت أربعةُ صفوفٍ على الأقلّ (${ans.length})`);
  ok(ans.every(x=>/"item_id":"/.test(x)),'وكلٌّ بمفتاح قالبه — فسجلُّ العرض يُكتَب');
}

console.log('\n٩) ولا خطأ، وكلُّ الدوال معرَّفة');
{
  ok((await p.evaluate(()=>censusMissing())).length===0,'`censusMissing()` فارغة');
  ok((await p.evaluate(()=>window.__ERRS.length))===0,'ولا خطأ في الصفحة');
}

await p.close();await b.close();
console.log(fails?`\n✗ FAIL ${fails} فشل`:'\n=== كل الاختبارات نجحت ===');
process.exit(fails?1:0);
})().catch(e=>{console.error('✗ FAIL '+e.message);process.exit(1)});
