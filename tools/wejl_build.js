// بناءُ بنك «استماع وجدان المؤلَّف» من المرحلة الوسيطة — والتدويرُ بسكربتٍ لا بيدي.
//
// المرحلة الوسيطة تُكتب **والصواب في المقدّمة دائماً**، فيُدوِّر هذا السكربت الخيارات
// إلى مواضع موزَّعة ويُخرج السطر بفهرس الصواب. والسببُ درسُ ١٣ سبتمبر حرفياً: ثمانيةَ
// عشرَ عنصراً في طبقة C1 كُتبت كلُّها `a:0` فكاد يُشحَن انحيازُ موضعٍ تامّ، وأُصلح
// «بسكربتٍ يُدوّر الخيارات … لا بتحريرٍ يدويّ لثمانية عشر مصفوفة — فلا خطأَ نسخٍ».
//
// وقبل التدوير يفحص ما **يُفحَص آلياً** — ولا يُدَّعى أنه يفحص صحّة المفتاح: المفتاح
// هنا صحيحٌ **بالبناء** (التفريغُ مؤلَّفٌ ليُجيب عن سؤاله) لا بالاشتقاق من مصدر، وهذا
// بعينه ما يُميّز الطريق (ب) عن (أ) ويُوجب ألّا يُوسَم العنصر «[مصدر:وجدان]».
//
// فالمفحوص آلياً: الشكل، والتلوّثُ العربي، وتمايزُ الخيارات، وطولُ التفريغ، وقاعدتان
// من Haladyna, Downing & Rodriguez 2002 (المعتمَد في المشروع): ألّا يكون المفتاحُ
// أطولَ الخيارات، وألّا يتكرّر لفظُه في **صدر السؤال** فيُصاب بمطابقة كلمةٍ لا بفهم.
// ومعها تشابهُ التفريغات بـw-shingles (k=3، Broder 1997).
//
// **ومقياسٌ ثالثٌ كتبتُه ثمّ أسقطتُه بالقياس**: فحصتُ أوّلاً تطابُقَ المفتاح مع
// **التفريغ** لا مع الصدر، فأطلق ١٢ بلاغاً من ٤٧ (٢٦٪) كلُّها على عناصر «تفصيلٍ
// محدَّد» سليمة. والعلّة أنّي نقلتُ قاعدةً عن الصدر وطبّقتُها على نصٍّ **لا يُرى
// أثناء الإجابة أصلاً** — فلا شيء يُمسَح بلا فهم في الاستماع، والتفريغُ يظهر بعد
// القفل وحده. وتطابقُ المفتاح مع التفريغ هنا **نافعٌ** لا ضارّ: عليه تقوم
// `evidenceSentence` في إبراز جملة الدليل. فيبقى الرقمُ معروضاً خبراً لا حُكماً،
// بحرف درس ٢٥ أغسطس: كاشفٌ بهذه النسبة من البلاغ الكاذب يُدرِّب على تجاهله.
const fs=require("fs");
const path=require("path");

const SRC=process.argv[2];
if(!SRC){console.error("usage: node wejl_build.js <staging.txt>");process.exit(2)}
const lines=fs.readFileSync(SRC,"utf8").split("\n").map(s=>s.trim()).filter(Boolean);

const AR=/[ء-غف-ي]/;              // حروفٌ عربية قويّة وحدها
const norm=s=>String(s).toLowerCase().replace(/[^a-z0-9\s]/g," ").replace(/\s+/g," ").trim();
const words=s=>norm(s).split(" ").filter(Boolean);

// أطولُ تتابعٍ متّصل من الكلمات مشتركٌ بين نصّين — مقياسُ «يُصاب بالمطابقة اللفظية»
function longestRun(a,b){
  const A=words(a),B=words(b);let best=0;
  for(let i=0;i<A.length;i++)for(let j=0;j<B.length;j++){
    let k=0;while(i+k<A.length&&j+k<B.length&&A[i+k]===B[j+k])k++;
    if(k>best)best=k;
  }
  return best;
}
// تتابعٌ من حروفِ الجرّ وأدواتِ التعريف وحدها ليس تكراراً لفظياً يُفشي شيئاً — فـ
// «to the» المشتركة بين «to the market» في الصدر و«to the garage» في المفتاح أطلقت
// بلاغاً كاذباً. فيُشترَط أن يحمل التتابعُ المشترك كلمةَ **معنى** واحدة على الأقلّ.
const STOP=new Set(("a an the to of in on at for and or but is are was were be been do does did "+
  "will would can could he she it they we you i his her its their my your that this these those "+
  "what when where who why how which not no yes with from by as if so than then there here").split(" "));
function contentRun(opt,stem){
  const A=words(opt),B=words(stem);
  for(let i=0;i<A.length;i++)for(let j=0;j<B.length;j++){
    let k=0;while(i+k<A.length&&j+k<B.length&&A[i+k]===B[j+k])k++;
    if(k>=2){for(let x=0;x<k;x++)if(!STOP.has(A[i+x]))return true}
  }
  return false;
}
function shingles(s,k){
  const w=words(s),out=new Set();
  for(let i=0;i+k<=w.length;i++)out.add(w.slice(i,i+k).join(" "));
  return out;
}
function jac(a,b,k){
  const A=shingles(a,k),B=shingles(b,k);
  if(!A.size||!B.size)return 0;
  let inter=0;A.forEach(x=>{if(B.has(x))inter++});
  return inter/(A.size+B.size-inter);
}

const items=[],problems=[],warn=[];
lines.forEach((l,li)=>{
  const f=l.split("|").map(s=>s.trim());
  const tag="السطر "+(li+1);
  if(f.length!==6&&f.length!==7){problems.push(tag+": حقول "+f.length+" (المتوقَّع ٦ أو ٧)");return}
  const [t,audio,q,...opts]=f;
  if(AR.test(audio)||AR.test(q)||opts.some(o=>AR.test(o)))problems.push(tag+": تلوّثٌ عربي");
  if(new Set(opts.map(norm)).size!==opts.length)problems.push(tag+": خيارٌ مكرّر");
  const wc=words(audio).length;
  if(wc<25||wc>95)problems.push(tag+": طولُ التفريغ "+wc+" كلمة (المدى ٢٥-٩٥)");
  if(!/[.!?]/.test(audio))problems.push(tag+": تفريغٌ بلا نهاية جملة — جملةُ الدليل لا تُستخرَج");
  // Haladyna: المفتاحُ لا يكون أطولَ الخيارات
  const lens=opts.map(o=>words(o).length);
  if(lens[0]>Math.max(...lens.slice(1)))warn.push(tag+": المفتاحُ أطولُ الخيارات ("+lens.join("/")+")");
  if(Math.max(...lens)>3*Math.min(...lens))warn.push(tag+": تفاوتُ أطوال الخيارات ("+lens.join("/")+")");
  // Haladyna: لا تكرارَ لفظيّ بين الصدر والمفتاح — وهو الموضع الذي تنصّ عليه القاعدة
  const qruns=opts.map(o=>longestRun(o,q));
  if(qruns[0]>=2&&qruns[0]>Math.max(...qruns.slice(1))&&contentRun(opts[0],q))
    warn.push(tag+": المفتاحُ يُكرّر لفظَ الصدر ("+qruns.join("/")+") — يُصاب بمطابقة كلمة");
  // خبرٌ لا حكم (انظر الرأس): تطابُقُ المفتاح مع التفريغ طبيعيٌّ في عناصر التفصيل
  const runs=opts.map(o=>longestRun(o,audio));
  items.push({t,audio,q,opts,wc,runs});
});

// توزيعُ مواضع الصواب: دورةٌ ثابتة داخل كل نوع، فلا موضعٌ يبتلع نوعاً
const seen={};
items.forEach(it=>{
  const n=it.opts.length;
  const k=(seen[it.t]=(seen[it.t]||0));seen[it.t]++;
  const target=k%n;
  const o=it.opts.slice();
  const key=o.shift();
  o.splice(target,0,key);
  it.a=target;it.opts=o;
});

// تشابهُ التفريغات بعضها ببعض
let maxSim=0,maxPair="";
for(let i=0;i<items.length;i++)for(let j=i+1;j<items.length;j++){
  const s=jac(items[i].audio,items[j].audio,3);
  if(s>maxSim){maxSim=s;maxPair=(i+1)+"×"+(j+1)}
}

const counts={};items.forEach(it=>counts[it.t]=(counts[it.t]|0)+1);
const posAll={};items.forEach(it=>posAll[it.a]=(posAll[it.a]|0)+1);

console.log("العناصر          :",items.length);
console.log("الأنواع          :",Object.entries(counts).sort((a,b)=>b[1]-a[1]).map(([k,v])=>k+"="+v).join(" · "));
console.log("مواضع الصواب     :",Object.keys(posAll).sort().map(k=>"م"+(+k+1)+"="+posAll[k]).join(" · "));
console.log("طول التفريغ      : أدنى "+Math.min(...items.map(i=>i.wc))+" · وسيط "+
  items.map(i=>i.wc).sort((a,b)=>a-b)[Math.floor(items.length/2)]+" · أقصى "+Math.max(...items.map(i=>i.wc)));
console.log("أقصى تشابه (k=3) :",maxSim.toFixed(4),"("+maxPair+")");
console.log("خبرٌ لا حكم — عناصرُ مفتاحُها يُطابق التفريغ لفظياً (٣ كلمات فأكثر):",
  items.filter(i=>i.runs[0]>=3).length,"من",items.length,"— طبيعيٌّ في عناصر التفصيل، وعليه تقوم جملةُ الدليل");
console.log("\nأعطال  :",problems.length);problems.forEach(p=>console.log("  ✗ "+p));
console.log("تحذيرات:",warn.length);warn.forEach(p=>console.log("  ⚠ "+p));

const out=items.map(it=>[it.t,it.a,it.audio,it.q].concat(it.opts).join("|")).join("\n");
const dest=path.join(path.dirname(SRC),"wejl_raw.txt");
fs.writeFileSync(dest,out+"\n","utf8");
console.log("\nكُتب:",dest);
process.exit(problems.length?1:0);
