// تقييم النطق: أذن (Whisper) + حَكَم (نموذج لغوي) — كلاهما عبر GROQ_API_KEY نفسه.
//
// لماذا فصلنا الأذن عن الحَكَم:
//   Whisper وظيفته النسخ لا التقييم. في جلسة حقيقية نسخ "That wasn't very friendly" نسخاً
//   صحيحاً تماماً، ثم ظلمَتها قواعدنا النصية لأنه كتب wasnt بلا فاصلة عليا. الخلل كان في
//   الحَكَم لا في الأذن. فالحَكَم الآن نموذج لغوي يفهم أن wasnt = wasn't، ويرفض في الوقت
//   نفسه أن were = was أو but = bud لأنهما خطآن حقيقيان يجب أن تراهما.
//
// قرار مقصود: لا نمرّر الجملة المستهدفة إلى Whisper في حقل prompt رغم أنه يرفع دقة النسخ.
//   السبب أنه يحرف النسخ نحو النص المتوقَّع، فينسخ ما كان يُفترض أن تقوله لا ما قالته —
//   وهذا "نجاح كاذب" يهدم الغرض من التقييم كله.
//
// الحساب النهائي (النسبة المئوية) يبقى في التطبيق لا هنا: النموذج يحكم على كل كلمة
//   بنعم/لا فقط، والقسمة حسابٌ ثابت. فلا تتأرجح درجتها بين جلسة وأخرى على نفس الأداء.
import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const jsonOut = (o: unknown, status = 200) =>
  new Response(JSON.stringify(o), { status, headers: { ...CORS, "Content-Type": "application/json" } });

function base64ToBytes(b64: string): Uint8Array {
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

// عتبات ثقة Whisper نفسه — إشارة حقيقية من النموذج بدل تخميننا من شكل النص
const NO_SPEECH_MAX = 0.6;   // فوقها: الأرجح أنه لا كلام في التسجيل
const AVG_LOGPROB_MIN = -1.0; // تحتها: النسخ نفسه غير موثوق

const JUDGE_SYSTEM = `You judge whether a young English learner said each required word.

You did NOT hear the audio. The transcript is your ONLY evidence. Never assume she said a
word just because the target sentence contains it.

For each target word output said=true ONLY if the transcript contains that same word.
Accept these as the SAME word (they are transcription conventions, not pronunciation errors):
- contractions with or without the apostrophe: wasnt=wasn't, its=it's, dont=don't, im=I'm, cant=can't=cannot=can not
- possessives with or without the apostrophe: teachers=teacher's
- okay=OK, alright=all right
- digits vs number words: 2=two
- British vs American spelling: colour=color

Output said=false when the transcript has a DIFFERENT word, even if it sounds similar.
These are real errors she must see, not conventions:
- were vs was, but vs bud, class vs glass, nothing vs everything, then vs than
Also said=false when the word is simply absent from the transcript.

Keep the given order and return exactly one entry per target word, echoing each word unchanged.

Set garbled=true ONLY when the transcript is clearly not an attempt at the sentence at all —
an unrelated string, or a phrase repeated over and over (a known Whisper failure on unclear audio).
A partly wrong attempt is NOT garbled.

note: one short sentence in Arabic naming her main slip, addressed to a 6th-grade girl
(feminine forms), or "" when everything matched. No praise, no preamble, just the slip.

Reply with JSON only: {"words":[{"w":"...","said":true|false}],"garbled":false,"note":"..."}`;

// أمثلة من جلسة حقيقية — لها إجابة صحيحة معروفة، فتضبط الحَكَم على الحالتين معاً
const JUDGE_SHOTS: { user: string; assistant: string }[] = [
  {
    user: `target words: ["that","was","not","very","friendly"]\ntranscript: "that wasnt very friendly"`,
    assistant: `{"words":[{"w":"that","said":true},{"w":"was","said":true},{"w":"not","said":true},{"w":"very","said":true},{"w":"friendly","said":true}],"garbled":false,"note":""}`,
  },
  {
    user: `target words: ["that","was","great"]\ntranscript: "that were great"`,
    assistant: `{"words":[{"w":"that","said":true},{"w":"was","said":false},{"w":"great","said":true}],"garbled":false,"note":"قلتِ were والصواب was."}`,
  },
  {
    user: `target words: ["thanks","bud"]\ntranscript: "thanks but"`,
    assistant: `{"words":[{"w":"thanks","said":true},{"w":"bud","said":false}],"garbled":false,"note":"نطقتِ but بدل bud — انتبهي لحرف d في آخرها."}`,
  },
  {
    user: `target words: ["no","problem"]\ntranscript: "no brown bear no brown bear no brown bear"`,
    assistant: `{"words":[{"w":"no","said":false},{"w":"problem","said":false}],"garbled":true,"note":"لم يصل صوتك بوضوح."}`,
  },
];

// لا نستطيع اختبار الدالة الحيّة من بيئة التطوير (الشبكة محجوبة)، فلو كان اسم النموذج
// غير متاح على Groq لسقط الحَكَم صامتاً إلى المقارنة المحلية ولن تستفيد شيئاً. لذلك نجرّب
// عدة نماذج بالترتيب، ونطبع الذي نجح ليظهر في السجلّات ويمكن التحقّق منه بعد أول جلسة.
const JUDGE_MODELS = [
  Deno.env.get("GROQ_JUDGE_MODEL") || "",
  "llama-3.3-70b-versatile",
  "openai/gpt-oss-120b",
  "moonshotai/kimi-k2-instruct",
  "llama-3.1-8b-instant",
].filter(Boolean);

async function judge(groqKey: string, targetWords: string[], heard: string) {
  const messages = [
    { role: "system", content: JUDGE_SYSTEM },
    ...JUDGE_SHOTS.flatMap((s) => [
      { role: "user", content: s.user },
      { role: "assistant", content: s.assistant },
    ]),
    { role: "user", content: `target words: ${JSON.stringify(targetWords)}\ntranscript: ${JSON.stringify(heard)}` },
  ];
  let res: Response | null = null, model = "", lastErr = "";
  for (const m of JUDGE_MODELS) {
    const r = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: { "Authorization": `Bearer ${groqKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ model: m, messages, temperature: 0, max_tokens: 900, response_format: { type: "json_object" } }),
    });
    if (r.ok) { res = r; model = m; break; }
    lastErr = `judge_http_${r.status}:${m}:${(await r.text()).slice(0, 120)}`;
    if (r.status !== 400 && r.status !== 404) break; // خطأ غير متعلّق بالنموذج: لا فائدة من التجريب
  }
  if (!res) return { err: "judge_no_model", detail: lastErr };
  console.log("judge model used:", model);
  const data = await res.json();
  const raw = data?.choices?.[0]?.message?.content;
  if (!raw) return { err: "judge_empty" };
  let parsed: any;
  try { parsed = JSON.parse(raw); } catch { return { err: "judge_unparsable" }; }
  const words = parsed?.words;
  // حارس مزامنة: لو أسقط النموذج كلمة أو أضاف أخرى فالنتيجة ستُحاذي الكلمة الخطأ — نرفضها كلها
  if (!Array.isArray(words) || words.length !== targetWords.length) return { err: "judge_length_mismatch" };
  for (let i = 0; i < words.length; i++) {
    if (String(words[i]?.w || "").toLowerCase() !== targetWords[i].toLowerCase()) return { err: "judge_word_mismatch" };
  }
  return {
    judged: words.map((w: any) => w.said === true),
    garbled: parsed?.garbled === true,
    note: typeof parsed?.note === "string" ? parsed.note.slice(0, 200) : "",
    model,
  };
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  try {
    const body = await req.json().catch(() => ({}));
    const audioB64 = String(body?.audio || "");
    const referenceText = String(body?.referenceText || "").trim();
    const mimeType = String(body?.mimeType || "audio/webm");
    // التطبيق هو مصدر الحقيقة في تقطيع الكلمات، فيرسلها معه ولا نكرّر المنطق هنا
    const targetWords: string[] = Array.isArray(body?.targetWords)
      ? body.targetWords.map((w: unknown) => String(w)).filter(Boolean)
      : [];
    if (!audioB64 || !referenceText) return jsonOut({ error: "missing_audio_or_reference" }, 400);

    const GROQ = Deno.env.get("GROQ_API_KEY");
    if (!GROQ) return jsonOut({ error: "not_configured", detail: "GROQ_API_KEY missing" }, 200);

    const audioBytes = base64ToBytes(audioB64);
    const ext = mimeType.includes("mp4") ? "mp4" : mimeType.includes("ogg") ? "ogg" : mimeType.includes("wav") ? "wav" : "webm";

    const form = new FormData();
    form.append("file", new Blob([audioBytes], { type: mimeType }), `audio.${ext}`);
    form.append("model", "whisper-large-v3");
    form.append("language", "en");
    form.append("temperature", "0");
    form.append("response_format", "verbose_json"); // يعيد no_speech_prob و avg_logprob

    const res = await fetch("https://api.groq.com/openai/v1/audio/transcriptions", {
      method: "POST", headers: { "Authorization": `Bearer ${GROQ}` }, body: form,
    });
    if (!res.ok) {
      return jsonOut({ error: "groq_error", status: res.status, detail: (await res.text()).slice(0, 400) }, 200);
    }
    const data = await res.json();
    const heard = String(data?.text || "").trim();

    // ثقة النسخ من Whisper نفسه بدل تخمينها من شكل النص
    const segs: any[] = Array.isArray(data?.segments) ? data.segments : [];
    const noSpeech = segs.length ? Math.min(...segs.map((s) => Number(s?.no_speech_prob ?? 0))) : 0;
    const avgLogprob = segs.length ? Math.max(...segs.map((s) => Number(s?.avg_logprob ?? 0))) : 0;
    const lowConfidence = !heard || (segs.length > 0 && (noSpeech > NO_SPEECH_MAX || avgLogprob < AVG_LOGPROB_MIN));
    const conf = { noSpeech, avgLogprob, segments: segs.length };

    if (lowConfidence) return jsonOut({ ok: true, heard, lowConfidence: true, conf });

    // الحَكَم اختياري: إن فشل لأي سبب يرجع التطبيق إلى مقارنته المحلّية بدل أن ينكسر
    let j: any = { err: "judge_skipped_no_target_words" };
    if (targetWords.length) {
      try { j = await judge(GROQ, targetWords, heard); } catch (e) { j = { err: "judge_threw", detail: String(e).slice(0, 200) }; }
    }
    if (j.err) return jsonOut({ ok: true, heard, conf, judgeError: j.err, judgeDetail: j.detail });
    return jsonOut({ ok: true, heard, conf, judged: j.judged, garbled: j.garbled, note: j.note, judgeModel: j.model });
  } catch (e) {
    return jsonOut({ error: "server_error", message: String(e).slice(0, 300) }, 500);
  }
});
