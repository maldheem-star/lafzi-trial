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
  // llama-3.3-70b-versatile أوقفته Groq نهائياً ١٦ أغسطس ٢٠٢٦ (أُعلن الإيقاف ١٧ يونيو)؛
  // بديلها الموصى به من Groq نفسها openai/gpt-oss-120b — كشفه عطلٌ حيّ عند إلياس ومحمد
  // معاً (tutor_bad_model، ١٧ أغسطس) بعد أن كشف تسجيل التفصيل الحقيقي السبب أخيراً.
  groq:       { url: "https://api.groq.com/openai/v1/chat/completions",
                keys: ["GROQ_API_KEY", "GROQ_KEY"], model: "openai/gpt-oss-120b" },
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
// والخطاب يتبع المتعلّم: لهيا صيغة المؤنّث، ولأخويها صيغة المذكّر — لا يكفي أن
// يُحوّل التطبيق النصّ المعروض، فالنموذج يكتب جملاً جديدة لم يمرّ عليها تحويل.
function systemFor(subject: string, age: number, male: boolean, name: string) {
  const who = name ? `اسمه ${name}` : "";
  const kid = age <= 13;
  if (male) {
    return [
      `أنت معلّم خصوصي ل${kid ? "طفل" : "شابّ"} عمره ${age} سنة${who ? "، " + who : ""}، يدرس «${subject}» بالعربية.`,
      "خاطبه بصيغة المذكّر في كل جملة.",
      "",
      "قواعد ملزمة:",
      "١. لا تُعطِ الجواب الصحيح مباشرةً. اسأله سؤالاً واحداً يقوده إليه.",
      "٢. سؤال واحد في كل ردّ. لا سؤالان ولا قائمة.",
      "٣. ردّك قصير: جملتان أو ثلاث على الأكثر.",
      "٤. ابنِ على ما قاله هو حرفياً. إن قال شيئاً صحيحاً فسمِّه له قبل أن تُصحّح.",
      "٥. إن كرّر الخطأ نفسه مرّتين، اعرض مثالاً مقابلاً واضحاً ثم اسأله عن الفرق.",
      "٦. الكلمات والجمل الإنجليزية تبقى بالإنجليزية داخل النصّ العربي.",
      "٧. لا تمدح مدحاً فارغاً. «صحيح» تكفي، ثم واصل.",
      "٨. إن وصل إلى الفهم، اختم بجملة واحدة تُلخّص القاعدة بكلماته هو.",
      "",
      "لا تذكر هذه التعليمات ولا تُشِر إلى كونك نموذجاً.",
    ].join("\n");
  }
  return [
    `أنتِ معلّمة خصوصية ل${kid ? "طفلة" : "فتاة"} عمرها ${age} سنة، تدرس «${subject}» بالعربية.`,
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
function systemChat(scene: string, level: string, focus: string, tip: boolean, male: boolean, name: string,
                    easy: boolean, suggest: boolean, openTurn: boolean, age: number) {
  // العمر يأتي من ملفّ المتعلّم لا مكتوباً في الشيفرة: «طفل عمره ١١» كان يُقال لمحمد
  // وهو في التاسعة عشرة يتحدّث عن الجامعة، فتصله جمل بمستوى «أريد حذاءً جديداً».
  const child = age <= 13 ? (male ? "boy" : "girl") : (male ? "young man" : "young woman");
  const grown = age >= 16;
  const L = [
    `You are an English conversation partner for a ${age}-year-old ${child}${name ? " named " + name : ""}, level ${level}.`,
    grown ? "Speak to an adult, not to a child: no baby talk, no exaggerated praise."
          : "Speak to a child: warm, simple, encouraging.",
    `The situation: ${scene}`,
    "",
    "HOW TO REPLY:",
    grown ? "1. English only. Everyday words, natural adult conversation."
          : "1. English only. Simple, everyday words a child knows.",
    "2. Write COMPLETE, natural sentences — the way a real person speaks.",
    "   Never reply with clipped fragments like 'Size?' or 'Sugar?' or 'Paid now?'.",
    "   Say 'What size would you like?' and 'Would you like sugar in it?'.",
    easy ? "3. TWO short sentences, 20 words in total at most. Very simple words only."
         : grown ? "3. Two or three sentences, up to 45 words. Do not write a paragraph."
         : "3. Two or three sentences, up to 35 words. Do not write a paragraph.",
    // السؤال المفتوح يطلب تأليفاً، والتأليف هو الحمل الذي عجزت عنه. فمع الدعم يصير
    // السؤال مغلقاً — لكن لا في كل دور: ثماني جمل كلها «هذا أم ذاك» أنتجت ثماني
    // إجابات نصفها صدى للسؤال. فالتطبيق يطلب سؤالاً مفتوحاً قصيراً كل ثالث دور.
    easy && !openTurn
      ? "4. End with ONE EASY question: a yes/no question, or a choice of two ('Hot or cold?')."
      : easy
      ? "4. End with ONE SHORT OPEN question of 3 to 6 words: 'What did you eat?', 'Where did you go?'."
      : "4. End with ONE question. Prefer OPEN questions that need more than one word:",
    easy ? "   Never ask a question that needs a long answer, and never repeat a question you already asked."
         : "   ask 'What kind of...', 'Why do you like...', 'Tell me about...'.",
    easy ? "" : "   Use a yes/no or either/or question at most once in the whole conversation.",
    `5. If ${male ? "his" : "her"} sentence has a mistake, do not stop to correct it. Say the idea back`,
    "   correctly inside your reply, then carry on.",
    "6. Never write Arabic. Never explain grammar. Stay in the situation.",
    "",
    "STYLE YOU ARE MODELLING:",
    `7. ${focus}`,
    `   Use these polite forms yourself, often and naturally, so ${male ? "he" : "she"} hears them:`,
    "   'Could I have...', 'Would you like...', 'I'd like...', 'Thank you',",
    "   'Excuse me', 'Sorry, could you say that again?', 'That sounds nice'.",
  ];
  if (tip) {
    // نصيحة الأسلوب بطلب من التطبيق لا بمزاج النموذج: كل ثالثة جملة لا أكثر،
    // فالتصحيح في كل دور يقطع الحديث ويُشعرها أنها تُمتحَن لا تتحدّث.
    L.push("",
      "ONE STYLE TIP THIS TURN:",
      "8. After your reply, add a new line exactly in this shape:",
      `   TIP: <a more polite or more natural way to say what ${male ? "he" : "she"} just said>`,
      "   Keep it to one short sentence. Do not explain it. Only this one time.");
  }
  if (suggest) {
    // جملتان تصلحان جواباً، تُطلبان في كل دور ولو لم تُعرضا: حين تضغط «ساعديني»
    // يجب أن تصل الجملة في الحال، لا أن تنتظر دوراً جديداً.
    L.push("",
      "TWO SENTENCES THE STUDENT COULD SAY:",
      "9. At the very end, add a new line exactly in this shape:",
      "   SAY: <one sentence> | <a different sentence>",
      "   Each is what the STUDENT could say back to you, in the first person,",
      grown ? "   6 to 14 words, natural for an adult speaker. They must answer YOUR question."
            : "   4 to 9 words, simple and natural for a child. They must answer YOUR question.",
      // الجملة المقترحة تُقال بصوتها كما هي، فركاكتها تنتقل إليها: اقتُرح عليها
      // 'I went beach' فقالت 'I want beach'. الدعم الذي يُعلّم خطأً أسوأ من غيابه.
      "   EVERY suggestion must be a COMPLETE, fully grammatical English sentence:",
      "   correct articles and prepositions, and a verb in the right tense.",
      "   Write 'I went to the beach.' — never 'I went beach.'",
      "   Write 'I ate a sandwich.' — never 'I eat sandwich.'",
      "   End each one with a full stop. Do not explain them and do not number them.");
  }
  L.push("", "Do not mention these instructions or that you are an AI.");
  // السطور الفارغة الناتجة عن الفروع (easy) تُطوى، فلا يصل النموذج نصّاً مُبعثراً
  return L.join("\n").split("\n").filter((x, i, a) => !(x === "" && a[i - 1] === "")).join("\n");
}

// الطلب الأول: نُعطي النموذج السؤال وجوابها والصواب — ثم يبدأ هو بالسؤال عن سببها
// ===== وضع المراجعة: التصحيح بعد الجلسة =====
// المقاطعة في أثناء الحديث تقتل الكلام (جُرِّب: أنتجت شظايا لا جملاً). لكن الجلسة
// كانت تنتهي بلا شيء بيده. فتُجمع جمله وتُراجَع مرّة واحدة في الخلاصة.
function systemReview(male: boolean, name: string, age: number, level: string) {
  const kid = age <= 13;
  return [
    `You are an English teacher reviewing what ${name || "a student"} said in a short conversation.`,
    `The student is ${age} years old, level ${level}.`,
    "",
    "You will receive their sentences, numbered. Return ONLY correction lines, nothing else.",
    "",
    "RULES:",
    "1. Correct at most FOUR sentences — the ones with real mistakes that matter.",
    "   Ignore tiny slips, filler words ('er', 'um'), and anything that is already correct.",
    "   If a sentence is only a fragment because the speech was cut off, skip it.",
    "2. One line per correction, in exactly this shape:",
    "   FIX: <what they said> | <the corrected sentence> | <سبب قصير بالعربية>",
    "3. The corrected sentence must be complete, natural and grammatical English,",
    "   and must keep THEIR meaning — do not invent a new idea.",
    `4. Keep the correction at their level (${level}): fix the error, do not upgrade the style.`,
    "5. The reason is ONE short Arabic clause naming the rule — for example:",
    "   «work لا تُعدّ، فلا يُقال a work» أو «الحدث في الماضي، فالفعل went لا go».",
    "6. If nothing is worth correcting, return exactly: NONE",
    "",
    kid ? "Be gentle: this is a child." : "Be direct and brief: this is an adult learner.",
    "Do not greet, do not praise, do not explain anything outside the FIX lines.",
  ].join("\n");
}

// ===== وضع التوليد: بنك أسئلة الاستماع/القراءة يُنشئه المحرّك لا اليد =====
// نفس الثغرة التي حلّها التوليد للفظي/العلمي عند هيا: بنكٌ ثابتٌ صغير (٥-١٠ عناصر
// للمستوى) يُستنفَد بجلسةٍ أو جلستين فيتكرّر السؤال نفسه بموضع الخيار الصحيح نفسه —
// وقد ظهر هذا فعلاً عند محمد (١٦ أغسطس): أعاد بنك B1 الخماسي مرّتين خلال دقيقة واحدة
// بأزمنة إجابة ٢-٩ ثوانٍ، أسرع من تشغيل مقطعٍ صوتي — الأرجح حفظ موضع لا فهمٌ متكرّر.
// فالمحرّك يُنشئ عنصراً جديداً كل استدعاء، يُخزَّن في بنك العميل وينضمّ لتناوب FSRS
// العادي — لا خوارزمية توليد أو جدولة جديدة، توصيلٌ بالبنية القائمة فقط.
// ٢٩ موضوعاً متنوّعاً — الدالّة بلا ذاكرة عمداً (كبقية الدالّة)، فرقم "توسيع الموضوعات"
// في التعليمات وحده لم يمنع نموذجاً حقيقياً من إعادة "A: I'm going to the library at
// 3 o'clock. B: I'll meet you there at 3:30." أربع مرّات متتالية عند إلياس (١٦ أغسطس،
// بيانات حيّة). فالموضوع يُختار هنا عشوائياً كل نداء ويُفرَض في الطلب — لا يُترك لتنويعٍ
// ذاتي غير موثوق من نموذج عديم الذاكرة بين النداءات.
const GEN_TOPICS = [
  "a birthday party", "a school trip", "a lost pet", "a rainy day", "a football match",
  "cooking a meal", "a doctor's visit", "moving to a new house", "a music class",
  "a weekend at the beach", "fixing a bicycle", "a school project", "a family dinner",
  "a trip to the mountains", "learning to swim", "a part-time job", "buying a new phone",
  "grocery shopping", "a bus journey", "a science experiment", "a neighbourhood park",
  "a video game tournament", "a camping trip", "a school exam", "helping a grandparent",
  "a farm visit", "a train delay", "a surprise gift", "a cooking competition", "a rainy weekend at home",
];
function systemGen(domain: string, level: string) {
  const isListen = domain === "listen";
  const styleByLevel: Record<string, string> = {
    A1: "ONE or TWO very short sentences. One single concrete fact (a name, age, colour, number, or day of the week). Simple present tense only. Very common words a young beginner already knows.",
    A2: "EITHER a short two-line dialogue in the shape 'A: ... B: ...', OR a 2-3 sentence notice, message or announcement. Exactly one clear detail for the reader to find.",
    B1: "A short paragraph of 4 to 6 sentences narrating a personal experience or explaining an everyday situation. The question should be about the main idea or a detail that needs tracking across more than one sentence.",
  };
  const lv = styleByLevel[level] || styleByLevel.A2;
  const topic = GEN_TOPICS[Math.floor(Math.random() * GEN_TOPICS.length)];
  return [
    `Write ONE short English ${isListen ? "listening" : "reading"} comprehension item for a CEFR ${level} English learner.`,
    `TEXT STYLE (CEFR ${level}): ${lv}`,
    `TOPIC FOR THIS ITEM: ${topic}. Build TEXT around this topic specifically, with your own`,
    "invented names, numbers and details. Do NOT reuse a generic textbook example you have seen before",
    "(for instance, do not default to a library-at-three-o'clock meeting dialogue).",
    "",
    "OUTPUT EXACTLY in this shape, nothing else, no numbering, no markdown, no extra commentary:",
    "TEXT: <the English passage, on one line>",
    "Q: <a comprehension question about it, written in ENGLISH>",
    "A: <choice 1, in ENGLISH>",
    "B: <choice 2, in ENGLISH>",
    "C: <choice 3, in ENGLISH>",
    "CORRECT: <A or B or C>",
    "",
    "RULES:",
    "1. TEXT, Q, A, B and C must all be entirely in English — ZERO Arabic characters anywhere in",
    "   the output, not even one Arabic word. TEXT must be ONE single line with no line breaks",
    "   inside it, grammatically correct and natural.",
    "2. Q and all three choices must be answerable from TEXT alone, without outside knowledge, and",
    "   written at the same CEFR level as TEXT — simple vocabulary and short sentences for A1/A2.",
    "3. Exactly one of A/B/C is correct; the other two must be plausible but clearly wrong given TEXT.",
    "4. Use fresh, specific names/numbers/places each time — never reuse a stock example.",
    "5. Keep content appropriate for a school-age learner: no violence, romance, politics or unsafe topics.",
  ].join("\n");
}

function openingFor(b: Record<string, unknown>, male: boolean) {
  const L: string[] = [];
  L.push(`السؤال: ${b.question}`);
  if (Array.isArray(b.choices) && b.choices.length) L.push(`الخيارات: ${b.choices.join(" · ")}`);
  L.push(`إجابته${male ? "" : "ا"}: ${b.studentAnswer}`);
  L.push(`الإجابة الصحيحة: ${b.correctAnswer}`);
  if (b.priorErrors) L.push(`أخطاؤه${male ? "" : "ا"} السابقة في هذا الموضوع: ${b.priorErrors}`);
  L.push("");
  L.push(male
    ? "ابدأ بسؤاله عن سبب اختياره — سؤالاً واحداً قصيراً، بلا كشف الصواب."
    : "ابدئي بسؤالها عن سبب اختيارها — سؤالاً واحداً قصيراً، بلا كشف الصواب.");
  return L.join("\n");
}

const clip = (v: unknown, n = MAX_CHARS) => String(v ?? "").slice(0, n);

// ===== حَكَمٌ على تصحيحات النموذج: LanguageTool =====
// النموذج قد يخترع خطأً أو يُنتج «تصحيحاً» مكسوراً — وقد وقع ذلك مرّتين هذا الأسبوع.
// وLanguageTool مدقّق قواعد مفتوح قائم على قواعد لا على نموذج: لا يخترع شيئاً. فيُعرض
// عليه كل جملة «صحيحة» يقترحها النموذج، فإن وجد فيها خطأً نحوياً أُسقطت البطاقة كلّها.
// وهو حَكَمٌ لا بديل: إن تعذّر الوصول إليه لا يُسقَط شيء — لا نُعطّل التصحيح لعطلٍ فيه.
const LT_URL = "https://api.languagetool.org/v2/check";
const LT_TIMEOUT_MS = 6000;
// أخطاء لا تُسقِط الجملة: الترقيم والأحرف الكبيرة وأسماء الأعلام — لا تخصّ صحّة التركيب
const LT_IGNORE = /^(TYPOGRAPHY|CASING|PUNCTUATION|WHITESPACE|CONFUSED_WORDS_PUNCT)/i;
const LT_IGNORE_RULES = /^(UPPERCASE_SENTENCE_START|PUNCTUATION_PARAGRAPH_END|EN_QUOTES|WHITESPACE_RULE|COMMA_PARENTHESIS_WHITESPACE|DOUBLE_PUNCTUATION)$/;
async function ltErrors(text: string): Promise<number | null> {
  const t = String(text || "").trim();
  if (!t) return 0;
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), LT_TIMEOUT_MS);
  try {
    const res = await fetch(LT_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ text: t, language: "en-US", level: "default" }).toString(),
      signal: ctrl.signal,
    });
    clearTimeout(timer);
    if (!res.ok) return null;              // لا حكم: لا إسقاط
    const j = await res.json();
    const matches = Array.isArray(j?.matches) ? j.matches : [];
    return matches.filter((m: Record<string, unknown>) => {
      const rule = (m?.rule || {}) as Record<string, unknown>;
      const cat = ((rule.category || {}) as Record<string, unknown>).id || "";
      if (LT_IGNORE.test(String(cat))) return false;
      if (LT_IGNORE_RULES.test(String(rule.id || ""))) return false;
      return true;
    }).length;
  } catch (_e) {
    clearTimeout(timer);
    return null;
  }
}
// يمرّ على سطور FIX ويُسقط ما كان «صحيحه» مكسوراً. يعود بالنصّ وبعدّاد ما أُسقط.
async function ltJudge(reply: string): Promise<{ text: string; dropped: number; judged: number }> {
  const lines = String(reply || "").split(/\n/);
  let dropped = 0, judged = 0;
  const out: string[] = [];
  for (const ln of lines) {
    const m = /^\s*FIX\s*:\s*(.+)$/i.exec(ln);
    if (!m) { out.push(ln); continue; }
    const parts = m[1].split("|").map((x) => x.trim());
    const fixed = parts[1] || "";
    if (!fixed) { out.push(ln); continue; }
    const n = await ltErrors(fixed);
    if (n === null) { out.push(ln); continue; }   // تعذّر الحكم ⇒ يُبقى
    judged++;
    if (n > 0) { dropped++; continue; }           // «الصحيح» ليس صحيحاً ⇒ يُسقَط
    out.push(ln);
  }
  return { text: out.join("\n"), dropped, judged };
}

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

    const gen = String(b.mode || "") === "gen";
    const question = clip(b.question);
    const studentAnswer = clip(b.studentAnswer, 400);
    const noQ = String(b.mode || "") === "chat" || String(b.mode || "") === "review" || gen;
    if (!gen && (!studentAnswer || (!question && !noQ))) {
      return jsonOut({ error: "missing_question_or_answer" }, 400);
    }

    const subject = clip(b.subject, 60) || "لغة إنجليزية";
    const age = Number(b.age) > 0 ? Number(b.age) : 11;
    // المتعلّم: اسمه وجنسه. التطبيق مكتوب بخطاب المؤنّث لأنّه بُني لها، ولإخوتها
    // صفحاتهم — والنموذج يجب أن يعرف لمن يكتب حتى لا يخاطب ولداً بصيغة البنت.
    const lr = (b.learner && typeof b.learner === "object") ? b.learner as Record<string, unknown> : {};
    const lrAge = Number(lr.age) > 0 ? Number(lr.age) : age;
    const male = String(lr.gender || "female") === "male";
    const lname = clip(lr.name, 20);
    // وضعان: تصحيح خطأ (الافتراضي) ومحادثة. النظام يختلف بينهما اختلافاً جوهرياً
    const chat = String(b.mode || "") === "chat";
    const review = String(b.mode || "") === "review";
    const sysText = review
      ? systemReview(male, lname, lrAge, clip(b.level, 20) || "A2")
      : chat
      ? systemChat(clip(b.scene, 200) || "a friendly everyday conversation", clip(b.level, 20) || "A2",
          clip(b.focus, 200) || "Be warm and polite. Model good manners in English.",
          !!b.styleTip, male, lname, !!b.easy, !!b.suggest, !!b.openTurn, lrAge)
      : gen
      ? systemGen(clip(b.domain, 20) || "read", clip(b.level, 10) || "A2")
      : systemFor(subject, lrAge, male, lname);
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
    const opening = gen ? "Generate the item now, following the format exactly."
      : (chat || review) ? studentAnswer
      : openingFor({ question, studentAnswer, choices: b.choices,
          correctAnswer: clip(b.correctAnswer, 200), priorErrors: clip(b.priorErrors, 300) }, male);
    const turns: Record<string, unknown>[] = history.length ? history : [{ role: "user", text: opening }];
    // فقرة القراءة/الاستماع أطول من ردّ محادثة عادي — سقف الرموز الاعتيادي (300) كان يبتر
    // فقرات B1 (٤-٦ جمل) قبل اكتمال السطرين CORRECT/الخيارات.
    let maxTok = gen ? 500 : 300;
    // gpt-oss نماذج تفكير: تُنفق من سقف الرموز نفسه على تفكيرٍ داخلي قبل الجواب،
    // فسقفٌ ٣٠٠ كان يُستنفَد كلّه تفكيراً ويعود جوابٌ فارغ (tutor_no_text، محمد ١٧ أغسطس،
    // finishReason="length") — مؤكَّدٌ من مصدر Groq نفسه: خفض الجهد وسقفٌ أعلى يُصلحانه معاً.
    const isGptOss = /gpt-oss/i.test(model);
    if (isGptOss) maxTok = Math.max(maxTok, 1200);

    let url: string, headers: Record<string, string>, body: unknown;
    if (provider === "gemini") {
      url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`;
      headers = { "x-goog-api-key": KEY, "Content-Type": "application/json" };
      body = {
        systemInstruction: { parts: [{ text: sysText }] },
        contents: turns.map((m) => ({ role: String(m.role) === "model" ? "model" : "user",
          parts: [{ text: clip(m.text) }] })),
        generationConfig: { temperature: 0.6, maxOutputTokens: maxTok, topP: 0.9 },
        // طفل: نُشدّد المرشّحات فوق الافتراضي بدل الاكتفاء به
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
        temperature: 0.6, max_tokens: maxTok, top_p: 0.9,
        // low يكفي لتصحيح/محادثة قصيرة، ويُبقي معظم السقف للجواب لا للتفكير الداخلي
        ...(isGptOss ? { reasoning_effort: "low" } : {}),
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
    // المراجعة وحدها تمرّ على الحَكَم: المحادثة كلامٌ حيّ لا يُدقَّق، والشرح بالعربية
    if (review) {
      const j2 = await ltJudge(text);
      return jsonOut({ ok: true, engine: provider, model, keyName, reply: j2.text,
        ltDropped: j2.dropped, ltJudged: j2.judged, turns: 1 });
    }
    return jsonOut({ ok: true, engine: provider, model, keyName, reply: text,
      turns: history.length ? Math.floor(history.length / 2) + 1 : 1 });
  } catch (e) {
    return jsonOut({ error: "server_error", message: String(e).slice(0, 300) }, 500);
  }
});
