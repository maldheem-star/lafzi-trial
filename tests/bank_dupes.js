// قياس التكرار داخل كل بنك على حدة — w-shingles (Broder 1997)، وهو المقياس المعتمَد
// في هذا المشروع منذ ٢٢ أغسطس بعد أن كذّب جاكارَ الكلمات المفردة الذي صنعتُه بيدي.
//
// **ويُقاس صنفان مختلفان لا يُخلطان** — والخلط بينهما هو ما جعل «الأسئلة متكررة» شكوى
// بلا رقم طوال أسبوع:
//   (أ) تشابهٌ نصّي داخل البنك: عنصران مؤلَّفان يقولان الشيء نفسه بصياغتين.
//   (ب) تكرارُ العرض: العنصر نفسه يُعرض مرّةً بعد مرّة لأن البنك أصغر من الاستعمال.
// والثاني هو الذي اشتكى منه إلياس فعلاً (٣٣ إجابة على خمسة عناصر)، ولا يقيسه أيّ
// مقياس تشابهٍ نصّي لأن العنصر مطابقٌ لنفسه لا شبيهٌ بغيره.
//
// التشغيل: node tests/bank_dupes.js   (يحتاج الخادم المحلّي على ٨٩٣١)
const {chromium}=require('/opt/node22/lib/node_modules/playwright');

// التطبيع كما طلبه صاحب المشروع: تجريد الترقيم وعلامات الترقيم والتنسيق والمسافات.
function norm(s){
  return String(s||"")
    .replace(/<[^>]*>/g," ")                 // أي وسمٍ منسّق
    .replace(/^\s*\d+\s*[).\-]\s*/gm,"")     // ترقيم أوّل السطر: «1)» «٢.» «3-»
    .replace(/[.,!?;:'"«»()\[\]{}…—–\-_/\\]/g," ")
    .replace(/[ً-ْ]/g,"")          // التشكيل العربي
    .toLowerCase()
    .replace(/\s+/g," ").trim();
}
// w-shingles: متتالياتٌ من k كلمات. k=3 هو ما استقرّ عليه المشروع.
const K=3;
function shingles(s,k=K){
  const w=norm(s).split(" ").filter(Boolean);
  if(w.length<k)return new Set(w.length?[w.join(" ")]:[]);
  const out=new Set();
  for(let i=0;i+k<=w.length;i++)out.add(w.slice(i,i+k).join(" "));
  return out;
}
function jaccard(a,b){
  if(!a.size||!b.size)return 0;
  let inter=0;for(const x of a)if(b.has(x))inter++;
  return inter/(a.size+b.size-inter);
}

// عتبتان معلنتان لا واحدة مخترَعة: Broder يعرّف near-duplicate بالتشابه العالي،
// والعُرف المنشور يستعمل ~0.9 للمطابق تقريباً و~0.5 للقريب. تُعرض النتيجتان معاً
// فيقرّر القارئ، ولا يُخفى أن العتبة اختيار.
const NEAR=0.5, DUPE=0.8;

(async()=>{
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'});
const page=await b.newPage();
page.on('pageerror',e=>console.log('PAGEERROR '+e.message));
await page.route('**/rest/v1/**',r=>r.fulfill({status:201,contentType:'application/json',body:'[]'}));
await page.route('**/functions/v1/**',r=>r.fulfill({status:200,contentType:'application/json',body:'{"ok":false}'}));
await page.addInitScript(()=>{
  Object.defineProperty(window,'speechSynthesis',{configurable:true,value:{speak(){},cancel(){},getVoices:()=>[{lang:'en-US',name:'X'}],speaking:false,pending:false}});
  window.SpeechSynthesisUtterance=function(t){this.text=t};
});
await page.goto('http://127.0.0.1:8931/index.html');
await page.waitForFunction(()=>typeof engBuildFor==='function');

// نصُّ كل عنصر: ما يراه المتعلّم فعلاً، لا معرّفه ولا شيفرته
const banks=await page.evaluate(()=>{
  const txt=x=>{
    if(!x)return"";
    const parts=[];
    if(x.audio)parts.push(x.audio);
    if(x.passage)parts.push(x.passage);
    if(x.q)parts.push(x.q);
    if(x.prompt)parts.push(x.prompt);
    if(x.s&&typeof x.s==='string')parts.push(x.s);
    if(Array.isArray(x.s))parts.push(x.s.join(' '));
    if(Array.isArray(x.sc))parts.push(x.sc.map(v=>Array.isArray(v)?v[1]:v).join(' '));
    if(Array.isArray(x.c))parts.push(x.c.map(o=>typeof o==='string'?o:(o&&o.t)||'').join(' '));
    if(x.w)parts.push(x.w);
    if(x.en)parts.push(x.en);
    if(x.text)parts.push(x.text);
    if(x.sol)parts.push(Array.isArray(x.sol)?x.sol.join(' '):x.sol);
    if(Array.isArray(x.words))parts.push(x.words.join(' '));
    if(Array.isArray(x.lines))parts.push(x.lines.join(' '));
    if(x.a&&typeof x.a==='string')parts.push(x.a);
    if(x.b&&typeof x.b==='string')parts.push(x.b);
    return parts.join(' ').trim();
  };
  const pick=(name)=>{
    try{const v=eval(name);return Array.isArray(v)?v.map((x,i)=>({id:x&&x.id||(name+'#'+i),lv:x&&(x.lv||x.ch)||'',t:txt(x)})):null}
    catch(e){return null}
  };
  const names=['LISTEN_BANK','READ_BANK','GRAM_BANK','STEP_BANK','MINPAIR_BANK','WRITE_BANK',
               'VIDEO_BANK','STAT_BANK','ENG_ITEMS','ENG_BUILD','DICTATION_A1','SPEAK_ITEMS',
               'READING_ITEMS','COACH_SCENES'];
  const out={};
  names.forEach(n=>{const v=pick(n);if(v&&v.length)out[n]=v});
  return out;
});
await b.close();

console.log('\n════ تكرار نصّي داخل كل بنك — w-shingles k='+K+' (Broder 1997) ════');
console.log('العتبتان المعلنتان: قريب ≥'+NEAR+' · مطابقٌ تقريباً ≥'+DUPE+'\n');
const rows=[];
for(const [name,items] of Object.entries(banks)){
  // المقارنة داخل نفس المستوى فقط: «نفس المفهوم بمستوى أصعب ليس تكراراً» — قاعدة
  // صاحب المشروع صراحةً. فمقارنة A1 بـB1 تُنتج بلاغاً كاذباً بحكم التصميم.
  const byLv={};
  items.forEach(it=>{(byLv[it.lv||'-']=byLv[it.lv||'-']||[]).push(it)});
  const sh=new Map(items.map(it=>[it.id,shingles(it.t)]));
  let near=0,dupe=0,pairs=0;const flagged=new Set(),worst=[];
  for(const group of Object.values(byLv)){
    for(let i=0;i<group.length;i++)for(let j=i+1;j<group.length;j++){
      const s=jaccard(sh.get(group[i].id),sh.get(group[j].id));pairs++;
      if(s>=NEAR){near++;flagged.add(group[i].id);flagged.add(group[j].id);
        worst.push({a:group[i].id,b:group[j].id,s:+s.toFixed(3),lv:group[i].lv,
                    ta:group[i].t.slice(0,58),tb:group[j].t.slice(0,58)});}
      if(s>=DUPE)dupe++;
    }
  }
  // أعلى تشابهٍ وُجد فعلاً — بلا هذا يستحيل التفريق بين «لا تكرار» و«المقياس معطّل»
  let mx=0,mxPair=null;
  for(const group of Object.values(byLv))
    for(let i=0;i<group.length;i++)for(let j=i+1;j<group.length;j++){
      const s=jaccard(sh.get(group[i].id),sh.get(group[j].id));
      if(s>mx){mx=s;mxPair=group[i].id+' ↔ '+group[j].id}
    }
  worst.sort((x,y)=>y.s-x.s);
  const pct=items.length?Math.round(100*flagged.size/items.length):0;
  rows.push({name,n:items.length,pairs,near,dupe,pct,mx:+mx.toFixed(3),mxPair,worst:worst.slice(0,3)});
}
// ===== تحقّقٌ من المقياس نفسه قبل تصديق نتيجته =====
// بنكٌ لا يستخرج المستخرِجُ نصوصَه يُعطي «صفر تكرار» وهو لم يقس شيئاً. فيُعرض متوسّط
// طول النصّ وعدد العناصر الفارغة صراحةً — الصفرُ لا يُصدَّق إلا مع تغطيةٍ مثبتة.
console.log('\n════ تغطية المستخرِج — الصفر لا يُصدَّق بلا هذا ════');
for(const [name,items] of Object.entries(banks)){
  const empty=items.filter(i=>!i.t||norm(i.t).split(' ').filter(Boolean).length<K).length;
  const avg=Math.round(items.reduce((a,i)=>a+norm(i.t).split(' ').filter(Boolean).length,0)/items.length);
  const bad=empty>items.length*0.2;
  console.log((bad?'  ⚠ ':'  ✓ ')+name.padEnd(16)+' متوسّط الكلمات '+String(avg).padStart(4)
    +' · عناصر بلا نصٍّ كافٍ '+empty+'/'+items.length+(bad?'  ← الصفر هنا غير موثوق':''));
}
rows.sort((a,b)=>b.pct-a.pct);
console.log('البنك'.padEnd(16)+'عناصر'.padStart(7)+'مقارنات'.padStart(9)+'قريب'.padStart(7)+'مطابق'.padStart(7)+'نسبة%'.padStart(7)+'أعلى'.padStart(8));
console.log('-'.repeat(56));
for(const r of rows){
  console.log(r.name.padEnd(16)+String(r.n).padStart(7)+String(r.pairs).padStart(9)
    +String(r.near).padStart(7)+String(r.dupe).padStart(7)+String(r.pct).padStart(6)+'%'+String(r.mx).padStart(8));
}
const over=rows.filter(r=>r.pct>15);
console.log('\n'+(over.length
  ? '⛔ بنوكٌ تجاوزت ١٥٪: '+over.map(r=>r.name+' ('+r.pct+'%)').join('، ')
  : '✓ لا بنك تجاوز عتبة ١٥٪ من التشابه النصّي'));
for(const r of rows.filter(r=>r.worst.length)){
  console.log('\n── '+r.name+' — أعلى المتشابهات:');
  r.worst.forEach(w=>{
    console.log('   '+w.s+'  ['+w.lv+']  '+w.a+' ↔ '+w.b);
    console.log('      أ: '+w.ta);console.log('      ب: '+w.tb);
  });
}
console.log('\nملاحظة: هذا يقيس التشابه النصّي داخل البنك فقط. تكرارُ **العرض**');
console.log('(العنصر نفسه يُعرض مرّةً بعد مرّة) يُقاس من السجلّ لا من البنك.');
})();
