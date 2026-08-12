const {chromium}=require('/opt/node22/lib/node_modules/playwright');
let fails=0;const ok=(c,m)=>{console.log((c?'  ✓ ':'  ✗ FAIL ')+m);if(!c)fails++};
(async()=>{
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'});
const page=await b.newPage({viewport:{width:420,height:900}});
page.on('pageerror',e=>{console.log('  ✗ PAGEERROR '+e.message);fails++});
await page.route('**/rest/v1/**',r=>r.fulfill({status:201,contentType:'application/json',body:'[]'}));
await page.goto('http://127.0.0.1:8931/index.html');
await page.waitForFunction(()=>typeof azureToScore==='function');

// ما تُعيده الدالة الآن بعد إصلاح القراءة: درجات مُسطَّحة مُطبَّعة إلى شكلنا
const AZ={ok:true,engine:"azure",heard:"Insect.",lexical:"insect",pron:90,accuracy:91,fluency:78,completeness:100,snr:21.4,
  words:[{w:"insect",score:91,err:"None",phonemes:[{p:"ih",score:95},{p:"n",score:88},{p:"s",score:52},
    {p:"eh",score:90},{p:"k",score:80},{p:"t",score:45}]}],
  weak:[{w:"insect",p:"t",score:45},{w:"insect",p:"s",score:52}]};

const show=async d=>page.evaluate(x=>{
  startPronunciation();
  pronSession=[{w:"insect",m:"حشرة"}];pronIdx=0;pronListening=false;pronBusy=false;
  const sc=azureToScore("insect",x);
  pronResult={heard:x.heard,ok:sc.ok,sc,note:"",engine:"azure"};
  render();return{pct:sc.pct,by:sc.by,weak:sc.weak.length};
},d);

console.log('\n١) أضعف الأصوات تصل للشاشة — وهي الغاية من Azure كلّها');
const r=await show(AZ);
ok(r.by==='azure'&&r.pct===91,`الدرجة ٩١ = دقّة نطق الكلمة (${r.pct}) لا الدرجة المركّبة ٩٠ — الطلاقة والاكتمال بلا معنى لكلمة واحدة`);
let t=await page.textContent('#app');
ok(t.includes('الأصوات التي تحتاج تدريباً'),'العنوان ظاهر');
ok(t.includes('لسانك بين أسنانك')===false,'ولا يُذكر شرح صوت غير موجود');
ok(t.includes('٤٥/١٠٠'),'ودرجة أضعف صوت');
ok(t.includes('insect'),'ومعه الكلمة');
ok(t.includes('الدقة ٩١')&&t.includes('الطلاقة ٧٨')&&t.includes('الاكتمال ١٠٠'),'والدقّة والطلاقة والاكتمال');
ok(t.includes('تقييم صوتيّ: درجة لكل صوت'),'والوصف يقول إنه تقييم صوتيّ لا «تحقّق أساسي»');

console.log('\n٢) رمز الفونيم يُترجم لما تفهمه طفلة');
const lab=await page.evaluate(()=>[phonemeLabel("t"),phonemeLabel("th"),phonemeLabel("iy"),phonemeLabel("AH0"),phonemeLabel("zzz")]);
ok(lab[0]==='t','t كما هو');
ok(lab[1].includes('لسانك بين أسنانك'),'وth مشروحة');
ok(lab[2].includes('see'),'والحركات بمثال');
ok(lab[3].includes('cup'),'والأرقام تُزال من الرمز');
ok(lab[4]==='zzz','ورمز غير معروف يُعرض كما هو بلا انهيار');

console.log('\n٣) نطق سليم تماماً: لا قائمة ضعف بل تطمين');
await show(Object.assign({},AZ,{pron:98,weak:[],words:[{w:"insect",score:98,err:"None",phonemes:[{p:"t",score:95}]}]}));
t=await page.textContent('#app');
ok(t.includes('كل الأصوات خرجت واضحة'),'يُقال لها إن كل الأصوات واضحة');
ok(!t.includes('الأصوات التي تحتاج تدريباً'),'ولا تُعرض قائمة فارغة');

console.log('\n٤) مسار Groq يبقى كما كان — لا نُوهمها بتقييم صوتيّ لم يجرِ');
await page.evaluate(()=>{
  startPronunciation();
  pronSession=[{w:"insect",m:"حشرة"}];pronIdx=0;pronListening=false;pronBusy=false;
  pronResult={heard:"insect",ok:true,sc:{pct:100,hit:[true],words:["insect"],got:1,total:1,by:"text"},engine:"groq"};
  render();
});
t=await page.textContent('#app');
ok(t.includes('تحقّق أساسي'),'الوصف يعود إلى «تحقّق أساسي»');
ok(!t.includes('الأصوات التي تحتاج تدريباً')&&!t.includes('كل الأصوات خرجت واضحة'),'ولا صندوق فونيمات');

console.log('\n٥) لا انحدار');
for(const [fn,md] of [["startBasics('percent')",'basics'],["startFactPlan()",'factplan'],["startEngPlan()",'engplan'],
  ["startDictation()",'dictation'],["startPronunciation()",'pron'],["startAudioDiag()",'audiodiag'],["home()",'home']]){
  const x=await page.evaluate(s=>{try{eval(s);return{m:mode,len:document.getElementById('app').textContent.length}}catch(e){return{err:e.message}}},fn);
  ok(!x.err&&x.m===md&&x.len>40,`${fn} → ${x.err||x.m}`);
}
ok((await page.evaluate(()=>censusMissing())).length===0,'وكل الدوال معرَّفة');
ok((await page.evaluate(()=>window.__ERRS.length))===0,'ولا خطأ');

await b.close();
console.log(fails?`\n=== ${fails} فشل ===`:'\n=== كل الاختبارات نجحت ===');
process.exit(fails?1:0);
})();
