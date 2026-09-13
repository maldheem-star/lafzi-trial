#!/bin/sh
# تشغيل كل مجموعات الاختبار. يجب أن يعمل خادم محلّي على 8931 من جذر المستودع:
#   python3 -m http.server 8931 --bind 127.0.0.1 &
# ثم:  sh tests/run.sh
#
# كلها تعمل بمنافذ وهمية (mocked routes) — لا تلمس Supabase ولا الشبكة.
# pron_bench.js يحتاج شبكة ومجموعة بيانات خارجية — يُشغَّل يدوياً لا هنا.
#
# ===== الحكم برمز الخروج وصيغة TAP — لا بعقدٍ مصنوعٍ باليد (١٣ سبتمبر) =====
# كان هذا المُشغِّل يحكم بالبحث عن جملة «كل الاختبارات نجحت» **في المخرجات**. وهو عقدٌ
# اخترعتُه، وثمنُه وقع: `test_readaloud` صحيحُ المنطق ويُنهي برمز خروجٍ سليم، لكنه طبع
# صيغةً أخرى — فسقط في الجولة أبداً ونجح منفرداً دائماً، وأضاع وقت صاحب المشروع.
#
# والقياس كشف أن العقد المصنوع لم يكن لازماً أصلاً: **١٠٢ ملفّاً من ١٠٢** تُنهي بـ
# `process.exit(fails?1:0)` — أي أن **رمز الخروج** (معيار POSIX، وهو ما يفهمه كل
# مُشغِّل وكلّ CI) كان صحيحاً في كل ملفّ طوال الوقت.
#
# والمخرجات الآن بصيغة **TAP 14** (Test Anything Protocol) — الصيغة المعياريّة التي
# تقرأها الأدوات الجاهزة بلا مُحوِّل: `node --test-reporter=tap` يُخرجها، وtappy/prove
# وواجهات CI تستهلكها. فلا صيغةَ عرضٍ مخترعة بعد اليوم.
PW=${PW:-/opt/node22/lib/node_modules/playwright}
export PW
DIR=$(dirname "$0")

total=$(ls "$DIR"/test_*.js 2>/dev/null | wc -l | tr -d ' ')
echo "TAP version 14"
echo "1..$total"

i=0
passed=0
failed=0
for f in "$DIR"/test_*.js; do
  name=$(basename "$f" .js)
  i=$((i+1))
  out=$(node "$f" 2>&1)
  code=$?
  if [ "$code" -eq 0 ]; then
    echo "ok $i - $name"
    passed=$((passed+1))
    # ===== حزامٌ ثانٍ: **تحذيرٌ لا حُكم** =====
    # رمز الخروج هو الحَكَم (وهذا هو المعيار). لكن ملفّاً يُبلغ فشلاً في نصّه ويخرج
    # بصفر يُقرأ ناجحاً — فيُشار إليه بتعليق TAP دون أن يُغيَّر الحكم، وإلّا عاد
    # سنُّ النصوص عقداً كما كان. (كشفته تجربةٌ مُصطنَعة، ولا يقع في الـ١٠٢ الحالية:
    # كلُّها `process.exit(fails?1:0)` — مقاسٌ لا مفترَض.)
    if echo "$out" | grep -qE "^=== [0-9]+ فشل|^FAIL|✗ "; then
      echo "# warning: $name خرج بصفر ومخرجاتُه تُبلغ فشلاً — راجع رمز خروجه"
    fi
  else
    echo "not ok $i - $name"
    # كتلة YAML التشخيصية جزءٌ من TAP نفسه — لا تنسيقٌ من عندي
    echo "  ---"
    echo "  exit_code: $code"
    echo "  output: |"
    if [ -z "$out" ]; then
      echo "    (بلا مخرجات إطلاقاً — انهيارٌ قبل أوّل سطر)"
    else
      echo "$out" | grep -E "FAIL|PAGEERROR|فشل|Timeout|Error|✗" | head -8 | sed 's/^/    /'
      [ -z "$(echo "$out" | grep -E 'FAIL|PAGEERROR|فشل|Timeout|Error|✗')" ] && echo "$out" | tail -5 | sed 's/^/    /'
    fi
    echo "  ..."
    failed=$((failed+1))
  fi
done

echo "# tests $i"
echo "# pass $passed"
echo "# fail $failed"
[ "$failed" -eq 0 ] || exit 1
exit 0
