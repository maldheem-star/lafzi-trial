// «أيّ طرفٍ مطلوب؟» وسطرُ النطق الكامل وأيّام الأسبوع — ٢٣ أغسطس
//
// بياناتٌ حيّة (هيا، ٢٣ أغسطس):
//   · «مجموع ٣ متتالية = ٦٠، ما الأصغر؟» الصواب ١٩، المعروض ٢١|١٨|٢٠|١٩ ⇐ اختارت ٢١.
//   · «مجموع ٥ متتالية = ٢٥، أوجد وسيطها» الصواب ٥، المعروض ٤|٧|٥|٦ ⇐ اختارت ٧.
//   وفي الحالتين تخطّت المموّه الأقرب (٢٠ و٦) لتقع على أكبر أعداد المتتالية بالضبط.
//   · النطق ٠/٨، وq_text فارغٌ في القسم كلّه منذ أربعة عشر يوماً — فتعذّر التشخيص.
//   · الاستماع ٣/٨، وأربعةٌ من خمسة أخطاءٍ يومٌ مجاور («Tuesday»⇐Monday، «Saturday»⇐Friday×٢).
const {chromium}=require('/opt/node22/lib/node_modules/playwright');
const BASE='http://localhost:8931/index.html';
let fails=0;
function ok(c,m){console.log((c?'  ✓ ':'  ✗ FAIL ')+m);if(!c)fails++}
async function mk(browser,q){
  const page=await browser.newPage({viewport:{width:420,height:900}});
  page.on('pageerror',e=>{console.log('  ! pageerror:',e.message);fails++});
  await page.route('**/functions/v1/**',r=>r.fulfill({status:200,contentType:'application/json',body:'{}'}));
  await page.route('**/rest/v1/**',r=>r.fulfill({status:201,contentType:'application/json',body:'[]'}));
  await page.addInitScript(()=>{
    Object.defineProperty(window,'speechSynthesis',{configurable:true,value:{speak(){},cancel(){},resume(){},pause(){},
      getVoices:()=>[{lang:'en-US',name:'X'}],speaking:false,pending:false}});
    window.SpeechSynthesisUtterance=function(t){this.text=t};
  });
  await page.goto(BASE+(q||''),{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>typeof window.render==='function',{timeout:15000});
  await page.evaluate(()=>localStorage.clear());
  return page;
}

(async()=>{
  const browser=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'});

  // ===== ١) المولّدان يحملان المتتالية والطرف المطلوب =====
  console.log('\n١) المتتالية موسومةٌ في المولّد');
  {
    const page=await mk(browser);
    const r=await page.evaluate(()=>{
      const out={consec:[],median:[]};
      for(let i=0;i<25;i++){
        const c=gConsec(),m=gMedian();
        out.consec.push({seq:c.seq,want:c.want,ans:parseArNum(c.c[c.a])});
        out.median.push({seq:m.seq,want:m.want,ans:parseArNum(m.c[m.a])});
      }
      return out;
    });
    ok(r.consec.every(x=>Array.isArray(x.seq)&&x.seq.length>=3),'gConsec يحمل المتتالية');
    ok(r.consec.every(x=>x.want==='first'),'ومطلوبها الأصغر');
    ok(r.consec.every(x=>x.ans===x.seq[0]),'والصواب هو أوّلها فعلاً — الوسم يطابق الجواب');
    ok(r.median.every(x=>Array.isArray(x.seq)&&x.seq.length===5),'gMedian يحمل خمسة أعداد');
    ok(r.median.every(x=>x.want==='mid'),'ومطلوبها الأوسط');
    ok(r.median.every(x=>x.ans===x.seq[2]),'والصواب هو أوسطها فعلاً');
    // ومتتالية فعلاً: كل عددٍ يزيد واحداً
    ok(r.consec.every(x=>x.seq.every((v,k)=>k===0||v===x.seq[k-1]+1)),'وهي متتاليةٌ حقيقية (+١ لكل خطوة)');
    await page.close();
  }

  // ===== ٢) الآلية تُسمّى بأرقامها هي، ولا تُسمّى بغيرها =====
  console.log('\n٢) seqEndName بأرقامها هي');
  {
    const page=await mk(browser);
    const r=await page.evaluate(()=>{
      const consec={seq:[19,20,21],want:"first"};   // «الأصغر؟» الصواب ١٩، اختارت ٢١
      const med={seq:[3,4,5,6,7],want:"mid"};       // «الوسيط؟» الصواب ٥، اختارت ٧
      return{
        real1:seqEndName(consec,21), real2:seqEndName(med,7),
        wantsC:seqWantName(consec), wantsM:seqWantName(med),
        // المموّه الأقرب الذي تخطّته يُسمّى كذلك — فيُفرَّق لاحقاً بين الطرف وزلّة القرب
        near1:seqEndName(consec,20), near2:seqEndName(med,6),
        // عددٌ خارج المتتالية لا يُسمّى بها إطلاقاً
        outside:seqEndName(consec,99), noSeq:seqEndName({},21), nul:seqEndName(null,3),
      };
    });
    ok(r.real1==='الأكبر','٢١ في (١٩،٢٠،٢١) تُسمّى «الأكبر» — '+r.real1);
    ok(r.real2==='الأكبر','و٧ في (٣..٧) تُسمّى «الأكبر» — '+r.real2);
    ok(r.wantsC==='الأصغر'&&r.wantsM==='الأوسط','والمطلوب يُسمّى صحيحاً — '+r.wantsC+' · '+r.wantsM);
    ok(r.near1==='الأوسط','والمموّه الأقرب يُسمّى بموضعه لا يُهمَل — '+r.near1);
    ok(r.near2==='عدداً من داخلها','وما ليس طرفاً ولا وسطاً يُسمّى كذلك — '+r.near2);
    ok(r.outside===null&&r.noSeq===null&&r.nul===null,'وما خرج عن المتتالية لا يُسمّى بها');
    await page.close();
  }

  // ===== ٣) البوّابة: تكرارٌ يُسلّح، وصوابٌ يحلّ، والخيارات تختفي =====
  console.log('\n٣) البوّابة تمنع لا تنبّه');
  {
    const page=await mk(browser);
    const r=await page.evaluate(()=>{
      // مموّهات gConsec هي [first+1, first-1, mid]، فأكبرُ المتتالية قد لا يكون معروضاً
      // أصلاً في كل توليدة — والاختبار يجب أن يضمن وجود خيارٍ **من داخل المتتالية**
      // وإلا لم يقع الخطأ المقصود ومرّ الفحص لسببٍ خاطئ.
      const wrongIdx=q=>q.c.findIndex(function(x,k){
        return k!==q.a&&q.seq.indexOf(parseArNum(x))>=0;
      });
      const mkQ=function(){for(let i=0;i<200;i++){const q=gConsec();if(wrongIdx(q)>=0)return q}return null};
      const a=mkQ(),b=mkQ(),c=mkQ();
      if(!a||!b||!c)return{noItem:true};
      filtered=[a,b,c];idx=0;picked=null;locked=false;seqClear();
      mode="quiz";answered=[];score=0;questionShownAt=Date.now();
      const out={};
      // زلّةٌ أولى: تُسمّى ولا تُسلّح
      choose(wrongIdx(a));
      out.armed1=seqGated();
      out.named1=shapeArmed("consec_wrong_end");
      next();
      // الثانية: تُسلّح
      choose(wrongIdx(filtered[1]));
      out.armedAfter2=(typeof seqOn!=='undefined')&&seqOn;
      // تُطفَأ بوّابة الثواني قبل القياس: لولا ذلك لاختفت الخيارات بسببها هي، فيمرّ
      // الفحص وهو لا يقيس بوّابة الطرف أصلاً — نفس فخّ «النجاح لسببٍ خاطئ».
      next();gateLeft=0;gateStop();render();
      out.gatedNow=seqGated();
      out.choicesShown=document.querySelectorAll('.choices .choice').length;
      out.boxShown=app.innerHTML.indexOf("أيّ طرفٍ مطلوب")>=0;
      // النقر مقفلٌ ما دامت مسلَّحة
      locked=false;choose(0);
      out.blocked=(locked===false);
      // اختيار الطرف الخطأ لا يفتح
      seqPickEnd(2);out.stillGated=seqGated();
      // والصحيح يفتح — وتُطفَأ بوّابة الثواني أوّلاً فهي بوّابةٌ أخرى تُخفي الخيارات
      // كذلك، ولولا إطفاؤها لمرّ الفحص (أو رسب) لسببٍ لا يخصّ ما نقيسه هنا.
      seqPickEnd(seqWantIdx(filtered[idx]));
      gateLeft=0;gateStop();render();
      out.opened=!seqGated();
      out.choicesAfter=document.querySelectorAll('.choices .choice').length;
      return out;
    });
    ok(!r.noItem,'وُجد سؤالٌ فيه خيارٌ من داخل المتتالية — وإلا لم يقع الخطأ المقصود');
    ok(r.armed1===false,'زلّةٌ واحدة لا تُسلّح البوّابة');
    ok(r.armedAfter2===true,'وتكرارها يُسلّحها (SHAPE_ARM=٢)');
    ok(r.gatedNow===true,'والسؤال التالي محكوم');
    ok(r.choicesShown===0,'والخيارات تختفي — منعٌ لا تنبيه');
    ok(r.boxShown===true,'ويُعرض صندوق «أيّ طرفٍ مطلوب؟» ومعه المتتالية');
    ok(r.blocked===true,'ولا تُقبل إجابةٌ قبل تحديد الطرف');
    ok(r.stillGated===true,'وتحديد الطرف الخطأ لا يفتحها');
    ok(r.opened===true&&r.choicesAfter>0,'والصحيح يفتحها فتظهر الخيارات');
    await page.close();
  }
  {
    // تنحلّ بالصواب — لا تُعاقَب من لا تحتاجها
    const page=await mk(browser);
    const r=await page.evaluate(()=>{
      const a=gConsec(),b=gConsec();
      filtered=[a,b];idx=0;picked=null;locked=false;seqClear();
      mode="quiz";answered=[];score=0;questionShownAt=Date.now();
      shapeRecord("consec_wrong_end",true);shapeRecord("consec_wrong_end",true);seqArm();
      const before=seqGated();
      // إجابةٌ صحيحة تحلّ التسليح
      seqPickEnd(seqWantIdx(a));locked=false;choose(a.a);
      return{before:before,after:(typeof seqOn!=='undefined')&&seqOn,
             cleared:!shapeArmed("consec_wrong_end")};
    });
    ok(r.before===true,'مسلَّحةٌ قبل الصواب');
    ok(r.after===false,'والصواب يحلّها');
    ok(r.cleared===true,'ويُصفَّر عدّاد الشكل — لا تُعاقَب من لا تحتاجها');
    await page.close();
  }

  // ===== ٤) الاسم يدخل السجلّ مع شكل الخطأ =====
  console.log('\n٤) السجلّ');
  {
    const page=await mk(browser);
    const posted=[];
    await page.route('**/rest/v1/mawhiba_answer_log**',rt=>{
      try{posted.push(JSON.parse(rt.request().postData()||'{}'))}catch(e){}
      rt.fulfill({status:201,body:''});
    });
    await page.evaluate(()=>{
      const a=gConsec();
      filtered=[a];idx=0;picked=null;locked=false;seqClear();
      mode="quiz";answered=[];score=0;questionShownAt=Date.now();
      const w=a.c.findIndex(x=>parseArNum(x)===a.seq[a.seq.length-1]);
      choose(w>=0?w:(a.a+1)%4);
    });
    await page.waitForTimeout(300);
    const row=posted.find(x=>x.domain==='quant');
    ok(!!row,'سطرٌ وصل الخادم');
    ok(row&&/consec_wrong_end/.test(row.response||''),'وفيه اسم الآلية — '+(row&&row.response));
    ok(row&&/قرأتِ الأكبر/.test(row.response||''),'ومعه أيّ طرفٍ قرأته');
    ok(row&&/والمطلوب الأصغر/.test(row.response||''),'وأيّ طرفٍ كان مطلوباً');
    ok(row&&/فرق/.test(row.response||''),'وشكلُ الفرق باقٍ كما كان — لا يُستبدَل');
    await page.close();
  }

  // ===== ٥) سطر النطق يحمل الجملة وحكم كل كلمة =====
  console.log('\n٥) النطق: q_text الذي غاب أربعة عشر يوماً');
  {
    const page=await mk(browser);
    const r=await page.evaluate(()=>{
      // الحالة الحقيقية: تفريغٌ مطابقٌ حرفياً سُجّل ٧٨٪ وخطأً
      const target="I'll see you after class.";
      const sc=pronScoreOf(target,target,null);
      const full=speakLogText(target,sc);
      // وحالةٌ فيها كلمةٌ ساقطة
      const sc2=pronScoreOf(target,"I'll see you after",null);
      return{full:full,partial:speakLogText(target,sc2),
             bare:speakLogText(target,null),
             pass:PRON_PASS,pct:sc.pct,pct2:sc2.pct};
    });
    ok(r.full.indexOf("I'll see you after class.")===0,'الجملة المطلوبة أوّل السطر');
    ok(/الكلمات:/.test(r.full),'ومعها حكم الكلمات');
    ok(/✓/.test(r.full),'وعلامةٌ لكل كلمة');
    ok(/العتبة/.test(r.full),'والعتبة مذكورة — فيُعرف قربُ الرسوب من النجاح');
    ok(/الحَكَم/.test(r.full),'ومَن حكم (judge أم local)');
    ok(r.pct===100,'وتفريغٌ مطابقٌ حرفياً بلا حكمٍ خارجي = ١٠٠٪ — '+r.pct);
    ok(/✗/.test(r.partial),'وكلمةٌ ساقطة تُوسَم ✗ — '+r.partial.slice(0,80));
    ok(r.pct2<r.pass,'ودرجتها تحت العتبة — '+r.pct2+' < '+r.pass);
    ok(r.bare==="I'll see you after class.",'وبلا حكمٍ يبقى نصّ الجملة وحده لا فراغ');
    await page.close();
  }

  // ===== ٦) أيّام الأسبوع دخلت المخزون ووصلت A1 =====
  console.log('\n٦) أيّام الأسبوع');
  {
    const page=await mk(browser);
    const r=await page.evaluate(()=>{
      const P=engPool();
      const days=P.filter(x=>/^u0_day/.test(x.id));
      return{n:days.length,
             allVocab:days.every(x=>x.t==="vocab"),
             a1ok:days.every(x=>engLevelOk(x,"A1")),
             notFrozen:days.every(x=>!engFrozen(x,"A1")),
             haveListen:days.every(x=>!!x.listen),
             haveWhy:days.every(x=>!!x.w),
             fourChoices:days.every(x=>Array.isArray(x.c)&&x.c.length===4),
             answerInRange:days.every(x=>x.a>=0&&x.a<x.c.length),
             uniqueChoices:days.every(x=>new Set(x.c).size===x.c.length),
             ids:new Set(P.map(x=>x.id)).size===P.length,
             sat:days.some(x=>/Saturday/.test(x.q)||/Saturday/.test(x.listen||"")),
             tue:days.some(x=>/Tuesday/.test(x.q)||/Tuesday/.test(x.listen||"")),
      };
    });
    ok(r.n===9,'تسعة عناصر: سبعة أيّام وسؤالا ترتيب — '+r.n);
    ok(r.allVocab,'كلّها مفردات');
    ok(r.a1ok&&r.notFrozen,'وتصل A1 ولا تُجمَّد — المفردات بلا تصنيف نحوي');
    ok(r.fourChoices&&r.answerInRange,'وأربعة خيارات لكلٍّ والصواب داخلها');
    ok(r.uniqueChoices,'ولا خيار مكرّر في عنصر — وإلا صار الصواب غامضاً');
    ok(r.haveListen&&r.haveWhy,'ولكلٍّ نطقُها وشرحُها');
    ok(r.sat&&r.tue,'واليومان اللذان أخطأتهما فعلاً موجودان');
    ok(r.ids,'ولا معرّف مكرّر في المخزون كلّه');
    await page.close();
  }

  // ===== ٧) لا انحدار =====
  console.log('\n٧) لا انحدار');
  for(const q of ['','?p=mohammed','?p=elias']){
    const page=await mk(browser,q);
    const r=await page.evaluate(()=>({missing:censusMissing(),modes:document.querySelectorAll('.mode').length}));
    ok(r.missing.length===0,(q||'هيا')+': لا دالّة مفقودة — '+r.missing.join(','));
    ok(r.modes>0,(q||'هيا')+': الصفحة تُرسم');
    await page.close();
  }
  {
    // اختبارٌ كامل بنقرات حقيقية بلا تسليح: لا شيء يتغيّر لمن لا تُخطئ الطرف
    const page=await mk(browser);
    const r=await page.evaluate(()=>{
      filtered=[];for(let i=0;i<8;i++)filtered.push(i%2?gConsec():gMedian());
      idx=0;picked=null;locked=false;seqClear();mode="quiz";answered=[];score=0;
      questionShownAt=Date.now();
      let n=0;
      for(let i=0;i<8;i++){
        if(seqGated())seqPickEnd(seqWantIdx(filtered[idx]));
        locked=false;choose(filtered[idx].a);n++;
        if(idx+1<filtered.length)next();
      }
      return{n:n,score:score,html:app.innerHTML.length};
    });
    ok(r.n===8,'جلسةٌ كاملة بثمانية أسئلة — '+r.n);
    ok(r.score===8,'وكلّها صواب فلا بوّابة تُسلَّح — '+r.score);
    ok(r.html>200,'والشاشة تُرسم');
    await page.close();
  }

  await browser.close();
  console.log(fails?`\n=== ${fails} فشل ===`:'\n=== كل الاختبارات نجحت ===');
  process.exit(fails?1:0);
})();
