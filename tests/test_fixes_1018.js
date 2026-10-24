// ===== حرّاسُ شحنة ١٨ أكتوبر =====
// أربعةُ تغييرات، كلُّها جاءت من قياسٍ على سجلّ هيا الحيّ (١٧ أكتوبر):
//   ١) بنكا اللفظي والعلمي ٢٤/٢٧ ⇐ ٨٤/٨٤ — «أسبوعٌ بلا تكرار» (٧ جلسات × ١٢).
//   ٢) حجزُ رموز التوليد ٨٠٠ ⇐ ٥٠٠ (الشريحة ٩٥ من ٢٨ نداءً مقاساً)، ونداءان بالتناوب.
//   ٣) إسقاطُ بوّابة تأكيد الموضع — ٣٧ عرضاً وصفر تبديل، بحرف المعيار المُعلَن سلفاً.
//   ٤) خلطُ مواضع خطّة الإنجليزية — بنكُها ١٢٢/١٢٢ في الموضع الأوّل — وتذكيرٌ مُسلَّح.
//
// **ويسقط هذا الملفّ على البناء السابق** — جُرِّب قبل أن يُعتمَد.
const {chromium}=require('/opt/node22/lib/node_modules/playwright');
const URL="http://127.0.0.1:8931/index.html";
let pass=0,fail=0;
function ok(c,m){if(c){pass++;console.log("  ✓ "+m)}else{fail++;console.log("  ✗ FAIL "+m)}}
// ===== قسمٌ ينهار لا يُسكت ما بعده =====
// أوّلُ تشغيلٍ على البناء السابق انهار عند القسم الأوّل (`VERBAL_RAW is not defined`)
// فلم تُقَس الثلاثةُ الباقية إطلاقاً — واختبارٌ يسقط عند أوّل رمزٍ مفقود لا يقول **أيُّ**
// التغييرات الأربعة غائب. فكلُّ قسمٍ معزولٌ: ينهار فيُبلَّغ عنه ويمضي ما بعده.
async function section(name,fn){
  console.log("\n"+name);
  try{await fn()}catch(e){fail++;console.log("  ✗ FAIL "+name+" انهار: "+(e&&e.message||e))}
}

(async()=>{
const b=await chromium.launch();
const ctx=await b.newContext();
const p=await ctx.newPage();
p.on("pageerror",e=>{fail++;console.log("  ✗ PAGEERROR "+e.message)});

// يُعترَض التسجيلُ فيُقرأ ما وصل فعلاً لا ما نُوِي
await p.route("**/mawhiba_answer_log*",r=>{
  try{const b=JSON.parse(r.request().postData()||"{}");
    p.evaluate(x=>{window.__LOGS=window.__LOGS||[];window.__LOGS.push(x)},b).catch(()=>{})}catch(e){}
  r.fulfill({status:201,body:"[]"});
});
await p.route("**/functions/v1/**",r=>r.fulfill({status:500,body:"{}"}));
await p.goto(URL+"?p=haya");
// `const` في سكربتٍ عاديّ يُنشئ رابطةً عامّة **لا خاصّيةً على `window`** — فأوّل
// صياغةٍ انتظرت `window.VERBAL` فانتهت مهلتُها على صفحةٍ محمَّلةٍ سليمة.
await p.waitForFunction(()=>typeof VERBAL!=="undefined"&&typeof render==="function",{timeout:20000});

// ===== ١) البنكان الموسَّعان =====
await section("١) بنكا اللفظي والعلمي",async()=>{
  const r=await p.evaluate(()=>{
    const cnt=a=>a.length;
    const pos=a=>{const c=[0,0,0,0];a.forEach(x=>{if(x.a>=0&&x.a<4)c[x.a]++});return c};
    const txts=a=>a.map(x=>x.q);
    const bad=[];
    [["VERBAL",VERBAL],["SCIENCE",SCIENCE]].forEach(([n,bk])=>{
      bk.forEach((x,i)=>{
        if(!x.q)bad.push(n+"["+i+"] صدرٌ فارغ");
        if(!x.c||x.c.length!==4)bad.push(n+"["+i+"] خياراتٌ ليست أربعة");
        else{const u={};x.c.forEach(c=>u[c]=1);if(Object.keys(u).length!==4)bad.push(n+"["+i+"] خيارٌ مكرّر")}
        if(!(x.a>=0&&x.a<4))bad.push(n+"["+i+"] فهرسُ صوابٍ خارج المدى");
        if(!x.w)bad.push(n+"["+i+"] شرحٌ فارغ");
        if(/[A-Za-z]/.test(x.q+(x.c||[]).join("")+x.w))bad.push(n+"["+i+"] حرفٌ لاتينيّ");
      });
    });
    // عددُ الأسطر في النصّ المرصوص هو المرجع — فسطرٌ مكسور يُنقص العدد فيسقط السطر
    const vLines=VERBAL_RAW.split("\n").filter(s=>s.trim()).length;
    const sLines=SCIENCE_RAW.split("\n").filter(s=>s.trim()).length;
    return{v:cnt(VERBAL),s:cnt(SCIENCE),vp:pos(VERBAL),sp:pos(SCIENCE),
      bad:bad,badParse:quizBankBad,vLines:vLines,sLines:sLines,
      vIdent:new Set(VERBAL.map(qIdent)).size,sIdent:new Set(SCIENCE.map(qIdent)).size,
      vStems:new Set(txts(VERBAL)).size,per:QUIZ_PER};
  });
  ok(r.badParse===0,"لا سطرَ مكسورٍ في التفكيك — المكسور "+r.badParse);
  ok(r.v===24+r.vLines,"بنكُ اللفظي "+r.v+" = ٢٤ قديماً + "+r.vLines+" مرصوصاً");
  ok(r.s===27+r.sLines,"بنكُ العلمي "+r.s+" = ٢٧ قديماً + "+r.sLines+" مرصوصاً");
  // الحدُّ **مشتقٌّ من حجم الجلسة لا مكتوب**: أسبوعٌ بلا تكرار = ٧ جلسات
  const need=7*r.per;
  ok(r.v>=need,"اللفظي "+r.v+" ≥ "+need+" (٧ جلسات × "+r.per+" = أسبوعٌ بلا تكرار)");
  ok(r.s>=need,"العلمي "+r.s+" ≥ "+need);
  // **الهويّةُ صدرٌ + خيارات لا صدرٌ وحده** — وهذا قرارٌ مقيسٌ من ٤ سبتمبر: ثلاثةُ
  // عناصرَ في البنك القديم تتشارك الصدرَ «أي كلمة لا تنتمي…» ومحتواها في خياراتها،
  // وهو شكلُ «المفردة الشاذّة» المعياريّ (ذكرُ الفئة في الصدر يُفشي ما يقيسه السؤال).
  // وأوّلُ صياغةٍ لي قاست الصدرَ وحده فأبلغت ٨٢ من ٨٤ — **وهي اثنتان من البنك القديم
  // لا من الجديد**، أي بلاغٌ كاذب على تصميمٍ صحيح. فصار المقياسُ `qIdent` نفسه الذي
  // بُني يومها لهذا السبب بعينه.
  ok(r.vIdent===r.v,"لا عنصرَ مكرّراً في اللفظي ("+r.vIdent+"/"+r.v+")");
  ok(r.sIdent===r.s,"لا عنصرَ مكرّراً في العلمي ("+r.sIdent+"/"+r.s+")");
  ok(r.vStems<r.v,"وثلاثةُ عناصرَ تتشارك صدراً واحداً عمداً ("+r.vStems+" صدراً لـ"+r.v+" عنصراً) — المفردةُ الشاذّة");
  ok(r.bad.length===0,"سلامةُ كل عنصر — مخالفاتٌ "+r.bad.length+(r.bad.length?": "+r.bad.slice(0,3).join(" · "):""));
  // لا موضعَ يبتلع أكثر من نصف البنك — بالنسبة لا بعددٍ مكتوب
  const half=x=>Math.max.apply(null,x)<=Math.ceil(x.reduce((a,b)=>a+b,0)*0.5);
  ok(half(r.vp),"مواضعُ صواب اللفظي موزّعة "+r.vp.join("/"));
  ok(half(r.sp),"مواضعُ صواب العلمي موزّعة "+r.sp.join("/"));
});
// ===== ٢) حجزُ الرموز والنداءان =====
await section("٢) ميزانيةُ التوليد",async()=>{
  const r=await p.evaluate(()=>({tpm:QUIZ_TPM,req:QUIZ_REQ_TOK,calls:QUIZ_TOPUP_CALLS,
    types:QUIZ_TYPES.length}));
  ok(r.req===500,"الحجزُ "+r.req+" رمزاً (الشريحة ٩٥ من ٢٨ نداءً = ٥٠٥، مقرَّبةً نزولاً)");
  // **الدعوى بنيويّة لا رقمٌ مكتوب**: نداءان يتّسعان في نافذة الدقيقة
  ok(Math.floor(r.tpm/r.req)>=2,"نافذةُ الدقيقة تتّسع لـ"+Math.floor(r.tpm/r.req)+" نداءً بالحجز الجديد");
  ok(r.calls===2,"نداءان في كل فتحةٍ لا واحد");
  // وبالحجز القديم كان نداءً واحداً — يُثبَت أن التغيير هو ما وسّعها
  ok(Math.floor(r.tpm/800)===1,"وبالحجز القديم (٨٠٠) كان نداءً واحداً — فالتغييرُ هو ما وسّعها");
  // المنعُ قبل الإرسال ما زال يعمل، والنافذةُ تنفتح
  const g=await p.evaluate(()=>{
    const a=quizBudgetOk();quizBudgetSpend(900);const b=quizBudgetOk();
    const w=quizBudgetWaitMs();
    return{a:a,b:b,w:w};
  });
  ok(g.a===true,"نافذةٌ طازجة تسمح بالنداء");
  ok(g.b===false,"وبعد إنفاق ٩٠٠ تُمنَع — فالبوّابة لم تُعطَّل");
  ok(g.w>0&&g.w<=60000,"والتهدئةُ محدودةٌ بدقيقة ("+Math.ceil(g.w/1000)+"ث) — لا إقفالَ للأبد");
  // والنداءان متتابعان لا متوازيان: الثاني لا يُطلَق قبل تسوية الأوّل
  const chain=await p.evaluate(async()=>{
    const seen=[];let resolveFirst;
    const orig=window.fetchGemini;
    window.fetchGemini=function(t){seen.push({t:t,at:Date.now()});
      return new Promise(function(res){if(seen.length===1)resolveFirst=res;else res([])})};
    quizTopUpDone=false;quizGenTopUp();
    await new Promise(r=>setTimeout(r,60));
    const afterOne=seen.length;
    resolveFirst&&resolveFirst([]);
    await new Promise(r=>setTimeout(r,60));
    const afterTwo=seen.length;
    window.fetchGemini=orig;
    return{afterOne:afterOne,afterTwo:afterTwo,types:seen.map(x=>x.t)};
  });
  ok(chain.afterOne===1,"نداءٌ واحد فقط قبل تسوية الأوّل ("+chain.afterOne+")");
  ok(chain.afterTwo===2,"والثاني يُطلَق بعد تسويته ("+chain.afterTwo+")");
  ok(chain.types.length===2&&chain.types[0]!==chain.types[1],
    "ونوعان مختلفان بالتناوب: "+chain.types.join("، "));
});
// ===== ٣) بوّابةُ تأكيد الموضع أُسقطت، والقياسُ بقي =====
await section("٣) إسقاطُ بوّابة التأكيد وبقاءُ الوسم",async()=>{
  const r=await p.evaluate(()=>{
    // تُبذَر حالةُ انحيازٍ صارخة: الزرّ ٢ في ١٢ من ١٢ بأربعة خيارات
    const a=[];for(let i=0;i<12;i++)a.push([2,4]);
    lsSet("pos_bias_listen",JSON.stringify(a));
    posArmed.listen=false;
    const armed=posBiasArmed("listen");
    // نقرةٌ واحدة تكفي الآن — لا نقرةَ تأكيدٍ ثانية
    const first=posConfirmOk("listen",1,"خيار");
    const html=posConfirmHTML("listen","listenChoose");
    const tag=posTagFor("listen");
    return{armed:armed,first:first,html:html,tag:tag,
      hasCx:(typeof posCxNote!=="undefined")};
  });
  ok(r.armed===true,"التسليحُ يعمل على ١٢/١٢ بأربعة خيارات (ضِعفُ الصدفة)");
  ok(r.first===true,"ونقرةٌ واحدة تقفل الجواب — البوّابة أُسقطت");
  ok(r.html==="","وصندوقُ التأكيد لا يُرسَم إطلاقاً");
  ok(/تحيّز:موضع/.test(r.tag),"ووسمُ الانحياز باقٍ في سطر الإجابة: "+r.tag.trim());
  ok(!/تأكيد:/.test(r.tag),"ولا وسمَ «تأكيد:» بعد اليوم");
  ok(r.hasCx===false,"وآلةُ `posCx` حُذفت لا عُطّلت — فلا كُرْثَ يُوهم أنه يقيس");
  // والصندوقُ غائبٌ عن DOM الحيّ في جلسةٍ حقيقية
  const dom=await p.evaluate(()=>{
    startListen();
    const it=listenCur();if(!it)return{none:true};
    const btns=[...document.querySelectorAll("#app .choices button")];
    if(btns.length)btns[0].click();
    return{box:!!document.querySelector("[data-poscx]"),locked:listenLocked};
  });
  ok(dom.none||dom.box===false,"ولا عنصرَ `data-poscx` في الصفحة الحيّة");
});
// ===== ٤) خلطُ مواضع خطّة الإنجليزية =====
await section("٤) خلطُ مواضع خطّة الإنجليزية",async()=>{
  // أوّلاً: الدعوى التي أوجبت التغيير — البنكُ كلُّه في الموضع الأوّل
  const bank=await p.evaluate(()=>{
    const ch=ENG_ITEMS.filter(x=>x.c&&x.c.length);
    const c={};ch.forEach(x=>{c[x.a]=(c[x.a]||0)+1});
    return{n:ch.length,dist:c};
  });
  ok(bank.n>100&&bank.dist[0]===bank.n,
    "بنكُ `ENG_ITEMS` صوابُه في الفهرس صفر في "+bank.dist[0]+" من "+bank.n+" — فالخلطُ هو العلاج الوحيد");

  // والخلطُ يوزّع المواضع فعلاً — ٣٠٠ جولة لا دعوى
  const sh=await p.evaluate(()=>{
    const it=ENG_ITEMS.filter(x=>x.c&&x.c.length===4)[0];
    const c=[0,0,0,0];let diff=0;
    for(let k=0;k<300;k++){
      planOrderId=null;planOrder=[];
      const o=planOrd({id:"x"+k,c:it.c});
      c[o.indexOf(it.a)]++;
      if(o.join()!=="0,1,2,3")diff++;
    }
    return{c:c,diff:diff};
  });
  ok(Math.min.apply(null,sh.c)>0,"موضعُ الصواب يقع في المواضع الأربعة كلّها: "+sh.c.join("/"));
  ok(Math.max.apply(null,sh.c)<200,"ولا موضعَ يبتلع ثلثي الجولات ("+Math.max.apply(null,sh.c)+" من ٣٠٠)");
  ok(sh.diff>200,"والترتيبُ يختلف عن الطبيعي في "+sh.diff+" من ٣٠٠");

  // والترتيبُ يُعلَّق على العنصر لا على لحظة الإسناد (درس `listenOrd`)
  const stable=await p.evaluate(()=>{
    planOrderId=null;planOrder=[];
    const it={id:"same",c:["a","b","c","d"],a:0};
    const o1=planOrd(it).join(),o2=planOrd(it).join();
    const o3=planOrd({id:"other",c:["a","b","c","d"],a:0}).join();
    return{same:o1===o2,changed:o1!==o3||o1===o3};
  });
  ok(stable.same,"الترتيبُ ثابتٌ للعنصر نفسه عبر نداءين — فالعرضُ والسجلّ لا يفترقان");

  // جلسةٌ حقيقية: نقرةٌ على الزرّ **المعروض** ⇒ يُسجَّل موضعُه ويُحكَم بالفهرس الأصلي
  const live=await p.evaluate(async()=>{
    window.__LOGS=[];
    startEngPlan&&startEngPlan();
    // نُقدّم إلى أوّل عنصرٍ ذي خيارات
    let guard=0;
    while(guard++<40){
      const it=planCur();
      if(it&&it.c&&it.c.length===4&&(it.t==="grammar"||it.t==="vocab"||it.t==="reading"))break;
      if(!it)break; planNext&&planNext();
    }
    const it=planCur();
    if(!it||!it.c)return{none:true};
    planGateSecs=0;planGateLeft=0;
    if(typeof planGateStop==="function")planGateStop();
    render();
    const btns=[...document.querySelectorAll("#app .choices button")];
    if(btns.length!==4)return{btns:btns.length};
    const ord=planOrd(it).slice();
    // نضغط الزرّ الثاني المعروض
    btns[1].click();
    await new Promise(r=>setTimeout(r,80));
    return{ord:ord,a:it.a,picked:planPicked,locked:planLocked,
      expectPicked:ord[1],scoreOk:(planPicked===it.a)};
  });
  if(live.none||live.btns){ok(false,"تعذّر بلوغُ عنصرٍ بخيارات ("+JSON.stringify(live)+")")}
  else{
    ok(live.locked===true,"النقرُ على الزرّ المعروض يقفل الإجابة");
    ok(live.picked===live.expectPicked,
      "والمُسجَّلُ هو **الفهرس الأصلي** للزرّ المعروض ("+live.picked+" = ord[1]="+live.expectPicked+")");
  }
  // وسطرُ السجلّ يحمل الموضعَ المعروض — يُنتظَر وصولُه لا يُفترَض
  const got=await p.waitForFunction(()=>{
    const L=(window.__LOGS||[]).flatMap(x=>Array.isArray(x)?x:[x]);
    return L.some(r=>r&&r.domain==="eng_plan"&&/موضع /.test(String(r.response||"")))?L:null;
  },{timeout:6000}).then(h=>h.jsonValue()).catch(()=>null);
  ok(!!got,"وصل سطرٌ في `eng_plan` يحمل «موضع ن»");
  if(got){
    const row=got.filter(r=>r&&r.domain==="eng_plan"&&/موضع /.test(String(r.response||""))).pop();
    ok(/^موضع [٠-٩]+ · /.test(row.response),"وصدرُ الحقل «موضع ن · …» كعُرف بقيّة الأقسام: "+String(row.response).slice(0,40));
    ok(/الخيارات: 1\)/.test(String(row.q_text||"")),"والخياراتُ في `q_text` بترتيب العرض");
    ok(/✓/.test(String(row.q_text||"")),"وموضعُ الصواب موسومٌ فيها");
  }
});
// ===== ٥) تذكيرُ العنصر المتكرّر خطؤه =====
await section("٥) التذكيرُ المُسلَّح",async()=>{
  const r=await p.evaluate(()=>{
    const g=ENG_ITEMS.find(x=>x.t==="grammar"&&x.w);
    const v=ENG_ITEMS.find(x=>x.t==="vocab"&&x.w);
    const out={};
    // **الحالةُ تُصفَّر صراحةً أوّلاً** — §٤ انتهى بنقرةٍ قفلت الإجابة، فأوّلُ صياغةٍ
    // قاست «لا تذكير» وهي مقفلةٌ أصلاً: نجحت الدعويان **بلا سبب** ثمّ سقطت الثالثة.
    // وهو فخُّ «اختبارٌ ينجح ولو لم يُبنَ شيء» (درس ٦ أكتوبر) واقعاً على تسلسل الأقسام.
    planLocked=false;planPicked=null;planGateSecs=0;planGateLeft=0;
    out.gateOpen=planGateOpen();
    shapeSave({});
    out.none=planArmedHint(g);
    // خطأٌ واحد ⇒ لا تذكير بعد (SHAPE_ARM=2)
    shapeRecord("engplan:"+g.id,true);
    out.one=planArmedHint(g);
    // خطأان ⇒ تذكير
    shapeRecord("engplan:"+g.id,true);
    out.two=planArmedHint(g);
    out.arm=SHAPE_ARM;
    out.w=g.w;
    // والمفرداتُ لا تذكير لها — شرحُها هو الجواب
    shapeRecord("engplan:"+v.id,true);shapeRecord("engplan:"+v.id,true);
    out.vocab=planArmedHint(v);
    out.vocabArmed=shapeArmed("engplan:"+v.id);
    // ولا يُعرض بعد القفل
    planLocked=true;out.locked=planArmedHint(g);planLocked=false;
    // ولا قبل انفتاح بوّابة التسرّع
    planGateSecs=5;planGateLeft=5;out.gated=planArmedHint(g);
    planGateSecs=0;planGateLeft=0;
    return out;
  });
  ok(r.arm===2,"العتبةُ `SHAPE_ARM` = "+r.arm+" — نفس رقم المشروع لا رقمٌ جديد");
  // حارسٌ ضدّ الفحص الفارغ: لو كانت الحالةُ مقفلةً لخرجت الدعاوى كلُّها فارغةً «ناجحة»
  ok(r.gateOpen===true,"والبوّابةُ مفتوحةٌ والإجابةُ غيرُ مقفلة — فالقياسُ ليس فارغاً");
  ok(r.vocabArmed===true,"والمفرداتُ مُسلَّحةٌ فعلاً — فسكوتُها قرارٌ لا غيابُ تسليح");
  ok(r.none==="","صفرُ أخطاء ⇒ لا تذكير");
  ok(r.one==="","خطأٌ واحد ⇒ لا تذكير بعد (زلّةٌ لا نمط)");
  ok(r.two!==""&&/data-planhint/.test(r.two),"خطأان ⇒ يُعرض التذكير");
  ok(r.two.indexOf(r.w.slice(0,12))>=0,"ونصُّه شرحُ العنصر نفسه لا محتوًى جديد");
  ok(r.vocab==="","ولا تذكيرَ على المفردات — شرحُها يكشف الجواب");
  ok(r.locked==="","ولا يُعرض بعد قفل الإجابة");
  ok(r.gated==="","ولا قبل انفتاح بوّابة التسرّع");
});
// ===== ٦) لا فيضانَ أفقي على عرض الهاتف =====
await section("٦) العرضُ على ٤٢٠ بكسلاً",async()=>{
  await p.setViewportSize({width:420,height:900});
  const r=await p.evaluate(()=>{
    const g=ENG_ITEMS.find(x=>x.t==="grammar"&&x.w);
    lsSet("shape_v1","{}");
    shapeRecord("engplan:"+g.id,true);shapeRecord("engplan:"+g.id,true);
    startEngPlan&&startEngPlan();
    planItems=[g];planIdx=0;planPicked=null;planLocked=false;
    planGateSecs=0;planGateLeft=0;planShownAt=Date.now();render();
    const over=[...document.querySelectorAll("#app *")].filter(e=>{
      const b=e.getBoundingClientRect();return b.width>0&&(b.right>421||b.left<-1)}).length;
    return{over:over,hint:!!document.querySelector("[data-planhint]"),
      sw:document.documentElement.scrollWidth};
  });
  ok(r.hint===true,"التذكيرُ ظاهرٌ في الصفحة الحيّة");
  ok(r.over===0,"صفرُ عنصرٍ يتجاوز ٤٢٠ بكسلاً");
  ok(r.sw<=421,"ولا تمريرَ أفقي ("+r.sw+")");
});

await b.close();
console.log("\n"+(fail?"✗ FAIL":"✓")+" نجحت "+pass+" · فشلت "+fail);
process.exit(fail?1:0);
})().catch(e=>{console.log("✗ FAIL "+e.message);process.exit(1)});
