// تقييم النطق عبر Azure AI Speech — Pronunciation Assessment.
//
// الفرق عن Groq/Whisper: Whisper يَنسخ ما سمعه ثم نحكم نحن على النصّ، فأقصى ما نعرفه
//   «قالت الكلمة أو لم تقلها». Azure يُقيّم الصوت نفسه ويُعطي درجة لكل صوت (فونيم) داخل
//   الكلمة — أي يقول لها «الـ th في think خرجت s» بدل «خطأ». هذا هو سبب الربط كلّه.
//
// قيد تقني حَكَم التصميم: نقطة REST القصيرة في Azure لا تقبل WebM ولا MP4 — تقبل
//   WAV/PCM أو OGG-Opus فقط. والمتصفّح يسجّل WebM (أندرويد) أو MP4/AAC (آيفون).
//   فالحلّ أن يسجّل التطبيق PCM خاماً عبر Web Audio ويبني WAV بنفسه (16 kHz أحادي).
//   لذلك تتوقّع هذه الدالة WAV جاهزاً، وترفض غيره برسالة صريحة لا بخطأ غامض من Azure.
//
// المفتاح والمنطقة يُقرآن من أسرار المشروع (AZURE_SPEECH_KEY / AZURE_SPEECH_REGION)
//   ولا يُمرَّران من العميل أبداً.
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

// نتحقّق من ترويسة RIFF/WAVE بأنفسنا: خطأ «هذا ليس WAV» أوضح ألف مرة من 400 مبهم من Azure
function wavInfo(b: Uint8Array): { ok: boolean; why?: string; rate?: number; channels?: number; bits?: number } {
  if (b.length < 44) return { ok: false, why: "too_short" };
  const s = (i: number, n: number) => String.fromCharCode(...b.slice(i, i + n));
  if (s(0, 4) !== "RIFF" || s(8, 4) !== "WAVE") return { ok: false, why: "not_riff_wave" };
  const dv = new DataView(b.buffer, b.byteOffset, b.byteLength);
  // نمشي على الأجزاء (chunks) بدل افتراض أن fmt يبدأ عند 12 — بعض المُرمِّزات تُدرج LIST قبله
  let p = 12, fmt: { rate: number; channels: number; bits: number; format: number } | null = null, sawData = false;
  while (p + 8 <= b.length) {
    const id = s(p, 4), size = dv.getUint32(p + 4, true);
    if (id === "fmt " && p + 8 + 16 <= b.length) {
      fmt = {
        format: dv.getUint16(p + 8, true),
        channels: dv.getUint16(p + 10, true),
        rate: dv.getUint32(p + 12, true),
        bits: dv.getUint16(p + 22, true),
      };
    } else if (id === "data") { sawData = size > 0 || p + 8 < b.length; }
    p += 8 + size + (size % 2);
  }
  if (!fmt) return { ok: false, why: "no_fmt_chunk" };
  if (!sawData) return { ok: false, why: "no_audio_data" };
  if (fmt.format !== 1) return { ok: false, why: "not_pcm" };
  return { ok: true, rate: fmt.rate, channels: fmt.channels, bits: fmt.bits };
}

type Phoneme = { p: string; score: number };
type WordOut = { w: string; score: number; err: string; phonemes: Phoneme[] };

// أسوأ الأصوات: ما نعرضه لها فعلاً. بلا هذا تبقى Azure مجرّد رقم آخر.
function weakest(words: WordOut[], limit = 3): { w: string; p: string; score: number }[] {
  const all: { w: string; p: string; score: number }[] = [];
  for (const w of words) for (const ph of w.phonemes) all.push({ w: w.w, p: ph.p, score: ph.score });
  return all.filter((x) => x.score < 60).sort((a, b) => a.score - b.score).slice(0, limit);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  try {
    const body = await req.json().catch(() => ({}));
    const audioB64 = body.audio as string | undefined;
    const referenceText = String(body.referenceText || "").trim();
    if (!audioB64 || !referenceText) return jsonOut({ error: "missing_audio_or_reference" }, 400);

    const KEY = (Deno.env.get("AZURE_SPEECH_KEY") || "").trim();
    // التقليم مقصود: لصق القيمة في لوحة الأسرار يجرّ معه مسافة أو سطراً جديداً كثيراً، فيصير
    // اسم المضيف غير قابل للحلّ ويرمي fetch استثناءً غامضاً بدل أن يردّ Azure بخطأ مفهوم
    const REGION_RAW = Deno.env.get("AZURE_SPEECH_REGION") || "";
    const REGION = REGION_RAW.trim().toLowerCase();
    // 200 لا 500: انعدام المفتاح ليس عطلاً، بل إشارة للتطبيق أن يرجع إلى Groq بلا ضجيج
    if (!KEY) return jsonOut({ error: "not_configured", detail: "AZURE_SPEECH_KEY missing" });
    if (!REGION) return jsonOut({ error: "not_configured", detail: "AZURE_SPEECH_REGION missing" });
    // مناطق Azure أحرفٌ صغيرة وأرقام بلا فراغ. ما عداه يُنتج مضيفاً لا يُحَلّ، فنقولها صراحةً
    if (!/^[a-z][a-z0-9]+$/.test(REGION)) {
      return jsonOut({ error: "azure_bad_region", detail: `قيمة المنطقة غير صالحة`,
        region: REGION, rawLength: REGION_RAW.length, trimmedLength: REGION.length });
    }

    const bytes = base64ToBytes(audioB64);
    const info = wavInfo(bytes);
    if (!info.ok) return jsonOut({ error: "bad_audio", detail: info.why, bytes: bytes.length });

    const assessment = {
      ReferenceText: referenceText,
      GradingSystem: "HundredMark",
      Granularity: "Phoneme",
      Dimension: "Comprehensive",
      EnableMiscue: true,
    };
    const url = `https://${REGION}.stt.speech.microsoft.com/speech/recognition/conversation/cognitiveservices/v1`
      + `?language=en-US&format=detailed`;

    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 20000);
    let res: Response;
    try {
      res = await fetch(url, {
        method: "POST",
        headers: {
          "Ocp-Apim-Subscription-Key": KEY,
          "Content-Type": `audio/wav; codecs=audio/pcm; samplerate=${info.rate}`,
          "Pronunciation-Assessment": btoa(JSON.stringify(assessment)),
          "Accept": "application/json",
        },
        body: bytes,
        signal: ctrl.signal,
      });
    } catch (e) {
      clearTimeout(t);
      const aborted = String(e).includes("abort");
      return jsonOut({ error: aborted ? "azure_timeout" : "azure_unreachable",
        detail: String(e).slice(0, 160), region: REGION,
        rawLength: REGION_RAW.length, trimmedLength: REGION.length, host: `${REGION}.stt.speech.microsoft.com` });
    }
    clearTimeout(t);

    if (!res.ok) {
      const detail = (await res.text()).slice(0, 300);
      // نُفرّق الأسباب: المفتاح والمنطقة والحصّة علاجها مختلف تماماً
      const kind = res.status === 401 || res.status === 403 ? "azure_auth"
        : res.status === 429 ? "azure_quota"
        : res.status === 400 ? "azure_bad_request"
        : "azure_http";
      return jsonOut({ error: kind, status: res.status, detail, region: REGION });
    }

    const j = await res.json();
    const status = String(j.RecognitionStatus || "");
    if (status !== "Success") {
      // NoMatch / InitialSilenceTimeout: لم تتكلّم أو الصوت بعيد — ليس عطلاً في الربط
      return jsonOut({ ok: true, noSpeech: true, recognitionStatus: status, heard: "" });
    }
    const best = (j.NBest && j.NBest[0]) || {};
    const pa = best.PronunciationAssessment || {};
    const words: WordOut[] = (best.Words || []).map((w: Record<string, unknown>) => {
      const wpa = (w.PronunciationAssessment || {}) as Record<string, unknown>;
      return {
        w: String(w.Word || ""),
        score: Math.round(Number(wpa.AccuracyScore ?? 0)),
        err: String(wpa.ErrorType || "None"),
        phonemes: ((w.Phonemes || []) as Record<string, unknown>[]).map((p) => ({
          p: String(p.Phoneme || ""),
          score: Math.round(Number((p.PronunciationAssessment as Record<string, unknown> || {}).AccuracyScore ?? 0)),
        })),
      };
    });

    return jsonOut({
      ok: true,
      engine: "azure",
      heard: String(best.Display || j.DisplayText || ""),
      lexical: String(best.Lexical || ""),
      pron: Math.round(Number(pa.PronScore ?? 0)),
      accuracy: Math.round(Number(pa.AccuracyScore ?? 0)),
      fluency: Math.round(Number(pa.FluencyScore ?? 0)),
      completeness: Math.round(Number(pa.CompletenessScore ?? 0)),
      words,
      weak: weakest(words),
      audio: { rate: info.rate, channels: info.channels, bits: info.bits, bytes: bytes.length },
    });
  } catch (e) {
    return jsonOut({ error: "server_error", message: String(e).slice(0, 300) }, 500);
  }
});
