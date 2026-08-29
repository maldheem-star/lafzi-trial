#!/bin/sh
# ===== التراجع: إعادة الإنتاج إلى آخر حالٍ سليم — ٢٩ أغسطس =====
#
# لماذا سكربتٌ لا سطرٌ يُكتب وقت العطل: وقتُ العطل هو أسوأ وقتٍ لتأليف أمر. الأبناء
# ينتظرون، والضغط يدفع إلى `--force` أو إلى `reset --hard` على `main` — وكلاهما
# يمحو التاريخ الذي نحتاجه بعد ساعة لنعرف ماذا كسر ماذا.
#
# فالمبدأ: **التراجع يُضيف التزاماً يعكس، ولا يمحو التزاماً وقع.**
# `git revert` يُبقي أثر ما شُحن وأثر التراجع عنه معاً، فيبقى التشخيص ممكناً.
# ولا `--force` هنا إطلاقاً: الرفضُ غير سريع التقديم إشارةُ ارتدادٍ تُعالَج
# بـ`rebase`، لا حالةٌ تُدهَس (قاعدة ٢٢ أغسطس).
#
# الاستعمال:
#   sh tools/rollback.sh                 # يعرض ما سيفعله ولا يفعل شيئاً
#   sh tools/rollback.sh --to <sha>      # يعكس كلَّ ما بعد <sha> على main (معاينة)
#   sh tools/rollback.sh --to <sha> --go  # ينفّذ ويدفع
#
# وبعد التنفيذ: GitHub Pages يُعيد النشر تلقائياً من `main` خلال دقائق. وللتحقّق
# افتح الرابط واضغط «🔄 تحديث قسري» — لأن نسخة المتصفّح المخزَّنة لا تتبدّل وحدها.
set -eu

BRANCH=main
TO=""
GO=0
while [ $# -gt 0 ]; do
  case "$1" in
    --to) TO="${2:-}"; shift 2 ;;
    --go) GO=1; shift ;;
    --branch) BRANCH="${2:-}"; shift 2 ;;
    *) echo "وسيطٌ غير معروف: $1" >&2; exit 2 ;;
  esac
done

say(){ printf '%s\n' "$*"; }

# ===== حارسُ الشجرة المتّسخة — أضافته التجربةُ الأولى بثمنها =====
# جُرِّب هذا السكربت أوّل مرّة والشجرةُ فيها تعديلاتٌ غير مُلتزَمة، فمحاها
# `reset --hard` أدناه: ضاع تعديلُ index.html وملفُّ النشر معاً. وهذا بعينه ما
# يقع وقت العطل الحقيقي — يدُ المُصلح على نصف إصلاحٍ حين يقرّر التراجع.
# فالتراجع يرفض العمل على شجرةٍ متّسخة، ويقول ماذا يفعل بها.
dirty(){ [ -n "$(git status --porcelain --untracked-files=no)" ]; }
if dirty; then
  say "الشجرة فيها تعديلاتٌ غير مُلتزَمة — والتراجع سيمحوها:"
  git status --short --untracked-files=no | sed 's/^/  /'
  say ""
  say "احفظها أوّلاً بأحدهما، ثم أعد الأمر:"
  say "  git stash push -u -m 'قبل التراجع'     # تُستعاد بـ git stash pop"
  say "  git add -A && git commit -m '...'       # إن كانت تستحقّ الالتزام"
  exit 3
fi

say "== حالة الإنتاج =="
git fetch origin "$BRANCH" --quiet
HEAD_SHA=$(git rev-parse --short "origin/$BRANCH")
say "  origin/$BRANCH = $HEAD_SHA"

if [ -z "$TO" ]; then
  say ""
  say "== آخر عشرة التزامات على $BRANCH — اختر منها آخر حالٍ سليم =="
  git log --oneline -10 "origin/$BRANCH" | sed 's/^/  /'
  say ""
  say "ثم: sh tools/rollback.sh --to <sha>        (معاينة)"
  say "     sh tools/rollback.sh --to <sha> --go   (تنفيذ)"
  exit 0
fi

# التزامٌ لا وجود له = خطأٌ صريح، لا تراجعٌ إلى مكانٍ مجهول
if ! git rev-parse --verify --quiet "$TO^{commit}" >/dev/null; then
  say "لا التزام بهذا المعرّف: $TO" >&2; exit 1
fi
if ! git merge-base --is-ancestor "$TO" "origin/$BRANCH"; then
  say "التزام $TO ليس في تاريخ $BRANCH — لا يصلح هدفاً للتراجع" >&2; exit 1
fi

REVERT_LIST=$(git rev-list --no-merges "$TO..origin/$BRANCH")
N=$(printf '%s' "$REVERT_LIST" | grep -c . || true)
say ""
say "== سيُعكَس $N التزاماً (الأحدث أوّلاً) =="
git log --oneline --no-merges "$TO..origin/$BRANCH" | sed 's/^/  /'

if [ "$N" = "0" ]; then say ""; say "لا شيء يُعكَس — $BRANCH عند $TO أصلاً."; exit 0; fi

if [ "$GO" != "1" ]; then
  say ""
  say "معاينةٌ فقط. أضف --go للتنفيذ."
  exit 0
fi

say ""
say "== التنفيذ =="
CUR=$(git rev-parse --abbrev-ref HEAD)
# عكسٌ متصادم يترك المُصلح على `main` في منتصف عملية — فيُعاد إلى فرعه دائماً
trap 'git checkout -q "$CUR" 2>/dev/null || true' EXIT
git checkout -q "$BRANCH"
git reset -q --hard "origin/$BRANCH"
# الأحدث أوّلاً — وإلّا تصادمت العكوس بعضها ببعض
git revert --no-edit --no-merges "$TO..origin/$BRANCH"
git push -u origin "$BRANCH"
say "  تمّ. $BRANCH صار محتواه محتوى $TO، وتاريخُه محفوظ."
git checkout -q "$CUR"
say ""
say "التالي: انتظر إعادة النشر، ثم افتح الرابط واضغط «🔄 تحديث قسري»."
