#!/bin/sh
# تشغيل كل مجموعات الاختبار. يجب أن يعمل خادم محلّي على 8931 من جذر المستودع:
#   python3 -m http.server 8931 --bind 127.0.0.1 &
# ثم:  sh tests/run.sh
#
# كلها تعمل بمنافذ وهمية (mocked routes) — لا تلمس Supabase ولا الشبكة.
PW=${PW:-/opt/node22/lib/node_modules/playwright}
DIR=$(dirname "$0")
fail=0
# pron_bench.js يحتاج شبكة ومجموعة بيانات خارجية — يُشغَّل يدوياً لا هنا
for f in "$DIR"/test_*.js; do
  name=$(basename "$f" .js)
  out=$(node "$f" 2>&1)
  if echo "$out" | grep -q "كل الاختبارات نجحت"; then
    echo "✓ $name"
  else
    echo "✗ $name"
    # ===== سببُ السقوط يُسمّى، ولا يُخلط «سقط فعلاً» بـ«لم يُعلن نجاحه» — ١٣ سبتمبر =====
    # الحكم هنا بالبحث عن جملة النجاح حرفياً، فملفٌّ يصحّ منطقُه ولا يطبعها يُقرأ ساقطاً
    # أبداً وينجح منفرداً دائماً. وقع هذا في `test_readaloud` يوم كُتب: ١٠١ ملفّاً يطبع
    # الجملة وهو وحده يطبع صيغةً أخرى — فبدا تقلّباً وليس كذلك.
    if [ -z "$out" ]; then
      echo "  (بلا مخرجات إطلاقاً — انهيارٌ قبل أوّل سطر)"
    elif ! echo "$out" | grep -qE "فشل|FAIL|PAGEERROR|Timeout|Error"; then
      echo "  ⚠ لم يُعلن نجاحه ولا سقوطه: لا يطبع «كل الاختبارات نجحت» — عقدُ المُشغِّل"
      echo "$out" | tail -3 | sed 's/^/  /'
    fi
    echo "$out" | grep -E "FAIL|PAGEERROR|فشل|Timeout" | head -6
    fail=1
  fi
done
exit $fail
