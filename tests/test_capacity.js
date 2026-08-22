// السعة: هل يولّد المحرّك ما يكفي لاستعمالٍ كثيف بلا تكرار؟ — ٢١ أغسطس
// سُئل السؤال فحُسب من البيانات: زمن الإجابة الوسيط المقاس يعني ٤٣ عنصراً/٧٫٣ دقيقة،
// وساعتان تستهلكان ٣٥٠-٧٠٠. والسقف القديم (١٥) حدّ المتاح عند ١٤٧ لكل مستوى.
// هذه الاختبارات تُثبت الأعناق الثلاثة قد فُتحت: السقف، والدفعة، والنبضة، والأزواج.
const {chromium}=require('/opt/node22/lib/node_modules/playwright');
const BASE='http://localhost:8931/index.html';
let fails=0;
function ok(c,m){console.log((c?'  ✓ ':'  ✗ FAIL ')+m);if(!c)fails++}
async function mk(browser,q){
  const page=await browser.newPage();
  page.on('pageerror',e=>{console.log('  ! pageerror:',e.message);fails++});
  await page.goto(BASE+(q||''),{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>typeof window.render==='function',{timeout:15000});
  await page.evaluate(()=>localStorage.clear());
  return page;
}

(async()=>{
  const browser=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'});

  // ===== ١) السقف والدفعة =====
  console.log('\n١) السقف والدفعة');
  {
    const page=await mk(browser,'?p=elias');
    const r=await page.evaluate(()=>({
      max:GEN_BANK_MAX,
      empty:genCallsFor(0,8),
      nearEmpty:genCallsFor(10,8),      // < N*2 = ١٦ ⇒ دفعٌ قويّ
      belowTarget:genCallsFor(25,8),    // < N*5 = ٤٠ ⇒ متوسّط
      healthy:genCallsFor(60,8),        // ≥ الهدف ⇒ هادئ
      atCeiling:genCallsFor(80,8),
      overCeiling:genCallsFor(120,8),
      room:genCallsFor(78,8),           // الغرفة أضيق من الدفعة
    }));
    ok(r.max===80,'السقف ٨٠ لا ١٥ — '+r.max);
    ok(r.empty===8,'بنكٌ فارغ ⇒ دفعةٌ كاملة — '+r.empty);
    ok(r.nearEmpty===8,'على وشك النفاد ⇒ دفعةٌ كاملة — '+r.nearEmpty);
    ok(r.belowTarget===5,'دون الهدف ⇒ دفعةٌ متوسّطة — '+r.belowTarget);
    ok(r.healthy===2,'بنكٌ صحّيّ ⇒ نموٌّ هادئ — '+r.healthy);
    ok(r.atCeiling===0&&r.overCeiling===0,'عند السقف أو فوقه ⇒ يتوقّف التوليد');
    ok(r.room===2,'الدفعة لا تتجاوز الغرفة المتبقّية — '+r.room);
    await page.close();
  }

  // ===== ٢) حارس التزامن =====
  console.log('\n٢) حارس التزامن');
  {
    const page=await mk(browser,'?p=elias');
    const r=await page.evaluate(async()=>{
      let started=0,resolve=null;
      const hold=new Promise(function(r){resolve=r});
      const mkCall=function(){started++;return hold};
      const fired=[];
      for(let i=0;i<10;i++)fired.push(genFire(mkCall));
      const duringMax=genInFlight;
      resolve();
      await hold;
      await new Promise(function(r){setTimeout(r,30)});
      return{started:started,accepted:fired.filter(Boolean).length,
        rejected:fired.filter(x=>!x).length,duringMax:duringMax,after:genInFlight,
        cap:GEN_MAX_INFLIGHT};
    });
    ok(r.accepted===r.cap,'عشر محاولات ⇒ يُقبَل بقدر السقف فقط — '+r.accepted+'/'+r.cap);
    ok(r.rejected===10-r.cap,'والفائض يُهمَل بهدوء — '+r.rejected);
    ok(r.duringMax<=r.cap,'الطائر لا يتجاوز السقف — '+r.duringMax);
    ok(r.after===0,'ويعود العدّاد صفراً بعد انتهائها — '+r.after);
    await page.close();
  }
  {
    // نداءٌ فاشل لا يُبقي العدّاد معلّقاً — وإلا توقّف التوليد للأبد بعد أول عطل شبكة
    const page=await mk(browser,'?p=elias');
    const r=await page.evaluate(async()=>{
      genFire(function(){return Promise.reject(new Error('boom'))});
      genFire(function(){throw new Error('sync boom')});
      await new Promise(function(r){setTimeout(r,50)});
      return genInFlight;
    });
    ok(r===0,'فشلٌ (وعدٌ مرفوض أو خطأ متزامن) لا يُجمّد العدّاد — '+r);
    await page.close();
  }

  // ===== ٣) النبضة أثناء الجلسة =====
  console.log('\n٣) النبضة أثناء الجلسة');
  {
    const page=await mk(browser,'?p=elias');
    const calls=[];
    await page.route('**/functions/v1/tutor',r=>{
      try{calls.push(JSON.parse(r.request().postData()||'{}'))}catch(e){}
      r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({ok:true,reply:"x"})});
    });
    await page.route('**/rest/v1/mawhiba_answer_log**',r=>r.fulfill({status:201,body:''}));
    await page.evaluate(()=>startGram());
    await page.waitForTimeout(200);
    const atStart=calls.length;
    // ثلاث خطوات ⇒ نبضةٌ واحدة على الأقلّ (GEN_PULSE_EVERY=3)
    for(let i=0;i<4;i++){
      await page.evaluate(()=>{const b=document.querySelectorAll('.choice');if(b.length)b[0].click()});
      await page.waitForTimeout(60);
      await page.evaluate(()=>{if(!gramDone)gramNext()});
      await page.waitForTimeout(120);
    }
    const afterSteps=calls.length;
    ok(atStart>0,'التوليد يبدأ مع الجلسة — '+atStart+' نداء');
    ok(afterSteps>atStart,'والنبضة تُضيف أثناءها — '+atStart+' ⇐ '+afterSteps);
    ok(calls.every(c=>c.mode==='gen'&&c.domain==='gram'),'كلّها نداءات توليدٍ لهذا القسم');
    await page.close();
  }
  {
    // النبضة تُطلق كل ثالث عنصر لا كل عنصر
    const page=await mk(browser,'?p=elias');
    const r=await page.evaluate(()=>{
      const hits=[];
      const real=window.genTopUp;
      window.genTopUp=function(){hits.push(1)};
      for(let i=0;i<9;i++)genPulseFor('listen','A2',i);
      window.genTopUp=real;
      return{n:hits.length,every:GEN_PULSE_EVERY};
    });
    ok(r.n===3,'تسع خطوات ⇒ ثلاث نبضات (كل '+r.every+') — '+r.n);
    await page.close();
  }

  // ===== ٤) أزواج النطق: توسيعٌ يدويّ =====
  console.log('\n٤) أزواج النطق');
  {
    const page=await mk(browser);
    const r=await page.evaluate(()=>{
      const out={total:MINPAIR_BANK.length,byLv:{},dupW:[],badFields:[],sameSpelling:[]};
      const seen={};
      MINPAIR_BANK.forEach(function(x){
        out.byLv[x.lv]=(out.byLv[x.lv]||0)+1;
        const k=x.w.slice().sort().join('/');
        if(seen[k])out.dupW.push(k); else seen[k]=1;
        if(!x.sk||!x.ph||x.ph.length!==2||!x.m||x.m.length!==2||!x.s||x.s.length!==2)out.badFields.push(x.id);
        if(x.w[0]===x.w[1])out.sameSpelling.push(x.id);
        // الجملة الشارحة يجب أن تحوي كلمتها بحدود الكلمة
        [0,1].forEach(function(i){
          const re=new RegExp('\\b'+x.w[i].replace(/[.*+?^${}()|[\]\\]/g,'\\$&')+'\\b','i');
          if(!re.test(x.s[i]))out.badFields.push(x.id+':s'+i);
        });
      });
      out.skills=Object.keys(MINPAIR_BANK.reduce(function(a,x){a[x.sk]=1;return a},{})).length;
      return out;
    });
    ok(r.total===60,'ستّون زوجاً لا ثلاثون — '+r.total);
    ok(r.byLv.A1===20&&r.byLv.A2===20&&r.byLv.B1===20,'عشرون لكل مستوى — '+JSON.stringify(r.byLv));
    ok(r.dupW.length===0,'لا زوجَ مكرّر — '+r.dupW.join(','));
    ok(r.badFields.length===0,'كل زوجٍ كامل الحقول وجملته تحوي كلمتها — '+r.badFields.join(','));
    ok(r.sameSpelling.length===0,'لا زوجَ بإملاءٍ واحد (يستحيل اختياره بصرياً)');
    ok(r.skills>=6,'تصنيفاتٌ صوتية متعدّدة — '+r.skills);
    await page.close();
  }
  {
    // جلسةٌ واحدة لم تعد تستنفد البنك
    const page=await mk(browser,'?p=elias');
    const r=await page.evaluate(()=>{
      const pool=minpairBankFor('A2').length;
      return{pool:pool,session:MINPAIR_N,ratio:+(pool/MINPAIR_N).toFixed(1)};
    });
    ok(r.pool===20,'بنك المستوى عشرون — '+r.pool);
    ok(r.ratio>=2.5,'يكفي أكثر من جلستين قبل التكرار — '+r.ratio+' جلسة');
    await page.close();
  }

  // ===== ٥) السعة الكلّية =====
  console.log('\n٥) السعة الكلّية');
  {
    const page=await mk(browser,'?p=elias');
    const r=await page.evaluate(()=>{
      const B={listen:LISTEN_BANK,read:READ_BANK,gram:GRAM_BANK,step:STEP_BANK,
               minpair:MINPAIR_BANK,video:VIDEO_BANK,write:WRITE_BANK};
      const GEN={listen:1,read:1,gram:1,step:1,video:1,write:1,minpair:0};
      let ceiling=0;
      Object.keys(B).forEach(function(d){
        const authored=B[d].filter(x=>x.lv==='A2').length;
        ceiling+=Math.max(authored,GEN[d]?GEN_BANK_MAX:authored);
      });
      const perPass=LISTEN_N+READ_N+GRAM_N+STEP_N+MINPAIR_N+VIDEO_N+WRITE_N;
      return{ceiling:ceiling,perPass:perPass,passes:+(ceiling/perPass).toFixed(1)};
    });
    ok(r.ceiling>=480,'سقف المتاح لمستوى A2 — '+r.ceiling+' عنصراً (كان ١٤٧)');
    ok(r.passes>=10,'دوراتٌ كاملة قبل استنفاد المتاح — '+r.passes+' (كان ٣٫٤)');
    console.log('    (دورة كاملة = '+r.perPass+' عنصراً · ٧٫٣ دقيقة بالزمن المقاس)');
    await page.close();
  }

  // ===== ٦) لا انحدار =====
  console.log('\n٦) لا انحدار');
  for(const q of ['','?p=mohammed','?p=elias']){
    const page=await mk(browser,q);
    await page.evaluate(()=>render());
    const r=await page.evaluate(()=>({missing:censusMissing(),modes:document.querySelectorAll('.mode').length}));
    ok(r.missing.length===0,(q||'هيا')+': لا دالّة مفقودة — '+r.missing.join(','));
    ok(r.modes>0,(q||'هيا')+': الصفحة تُرسم');
    await page.close();
  }

  await browser.close();
  console.log(fails?`\n=== ${fails} فشل ===`:'\n=== كل الاختبارات نجحت ===');
  process.exit(fails?1:0);
})();
