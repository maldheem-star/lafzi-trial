// شحنة ١٥ سبتمبر — سقفُ القراءة الجهرية، والتمدّد بلا سقفٍ عند درجة.
//
// ١) أوّل صفّ `read_aloud` حقيقي (إلياس، ١٥ سبتمبر) **بلغ السقف**: ١٦ كلمة ⇒ سقفٌ
//    ٢٠٠٠٠ ملّي بالضبط، وزمنُه ٢٠١٨٣ — وأضعفُ أصواته آخرُ صوتٍ في آخر كلمة.
// ٢) وأُمر بتمديد التمدّد «إلى الحدّ الأقصى» — بلا سقفٍ في العدد، وكلُّ درجةٍ مكسوبة.
//
// **وما يحرسه هذا الملفّ سلوكٌ لا ثوابت**: الحالةُ الحيّة بأرقامها، وقيدُ المزوّد
// المنشور (٣٠ث)، وأن درجةً لا تُفتح إلّا بأدلّةٍ جديدة — فلا ينكسر برقمٍ يتغيّر.
const {chromium}=require('/opt/node22/lib/node_modules/playwright');
let fails=0;const ok=(c,m)=>{console.log((c?'  ✓ ':'  ✗ FAIL ')+m);if(!c)fails++};

(async()=>{
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'});
const page=await b.newPage({viewport:{width:420,height:900}});
page.on('pageerror',e=>{console.log('  ✗ PAGEERROR '+e.message);fails++});
await page.goto('http://127.0.0.1:8931/index.html');
await page.waitForFunction(()=>typeof readAloudMaxMs==='function'&&typeof stretchDepth==='function');

console.log('\n١) الحالة الحيّة التي كشفت العطل: ١٦ كلمة لم تعد تُبتَر');
{
  const r=await page.evaluate(()=>{
    const s16="Her brother Misfer told her that the blue phone had the best camera for school projects.";
    return {w:s16.trim().split(/\s+/).length, cap:readAloudMaxMs(s16),
      old:Math.min(45000,Math.max(PRON_MAX_MS,Math.round(16*1.25*1000))), hard:RA_HARD_MS};
  });
  ok(r.w===16,`الجملة ١٦ كلمة كما في السجلّ (${r.w})`);
  ok(r.old===20000,`السقف القديم كان ٢٠٠٠٠ ملّي بالضبط — وزمنُه المسجَّل ٢٠١٨٣ فوقه`);
  ok(r.cap>=25000,`والسقف الجديد ${r.cap} ملّي — هامشٌ ≥٥ث فوق قراءته الحقيقية`);
  ok(r.cap>20183,'فلا تُبتَر القراءة نفسها لو أُعيدت اليوم');
}

console.log('\n٢) والسقف المطلق قيدُ المزوّد لا اختيارنا — ٣٠ث لتقييم النطق عند Azure');
{
  const r=await page.evaluate(()=>({hard:RA_HARD_MS,
    long:readAloudMaxMs(new Array(60).fill("word").join(" ")),
    floor:readAloudMaxMs("Go now.")}));
  ok(r.hard===30000,'RA_HARD_MS = ٣٠٠٠٠ (كان ٤٥٠٠٠ — أي فوق ما يقبله Azure أصلاً)');
  ok(r.long===30000,'وأطولُ هدفٍ لا يتجاوزه مهما طال');
  ok(r.floor>=15000,'وهدفٌ قصير يبقى على أرضيّة السقف المُجرَّب لا أقلّ');
}

console.log('\n٣) والنموذج عتبةٌ ومعدّل لا ضربٌ مجرّد — فكلفةُ الكلمة تهبط بالطول');
{
  const r=await page.evaluate(()=>{
    const per=w=>readAloudMaxMs(new Array(w).fill("x").join(" "))/w;
    return {w8:per(8),w13:per(13),w20:per(20)};
  });
  ok(r.w8>r.w13&&r.w13>r.w20,
    `الكلفة لكل كلمة تهبط بالطول كما قاسها السجلّ: ٨⇒${Math.round(r.w8)} · ١٣⇒${Math.round(r.w13)} · ٢٠⇒${Math.round(r.w20)}`);
}

console.log('\n٤) وهدفٌ فوق ميزانية أزور يُوسَم بالوتيرة المقاسة لا بوتيرة الأمان');
{
  const r=await page.evaluate(()=>({
    w16:readAloudOverBudget(new Array(16).fill("x").join(" ")),
    w21:readAloudOverBudget(new Array(21).fill("x").join(" ")),
    w30:readAloudOverBudget(new Array(30).fill("x").join(" ")),
    w0:readAloudOverBudget("")
  }));
  ok(r.w16===false,'ستّ عشرة كلمة **لا** تُوسَم — وقد قرأها إلياس فعلاً في ٢٠٫٢ث');
  ok(r.w21===false&&r.w30===true,'والوسم يبدأ فوق نحو ٢١ كلمة (١٫٢٦ث/كلمة المقاسة)');
  ok(r.w0===false,'وهدفٌ فارغ لا يُوسَم — لا بلاغ على لا شيء');
}

console.log('\n٥) والسطر يحمل السقف وبلوغَه — فلا يُحسب يدوياً مرّةً أخرى');
{
  const r=await page.evaluate(()=>{
    const it={id:"t",lv:"B1",passage:"A short passage here.",c:["a","b","c"],a:0};
    raCapHit=false;const plain=raLogText(it,"one two three four five",null);
    raCapHit=true; const hit=raLogText(it,"one two three four five",null);
    raCapHit=false;
    return {plain,hit};
  });
  ok(/سقف:\d+ث/.test(r.plain),'السقف في السطر: '+r.plain.slice(0,52));
  ok(!/بلغ السقف/.test(r.plain),'ولا وسمَ حين لم يُبلَغ');
  ok(/بلغ السقف/.test(r.hit),'ووسمٌ صريح حين بُلِغ');
}

console.log('\n٦) التمدّد: درجةٌ واحدة لا تُفتح الدرجات كلَّها دفعةً واحدة');
{
  const r=await page.evaluate(()=>{
    const seed=n=>{const st={};st.listen=new Array(12).fill(1);st["_n_"+"listen"]=n;
      lsSet('mawhiba_acc_v1',JSON.stringify(st))};
    seed(12);
    const d1=stretchDepth('listen');                 // أوّل تصعيد
    const d1b=stretchDepth('listen');                // نداءٌ ثانٍ بلا أدلّةٍ جديدة
    const st=JSON.parse(lsGet('mawhiba_acc_v1'));st["_n_"+"listen"]=12+8;
    lsSet('mawhiba_acc_v1',JSON.stringify(st));
    const d2=stretchDepth('listen');                 // بعد ثماني إجاباتٍ جديدة
    return {d1,d1b,d2};
  });
  ok(r.d1===1,'٨٥٪ تفتح **درجةً واحدة** لا أكثر');
  ok(r.d1b===1,'ونداءٌ ثانٍ على نفس الأدلّة لا يُصعّد — فلا تُفتح C1 ببناء جلستين');
  ok(r.d2===2,'وثماني إجاباتٍ جديدة عند ٨٥٪ تفتح الدرجة الثانية — الطريق مكسوب لا موهوب');
}

console.log('\n٧) وبلا سقفٍ عند واحد: المخزون ينمو مع كل درجة');
{
  const r=await page.evaluate(()=>{
    const set=d=>{const st={listen:new Array(12).fill(1),_n_listen:0,_at_listen:0};
      st["_lv_listen"]=d;lsSet('mawhiba_acc_v1',JSON.stringify(st))};
    const at=d=>{set(d);const st=JSON.parse(lsGet('mawhiba_acc_v1'));
      st["_at_listen"]=st["_n_listen"];lsSet('mawhiba_acc_v1',JSON.stringify(st));
      const pool=bankStretched('listen','A2',listenBankFor);
      return {n:pool.length,lv:[...new Set(pool.map(x=>x.lv))].sort().join('+')};
    };
    return {d0:at(0),d1:at(1),d2:at(2),chain:lvChain('A2'),chainB2:lvChain('B2'),chainC1:lvChain('C1')};
  });
  ok(r.chain.join(',')==='B1,B2,C1','سلسلةُ A2 هي B1 ثمّ B2 ثمّ C1 — من الخريطة نفسها');
  ok(r.chainC1.length===0,'وC1 قمّة السلّم فلا شيء فوقها');
  ok(r.d0.n<r.d1.n&&r.d1.n<r.d2.n,
    `والمخزون ينمو درجةً درجة: ${r.d0.n} ⇒ ${r.d1.n} ⇒ ${r.d2.n}`);
  ok(r.d1.lv.indexOf('B1')>=0&&r.d2.lv.indexOf('B2')>=0,
    `والدرجة الثانية تُدخل B2 فعلاً (${r.d2.lv})`);
  ok(r.d0.lv.indexOf('B1')<0,'وبلا تمدّدٍ لا يتسرّب شيءٌ فوق المستوى');
}

console.log('\n٨) والنزول متناظر، والحالة القديمة تُرحَّل لا تُهدَر');
{
  const r=await page.evaluate(()=>{
    // هبوطٌ دون ٧٠٪ بأدلّةٍ جديدة ⇒ درجةٌ واحدة تُطوى
    const st={listen:[0,0,0,0,0,0,0,0,1,1,1,1],_n_listen:40,_at_listen:0,_lv_listen:3};
    lsSet('mawhiba_acc_v1',JSON.stringify(st));
    const down=stretchDepth('listen');
    // ترحيل: حالةٌ منطقية قديمة بلا `_lv_`، ودقّةٌ **بين العتبتين** (٠٫٨٣) عمداً —
    // فلا صعودٌ (دون ٠٫٨٥) ولا نزولٌ (فوق ٠٫٧٠)، فيُقاس الترحيل وحده لا أثرٌ آخر معه
    lsSet('mawhiba_acc_v1',JSON.stringify({listen:[1,1,1,1,1,1,1,1,1,1,0,0],_on_listen:true,_n_listen:0,_at_listen:0}));
    const mig=stretchDepth('listen');
    lsSet('mawhiba_acc_v1',JSON.stringify({read:[],_on_read:false}));
    const none=stretchDepth('read');
    return {down,mig,none};
  });
  ok(r.down===2,`ثلاثٌ ⇒ اثنتان عند الهبوط (${r.down}) — درجةٌ واحدة لا انهيار`);
  ok(r.mig>=1,'ومن كان ممتدّاً بالحالة القديمة يبدأ من الدرجة الأولى لا من الصفر');
  ok(r.none===0,'وبلا أدلّةٍ كافية لا تُفتح درجة');
}

console.log('\n٩) وجلسة مقروءٍ حقيقية تعمل بعد التغيير — بلا كسرٍ في البانية');
{
  const r=await page.evaluate(()=>{
    try{lsSet('mawhiba_acc_v1','{}');lsSet('mawhiba_read_srs','{}')}catch(e){}
    startRead();
    const it=readCur();
    return {n:readItems.length,has:!!it,cap:it?readAloudMaxMs(readAloudTarget(it)):0};
  });
  ok(r.n>=5&&r.has,`جلسةٌ كاملة (${r.n} عنصراً)`);
  ok(r.cap>=15000&&r.cap<=30000,`وسقفُ عنصرها داخل المدى المسموح (${r.cap} ملّي)`);
}

console.log(`\nسقط ${fails}`);
await b.close();
process.exit(fails?1:0);
})();
