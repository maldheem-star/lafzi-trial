// محتوى B2 لمحمد، ووصلُه ببوّابة التمدّد المقاسة — ٢٥ أغسطس
//
// بذرتها بياناتٌ حيّة (٢٤ أغسطس): محمد قواعد ١٠/١٠ ومقروء ٩٤٪، وLV_NEXT بلا مدخلٍ
// لـB1 — فبوّابة التمدّد عاطلةٌ بنيوياً في الأقسام السبعة كلّها: مئةٌ بالمئة عنده لا
// تفتح شيئاً لأن لا شيء فوقه. وgramBankFor وحدها كانت تُلحق B1+ بلا شرط.
//
// والمبدأ الحاكم: **المستوى يُقاس لا يُفترَض**. فمستواه في PROFILES يبقى B1 كما قِيس،
// وB2 يصله عبر البوّابة نفسها (٨٥٪ على ≥٨ تفتح، وأقلّ من ٧٠٪ تُغلق) إضافةً لا استبدالاً.
const {chromium}=require('/opt/node22/lib/node_modules/playwright');
const BASE='http://localhost:8931/index.html';
let fails=0;
function ok(c,m){console.log((c?'  ✓ ':'  ✗ FAIL ')+m);if(!c)fails++}
async function mk(browser,q){
  const page=await browser.newPage({viewport:{width:420,height:900}});
  page.on('pageerror',e=>{console.log('  ! pageerror:',e.message);fails++});
  await page.route('**/functions/v1/**',r=>r.fulfill({status:200,contentType:'application/json',body:'{"ok":true,"reply":"NONE"}'}));
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
const DOMS=[["listen","listenBankFor"],["read","readBankFor"],["write","writeBankFor"],
            ["gram","gramBankFor"],["step","stepBankFor"],["minpair","minpairBankFor"],["video","videoBankFor"]];

(async()=>{
  const browser=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'});

  // ===== ١) لكل قسمٍ بنك B2، وكلُّ عنصرٍ سليم الشكل =====
  console.log('\n١) البنوك السبعة');
  {
    const page=await mk(browser,'?p=mohammed');
    const r=await page.evaluate(doms=>{
      const out={};
      doms.forEach(function(d){
        const bank=window[d[1]]("B2").filter(function(x){return x.lv==="B2"});
        out[d[0]]={n:bank.length,
          ids:bank.every(function(x){return !!x.id}),
          uniq:new Set(bank.map(function(x){return x.id})).size===bank.length,
          lv:bank.every(function(x){return x.lv==="B2"})};
      });
      // تلوّثٌ عربي في النصّ الإنجليزي يُفسد القسم — الشرح عربيٌّ عمداً فيُستثنى
      const ar=/[؀-ۿ]/;
      out.listenClean=listenBankFor("B2").filter(function(x){return x.lv==="B2"})
        .every(function(x){return !ar.test(x.audio)&&!ar.test(x.q)&&x.c.every(function(y){return !ar.test(y)})});
      out.readClean=readBankFor("B2").filter(function(x){return x.lv==="B2"})
        .every(function(x){return !ar.test(x.passage)&&!ar.test(x.q)&&x.c.every(function(y){return !ar.test(y)})});
      out.gramClean=gramBankFor("B2").filter(function(x){return x.lv==="B2"})
        .every(function(x){return x.c.every(function(y){return !ar.test(y.t)&&ar.test(y.why)})});
      out.gramOneRight=gramBankFor("B2").filter(function(x){return x.lv==="B2"})
        .every(function(x){return x.c.filter(function(y){return y.ok}).length===1});
      out.gramFour=gramBankFor("B2").filter(function(x){return x.lv==="B2"})
        .every(function(x){return x.c.length===4});
      out.listenAns=listenBankFor("B2").filter(function(x){return x.lv==="B2"})
        .every(function(x){return x.a>=0&&x.a<x.c.length&&new Set(x.c).size===x.c.length});
      out.readAns=readBankFor("B2").filter(function(x){return x.lv==="B2"})
        .every(function(x){return x.a>=0&&x.a<x.c.length&&new Set(x.c).size===x.c.length});
      return out;
    },DOMS);
    DOMS.forEach(function(d){
      const v=r[d[0]];
      ok(v.n>=5,d[0]+': بنك B2 كافٍ — '+v.n+' عنصراً');
      ok(v.ids&&v.uniq&&v.lv,d[0]+': معرّفاتٌ فريدة ومستوًى صحيح');
    });
    ok(r.listenClean&&r.readClean,'نصوص الاستماع/المقروء إنجليزيةٌ خالصة — لا تلوّث عربي');
    ok(r.listenAns&&r.readAns,'والصواب داخل الخيارات ولا خيار مكرّر');
    ok(r.gramClean,'وجمل القواعد إنجليزية وشرحُ كلٍّ عربي — كعُرف البنك');
    ok(r.gramOneRight&&r.gramFour,'وأربع جملٍ صحيحتها واحدة بالضبط (GJT)');
    await page.close();
  }

  // ===== ٢) الوصل: B2 يصل محمداً بالقياس لا بالافتراض =====
  console.log('\n٢) بوّابة التمدّد — ٨٥٪ تفتح و٧٠٪ تُغلق');
  {
    // **لا تُكتب درجةٌ هنا** — محمد رُفع B1⇐B2 (١٣ سبتمبر) بأمر صاحب المشروع ومعه
    // سندٌ مقاس (مقروء B2 ‏٩٤٪ على ٢١ يوماً). والدعوى التي جاء لأجلها هذا القسم
    // **آليّةُ البوّابة** لا اسمُ درجته: مغلقةٌ قبل القياس، تُفتح بـ٨٥٪ فما فوق على
    // ≥٨ إجابات، تُضيف ولا تستبدل، وتنغلق دون ٧٠٪. فيُشتقّ مستواه ودرجتُه التالية
    // من PROFILES/LV_NEXT الحيّين، ولا ينكسر القسم مع أيّ رفعٍ لاحق.
    const page=await mk(browser,'?p=mohammed');
    const r=await page.evaluate(doms=>{
      const L=profileOf().level,N=LV_NEXT[L];
      const out={lv:L,next:N,
        decl:(PROFILES.filter(function(p){return p.id==="mohammed"})[0]||{}).level};
      // **ومخزونُ الدرجة التالية يُقاس قبل أن يُطلَب من البوّابة أن تفتحه** — وإلّا
      // كان القسم يفحص تأليفَ محتوًى لا آليّةَ بوّابة، فيسقط على بنكٍ لم يُؤلَّف له
      // شيءٌ بعد. فلكل بنكٍ حكمُه: من له مخزونٌ تُفتح عنده، ومن لا مخزون له يُسمَّى.
      out.stock={};
      doms.forEach(function(d){
        out.stock[d[0]]=(window[d[1]](N)||[]).filter(function(x){return x.lv===N}).length;
      });
      // مغلقةٌ ابتداءً: بلا سجلّ دقّة لا تمدّد
      out.closedAtFirst={};
      doms.forEach(function(d){
        out.closedAtFirst[d[0]]=bankStretched(d[0],L,window[d[1]])
          .some(function(x){return x.lv===N});
      });
      // ثماني إصاباتٍ متتالية ⇒ ١٠٠٪ ⇒ تُفتح
      doms.forEach(function(d){for(let i=0;i<8;i++)accRecord(d[0],true)});
      out.openAfter={};
      doms.forEach(function(d){
        const b=bankStretched(d[0],L,window[d[1]]);
        out.openAfter[d[0]]={hasNext:b.some(function(x){return x.lv===N}),
                             keepsBase:b.some(function(x){return x.lv===L})};
      });
      // ثم انهيارٌ دون ٧٠٪ ⇒ تُغلق
      doms.forEach(function(d){for(let i=0;i<12;i++)accRecord(d[0],false)});
      out.closedAgain={};
      doms.forEach(function(d){
        out.closedAgain[d[0]]=bankStretched(d[0],L,window[d[1]])
          .some(function(x){return x.lv===N});
      });
      return out;
    },DOMS);
    ok(r.lv===r.decl,'مستوى محمد المعروض هو المُعلَن في PROFILES ('+r.lv+')');
    ok(!!r.next,'وله درجةٌ تالية في LV_NEXT ('+r.lv+' ⇐ '+r.next+') — فالبوّابة لها ما تفتحه');
    const withStock=DOMS.filter(function(d){return r.stock[d[0]]>0});
    const noStock=DOMS.filter(function(d){return !r.stock[d[0]]});
    // **ولا يُفحَص فحصٌ فارغ**: لو خلت البنوك كلُّها من الدرجة التالية لمرّ القسم
    // بلا أن يقيس فتحاً واحداً — فيُشترَط بنكٌ واحد على الأقلّ بمخزون.
    ok(withStock.length>0,`وبنكٌ واحد على الأقلّ فيه مخزون ${r.next} فعلاً — `+
      withStock.map(function(d){return d[0]+':'+r.stock[d[0]]}).join(' · '));
    DOMS.forEach(function(d){
      ok(r.closedAtFirst[d[0]]===false,d[0]+': مغلقةٌ قبل أن يُقاس شيء');
      ok(r.openAfter[d[0]].keepsBase===true,d[0]+`: وبنك ${r.lv} باقٍ معه — إضافةٌ لا استبدال`);
      ok(r.closedAgain[d[0]]===false,d[0]+': وتنغلق بالانهيار دون ٧٠٪');
    });
    withStock.forEach(function(d){
      ok(r.openAfter[d[0]].hasNext===true,
        d[0]+`: وتُفتح ${r.next} بـ١٠٠٪ على ثماني إجابات (المخزون ${r.stock[d[0]]})`);
    });
    // **الفجوة تُقال بالرقم لا تُبتلَع**: خمسةُ بنوكٍ بلا طبقة C1 بعد (١٣ سبتمبر) —
    // فمحمدٌ عند ١٠٠٪ فيها لا يجد فوقه شيئاً، وهو **نصفُ الحلقة** بعينه الموثَّق
    // ٢١ أغسطس. ليس عطلاً في البوّابة بل محتوًى لم يُؤلَّف، ويُسمَّى كي لا يُنسى.
    if(noStock.length)console.log('  ⚠ بلا مخزون '+r.next+' بعد (محتوًى لم يُؤلَّف، لا عطل): '+
      noStock.map(function(d){return d[0]}).join(' · '));
    await page.close();
  }

  // ===== ٣) ولا يتسرّب إلى المستويات الأدنى أكثر من درجةٍ واحدة =====
  console.log('\n٣) لا تسرّب إلى المستويات الأدنى');
  // إلياس A2 ⇐ B1 (٨ سبتمبر، أمر صاحب المشروع بسندٍ مقاس: ٩٠٪ و٨٩٪ بعد فتح
  // بوّابة التمدّد). والدعوى التي جاء لأجلها هذا القسم **درجةٌ واحدة لا درجتان**،
  // لا «إلياس لا يرى B2» — فبعد رفعه صار فتحُ B2 له هو **عينَ** السلوك الصحيح
  // (كما لمحمد في القسم ٢). فصار القياس **بالرتبة** لا باسم درجةٍ مكتوبة: لا عنصرَ
  // فوق مستوى المتعلّم بأكثر من درجة. وهذا يُثبّت الدعوى الأصلية ولا يُدهَس، ولا
  // ينكسر مع أيّ رفعٍ لاحق — درس «الأعداد المكتوبة في الاختبارات فخّ صامت».
  // **ولا رتبةٌ مكتوبة أيضاً**: جدولُ الرتب كان `{A1:0,A2:1,B1:2,B2:3}` بلا C1،
  // فطبقة C1 (١٣ سبتمبر) كانت ستجعل `RANK[x.lv]||0` تقرأ C1 **صفراً** — أي أدنى
  // من A1 — فيمرّ التسرّب بلا أن يُمسَك. صار يُقرأ من `ENG_LV_RANK` الحيّ نفسه.
  for(const [q,who,id] of [['','هيا','haya'],['?p=elias','إلياس','elias']]){
    const page=await mk(browser,q);
    const r=await page.evaluate(arg=>{
      const doms=arg.doms,RANK=ENG_LV_RANK;
      const top=Math.max.apply(null,Object.keys(RANK).map(function(k){return RANK[k]}));
      const L=profileOf().level,out={lv:L,leak:[],over:[],
        decl:(PROFILES.filter(function(p){return p.id===arg.who})[0]||{}).level};
      // حتى بإتقانٍ تامّ: تُفتح الدرجة التالية وحدها — لا قفزَ درجتين
      doms.forEach(function(d){for(let i=0;i<10;i++)accRecord(d[0],true)});
      doms.forEach(function(d){
        const b=bankStretched(d[0],L,window[d[1]]);
        const far=b.filter(function(x){return (RANK[x.lv]||0)>RANK[L]+1});
        if(far.length)out.leak.push(d[0]+':'+far[0].lv);
      });
      out.next=LV_NEXT[L];
      out.nextIsOne=(RANK[out.next]===RANK[L]+1)||(out.next===undefined&&RANK[L]===top);
      return out;
    },{doms:DOMS,who:id});
    ok(r.lv===r.decl,who+': مستواه '+r.lv+' = المُعلَن في PROFILES');
    ok(r.nextIsOne===true,who+': والمفتوح درجةٌ واحدة فوقه لا درجتان ('+r.lv+' ⇐ '+r.next+')');
    ok(r.leak.length===0,who+': ولا عنصرَ فوقه بدرجتين يتسرّب إليه ولو أتقن — '+(r.leak.join(',')||'نظيف'));
    await page.close();
  }

  // ===== ٤) جلساتٌ حقيقية تعمل بالمحتوى الجديد =====
  console.log('\n٤) جلساتٌ حقيقية بمحتوى B2');
  {
    const page=await mk(browser,'?p=mohammed');
    const r=await page.evaluate(doms=>{
      doms.forEach(function(d){for(let i=0;i<10;i++)accRecord(d[0],true)});
      const out={};
      [["listen",startListen,function(){return listenItems}],
       ["read",startRead,function(){return readItems}],
       ["gram",startGram,function(){return gramItems}],
       ["step",startStep,function(){return stepItems}],
       ["video",startVideo,function(){return videoItems}],
       ["write",startWrite,function(){return writeItems}],
       ["minpair",startMinpair,function(){return minpairItems}]].forEach(function(x){
        try{x[1]();const it=x[2]()||[];
          out[x[0]]={n:it.length,b2:it.filter(function(i){return i.lv==="B2"}).length};
        }catch(e){out[x[0]]={err:e.message}}
      });
      return out;
    },DOMS);
    Object.keys(r).forEach(function(k){
      ok(!r[k].err,k+': الجلسة تُبنى بلا عطل — '+(r[k].err||(r[k].n+' عنصر، منها '+r[k].b2+' من B2')));
      ok(r[k].n>0,k+': وليست فارغة');
    });
    await page.close();
  }
  {
    // جلسة استماع كاملة بنقراتٍ حقيقية على محتوى B2
    const page=await mk(browser,'?p=mohammed');
    const r=await page.evaluate(()=>{
      for(let i=0;i<10;i++)accRecord("listen",true);
      startListen();
      let n=0,guard=0;
      while(guard++<20&&listenCur()){
        gateLeft=0;gateStop();listenLocked=false;
        listenChoose(listenCur().a);n++;
        if(listenIdx+1>=listenItems.length)break;
        listenNext();
      }
      return{n:n,score:listenScore,html:app.innerHTML.length};
    });
    ok(r.n>=5,'جلسة استماع كاملة — '+r.n+' إجابة');
    ok(r.score===r.n,'وكلّها صواب ('+r.score+') — المفاتيح سليمة في محتوى B2');
    ok(r.html>200,'والشاشة تُرسم');
    await page.close();
  }

  // ===== ٥) لا انحدار =====
  console.log('\n٥) لا انحدار');
  for(const q of ['','?p=mohammed','?p=elias']){
    const page=await mk(browser,q);
    const r=await page.evaluate(()=>({missing:censusMissing(),modes:document.querySelectorAll('.mode').length}));
    ok(r.missing.length===0,(q||'هيا')+': لا دالّة مفقودة — '+r.missing.join(','));
    ok(r.modes>0,(q||'هيا')+': الصفحة تُرسم');
    await page.close();
  }

  await browser.close();
  console.log(fails?`\n=== ${fails} فشل ===`:'\n=== كل الاختبارات نجحت ===');
  process.exit(fails?1:0);
})();
