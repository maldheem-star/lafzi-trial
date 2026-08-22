// بوّابة التسرّع في أقسام الإنجليزية الخمسة — ٢٢ أغسطس
// بيانات هيا اليوم: قراءة ٠٫٨ث/٢٥٪، قواعد ٠٫٩ث/٢٠٪، استماع ١٫٧ث/٣٨٪ — أي التخمين
// العشوائي بالضبط. فوُصلت البوّابة البنيوية القائمة (التي رفعت الفهم المقروء ١/٣ ⇒ ٣/٣).
const {chromium}=require('/opt/node22/lib/node_modules/playwright');
const BASE='http://localhost:8931/index.html';
let fails=0;
function ok(c,m){console.log((c?'  ✓ ':'  ✗ FAIL ')+m);if(!c)fails++}
async function mk(browser,q){
  const page=await browser.newPage();
  page.on('pageerror',e=>{console.log('  ! pageerror:',e.message);fails++});
  await page.route('**/functions/v1/tutor',r=>r.fulfill({status:200,contentType:'application/json',body:'{}'}));
  await page.route('**/rest/v1/**',r=>r.fulfill({status:201,contentType:'application/json',body:'[]'}));
  await page.goto(BASE+(q||''),{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>typeof window.render==='function',{timeout:15000});
  await page.evaluate(()=>localStorage.clear());
  return page;
}

(async()=>{
  const browser=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'});

  // ===== ١) الأرضيّات مشتقّة من الزمن المقاس =====
  console.log('\n١) أرضيّات البوّابة');
  {
    const page=await mk(browser);
    const r=await page.evaluate(()=>({
      floors:SEC_GATE_FLOOR,
      caps:SEC_GATE_MAX,
      // الزمن الوسيط المقاس تاريخياً لكل قسم — الأرضيّة نصفه تقريباً
      medians:{listen:4.8,read:8.7,gram:7.8,minpair:2.2,video:10.5},
    }));
    ['listen','read','gram','minpair','video'].forEach(function(d){
      const f=r.floors[d],m=r.medians[d];
      ok(f>0,d+': له أرضيّة — '+f+'ث');
      ok(f<m,d+': الأرضيّة دون الزمن المقاس فلا تُعاقب سرعةً صادقة ('+f+' < '+m+')');
      ok(f>=2,d+': وفوق زمن النقر (٠٫٥-٢ث) — '+f);
      ok(r.caps[d]<=Math.ceil(m),d+': والسقف لا يتجاوز زمنها المقاس — '+r.caps[d]+' ≤ '+m);
    });
    await page.close();
  }
  {
    const page=await mk(browser);
    const r=await page.evaluate(()=>{
      const out={};
      secGateStart('read','');out.shortFloor=gateSecs;
      secGateStart('read',new Array(200).fill('word').join(' '));out.longByLen=gateSecs;
      secGateStart('read',new Array(5000).fill('word').join(' '));out.capped=gateSecs;
      secGateStart('nosuch','x');out.unknown=gateSecs;
      return out;
    });
    ok(r.shortFloor===5,'نصٌّ فارغ ⇒ الأرضيّة وحدها — '+r.shortFloor);
    ok(r.longByLen>5,'نصٌّ طويل ⇒ زمنٌ أطول محسوبٌ بالطول — '+r.longByLen);
    ok(r.capped<=9,'ولا يتجاوز سقف القسم المقاس (٩ث للقراءة) — '+r.capped);
    ok(r.unknown===0,'قسمٌ بلا أرضيّة ⇒ بلا بوّابة (لا يُعطَّل ما لا يخصّه)');
    await page.close();
  }

  // ===== ٢) البوّابة تمنع النقر فعلاً =====
  console.log('\n٢) المنع الفعلي — نقرةٌ سريعة');
  for(const [dom,start] of [['listen','startListen'],['read','startRead'],['gram','startGram'],
                            ['minpair','startMinpair']]){
    const page=await mk(browser,'?p=elias');
    await page.evaluate(s=>window[s](),start);
    await page.waitForTimeout(150);
    const before=await page.evaluate(()=>({open:gateOpen(),secs:gateSecs,left:gateLeft}));
    // نقرةٌ فورية على أوّل خيار
    await page.evaluate(()=>{const b=document.querySelectorAll('.choice');if(b.length)b[0].click()});
    await page.waitForTimeout(100);
    const after=await page.evaluate(d=>({
      locked:({listen:()=>listenLocked,read:()=>readLocked,gram:()=>gramLocked,
               minpair:()=>minpairLocked})[d](),
      disabled:!!document.querySelector('.choice[disabled]'),
      bar:app.innerHTML.indexOf('الخيارات ستظهر بعد')>=0,
    }),dom);
    ok(before.secs>0&&!before.open,dom+': البوّابة مسلَّحة عند العرض — '+before.secs+'ث');
    ok(after.locked===false,dom+': النقرة السريعة لا تُحتسب إجابة');
    ok(after.disabled,dom+': الأزرار معطَّلة بصرياً');
    ok(after.bar,dom+': وشريط العدّ ظاهر');
    await page.close();
  }

  // ===== ٣) وتنفتح بعد انقضاء الزمن =====
  console.log('\n٣) الانفتاح بعد الزمن');
  {
    const page=await mk(browser,'?p=elias');
    await page.evaluate(()=>startGram());
    await page.waitForTimeout(150);
    const armed=await page.evaluate(()=>gateSecs);
    // نُنهي العدّ برمجياً كما ينتهي بمرور الوقت (لا تخطٍّ: نفس ما يفعله المؤقّت)
    await page.evaluate(()=>{gateLeft=0;gateStop();render()});
    const opened=await page.evaluate(()=>({open:gateOpen(),disabled:!!document.querySelector('.choice[disabled]')}));
    await page.evaluate(()=>{const b=document.querySelectorAll('.choice');if(b.length)b[0].click()});
    await page.waitForTimeout(80);
    const done=await page.evaluate(()=>({locked:gramLocked}));
    ok(armed>0,'كانت مسلَّحة — '+armed+'ث');
    ok(opened.open&&!opened.disabled,'وتنفتح بانقضاء الزمن، والأزرار تعود');
    ok(done.locked===true,'والنقرة بعدها تُحتسب إجابة');
    await page.close();
  }
  {
    // الفيديو: البوّابة عند السؤال لا عند المشاهد — المشاهد تُشاهَد أولاً
    const page=await mk(browser,'?p=elias');
    await page.evaluate(()=>startVideo());
    await page.waitForTimeout(150);
    const atScenes=await page.evaluate(()=>({qOn:videoQOn,secs:gateSecs}));
    await page.evaluate(()=>{const it=videoCur();while(!videoQOn)videoNextScene()});
    await page.waitForTimeout(80);
    const atQ=await page.evaluate(()=>({qOn:videoQOn,secs:gateSecs,open:gateOpen()}));
    await page.evaluate(()=>{const b=document.querySelectorAll('.choice');if(b.length)b[0].click()});
    await page.waitForTimeout(80);
    ok(atScenes.qOn===false,'المشاهد تُعرض قبل السؤال');
    ok(atQ.qOn===true&&atQ.secs>0&&!atQ.open,'والبوّابة تُسلَّح عند ظهور السؤال — '+atQ.secs+'ث');
    ok(await page.evaluate(()=>videoLocked)===false,'فالنقرة الفورية على السؤال لا تُحتسب');
    await page.close();
  }

  // ===== ٤) لا تكسر الجلسة الكاملة =====
  console.log('\n٤) جلسةٌ كاملة تُنهى بلا عطل');
  {
    const page=await mk(browser,'?p=elias');
    await page.evaluate(()=>startGram());
    await page.waitForTimeout(120);
    const total=await page.evaluate(()=>gramItems.length);
    for(let i=0;i<total;i++){
      await page.evaluate(()=>{gateLeft=0;gateStop();render()});   // كما لو انقضى الزمن
      await page.evaluate(()=>{const b=document.querySelectorAll('.choice');if(b.length)b[0].click()});
      await page.waitForTimeout(60);
      await page.evaluate(()=>{if(!gramDone)gramNext()});
      await page.waitForTimeout(60);
    }
    const end=await page.evaluate(()=>({done:gramDone,html:app.innerHTML.length}));
    ok(end.done===true,'الجلسة تنتهي طبيعياً ('+total+' عنصراً)');
    ok(end.html>200,'وشاشة النتيجة تُرسم');
    await page.close();
  }

  // ===== ٥) لا انحدار =====
  console.log('\n٥) لا انحدار');
  for(const q of ['','?p=mohammed','?p=elias']){
    const page=await mk(browser,q);
    await page.evaluate(()=>render());
    const r=await page.evaluate(()=>({missing:censusMissing(),modes:document.querySelectorAll('.mode').length}));
    ok(r.missing.length===0,(q||'هيا')+': لا دالّة مفقودة — '+r.missing.join(','));
    ok(r.modes>0,(q||'هيا')+': الصفحة تُرسم');
    await page.close();
  }
  {
    // بوّابة الاختبارات القائمة (موهبة) لم تتأثّر
    const page=await mk(browser);
    const r=await page.evaluate(()=>({
      f1:gateSecondsFor({q:new Array(60).fill('كلمة').join(' '),qtype:'reading'}),
      f2:gateSecondsFor({q:'قصير',qtype:'vocab'}),
    }));
    ok(r.f1>=8,'بوّابة موهبة القائمة كما هي — نصٌّ طويل '+r.f1+'ث');
    ok(r.f2===0,'وسؤالٌ قصير بلا بوّابة كما كان');
    await page.close();
  }

  await browser.close();
  console.log(fails?`\n=== ${fails} فشل ===`:'\n=== كل الاختبارات نجحت ===');
  process.exit(fails?1:0);
})();
