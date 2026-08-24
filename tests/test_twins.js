// لا توأمان في جلسةٍ واحدة، وراية LanguageTool على المموّهات — ٢٢ أغسطس
//
// بياناتٌ حيّة (محمد، ١٤:٢٣): أربعةٌ من أحد عشر عنصراً عن «مسابقة طبخ»، وفقرتا استماعٍ
// منها متشابهتان. والقياس على ١١٧ عنصراً مولَّداً في ١٢ ساعة أظهر أن التوزيع العامّ
// سليم (الطبخ ٦٪) — فالتكتّل داخل الجلسة لا انحيازٌ في المولّد.
const {chromium}=require('/opt/node22/lib/node_modules/playwright');
const BASE='http://localhost:8931/index.html';
let fails=0;
function ok(c,m){console.log((c?'  ✓ ':'  ✗ FAIL ')+m);if(!c)fails++}
async function mk(browser){
  const page=await browser.newPage();
  page.on('pageerror',e=>{console.log('  ! pageerror:',e.message);fails++});
  await page.route('**/functions/v1/tutor',r=>r.fulfill({status:200,contentType:'application/json',body:'{}'}));
  await page.route('**/rest/v1/**',r=>r.fulfill({status:201,contentType:'application/json',body:'[]'}));
  await page.goto(BASE,{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>typeof window.render==='function',{timeout:15000});
  await page.evaluate(()=>localStorage.clear());
  return page;
}
// النصوص الحقيقية من جلسته — لا نصوصٌ مؤلَّفة للاختبار
const COOK1="Last Saturday, I joined the local cooking competition at the community center. The theme was comfort food, so I decided to make my grandmother's famous tomato soup. I arrived early to set up my station and check that I had all my ingredients. During the tasting, the judges praised the flavor but noted that the soup was too salty. Although I did not win first place, I received a certificate for the best presentation.";
const COOK2="Last Saturday, I joined the annual neighborhood cooking contest at Maple Park. I decided to bake a chocolate cake because it is my grandmother's famous recipe. The judge, Mr. Henderson, tasted every dessert and took careful notes on a clipboard. He praised my cake for its moist texture but gave the first prize to a lemon tart made by a teenager named Leo. I was disappointed at first, but Leo shared his secret ingredient with me, and we promised to cook together next year.";
const FOOT ="Last Saturday, our school team played against Oakridge High in the regional football final. We were losing 1-0 at halftime, but our coach encouraged us to keep working hard. In the second half, Leo scored an amazing goal in the 75th minute to tie the game. The match went into extra time, and Sarah scored the winning goal just before the final whistle. We won the championship 2-1 and celebrated with our fans.";
const W1="Write about today's weather.\n1) What is the weather like today?\n2) What do you wear?";
const W2="Write about a pet you have or want.\n1) What animal is it?\n2) Why do you like it?";
const G1="This is my brother book. This is my brother's book. This is my brothers book. This is my brother books.";
const G2="I have three book in my bag. I have three books in my bag. I have three bookes in my bag. I have three book in my bags.";
const RAIN ="The sky turned grey and heavy rain started falling just as Leo left his house for the bus. He quickly opened his umbrella but the wind broke it. He ran into a small coffee shop to wait until the rain stopped.";

(async()=>{
  const browser=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'});

  // ===== ١) w-shingles (Broder 1997) على نصوصهم هم =====
  console.log('\n١) المقياس المعياريّ على نصوصهم');
  {
    const page=await mk(browser);
    const r=await page.evaluate(t=>({
      same:twinSim(t.c1,t.c2),
      d1:twinSim(t.c1,t.f),d2:twinSim(t.c2,t.f),d3:twinSim(t.f,t.r),d4:twinSim(t.c2,t.r),
      thr:GEN_TWIN,k:TWIN_K,
      self:twinSim(t.c1,t.c1),
      empty:twinSim("",t.c1),
      // البلاغان الكاذبان اللذان أوقعهما مقياسي الأوّل (كلماتٌ مفردة): ٠٫٢٧ و٠٫١٣
      falseWrite:twinSim(t.w1,t.w2),
      falseGram:twinSim(t.g1,t.g2),
      shing:Array.from(twinShingles("one two three four")),
    }),{c1:COOK1,c2:COOK2,f:FOOT,r:RAIN,w1:W1,w2:W2,g1:G1,g2:G2});
    ok(r.k===3,'متتاليةٌ من ثلاث كلمات — '+r.k);
    ok(r.shing.length===2&&r.shing[0]==='one two three','والشينغل يُبنى صحيحاً — '+r.shing.join(' | '));
    ok(r.same>=r.thr,'فقرتا الطبخ فوق العتبة — '+r.same.toFixed(3)+' ≥ '+r.thr);
    ok([r.d1,r.d2,r.d3,r.d4].every(v=>v<r.thr),
       'وكل زوجٍ مختلف الموضوع تحتها — '+[r.d1,r.d2,r.d3,r.d4].map(v=>v.toFixed(3)).join('، '));
    ok(r.falseWrite<r.thr,'وصيغتا الكتابة لا تُعدّان توأمين — '+r.falseWrite.toFixed(3)+
       ' (كانت ٠٫٢٧ بمقياس الكلمات المفردة)');
    ok(r.falseGram<r.thr,'وعنصرا القواعد كذلك — '+r.falseGram.toFixed(3)+' (كانت ٠٫١٣)');
    ok(r.self===1,'ونصٌّ مع نفسه = ١');
    ok(r.empty===0,'ونصٌّ فارغ = ٠ (لا يُسقط شيئاً)');
    await page.close();
  }

  // ===== ٣) الإسقاط الفعلي في بانية الجلسة =====
  console.log('\n٣) الإسقاط في الجلسة');
  {
    const page=await mk(browser);
    const posted=[];
    await page.route('**/rest/v1/mawhiba_answer_log**',rt=>{
      try{posted.push(JSON.parse(rt.request().postData()||'{}'))}catch(e){}
      rt.fulfill({status:201,body:''});
    });
    const r=await page.evaluate(t=>{
      const mk=function(id,txt){return{id:id,lv:"B1",audio:txt,q:"Q?",c:["a","b","c"],a:0}};
      const out=[mk("x1",t.c1),mk("x2",t.c2),mk("x3",t.f)];
      const POOL=out.concat([mk("x4",t.r)]);
      const kept=planNoTwins(out,POOL,3,"listen");
      return{ids:kept.map(function(i){return i.id}),n:kept.length};
    },{c1:COOK1,c2:COOK2,f:FOOT,r:RAIN});
    ok(r.ids.indexOf("x1")>=0,'الأوّل يبقى');
    ok(r.ids.indexOf("x2")<0,'وتوأمُه يُسقَط — '+r.ids.join(','));
    ok(r.ids.indexOf("x3")>=0&&r.ids.indexOf("x4")>=0,'ويُكمَّل النقص ببديلٍ متمايز');
    ok(r.n===3,'والجلسة لا تنقص عن حدّها — '+r.n);
    await page.waitForTimeout(200);
    const tw=posted.filter(x=>x.qtype==='twin');
    ok(tw.length===1&&/x2/.test(tw[0].response||''),'ويُسجَّل الإسقاط ليُقاس — '+(tw[0]&&tw[0].response));
    await page.close();
  }
  {
    // لا بديل متمايز ⇒ يعود المُسقَط: جلسةٌ كاملة أولى من دَدَقةٍ تامّة
    const page=await mk(browser);
    const r=await page.evaluate(t=>{
      const mk=function(id,txt){return{id:id,lv:"B1",audio:txt}};
      const out=[mk("y1",t.c1),mk("y2",t.c2),mk("y3",t.c2+" ")];
      const kept=planNoTwins(out,out,3,"listen");
      return kept.length;
    },{c1:COOK1,c2:COOK2});
    ok(r===3,'بلا بديلٍ متمايز تعود التوائم ولا تخوى الجلسة — '+r);
    await page.close();
  }

  // ===== ٤) البانيات موصولة، وضمانُ عنصر الترتيب في STEP باقٍ =====
  console.log('\n٤) البانيات');
  {
    const page=await mk(browser,'?p=mohammed');
    const r=await page.evaluate(()=>{
      const out={};
      const lv=profileOf().level;
      [["listen",buildListenPlan,LISTEN_N,listenBankFor],["read",buildReadPlan,READ_N,readBankFor],
       ["write",buildWritePlan,WRITE_N,writeBankFor],["gram",buildGramPlan,GRAM_N,gramBankFor],
       ["step",buildStepPlan,STEP_N,stepBankFor],["video",buildVideoPlan,VIDEO_N,videoBankFor]].forEach(function(x){
        const p=x[1](),POOL=bankStretched(x[0],lv,x[3]);
        const twin=function(a,b){return twinSim(itemText(a),itemText(b))>=GEN_TWIN};
        const hasTwin=p.some(function(a,i){return p.some(function(b,j){return j>i&&twin(a,b)})});
        // عقدُ planNoTwins المُعلَن: التوأم يعود **فقط** إن لم يوجد في المخزون بديلٌ
        // متمايزٌ عن كل ما بقي («ولا تُترك الجلسة ناقصةً»). فيُفحَص العقد نفسه لا
        // نتيجةٌ لا يضمنها: هل بقي في المخزون عنصرٌ غيرُ مُستعمَلٍ ومتمايزٌ عن الجميع؟
        const used={};p.forEach(function(i){used[i.id]=1});
        const rescuable=POOL.some(function(c){
          return !used[c.id]&&!p.some(function(k){return twin(k,c)});
        });
        out[x[0]]={n:p.length,want:x[2],pool:POOL.length,twins:hasTwin,rescuable:rescuable};
      });
      out.stepOrder=buildStepPlan().some(function(i){return i.type==="order"});
      return out;
    });
    ["listen","read","write","gram","step","video"].forEach(function(d){
      ok(r[d].n>=Math.min(r[d].want,3),d+': الجلسة مكتملة — '+r[d].n+' من '+r[d].want);
      // «لا توأمين» ليست وعداً مطلقاً — البنك الصغير (الفيديو ٦/مستوى وVIDEO_N=٥)
      // قد لا يملك بديلاً متمايزاً، فيعود التوأم عمداً بدل أن تنقص الجلسة. فالفحص
      // على العقد: توأمٌ باقٍ **مع** وجود بديلٍ متمايزٍ مُهمَل = عطلٌ حقيقي.
      ok(!(r[d].twins&&r[d].rescuable),
         d+': لا توأم إلّا حين لا بديل — توأم:'+r[d].twins+' · بديلٌ مُهمَل:'+r[d].rescuable
         +' · مخزون:'+r[d].pool+'/'+r[d].want);
    });
    ok(r.stepOrder===true,'وضمانُ عنصر الترتيب في STEP باقٍ رغم الإسقاط');
    await page.close();
  }

  // ===== ٥) راية LanguageTool تُسجَّل ولا تُسقِط =====
  console.log('\n٥) راية المموّه النظيف');
  {
    const page=await mk(browser);
    const posted=[];
    await page.route('**/rest/v1/mawhiba_answer_log**',rt=>{
      try{posted.push(JSON.parse(rt.request().postData()||'{}'))}catch(e){}
      rt.fulfill({status:201,body:''});
    });
    const r=await page.evaluate(()=>{
      const item={id:"ai_gram_test",c:[{t:"a",ok:true},{t:"b",ok:false}]};
      genLogLtFlag("gram","B1",
        {ltSuspect:["3:The new phone was bought from my brother yesterday."],ltJudged:3},item);
      genLogLtFlag("gram","B1",{ltSuspect:[],ltJudged:3},item);   // بلا شكّ ⇒ بلا سطر
      genLogLtFlag("gram","B1",null,item);                        // بلا حكم ⇒ بلا سطر
      return true;
    });
    await page.waitForTimeout(200);
    const fl=posted.filter(x=>x.domain==='gen'&&x.qtype==='lt_suspect');
    ok(fl.length===1,'سطرٌ واحد للمشكوك فيه وحده — '+fl.length);
    ok(fl.length&&/bought from my brother/.test(fl[0].q_text||''),'ومعه نصّ المموّه — يُراجَع بالعين');
    ok(fl.length&&/1 من 3/.test(fl[0].response||''),'وعدده من المحكوم — '+(fl[0]&&fl[0].response));
    await page.close();
  }

  // ===== ٦) لا انحدار =====
  console.log('\n٦) لا انحدار');
  for(const q of ['','?p=mohammed','?p=elias']){
    const page=await browser.newPage();
    page.on('pageerror',e=>{console.log('  ! pageerror:',e.message);fails++});
    await page.route('**/rest/v1/**',r=>r.fulfill({status:201,body:'[]'}));
    await page.goto(BASE+q,{waitUntil:'domcontentloaded'});
    await page.waitForFunction(()=>typeof window.render==='function',{timeout:15000});
    const r=await page.evaluate(()=>({missing:censusMissing(),modes:document.querySelectorAll('.mode').length}));
    ok(r.missing.length===0,(q||'هيا')+': لا دالّة مفقودة — '+r.missing.join(','));
    ok(r.modes>0,(q||'هيا')+': الصفحة تُرسم');
    await page.close();
  }

  await browser.close();
  console.log(fails?`\n=== ${fails} فشل ===`:'\n=== كل الاختبارات نجحت ===');
  process.exit(fails?1:0);
})();
