// وسيط آمن — Groq (أولاً) ثم Gemini (احتياط)، مع فلتر جودة عربي صارم
//
// ===== لماذا صار لهذه الدالّة مصدرٌ في المستودع — ٤ سبتمبر =====
// كانت الوحيدة الحيّة بلا نسخةٍ هنا (المستودع فيه tutor وassess-azure و
// assess-pronunciation-groq فقط)، فتعذّر أن يُقرأ أو يُراجَع أو يُقابَل بما هو منشور.
// وهذا بعينه ما أطال عمر العطل أدناه: لا أحد يقرأ ما لا يراه.
//
// ===== والعطل الذي أوجب هذا التعديل، مقاسٌ لا مفترَض =====
// شكوى هيا «الأسئلة متكرّرة» (٤ سبتمبر) قِيست لكل قسمٍ على حدة فأثبتتها:
// اللفظي ١٢ من ١٢ مما عُرض عليها اليوم رأته من قبل (أحدها **١٣ مرّة**، أجابته في
// ٠٫٩ ثانية)، والعلمي ١٢ من ١٢. وعلى أربعة عشر يوماً: ١٨٩ عرضاً لفظياً على **٢٤**
// نصّاً متمايزاً (٧٫٩ لكل عنصر)، و١٨٠ علمياً على **٢٧** (٦٫٧). والعدد ٢٤/٢٧ هو
// **بالضبط** حجم البنكين المؤلَّفين `VERBAL`/`SCIENCE` — أي أنهما مستنفَدان ١٠٠٪
// ولم يصلها عنصرٌ مولَّدٌ واحد. والكمّي والمرونة نظيفان (١٫٠ و١٫٢ عرضٍ لكل عنصر)
// لأنهما مولّدات إجرائية لا تمرّ بهذه الدالّة أصلاً — والتباين نفسه يُثبت الآلية.
//
// والسبب من سجلّ الخادم: كل POST من جهازها يعود **502 · all_engines_failed**.
// وليس انهياراً كما ظُنّ أوّلاً — بل ردُّ الدالّة المتعمَّد حين يفشل المحرّكان معاً.
// والمحرّك الأوّل كان يطلب `llama-3.3-70b-versatile`، **وهو ما أوقفته Groq نهائياً
// في ١٦ أغسطس ٢٠٢٦** — نفس العطل الذي ضرب `tutor` فأُصلح هناك في ١٧ أغسطس
// (`tutor_bad_model`) **ولم يُصلَح هنا**، فبقيت هذه الدالّة تطلب نموذجاً ميّتاً
// أسبوعين ونصفاً بلا أن يُسجَّل سطرٌ واحد.
//
// ===== واسم النموذج صار سرّاً لا نصّاً في الشيفرة =====
// هذا قرارٌ معلَنٌ في رأس `tutor` منذ بنائه: «أسماء النماذج تتغيّر بين الأجيال،
// وتغييرها يجب ألا يستلزم نشراً جديداً». وهذه الدالّة كانت تخالفه بتثبيت الاسم —
// وهو ما جعل إيقاف Groq للنموذج عطلاً يحتاج نشراً بدل تغيير سرّ. فصار يُقرأ من
// `GROQ_MODEL`/`GEMINI_MODEL` كما في `tutor` تماماً، والمكتوب هنا قاعٌ لا قيد.
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
const CORS = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type", "Access-Control-Allow-Methods": "POST, OPTIONS" };
// البديل الذي أوصت به Groq نفسها عن llama-3.3-70b-versatile، وهو المُشغَّل فعلاً في
// `tutor` منذ ١٧ أغسطس — فلا نموذجَ جديدٌ يُجرَّب هنا، بل الذي ثبت عمله هناك.
//
// **والسرّ لا يُصدَّق على عماه**: `GROQ_MODEL` سرٌّ قائمٌ ضُبط فعلاً من قبل (١٨ أغسطس،
// على qwen3.6-27b) ولا سبيل من هنا لقراءة قيمته الحالية. فلو كان يحمل النموذج الميّت
// نفسه لأعاد قراءةُ السرّ العطلَ الذي جئنا نُصلحه. فالنماذج المعروف موتها تُرفَض مهما
// قال السرّ — قائمةٌ تُوسَّع بما يثبت موته، لا حجبٌ عامّ يمنع ضبط نموذجٍ جديد.
const DEAD_MODELS = /llama-3\.3-70b-versatile/i;
const envGroqModel = (Deno.env.get("GROQ_MODEL") || "").trim();
const GROQ_MODEL = (envGroqModel && !DEAD_MODELS.test(envGroqModel)) ? envGroqModel : "openai/gpt-oss-120b";
const GEMINI_MODEL = (Deno.env.get("GEMINI_MODEL") || "").trim() || "gemini-flash-latest";

const TEXT_TYPES: Record<string, string> = {
  reading: "سؤال فهم مقروء استنتاجي: نص قصير (٣-٤ أسطر) ثم سؤال يتطلّب استنتاج معنى غير مذكور صراحةً. ضع النص داخل q.",
  logic: "سؤال استدلال منطقي لفظي: عبارة أو مقدمة، والمطلوب استنتاج النتيجة المنطقية الصحيحة.",
  analogy: "سؤال تناظر لفظي دلالي: بيّن علاقة دلالية واضحة (جزء وكل، تصنيف، سبب ونتيجة، مرادف، ترتيب...) بين كلمتين حقيقيتين تكتبهما كزوج أول كامل، ثم اكتب زوجاً ثانياً من كلمتين حقيقيتين تحمل نفس العلاقة تماماً لكن اجعل الكلمة الرابعة علامة استفهام فقط بدلاً منها. مثال على الشكل المطلوب فقط (لا تستخدم هذه الكلمات نفسها): \"قلم : كتابة = سكين : ؟\". ممنوع منعاً باتاً كتابة الأحرف أ ب ج د، أو كتابة حرف مفرد مثل \"ج\" داخل نص السؤال كبديل عن كلمة — كل المواضع الأربعة يجب أن تكون كلمات عربية حقيقية ما عدا علامة الاستفهام الأخيرة فقط.",
  science: "سؤال استدلال علمي/فيزيائي بمشهد يومي بسيط يتطلّب فهم علاقة سببية لا معلومة محفوظة.",
  vocabulary: "سؤال ثروة لغوية: مرادف أو ضد أو الكلمة المناسبة لسياق.",
};

function jsonOut(o: unknown, status = 200) { return new Response(JSON.stringify(o), { status, headers: { ...CORS, "Content-Type": "application/json" } }); }

function buildPrompt(count: number, instr: string): string {
  return `أنت خبير في إعداد أسئلة مقياس موهبة السعودي للمستوى الثاني (السادس الابتدائي حتى الثاني المتوسط).\n\nأنشئ ${count} سؤالاً من نوع: ${instr}\n\nقواعد ملزِمة وصارمة:\n- اكتب باللغة العربية الفصحى فقط. ممنوع منعاً باتاً استخدام أي حرف أجنبي (إنجليزي، صيني، روسي، أو أي رمز غير عربي) داخل النص.\n- أربعة خيارات بالضبط، مختلفة عن بعضها تماماً، واحد صحيح فقط، والمموّهات معقولة.\n- تجنّب الأخطاء الواقعية والحسابية. نوّع المحتوى.\n- لكل سؤال: فكّر أولاً في الحل خطوة بخطوة واكتب هذا التفكير في why، ثم وبناءً على why فقط حدّد answer. لا تحدّد answer قبل أن تكتب why.\n- أعِد JSON فقط بلا أي نص إضافي، بهذا الشكل تحديداً (لاحظ أن why يسبق answer في كل عنصر):\n{"questions":[{"q":"نص السؤال","choices":["أ","ب","ج","د"],"why":"تفكير خطوة بخطوة يخلص إلى الإجابة الصحيحة","answer":0}]}\nحيث answer فهرس الإجابة الصحيحة (٠-٣) المطابق لما خلص إليه why.`;
}

// فلتر صارم: نرفض أي سؤال فيه حرف غير عربي (لاتيني/صيني/روسي/رموز)
// المسموح: عربي، أرقام (عربية/هندية)، مسافات، وعلامات ترقيم شائعة
const ALLOWED = /^[؀-ۿݐ-ݿﭐ-﷿ﹰ-﻿\s0-9.,،؛؟:!\-–—()\[\]{}'"«»\/%+=×÷★●☆‏‎٠-٩*]*$/;
function isClean(x: any): boolean {
  const parts = [String(x.q), ...(x.choices || []).map(String), String(x.why || "")];
  return parts.every((p) => ALLOWED.test(p));
}
// ===== تجريد تفكير النموذج قبل تفكيك JSON — نفس علاج `tutor` (١٨ أغسطس) =====
// نماذج التفكير (gpt-oss وQwen) تُخرج أحياناً كتلة <think> قبل الجواب. وهناك كانت
// تُسرَّب إلى الشاشة، وهنا تكسر `JSON.parse` فيعود صفرُ أسئلة بلا سبب مفهوم.
function stripThink(s: string): string {
  let t = String(s || "");
  t = t.replace(/<\s*(think|thinking|reasoning)\s*>[\s\S]*?<\s*\/\s*\1\s*>/gi, "");
  t = t.replace(/<\s*(think|thinking|reasoning)\s*>[\s\S]*$/i, "");
  t = t.replace(/^[\s\S]*?<\s*\/\s*(think|thinking|reasoning)\s*>/i, "");
  return t.trim();
}
function extractQuestions(rawText: string) {
  let parsed: any = null;
  const clean = stripThink(rawText);
  try { parsed = JSON.parse(clean.replace(/```json|```/g, "").trim()); } catch (_e) {
    const m = clean.match(/\{[\s\S]*\}/);
    if (m) { try { parsed = JSON.parse(m[0]); } catch (_e2) { parsed = null; } }
  }
  if (!parsed?.questions?.length) return [];
  return parsed.questions.filter((x: any) =>
    Array.isArray(x.choices) && x.choices.length === 4 &&
    new Set(x.choices.map((c: unknown) => String(c).trim())).size === 4 &&
    Number.isInteger(x.answer) && x.answer >= 0 && x.answer <= 3 &&
    x.q && isClean(x)
  );
}

async function callGroq(key: string, prompt: string) {
  // gpt-oss نموذج تفكيرٍ يُنفق من سقف الرموز على تفكيرٍ داخلي قبل الجواب — وهو
  // بعينه ما أفرغ ردَّ `tutor` (tutor_no_text، محمد ١٧ أغسطس، finishReason="length").
  // فنفس علاجه هناك: reasoning_effort منخفض وسقفٌ يتّسع لدفعة أسئلة كاملة.
  const isGptOss = /gpt-oss/i.test(GROQ_MODEL);
  const payload: Record<string, unknown> = {
    model: GROQ_MODEL, messages: [{ role: "user", content: prompt }],
    temperature: 0.8, max_tokens: 2500, response_format: { type: "json_object" },
  };
  if (isGptOss) payload.reasoning_effort = "low";
  else if (/qwen3/i.test(GROQ_MODEL)) payload.reasoning_effort = "none";
  const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST", headers: { "Authorization": `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) { const t = await res.text(); return { ok: false, status: res.status, detail: t.slice(0, 300) }; }
  const data = await res.json();
  return { ok: true, questions: extractQuestions(data?.choices?.[0]?.message?.content || ""), model: GROQ_MODEL };
}
async function callGemini(key: string, prompt: string) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${key}`;
  const res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }], generationConfig: { temperature: 1.0, responseMimeType: "application/json" } }) });
  if (!res.ok) { const t = await res.text(); return { ok: false, status: res.status, detail: t.slice(0, 300) }; }
  const data = await res.json();
  return { ok: true, questions: extractQuestions(data?.candidates?.[0]?.content?.parts?.[0]?.text || ""), model: GEMINI_MODEL };
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  try {
    const body = await req.json().catch(() => ({}));
    const type = String(body?.type || "reading");
    const count = Math.min(Math.max(parseInt(body?.count) || 1, 1), 4);
    const instr = TEXT_TYPES[type] || TEXT_TYPES.reading;
    const askCount = Math.min(count + 3, 6);
    const prompt = buildPrompt(askCount, instr);

    const GROQ = Deno.env.get("GROQ_API_KEY") || Deno.env.get("GROQ_KEY");
    const GEMINI = Deno.env.get("GEMINI_API_KEY") || Deno.env.get("GOOGLE_API_KEY");
    const errors: any = {};

    if (GROQ) {
      let all: any[] = [];
      for (let i = 0; i < 3 && all.length < count; i++) {
        const r = await callGroq(GROQ, prompt);
        if (r.ok) all = all.concat(r.questions); else { errors.groq = { status: r.status, detail: r.detail, model: GROQ_MODEL }; break; }
      }
      if (all.length) return jsonOut({ type, engine: "groq", model: GROQ_MODEL, questions: all.slice(0, count) });
      if (!errors.groq) errors.groq = { reason: "no_clean_questions", model: GROQ_MODEL };
    } else errors.groq = "no_key";

    if (GEMINI) {
      const r = await callGemini(GEMINI, prompt);
      if (r.ok && r.questions.length) return jsonOut({ type, engine: "gemini", model: GEMINI_MODEL, questions: r.questions.slice(0, count) });
      errors.gemini = r.ok ? { reason: "no_questions", model: GEMINI_MODEL } : { status: r.status, detail: r.detail, model: GEMINI_MODEL };
    } else errors.gemini = "no_key";

    return jsonOut({ error: "all_engines_failed", errors }, 502);
  } catch (e) { return jsonOut({ error: "server_error", message: String(e).slice(0, 300) }, 500); }
});
