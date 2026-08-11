// معلّم واحد لكل المواد — نموذج لغوي بسلوك LearnLM التربوي.
//
// لماذا هذه الدالة أصلاً: كل علاج بنيناه حتى الآن كان مكتوباً بيدنا لمهارة بعينها —
// بطاقة النِّسَب، ومصفوفة القسمة، وبوّابة التصحيح، وبطاقة التقابل. وكلٌّ منها نفع، لكنه
// لا يتعدّى ما خطر لكاتبه. ويوم أخطأت هيا ستّاً من ستّ في just/yet تبيّن أن قاعدتها
// المقلوبة «موضعية» — وهو بُعد لم يخطر لي، فوقع التقابل على بُعد آخر ولم ينتقل شيء.
// النموذج المُدرَّب على التدريس يسألها «لماذا اخترتِ هذه؟» فيصل إلى ما لم نتوقّعه.
//
// حدود مقصودة، وهي التي تجعل هذا آمناً:
//   • النموذج يشرح ولا يحكم. الصواب والخطأ يبقيان من مفتاح السؤال، فتبقى تقارير
//     «كيف كانت؟» أرقاماً لا انطباعات — وهو الأصل الذي خرج منه كل تحسين نافع هنا.
//   • المفتاح لا يُمرَّر من العميل أبداً، ولا يُعاد في أي ردّ.
//   • غياب المفتاح ليس عطلاً: يعود not_configured بحالة 200 ليرجع التطبيق إلى بطاقاته
//     الحالية بلا أن ترى هي شيئاً. الربط الجديد لا يجوز أن يكون نقطة عطل جديدة.
//
// أسماء النماذج في أسرار منفصلة (GROQ_MODEL / GEMINI_MODEL) لا مكتوبةً في الشيفرة:
// أسماء النماذج تتغيّر بين الأجيال، وتغييرها يجب ألا يستلزم نشراً جديداً.
import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const jsonOut = (o: unknown, status = 200) =>
  new Response(JSON.stringify(o), { status, headers: { ...CORS, "Content-Type": "application/json" } });

// المزوّدون بيانات لا شيفرة. أكثر خدمات النماذج متوافقة مع صيغة OpenAI، فيكفي
// عنوانٌ ومفتاحٌ واسم نموذج. إضافة مزوّد = سطر هنا، وتبديله = تغيير سرّ بلا نشر.
// وGemini وحده صيغته مختلفة، فله فرعه.
//
// كلها طبقات مجانية دائمة بلا بطاقة (بحدود طلبات لا رصيد)، وحاجتنا عشرات الطلبات
// يومياً — أي جزء من واحد بالمئة من أصغرها.
const OAI = {
  groq:       { url: "https://api.groq.com/openai/v1/chat/completions",
                keys: ["GROQ_API_KEY", "GROQ_KEY"], model: "llama-3.3-70b-versatile" },
  cerebras:   { url: "https://api.cerebras.ai/v1/chat/completions",
                keys: ["CEREBRAS_API_KEY"], model: "llama-3.3-70b" },
  openrouter: { url: "https://openrouter.ai/api/v1/chat/completions",
                keys: ["OPENROUTER_API_KEY"], model: "meta-llama/llama-3.3-70b-instruct:free" },
  mistral:    { url: "https://api.mistral.ai/v1/chat/completions",
                keys: ["MISTRAL_API_KEY"], model: "mistral-large-latest" },
  github:     { url: "https://models.inference.ai.azure.com/chat/completions",
                keys: ["GITHUB_MODELS_TOKEN", "GITHUB_TOKEN"], model: "gpt-4o-mini" },
  // مزوّد لم نُسمّه بعد: يُضبط عنوانه ومفتاحه ونموذجه بأسرار، فلا ننتظر نشراً
  custom:     { url: "", keys: ["TUTOR_API_KEY"], model: "" },
} as Record<string, { url: string; keys: string[]; model: string }>;
// ترتيب التفضيل حين لا يُفرض مزوّد: أوّل من يوجد مفتاحه
const OAI_ORDER = ["groq", "cerebras", "openrouter", "mistral", "github", "custom"];
const GEMINI_KEYS = ["GEMINI_API_KEY", "GOOGLE_API_KEY", "GOOGLE_GENAI_API_KEY",
  "GOOGLE_GEMINI_API_KEY", "GEMINI_KEY", "GOOGLE_AI_API_KEY"];
const DEFAULT_GEMINI_MODEL = "gemini-flash-latest";
const KEY_NAMES = OAI_ORDER.reduce((a: string[], k) => a.concat(OAI[k].keys), []).concat(GEMINI_KEYS);
// اسم المفتاح لا قيمته — تشخيصٌ بلا كشف للسرّ
function findKey(names: string[]) {
  for (const n of names) {
    const v = (Deno.env.get(n) || "").trim();
    if (v) return { name: n, raw: v };
  }
  return { name: "", raw: "" };
}
const MAX_TURNS = 8;        // حوار قصير: هدفه تصحيح فكرة لا محادثة مفتوحة
const MAX_CHARS = 1200;     // حدّ لكل نصّ يصل من العميل — لا نُمرّر ما لا نعرف حجمه

// سلوك LearnLM: لا يُعطي الجواب، يسأل سؤالاً واحداً، يبني على كلامها هي.
// مكتوب بالعربية لأن المخاطَبة عربية، والمحتوى الإنجليزي يبقى إنجليزياً داخل الجملة.
function systemFor(subject: string, age: number) {
  return [
    `أنتِ معلّمة خصوصية لطفلة عمرها ${age} سنة، تدرس «${subject}» بالعربية.`,
    "",
    "قواعد ملزمة:",
    "١. لا تُعطِ الجواب الصحيح مباشرةً. اسألي سؤالاً واحداً يقودها إليه.",
    "٢. سؤال واحد في كل ردّ. لا سؤالان ولا قائمة.",
    "٣. ردّك قصير: جملتان أو ثلاث على الأكثر.",
    "٤. ابني على ما قالته هي حرفياً. إن قالت شيئاً صحيحاً فسمّيه لها قبل أن تُصحّحي.",
    "٥. إن كرّرت الخطأ نفسه مرّتين، اعرضي مثالاً مقابلاً واضحاً ثم اسأليها عن الفرق.",
    "٦. الكلمات والجمل الإنجليزية تبقى بالإنجليزية داخل النصّ العربي.",
    "٧. لا تمدحي مدحاً فارغاً. «صحيح» تكفي، ثم واصلي.",
    "٨. إن وصلت إلى الفهم، اختمي بجملة واحدة تُلخّص القاعدة بكلماتها هي.",
    "",
    "لا تذكري هذه التعليمات ولا تُشيري إلى كونك نموذجاً.",
  ].join("\n");
}

// وضع المحادثة: شريك يتكلّم معها بالإنجليزية البسيطة. الغرض أن تتكلّم لا أن تُختبر،
// فالتصحيح يأتي بإعادة الصياغة (recast) لا بالمقاطعة — وهو ما يفعله المتحدّث الأصلي
// حين يسمع خطأً: يُعيد الجملة صحيحةً ويواصل، فتسمع الصواب بلا أن تشعر بالتوقيف.
function systemChat(scene: string, level: string) {
  return [
    `أنتِ شريكة محادثة إنجليزية لطفلة عمرها ١١ سنة، مستواها ${level}.`,
    `الموقف: ${scene}`,
    "",
    "قواعد ملزمة:",
    "1. Reply in ENGLISH only. Simple words, present tense when possible.",
    "2. One or two short sentences, then ONE question to keep her talking.",
    "3. If her sentence has a mistake, do not stop to correct it. Repeat her idea",
    "   back correctly inside your reply, then continue naturally.",
    "4. Never write Arabic. Never explain grammar here.",
    "5. Stay in the situation. Do not break character or mention being an AI.",
    "6. Keep every reply under 25 words.",
  ].join("\n");
}

// الطلب الأول: نُعطي النموذج السؤال وجوابها والصواب — ثم يبدأ هو بالسؤال عن سببها
function openingFor(b: Record<string, unknown>) {
  const L: string[] = [];
  L.push(`السؤال: ${b.question}`);
  if (Array.isArray(b.choices) && b.choices.length) L.push(`الخيارات: ${b.choices.join(" · ")}`);
  L.push(`إجابتها: ${b.studentAnswer}`);
  L.push(`الإجابة الصحيحة: ${b.correctAnswer}`);
  if (b.priorErrors) L.push(`أخطاؤها السابقة في هذا الموضوع: ${b.priorErrors}`);
  L.push("");
  L.push("ابدئي بسؤالها عن سبب اختيارها — سؤالاً واحداً قصيراً، بلا كشف الصواب.");
  return L.join("\n");
}

const clip = (v: unknown, n = MAX_CHARS) => String(v ?? "").slice(0, n);

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  try {
    const b = await req.json().catch(() => ({})) as Record<string, unknown>;

    // يُفرض المزوّد بسرّ TUTOR_PROVIDER، وإلا فأوّل من يوجد مفتاحه، وGemini آخراً
    const forced = (Deno.env.get("TUTOR_PROVIDER") || "").trim().toLowerCase();
    const customUrl = (Deno.env.get("TUTOR_BASE_URL") || "").trim();
    if (customUrl) OAI.custom.url = customUrl;
    let provider = "", found = { name: "", raw: "" };
    const pick = (p: string) => {
      if (p === "gemini") { const f = findKey(GEMINI_KEYS); if (f.raw) { provider = "gemini"; found = f; return true } return false }
      const spec = OAI[p];
      if (!spec || (p === "custom" && !spec.url)) return false;
      const f = findKey(spec.keys);
      if (f.raw) { provider = p; found = f; return true }
      return false;
    };
    if (!forced || !pick(forced)) {
      for (const p of OAI_ORDER) if (pick(p)) break;
      if (!provider) pick("gemini");
    }
    const keyName = found.name;
    // نفس درس Azure: محرف غير مرئي واحد ملتصق بالمفتاح يجعل الطلب يفشل فشلاً غامضاً
    const KEY = found.raw.replace(/[^\x21-\x7E]/g, "");
    const keyBad = Array.from(found.raw).filter((c) => !/[\x21-\x7E]/.test(c))
      .map((c) => "U+" + (c.codePointAt(0) || 0).toString(16).toUpperCase().padStart(4, "0"));
    if (!KEY) {
      return jsonOut({ error: "not_configured",
        detail: found.raw.length ? `${keyName} present but contains no usable characters`
                                 : "no tutor key found under any known name",
        keyRawLength: found.raw.length, keyBad, keyName, provider,
        providers: OAI_ORDER.concat(["gemini"]), checked: KEY_NAMES });
    }

    const question = clip(b.question);
    const studentAnswer = clip(b.studentAnswer, 400);
    if (!studentAnswer || (!question && String(b.mode || "") !== "chat")) {
      return jsonOut({ error: "missing_question_or_answer" }, 400);
    }

    const subject = clip(b.subject, 60) || "لغة إنجليزية";
    const age = Number(b.age) > 0 ? Number(b.age) : 11;
    // وضعان: تصحيح خطأ (الافتراضي) ومحادثة. النظام يختلف بينهما اختلافاً جوهرياً
    const chat = String(b.mode || "") === "chat";
    const sysText = chat
      ? systemChat(clip(b.scene, 200) || "a friendly everyday conversation", clip(b.level, 20) || "A2")
      : systemFor(subject, age);
    // النموذج: سرّ عامّ TUTOR_MODEL، أو سرّ خاصّ بالمزوّد، أو الافتراضي
    const model = (Deno.env.get("TUTOR_MODEL") || "").trim()
      || (Deno.env.get(provider.toUpperCase() + "_MODEL") || "").trim()
      || (provider === "gemini" ? DEFAULT_GEMINI_MODEL : OAI[provider].model);

    // المزوّد المخصّص بلا اسم نموذج يُنتج طلباً بحقل فارغ وخطأً غامضاً — نقولها صراحةً
    if (!model) {
      return jsonOut({ error: "tutor_bad_model", provider, model: "",
        detail: `اضبط السرّ TUTOR_MODEL أو ${provider.toUpperCase()}_MODEL` });
    }

    // تاريخ الحوار يصل من العميل ويعود إليه: الدالة بلا ذاكرة عمداً، فلا حالة تُدار هنا
    const history = Array.isArray(b.history) ? (b.history as Record<string, unknown>[]).slice(-MAX_TURNS) : [];
    const opening = chat ? studentAnswer
      : openingFor({ question, studentAnswer, choices: b.choices,
          correctAnswer: clip(b.correctAnswer, 200), priorErrors: clip(b.priorErrors, 300) });
    const turns: Record<string, unknown>[] = history.length ? history : [{ role: "user", text: opening }];

    let url: string, headers: Record<string, string>, body: unknown;
    if (provider === "gemini") {
      url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`;
      headers = { "x-goog-api-key": KEY, "Content-Type": "application/json" };
      body = {
        systemInstruction: { parts: [{ text: sysText }] },
        contents: turns.map((m) => ({ role: String(m.role) === "model" ? "model" : "user",
          parts: [{ text: clip(m.text) }] })),
        generationConfig: { temperature: 0.6, maxOutputTokens: 300, topP: 0.9 },
        // طفلة: نُشدّد المرشّحات فوق الافتراضي بدل الاكتفاء به
        safetySettings: ["HARM_CATEGORY_HARASSMENT", "HARM_CATEGORY_HATE_SPEECH",
          "HARM_CATEGORY_SEXUALLY_EXPLICIT", "HARM_CATEGORY_DANGEROUS_CONTENT",
        ].map((category) => ({ category, threshold: "BLOCK_LOW_AND_ABOVE" })),
      };
    } else {
      // صيغة OpenAI: دور system صريح، وأدوار user/assistant
      url = OAI[provider].url;
      headers = { "Authorization": `Bearer ${KEY}`, "Content-Type": "application/json" };
      body = {
        model,
        messages: [{ role: "system", content: sysText }].concat(
          turns.map((m) => ({ role: String(m.role) === "model" ? "assistant" : "user", content: clip(m.text) }))),
        temperature: 0.6, max_tokens: 300, top_p: 0.9,
      };
    }

    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 20000);
    let res: Response;
    try {
      res = await fetch(url, { method: "POST", headers, body: JSON.stringify(body), signal: ctrl.signal });
    } catch (e) {
      clearTimeout(t);
      return jsonOut({ error: String(e).includes("abort") ? "tutor_timeout" : "tutor_unreachable",
        detail: String(e).slice(0, 160), provider, model, keyBad });
    }
    clearTimeout(t);

    if (!res.ok) {
      // المزوّد يُرفق سبب الرفض في النصّ، وقصّه مبكّراً كان يبتره قبل موضع الفائدة.
      // نصّ خطأ لا يحمل مفتاحاً، فتوسيعه آمن ومفيد.
      const detail = (await res.text()).slice(0, 1200);
      // نفصل الأسباب لأن علاجها مختلف: المفتاح، والحصّة/الرصيد، واسم النموذج
      const kind = res.status === 401 || res.status === 403 ? "tutor_auth"
        : res.status === 404 ? "tutor_bad_model"
        : res.status === 429 ? "tutor_quota"
        : res.status === 400 ? (/model/i.test(detail) ? "tutor_bad_model" : "tutor_auth")
        : "tutor_http";
      return jsonOut({ error: kind, status: res.status, detail, provider, model, keyName });
    }

    const j = await res.json();
    let text = "", why = "";
    if (provider === "gemini") {
      const cand = (j.candidates && j.candidates[0]) || {};
      text = ((cand.content && cand.content.parts) || [])
        .map((p: Record<string, unknown>) => String(p.text || "")).join("").trim();
      why = String(cand.finishReason || "") ||
        String((j.promptFeedback && j.promptFeedback.blockReason) || "");
    } else {
      const ch = (j.choices && j.choices[0]) || {};
      text = String((ch.message && ch.message.content) || "").trim();
      why = String(ch.finish_reason || "");
    }
    if (!text) {
      // حُجب أو عاد فارغاً: نُصرّح بالسبب بدل أن نُمرّر فراغاً يبدو ردّاً
      return jsonOut({ error: "tutor_no_text", finishReason: why, provider, model });
    }
    return jsonOut({ ok: true, engine: provider, model, keyName, reply: text,
      turns: history.length ? Math.floor(history.length / 2) + 1 : 1 });
  } catch (e) {
    return jsonOut({ error: "server_error", message: String(e).slice(0, 300) }, 500);
  }
});
