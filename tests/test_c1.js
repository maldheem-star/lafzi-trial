// طبقة C1 — المستوى الجامعي فوق B2، ١٣ سبتمبر.
//
// طلب صاحب المشروع: «أضف: مستوًى جامعيّ، أصعب من B2». والاسم معياريّ (درجة CEFR فوق
// B2) لا مخترَع، والنصوص ملكٌ عامّ من VOA قيست صعوبتها بـFlesch-Kincaid (FK ١١-١٣٫٢).
//
// **وما يحرسه هذا الملفّ سلوكٌ لا ثوابت**: أن C1 لا تصل طالب B2 إلّا ببوّابة التمدّد،
// وأن مستوى محمد الأساس لم يتغيّر، وأن كل عنصرٍ يلتزم معيار كتابة الاختيار من متعدد
// (Haladyna, Downing & Rodriguez 2002). فلا ينكسر برفع مستوًى لاحق ولا بعنصرٍ يُضاف.
const {chromium}=require('/opt/node22/lib/node_modules/playwright');
let fails=0;const ok=(c,m)=>{console.log((c?'  ✓ ':'  ✗ FAIL ')+m);if(!c)fails++};

(async()=>{
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'});
const page=await b.newPage({viewport:{width:420,height:900}});
page.on('pageerror',e=>{console.log('  ✗ PAGEERROR '+e.message);fails++});
await page.goto('http://127.0.0.1:8931/index.html?p=mohammed');
await page.waitForFunction(()=>typeof bankStretched==='function'&&typeof LISTEN_BANK!=='undefined');

console.log('\n١) الطبقة موجودةٌ في البنكين، وأكبر من جلسةٍ واحدة مضمومةً إلى B2');
{
  const r=await page.evaluate(()=>({
    ls:LISTEN_BANK.filter(x=>x.lv==='C1').length,
    rd:READ_BANK.filter(x=>x.lv==='C1').length,
    lsB2:LISTEN_BANK.filter(x=>x.lv==='B2').length,
    rdB2:READ_BANK.filter(x=>x.lv==='B2').length,
    lsN:LISTEN_N, rdN:READ_N
  }));
  ok(r.ls>0&&r.rd>0,`الاستماع ${r.ls} والمقروء ${r.rd} عنصر C1`);
  // التمدّد إضافةٌ لا استبدال، فالمخزون الفعلي B2+C1 — وهو ما يُقاس لا الطبقة وحدها
  ok(r.ls+r.lsB2>=r.lsN*2,`مخزون الاستماع للممتدّ ${r.ls+r.lsB2} ≥ ضِعف الجلسة (${r.lsN})`);
  ok(r.rd+r.rdB2>=r.rdN*2,`مخزون المقروء للممتدّ ${r.rd+r.rdB2} ≥ ضِعف الجلسة (${r.rdN})`);
}

console.log('\n٢) ولا تصل طالب B2 قبل أن تُفتح البوّابة — وهذا جوهر الطلب');
{
  const r=await page.evaluate(()=>{
    const st=JSON.parse(lsGet('mawhiba_acc_v1')||'{}');
    delete st['_on_listen'];delete st['_on_read'];st.listen=[];st.read=[];
    lsSet('mawhiba_acc_v1',JSON.stringify(st));
    const L=bankStretched('listen','B2',listenBankFor).filter(x=>x.lv==='C1').length;
    const R=bankStretched('read','B2',readBankFor).filter(x=>x.lv==='C1').length;
    const decl=(PROFILES.filter(function(p){return p.id==='mohammed'})[0]||{}).level;
    return {L,R,lvl:profileOf().level,decl:decl,rankOk:Number.isFinite(ENG_LV_RANK[decl])};
  });
  // **لا تُكتَب درجةٌ هنا** — درس ٨ سبتمبر: «الدرجات المكتوبة في الاختبارات فخّ صامت»
  // كالأعداد سواءً، فتنكسر مع أيّ رفعٍ مشروع. المقيس: أن المعروض هو المُعلَن في PROFILES.
  ok(r.lvl===r.decl,`مستوى محمد المعروض = المُعلَن في PROFILES (${r.decl}) — المستوى يُقاس لا يُفترَض`);
  ok(r.L===0&&r.R===0,'وبوّابةٌ مغلقة عند B2 ⇒ صفر عنصر C1 في المخزون');
  // والحقيقة المقاسة ١٣ سبتمبر: محمد B1 لا B2، فC1 لا يبلغها أحدٌ اليوم — يُقال ولا يُخفى
  ok(r.rankOk,'ومستواه المُعلَن له رتبةٌ معروفة — فلا NaN يحجب عنه كل شيء');
}

console.log('\n٣) وتصل حين تُفتح — ٨٥٪ على ≥٨ إجابات، بنفس البوّابة القائمة لا بآليةٍ جديدة');
{
  const r=await page.evaluate(()=>{
    const st=JSON.parse(lsGet('mawhiba_acc_v1')||'{}');
    st.listen=[1,1,1,1,1,1,1,1,1,1,1,0];st.read=st.listen.slice();  // ٩٢٪ فوق ٠٫٨٥
    delete st['_on_listen'];delete st['_on_read'];
    lsSet('mawhiba_acc_v1',JSON.stringify(st));
    const L=bankStretched('listen','B2',listenBankFor);
    const R=bankStretched('read','B2',readBankFor);
    return {c1L:L.filter(x=>x.lv==='C1').length,b2L:L.filter(x=>x.lv==='B2').length,
            c1R:R.filter(x=>x.lv==='C1').length,b2R:R.filter(x=>x.lv==='B2').length};
  });
  ok(r.c1L>0&&r.c1R>0,`فُتحت: ${r.c1L} استماع و${r.c1R} مقروء من C1`);
  ok(r.b2L>0&&r.b2R>0,'وبنك B2 باقٍ معها — إضافةٌ لا استبدال');
}

console.log('\n٤) ولا تصل A1/A2/B1 إطلاقاً — فالتمدّد درجةٌ واحدة لا قفزة');
{
  const r=await page.evaluate(()=>{
    const st=JSON.parse(lsGet('mawhiba_acc_v1')||'{}');
    st.listen=[1,1,1,1,1,1,1,1,1,1,1,1];st.read=st.listen.slice();   // ١٠٠٪
    delete st['_on_listen'];delete st['_on_read'];
    lsSet('mawhiba_acc_v1',JSON.stringify(st));
    const out={};
    ['A1','A2','B1'].forEach(L=>{
      out[L]=bankStretched('listen',L,listenBankFor).filter(x=>x.lv==='C1').length
           + bankStretched('read',L,readBankFor).filter(x=>x.lv==='C1').length;
    });
    return out;
  });
  ok(r.A1===0&&r.A2===0&&r.B1===0,`صفر عنصر C1 عند A1/A2/B1 رغم ١٠٠٪ (${r.A1}/${r.A2}/${r.B1})`);
}

console.log('\n٥) والرتبة لا تُنتج NaN — الثقب الذي وقع فعلاً حين نقص B2 (٢٥ أغسطس)');
{
  const r=await page.evaluate(()=>({
    c1:ENG_LV_RANK['C1'], nan:!Number.isFinite(ENG_LV_RANK['C1']+1),
    order:ENG_LV_RANK['C1']>ENG_LV_RANK['B2']
  }));
  ok(!r.nan,'ENG_LV_RANK["C1"] عددٌ منتهٍ لا undefined');
  ok(r.order,'وفوق B2 رتبةً');
}

console.log('\n٦) سلامة كل عنصر — والفحص على البنك كلّه لا على عددٍ مكتوب');
{
  const r=await page.evaluate(()=>{
    const AR=/[ء-غف-ي]/;
    const all=LISTEN_BANK.filter(x=>x.lv==='C1').map(x=>({x,t:x.audio}))
      .concat(READ_BANK.filter(x=>x.lv==='C1').map(x=>({x,t:x.passage})));
    const bad=[];
    all.forEach(function(o){
      const x=o.x,p=[];
      if(!o.t||o.t.length<120)p.push('نصٌّ قصير');
      if(!x.c||x.c.length!==3)p.push('خيارات');
      if(!(x.a>=0&&x.a<(x.c||[]).length))p.push('a');
      if(!x.sk)p.push('بلا مهارة');
      if(!x.src)p.push('بلا مصدر');
      if(AR.test(o.t)||AR.test(x.q)||(x.c||[]).some(function(c){return AR.test(c)}))p.push('تلوّثٌ عربي');
      if(p.length)bad.push(x.id+':'+p.join('/'));
    });
    const pos={};all.forEach(function(o){pos[o.x.a]=(pos[o.x.a]||0)+1});
    // المفتاح ليس أطول الخيارات بفارقٍ فاضح — دليلُ طولٍ معروف عند Haladyna
    const longKey=all.filter(function(o){
      const L=o.x.c.map(function(c){return c.length});
      return L[o.x.a]===Math.max.apply(null,L)&&L[o.x.a]-Math.min.apply(null,L)>14;
    }).map(function(o){return o.x.id});
    return {n:all.length,bad:bad,pos:pos,longKey:longKey};
  });
  ok(r.bad.length===0,'كل عنصرٍ: نصٌّ كافٍ · ٣ خيارات · a صالح · مهارة · مصدر · بلا عربية'+(r.bad.length?' — '+r.bad.join(' | '):''));
  const P=Object.keys(r.pos).length;
  ok(P>=3,`موضع الصواب موزَّع على ${P} مواضع لا واحداً — ${JSON.stringify(r.pos)}`);
  const mx=Math.max.apply(null,Object.keys(r.pos).map(function(k){return r.pos[k]}));
  ok(mx<=r.n*0.5,`ولا موضعَ يبتلع أكثر من نصف العناصر (الأكثر ${mx} من ${r.n})`);
  ok(r.longKey.length===0,'ولا مفتاحَ أطول الخيارات بفارقٍ يدلّ عليه'+(r.longKey.length?' — '+r.longKey.join(','):''));
}

console.log('\n٧) ومصدرُ العنصر يدخل السجلّ — وإلّا لا يُقاس قرار «ادمج الاثنين»');
{
  const r=await page.evaluate(()=>({
    voa:srcTag({src:'VOA'}), plain:srcTag({}), none:srcTag(null),
    front:srcTag({src:'VOA'}).indexOf('[')===0
  }));
  ok(/VOA/.test(r.voa),'المنقول يحمل وسمه — '+r.voa.trim());
  ok(r.plain===''&&r.none==='','والمؤلَّف بلا وسمٍ كما كان — فلا ينكسر استعلامٌ قائم');
  ok(r.front,'والوسم في الصدر فينجو من قصّ الـ١٢٠٠ محرف');
}

console.log('\n٨) وجلسةٌ حقيقية لطالب B2 ممتدّ تعمل بلا كسر');
{
  // **يُحاكى طالب B2 صراحةً ولا يُتّكَأ على ملفّ محمد** — وهو B1 فعلاً (مقاسٌ ١٣ سبتمبر،
  // خلافاً لِما كان مكتوباً في ذاكرة المشروع). واتّكاءُ الاختبار على ملفٍّ قد يتغيّر
  // يجعله يتقلّب بتغييرٍ مشروع، وهو أسوأ من سقوطٍ ثابت (درس ٥ سبتمبر).
  const r=await page.evaluate(()=>{
    const st=JSON.parse(lsGet('mawhiba_acc_v1')||'{}');
    st.read=[1,1,1,1,1,1,1,1,1,1,1,0];delete st['_on_read'];
    lsSet('mawhiba_acc_v1',JSON.stringify(st));
    const POOL=bankStretched('read','B2',readBankFor);
    const N=Math.min(READ_N,POOL.length);
    const out=planNewMix([],shuffle(POOL.slice()),N);
    return {n:out.length,c1:out.filter(x=>x.lv==='C1').length,lv:[...new Set(out.map(x=>x.lv))]};
  });
  ok(r.n>0,`الجلسة بُنيت (${r.n} عنصراً)`);
  ok(r.c1>0,`وفيها عناصر C1 فعلاً (${r.c1})`);
  ok(r.lv.every(l=>l==='B2'||l==='C1'),'ولا عنصرَ دون B2 — '+r.lv.join(','));
}

console.log(fails?`\n=== ${fails} فشل ===`:'\n=== كل الاختبارات نجحت ===');
await b.close();process.exit(fails?1:0);
})();
