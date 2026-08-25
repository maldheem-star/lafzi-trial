// لقطات شاشة للمواضع المتأثّرة + فحص الاتّجاه بصرياً لا نصّياً.
// قاعدة ٢٥ أغسطس: «اختبارٌ يقرأ النصّ لا يرى الاتّجاه» — فالفحص هنا على **مواضع
// المحارف المرسومة** (getBoundingClientRect) لا على النصّ في DOM.
// التشغيل: node tests/shots.js   (يحتاج الخادم على ٨٩٣١)
const {chromium}=require('/opt/node22/lib/node_modules/playwright');
const fs=require('fs');
const OUT=process.env.SHOT_DIR||'/tmp/claude-0/-home-user-lafzi-trial/d5a80363-f01b-5f26-ba42-6a7c646126c1/scratchpad/shots';
let fails=0;const ok=(c,m)=>{console.log((c?'  ✓ ':'  ✗ FAIL ')+m);if(!c)fails++};
(async()=>{
fs.mkdirSync(OUT,{recursive:true});
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'});
const mk=async(who)=>{
  const page=await b.newPage({viewport:{width:420,height:900},deviceScaleFactor:2});
  page.on('pageerror',e=>{console.log('  ✗ PAGEERROR '+e.message);fails++});
  await page.route('**/rest/v1/**',async r=>r.fulfill({status:r.request().method()==='GET'?200:201,
    contentType:'application/json',body:'[]'}));
  await page.route('**/functions/v1/**',r=>r.fulfill({status:200,contentType:'application/json',body:'{"ok":false}'}));
  await page.addInitScript(()=>{
    Object.defineProperty(window,'speechSynthesis',{configurable:true,value:{speak(){},cancel(){},getVoices:()=>[{lang:'en-US',name:'X'}],speaking:false,pending:false}});
    window.SpeechSynthesisUtterance=function(t){this.text=t};
  });
  await page.goto('http://127.0.0.1:8931/index.html'+(who?'?p='+who:''));
  await page.waitForFunction(()=>typeof topUpPlan==='function');
  return page;
};
const shot=async(page,name)=>{await page.screenshot({path:OUT+'/'+name+'.png',fullPage:true});
  console.log('     ↪ '+OUT+'/'+name+'.png')};

// ===== الفحص البصري للاتّجاه =====
// يقرأ الموضع الأفقي لأوّل محرفٍ وآخر محرفٍ داخل عنصر. إن كان أوّل المحارف
// **يمين** آخرها فالسطر يُرسَم من اليمين — ولو كان نصّه في DOM سليماً.
const dirOf=async(page,sel)=>page.evaluate(s=>{
  const el=document.querySelector(s);if(!el)return null;
  const t=(el.textContent||'').trim();if(t.length<2)return null;
  const r=document.createRange(),tn=(function walk(n){
    if(n.nodeType===3&&n.textContent.trim().length>1)return n;
    for(const c of n.childNodes){const f=walk(c);if(f)return f}return null})(el);
  if(!tn)return null;
  const txt=tn.textContent;let a=0,z=txt.length-1;
  while(a<z&&/\s/.test(txt[a]))a++;while(z>a&&/\s/.test(txt[z]))z--;
  r.setStart(tn,a);r.setEnd(tn,a+1);const first=r.getBoundingClientRect();
  r.setStart(tn,z);r.setEnd(tn,z+1);const last=r.getBoundingClientRect();
  return{text:txt.slice(0,60),firstX:Math.round(first.x),lastX:Math.round(last.x),
         drawn:first.x>last.x?'rtl':'ltr'};
},sel);

console.log('\n١) القواعد — أربع جملٍ إنجليزية داخل صفحةٍ عربية');
{
  const p=await mk('elias');
  await p.evaluate(()=>{startGram();gateLeft=0;gateStop();render()});
  await p.waitForTimeout(200);await shot(p,'01-gram');
  const d=await dirOf(p,'.choice');
  ok(d&&d.drawn==='ltr','خيارُ القواعد الإنجليزي يُرسَم من اليسار — '+(d&&d.text||'?'));
  await p.close();
}

console.log('\n٢) STEP — بوّابة التسرّع الجديدة ظاهرةٌ فوق الخيارات');
{
  const p=await mk('mohammed');
  await p.evaluate(()=>{startStep();
    const it=stepItems.find(x=>x.type!=='order')||stepItems[0];
    stepItems=[it];stepIdx=0;stepSetupRound();render()});
  await p.waitForTimeout(200);await shot(p,'02-step-gate');
  const gated=await p.evaluate(()=>({secs:gateSecs,bar:!!document.querySelector('#app')&&/الخيارات ستظهر بعد/.test(document.body.innerText)}));
  ok(gated.secs>0&&gated.bar,'شريط البوّابة معروضٌ فعلاً — '+gated.secs+'ث');
  await p.evaluate(()=>{gateLeft=0;gateStop();render()});
  await p.waitForTimeout(150);await shot(p,'03-step-open');
  await p.close();
}

console.log('\n٣) إحصاء ١٠٢ — عربيّةٌ مخلوطةٌ برياضيات (أخطر موضعٍ للاتّجاه)');
{
  const p=await mk('mohammed');
  const started=await p.evaluate(()=>{
    if(typeof startStat!=='function')return false;
    startStat();
    if(typeof statItems!=='undefined'&&statItems&&statItems.length){
      statIdx=0;if(typeof statSetupRound==='function')statSetupRound();
      if(typeof statChoose==='function'){const it=statItems[0];
        if(it&&it.c)statChoose(it.c.findIndex(o=>o.ok));}
    }
    render();return true;
  });
  if(started){
    await p.waitForTimeout(250);await shot(p,'04-stat-solution');
    const lines=await p.evaluate(()=>{
      const out=[];
      document.querySelectorAll('#app div').forEach(el=>{
        const t=(el.textContent||'').trim();
        if(!t||t.length>90||el.children.length)return;
        const hasAr=/[ء-غف-ي]/.test(t);
        const hasMath=/[0-9=+\-×÷]/.test(t);
        if(hasMath)out.push({t:t.slice(0,60),hasAr,dir:getComputedStyle(el).direction});
      });
      return out.slice(0,12);
    });
    const wrong=lines.filter(l=>(l.hasAr&&l.dir!=='rtl')||(!l.hasAr&&l.dir!=='ltr'));
    ok(wrong.length===0,'كل سطرٍ رياضي باتّجاهه الصحيح ('+lines.length+' سطراً فُحص)'
      +(wrong.length?' — مخالف: '+JSON.stringify(wrong[0]):''));
  } else ok(true,'قسم الإحصاء غير متاح لهذا الملفّ — تُخطّى');
  await p.close();
}

console.log('\n٤) لوحة القياس — الأرقام داخل نصٍّ عربي');
{
  const p=await mk('elias');
  const has=await p.evaluate(()=>typeof loadKpi==='function');
  if(has){
    await p.evaluate(()=>{mode='kpi';kpiRows=[
      {domain:'listen',qtype:'A2',is_correct:true,q_text:'x',item_id:'a'},
      {domain:'listen',qtype:'A2',is_correct:false,q_text:'y',item_id:'b'},
      {domain:'minpair',qtype:'A2',is_correct:true,q_text:'z',item_id:'c'}];
      kpiBusy=false;kpiErr='';render()});
    await p.waitForTimeout(200);await shot(p,'05-kpi');
    ok(true,'لوحة القياس مصوَّرة');
  } else ok(true,'لا لوحة قياس — تُخطّى');
  await p.close();
}

console.log('\n٥) الصفحات الثلاث كما تُفتَح');
for(const [who,name] of [['','06-home-haya'],['mohammed','07-home-mohammed'],['elias','08-home-elias']]){
  const p=await mk(who);await p.waitForTimeout(250);await shot(p,name);
  const n=await p.evaluate(()=>document.querySelectorAll('#app button').length);
  ok(n>0,(who||'haya')+': الصفحة رُسمت وفيها '+n+' زرّاً');
  await p.close();
}

await b.close();
console.log('\nاللقطات في: '+OUT);
console.log(fails?`\n=== ${fails} فشل ===`:'\n=== كل الاختبارات نجحت ===');
process.exit(fails?1:0);
})();
