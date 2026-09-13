// إلياس A2 ⇐ B1 — ٨ سبتمبر، أمر صاحب المشروع ومعه سندٌ مقاس.
//
// **لماذا لا يكفي تغييرُ سطرٍ في `PROFILES`**: الرفع لا ينفع إن كان بنكٌ واحد بلا
// طبقة B1، أو إن بقيت دالّةُ بنكٍ تُطابق A2 بطريقٍ آخر. ودرسُ ٢٥ أغسطس وقع حرفياً
// على هذا: `ENG_BUILD` أُعلن «مبنيٌّ بحسب المستوى — لا تغيير»، وكان **بلا طبقة A1
// أصلاً** وبوسومٍ تناقض المعيار. فيُفحَص كل بنكٍ يراه إلياس، لا سطرُ الملفّ الشخصي.
//
// **وما يتغيّر بالرفع**: قاعُه B1 مطابقةً، وبوّابة التمدّد (`bankStretched`) تفتح له
// **B2** بدل B1 — فيُتحقَّق أن الطبقة الأعلى موجودةٌ فعلاً في كل بنك، وإلّا صار
// التمدّد وعداً لا يُنفَّذ.
const {chromium}=require('/opt/node22/lib/node_modules/playwright');
let fails=0;const ok=(c,m)=>{console.log((c?'  ✓ ':'  ✗ FAIL ')+m);if(!c)fails++};
(async()=>{
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'});
const mk=async(f)=>{
  const ctx=await b.newContext({viewport:{width:420,height:900}});
  const p=await ctx.newPage();
  p.on('pageerror',e=>{console.log('  ✗ PAGEERROR '+e.message);fails++});
  await p.route('**/rest/v1/**',r=>r.fulfill({status:201,contentType:'application/json',body:'[]'}));
  await p.route('**/functions/v1/**',r=>r.fulfill({status:200,contentType:'application/json',body:'{"ok":true}'}));
  await p.goto('http://127.0.0.1:8931/'+f);
  await p.waitForFunction(()=>typeof profileOf==='function');
  return p;
};

console.log('\n١) الملفّ الشخصي — والعمر لم يُمَسّ');
const p=await mk('elias.html');
{
  const r=await p.evaluate(()=>{const x=profileOf();return{lv:x.level,age:x.age,g:x.g,only:x.only}});
  ok(r.lv==='B1','مستواه B1 · '+r.lv);
  ok(r.age===18,'وعمره ١٨ كما هو — العمر والمستوى حقلان منفصلان عمداً · '+r.age);
  ok(r.g==='m'&&r.only==='coach','وبقيّة ملفّه بلا تغيير');
}

console.log('\n٢) كل بنكٍ يراه يُعطيه B1 فعلاً — لا سطرَ ملفٍّ بلا أثر');
{
  const r=await p.evaluate(()=>{
    const out={};
    const chk=(name,fn)=>{
      try{
        const a=fn('B1')||[];
        out[name]={n:a.length, lv:[...new Set(a.map(x=>String(x.lv||'')))].sort().join('/')};
      }catch(e){out[name]={err:String(e).slice(0,40)}}
    };
    chk('listen',listenBankFor); chk('read',readBankFor); chk('gram',gramBankFor);
    chk('step',stepBankFor);     chk('minpair',minpairBankFor);
    chk('video',videoBankFor);   chk('write',writeBankFor);
    return out;
  });
  for(const k of Object.keys(r)){
    const v=r[k];
    ok(!v.err&&v.n>0,'بنك '+k+' غيرُ فارغ لـB1 · '+(v.err||v.n+' عنصراً · مستويات: '+v.lv));
  }
}

console.log('\n٣) وبوّابة التمدّد تفتح له B2 — والطبقة موجودةٌ فعلاً');
{
  const r=await p.evaluate(()=>{
    const out={next:(typeof LV_NEXT!=='undefined')?LV_NEXT['B1']:null,banks:{}};
    const chk=(name,fn)=>{try{
      const up=(fn('B2')||[]).filter(x=>String(x.lv||'')==='B2');
      out.banks[name]=up.length;
    }catch(e){out.banks[name]=-1}};
    chk('listen',listenBankFor); chk('read',readBankFor); chk('gram',gramBankFor);
    chk('step',stepBankFor);     chk('minpair',minpairBankFor);
    chk('video',videoBankFor);   chk('write',writeBankFor);
    return out;
  });
  ok(r.next==='B2','الدرجة الأعلى من B1 هي B2 · '+r.next);
  const empty=Object.keys(r.banks).filter(k=>r.banks[k]<=0);
  ok(empty.length===0,'ولا بنكَ بلا طبقة B2 — فالتمدّد وعدٌ يُنفَّذ · '
    +JSON.stringify(r.banks)+(empty.length?' فارغ: '+empty.join(','):''));
}

console.log('\n٤) جلسةٌ حقيقية: لا عنصر A2 بعد اليوم (بلا تمدّد)');
{
  const r=await p.evaluate(()=>{
    // تصفيرُ حالة التمدّد فيُقاس القاعُ وحده لا القاعُ+الأعلى
    try{Object.keys(localStorage).filter(k=>/acc/i.test(k)).forEach(k=>localStorage.removeItem(k))}catch(e){}
    const bad={};
    [['listen',buildListenPlan],['read',buildReadPlan],['gram',buildGramPlan],
     ['step',buildStepPlan],['minpair',buildMinpairPlan],['video',buildVideoPlan]]
    .forEach(function(pair){
      const seen={};
      for(let i=0;i<10;i++)(pair[1]()||[]).forEach(function(x){
        const l=String(x.lv||'');if(l)seen[l]=(seen[l]||0)+1;
      });
      bad[pair[0]]=seen;
    });
    return bad;
  });
  for(const k of Object.keys(r)){
    const lv=r[k], low=(lv['A1']||0)+(lv['A2']||0);
    ok(low===0,k+': صفرُ عناصر دون B1 في عشر جلسات · '+JSON.stringify(lv));
  }
}

console.log('\n٥) ولا انحدار: هيا ومحمد كما هما');
{
  // **لا تُكتب درجةٌ هنا** — محمد رُفع B1⇐B2 (١٣ سبتمبر) فكسر هذا السطر.
  // والدعوى أن رفعَ إلياس لم يمسّ غيره: كلُّ صفحةٍ تعرض درجةَ صاحبها المُعلَنة
  // في PROFILES — تُشتقّ من مصدرها الحيّ لا تُكتب رقماً يبيد مع أوّل رفعٍ قادم.
  for(const [f,id] of [['index.html','haya'],['mohammed.html','mohammed']]){
    const q=await mk(f);
    const r=await q.evaluate(who=>({lv:profileOf().level,
      decl:(PROFILES.filter(p=>p.id===who)[0]||{}).level}),id);
    ok(r.lv===r.decl,f+' ⇐ '+r.lv+' = المُعلَن');
    await q.context().close();
  }
  const miss=await p.evaluate(()=>censusMissing());
  ok(miss.length===0,'ولا دالّة مفقودة — '+miss.join(','));
}

await b.close();
console.log(fails?`\n=== ${fails} فشل ===`:'\n=== كل الاختبارات نجحت ===');
process.exit(fails?1:0);
})();
