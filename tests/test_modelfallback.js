// نموذجٌ أزاله المزوّد يُبدَّل بالقاع بدل أن يُعدَّم القسم — ١٨ سبتمبر
//
// شكوى هيا «الاستدلال اللفظي والعلمي متكرّر» قِيست فصدّقتها: ١٧ و١٨ سبتمبر **١٠٠٪**
// مما عُرض عليها في القسمين رأته من قبل، **وصفرُ عنصرٍ جديد**، وعنصرٌ واحد خمسَ مرّات
// في يوم. والسبب في السجلّ بنصّه:
//   [توليد:http_502] {"groq":{"status":404,"detail":"404 :: ... The model
//    `qwen/qwen3.6-27b` does not exist or you do not have access to it."
// أي أن `GROQ_MODEL` يحمل نموذجاً أزالته Groq بين ١٤ و١٦ سبتمبر.
//
// **والحارس الذي كان يجب أن يمسكه كتبتُه أنا**: `DEAD_MODELS` يُعدِّد اسماً واحداً
// (llama-3.3-70b-versatile) وكُتب بجانبه أنه «يرفضه مهما قال السرّ» — فمرّ الثاني.
// وتعدادُ الأسماء يعلَّق على أن يتذكّر أحدٌ تحديث القائمة عند كل إزالةٍ عند المزوّد.
//
// فما يحرسه هذا الملفّ **سلوكُ الردّ لا قائمةُ الأسماء**: أن يُبدَّل عند ٤٠٤ الصريحة،
// وألّا يُبدَّل عند ٤٢٩ (سقفٌ يزول) أو ٤٠٤ غامضة، وألّا يدور بلا نهاية حين يكون القاع
// نفسه هو الغائب، وأن يُسجَّل التبديل — وإلّا قُرئ نجاحُ التوليد على أن السرّ سليم.
const fs = require('fs');
const path = require('path');
const os = require('os');
let fails = 0;
const ok = (c, m) => { console.log((c ? '  ✓ ' : '  ✗ FAIL ') + m); if (!c) fails++ };

const SRC = path.join(__dirname, '..', 'supabase-functions-generate-question.ts');
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'genq-'));

// سؤالٌ عربيٌّ نظيف يمرّ فلتر `isClean` كما يمرّه المولّد الحقيقي
const GOOD = JSON.stringify({
  questions: [
    { q: "ما ضدّ كلمة النجاح؟", choices: ["الفشل", "التفوّق", "العمل", "الجدّ"], why: "الضدّ هو الفشل.", answer: 0 },
    { q: "ما ضدّ كلمة الليل؟", choices: ["النهار", "المساء", "الفجر", "الغروب"], why: "الضدّ هو النهار.", answer: 0 },
    { q: "ما ضدّ كلمة الكبير؟", choices: ["الصغير", "الواسع", "الطويل", "العالي"], why: "الضدّ هو الصغير.", answer: 0 },
    { q: "ما ضدّ كلمة القريب؟", choices: ["البعيد", "الجار", "المجاور", "الملاصق"], why: "الضدّ هو البعيد.", answer: 0 },
  ]
});
const DEAD = '{"error":{"message":"The model `qwen/qwen3.6-27b` does not exist or you do not have access to it.","type":"invalid_request_error","code":"model_not_found"}}';
const RATE = '{"error":{"message":"Rate limit reached for model. Limit 1000, Used 900. Please try again in 14s.","code":"rate_limit_exceeded"}}';

let seq = 0;   // يُعاد ضبطه لكل سيناريو
async function loadServer(env, script) {
  // نسخةٌ من المصدر بلا سطر jsr (لا معنى له خارج Deno)، وnode يجرّد الأنواع بنفسه
  const src = fs.readFileSync(SRC, 'utf8').split('\n').filter(l => !/^import "jsr:/.test(l)).join('\n');
  const file = path.join(TMP, 'srv' + (++seq) + '.mts');
  fs.writeFileSync(file, src);
  let handler = null;
  globalThis.Deno = { env: { get: (k) => env[k] }, serve: (h) => { handler = h } };
  const calls = [];
  globalThis.fetch = async (url, init) => {
    const body = JSON.parse(init.body);
    calls.push({ url: String(url), model: body.model });
    const r = script(calls.length, body.model);
    return new Response(r.body, { status: r.status, headers: { "content-type": "application/json" } });
  };
  await import('file://' + file);
  return { handler, calls };
}
const post = (h, type = 'vocabulary') => h(new Request('http://x/', {
  method: 'POST', headers: { 'content-type': 'application/json' },
  body: JSON.stringify({ type, count: 3 })
}));

(async () => {

console.log('\n١) الحالة الحيّة: ٤٠٤ «النموذج غير موجود» ⇒ يُبدَّل بالقاع ويَنجح');
{
  const { handler, calls } = await loadServer(
    { GROQ_API_KEY: 'k', GROQ_MODEL: 'qwen/qwen3.6-27b' },
    (n) => n === 1 ? { status: 404, body: DEAD }
                   : { status: 200, body: JSON.stringify({ choices: [{ message: { content: GOOD }, finish_reason: 'stop' }], usage: { completion_tokens: 320 } }) });
  const r = await post(handler);
  const d = await r.json();
  ok(r.status === 200, `الردّ نجح بعد أن كان ٥٠٢ (الحالة ${r.status})`);
  ok((d.questions || []).length === 3, `وعادت الأسئلة الثلاثة (${(d.questions || []).length}) — وهو ما لم يصل هيا منذ ١٤ سبتمبر`);
  ok(calls.length === 2, `نداءان لا أكثر: الميّت ثمّ القاع (${calls.length})`);
  ok(calls[0].model === 'qwen/qwen3.6-27b', 'الأوّل بنموذج السرّ — فلا يُتجاوَز السرُّ بلا سبب');
  ok(calls[1].model === 'openai/gpt-oss-120b', 'والثاني بالقاع المبنيّ: ' + calls[1].model);
  ok(d.fellBack && d.fellBack.from === 'qwen/qwen3.6-27b' && d.fellBack.to === 'openai/gpt-oss-120b',
     'والتبديل يعود في الردّ ليُسجَّل — وبلاه يُقرأ النجاح على أن السرّ سليم');
  ok(d.usage && d.usage.model === 'openai/gpt-oss-120b', 'واسم النموذج المستعمَل فعلاً في `usage`');
}

console.log('\n٢) ولا يُبدَّل نموذجٌ بسبب سقفٍ يزول — ٤٢٩ تبقى ٤٢٩');
{
  const { handler, calls } = await loadServer(
    { GROQ_API_KEY: 'k', GROQ_MODEL: 'qwen/qwen3.6-27b' },
    () => ({ status: 429, body: RATE }));
  const r = await post(handler);
  const d = await r.json();
  ok(r.status === 502, 'الفشل يبقى فشلاً (٥٠٢)');
  ok(calls.every(c => c.model === 'qwen/qwen3.6-27b'), 'وكلُّ النداءات بنموذج السرّ — لا تبديل');
  ok(!d.fellBack, 'ولا يُدَّعى تبديلٌ لم يقع');
  ok(d.errors && d.errors.groq && d.errors.groq.status === 429, 'والسبب الحقيقي يصل كما هو: ٤٢٩');
  ok(/Limit\s+1000/i.test(String(d.errors.groq.detail || '')), 'ومعه الحدُّ المُعلَن — فيُفصَل «يزول» عن «لا يزول»');
}

console.log('\n٣) و٤٠٤ بلا دلالةٍ صريحة لا تكفي للتبديل');
{
  const { handler, calls } = await loadServer(
    { GROQ_API_KEY: 'k', GROQ_MODEL: 'qwen/qwen3.6-27b' },
    () => ({ status: 404, body: '{"error":{"message":"Not Found"}}' }));
  const r = await post(handler);
  ok(r.status === 502 && calls.every(c => c.model === 'qwen/qwen3.6-27b'),
     'لا تبديل على ٤٠٤ غامضة — وتبديلٌ في غير موضعه يُخفي العطل الحقيقي');
}

console.log('\n٤) والقاع نفسه لو غاب: لا حلقة لا تنتهي');
{
  const { handler, calls } = await loadServer(
    { GROQ_API_KEY: 'k', GROQ_MODEL: 'qwen/qwen3.6-27b' },
    () => ({ status: 404, body: DEAD }));
  const r = await post(handler);
  const d = await r.json();
  ok(r.status === 502, 'يُعلَن الفشل ولا يُعلَّق الطلب');
  ok(calls.length <= 3, `والنداءات مسقوفة (${calls.length})`);
  ok(d.errors.groq.model === 'openai/gpt-oss-120b', 'والسبب يُنسَب إلى القاع لا إلى السرّ — فيُعرف أن التبديل جرى وفشل');
  ok(d.fellBack && d.fellBack.from === 'qwen/qwen3.6-27b', 'و`fellBack` يصحب الفشل كما يصحب النجاح');
}

console.log('\n٥) والتبديل يَثبت: النداء التالي لا يُهدَر على ٤٠٤ معروفة');
{
  let calls2 = null;
  const { handler, calls } = await loadServer(
    { GROQ_API_KEY: 'k', GROQ_MODEL: 'qwen/qwen3.6-27b' },
    (n, m) => m === 'qwen/qwen3.6-27b' ? { status: 404, body: DEAD }
      : { status: 200, body: JSON.stringify({ choices: [{ message: { content: GOOD }, finish_reason: 'stop' }], usage: { completion_tokens: 300 } }) });
  await post(handler);
  const before = calls.length;
  const r2 = await post(handler, 'science');
  calls2 = calls.slice(before);
  ok(r2.status === 200, 'الطلب الثاني نجح');
  ok(calls2.length === 1 && calls2[0].model === 'openai/gpt-oss-120b',
     `وبنداءٍ واحد بالقاع مباشرةً (${calls2.length}) — لا ٤٠٤ مُهدَرة في كل طلب`);
}

console.log('\n٦) وبلا سرٍّ أصلاً: السلوك كما كان، لا تبديلَ ولا ادّعاء');
{
  const { handler, calls } = await loadServer(
    { GROQ_API_KEY: 'k' },
    () => ({ status: 200, body: JSON.stringify({ choices: [{ message: { content: GOOD }, finish_reason: 'stop' }], usage: { completion_tokens: 310 } }) }));
  const r = await post(handler);
  const d = await r.json();
  ok(r.status === 200 && calls[0].model === 'openai/gpt-oss-120b', 'يبدأ بالقاع مباشرةً كما كان');
  ok(!d.fellBack, 'ولا يُوسَم تبديلاً وهو لم يقع');
}

// ===== والنظير في `tutor` — وهو الأوسع أثراً =====
// نفس السرّ (`GROQ_MODEL`) يقرؤه `tutor` كذلك (`provider.toUpperCase()+"_MODEL"`).
// والسطر الحيّ من جهازَي هيا وإلياس معاً (١٦ سبتمبر) يقوله بلا ترجيح:
//   جُرِّب:groq:tutor_bad_model،gemini:tutor_quota
// أي أن Groq — المزوّد المجاني الوحيد العامل — يُرفَض على اسم النموذج، فتنحدر السلسلة
// إلى Gemini وهو بلا رصيد، فتموت المحادثة وتوليدُ الإنجليزية معاً. **وهذا هو الجواب
// الذي شُحن حقل `attempts` بالأمس لأجله، ووصل في أوّل جلسة.**
const TSRC = path.join(__dirname, '..', 'supabase-functions-tutor.ts');
async function loadTutor(env, script) {
  const src = fs.readFileSync(TSRC, 'utf8').split('\n').filter(l => !/^import "jsr:/.test(l)).join('\n');
  const file = path.join(TMP, 'tut' + (++seq) + '.mts');
  fs.writeFileSync(file, src);
  let handler = null;
  globalThis.Deno = { env: { get: (k) => env[k] }, serve: (h) => { handler = h } };
  const calls = [];
  globalThis.fetch = async (url, init) => {
    const body = JSON.parse(init.body);
    calls.push({ url: String(url), model: body.model });
    const r = script(calls.length, body.model);
    return new Response(r.body, { status: r.status, headers: { "content-type": "application/json" } });
  };
  await import('file://' + file);
  return { handler, calls };
}
const chat = (h) => h(new Request('http://x/', {
  method: 'POST', headers: { 'content-type': 'application/json' },
  body: JSON.stringify({ mode: 'chat', studentAnswer: 'I like football.', level: 'A2' })
}));
const REPLY = JSON.stringify({ choices: [{ message: { content: 'SAY: That is nice!' }, finish_reason: 'stop' }] });

console.log('\n٧) tutor: نموذجُ السرّ الميّت لا يُسقط المزوّد — يُعاد إليه بالقاع');
{
  const { handler, calls } = await loadTutor(
    { GROQ_API_KEY: 'k', GROQ_MODEL: 'qwen/qwen3.6-27b' },
    (n, m) => m === 'qwen/qwen3.6-27b' ? { status: 404, body: DEAD } : { status: 200, body: REPLY });
  const r = await chat(handler);
  const d = await r.json();
  ok(!!d.reply, 'وصل ردٌّ فعلاً بعد أن كانت المحادثة تموت بعد جملة: ' + JSON.stringify(d.reply || d.error));
  ok(calls.length === 2 && calls[1].model === 'openai/gpt-oss-120b',
     `نداءان: السرّ ثمّ القاع (${calls.map(c => c.model).join(' ⇐ ')})`);
  ok(Array.isArray(d.attempts) && d.attempts.some(a => /model_fallback/.test(a)),
     'والتبديل يدخل `attempts` فيُقرأ في السجلّ: ' + JSON.stringify(d.attempts));
  ok(!d.attempts.includes('groq:tutor_bad_model'),
     'ولا يُسجَّل المزوّد فاشلاً وقد نجح بعد التبديل');
}

console.log('\n٨) tutor: ولا يُهجَر Groq إلى Gemini بسبب اسم نموذج');
{
  // ترتيب السلسلة يضع gemini آخراً. قبل الإصلاح كان ٤٠٤ يُمرّر الطلب إليه وهو بلا رصيد.
  const { handler, calls } = await loadTutor(
    { GROQ_API_KEY: 'k', GROQ_MODEL: 'qwen/qwen3.6-27b', GEMINI_API_KEY: 'g' },
    (n, m) => m === 'qwen/qwen3.6-27b' ? { status: 404, body: DEAD }
      : /gemini/i.test(m || '') ? { status: 429, body: '{"error":{"message":"Your prepayment credits are depleted."}}' }
      : { status: 200, body: REPLY });
  const r = await chat(handler);
  const d = await r.json();
  ok(!!d.reply, 'الردّ وصل من Groq نفسه');
  ok(!calls.some(c => /gemini/i.test(String(c.url))), 'ولم يُطرَق Gemini إطلاقاً — فلا يُنسَب العطل لرصيدٍ نافد');
}

console.log('\n٩) tutor: و٤٢٩ تبقى ٤٢٩ — لا تبديلَ على حصّة');
{
  const { handler, calls } = await loadTutor(
    { GROQ_API_KEY: 'k', GROQ_MODEL: 'qwen/qwen3.6-27b' },
    () => ({ status: 429, body: RATE }));
  const r = await chat(handler);
  const d = await r.json();
  ok(d.error === 'tutor_quota', 'السبب يبقى tutor_quota: ' + d.error);
  ok(calls.every(c => c.model === 'qwen/qwen3.6-27b'), 'وبنموذج السرّ وحده — لا تبديل');
  ok(!(d.attempts || []).some(a => /model_fallback/.test(a)), 'ولا يُدَّعى تبديلٌ لم يقع');
}

console.log('\n١٠) والعميل يُسجّل التبديل وهو ناجح — وإلّا صار ديناً صامتاً');
{
  const { chromium } = require(process.env.PW || '/opt/node22/lib/node_modules/playwright');
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  const page = await b.newPage({ viewport: { width: 420, height: 900 } });
  page.on('pageerror', e => { console.log('  ✗ PAGEERROR ' + e.message); fails++ });
  await page.goto('http://127.0.0.1:8931/index.html');
  await page.waitForFunction(() => typeof tutorFellBackLog === 'function');
  const sent = [];
  await page.route('**/rest/v1/mawhiba_answer_log*', route => {
    try { sent.push(JSON.parse(route.request().postData() || '{}')) } catch (e) {}
    route.fulfill({ status: 201, body: '[]' });
  });
  await page.evaluate(() => {
    // ردٌّ **ناجح** جاء بعد تبديل — هذا هو ما كان يمرّ صامتاً
    tutorFellBackLog({ ok: true, reply: 'TEXT: hi', engine: 'groq', model: 'openai/gpt-oss-120b',
      attempts: ['groq:model_fallback→openai/gpt-oss-120b'] });
    // ونداءان تاليان: لا يُكرَّران السطر (حالةُ إعدادٍ لا حدثُ نداء)
    tutorFellBackLog({ ok: true, reply: 'x', engine: 'groq', model: 'openai/gpt-oss-120b',
      attempts: ['groq:model_fallback→openai/gpt-oss-120b'] });
  });
  await page.waitForTimeout(400);
  const rows = sent.flat().filter(x => x && x.qtype === 'model_fallback');
  ok(rows.length === 1, `سطرٌ واحد لا أكثر (${rows.length}) — الحدث حالةٌ لا نداء`);
  const q = rows.length ? String(rows[0].q_text || '') : '';
  ok(/model_fallback/.test(q) && /gpt-oss-120b/.test(q), 'وفيه المُبدَّل إليه: ' + q.slice(0, 110));
  // ولا بلاغ كاذب على ردٍّ ناجحٍ بلا تبديل — في صفحةٍ نظيفة
  const page2 = await b.newPage({ viewport: { width: 420, height: 900 } });
  const sent2 = [];
  await page2.route('**/rest/v1/mawhiba_answer_log*', route => {
    try { sent2.push(JSON.parse(route.request().postData() || '{}')) } catch (e) {}
    route.fulfill({ status: 201, body: '[]' });
  });
  await page2.goto('http://127.0.0.1:8931/index.html');
  await page2.waitForFunction(() => typeof tutorFellBackLog === 'function');
  await page2.evaluate(() => {
    tutorFellBackLog({ ok: true, reply: 'x', engine: 'groq', model: 'openai/gpt-oss-120b' });
    tutorFellBackLog({ ok: true, reply: 'x', engine: 'groq', attempts: ['groq:tutor_quota'] });
  });
  await page2.waitForTimeout(300);
  ok(sent2.flat().filter(x => x && x.qtype === 'model_fallback').length === 0,
     'ولا سطر حين لا تبديل — ولا على محاولةٍ فاشلة من نوعٍ آخر');
  await b.close();
}

console.log(`\nسقط ${fails}`);
try { fs.rmSync(TMP, { recursive: true, force: true }) } catch (e) {}
process.exit(fails ? 1 : 0);
})();
