const d=require('./wej_listen_stems.json').models;
let tot=0,broken=0,quote=0,three=0;
const byModel={},types={};
// تصنيفٌ من نصّ الصدر نفسه، بقواعدَ مرتَّبة — لا وسمٌ يدويّ
function typeOf(s){
  const t=s.replace(/^(QUOTE|BROKEN)\s*/,'');
  if(/closest in meaning|She means that|said, "/i.test(s))return'معنى عبارة/تعبير';
  if(/main idea/i.test(t))return'فكرة المحاضرة الرئيسة';
  if(/What information (supports|about|proves)|important point/i.test(t))return'المعلومة المُسنِدة';
  if(/takes? place|might you hear|would probably be heard|occur in|Where does this/i.test(t))return'مكان الحديث';
  if(/Who is|two people talking|Who employs|job\?/i.test(t))return'هويّة المتحدّث/دوره';
  if(/conclude|We can understand|imply|does the speaker mean|does Bader mean|Which of the following/i.test(t))return'استنتاج';
  if(/^Why|because/i.test(t))return'سبب';
  if(/EXCEPT|NOT understand/i.test(t))return'استثناء';
  if(/^(When|What time|How much|How many|What pages|Which page|was born|The chapter|The cost|The lecture started|What is the (second|name|traveler))/i.test(t))return'تفصيلٌ/رقمٌ محدَّد';
  return'تفصيلٌ آخر';
}
for(const m of Object.keys(d)){
  byModel[m]=d[m].length;tot+=d[m].length;
  for(const [s,n] of d[m]){
    if(/^BROKEN/.test(s)){broken++;continue;}
    if(/^QUOTE/.test(s))quote++;
    if(n===3)three++;
    const k=typeOf(s);types[k]=(types[k]||0)+1;
  }
}
console.log('النماذج       :',Object.keys(d).map(m=>m+'('+byModel[m]+')').join(' · '));
console.log('إجمالي الأسئلة:',tot);
console.log('مكسورٌ في المصدر:',broken,'(خيارٌ واحد أو بلا صدر)');
console.log('سليمٌ شكلاً   :',tot-broken);
console.log('بثلاثة خيارات :',three,'· بأربعة:',tot-broken-three);
console.log('صدرُه يحمل العبارة المقتبسة (قابلٌ للإجابة بلا صوت):',quote);
console.log('\nالتصنيف من نصّ الصدر:');
Object.entries(types).sort((a,b)=>b[1]-a[1]).forEach(([k,v])=>console.log('  '+String(v).padStart(3)+'  '+k));
