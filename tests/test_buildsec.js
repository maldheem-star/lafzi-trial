// بنك الكلمات قسماً مستقلّاً للأخوين + التعريب (Misfer، المدن، خطاب المذكّر) — ٢٦ أغسطس.
const {chromium}=require('/opt/node22/lib/node_modules/playwright');
let fails=0;const ok=(c,m)=>{console.log((c?'  ✓ ':'  ✗ FAIL ')+m);if(!c)fails++};
(async()=>{
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'});
const mk=async(who)=>{
  const logs=[];
  const page=await b.newPage({viewport:{width:420,height:900}});
  page.on('pageerror',e=>{console.log('  ✗ PAGEERROR '+e.message);fails++});
  await page.route('**/rest/v1/**',async r=>{
    if(r.request().method()!=='POST')return r.fulfill({status:200,contentType:'application/json',body:'[]'});
    let x={};try{x=JSON.parse(r.request().postData()||'{}')}catch(e){}
    logs.push(x);r.fulfill({status:201,contentType:'application/json',body:'[]'});
  });
  await page.route('**/functions/v1/**',r=>r.fulfill({status:200,contentType:'application/json',body:'{"ok":false}'}));
  await page.addInitScript(()=>{
    Object.defineProperty(window,'speechSynthesis',{configurable:true,value:{speak(){},cancel(){},getVoices:()=>[{lang:'en-US',name:'X'}],speaking:false,pending:false}});
    window.SpeechSynthesisUtterance=function(t){this.text=t};
    // الترتيبُ الصحيح يُبنى من **البنك المعروض نفسه** لا من `wbTok`: بعد درجة الأدوار
    // الملوَّنة (٣١ أغسطس) صار البنك كتلاً («My bag» / «is» / «red.») بينما `wbTok`
    // كلماتٌ مفردة، فبحثُ كل كلمةٍ داخله يفشل حتماً على عناصر الكتل — وهو ما جعل هذا
    // الاختبار **يتقلّب بالقرعة** حتى ٥ سبتمبر. والمطابقةُ بالبادئة تصلح للحالين معاً،
    // ولا تخلط الدخيلةَ بالصواب لأن الدخيلة لا تطابق كلمةً في الجملة أصلاً.
    window.__wbCorrect=function(){
      let rest=String(wbTarget||"").trim();const used=[];
      while(rest){
        const i=wbPool.findIndex(function(x,k){return used.indexOf(k)<0&&(rest===x||rest.indexOf(x+" ")===0)});
        if(i<0)return null;
        used.push(i);rest=rest.slice(wbPool[i].length).trim();
      }
      return used;
    };
  });
  await page.goto('http://127.0.0.1:8931/index.html'+(who?'?p='+who:''));
  await page.waitForFunction(()=>typeof startBuildSec==='function');
  page._logs=logs;return page;
};

console.log('\n١) القسم يظهر للأخوين ولا يُكرَّر عند هيا');
{
  const e=await mk('elias'),m=await mk('mohammed'),h=await mk();
  const has=async p=>p.evaluate(()=>/بناء الجملة/.test(document.body.innerText));
  ok(await has(e),'إلياس يراه');
  ok(await has(m),'ومحمد يراه');
  // هيا تستعمله داخل خطّتها، فلا يُضاف لها زرٌّ ثانٍ للشيء نفسه
  const hayaBtn=await h.evaluate(()=>[...document.querySelectorAll('.mode')].filter(x=>/startBuildSec/.test(x.getAttribute('onclick')||'')).length);
  ok(hayaBtn===0,'وهيا بلا زرٍّ مكرّر — القسم داخل خطّتها أصلاً');
  await e.close();await m.close();await h.close();
}

console.log('\n٢) الجلسة تُبنى بمستوى المتعلّم ولا تتجاوز حدّها');
{
  const p=await mk('elias');
  const r=await p.evaluate(()=>{
    startBuildSec();
    return{mode:mode,n:buildItems.length,cap:BUILD_N,
      lvs:[...new Set(buildItems.map(x=>engBuildLv(x)))].sort(),
      uniq:new Set(buildItems.map(x=>x.id)).size};
  });
  ok(r.mode==='build','الوضع build');
  ok(r.n===r.cap,'ستّة عناصر — '+r.n);
  ok(r.uniq===r.n,'بلا تكرارٍ داخل الجلسة');
  // i+1 يعني درجةً واحدة فوق مستواه: فإلياس (A2) يرى A1/A2/B1، ولا يرى B2.
  ok(r.lvs.indexOf('B2')<0,'ولا B2 لإلياس — i+1 سقفٌ لا أرضية ('+r.lvs.join(',')+')');
  await p.close();
}

console.log('\n٣) جلسةٌ كاملة بنقراتٍ حقيقية، والتسجيل يحمل الجملة والمعنى');
{
  const p=await mk('elias');
  await p.evaluate(()=>{startBuildSec()});
  await p.waitForFunction(()=>mode==='build');
  const first=await p.evaluate(()=>({target:buildCur().s,stage:wbStage}));
  // نرتّب البنك صحيحاً بالضغط على أزراره بترتيب الجملة — كلماتٍ كان أو كتلاً
  const okFlag=await p.evaluate(()=>{
    const order=__wbCorrect();
    if(!order)return false;
    order.forEach(k=>wbPick(k));
    buildCheck();
    return wbOk;
  });
  ok(okFlag===true,'الترتيب الصحيح يُقبَل — «'+first.target.slice(0,40)+'»');
  ok(await p.evaluate(()=>buildScore)===1,'ويُحتسب');
  await p.waitForTimeout(300);
  const row=p._logs.filter(x=>x&&x.domain==='build').pop();
  ok(!!row,'وسطرٌ وصل الخادم');
  ok(row&&row.is_correct===true,'بنتيجته');
  ok(row&&row.q_text&&row.q_text.indexOf(first.target)===0,'وq_text يبدأ بالجملة المطلوبة');
  ok(row&&/المعنى/.test(row.q_text||''),'ومعه المعنى العربي');
  ok(row&&/^stage\d$/.test(row.qtype||''),'وqtype يحمل درجة السلّم — '+(row&&row.qtype));
  // والانتقال يعمل
  await p.evaluate(()=>buildNext());
  ok(await p.evaluate(()=>buildIdx)===1,'والتالي ينتقل');
  await p.close();
}

console.log('\n٤) الخطأ يعرض الصواب ولا يُحتسب');
{
  const p=await mk('mohammed');
  await p.evaluate(()=>{startBuildSec()});
  const r=await p.evaluate(()=>{
    // **ترتيبٌ خاطئ يقيناً لا «معكوسٌ ونرجو»**: عكسُ البنك المخلوط قد يصادف الصواب —
    // وهو ما وقع فعلاً في ٣ من ٣٠ جولة (`b_a1_school`, `b_a1_sister`, `b_a1_bag`)
    // لأن الكتل ثلاثٌ أو أربع. فنبني الصواب ثم نُبدّل أوّل وحدتين مختلفتين.
    const order=__wbCorrect();
    if(!order)return{fatal:'تعذّر بناء الترتيب الصحيح من البنك'};
    let a=-1;
    for(let i=0;i+1<order.length;i++){if(wbPool[order[i]]!==wbPool[order[i+1]]){a=i;break}}
    const ord=order.slice();
    if(a>=0){const t=ord[a];ord[a]=ord[a+1];ord[a+1]=t}
    const built=ord.map(k=>wbPool[k]).join(" ");
    ord.forEach(k=>wbPick(k));
    buildCheck();
    return{ok:wbOk,score:buildScore,shown:document.body.innerText.indexOf(buildCur().s)>=0,
      differs:built.trim()!==String(wbTarget||"").trim(),s:buildCur().s};
  });
  ok(!r.fatal,'الترتيب الصحيح يُبنى من البنك المعروض — '+(r.fatal||'تمّ'));
  // وإلّا لكان الاختبار يزعم رفضاً لجوابٍ صحيح
  ok(r.differs===true,'والترتيب المُرسَل مخالفٌ للصواب فعلاً — «'+String(r.s||'').slice(0,40)+'»');
  ok(r.ok===false,'والترتيب الخاطئ يُرفَض');
  ok(r.score===0,'ولا يُحتسب');
  ok(r.shown===true,'ويُعرض الصواب نصّاً');
  await p.close();
}

// ===== ٤ب) البنك لا يُعرض مرتَّباً صحيحاً — عيبُ منتجٍ كشفه تقلّبُ الاختبار =====
// `shuffle` العارية تُعيد الترتيب الصحيح في ١ من ٦ لثلاث كتل و١ من ٢٤ لأربع، فيُهدى
// الجواب. كان نادراً مع ٦-٨ كلمات، وصار كثيراً بعد درجة الأدوار (٣١ أغسطس).
console.log('\n٤ب) البنك المخلوط لا يُعرض مرتَّباً صحيحاً — لا يُهدى الجواب');
{
  const p=await mk('mohammed');
  const r=await p.evaluate(()=>{
    let solved=0,chunkRounds=0,n=0;
    for(let t=0;t<200;t++){
      startBuildSec();
      if(!wbOn||!wbPool.length)continue;
      n++;if(wbChunkMode)chunkRounds++;
      if(wbPool.join(" ").trim()===String(wbTarget||"").trim())solved++;
    }
    return{solved:solved,chunkRounds:chunkRounds,n:n};
  });
  ok(r.n>=150,'جولاتٌ حقيقية للقياس — '+r.n);
  ok(r.chunkRounds>0,'ومنها جولاتُ كتلٍ فعلاً (وإلّا لم يُقَس ما بُني له) — '+r.chunkRounds);
  ok(r.solved===0,'ولا جولةَ واحدة عُرض بنكها مرتَّباً صحيحاً — '+r.solved);
  await p.close();
}

console.log('\n٥) خطاب المذكّر للأخوين — «تنجحين» كانت تفلت');
{
  const p=await mk('elias');
  await p.evaluate(()=>{startWrite();render()});
  // المراقب (MutationObserver) يعمل بعد الطفرة لا معها، فالقراءة في نفس النبضة تسبقه
  await p.waitForTimeout(300);
  const r=await p.evaluate(()=>{
    const t=document.body.innerText;
    return{fem:/تنجحين/.test(t),masc:/تنجح/.test(t),
           tbl:!!(MASC_W&&MASC_W["تنجحين"])};
  });
  ok(r.tbl===true,'الجدول يعرفها');
  ok(r.fem===false,'ولا تظهر «تنجحين» على صفحة إلياس');
  ok(r.masc===true,'بل «تنجح» بصيغة المذكّر');
  await p.close();
}

console.log('\n٦) الأسماء والأماكن');
{
  const p=await mk();
  const r=await p.evaluate(()=>{
    const src=document.documentElement.innerHTML;
    return{musfir:/Musfir/.test(src),misfer:/Misfer/.test(src),
           arName:/مسفر/.test(src)};
  });
  ok(r.musfir===false,'لا Musfir في أيّ بنك');
  ok(r.misfer===true,'وMisfer موجود');
  ok(r.arName===true,'والاسم العربي «مسفر» كما هو — لم يُطلب تغييره');
  await p.close();
}

await b.close();
console.log(fails?`\n=== ${fails} فشل ===`:'\n=== كل الاختبارات نجحت ===');
process.exit(fails?1:0);
})();
