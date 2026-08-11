// معلّم واحد لكل المواد — Gemini مع سلوك LearnLM التربوي.
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
// اسم النموذج في سرّ منفصل (GEMINI_MODEL) لا مكتوباً في الشيفرة: أسماء نماذج Gemini
// تتغيّر بين الأجيال، وتغييرها يجب ألا يستلزم نشراً جديداً.
import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const jsonOut = (o: unknown, status = 200) =>
  new Response(JSON.stringify(o), { status, headers: { ...CORS, "Content-Type": "application/json" } });

const DEFAULT_MODEL = "gemini-flash-latest";
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

    const KEY_RAW = (Deno.env.get("GEMINI_API_KEY") || "").trim();
    // نفس درس Azure: محرف غير مرئي واحد ملتصق بالمفتاح يجعل الطلب يفشل فشلاً غامضاً
    const KEY = KEY_RAW.replace(/[^\x21-\x7E]/g, "");
    const keyBad = Array.from(KEY_RAW).filter((c) => !/[\x21-\x7E]/.test(c))
      .map((c) => "U+" + (c.codePointAt(0) || 0).toString(16).toUpperCase().padStart(4, "0"));
    if (!KEY) {
      return jsonOut({ error: "not_configured",
        detail: KEY_RAW.length ? "GEMINI_API_KEY present but contains no usable characters"
                               : "GEMINI_API_KEY missing or empty",
        keyRawLength: KEY_RAW.length, keyBad });
    }

    const question = clip(b.question);
    const studentAnswer = clip(b.studentAnswer, 400);
    if (!question || !studentAnswer) return jsonOut({ error: "missing_question_or_answer" }, 400);

    const subject = clip(b.subject, 60) || "لغة إنجليزية";
    const age = Number(b.age) > 0 ? Number(b.age) : 11;
    const model = (Deno.env.get("GEMINI_MODEL") || DEFAULT_MODEL).trim();

    // تاريخ الحوار يصل من العميل ويعود إليه: الدالة بلا ذاكرة عمداً، فلا حالة تُدار هنا
    const history = Array.isArray(b.history) ? (b.history as Record<string, unknown>[]).slice(-MAX_TURNS) : [];
    const contents = history.length
      ? history.map((m) => ({
          role: String(m.role) === "model" ? "model" : "user",
          parts: [{ text: clip(m.text) }],
        }))
      : [{ role: "user", parts: [{ text: openingFor({ question, studentAnswer,
          choices: b.choices, correctAnswer: clip(b.correctAnswer, 200), priorErrors: clip(b.priorErrors, 300) }) }] }];

    const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`;
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 20000);
    let res: Response;
    try {
      res = await fetch(url, {
        method: "POST",
        headers: { "x-goog-api-key": KEY, "Content-Type": "application/json" },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: systemFor(subject, age) }] },
          contents,
          generationConfig: { temperature: 0.6, maxOutputTokens: 300, topP: 0.9 },
          // طفلة: نُشدّد المرشّحات فوق الافتراضي بدل الاكتفاء به
          safetySettings: [
            "HARM_CATEGORY_HARASSMENT", "HARM_CATEGORY_HATE_SPEECH",
            "HARM_CATEGORY_SEXUALLY_EXPLICIT", "HARM_CATEGORY_DANGEROUS_CONTENT",
          ].map((category) => ({ category, threshold: "BLOCK_LOW_AND_ABOVE" })),
        }),
        signal: ctrl.signal,
      });
    } catch (e) {
      clearTimeout(t);
      return jsonOut({ error: String(e).includes("abort") ? "gemini_timeout" : "gemini_unreachable",
        detail: String(e).slice(0, 160), model, keyBad });
    }
    clearTimeout(t);

    if (!res.ok) {
      const detail = (await res.text()).slice(0, 300);
      // نفصل الأسباب لأن علاجها مختلف: المفتاح، والحصّة، واسم النموذج
      const kind = res.status === 400 || res.status === 403 ? "gemini_auth"
        : res.status === 404 ? "gemini_bad_model"
        : res.status === 429 ? "gemini_quota"
        : "gemini_http";
      return jsonOut({ error: kind, status: res.status, detail, model });
    }

    const j = await res.json();
    const cand = (j.candidates && j.candidates[0]) || {};
    const text = ((cand.content && cand.content.parts) || [])
      .map((p: Record<string, unknown>) => String(p.text || "")).join("").trim();
    if (!text) {
      // حُجب أو عاد فارغاً: نُصرّح بالسبب بدل أن نُمرّر فراغاً يبدو ردّاً
      return jsonOut({ error: "gemini_no_text", finishReason: String(cand.finishReason || ""),
        blockReason: String((j.promptFeedback && j.promptFeedback.blockReason) || ""), model });
    }
    return jsonOut({ ok: true, engine: "gemini", model, reply: text,
      turns: history.length ? Math.floor(history.length / 2) + 1 : 1 });
  } catch (e) {
    return jsonOut({ error: "server_error", message: String(e).slice(0, 300) }, 500);
  }
});
