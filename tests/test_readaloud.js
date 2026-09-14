// القراءة الجهرية بعد الإجابة في قسم المقروء — ١٣ سبتمبر
// يفحص: الهدف (القطعة لهيا · جملة الدليل لغيرها)، والسقف المشتقّ من الطول، وأن
// الصندوق لا يظهر قبل القفل، وأن التخطّي لا يُعطِّل الجلسة، والتسجيل بنطاقٍ مستقلّ.
//
// **وحدُّه يُقال**: لا ميكروفون حقيقي ولا نداء Azure هنا — Chromium بلا رأس، والدالّة
// محجوبةٌ بسياسة الشبكة (موثَّقٌ في CLAUDE.md). فيُفحص **المسار والبنية**: أيُّ نصٍّ
// يُرسَل، وكم السقف، ومتى يظهر الصندوق، وماذا يصل السجلّ — لا جودةُ التقييم نفسه.
const {chromium}=require(process.env.PW||"/opt/node22/lib/node_modules/playwright");
const BASE=process.env.BASE||"http://127.0.0.1:8931";
let pass=0,fail=0;
function ok(c,m){if(c){pass++;console.log("  ✓ "+m)}else{fail++;console.log("  ✗ FAIL "+m)}}

(async()=>{
  const br=await chromium.launch();
  const ctx=await br.newContext();

  // ===== ١) الهدف يُختار بالهويّة كما أمر صاحب المشروع =====
  console.log("\n§١ الهدف: القطعة لهيا · جملة الدليل لغيرها");
  for(const [file,who,whole] of [["index.html","haya",true],["elias.html","elias",false],["mohammed.html","mohammed",false]]){
    const p=await ctx.newPage();
    await p.goto(`${BASE}/${file}`,{waitUntil:"domcontentloaded"});
    await p.waitForFunction(()=>typeof window.readAloudTarget==="function",{timeout:15000});
    const r=await p.evaluate(()=>{
      const lv=profileOf().level;
      const bank=readBankFor(lv);
      const it=bank[0];
      return {lv:lv,id:it.id,passage:it.passage,target:readAloudTarget(it),
              whole:readAloudWhole(it),ev:evidenceSentence(it.passage,it.c[it.a])};
    });
    ok(r.whole===whole,`${who}: المدى ${r.whole?"القطعة كاملة":"جملة الدليل"} كما تقرّر`);
    if(whole){
      ok(r.target===r.passage.trim(),`${who}: الهدف هو القطعة نفسها حرفاً بحرف`);
    }else{
      ok(r.target===r.ev.trim()&&r.target.length<r.passage.length,
         `${who}: الهدف جملة الدليل وحدها (${r.target.split(/\s+/).length} كلمة من ${r.passage.split(/\s+/).length})`);
    }
    ok(r.target.length>0,`${who}: الهدف غير فارغ`);
    await p.close();
  }

  // ===== ٢) السقف يُشتقّ من الطول لا يبقى ثابتاً =====
  // كان `PRON_MAX_MS=15000` يقطع أطول قطعة لهيا (١٣ كلمة × ١٫٢٥ث = ١٦٫٣ث)
  console.log("\n§٢ سقف التسجيل مشتقٌّ من عدد الكلمات");
  {
    const p=await ctx.newPage();
    await p.goto(`${BASE}/index.html`,{waitUntil:"domcontentloaded"});
    await p.waitForFunction(()=>typeof readAloudMaxMs==="function",{timeout:15000});
    const r=await p.evaluate(()=>{
      const mk=n=>Array(n).fill("word").join(" ");
      return {short:readAloudMaxMs(mk(4)),floor:PRON_MAX_MS,
              long13:readAloudMaxMs(mk(13)),long29:readAloudMaxMs(mk(29)),
              huge:readAloudMaxMs(mk(500)),hard:RA_HARD_MS,pace:READ_PACE_SPW,
              empty:readAloudMaxMs("")};
    });
    ok(r.short===r.floor,`القصير يبقى على السقف المُجرَّب (${r.floor/1000}ث)`);
    ok(r.long13>r.floor,`١٣ كلمة تتجاوز السقف القديم: ${r.long13/1000}ث > ${r.floor/1000}ث`);
    ok(Math.abs(r.long13-13*r.pace*1000)<1000,"وقيمتُه = الكلمات × الوتيرة المقاسة");
    ok(r.long29>r.long13,"وأطولُ نصٍّ يأخذ سقفاً أوسع");
    ok(r.huge===r.hard,`ولا يتجاوز الحدّ المطلق (${r.hard/1000}ث) مهما طال`);
    ok(r.empty===r.floor,"ونصٌّ فارغ لا يُنتج سقفاً صفرياً");
    await p.close();
  }

  // ===== ٣) لا يظهر قبل الإجابة — شرطُ صاحب المشروع الأوّل =====
  console.log("\n§٣ الصندوق بعد الإجابة لا قبلها");
  {
    const p=await ctx.newPage();
    await p.goto(`${BASE}/index.html`,{waitUntil:"domcontentloaded"});
    await p.waitForFunction(()=>typeof startRead==="function",{timeout:15000});
    await p.evaluate(()=>{startRead();render()});
    const before=await p.evaluate(()=>document.body.innerText);
    ok(!/اقرئي .* بصوتٍ واضح/.test(before),"قبل الإجابة: لا صندوق قراءة جهرية");
    ok(!/🎤 اقرئي بصوتك/.test(before),"وقبلها لا زرّ ميكروفون");
    // تُفتح البوّابة ثم يُجاب
    await p.evaluate(()=>{gateLeft=0;gateStop&&gateStop();render();readChoose(0);render()});
    const after=await p.evaluate(()=>document.body.innerText);
    ok(/بصوتٍ واضح/.test(after),"وبعد الإجابة: الصندوق ظهر");
    ok(/اختياري/.test(after),"ومُعلَنٌ أنه اختياري — لا يُقفل الانتقال");
    // النصّ المعروض للقراءة هو الهدف نفسه لا غيره
    const same=await p.evaluate(()=>{
      const t=readAloudTarget(readCur());
      return document.body.innerText.indexOf(t.slice(0,40))>=0;
    });
    ok(same,"والنصّ المعروض للقراءة هو الهدف المُرسَل نفسه");
    await p.close();
  }

  // ===== ٤) التخطّي لا يُعطّل الجلسة =====
  console.log("\n§٤ من لا يقرأ جهراً يُكمل جلسته كما كانت");
  {
    const p=await ctx.newPage();
    await p.goto(`${BASE}/index.html`,{waitUntil:"domcontentloaded"});
    await p.waitForFunction(()=>typeof startRead==="function",{timeout:15000});
    const r=await p.evaluate(()=>{
      startRead();const n=readItems.length;let done=0;
      for(let i=0;i<n;i++){gateLeft=0;readChoose(0);readNext();done++}
      return {n:n,done:done,finished:readDone};
    });
    ok(r.done===r.n&&r.finished,`جلسةٌ كاملة (${r.n} عنصراً) بلا قراءةٍ جهرية واحدة`);
    await p.close();
  }

  // ===== ٥) الحالة تُصفَّر بين العناصر — فلا تُنسَب درجةٌ لعنصرٍ آخر =====
  console.log("\n§٥ الحالة لا تتسرّب بين العناصر");
  {
    const p=await ctx.newPage();
    await p.goto(`${BASE}/index.html`,{waitUntil:"domcontentloaded"});
    await p.waitForFunction(()=>typeof startRead==="function",{timeout:15000});
    const r=await p.evaluate(()=>{
      startRead();gateLeft=0;readChoose(0);
      raResult={ok:true,sc:{pct:91,weak:[],by:"azure"},engine:"azure"};
      const shown=/٩١%/.test(document.body.innerText)||(render(),/٩١%/.test(document.body.innerText));
      readNext();
      return {shown:shown,after:raResult,listening:raListening,busy:raBusy};
    });
    ok(r.shown,"الدرجة تُعرض على العنصر الذي قُرئ");
    ok(r.after===null,"وتُصفَّر عند الانتقال للتالي");
    ok(r.listening===false&&r.busy===false,"ولا يبقى تسجيلٌ عالقاً");
    await p.close();
  }

  // ===== ٦) التسجيل بنطاقٍ مستقلّ فلا يُلوّث دقّة الفهم =====
  // عُرف المشروع: ما تفعله هي بالسؤال في سجلّ القسم — والنطق مسطرةٌ أخرى، فله نطاقُه
  // كما لـ`pronunciation_a1` و`speaking`. ولو كُتب في `domain='read'` لدخل مقامَ كل
  // حساب دقّةٍ على الفهم (درس ٢٢ أغسطس: صفٌّ يسبق الصفَّ المقصود).
  console.log("\n§٦ السطر يصل بنطاق read_aloud لا read");
  {
    const p=await ctx.newPage();
    const sent=[];
    await p.route("**/rest/v1/mawhiba_answer_log*",async route=>{
      try{sent.push(JSON.parse(route.request().postData()||"{}"))}catch(e){}
      await route.fulfill({status:201,body:"[]"});
    });
    await p.goto(`${BASE}/index.html`,{waitUntil:"domcontentloaded"});
    await p.waitForFunction(()=>typeof raFinish==="function",{timeout:15000});
    const r=await p.evaluate(async()=>{
      startRead();gateLeft=0;readChoose(0);
      const it=readCur();const target=readAloudTarget(it);
      // محاولةٌ قصيرة: المسار الوحيد الذي يمكن بلوغه بلا ميكروفون حقيقي
      raStartedAt=Date.now()-100;raElapsed=0.1;
      await raFinish();
      return {target:target,words:target.trim().split(/\s+/).length,res:raResult};
    });
    await p.waitForTimeout(500);
    const rows=[].concat(...sent.map(x=>Array.isArray(x)?x:[x]));
    const ra=rows.filter(x=>x&&x.domain==="read_aloud");
    ok(ra.length>0,"وصل سطرٌ بنطاق read_aloud");
    ok(rows.filter(x=>x&&x.domain==="read"&&x.qtype==="discarded").length===0,
       "ولا سطرَ قراءةٍ جهرية دخل نطاق read");
    if(ra.length){
      const row=ra[0];
      ok(row.qtype==="discarded"&&row.is_correct===false,"المحاولة القصيرة تُسجَّل مُهمَلةً لا خطأً في الفهم");
      ok(/\[جهر:/.test(row.q_text||""),"والسطر يحمل وسم «جهر»");
      ok(new RegExp("كلمات:"+r.words).test(row.q_text||""),`ويحمل عدد الكلمات (${r.words})`);
      ok((row.q_text||"").indexOf(r.target.slice(0,30))>=0,"ويحمل نصّ ما طُلبت قراءته");
      ok(/القطعة|جملة الدليل/.test(row.q_text||""),"ويحمل المدى صراحةً");
    }
    ok(r.res&&r.res.discarded===true,"والواجهة تقول «قصيرٌ جداً» لا تعرض درجة");
    await p.close();
  }

  // ===== ٧) هدفٌ بلا جملة دليل يسقط إلى القطعة لا إلى الفراغ =====
  console.log("\n§٧ السقوط الآمن حين يتعذّر استخراج جملة الدليل");
  {
    const p=await ctx.newPage();
    await p.goto(`${BASE}/elias.html`,{waitUntil:"domcontentloaded"});
    await p.waitForFunction(()=>typeof readAloudTarget==="function",{timeout:15000});
    const r=await p.evaluate(()=>{
      const fake={id:"x",lv:"B1",passage:"Ali ran. He won.",q:"?",c:["zz","yy","xx"],a:0};
      return {ev:evidenceSentence(fake.passage,fake.c[fake.a]),
              target:readAloudTarget(fake),whole:readAloudWhole(fake)};
    });
    ok(r.ev==="","جوابٌ لا يطابق شيئاً ⇒ لا جملة دليل");
    ok(r.target==="Ali ran. He won.","فيُقرأ النصّ كاملاً بدل شاشةٍ بلا هدف");
    ok(r.whole===true,"والمدى يُعلَن «القطعة» فلا يكذب السجلّ");
    await p.close();
  }

  // ===== ٨) الصياغة أنثويّةٌ في الأساس فيصحّ تحويلها للأخوين =====
  // درس ٦ سبتمبر: «تستعملين»/«تكتبي» بقيتا مؤنّثتين على صفحة إلياس لغيابهما عن
  // `MASC_W`. والعيب المقابل وقع هنا فعلاً قبل الشحن: زرّ الإعادة كُتب «أعِد» بصيغة
  // **المذكّر**، والأساس مؤنّث — فلا شيء يُحوّله، وكانت هيا سترى خطاب مذكّر.
  // فيُفحَص الاتّجاهان معاً: لا مذكّرَ على صفحة هيا، ولا مؤنّثَ على صفحة إلياس.
  console.log("\n§٨ الصياغة تعبر التذكير في الحالات كلّها");
  {
    const states=[
      ["البداية",null],
      ["بعد درجة",{ok:true,sc:{pct:74,weak:[["r",41]],by:"azure"},engine:"azure"}],
      ["محاولة قصيرة",{discarded:true,why:"short"}],
      ["تعثّر Azure",{fail:"no_speech",detail:""}],
      ["ميكروفون مرفوض",{err:"NotAllowedError"}]
    ];
    for(const [file,who,badRe,label] of [
      ["index.html","haya",/أعِد |اقرأ بصوتك|حاول ثانيةً|عليكَ/,"مذكّر"],
      ["elias.html","elias",/اقرئي|أعيدي|حاولي|اضغطي|عليكِ/,"مؤنّث"]]){
      const p=await ctx.newPage();
      await p.goto(`${BASE}/${file}`,{waitUntil:"domcontentloaded"});
      await p.waitForFunction(()=>typeof startRead==="function",{timeout:15000});
      await p.evaluate(()=>{startRead();gateLeft=0;readChoose(0)});
      for(const [name,st] of states){
        // التحويل إلى خطاب المذكّر يقع في **مراقب DOM** (`genderizeInit`) لا في الرسم
        // نفسه، فقراءةُ النصّ فور `render()` تقيس ما قبل التحويل لا ما يراه إلياس.
        // (سقط القسم خمس مرّات على هذا، ولا عيبَ في المنتج — درس «الاختبار يقيس اللحظة
        // الخاطئة» المتكرّر في `test_playrace`.)
        await p.evaluate(s=>{raResult=s;render()},st);
        await p.waitForTimeout(150);
        const txt=await p.evaluate(()=>{
          const b=[...document.querySelectorAll("div")].find(d=>/بصوتٍ واضح/.test(d.textContent)&&/rgb\(240, 253, 244\)/.test(d.style.background||""));
          return b?b.innerText:"";});
        ok(txt.length>0&&!badRe.test(txt),`${who} · ${name}: بلا خطابٍ ${label}`);
      }
      await p.close();
    }
  }

  await br.close();
  // `run.sh` يحكم بالبحث عن هذه الجملة حرفياً لا برمز الخروج — فاختبارٌ ينجح منفرداً
  // ولا يطبعها يسقط في الجولة **أبداً**. وقعت هنا فعلاً: ١٠١ ملفّاً يطبعها وهذا وحده
  // كان يطبع صيغةً أخرى. فنجاحُ الاختبار عقدٌ مع المُشغِّل لا رمزُ خروجٍ فقط.
  console.log(`\nنجح ${pass} · سقط ${fail}`);
  console.log(fail?`\n=== ${fail} فشل ===`:"\n=== كل الاختبارات نجحت ===");
  process.exit(fail?1:0);
})().catch(e=>{console.error("انهيار:",e);process.exit(1)});
