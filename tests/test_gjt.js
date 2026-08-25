// رقابة صحّة عناصر GJT المولَّدة — ٢٢ أغسطس
// بياناتٌ حيّة (محمد): عنصران مولَّدان معيبان من ثلاثة — أحدهما مموّهه ترتيبٌ سليم
// (تقديم الجملة السببية)، والآخر مموّهه حذفُ فاصلة أكسفورد وهو ترقيمٌ بريطانيّ صحيح.
// فحُسبت إجابتاه الصحيحتان خطأً. هذه الاختبارات تُثبت أن مثلهما لا يمرّ بعد اليوم.
const {chromium}=require('/opt/node22/lib/node_modules/playwright');
const BASE='http://localhost:8931/index.html';
let fails=0;
function ok(c,m){console.log((c?'  ✓ ':'  ✗ FAIL ')+m);if(!c)fails++}
async function mk(browser){
  const page=await browser.newPage();
  page.on('pageerror',e=>{console.log('  ! pageerror:',e.message);fails++});
  await page.route('**/rest/v1/**',r=>r.fulfill({status:201,contentType:'application/json',body:'[]'}));
  await page.goto(BASE,{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>typeof window.render==='function',{timeout:15000});
  await page.evaluate(()=>localStorage.clear());
  return page;
}
// نصٌّ مولَّد بالصيغة الموسومة، من أربع جملٍ ورقم الصحيحة
function blk(sents,rightIdx,tag){
  return (tag?("TAG: "+tag+"\n"):"")+sents.map(function(t,i){
    return "S"+(i+1)+": "+t+"\nS"+(i+1)+"_OK: "+(i===rightIdx?"yes":"no")+
           "\nS"+(i+1)+"_WHY: سببٌ قصير";
  }).join("\n");
}

(async()=>{
  const browser=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'});

  // ===== ١) العنصران المعيبان الحقيقيان يُرفضان =====
  console.log('\n١) العنصران اللذان أخطآ محمداً فعلاً');
  {
    const page=await mk(browser);
    const r=await page.evaluate(()=>{
      // نصّ العنصر كما وصله حرفياً (ai_step_mt2icyhf_yf7t2)
      const fronting=[
        {t:"The train arrived late because the signal was broken.",ok:true,why:"س"},
        {t:"The train late arrived because the signal was broken.",ok:false,why:"س"},
        {t:"Because the signal was broken the train arrived late.",ok:false,why:"س"},
        {t:"The train because the signal was broken arrived late.",ok:false,why:"س"},
      ];
      // (ai_step_mt2icyju_s96h4)
      const oxford=[
        {t:"We bought new curtains, a sofa, and a rug for the living room.",ok:true,why:"س"},
        {t:"We bought new curtains, a sofa and a rug for the living room.",ok:false,why:"س"},
        {t:"We bought new curtains, a sofa, a rug, and we painted the walls.",ok:false,why:"س"},
        {t:"We bought new curtains; a sofa; and a rug for the living room.",ok:false,why:"س"},
      ];
      return{fronting:gjtDefect(fronting),oxford:gjtDefect(oxford)};
    });
    ok(r.fronting==='clause_fronting','تقديم الجملة السببية يُكشَف — '+r.fronting);
    ok(r.oxford==='oxford_comma','وحذف فاصلة أكسفورد يُكشَف — '+r.oxford);
    await page.close();
  }

  // ===== ٢) العناصر السليمة تمرّ =====
  console.log('\n٢) السليم يمرّ — لا رفضٌ زائد');
  {
    const page=await mk(browser);
    const r=await page.evaluate(()=>({
      // فاصلة لصق حقيقية مقابل فاصلة منقوطة — خطأٌ في كل أنواع الإنجليزية
      splice:gjtDefect([
        {t:"The test was difficult; I passed it anyway.",ok:true,why:"س"},
        {t:"The test was difficult, I passed it anyway.",ok:false,why:"س"},
        {t:"The test was difficult I passed it anyway.",ok:false,why:"س"},
        {t:"The test was difficult, however I passed it anyway.",ok:false,why:"س"},
      ]),
      // تصريف الغائب — لا علاقة له بالأسلوب
      agree:gjtDefect([
        {t:"My sister goes to school every day.",ok:true,why:"س"},
        {t:"My sister go to school every day.",ok:false,why:"س"},
        {t:"My sister going to school every day.",ok:false,why:"س"},
        {t:"My sister gone to school every day.",ok:false,why:"س"},
      ]),
      // ترتيب ظرف التكرار — كلماتٌ نفسها لكن بلا أداة ربطٍ ظرفية، فليس تقديم جملة
      adverb:gjtDefect([
        {t:"My sister always walks to school in the morning.",ok:true,why:"س"},
        {t:"My sister walks always to school in the morning.",ok:false,why:"س"},
        {t:"Always my sister walks to school in the morning.",ok:false,why:"س"},
        {t:"My sister walks to school always in the morning.",ok:false,why:"س"},
      ]),
      // كبتلة
      caps:gjtDefect([
        {t:"We study English and Maths on Monday.",ok:true,why:"س"},
        {t:"we study english and maths on monday.",ok:false,why:"س"},
        {t:"We Study English And Maths On Monday.",ok:false,why:"س"},
        {t:"We study english and maths on Monday.",ok:false,why:"س"},
      ]),
    }));
    ok(r.splice==='','فاصلة اللصق مقابل الفاصلة المنقوطة تمرّ — خطأٌ حقيقي');
    ok(r.agree==='','تصريف الغائب يمرّ');
    ok(r.adverb==='','ترتيب ظرف التكرار يمرّ (ليس تقديمَ جملةٍ ظرفية)');
    ok(r.caps==='','الكبتلة تمرّ');
    await page.close();
  }

  // ===== ٣) حالاتٌ حدّية =====
  console.log('\n٣) حالات حدّية');
  {
    const page=await mk(browser);
    const r=await page.evaluate(()=>({
      none:gjtDefect(null),
      empty:gjtDefect([]),
      twoRight:gjtDefect([{t:"A cat sat.",ok:true,why:"س"},{t:"A dog ran.",ok:true,why:"س"},
                          {t:"A bird flew.",ok:false,why:"س"},{t:"A fish swam.",ok:false,why:"س"}]),
      noRight:gjtDefect([{t:"A cat sat.",ok:false,why:"س"},{t:"A dog ran.",ok:false,why:"س"}]),
      // «or» أيضاً: a, b, or c
      oxfordOr:gjtDefect([
        {t:"You may bring water, juice, or tea.",ok:true,why:"س"},
        {t:"You may bring water, juice or tea.",ok:false,why:"س"},
        {t:"You may bring water juice or tea.",ok:false,why:"س"},
        {t:"You may bring, water, juice or tea.",ok:false,why:"س"},
      ]),
    }));
    ok(r.none==='shape'&&r.empty==='shape','مدخلٌ فارغ أو null ⇒ رفضٌ بسببٍ مسمّى');
    ok(r.twoRight==='not_one_correct','صحيحتان ⇒ رفض');
    ok(r.noRight==='not_one_correct','بلا صحيحة ⇒ رفض');
    ok(r.oxfordOr==='oxford_comma','فاصلة أكسفورد مع or تُكشَف كذلك');
    await page.close();
  }

  // ===== ٤) المسار الكامل: parseGenPickBlock يُسقط ويُسجّل =====
  console.log('\n٤) المسار الكامل');
  {
    const page=await mk(browser);
    const posted=[];
    await page.route('**/rest/v1/mawhiba_answer_log**',r=>{
      try{posted.push(JSON.parse(r.request().postData()||'{}'))}catch(e){}
      r.fulfill({status:201,body:''});
    });
    const r=await page.evaluate(()=>{
      const bad="S1: The train arrived late because the signal was broken.\nS1_OK: yes\nS1_WHY: س\n"+
        "S2: The train late arrived because the signal was broken.\nS2_OK: no\nS2_WHY: س\n"+
        "S3: Because the signal was broken the train arrived late.\nS3_OK: no\nS3_WHY: س\n"+
        "S4: The train because the signal was broken arrived late.\nS4_OK: no\nS4_WHY: س";
      const good="S1: My sister goes to school every day.\nS1_OK: yes\nS1_WHY: س\n"+
        "S2: My sister go to school every day.\nS2_OK: no\nS2_WHY: س\n"+
        "S3: My sister going to school every day.\nS3_OK: no\nS3_WHY: س\n"+
        "S4: My sister gone to school every day.\nS4_OK: no\nS4_WHY: س";
      return{bad:parseGenPickBlock(bad,"step",true),good:parseGenPickBlock(good,"gram",false)};
    });
    await page.waitForTimeout(200);
    ok(r.bad===null,'العنصر المعيب لا يصل المتعلّم إطلاقاً');
    ok(!!r.good&&r.good.c.length===4,'والسليم يُقبل كما كان');
    const rej=posted.filter(x=>x.domain==='gen'&&x.qtype==='reject');
    ok(rej.length===1,'ويُسجَّل الرفض — '+rej.length);
    ok(rej.length&&/clause_fronting/.test(rej[0].response||''),'بسببٍ مسمّى لا مبهم — '+(rej[0]&&rej[0].response));
    ok(rej.length&&/رُفض/.test(rej[0].q_text||''),'ومعه نصّ العنصر كاملاً ليُفحَص لاحقاً');
    await page.close();
  }

  // ===== ٥) لا انحدار =====
  console.log('\n٥) لا انحدار');
  {
    const page=await mk(browser);
    const r=await page.evaluate(()=>({
      missing:censusMissing(),
      bankOk:STEP_BANK.every(x=>gjtDefect(x.c||[{t:"x",ok:true}])===''||x.type!=='pick'),
      gramOk:GRAM_BANK.every(x=>gjtDefect(x.c)===''),
    }));
    ok(r.missing.length===0,'لا دالّة مفقودة — '+r.missing.join(','));
    ok(r.gramOk,'كل بنك القواعد المؤلَّف يجتاز الفحص — لا رفضٌ زائد على المؤلَّف');
    ok(r.bankOk,'وكل عناصر STEP من نوع pick كذلك');
    await page.close();
  }

  await browser.close();
  console.log(fails?`\n=== ${fails} فشل ===`:'\n=== كل الاختبارات نجحت ===');
  process.exit(fails?1:0);
})();
