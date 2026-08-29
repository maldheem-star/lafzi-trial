// توسعة بنوك A1/A2 — درس ٢٩ أغسطس.
// العطل: `GRAM_N=5` وبنك A1 خمسة، و`STEP_N=6` وبنكه ستّة، و`VIDEO_N=5` وبنكه ستّة —
// فترى هيا **بنكها كلّه في كل جلسة** (تكرارُ عرضٍ ٨٠٪، ودقّة ٠-٤٠٪ والتخمين ٢٥٪).
// وإلياس مثلها في A2 (خمسةٌ فقط).
// **والحارس يُثبّت حدّاً أدنى لا عدداً** — درس ١٨ أغسطس: «الأعداد المكتوبة في
// الاختبارات فخّ صامت»، فكلُّ إضافةٍ مشروعة تكسر اختباراً يُثبّت العدد بالضبط.
const {chromium}=require('/opt/node22/lib/node_modules/playwright');
let fails=0;const ok=(c,m)=>{console.log((c?'  ✓ ':'  ✗ FAIL ')+m);if(!c)fails++};
(async()=>{
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'});
const p=await b.newPage({viewport:{width:420,height:900}});
p.on('pageerror',e=>{console.log('  ✗ PAGEERROR '+e.message);fails++});
await p.route('**/rest/v1/**',r=>r.fulfill({status:200,contentType:'application/json',body:'[]'}));
await p.route('**/functions/v1/**',r=>r.fulfill({status:200,contentType:'application/json',body:'{"ok":false}'}));
await p.addInitScript(()=>{
  Object.defineProperty(window,'speechSynthesis',{configurable:true,value:{speak(){},cancel(){},getVoices:()=>[{lang:'en-US',name:'X'}],speaking:false,pending:false}});
  window.SpeechSynthesisUtterance=function(t){this.text=t};
});
await p.goto('http://127.0.0.1:8931/index.html');
await p.waitForFunction(()=>typeof gramBankFor==='function');

console.log('\n١) البنك المؤلَّف أكبر من الجلسة بضعفين على الأقلّ');
{
  const r=await p.evaluate(()=>({
    gram:{A1:GRAM_BANK.filter(x=>x.lv==='A1').length,A2:GRAM_BANK.filter(x=>x.lv==='A2').length,
          B1:GRAM_BANK.filter(x=>x.lv==='B1').length,n:GRAM_N},
    step:{A1:STEP_BANK.filter(x=>x.lv==='A1').length,A2:STEP_BANK.filter(x=>x.lv==='A2').length,
          B1:STEP_BANK.filter(x=>x.lv==='B1').length,n:STEP_N},
    video:{A1:VIDEO_BANK.filter(x=>x.lv==='A1').length,A2:VIDEO_BANK.filter(x=>x.lv==='A2').length,
           B1:VIDEO_BANK.filter(x=>x.lv==='B1').length,n:VIDEO_N}
  }));
  ['gram','step','video'].forEach(function(k){
    ['A1','A2'].forEach(function(lv){
      // الضِعف حدٌّ أدنى: بنكٌ = حجم الجلسة يعني رؤية البنك كلّه كل مرّة
      ok(r[k][lv]>=r[k].n*2,k+' · '+lv+' — '+r[k][lv]+' عنصراً مقابل جلسةٍ من '+r[k].n);
    });
  });
}

console.log('\n٢) وسلامة كل عنصرٍ جديد: صوابٌ واحد، وشرحٌ لكلٍّ، وبلا تلوّث');
{
  const r=await p.evaluate(()=>{
    const AR=/[؀-ۿ]/,bad=[];let checked=0;
    [['GRAM',GRAM_BANK],['STEP',STEP_BANK],['VIDEO',VIDEO_BANK]].forEach(function(pair){
      const name=pair[0];
      pair[1].forEach(function(it){
        checked++;
        if(it.c&&typeof it.c[0]==='object'){
          if(it.c.filter(function(x){return x.ok}).length!==1)bad.push(name+':'+it.id+':صواب');
          if(new Set(it.c.map(function(x){return x.t})).size!==it.c.length)bad.push(name+':'+it.id+':تكرار');
          it.c.forEach(function(x){
            if(AR.test(x.t))bad.push(name+':'+it.id+':عربية');
            if(!x.why||!AR.test(x.why))bad.push(name+':'+it.id+':شرح');
          });
        }
        if(Array.isArray(it.s)){
          if(it.s.length<3)bad.push(name+':'+it.id+':ترتيب<٣');
          if(!it.why)bad.push(name+':'+it.id+':بلا منهج');
          it.s.forEach(function(x){if(AR.test(x))bad.push(name+':'+it.id+':عربية')});
        }
        if(it.sc){
          if(!Array.isArray(it.c)||it.c.length<3)bad.push(name+':'+it.id+':خيارات');
          if(typeof it.a!=='number'||it.a<0||it.a>=it.c.length)bad.push(name+':'+it.id+':موضع');
          it.sc.forEach(function(s){if(AR.test(s[1]))bad.push(name+':'+it.id+':مشهد عربي')});
          if(AR.test(it.q||""))bad.push(name+':'+it.id+':سؤال عربي');
        }
      });
    });
    const ids=[].concat(GRAM_BANK,STEP_BANK,VIDEO_BANK).map(function(x){return x.id});
    return{bad:[...new Set(bad)],checked:checked,dupIds:ids.length-new Set(ids).size};
  });
  ok(r.checked>0,'فُحص '+r.checked+' عنصراً');
  ok(r.bad.length===0,'بلا عيب — '+(r.bad.slice(0,3).join(' | ')||'نظيف'));
  ok(r.dupIds===0,'ولا معرّف مكرّر');
}

console.log('\n٣) ولا توأمَ داخل مستوًى واحد يُهدر مقعداً في الجلسة');
{
  const r=await p.evaluate(()=>{
    const out={};
    [['gram',GRAM_BANK],['step',STEP_BANK],['video',VIDEO_BANK]].forEach(function(pair){
      const thr=twinThrFor(pair[0]);
      const byLv={};pair[1].forEach(function(x){(byLv[x.lv]=byLv[x.lv]||[]).push(x)});
      let over=0,tot=0,worst=0,pairId='';
      for(const lv in byLv){const g=byLv[lv];
        for(let i=0;i<g.length;i++)for(let j=i+1;j<g.length;j++){
          const s=twinSim(itemText(g[i]),itemText(g[j]));tot++;
          if(s>worst){worst=s;pairId=g[i].id+'/'+g[j].id}
          if(s>=thr)over++;}}
      out[pair[0]]={over:over,tot:tot,worst:+worst.toFixed(3),pairId:pairId,thr:thr};
    });
    return out;
  });
  ['gram','step','video'].forEach(function(k){
    const o=r[k];
    ok(o.tot>0,k+' — '+o.tot+' زوجاً داخل المستويات');
    ok(o.over===0,'  ولا زوجَ يبلغ عتبة التوأم ('+o.thr+') — أقصاه '+o.worst+(o.pairId?' في '+o.pairId:''));
  });
}

console.log('\n٤) وجلساتٌ متتالية لهيا لا تُعيد البنك كلّه');
{
  const r=await p.evaluate(()=>{
    try{localStorage.removeItem(pkey(SEEN_KEY))}catch(e){}
    try{gramSrsSave({})}catch(e){}
    const seen=new Set();let shows=0;
    for(let s=0;s<3;s++){
      const plan=buildGramPlan();
      plan.forEach(function(i){seen.add(i.id);shows++;
        try{seenRecord(i.id,true)}catch(e){}});
      try{plan.forEach(function(i){gramSrsUpdate(i.id,true)})}catch(e){}
    }
    return{shows:shows,uniq:seen.size,bank:gramBankFor('A1').length};
  });
  ok(r.shows>=15,'ثلاث جلسات — '+r.shows+' عرضاً');
  // كان البنك خمسةً و`GRAM_N=5`: خمسة عناصر متمايزة مهما تكرّرت الجلسات
  ok(r.uniq>=10,'وعناصرها المتمايزة — '+r.uniq+' (كانت خمسةً حتماً قبل التوسعة)');
  await p.close();
}

await b.close();
console.log(fails?`\n=== ${fails} فشل ===`:'\n=== كل الاختبارات نجحت ===');
process.exit(fails?1:0);
})();
