// إصلاحات ٢٦ أغسطس: تكرار إلياس (توأم التوليد)، ووصول محتوى مستوى هيا، ووسم تعارض Azure.
const {chromium}=require('/opt/node22/lib/node_modules/playwright');
let fails=0;const ok=(c,m)=>{console.log((c?'  ✓ ':'  ✗ FAIL ')+m);if(!c)fails++};
(async()=>{
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'});
const mk=async(who)=>{
  const logs=[],gen=[];
  const page=await b.newPage({viewport:{width:420,height:900}});
  page.on('pageerror',e=>{console.log('  ✗ PAGEERROR '+e.message);fails++});
  await page.route('**/rest/v1/**',async r=>{
    if(r.request().method()!=='POST')return r.fulfill({status:200,contentType:'application/json',body:'[]'});
    let x={};try{x=JSON.parse(r.request().postData()||'{}')}catch(e){}
    logs.push(x);r.fulfill({status:201,contentType:'application/json',body:'[]'});
  });
  // الترتيب مقصود: playwright يُقدّم آخرَ مسارٍ مُسجَّل، فالعامّ أوّلاً والخاصّ بعده
  await page.route('**/functions/v1/**',r=>r.fulfill({status:200,contentType:'application/json',body:'{"ok":false}'}));
  await page.route('**/functions/v1/tutor',async r=>{
    let x={};try{x=JSON.parse(r.request().postData()||'{}')}catch(e){}
    gen.push(x);r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({ok:false})});
  });
  await page.addInitScript(()=>{
    Object.defineProperty(window,'speechSynthesis',{configurable:true,value:{speak(){},cancel(){},getVoices:()=>[{lang:'en-US',name:'X'}],speaking:false,pending:false}});
    window.SpeechSynthesisUtterance=function(t){this.text=t};
  });
  await page.goto('http://127.0.0.1:8931/index.html'+(who?'?p='+who:''));
  await page.waitForFunction(()=>typeof genBankAdd==='function');
  page._logs=logs;page._gen=gen;return page;
};

console.log('\n١) التوأم يُرفَض عند التخزين لا عند العرض');
{
  const p=await mk();
  const r=await p.evaluate(()=>{
    const K='__t_twin_v1';
    try{localStorage.removeItem(pkey(K))}catch(e){}
    const A={id:'ai_1',lv:'A2',passage:"Haya and Musfir are making a poster about AlUla for their school project.",q:'What?',c:['a','b','c'],a:0};
    // نفس الموضوع بصياغةٍ أخرى — وهو بعينه ما وقع في بيانات إلياس
    const B={id:'ai_2',lv:'A2',passage:"Hanan and Musfir are making a model of AlUla for their school project.",q:'What?',c:['a','b','c'],a:0};
    const C={id:'ai_3',lv:'A2',passage:"The bus to Dammam leaves from the station at seven in the morning.",q:'When?',c:['a','b','c'],a:0};
    genBankAdd(K,A);const afterB=genBankAdd(K,B).length;const afterC=genBankAdd(K,C).length;
    return{afterB,afterC,sim:twinSim(itemText(A),itemText(B)),thr:GEN_TWIN,
           ids:genBankLoad(K).map(x=>x.id)};
  });
  ok(r.sim>=r.thr,'العنصران توأمان بمقياس المشروع نفسه — '+r.sim.toFixed(3)+' ≥ '+r.thr);
  ok(r.afterB===1,'والثاني لم يُخزَّن — '+r.afterB);
  ok(r.afterC===2,'والمتمايز يُخزَّن عادةً — '+r.afterC);
  ok(r.ids.join(',')==='ai_1,ai_3','والبنك يحمل المتمايزَين فقط — '+r.ids.join(','));
  await p.waitForTimeout(250);
  const row=p._logs.find(l=>l&&l.qtype==='twin_reject');
  ok(!!row,'ورفضُه مسجَّل');
  ok(row&&row.domain==='gen','في domain=gen لا في سجلّ القسم');
  await p.close();
}

console.log('\n٢) بذرة الموضوع مميّزة لكل نداء — لا تصادم في الدفعة');
{
  const p=await mk();
  const seeds=await p.evaluate(async()=>{
    const out=[];
    for(let i=0;i<6;i++){await fetchTutorGen('listen','A2')}
    return out;
  });
  const idx=p._gen.filter(x=>x.mode==='gen').map(x=>x.topicIdx);
  ok(idx.length>=6,'ستّة نداءات على الأقل — '+idx.length);
  ok(idx.length>0&&idx.every(x=>typeof x==='number'),'كلّها تحمل بذرة موضوع');
  ok(idx.length>0&&new Set(idx).size===idx.length,'ولا بذرتين متطابقتين في الدفعة — '+idx.join(','));
  await p.close();
}

console.log('\n٣) ما في مستواها يسبق ما فوقه في خطّة الإنجليزية');
{
  const p=await mk();
  const r=await p.evaluate(()=>{
    const st={},today=srsToday();
    ENG_BUILD.forEach(x=>{if(engBuildLv(x)==='A2')st[x.id]={due:today-1,ivl:1,s:1,d:9,reps:3,lapses:3,last:today-1}});
    srsSave(st);
    const plan=buildDailyPlan().items.filter(i=>i.t==='build');
    const firstA1=plan.findIndex(i=>String(i.id).indexOf('b_a1_')===0);
    return{n:plan.length,firstA1,ids:plan.slice(0,5).map(i=>i.id),
           anyB1:plan.filter(i=>engBuildLv(ENG_BUILD.find(x=>x.id===i.id)||{})==='B1').length};
  });
  ok(r.firstA1===0,'أوّل عنصرِ بناءٍ في مستواها لا فوقه — '+r.ids.join(','));
  ok(r.anyB1===0,'ولا عنصر B1 يصل A1 إطلاقاً');
  ok(r.n>5,'والخطّة ما زالت تحمل المستحقّ كذلك — '+r.n+' عنصراً');
  await p.close();
}

console.log('\n٤) تعارض مسطرتَي النطق يُوسَم ولا يُبتلَع');
{
  const p=await mk();
  const r=await p.evaluate(()=>{
    const target="I can't remember the teacher's last name.";
    // Azure أعاد عدد كلماتٍ مخالفاً (الاختصارات) واكتمالاً منخفضاً، والنصّ يكاد يطابق
    const data={ok:true,heard:"I can not remember the teacher's last name.",
      lexical:"I can not remember the teacher's last name.",
      pron:93,accuracy:47,fluency:80,completeness:29,
      words:[{w:"I",score:10,err:'None'},{w:"can't",score:90,err:'None'},
             {w:"remember",score:90,err:'None'},{w:"the",score:90,err:'None'},
             {w:"teacher's",score:90,err:'None'},{w:"last",score:90,err:'None'},
             {w:"name",score:90,err:'None'}],
      weak:[]};
    const sc=azureToScore(target,data);
    return{aligned:sc.aligned,disagree:sc.disagree,pct:sc.pct,comp:sc.completeness};
  });
  // ===== رُوجع هذا السطر في ٣٠ أغسطس، ولم يُدهَس =====
  // كُتب يوم كان اختلالُ المحاذاة **سببَ** التعارض: «can't» كلمةٌ عند Azure وكلمتان
  // عندنا. وقد عولج السبب (`azExpandWords`) فصار هذا الصفّ **يتحاذى**، والدعوى
  // القديمة («المحاذاة فشلت») لم تعد صحيحة فتُصحَّح.
  // **وما لا يتغيّر هو ما جاء الاختبار لأجله**: التعارض نفسه ما زال قائماً — درجةٌ
  // ٩٣٪ بينما Azure يقول إنها لم تنطق إلّا ٢٩٪ من الجملة — فيبقى موسوماً. ولهذا
  // نُزع شرطُ `!aligned` من الوسم: لولا ذلك لأخفى الإصلاحُ عطلاً لم يُصلحه.
  ok(r.aligned===true,'يتحاذى بعد تفكيك الاختصار في الطرفين — '+r.aligned);
  ok(r.disagree===true,'والتعارض يبقى موسوماً رغم المحاذاة — درجة '+r.pct+'٪ مع اكتمال '+r.comp+'٪');
  // وحالةٌ سليمة لا تُوسَم
  const clean=await p.evaluate(()=>{
    const t="Go away!";
    const d={ok:true,heard:"Go away!",lexical:"Go away!",pron:90,accuracy:90,fluency:90,completeness:100,
      words:[{w:"Go",score:90,err:'None'},{w:"away",score:90,err:'None'}],weak:[]};
    const sc=azureToScore(t,d);return{aligned:sc.aligned,disagree:sc.disagree};
  });
  ok(clean.aligned===true&&clean.disagree===false,'وجملةٌ متّسقة لا تُوسَم — لا بلاغ كاذب');
  await p.close();
}

await b.close();
console.log(fails?`\n=== ${fails} فشل ===`:'\n=== كل الاختبارات نجحت ===');
process.exit(fails?1:0);
})();
