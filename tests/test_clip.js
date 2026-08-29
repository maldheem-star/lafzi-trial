// مقاطع شرح الكمّي والمرونة — طلب صاحب المشروع ٢٩ أغسطس («هيّا تشكي من صعوبة الكمّي»).
// المحتوى من `FADE_TOPICS`/`fadeMake*` القائمة، والجديد هو المشغّل والربط.
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
  Object.defineProperty(window,'speechSynthesis',{configurable:true,value:{speak(){},cancel(){},getVoices:()=>[{lang:'en-US',name:'X'}],speaking:false,pending:false}});
  window.SpeechSynthesisUtterance=function(t){this.text=t};
});
await p.goto('http://127.0.0.1:8931/index.html');
await p.waitForFunction(()=>typeof clipBuild==='function');

console.log('\n١) كلُّ رابطٍ مسجَّل يبني مقطعاً فعلاً — لا زرَّ لا يفتح شيئاً');
{
  const r=await p.evaluate(()=>{
    const links=[...new Set(Object.keys(QZ_CARD_FADE_LINK).map(k=>QZ_CARD_FADE_LINK[k]))];
    const out={};links.forEach(function(l){
      const c=clipBuild(l);
      out[l]=c?{steps:c.steps.length,label:c.label,icon:c.icon,rule:!!c.rule}:null;
    });
    return{links:links,out:out,nLinks:Object.keys(QZ_CARD_FADE_LINK).length};
  });
  // حدٌّ أدنى لا عدد: القائمة تُوسَّع وتُقلَّم بالقياس (رُفعت روابط المتتاليات في ٢٩
  // أغسطس لأن `tmplKey` لا يفرّق بين جمعٍ وضربٍ ومربّعات) — فتثبيتُ العدد يكسر كلَّ
  // تعديلٍ مشروع ولا يقول أيُّ ربطٍ تغيّر. درس «الأعداد المكتوبة في الاختبارات فخّ صامت».
  ok(r.nLinks>=5,'القوالب المربوطة لا تقلّ عن خمسة — '+r.nLinks);
  ok(r.links.length>0,'وأنواع المقاطع — '+r.links.length);
  r.links.forEach(function(l){
    const c=r.out[l];
    ok(!!c,'«'+l+'» يُبنى'+(c?' ('+c.steps+' خطوات · '+c.label+')':' — فارغ!'));
    ok(!!(c&&c.rule),'  وله قاعدةٌ تُختَم بها');
    ok(!!(c&&c.steps>=2),'  وخطوتان فأكثر');
  });
}

console.log('\n٢) النوع الفرعي يُطابَق — لا يُعرض شرح الأقلام لسؤال متتالية');
{
  const r=await p.evaluate(()=>{
    const out={ratio:0,seq:0};
    for(let i=0;i<12;i++){
      const a=clipBuild("seq/ratio"),c=clipBuild("seq/seq");
      if(a&&/قلم/.test(a.steps.join(" ")))out.ratio++;
      if(c&&/القاعدة/.test(c.steps.join(" ")))out.seq++;
    }
    return out;
  });
  ok(r.ratio===12,'«seq/ratio» يعطي مسألة الأقلام دائماً — '+r.ratio+'/١٢');
  ok(r.seq===12,'و«seq/seq» يعطي المتتالية دائماً — '+r.seq+'/١٢');
}

console.log('\n٣) التقدّم خطوةً خطوة، والخاتمة قاعدةٌ لا جواب');
{
  const r=await p.evaluate(()=>{
    clipOn=clipBuild("cube");clipStep=0;
    const n=clipOn.steps.length,seen=[];
    for(let i=0;i<=n;i++){
      const h=clipHTML();
      seen.push({step:clipStep,isRule:h.indexOf("💡")>=0,hasNext:h.indexOf("clipNext()")>=0,
                 hasDone:h.indexOf("clipClose()")>=0});
      clipNext();
    }
    return{n:n,seen:seen,afterEnd:clipStep};
  });
  ok(r.seen.slice(0,r.n).every(x=>!x.isRule),'الخطوات الحسابية أوّلاً');
  ok(r.seen[r.n].isRule===true,'ثم القاعدة آخراً برمزٍ مختلف 💡');
  ok(r.seen.slice(0,r.n).every(x=>x.hasNext),'ولكلٍّ زرُّ تقدّم');
  ok(r.seen[r.n].hasDone===true,'والأخيرة تُختم بـ«فهمت»');
  ok(r.afterEnd===r.n,'ولا يتجاوز آخر لقطة — '+r.afterEnd+'/'+r.n);
}

console.log('\n٤) الزرّ يظهر لما هو مربوط وحده');
{
  const r=await p.evaluate(()=>{
    clipOn=null;clipStep=0;            // القسم السابق تركه مفتوحاً، والزرّ يُخفى حينئذ عمداً
    const linked=gCube(),unlinked=gPaths();
    return{linked:clipButtonHTML(linked).length>0,unlinked:clipButtonHTML(unlinked).length>0,
      // ولا يظهر والمقطع مفتوح
      whileOpen:(function(){clipOn=clipBuild("cube");const h=clipButtonHTML(linked);clipOn=null;return h.length>0})()};
  });
  ok(r.linked===true,'يظهر لسؤال المكعّب (مربوط)');
  ok(r.unlinked===false,'ولا يظهر لسؤال الطرق (بلا موضوع تقويةٍ يشرح طريقته)');
  ok(r.whileOpen===false,'ولا يتكرّر والمقطع مفتوح');
}

console.log('\n٥) الاتّجاه: لا سطرَ على الشكل المكسور الموثَّق (عربية + لاتيني + ذيلٌ رقميّ)');
{
  const r=await p.evaluate(()=>{
    const links=[...new Set(Object.keys(QZ_CARD_FADE_LINK).map(k=>QZ_CARD_FADE_LINK[k]))];
    const bad=[],all=[];
    for(let t=0;t<25;t++){
      links.forEach(function(l){
        const c=clipBuild(l);if(!c)return;
        c.steps.concat([c.rule]).forEach(function(s){
          const txt=String(s).replace(/<[^>]*>/g,"");   // الوسوم ليست محتوى
          all.push(txt);
          // الشكل المُثبَت انقلابُه في ٢٥ أغسطس: حرفٌ لاتيني داخل سطرٍ عربي
          if(/[A-Za-z]/.test(txt)&&/[؀-ۿ]/.test(txt))bad.push(txt);
        });
      });
    }
    return{bad:[...new Set(bad)],n:all.length};
  });
  ok(r.n>0,'فُحص '+r.n+' سطراً');
  ok(r.bad.length===0,'ولا سطرَ يخلط العربية بحرفٍ لاتيني — '+(r.bad[0]||"نظيف"));
}

console.log('\n٦) فتحُ المقطع يُسجَّل ليُقاس أثره');
{
  await p.evaluate(()=>{clipOn=null;clipStep=0;mode="quiz";clipOpen("cube")});
  await p.waitForTimeout(350);
  const row=logs.filter(x=>x&&x.qtype==='clip_open').pop();
  ok(!!row,'وسطرٌ وصل الخادم');
  ok(row&&row.domain==='gen','في domain=gen — ما يفعله النظام لا ما تفعله هي');
  ok(row&&/cube/.test(String(row.response||'')),'ومعه اسم الموضوع — '+(row&&row.response));
}

await b.close();
console.log(fails?`\n=== ${fails} فشل ===`:'\n=== كل الاختبارات نجحت ===');
process.exit(fails?1:0);
})();
