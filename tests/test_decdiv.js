// ٩-٣ القسمة على كسر عشري — ٨ نوفمبر. وُسِّع المولّد ليغطي أنواع ورقة «محطات القسمة»
// (١٧/٥/١٤٤٨) بعد أن كتبت هيا ٢٣ لـ٢٫٠٧ ÷ ٠٫٩. يُعاد حساب كل جوابٍ من نصّ السؤال
// استقلالاً، ويُثبَت أن كل نوعٍ من الورقة يظهر فعلاً — لا يكفي أن يعمل المولّد.
const fs=require('fs');const s=fs.readFileSync(__dirname+'/../index.html','utf8');
let fails=0;const ok=(c,m)=>{console.log((c?'  ✓ ':'  ✗ FAIL ')+m);if(!c)fails++};
const grab=re=>{const i=s.search(re);return s.slice(i,s.indexOf('\n}',i)+2)};
const line=re=>s.match(re)[0];
eval([line(/const rand=.*\n/),line(/const pick=.*\n/),line(/function shuffle.*\n/),line(/const toAr=.*\n/),
 line(/function round2.*\n/),line(/function arDec\(.*\n/),grab(/function mcTxt\(/),grab(/function qzT\(/),
 grab(/function arDecX\(/),grab(/function decCands\(/),line(/function gcd2.*\n/),line(/const NAMES_F = .*\n/),
 grab(/function m_decDivDec\(/),'globalThis.G=m_decDivDec'].join('\n'));
const AR="٠١٢٣٤٥٦٧٨٩",num=t=>parseFloat(t.replace(/[٠-٩]/g,d=>AR.indexOf(d)).replace('٫','.'));
const N=6000;let wrong=0,shape=0,claimBad=0,terminates=0;
const seen={wholeQ:0,decQ:0,lt1:0,hund:0,round:0,error:0};
for(let i=0;i<N;i++){
  const it=G(),tail=it.q.split(':').pop(),v=tail.match(/[٠-٩]+(?:٫[٠-٩]+)?/g).map(num);
  const isR=/مقرّباً/.test(it.q),isE=/اكتشفي/.test(it.q);
  let want=v[0]/v[1];if(isR)want=Math.round(want*10)/10;
  if(Math.abs(num(it.c[it.a])-want)>1e-9)wrong++;
  if(it.c.length!==4||new Set(it.c).size!==4||/[0-9]/.test(it.q+it.c.join('')+it.w)||!it.w||it.w.length<20)shape++;
  if(isR){seen.round++;if(Math.abs(Math.round(v[0]/v[1]*1e6)-v[0]/v[1]*1e6)<1e-6)terminates++}
  else if(isE){seen.error++;const cl=num(it.q.match(/الناتج ([٠-٩٫]+)/)[1]);if(Math.abs(cl-want)<1e-9||!it.c.map(num).includes(cl))claimBad++}
  else{const bd=tail.split('÷')[1].trim();
    if(/٫[٠-٩]{2}$/.test(bd))seen.hund++;else if(v[1]>1)seen.lt1++;else if(want%1===0)seen.wholeQ++;else seen.decQ++}
}
ok(wrong===0,'الجواب المعلَّم = الحساب المباشر — '+wrong+' من '+N);
ok(shape===0,'أربعة خيارات متمايزة وأرقام عربية وشرح — '+shape);
ok(claimBad===0,'«اكتشفي الخطأ»: الادّعاء خاطئٌ فعلاً وهو بين الخيارات — '+claimBad);
ok(terminates===0,'سؤال التقريب قسمته لا تنتهي فعلاً — '+terminates);
Object.keys(seen).forEach(k=>ok(seen[k]>N/30,'النوع يظهر: '+k+' — '+seen[k]));
console.log(fails?'=== '+fails+' فشل ===':'=== كل الاختبارات نجحت ===');process.exit(fails?1:0);
