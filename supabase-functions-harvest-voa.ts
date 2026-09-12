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

// أقسام المستويات الثلاثة كما ترتّبها VOA نفسها
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
function articleLinks(html: string): string[] {
  const out = new Set<string>();
  for (const m of html.matchAll(/href="(\/a\/[^"#?]+?\.html)"/g)) {
    const u = safeUrl(m[1]);
    if (u) out.add(u);
  }
  return [...out];
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

  if (!LEVELS[level]) return jsonOut({ ok: false, error: "bad_level", allowed: Object.keys(LEVELS) }, 400);

  const SB = Deno.env.get("SUPABASE_URL") || "";
  const KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
  if (!SB || !KEY) return jsonOut({ ok: false, error: "no_service_key" }, 500);

  const idx = await get(LEVELS[level]);
  if (!idx.ok) return jsonOut({ ok: false, error: "index_failed", why: idx.why, level }, 502);

  const links = articleLinks(idx.html!).slice(0, limit);
  if (listOnly) return jsonOut({ ok: true, level, found: links.length, links });
  if (!links.length) return jsonOut({ ok: false, error: "no_links", level, hint: "قد يكون قالب الصفحة تغيّر" }, 502);

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
