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
    echo "$out" | grep -E "FAIL|PAGEERROR|فشل|Timeout" | head -6
    fail=1
  fi
done
exit $fail
