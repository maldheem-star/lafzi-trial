// ثلاث بوّابات على أخطاءٍ مسمّاة تكرّرت فعلاً — ٢٢ أغسطس
//
// بياناتٌ حيّة من جلسة هيا ١٥:٣٢-١٥:٤٣:
//   · quot_off_one سبع مرّات في جلسةٍ واحدة (٤٩÷٧⇐٦ · ٢٨÷٧⇐٣ · ٦٣÷٧⇐٨ …) بلا بوّابة،
//     لأن BUG_GATES في طلاقة الحقائق كانت موصولةً بالطرح وحده.
//   · التقوية: ثلاثةٌ من خمسة أخطاءٍ النصفَ بالضبط (٣×٢×٣⇐٢١ · ٦×٦×٥⇐٩٦ · ٤×٣×٣⇐٣٣)
//     — تجمع الأوجه الثلاثة وتنسى ×٢، بلا اسمٍ ولا بوّابة.
//   · وأجابت بـ١٫١ث في المرحلة ٢، وبوّابة التسرّع كانت تُسلَّح عند المرحلة ٤ وحدها.
const {chromium}=require('/opt/node22/lib/node_modules/playwright');
const BASE='http://localhost:8931/index.html';
let fails=0;
function ok(c,m){console.log((c?'  ✓ ':'  ✗ FAIL ')+m);if(!c)fails++}
async function mk(browser){
  const page=await browser.newPage();
  page.on('pageerror',e=>{console.log('  ! pageerror:',e.message);fails++});
  await page.route('**/functions/v1/tutor',r=>r.fulfill({status:200,contentType:'application/json',body:'{}'}));
  await page.route('**/rest/v1/**',r=>r.fulfill({status:201,contentType:'application/json',body:'[]'}));
  await page.goto(BASE,{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>typeof window.render==='function',{timeout:15000});
  await page.evaluate(()=>localStorage.clear());
  return page;
}

(async()=>{
  const browser=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'});

  // ===== ١) القسمة: أخطاؤها الحقيقية تُسمّى، والبوّابة تُسلَّح بتكرارها =====
  console.log('\n١) quot_off_one — بأرقامها هي');
  {
    const page=await mk(browser);
    // الأزواج الستّة من سجلّها حرفياً
    const REAL=[[49,7,6],[28,7,3],[63,7,8],[42,7,5],[48,6,7],[24,6,3]];
    const r=await page.evaluate(pairs=>{
      const named=pairs.map(function(p){
        const b=bugOf("div",p[0],p[1],p[2]);
        return b?b.id:null;
      });
      return{named:named,gated:Object.keys(BUG_GATES)};
    },REAL);
    r.named.forEach(function(id,k){
      ok(id&&id.indexOf("quot_off_one")===0,
        REAL[k][0]+"÷"+REAL[k][1]+"⇐"+REAL[k][2]+" يُسمّى — "+id);
    });
    ok(r.gated.indexOf("quot_off_one")>=0&&r.gated.indexOf("quot_off_one_up")>=0,
       'وللاسمين بوّابةٌ في الجدول');
    await page.close();
  }
  {
    const page=await mk(browser);
    const r=await page.evaluate(()=>{
      // خطأٌ واحدٌ لا يُسلّح (SHAPE_ARM=2)، والثاني يُسلّح
      shapeRecord("quot_off_one",true);
      const after1=shapeArmed("quot_off_one");
      shapeRecord("quot_off_one",true);
      const after2=shapeArmed("quot_off_one");
      quotReset();
      BUG_GATES["quot_off_one"](49,7);
      const armed=quotGated();
      // ويُصفَّر بالصواب فلا يُعاقَب من لا يحتاجه
      shapeRecord("quot_off_one",false);
      return{after1:after1,after2:after2,armed:armed,cleared:!shapeArmed("quot_off_one")};
    });
    ok(r.after1===false,'زلّةٌ واحدة لا تُسلّح البوّابة');
    ok(r.after2===true,'وتكرارها يُسلّحها (SHAPE_ARM=٢)');
    ok(r.armed===true,'والبوّابة تُقفل الانتقال حتى تُكمَل المصفوفة');
    ok(r.cleared===true,'والصواب يحلّها — لا تُعاقَب من لا تحتاجها');
    await page.close();
  }

  // ===== ٢) surf_no_double: الآلية تُسمّى بأرقامها هي =====
  console.log('\n٢) surf_no_double — بأرقامها هي');
  {
    const page=await mk(browser);
    // الثلاثة من سجلّها: [ل,ع,ن, أجابت, الصواب]
    const REAL=[[3,2,3,21,42],[6,6,5,96,192],[4,3,3,33,66]];
    const r=await page.evaluate(cases=>{
      const out=cases.map(function(c){
        const l=c[0],w=c[1],h=c[2];
        const ans=2*(l*w+l*h+w*h);
        return{ans:ans,expected:c[4],
               named:surfBugOf({kind:"prismsurf",ans:ans},c[3]),
               notNamedWhenRight:surfBugOf({kind:"prismsurf",ans:ans},ans),
               notNamedOther:surfBugOf({kind:"prismsurf",ans:ans},ans+1)};
      });
      return{out:out,inGates:Object.keys(BUG_GATES).indexOf("surf_no_double")>=0};
    },REAL);
    r.out.forEach(function(v,k){
      const c=REAL[k];
      ok(v.ans===v.expected,c[0]+'×'+c[1]+'×'+c[2]+': الصواب المحسوب '+v.ans+' = المسجَّل '+v.expected);
      ok(v.named==='surf_no_double',' وإجابتها '+c[3]+' تُسمّى surf_no_double — '+v.named);
      ok(v.notNamedWhenRight===null,' ولا تُسمّى عند الصواب');
      ok(v.notNamedOther===null,' ولا عند خطأٍ من نوعٍ آخر (زلّة ±١)');
    });
    ok(r.inGates,'وللآلية بوّابةٌ في BUG_GATES');
    await page.close();
  }
  {
    // البوّابة تمنع فعلاً: الخيارات تختفي حتى تُقرّ الخطوة
    const page=await mk(browser);
    const r=await page.evaluate(()=>{
      startFade("prismsurf");
      // المرحلة ١ مثالٌ محلولٌ بلا خيارات، فننتقل إلى ٢ حيث وقع خطؤها فعلاً
      fadeStage=2;fadeNew();
      // نُجبر سؤالاً بأرقامها ونجيب بالنصف مرّتين
      const half=function(){
        fadeCur.opts[0]=fadeCur.ans/2;fadeCur.ai=1;fadeLocked=false;
        fadeChoose(0);
      };
      half();const armed1=surfGated();
      fadeStage=2;fadeNew();half();const armed2=surfGated();
      render();
      const html=app.innerHTML;
      const choicesShown=document.querySelectorAll('.choices .choice').length;
      // ولا تُقبل إجابةٌ ما دامت مسلَّحة
      fadeLocked=false;fadeChoose(0);
      const blocked=!fadeLocked;
      surfClear();render();
      return{armed1:armed1,armed2:armed2,choicesShown:choicesShown,blocked:blocked,
             box:html.indexOf("خطوةٌ ناقصة تتكرّر")>=0,
             rule:html.indexOf("× ٢")>=0,
             after:document.querySelectorAll('.choices .choice').length};
    });
    ok(r.armed1===false,'زلّةٌ واحدة لا تُسلّح');
    ok(r.armed2===true,'وتكرارها يُسلّح');
    ok(r.box&&r.rule,'ويُعرض صندوق الخطوة الناقصة ومعه القاعدة');
    ok(r.choicesShown===0,'والخيارات تختفي — منعٌ لا تنبيه');
    ok(r.blocked===true,'ولا تُقبل إجابةٌ قبل الإقرار');
    ok(r.after>0,'وتعود بالضغط على «فهمتُ»');
    await page.close();
  }

  // ===== ٣) بوّابة التسرّع في التقوية من المرحلة ٢ =====
  console.log('\n٣) تسرّع التقوية');
  {
    const page=await mk(browser);
    const r=await page.evaluate(()=>{
      const out={};
      [1,2,3,4].forEach(function(st){
        fadeStage=st;fadeTopic="prismsurf";fadeRush=FADE_RUSH_N;
        out["s"+st]=fadeGateNeeded();
      });
      // مشروطةٌ لا دائمة: بلا تكرار سرعةٍ لا تُسلَّح
      fadeStage=2;fadeRush=0;out.noRush=fadeGateNeeded();
      // ولا تُسلَّح في القراءة والمنطق (نصٌّ يُقرأ لا يُحسب)
      fadeStage=2;fadeRush=FADE_RUSH_N;fadeTopic="reading";out.reading=fadeGateNeeded();
      return out;
    });
    ok(r.s1===false,'المرحلة ١ (المثال محلولٌ كاملاً) بلا بوّابة');
    ok(r.s2===true,'والمرحلة ٢ صارت محكومة — وفيها أجابت ١٫١ث');
    ok(r.s3===true&&r.s4===true,'والثالثة والرابعة كما كانتا');
    ok(r.noRush===false,'وتبقى مشروطة: بلا تكرار سرعةٍ لا تُسلَّح');
    ok(r.reading===false,'ولا تُسلَّح في القراءة والمنطق');
    await page.close();
  }

  // ===== ٤) لا انحدار =====
  console.log('\n٤) لا انحدار');
  {
    const page=await mk(browser);
    const r=await page.evaluate(()=>{
      // جلسة تقوية كاملة تُنهى بلا عطل
      startFade("prismsurf");
      fadeStage=2;fadeNew();
      let guard=0,answered=0;
      while(guard++<12){
        surfClear();fadeLocked=false;
        if(!fadeCur||!fadeCur.opts)break;
        fadeChoose(fadeCur.ai);answered++;
        fadeNew();
      }
      return{answered:answered,html:app.innerHTML.length};
    });
    ok(r.answered>=10,'جلسة تقوية كاملة بلا عطل — '+r.answered+' إجابة');
    ok(r.html>200,'والشاشة تُرسم');
    await page.close();
  }
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
