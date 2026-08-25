// اختبار الأعطال الخمسة التي كشفها فحص جلسات ٢٥ أغسطس:
// ١) تقييم Azure للجمل لا للكلمات وحدها   ٢) ENG_BUILD بلا طبقة A1 وبوسومٍ تناقض CEFR
// ٣) STEP خارج بوّابة التسرّع              ٤) gram/step يُسجّلان ترتيب البنك لا العرض
// ٥) البنوك المولَّدة القديمة تبقى أجنبيّة الأسماء بعد نشر قيود الثقافة
const {chromium}=require('/opt/node22/lib/node_modules/playwright');
let fails=0;const ok=(c,m)=>{console.log((c?'  ✓ ':'  ✗ FAIL ')+m);if(!c)fails++};
(async()=>{
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'});
const mk=async(who)=>{
  const logs=[];
  const page=await b.newPage({viewport:{width:420,height:900}});
  page.on('pageerror',e=>{console.log('  ✗ PAGEERROR '+e.message);fails++});
  await page.route('**/rest/v1/**',async r=>{
    let body={};try{body=JSON.parse(r.request().postData()||'{}')}catch(e){}
    logs.push(body);r.fulfill({status:201,contentType:'application/json',body:'[]'});
  });
  await page.route('**/functions/v1/**',async r=>
    r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({ok:false,error:"off"})}));
  await page.addInitScript(()=>{
    Object.defineProperty(window,'speechSynthesis',{configurable:true,value:{speak(){},cancel(){},resume(){},pause(){},getVoices:()=>[{lang:'en-US',name:'X'}],speaking:false,pending:false}});
    window.SpeechSynthesisUtterance=function(t){this.text=t};
  });
  await page.goto('http://127.0.0.1:8931/index.html'+(who?'?p='+who:''));
  await page.waitForFunction(()=>typeof engBuildFor==='function');
  page._logs=logs;return page;
};

console.log('\n١) ENG_BUILD: طبقة A1 موجودة، والوسم لا يناقض درجة الدرس');
{
  const p=await mk();
  const r=await p.evaluate(()=>{
    const eff=x=>engBuildLv(x);
    return{
      total:ENG_BUILD.length,
      a1tier:ENG_BUILD.filter(x=>eff(x)==='A1').length,
      a1sees:engBuildFor('A1').length,
      a1seesB1:engBuildFor('A1').filter(x=>eff(x)==='B1').map(x=>x.id),
      a1seesB2:engBuildFor('A1').filter(x=>eff(x)==='B2').map(x=>x.id),
      a2sees:engBuildFor('A2').length,
      passLv:eff(ENG_BUILD.find(x=>x.id==='b_pass')),
      condLv:eff(ENG_BUILD.find(x=>x.id==='b_cond')),
      ppaLv:eff(ENG_BUILD.find(x=>x.id==='b_ppa')),
      // وسمٌ خاطئٌ يُضاف غداً يجب ألّا يسرّب: الدالّة تأخذ الأعلى بين الوسم والدرس
      synthetic:engBuildLv({lv:'A1',lesson:'l_passive'}),
    };
  });
  ok(r.a1tier>=8,'طبقة A1 فيها عناصر فعلاً — '+r.a1tier);
  ok(r.a1seesB1.length===0,'A1 لا ترى B1 إطلاقاً — '+(r.a1seesB1.join(',')||'نظيف'));
  ok(r.a1seesB2.length===0,'A1 لا ترى B2 إطلاقاً');
  ok(r.a1sees>0&&r.a1sees<r.total,'A1 ترى بعض البنك لا كلَّه — '+r.a1sees+' من '+r.total);
  ok(r.passLv==='B1'&&r.condLv==='B1'&&r.ppaLv==='B1',
     'الثلاثة التي عُرضت على هيا اليوم صارت B1 — '+[r.passLv,r.condLv,r.ppaLv].join('/'));
  ok(r.synthetic==='B1','وسمٌ خاطئ (A1 لدرسٍ B1) يُرفَع إلى درجة الدرس — '+r.synthetic);
  ok(r.a2sees>=r.a1sees,'A2 ترى ما تراه A1 وزيادة');
  await p.close();
}

console.log('\n٢) بوّابة التسرّع تشمل STEP بأنواعه الثلاثة');
{
  const p=await mk();
  const r=await p.evaluate(()=>{
    const out={};
    ['step:pick','step:gap','step:order'].forEach(k=>{
      out[k]={floor:SEC_GATE_FLOOR[k],cap:SEC_GATE_MAX[k]};
    });
    // الأرضيّة تُطبَّق فعلاً حين تُستدعى بمفتاح النوع
    secGateStart('step','The party is on Friday. The party is in Friday. The party at Friday. The party on Friday.','step:pick');
    out.pickSecs=gateSecs;out.pickOpen=gateOpen();out.kind=gateKind;
    secGateStart('step','a','step:gap');out.gapSecs=gateSecs;
    secGateStart('step','x','step:nope');out.unknownSecs=gateSecs;
    return out;
  });
  ok(r['step:pick'].floor>0&&r['step:gap'].floor>0&&r['step:order'].floor>0,'للأنواع الثلاثة أرضيّات');
  ok(r.pickSecs>0&&!r.pickOpen,'بوّابة pick تُسلَّح فعلاً — '+r.pickSecs+'ث');
  ok(r.pickSecs<=r['step:pick'].cap,'لا تتجاوز سقفها المقاس — '+r.pickSecs+'≤'+r['step:pick'].cap);
  ok(r.gapSecs>0&&r.gapSecs<=r['step:gap'].cap,'بوّابة gap أقصر من pick — '+r.gapSecs);
  ok(r.kind==='step','اسم القسم يبقى step فيصحّ نصّ الشريط — '+r.kind);
  ok(r.unknownSecs===0,'نوعٌ غير معروف لا يُسلِّح بوّابةً بالغلط');
  await p.close();
}

console.log('\n٣) STEP: لا نقر قبل انفتاح البوّابة، والموضع المعروض يُسجَّل');
{
  const p=await mk('mohammed');
  await p.evaluate(()=>{startStep()});
  await p.waitForFunction(()=>mode==='step');
  // نُثبّت عنصر اختيارٍ لا ترتيب حتى يكون للاختبار موضعٌ يُقاس
  const armed=await p.evaluate(()=>{
    const it=stepItems.find(x=>x.type!=='order');
    if(!it)return null;
    stepItems=[it];stepIdx=0;stepScore=0;stepDone=false;
    stepSetupRound();render();
    return{secs:gateSecs,open:gateOpen(),type:it.type};
  });
  ok(armed&&armed.secs>0,'البوّابة مسلَّحة عند بدء العنصر — '+(armed&&armed.secs)+'ث');
  const blocked=await p.evaluate(()=>{
    const before=stepLocked;stepChoose(0);return{before,after:stepLocked};
  });
  ok(blocked.after===false,'النقر قبل الانفتاح لا يقفل العنصر ولا يحرقه');
  const nlog0=(await p.evaluate(()=>0))+p._logs.length;
  ok(p._logs.filter(x=>x&&x.domain==='step').length===0,'ولا يُسجَّل شيء قبل الانفتاح');
  // نفتحها كما يفتحها مرور الزمن
  await p.evaluate(()=>{gateLeft=0;gateStop();render()});
  const picked=await p.evaluate(()=>{
    const it=stepCur(),bankIdx=it.c.findIndex(x=>x.ok);
    stepChoose(bankIdx);
    return{bankIdx,shownPos:stepOrder.indexOf(bankIdx)+1,locked:stepLocked};
  });
  ok(picked.locked===true,'وبعد الانفتاح يُقبل النقر');
  await p.waitForTimeout(300);
  const row=p._logs.filter(x=>x&&x.domain==='step').pop();
  ok(!!row,'وصل سطرٌ للخادم');
  ok(!!row&&/موضع/.test(row.response||''),'الإجابة تحمل الموضع المعروض — '+(row&&row.response||'').slice(0,40));
  ok(!!row&&row.response.indexOf('موضع '+['','١','٢','٣','٤'][picked.shownPos])===0,
     'والموضع هو المعروض فعلاً لا موضع البنك — المعروض '+picked.shownPos+' والبنك '+(picked.bankIdx+1));
  await p.close();
}

console.log('\n٤) gram: الخيارات تُسجَّل بترتيب العرض');
{
  const p=await mk('elias');
  await p.evaluate(()=>{startGram()});
  await p.waitForFunction(()=>mode==='gram');
  await p.evaluate(()=>{gateLeft=0;gateStop();render()});
  const picked=await p.evaluate(()=>{
    const it=gramCur(),bankIdx=it.c.findIndex(x=>x.ok);
    gramChoose(bankIdx);
    return{bankIdx,shownPos:gramOrder.indexOf(bankIdx)+1,
           shownFirst:it.c[gramOrder[0]].t};
  });
  await p.waitForTimeout(300);
  const row=p._logs.filter(x=>x&&x.domain==='gram').pop();
  ok(!!row,'وصل سطرٌ للخادم');
  ok(!!row&&/موضع/.test(row.response||''),'الإجابة تحمل الموضع — '+(row&&row.response||'').slice(0,30));
  ok(!!row&&row.q_text.indexOf('1) '+picked.shownFirst)===0,
     'وأوّل خيارٍ في السطر هو أوّل خيارٍ معروض');
  await p.close();
}

console.log('\n٥) البنوك المولَّدة هُجرت بمفاتيح جديدة');
{
  const p=await mk();
  const r=await p.evaluate(()=>({
    listen:GEN_BANK_KEY_LISTEN,read:GEN_BANK_KEY_READ,write:GEN_BANK_KEY_WRITE,
    gram:GEN_BANK_KEY_GRAM,step:GEN_BANK_KEY_STEP,video:GEN_BANK_KEY_VIDEO,
    minpair:MINPAIR_EXTRA_KEY,
  }));
  const keys=Object.keys(r);
  keys.forEach(k=>ok(/_v[2-9]$/.test(r[k]),'مفتاح '+k+' مرفوع — '+r[k]));
  ok(new Set(Object.values(r)).size===keys.length,'ولا مفتاحين متطابقين');
  // الأهمّ: المفاتيح القديمة لا تُقرأ بعد اليوم
  const stale=await p.evaluate(()=>{
    localStorage.setItem('mawhiba_listen_aibank_v3',JSON.stringify(
      [{id:'ai_old',lv:'A2',audio:"Leo went to the library at three o'clock.",q:'When?',c:['a','b','c'],a:0}]));
    return listenBankFor('A2').filter(x=>/Leo/.test(x.audio||'')).length;
  });
  ok(stale===0,'وعنصرٌ قديم بالمفتاح السابق لا يعود للظهور — '+stale);
  await p.close();
}

console.log('\n٦) النطق: الجملة تمرّ على Azure كما تمرّ الكلمة');
{
  const p=await mk();
  const r=await p.evaluate(()=>{
    const src=String(speakFinish);
    return{callsAzure:/azureTry\s*\(/.test(src),
           tapInStart:/wavTapStart\s*\(\s*speakStream/.test(String(speakStart)),
           stopsBeforeRead:src.indexOf('wavTapStop')<src.indexOf('azureTry'),
           logsEngine:/engine:"azure"/.test(src),
           fallbackMarked:/engine:"groq"/.test(src),
           failRecorded:/azure_fail:/.test(src)};
  });
  ok(r.tapInStart,'مأخذ WAV يبدأ مع تسجيل الجملة');
  ok(r.callsAzure,'وspeakFinish ينادي azureTry');
  ok(r.stopsBeforeRead,'ويُوقَف المأخذ قبل قراءة المخزون لا بعدها');
  ok(r.logsEngine,'ويُسجَّل engine=azure عند النجاح');
  ok(r.fallbackMarked&&r.failRecorded,'وسببُ السقوط يُسجَّل عند الرجوع إلى Groq');
  await p.close();
}

console.log('\n٧) وسلوكاً لا نصّاً: ردٌّ حقيقي من assess-azure يُنتج سطراً بالفونيمات');
{
  const logs=[];
  const page=await b.newPage({viewport:{width:420,height:900}});
  page.on('pageerror',e=>{console.log('  ✗ PAGEERROR '+e.message);fails++});
  await page.route('**/rest/v1/**',async r=>{
    let body={};try{body=JSON.parse(r.request().postData()||'{}')}catch(e){}
    logs.push(body);r.fulfill({status:201,contentType:'application/json',body:'[]'});
  });
  let azureHits=0,groqHits=0;
  // الترتيب مقصود: playwright يُقدّم آخرَ مسارٍ مُسجَّل، فالعامّ أوّلاً والخاصّ بعده
  await page.route('**/functions/v1/**',async r=>{groqHits++;
    r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({ok:false,error:'off'})})});
  await page.route('**/functions/v1/assess-azure',async r=>{
    azureHits++;
    let x={};try{x=JSON.parse(r.request().postData()||'{}')}catch(e){}
    const ws=String(x.referenceText||'').replace(/[^A-Za-z' ]/g,' ').trim().split(/\s+/);
    r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({
      ok:true,engine:'azure',heard:x.referenceText,lexical:x.referenceText,
      pron:84,accuracy:86,fluency:81,completeness:100,snr:31,
      words:ws.map((w,i)=>({w,score:i===0?42:90,err:'None',phonemes:[{p:'p',score:i===0?38:92}]})),
      weak:[{w:ws[0],p:'p',score:38}],
    })});
  });
  await page.addInitScript(()=>{
    Object.defineProperty(window,'speechSynthesis',{configurable:true,value:{speak(){},cancel(){},resume(){},pause(){},getVoices:()=>[{lang:'en-US',name:'X'}],speaking:false,pending:false}});
    window.SpeechSynthesisUtterance=function(t){this.text=t};
  });
  await page.goto('http://127.0.0.1:8931/index.html');
  await page.waitForFunction(()=>typeof startSpeaking==='function');
  const r2=await page.evaluate(async()=>{
    // مخزون WAV مزيَّف: الاختبار يقيس المسار لا ترميز الصوت
    window.wavBlob=()=>new Blob([new Uint8Array(4096)],{type:'audio/wav'});
    startSpeaking();
    const it=speakCur();
    speakElapsed=3;speakChunks=[];speakStream=null;
    await speakFinish();
    return{target:it.en,engine:speakResult&&speakResult.engine,pct:speakResult&&speakResult.sc&&speakResult.sc.pct};
  });
  await page.waitForTimeout(400);
  const row=logs.filter(x=>x&&x.domain==='speaking').pop();
  ok(azureHits>0,'نودي assess-azure فعلاً — '+azureHits);
  ok(r2.engine==='azure','والنتيجة المعروضة من Azure — '+r2.engine);
  ok(!!row&&row.engine==='azure','والسطر المسجَّل engine=azure');
  ok(!!row&&row.accuracy_pct===86&&row.completeness_pct===100,
     'وحقول الفونيمات وصلت — دقّة '+(row&&row.accuracy_pct)+' واكتمال '+(row&&row.completeness_pct));
  ok(!!row&&/p:38/.test(row.weak_phonemes||''),'وأضعف صوتٍ مسجَّل — '+(row&&row.weak_phonemes));
  ok(!!row&&/الحَكَم azure/.test(row.q_text||''),'والسطر يقول من حكم — '+(row&&(row.q_text||'').slice(-24)));
  ok(!!row&&/✗/.test(row.q_text||'')&&/✓/.test(row.q_text||''),'وحكم كل كلمة محفوظ كما في مسار Groq');
  await page.close();
}

await b.close();
console.log(fails?('\n✗ '+fails+' فشل'):'\n✓ الكل نجح');
process.exit(fails?1:0);
})();
