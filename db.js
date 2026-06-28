// ============ 答题通 - IndexedDB 数据库层 ============
const DB_NAME = 'DTTongDB';
const DB_VERSION = 6; // 模拟考评分+错题回顾

// 数据库结构：
// subjects: 科目表 {id, name, color}
// chapters: 章节表 {id, subjectId, name, questionCount}
// questions: 试题表 {id, subjectId, chapterId, type, content, options, answer, explanation, order}
// wrongs: 错题收藏表 {id, questionId, subjectId, addTime}

let db = null;

function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => { db = request.result; resolve(db); };
    request.onupgradeneeded = (evt) => {
      const db = evt.target.result;
      // 科目表
      if (!db.objectStoreNames.contains('subjects')) {
        db.createObjectStore('subjects', { keyPath: 'id', autoIncrement: true });
      }
      // 章节表
      if (!db.objectStoreNames.contains('chapters')) {
        const cs = db.createObjectStore('chapters', { keyPath: 'id', autoIncrement: true });
        cs.createIndex('by_subject', 'subjectId', { unique: false });
      }
      // 试题表
      if (!db.objectStoreNames.contains('questions')) {
        const qs = db.createObjectStore('questions', { keyPath: 'id', autoIncrement: true });
        qs.createIndex('by_chapter', 'chapterId', { unique: false });
        qs.createIndex('by_subject', 'subjectId', { unique: false });
      }
      // 错题收藏表
      if (!db.objectStoreNames.contains('wrongs')) {
        const ws = db.createObjectStore('wrongs', { keyPath: 'id', autoIncrement: true });
        ws.createIndex('by_question', 'questionId', { unique: true });
        ws.createIndex('by_subject', 'subjectId', { unique: false });
      }
      // 模拟考试记录表
      if (!db.objectStoreNames.contains('exams')) {
        db.createObjectStore('exams', { keyPath: 'id', autoIncrement: true });
      }
    };
  });
}

// ============ CRUD 封装 ============
function dbGet(store, key) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, 'readonly');
    const req = tx.objectStore(store).get(key);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function dbGetAll(store, indexName, indexValue) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, 'readonly');
    const objStore = tx.objectStore(store);
    let req;
    if (indexName) {
      const idx = objStore.index(indexName);
      req = idx.getAll(indexValue);
    } else {
      req = objStore.getAll();
    }
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function dbAdd(store, item) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, 'readwrite');
    const req = tx.objectStore(store).add(item);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function dbPut(store, item) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, 'readwrite');
    const req = tx.objectStore(store).put(item);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function dbDelete(store, key) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, 'readwrite');
    const req = tx.objectStore(store).delete(key);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

function dbCount(store, indexName, indexValue) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, 'readonly');
    const objStore = tx.objectStore(store);
    let req;
    if (indexName) {
      req = objStore.index(indexName).count(indexValue);
    } else {
      req = objStore.count();
    }
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

// ============ 初始化样例数据 ============
const SAMPLE_SUBJECTS = [
  { id: 1, name: '税法一', color: '#e74c3c' },
  { id: 2, name: '税法二', color: '#3498db' },
  { id: 3, name: '涉税服务实务', color: '#2ecc71' },
  { id: 4, name: '涉税服务相关法律', color: '#f39c12' },
  { id: 5, name: '财务与会计', color: '#9b59b6' },
];

const SAMPLE_CHAPTERS = [
  { id: 1,  subjectId: 1, name: '第一章 税法基本原理', questionCount: 55 },
  { id: 2,  subjectId: 1, name: '第二章 增值税', questionCount: 165 },
  { id: 3,  subjectId: 1, name: '第三章 消费税', questionCount: 82 },
  { id: 4,  subjectId: 1, name: '第四章 城市维护建设税', questionCount: 55 },
  { id: 5,  subjectId: 1, name: '第五章 土地增值税', questionCount: 55 },
  { id: 6,  subjectId: 1, name: '第六章 资源税', questionCount: 55 },
  { id: 7,  subjectId: 1, name: '第七章 环境保护税', questionCount: 33 },
  { id: 8,  subjectId: 2, name: '第一章 企业所得税', questionCount: 165 },
  { id: 9,  subjectId: 2, name: '第二章 个人所得税', questionCount: 138 },
  { id: 10, subjectId: 2, name: '第三章 国际税收', questionCount: 55 },
  { id: 11, subjectId: 2, name: '第四章 印花税', questionCount: 41 },
  { id: 12, subjectId: 2, name: '第五章 房产税', questionCount: 41 },
  { id: 13, subjectId: 3, name: '第一章 涉税服务基本制度', questionCount: 55 },
  { id: 14, subjectId: 3, name: '第二章 税款征收', questionCount: 82 },
  { id: 15, subjectId: 3, name: '第三章 税务行政复议', questionCount: 82 },
  { id: 16, subjectId: 4, name: '第一章 行政法基础', questionCount: 55 },
  { id: 17, subjectId: 4, name: '第二章 行政许可与处罚', questionCount: 82 },
  { id: 18, subjectId: 4, name: '第三章 行政诉讼法', questionCount: 82 },
  { id: 19, subjectId: 5, name: '第一章 财务管理基础', questionCount: 55 },
  { id: 20, subjectId: 5, name: '第二章 财务预测和财务预算', questionCount: 82 },
  { id: 21, subjectId: 5, name: '第三章 筹资与投资管理', questionCount: 110 },
];

// 生成样例试题
function generateSampleQuestions() {
  const types = ['single', 'multi'];
  const optionsA = ['正确', '错误', '不确定', ' none'];
  const sampleQuestions = [];
  let id = 1;
  
  for (const ch of SAMPLE_CHAPTERS) {
    for (let i = 0; i < Math.min(ch.questionCount, 10); i++) {
      const isMulti = i % 3 === 0;
      const type = isMulti ? 'multi' : 'single';
      const optCount = isMulti ? 5 : 4;
      const options = [];
      for (let o = 0; o < optCount; o++) {
        options.push(String.fromCharCode(65 + o) + '. ' + getSampleOptionText(o, ch.subjectId));
      }
      const answer = isMulti 
        ? [String.fromCharCode(65 + (i % optCount)), String.fromCharCode(65 + ((i + 1) % optCount))].join(',')
        : String.fromCharCode(65 + (i % optCount));
      
      sampleQuestions.push({
        id,
        subjectId: ch.subjectId,
        chapterId: ch.id,
        type,
        content: `【样例试题 ${id}】${getSampleQuestionText(ch.subjectId, i)}`,
        options,
        answer,
        explanation: `【解析】这是第 ${id} 题的详细解析。正确答案的依据是……（待导入真实数据后替换）`,
        order: i + 1
      });
      id++;
    }
  }
  return sampleQuestions;
}

function getSampleOptionText(idx, subjectId) {
  const texts = [
    ['A. 正确', 'B. 错误', 'C. 不确定', 'D. 以上都不对'],
    ['A. 应税行为', 'B. 非应税行为', 'C. 免税行为', 'D. 减税行为'],
    ['A. 按月申报', 'B. 按季申报', 'C. 按年申报', 'D. 按次申报'],
    ['A. 5%', 'B. 6%', 'C. 9%', 'D. 13%'],
    ['A. 进项税额', 'B. 销项税额', 'C. 应纳税额', 'D. 减免税额'],
  ];
  return texts[idx % texts.length][idx % 4];
}

function getSampleQuestionText(subjectId, idx) {
  const texts = [
    '根据《税法》相关规定，下列关于增值税纳税义务发生时间的表述中，正确的是：',
    '下列关于消费税计税依据的表述中，正确的有：',
    '企业发生的下列支出中，准予在计算企业所得税应纳税所得额时扣除的有：',
    '下列属于税务行政复议受案范围的有：',
    '下列关于固定资产折旧的表述中，不正确的是：',
    '下列各项中，属于增值税视同销售行为的有：',
    '根据个人所得税法，下列所得中免征个人所得税的有：',
    '下列关于税务行政处罚的表述中，正确的有：',
    '企业购置用于环境保护专用设备的投资额，可以按一定比例实行企业所得税税额抵免，该比例为：',
    '下列关于契税计税依据的表述中，正确的是：',
  ];
  return texts[idx % texts.length];
}

// 从 REAL_DATA 导入真实试题
async function importRealData() {
  if (typeof REAL_DATA === 'undefined') return false;
  
  const existingSubs = await dbGetAll('subjects');
  if (existingSubs.some(s => s.realData === true)) {
    console.log('Real data already imported, skipping.');
    return true;
  }
  
  console.log('Importing REAL_DATA...');
  const subjectMap = {};  // subjectName -> actualSubjectId
  const chapterMap = {};  // "actualSubjectId_chapterName" -> actualChapterId

  // 导入科目和章节
  for (const [subName, subData] of Object.entries(REAL_DATA.subjects || {})) {
    const color = subData.color || '#e74c3c';
    const realSubId = await dbAdd('subjects', { name: subName, color: color, realData: true });
    subjectMap[subName] = realSubId;

    for (const ch of (subData.chapters || [])) {
      const realChId = await dbAdd('chapters', {
        subjectId: realSubId, name: ch.name, questionCount: ch.slugs.length
      });
      chapterMap[`${realSubId}_${ch.name}`] = realChId;
    }
  }

  // 批量导入试题（每100条一个事务）
  let qOrder = 0;
  const batch = [];
  for (const [qid, q] of Object.entries(REAL_DATA.questions || {})) {
    const subName = q.subject || Object.keys(REAL_DATA.subjects)[0];
    const subId = subjectMap[subName];
    if (!subId) continue;
    const chId = chapterMap[`${subId}_${q.chapter}`];
    if (!chId) continue;

    const options = (q.options || []).map(o => o.letter + '. ' + o.text);
    const type = (q.type === '多选题') ? 'multi' : (q.type === '计算题') ? 'calc' : 'single';

    batch.push({
      subjectId: subId, chapterId: chId, type,
      content: q.question,
      options, answer: q.answer || '待导入',
      explanation: q.explanation || '',
      order: ++qOrder
    });
  }

  for (let i = 0; i < batch.length; i += 100) {
    const slice = batch.slice(i, i + 100);
    await new Promise((resolve, reject) => {
      const tx = db.transaction('questions', 'readwrite');
      const store = tx.objectStore('questions');
      for (const item of slice) store.add(item);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  console.log(`Imported ${qOrder} questions across ${Object.keys(subjectMap).length} subjects`);
  return true;
}

// 初始化数据库
async function initDB() {
  await openDB();
  
  // 清除旧数据，重新导入
  const tx = db.transaction(['subjects','chapters','questions'], 'readwrite');
  tx.objectStore('subjects').clear();
  tx.objectStore('chapters').clear();
  tx.objectStore('questions').clear();
  await new Promise(r => { tx.oncomplete = r; tx.onerror = r; });
  
  // 优先使用真实数据
  if (typeof REAL_DATA !== 'undefined') {
    console.log('Loading REAL_DATA...');
    await importRealData();
    return;
  }
  
  console.log('初始化样例数据...');
  for (const s of SAMPLE_SUBJECTS) await dbAdd('subjects', s);
  for (const c of SAMPLE_CHAPTERS) await dbAdd('chapters', c);
  
  const sampleQs = generateSampleQuestions();
  for (const q of sampleQs) await dbAdd('questions', q);
  console.log(`已插入 ${sampleQs.length} 道样例试题`);
}

// 保留旧函数名兼容
async function initDBWithSampleData() { return initDB(); }

// ============ 导出给 app.js 使用 ============
window.DB = {
  open: openDB,
  init: initDB,
  get: dbGet,
  getAll: dbGetAll,
  add: dbAdd,
  put: dbPut,
  delete: dbDelete,
  count: dbCount,
};
