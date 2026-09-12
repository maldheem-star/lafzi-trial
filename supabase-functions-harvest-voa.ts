// حصادُ نصوص VOA Learning English — **أداةُ تأليفٍ مؤقّتة لا ميزةُ تطبيق**.
//
// لماذا وُجدت أصلاً: بنكا الاستماع والمقروء يحتاجان ٨٠٨ عناصر تحت أرضيّة الثلاثين
//   يوماً (٤١٪ من العمل كلّه). وتأليفُ قطعةٍ وسؤالٍ معاً أبطأ بكثير من كتابة سؤالِ
//   فهمٍ على نصٍّ جاهز. ونصوص VOA Learning English **ملكٌ عامّ** — عملُ حكومةٍ
//   فدرالية أمريكية — ومدرَّجةٌ بثلاثة مستويات تقابل A2/B1/B2 تقريباً.
//
// ولماذا دالّةٌ أصلاً ولم تُجلَب مباشرةً: بيئةُ التطوير تحجب voanews.com كما تحجب
//   supabase.co (مُثبَتٌ بالتجربة، لا مفترَضاً). والقاعدةُ نفسها جُرِّبت بإضافة `http`
//   فتبيّن أن تثبيتها يمنح `anon` — ومفتاحه عامّ — تنفيذَ دوالّ الطلبات كلِّها، ولم
//   ينفذ الإبطال، فنُزعت. فبقي هذا المسار: الدالّة تجلب وتكتب في الجدول، والمؤلّف
//   يقرأ الجدول بالاستعلام الإداري.
//
// **حدودٌ مقصودة تُقال صراحةً:**
//   ١) **مقصورةٌ على مضيفٍ واحد** (`learningenglish.voanews.com`) في الشيفرة — فلا
//      تصير وكيلَ طلباتٍ عامّاً مهما مُرِّر إليها. وهذا هو الدرس المدفوع من تجربة
//      إضافة `http` قبل ساعة.
//   ٢) **لا تكتب إلّا في `voa_harvest`** — جدولٌ بـRLS مفعّلةٍ وصفرِ سياسات، فلا
//      يقرؤه `anon` ولا `authenticated`. والكتابة بمفتاح الخدمة من بيئة الدالّة.
//   ٣) **لا يمسّها الأبناء**: لا يستدعيها التطبيق في أيّ مسار. شرطُ «بنكٌ ثابتٌ بلا
//      توليد» يبقى بحرفه — هذه تعمل وقت بناء البنك لا وقت الجلسة.
//   ٤) **تُحذف بعد الحصاد** هي والجدول. ليست جزءاً دائماً من النظام.
//
// ولا نموذجَ لغةٍ هنا إطلاقاً: استخراجٌ من HTML بقواعد ثابتة. فما يدخل الجدول هو نصّ
//   VOA حرفياً، ويبقى الحكمُ على صلاحيته للمستوى للمؤلّف البشري.
import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};
const jsonOut = (o: unknown, status = 200) =>
  new Response(JSON.stringify(o, null, 2), {
    status,
    headers: { ...CORS, "Content-Type": "application/json; charset=utf-8" },
  });

// ===== القيد الأوّل والأهمّ: مضيفٌ واحد لا غير =====
const HOST = "learningenglish.voanews.com";
function safeUrl(raw: string): string | null {
  let u: URL;
  try { u = new URL(raw, "https://" + HOST + "/"); } catch (_e) { return null; }
  if (u.protocol !== "https:") return null;
  if (u.hostname !== HOST) return null;          // لا نطاقاتٍ فرعية ولا إعادةَ توجيه
  return u.toString();
}

// أقسام المستويات الثلاثة كما ترتّبها VOA نفسها.
// **وهذه أرقامٌ تُتحقَّق لا تُفترَض**: أوّل محاولةٍ حيّة (١٢ سبتمبر) عادت `http_404`
// على `/z/1582` — أي أن الموقع غيّر بنيته أو أرقامه. فوضع `probe=1` يقرأ الصفحة
// الرئيسة ويُعيد أقسامها الحقيقية بنصوص روابطها، فتُصحَّح هذه الخريطة من المصدر.
// و`path=` يسمح بتجربة قسمٍ بعينه — **مقيَّدٌ بالمضيف نفسه** عبر `safeUrl` كغيره.
const LEVELS: Record<string, string> = {
  "1": "https://" + HOST + "/z/1581",   // Level One  — Beginning
  "2": "https://" + HOST + "/z/1582",   // Level Two  — Intermediate
  "3": "https://" + HOST + "/z/1583",   // Level Three — Advanced
};

async function get(url: string): Promise<{ ok: boolean; html?: string; status?: number; why?: string }> {
  try {
    const ctl = new AbortController();
    const t = setTimeout(() => ctl.abort(), 20000);
    const res = await fetch(url, {
      signal: ctl.signal,
      redirect: "follow",
      headers: { "User-Agent": "Mozilla/5.0 (compatible; lafzi-harvest/1.0)" },
    });
    clearTimeout(t);
    if (!res.ok) return { ok: false, status: res.status, why: "http_" + res.status };
    // الإعادة قد تُخرجنا عن المضيف المسموح — يُتحقَّق من العنوان النهائي كذلك
    if (safeUrl(res.url) === null) return { ok: false, why: "redirected_off_host" };
    return { ok: true, html: await res.text() };
  } catch (e) { return { ok: false, why: "fetch_failed:" + String((e as Error)?.message || e).slice(0, 120) }; }
}

const strip = (s: string) =>
  s.replace(/<script[\s\S]*?<\/script>/gi, " ")
   .replace(/<style[\s\S]*?<\/style>/gi, " ")
   .replace(/<[^>]+>/g, " ")
   .replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&quot;/g, '"')
   .replace(/&#39;|&rsquo;/g, "'").replace(/&lsquo;/g, "'")
   .replace(/&ldquo;|&rdquo;/g, '"').replace(/&mdash;/g, "—").replace(/&hellip;/g, "…")
   .replace(/&[a-z]+;/gi, " ")
   .replace(/\s+/g, " ").trim();

// روابط المقالات من صفحة القسم: VOA تستعمل /a/<slug>/<id>.html
// **والمطلق مقبولٌ كالنسبيّ** — `safeUrl` هو الحارس لا شكلُ الرابط، فالقالب قد
// يكتبها بالمضيف كاملاً؛ ورفضُها لشكلها كان سيُخرج الحصاد فارغاً بلا سبب.
function articleLinks(html: string): string[] {
  const out = new Set<string>();
  for (const m of html.matchAll(/href="((?:https:\/\/[^"]*?)?\/a\/[^"#?]+?\.html)"/g)) {
    const u = safeUrl(m[1]);
    if (u) out.add(u);
  }
  return [...out];
}

// اكتشافُ الأقسام من الموقع نفسه بدل تخمين أرقامها — الصفحةُ الرئيسة تحمل روابط
// أقسامها ونصوصَها، فيُقرأ منها ما تغيّر.
function sectionLinks(html: string): { url: string; text: string }[] {
  const seen = new Map<string, string>();
  for (const m of html.matchAll(/<a[^>]+href="((?:https:\/\/[^"]*?)?\/z\/\d+[^"#?]*)"[^>]*>([\s\S]*?)<\/a>/gi)) {
    const u = safeUrl(m[1]);
    if (!u) continue;
    const t = strip(m[2]).slice(0, 80);
    if (!seen.has(u) || (!seen.get(u) && t)) seen.set(u, t);
  }
  return [...seen.entries()].map(([url, text]) => ({ url, text }));
}

// نصّ المقال: VOA تضع المتن في <div class="wsw"> — ونسقط إلى الوصف إن تغيّر القالب
function articleText(html: string): { title: string; body: string; audio: string; published: string } {
  const pick = (re: RegExp) => { const m = html.match(re); return m ? strip(m[1]) : ""; };
  const title =
    pick(/<meta property="og:title" content="([^"]*)"/i) ||
    pick(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
  const published = pick(/<meta property="article:published_time" content="([^"]*)"/i);
  const audioM = html.match(/https:\/\/[^"' ]+\.mp3/i);
  const audio = audioM ? audioM[0] : "";
  let body = "";
  const wsw = html.match(/<div[^>]*class="[^"]*\bwsw\b[^"]*"[^>]*>([\s\S]*?)<\/div>\s*<\/div>/i);
  if (wsw) body = strip(wsw[1]);
  if (body.length < 200) {
    // احتياطٌ: جمعُ الفقرات داخل جسم المقال
    const ps = [...html.matchAll(/<p>([\s\S]*?)<\/p>/gi)].map((m) => strip(m[1])).filter((s) => s.length > 40);
    if (ps.join(" ").length > body.length) body = ps.join("\n\n");
  }
  // ذيولٌ ثابتة تضعها VOA في آخر كل مقال ولا تخصّ النصّ
  body = body.replace(/\s*_{3,}[\s\S]*$/, "").replace(/\s*Words in This Story[\s\S]*$/i, "").trim();
  return { title, body, audio, published };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });

  const u = new URL(req.url);
  const level = (u.searchParams.get("level") || "2").trim();
  const limit = Math.min(parseInt(u.searchParams.get("limit") || "8", 10) || 8, 25);
  const listOnly = u.searchParams.get("list") === "1";
  const pathArg = (u.searchParams.get("path") || "").trim();

  const SB0 = Deno.env.get("SUPABASE_URL") || "";
  const KEY0 = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

  // كتابةُ صفٍّ واحد في نفس الجدول — لا جدولَ ثانٍ ولا مسارَ مفاتيح ثانٍ.
  const putRow = (row: Record<string, unknown>) =>
    fetch(`${SB0}/rest/v1/voa_harvest?on_conflict=url`, {
      method: "POST",
      headers: {
        apikey: KEY0, Authorization: `Bearer ${KEY0}`,
        "Content-Type": "application/json", Prefer: "resolution=merge-duplicates,return=minimal",
      },
      body: JSON.stringify([row]),
    });

  // وضعُ الاستكشاف: يقرأ الصفحة الرئيسة ويُعيد أقسامها كما هي اليوم — يُستعمل حين
  // يعود `index_failed` فلا تُخمَّن أرقامٌ جديدة بل تُقرأ من المصدر.
  // **ويكتب نتيجته في الجدول** لأن بيئة التأليف محجوبةٌ عن هذه الدالّة (مُثبَتٌ:
  // `CONNECT tunnel failed, 403`)، فلا تُقرأ إلّا بالاستعلام الإداري — وإلّا صار
  // كل فحصٍ يعتمد على نسخِ إنسانٍ ما يراه، وهو بعينه ما ينهى عنه المشروع.
  if (u.searchParams.get("probe") === "1") {
    const home = await get("https://" + HOST + "/");
    if (!home.ok) return jsonOut({ ok: false, error: "home_failed", why: home.why }, 502);
    const secs = sectionLinks(home.html!);
    const out = { ok: true, mode: "probe", host: HOST, sections: secs, configured: LEVELS,
      note: "قابِل هذه بأقسام LEVELS — أيُّ اختلافٍ يعني أن الموقع غيّر أرقامه." };
    let saved = false;
    if (SB0 && KEY0) {
      try {
        const r = await putRow({ url: "probe://sections", level: "probe", title: "probe " + new Date().toISOString(),
          body: JSON.stringify(secs), words: secs.length });
        saved = r.ok;
      } catch (_e) { saved = false; }
    }
    return jsonOut({ ...out, saved_to_table: saved });
  }

  let indexUrl: string;
  if (pathArg) {
    const safe = safeUrl(pathArg);          // المضيف مقفلٌ هنا كما في كل مسار
    if (!safe) return jsonOut({ ok: false, error: "bad_path", host: HOST }, 400);
    indexUrl = safe;
  } else {
    if (!LEVELS[level]) return jsonOut({ ok: false, error: "bad_level", allowed: Object.keys(LEVELS) }, 400);
    indexUrl = LEVELS[level];
  }

  const SB = SB0, KEY = KEY0;
  if (!SB || !KEY) return jsonOut({ ok: false, error: "no_service_key" }, 500);

  // كلُّ خروجٍ يُكتب في الجدول كذلك — **لا حالة فشلٍ تُعرض ولا تُسجَّل**، وهي قاعدةٌ
  // مدفوعة الثمن في هذا المشروع. وبلاها يبقى كل تشخيصٍ معلَّقاً على أن يَنسخ إنسانٌ
  // ما رآه على شاشته.
  const note = async (tag: string, payload: unknown) => {
    try { await putRow({ url: "probe://" + tag, level: "probe", title: tag + " " + new Date().toISOString(),
      body: JSON.stringify(payload), words: 0 }); } catch (_e) { /* التسجيل لا يكون نقطة عطل */ }
  };

  const idx = await get(indexUrl);
  if (!idx.ok) {
    await note("index_failed", { why: idx.why, level, url: indexUrl });
    return jsonOut({ ok: false, error: "index_failed", why: idx.why, level, url: indexUrl,
      hint: "أضِف ?probe=1 لقراءة أقسام الموقع الحقيقية بدل تخمين رقمٍ آخر." }, 502);
  }

  const links = articleLinks(idx.html!).slice(0, limit);
  if (listOnly) {
    await note("list", { level, url: indexUrl, found: links.length, links });
    return jsonOut({ ok: true, level, url: indexUrl, found: links.length, links });
  }
  if (!links.length) {
    // نصٌّ من الصفحة نفسها يُعين على معرفة أيّ قالبٍ وصل — بلا شيفرة، مقصوصاً
    await note("no_links", { level, url: indexUrl, sample: strip(idx.html!).slice(0, 600) });
    return jsonOut({ ok: false, error: "no_links", level, url: indexUrl,
      hint: "الصفحة وصلت بلا روابط مقالات — القالب تغيّر. جرّب ?probe=1." }, 502);
  }

  const rows: Record<string, unknown>[] = [];
  const skipped: { url: string; why: string }[] = [];
  for (const link of links) {
    const r = await get(link);
    if (!r.ok) { skipped.push({ url: link, why: r.why || "?" }); continue; }
    const a = articleText(r.html!);
    const words = a.body ? a.body.split(/\s+/).length : 0;
    // نصٌّ أقصر من ٨٠ كلمة ليس مقالاً — الأرجح أنه صفحةُ فهرسٍ أو قالبٌ تغيّر
    if (words < 80) { skipped.push({ url: link, why: "too_short:" + words }); continue; }
    rows.push({ url: link, level, title: a.title, body: a.body, audio_url: a.audio, published: a.published, words });
  }

  if (!rows.length) return jsonOut({ ok: false, error: "nothing_extracted", tried: links.length, skipped }, 502);

  // الكتابة بمفتاح الخدمة — يتجاوز RLS، ولا يُمرَّر إلى العميل أبداً.
  // on_conflict على url: تشغيلٌ ثانٍ يُحدّث ولا يُكرّر.
  const ins = await fetch(`${SB}/rest/v1/voa_harvest?on_conflict=url`, {
    method: "POST",
    headers: {
      apikey: KEY, Authorization: `Bearer ${KEY}`,
      "Content-Type": "application/json", Prefer: "resolution=merge-duplicates,return=minimal",
    },
    body: JSON.stringify(rows),
  });
  if (!ins.ok) {
    return jsonOut({ ok: false, error: "insert_failed", status: ins.status, detail: (await ins.text()).slice(0, 300) }, 502);
  }

  return jsonOut({
    ok: true, level, saved: rows.length, skipped: skipped.length,
    words: { min: Math.min(...rows.map((r) => r.words as number)), max: Math.max(...rows.map((r) => r.words as number)) },
    withAudio: rows.filter((r) => r.audio_url).length,
    titles: rows.map((r) => r.title),
    note: "النصوص محفوظةٌ في voa_harvest — تُقرأ بالاستعلام الإداري لا من العميل.",
  });
});
