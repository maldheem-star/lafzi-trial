// عنصر صوتٍ مُجهَّز عند أوّل لمسة — علاج play_autoplay_blocked على Safari عاديّ (٢ سبتمبر)
// دليلٌ حيّ: إلياس ضغط 🔊 أربع مرّات (فيديو + سجلّ)، والخادم أرجع الصوت فعلاً (ok) لكن
// Safari رفض تشغيله (`play_autoplay_blocked`، نداءات:٤/٨/١٢) — لا Snapchat وحده كما
// وُثِّق ٣٠-٣١ أغسطس. العلاج: عنصر <audio> واحد يُشغَّل صامتاً داخل أوّل لمسةٍ حقيقية
// (نفس مبدأ unlockTTS للنطق المحلّي)، يبقى "مصرَّحاً له" ويُعاد استعماله لاحقاً.
// لا يمكن اختبار سياسة Safari الفعلية على Chromium بلا رأس — هذا يفحص البنية وحدها:
// العنصر يُجهَّز عند اللمسة، ونفس الهوية تُعاد استعمالها عبر نداءاتٍ متعدّدة.
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

  console.log('\n١) بلا لمسةٍ بعد: لا عنصر مُجهَّز');
  {
    const page=await mk(browser);
    const r=await page.evaluate(()=>({has:typeof _ttsAudioEl!=="undefined"&&_ttsAudioEl!==null}));
    ok(r.has===false,'العنصر لا يُنشأ من نفسه بلا لمسة');
    await page.close();
  }

  console.log('\n٢) أوّل لمسةٍ حقيقية تُجهِّز العنصر');
  {
    const page=await mk(browser);
    await page.evaluate(()=>{document.dispatchEvent(new Event('click',{bubbles:true}))});
    const r=await page.evaluate(()=>({has:_ttsAudioEl!==null,isAudio:_ttsAudioEl instanceof HTMLAudioElement,
      hasSrc:!!(_ttsAudioEl&&_ttsAudioEl.src),volumeZero:_ttsAudioEl&&_ttsAudioEl.volume===0}));
    ok(r.has,'العنصر مُجهَّزٌ بعد أوّل نقرة');
    ok(r.isAudio,'وهو عنصر <audio> فعلاً');
    ok(r.hasSrc,'وله مصدرٌ صامتٌ محلّي (data URI، بلا شبكة)');
    ok(r.volumeZero,'بصوتٍ صفرٍ — لا يُسمَع شيء عند التجهيز');
    await page.close();
  }

  console.log('\n٣) ttsServerSpeak.play يُعيد استعمال العنصر نفسه — لا عنصراً جديداً كل مرّة');
  {
    const page=await mk(browser);
    const r=await page.evaluate(()=>{
      document.dispatchEvent(new Event('click',{bubbles:true}));
      const before=_ttsAudioEl;
      // نستدعي play() الداخلية عبر إعادة بناء دالّة ttsServerSpeak جزئياً: نتحقّق أن
      // ttsAudioEl() تُعيد نفس المرجع في نداءَين متتاليَين (شرط إعادة الاستعمال)
      const first=ttsAudioEl(),second=ttsAudioEl();
      return{sameAsBefore:first===before,sameAcrossCalls:first===second};
    });
    ok(r.sameAsBefore,'ttsAudioEl() تُعيد نفس عنصر اللمسة الأولى — لا تُنشئ آخر');
    ok(r.sameAcrossCalls,'ونفس الهوية عبر نداءاتٍ متعدّدة — إعادة استعمالٍ حقيقية');
    await page.close();
  }

  console.log('\n٤) play(url) الحقيقية تستعمل العنصر المُجهَّز — src يتغيّر لا الهوية');
  {
    const page=await mk(browser);
    const r=await page.evaluate(()=>{
      document.dispatchEvent(new Event('click',{bubbles:true}));
      const armed=_ttsAudioEl;
      let usedSame=null,gotSrc=null;
      // نُحاكي مسار الخادم مباشرةً: نضع رابطاً صامتاً في TTS_CACHE فتُستدعى play() محلّياً بلا شبكة
      const fakeUrl="data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQAAAAA=";
      TTS_CACHE["hello test"]=fakeUrl;
      return new Promise(function(resolve){
        ttsServerSpeak("hello test",function(res){
          usedSame=(_ttsAudioEl===armed);
          gotSrc=_ttsAudioEl?_ttsAudioEl.src:null;
          resolve({usedSame,gotSrc,res});
        });
      });
    });
    ok(r.usedSame,'العنصر بعد play() هو نفسه المُجهَّز عند اللمسة — لم يُستبدَل');
    ok(!!r.gotSrc&&r.gotSrc.indexOf('data:audio/wav')===0,'وsrc تحدَّث فعلاً للرابط المطلوب تشغيله');
    await page.close();
  }

  console.log('\n٥) بلا لمسةٍ إطلاقاً: play() لا تنهار — تسقط لعنصرٍ جديد بأمان');
  {
    const page=await mk(browser);
    const r=await page.evaluate(()=>{
      const fakeUrl="data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQAAAAA=";
      TTS_CACHE["no gesture case"]=fakeUrl;
      return new Promise(function(resolve){
        let threw=false;
        try{
          ttsServerSpeak("no gesture case",function(res){resolve({res,threw})});
        }catch(e){threw=true;resolve({res:null,threw})}
      });
    });
    ok(r.threw===false,'لا يرمي استثناءً حتى بلا عنصرٍ مُجهَّز مسبقاً');
    await page.close();
  }

  console.log('\n٦) سناب شات المدمج: العلاجان السابقان فشلا معاً — الرسالة الآن «افتحي في Safari» لا «اقرئي الكلمة» (٣ سبتمبر)');
  {
    const page=await mk(browser);
    const r=await page.evaluate(()=>{
      ttsMark(false,{reason:'speak_error',errorType:'synthesis-failed'});
      return{broken:ttsBroken,notice:ttsNoticeHTML('اقرئي الكلمة المكتوبة.'),help:ttsHelpHTML('اقرئي الكلمة المكتوبة.')};
    });
    ok(r.broken,'ttsBroken صار true بعد فشلٍ محاكى');
    ok(/اقرئي الكلمة المكتوبة/.test(r.notice),'وعلى متصفّحٍ عاديّ: الرسالة القديمة كما هي (لا انحدار)');
    ok(!/سناب شات/.test(r.notice),'ولا ذكر لسناب شات على متصفّحٍ ليس هو');
    await page.close();
  }
  {
    const page=await browser.newPage({userAgent:'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Snapchat/12.79.0.36 Mobile/15E148'});
    page.on('pageerror',e=>{console.log('  ! pageerror:',e.message);fails++});
    await page.route('**/rest/v1/**',r=>r.fulfill({status:201,contentType:'application/json',body:'[]'}));
    await page.route('**/functions/v1/**',r=>r.fulfill({status:200,contentType:'application/json',body:'{}'}));
    await page.goto(BASE,{waitUntil:'domcontentloaded'});
    await page.waitForFunction(()=>typeof window.render==='function',{timeout:15000});
    const r=await page.evaluate(()=>{
      const before=ttsNoticeHTML('x');   // بلا عطلٍ بعد: لا رسالة إطلاقاً مهما كان المتصفّح
      ttsMark(false,{reason:'speak_error',errorType:'synthesis-failed'});
      return{isSnap:isSnapchatWebView(),beforeEmpty:before==='',
        notice:ttsNoticeHTML('اقرئي الكلمة المكتوبة.')};
    });
    ok(r.isSnap,'isSnapchatWebView() تكتشف الـUA الحقيقي لمتصفّح سناب شات المدمج');
    ok(r.beforeEmpty,'وبلا عطلٍ فعليّ بعد: لا رسالة — الحكم يُبنى على السطر لا قبله');
    ok(/سناب شات/.test(r.notice)&&/Safari/i.test(r.notice),'وبعد العطل: الرسالة توجّه صراحةً للخروج إلى Safari');
    ok(!/اقرئي الكلمة المكتوبة/.test(r.notice),'ولا الرسالة القديمة المضلِّلة — العلاجان السابقان فشلا معاً في هذا المتصفّح');
    await page.close();
  }

  console.log('\n٧) رايةُ العطل تُعيد رسم شاشات الاستماع/الأزواج/الفيديو فوراً — لا شاشةً عالقة (٣ سبتمبر)');
  {
    const page=await mk(browser);
    const r=await page.evaluate(()=>{
      const before={};
      ['listen','minpair','video'].forEach(function(m){
        mode=m;ttsBroken=false;ttsChecked=false;
        let rendered=false;
        const orig=window.render;window.render=function(){rendered=true;try{orig()}catch(e){}};
        ttsMark(false,{reason:'silent'});
        before[m]=rendered;
        window.render=orig;
      });
      return before;
    });
    ok(r.listen===true,'listen: تُعاد الشاشة عند أوّل فشلٍ في الجلسة');
    ok(r.minpair===true,'minpair: كذلك');
    ok(r.video===true,'video: كذلك');
    await page.close();
  }

  console.log('\n٨) لا انحدار');
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
