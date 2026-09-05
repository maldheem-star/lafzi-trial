// إحصاء ١٠٢ — قسمٌ لمحمد وحده. يحرس أربعة أشياء تكسر بصمت:
// (١) صحّة البنك نفسه (خيارٌ صحيحٌ واحد لا صفر ولا اثنان، ولا خيارَين متطابقين)،
// (٢) ظهوره عند محمد وغيابه عند الآخَرين — الطلب كان «في صفحة محمد» نصّاً،
// (٣) الجلسة تبلغ الحدّ ولا تُكرّر عنصراً، والتباعد يُسجَّل،
// (٤) التسجيل يحمل نصّ السؤال وكل الخيارات وموضع الصواب — عُرف المشروع، وبلاه لا تشخيص.
const {chromium}=require('/opt/node22/lib/node_modules/playwright');
let fails=0;const ok=(c,m)=>{console.log((c?'  ✓ ':'  ✗ FAIL ')+m);if(!c)fails++};
(async()=>{
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'});
let logs=[];
const mk=async(f)=>{
  const page=await b.newPage({viewport:{width:420,height:900}});
  page.on('pageerror',e=>{console.log('  ✗ PAGEERROR '+e.message);fails++});
  await page.route('**/rest/v1/**',async r=>{
    let body={};try{body=JSON.parse(r.request().postData()||'{}')}catch(e){}
    logs.push(body);r.fulfill({status:201,contentType:'application/json',body:'[]'});
  });
  await page.route('**/functions/v1/tutor',r=>r.fulfill({status:200,contentType:'application/json',
    body:JSON.stringify({ok:true,reply:"hi"})}));
  await page.addInitScript(()=>{
    Object.defineProperty(window,'speechSynthesis',{configurable:true,value:{speak(){},cancel(){},resume(){},pause(){},
      getVoices:()=>[{lang:'en-US',name:'X'}],speaking:false,pending:false}});
    window.SpeechSynthesisUtterance=function(t){this.text=t};
  });
  await page.goto('http://127.0.0.1:8931/'+f);
  await page.waitForFunction(()=>typeof startStat==='function');
  await page.waitForTimeout(200);
  return page;
};

console.log('\n١) البنك سليمٌ بنيوياً — عنصرٌ واحدٌ معطوب يُفسد سؤالاً كاملاً بصمت');
const m=await mk('mohammed.html');
const audit=await m.evaluate(()=>{
  const seen={},bad=[];
  STAT_BANK.forEach(it=>{
    const p=[];
    if(seen[it.id])p.push('معرّف مكرّر');seen[it.id]=1;
    if(!it.q||!it.sol||!it.ch||!it.src)p.push('حقل ناقص');
    if(!it.c||it.c.length!==4)p.push('عدد الخيارات '+(it.c?it.c.length:0));
    else{
      const n=it.c.filter(x=>x.ok).length;
      if(n!==1)p.push('عدد الصحيح '+n);
      if(it.c.some(x=>!x.t||!x.why))p.push('خيار بلا نصّ أو شرح');
      if(new Set(it.c.map(x=>x.t)).size!==it.c.length)p.push('خيارات متطابقة');
    }
    if(STAT_CHAPTERS.indexOf(it.ch)<0)p.push('فصل غير معروف');
    if(['ملف','مؤلَّف'].indexOf(it.src)<0)p.push('مصدر غير معروف');
    if(p.length)bad.push(it.id+': '+p.join(' | '));
  });
  const bySrc={};STAT_BANK.forEach(x=>bySrc[x.src]=(bySrc[x.src]||0)+1);
  const byCh={};STAT_BANK.forEach(x=>byCh[x.ch]=(byCh[x.ch]||0)+1);
  return{n:STAT_BANK.length,bad,bySrc,byCh,chapters:STAT_CHAPTERS.length};
});
ok(audit.bad.length===0,'كل العناصر سليمة'+(audit.bad.length?': '+audit.bad.slice(0,4).join(' / '):''));
ok(audit.n>=80,`البنك ${audit.n} عنصراً — كبيرٌ بما يكفي فلا يُستنفَد بجلسة (الحدّ ٨)`);
ok(audit.bySrc['ملف']>0&&audit.bySrc['مؤلَّف']>0,
  `الصنفان موجودان: ${audit.bySrc['ملف']} من الملفّات و${audit.bySrc['مؤلَّف']} مؤلَّفة لما ورد بلا أسئلة`);
ok(audit.chapters===13&&Object.keys(audit.byCh).length===13,'وثلاثة عشر فصلاً كلّها ممثَّلة');
ok(Object.keys(audit.byCh).every(k=>audit.byCh[k]>=3),'وأقلّ فصلٍ فيه ثلاثة أسئلة فأكثر — فمراجعة الفصل وحده تعطي جلسةً لا سؤالاً');

console.log('\n٢) الظهور عند محمد وحده');
let t=await m.textContent('#app');
ok(t.includes('إحصاء ١٠٢'),'الزرّ عند محمد');
for(const f of ['elias.html','index.html']){
  const p=await mk(f);
  ok(!(await p.textContent('#app')).includes('إحصاء ١٠٢'),`ولا يظهر في ${f}`);
  await p.close();
}

console.log('\n٣) قائمة الفصول ثم جلسة');
await m.evaluate(()=>goStatMenu());
await m.waitForTimeout(200);
t=await m.textContent('#app');
ok(await m.evaluate(()=>mode)==='statMenu','فُتحت قائمة الفصول');
ok(t.includes('كل الفصول'),'وفيها الجلسة الشاملة');
ok(t.includes('الاحتمال')&&t.includes('التوزيع الثنائي')&&t.includes('المجموعات'),'وأسماء الفصول');

console.log('\n٤) الجلسة الشاملة: تبلغ الحدّ بلا تكرار');
const N=await m.evaluate(()=>STAT_N);
for(let i=0;i<10;i++){
  const r=await m.evaluate(()=>{startStat('');return{n:statItems.length,u:new Set(statItems.map(x=>x.id)).size}});
  if(r.n!==N||r.u!==r.n){ok(false,`جلسة ${i+1}: ${r.n} عنصراً و${r.u} متمايزاً`);break}
  if(i===9)ok(true,`عشر جلسات متتالية: ${N} عنصراً متمايزاً في كلٍّ`);
}

console.log('\n٥) جلسة فصلٍ بعينه لا تخرج عنه');
const one=await m.evaluate(()=>{startStat('الاحتمال');return statItems.map(x=>x.ch)});
ok(one.length===N&&one.every(c=>c==='الاحتمال'),`ثمانية أسئلة كلّها من «الاحتمال» (${new Set(one).size} فصلاً)`);

console.log('\n٦) الإجابة: النتيجة والتباعد والحلّ المعروض');
logs=[];
await m.evaluate(()=>{startStat('');statSetupRound()});
await m.waitForTimeout(150);
const before=await m.evaluate(()=>Object.keys(statSrsLoad()).length);
const first=await m.evaluate(()=>{
  const it=statCur(),i=it.c.findIndex(x=>x.ok);
  statChoose(i);return{id:it.id,sol:it.sol.slice(0,20)};
});
await m.waitForTimeout(300);
ok(await m.evaluate(()=>statScore)===1,'الإجابة الصحيحة زادت النتيجة');
ok(await m.evaluate(()=>statLocked)===true,'والسؤال أُقفل فلا تُغيَّر الإجابة بعد رؤية الحلّ');
ok(await m.evaluate(()=>Object.keys(statSrsLoad()).length)>before,'ودخل مخزون التباعد FSRS');
t=await m.textContent('#app');
ok(t.includes('الحلّ خطوةً خطوة'),'وظهر صندوق الحلّ');
ok(t.includes(first.sol.slice(0,12)),'وفيه نصّ حلّ هذا السؤال بعينه');

console.log('\n٧) التسجيل يحمل ما يلزم للتشخيص');
const L=logs.filter(x=>x.domain==='stat');
ok(L.length===1,`سطرٌ واحد للإجابة (${L.length})`);
const rec=L[0]||{};
ok(!!rec.q_text&&rec.q_text.length>30,'ومعه نصّ السؤال');
ok(/✓/.test(rec.q_text||''),'وموضع الصواب موسومٌ داخل الخيارات');
ok((rec.q_text||'').split('|').length>=3,'وكل الخيارات مسجَّلة لا الصحيح وحده');
// ===== الدعوى صحيحة والمطابقة كانت ضيّقة — رُوجعت ٥ سبتمبر =====
// عناصر أوراق العمل تُلحق ` · ws:١` بعد المصدر، فكان `…(ملف|مؤلَّف)\]` يشترط قوساً
// مغلقاً بعده مباشرةً — فيسقط الاختبار **حين تقع القرعة على عنصر ورقة** وينجح حين
// لا تقع. واختبارٌ يتقلّب بالقرعة أسوأ من اختبارٍ يسقط (درس ٥ سبتمبر). فوُسِّعت
// المطابقة للاحقة الاختيارية، وأُضيف فحصٌ **حتميّ** لعنصر ورقةٍ بعينه بدل انتظار القرعة.
ok(/\[[^\]]+ · (ملف|مؤلَّف)( · ws:.+)?\]/.test(rec.q_text||''),'والفصل والمصدر في أوّل السطر — فيُقاس أيّ الصنفين أنفع');
ok(!!rec.response&&!!rec.item_id&&rec.is_correct===true,'والإجابة والمعرّف والصواب');
{
  logs=[];
  await m.evaluate(()=>{
    const it=STAT_BANK.find(x=>x.ws==='٢');
    startStatWs('٢');statItems=[it];statIdx=0;statSetupRound();
    statChoose(statOrder.find(w=>statCur().c[w].ok));
  });
  await m.waitForTimeout(300);
  const w=(logs.filter(x=>x.domain==='stat').pop()||{}).q_text||'';
  ok(/ · ws:٢\]/.test(w),'وعنصرُ ورقةٍ يحمل رقم ورقته في السطر — '+w.slice(0,60));
}

console.log('\n٨) جلسة كاملة بنقرات حقيقية حتى شاشة النتيجة');
await m.evaluate(()=>startStat(''));
await m.waitForTimeout(200);
for(let k=0;k<N;k++){
  await m.evaluate(()=>{const it=statCur();statChoose(it.c.findIndex(x=>x.ok))});
  await m.waitForTimeout(60);
  const btn=await m.$('button.btn');
  if(btn)await btn.click();
  await m.waitForTimeout(60);
}
t=await m.textContent('#app');
ok(await m.evaluate(()=>statDone)===true,'انتهت الجلسة');
ok(t.includes('١٠٠'),'وظهرت النتيجة كاملة');

console.log('\n٩) اتّجاه العرض — عطلٌ يشحن حلولاً مقلوبة بلا أن يُسقط اختباراً واحداً');
const bidi=await m.evaluate(()=>{
  // كل سطرٍ بلا حرفٍ عربيّ قويّ يجب أن يُعرض من اليسار، وإلّا انقلبت المعادلة على الشاشة
  const bad=[],wide=[];
  STAT_BANK.forEach(it=>{
    [it.sol,it.pre||'',it.q].join('\n').split('\n').forEach(L=>{
      const t=L.trim();if(!t)return;
      const html=statBidiLine(L);
      const wantLtr=!STAT_AR_RE.test(t);
      const isLtr=/direction:ltr/.test(html);
      if(wantLtr!==isLtr)bad.push(it.id+' | '+t.slice(0,50));
      // ولا معادلةٌ طويلة محشورةٌ في جملةٍ عربية: تنكسر في منتصفها عند الالتفاف
      if(STAT_AR_RE.test(t)){
        const runs=t.split(/[\u0600-\u06FF\u00AB\u00BB]+/).map(x=>x.trim()).filter(x=>/[0-9]/.test(x));
        if(Math.max(0,...runs.map(x=>x.length))>=30)wide.push(it.id+' | '+t.slice(0,50));
      }
    });
  });
  // حالاتٌ بعينها كسرت فعلاً قبل الإصلاح
  const cases=[
    ['= 736 ÷ 9 = 81.78.',true],            // بلا حرفٍ قويّ إطلاقاً
    ['= 0.527 × 100 = 52.7٪.',true],        // ٪ عربيّةُ الكتلة لكنّها محايدة لا حرفاً
    ['P(X = r) = nCr · pʳ',true],
    ['المقام = 3 + 2 + 4 = 9',false],       // عربيّةٌ ⇐ من اليمين
  ];
  const wrong=cases.filter(c=>/direction:ltr/.test(statBidiLine(c[0]))!==c[1]).map(c=>c[0]);
  return{bad,wide,wrong};
});
ok(bidi.bad.length===0,`كل سطرٍ بلا عربية يُعرض من اليسار (${bidi.bad.length} مخالفاً)`+(bidi.bad.length?': '+bidi.bad.slice(0,3).join(' / '):''));
ok(bidi.wrong.length===0,'والحالات التي انكسرت فعلاً قبل الإصلاح صارت صحيحة'+(bidi.wrong.length?': '+bidi.wrong.join(' / '):''));
ok(bidi.wide.length===0,`ولا معادلة ≥٣٠ محرفاً محشورةٌ داخل جملةٍ عربية (${bidi.wide.length})`+(bidi.wide.length?': '+bidi.wide.slice(0,3).join(' / '):''));
const shown=await m.evaluate(()=>{
  statItems=[STAT_BANK.find(x=>x.id==='sa_cen_5')];statIdx=0;statScore=0;statDone=false;
  mode='stat';statSetupRound();statChoose(statCur().c.findIndex(x=>x.ok));
  return document.getElementById('app').innerHTML;
});
ok(/direction:ltr[^"]*">= 736 ÷ 9 = 81\.78\./.test(shown.replace(/&nbsp;/g,' ')),
  'وسطر الحلّ النهائي معروضٌ فعلاً من اليسار في DOM الحيّ لا في الدالّة وحدها');

// ═══ ٩ب) أوراق العمل: صفحةٌ لكلٍّ، ورسومٌ، ولا سطرَ مقلوب — ٥ سبتمبر ═══
// والانقلاب يُقاس **بالإحداثيات لا بالنظر**: في سطرٍ عربيّ (RTL) يجب أن تتناقص
// مواضع الأرقام يميناً إلى يسار. وكاشفٌ نصّي وحده لا يكفي — جُرِّب فأبلغ عن ٦٤ سطراً
// المقلوب منها **اثنان**، وهي نسبةُ بلاغٍ كاذبٍ لا تحرس شيئاً (درس ٢٥ أغسطس).
console.log('\n٩ب) أوراق العمل ١٤٤٨: الصفحتان والرسوم واتّجاه كل سطر');
{
  const menu=await m.evaluate(()=>{goStatMenu();return document.body.innerText});
  ok(/ورقة العمل الأولى/.test(menu)&&/ورقة العمل الثانية/.test(menu),'الورقتان لهما مدخلان مستقلّان');
  const scoped=await m.evaluate(()=>{
    const out={};
    ['١','٢'].forEach(function(w){
      let pure=true,n=0;
      for(let s=0;s<3;s++){startStatWs(w);statItems.forEach(function(x){n++;if(x.ws!==w)pure=false})}
      out[w]={pure:pure,n:n};
    });
    startStat('المجموعات');out.chapterClean=statItems.every(function(x){return x.ch==='المجموعات'});
    startStat('');out.bankHasWs=statItems.length>0&&STAT_BANK.some(function(x){return x.ws});
    return out;
  });
  ok(scoped['١'].pure&&scoped['٢'].pure,'وجلسةُ كلٍّ مقصورةٌ على ورقتها');
  ok(scoped.chapterClean,'ولا تُسرَّب الورقة إلى جلسة فصلٍ بعينه');
  ok(scoped.bankHasWs,'والعناصر داخل البنك فعلاً كما طُلب — لا بنكٌ ثانٍ');
  const figs=await m.evaluate(()=>({
    svg:STAT_BANK.filter(function(x){return x.svg}).length,
    svgSol:STAT_BANK.filter(function(x){return x.svgSol}).length,
    wellFormed:STAT_BANK.every(function(x){return (!x.svg||/^<svg[\s\S]*<\/svg>$/.test(x.svg))&&(!x.svgSol||/^<svg[\s\S]*<\/svg>$/.test(x.svgSol))}),
  }));
  ok(figs.svg>=6&&figs.svgSol>=2,`رسومٌ مع السؤال ${figs.svg} ومع الحلّ ${figs.svgSol}`);
  ok(figs.wellFormed,'وكلّها عناصر svg مغلقة');
  // الرسم يظهر فعلاً في DOM، ولا يدخل السجلّ إلّا بوسمه
  const live=await m.evaluate(()=>{
    const it=STAT_BANK.find(function(x){return x.id==='sw2_h1'});
    startStatWs('٢');statItems=[it];statIdx=0;statDone=false;statSetupRound();render();
    return{svgInDom:!!document.querySelector('#app svg'),hasSvgSolBefore:!!document.querySelector('#app svg')&&document.querySelectorAll('#app svg').length};
  });
  ok(live.svgInDom,'والرسم مرسومٌ في الصفحة لا نصّاً مهرَّباً');
  ok(live.hasSvgSolBefore===1,'ورسمُ الحلّ لا يظهر قبل القفل — فلا يُفشي الجواب');
  // ═══ الانقلاب: قياسٌ على كل سطرٍ يخلط عربيةً بتعبيرٍ رياضي ═══
  const bidi=await m.evaluate(()=>{
    const AR=/[ء-غف-ي]/, MATH=/[0-9][0-9\s.,()%°]*\s*[÷×=+−]\s*[0-9(]/;
    const host=document.createElement('div');
    host.style.cssText='width:360px;font-size:14px;line-height:2';document.body.appendChild(host);
    const bad=[];let checked=0;
    STAT_BANK.filter(function(x){return x.ws}).forEach(function(it){
      const fields=[it.q,it.sol,it.pre].concat(it.c.map(function(o){return o.t})).concat(it.c.map(function(o){return o.why}));
      fields.filter(Boolean).forEach(function(f){
        String(f).split('\n').forEach(function(line){
          if(!(AR.test(line)&&MATH.test(line)))return;
          host.innerHTML=statBidiLine(line);
          const el=host.firstChild,node=el.firstChild,txt=el.textContent;
          const nums=[];const re=/\d+(?:\.\d+)?/g;let mm;
          while((mm=re.exec(txt))){const r=document.createRange();
            r.setStart(node,mm.index);r.setEnd(node,mm.index+mm[0].length);
            const bb=r.getBoundingClientRect();nums.push({x:bb.left+bb.width/2,y:Math.round(bb.top)});}
          if(nums.length<2)return;
          const y0=nums[0].y,row=nums.filter(function(n){return n.y===y0});
          if(row.length<2)return;
          checked++;
          const rtl=getComputedStyle(el).direction==='rtl';
          for(let z=1;z<row.length;z++){
            if(rtl?row[z].x>=row[z-1].x:row[z].x<=row[z-1].x){bad.push(it.id+' :: '+line.slice(0,70));break}
          }
        });
      });
    });
    host.remove();
    return{checked:checked,bad:bad};
  });
  ok(bidi.checked>=40,`أسطرٌ قِيس اتّجاهها فعلاً: ${bidi.checked} — وإلّا فالفحص فارغ`);
  ok(bidi.bad.length===0,'ولا سطرَ يُعرض مقلوباً'+(bidi.bad.length?': '+bidi.bad.slice(0,3).join(' / '):''));

  // ═══ ٩ج) المعادلة لا تنشقّ — على **البنك كلّه** لا أوراق العمل وحدها ═══
  // القياس الرقميّ وحده لا يكفي: «2^k ≥ 90» تُعرض «2^90 ≥ k» — وأرقامها بترتيبها،
  // والمُبدَّل حرفٌ برقم. والمعيار الصحيح ليس «يُقرأ من اليسار كما كُتب» (فذاك يُبلّغ
  // كاذباً عن ١٤٦ مقطعاً سليماً يقرؤها العربيّ من اليمين)، بل: **إمّا مطابقٌ للمصدر
  // (مقطعٌ لاتينيّ كامل) وإمّا معكوسُ الترتيب تماماً (مقطعٌ رقميّ داخل سطرٍ عربيّ)**.
  // وما بينهما معادلةٌ انشقّت. وقد كشف هذا أربعة مواضع **قديمة** شُحنت ٢٥ أغسطس،
  // منها «0 ≤ pᵢ ≤ 1» تُعرض «0 ≤ 1 ≤ pᵢ» — أي شرطٌ خاطئ يُدرَّس.
  const math=await m.evaluate(()=>{
    const AR=/[ء-غف-ي]/;
    const SEG=/[A-Za-z0-9][A-Za-z0-9^()≥≤=<>÷×+−·²ᵢ.,  ]*[A-Za-z0-9)²]/g;
    const OPS=/[≥≤=<>÷×+−^]/;
    const tok=function(x){return (x.match(/[A-Za-z]+|[0-9]+(?:\.[0-9]+)?/g)||[]).join('|')};
    const host=document.createElement('div');
    host.style.cssText='width:360px;font-size:14px;line-height:2';document.body.appendChild(host);
    const bad=[];let checked=0;
    STAT_BANK.forEach(function(it){
      const fields=[it.q,it.sol,it.pre].concat(it.c.map(function(o){return o.t}))
        .concat(it.c.map(function(o){return o.why}));
      fields.filter(Boolean).forEach(function(f){
        String(f).split('\n').forEach(function(line){
          if(!AR.test(line))return;                 // الأسطر بلا عربية تُرسَم LTR أصلاً
          host.innerHTML=statBidiLine(line);
          const el=host.firstChild,node=el.firstChild,txt=el.textContent;
          let mm;SEG.lastIndex=0;
          while((mm=SEG.exec(txt))){
            const seg=mm[0];
            if(seg.trim().length<3||!OPS.test(seg))continue;
            const chars=[];
            for(let i=mm.index;i<mm.index+seg.length;i++){
              if(/\s/.test(txt[i]))continue;
              const r=document.createRange();r.setStart(node,i);r.setEnd(node,i+1);
              const bb=r.getBoundingClientRect();
              chars.push({ch:txt[i],x:bb.left,y:Math.round(bb.top)});
            }
            if(chars.length<3)continue;
            const y0=chars[0].y,row=chars.filter(function(c){return c.y===y0});
            if(row.length<chars.length)continue;    // ملتفٌّ على سطرين — لا يُقاس
            const visual=row.slice().sort(function(a,b2){return a.x-b2.x}).map(function(c){return c.ch}).join('');
            const T=tok(seg.replace(/\s/g,'')),V=tok(visual);
            const Trev=T.split('|').reverse().join('|');
            checked++;
            if(V!==T&&V!==Trev)bad.push(it.id+': «'+seg.trim()+'» ⟵ «'+visual+'»');
          }
        });
      });
    });
    host.remove();
    return{checked:checked,bad:bad};
  });
  ok(math.checked>=150,`مقاطع رياضية قِيست في البنك كلّه: ${math.checked}`);
  ok(math.bad.length===0,'ولا معادلةَ انشقّت'+(math.bad.length?': '+math.bad.slice(0,3).join(' / '):''));
}

console.log('\n٩د) آليةُ الخطأ تُسمّى حيث تكون عائلةً — لا «فرقٌ فقط» يُقرأ ضعفاً عامّاً');
{
  // محمد أخطأ `sa_prb_15` بـ0.54 — وهي P(ذكر | ناجح)، أي الطرفُ المقابل من الزوج
  // لا المطلوب. وهي نفس آلية `reversed_pair` المسمّاة ٢٩ أغسطس (A ⊆ B ⇐ B ⊆ A،
  // والإحصاءة/المعلَمة) — كانت بلا وسمٍ فتُقرأ خطأً عابراً لا عائلةً تُجمَّع بالاستعلام.
  //
  // **والحكم على الشرح لا على الوسم**: يُبحَث في البنك كلّه عن كل مموّهٍ يصف قلباً
  // (متمّم · معاكس · مقابل · مقلوب) ويُشترَط أن يحمل اسماً — فلا يُثبَّت عددٌ مكتوب
  // يكسره كل عنصرٍ جديد مشروع (درس «الأعداد المكتوبة في الاختبارات فخّ صامت»).
  const r=await m.evaluate(()=>{
    const RE=/متمّم|معاكس|المقابل|مقلوب|العكس/;
    const un=[],named={};
    STAT_BANK.forEach(function(it){
      (it.c||[]).forEach(function(x){
        if(x.ok||!RE.test(String(x.why||"")))return;
        if(x.bug)named[x.bug]=(named[x.bug]||0)+1;else un.push(it.id+' · '+x.t);
      });
    });
    const p15=(STAT_BANK.find(x=>x.id==='sa_prb_15')||{c:[]}).c.find(x=>x.t==='0.54');
    return{un:un,named:named,p15:p15&&p15.bug};
  });
  ok(r.p15==='reversed_pair','مموّه محمد بعينه موسومٌ بآليته — '+r.p15);
  ok(r.un.length===0,'ولا مموّهَ يصف قلباً بلا اسم — '+r.un.join(' | '));
  ok((r.named.reversed_pair|0)>=7,'وعائلةُ قلب الزوج مجمَّعةٌ باسمها — '+r.named.reversed_pair);
  // وخلطُ اتّجاه الشرط آليةٌ **أخرى** منشورةٌ مسمّاة (Eddy 1982، confusion of the
  // inverse): P(B|A) مكان P(A|B). ولا تُدمَج في reversed_pair وإلّا ضاع الفرق.
  ok((r.named.inverse_conditional|0)>=2,'وخلطُ اتّجاه الشرط باسمه هو لا مدموجاً — '+r.named.inverse_conditional);
}

console.log('\n١٠) لا انحدار في بقيّة الأقسام');
ok((await m.evaluate(()=>censusMissing())).length===0,'وكل دوال التطبيق معرَّفة');
ok((await m.evaluate(()=>window.__ERRS.length))===0,'ولا خطأ في وحدة التحكّم');

await b.close();
console.log(fails?`\n=== ${fails} فشل ===`:'\n=== كل الاختبارات نجحت ===');
process.exit(fails?1:0);
})();
