// لقطاتُ الصفحة الرئيسة بعد إعادة الترتيب — **مقيسةٌ بالإحداثيات لا بالنظر**.
// وتبذر مخزونَ FSRS بعناصر مستحقّة كي تظهر شارةُ المستحقّ فعلاً (بلا بذرٍ لا شارة،
// فتكون اللقطة فحصاً فارغاً).
const {chromium}=require("/opt/node22/lib/node_modules/playwright");
const URL="http://127.0.0.1:8931/index.html";
const CASES=[["haya",""],["mohammed","?p=mohammed"],["elias","?p=elias"]];
(async()=>{
  const b=await chromium.launch({executablePath:"/opt/pw-browsers/chromium"});
  for(const [name,q] of CASES){
    for(const subs of ["off","on"]){
      const ctx=await b.newContext({viewport:{width:420,height:900},deviceScaleFactor:2});
      const p=await ctx.newPage();
      await p.goto(URL+q,{waitUntil:"domcontentloaded"});
      await p.waitForTimeout(900);
      // بذرُ مستحقّ: أربعة عناصر استماع ومثلها قواعد، بأجلٍ ماضٍ.
      // **والمفاتيح بنصّها الحرفي لا من `window`**: ثوابتُ `const` في سكربتٍ عاديّ
      // ليست على `window`، فأوّل صياغةٍ لهذا السكربت بذرت صفراً وأنتجت لقطةً بلا
      // شارةٍ واحدة — فحصٌ فارغ كاد يمرّ على أنه نجاح.
      await p.evaluate(s=>{
        const today=Math.floor(Date.now()/86400000);
        const pk=k=>(window.pkey?window.pkey(k):k);
        for(const [key,bank] of [["mawhiba_listen_srs",window.listenBankFor],
                                 ["mawhiba_gram_srs",window.gramBankFor]]){
          if(!key||!bank)continue;
          const pool=bank(window.profileOf().level)||[];const st={};
          pool.slice(0,4).forEach(it=>{st[it.id]={box:2,seen:3,due:today-1,s:5,d:5,last:today-3}});
          try{localStorage.setItem(pk(key),JSON.stringify(st))}catch(e){}
        }
        try{localStorage.setItem(pk("mawhiba_home_subs_v1"),s==="on"?"1":"0")}catch(e){}
      },subs);
      await p.evaluate(()=>window.render&&window.render());
      await p.waitForTimeout(500);
      const m=await p.evaluate(()=>{
        const pill=document.querySelector(".due-pill");
        const tile=document.querySelector(".mode.tile");
        const head=document.querySelector(".section-title span");
        const bx=e=>{if(!e)return null;const r=e.getBoundingClientRect();
          return {x:Math.round(r.x),y:Math.round(r.y),w:Math.round(r.width),h:Math.round(r.height)}};
        const tn=tile?tile.querySelector(".m-name"):null;
        return {
          h:document.documentElement.scrollHeight,
          overflowX:document.documentElement.scrollWidth>document.documentElement.clientWidth,
          pills:document.querySelectorAll(".due-pill").length,
          tiles:document.querySelectorAll(".mode.tile").length,
          fulls:document.querySelectorAll(".mode.full").length,
          heads:document.querySelectorAll(".section-title").length,
          pillBox:bx(pill), tileBox:bx(tile), tileNameBox:bx(tn), headBox:bx(head),
          pillText:pill?pill.textContent.trim():null,
          tileText:tn?tn.textContent.trim():null,
          headText:head?head.textContent.trim():null,
          subsBtn:(document.querySelector(".home-subs")||{}).textContent
        };
      });
      console.log(`${name}/${subs}`,JSON.stringify(m));
      await p.screenshot({path:`/tmp/home_${name}_${subs}.png`,fullPage:true});
      await ctx.close();
    }
  }
  await b.close();
})().catch(e=>{console.error("ERR",e.message);process.exit(1)});
