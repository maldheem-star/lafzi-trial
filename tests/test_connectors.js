// ===== أدوات الربط: قائمةُ الخادم يجب أن تكون مجموعةً جزئية من قائمة العميل =====
// عيبٌ مقاس (٢٠-٢٤ سبتمبر): الخادم كان يختار `despite` لِB2 و`notwithstanding`/
// `insofar as`/`albeit` لِC1، وأربعتها خارج `JOIN_WORDS` في العميل — فيُسقط المفكِّك
// العنصر بـ`combine_bad_connector` قبل أن يصل أحداً. ظهر مرّتين في سجلّ محمد.
//
// وهذا الاختبار **يقابل الملفّين نصّاً** فلا يعود الانحراف صامتاً — نزعُ التذكّر من
// المسار (درس ١٨ أغسطس): لا يكفي إصلاحُ القائمتين اليوم، يجب أن يسقط أيُّ انحرافٍ غداً.
const fs=require('fs');
let fails=0;const ok=(c,m)=>{console.log((c?'  ✓ ':'  ✗ FAIL ')+m);if(!c)fails++};

const html=fs.readFileSync(__dirname+'/../index.html','utf8');
const ts=fs.readFileSync(__dirname+'/../supabase-functions-tutor.ts','utf8');

console.log('\n١) تُستخرج القائمتان من المصدرين الحيَّين لا تُكتبان هنا');
let JOIN=[],SRV={};
{
  const m=/const JOIN_WORDS=\[([\s\S]*?)\];/.exec(html);
  ok(!!m,'JOIN_WORDS موجودة في index.html');
  JOIN=(m?m[1]:'').match(/"([^"]+)"/g)?.map(s=>s.slice(1,-1))||[];
  ok(JOIN.length>20,'وفيها '+JOIN.length+' أداة');

  const t=/const COMBINE_CONNECTORS: Record<string, string\[\]> = \{([\s\S]*?)\n\};/.exec(ts);
  ok(!!t,'COMBINE_CONNECTORS موجودة في الخادم');
  (t?t[1]:'').split('\n').forEach(line=>{
    const lm=/^\s*([A-C]\d):\s*\[(.*)\]/.exec(line);
    if(lm)SRV[lm[1]]=(lm[2].match(/"([^"]+)"/g)||[]).map(s=>s.slice(1,-1));
  });
  ok(Object.keys(SRV).length===5,'وخمسة مستويات: '+Object.keys(SRV).join('/'));
}

console.log('\n٢) كل أداةٍ يختارها الخادم موجودةٌ في قائمة العميل — وإلّا سقط العنصر');
{
  const missing=[];
  Object.keys(SRV).forEach(lv=>SRV[lv].forEach(w=>{
    if(JOIN.indexOf(String(w).toLowerCase())<0)missing.push(lv+':'+w);
  }));
  ok(missing.length===0,'لا أداةَ خارج JOIN_WORDS'+(missing.length?' — الناقص: '+missing.join(' · '):''));
}

console.log('\n٣) والحالتان اللتان وقعتا فعلاً مثبَّتتان بأعيانهما');
{
  // `despite` و`notwithstanding` حرفا جرٍّ لا أداتا ربط: لا تصلان جملتين تامّتين
  // («despite it rained» خطأ) — فمهمّةُ «ادمج الجملتين» بهما غيرُ قابلةٍ للتنفيذ.
  const all=[].concat.apply([],Object.keys(SRV).map(k=>SRV[k]));
  ok(all.indexOf('despite')<0,'`despite` خرج من الخادم — حرفُ جرٍّ لا يصل جملتين');
  ok(all.indexOf('notwithstanding')<0,'`notwithstanding` خرج كذلك لنفس السبب');
  // و`albeit`/`insofar as` أداتا ربطٍ حقيقيتان — نقصٌ في قائمة العميل، فأُضيفتا
  ok(JOIN.indexOf('albeit')>=0,'`albeit` أُضيفت إلى العميل — أداةُ ربطٍ حقيقية');
  ok(JOIN.indexOf('insofar as')>=0,'`insofar as` أُضيفت كذلك');
  ok(SRV.C1&&SRV.C1.indexOf('albeit')>=0,'وC1 ما زالت تستعملها فعلاً — لم تُفرَّغ الطبقة');
}

console.log('\n٤) ولكل مستوًى أدواتٌ فعلاً — لا طبقةَ فارغة بعد الحذف');
{
  Object.keys(SRV).forEach(lv=>{
    ok(SRV[lv].length>=3,lv+' فيه '+SRV[lv].length+' أدوات');
  });
}

console.log('\n٥) وحارسُ الارتداد: لو أُعيد `despite` غداً لسقط هذا الاختبار');
{
  const fake={B2:['despite','which']};
  const bad=[].concat.apply([],Object.keys(fake).map(k=>fake[k]))
    .filter(w=>JOIN.indexOf(w)<0);
  ok(bad.length===1&&bad[0]==='despite','المقياس نفسه يُمسك `despite` لو عاد');
}

console.log(fails?('\n✗ FAIL: '+fails):'\n✓ الكل نجح');
process.exit(fails?1:0);
