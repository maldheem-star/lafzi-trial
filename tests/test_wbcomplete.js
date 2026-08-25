// لا تُحرَق محاولة على جملةٍ ناقصة — ٢٢ أغسطس
// بياناتٌ حيّة قاطعة: هيا ٣ من ٦٢ محاولة بناءٍ (٥٪) على تسعة أيام، وإلياس ٤/٥ ومحمد ٤/٤.
// فالأداة تعمل، والعطل في شرط الإرسال: كان يكفي اختيار كلمةٍ واحدة ليُفعَّل زرّ التحقّق.
// والسجلّ يُثبته: «Thank you with helping» لهدفٍ من ثماني كلمات — ناقصةٌ لا مبعثرة.
const {chromium}=require('/opt/node22/lib/node_modules/playwright');
const BASE='http://localhost:8931/index.html';
let fails=0;
function ok(c,m){console.log((c?'  ✓ ':'  ✗ FAIL ')+m);if(!c)fails++}
async function mk(browser){
  const page=await browser.newPage();
  page.on('pageerror',e=>{console.log('  ! pageerror:',e.message);fails++});
  await page.route('**/rest/v1/**',r=>r.fulfill({status:201,contentType:'application/json',body:'[]'}));
  await page.route('**/functions/v1/tutor',r=>r.fulfill({status:200,contentType:'application/json',body:'{}'}));
  await page.goto(BASE,{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>typeof window.render==='function',{timeout:15000});
  await page.evaluate(()=>localStorage.clear());
  return page;
}

(async()=>{
  const browser=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'});

  // ===== ١) المرحلة الأولى: البنك كلّه مطلوب =====
  console.log('\n١) المرحلة الأولى — العدد بالضبط');
  {
    const page=await mk(browser);
    const r=await page.evaluate(()=>{
      wbStart("Thank you for helping me with my homework.",1);
      const out={pool:wbPool.length,tok:wbTok.length,need:wbNeed(),atZero:wbReady(),left0:wbLeft()};
      // خطؤها الحقيقي: أربع كلماتٍ من ثمانٍ
      for(let i=0;i<4;i++)wbPick(i);
      out.atFour={ready:wbReady(),left:wbLeft(),picked:wbPicked.length};
      while(wbPicked.length<wbPool.length)wbPick(wbPicked.length);
      out.atAll={ready:wbReady(),left:wbLeft()};
      return out;
    });
    ok(r.pool===8&&r.tok===8,'بنكٌ بعدد كلمات الجملة — '+r.pool);
    ok(r.need===8,'المطلوب البنك كلّه — '+r.need);
    ok(r.atZero===false&&r.left0===8,'بلا اختيار: غير جاهز، وبقي ٨');
    ok(r.atFour.ready===false,'أربعٌ من ثمانٍ (خطؤها الحقيقي) ⇒ لا يزال غير جاهز');
    ok(r.atFour.left===4,'ويُعرض المتبقّي — '+r.atFour.left);
    ok(r.atAll.ready===true&&r.atAll.left===0,'وبإكمال الثماني يصير جاهزاً');
    await page.close();
  }

  // ===== ٢) مرحلة المموّهات: عدد الهدف لا البنك كلّه =====
  console.log('\n٢) مرحلة المموّهات');
  {
    const page=await mk(browser);
    const r=await page.evaluate(()=>{
      wbStart("There are a few books on the table.",2);
      const out={pool:wbPool.length,tok:wbTok.length,need:wbNeed(),extra:WB_STAGES[1].extra};
      while(wbPicked.length<wbTok.length)wbPick(wbPicked.length);
      out.atTarget={ready:wbReady(),left:wbLeft()};
      return out;
    });
    ok(r.extra===3&&r.pool===r.tok+3,'البنك فيه ثلاث كلماتٍ دخيلة — '+r.pool+' مقابل '+r.tok);
    ok(r.need===r.tok,'والمطلوب عدد كلمات الهدف لا البنك كلّه — '+r.need);
    ok(r.atTarget.ready===true,'فبلوغ عدد الهدف يكفي (الدخيلة لا تُستعمل)');
    await page.close();
  }

  // ===== ٣) مرحلة الكتابة: لا بنك =====
  console.log('\n٣) مرحلة الكتابة');
  {
    const page=await mk(browser);
    const r=await page.evaluate(()=>{
      wbStart("I went to the beach.",3);
      return{need:wbNeed(),left:wbLeft(),pool:wbPool.length};
    });
    ok(r.pool===0,'بلا بنكٍ إطلاقاً');
    ok(r.need===0&&r.left===0,'ولا شرطَ عددٍ — الشرط نصٌّ مكتوب كما كان');
    await page.close();
  }

  // ===== ٤) الإجابة الصحيحة ما زالت تُقبل، والمبعثرة تُرفض =====
  console.log('\n٤) التصحيح نفسه لم يتغيّر');
  {
    const page=await mk(browser);
    const r=await page.evaluate(()=>{
      const out={};
      // ترتيبٌ صحيح
      wbStart("I have already eaten my breakfast.",1);
      const order=wbTok.map(function(t){return wbPool.indexOf(t)});
      // indexOf قد يعيد نفس الموضع لكلمةٍ مكرّرة — نبني بالمواضع غير المستعملة
      wbPicked=[];const used={};
      wbTok.forEach(function(t){
        for(let i=0;i<wbPool.length;i++){if(!used[i]&&wbPool[i]===t){used[i]=1;wbPicked.push(i);break}}
      });
      out.built=wbBuilt();out.rightReady=wbReady();out.right=wbCheck();
      // ترتيبٌ مبعثر كامل العدد — يُرفض كما كان
      wbStart("I have already eaten my breakfast.",1);
      wbPicked=[];for(let i=wbPool.length-1;i>=0;i--)wbPicked.push(i);
      out.scrambledReady=wbReady();out.scrambled=wbCheck();
      return out;
    });
    ok(r.rightReady===true,'الجملة الكاملة جاهزة للتحقّق');
    ok(r.right===true,'والترتيب الصحيح يُقبل — '+r.built);
    ok(r.scrambledReady===true,'ومبعثرةٌ كاملة العدد جاهزة أيضاً (العدد لا يعني الصواب)');
    ok(r.scrambled===false,'لكنها تُرفض — التصحيح لم يتغيّر');
    await page.close();
  }

  // ===== ٥) الزرّ يُبيّن السبب =====
  console.log('\n٥) الزرّ يُبيّن السبب لا يصمت');
  {
    const page=await mk(browser);
    await page.evaluate(()=>{try{lsSet('mawhiba_wb_stage','1')}catch(e){}});
    await page.evaluate(()=>startDictation());
    await page.waitForTimeout(400);
    const r=await page.evaluate(()=>{
      // الإملاء له زرّان: زرّ الإملاء العادي (غير مشروط) وزرّ البناء (المشروط).
      // فيُتنقَّل حتى عنصر بناءٍ حقيقي (dictIsBuild) بدل فرض wbOn — وإلا رُسم الزرّ الآخر.
      let guard=0;
      while(!dictIsBuild()&&guard++<40){
        if(dictIdx+1>=dictSession.length)break;
        dictIdx++;dictLocked=false;wbReset();
      }
      if(!dictIsBuild())return{reached:false};
      render();
      const zero=app.innerHTML;
      for(let i=0;i<2;i++)wbPick(i);
      render();
      const two=app.innerHTML;
      while(wbPicked.length<wbNeed())wbPick(wbPicked.length);
      render();
      const full=app.innerHTML;
      return{reached:true,
        zeroLeft:/بقي .* كلمة/.test(zero),
        twoLeft:/بقي .* كلمة/.test(two),
        fullCheck:/تحقّقي ←/.test(full),
        disabledWhenShort:/disabled/.test(two)};
    });
    ok(r.reached,'بُلغت مرحلة البناء فعلاً في الجلسة');
    if(r.reached){
      ok(r.zeroLeft,'بلا اختيار: الزرّ يعرض «بقي ن كلمة»');
      ok(r.twoLeft,'وبكلمتين ما زال يعرض المتبقّي بدل صمتٍ معطَّل');
      ok(r.disabledWhenShort,'وهو معطَّلٌ فعلاً حتى الإكمال');
      ok(r.fullCheck,'وبالإكمال يعود «تحقّقي ←»');
    }
    await page.close();
  }

  // ===== ٦) لا انحدار =====
  console.log('\n٦) لا انحدار');
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
