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
    const page=await mk(browser,'?p=mohammed');
    const r=await page.evaluate(doms=>{
      const out={lv:profileOf().level,next:LV_NEXT[profileOf().level]};
      // مغلقةٌ ابتداءً: بلا سجلّ دقّة لا تمدّد
      out.closedAtFirst={};
      doms.forEach(function(d){
        out.closedAtFirst[d[0]]=bankStretched(d[0],"B1",window[d[1]])
          .some(function(x){return x.lv==="B2"});
      });
      // ثماني إصاباتٍ متتالية ⇒ ١٠٠٪ ⇒ تُفتح
      doms.forEach(function(d){for(let i=0;i<8;i++)accRecord(d[0],true)});
      out.openAfter={};
      doms.forEach(function(d){
        const b=bankStretched(d[0],"B1",window[d[1]]);
        out.openAfter[d[0]]={hasB2:b.some(function(x){return x.lv==="B2"}),
                             keepsB1:b.some(function(x){return x.lv==="B1"})};
      });
      // ثم انهيارٌ دون ٧٠٪ ⇒ تُغلق
      doms.forEach(function(d){for(let i=0;i<12;i++)accRecord(d[0],false)});
      out.closedAgain={};
      doms.forEach(function(d){
        out.closedAgain[d[0]]=bankStretched(d[0],"B1",window[d[1]])
          .some(function(x){return x.lv==="B2"});
      });
      return out;
    },DOMS);
    ok(r.lv==='B1','مستوى محمد المُعلَن يبقى B1 — لم يُرفَع بالافتراض');
    ok(r.next==='B2','وله الآن مدخلٌ إلى B2 في LV_NEXT — كان معدوماً');
    DOMS.forEach(function(d){
      ok(r.closedAtFirst[d[0]]===false,d[0]+': مغلقةٌ قبل أن يُقاس شيء');
      ok(r.openAfter[d[0]].hasB2===true,d[0]+': وتُفتح بـ١٠٠٪ على ثماني إجابات');
      ok(r.openAfter[d[0]].keepsB1===true,d[0]+': وبنك B1 باقٍ معه — إضافةٌ لا استبدال');
      ok(r.closedAgain[d[0]]===false,d[0]+': وتنغلق بالانهيار دون ٧٠٪');
    });
    await page.close();
  }

  // ===== ٣) ولا يتسرّب B2 إلى هيا وإلياس =====
  console.log('\n٣) لا تسرّب إلى المستويات الأدنى');
  for(const [q,who,lv] of [['','هيا','A1'],['?p=elias','إلياس','A2']]){
    const page=await mk(browser,q);
    const r=await page.evaluate(doms=>{
      const L=profileOf().level,out={lv:L,leak:[]};
      // حتى بإتقانٍ تامّ: A1 يفتح A2 فقط، وA2 يفتح B1 فقط — لا قفزَ درجتين
      doms.forEach(function(d){for(let i=0;i<10;i++)accRecord(d[0],true)});
      doms.forEach(function(d){
        const b=bankStretched(d[0],L,window[d[1]]);
        if(b.some(function(x){return x.lv==="B2"}))out.leak.push(d[0]);
      });
      out.next=LV_NEXT[L];
      return out;
    },DOMS);
    ok(r.lv===lv,who+': مستواه '+r.lv);
    ok(r.next!=='B2',who+': ولا يفتح B2 مباشرةً — درجةٌ واحدة لا درجتان ('+r.next+')');
    ok(r.leak.length===0,who+': ولا عنصرَ B2 يتسرّب إليه ولو أتقن — '+(r.leak.join(',')||'نظيف'));
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
