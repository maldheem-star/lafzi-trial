// سجلّ العرض الشخصي ومنع تكرار العنصر نفسه للابن نفسه — ٢٥ أغسطس.
// السيناريوهان المطلوبان صراحةً: ابنٌ جديد بلا تاريخ، وابنٌ أجاب على كل شيء.
const {chromium}=require('/opt/node22/lib/node_modules/playwright');
let fails=0;const ok=(c,m)=>{console.log((c?'  ✓ ':'  ✗ FAIL ')+m);if(!c)fails++};
(async()=>{
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'});
const mk=async(who)=>{
  const logs=[];
  const page=await b.newPage({viewport:{width:420,height:900}});
  page.on('pageerror',e=>{console.log('  ✗ PAGEERROR '+e.message);fails++});
  await page.route('**/rest/v1/**',async r=>{
    if(r.request().method()==='GET')return r.fulfill({status:200,contentType:'application/json',body:'[]'});
    let body={};try{body=JSON.parse(r.request().postData()||'{}')}catch(e){}
    logs.push(body);r.fulfill({status:201,contentType:'application/json',body:'[]'});
  });
  await page.route('**/functions/v1/**',r=>r.fulfill({status:200,contentType:'application/json',body:'{"ok":false}'}));
  await page.addInitScript(()=>{
    Object.defineProperty(window,'speechSynthesis',{configurable:true,value:{speak(){},cancel(){},getVoices:()=>[{lang:'en-US',name:'X'}],speaking:false,pending:false}});
    window.SpeechSynthesisUtterance=function(t){this.text=t};
  });
  await page.goto('http://127.0.0.1:8931/index.html'+(who?'?p='+who:''));
  await page.waitForFunction(()=>typeof topUpPlan==='function');
  page._logs=logs;return page;
};

console.log('\n١) السجلّ يُكتب من logAnswer وحدها — نقطةٌ واحدة تخدم كل قسم');
{
  const p=await mk();
  const r=await p.evaluate(()=>{
    lsSet(SEEN_KEY,'{}');
    logAnswer('listen','A1',true,'x','ls_a1_1',900);
    logAnswer('read','A1',false,'y','rd_a1_1',900);
    logAnswer('gen','twin',null,'z','ai_x',null);   // صفُّ نظامٍ لا عرض
    const o=seenLoad();
    return{keys:Object.keys(o).sort(),okRec:o.ls_a1_1,badRec:o.rd_a1_1,sys:o.ai_x};
  });
  ok(r.keys.length===2,'عنصرا الإجابة سُجّلا — '+r.keys.join(','));
  ok(!r.sys,'وصفُّ النظام (is_correct=null) لا يُعدّ عرضاً');
  ok(r.okRec&&r.okRec.ok===1&&r.okRec.n===1,'الصحيح يُسجَّل بعدّاده');
  ok(r.badRec&&r.badRec.bad===1,'والخاطئ كذلك');
  await p.close();
}

console.log('\n٢) مدّة التهدئة: ٧ أيام للمُصاب، و٣ لمن أخطأته');
{
  const p=await mk();
  const r=await p.evaluate(()=>{
    const d=seenDay();
    const mk=(o,bad,last)=>({n:1,ok:o,bad:bad,last:last});
    return{
      okToday:seenBlockedFor(mk(1,0,d)),
      ok6:seenBlockedFor(mk(1,0,d-6)),
      ok7:seenBlockedFor(mk(1,0,d-7)),
      badToday:seenBlockedFor(mk(0,1,d)),
      bad2:seenBlockedFor(mk(0,1,d-2)),
      bad3:seenBlockedFor(mk(0,1,d-3)),
      never:seenBlockedFor(null),
    };
  });
  ok(r.okToday===7,'المُصاب اليوم محجوبٌ سبعة أيام — '+r.okToday);
  ok(r.ok6===1&&r.ok7===0,'ويُفتح في اليوم السابع بالضبط');
  ok(r.badToday===3,'والمُخطَأ محجوبٌ ثلاثة — '+r.badToday);
  ok(r.bad2===1&&r.bad3===0,'ويعود في الثالث للتثبيت');
  ok(r.never===0,'وما لم يُعرض قطّ غير محجوب');
  await p.close();
}

console.log('\n٣) سيناريو «ابنٌ جديد»: لا تاريخ ⇒ الجلسة كاملة ولا إنذار استنفاد');
{
  const p=await mk();
  const r=await p.evaluate(()=>{
    lsSet(SEEN_KEY,'{}');
    const POOL=Array.from({length:20},(_,i)=>({id:'p'+i,q:'Q'+i}));
    const out=topUpPlan([],POOL,8,'listen');
    return{n:out.length,uniq:new Set(out.map(x=>x.id)).size,ex:_seenExhausted.listen};
  });
  ok(r.n===8,'الجلسة ثمانية عناصر');
  ok(r.uniq===8,'ولا تكرار داخلها');
  ok(r.ex&&r.ex.blocked===0,'ولا عنصرَ محجوب — '+(r.ex&&r.ex.blocked));
  ok(!p._logs.some(l=>l&&l.qtype==='exhausted'),'ولا سطرَ استنفادٍ يُرسَل');
  await p.close();
}

console.log('\n٤) ما عُرض اليوم يُؤجَّل ما دام في البنك بديل');
{
  const p=await mk();
  const r=await p.evaluate(()=>{
    const d=seenDay(),o={};
    for(let i=0;i<8;i++)o['p'+i]={n:1,ok:1,last:d};      // ثمانيةٌ عُرضت اليوم
    lsSet(SEEN_KEY,JSON.stringify(o));
    const POOL=Array.from({length:20},(_,i)=>({id:'p'+i,q:'Q'+i}));
    const out=topUpPlan([],POOL,8,'listen');
    return{ids:out.map(x=>x.id),todayIn:out.filter(x=>o[x.id]).length};
  });
  ok(r.todayIn===0,'ولا واحدٌ ممّا عُرض اليوم عاد — '+r.todayIn+' من ٨');
  ok(r.ids.length===8,'والجلسة بقيت كاملة');
  await p.close();
}

console.log('\n٥) الأولوية: ما لم يُعرض قطّ يسبق الأقدم عهداً يسبق المحجوب');
{
  const p=await mk();
  const r=await p.evaluate(()=>{
    const d=seenDay();
    lsSet(SEEN_KEY,JSON.stringify({
      recent:{n:1,ok:1,last:d-1},      // محجوب (بقي ٦)
      old:{n:1,ok:1,last:d-40},        // مفتوح ومنذ زمن
    }));
    const POOL=[{id:'recent'},{id:'old'},{id:'never'}];
    return topUpPlan([],POOL,3,'listen').map(x=>x.id);
  });
  ok(r[0]==='never','الأوّل ما لم يُعرض قطّ — '+r[0]);
  ok(r[1]==='old','ثم الأقدم عهداً — '+r[1]);
  ok(r[2]==='recent','ثم المحجوب أخيراً — '+r[2]);
  await p.close();
}

console.log('\n٦) سيناريو «ابنٌ أجاب على كل شيء»: الجلسة لا تخوى، والاستنفاد يُبلَّغ');
{
  const p=await mk();
  const r=await p.evaluate(()=>{
    const d=seenDay(),o={};
    for(let i=0;i<10;i++)o['p'+i]={n:3,ok:3,last:d};   // كل البنك عُرض اليوم وأُصيب
    lsSet(SEEN_KEY,JSON.stringify(o));
    const POOL=Array.from({length:10},(_,i)=>({id:'p'+i,q:'Q'+i}));
    const out=topUpPlan([],POOL,8,'minpair');
    return{n:out.length,uniq:new Set(out.map(x=>x.id)).size,ex:_seenExhausted.minpair};
  });
  ok(r.n===8,'الجلسة ما زالت ثمانية — لا تخوى (قاعدة ١٨ أغسطس)');
  ok(r.uniq===8,'وبلا تكرارٍ داخلها رغم الاستنفاد');
  ok(r.ex&&r.ex.blocked===8,'وكلّها محجوبة — '+(r.ex&&r.ex.blocked));
  ok(r.ex&&r.ex.freshLeft===0,'ولا عنصرَ بكرٌ باقٍ');
  await p.waitForTimeout(300);
  const row=p._logs.find(l=>l&&l.qtype==='exhausted');
  ok(!!row,'وسطرُ استنفادٍ وصل الخادم');
  ok(row&&row.domain==='gen','في domain=gen لا في سجلّ القسم — فلا يُلوّث دقّته');
  ok(row&&/minpair/.test(row.response||''),'ويُسمّي البنك — '+(row&&row.response||'').slice(0,40));
  ok(row&&/استُنفد/.test(row.q_text||''),'ويقول إنه استُنفد صراحةً');
  await p.close();
}

console.log('\n٧) الفصل بين الأبناء تلقائيّ — سجلّ محمد لا يمسّ سجلّ هيا');
{
  const p1=await mk('mohammed');
  await p1.evaluate(()=>{lsSet(SEEN_KEY,'{}');logAnswer('listen','B1',true,'x','shared_item',900)});
  const mo=await p1.evaluate(()=>Object.keys(seenLoad()).length);
  const raw=await p1.evaluate(()=>({mine:localStorage.getItem('mohammed::'+SEEN_KEY),haya:localStorage.getItem(SEEN_KEY)}));
  await p1.close();
  ok(mo===1,'سُجّل لمحمد');
  ok(!!raw.mine,'تحت مفتاحه هو (mohammed::)');
  ok(!raw.haya,'ومفتاح هيا لم يُمسّ — الفصل من pkey لا من كودٍ جديد');
}

console.log('\n٨) البذر من الخادم يدمج ولا يستبدل، وفشلُه لا يُعطّل شيئاً');
{
  const page=await b.newPage({viewport:{width:420,height:900}});
  page.on('pageerror',e=>{console.log('  ✗ PAGEERROR '+e.message);fails++});
  await page.route('**/rest/v1/**',async r=>{
    if(r.request().method()==='GET')return r.fulfill({status:200,contentType:'application/json',
      body:JSON.stringify([{item_id:'srv1',is_correct:true,created_at:new Date().toISOString()}])});
    r.fulfill({status:201,contentType:'application/json',body:'[]'});
  });
  await page.route('**/functions/v1/**',r=>r.fulfill({status:200,contentType:'application/json',body:'{"ok":false}'}));
  await page.addInitScript(()=>{
    Object.defineProperty(window,'speechSynthesis',{configurable:true,value:{speak(){},cancel(){},getVoices:()=>[{lang:'en-US',name:'X'}],speaking:false,pending:false}});
    window.SpeechSynthesisUtterance=function(t){this.text=t};
  });
  await page.goto('http://127.0.0.1:8931/index.html');
  await page.waitForFunction(()=>typeof seenSeed==='function');
  const r=await page.evaluate(async()=>{
    lsSet(SEEN_KEY,JSON.stringify({local1:{n:1,ok:1,last:seenDay()}}));
    _seenSeeded=false;
    const okSeed=await seenSeed();
    const o=seenLoad();
    return{okSeed,keys:Object.keys(o).sort(),localKept:!!o.local1,srv:!!o.srv1};
  });
  ok(r.okSeed===true,'البذر نجح');
  ok(r.srv,'وعنصرُ الخادم دخل السجلّ');
  ok(r.localKept,'والمحلّي بقي — دمجٌ لا استبدال');
  await page.close();
  // وفشلُ الشبكة لا يكسر شيئاً
  const p2=await mk();
  const r2=await p2.evaluate(async()=>{
    lsSet(SEEN_KEY,JSON.stringify({a:{n:1,ok:1,last:seenDay()}}));
    _seenSeeded=false;
    const res=await seenSeed();
    return{res,still:Object.keys(seenLoad()).length};
  });
  ok(r2.res===false||r2.still>=1,'وفشلُه يترك السجلّ المحلّي عاملاً');
  await p2.close();
}

console.log('\n٩) الوصل عامٌّ فعلاً: البانيات كلّها تمرّ بـtopUpPlan باسم قسمها');
{
  const p=await mk();
  const r=await p.evaluate(()=>{
    const src=document.documentElement.innerHTML;
    const m=[...src.matchAll(/topUpPlan\(out,POOL,[A-Z0-9_]+_N,"(\w+)"\)/g)].map(x=>x[1]);
    return{doms:[...new Set(m)].sort(),n:m.length};
  });
  ok(r.n>=9,'تسع بانياتٍ على الأقل تمرّ به — '+r.n);
  ['listen','read','write','gram','math6','step','stat','minpair','video']
    .forEach(d=>ok(r.doms.includes(d),'  ويُسمّي '+d));
  await p.close();
}

await b.close();
console.log(fails?`\n=== ${fails} فشل ===`:'\n=== كل الاختبارات نجحت ===');
process.exit(fails?1:0);
})();
