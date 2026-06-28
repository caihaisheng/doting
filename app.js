// ============ 答题通 App 主逻辑 ============
// 题型显示名称映射
const TYPE_LABEL = {
  single: '单选题',
  multi: '多选题',
  calc: '计算题',
  judge: '判断题',
};
const $= id => document.getElementById(id);
const $$ = sel => document.querySelectorAll(sel);

const State = {
  subject: null,    // {id,name,color}
  chapter: null,    // {id,name}
  mode: null,       // 'browse'|'exam'|'wrong'
  exam: { questions:[], index:0, answers:{}, timer:null, seconds:0, wrongList:[] },
  wrongFilter: 0,
  _q: null,  // current question cache
};

// ============ 初始化 ============
document.addEventListener('DOMContentLoaded', async ()=>{
  await DB.init();
  registerSW();
  await renderSubjects();
  showPage('subject-page');
});

function registerSW(){
  if('serviceWorker' in navigator){
    navigator.serviceWorker.register('./sw.js').catch(()=>{});
  }
}

function showPage(id){
  $$('.page').forEach(p=>p.classList.remove('active'));
  const el = $(id); if(el) el.classList.add('active');
  window.scrollTo(0,0);
}

function toast(msg){
  const t=document.createElement('div');
  t.className='toast'; t.textContent=msg;
  document.body.appendChild(t);
  setTimeout(()=>{t.style.opacity='0'; setTimeout(()=>t.remove(),300);},1500);
}

// ============ 科目页 ============
async function renderSubjects(){
  const grid = $('subject-grid');
  const list = await DB.getAll('subjects');
  grid.innerHTML = list.map(s=>`
    <div class="subject-card" style="--subject-color:${s.color}" data-id="${s.id}" data-name="${s.name}" data-color="${s.color}">
      <div class="icon">${['📗','📘','📙','📕','📔'][s.id-1]||'📖'}</div>
      <div class="name">${s.name}</div>
      <div class="count" id="scnt-${s.id}">加载中…</div>
    </div>`).join('');
  // 绑定点击
  grid.querySelectorAll('.subject-card').forEach(card=>{
    card.onclick = ()=>{
      State.subject = {id:+card.dataset.id, name:card.dataset.name, color:card.dataset.color};
      $('subject-topbar-name').textContent = State.subject.name;
      $('mode-page').querySelector('.topbar').style.background = State.subject.color;
      showPage('mode-page');
    };
  });
  for(const s of list){
    const cnt = await DB.count('questions','by_subject',s.id);
    const el = $('scnt-'+s.id);
    if(el) el.textContent = cnt>0 ? `共 ${cnt} 题` : '待导入数据';
  }
}

// ============ 模式选择 ============
function onModeClick(mode){
  State.mode = mode;
  if(mode==='browse'){ renderChapters(); showPage('chapter-page'); }
  else if(mode==='exam'){ startExam(); }
  else if(mode==='wrong'){ renderWrongPage(); showPage('wrong-page'); }
}

// ============ 章节列表 ============
async function renderChapters(){
  const list = $('chapter-list');
  const chs = await DB.getAll('chapters','by_subject',State.subject.id);
  $('chapter-topbar-name').textContent = State.subject.name;

  if(!chs.length){
    list.innerHTML = '<div class="empty-state"><div class="empty-icon">📄</div><div class="empty-text">暂无章节数据<br>请先导入PDF试题</div></div>';
    return;
  }

  list.innerHTML = chs.map((c,i)=>`
    <div class="chapter-card" data-id="${c.id}" data-name="${c.name}">
      <div class="chapter-num">${i+1}</div>
      <div class="chapter-info">
        <div class="chapter-name">${c.name}</div>
        <div class="chapter-meta" id="ccnt-${c.id}">加载中…</div>
      </div>
      <div class="chapter-arrow">›</div>
    </div>`).join('');

  list.querySelectorAll('.chapter-card').forEach(card=>{
    card.onclick = ()=>{
      State.chapter = {id:+card.dataset.id, name:card.dataset.name};
      $('question-topbar-name').textContent = State.chapter.name;
      renderQuestionList(State.chapter.id);
      showPage('question-list-page');
    };
  });

  for(const c of chs){
    const cnt = await DB.count('questions','by_chapter',c.id);
    const el = $('ccnt-'+c.id); if(el) el.textContent = `共 ${cnt} 题`;
  }
}

// ============ 试题列表 ============
async function renderQuestionList(chapterId){
  const list = $('question-list');
  const qs = await DB.getAll('questions','by_chapter',chapterId);
  $('question-count').textContent = `共 ${qs.length} 题`;

  if(!qs.length){
    list.innerHTML = '<div class="empty-state"><div class="empty-icon">📝</div><div class="empty-text">该章节暂无试题</div></div>';
    return;
  }

  list.innerHTML = qs.map((q,i)=>`
    <div class="question-card" data-qid="${q.id}">
      <div class="qs-type-tag ${q.type}">${TYPE_LABEL[q.type]||q.type}</div>
      <div class="qs-content">${i+1}. ${q.content.length>60?q.content.slice(0,60)+'…':q.content}</div>
      <div class="qs-meta">第 ${i+1} 题</div>
    </div>`).join('');

  list.querySelectorAll('.question-card').forEach(card=>{
    card.onclick = ()=> openQuestion(+card.dataset.qid);
  });
}

// ============ 试题详情 ============
async function openQuestion(qId){
  const q = await DB.get('questions', qId);
  if(!q) return;
  State._q = q;

  const isWrong = (await DB.getAll('wrongs','by_question',qId)).length>0;
  const container = $('question-detail');

  const isCalc = q.type === 'calc' || q.type === 'judge';
  // 构建选项HTML（计算题子问题也有选项，正常显示）
  const optsHtml = q.options.length > 0 ? `
    <div class="qd-options" id="qd-opts">
      ${q.options.map(opt=>`
        <div class="qd-option" data-letter="${opt[0]}">
          <div class="opt-letter">${opt[0]}</div>
          <div class="opt-text">${opt.slice(2)}</div>
        </div>`).join('')}
    </div>` : `<div id="qd-opts"></div>`;

  container.innerHTML = `
    <div class="qd-type-tag ${q.type}">${TYPE_LABEL[q.type]||q.type}</div>
    <div class="qd-content">${q.content.replace(/\n/g,'<br>')}</div>
    ${optsHtml}
    <div class="qd-actions">
      <button class="qd-btn primary" id="show-ans-btn">显示答案</button>
    </div>
    <div class="qd-answer-section" id="qd-ans-section">
      <div class="qd-answer-box">
        <h4>✅ 正确答案</h4>
        <div class="answer-text" id="qd-correct"></div>
      </div>
      <div class="qd-explain-box">
        <h4>📖 答案解析</h4>
        <div class="explain-text" id="qd-explain"></div>
      </div>
    </div>
    <div class="qd-footer">
      <button class="foot-btn star ${isWrong?'active':''}" id="star-btn">${isWrong?'★ 已收藏':'☆ 收藏'}</button>
      <button class="foot-btn next" id="next-q-btn">下一题 ›</button>
    </div>`;

  // 选项点击（计算题子问题也支持选择）
  container.querySelectorAll('#qd-opts .qd-option').forEach(opt=>{
    opt.onclick = ()=>{
      if($('qd-ans-section').classList.contains('show')) return;
      if(q.type==='multi'){
        opt.classList.toggle('selected');
      } else {
        container.querySelectorAll('#qd-opts .qd-option').forEach(o=>o.classList.remove('selected'));
        opt.classList.add('selected');
      }
    };
  });

  $('show-ans-btn').onclick = ()=> showAnswer(q);
  $('star-btn').onclick = ()=> toggleStar(q.id);
  $('next-q-btn').onclick = ()=> nextQuestion(q);

  $('detail-topbar-name').textContent = TYPE_LABEL[q.type] || q.type;
  showPage('question-detail-page');
}

async function showAnswer(q){
  const section = $('qd-ans-section');
  $('qd-correct').textContent = q.answer;
  $('qd-explain').textContent = q.explanation || '暂无解析';

  const correctArr = q.answer.split(',').map(a=>a.trim());
  $('qd-opts').querySelectorAll('.qd-option').forEach(opt=>{
    const L = opt.dataset.letter;
    const isCorrect = correctArr.includes(L);
    const isSel = opt.classList.contains('selected');
    opt.classList.remove('selected');
    if(isCorrect) opt.classList.add('correct');
    if(isSel && !isCorrect) opt.classList.add('wrong');
  });

  section.classList.add('show');
}

async function toggleStar(qId){
  const wrongs = await DB.getAll('wrongs','by_question',qId);
  const btn = $('star-btn');
  if(wrongs.length>0){
    await DB.delete('wrongs', wrongs[0].id);
    btn.textContent = '☆ 收藏'; btn.classList.remove('active');
    toast('已取消收藏');
  } else {
    const q = await DB.get('questions', qId);
    await DB.add('wrongs', {questionId:qId, subjectId:q.subjectId, addTime:new Date().toISOString()});
    btn.textContent = '★ 已收藏'; btn.classList.add('active');
    toast('已加入错题集');
  }
}

async function nextQuestion(q){
  const qs = await DB.getAll('questions','by_chapter',q.chapterId);
  const idx = qs.findIndex(x=>x.id===q.id);
  if(idx>=0 && idx<qs.length-1){
    openQuestion(qs[idx+1].id);
  } else {
    toast('已经是最后一题了');
  }
}

// ============ 模拟考试 ============
async function startExam(){
  const qs = await DB.getAll('questions','by_subject',State.subject.id);
  if(!qs.length){ toast('该科目暂无试题，请先导入数据'); return; }

  const total = Math.min(100, qs.length);
  const shuffled = [...qs].sort(()=>Math.random()-0.5).slice(0,total);

  State.exam = {questions:shuffled, index:0, answers:{}, timer:null, seconds:0};

  $('exam-topbar-name').textContent = State.subject.name + ' · 模拟考试';
  showPage('exam-page');
  renderExamQ();
  startTimer();
}

function startTimer(){
  if(State.exam.timer) clearInterval(State.exam.timer);
  State.exam.seconds=0;
  updateTimer();
  State.exam.timer = setInterval(()=>{ State.exam.seconds++; updateTimer(); },1000);
}

function updateTimer(){
  const el = $('exam-timer');
  if(!el) return;
  const s = State.exam.seconds;
  const m = Math.floor(s/60), sec = s%60;
  el.textContent = `${String(m).padStart(2,'0')}:${String(sec).padStart(2,'0')}`;
}

function renderExamQ(){
  const {questions,index,answers} = State.exam;
  const q = questions[index];
  if(!q) return;

  $('exam-progress').textContent = `${index+1} / ${questions.length}`;
  const container = $('exam-question');

  container.innerHTML = `
    <div class="qd-type-tag ${q.type}">${TYPE_LABEL[q.type]||q.type}</div>
    <div class="qd-content">${index+1}. ${q.content.replace(/\n/g,'<br>')}</div>
    <div class="qd-options" id="exam-opts">
      ${q.options.map(opt=>`
        <div class="qd-option ${isSelected(q.id,opt[0])?'selected':''}" data-letter="${opt[0]}">
          <div class="opt-letter">${opt[0]}</div>
          <div class="opt-text">${opt.slice(2)}</div>
        </div>`).join('')}
    </div>`;

  container.querySelectorAll('#exam-opts .qd-option').forEach(opt=>{
    opt.onclick = ()=>{
      const L = opt.dataset.letter;
      const ans = State.exam.answers;
      if(q.type==='multi'){
        if(!ans[q.id]) ans[q.id]=[];
        const arr = ans[q.id];
        const i = arr.indexOf(L);
        if(i>=0) arr.splice(i,1); else arr.push(L);
      } else {
        ans[q.id] = L;
      }
      renderExamQ();
    };
  });

  $('exam-prev').style.visibility = index>0?'visible':'hidden';
  $('exam-next').textContent = index<questions.length-1?'下一题 ›':'提交试卷';
}

function isSelected(qId, letter){
  const ans = State.exam.answers[qId];
  if(!ans) return false;
  return Array.isArray(ans) ? ans.includes(letter) : ans===letter;
}

function onExamPrev(){ if(State.exam.index>0){ State.exam.index--; renderExamQ(); } }
function onExamNext(){
  if(State.exam.index < State.exam.questions.length-1){ State.exam.index++; renderExamQ(); }
  else { submitExam(); }
}

// 每题分值
function questionScore(type){
  if(type==='multi'||type==='calc') return 2;
  return 1; // single, judge
}

async function submitExam(){
  if(State.exam.timer) clearInterval(State.exam.timer);

  const {questions,answers} = State.exam;
  let totalScore=0, earnedScore=0;
  let correct=0, wrong=0, unans=0;
  // 按题型统计
  const typeStats = {}; // {single:{correct:0,wrong:0,unans:0,total:0,score:0,max:0}, ...}
  const wrongList = [];

  for(const q of questions){
    const pts = questionScore(q.type);
    const type = q.type||'single';
    if(!typeStats[type]) typeStats[type] = {correct:0, wrong:0, unans:0, total:0, score:0, max:0};
    typeStats[type].total++;
    typeStats[type].max += pts;

    const ua = answers[q.id];
    if(!ua || (Array.isArray(ua) && ua.length===0)){
      unans++;
      typeStats[type].unans++;
      wrongList.push({...q, userAnswer:'（未作答）', isCorrect:false});
      continue;
    }

    const ca = q.answer.split(',').map(a=>a.trim()).sort().join(',');
    const uaStr = Array.isArray(ua) ? ua.sort().join(',') : ua.trim();

    if(uaStr===ca){
      correct++;
      earnedScore += pts;
      typeStats[type].correct++;
      typeStats[type].score += pts;
      wrongList.push({...q, userAnswer: uaStr, isCorrect:true});
    } else {
      wrong++;
      typeStats[type].wrong++;
      wrongList.push({...q, userAnswer: uaStr, isCorrect:false});

      // 自动收藏错题
      const existing = await DB.getAll('wrongs','by_question',q.id);
      if(existing.length===0){
        await DB.add('wrongs', {questionId:q.id, subjectId:q.subjectId, addTime:new Date().toISOString()});
      }
    }

    totalScore += pts;
  }

  State.exam.totalScore = totalScore;
  State.exam.earnedScore = earnedScore;
  State.exam.correct = correct;
  State.exam.wrong = wrong;
  State.exam.unans = unans;
  State.exam.typeStats = typeStats;
  State.exam.wrongReview = wrongList.filter(w=>!w.isCorrect);

  renderResult();
  showPage('exam-result-page');
}

function renderResult(){
  const el = $('exam-result');
  const {totalScore, earnedScore, correct, wrong, unans, typeStats, wrongReview, questions} = State.exam;
  const pct = totalScore>0 ? Math.round(earnedScore/totalScore*100) : 0;

  // 题型明细
  const typeNames = {single:'单选题', multi:'多选题', calc:'计算题', judge:'判断题'};
  let typeDetail = '';
  for(const [t, s] of Object.entries(typeStats||{})){
    typeDetail += `
      <div class="rs-type-row">
        <span class="rs-type-name">${typeNames[t]||t}</span>
        <span class="rs-type-nums">${s.correct}<span style="color:var(--success)">✓</span> / ${s.total}</span>
        <span class="rs-type-score">${s.score}/${s.max}分</span>
      </div>`;
  }

  // 得分圆圈颜色
  let circleColor = '#2ecc71';
  if(pct<60) circleColor = '#e74c3c';
  else if(pct<80) circleColor = '#f39c12';

  const hasWrong = wrongReview && wrongReview.length > 0;
  el.innerHTML = `
    <div class="result-circle" style="background:linear-gradient(135deg, ${circleColor}, ${circleColor}d4)">
      <div class="result-ratio">${earnedScore}<span class="result-total">/${totalScore}</span></div>
      <div class="result-label">得分率 ${pct}%</div>
    </div>
    <div class="result-stats">
      <div class="result-stat"><div class="stat-num" style="color:var(--success)">${correct}</div><div class="stat-label">答对</div></div>
      <div class="result-stat"><div class="stat-num" style="color:var(--danger)">${wrong}</div><div class="stat-label">答错</div></div>
      <div class="result-stat"><div class="stat-num">${unans}</div><div class="stat-label">未答</div></div>
    </div>
    ${typeStats ? `<div class="result-type-breakdown">${typeDetail}</div>` : ''}
    <div class="result-actions" id="result-actions">
      ${hasWrong ? `<button class="act-btn warn" id="btn-review-wrong">📋 查看错题 (${wrongReview.length}道)</button>` : ''}
      <button class="act-btn primary" id="btn-retry-exam">重新考试</button>
      <button class="act-btn outline" id="btn-back-mode">返回</button>
    </div>`;

  // 用 addEventListener 替代内联 onclick，确保回调可靠触发
  if(hasWrong){
    const reviewBtn = $('btn-review-wrong');
    if(reviewBtn) reviewBtn.addEventListener('click', startWrongReview);
  }
  const retryBtn = $('btn-retry-exam');
  if(retryBtn) retryBtn.addEventListener('click', startExam);
  const backBtn = $('btn-back-mode');
  if(backBtn) backBtn.addEventListener('click', ()=> showPage('mode-page'));
}

// ============ 错题回顾 ============
function startWrongReview(){
  try {
    const list = State.exam.wrongReview;
    if(!list || !list.length){
      toast('没有错题可回顾');
      return;
    }
    State.exam.wrIndex = 0;
    renderWrongReview();
    showPage('wrong-review-page');
  } catch(e){
    console.error('startWrongReview error:', e);
    toast('错题回顾加载失败: ' + e.message);
  }
}

function goBackFromWrongReview(){
  showPage('exam-result-page');
}

function renderWrongReview(){
  try {
    const list = State.exam.wrongReview;
    if(!list||!list.length){
      toast('错题列表为空');
      showPage('exam-result-page');
      return;
    }
    const idx = State.exam.wrIndex;
    if(idx < 0 || idx >= list.length){
      showPage('exam-result-page');
      return;
    }
    const q = list[idx];
    if(!q) return;

  $('wr-topbar-title').textContent = '错题回顾';
  $('wr-progress').textContent = `${idx+1} / ${list.length}`;

  const container = $('wrong-review-detail');
  const userAnsStr = q.userAnswer||'（未作答）';
  const correctAnsStr = q.answer||'无答案';

  // 标记选项：正确选项绿色，用户错选红色
  const correctLetters = correctAnsStr.split(',').map(a=>a.trim());
  const userLetters = (q.userAnswer||'').split(',').map(a=>a.trim()).filter(Boolean);

  const optsHtml = q.options.length>0 ? `
    <div class="qd-options">
      ${q.options.map(opt=>{
        const L = opt[0];
        const isCorrect = correctLetters.includes(L);
        const isUser = userLetters.includes(L);
        let cls = '';
        if(isCorrect) cls='correct';
        if(isUser && !isCorrect) cls='wrong';
        if(isUser && isCorrect) cls='correct';
        if(!isUser && isCorrect) cls='missed';
        return `<div class="qd-option ${cls}">
          <div class="opt-letter">${L}</div>
          <div class="opt-text">${opt.slice(2)}</div>
        </div>`;
      }).join('')}
    </div>` : '';

  container.innerHTML = `
    <div class="qd-type-tag ${q.type}">${TYPE_LABEL[q.type]||q.type}</div>
    <div class="qd-content">${q.content.replace(/\n/g,'<br>')}</div>
    ${optsHtml}
    <div class="wr-compare">
      <div class="wr-box wr-user">
        <h4>❌ 你的答案</h4>
        <div class="wr-ans-text">${userAnsStr}</div>
      </div>
      <div class="wr-box wr-correct">
        <h4>✅ 正确答案</h4>
        <div class="wr-ans-text">${correctAnsStr}</div>
      </div>
    </div>
    <div class="wr-explain">
      <h4>📖 答案解析</h4>
      <p>${q.explanation||'暂无解析'}</p>
    </div>`;

  $('wr-prev').style.visibility = idx>0?'visible':'hidden';
  $('wr-next').textContent = idx<list.length-1?'下一错题 ›':'回到结果';
  } catch(e){
    console.error('renderWrongReview error:', e);
    toast('渲染错题失败: ' + e.message);
    showPage('exam-result-page');
  }
}

function wrongReviewPrev(){
  try {
    if(State.exam.wrIndex > 0){
      State.exam.wrIndex--;
      renderWrongReview();
    }
  } catch(e){ console.error('wrongReviewPrev error:', e); }
}

function wrongReviewNext(){
  try {
    const list = State.exam.wrongReview;
    if(State.exam.wrIndex < list.length - 1){
      State.exam.wrIndex++;
      renderWrongReview();
    } else {
      showPage('exam-result-page');
    }
  } catch(e){ console.error('wrongReviewNext error:', e); }
}
async function renderWrongPage(){
  const subjects = await DB.getAll('subjects');
  const tabs = $('wrong-tabs');
  tabs.innerHTML = `<button class="wrong-tab ${State.wrongFilter===0?'active':''}" onclick="filterWrong(0)">全部</button>`
    + subjects.map(s=>`<button class="wrong-tab ${State.wrongFilter===s.id?'active':''}" onclick="filterWrong(${s.id})" style="${State.wrongFilter===s.id?`background:${s.color};color:white`:''}">${s.name}</button>`).join('');
  await renderWrongList();
}

async function filterWrong(id){
  State.wrongFilter = id;
  await renderWrongPage();
}

async function renderWrongList(){
  const list = $('wrong-list');
  let wrongs;
  if(State.wrongFilter===0) wrongs = await DB.getAll('wrongs');
  else wrongs = await DB.getAll('wrongs','by_subject',State.wrongFilter);

  if(!wrongs.length){
    list.innerHTML = '<div class="empty-state"><div class="empty-icon">⭐</div><div class="empty-text">暂无收藏试题<br>答题时点击"收藏"即可加入</div></div>';
    return;
  }

  const items = [];
  for(const w of wrongs){
    const q = await DB.get('questions', w.questionId);
    if(q) items.push({...w, q});
  }

  list.innerHTML = items.map((it,i)=>`
    <div class="question-card" data-qid="${it.questionId}">
      <div class="qs-type-tag ${it.q.type}">${TYPE_LABEL[it.q.type]||it.q.type}</div>
      <div class="qs-content">${i+1}. ${it.q.content.length>50?it.q.content.slice(0,50)+'…':it.q.content}</div>
      <div class="qs-meta">收藏于 ${new Date(it.addTime).toLocaleDateString('zh-CN')}</div>
    </div>`).join('');

  list.querySelectorAll('.question-card').forEach(card=>{
    card.onclick = ()=> openQuestion(+card.dataset.qid);
  });
}

// ============ 导航 ============
function goHome(){ if(State.exam.timer) clearInterval(State.exam.timer); renderSubjects(); showPage('subject-page'); }
function goBackFromMode(){ renderSubjects(); showPage('subject-page'); }
function goBackFromChapter(){ showPage('mode-page'); }
function goBackFromQuestionList(){ renderChapters(); showPage('chapter-page'); }
function goBackFromDetail(){ renderQuestionList(State.chapter.id); showPage('question-list-page'); }

console.log('答题通 App 已加载 ✅');
