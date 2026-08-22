// تحقّقٌ رياضيّ من كل مولّد قبل أن يرى أيّ سؤالٍ منه طفلٌ — شرط المشروع رقم ٨.
// لا يفحص «هل يعمل» بل «هل الجواب المعلَّم صحيحٌ فعلاً»، بإعادة الحساب استقلالاً.
const fs = require("fs");
const D = require("path").join(__dirname) + "/";

// الأدوات كما هي في index.html حرفياً
const rand = (a, b) => Math.floor(Math.random() * (b - a + 1)) + a;
const pick = a => a[Math.floor(Math.random() * a.length)];
function shuffle(a){a=a.slice();for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]]}return a}
const toAr = n => String(n).replace(/[0-9]/g, d => "٠١٢٣٤٥٦٧٨٩"[d]);
function arSeq(a){return a.map(toAr).join(" ، ")}
function round2(x){return Math.round(x*100)/100}
function arDec(x){return toAr(String(round2(x))).replace(".","٫")}
function mcNum(correct,cands){const opts=[correct];(cands||[]).forEach(x=>{x=Math.round(x);if(opts.length<4&&Number.isFinite(x)&&x>=0&&!opts.includes(x))opts.push(x)});let p=1;while(opts.length<4){[correct+p,correct-p].forEach(x=>{if(opts.length<4&&x>=0&&!opts.includes(x))opts.push(x)});p++;if(p>300)break}const sh=shuffle(opts);return{choices:sh.map(x=>Number.isInteger(x)?toAr(x):arDec(x)),answer:sh.indexOf(correct)}}
function qz(d,q,correct,cands,w){const m=mcNum(correct,cands);return{d,q,c:m.choices,a:m.answer,w}}

eval(fs.readFileSync(D + "math6.js", "utf8") +
  ";globalThis.M_UNITS=M_UNITS;globalThis.M_BENCH=M_BENCH;globalThis.MATH6_PLAN=MATH6_PLAN;");

let fails = 0, checks = 0;
function ok(c, m) { checks++; if (!c) { fails++; console.log("  ✗ " + m); } }
const AR = "٠١٢٣٤٥٦٧٨٩";
function arToNum(s) {
  const t = String(s).replace(/[٠-٩]/g, d => String(AR.indexOf(d))).replace("٫", ".").replace("،", "");
  return parseFloat(t);
}

// ===== ١) فحصٌ عامّ لكل مولّد =====
console.log("\n١) الشكل العامّ — كل مولّد ٤٠٠ مرّة");
const N = 400;
math6Ready().forEach(function (L) {
  let bad = 0, dupChoice = 0, latin = 0, badIdx = 0, noWhy = 0, fewC = 0;
  const seen = new Set();
  for (let i = 0; i < N; i++) {
    const it = L.gen();
    if (!it || !it.c) { bad++; continue; }
    if (it.c.length !== 4) fewC++;
    if (new Set(it.c).size !== it.c.length) dupChoice++;
    if (!(it.a >= 0 && it.a < it.c.length)) badIdx++;
    if (!it.w || it.w.length < 10) noWhy++;
    // لا أرقام لاتينية في نصٍّ يقرؤه طفلٌ عربي
    if (/[0-9]/.test(it.q) || it.c.some(c => /[0-9]/.test(c)) || /[0-9]/.test(it.w)) latin++;
    seen.add(it.q);
  }
  ok(bad === 0, L.id + ": عناصر معطوبة — " + bad);
  ok(fewC === 0, L.id + ": ليست أربعة خيارات — " + fewC);
  ok(dupChoice === 0, L.id + ": خيارٌ مكرّر — " + dupChoice);
  ok(badIdx === 0, L.id + ": موضع الصواب خارج المدى — " + badIdx);
  ok(noWhy === 0, L.id + ": بلا شرح — " + noWhy);
  ok(latin === 0, L.id + ": أرقامٌ لاتينية في النصّ — " + latin);
  ok(seen.size >= 8, L.id + ": تنوّعٌ ضعيف — " + seen.size + " نصّاً متمايزاً من " + N);
});

// ===== ٢) صحّة الجواب: يُعاد حسابه استقلالاً من نصّ السؤال =====
console.log("\n٢) صحّة الجواب — يُستخرج من نصّ السؤال ويُعاد حسابه");

function nums(q) { return (q.match(/[٠-٩]+(?:٫[٠-٩]+)?/g) || []).map(arToNum); }
function chosen(it) { return it.c[it.a]; }

// القوى
(function () {
  let bad = 0;
  for (let i = 0; i < 600; i++) {
    const it = m_powers(), n = nums(it.q);
    if (Math.pow(n[0], n[1]) !== arToNum(chosen(it))) bad++;
  }
  ok(bad === 0, "m_powers: الأُسّ محسوبٌ صحيحاً — " + bad);
})();

// ترتيب العمليات — يُعاد تقييم التعبير نفسه
(function () {
  let bad = 0;
  for (let i = 0; i < 600; i++) {
    const it = m_order();
    const expr = it.q.split(":")[1].replace(/[٠-٩]/g, d => String(AR.indexOf(d)))
      .replace(/×/g, "*").replace(/−/g, "-").trim();
    if (eval(expr) !== arToNum(chosen(it))) bad++;
  }
  ok(bad === 0, "m_order: ناتج التعبير مطابقٌ للأولوية الصحيحة — " + bad);
})();

// المعادلات — يُعوَّض الحلّ في المعادلة
(function () {
  let bad = 0;
  for (let i = 0; i < 600; i++) {
    const it = m_equation(), x = arToNum(chosen(it)), n = nums(it.q);
    if (/س \+/.test(it.q)) { if (x + n[0] !== n[1]) bad++; }
    else { if (n[0] * x !== n[1]) bad++; }
  }
  ok(bad === 0, "m_equation: الحلّ يُحقّق المعادلة بالتعويض — " + bad);
})();

// العبارات
(function () {
  let bad = 0;
  for (let i = 0; i < 600; i++) {
    const it = m_varExpr(), n = nums(it.q);   // [س , k , c]
    if (n[1] * n[0] + n[2] !== arToNum(chosen(it))) bad++;
  }
  ok(bad === 0, "m_varExpr: التعويض صحيح — " + bad);
})();

// التحليل إلى العوامل الأولية
(function () {
  let bad = 0, notPrime = 0, wrongPass = 0;
  for (let i = 0; i < 600; i++) {
    const it = m_primeFactors(), n = nums(it.q)[0];
    const f = chosen(it).split("×").map(s => arToNum(s.trim()));
    if (f.reduce((a, b) => a * b, 1) !== n) bad++;
    if (f.some(x => primesOf(x).length !== 1)) notPrime++;
    // ولا مموّهَ صحيحاً: كلّ خيارٍ آخر إمّا حاصله ≠ العدد أو فيه عاملٌ غير أوّليّ
    it.c.forEach(function (cs, idx) {
      if (idx === it.a) return;
      const g = cs.split("×").map(s => arToNum(s.trim()));
      const prodOk = g.reduce((a, b) => a * b, 1) === n;
      const allPrime = g.every(x => primesOf(x).length === 1);
      if (prodOk && allPrime) wrongPass++;
    });
  }
  ok(bad === 0, "m_primeFactors: حاصل ضرب العوامل = العدد — " + bad);
  ok(notPrime === 0, "m_primeFactors: كل عاملٍ في الصواب أوّليّ — " + notPrime);
  ok(wrongPass === 0, "m_primeFactors: لا مموّهَ صحيحاً (صوابٌ مزدوج) — " + wrongPass);
})();

// المتوسط
(function () {
  let bad = 0;
  for (let i = 0; i < 600; i++) {
    const it = m_mean();
    const data = it.q.split(":")[1].split("،").map(s => arToNum(s.trim()));
    const mean = data.reduce((a, b) => a + b, 0) / data.length;
    if (mean !== arToNum(chosen(it))) bad++;
  }
  ok(bad === 0, "m_mean: المتوسط = المجموع ÷ العدد — " + bad);
})();

// الوسيط/المنوال/المدى
(function () {
  let bad = 0;
  for (let i = 0; i < 900; i++) {
    const it = m_medianModeRange();
    const data = it.q.split(":")[1].split("،").map(s => arToNum(s.trim()));
    const s = data.slice().sort((a, b) => a - b), got = arToNum(chosen(it));
    if (/الوسيط/.test(it.q)) { if (s[2] !== got) bad++; }
    else if (/المدى/.test(it.q)) { if (s[4] - s[0] !== got) bad++; }
    else {
      const cnt = {}; data.forEach(v => cnt[v] = (cnt[v] || 0) + 1);
      if ((cnt[got] || 0) !== Math.max.apply(null, Object.values(cnt))) bad++;
    }
  }
  ok(bad === 0, "m_medianModeRange: الثلاثة محسوبة صحيحاً — " + bad);
})();

// العمليات العشرية — كلّها بإعادة الحساب من النصّ
function decCheck(fn, name, n) {
  let bad = 0;
  for (let i = 0; i < (n || 600); i++) {
    const it = fn();
    const q = it.q.split(":")[1] || it.q;
    const v = (q.match(/[٠-٩]+(?:٫[٠-٩]+)?/g) || []).map(arToNum);
    let want = null;
    if (/\+/.test(q)) want = round2(v[0] + v[1]);
    else if (/−/.test(q)) want = round2(v[0] - v[1]);
    else if (/×/.test(q)) want = round2(v[0] * v[1]);
    else if (/÷/.test(q)) want = round2(v[0] / v[1]);
    if (want === null) { bad++; continue; }
    if (Math.abs(want - arToNum(chosen(it))) > 1e-9) bad++;
  }
  ok(bad === 0, name + ": الناتج مطابقٌ للحساب المباشر — " + bad);
}
decCheck(m_decAddSub, "m_decAddSub");
decCheck(m_decMulWhole, "m_decMulWhole");
decCheck(m_decMul, "m_decMul");
decCheck(m_decDivWhole, "m_decDivWhole");
decCheck(m_decDivDec, "m_decDivDec");

// التقريب
(function () {
  let bad = 0;
  for (let i = 0; i < 600; i++) {
    const it = m_round(), x = nums(it.q)[0];
    if (Math.abs(Math.round(x * 10) / 10 - arToNum(chosen(it))) > 1e-9) bad++;
  }
  ok(bad === 0, "m_round: التقريب لأقرب جزء من عشرة — " + bad);
})();

// التقدير
(function () {
  let bad = 0;
  for (let i = 0; i < 600; i++) {
    const it = m_estimate(), v = nums(it.q);
    if (Math.round(v[0]) + Math.round(v[1]) !== arToNum(chosen(it))) bad++;
  }
  ok(bad === 0, "m_estimate: التقدير بتقريب كلٍّ إلى صحيح — " + bad);
})();

// المقارنة العشرية
(function () {
  let bad = 0;
  for (let i = 0; i < 600; i++) {
    const it = m_decCompare();
    const vals = it.c.map(arToNum);
    if (Math.max.apply(null, vals) !== arToNum(chosen(it))) bad++;
  }
  ok(bad === 0, "m_decCompare: المختار هو الأكبر فعلاً — " + bad);
})();

// ق.م.أ و م.م.أ
(function () {
  let b1 = 0, b2 = 0;
  for (let i = 0; i < 600; i++) {
    const it = m_gcf(), v = nums(it.q);
    if (gcd2(v[0], v[1]) !== arToNum(chosen(it))) b1++;
    const it2 = m_lcm(), w = nums(it2.q);
    if (lcm2(w[0], w[1]) !== arToNum(chosen(it2))) b2++;
  }
  ok(b1 === 0, "m_gcf: القاسم المشترك الأكبر صحيح — " + b1);
  ok(b2 === 0, "m_lcm: المضاعف المشترك الأصغر صحيح — " + b2);
})();

// تبسيط الكسور
(function () {
  let bad = 0, notSimplest = 0;
  for (let i = 0; i < 600; i++) {
    const it = m_simplify(), v = nums(it.q);
    const p = chosen(it).split("/").map(arToNum);
    if (p[0] * v[1] !== p[1] * v[0]) bad++;          // مكافئٌ للأصل
    if (gcd2(p[0], p[1]) !== 1) notSimplest++;        // وفي أبسط صورة
  }
  ok(bad === 0, "m_simplify: الناتج مكافئٌ للكسر الأصلي — " + bad);
  ok(notSimplest === 0, "m_simplify: وفي أبسط صورة فعلاً — " + notSimplest);
})();

// الأعداد الكسرية
(function () {
  let bad = 0;
  for (let i = 0; i < 600; i++) {
    const it = m_mixedImproper(), v = nums(it.q);
    if (/غير فعلي\.$/.test(it.q.trim()) || /صورة كسرٍ غير فعلي/.test(it.q)) {
      const p = chosen(it).split("/").map(arToNum);   // v=[w,n,d]
      if (p[0] !== v[0] * v[2] + v[1] || p[1] !== v[2]) bad++;
    } else {
      const m = chosen(it).split("و");                // "و" تفصل الصحيح عن الكسر
      const w = arToNum(m[0]), p = m[1].split("/").map(arToNum);
      if (w * p[1] + p[0] !== v[0] || p[1] !== v[1]) bad++;
    }
  }
  ok(bad === 0, "m_mixedImproper: التحويل في الاتجاهين صحيح — " + bad);
})();

// مقارنة الكسور
(function () {
  let bad = 0;
  for (let i = 0; i < 600; i++) {
    const it = m_fracCompare();
    const fr = it.c.map(c => c.split("/").map(arToNum));
    let big = fr[0];
    fr.forEach(f => { if (f[0] * big[1] > big[0] * f[1]) big = f; });
    const g = chosen(it).split("/").map(arToNum);
    if (g[0] !== big[0] || g[1] !== big[1]) bad++;
  }
  ok(bad === 0, "m_fracCompare: المختار هو الأكبر بالضرب التبادلي — " + bad);
})();

// التحويل بين الكسور والعشرية
(function () {
  let b1 = 0, b2 = 0;
  for (let i = 0; i < 600; i++) {
    const it = m_decToFrac(), x = nums(it.q)[0];
    const p = chosen(it).split("/").map(arToNum);
    if (Math.abs(p[0] / p[1] - x) > 1e-9 || gcd2(p[0], p[1]) !== 1) b1++;
    const it2 = m_fracToDec(), v = nums(it2.q);
    if (Math.abs(v[0] / v[1] - arToNum(chosen(it2))) > 1e-9) b2++;
  }
  ok(b1 === 0, "m_decToFrac: الكسر يساوي العدد وفي أبسط صورة — " + b1);
  ok(b2 === 0, "m_fracToDec: العشري يساوي الكسر — " + b2);
})();

// النظام المتري
(function () {
  let bad = 0;
  for (let i = 0; i < 900; i++) {
    const it = m_metric();
    const v = nums(it.q), got = arToNum(chosen(it));
    const u = M_UNITS.filter(u => it.q.indexOf(u.big) >= 0 && it.q.indexOf(u.small) >= 0)[0];
    if (!u) { bad++; continue; }
    const bigFirst = it.q.indexOf(u.big) < it.q.indexOf(u.small);
    if (bigFirst ? (v[0] * u.k !== got) : (v[0] / u.k !== got)) bad++;
  }
  ok(bad === 0, "m_metric: التحويل في الاتجاهين صحيح — " + bad);
})();

// المقياس المرجعي
(function () {
  let bad = 0;
  for (let i = 0; i < 400; i++) {
    const it = m_benchmark();
    const row = M_BENCH.filter(b => it.q.indexOf(b.thing) >= 0)[0];
    if (!row || chosen(it) !== row.right) bad++;
  }
  ok(bad === 0, "m_benchmark: الوحدة المختارة هي الصحيحة — " + bad);
})();


// ===== ٢ب) ما لا يكشفه الحساب الصحيح — عيوبٌ وجدتُها بالعين فحُوِّلت إلى فحص =====
console.log("\n٢ب) سلامةُ السؤال لا سلامةُ الحساب وحدها");
(function () {
  let whole = 0;
  for (let i = 0; i < 800; i++) {
    const it = m_decDivWhole();
    const v = nums(it.q);
    if (v[0] % 1 === 0) whole++;      // «٤٥ ÷ ٦» ليس قسمة كسرٍ عشري
  }
  ok(whole === 0, "m_decDivWhole: المقسوم كسرٌ عشري فعلاً لا عددٌ صحيح — " + whole);
})();
(function () {
  // الشرط على العدد الكسري: جزؤه الكسري في أبسط صورة، صواباً كان أو مموّهاً — لأن
  // «٤ و٢/٦» ليست صورةً نهائية يقبلها الكتاب.
  // ولا يُشترط ذلك على مموّهات الاتجاه الآخر (⇐ كسر غير فعلي): «٤/٨» هناك تجسيدُ
  // خطأٍ حقيقي (جَمَعَت بدل أن تضرب)، ولا يُطلب من أحدٍ اختزالها.
  let notSimple = 0, impNotSimple = 0;
  for (let i = 0; i < 800; i++) {
    const it = m_mixedImproper();
    const mixed = /عددٍ كسري/.test(it.q);
    it.c.forEach(function (c, idx) {
      const hasW = c.indexOf("و") >= 0;
      const part = hasW ? c.split("و")[1] : c;
      const p = part.trim().split("/").map(arToNum);
      if (p.length !== 2 || !p[1]) return;
      if (mixed && p[0] < p[1] && gcd2(p[0], p[1]) !== 1) notSimple++;
      if (!mixed && idx === it.a && gcd2(p[0], p[1]) !== 1) impNotSimple++;
    });
  }
  ok(notSimple === 0, "m_mixedImproper: العدد الكسري وجزؤه في أبسط صورة — " + notSimple);
  ok(impNotSimple === 0, "m_mixedImproper: والكسر غير الفعلي الصحيح غير قابلٍ للاختزال — " + impNotSimple);
})();
(function () {
  // خيارٌ يساوي صفراً في تحويلٍ متريّ لا معنى له ولا يُمثّل خطأً حقيقياً
  let zero = 0;
  for (let i = 0; i < 800; i++) if (m_metric().c.indexOf("٠") >= 0) zero++;
  ok(zero === 0, "m_metric: لا خيارَ صفريّ — " + zero);
})();
(function () {
  // مصطلحٌ خاطئ: «رقم المئات» يعني ١٠٠ لا الجزء من مئة
  let bad = 0;
  for (let i = 0; i < 300; i++) if (/رقم المئات/.test(m_round().w)) bad++;
  ok(bad === 0, "m_round: مصطلح المنزلة صحيح (لا «رقم المئات») — " + bad);
})();
(function () {
  // لا سؤالَ فيه صوابان: أيّ خيارٍ آخر يساوي الصواب عددياً يُعدّ عيباً
  let dbl = 0;
  math6Ready().forEach(function (L) {
    for (let i = 0; i < 150; i++) {
      const it = L.gen(), right = chosen(it);
      it.c.forEach(function (c, idx) {
        if (idx === it.a) return;
        const a = arToNum(c), b = arToNum(right);
        // تُقارَن الأعداد الخالصة وحدها: «٢ × ٢ × ٣» يقرؤها parseFloat ٢ فتبدو
        // مساويةً للصواب — بلاغٌ كاذب لا عيبٌ في المولّد.
        const pure = /^[٠-٩]+(٫[٠-٩]+)?$/;
        if (pure.test(c) && pure.test(right) && Math.abs(a - b) < 1e-12) dbl++;
      });
    }
  });
  ok(dbl === 0, "لا خيارَ يساوي الصواب في أيّ مولّد — " + dbl);
})();

// ===== ٣) الفهرس مطابقٌ للكتاب =====
console.log("\n٣) الفهرس");
const all = math6Lessons(), ready = math6Ready();
ok(MATH6_PLAN.length === 5, "خمسة فصول — " + MATH6_PLAN.length);
// العدد لكل فصلٍ مقابلٌ لفهرس الكتاب نفسه (الدروس المرقّمة وحدها؛ الاستكشاف والتوسّع
// والاختبارات ليست دروساً). وهذا هو الفحص ذو المعنى — لا رقمٌ إجمالي أُثبّته بيدي.
const PER_CH = { 1: 8, 2: 5, 3: 10, 4: 8, 5: 4 };
MATH6_PLAN.forEach(function (c) {
  ok(c.lessons.length === PER_CH[c.ch],
    "الفصل " + c.ch + ": " + PER_CH[c.ch] + " دروساً كما في الفهرس — " + c.lessons.length);
});
ok(all.length === Object.values(PER_CH).reduce(function (a, b) { return a + b; }, 0),
  "مجموع الدروس — " + all.length);
ok(new Set(all.map(l => l.id)).size === all.length, "لا معرّف مكرّر");
ok(all.every(l => l.p > 0), "لكل درسٍ صفحته من الكتاب");
ok(all.every(l => !!l.sk), "ولكل درسٍ مهارته (لتتبّع الإتقان بـBKT)");
let inc = true; let last = 0;
all.forEach(l => { if (l.p < last) inc = false; last = l.p; });
ok(inc, "أرقام الصفحات متصاعدة كما في الكتاب");
ok(ready.length + all.filter(l => !l.gen).length === all.length, "الجاهز + المنتظِر = الكلّ");
ok(ready.length >= 24, "أغلب الدروس له مولّد — " + ready.length + " من " + all.length);
console.log("   الجاهز الآن: " + ready.length + " درساً · ينتظر الملفّ: " +
  all.filter(l => !l.gen).map(l => l.no).join(" ، "));

console.log("\n" + (fails ? "=== " + fails + " فشل من " + checks + " فحصاً ===" : "=== كل الفحوص نجحت (" + checks + ") ==="));
process.exit(fails ? 1 : 0);
