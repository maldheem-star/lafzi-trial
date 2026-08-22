// ===== الرياضيات — الصف السادس الابتدائي (هيا) =====
// الفهرس مأخوذٌ حرفياً من كتاب الوزارة (ien.edu.sa، ٢٠٥ صفحة): خمسة فصول، وكل درسٍ
// برقمه المطبوع وصفحته. فحين يصل الملفّ الكامل يكون لكل درسٍ موضعه معروفاً سلفاً.
//
// وقرارٌ مركزي: **الأسئلة تُولَّد بالشيفرة لا بالنموذج.** وهذا ليس اجتهاداً جديداً —
// `QUANT_GENS` في هذا التطبيق تفعله منذ البداية، والسبب أقوى هنا: رياضياتٌ محسوبة
// يكون فيها المولِّد نفسه هو المُحقِّق (الجواب يُشتقّ من الأرقام لا يُخمَّن)، فيتحقّق
// شرط المشروع «صحّة كل سؤالٍ مولَّد مسؤوليتي أراقبها لا أفترضها» تحقّقاً تامّاً لا
// احتمالياً. ونموذجٌ لغوي يُنتج «٠٫٤ × ٠٫٧ = ٢٫٨» بلا أن يشعر.
//
// والمموّهات ليست تشويشاً: كلٌّ منها يعزل **آلية خطأ معروفة** (الضرب بدل الأُس،
// اليسار-لليمين بدل الأولوية، إزاحة الفاصلة العشرية) — نفس انضباط `MATH_BUGS`
// و`GRAM_BANK` المعتمد أصلاً، حتى يُقرأ اختيارها الخاطئ تشخيصاً لا مجرّد «خطأ».

// ===== خيارات نصّية: نظير mcNum حين لا يكون الجواب عدداً =====
// الكسور والتحليل إلى العوامل والوحدات لا تُمثَّل بعددٍ واحد، وmcNum يُدوّر ويُسقط.
function mcTxt(correct, cands) {
  const opts = [String(correct)];
  (cands || []).forEach(function (x) {
    x = String(x);
    if (opts.length < 4 && x && opts.indexOf(x) < 0) opts.push(x);
  });
  const sh = shuffle(opts);
  return { choices: sh, answer: sh.indexOf(String(correct)) };
}
function qzT(d, q, correct, cands, w) {
  const m = mcTxt(correct, cands);
  return { d: d, q: q, c: m.choices, a: m.answer, w: w };
}
// كسرٌ بالأرقام العربية
function arFrac(n, d) { return toAr(n) + "/" + toAr(d); }
// عشريٌّ **بلا تقريب**. وarDec القائمة تمرّ على round2، فتكتب ٣/٨ = ٠٫٣٨ وهو خطأ صريح،
// وتعرض ٠٫١٢٥ في السؤال على أنها ٠٫١٣ ثم تطلب كسرها. كشفه الفاحص لا القراءة.
function arDecX(x) {
  let s = String(x);
  if (s.indexOf("e") >= 0) s = Number(x).toFixed(6).replace(/0+$/, "").replace(/\.$/, "");
  return toAr(s).replace(".", "٫");
}
// مموّهاتٌ عشرية: تُقرَّب وتُنقّى من غير الموجب ومن المكرّر — الكثرة تمنع نقص الخيارات
function decCands(list) {
  const out = [];
  list.map(round2).forEach(function (v) {
    if (v > 0 && out.indexOf(v) < 0) out.push(v);
  });
  return out.map(arDec);
}
function gcd2(a, b) { a = Math.abs(a); b = Math.abs(b); while (b) { const t = b; b = a % b; a = t; } return a; }
function lcm2(a, b) { return a / gcd2(a, b) * b; }
function primesOf(n) { const out = []; let x = n; for (let p = 2; p * p <= x; p++) { while (x % p === 0) { out.push(p); x /= p; } } if (x > 1) out.push(x); return out; }
function facStr(a) { return a.map(toAr).join(" × "); }

// ===== الفصل ١: الجبر — الأنماط العددية والدوال =====

// ٢-١ العوامل الأولية
function m_primeFactors() {
  const n = pick([12, 18, 20, 24, 28, 36, 40, 45, 48, 50, 54, 60, 72, 84, 90, 100]);
  const f = primesOf(n);
  const right = facStr(f);
  // مموّهات بآلياتٍ مسمّاة: عاملٌ غير أوّليّ، وعاملٌ ساقط، وعاملٌ زائد
  const comp = f.slice(0, f.length - 2).concat([f[f.length - 2] * f[f.length - 1]]);
  const wrongComposite = f.length >= 2 ? facStr(comp) : facStr([1].concat(f));
  const wrongMissing = facStr(f.slice(0, -1));
  const wrongExtra = facStr([1].concat(f));
  return qzT("math6", `حلّلي العدد ${toAr(n)} إلى عوامله الأوّلية.`, right,
    [wrongComposite, wrongMissing, wrongExtra],
    `${toAr(n)} = ${right} — وكل عاملٍ هنا عددٌ أوّليّ، والواحد لا يُكتب لأنه ليس أوّلياً.`);
}

// ٣-١ القوى والأسس
function m_powers() {
  const b = rand(2, 6), e = rand(2, 4);
  const val = Math.pow(b, e);
  return qz("math6", `ما قيمة ${toAr(b)} أُسّ ${toAr(e)} (${toAr(b)}^${toAr(e)})؟`, val,
    [b * e, Math.pow(b, e - 1), Math.pow(e, b)],
    `${toAr(b)}^${toAr(e)} تعني ضرب ${toAr(b)} في نفسه ${toAr(e)} مرّات = ${toAr(val)}، لا ${toAr(b)} × ${toAr(e)}.`);
}

// ٤-١ ترتيب العمليات
function m_order() {
  const a = rand(2, 9), b = rand(2, 9), c = rand(2, 9);
  if (pick([0, 1])) {
    const val = a + b * c, leftToRight = (a + b) * c;
    return qz("math6", `أوجدي قيمة: ${toAr(a)} + ${toAr(b)} × ${toAr(c)}`, val,
      [leftToRight, a * b + c, a + b + c],
      `الضرب قبل الجمع: ${toAr(b)} × ${toAr(c)} = ${toAr(b * c)}، ثم + ${toAr(a)} = ${toAr(val)}. لا يُجمع أوّلاً.`);
  }
  const val = (a + b) * c;
  return qz("math6", `أوجدي قيمة: (${toAr(a)} + ${toAr(b)}) × ${toAr(c)}`, val,
    [a + b * c, a * c + b, a + b + c],
    `القوسان أوّلاً: ${toAr(a)} + ${toAr(b)} = ${toAr(a + b)}، ثم × ${toAr(c)} = ${toAr(val)}.`);
}

// ٥-١ المتغيرات والعبارات
function m_varExpr() {
  const k = rand(2, 9), n = rand(2, 12), c = rand(1, 20);
  const val = k * n + c;
  return qz("math6", `إذا كانت س = ${toAr(n)} فما قيمة ${toAr(k)}س + ${toAr(c)}؟`, val,
    [k * (n + c), n + k + c, k * n - c],
    `نعوّض: ${toAr(k)} × ${toAr(n)} = ${toAr(k * n)}، ثم + ${toAr(c)} = ${toAr(val)}. الضرب قبل الجمع.`);
}

// ٦-١ الدوال
function m_function() {
  const k = rand(2, 5), c = rand(1, 9), x = rand(4, 12);
  const y = k * x + c;
  return qz("math6",
    `دالةٌ قاعدتها: اضربي المُدخَل في ${toAr(k)} ثم أضيفي ${toAr(c)}. ما المُخرَج عندما يكون المُدخَل ${toAr(x)}؟`,
    y, [k * (x + c), x + k + c, k * x],
    `المُخرَج = ${toAr(k)} × ${toAr(x)} + ${toAr(c)} = ${toAr(y)}.`);
}

// ٨-١ المعادلات
function m_equation() {
  const x = rand(3, 25), b = rand(2, 30);
  if (pick([0, 1])) {
    return qz("math6", `حلّي المعادلة: س + ${toAr(b)} = ${toAr(x + b)}`, x,
      [x + b + b, b - x > 0 ? b - x : x + 1, x + b],
      `نطرح ${toAr(b)} من الطرفين: س = ${toAr(x + b)} − ${toAr(b)} = ${toAr(x)}.`);
  }
  const k = rand(2, 9);
  return qz("math6", `حلّي المعادلة: ${toAr(k)}س = ${toAr(k * x)}`, x,
    [k * x * k, k * x - k, k * x + k],
    `نقسم الطرفين على ${toAr(k)}: س = ${toAr(k * x)} ÷ ${toAr(k)} = ${toAr(x)}.`);
}

// ===== الفصل ٢: الإحصاء والتمثيلات البيانية =====

// ٤-٢ المتوسط الحسابي
function m_mean() {
  const n = pick([4, 5]), mean = rand(5, 20);
  const data = [];
  let s = 0;
  for (let i = 0; i < n - 1; i++) { const v = mean + rand(-4, 4); data.push(v); s += v; }
  data.push(mean * n - s);
  const sum = mean * n;
  const sorted = data.slice().sort(function (a, b) { return a - b; });
  const med = n % 2 ? sorted[(n - 1) / 2] : (sorted[n / 2 - 1] + sorted[n / 2]) / 2;
  return qz("math6", `أوجدي المتوسط الحسابي للبيانات: ${arSeq(data)}`, mean,
    [Math.round(sum / (n - 1)), Math.round(med), sum],
    `المتوسط = المجموع ÷ عدد القيم = ${toAr(sum)} ÷ ${toAr(n)} = ${toAr(mean)}.`);
}

// ٥-٢ الوسيط والمنوال والمدى
function m_medianModeRange() {
  const n = 5;
  const data = [];
  for (let i = 0; i < n - 1; i++) data.push(rand(2, 30));
  data.push(data[rand(0, n - 2)]);            // نضمن منوالاً واحداً على الأقلّ
  const sorted = data.slice().sort(function (a, b) { return a - b; });
  const med = sorted[2];
  const range = sorted[n - 1] - sorted[0];
  const cnt = {}; data.forEach(function (v) { cnt[v] = (cnt[v] || 0) + 1; });
  let mode = data[0], best = 0;
  Object.keys(cnt).forEach(function (k) { if (cnt[k] > best) { best = cnt[k]; mode = Number(k); } });
  const sum = data.reduce(function (a, b) { return a + b; }, 0);
  const which = pick(["median", "range", "mode"]);
  if (which === "median") {
    return qz("math6", `أوجدي الوسيط للبيانات: ${arSeq(data)}`, med,
      [Math.round(sum / n), mode, range],
      `نرتّب: ${arSeq(sorted)} — والوسيط هو القيمة الوسطى = ${toAr(med)}. الترتيب أوّلاً شرطٌ لا يُهمَل.`);
  }
  if (which === "range") {
    return qz("math6", `أوجدي المدى للبيانات: ${arSeq(data)}`, range,
      [sorted[n - 1], med, mode],
      `المدى = أكبر قيمة − أصغر قيمة = ${toAr(sorted[n - 1])} − ${toAr(sorted[0])} = ${toAr(range)}.`);
  }
  return qz("math6", `أوجدي المنوال للبيانات: ${arSeq(data)}`, mode,
    [med, range, Math.round(sum / n)],
    `المنوال هو القيمة الأكثر تكراراً = ${toAr(mode)} (تكرّرت ${toAr(best)} مرّات).`);
}

// ===== الفصل ٣: العمليات على الكسور العشرية =====

// ٢-٣ مقارنة الكسور العشرية وترتيبها
function m_decCompare() {
  // الفخّ المقصود ومبنيٌّ عمداً لا مصادفةً: الأكبر بمنزلةٍ واحدة (٠٫٦ فأكثر)، والثلاثة
  // الباقية بمنزلتين وأصغر (٠٫٥٩ فأقلّ) — فمن يقيس بعدد الأرقام يُخطئ حتماً.
  const max = round2(rand(6, 9) / 10);
  const arr = [max];
  while (arr.length < 4) { const v = round2(rand(11, 59) / 100); if (arr.indexOf(v) < 0) arr.push(v); }
  const show = shuffle(arr);
  const longest = arr.filter(function (v) { return v !== max; })[0];
  return qzT("math6", `أيّ الأعداد الآتية أكبر؟ ${show.map(arDec).join(" ، ")}`, arDec(max),
    arr.filter(function (v) { return v !== max; }).map(arDec),
    `نوازن المنازل لا عدد الأرقام: ${arDec(max)} هو الأكبر — و${arDec(longest)} أطولُ رقماً لكنه أصغر قيمةً.`);
}

// ٣-٣ تقريب الكسور العشرية
function m_round() {
  const x = round2(rand(101, 989) / 100);
  const tenth = Math.round(x * 10) / 10;
  const trunc = Math.floor(x * 10) / 10;
  return qz("math6", `قرّبي العدد ${arDec(x)} إلى أقرب جزء من عشرة.`, tenth,
    [trunc === tenth ? round2(tenth + 0.1) : trunc, Math.round(x), Math.floor(x)],
    `ننظر إلى الرقم التالي — منزلة الجزء من مئة (${toAr(Math.round(x * 100) % 10)}): ` +
    (Math.round(x * 100) % 10 >= 5 ? `خمسة فأكثر فنزيد` : `أقلّ من خمسة فنُبقي`) +
    ` ⇒ ${arDec(tenth)}.`);
}

// ٤-٣ تقدير ناتج الجمع والطرح
function m_estimate() {
  const a = round2(rand(110, 890) / 100), b = round2(rand(110, 890) / 100);
  const est = Math.round(a) + Math.round(b);
  return qz("math6", `قدّري ناتج: ${arDec(a)} + ${arDec(b)} بتقريب كلٍّ منهما إلى أقرب عدد صحيح.`, est,
    [Math.floor(a) + Math.floor(b), Math.round(a + b) + 1, Math.ceil(a) + Math.ceil(b)],
    `${arDec(a)} ≈ ${toAr(Math.round(a))} و${arDec(b)} ≈ ${toAr(Math.round(b))}، فالتقدير ${toAr(est)}.`);
}

// ٥-٣ جمع الكسور العشرية وطرحها
function m_decAddSub() {
  const a = round2(rand(150, 950) / 100), b = round2(rand(50, 140) / 100);
  if (pick([0, 1])) {
    const s = round2(a + b);
    return qzT("math6", `أوجدي ناتج: ${arDec(a)} + ${arDec(b)}`, arDec(s),
      decCands([a - b, a + b / 10, s + 1, s + 0.1, s - 0.1, s + 0.01]),
      `نُحاذي الفواصل ثم نجمع: ${arDec(a)} + ${arDec(b)} = ${arDec(s)}.`);
  }
  const d = round2(a - b);
  return qzT("math6", `أوجدي ناتج: ${arDec(a)} − ${arDec(b)}`, arDec(d),
    decCands([a + b, d + 0.1, d - 0.1, d + 1, d + 0.01]),
    `نُحاذي الفواصل ثم نطرح: ${arDec(a)} − ${arDec(b)} = ${arDec(d)}.`);
}

// ٦-٣ ضرب الكسور العشرية في أعداد كلية
function m_decMulWhole() {
  const a = round2(rand(11, 89) / 10), k = rand(2, 9);
  const p = round2(a * k);
  return qzT("math6", `أوجدي ناتج: ${arDec(a)} × ${toAr(k)}`, arDec(p),
    decCands([p * 10, p / 10, a + k, p + 0.1, p - 0.1]),
    `نضرب كأنهما عددان صحيحان (${toAr(Math.round(a * 10))} × ${toAr(k)} = ${toAr(Math.round(a * 10) * k)}) ثم نضع الفاصلة بمنزلةٍ واحدة ⇒ ${arDec(p)}.`);
}

// ٧-٣ ضرب الكسور العشرية — بيت القصيد: عدد المنازل في الناتج
function m_decMul() {
  const a = rand(2, 9) / 10, b = rand(2, 9) / 10;
  const p = round2(a * b);
  return qzT("math6", `أوجدي ناتج: ${arDec(round2(a))} × ${arDec(round2(b))}`, arDec(p),
    decCands([p * 10, p * 100, a + b, p / 10, p + 0.1]),
    `${toAr(Math.round(a * 10))} × ${toAr(Math.round(b * 10))} = ${toAr(Math.round(a * 10) * Math.round(b * 10))}، وللعاملين منزلتان عشريتان فللناتج منزلتان ⇒ ${arDec(p)}.`);
}

// ٨-٣ قسمة الكسور العشرية على أعداد كلية
function m_decDivWhole() {
  // المقسوم يجب أن يكون كسراً عشرياً فعلاً: ٧٫٥ × ٦ = ٤٥ سؤالٌ خارج الدرس
  let k, q, a, guard = 0;
  do { k = rand(2, 9); q = round2(rand(11, 89) / 10); a = round2(q * k); }
  while ((a % 1 === 0 || q % 1 === 0) && guard++ < 60);
  return qzT("math6", `أوجدي ناتج: ${arDec(a)} ÷ ${toAr(k)}`, arDec(q),
    decCands([q * 10, q / 10, a - k, q + 0.1, q + 1]),
    `${arDec(a)} ÷ ${toAr(k)} = ${arDec(q)} — والفاصلة في الناتج فوق موضعها في المقسوم.`);
}

// ٩-٣ القسمة على كسر عشري
function m_decDivDec() {
  const b = pick([0.2, 0.4, 0.5, 0.8, 0.25]);
  const q = rand(2, 12);
  const a = round2(b * q);
  return qz("math6", `أوجدي ناتج: ${arDec(a)} ÷ ${arDec(b)}`, q,
    [Math.round(q / 10) || 1, Math.round(a), Math.round(q * 10)],
    `نضرب المقسوم والمقسوم عليه في ${toAr(Math.round(1 / b) >= 10 ? 100 : 10)} ليصير المقسوم عليه عدداً صحيحاً، فيبقى الناتج ${toAr(q)}. القسمة على عددٍ أصغر من واحد تُكبِّر الناتج.`);
}

// ===== الفصل ٤: الكسور الاعتيادية والكسور العشرية =====

// ١-٤ القاسم المشترك الأكبر
function m_gcf() {
  const g = rand(2, 12), a = g * rand(2, 9), b = g * rand(2, 9);
  const real = gcd2(a, b);
  return qz("math6", `أوجدي القاسم المشترك الأكبر للعددين ${toAr(a)} و${toAr(b)}.`, real,
    [lcm2(a, b), Math.min(a, b), real * 2],
    `قواسم ${toAr(a)} و${toAr(b)} المشتركة أكبرها ${toAr(real)}. والقاسم لا يتجاوز أصغر العددين.`);
}

// ٢-٤ تبسيط الكسور الاعتيادية
function m_simplify() {
  const g = rand(2, 9), n = rand(1, 8), d = n + rand(1, 8);
  const N = n * g, D = d * g, k = gcd2(N, D);
  const rn = N / k, rd = D / k, right = arFrac(rn, rd);
  // مموّهات بآلياتٍ مسمّاة: بلا تبسيط، وتبسيطٌ ناقص (قُسم على جزءٍ من ق.م.أ)، ومقلوب
  const half = k > 1 ? primesOf(k)[0] : 1;
  const cands = [arFrac(N, D), arFrac(rd, rn), arFrac(N / half, D / half),
    arFrac(rn + 1, rd), arFrac(rn, rd + 1)]
    .filter(function (x) { return x !== right; });
  return qzT("math6", `بسّطي الكسر ${arFrac(N, D)} إلى أبسط صورة.`, right, cands,
    `القاسم المشترك الأكبر لـ${toAr(N)} و${toAr(D)} هو ${toAr(k)}، فنقسم عليه البسط والمقام ⇒ ${right}.`);
}

// ٣-٤ الأعداد الكسرية والكسور غير الفعلية
function m_mixedImproper() {
  // البسط والمقام أوّليان فيما بينهما: الكتاب لا يقبل «٤ و٢/٦» جواباً نهائياً
  let w, d, n, guard = 0;
  do { w = rand(1, 6); d = rand(3, 9); n = rand(1, d - 1); }
  while (gcd2(n, d) !== 1 && guard++ < 60);
  const imp = w * d + n;
  if (pick([0, 1])) {
    const right = arFrac(imp, d);
    const cands = [arFrac(w * d, d), arFrac(w + n, d), arFrac(imp, d + w), arFrac(imp + d, d), arFrac(w * d - n, d)]
      .filter(function (x) { return x !== right; });
    return qzT("math6", `اكتبي العدد الكسري ${toAr(w)} و${arFrac(n, d)} في صورة كسرٍ غير فعلي.`, right, cands,
      `نضرب العدد الصحيح في المقام ونضيف البسط: (${toAr(w)} × ${toAr(d)}) + ${toAr(n)} = ${toAr(imp)} ⇒ ${right}.`);
  }
  const right = toAr(w) + " و" + arFrac(n, d);
  // كل مموّهٍ كسريّ يجب أن يكون هو نفسه في أبسط صورة، وإلا صار خطؤه في الاختزال
  // لا في التحويل — وهو ليس ما يقيسه الدرس.
  const cands = [toAr(w) + " و" + arFrac(d - n, d), toAr(w + 1) + " و" + arFrac(n, d),
    toAr(n) + " و" + arFrac(w, d), toAr(w - 1 > 0 ? w - 1 : w + 2) + " و" + arFrac(n, d)]
    .filter(function (x) {
      if (x === right) return false;
      // الجزء الكسري في المموّه نفسه لا بدّ أن يكون في أبسط صورة (٢/٦ تُدخِل خطأ
      // اختزالٍ في سؤالٍ يقيس التحويل)، وarFrac(w, d) كانت تُنتجها.
      const q = x.split("و")[1].trim().split("/").map(function (t) { return Number(t.replace(/[٠-٩]/g, function (c) { return String("٠١٢٣٤٥٦٧٨٩".indexOf(c)) })) });
      return gcd2(q[0], q[1]) === 1;
    });
  return qzT("math6", `اكتبي الكسر غير الفعلي ${arFrac(imp, d)} في صورة عددٍ كسري.`, right, cands,
    `${toAr(imp)} ÷ ${toAr(d)} = ${toAr(w)} والباقي ${toAr(n)} ⇒ ${right}.`);
}

// ٥-٤ المضاعف المشترك الأصغر
function m_lcm() {
  const a = rand(2, 12), b = rand(2, 12);
  const l = lcm2(a, b);
  return qz("math6", `أوجدي المضاعف المشترك الأصغر للعددين ${toAr(a)} و${toAr(b)}.`, l,
    [a * b, gcd2(a, b), Math.max(a, b)],
    `أصغر عددٍ يقبل القسمة على ${toAr(a)} و${toAr(b)} معاً هو ${toAr(l)}` +
    (a * b !== l ? ` — وحاصل ضربهما (${toAr(a * b)}) مضاعفٌ مشترك لكنه ليس الأصغر.` : `.`));
}

// ٦-٤ مقارنة الكسور الاعتيادية وترتيبها
function m_fracCompare() {
  // أربعة كسورٍ **متمايزة القيمة** — لولا التمايز لوقع صوابان في سؤالٍ واحد
  const byVal = new Map();
  while (byVal.size < 4) {
    const d = rand(2, 10), n = rand(1, d - 1);
    const key = String(round2(n / d * 1000));
    if (!byVal.has(key)) byVal.set(key, [n, d]);
  }
  const fr = Array.from(byVal.values());
  let big = fr[0];
  fr.forEach(function (f) { if (f[0] * big[1] > big[0] * f[1]) big = f; });
  const right = arFrac(big[0], big[1]);
  const show = shuffle(fr.map(function (f) { return arFrac(f[0], f[1]); }));
  const L = fr.reduce(function (a, f) { return lcm2(a, f[1]); }, 1);
  return qzT("math6", `أيّ الكسور الآتية أكبر؟ ${show.join(" ، ")}`, right,
    fr.filter(function (f) { return f !== big; }).map(function (f) { return arFrac(f[0], f[1]); }),
    `نوحّد المقامات على ${toAr(L)} فيصير الأكبر ${arFrac(big[0] * (L / big[1]), L)} ⇒ ${right}. المقام الأكبر لا يعني كسراً أكبر.`);
}

// ٧-٤ كتابة الكسور العشرية في صورة كسور اعتيادية
function m_decToFrac() {
  const x = pick([0.5, 0.25, 0.75, 0.2, 0.4, 0.6, 0.8, 0.125, 0.05, 0.35]);
  const dec = (String(x).split(".")[1] || "");
  const den = Math.pow(10, dec.length);
  const num = Math.round(x * den), k = gcd2(num, den);
  const rn = num / k, rd = den / k, right = arFrac(rn, rd);
  const cands = [arFrac(num, den), arFrac(rd, rn), arFrac(rn, den), arFrac(rn + 1, rd), arFrac(rn, rd + 1)]
    .filter(function (c) { return c !== right; });
  // arDecX لا arDec: ٠٫١٢٥ كانت تُعرض ٠٫١٣ في السؤال ثم يُطلب كسرها
  return qzT("math6", `اكتبي العدد ${arDecX(x)} في صورة كسرٍ اعتيادي في أبسط صورة.`, right, cands,
    `${arDecX(x)} = ${arFrac(num, den)}، ونقسم البسط والمقام على القاسم المشترك الأكبر ${toAr(k)} ⇒ ${right}.`);
}

// ٨-٤ كتابة الكسور الاعتيادية في صورة كسور عشرية
function m_fracToDec() {
  const p = pick([[1, 2], [1, 4], [3, 4], [1, 5], [2, 5], [3, 5], [4, 5], [1, 8], [3, 8], [5, 8], [7, 8], [1, 10], [7, 10]]);
  const n = p[0], d = p[1], v = n / d;
  const right = arDecX(v);
  // المموّه الأوّل آليةُ خطأٍ حقيقية: كتابة الرقمين متجاورين (٣/٨ ⇐ ٠٫٣٨)
  const sideBySide = Number("0." + n + d);
  const cands = [arDecX(sideBySide), arDecX(round2(v * 10)), arDecX(v / 10), arDecX(Number((n / 10).toFixed(3)))]
    .filter(function (c) { return c !== right; });
  return qzT("math6", `اكتبي الكسر ${arFrac(n, d)} في صورة كسرٍ عشري.`, right, cands,
    `الكسر خطُّ قسمة: ${toAr(n)} ÷ ${toAr(d)} = ${right}.`);
}

// ===== الفصل ٥: القياس — الطول والكتلة والسعة =====

const M_UNITS = [
  { big: "متر", small: "سنتمتر", k: 100 },
  { big: "متر", small: "مليمتر", k: 1000 },
  { big: "كيلومتر", small: "متر", k: 1000 },
  { big: "كيلوغرام", small: "غرام", k: 1000 },
  { big: "غرام", small: "مليغرام", k: 1000 },
  { big: "لتر", small: "مليلتر", k: 1000 },
];
function m_metric() {
  const u = pick(M_UNITS), n = rand(2, 40);
  if (pick([0, 1])) {
    const val = n * u.k;
    return qz("math6", `حوّلي: ${toAr(n)} ${u.big} = كم ${u.small}؟`, val,
      [n * (u.k / 10), n + u.k, val * 10, n * (u.k * 10)],
      `الوحدة الأكبر ⇐ الأصغر: نضرب في ${toAr(u.k)}. ${toAr(n)} × ${toAr(u.k)} = ${toAr(val)} ${u.small}.`);
  }
  const big = n * u.k;
  return qz("math6", `حوّلي: ${toAr(big)} ${u.small} = كم ${u.big}؟`, n,
    [big / (u.k / 10), n * 10, big - u.k, n + u.k],
    `الوحدة الأصغر ⇐ الأكبر: نقسم على ${toAr(u.k)}. ${toAr(big)} ÷ ${toAr(u.k)} = ${toAr(n)} ${u.big}.`);
}

// ٣-٥ مهارة حل المسألة: استعمال مقياسٍ مرجعي — الوحدة المعقولة لا الحساب
const M_BENCH = [
  { thing: "طول قلم الرصاص", right: "سنتمتر", wrong: ["كيلومتر", "متر", "مليمتر"] },
  { thing: "المسافة بين مدينتين", right: "كيلومتر", wrong: ["سنتمتر", "متر", "مليمتر"] },
  { thing: "كتلة تفاحة", right: "غرام", wrong: ["كيلوغرام", "مليغرام", "طن"] },
  { thing: "كتلة طالبة في السادس", right: "كيلوغرام", wrong: ["غرام", "مليغرام", "طن"] },
  { thing: "سعة ملعقة دواء", right: "مليلتر", wrong: ["لتر", "كيلوغرام", "متر"] },
  { thing: "سعة قارورة ماء كبيرة", right: "لتر", wrong: ["مليلتر", "غرام", "سنتمتر"] },
  { thing: "طول الفصل الدراسي", right: "متر", wrong: ["كيلومتر", "مليمتر", "غرام"] },
  { thing: "سُمك ورقة", right: "مليمتر", wrong: ["متر", "كيلومتر", "لتر"] },
];
function m_benchmark() {
  const b = pick(M_BENCH);
  return qzT("math6", `ما الوحدة المناسبة لقياس ${b.thing}؟`, b.right, b.wrong,
    `الوحدة المناسبة هنا: ${b.right} — نختار الوحدة التي يكون العدد بها معقولاً، لا كبيراً جداً ولا صغيراً جداً.`);
}

// ===== الفهرس: خمسة فصول كما في الكتاب، بأرقام دروسه وصفحاته =====
// gen=null يعني درساً ينتظر الملفّ الكامل — إمّا لأنه استراتيجية حلٍّ تُشرح بمثالٍ
// محلول (لا سؤالٌ يُحسب)، أو لأنه يحتاج تمثيلاً بيانياً. ولا يُعرض ما لا مولّد له.
const MATH6_PLAN = [
  { ch: 1, name: "الجبر: الأنماط العددية والدوال", p: 11, lessons: [
    { id: "m1_1", no: "١-١", t: "الخطوات الأربع لحل المسألة", p: 12, sk: "خطة حل المسألة", gen: m_fourSteps },
    { id: "m1_2", no: "٢-١", t: "العوامل الأولية", p: 17, sk: "العوامل الأولية", gen: m_primeFactors },
    { id: "m1_3", no: "٣-١", t: "القوى والأسس", p: 22, sk: "القوى والأسس", gen: m_powers },
    { id: "m1_4", no: "٤-١", t: "ترتيب العمليات", p: 27, sk: "ترتيب العمليات", gen: m_order },
    { id: "m1_5", no: "٥-١", t: "الجبر: المتغيرات والعبارات", p: 33, sk: "المتغيرات والعبارات", gen: m_varExpr },
    { id: "m1_6", no: "٦-١", t: "الجبر: الدوال", p: 38, sk: "الدوال", gen: m_function },
    { id: "m1_7", no: "٧-١", t: "خطة حل المسألة: التخمين والتحقق", p: 43, sk: "خطة حل المسألة", gen: null },
    { id: "m1_8", no: "٨-١", t: "الجبر: المعادلات", p: 45, sk: "المعادلات", gen: m_equation },
  ] },
  { ch: 2, name: "الإحصاء والتمثيلات البيانية", p: 53, lessons: [
    { id: "m2_1", no: "١-٢", t: "خطة حل المسألة: إنشاء جدول", p: 54, sk: "خطة حل المسألة", gen: null },
    { id: "m2_2", no: "٢-٢", t: "التمثيل بالأعمدة وبالخطوط", p: 56, sk: "التمثيل البياني", gen: null },
    { id: "m2_3", no: "٣-٢", t: "التمثيل بالنقاط", p: 63, sk: "التمثيل البياني", gen: null },
    { id: "m2_4", no: "٤-٢", t: "المتوسط الحسابي", p: 70, sk: "المتوسط الحسابي", gen: m_mean },
    { id: "m2_5", no: "٥-٢", t: "الوسيط والمنوال والمدى", p: 75, sk: "الوسيط والمنوال والمدى", gen: m_medianModeRange },
  ] },
  { ch: 3, name: "العمليات على الكسور العشرية", p: 85, lessons: [
    { id: "m3_1", no: "١-٣", t: "تمثيل الكسور العشرية", p: 86, sk: "تمثيل الكسور العشرية", gen: null },
    { id: "m3_2", no: "٢-٣", t: "مقارنة الكسور العشرية وترتيبها", p: 90, sk: "مقارنة الكسور العشرية", gen: m_decCompare },
    { id: "m3_3", no: "٣-٣", t: "تقريب الكسور العشرية", p: 94, sk: "تقريب الكسور العشرية", gen: m_round },
    { id: "m3_4", no: "٤-٣", t: "تقدير ناتج جمع الكسور العشرية وطرحها", p: 98, sk: "التقدير", gen: m_estimate },
    { id: "m3_5", no: "٥-٣", t: "جمع الكسور العشرية وطرحها", p: 104, sk: "جمع الكسور العشرية وطرحها", gen: m_decAddSub },
    { id: "m3_6", no: "٦-٣", t: "ضرب الكسور العشرية في أعداد كلية", p: 111, sk: "ضرب الكسور العشرية", gen: m_decMulWhole },
    { id: "m3_7", no: "٧-٣", t: "ضرب الكسور العشرية", p: 117, sk: "ضرب الكسور العشرية", gen: m_decMul },
    { id: "m3_8", no: "٨-٣", t: "قسمة الكسور العشرية على أعداد كلية", p: 121, sk: "قسمة الكسور العشرية", gen: m_decDivWhole },
    { id: "m3_9", no: "٩-٣", t: "القسمة على كسر عشري", p: 127, sk: "قسمة الكسور العشرية", gen: m_decDivDec },
    { id: "m3_10", no: "١٠-٣", t: "خطة حل المسألة: التحقق من معقولية الإجابة", p: 133, sk: "خطة حل المسألة", gen: null },
  ] },
  { ch: 4, name: "الكسور الاعتيادية والكسور العشرية", p: 139, lessons: [
    { id: "m4_1", no: "١-٤", t: "القاسم المشترك الأكبر", p: 140, sk: "القاسم المشترك الأكبر", gen: m_gcf },
    { id: "m4_2", no: "٢-٤", t: "تبسيط الكسور الاعتيادية", p: 147, sk: "تبسيط الكسور", gen: m_simplify },
    { id: "m4_3", no: "٣-٤", t: "الأعداد الكسرية والكسور غير الفعلية", p: 152, sk: "الأعداد الكسرية", gen: m_mixedImproper },
    { id: "m4_4", no: "٤-٤", t: "خطة حل المسألة: إنشاء قائمة منظمة", p: 156, sk: "خطة حل المسألة", gen: null },
    { id: "m4_5", no: "٥-٤", t: "المضاعف المشترك الأصغر", p: 159, sk: "المضاعف المشترك الأصغر", gen: m_lcm },
    { id: "m4_6", no: "٦-٤", t: "مقارنة الكسور الاعتيادية وترتيبها", p: 163, sk: "مقارنة الكسور", gen: m_fracCompare },
    { id: "m4_7", no: "٧-٤", t: "كتابة الكسور العشرية في صورة كسور اعتيادية", p: 168, sk: "التحويل بين الكسور", gen: m_decToFrac },
    { id: "m4_8", no: "٨-٤", t: "كتابة الكسور الاعتيادية في صورة كسور عشرية", p: 172, sk: "التحويل بين الكسور", gen: m_fracToDec },
  ] },
  { ch: 5, name: "القياس: الطول والكتلة والسعة", p: 181, lessons: [
    { id: "m5_1", no: "١-٥", t: "الطول في النظام المتري", p: 184, sk: "النظام المتري", gen: m_metric },
    { id: "m5_2", no: "٢-٥", t: "الكتلة والسعة في النظام المتري", p: 189, sk: "النظام المتري", gen: m_metric },
    { id: "m5_3", no: "٣-٥", t: "مهارة حل المسألة: استعمال مقياس مرجعي", p: 196, sk: "المقياس المرجعي", gen: m_benchmark },
    { id: "m5_4", no: "٤-٥", t: "التحويل بين الوحدات في النظام المتري", p: 198, sk: "النظام المتري", gen: m_metric },
  ] },
];
function math6Lessons() {
  const out = [];
  MATH6_PLAN.forEach(function (c) { c.lessons.forEach(function (l) { out.push(Object.assign({ ch: c.ch, chName: c.name }, l)); }); });
  return out;
}
function math6Ready() { return math6Lessons().filter(function (l) { return !!l.gen; }); }

// ===== التهيئة (ص ١١) والدرس ١-١ (ص ١٢-١٦) — من صفحات الكتاب نفسها =====

// ---- التهيئة: «مهارة سابقة» — أربع عمليات بالمدى نفسه الذي في الكتاب ----
// وهذه أقرب نقطةٍ في المنهج إلى ما هو مبنيٌّ أصلاً: مكتبة الأخطاء `MATH_BUGS`
// و`bugOf` تُسمّي آلية الخطأ في الجمع والطرح والقسمة، فمموّهات التهيئة تُبنى على
// الآليات نفسها لا على أرقامٍ عشوائية — فيُقرأ اختيارها الخاطئ تشخيصاً جاهزاً.
// «أسقطت آحاد المطروح منه» و«استلفت ولم تُنقص العشرات» موثّقتان في بياناتها هي.
function bugSmallerFromLarger(a, b) {
  const A = String(a).split("").reverse(), B = String(b).split("").reverse();
  let out = "";
  for (let i = 0; i < A.length; i++) out = String(Math.abs((+A[i]) - (+(B[i] || 0)))) + out;
  const v = parseInt(out, 10);
  return Number.isFinite(v) ? v : a - b + 9;
}
function m_prepAdd() {
  const a = pick([rand(60, 99), rand(101, 399)]), b = rand(56, 99);
  const s = a + b;
  return qz("math6", `أوجدي ناتج الجمع: ${toAr(a)} + ${toAr(b)}`, s,
    [s - 10, s + 10, s - 1, a + b - 100],
    `نرتّب الأرقام بحسب المنازل: نجمع الآحاد ثم العشرات (وما فوق العشرة يُحمل) ⇒ ${toAr(s)}.`);
}
function m_prepSub() {
  // استلافٌ مضمون: آحاد المطروح أكبر من آحاد المطروح منه
  let a, b, guard = 0;
  do { a = rand(102, 899); b = rand(27, 99); } while (a % 10 >= b % 10 && guard++ < 60);
  const d = a - b, sfl = bugSmallerFromLarger(a, b);
  return qz("math6", `أوجدي ناتج الطرح: ${toAr(a)} − ${toAr(b)}`, d,
    [sfl !== d ? sfl : d + 10, d + 10, d + 1, d - 1],
    `آحاد ${toAr(b)} أكبر، فنستلف عشرةً **ونُنقص منزلة العشرات** ثم نطرح ⇒ ${toAr(d)}.`);
}
function m_prepMul() {
  const a = rand(12, 50), b = rand(12, 47);
  const p = a * b;
  return qz("math6", `أوجدي ناتج الضرب: ${toAr(a)} × ${toAr(b)}`, p,
    [a * (b % 10), a * Math.floor(b / 10) * 10, p + a, p - a],
    `نضرب في الآحاد (${toAr(a)} × ${toAr(b % 10)} = ${toAr(a * (b % 10))}) ثم في العشرات ` +
    `(${toAr(a)} × ${toAr(Math.floor(b / 10) * 10)} = ${toAr(a * Math.floor(b / 10) * 10)}) ثم نجمع ⇒ ${toAr(p)}.`);
}
function m_prepDiv() {
  const q = rand(12, 84), b = rand(2, 9);
  const a = q * b;
  return qz("math6", `أوجدي ناتج القسمة: ${toAr(a)} ÷ ${toAr(b)}`, q,
    [q + 1, q - 1, q * 10, a - b],
    `نقسم بالترتيب من اليسار إلى اليمين: ${toAr(a)} ÷ ${toAr(b)} = ${toAr(q)} بلا باقٍ.`);
}

// ---- ١-١ الكلمات المفتاحية: الجدول في ص ١٢ حرفياً، لا اجتهاداً ----
const KEY_WORDS = {
  "الجمع": ["زائد", "مجموع", "أضف", "إجمالي", "مع"],
  "الطرح": ["ناقص", "الفرق", "يزيد على", "يقلّ عن", "اطرح من", "كم بقي"],
  "الضرب": ["عدد مرّات", "ناتج ضرب", "مضروباً في", "مضاعف"],
  "القسمة": ["مقسوم على", "توزيع إلى"],
};
function m_keyword() {
  const ops = Object.keys(KEY_WORDS);
  const op = pick(ops), w = pick(KEY_WORDS[op]);
  return qzT("math6", `أيّ عمليةٍ حسابية تدلّ عليها العبارة: «${w}»؟`, op,
    ops.filter(function (o) { return o !== op; }),
    `«${w}» من الكلمات المفتاحية الدالّة على ${op} — والكلمة المفتاحية تُرشد إلى العملية في خطوة «خطّط».`);
}

// ---- ١-١ الأنماط: العائلات الثلاث الواردة في الكتاب (ص ١٥-١٦) ----
function m_pattern() {
  const kind = pick(["add", "sub", "mulStep", "dec", "grow"]);
  let seq = [], next, why;
  if (kind === "add") {                      // ٥ ، ١١ ، ١٧ ، ٢٣ ، …
    const a = rand(3, 12), d = rand(4, 9);
    for (let i = 0; i < 4; i++) seq.push(a + i * d);
    next = a + 4 * d;
    why = `كل حدٍّ يزيد ${toAr(d)} عن سابقه ⇒ ${toAr(seq[3])} + ${toAr(d)} = ${toAr(next)}. ` +
      `**تحقّق بالعمل عكسياً**: ابدئي بـ${toAr(next)} واطرحي ${toAr(d)} مرّاتٍ حتى تصلي إلى ${toAr(seq[0])}.`;
  } else if (kind === "sub") {               // ٥٧ ، ٤٩ ، ٤١ ، ٣٣ ، …
    const d = rand(4, 9), a = d * 4 + rand(20, 40);
    for (let i = 0; i < 4; i++) seq.push(a - i * d);
    next = a - 4 * d;
    why = `كل حدٍّ يقلّ ${toAr(d)} عن سابقه ⇒ ${toAr(seq[3])} − ${toAr(d)} = ${toAr(next)}. ` +
      `**تحقّق بالعمل عكسياً**: ابدئي بـ${toAr(next)} وأضيفي ${toAr(d)} مرّاتٍ حتى تصلي إلى ${toAr(seq[0])}.`;
  } else if (kind === "grow") {
    // فرقٌ متزايد: ٢ ، ٤ ، ٧ ، ١١ ، ▢ — الفروق ٢ ثم ٣ ثم ٤ (تحقّق من فهمك، ص١٤)
    const a = rand(1, 6), d0 = rand(2, 5);
    seq = [a];
    for (let i = 0; i < 3; i++) seq.push(seq[i] + d0 + i);
    next = seq[3] + d0 + 3;
    why = `الفروق نفسها تكبر واحداً كل مرّة: ${toAr(d0)} ثم ${toAr(d0 + 1)} ثم ${toAr(d0 + 2)} ` +
      `⇒ الفرق التالي ${toAr(d0 + 3)}، و${toAr(seq[3])} + ${toAr(d0 + 3)} = ${toAr(next)}. ` +
      `**تحقّق بالعمل عكسياً**: ${toAr(next)} − ${toAr(d0 + 3)} = ${toAr(seq[3])}.`;
  } else if (kind === "mulStep") {           // ٣ ، ٣ ، ٦ ، ١٨ ، ٧٢ ، … (×١ ثم ×٢ ثم ×٣)
    const a = rand(2, 4);
    seq = [a, a];
    for (let i = 2; i <= 4; i++) seq.push(seq[i - 1] * i);
    next = seq[4] * 5;
    why = `المضروب فيه يكبر كل مرّة: ×٢ ثم ×٣ ثم ×٤ ⇒ ${toAr(seq[4])} × ٥ = ${toAr(next)}. ` +
      `**تحقّق بالعمل عكسياً**: ${toAr(next)} ÷ ٥ = ${toAr(seq[4])}.`;
  } else {                                   // ٣٫٢٥ ، ٤٫٠٠ ، ٤٫٧٥ ، ٥٫٥٠ ، … (مثال المواليد ص١٤)
    const a = round2(rand(200, 400) / 100), d = pick([0.25, 0.5, 0.75]);
    for (let i = 0; i < 4; i++) seq.push(round2(a + i * d));
    next = round2(a + 4 * d);
    return qzT("math6", `أكملي النمط: ${seq.map(arDec).join(" ، ")} ، ▢`, arDec(next),
      decCands([next + d, next - d, next + 1, round2(next + 0.1)]),
      `كل حدٍّ يزيد ${arDec(d)} عن سابقه ⇒ ${arDec(seq[3])} + ${arDec(d)} = ${arDec(next)}. ` +
      `**تحقّق بالعمل عكسياً**: ابدئي بـ${arDec(next)} واطرحي ${arDec(d)} حتى تصلي إلى ${arDec(seq[0])}.`);
  }
  return qz("math6", `أكملي النمط: ${seq.map(toAr).join(" ، ")} ، ▢`, next,
    [next + 1, next - 1, seq[3] + seq[2], next * 2], why);
}

// ---- ١-١ نمطٌ في جدولٍ، ويُطلب حدٌّ أبعد من التالي مباشرة (مسبح، ص١٤) ----
const TAB_PAT = [
  { head: "الزمن (بالدقائق)", row: "كمية الماء (باللترات)", step: 5, unit: "دقيقة",
    lead: "الجدول يوضّح كمية الماء التي تملأ المسبح بعد أوقاتٍ مختلفة", ask: "فأوجدي كمية الماء بعد" },
  { head: "الزمن (بالدقائق)", row: "المسافة (بالأمتار)", step: 10, unit: "دقيقة",
    lead: "الجدول يوضّح المسافة التي يقطعها متسابقٌ بعد أوقاتٍ مختلفة", ask: "فأوجدي المسافة بعد" },
  { head: "عدد العلب", row: "عدد الأقلام", step: 1, unit: "علبة",
    lead: "الجدول يوضّح عدد الأقلام في عددٍ من العلب", ask: "فأوجدي عدد الأقلام في" },
];
function m_patternTable() {
  const c = pick(TAB_PAT);
  const per = c.step === 1 ? rand(6, 14) : rand(2, 9) * (c.step === 5 ? 60 : 30);
  const shown = 4, ahead = rand(2, 3);
  const cells = [];
  for (let i = 1; i <= shown; i++) cells.push(`${toAr(i * c.step)}: ${toAr(i * per)}`);
  const at = (shown + ahead) * c.step, val = (shown + ahead) * per;
  return qz("math6",
    `${c.lead} — ${cells.join(" · ")}. فإذا استمرّ هذا النمط، ${c.ask} ${arCount(at, c.unit === "دقيقة" ? "دقائق" : "علب", c.unit === "دقيقة" ? "دقيقة" : "علبة")}.`,
    val, [val + per, val - per, (shown + 1) * per, per * at],
    `كل ${c.step === 1 ? c.unit : arCount(c.step, c.unit === "دقيقة" ? "دقائق" : "علب", c.unit === "دقيقة" ? "دقيقة" : "علبة")} تزيد ${toAr(per)} ` +
    `⇒ عدد الخطوات ${toAr(at)} ÷ ${toAr(c.step)} = ${toAr(shown + ahead)}، والمقدار ${toAr(shown + ahead)} × ${toAr(per)} = ${toAr(val)}. ` +
    `**تحقّق بالعمل عكسياً**: ${toAr(val)} − ${toAr(per)} × ${toAr(ahead)} = ${toAr(shown * per)}، وهو آخر ما في الجدول.`);
}

// ---- ١-١ الخطوات الأربع: مسألةُ فرقٍ بجدولٍ فيه معلوماتٌ زائدة (مثال ١ ومسألة ٤) ----
// أسماءٌ مفصولةٌ بالجنس: «سميرة يمشي» خطأٌ لا يكشفه فاحصٌ حسابيّ ويكشفه أوّل قارئ.
const NAMES_M = ["ناصر", "سلطان", "سعيد", "فهد", "خالد", "سليمان", "نواف", "بلال", "وليد"];
const NAMES_F = ["سميرة", "منيرة", "لطيفة", "نورة", "ريم", "أمل"];
// تمييز العدد بالعربية: ٣-١٠ جمعٌ مجرور («٩ أيام»)، وما فوقها مفردٌ منصوب («١٣ يوماً»).
function arCount(n, few, many) {
  const t = n % 100;
  return toAr(n) + " " + (t >= 3 && t <= 10 ? few : many);
}
const TABLE_CTX = [
  { t: "عدد الرميات الناجحة", g: "رميات" },
  { t: "عدد الخطوات اليومية", g: "خطوات" },
  { t: "عدد الصفحات المقروءة", g: "صفحات" },
  { t: "عدد النقاط المُحرَزة", g: "نقاط" },
];
function m_fourStepsDiff() {
  const ctx = pick(TABLE_CTX);
  const who = shuffle(NAMES_M.concat(NAMES_F)).slice(0, 5);
  const vals = [];
  while (vals.length < 5) { const v = rand(18, 95); if (vals.indexOf(v) < 0) vals.push(v); }
  vals.sort(function (x, y) { return y - x; });
  const i = rand(0, 1), j = rand(3, 4);
  const hi = vals[i], lo = vals[j], d = hi - lo;
  const est = Math.round(hi / 10) * 10 - Math.round(lo / 10) * 10;
  const rows = who.map(function (n, k) { return `${n}: ${toAr(vals[k])}`; }).join(" · ");
  // الكتاب يسأل بالصيغتين: «بكم تزيد… على» (مثال كرة السلة) و«بكم تقلّ… عن» (الدببة).
  // والجواب في الحالتين الفرقُ نفسه — والفخّ أن تُطرح بالترتيب المعروض في السؤال.
  const less = pick([true, false]);
  const ask = less
    ? `بكم تقلّ ${ctx.g} ${who[j]} عن ${who[i]}؟`
    : `بكم تزيد ${ctx.g} ${who[i]} على ${who[j]}؟`;
  return qz("math6",
    `${ctx.t} لخمسة أصدقاء — ${rows}. ${ask}`,
    d, [hi + lo, bugSmallerFromLarger(hi, lo), d + 10, d - 1],
    `**افهم**: في الجدول معلوماتٌ زائدة، والمطلوب الفرق بين ${who[i]} و${who[j]} وحدهما. ` +
    `**خطّط**: «${less ? "بكم تقلّ … عن" : "بكم تزيد … على"}» تدلّ على الطرح، والتقدير ${toAr(Math.round(hi / 10) * 10)} − ${toAr(Math.round(lo / 10) * 10)} = ${toAr(est)}. ` +
    `**حل**: ${toAr(hi)} − ${toAr(lo)} = ${toAr(d)}. ` +
    `**تحقّق**: ${toAr(d)} + ${toAr(lo)} = ${toAr(hi)}، والناتج قريبٌ من التقدير ⇒ معقول.`);
}

// ---- ١-١ الخطوات الأربع: مسألةُ معدَّلٍ (نقود ص١٥ · مشي ص١٥ · سباحة ص١٦) ----
// كل سياقٍ يحمل صيغته كاملةً بفعلٍ مُذكَّرٍ ومؤنَّث، ومداه الخاصّ به: قالبٌ واحدٌ
// للجميع أنتج «ناصر قسطاً شهرياً قدره…» بلا فعل، و«١٧٣٤ صفحةً يومياً».
const RATE_CTX = [
  { lo: 450, hi: 990, yr: true, u: "ريالاً",
    // الصيغة من مسألة ٧ في الكتاب (ص١٥) بلفظها، مع مطابقة الفعلين للجنس
    tpl: function (w, m, r, lab) { return `${m ? "اشترى" : "اشترت"} ${w} سيارةً جديدةً، على أن ${m ? "يدفع" : "تدفع"} ثمنها على أقساطٍ شهرية مدّة ${lab}. فإذا كان القسط الشهري ${toAr(r)} ريالاً، فأوجدي ثمن السيارة.`; } },
  { lo: 900, hi: 1900, yr: false, u: "خطوة",
    tpl: function (w, m, r, lab) { return `${m ? "يمشي" : "تمشي"} ${w} ${toAr(r)} خطوةً يومياً، فكم خطوةً ${m ? "يمشي" : "تمشي"} في ${lab}؟`; } },
  { lo: 6, hi: 35, yr: false, u: "صفحة",
    tpl: function (w, m, r, lab) { return `${m ? "يقرأ" : "تقرأ"} ${w} ${toAr(r)} صفحةً يومياً، فكم صفحةً ${m ? "يقرأ" : "تقرأ"} في ${lab}؟`; } },
  { lo: 5, hi: 25, yr: false, u: "كلمة",
    tpl: function (w, m, r, lab) { return `${m ? "يحفظ" : "تحفظ"} ${w} ${toAr(r)} كلمةً يومياً، فكم كلمةً ${m ? "يحفظ" : "تحفظ"} في ${lab}؟`; } },
];
function m_fourStepsRate() {
  const c = pick(RATE_CTX);
  const male = pick([true, false]);
  const who = male ? pick(NAMES_M) : pick(NAMES_F);
  let per, label;
  if (c.yr) { const y = rand(3, 5); per = y * 12; label = toAr(y) + " سنوات"; }
  else { per = rand(5, 20); label = arCount(per, "أيام", "يوماً"); }
  const rate = rand(c.lo, c.hi);
  const total = rate * per;
  const unit = rate >= 100 ? 100 : 10;
  const est = Math.round(rate / unit) * unit * per;
  return qz("math6", c.tpl(who, male, rate, label),
    total, [rate + per, total - rate, rate * Math.floor(per / 2), total + rate],
    `**افهم**: المعطى ${toAr(rate)} ${c.u} لكل وحدة، والمدّة ${label}` +
    (c.yr ? ` أي ${toAr(per)} شهراً` : ``) + `. ` +
    `**خطّط**: «لكل» تدلّ على الضرب، والتقدير ${toAr(Math.round(rate / unit) * unit)} × ${toAr(per)} = ${toAr(est)}. ` +
    `**حل**: ${toAr(rate)} × ${toAr(per)} = ${toAr(total)}. ` +
    `**تحقّق**: الناتج قريبٌ من التقدير ${toAr(est)} ⇒ معقول.`);
}

// ---- التهيئة كوحدةٍ مستقلّة: مهاراتٌ سابقة لا درسٌ في الفهرس ----
const MATH6_PREP = {
  1: { p: 11, name: "التهيئة — مهارات سابقة", gens: [m_prepAdd, m_prepSub, m_prepMul, m_prepDiv] },
};

// الدرس ١-١ يخلط أنواعه الأربعة كما يخلطها الكتاب نفسه: كلمةٌ مفتاحية، ونمط،
// ومسألةُ فرقٍ بجدولٍ فيه زائد، ومسألةُ معدَّل — لا نوعٌ واحد يُعاد.
function m_fourSteps() {
  return pick([m_keyword, m_pattern, m_patternTable, m_patternTime, m_patternThree,
    m_fourStepsDiff, m_diffBig, m_fourStepsRate, m_rateTwoStep])();
}

// ===== ما أضافته ص ١٥-١٦ من الدرس ١-١ =====

// ---- نمطُ مواعيد بالوقت (مسألة «الصحة» ص١٥): ٧:٤٠ ، ٨:١٠ ، ٨:٤٠ … خطوةً ٣٠ دقيقة ----
// الفرق عن النمط العددي حقيقيّ لا شكليّ: الدقائق تدور عند الستّين لا عند العشرة.
function arTime(h, m) { return toAr(h) + ":" + toAr(String(m).padStart(2, "0")); }
function m_patternTime() {
  const step = pick([15, 20, 30, 45]);
  let h = rand(7, 9), m = pick([0, 10, 15, 20, 30, 40, 45]);
  const shown = [];
  for (let i = 0; i < 4; i++) {
    shown.push(arTime(h, m));
    m += step; h += Math.floor(m / 60); m = m % 60;
  }
  const right = arTime(h, m);
  const cands = [arTime(h, (m + 10) % 60), arTime(h + 1, m), arTime(h, (m + step) % 60),
    arTime(h, (m + 100) % 60)].filter(function (x) { return x !== right; });
  return qzT("math6",
    `كانت مواعيد أوّل أربعة مراجعين لطبيب الأسنان هي: ${shown.join(" ، ")}. فإذا استمرّ هذا النمط، فما موعد المراجع التالي؟`,
    right, cands,
    `بين كل موعدٍ والذي يليه ${arCount(step, "دقائق", "دقيقة")} ⇒ ${shown[3]} + ${toAr(step)} = ${right}. ` +
    `والدقائق تدور عند الستّين لا عند المئة.`);
}

// ---- معدَّلٌ بخطوتين: قسمةٌ ثم ضرب (تدريب على اختبار، ص١٦) ----
// «٨ أشواط في ٤ دقائق ⇒ كم لِـ٤٠ شوطاً؟» — ضربٌ وحده لا يكفي، ولذلك هي مسألة اختبار.
const TWOSTEP_CTX = [
  { v: "يسبح", vf: "تسبح", unit: "شوطاً", units: "أشواط", per: "دقائق", per1: "دقيقة", ask: "فكم دقيقةً يحتاج", askF: "فكم دقيقةً تحتاج" },
  { v: "يطبع", vf: "تطبع", unit: "سطراً", units: "أسطر", per: "دقائق", per1: "دقيقة", ask: "فكم دقيقةً يحتاج", askF: "فكم دقيقةً تحتاج" },
  { v: "يحلّ", vf: "تحلّ", unit: "تمريناً", units: "تمارين", per: "دقائق", per1: "دقيقة", ask: "فكم دقيقةً يحتاج", askF: "فكم دقيقةً تحتاج" },
];
function m_rateTwoStep() {
  const c = pick(TWOSTEP_CTX);
  const male = pick([true, false]);
  const who = male ? pick(NAMES_M) : pick(NAMES_F);
  const a = pick([4, 5, 6, 8, 10]);        // المُنجَز
  const b = pick([3, 4, 5, 6]);            // في كم دقيقة (والاثنان مستبعدان: المثنّى صيغةٌ ثالثة)
  const k = rand(3, 9);                    // عدد المجموعات
  const target = a * k, ans = b * k;
  return qz("math6",
    `${male ? "يستطيع" : "تستطيع"} ${who} أن ${male ? c.v : c.vf} ${arCount(a, c.units, c.unit)} في ${arCount(b, c.per, c.per1)}. ` +
    `فإذا ${male ? "استمرّ" : "استمرّت"} بهذا المعدّل، ${male ? c.ask : c.askF} لـ${toAr(target)} ${c.unit}؟`,
    ans, [target * b, target - a, ans + b, Math.round(target / b)],
    `**افهم**: المعدّل ${arCount(a, c.units, c.unit)} لكل ${arCount(b, c.per, c.per1)}. ` +
    `**خطّط**: خطوتان لا خطوة — كم مجموعةً في ${toAr(target)}؟ ثم اضربي في الزمن. ` +
    `**حل**: ${toAr(target)} ÷ ${toAr(a)} = ${toAr(k)} مجموعات، و${toAr(k)} × ${toAr(b)} = ${toAr(ans)}. ` +
    `**تحقّق**: ${toAr(ans)} ÷ ${toAr(b)} = ${toAr(k)}، و${toAr(k)} × ${toAr(a)} = ${toAr(target)} ⇒ معقول.`);
}

// ---- «أوجدي الأعداد الثلاثة التالية» (مسألة ١٢، ص١٦) — الجواب ثلاثةُ حدود لا حدّ ----
function m_patternThree() {
  const up = pick([true, false]);
  const d = rand(4, 9);
  const start = up ? rand(3, 15) : d * 7 + rand(10, 30);
  const seq = [], nxt = [];
  for (let i = 0; i < 4; i++) seq.push(up ? start + i * d : start - i * d);
  for (let i = 4; i < 7; i++) nxt.push(up ? start + i * d : start - i * d);
  const fmt = function (a) { return a.map(toAr).join(" ، "); };
  const right = fmt(nxt);
  const cands = [
    fmt(nxt.map(function (x) { return x + 1; })),
    fmt([nxt[0], nxt[1] + 1, nxt[2] + 2]),
    fmt(nxt.map(function (x, i) { return up ? x + d : x - d; })),
    fmt(nxt.slice().reverse()),
  ].filter(function (x) { return x !== right; });
  return qzT("math6", `أوجدي الأعداد الثلاثة التالية في النمط: ${fmt(seq)} ، …`, right, cands,
    `كل حدٍّ ${up ? "يزيد" : "يقلّ"} ${toAr(d)} عن سابقه ⇒ ${fmt(nxt)}. ` +
    `**تحقّق بالعمل عكسياً**: ${toAr(nxt[2])} ${up ? "−" : "+"} ${toAr(d)} ${up ? "−" : "+"} ${toAr(d)} ${up ? "−" : "+"} ${toAr(d)} = ${toAr(seq[3])}.`);
}

// ---- فرقُ أعدادٍ كبيرة (مسألة «أنهار» ص١٥ · وتمثيلات بيانية بالملايين) ----
const BIG_PAIRS = [
  { u: "زائراً", t: function (hi, lo) { return `بلغ عدد زوّار معرض الكتاب ${toAr(hi)} زائراً، وعدد زوّار معرض العلوم ${toAr(lo)} زائراً. فكم يزيد عدد زوّار معرض الكتاب على عدد زوّار معرض العلوم؟`; } },
  { u: "قطعة", t: function (hi, lo) { return `أنتج مصنع الشمال ${toAr(hi)} قطعة، وأنتج مصنع الجنوب ${toAr(lo)} قطعة. فكم تزيد قطع مصنع الشمال على قطع مصنع الجنوب؟`; } },
  { u: "كم", t: function (hi, lo) { return `قطعت سيارةٌ في الشهر الأوّل ${toAr(hi)} كم، وفي الشهر الثاني ${toAr(lo)} كم. فكم تزيد مسافة الشهر الأوّل على مسافة الشهر الثاني؟`; } },
  { u: "مشاهداً", t: function (hi, lo) { return `بلغ عدد المشاهدين في المباراة الأولى ${toAr(hi)} مشاهداً، وفي المباراة الثانية ${toAr(lo)} مشاهداً. فكم يزيد عدد مشاهدي المباراة الأولى على عدد مشاهدي الثانية؟`; } },
];
function m_diffBig() {
  const c = pick(BIG_PAIRS);
  const hi = rand(41, 79) * 100 + rand(0, 99);
  const lo = rand(15, 39) * 100 + rand(0, 99);
  const d = hi - lo;
  const est = Math.round(hi / 100) * 100 - Math.round(lo / 100) * 100;
  return qz("math6", c.t(hi, lo),
    d, [hi + lo, bugSmallerFromLarger(hi, lo), d + 100, d - 10],
    `**افهم**: المطلوب الفرق بين العددين. ` +
    `**خطّط**: «فكم يزيد … على» تدلّ على الطرح، والتقدير ${toAr(Math.round(hi / 100) * 100)} − ${toAr(Math.round(lo / 100) * 100)} = ${toAr(est)}. ` +
    `**حل**: ${toAr(hi)} − ${toAr(lo)} = ${toAr(d)} ${c.u}. ` +
    `**تحقّق**: ${toAr(d)} + ${toAr(lo)} = ${toAr(hi)}، والناتج قريبٌ من التقدير ⇒ معقول.`);
}
