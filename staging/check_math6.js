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
  ";globalThis.M_UNITS=M_UNITS;globalThis.M_BENCH=M_BENCH;globalThis.MATH6_PLAN=MATH6_PLAN;globalThis.MATH6_PREP=MATH6_PREP;globalThis.KEY_WORDS=KEY_WORDS;globalThis.NAMES_F=NAMES_F;globalThis.NAMES_M=NAMES_M;");

let fails = 0, checks = 0;
function ok(c, m, n) { checks++; if (!c) { fails++; console.log("  ✗ " + m + (n !== undefined ? " — " + n : "")); } }
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


// ===== ٢ج) التهيئة والدرس ١-١ — من صفحات الكتاب (ص ١١-١٦) =====
console.log("\n٢ج) التهيئة والدرس ١-١");
(function () {
  const ops = [[m_prepAdd, "+", (a, b) => a + b], [m_prepSub, "−", (a, b) => a - b],
               [m_prepMul, "×", (a, b) => a * b], [m_prepDiv, "÷", (a, b) => a / b]];
  ops.forEach(function (o) {
    let bad = 0, trivial = 0;
    for (let i = 0; i < 700; i++) {
      const it = o[0](), v = nums(it.q);
      if (o[2](v[0], v[1]) !== arToNum(chosen(it))) bad++;
      if (o[1] === "÷" && v[0] % v[1] !== 0) trivial++;          // القسمة بلا باقٍ
      if (o[1] === "−" && v[0] % 10 >= v[1] % 10) trivial++;     // استلافٌ مضمون
    }
    ok(bad === 0, "m_prep «" + o[1] + "»: الناتج صحيح — " + bad);
    ok(trivial === 0, "m_prep «" + o[1] + "»: بالشرط الذي في الكتاب — " + trivial);
  });
})();
(function () {
  let bad = 0;
  for (let i = 0; i < 600; i++) {
    const it = m_keyword();
    const w = (it.q.match(/«([^»]+)»/) || [])[1];
    const right = chosen(it);
    if (!w || (KEY_WORDS[right] || []).indexOf(w) < 0) bad++;
    // ولا عمليةٌ أخرى تحوي الكلمة نفسها — وإلا صار للسؤال جوابان
    Object.keys(KEY_WORDS).forEach(function (o) {
      if (o !== right && KEY_WORDS[o].indexOf(w) >= 0) bad++;
    });
  }
  ok(bad === 0, "m_keyword: الكلمة تخصّ عمليةً واحدة من جدول ص١٢ — " + bad);
})();
(function () {
  let bad = 0;
  for (let i = 0; i < 900; i++) {
    const it = m_pattern();
    const seq = (it.q.split(":")[1] || "").split("،").map(x => x.trim())
      .filter(x => /[٠-٩]/.test(x)).map(arToNum);
    const got = arToNum(chosen(it));
    const d = round2(seq[1] - seq[0]);
    // ثلاث عائلات مقبولة، وكلٌّ تُتحقَّق بقاعدتها هي لا بقاعدةٍ واحدة للجميع
    const arith = Math.abs(round2(seq[3] + d) - got) < 1e-9 &&
                  seq.every((v, k) => k === 0 || Math.abs(round2(v - seq[k - 1]) - d) < 1e-9);
    const step = seq.length === 5 && seq[4] * 5 === got;   // ×٢ ثم ×٣ ثم ×٤
    let grow = false;                                      // ٢ ، ٤ ، ٧ ، ١١ (فرقٌ متزايد)
    if (seq.length === 4) {
      const g = [seq[1] - seq[0], seq[2] - seq[1], seq[3] - seq[2]];
      grow = (g[1] === g[0] + 1) && (g[2] === g[1] + 1) && (seq[3] + g[2] + 1 === got);
    }
    if (!arith && !step && !grow) bad++;
  }
  ok(bad === 0, "m_pattern: الحدّ التالي يتبع قاعدة النمط المعروض — " + bad);
})();
(function () {
  let bad = 0;
  for (let i = 0; i < 700; i++) {
    const it = m_fourStepsDiff();
    const pairs = {};
    (it.q.match(/([\u0621-\u064A]+): ([٠-٩]+)/g) || []).forEach(function (m) {
      const p = m.split(":"); pairs[p[0].trim()] = arToNum(p[1]);
    });
    const inc = it.q.match(/بكم تزيد [\u0621-\u064A]+ ([\u0621-\u064A]+) على ([\u0621-\u064A]+)؟/);
    const dec = it.q.match(/بكم تقلّ [\u0621-\u064A]+ ([\u0621-\u064A]+) عن ([\u0621-\u064A]+)؟/);
    // «تزيد A على B» ⇒ A أكبر · «تقلّ B عن A» ⇒ A أكبر — والجواب A−B في الحالتين
    const who = inc ? [null, inc[1], inc[2]] : (dec ? [null, dec[2], dec[1]] : null);
    if (!who || pairs[who[1]] === undefined || pairs[who[2]] === undefined) { bad++; continue; }
    if (pairs[who[1]] - pairs[who[2]] !== arToNum(chosen(it))) bad++;
    if (pairs[who[1]] <= pairs[who[2]]) bad++;
    if (Object.keys(pairs).length < 4) bad++;       // معلوماتٌ زائدة كما في مثال الكتاب
    // الشرح يقتبس صيغة السؤال نفسها لا صيغةً أخرى
    if (dec && it.w.indexOf("بكم تقلّ") < 0) bad++;
    if (inc && it.w.indexOf("بكم تزيد") < 0) bad++;
  }
  ok(bad === 0, "m_fourStepsDiff: الفرق مطابقٌ للجدول، والأوّل أكبر، ومعه زائد — " + bad);
})();
(function () {
  let bad = 0;
  for (let i = 0; i < 700; i++) {
    const it = m_fourStepsRate(), v = nums(it.q), got = arToNum(chosen(it));
    const rate = v[0];
    const per = /سنوات/.test(it.q) ? v[1] * 12 : v[1];
    if (rate * per !== got) bad++;
    if (/صفحة|كلمة/.test(it.q) && rate > 40) bad++;   // ١٧٣٤ صفحةً يومياً لا معنى له
  }
  ok(bad === 0, "m_fourStepsRate: الناتج = المعدَّل × المدّة (والسنوات تُحوَّل شهوراً) — " + bad);
})();
(function () {
  // شرح الخطوات الأربع يجب أن يحوي الأربع فعلاً — هي فكرة الدرس لا زينة
  let miss = 0;
  for (let i = 0; i < 400; i++) {
    const it = pick([m_fourStepsDiff, m_fourStepsRate])();
    ["افهم", "خطّط", "حل", "تحقّق"].forEach(function (k) { if (it.w.indexOf(k) < 0) miss++; });
    if (it.w.indexOf("التقدير") < 0) miss++;   // مقارنة الجواب بالتقدير — إرشاد ص١٢
  }
  ok(miss === 0, "الشرح يمرّ على الخطوات الأربع ومعها التقدير — " + miss);
})();
(function () {
  ok(!!MATH6_PREP[1] && MATH6_PREP[1].gens.length === 4, "التهيئة: أربع مهاراتٍ سابقة كما في ص١١");
  ok(MATH6_PREP[1].p === 11, "وصفحتها ١١");
})();



(function () {
  // نمطٌ بفرقٍ متزايد (٢،٤،٧،١١) — الفروق نفسها تكبر واحداً
  let seen = 0, bad = 0;
  for (let i = 0; i < 1500; i++) {
    const it = m_pattern();
    const seq = (it.q.split(":")[1] || "").split("،").map(x => x.trim())
      .filter(x => /[٠-٩]/.test(x)).map(arToNum);
    if (seq.length !== 4) continue;
    const d = [seq[1] - seq[0], seq[2] - seq[1], seq[3] - seq[2]];
    if (d[1] === d[0] + 1 && d[2] === d[1] + 1) {
      seen++;
      if (seq[3] + d[2] + 1 !== arToNum(chosen(it))) bad++;
    }
  }
  ok(seen > 0, "نمطُ الفرق المتزايد يظهر فعلاً — " + seen);
  ok(bad === 0, "وحدُّه التالي صحيح — " + bad);
})();
(function () {
  let bad = 0;
  for (let i = 0; i < 700; i++) {
    const it = m_patternTable();
    const cells = (it.q.match(/([٠-٩]+): ([٠-٩]+)/g) || []).map(function (m) {
      return m.split(":").map(x => arToNum(x));
    });
    if (cells.length < 4) { bad++; continue; }
    const per = cells[0][1] / cells[0][0];
    // النمط منتظم فعلاً في كل خلايا الجدول
    if (!cells.every(c => c[1] === c[0] * per)) bad++;
    const askAt = arToNum((it.q.match(/بعد ([٠-٩]+)|في ([٠-٩]+)/) || [])[0].replace(/[^٠-٩]/g, ""));
    if (askAt * per !== arToNum(chosen(it))) bad++;
    if (askAt <= cells[3][0]) bad++;     // المطلوب أبعد ممّا في الجدول (مسبح ص١٤)
  }
  ok(bad === 0, "m_patternTable: النمط منتظم والمطلوب أبعد من الجدول — " + bad);
  // صياغة: أمرٌ بنقطة لا بعلامة استفهام، و«كل علبة» لا «كل ١ علبة»
  let style = 0;
  for (let i = 0; i < 500; i++) {
    const it = m_patternTable();
    if (/فأوجدي[^.؟]*؟/.test(it.q)) style++;
    if (/كل ١ /.test(it.w)) style++;
  }
  ok(style === 0, "m_patternTable: صياغةٌ سليمة (لا «فأوجدي…؟» ولا «كل ١ علبة») — " + style);
})();
(function () {
  // التحقّق بالعمل عكسياً — يُعلّمه الكتاب صراحةً في ص١٤
  let miss = 0;
  for (let i = 0; i < 500; i++) {
    const it = pick([m_pattern, m_patternTable])();
    if (it.w.indexOf("عكسياً") < 0) miss++;
  }
  ok(miss === 0, "شرحُ النمط يحمل التحقّق بالعمل عكسياً — " + miss);
})();


// ===== ٢هـ) ما أضافته ص ١٥-١٦ =====
console.log("\n٢هـ) أنواع ص ١٥-١٦");
(function () {
  let bad = 0, wrap = 0;
  const t2m = function (t) { const p = t.split(":").map(arToNum); return p[0] * 60 + p[1]; };
  for (let i = 0; i < 800; i++) {
    const it = m_patternTime();
    const times = (it.q.match(/[٠-٩]+:[٠-٩]+/g) || []);
    if (times.length !== 4) { bad++; continue; }
    const mins = times.map(t2m), step = mins[1] - mins[0];
    if (!mins.every((v, k) => k === 0 || v - mins[k - 1] === step)) bad++;
    if (t2m(chosen(it)) !== mins[3] + step) bad++;
    // الدقائق تدور عند الستّين: لا «٨:٧٠»
    it.c.concat(times).forEach(function (t) { if (arToNum(t.split(":")[1]) > 59) wrap++; });
  }
  ok(bad === 0, "m_patternTime: الخطوة منتظمة والموعد التالي صحيح — " + bad);
  ok(wrap === 0, "m_patternTime: لا دقيقةَ فوق ٥٩ — " + wrap);
})();
(function () {
  let bad = 0;
  for (let i = 0; i < 800; i++) {
    const it = m_rateTwoStep(), v = nums(it.q);   // [a, b, target]
    const a = v[0], b = v[1], target = v[2];
    if (target % a !== 0) bad++;                  // المطلوب مضاعفٌ للمعدَّل وإلا كُسر الجواب
    if (target / a * b !== arToNum(chosen(it))) bad++;
    if (target <= a) bad++;                       // وإلا لم تكن مسألةَ معدَّلٍ أصلاً
    // تمييز العدد في الشرح كما في السؤال: «١٠ أشواط» لا «١٠ شوطاً»
    if (/لكل ٢ /.test(it.w) || /في ٢ /.test(it.q)) bad++;   // المثنّى: «دقيقتين» لا «٢ دقيقة»
    const m = it.w.match(/المعدّل ([٠-٩]+) ([\u0621-\u064A]+)/);
    if (m) {
      const n = arToNum(m[1]) % 100, plural = /^(أشواط|أسطر|تمارين)$/.test(m[2]);
      if ((n >= 3 && n <= 10) !== plural) bad++;
    }
  }
  ok(bad === 0, "m_rateTwoStep: قسمةٌ ثم ضرب، والمطلوب مضاعفٌ للمعدَّل — " + bad);
})();
(function () {
  let bad = 0;
  for (let i = 0; i < 800; i++) {
    const it = m_patternThree();
    const seq = (it.q.split(":")[1] || "").split("،").map(x => x.trim())
      .filter(x => /^[٠-٩]+$/.test(x)).map(arToNum);
    const got = chosen(it).split("،").map(x => arToNum(x.trim()));
    if (seq.length !== 4 || got.length !== 3) { bad++; continue; }
    const d = seq[1] - seq[0];
    if (!seq.every((v, k) => k === 0 || v - seq[k - 1] === d)) bad++;
    if (got[0] !== seq[3] + d || got[1] !== seq[3] + 2 * d || got[2] !== seq[3] + 3 * d) bad++;
    if (got.some(x => x < 0)) bad++;              // لا حدودَ سالبة في السادس الابتدائي
  }
  ok(bad === 0, "m_patternThree: الحدود الثلاثة تتبع النمط ولا سالب — " + bad);
})();
(function () {
  let bad = 0;
  for (let i = 0; i < 800; i++) {
    const it = m_diffBig(), v = nums(it.q);
    if (v[0] - v[1] !== arToNum(chosen(it))) bad++;
    if (v[0] <= v[1]) bad++;                      // «فكم يزيد A على B» تقتضي A أكبر
    if (v[0] < 1000) bad++;                       // أعدادٌ كبيرة كما في مسألة الأنهار
    // لا تُنسَب قيمةٌ مولَّدة إلى معلَمٍ حقيقيّ معروف الطول — معلومةٌ كاذبة تُحفَظ
    if (/النيل|الفولجا|الأمازون|الدانوب|اليانغتسي|الراين|إيفرست/.test(it.q)) bad++;
    // تطابق الفعل مع المسنَد إليه: «عدد» مذكّر و«مسافة/قطع» مؤنّث
    if (/فكم يزيد (مسافة|قطع)/.test(it.q)) bad++;
    if (/فكم تزيد عدد/.test(it.q)) bad++;
  }
  ok(bad === 0, "m_diffBig: الفرق صحيح والأوّل أكبر والأعداد كبيرة — " + bad);
})();

// ===== ٢د) عربيّةُ النصّ — أخطاءٌ لا يراها الحساب ويراها أوّل قارئ =====
console.log("\n٢د) سلامة العربية");
(function () {
  let gender = 0, count = 0, noVerb = 0, tatweel = 0;
  const M_VERBS = ["يمشي", "يقرأ", "يحفظ", "اشترى"];
  const F_VERBS = ["تمشي", "تقرأ", "تحفظ", "اشترت"];
  const M2 = ["يستطيع", "يسبح", "يطبع", "يحلّ", "استمرّ "];
  const F2 = ["تستطيع", "تسبح", "تطبع", "تحلّ", "استمرّت"];
  for (let i = 0; i < 1200; i++) {
    const q = m_fourStepsRate().q;
    const isF = NAMES_F.some(function (n) { return q.indexOf(n) >= 0; });
    const isM = NAMES_M.some(function (n) { return q.indexOf(n) >= 0; });
    // اسمٌ مؤنّث مع فعلٍ مذكّر (أو العكس) — «سميرة يمشي»
    if (isF && M_VERBS.some(function (v) { return q.indexOf(v) >= 0; })) gender++;
    if (isM && F_VERBS.some(function (v) { return q.indexOf(v) >= 0; })) gender++;
    // كل صيغةٍ لا بدّ أن تحمل فعلاً — «ناصر قسطاً شهرياً قدره…» جملةٌ ناقصة
    if (!M_VERBS.concat(F_VERBS).some(function (v) { return q.indexOf(v) >= 0; })) noVerb++;
    // تمييز العدد: ٣-١٠ جمعٌ («٩ أيام») وما فوق مفردٌ منصوب («١٣ يوماً»)
    if (q.indexOf("\u0640") >= 0) tatweel++;   // «يدفعـها» — لصقُ ضميرٍ بالفعل بدل تصريفه
    const m = q.match(/([٠-٩]+) (أيام|يوماً)/);
    if (m) {
      const n = arToNum(m[1]), t = n % 100;
      const want = (t >= 3 && t <= 10) ? "أيام" : "يوماً";
      if (m[2] !== want) count++;
    }
  }
  // ومسألةُ المعدَّل بخطوتين لها أفعالها هي
  let g2 = 0;
  for (let i = 0; i < 900; i++) {
    const q = m_rateTwoStep().q;
    const isF = NAMES_F.some(function (n) { return q.indexOf(n) >= 0; });
    const isM = NAMES_M.some(function (n) { return q.indexOf(n) >= 0; });
    if (isF && M2.some(function (v) { return q.indexOf(v) >= 0; })) g2++;
    if (isM && F2.some(function (v) { return q.indexOf(v) >= 0; })) g2++;
  }
  ok(g2 === 0, "تطابق الفعل في مسألة المعدَّل بخطوتين — " + g2);
  ok(gender === 0, "تطابق الفعل مع جنس الاسم — " + gender);
  ok(noVerb === 0, "كل مسألةٍ جملةٌ تامّة فيها فعل — " + noVerb);
  ok(tatweel === 0, "لا تطويل (ـ) داخل كلمة — أثرُ لصقِ لاحقةٍ بالفعل", tatweel);
  ok(count === 0, "تمييز العدد صحيح (٣-١٠ جمع، وما فوق مفرد منصوب) — " + count);
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
