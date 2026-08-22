// الحلّ الجذري: الإتقان بالمهارة لا بالنوع — ٢١ أغسطس
// وُسم كل عنصرٍ في البنوك الستّة بمهارته الحقيقية (sk)، وSTEP بـtag القائم أصلاً،
// فصار BKT يتتبّع «المضارع التامّ» لا «قواعد A2».
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

  // ===== ١) كل عنصر موسوم =====
  console.log('\n١) وسمُ البنوك');
  {
    const page=await mk(browser);
    const r=await page.evaluate(()=>{
      const banks={GRAM_BANK:GRAM_BANK,MINPAIR_BANK:MINPAIR_BANK,LISTEN_BANK:LISTEN_BANK,
        READ_BANK:READ_BANK,VIDEO_BANK:VIDEO_BANK,WRITE_BANK:WRITE_BANK};
      const out={};
      Object.keys(banks).forEach(function(k){
        const b=banks[k];
        out[k]={n:b.length,tagged:b.filter(x=>x.sk).length,
          bad:b.filter(x=>x.sk&&(typeof x.sk!=='string'||!x.sk.trim())).length};
      });
      out.STEP={n:STEP_BANK.length,tagged:STEP_BANK.filter(x=>x.tag).length};
      // كل المهارات الفريدة عبر البنوك
      const sk={};Object.keys(banks).forEach(k=>banks[k].forEach(x=>{if(x.sk)sk[x.sk]=(sk[x.sk]||0)+1}));
      out.skills=Object.keys(sk).length;
      out.singleton=Object.keys(sk).filter(k=>sk[k]===1).length;
      return out;
    });
    ['GRAM_BANK','MINPAIR_BANK','LISTEN_BANK','READ_BANK','VIDEO_BANK','WRITE_BANK'].forEach(function(k){
      ok(r[k].tagged===r[k].n,k+': كل عناصره موسومة — '+r[k].tagged+'/'+r[k].n);
      ok(r[k].bad===0,k+': لا وسمَ فارغ');
    });
    ok(r.STEP.tagged===r.STEP.n,'STEP موسومٌ أصلاً بـtag — '+r.STEP.tagged+'/'+r.STEP.n);
    ok(r.skills>=25,'مهاراتٌ فريدة كثيرة لا مهارةٌ واحدة خشنة — '+r.skills);
    console.log('    (مهاراتٌ لها عنصرٌ واحد فقط: '+r.singleton+')');
    await page.close();
  }

  // ===== ٢) skOf =====
  console.log('\n٢) skOf — من أين تُقرأ المهارة');
  {
    const page=await mk(browser);
    const r=await page.evaluate(()=>({
      sk:skOf({sk:'المضارع التامّ'}),
      tag:skOf({tag:'ترتيب الكلمات'}),
      prefersSk:skOf({sk:'أ',tag:'ب'}),
      ai:skOf({ai:true,lv:'A2'}),
      aiLvArg:skOf({ai:true},'B1'),
      none:skOf({id:'x'}),
      nul:skOf(null),
      realGram:skOf(GRAM_BANK.filter(x=>x.id==='gr_b1_1')[0]),
      realStep:skOf(STEP_BANK[0]),
      realMin:skOf(MINPAIR_BANK.filter(x=>x.id==='mp_b1_4')[0]),
    }));
    ok(r.sk==='المضارع التامّ','sk تُقرأ أولاً');
    ok(r.tag==='ترتيب الكلمات','tag يُعاد استعماله لـSTEP بلا وسمٍ ثانٍ');
    ok(r.prefersSk==='أ','sk تسبق tag عند وجودهما');
    ok(r.ai==='مولَّد · A2','المولَّد بلا وسمٍ يُنسَب صراحةً لا يُخلَط');
    ok(r.aiLvArg==='مولَّد · B1','ويأخذ المستوى من الوسيط عند غيابه');
    ok(r.none===null&&r.nul===null,'بلا وسمٍ ولا عنصر ⇒ null لا خطأ');
    ok(r.realGram==='المضارع التامّ','عنصرٌ حقيقي: gr_b1_1 ⇐ '+r.realGram);
    ok(!!r.realStep,'وSTEP يعطي وسمه — '+r.realStep);
    ok(r.realMin==='نبر الكلمة','وminpair يفرّق نوع التقابل — '+r.realMin);
    await page.close();
  }

  // ===== ٣) BKT صار بالمهارة =====
  console.log('\n٣) BKT بالمهارة لا بالنوع');
  {
    const page=await mk(browser);
    const r=await page.evaluate(()=>{
      localStorage.clear();
      // مهارتان مختلفتان داخل نفس القسم ونفس النوع: كانتا تختلطان قبل الإصلاح
      logAnswer('gram','sentence',true,'x','gr_b1_1',10,{_sk:'المضارع التامّ'});
      logAnswer('gram','sentence',false,'y','gr_b1_2',10,{_sk:'المبني للمجهول'});
      const st=bktLoad();
      return{keys:Object.keys(st),
        pp:bktOf('gram','المضارع التامّ'),
        pas:bktOf('gram','المبني للمجهول'),
        oldKey:bktOf('gram','sentence')};
    });
    ok(r.keys.length===2,'مهارتان ⇒ سجلّان منفصلان — '+r.keys.join(' | '));
    ok(r.pp&&r.pp.p>0.2,'«المضارع التامّ» ارتفع بالإصابة');
    ok(r.pas&&r.pas.p<0.2,'و«المبني للمجهول» انخفض بالخطأ — مستقلّان');
    ok(r.oldKey===null,'لم يعد يُسجَّل تحت النوع الخشن (gram:sentence)');

    // بلا _sk يبقى الاحتياط بالنوع — لا انكسار للأقسام غير الموسومة
    const fb=await page.evaluate(()=>{
      localStorage.clear();
      logAnswer('listen','A2',true,'x','ls_x',10,{});
      return Object.keys(bktLoad());
    });
    ok(fb.length===1&&fb[0]==='listen:A2','بلا وسم: الاحتياط بالنوع كما كان');
    await page.close();
  }

  // ===== ٤) جلسةٌ حقيقية تُسجّل المهارة =====
  console.log('\n٤) جلسةٌ حقيقية');
  {
    const page=await mk(browser,'?p=elias');
    await page.route('**/functions/v1/tutor',r=>r.fulfill({status:200,contentType:'application/json',body:'{}'}));
    const posted=[];
    await page.route('**/rest/v1/mawhiba_answer_log**',r=>{
      try{posted.push(JSON.parse(r.request().postData()||'{}'))}catch(e){}
      r.fulfill({status:201,body:''});
    });
    await page.evaluate(()=>startGram());
    for(let i=0;i<5;i++){
      await page.evaluate(()=>{const b=document.querySelectorAll('.choice');if(b.length)b[0].click()});
      await page.waitForTimeout(40);
      await page.evaluate(()=>{if(typeof gramNext==='function'&&!gramDone)gramNext()});
      await page.waitForTimeout(40);
    }
    const r=await page.evaluate(()=>({keys:Object.keys(bktLoad())}));
    ok(posted.length>0,'سطورٌ أُرسلت — '+posted.length);
    ok(posted.every(x=>!('_sk' in x)),'المفاتيح المحلّية (_) لا تُرسَل إلى الجدول');
    ok(r.keys.length>1,'جلسةٌ واحدة تُنتج مهاراتٍ متعدّدة لا مهارةً واحدة — '+r.keys.length);
    ok(r.keys.every(k=>k.indexOf('gram:')===0&&k!=='gram:sentence'),'كلّها بمهارةٍ حقيقية — '+r.keys.join(' | '));
    await page.close();
  }

  // ===== ٥) المولَّد يحمل وسم الخادم =====
  console.log('\n٥) العنصر المولَّد');
  {
    const page=await mk(browser,'?p=elias');
    const r=await page.evaluate(()=>{
      const good=parseGenBlock(
        "TAG: سببٌ وعلاقة\nTEXT: Sam missed the bus because he woke up late.\nQ: Why did Sam miss the bus?\n"+
        "A: He woke up late.\nB: The bus broke down.\nC: He walked instead.\nCORRECT: A","read","A2");
      const badTag=parseGenBlock(
        "TAG: شيءٌ غير معروف\nTEXT: The shop opens at nine.\nQ: When does it open?\n"+
        "A: At nine.\nB: At ten.\nC: At eight.\nCORRECT: A","read","A2");
      const noTag=parseGenBlock(
        "TEXT: The shop opens at nine.\nQ: When does it open?\n"+
        "A: At nine.\nB: At ten.\nC: At eight.\nCORRECT: A","read","A2");
      const vid=parseGenVideoBlock(
        "TAG: الفكرة الرئيسية\nTITLE: A Rainy Day\nSCENE1_EMOJI: 🌧\nSCENE1_TEXT: It rained all morning.\n"+
        "SCENE2_EMOJI: ☂\nSCENE2_TEXT: Sara took her umbrella.\nSCENE3_EMOJI: 🌈\nSCENE3_TEXT: Later the sun came out.\n"+
        "Q: What is the main idea?\nA: A rainy morning turned sunny.\nB: Sara lost her umbrella.\nC: It snowed.\nCORRECT: A");
      const gram=parseGenPickBlock(
        "TAG: حروف الزمن\nS1: The party is on Friday.\nS1_OK: yes\nS1_WHY: on مع أيام الأسبوع\n"+
        "S2: The party is in Friday.\nS2_OK: no\nS2_WHY: in للشهور لا الأيام\n"+
        "S3: The party is at Friday.\nS3_OK: no\nS3_WHY: at للساعات\n"+
        "S4: The party is by Friday.\nS4_OK: no\nS4_WHY: by تعني الموعد الأقصى","gram",false);
      return{good:good&&good.sk,badTag:badTag&&badTag.sk,noTag:noTag&&noTag.sk,
        vid:vid&&vid.sk,gram:gram&&gram.sk,
        skGood:good?skOf(good):null,skNoTag:noTag?skOf(noTag):null};
    });
    ok(r.good==='سببٌ وعلاقة','وسمٌ صحيح يُقبل — '+r.good);
    ok(r.badTag===null,'وسمٌ خارج التصنيف يُهمَل ولا يُخترَع بديل');
    ok(r.noTag===null,'بلا وسمٍ: null');
    ok(r.vid==='الفكرة الرئيسية','والفيديو كذلك — '+r.vid);
    ok(r.gram==='حروف الزمن','والقواعد بوسمٍ مفتوح — '+r.gram);
    ok(r.skGood==='سببٌ وعلاقة','skOf تُعيد وسم المولَّد الصحيح');
    ok(r.skNoTag&&r.skNoTag.indexOf('مولَّد')===0,'والمولَّد بلا وسمٍ يُنسَب صراحةً — '+r.skNoTag);
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
  {
    // لوحة القياس تعرض المهارة باسمها
    const page=await mk(browser,'?p=elias');
    await page.route('**/rest/v1/mawhiba_answer_log**',r=>r.abort());
    await page.evaluate(()=>{for(let i=0;i<8;i++)logAnswer('gram','sentence',true,'x','gr_b1_1',10,{_sk:'المضارع التامّ'})});
    await page.evaluate(async()=>{await loadKpi()});
    const h=await page.evaluate(()=>app.innerHTML);
    ok(h.indexOf('المضارع التامّ')>=0,'اللوحة تعرض اسم المهارة لا النوع');
    ok(h.indexOf('مُتقَن')>=0,'وتُعلن الإتقان عند بلوغه');
    await page.close();
  }

  await browser.close();
  console.log(fails?`\n=== ${fails} فشل ===`:'\n=== كل الاختبارات نجحت ===');
  process.exit(fails?1:0);
})();
