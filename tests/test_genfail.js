// «لماذا لا يصل توليد الكتابة أحداً؟» — ولم يكن في السجلّ ما يُجيب.
//
// القياس (٢٩ أغسطس، أربعة أيام): استماع ٢٩ عنصراً مولَّداً لإلياس، ومقروء ٢٨،
// وSTEP ١٣، وقواعد ٨ — و**الكتابة صفرٌ للثلاثة جميعاً**. وفُحصت الفرضيّتان
// الأوّليان فسقطتا بالقياس لا بالرأي: `genCallsFor` يُعيد ٣ نداءات للكتابة (كالقواعد
// وSTEP سواءً)، والخادم يوجّه `domain:"write"` إلى `systemGenWrite` فعلاً.
// فالمانع أن **الفشل صامت**: `parseGenWriteBlock` يُعيد `null` بلا سطر، فيستحيل
// الفصل بين «الشكل ناقص» و«MIN غائب» و«تلوّثٌ عربي». وهذا نفس درس «ما لا يُسجَّل
// الآن لا يُشخَّص لاحقاً» — وقد كلّف هنا أربعة أيام من قسمٍ لا ينمو.
//
// وقاعدة الإصلاح الشامل: فُحصت المفكِّكات الخمسة، وكان `parseGenPickBlock` وحده
// يُسمّي سقوطه؛ فوُصلت الثلاثة الصامتة (write وlisten/read وvideo) بنفس آليته.
const {chromium}=require('/opt/node22/lib/node_modules/playwright');
let fails=0;const ok=(c,m)=>{console.log((c?'  ✓ ':'  ✗ FAIL ')+m);if(!c)fails++};
(async()=>{
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'});
const logs=[];
const p=await b.newPage({viewport:{width:420,height:900}});
p.on('pageerror',e=>{console.log('  ✗ PAGEERROR '+e.message);fails++});
await p.route('**/rest/v1/**',async r=>{
  if(r.request().method()!=='POST')return r.fulfill({status:200,contentType:'application/json',body:'[]'});
  let x={};try{x=JSON.parse(r.request().postData()||'{}')}catch(e){}
  logs.push(x);r.fulfill({status:201,contentType:'application/json',body:'[]'});
});
await p.route('**/functions/v1/**',r=>r.fulfill({status:200,contentType:'application/json',body:'{"ok":false}'}));
await p.addInitScript(()=>{
  Object.defineProperty(window,'speechSynthesis',{configurable:true,value:{
    speak(u){setTimeout(function(){u.onstart&&u.onstart()},0)},cancel(){},resume(){},pause(){},
    getVoices:()=>[{lang:'en-US',name:'X'}],speaking:false,pending:false}});
  window.SpeechSynthesisUtterance=function(t){this.text=t};
});
await p.goto('http://127.0.0.1:8931/index.html');
await p.waitForFunction(()=>typeof parseGenWriteBlock==='function');

const drain=async()=>{await p.waitForTimeout(350);const r=logs.filter(x=>x&&x.qtype==='parse_fail');logs.length=0;return r};

console.log('\n١) كل صورة سقوطٍ في الكتابة تُسمّى — لا null صامت');
{
  const cases=[
    ["no_prompt","MIN: 25\nSomething else entirely"],
    ["no_min","PROMPT: Write about your school trip."],
    ["min_2","PROMPT: Write about your school trip.\nMIN: 2"],
    ["arabic","PROMPT: اكتب عن رحلتك المدرسية.\nMIN: 25"]
  ];
  for(const c of cases){
    await p.evaluate(t=>{parseGenWriteBlock(t)},c[1]);
    const rows=await drain();
    const row=rows[0];
    ok(!!row,'«'+c[0]+'» يُسجَّل');
    ok(row&&new RegExp(c[0]).test(String(row.response||'')+String(row.q_text||'')),
      '  وباسمه — '+String(row&&row.response||''));
    ok(row&&row.domain==='gen','  في domain=gen — ما يفعله النظام لا ما يفعله هو');
  }
}

console.log('\n٢) والردّ السليم يُقبل ولا يُسجَّل له فشل');
{
  const item=await p.evaluate(()=>parseGenWriteBlock(
    "PROMPT: You visited a museum in Riyadh last week.\\nSay:\\n• what you saw\\n• who you went with\\n• what you liked\\nWrite 25–35 words.\nMIN: 25"));
  const rows=await drain();
  ok(!!item,'العنصر يُبنى');
  ok(item&&item.min===25,'وMIN يُقرأ — '+(item&&item.min));
  ok(item&&/\n/.test(item.prompt),'وأسطر PROMPT تُفكّ من \\n الحرفية');
  ok(rows.length===0,'ولا سطرَ فشلٍ كاذب');
}

console.log('\n٣) وفراغٌ بادئ لم يعد يُفقِد الوسم — أسهل صورةٍ يخرج بها نموذج عن الشكل');
{
  const r=await p.evaluate(()=>({
    indented:!!parseGenWriteBlock("   PROMPT: Write about your pet.\\n1) What is its name?\\n2) What does it eat?\n  MIN: 10"),
    crlf:!!parseGenWriteBlock("PROMPT: Write about your pet.\r\nMIN: 10")
  }));
  await drain();
  ok(r.indented===true,'سطرٌ بفراغٍ بادئ يُقبل الآن (كان يُسقط العنصر كلّه صامتاً)');
  ok(r.crlf===true,'وسطرُ CRLF كذلك');
}

console.log('\n٤) والنظائر الثلاثة موصولة — لا يُصلَح واحدٌ ويُنسى الباقي');
{
  // استماع/قراءة: شكلٌ ناقص
  await p.evaluate(()=>parseGenBlock("TEXT: A short story.\nQ: What happened?","listen"));
  let rows=await drain();
  ok(rows.length===1&&/listen/.test(String(rows[0].response||'')),'parseGenBlock يُسمّي سقوطه — '+(rows[0]&&rows[0].response));
  // وتلوّثٌ عربي
  await p.evaluate(()=>parseGenBlock("TEXT: A short story.\nQ: ماذا حدث؟\nA: one\nB: two\nC: three\nCORRECT: A","read"));
  rows=await drain();
  ok(rows.length===1&&/arabic/.test(String(rows[0].response||'')),'  والتلوّث العربي باسمه — '+(rows[0]&&rows[0].response));
  // فيديو: مشاهد ناقصة
  await p.evaluate(()=>parseGenVideoBlock("TITLE: A day out\nSCENE1_EMOJI: 🚌\nSCENE1_TEXT: We took the bus."));
  rows=await drain();
  ok(rows.length===1&&/video/.test(String(rows[0].response||'')),'parseGenVideoBlock كذلك — '+(rows[0]&&rows[0].response));
}

console.log('\n٥) ولا يُبنى مقياسٌ ثانٍ: نفس صيغة parseGenPickBlock القائمة');
{
  await p.evaluate(()=>parseGenPickBlock("S1: one\nS2: two","gram",false));
  const rows=await drain();
  ok(rows.length===1,'القائم يُسجّل كما كان');
  ok(rows[0]&&/^\[تفكيك:/.test(String(rows[0].q_text||'')),'وبنفس البادئة التي تحملها الثلاثة الجديدة — '+String(rows[0]&&rows[0].q_text||'').slice(0,30));
}

console.log('\n٦) والخادم صار له شكل B2 — كان يسقط إلى A2 صامتاً');
{
  const fs=require('fs');
  const src=fs.readFileSync('supabase-functions-tutor.ts','utf8');
  const fn=src.slice(src.indexOf('function systemGenWrite'),src.indexOf('function systemGenWrite')+3000);
  ok(/\bB2:\s*\[/.test(fn),'shape.B2 موجود');
  ok(/MIN must be 130/.test(fn),'وحدُّه ١٣٠ لا ٢٥ — حدُّ B2 المؤلَ`ف نفسه'.replace('`',''));
  ok(/B2 First/.test(fn),'وصيغته Cambridge B2 First لا A2 Key');
}

await b.close();
console.log(fails?`\n=== ${fails} فشل ===`:'\n=== كل الاختبارات نجحت ===');
process.exit(fails?1:0);
})();
