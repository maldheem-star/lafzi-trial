// مقاطع شرحٍ خطوة خطوة لثمانية مولّدات كمّي — درس ١ سبتمبر
// طلب صاحب المشروع شروحاً بمستوى صفٍّ أدنى (بلا مساسٍ بصعوبة السؤال نفسه) بعد أن
// كشف فحص جلسة هيا (١ سبتمبر) ضعفاً حقيقياً في الكمّي (١/١٢). موصولٌ بمشغّل clipHTML
// القائم أصلاً (نفس بنية VIDEO_BANK)، لا آلية جديدة — withSteps تبني من أرقام
// السؤال المعروض نفسه (نفس مبدأ withPat/clipSeqBuild، ٢٩ أغسطس).
const {chromium}=require('/opt/node22/lib/node_modules/playwright');
const BASE='http://localhost:8931/index.html';
let fails=0;
function ok(c,m){console.log((c?'  ✓ ':'  ✗ FAIL ')+m);if(!c)fails++}
async function mk(browser){
  const page=await browser.newPage();
  page.on('pageerror',e=>{console.log('  ! pageerror:',e.message);fails++});
  await page.route('**/rest/v1/**',r=>r.fulfill({status:201,contentType:'application/json',body:'[]'}));
  await page.route('**/functions/v1/**',r=>r.fulfill({status:200,contentType:'application/json',body:'{}'}));
  await page.goto(BASE,{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>typeof window.render==='function',{timeout:15000});
  await page.evaluate(()=>localStorage.clear());
  return page;
}

(async()=>{
  const browser=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'});
  const gens=['gAngleLine','gWorkers','gAngleTriangle','gClock','gSpeedGraph','gShadedArea','gTrees','gPaths'];

  console.log('\n١) كل مولّدٍ يُنتج خطواتٍ صالحة (٣٠ توليدة لكلٍّ)');
  {
    const page=await mk(browser);
    for(const g of gens){
      const r=await page.evaluate((name)=>{
        const out={hasSteps:0,hasIcon:0,hasLabel:0,n:30,stepSample:null};
        for(let i=0;i<out.n;i++){
          const it=window[name]();
          if(Array.isArray(it.steps)&&it.steps.length>=2)out.hasSteps++;
          if(it.clipIcon)out.hasIcon++;
          if(it.clipLabel)out.hasLabel++;
          if(!out.stepSample)out.stepSample=it.steps;
        }
        return out;
      },g);
      ok(r.hasSteps===r.n,g+': كل التوليدات (٣٠) أنتجت خطواتٍ — '+r.hasSteps);
      ok(r.hasIcon===r.n&&r.hasLabel===r.n,g+': أيقونة وعنوانٌ في كلٍّ');
    }
    await page.close();
  }

  console.log('\n٢) الزرّ يظهر ويفتح المقطع الصحيح من السؤال المعروض فعلياً');
  {
    const page=await mk(browser);
    for(const g of gens){
      const r=await page.evaluate((name)=>{
        const it=window[name]();
        filtered=[it];idx=0;picked=null;locked=true;mode="quant";
        gateStart&&gateStart(it);gateLeft=0;gateStop&&gateStop();
        render();
        const hasBtn=app.innerHTML.indexOf('شاهدي الشرح خطوة خطوة')>=0;
        clipOpenDirect();
        render();
        const opened=!!clipOn;
        const firstStepShown=opened&&app.innerHTML.indexOf(clipOn.steps[0].replace(/<[^>]+>/g,'').slice(0,15))>=0;
        clipClose();
        return{hasBtn,opened,stepsLen:clipOn?clipOn.steps.length:0,q:it.q};
      },g);
      ok(r.hasBtn,g+': زرّ المقطع يظهر بعد القفل');
      ok(r.opened,g+': clipOpenDirect يفتح المقطع فعلاً');
    }
    await page.close();
  }

  console.log('\n٣) التنقّل بين الخطوات إلى القاعدة الختامية ثم الإغلاق');
  {
    const page=await mk(browser);
    const r=await page.evaluate(()=>{
      const it=gAngleTriangle();
      filtered=[it];idx=0;locked=true;mode="quant";
      clipOpenDirect();
      const out={stepsLen:clipOn.steps.length,path:[]};
      out.path.push(clipStep);
      for(let i=0;i<clipOn.steps.length;i++){clipNext();out.path.push(clipStep)}
      out.atRule=clipStep>=clipOn.steps.length;
      render();
      out.ruleShown=app.innerHTML.indexOf('فهمت ✓')>=0;
      clipClose();
      out.closedNow=clipOn===null;
      return out;
    });
    ok(r.path.length===r.stepsLen+1,'مسارٌ متسلسلٌ صحيح عبر كل الخطوات — '+JSON.stringify(r.path));
    ok(r.atRule,'ينتهي بالقاعدة الختامية');
    ok(r.ruleShown,'وزرّ «فهمت ✓» يظهر عندها');
    ok(r.closedNow,'ويُغلق المقطع فعلياً بعد الضغط');
    await page.close();
  }

  console.log('\n٤) السؤال المولَّد نفسه لا زواره — لا تطابقٍ خاطئ بين سؤالٍ وشرح مولّدٍ آخر');
  {
    const page=await mk(browser);
    const r=await page.evaluate(()=>{
      const it=gWorkers();
      filtered=[it];idx=0;locked=true;mode="quant";
      clipOpenDirect();
      const flat=clipOn.steps.join(' ');
      return{isWorkersLabel:clipOn.label==="تناسبٌ عكسي",mentionsWorkerWord:/عمّال/.test(flat)};
    });
    ok(r.isWorkersLabel,'عنوان المقطع مطابقٌ لمولّد السؤال المعروض');
    ok(r.mentionsWorkerWord,'ومحتوى الخطوات من نفس موضوع السؤال');
    await page.close();
  }

  console.log('\n٥) لا انحدار');
  for(const q of ['','?p=mohammed','?p=elias']){
    const page=await browser.newPage();
    page.on('pageerror',e=>{console.log('  ! pageerror:',e.message);fails++});
    await page.route('**/rest/v1/**',r=>r.fulfill({status:201,body:'[]'}));
    await page.goto(BASE+q,{waitUntil:'domcontentloaded'});
    await page.waitForFunction(()=>typeof window.render==='function',{timeout:15000});
    const r=await page.evaluate(()=>({missing:censusMissing(),modes:document.querySelectorAll('.mode').length}));
    ok(r.missing.length===0,(q||'هيا')+': لا دالّة مفقودة — '+r.missing.join(','));
    ok(r.modes>0,(q||'هيا')+': الصفحة تُرسم');
    await page.close();
  }

  await browser.close();
  console.log(fails?`\n=== ${fails} فشل ===`:'\n=== كل الاختبارات نجحت ===');
  process.exit(fails?1:0);
})();
