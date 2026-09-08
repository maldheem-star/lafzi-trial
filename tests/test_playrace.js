// سباق pause()/play() على عنصر الصوت المشترك — درس ٨ سبتمبر.
//
// العطل الذي يحرسه، ببياناتٍ حيّة: `ttsServerSpeak` كان يبدأ كلَّ نداءٍ بـ`a.pause()`
// على العنصر المشترك. فإن كان وعدُ `play()` من نداءٍ سابق **لم يُسوَّ بعد**، أجهضه
// ذاك الإيقافُ بـ`AbortError: The play() request was interrupted by a call to
// pause().` — فيسقط في `pr.catch` للنداء **السابق** فيُسجَّل `play_autoplay_blocked`.
// أي أن السجلّ كان ينسب إلى سياسة المتصفّح فعلاً **فعلناه نحن**.
//
// ورُصد حيّاً عند هيا على Chrome/أندرويد عاديّ (لا سناب شات): ٢٧ نداءً فاشلاً في
// دقيقتين (٣ سبتمبر)، ثمّ ١٣ (٦ سبتمبر)، ثمّ ٧ و٨ (٧ سبتمبر)، ثمّ ٤ (٨ سبتمبر).
//
// **وحدُّ هذا الاختبار يُقال**: لا يُشغَّل صوتٌ حقيقي ولا تُختبَر سياسة Safari — هذا
// يفحص **بنية التتابع** (متى يقع pause، ومَن يُبلَّغ، وماذا يصل السجلّ) على عنصرٍ
// مُحاكًى يُعيد وعداً معلَّقاً بيدنا، وهو ما يجعل السباق قابلاً للتكرار أصلاً.
// وبقاءُ العطل من عدمه على جهازها يبقى **غير مُثبَتٍ حتى يُفتح عليه** — كحدّ كل
// اختبارات الصوت في هذا المشروع.
const {chromium}=require('/opt/node22/lib/node_modules/playwright');
let fails=0;const ok=(c,m)=>{console.log((c?'  ✓ ':'  ✗ FAIL ')+m);if(!c)fails++};
(async()=>{
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'});
const logs=[];
const p=await b.newPage({viewport:{width:420,height:900}});
p.on('pageerror',e=>{console.log('  ✗ PAGEERROR '+e.message);fails++});
await p.route('**/rest/v1/**',async r=>{
  if(r.request().method()==='POST'){let x={};try{x=JSON.parse(r.request().postData()||'{}')}catch(e){}logs.push(x)}
  r.fulfill({status:201,contentType:'application/json',body:'[]'});
});
// الخادم يُعيد صوتاً صالحاً دائماً — فالعطل المقيس هو التشغيل لا الجلب
await p.route('**/functions/v1/**',r=>r.fulfill({status:200,
  contentType:'audio/mpeg',headers:{'X-Tts-Chars':'5'},body:Buffer.from([0xff,0xfb,0x90,0x00])}));
await p.goto('http://127.0.0.1:8931/index.html');
await p.waitForFunction(()=>typeof ttsServerSpeak==='function');

// عنصرٌ مُحاكًى: play() يُعيد وعداً **نُمسك تسويته بيدنا**، وpause() على وعدٍ معلَّق
// يرفضه بنفس نصّ الخطأ الحيّ حرفاً بحرف — كما يفعل المتصفّح تماماً.
const INSTALL=()=>{
  window.__ev=[];               // تتابع ما وقع فعلاً
  const fake={
    _pending:null, _rejectPending:null, src:"", volume:1,
    onplaying:null, onended:null, onerror:null,
    play(){
      window.__ev.push('play:'+this.src);
      const self=this;
      const pr=new Promise(function(res,rej){self._resolvePending=res;self._rejectPending=rej});
      this._pending=pr; return pr;
    },
    pause(){
      // إيقافُ عنصرٍ خامل مشروعٌ ولا ضرر فيه — المقيس هو الإيقاف **على وعدٍ معلَّق**،
      // فهو وحده ما يُنتج AbortError. فيُوسَم بنفسه بدل عدّ كل إيقاف.
      window.__ev.push(this._pending?'pause!PENDING':'pause');
      if(this._pending&&this._rejectPending){
        const rej=this._rejectPending;this._pending=null;this._rejectPending=null;
        rej(new DOMException(
          "The play() request was interrupted by a call to pause().","AbortError"));
      }
    },
    settle(){ if(this._resolvePending){const r=this._resolvePending;
      this._pending=null;this._rejectPending=null;this._resolvePending=null;r()} }
  };
  window.__fake=fake;
  window.ttsAudioEl=function(){return fake};
  window.__done=[];
  window.TTS_CACHE&&Object.keys(TTS_CACHE).forEach(k=>delete TTS_CACHE[k]);
  // تسويةُ ما بقي معلَّقاً من القسم السابق وتصفيرُ الحالة المشتركة — وإلّا قاس القسمُ
  // التالي أثرَ تسرّبٍ من سابقه لا ما بُني له
  try{ttsPlayP=null}catch(e){}
};

console.log('\n١) العطل الحيّ: pause على وعدٍ معلَّق يُجهضه — ولا يُسجَّل خطأً بعد اليوم');
{
  await p.evaluate(INSTALL);
  const r=await p.evaluate(async()=>{
    // نداءان متتاليان بلا تسوية الأوّل — بالضبط شكلُ الضغط المتكرّر على 🔊
    ttsServerSpeak("one",function(i){window.__done.push('1:'+(i&&i.reason||(i&&i.ok?'ok':'?')))});
    await new Promise(r=>setTimeout(r,120));
    ttsServerSpeak("two",function(i){window.__done.push('2:'+(i&&i.reason||(i&&i.ok?'ok':'?')))});
    await new Promise(r=>setTimeout(r,250));
    return{ev:window.__ev.slice(),done:window.__done.slice(),src:window.__fake.src};
  });
  // pause لا يقع قبل تسوية الوعد المعلَّق ⇒ لا AbortError من عندنا إطلاقاً
  const firstPlay=r.ev.indexOf('play:blob-or-url')>=0?0:r.ev.findIndex(x=>x.indexOf('play:')===0);
  ok(firstPlay>=0,'وقع تشغيلٌ أوّل — وإلّا لم يُقَس السباق أصلاً · '+JSON.stringify(r.ev));
  ok(r.ev.indexOf('pause!PENDING')<0,
    'ولم يقع pause على وعدٍ معلَّق — وهو أصل AbortError · '+JSON.stringify(r.ev));
  await p.waitForTimeout(200);
  const bad=logs.filter(x=>x&&x.qtype==='tts_server'&&/play_autoplay_blocked/.test(String(x.response||'')));
  ok(bad.length===0,'ولا سطر play_autoplay_blocked كاذب في السجلّ — '+bad.length);
}

console.log('\n٢) الأحدث وحده يُشغَّل — لا طابورَ ثلاث عشرة نطقة');
{
  logs.length=0;
  await p.evaluate(INSTALL);
  // الشكل الحيّ: تضغط 🔊 خمس مرّات وأوّلُ تشغيلٍ **لم يُسوَّ بعد**. فالأربعة التالية
  // تنتظر تسويته (لا تُجهضه)، وحين تُسوَّى **يُشغَّل الأحدث وحده** وتُبلَّغ الثلاثة
  // الوسطى `superseded` — فلا طابورَ يُسمعها خمس نطقاتٍ بعد أن كفّت عن الضغط.
  const r=await p.evaluate(async()=>{
    for(let i=1;i<=5;i++){
      ttsServerSpeak("t"+i,function(inf){window.__done.push(i+':'+((inf&&inf.reason)||(inf&&inf.ok?'ok':'?')))});
      await new Promise(r=>setTimeout(r,40));
    }
    const mid=window.__ev.filter(x=>x.indexOf('play:')===0).length;
    window.__fake.settle();                    // بدأ تشغيل الأوّل فعلاً
    await new Promise(r=>setTimeout(r,300));
    return{mid:mid, plays:window.__ev.filter(x=>x.indexOf('play:')===0).length,
      pend:window.__ev.filter(x=>x==='pause!PENDING').length,
      done:window.__done.slice()};
  });
  ok(r.mid===1,'أثناء تعليق الأوّل لم يبدأ تشغيلٌ ثانٍ — لا تراكم · '+r.mid);
  ok(r.pend===0,'ولم يُجهَض المعلَّق بإيقافٍ منّا · '+r.pend);
  ok(r.plays===2,'وبعد تسويته يبدأ **الأحدث وحده** — لا خمسة · '+r.plays);
  const sup=r.done.filter(x=>/superseded/.test(x)).length;
  ok(sup===3,'والثلاثة الوسطى تُبلَّغ superseded فلا يعلق المُستدعي · '+sup+' من '+r.done.length+' · '+JSON.stringify(r.done));
  const noisy=logs.filter(x=>x&&x.qtype==='tts_server');
  ok(noisy.length===0,'ولا سطرَ سجلٍّ للمُزاح — لا شيء عُطِب حتى يُسجَّل · '+noisy.length);
}

console.log('\n٣) والنجاح ما زال نجاحاً — لا انحدار');
{
  logs.length=0;
  await p.evaluate(INSTALL);
  const r=await p.evaluate(async()=>{
    let got=null;
    ttsServerSpeak("hello",function(i){got=i});
    await new Promise(r=>setTimeout(r,200));
    window.__fake.settle();                 // المتصفّح بدأ التشغيل فعلاً
    if(window.__fake.onplaying)window.__fake.onplaying();
    await new Promise(r=>setTimeout(r,120));
    return{ok:!!(got&&got.ok),engine:got&&got.engine,src:!!window.__fake.src};
  });
  ok(r.ok&&r.engine==='azure','نداءٌ منفرد يبدأ ويُبلَّغ نجاحاً');
  ok(r.src,'وضُبط src على العنصر المشترك');
}

console.log('\n٤) ورفضُ المتصفّح الحقيقي ما زال يُسجَّل — لم يُبتلَع مع الإصلاح');
{
  logs.length=0;
  await p.evaluate(INSTALL);
  const r=await p.evaluate(async()=>{
    let got=null;
    ttsServerSpeak("blocked",function(i){got=i});
    await new Promise(r=>setTimeout(r,200));
    // رفضٌ من المتصفّح نفسه لا من إيقافنا — NotAllowedError كسياسة التشغيل التلقائي
    const rej=window.__fake._rejectPending;
    window.__fake._pending=null;window.__fake._rejectPending=null;
    if(rej)rej(new DOMException("play() failed because the user didn't interact","NotAllowedError"));
    await new Promise(r=>setTimeout(r,200));
    return{reason:got&&got.reason};
  });
  ok(r.reason==='autoplay_blocked','يُبلَّغ المُستدعي بالرفض الحقيقي · '+r.reason);
  await p.waitForTimeout(150);
  const row=logs.filter(x=>x&&x.qtype==='tts_server'&&/play_autoplay_blocked/.test(String(x.response||'')));
  ok(row.length>=1,'ويصل السجلَّ سطرُه — الإصلاح يمنع الكاذب لا الصادق');
}

console.log('\n٥) البنية: لا pause عارياً باقياً في المسار');
{
  const r=await p.evaluate(()=>({
    src:String(ttsServerSpeak),
    hasQuiet:typeof ttsQuiet==='function',
    hasSeq:typeof ttsPlaySeq==='number'
  }));
  ok(r.hasQuiet&&r.hasSeq,'ttsQuiet ورمزُ النداء موجودان');
  ok(/ttsQuiet\(a\)/.test(r.src),'والمسار يمرّ بها');
  ok(!/if\(shared\)try\{a\.pause\(\)\}/.test(r.src),'والإيقافُ العاري أُزيل من بدايته');
  const miss=await p.evaluate(()=>censusMissing());
  ok(miss.length===0,'ولا دالّة مفقودة — '+miss.join(','));
}

await b.close();
console.log(fails?`\n=== ${fails} فشل ===`:'\n=== كل الاختبارات نجحت ===');
process.exit(fails?1:0);
})();
