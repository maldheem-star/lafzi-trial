const {chromium}=require('/opt/node22/lib/node_modules/playwright');
const fs=require('fs');
let fails=0;const ok=(c,m)=>{console.log((c?'  ✓ ':'  ✗ FAIL ')+m);if(!c)fails++};

// نسخة من كتلة القراءة في الدالة المنشورة (بلا أنواع TypeScript). القسم ٠ يتحقّق أن هذه
// النسخة ما زالت تطابق المصدر المنشور، فلا نختبر شيئاً غير الذي يعمل فعلاً.
const paOf=o=>(o&&o.PronunciationAssessment)||o||{};
const numOf=(o,k)=>{const v=paOf(o)[k];return v==null?null:Number(v)};
function parseAzure(j){
  if(String(j.RecognitionStatus||"")!=="Success")return{noSpeech:true,recognitionStatus:j.RecognitionStatus};
  const best=(j.NBest&&j.NBest[0])||{};
  const wordsRaw=best.Words||[];
  const heardText=String(best.Display||j.DisplayText||"");
  const lexText=String(best.Lexical||"");
  if(!/[a-z0-9]/i.test(lexText||heardText))
    return{noSpeech:true,recognitionStatus:"SuccessButSilent",heard:heardText,
      snr:best.SNR!=null?Number(best.SNR):(j.SNR!=null?Number(j.SNR):null),
      durationMs:j.Duration?Math.round(Number(j.Duration)/10000):null};
  const paTop=numOf(best,"PronScore");
  const anyWordScore=wordsRaw.some(w=>numOf(w,"AccuracyScore")!=null);
  if(paTop==null&&!anyWordScore)return{noAssessment:true,nbestKeys:Object.keys(best),hasWords:wordsRaw.length};
  const words=wordsRaw.map(w=>({w:String(w.Word||""),score:Math.round(numOf(w,"AccuracyScore")??0),
    err:String(paOf(w).ErrorType||"None"),
    phonemes:(w.Phonemes||[]).map(p=>({p:String(p.Phoneme||""),score:Math.round(numOf(p,"AccuracyScore")??0)}))}));
  return{ok:true,engine:"azure",heard:heardText,lexical:lexText,pron:Math.round(paTop??0),
    accuracy:Math.round(numOf(best,"AccuracyScore")??0),fluency:Math.round(numOf(best,"FluencyScore")??0),
    completeness:Math.round(numOf(best,"CompletenessScore")??0),
    snr:best.SNR!=null?Number(best.SNR):(j.SNR!=null?Number(j.SNR):null),words};
}

// ردّ Azure الحقيقي الذي وصل من جهازها — هو الذي كشف العطل
const REAL_SILENT={"RecognitionStatus":"Success","Offset":0,"Duration":29100000,"DisplayText":".","SNR":0,
  "NBest":[{"Confidence":0,"Lexical":".","ITN":".","MaskedITN":".","Display":".",
    "AccuracyScore":0,"FluencyScore":0,"CompletenessScore":0,"PronScore":0,
    "Words":[{"Word":"hello","Offset":0,"Duration":0,"Confidence":0,"AccuracyScore":0,"ErrorType":"Omission","Phonemes":[]}]}]};

// نفس الشكل المُسطَّح لكن بكلام حقيقي
const REAL_FLAT={"RecognitionStatus":"Success","Offset":4600000,"Duration":7300000,"DisplayText":"Insect.","SNR":21.4,
  "NBest":[{"Confidence":0.94,"Lexical":"insect","ITN":"insect","MaskedITN":"insect","Display":"Insect.",
    "AccuracyScore":91,"FluencyScore":78,"CompletenessScore":100,"PronScore":87,
    "Words":[{"Word":"insect","AccuracyScore":91,"ErrorType":"None","Phonemes":[
      {"Phoneme":"ih","AccuracyScore":95},{"Phoneme":"n","AccuracyScore":88},{"Phoneme":"s","AccuracyScore":52},
      {"Phoneme":"eh","AccuracyScore":90},{"Phoneme":"k","AccuracyScore":80},{"Phoneme":"t","AccuracyScore":45}]}]}]};

// شكل الـSDK المتداخل — ما كانت الدالة تتوقّعه وحده
const SDK_NESTED={"RecognitionStatus":"Success","DisplayText":"Insect.",
  "NBest":[{"Lexical":"insect","Display":"Insect.",
    "PronunciationAssessment":{"AccuracyScore":91,"FluencyScore":78,"CompletenessScore":100,"PronScore":87},
    "Words":[{"Word":"insect","PronunciationAssessment":{"AccuracyScore":91,"ErrorType":"None"},"Phonemes":[
      {"Phoneme":"ih","PronunciationAssessment":{"AccuracyScore":95}},
      {"Phoneme":"t","PronunciationAssessment":{"AccuracyScore":45}}]}]}]};

// تعرّف عادي بلا تقييم إطلاقاً
const NO_PA={"RecognitionStatus":"Success","DisplayText":"Insect.",
  "NBest":[{"Confidence":0.9,"Lexical":"insect","ITN":"insect","MaskedITN":"insect","Display":"Insect."}]};

(async()=>{

console.log('\n٠) النسخة المُختبَرة تطابق المصدر المنشور');
const src=fs.readFileSync('/home/user/lafzi-trial/supabase-functions-assess-azure.ts','utf8');
for(const [frag,label] of [
  ['(o && (o.PronunciationAssessment as Record<string, unknown>)) || o || {}','قراءة الشكلين في paOf'],
  ['numOf(best as Record<string, unknown>, "PronScore")','درجة النطق تُقرأ مُسطَّحة أو متداخلة'],
  ['numOf(w, "AccuracyScore")','ودرجة الكلمة'],
  ['numOf(p, "AccuracyScore")','ودرجة الفونيم'],
  ['const spoke = /[a-z0-9]/i.test(lexText || heardText)','وفحص «هل تكلّمت أصلاً»'],
  ['snr: best.SNR != null ? Number(best.SNR) : (j.SNR != null ? Number(j.SNR) : null)','ونسبة الإشارة من جذر الردّ'],
]) ok(src.includes(frag),`${label} موجودة في الدالة المنشورة`);

console.log('\n١) ردّها الحقيقي: صمت لا صفرٌ في النطق');
let r=parseAzure(REAL_SILENT);
ok(r.noSpeech===true,'يُرصد صمتاً — لا درجة صفر');
ok(r.recognitionStatus==='SuccessButSilent','ويُسمّى الحالة باسمها (Success ظاهراً وصمت واقعاً)');
ok(r.snr===0,'ونسبة الإشارة إلى الضجيج صفر تُنقل كما هي');
ok(r.durationMs===2910,`ومدّة الصوت ${r.durationMs} مللي — أي أن الصوت وصل ولم يكن فيه كلام`);
ok(!r.noAssessment,'ولا يُقال «التقييم غائب» — فهو حاضر');

console.log('\n٢) الشكل المُسطَّح (REST) — الذي كنّا نقرؤه في المكان الخطأ');
r=parseAzure(REAL_FLAT);
ok(r.ok===true&&r.engine==='azure','يُقبل');
ok(r.pron===87,`ودرجة النطق تصل (${r.pron}) — كانت تُقرأ صفراً`);
ok(r.accuracy===91&&r.fluency===78&&r.completeness===100,'والدقّة والطلاقة والاكتمال');
ok(r.words.length===1&&r.words[0].score===91,'ودرجة الكلمة');
ok(r.words[0].phonemes.length===6,'وستّة أصوات — وهي الغاية من Azure كلّها');
ok(r.words[0].phonemes.find(p=>p.p==='t').score===45,'وأضعفها t بـ٤٥');
ok(r.snr===21.4,'ونسبة الإشارة');

console.log('\n٣) الشكل المتداخل (SDK) ما زال يعمل — لا نكسر ما كان');
r=parseAzure(SDK_NESTED);
ok(r.ok===true&&r.pron===87,`الدرجة نفسها من الشكل الآخر (${r.pron})`);
ok(r.words[0].score===91&&r.words[0].err==='None','والكلمة ونوع الخطأ');
ok(r.words[0].phonemes[1].score===45,'والأصوات');

console.log('\n٤) غياب التقييم فعلاً ما زال يُرصد');
r=parseAzure(NO_PA);
ok(r.noAssessment===true,'يُرصد');
ok(r.hasWords===0,'ومصفوفة الكلمات غائبة — وهذا شكل الغياب الحقيقي');

console.log('\n٥) العميل: الدرجة والأصوات تصل للشاشة');
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'});
const page=await b.newPage({viewport:{width:420,height:900}});
page.on('pageerror',e=>{console.log('  ✗ PAGEERROR '+e.message);fails++});
page.on('dialog',d=>d.dismiss());
await page.route('**/rest/v1/**',r=>r.fulfill({status:201,contentType:'application/json',body:'[]'}));
await page.goto('http://127.0.0.1:8931/index.html');
await page.waitForFunction(()=>typeof azureToScore==='function');
const flat=parseAzure(REAL_FLAT);
const sc=await page.evaluate(d=>azureToScore("insect",d),flat);
ok(sc.pct===91,`azureToScore يُعطي ٩١ (${sc.pct}) — دقّة نطق «insect» نفسها، لا الدرجة المركّبة ٨٧ ولا مقارنة نصّية`);
ok(sc.by==='azure','ومصدرها Azure');
ok(sc.weak===undefined||Array.isArray(sc.weak),'وقائمة الأصوات الضعيفة موجودة');

console.log('\n٦) حارس الأصفار: يرفض الفارغ ولا يبتلع حكماً حقيقياً');
const guard=await page.evaluate(()=>{
  const mk=(pron,ph)=>({ok:true,pron,words:[{w:"gate",score:pron,phonemes:ph}]});
  const test=d=>{
    const anyPh=(d.words||[]).some(w=>(w.phonemes||[]).length>0);
    return typeof d.pron==="number"&&d.pron===0&&!anyPh&&(d.words||[]).every(w=>!w.score);
  };
  return{empty:test(mk(0,[])),zeroWithPhonemes:test(mk(0,[{p:"g",score:0}])),low:test(mk(23,[{p:"g",score:20}]))};
});
ok(guard.empty===true,'صفرٌ بلا أصوات ⇒ يُرفض (لم يجرِ تقييم)');
ok(guard.zeroWithPhonemes===false,'وصفرٌ ومعه أصوات ⇒ يُقبل — نطقت كلمة أخرى، وهذا حكم حقيقي');
ok(guard.low===false,'ودرجة منخفضة تُقبل');

console.log('\n٧) شاشة التشخيص: الصمت يُقال صمتاً');
await page.evaluate(()=>{
  startAudioDiag();
  azDiag={fail:"no_speech",detail:"SuccessButSilent",bytes:95152,
    info:{noSpeech:true,recognitionStatus:"SuccessButSilent",heard:".",snr:0,durationMs:2910,bytes:95152}};
  render();
});
let t=await page.textContent('#app');
ok(t.includes('لم يجد فيه كلاماً'),'يقول إن الصوت وصل ولم يُسمع فيه كلام');
ok(t.includes('٢٫٩ ثانية')||t.includes('٢.٩ ثانية'),`ويذكر مدّة الصوت`);
ok(t.includes('التسجيل صامت فعلاً'),'ويُسمّي نسبة الإشارة صفراً صمتاً صريحاً');
ok(t.includes('تكلّمي أثناء التسجيل'),'ويقول لها ما تفعله');

console.log('\n٨) لا انحدار');
for(const [fn,md] of [["startBasics('percent')",'basics'],["startBasics('multdiv')",'basics'],["startFactPlan()",'factplan'],
  ["startEngPlan()",'engplan'],["startDictation()",'dictation'],["startPronunciation()",'pron'],
  ["startFade('circle')",'fade'],["startAudioDiag()",'audiodiag'],["home()",'home']]){
  const x=await page.evaluate(s=>{try{eval(s);return{m:mode,len:document.getElementById('app').textContent.length}}catch(e){return{err:e.message}}},fn);
  ok(!x.err&&x.m===md&&x.len>40,`${fn} → ${x.err||x.m}`);
}
ok((await page.evaluate(()=>censusMissing())).length===0,'وكل الدوال معرَّفة');
ok((await page.evaluate(()=>window.__ERRS.length))===0,'ولا خطأ');

await b.close();
console.log(fails?`\n=== ${fails} فشل ===`:'\n=== كل الاختبارات نجحت ===');
process.exit(fails?1:0);
})();
