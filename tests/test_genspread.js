// تمعيرُ المولّدات المجمَّدة — ٢٩ أكتوبر.
//
// الشكوى بلفظها من جهاز هيا (٢٤ أكتوبر): «يتكرر في المحاكاة وفي الأقسام..
// **ولا تغيير حتى في الأرقام**». ونصفُها الثاني حرفيٌّ لا مجازيّ: ثلاثةُ مولّداتٍ
// تُنتج **عنصراً واحداً لا غير** لا يتغيّر فيه إلّا ترتيبُ الخيارات، وعشرةٌ تحت
// خمسة عناصر.
//
// **والقياسُ بالعنصر كاملاً لا بنصّ السؤال**: قياسُ ٢٤ أكتوبر عدَّ نصوصَ الأسئلة
// فقال «١٤ مولّداً مجمَّداً» وكان خطأً — أسئلةُ الهندسة أرقامُها في **الرسم** لا في
// الجملة، فـ`gAnglePoint` مثلاً نصُّه واحدٌ ورسمُه ١٥٠٠. والمفتاح هنا:
// `{q, svg, c مرتَّبةً}` — النصُّ والرسمُ والخياراتُ معاً.
//
// **وحدُّ ما يُدَّعى يُقال**: `tmplKey` يمحو الأرقام عمداً (درس ٢٩ أغسطس)، فتوسيعُ
// مولّدٍ **لا يُضيف مفتاحاً** إلى سجلّ العرض العابر للأيّام — أي أن «رأته من قبل»
// لا يهبط بهذا. المُصلَح هو **العنصرُ المعروض نفسه**: ألّا يكون سؤالاً واحداً
// بأرقامه ورسمه نفسها يُعاد أبداً. وذاك بعينه ما اشتكته.
const {chromium}=require(process.env.PW||'/opt/node22/lib/node_modules/playwright');
let fails=0;const ok=(c,m)=>{console.log((c?'  ✓ ':'  ✗ FAIL ')+m);if(!c)fails++};
(async()=>{
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'});
const p=await b.newPage({viewport:{width:420,height:900}});
p.on('pageerror',e=>{console.log('  ✗ PAGEERROR '+e.message);fails++});
await p.route('**/rest/v1/**',r=>r.fulfill({status:201,contentType:'application/json',body:'[]'}));
await p.route('**/functions/v1/**',r=>r.fulfill({status:200,contentType:'application/json',body:'{"ok":false}'}));
await p.goto('http://127.0.0.1:8931/index.html');
await p.waitForFunction(()=>typeof QUANT_GENS!=='undefined'&&typeof FLEX_GENS!=='undefined');

// ===== القياس: فضاءُ كل مولّدٍ بالعنصر كاملاً =====
const spread=await p.evaluate((N)=>{
  const out={};
  const run=(pool)=>pool.forEach(g=>{
    const seen=new Set();let err=null;
    for(let i=0;i<N;i++){
      try{const o=g();
        seen.add(JSON.stringify({q:o&&o.q,svg:o&&o.svg,c:(o&&o.c?o.c.slice().map(String).sort():null)}));
      }catch(e){err=String(e).slice(0,70);break}
    }
    out[g.name]={n:seen.size,err:err};
  });
  run(QUANT_GENS);run(FLEX_GENS);
  return out;
},600);

console.log('\n١) لا مولّدَ مجمَّد — ولا واحدٌ تحت خمسة عناصر');
{
  const names=Object.keys(spread);
  ok(names.length===47,'سبعةٌ وأربعون مولّداً مقيسة ('+names.length+')');
  const broke=names.filter(n=>spread[n].err);
  ok(broke.length===0,'ولا مولّدَ يرمي خطأً'+(broke.length?' — '+broke.map(n=>n+':'+spread[n].err).join(' | '):''));
  const one=names.filter(n=>spread[n].n===1);
  ok(one.length===0,'صفرُ مولّدٍ يُنتج عنصراً واحداً — كانت ثلاثة ('+(one.join(', ')||'لا شيء')+')');
  const few=names.filter(n=>spread[n].n<5);
  ok(few.length===0,'وصفرُ مولّدٍ تحت خمسة — كانت عشرة ('+(few.join(', ')||'لا شيء')+')');
  // **والأرضيّةُ خمسةٌ مصدرُها قوائمُ محتوًى ثابتة لا شكلٌ مجمَّد** — يُقال ولا يُدَّعى غيره
  const five=names.filter(n=>spread[n].n===5).sort();
  ok(JSON.stringify(five)===JSON.stringify(['gFractionBetween','gShadedArea','gSides']),
     'والثلاثةُ عند الأرضيّة قوائمُ محتوًى ثابتة (بنكٌ من خمسة) لا أشكالٌ مجمَّدة: '+five.join(', '));
}

console.log('\n٢) والعشرةُ المُعالَجة فوق قيمها المقاسة قبل الإصلاح');
{
  // المقاسُ قبلها بنفس المفتاح وبنفس عدد السحوب — مرابطُ ارتدادٍ بأعيانها
  const before={gRavenCount:1,gRavenRotate:1,gMirrorReflect:1,
    fSq:2,gShapeRotateSeq:2,gShapeSeries:2,fDouble:3,fTriple:3,gCube:4,gSpeedGraph:4};
  Object.keys(before).forEach(n=>{
    const now=spread[n]?spread[n].n:0;
    ok(now>before[n]&&now>=6,n+': '+before[n]+' ⇐ '+now+' عنصراً');
  });
}

console.log('\n٣) وسلامةُ كل عنصرٍ في المولّدات السبعة والأربعين — لا توسيعٌ يكسر سؤالاً');
{
  const bad=await p.evaluate((N)=>{
    const errs=[];
    const run=(pool)=>pool.forEach(g=>{
      for(let i=0;i<N;i++){
        let o;try{o=g()}catch(e){errs.push(g.name+': رمى '+e);break}
        if(!o||!o.q)  {errs.push(g.name+': بلا نصّ سؤال');break}
        if(!o.c||o.c.length!==4){errs.push(g.name+': الخيارات '+(o.c?o.c.length:0)+' لا أربعة');break}
        if(new Set(o.c.map(String)).size!==4){errs.push(g.name+': خيارٌ مكرّر — مموّهٌ يصير صواباً ثانياً');break}
        if(typeof o.a!=='number'||o.a<0||o.a>3){errs.push(g.name+': موضعُ الصواب '+o.a);break}
        if(!o.w){errs.push(g.name+': بلا شرح');break}
        if(o.svg!==undefined&&!String(o.svg).trim()){errs.push(g.name+': رسمٌ فارغ');break}
      }
    });
    run(QUANT_GENS);run(FLEX_GENS);
    return errs;
  },300);
  ok(bad.length===0,'أربعةُ خياراتٍ متمايزة وموضعُ صوابٍ صحيح وشرحٌ في ٣٠٠ سحبةٍ لكلٍّ'
    +(bad.length?' — '+bad.slice(0,5).join(' | '):''));
}

console.log('\n٤) مصفوفةُ النقاط: القاعدةُ المُعلنة في الشرح هي المرسومةُ فعلاً');
{
  const r=await p.evaluate((N)=>{
    const cnt=(svg)=>(String(svg).match(/<circle/g)||[]).length;
    let maxDots=0,mismatch=0,rules=new Set(),badAns=0;
    for(let i=0;i<N;i++){
      const o=gRavenCount();
      // الخليةُ المسؤولة هي السفلى اليمنى: آخرُ خليةٍ في الشبكة هي خليةُ «؟»
      if(String(o.svg).indexOf('؟')<0){badAns++;continue}
      // عددُ نقاط الخيار الصحيح
      const ans=cnt(o.c[o.a]);
      if(ans<1||ans>9)badAns++;
      o.c.forEach(x=>{const n=cnt(x);if(n>maxDots)maxDots=n});
      // الرقمُ المذكور في الشرح يطابق نقاط الصواب
      const m=String(o.w).match(/=\s*([٠-٩]+)\s*نقا?ط?/);
      const ar=m?String(m[1]).replace(/[٠-٩]/g,d=>'٠١٢٣٤٥٦٧٨٩'.indexOf(d)):null;
      if(ar!==null&&Number(ar)!==ans)mismatch++;
      rules.add(/×/.test(o.w)?'mul':/ينقص/.test(o.w)?'desc':/\+/.test(o.w)?'add':/العمود/.test(o.w)?'seqCol':'seqRow');
    }
    return{maxDots,mismatch,badAns,rules:[...rules].sort()};
  },400);
  ok(r.maxDots<=9,'لا خيارٌ يتجاوز تسع نقاط — سقفُ `dotsMarkup` بنيويّ ('+r.maxDots+')');
  ok(r.badAns===0,'وجوابُ كل جولةٍ بين ١ و٩ وخليةُ «؟» حاضرة');
  ok(r.mismatch===0,'والعددُ المذكور في الشرح يطابق نقاط الخيار الصحيح — فلا شرحٌ لقاعدةٍ أخرى');
  ok(r.rules.length>=4,'وأربعُ قواعدَ على الأقلّ من تصنيف Carpenter et al. 1990 تظهر فعلاً ('+r.rules.join(', ')+')');
}

console.log('\n٥) الانعكاس المرآتي: المحورُ المرسوم هو المذكورُ في النصّ، وصوابٌ واحد');
{
  const r=await p.evaluate((N)=>{
    let wrongAxis=0,badSet=0,vert=0,horiz=0,sides=new Set();
    for(let i=0;i<N;i++){
      const o=gMirrorReflect();
      const isVertAxis=/x1="70"[^>]*y1="5"/.test(String(o.svg));   // خطٌّ رأسيّ
      const saysVert=/يمين|يسار/.test(o.q);
      if(isVertAxis!==saysVert)wrongAxis++;
      // الصوابُ المعروض: قلبٌ أفقيّ للمحور الرأسي، ورأسيٌّ للأفقي
      const want=isVertAxis?'scale(-0.9,0.9)':'scale(0.9,-0.9)';
      if(String(o.c[o.a]).indexOf(want)<0)badSet++;
      // ولا مموّهَ يحمل تحويلَ الصواب نفسه
      o.c.forEach((x,ix)=>{if(ix!==o.a&&String(x).indexOf(want)>=0)badSet++});
      isVertAxis?vert++:horiz++;
      sides.add((isVertAxis?'v':'h')+(/يمين|أسفل/.test(o.q)?'+':'-'));
    }
    return{wrongAxis,badSet,vert,horiz,sides:[...sides].sort()};
  },300);
  ok(r.wrongAxis===0,'نصُّ السؤال يصف المحورَ المرسوم فعلاً — لا «يمين» فوق محورٍ أفقي');
  ok(r.badSet===0,'والصوابُ هو القلبُ الموافق للمحور، ولا مموّهَ يحمله');
  ok(r.vert>0&&r.horiz>0,'والمحوران كلاهما يظهر ('+r.vert+' رأسي · '+r.horiz+' أفقي)');
  ok(r.sides.length===4,'وأربعُ جهاتٍ للشكل حول محوره ('+r.sides.join(' ')+')');
}

console.log('\n٦) الرسم البياني: الاتّجاهان كلاهما يُسأل، وصوابٌ واحد في كلٍّ');
{
  const r=await p.evaluate((N)=>{
    let fwd=0,rev=0,bad=0;
    for(let i=0;i<N;i++){
      const o=gSpeedGraph();
      const isRev=/أيُّ وصفٍ/.test(o.q);
      if(isRev){rev++;
        if(o.svg===undefined||!/\<path/.test(String(o.svg)))bad++;        // الرسمُ في الصدر
        if(o.c.some(x=>/\<svg/.test(String(x))))bad++;                     // والخياراتُ نصوص
        if(String(o.w).indexOf(String(o.c[o.a]))<0)bad++;                  // والشرحُ يذكر الصواب
      }else{fwd++;
        if(!o.c.every(x=>/\<svg/.test(String(x))))bad++;                   // الخياراتُ رسوم
        if(o.svg!==undefined)bad++;                                        // ولا رسمَ في الصدر
      }
      if(o.steps===undefined&&!o.clip)bad+=0;                              // المقطعُ موصولٌ بـwithSteps
    }
    return{fwd,rev,bad};
  },300);
  ok(r.fwd>0&&r.rev>0,'الاتّجاهان يظهران ('+r.fwd+' وصفٌ⇒رسم · '+r.rev+' رسمٌ⇒وصف)');
  ok(r.bad===0,'وبنيةُ كلٍّ سليمة: الرسمُ في موضعه والخياراتُ من نوعها والشرحُ يذكر الصواب');
  const steps=await p.evaluate(()=>{
    let n=0;for(let i=0;i<60;i++){const o=gSpeedGraph();if(o.steps&&o.steps.length)n++}
    return n;
  });
  ok(steps===60,'ومقطعُ الشرح مرفقٌ بالاتّجاهين كليهما ('+steps+' من ٦٠) — لا يسقط مع الجديد');
}

console.log('\n٧) تسلسلُ الدوران: الاتّجاهُ المذكور هو الواقعُ فعلاً');
{
  const r=await p.evaluate((N)=>{
    let bad=0,cw=0,ccw=0,starts=new Set();
    const rotsOf=svg=>(String(svg).match(/rotate\((-?\d+)/g)||[]).map(x=>Number(x.slice(7)));
    for(let i=0;i<N;i++){
      const o=gShapeRotateSeq();
      const isCw=/باتجاه عقارب/.test(o.q);
      const rs=rotsOf(o.svg);
      if(rs.length!==4){bad++;continue}
      starts.add(rs[0]);
      const step=((rs[1]-rs[0])%360+360)%360;          // الخطوةُ الموجَبة
      const forward=step===45||step===90;              // ٤٥/٩٠ ⇒ مع العقارب
      if(forward!==isCw)bad++;
      isCw?cw++:ccw++;
    }
    return{bad,cw,ccw,starts:[...starts].sort((a,b)=>a-b)};
  },300);
  ok(r.bad===0,'كلُّ جولةٍ دورانُها المرسوم يطابق الاتّجاه المكتوب في سؤالها');
  ok(r.cw>0&&r.ccw>0,'والاتّجاهان كلاهما يقع ('+r.cw+' مع العقارب · '+r.ccw+' عكسها)');
  ok(r.starts.length>=4,'وزاويةُ البداية ليست صفراً دائماً ('+r.starts.join(', ')+')');
}

console.log('\n٨) وربطُ المقاطع لم ينقطع بتغيير النصوص');
{
  // `QZ_CARD_FADE_LINK` مفتاحُه `tmplKey` وهو يمحو الأرقام — فنصُّ `gCube` الجديد
  // (مُعامِلٌ رقميّ لا كلمة) يبقى على مفتاحٍ واحد. وانقطاعُه عطلٌ وقع فعلاً ٢٩ أغسطس.
  const r=await p.evaluate(()=>{
    const keys={};for(let i=0;i<120;i++){const k=tmplKey(gCube());keys[k]=(keys[k]||0)+1}
    const ks=Object.keys(keys);
    return{n:ks.length,linked:ks.filter(k=>QZ_CARD_FADE_LINK[k]==='cube').length};
  });
  ok(r.n===1,'مفتاحُ قالب المكعّب واحدٌ لكل مُعامِلاته ('+r.n+')');
  ok(r.linked===1,'وهو موصولٌ بمقطع «حجم المكعّب» فعلاً');
}

console.log('\n٩) وجلسةٌ حقيقية: اثنا عشر عنصراً متمايزاً بلا تكرار — لا انحدار على ترتيب ٢٤ أكتوبر');
{
  const r=await p.evaluate(()=>{
    const out=[];
    for(let s=0;s<40;s++){
      ['quant','flex'].forEach(d=>{
        const items=drawSpread(d==='quant'?QUANT_GENS:FLEX_GENS,12);
        const keys=items.map(o=>JSON.stringify({q:o&&o.q,svg:o&&o.svg,
          c:(o&&o.c?o.c.slice().map(String).sort():null)}));
        out.push({d:d,n:items.length,uniq:new Set(keys).size,
          tmpl:new Set(items.map(o=>tmplKey(o))).size});
      });
    }
    return out;
  });
  const short=r.filter(x=>x.n!==12);
  ok(short.length===0,'صفرُ جلسةٍ ناقصة من ثمانين ('+short.length+')');
  const dup=r.filter(x=>x.uniq!==12);
  ok(dup.length===0,'وصفرُ جلسةٍ فيها عنصرٌ مُعاد بعينه ('+dup.length+')');
  const tdup=r.filter(x=>x.tmpl!==12);
  ok(tdup.length===0,'وصفرُ جلسةٍ فيها قالبٌ مُعاد — ضمانةُ ٢٤ أكتوبر باقية ('+tdup.length+')');
}

console.log('\n١٠) وعيبان كشفتهما اللقطة لا الاختبار — يُحرَسان بالإحداثيات');
{
  // (أ) الشبكةُ تُقرأ من اليمين: الخليةُ الأولى تُرسَم يميناً و«؟» سفلى يساراً.
  //     كانت معكوسةً، فصفُّ ١-٢-٣ يُقرأ ٣-٢-١ ومموّهُ ٧ معروضٌ لمن قرأ صحيحاً.
  const grid=await p.evaluate(()=>{
    const out=[];
    [gRavenCount,gRavenRotate].forEach(g=>{
      const o=g();
      // مواضعُ `x` بترتيب ظهورها في الشيفرة: الخليةُ (٠،٠) يجب أن تكون الأيمن (١٣٥)
      const xs=(String(o.svg).match(/<rect x="(\d+)"/g)||[]).map(m=>Number(m.match(/\d+/)[0]));
      const qx=(String(o.svg).match(/<rect x="(\d+)"[^>]*stroke-dasharray/)||[])[1];
      out.push({name:g.name,first:xs[0],q:Number(qx)});
    });
    return out;
  });
  grid.forEach(x=>{
    ok(x.first===135,x.name+': الخليةُ الأولى تُرسَم يميناً (x='+x.first+' لا ٥)');
    ok(x.q===5,x.name+': وخليةُ «؟» سفلى يساراً — آخرُ ترتيب القراءة (x='+x.q+')');
  });
  // (ب) «السرعة» كانت تُقصّ إلى «ال» — نصٌّ عربيّ يُرسَم يساراً من مرساته فيخرج
  //     عن لوحة العرض. يُقاس بالحدود لا بالنظر، وفي المنحنيات الأربعة كلِّها.
  const lbl=await p.evaluate(()=>{
    const host=document.createElement('div');
    host.style.cssText='position:fixed;left:0;top:0;opacity:0';
    host.innerHTML=['accel','const','decel','stop'].map(k=>curveSVG(k)).join('');
    document.body.appendChild(host);
    const bad=[];
    [...host.querySelectorAll('svg')].forEach((s,i)=>{
      const box=s.getBoundingClientRect();
      [...s.querySelectorAll('text')].forEach(t=>{
        const r=t.getBoundingClientRect();
        if(r.left<box.left-0.5||r.right>box.right+0.5||r.width<2)
          bad.push(i+':'+t.textContent+' ['+Math.round(r.left-box.left)+'..'+Math.round(r.right-box.left)+'] من '+Math.round(box.width));
      });
    });
    host.remove();return bad;
  });
  ok(lbl.length===0,'ووسما المحورين داخل حدود كل منحنًى من الأربعة'+(lbl.length?' — '+lbl.join(' | '):''));
}

await b.close();
console.log(fails?('\n✗ '+fails+' فحصاً فشل'):'\n✓ الكلّ نجح');
process.exit(fails?1:0);
})();
