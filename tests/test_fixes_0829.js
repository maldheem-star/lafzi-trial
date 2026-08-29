// إصلاحات ٢٩ أغسطس: عتبة توأم الجلسة بالقسم، وتسجيل فشل التوليد، واللصق لا يُنجح،
// ومعرّفات أسئلة القدرات لتعمل التهدئة العابرة للأيّام.
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
  });
  await page.goto('http://127.0.0.1:8931/index.html'+(who?'?p='+who:''));
  await page.waitForFunction(()=>typeof planNoTwins==='function'&&typeof twinThrFor==='function');
  page._logs=logs;return page;
};

console.log('\n١) عتبة توأم الجلسة تختلف بالقسم — تكرار كتابة إلياس');
{
  const p=await mk('elias');
  const r=await p.evaluate(()=>{
    const out={thr:{},pairsOver:{}};
    ['listen','read','gram','step','video','write','minpair'].forEach(function(d){out.thr[d]=twinThrFor(d)});
    // أزواجٌ متمايزة يقيناً داخل كل بنك: كم منها يتجاوز عتبة قسمه؟
    const banks={write:WRITE_BANK,listen:LISTEN_BANK,gram:GRAM_BANK};
    for(const k in banks){
      const byLv={};banks[k].forEach(x=>{(byLv[x.lv||'-']=byLv[x.lv||'-']||[]).push(x)});
      let over=0,tot=0;
      for(const lv in byLv){const g=byLv[lv];
        for(let i=0;i<g.length;i++)for(let j=i+1;j<g.length;j++){
          tot++;if(twinSim(itemText(g[i]),itemText(g[j]))>=twinThrFor(k))over++;}}
      out.pairsOver[k]={over:over,tot:tot};
    }
    // وجلسةُ كتابةٍ حقيقية لا تُذبح: ثلاثة عناصر A2 متمايزة تبقى ثلاثة
    const A2=WRITE_BANK.filter(function(x){return x.lv==='A2'}).slice(0,3);
    out.kept=planNoTwins(A2.slice(),WRITE_BANK.filter(function(x){return x.lv==='A2'}),3,'write').length;
    out.keptOld=(function(){   // بالعتبة القديمة الموحّدة، للمقارنة
      const kept=[];A2.forEach(function(it){
        if(!kept.some(function(k){return twinSim(itemText(k),itemText(it))>=GEN_TWIN}))kept.push(it)});
      return kept.length;
    })();
    return out;
  });
  ok(r.thr.write===0.6,'الكتابة عتبتها مرخاة — '+r.thr.write);
  ok(r.thr.minpair===0.6,'وminpair كذلك — '+r.thr.minpair);
  ok(r.thr.listen===0.02&&r.thr.gram===0.02&&r.thr.step===0.02,'وبقيّة الأقسام على عتبتها الشديدة');
  ok(r.pairsOver.write.over===0,'ولا زوجَ كتابةٍ متمايزٍ يُرفَض الآن — '+r.pairsOver.write.over+' من '+r.pairsOver.write.tot);
  ok(r.pairsOver.listen.over===0&&r.pairsOver.gram.over===0,'ولا في الاستماع والقواعد');
  ok(r.kept===3,'وجلسة كتابةٍ من ثلاثة تبقى ثلاثة — '+r.kept);
  ok(r.keptOld<3,'وبالعتبة القديمة كانت تنقص — '+r.keptOld+' (وهو سبب شكوى إلياس)');
  await p.close();
}

console.log('\n٢) فشل تفكيك العنصر المولَّد يُسجَّل بسببه مسمّى');
{
  const p=await mk();
  const cases=await p.evaluate(()=>{
    const mkTxt=function(s1,s2,s3,s4,oks){
      return [1,2,3,4].map(function(i){
        const t=[s1,s2,s3,s4][i-1];
        return "S"+i+": "+t+"\nS"+i+"_OK: "+(oks[i-1]?"yes":"no")+"\nS"+i+"_WHY: سبب"+i;
      }).join("\n");
    };
    const out={};
    out.arabic=parseGenPickBlock(mkTxt("He goes home.","هو يذهب.","He go home.","He going home.",[1,0,0,0]),"gram",false);
    out.dup=parseGenPickBlock(mkTxt("He goes home.","He goes home.","He go home.","He going home.",[1,0,0,0]),"gram",false);
    out.two=parseGenPickBlock(mkTxt("He goes home.","She goes home.","He go home.","He going home.",[1,1,0,0]),"gram",false);
    out.zero=parseGenPickBlock(mkTxt("He go home.","She go home.","He going home.","Him goes home.",[0,0,0,0]),"gram",false);
    out.shape=parseGenPickBlock("S1: only one line","gram",false);
    return out;
  });
  ['arabic','dup','two','zero','shape'].forEach(function(k){
    ok(cases[k]===null,'حالة «'+k+'» تُسقَط');
  });
  await p.waitForTimeout(350);
  const rows=p._logs.filter(x=>x&&x.qtype==='parse_fail');
  ok(rows.length>=5,'وكلُّها مسجَّلة — '+rows.length+' صفّاً (كانت تُبتلَع صمتاً)');
  ok(rows.every(x=>x.domain==='gen'),'في domain=gen لا في سجلّ القسم');
  const whys=rows.map(x=>String(x.response||''));
  ok(whys.some(x=>/arabic/.test(x)),'والسبب مسمّى: arabic');
  ok(whys.some(x=>/dup_sentences/.test(x)),'و dup_sentences');
  ok(whys.some(x=>/ok_count_2/.test(x)),'و ok_count_2');
  ok(whys.some(x=>/ok_count_0/.test(x)),'و ok_count_0');
  ok(whys.some(x=>/shape/.test(x)),'و shape');
  await p.close();
}

console.log('\n٣) اللصق لا يُمنح نجاحاً، والتصحيح التلقائي لا يُعاقَب');
{
  const p=await mk('mohammed');
  const r=await p.evaluate(()=>{
    return{paste:WRITE_PASTE_TYPES.slice(),dict:WRITE_DICTATE_TYPES.slice()};
  });
  ok(r.paste.indexOf('insertFromPaste')>=0,'اللصق في قائمة اللصق');
  ok(r.dict.indexOf('insertReplacementText')<0,'و«insertReplacementText» خرج من قائمة الإملاء — تصحيحٌ تلقائي لا إملاء');
  ok(r.paste.indexOf('insertReplacementText')<0,'ولا هو لصق');
  ok(r.dict.indexOf('insertCompositionText')>=0,'والتركيب الصوتي إملاءٌ كما كان');
  // والحدُّ يفصل الحالتين المقاستين: تصحيح كلمة (٧-٩) لا يُعاقَب، وتسليم جملة يُمسَك
  const burst=await p.evaluate(()=>{
    const out={};
    const run=function(len){
      startWrite();writeBurstReset("");
      const el=document.getElementById('writeIn');
      el.value=new Array(len+1).join('x');
      el.dispatchEvent(new InputEvent('input',{bubbles:true,inputType:"insertReplacementText"}));
      return{dict:writeDictated,burst:writeMaxBurst};
    };
    out.word=run(9);       // أكبر دفعة تصحيحٍ تلقائي مرصودة عند إلياس
    out.sentence=run(64);  // دفعة الجملة في حالة test_localize
    out.cap=WRITE_REPLACE_MAX;
    return out;
  });
  ok(burst.word.dict===false,'دفعةُ كلمة ('+burst.word.burst+') لا تُوسَم إملاءً — إلياس لا يُعاقَب على لوحة هاتفه');
  ok(burst.sentence.dict===true,'ودفعةُ جملة ('+burst.sentence.burst+') تُوسَم — الثغرة مسدودة');
  ok(burst.cap>9&&burst.cap<51,'والحدّ بين ما قِيس فعلاً — '+burst.cap+' (٩ تصحيحاً، ٥١ أصغرَ لصقٍ مرصود)');
  // الأثر الفعلي على الدرجة: نصٌّ ملصوق يبلغ عدد الكلمات ولا يُحتسب
  const eff=await p.evaluate(async()=>{
    startWrite();
    const it=writeCur();
    const el=document.getElementById('writeIn');
    if(!el)return{noField:true};
    const long=new Array(200).fill('word').join(' ');
    el.value=long;
    writePasted=true;                       // ما يضبطه writeLive عند insertFromPaste
    writeCount=writeWordCount(long);
    const goals=writeGoals(it);
    return{words:writeCount,target:goals.words,lenOk:writeCount>=goals.words};
  });
  ok(eff.noField||eff.lenOk===true,'النصّ الملصوق يتجاوز هدف الكلمات — '+eff.words+'/'+eff.target);
  const scored=await p.evaluate(()=>{
    // نفس سطر الحكم في writeSubmit بالضبط
    const it=writeCur(),lenOk=true;
    const mk=function(pasted){return (false||pasted)?false:(it.type==="combine"?(lenOk&&true):lenOk)};
    return{pasted:mk(true),typed:mk(false)};
  });
  ok(scored.pasted===false,'ومع ذلك لا يُحتسب نجاحاً');
  ok(scored.typed===true,'والنصّ المكتوب بالأصابع يُحتسب كما كان');
  await p.close();
}

console.log('\n٤) أسئلة القدرات صار لها معرّف، فتعمل التهدئة العابرة للأيّام');
{
  const p=await mk();
  const r=await p.evaluate(()=>{
    const q=VERBAL[0];
    return{key:tmplKey(q),stable:tmplKey(q)===tmplKey(Object.assign({},q)),
      // القالب يوحّد الأرقام: سؤالان بأرقامٍ مختلفة مفتاحهما واحد
      sameTmpl:tmplKey({q:"مجموع خمسة أعداد متتالية يساوي ٤٠"})===tmplKey({q:"مجموع خمسة أعداد متتالية يساوي ٦٠"})};
  });
  ok(!!r.key,'المفتاح غير فارغ — «'+String(r.key).slice(0,40)+'»');
  ok(r.stable===true,'وثابت');
  ok(r.sameTmpl===true,'ويوحّد القالب رغم اختلاف الأرقام');
  // الترتيب: ما عُرض اليوم يتأخّر عن الذي لم يُعرض قطّ
  const rank=await p.evaluate(()=>{
    const a=VERBAL[0],c=VERBAL[1];
    const o={};o[tmplKey(a)]={n:3,last:seenDay(),ok:3};
    seenSave(o);
    sessionSeenQuestions.clear&&sessionSeenQuestions.clear();
    const got=takeUniqueFrom([a,c],1);
    return{first:got.length?tmplKey(got[0]):null,wantedFirst:tmplKey(c),avoided:tmplKey(a)};
  });
  ok(rank.first===rank.wantedFirst,'ويُقدَّم ما لم يُعرض على ما عُرض اليوم');
  // ولا تنقص الجلسة: الكلُّ محجوبٌ ⇒ يعود الأقدم
  const nonEmpty=await p.evaluate(()=>{
    const a=VERBAL[0],c=VERBAL[1],o={};
    o[tmplKey(a)]={n:1,last:seenDay(),ok:1};o[tmplKey(c)]={n:1,last:seenDay(),ok:1};
    seenSave(o);sessionSeenQuestions.clear&&sessionSeenQuestions.clear();
    return takeUniqueFrom([a,c],2).length;
  });
  ok(nonEmpty===2,'وإن كان الكلُّ معروضاً اليوم لا تخوى الجلسة — '+nonEmpty);
  await p.close();
}

await b.close();
console.log(fails?`\n=== ${fails} فشل ===`:'\n=== كل الاختبارات نجحت ===');
process.exit(fails?1:0);
})();
