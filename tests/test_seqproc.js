// مقطع «كيف أعرف القاعدة؟» — طلب صاحب المشروع ٢٩ أغسطس بعد لقطة شاشة:
// «ليش ما شرحت كيفية تحديد القاعدة؟ أصلاً ما هي القواعد وكم عددها؟»
//
// والعطل الذي سبقه: `tmplKey` يمحو الأرقام، فتنهار خمسة أنواع متتاليات إلى مفتاحين،
// فأخذ سؤالُ المربّعات مقطعاً يشرح الجمع. والعلاج ليس ترقيع المفتاح بل **إجراءٌ لا
// يؤكّد قاعدةً بعينها**: طريقة الفروق المنتهية، مبنيّةً من أرقام السؤال نفسه.
// ومعها ثلاثة قيود من الأدبيات: خطوة تحقّقٍ إلزامية (Stacey 1989)، وأسماءٌ للأهداف
// الفرعية (Catrambone 1998)، و«انظر إلى الوراء» (Pólya 1945).
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
await p.waitForFunction(()=>typeof clipSeqBuild==='function');

console.log('\n١) التشخيص يُطابق العائلة الحقيقية لكل مولّد — لا يخلط جمعاً بضربٍ بمربّعات');
{
  const r=await p.evaluate(()=>{
    const want={gArith:"add",gGeo:"mul",fDouble:"mul",fTriple:"mul",fFib:"fib",fSq:"quad"};
    const gens={gArith,gGeo,fDouble,fTriple,fFib,fSq};
    const out={};
    for(const k in gens){
      let bad=0,kinds={};
      for(let t=0;t<20;t++){                 // عشرون توليدةً: الأرقام عشوائية
        const q=gens[k]();
        const dg=seqDiagnose(q.pat||[]);
        const kind=dg&&dg.kind;kinds[kind]=(kinds[kind]||0)+1;
        if(kind!==want[k])bad++;
      }
      out[k]={bad:bad,kinds:kinds,want:want[k]};
    }
    return out;
  });
  Object.keys(r).forEach(function(k){
    ok(r[k].bad===0,k+' ⇐ '+r[k].want+' في عشرين توليدة — '+JSON.stringify(r[k].kinds));
  });
}

console.log('\n٢) والقاعدة المُستنتَجة تنطبق فعلاً على كل حدٍّ معطًى — لا تأكيدَ بلا برهان');
{
  const r=await p.evaluate(()=>{
    const gens={gArith,gGeo,fDouble,fTriple,fFib,fSq};
    let checked=0,bad=[];
    for(const k in gens){
      for(let t=0;t<15;t++){
        const q=gens[k]();const a=q.pat,dg=seqDiagnose(a);
        checked++;
        let okAll=true;
        if(dg.kind==="add")for(let i=1;i<a.length;i++){if(a[i]-a[i-1]!==dg.d)okAll=false}
        else if(dg.kind==="mul")for(let i=1;i<a.length;i++){if(a[i]/a[i-1]!==dg.r)okAll=false}
        else if(dg.kind==="fib")for(let i=2;i<a.length;i++){if(a[i]!==a[i-1]+a[i-2])okAll=false}
        else if(dg.kind==="quad"){const d1=seqDiffs(a),d2=seqDiffs(d1);
          for(const x of d2)if(x!==dg.d2)okAll=false}
        if(!okAll)bad.push(k+':'+JSON.stringify(a));
      }
    }
    return{checked:checked,bad:bad};
  });
  ok(r.checked>=90,'فُحصت '+r.checked+' متتالية');
  ok(r.bad.length===0,'وكلُّ قاعدةٍ مستنتَجة تنطبق على حدودها — '+(r.bad[0]||'نظيف'));
}

console.log('\n٣) قيود الأدبيات الثلاثة حاضرة في كل مقطع');
{
  const r=await p.evaluate(()=>{
    const gens={gArith,gGeo,fDouble,fTriple,fFib,fSq};
    const out={noCheck:[],noLabel:[],noApply:[],n:0,sample:null};
    for(const k in gens){
      for(let t=0;t<8;t++){
        const q=gens[k]();const c=clipSeqBuild(q);
        if(!c){out.noCheck.push(k+':لم يُبنَ');continue}
        out.n++;
        const all=c.steps.join(" ");
        // Stacey: خطوة تحقّقٍ على كل الحدود، لقطةٌ قائمة بذاتها
        if(!c.steps.some(function(s){return /جرّبي القاعدة على كل الحدود/.test(s)}))out.noCheck.push(k);
        // Catrambone: اسمٌ لكل هدفٍ فرعي بين معقوفين
        if(!c.steps.every(function(s){return /\[[^\]]+\]/.test(s)}))out.noLabel.push(k);
        // والخطوة الأولى دائماً الفروق — الاختبار الأوّل في الإجراء المعياري
        if(!/اطرحي كل حدٍّ ممّا قبله/.test(c.steps[0]))out.noApply.push(k);
        if(!out.sample)out.sample=c.steps.map(function(s){return s.replace(/<[^>]*>/g,'')});
      }
    }
    return out;
  });
  ok(r.n>=40,'بُني '+r.n+' مقطعاً');
  ok(r.noCheck.length===0,'ولكلٍّ خطوةُ تحقّقٍ على كل الحدود (Stacey) — '+(r.noCheck[0]||'الكلّ'));
  ok(r.noLabel.length===0,'ولكل لقطةٍ اسمُ هدفٍ فرعي (Catrambone) — '+(r.noLabel[0]||'الكلّ'));
  ok(r.noApply.length===0,'وتبدأ كلُّها بالفروق — الاختبار الأوّل في الإجراء');
}

console.log('\n٤) والمقطع من أرقام السؤال نفسه — العيب الذي رُصد بلقطة الشاشة');
{
  const r=await p.evaluate(()=>{
    const q=fSq();                        // مربّعات
    const c=clipSeqBuild(q);
    const txt=c.steps.join(" ").replace(/<[^>]*>/g,"");
    return{
      // أرقام السؤال نفسها تظهر في الشرح
      hasOwn:q.pat.every(function(x){return txt.indexOf(toAr(x))>=0}),
      // ولا يؤكّد جمعاً ثابتاً لمتتالية مربّعات
      claimsAdd:/القاعدة <b>جمعٌ ثابت|القاعدة جمعٌ ثابت/.test(c.steps.join(" ")),
      says:/فرقٌ متزايد بانتظام/.test(c.steps.join(" ")),
      pat:q.pat
    };
  });
  ok(r.hasOwn===true,'أرقام السؤال نفسها في الشرح — '+JSON.stringify(r.pat));
  ok(r.claimsAdd===false,'ولا يؤكّد «جمعٌ ثابت» لمتتالية مربّعات (وهو ما وقع قبل الإصلاح)');
  ok(r.says===true,'بل يسمّي عائلتها الصحيحة');
}

console.log('\n٥) الاتّجاه: لا سطرَ على الشكل المكسور (عربية + لاتيني + ذيلٌ رقميّ صرف)');
{
  const r=await p.evaluate(()=>{
    const gens={gArith,gGeo,fDouble,fTriple,fFib,fSq};
    const bad=[];let n=0;
    for(const k in gens)for(let t=0;t<10;t++){
      const c=clipSeqBuild(gens[k]());if(!c)continue;
      c.steps.concat([c.rule,c.q]).forEach(function(s){
        String(s).split(/<br>/).forEach(function(seg){
          const t2=seg.replace(/<[^>]*>/g,"");n++;
          // الشكل المُثبَت انقلابُه ٢٥ أغسطس: عربية + رمزٌ لاتيني + ذيلٌ رقميٌّ صرف
          if(/[؀-ۿ]/.test(t2)&&/[A-Za-z]/.test(t2)&&/[0-9٠-٩]\s*$/.test(t2))bad.push(t2);
        });
      });
    }
    return{n:n,bad:[...new Set(bad)]};
  });
  ok(r.n>0,'فُحص '+r.n+' سطراً');
  ok(r.bad.length===0,'ولا سطرَ على الشكل المكسور — '+(r.bad[0]||'نظيف'));
}

console.log('\n٦) الزرّ يظهر للمتتاليات ويُفتح من السؤال الجاري');
{
  const r=await p.evaluate(()=>{
    clipOn=null;clipStep=0;
    const seq=fDouble(),other=gCube();
    return{seq:clipButtonHTML(seq).indexOf('clipOpenSeq')>=0,
           other:clipButtonHTML(other).indexOf('clipOpenSeq')>=0,
           otherHasTopic:clipButtonHTML(other).indexOf('clipOpen(')>=0};
  });
  ok(r.seq===true,'يظهر لسؤال المتتالية');
  ok(r.other===false,'ولا يظهر لسؤال المكعّب');
  ok(r.otherHasTopic===true,'والمكعّب يبقى على مقطع موضوعه');
  // والفتح من السؤال الجاري لا من جدول الربط
  await p.evaluate(()=>{mode="quiz";filtered=[fFib()];idx=0;clipOn=null;clipOpenSeq()});
  await p.waitForTimeout(350);
  const built=await p.evaluate(()=>clipOn&&clipOn.key);
  ok(built==='seqproc','ويُبنى مقطعُ الإجراء — '+built);
  const row=logs.filter(x=>x&&x.qtype==='clip_open').pop();
  ok(row&&/seqproc/.test(String(row.response||'')),'ويُسجَّل باسمه — '+(row&&row.response));
}

await b.close();
console.log(fails?`\n=== ${fails} فشل ===`:'\n=== كل الاختبارات نجحت ===');
process.exit(fails?1:0);
})();
