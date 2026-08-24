// تجميد «أخطائي»، وآليّتا الرياضيات المسمّاتان، وقياس الإدخال دفعةً — ٢٤ أغسطس
//
// بياناتٌ حيّة بذرت الثلاثة:
//   · هيا (A1): «أخطائي» ١ من ١٢، وكلُّ عناصره تقريباً B1 (since/for، الكلام
//     المنقول، الموصول which/who، الماضي البسيط) — أي تحت التخمين من أربعة.
//   · «اضربي في ٢ ثم أضيفي ١، المُدخَل ٤» ⇐ ٨ (٢٤ أغسطس)، و«×٢ ثم +٧، المُدخَل ٥»
//     ⇐ ١٠ (٢٣ أغسطس): ضربت وتوقّفت قبل الجمع، يومين متتاليين.
//   · «٣٤٠٠٠ ملغم» ⇐ ١٠٣٤ (٢٤)، و«٢٧ كغم» ⇐ ٢٧٠٠ (٢٣): ١٠٠ مكان ١٠٠٠.
//   · ونصوصها في الكتابة تحمل عربيةً منطوقة («double madrasi»، «Tony taliba»).
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
// عناصر B1 حقيقية من سجلّها هي
const TRAP=['u3_g1','u3_g2','u3_g3','u7_g3','u7_g4','u2_g1','u2_g2'];

(async()=>{
  const browser=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'});

  // ===== ١) «أخطائي» لم يعد يُعيد ما فوق المستوى بدرجتين =====
  console.log('\n١) تجميد «أخطائي»');
  {
    const page=await mk(browser);
    const posted=[];
    await page.route('**/rest/v1/mawhiba_answer_log**',rt=>{
      try{posted.push(JSON.parse(rt.request().postData()||'{}'))}catch(e){}
      rt.fulfill({status:201,body:''});
    });
    const r=await page.evaluate(t=>{
      // سجلّ خطأٍ حقيقي على السبعة، كحالتها بالضبط
      const err={};t.forEach(function(id){err[id]={wrong:4,last:"خطأ"}});
      lsSet(ITEM_ERR_KEY,JSON.stringify(err));_engPool=null;
      const got=errCollect().filter(function(x){return x.kind==="item"});
      const ids=got.map(function(x){return x.key});
      return{leaked:t.filter(function(id){return ids.indexOf(id)>=0}),
             kept:Object.keys(itemErrLoad()).length,
             lv:profileOf().level};
    },TRAP);
    ok(r.lv==='A1','هيا A1');
    ok(r.leaked.length===0,'ولا عنصرَ B1 يعود في «أخطائي» — '+(r.leaked.join(',')||'نظيف'));
    ok(r.kept===TRAP.length,'وسجلّ الخطأ باقٍ كما هو — تجميدٌ لا محو ('+r.kept+')');
    // errCollect تُستدعى من errCount في كل رسمةٍ للرئيسية (أربع مرّات في الرسمة)،
    // فسطرٌ داخلها يُغرق السجلّ بصفوفٍ بلا حدث — كشفه test_log بثلاثة طلباتٍ حيث
    // يُتوقَّع طلبان. الإحصاء لا يُسجّل، والجلسة وحدها تُسجّل.
    await page.evaluate(()=>{errCount();errCount();home();render()});
    await page.waitForTimeout(300);
    ok(posted.filter(x=>x.qtype==='err_frozen').length===0,
       'الإحصاء ورسمُ الرئيسية لا يُسجّلان شيئاً — '+posted.filter(x=>x.qtype==='err_frozen').length);
    await page.evaluate(()=>startErrors());
    await page.waitForTimeout(300);
    const fr=posted.filter(x=>x.domain==='gen'&&x.qtype==='err_frozen');
    ok(fr.length===1,'وبدءُ الجلسة يُسجّل مرّةً واحدة — '+fr.length);
    ok(fr.length&&/u3_g1|u2_g1/.test(fr[0].response||''),'ومعه أيّ عناصر جُمّدت');
    await page.close();
  }
  {
    // ولو صار مستواها B1 عادت — البوّابة ترتفع بارتفاعها
    const page=await mk(browser,'?p=mohammed');
    const r=await page.evaluate(t=>{
      const err={};t.forEach(function(id){err[id]={wrong:4,last:"خطأ"}});
      lsSet(ITEM_ERR_KEY,JSON.stringify(err));_engPool=null;
      const POOL=engPool();
      return{lv:profileOf().level,
             backAtB1:t.filter(function(id){
               const it=POOL.filter(function(x){return x.id===id})[0];
               return it&&!engFrozen(it,"B1");}).length};
    },TRAP);
    ok(r.backAtB1===TRAP.length,'وعند B1 لا يُجمَّد منها شيء — '+r.backAtB1+' من '+TRAP.length);
    await page.close();
  }

  // ===== ٢) الآليّتان تُسمّيان بمحاكاة الإجراء لا بقرب الفرق =====
  console.log('\n٢) الآليّتان بأرقامها هي');
  {
    const page=await mk(browser);
    const r=await page.evaluate(()=>{
      const out={fn:[],met:[],names:Object.keys(M6_BUGS)};
      for(let i=0;i<40;i++){
        const q=m_function();
        const ans=parseArNum(q.c[q.a]);
        const bugVal=q.bugs&&q.bugs.fn_rule_no_add;
        out.fn.push({named:m6BugOf(q,bugVal),
                     notOnRight:m6BugOf(q,ans),
                     shownAsChoice:q.c.some(function(x){return parseArNum(x)===bugVal}),
                     lessThanAns:bugVal<ans});
      }
      for(let i=0;i<40;i++){
        const q=m_metric();
        const ans=parseArNum(q.c[q.a]);
        const bugVal=q.bugs&&q.bugs.metric_wrong_power;
        out.met.push({named:m6BugOf(q,bugVal),notOnRight:m6BugOf(q,ans)});
      }
      return out;
    });
    ok(r.names.indexOf('fn_rule_no_add')>=0&&r.names.indexOf('metric_wrong_power')>=0,
       'الاسمان في جدول M6_BUGS — '+r.names.join(' · '));
    ok(r.fn.every(x=>x.named==='fn_rule_no_add'),'ناتجُ الضرب وحده يُسمّى fn_rule_no_add دائماً');
    ok(r.fn.every(x=>x.lessThanAns),'وهو أقلُّ من الصواب دائماً — ضربت ثم توقّفت');
    ok(r.fn.every(x=>x.shownAsChoice),'ومعروضٌ بين الخيارات فعلاً (وإلا لم يقع الخطأ)');
    ok(r.fn.every(x=>x.notOnRight===null),'ولا يُسمّى عند الصواب');
    ok(r.met.every(x=>x.named==='metric_wrong_power'),'وخطأ السلّم العشري يُسمّى metric_wrong_power في الاتجاهين');
    ok(r.met.every(x=>x.notOnRight===null),'ولا عند الصواب');
    await page.close();
  }

  // ===== ٣) البوّابة تُسلَّح بالتكرار وتمنع فعلاً، وتنحلّ بالصواب =====
  console.log('\n٣) البوّابة تمنع لا تنبّه');
  {
    const page=await mk(browser);
    const r=await page.evaluate(()=>{
      const out={};
      const mkItem=function(){
        let q=null;
        for(let i=0;i<200;i++){const c=m_function();
          if(c.c.some(function(x){return parseArNum(x)===c.bugs.fn_rule_no_add})){q=c;break}}
        return q;
      };
      const a=mkItem(),b=mkItem(),c=mkItem();
      if(!a||!b||!c)return{noItem:true};
      const L={id:'m1_6',sk:'الدوال',no:'٦-١',t:'الدوال',ch:1};
      math6Items=[a,b,c];math6Items.forEach(function(x){x._l=L});
      math6Idx=0;math6Locked=false;math6Score=0;mode="math6";math6ShownAt=Date.now();
      m6Clear();
      const wrongIdx=function(q){return q.c.findIndex(function(x){return parseArNum(x)===q.bugs.fn_rule_no_add})};
      gateLeft=0;gateStop();
      math6Choose(wrongIdx(a));out.armed1=m6Gated();
      math6Idx=1;math6Locked=false;gateLeft=0;gateStop();
      math6Choose(wrongIdx(math6Items[1]));
      math6Idx=2;math6Locked=false;gateLeft=0;gateStop();render();
      out.gatedNow=m6Gated();
      out.choices=document.querySelectorAll('.choices .choice').length;
      out.box=app.innerHTML.indexOf('خطوةٌ ناقصة تتكرّر')>=0;
      out.rule=app.innerHTML.indexOf('خطوتان')>=0;
      // ولا تُقبل إجابةٌ ما دامت مسلَّحة
      math6Locked=false;math6Choose(0);out.blocked=(math6Locked===false);
      m6Clear();render();
      out.after=document.querySelectorAll('.choices .choice').length;
      return out;
    });
    ok(!r.noItem,'وُجدت توليدةٌ ناتجُ ضربها معروضٌ بين الخيارات');
    ok(r.armed1===false,'زلّةٌ واحدة لا تُسلّح');
    ok(r.gatedNow===true,'وتكرارها يُسلّح (SHAPE_ARM=٢)');
    ok(r.choices===0,'والخيارات تختفي — منعٌ لا تنبيه');
    ok(r.box&&r.rule,'ويُعرض اسم الخطوة الناقصة ومعها القاعدة');
    ok(r.blocked===true,'ولا تُقبل إجابةٌ قبل الإقرار');
    ok(r.after>0,'وتعود بالضغط على «فهمتُ»');
    await page.close();
  }
  {
    // الاسم يدخل السجلّ مع الإجابة
    const page=await mk(browser);
    const posted=[];
    await page.route('**/rest/v1/mawhiba_answer_log**',rt=>{
      try{posted.push(JSON.parse(rt.request().postData()||'{}'))}catch(e){}
      rt.fulfill({status:201,body:''});
    });
    await page.evaluate(()=>{
      let q=null;
      for(let i=0;i<200;i++){const c=m_function();
        if(c.c.some(function(x){return parseArNum(x)===c.bugs.fn_rule_no_add})){q=c;break}}
      q._l={id:'m1_6',sk:'الدوال',no:'٦-١',t:'الدوال',ch:1};
      math6Items=[q];math6Idx=0;math6Locked=false;math6Score=0;mode="math6";
      math6ShownAt=Date.now();m6Clear();gateLeft=0;gateStop();
      math6Choose(q.c.findIndex(function(x){return parseArNum(x)===q.bugs.fn_rule_no_add}));
    });
    await page.waitForTimeout(300);
    const row=posted.find(x=>x.domain==='math6');
    ok(!!row,'سطرٌ وصل الخادم');
    ok(row&&/fn_rule_no_add/.test(row.response||''),'وفيه اسم الآلية — '+(row&&row.response));
    ok(row&&/ضربتِ ثم توقّفتِ/.test(row.response||''),'ومعه وصفها بالعربية');
    await page.close();
  }

  // ===== ٤) أكبر إدخالٍ دفعةً واحدة يُقاس =====
  console.log('\n٤) قياس الإدخال دفعةً (فرضيّة الإملاء الصوتي)');
  {
    const page=await mk(browser);
    await page.evaluate(()=>{
      startWrite();
      writeItems=[WRITE_BANK.find(function(i){return i.id==="wr_a1_sc1"})];
      writeIdx=0;writeSubmitted=false;writeTyped="";writeBurstReset("");render();
    });
    // كتابةٌ بالأصابع: حرفٌ حرف
    await page.type('#writeIn','I like summer',{delay:5});
    const typed=await page.evaluate(()=>writeMaxBurst);
    ok(typed<=2,'الكتابة بالأصابع تُنتج دفعةً صغيرة — '+typed+' حرف');
    // إملاءٌ/لصق: عبارةٌ كاملة دفعةً واحدة
    await page.evaluate(()=>{
      const el=document.getElementById('writeIn');
      el.value="I like summer because I can swim every single day at the beach";
      el.dispatchEvent(new Event('input',{bubbles:true}));
    });
    const burst=await page.evaluate(()=>writeMaxBurst);
    ok(burst>=30,'والإدخال دفعةً واحدة يُرصَد — '+burst+' حرف');
    ok(burst>typed*10,'والفرق بينهما فاصلٌ لا لبس فيه');
    await page.close();
  }
  {
    // ويدخل السجلّ مع المحاولة، ولا يُسقط نجاحاً (قياسٌ لا علاج)
    const page=await mk(browser);
    const posted=[];
    await page.route('**/rest/v1/mawhiba_answer_log**',rt=>{
      try{posted.push(JSON.parse(rt.request().postData()||'{}'))}catch(e){}
      rt.fulfill({status:201,body:''});
    });
    await page.evaluate(()=>{
      startWrite();
      writeItems=[WRITE_BANK.find(function(i){return i.id==="wr_a1_sc1"})];
      writeIdx=0;writeSubmitted=false;writeTyped="";writeBurstReset("");render();
      const el=document.getElementById('writeIn');
      el.value="I like summer because I can swim every day";
      el.dispatchEvent(new Event('input',{bubbles:true}));
    });
    await page.evaluate(()=>writeSubmit());
    await page.waitForTimeout(500);
    const row=posted.find(x=>x.domain==='write'&&x.qtype!=='fix');
    ok(!!row,'سطر المحاولة وصل');
    ok(row&&/دفعة:\d+/.test(row.q_text||''),'وفيه قياس الدفعة — '+(row&&(row.q_text||'').match(/دفعة:\d+/)||[''])[0]);
    ok(row&&row.is_correct===true,'ولا يُسقط النجاح — قياسٌ لا علاج');
    await page.close();
  }

  // ===== ٥) لا انحدار =====
  console.log('\n٥) لا انحدار');
  for(const q of ['','?p=mohammed','?p=elias']){
    const page=await mk(browser,q);
    const r=await page.evaluate(()=>{
      const out={missing:censusMissing(),modes:document.querySelectorAll('.mode').length};
      try{startErrors();out.errMode=mode}catch(e){out.err=e.message}
      return out;
    });
    ok(r.missing.length===0,(q||'هيا')+': لا دالّة مفقودة — '+r.missing.join(','));
    ok(r.modes>0,(q||'هيا')+': الصفحة تُرسم');
    ok(!r.err,(q||'هيا')+': «أخطائي» يفتح بلا عطل — '+(r.err||r.errMode));
    await page.close();
  }
  {
    const page=await mk(browser);
    const r=await page.evaluate(()=>{
      startMath6();
      let guard=0,n=0;
      while(guard++<12&&math6Cur()){
        m6Clear();gateLeft=0;gateStop();math6Locked=false;
        math6Choose(math6Cur().a);n++;
        if(math6Idx+1>=math6Items.length)break;
        math6Next();
      }
      return{n:n,score:math6Score,html:app.innerHTML.length};
    });
    ok(r.n>=5,'جلسة رياضيات كاملة بلا عطل — '+r.n+' إجابة');
    ok(r.score===r.n,'وكلّها صواب فلا بوّابة تُسلَّح — '+r.score);
    ok(r.html>200,'والشاشة تُرسم');
    await page.close();
  }

  await browser.close();
  console.log(fails?`\n=== ${fails} فشل ===`:'\n=== كل الاختبارات نجحت ===');
  process.exit(fails?1:0);
})();
