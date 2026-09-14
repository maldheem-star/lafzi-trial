// شحنة ١٤ سبتمبر — خلطُ مواضع الاستماع/المقروء، وبوّابةُ مطابقة الفعل بالفاعل.
//
// ١) الاستماع/المقروء كانا وحدهما بلا خلط مواضع، فيقع الصواب في الموضع الثالث ٨٪ بدل
//    ٣٣٪ على ٢٦٥ عنصراً مولَّداً — ومن يحفظ الموضع يُصيب بلا فهم.
// ٢) وأربعُ زلّاتٍ بآليةٍ واحدة في جلسة هيا ١٣ سبتمبر (٠/٥) لم تُسلِّح شيئاً، لأن
//    التسليح كان على **العنصر** والخطأ يعبر العناصر.
//
// **وما يحرسه هذا الملفّ سلوكٌ لا ثوابت**: توزيعٌ يُقاس لا رقمٌ يُكتب، وحالاتٌ حقيقية
// من `mawhiba_answer_log` بنصّها، وخطابٌ يُفحَص في الاتّجاهين معاً.
const {chromium}=require('/opt/node22/lib/node_modules/playwright');
let fails=0;const ok=(c,m)=>{console.log((c?'  ✓ ':'  ✗ FAIL ')+m);if(!c)fails++};

(async()=>{
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'});
const page=await b.newPage({viewport:{width:420,height:900}});
page.on('pageerror',e=>{console.log('  ✗ PAGEERROR '+e.message);fails++});
await page.goto('http://127.0.0.1:8931/index.html');
await page.waitForFunction(()=>typeof mcOrder==='function'&&typeof agreeSlip==='function');

console.log('\n١) المواضع تُخلَط فعلاً — والتوزيع يُقاس لا يُدَّعى');
{
  const r=await page.evaluate(()=>{
    const it={c:["a","b","c"],a:0};
    const pos={},N=300;
    for(let i=0;i<N;i++){const o=mcOrder(it);pos[o.indexOf(it.a)]=(pos[o.indexOf(it.a)]||0)+1}
    return {pos,N,len:mcOrder(it).length,uniq:new Set(mcOrder(it)).size};
  });
  ok(r.len===3&&r.uniq===3,'الترتيب تبديلٌ كامل بلا تكرارٍ ولا نقص');
  // كل موضعٍ يقارب الثلث — والمدى واسعٌ عمداً فلا يتقلّب الاختبار بالقرعة
  const share=[0,1,2].map(i=>(r.pos[i]||0)/r.N);
  ok(share.every(s=>s>=0.25&&s<=0.42),
    `الصواب يتوزّع على المواضع الثلاثة: ${share.map(s=>Math.round(s*100)+'٪').join(' · ')}`);
}

console.log('\n٢) وonclick يمرّر الفهرس الأصلي — فلا يتغيّر حساب الصواب');
{
  const r=await page.evaluate(()=>{
    const it={c:["W","X","Y"],a:2};
    const ord=[2,0,1];
    return {
      // الموضع المعروض للصواب = ١، والمختار (الفهرس ١ = "X") في الموضع ٣
      log:posLog(ord,it,1),
      fallback:ordFor([],it).join(","),
      keep:ordFor(ord,it).join(",")
    };
  });
  ok(/موضع ٣/.test(r.log)&&/الصواب موضع ١/.test(r.log)&&/X$/.test(r.log),
    'السطر يحمل موضع الاختيار وموضع الصواب ونصّه: '+r.log);
  ok(r.fallback==='0,1,2','وبلا خلطٍ يسقط إلى الترتيب الطبيعي — لا شاشة فارغة');
  ok(r.keep==='2,0,1','وبخلطٍ صالح يُحترم كما هو');
}

console.log('\n٣) وسطرُ العنصر المولَّد يُكتب بترتيب العرض لا بترتيب البنك');
{
  const r=await page.evaluate(()=>{
    const it={ai:true,q:"Q?",passage:"P.",c:["W","X","Y"],a:2};
    return {shown:genLogText(it,[2,0,1]),plain:genLogText(it)};
  });
  ok(/1\) Y ✓/.test(r.shown),'الصواب في الموضع الأوّل كما عُرض فعلاً');
  ok(/3\) X/.test(r.shown),'والثالث هو الثالث المعروض');
  ok(/3\) Y ✓/.test(r.plain),'وبلا ترتيبٍ يبقى السلوك القديم — فلا ينكسر نداءٌ قائم');
}

console.log('\n٤) جلسة استماعٍ حقيقية بنقراتٍ فعلية: النقر يختار ما نُقر عليه');
{
  await page.evaluate(()=>{try{lsSet('mawhiba_listen_srs','{}')}catch(e){}});
  const r=await page.evaluate(async()=>{
    const rows=[];const orig=window.logAnswer;
    window.logAnswer=function(d,q,c,resp,id,ms,ex){rows.push({d,c,resp});if(orig)orig.apply(null,arguments)};
    startListen();
    let clicks=0,matched=0;
    for(let n=0;n<8&&!listenDone;n++){
      const it=listenCur();if(!it)break;
      const ord=ordFor(listenOrder,it);
      // اضغط زرّ الخيار **الصحيح كما هو معروض** — الموضع يتغيّر كل جولة
      const k=ord.indexOf(it.a);
      gateLeft=0;gateStop();               // كما ينتظر المتعلّم انقضاء بوّابة التسرّع
      listenChoose(ord[k]);clicks++;
      if(listenPicked===it.a)matched++;
      if(!listenDone)listenNext();
    }
    window.logAnswer=orig;
    return {clicks,matched,rows:rows.filter(x=>x.d==='listen'),score:listenScore};
  });
  ok(r.clicks>=5,`جلسةٌ كاملة: ${r.clicks} نقرة`);
  ok(r.matched===r.clicks,'كل نقرةٍ على الزرّ المعروض اختارت خيارَه هو');
  ok(r.rows.length===r.clicks&&r.rows.every(x=>x.c===true),
    'وكلُّها سُجِّلت صواباً — فالخلط لا يكسر حساب الدرجة');
  ok(r.rows.every(x=>/^موضع .+ · الصواب موضع /.test(x.resp)),
    'وكلُّ سطرٍ يحمل موضعه وموضع الصواب');
}

console.log('\n٥) والكاشف: حالاتٌ حقيقية من سجلّ ١٣ سبتمبر بنصّها حرفاً بحرف');
{
  const r=await page.evaluate(()=>{
    const C=[
      ["He is happy today.","He am happy today.","agree_verb"],
      ["He is happy today.","He are happy today.","agree_verb"],
      ["Haya is in the mountains near Abha.","Haya are in the mountains near Abha.","agree_verb"],
      ["Misfer can swim very well.","Misfer cans swim very well.","agree_verb"],
      ["Misfer can swim very well.","Misfer can swims very well.","agree_verb"],
      ["Hanan and Misfer go to the mountains in Abha.","Hanan and Misfer goes to the mountains in Abha.","agree_verb"],
      ["My sister goes to school every day.","My sister go to school every day.","agree_verb"],
      ["While I was studying, my brother was watching TV.","While I were studying, my brother was watching TV.","agree_verb"],
      // AGN: تغيّر الاسمُ لا الفعل — فلا يُسلَّح تذكيرُ الفعل عليه
      ["My sister goes to school every day.","My sisters goes to school every day.","agree_noun"],
      ["Hanan helps her grandmother in Jeddah.","Hanan helps her grandmothers in Jeddah.","agree_noun"],
      ["I have three books in my bag.","I have three book in my bag.","agree_noun"],
      ["Hanan helps her grandmother in Jeddah.","Hanans helps her grandmother in Jeddah.","agree_noun"],
      // بلا اسم: زمنٌ، وحرفُ جرّ، وصيغةٌ، وحذفٌ — لا بلاغَ كاذباً
      ["She must have forgotten her keys.","She must had forgotten her keys.",null],
      ["If I don't help my family, I will feel bad.","If I didn't help my family, I will feel bad.",null],
      ["He is happy today.","He happy today.",null],
      ["The man who called me is my teacher.","The man which called me is my teacher.",null],
      ["Haya found her lost cat in the park near Jeddah.","Haya found her lost cat at the park near Jeddah.",null],
      ["While I was studying, my brother was watching TV.","While I was study, my brother was watching TV.",null],
      ["I have three books in my bag.","I have three the books in my bag.",null],
      ["If it rains, I will stay home.","If it will rains, I will stay home.",null],
      ["The reactor needs to be designed carefully.","The reactor need to be design carefully.",null],
      ["This is my brother's book.","This is my brothers book.",null]
    ];
    return C.map(c=>({w:c[1],got:agreeSlip(c[0],c[1]),want:c[2]}));
  });
  const bad=r.filter(x=>x.got!==x.want);
  bad.forEach(x=>console.log(`    · «${x.w}» ⇐ ${x.got} والمتوقَّع ${x.want}`));
  ok(bad.length===0,`${r.length} من ${r.length} حالة حقيقية مطابقةٌ للحكم اليدوي`);
  ok(r.filter(x=>x.want===null).every(x=>x.got===null),'وصفرُ بلاغٍ كاذب على ما ليس مطابقة');
  ok(r.filter(x=>x.got==='agree_verb').length===8,'ثمانيةٌ منها مطابقةُ فعلٍ فعلاً');
}

console.log('\n٦) التسليح على الآلية لا على العنصر — وهو جوهر الإصلاح');
{
  const r=await page.evaluate(()=>{
    const rows=[];const orig=window.logAnswer;
    window.logAnswer=function(d,q,c,resp){rows.push({d,c,resp});};
    try{lsSet('mawhiba_basics_shape_v1','{}');lsSet('mawhiba_gram_srs','{}')}catch(e){}
    startGram();
    const out={armedAfter:[],picks:[]};
    // أخطئ بزلّة مطابقةٍ حيثما أتيحت — عناصر مختلفة، آليةٌ واحدة
    let hit=0;
    for(let n=0;n<12&&!gramDone&&hit<2;n++){
      const it=gramCur();if(!it)break;
      const right=(it.c.find(c=>c.ok)||{}).t;
      const k=it.c.findIndex(c=>!c.ok&&agreeSlip(right,c.t)==='agree_verb');
      if(k>=0){gateLeft=0;gateStop();gramChoose(k);hit++;out.picks.push(it.id);out.armedAfter.push(shapeArmed('gram:agv'))}
      if(!gramDone)gramNext();
    }
    window.logAnswer=orig;
    return Object.assign(out,{rows,sameItem:out.picks.length===2&&out.picks[0]===out.picks[1],
      itemArmed:out.picks.length?shapeArmed('gram:'+out.picks[0]):null});
  });
  ok(r.picks.length===2,`زلّتان في عنصرين: ${r.picks.join(' · ')}`);
  ok(r.sameItem===false,'وهما عنصران مختلفان — فالتسليح على العنصر لا يقع أصلاً');
  ok(r.itemArmed===false,'ولم يُسلَّح مفتاحُ العنصر (أُخطئ مرّةً واحدة)');
  ok(r.armedAfter[0]===false&&r.armedAfter[1]===true,'وتسلّح مفتاحُ الآلية عند الثانية لا الأولى');
  ok(r.rows.some(x=>/agree_verb/.test(x.resp)),'والآلية تدخل السطر باسمها: '+
    (r.rows.filter(x=>/agree_verb/.test(x.resp))[0]||{}).resp);
}

console.log('\n٧) والتذكير يظهر حيث الفخُّ معروض، ويغيب حيث لا فخّ');
{
  const r=await page.evaluate(()=>{
    const withTrap={id:"t1",lv:"A1",c:[{t:"He is happy.",ok:true,why:"w"},{t:"He am happy.",why:"w"},
      {t:"He happy.",why:"w"},{t:"He being happy.",why:"w"}]};
    const noTrap={id:"t2",lv:"A1",c:[{t:"I have three books.",ok:true,why:"w"},{t:"I have three book.",why:"w"},
      {t:"I have three the books.",why:"w"},{t:"I have books three.",why:"w"}]};
    gramLocked=false;
    try{lsSet('mawhiba_basics_shape_v1',JSON.stringify({'gram:agv':3}))}catch(e){}
    return {
      offered:gramAgvOffered(withTrap),notOffered:gramAgvOffered(noTrap),
      hintTrap:gramArmedHint(withTrap).indexOf('مطابقةُ الفعل')>=0,
      hintNo:gramArmedHint(noTrap)===""
    };
  });
  ok(r.offered===true&&r.notOffered===false,'الفخُّ يُكشَف من الخيارات المعروضة نفسها');
  ok(r.hintTrap,'والتذكير يظهر على عنصرٍ فيه الفخّ');
  ok(r.hintNo,'ويغيب عن عنصرٍ خطؤه عددُ اسمٍ لا مطابقةُ فعل — فلا يُعلَّم خطأً');
}

console.log('\n٨) وينحلّ بصوابٍ على عنصرٍ أتيحت فيه الزلّة — لا بأيّ صواب');
{
  const r=await page.evaluate(()=>{
    const trap={id:"t1",c:[{t:"He is happy.",ok:true,why:"w"},{t:"He am happy.",why:"w"},
      {t:"He happy.",why:"w"},{t:"He being happy.",why:"w"}]};
    const plain={id:"t3",c:[{t:"I have a red car.",ok:true,why:"w"},{t:"I have red a car.",why:"w"},
      {t:"I have a car red.",why:"w"},{t:"I have car a red.",why:"w"}]};
    const sim=function(it,ok){
      const right=(it.c.find(c=>c.ok)||{}).t;
      const i=ok?it.c.findIndex(c=>c.ok):it.c.findIndex(c=>!c.ok&&agreeSlip(right,c.t)==='agree_verb');
      const slip=ok?null:agreeSlip(right,it.c[i].t);
      if(slip==='agree_verb')shapeRecord('gram:agv',true);
      else if(ok&&gramAgvOffered(it))shapeRecord('gram:agv',false);
    };
    try{lsSet('mawhiba_basics_shape_v1','{}')}catch(e){}
    sim(trap,false);sim(trap,false);
    const armed=shapeArmed('gram:agv');
    sim(plain,true);                       // صوابٌ بلا فخّ: لا يُحلّ شيئاً
    const afterPlain=shapeArmed('gram:agv');
    sim(trap,true);                        // صوابٌ على عنصرٍ فيه الفخّ: يُنقص
    const afterTrap=shapeArmed('gram:agv');
    return {armed,afterPlain,afterTrap};
  });
  ok(r.armed===true,'مُسلَّحٌ بعد زلّتين');
  ok(r.afterPlain===true,'وصوابٌ على عنصرٍ بلا فخّ لا يُطفئه — لا يقول شيئاً عن الآلية');
  ok(r.afterTrap===false,'وصوابٌ على عنصرٍ فيه الفخّ يُنقص العدّاد فينحلّ');
}

console.log('\n٩) والخطاب في الاتّجاهين — المؤنّث أساساً والمذكّر بالتحويل');
{
  const fem=await page.evaluate(()=>{
    try{lsSet('mawhiba_basics_shape_v1',JSON.stringify({'gram:agv':3}))}catch(e){}
    gramLocked=false;
    const it={id:"t9",c:[{t:"He is happy.",ok:true,why:"w"},{t:"He am happy.",why:"w"},
      {t:"He happy.",why:"w"},{t:"He being happy.",why:"w"}]};
    app.innerHTML=gramArmedHint(it);return app.innerText;
  });
  ok(/تذكّري/.test(fem),'صفحة هيا: «تذكّري» — والأساس مؤنّث');

  const p2=await b.newPage({viewport:{width:420,height:900}});
  p2.on('pageerror',e=>{console.log('  ✗ PAGEERROR(elias) '+e.message);fails++});
  await p2.goto('http://127.0.0.1:8931/index.html?p=elias');
  await p2.waitForFunction(()=>typeof gramArmedHint==='function');
  await p2.evaluate(()=>{
    try{lsSet('mawhiba_basics_shape_v1',JSON.stringify({'gram:agv':3}))}catch(e){}
    gramLocked=false;
    const it={id:"t9",c:[{t:"He is happy.",ok:true,why:"w"},{t:"He am happy.",why:"w"},
      {t:"He happy.",why:"w"},{t:"He being happy.",why:"w"}]};
    app.innerHTML=gramArmedHint(it);
  });
  await p2.waitForTimeout(200);   // التحويل يقع في مراقب DOM لا في الرسم
  const masc=await p2.evaluate(()=>app.innerText);
  ok(/تذكّر(?!ي)/.test(masc),'صفحة إلياس: «تذكّر» بالتحويل');
  ok(!/تذكّري/.test(masc),'ولا أثرَ للمؤنّث فيها');
  // وفحصٌ أعمّ من كلمةٍ بعينها: لا تبقى كلمةٌ تنتهي بكسرةٍ صريحة (علامةُ خطابِ المؤنّث)
  // — فلو أُضيف غداً «كتبتِ» أو «سمعتِ» إلى نصّ الصندوق لسقط الاختبار بدل أن يمرّ.
  const left=(masc.match(/[ء-ي]+ِ(?![ء-ي])/g)||[]);
  ok(left.length===0,'ولا كلمةَ مخاطَبةٍ مؤنّثة باقيةً في صندوقه: '+(left.join(' · ')||'صفر'));

  // والثغرة القديمة: صندوق تذكير العنصر (١ سبتمبر) كان يقول «أخطأتِ» لإلياس
  const old=await p2.evaluate(async()=>{
    try{lsSet('mawhiba_basics_shape_v1',JSON.stringify({'gram:t8':3}))}catch(e){}
    gramLocked=false;
    const it={id:"t8",c:[{t:"He is happy.",ok:true,why:"القاعدة"},{t:"He am happy.",why:"w"},
      {t:"He happy.",why:"w"},{t:"He being happy.",why:"w"}]};
    app.innerHTML=gramArmedHint(it);
    await new Promise(r=>setTimeout(r,200));
    return app.innerText;
  });
  ok(/أخطأت(?!ِ)/.test(old)&&!/أخطأتِ/.test(old),'وصندوق تذكير العنصر صار «أخطأت» له كذلك');
  await p2.close();
}

console.log(`\nنجح ${fails?'مع سقوط':'كاملاً'} · سقط ${fails}`);
await b.close();
process.exit(fails?1:0);
})();
