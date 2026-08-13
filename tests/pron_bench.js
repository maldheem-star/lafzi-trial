// قياس دالّة تقييم النطق عندنا مقابل تقييم خبراء بشر — speechocean762.
//
// لماذا: كل ما بنيناه فوق النطق (الأصوات الضعيفة، وصفحة التصحيح، وتقارير «كيف كان
// نطقها») يقوم على أن أرقام assess-azure صادقة. ولم نتحقّق من ذلك قطّ. وspeechocean762
// مجموعة مفتوحة: ٥٠٠٠ جملة من ٢٥٠ متعلّماً غير ناطق، **كل واحدة قيّمها خمسة خبراء**
// بدرجة للجملة وللكلمة وللفونيم. فهي المسطرة.
//
// لا يعمل داخل بيئة التطوير المغلقة (لا وصول إلى الشبكة). يُشغَّل من جهاز متّصل:
//
//   1) نزّل المجموعة (مجاناً، بلا تسجيل):
//        https://www.openslr.org/101/     ⇒  test.tar.gz + resource/scores.json
//   2) صدّر مفتاح الاستدعاء (نفس المفتاح العامّ في التطبيق):
//        export SB_URL=https://<project>.supabase.co
//        export SB_KEY=<anon key>
//   3) node tests/pron_bench.js <مجلّد المجموعة> [عدد العيّنات]
//
// المخرجات: معامل ارتباط بيرسون وسبيرمان بين درجتنا ودرجة الخبراء، ومتوسّط الفرق،
// وأسوأ عشر حالات باسم الملفّ — لتُسمَع ويُحكَم عليها بالأذن لا بالرقم وحده.
//
// الحكم: ارتباط ≥ ٠٫٧ يعني أن الدرجة تصلح للتشخيص. ودونه يعني أن ما بنيناه فوقها
// يحتاج مراجعة — وأن نعرف ذلك خيرٌ من ألّا نعرفه.

const fs = require("fs");
const path = require("path");

const DIR = process.argv[2];
const N = parseInt(process.argv[3] || "60", 10);
const SB_URL = process.env.SB_URL || "";
const SB_KEY = process.env.SB_KEY || "";

if (!DIR || !SB_URL || !SB_KEY) {
  console.error("الاستعمال: SB_URL=… SB_KEY=… node tests/pron_bench.js <dir> [n]");
  process.exit(2);
}

// scores.json: { "<utt-id>": {"total":8,"accuracy":8,"fluency":9,"words":[…], "text":"…"} }
const scoresPath = fs.existsSync(path.join(DIR, "resource", "scores.json"))
  ? path.join(DIR, "resource", "scores.json") : path.join(DIR, "scores.json");
const scores = JSON.parse(fs.readFileSync(scoresPath, "utf8"));

function findWav(id) {
  for (const sub of ["WAVE", "wav", "test/wav", "."]) {
    const p = path.join(DIR, sub, id + ".WAV");
    if (fs.existsSync(p)) return p;
    const p2 = path.join(DIR, sub, id + ".wav");
    if (fs.existsSync(p2)) return p2;
  }
  return null;
}

async function ourScore(wavPath, text) {
  const audio = fs.readFileSync(wavPath).toString("base64");
  const res = await fetch(SB_URL.replace(/\/$/, "") + "/functions/v1/assess-azure", {
    method: "POST",
    headers: { "Authorization": "Bearer " + SB_KEY, "Content-Type": "application/json" },
    body: JSON.stringify({ audio, mimeType: "audio/wav", referenceText: text }),
  });
  const d = await res.json();
  if (!d || d.error || d.noAssessment) return null;
  // نقارن بدرجة الدقّة: هي ما يقابل accuracy عند الخبراء (لا الدرجة المركّبة)
  return typeof d.accuracy === "number" ? d.accuracy : (typeof d.pron === "number" ? d.pron : null);
}

const pearson = (a, b) => {
  const n = a.length, ma = a.reduce((x, y) => x + y, 0) / n, mb = b.reduce((x, y) => x + y, 0) / n;
  let num = 0, da = 0, db = 0;
  for (let i = 0; i < n; i++) { const x = a[i] - ma, y = b[i] - mb; num += x * y; da += x * x; db += y * y }
  return num / Math.sqrt(da * db);
};
const rank = (v) => {
  const idx = v.map((x, i) => [x, i]).sort((p, q) => p[0] - q[0]);
  const r = new Array(v.length);
  idx.forEach((p, i) => { r[p[1]] = i + 1 });
  return r;
};

(async () => {
  const ids = Object.keys(scores).slice(0, N * 3);
  const ours = [], theirs = [], rows = [];
  for (const id of ids) {
    if (ours.length >= N) break;
    const s = scores[id];
    const text = s.text || s.transcript || "";
    const wav = findWav(id);
    if (!wav || !text) continue;
    let mine = null;
    try { mine = await ourScore(wav, text) } catch (e) { }
    if (mine == null) { console.error("تعذّر التقييم: " + id); continue }
    const human = Number(s.accuracy != null ? s.accuracy : s.total) * 10; // ٠-١٠ ⇒ ٠-١٠٠
    ours.push(mine); theirs.push(human);
    rows.push({ id, mine, human, diff: Math.abs(mine - human) });
    process.stderr.write(".");
  }
  console.error("");
  if (ours.length < 10) { console.error("عيّنات قليلة جداً — لا حكم."); process.exit(1) }

  const r = pearson(ours, theirs);
  const rs = pearson(rank(ours), rank(theirs));
  const mae = rows.reduce((a, x) => a + x.diff, 0) / rows.length;
  console.log("عدد العيّنات: " + rows.length);
  console.log("ارتباط بيرسون:  " + r.toFixed(3));
  console.log("ارتباط سبيرمان: " + rs.toFixed(3));
  console.log("متوسّط الفرق المطلق: " + mae.toFixed(1) + " من ١٠٠");
  console.log("\nأسوأ عشر حالات (استمع إليها):");
  rows.sort((a, b) => b.diff - a.diff).slice(0, 10)
    .forEach((x) => console.log("  " + x.id + "  نحن " + Math.round(x.mine) + "  الخبراء " + Math.round(x.human)));
  console.log("\nالحكم: " + (rs >= 0.7 ? "الدرجة تصلح للتشخيص ✓"
    : rs >= 0.5 ? "ارتباط متوسّط — تصلح للاتجاه لا للرقم"
    : "ضعيف — ما بُني فوق هذه الدرجة يحتاج مراجعة"));
})();
