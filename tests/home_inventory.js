// جردُ الصفحة الرئيسة: يُستخرَج من الصفحة الحيّة لا من قراءة النصّ.
// غرضه خطُّ أساسٍ يُقابَل به بعد إعادة الترتيب — فلا يضيع زرٌّ بصمت.
// يُشغَّل: node tests/home_inventory.js  > out.json
const {chromium}=require("/opt/node22/lib/node_modules/playwright");
const URL="http://127.0.0.1:8931/index.html";
const PROFILES=[["haya",""],["mohammed","?p=mohammed"],["elias","?p=elias"]];
(async()=>{
  const b=await chromium.launch({executablePath:"/opt/pw-browsers/chromium"});
  const out={};
  for(const [name,q] of PROFILES){
    const ctx=await b.newContext({viewport:{width:420,height:900}});
    const p=await ctx.newPage();
    await p.goto(URL+q,{waitUntil:"domcontentloaded"});
    await p.waitForTimeout(1200);
    const r=await p.evaluate(()=>{
      // كل زرّ قابل للنقر في الصفحة الرئيسة، بدالّته المُعلَّقة عليه
      const btns=[...document.querySelectorAll("button")];
      const vis=b=>{const r=b.getBoundingClientRect();
        const cs=getComputedStyle(b);
        return r.width>0&&r.height>0&&cs.display!=="none"&&cs.visibility!=="hidden";};
      const act=b=>{const h=b.getAttribute("onclick")||"";return h.trim()};
      return {
        total:btns.length,
        visible:btns.filter(vis).length,
        handlers:btns.map(act).filter(Boolean).sort(),
        visibleHandlers:btns.filter(vis).map(act).filter(Boolean).sort(),
        scrollH:document.documentElement.scrollHeight,
        screens:+(document.documentElement.scrollHeight/900).toFixed(2),
        headings:[...document.querySelectorAll(".section-title span")].map(s=>s.textContent.trim())
      };
    });
    out[name]=r;
    await ctx.close();
  }
  await b.close();
  console.log(JSON.stringify(out,null,1));
})().catch(e=>{console.error("ERR",e.message);process.exit(1)});
