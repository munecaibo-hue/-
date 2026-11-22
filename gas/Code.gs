/**
 * 科博館黃金島闖關 — Google Apps Script 後端
 *
 * 部署方式：
 * 1. 開啟目標 Google Sheet → 擴充功能 → Apps Script
 * 2. 將本檔案完整貼入 Code.gs 並儲存
 * 3. 可先執行一次 `initSheetsWithSampleData` 建立「黃金島」「題目」「回答」三張工作表與範例題目
 * 4. 點選右上角「部署」→「新增部署作業」→ 類型選「網頁應用程式」
 *    - 執行身分：我
 *    - 誰可以存取：所有人
 * 5. 將產生的網頁應用程式 URL 貼入前端 `.env` 的 `GOOGLE_APP_SCRIPT_URL`
 */

const SHEET_TEAMS = '黃金島';
const SHEET_QUESTIONS = '題目';
const SHEET_ANSWERS = '回答';

// 每答對一題獲得的分數（8 題基礎 80 分；全部 8 關皆綠燈一次過關再加 20 分＝滿分 100 分）
const POINTS_PER_QUESTION = 10;
const PERFECT_ALL_GREEN_BONUS = 20;
const PERFECT_REQUIRED_STATIONS = 8;
const ADMIN_PASSCODE = '3333';

const TEAM_HEADERS = ['ID', '班級', '第幾小隊', '小隊名稱', '小隊長', '小隊人數', '登錄時間'];
const QUESTION_HEADERS = ['題號', '題目', 'A', 'B', 'C', 'D', '解答', '探險小知識', '館廳', '展品'];
const ANSWER_HEADERS = [
  'ID',
  '闖關次數',
  '總分',
  '最高分',
  '第一次通關分數',
  '花了幾次通關',
  '最近遊玩時間',
];

function doGet(e) {
  try {
    const action = (e && e.parameter && e.parameter.action) || 'questions';

    if (action === 'questions') {
      const requestedCount = parseInt((e && e.parameter && e.parameter.count) || '5', 10);
      const count = Number.isNaN(requestedCount) || requestedCount < 1 ? 5 : requestedCount;
      const questions = getRandomQuestions_(count);
      return jsonResponse_({ ok: true, questions: questions });
    }

    if (action === 'leaderboard') {
      const board = getLeaderboard_(5);
      return jsonResponse_({ ok: true, topClasses: board.topClasses, allTeams: board.allTeams });
    }

    return jsonResponse_({ ok: false, error: '不支援的 action：' + action });
  } catch (err) {
    return jsonResponse_({
      ok: false,
      error: err instanceof Error ? err.message : String(err),
    });
  }
}

function doPost(e) {
  try {
    if (!e || !e.postData || !e.postData.contents) {
      return jsonResponse_({ ok: false, error: '缺少請求內容' });
    }

    const payload = JSON.parse(e.postData.contents);
    const action = String(payload.action || 'submit').trim();

    if (action === 'registerTeam') {
      const registered = registerTeam_(payload.team || {});
      return jsonResponse_({ ok: true, playerId: registered.playerId });
    }

    if (action === 'checkAnswer') {
      const questionId = String(payload.questionId || '').trim();
      const selected = String(payload.selected || '').trim().toUpperCase();
      if (!questionId || !selected) {
        return jsonResponse_({ ok: false, error: '缺少題號或作答選項' });
      }
      const checkResult = checkSingleAnswer_(questionId, selected);
      return jsonResponse_({ ok: true, check: checkResult });
    }

    if (action === 'resetAllScores') {
      const passcode = String(payload.passcode || '').trim();
      if (passcode !== ADMIN_PASSCODE) {
        return jsonResponse_({ ok: false, error: '管理員密碼驗證失敗' });
      }
      const includeTeams = Boolean(payload.includeTeams);
      const resetSummary = resetAllScores_(includeTeams);
      return jsonResponse_({
        ok: true,
        clearedAnswerRows: resetSummary.clearedAnswerRows,
        clearedTeamRows: resetSummary.clearedTeamRows,
      });
    }

    const playerId = String(payload.playerId || '').trim();
    const answers = Array.isArray(payload.answers) ? payload.answers : [];
    const passThreshold = parseInt(String(payload.passThreshold || '3'), 10);

    if (!playerId) {
      return jsonResponse_({ ok: false, error: '請輸入有效的小隊 ID' });
    }
    if (answers.length === 0) {
      return jsonResponse_({ ok: false, error: '作答列表為空' });
    }
    if (Number.isNaN(passThreshold) || passThreshold < 1) {
      return jsonResponse_({ ok: false, error: '通過門檻格式不正確' });
    }

    const result = gradeAndRecord_(playerId, answers, passThreshold);
    return jsonResponse_({ ok: true, result: result });
  } catch (err) {
    return jsonResponse_({
      ok: false,
      error: err instanceof Error ? err.message : String(err),
    });
  }
}

/**
 * 將首頁輸入的 5 個小隊欄位寫入「黃金島」工作表
 * 欄位：ID、班級、第幾小隊、小隊名稱、小隊長、小隊人數、登錄時間
 */
function registerTeam_(team) {
  const className = String(team.className || '').trim();
  const teamNumber = String(team.teamNumber || '').trim();
  const teamName = String(team.teamName || '').trim();
  const teamLeader = String(team.teamLeader || '').trim();
  const teamSize = parseInt(String(team.teamSize || ''), 10);

  if (!className || !teamNumber || !teamName || !teamLeader) {
    throw new Error('請完整填寫班級、第幾小隊、小隊名稱、小隊長');
  }
  if (Number.isNaN(teamSize) || teamSize < 1 || teamSize > 10) {
    throw new Error('小隊人數必須為 1 至 10 的整數');
  }

  const normalizedTeamNo = /^第/.test(teamNumber) ? teamNumber : '第' + teamNumber + '小隊';
  const playerId = className + '-' + normalizedTeamNo + '-' + teamName;
  const nowStr = Utilities.formatDate(new Date(), 'Asia/Taipei', 'yyyy-MM-dd HH:mm:ss');

  const lock = LockService.getScriptLock();
  lock.waitLock(15000);

  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ensureTeamSheet_(ss);
    const rows = sheet.getDataRange().getValues();
    let existingRowIndex = -1;

    for (let i = 1; i < rows.length; i++) {
      if (String(rows[i][0] || '').trim() === playerId) {
        existingRowIndex = i + 1;
        break;
      }
    }

    const rowValues = [[playerId, className, teamNumber, teamName, teamLeader, teamSize, nowStr]];
    const targetRow = existingRowIndex !== -1 ? existingRowIndex : sheet.getLastRow() + 1;

    sheet.getRange(targetRow, 1, 1, 3).setNumberFormat('@');
    sheet.getRange(targetRow, 1, 1, TEAM_HEADERS.length).setValues(rowValues);
  } finally {
    lock.releaseLock();
  }

  return { playerId: playerId };
}

/**
 * 從「題目」工作表隨機撈取 N 題，嚴格移除「解答」欄位
 */
function getRandomQuestions_(count) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(SHEET_QUESTIONS);
  if (!sheet) {
    throw new Error('找不到「' + SHEET_QUESTIONS + '」工作表');
  }

  const values = sheet.getDataRange().getValues();
  if (values.length <= 1) {
    throw new Error('「' + SHEET_QUESTIONS + '」工作表尚無題目資料');
  }

  const pool = [];
  for (let i = 1; i < values.length; i++) {
    const row = values[i];
    const id = String(row[0] || '').trim();
    const question = String(row[1] || '').trim();
    const answer = String(row[6] || '').trim();
    // 跳過空列或尚未填寫解答的草稿列
    if (!id || !question || !answer) continue;

    pool.push({
      id: id,
      question: question,
      options: {
        A: String(row[2] || '').trim(),
        B: String(row[3] || '').trim(),
        C: String(row[4] || '').trim(),
        D: String(row[5] || '').trim(),
      },
      hall: String(row[8] || '').trim() || undefined,
      exhibit: String(row[9] || '').trim() || undefined,
    });
  }

  if (pool.length === 0) {
    throw new Error('「' + SHEET_QUESTIONS + '」工作表沒有有效題目');
  }

  // Fisher-Yates 洗牌
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const tmp = pool[i];
    pool[i] = pool[j];
    pool[j] = tmp;
  }

  return pool.slice(0, Math.min(count, pool.length));
}

/**
 * 單題即時對答（不外洩正解，僅回傳是否答對；答對時一併回傳探險小知識）
 */
function checkSingleAnswer_(questionId, selected) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const questionSheet = ss.getSheetByName(SHEET_QUESTIONS);
  if (!questionSheet) {
    throw new Error('找不到「' + SHEET_QUESTIONS + '」工作表');
  }

  const rows = questionSheet.getDataRange().getValues();
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    if (String(row[0] || '').trim() === questionId) {
      const correctAnswer = String(row[6] || '').trim().toUpperCase();
      const isCorrect = selected === correctAnswer;
      const explanation = isCorrect ? String(row[7] || '').trim() : '';
      return {
        questionId: questionId,
        isCorrect: isCorrect,
        pointsEarned: isCorrect ? POINTS_PER_QUESTION : 0,
        explanation: explanation || undefined,
      };
    }
  }

  throw new Error('找不到題號：' + questionId);
}

/**
 * 伺服器端計分並以 LockService 原子更新「回答」工作表
 */
function gradeAndRecord_(playerId, answers, passThreshold) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const questionSheet = ss.getSheetByName(SHEET_QUESTIONS);
  if (!questionSheet) {
    throw new Error('找不到「' + SHEET_QUESTIONS + '」工作表');
  }

  const qValues = questionSheet.getDataRange().getValues();
  const answerKeyMap = {};
  for (let i = 1; i < qValues.length; i++) {
    const row = qValues[i];
    const qId = String(row[0] || '').trim();
    if (!qId) continue;
    answerKeyMap[qId] = {
      question: String(row[1] || '').trim(),
      correctAnswer: String(row[6] || '').trim().toUpperCase(),
      explanation: String(row[7] || '').trim(),
      options: {
        A: String(row[2] || '').trim(),
        B: String(row[3] || '').trim(),
        C: String(row[4] || '').trim(),
        D: String(row[5] || '').trim(),
      },
    };
  }

  let correctCount = 0;
  let firstTryGreenCount = 0;
  const review = [];

  for (let i = 0; i < answers.length; i++) {
    const item = answers[i];
    const qId = String(item.questionId || '').trim();
    const selected = String(item.selected || '').trim().toUpperCase();
    const hadMistake = Boolean(item.hadMistake);
    const meta = answerKeyMap[qId];

    if (!meta) {
      throw new Error('找不到題號：' + qId);
    }

    const isCorrect = selected === meta.correctAnswer;
    if (isCorrect) {
      correctCount += 1;
      if (!hadMistake) {
        firstTryGreenCount += 1;
      }
    }

    review.push({
      questionId: qId,
      question: meta.question,
      selected: selected,
      selectedText: meta.options[selected] || '',
      correctAnswer: meta.correctAnswer,
      correctText: meta.options[meta.correctAnswer] || '',
      isCorrect: isCorrect,
      explanation: meta.explanation || undefined,
    });
  }

  const totalQuestions = answers.length;
  const isAllGreen =
    totalQuestions >= PERFECT_REQUIRED_STATIONS &&
    correctCount === totalQuestions &&
    firstTryGreenCount === totalQuestions;
  const perfectBonus = isAllGreen ? PERFECT_ALL_GREEN_BONUS : 0;
  const score = correctCount * POINTS_PER_QUESTION + perfectBonus;
  const isPassed = correctCount >= passThreshold;
  const nowStr = Utilities.formatDate(new Date(), 'Asia/Taipei', 'yyyy-MM-dd HH:mm:ss');

  const lock = LockService.getScriptLock();
  lock.waitLock(15000);

  let stats;
  try {
    const answerSheet = ensureAnswerSheet_(ss);
    const rows = answerSheet.getDataRange().getValues();
    let existingRowIndex = -1;

    for (let i = 1; i < rows.length; i++) {
      if (String(rows[i][0] || '').trim() === playerId) {
        existingRowIndex = i + 1;
        break;
      }
    }

    if (existingRowIndex !== -1) {
      const prev = rows[existingRowIndex - 1];
      const prevAttempts = Number(prev[1] || 0);
      const prevTotalScore = Number(prev[2] || 0);
      const prevBestScore = Number(prev[3] || 0);
      const hasPassedBefore = prev[4] !== '' && prev[4] !== null && prev[4] !== undefined;

      const nextAttempts = prevAttempts + 1;
      const nextTotalScore = prevTotalScore + score;
      const nextBestScore = Math.max(prevBestScore, score);
      // 若同 ID 已通關過，第一次通關分數與花了幾次通關不覆蓋
      const nextFirstPassScore = hasPassedBefore ? Number(prev[4]) : isPassed ? score : '';
      const nextAttemptsToPass = hasPassedBefore
        ? Number(prev[5])
        : isPassed
          ? nextAttempts
          : '';

      const range = answerSheet.getRange(existingRowIndex, 1, 1, 7);
      answerSheet.getRange(existingRowIndex, 1).setNumberFormat('@');
      range.setValues([
        [
          playerId,
          nextAttempts,
          nextTotalScore,
          nextBestScore,
          nextFirstPassScore,
          nextAttemptsToPass,
          nowStr,
        ],
      ]);

      stats = {
        attempts: nextAttempts,
        totalScore: nextTotalScore,
        bestScore: nextBestScore,
        firstPassScore: nextFirstPassScore === '' ? null : nextFirstPassScore,
        attemptsToPass: nextAttemptsToPass === '' ? null : nextAttemptsToPass,
        lastPlayedAt: nowStr,
      };
    } else {
      const nextRow = answerSheet.getLastRow() + 1;
      const firstPassScore = isPassed ? score : '';
      const attemptsToPass = isPassed ? 1 : '';

      answerSheet.getRange(nextRow, 1).setNumberFormat('@');
      answerSheet
        .getRange(nextRow, 1, 1, 7)
        .setValues([[playerId, 1, score, score, firstPassScore, attemptsToPass, nowStr]]);

      stats = {
        attempts: 1,
        totalScore: score,
        bestScore: score,
        firstPassScore: firstPassScore === '' ? null : firstPassScore,
        attemptsToPass: attemptsToPass === '' ? null : attemptsToPass,
        lastPlayedAt: nowStr,
      };
    }
  } finally {
    lock.releaseLock();
  }

  return {
    playerId: playerId,
    score: score,
    correctCount: correctCount,
    totalQuestions: totalQuestions,
    passThreshold: passThreshold,
    isPassed: isPassed,
    isAllGreen: isAllGreen,
    perfectBonus: perfectBonus,
    stats: stats,
    review: review,
  };
}

function ensureTeamSheet_(ss) {
  let sheet = ss.getSheetByName(SHEET_TEAMS);
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_TEAMS);
  }
  if (sheet.getLastRow() === 0) {
    sheet.getRange(1, 1, 1, TEAM_HEADERS.length).setValues([TEAM_HEADERS]);
    sheet.setFrozenRows(1);
  }
  return sheet;
}

function ensureAnswerSheet_(ss) {
  let sheet = ss.getSheetByName(SHEET_ANSWERS);
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_ANSWERS);
  }
  if (sheet.getLastRow() === 0) {
    sheet.getRange(1, 1, 1, ANSWER_HEADERS.length).setValues([ANSWER_HEADERS]);
    sheet.setFrozenRows(1);
  }
  return sheet;
}

function jsonResponse_(data) {
  return ContentService.createTextOutput(JSON.stringify(data)).setMimeType(
    ContentService.MimeType.JSON,
  );
}

/**
 * 結合「黃金島」與「回答」工作表，以班級為單位取各班最高分小隊，回傳前 N 名優勝班級與所有小隊清單
 */
function getLeaderboard_(topLimit) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const teamSheet = ss.getSheetByName(SHEET_TEAMS);
  const answerSheet = ss.getSheetByName(SHEET_ANSWERS);

  const teamMetaById = {};
  if (teamSheet && teamSheet.getLastRow() > 1) {
    const tRows = teamSheet.getDataRange().getValues();
    for (let i = 1; i < tRows.length; i++) {
      const row = tRows[i];
      const id = String(row[0] || '').trim();
      if (!id) continue;
      teamMetaById[id] = {
        className: String(row[1] || '').trim(),
        teamNumber: String(row[2] || '').trim(),
        teamName: String(row[3] || '').trim(),
        teamLeader: String(row[4] || '').trim(),
        teamSize: Number(row[5] || 0),
      };
    }
  }

  const allTeams = [];
  if (answerSheet && answerSheet.getLastRow() > 1) {
    const aRows = answerSheet.getDataRange().getValues();
    for (let i = 1; i < aRows.length; i++) {
      const row = aRows[i];
      const id = String(row[0] || '').trim();
      if (!id) continue;

      const meta = teamMetaById[id];
      const idParts = id.split('-');
      const className = (meta && meta.className) || idParts[0] || '未分班';
      const teamNumber = (meta && meta.teamNumber) || idParts[1] || '';
      const teamName = (meta && meta.teamName) || idParts.slice(2).join('-') || id;

      const lastPlayedCell = row[6];
      const lastPlayedAt =
        lastPlayedCell instanceof Date
          ? Utilities.formatDate(lastPlayedCell, 'Asia/Taipei', 'yyyy-MM-dd HH:mm:ss')
          : String(lastPlayedCell || '').trim();

      allTeams.push({
        playerId: id,
        className: className,
        teamNumber: teamNumber,
        teamName: teamName,
        teamLeader: (meta && meta.teamLeader) || '',
        bestScore: Number(row[3] || 0),
        attempts: Number(row[1] || 0),
        lastPlayedAt: lastPlayedAt,
      });
    }
  }

  // 分數由高到低排序（同分以闖關次數少者優先，再以較早完賽者優先）
  allTeams.sort(function (a, b) {
    if (b.bestScore !== a.bestScore) return b.bestScore - a.bestScore;
    if (a.attempts !== b.attempts) return a.attempts - b.attempts;
    return a.lastPlayedAt.localeCompare(b.lastPlayedAt);
  });

  // 以班級為單位，每班取成績最高的小隊
  const seenClass = {};
  const topClasses = [];
  for (let i = 0; i < allTeams.length; i++) {
    const entry = allTeams[i];
    if (seenClass[entry.className]) continue;
    seenClass[entry.className] = true;
    topClasses.push(entry);
    if (topClasses.length >= topLimit) break;
  }

  return {
    topClasses: topClasses,
    allTeams: allTeams,
  };
}

/**
 * 管理員全部重置成績：保留第 1 列標題，清空「回答」工作表所有成績列（可選同時清空「黃金島」報到列）
 */
function resetAllScores_(includeTeams) {
  const lock = LockService.getScriptLock();
  lock.waitLock(15000);

  let clearedAnswerRows = 0;
  let clearedTeamRows = 0;

  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const answerSheet = ensureAnswerSheet_(ss);
    const answerLastRow = answerSheet.getLastRow();
    if (answerLastRow > 1) {
      clearedAnswerRows = answerLastRow - 1;
      answerSheet
        .getRange(2, 1, clearedAnswerRows, Math.max(ANSWER_HEADERS.length, answerSheet.getLastColumn()))
        .clearContent();
    }

    if (includeTeams) {
      const teamSheet = ensureTeamSheet_(ss);
      const teamLastRow = teamSheet.getLastRow();
      if (teamLastRow > 1) {
        clearedTeamRows = teamLastRow - 1;
        teamSheet
          .getRange(2, 1, clearedTeamRows, Math.max(TEAM_HEADERS.length, teamSheet.getLastColumn()))
          .clearContent();
      }
    }
  } finally {
    lock.releaseLock();
  }

  return {
    clearedAnswerRows: clearedAnswerRows,
    clearedTeamRows: clearedTeamRows,
  };
}

/**
 * 輔助工具：在 Apps Script 編輯器手動執行一次即可自動建立「黃金島」「題目」「回答」表頭與範例題
 */
function initSheetsWithSampleData() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();

  ensureTeamSheet_(ss);

  let qSheet = ss.getSheetByName(SHEET_QUESTIONS);
  if (!qSheet) {
    qSheet = ss.insertSheet(SHEET_QUESTIONS);
  }
  if (qSheet.getLastRow() === 0) {
    qSheet.getRange(1, 1, 1, QUESTION_HEADERS.length).setValues([QUESTION_HEADERS]);
    qSheet.setFrozenRows(1);
    const samples = [
      ['Q01', '下列敘述何者「錯誤」？', '學名是澎湖諾氏古菱齒象', '又有直齒象之稱', '牙齒齒板磨蝕後中間部分擴大，形成圓形', '高約3.7公尺，長約7.8公尺', 'C', '', '生命科學廳', '澎湖古象'],
      ['Q02', '估一估：暴龍大約多高、多長？', '高約 4 公尺、長約 7 公尺', '一定是我的3倍高大', '高約10公尺、長約5公尺', '', 'A', '', '生命科學廳', '暴龍'],
      ['Q03', '古埃及人為什麼要保存遺體？', '為了當作傳家寶，世世代代放在家裡紀念', '相信靈魂在死後仍需要身體（依展板說明作答）', '為了向神明展現家族的財富與地位', '', 'B', '古埃及人相信人死後靈魂（包含「巴 Ba」與「卡 Ka」）會離開身體，並在來世重返原本的軀體獲得永生。為了讓靈魂能認出並回到自己的家，他們才發展出精細的防腐技術，將遺體製作成木乃伊並放入華麗的棺槨中妥善保護！', '生命科學廳', '木乃伊棺槨'],
      ['Q04', '找出最上層觀測星象的儀器、中層演示星空的球體各叫什麼？', '地動儀、日晷', '渾象、渾儀', '渾儀、渾象', '', 'C', '這座高達十多公尺的「水運儀象檯」是北宋科學家蘇頌等人發明的超大天文鐘，利用水力推動齒輪運轉，集結了「觀測、演示、報時」三大功能！最上層的「渾儀」用來實際觀測天體位置，中層的「渾象」會隨時間自動旋轉演示星空變化，最下層則有木偶定時敲鐘擊鼓報時，堪稱古代最精密的黑科技！', '人類文化廳', '水運儀象檯'],
      ['Q05', '古代太醫院常用這座「針灸銅人」來考驗醫學生，請問考官會用什麼神奇的方法來測試學生有沒有扎準穴位？', '扎準穴位時，銅人內部會敲響清脆的鐘聲', '銅人表面塗蠟、內部裝水，扎準穴位就會噴出水來', '扎準穴位時，銅人手上的機關會自動彈開', '', 'B', '這座全身佈滿線條與小孔的「經絡銅人」，源自北宋醫官王惟一設計的「天聖針灸銅人」，全身刻有精密的經絡路線與數百個穴位，是古代醫學教學與考試的超級教具！考試時，考官會先在銅人肚子里注滿水，再於表面塗上一層厚厚的黃蠟遮住穴位小孔；考生必須憑真功夫找準位置下針，只要一針扎對穴位，水就會立刻從孔中噴出來，若是扎偏了就會被銅壁擋住，堪稱古代最嚴格的「實戰模擬考」！', '人類文化廳', '經絡銅人'],
      ['Q06', '拼板舟主要有哪三種顏色？', '紅、黑、白', '藍、綠、黃', '紅、黃、綠', '', 'A', '拼板舟（達悟語稱為 Tatala）是蘭嶼達悟族人最重要的海洋文化寶藏，整艘船不用一根鐵釘，完全依靠精密的木釘與卡榫拼接而成！船身上的傳統彩繪顏料全取材自大自然：白色來自研磨的貝殼或珊瑚石灰，象徵純潔；紅色來自紅土，代表熱情與勇敢；黑色則是鍋底灰或木炭，象徵莊嚴與驅邪避凶。這三種顏色搭配船首閃亮的「船眼紋」，就像為小船裝上導航雷達，守護族人在大海中平安航行！', '人類文化廳', '拼板舟'],
      ['Q07', '觀察吸盤，牠的「秘密武器」是什麼？', '吸盤內藏有能發光的螢光液體', '吸盤上的環形利齒', '吸盤能釋放高壓電流擊暈獵物', '', 'B', '這隻來自深海的巨無霸「大王魷魚」，在兩條最長的捕食「觸腕」末端，長滿了帶有環形利齒（幾丁質齒環）的吸盤！這些鋸齒狀的利齒就像一圈圈小鋸子，一旦抓住獵物就會緊緊嵌進皮肉裡讓對手無法掙脫。就連深海大魔王「抹香鯨」的皮膚上，也常常能發現與大王魷魚搏鬥後留下的圓形齒痕傷疤呢！', '地球環境廳', '大王魷魚'],
      ['Q08', '下列何者不是此區的生物？', '麝牛', '北極兔', '傑克兔', '雪鴞', 'C', '傑克兔（沙漠居民）：生活在美國西南部等炎熱乾燥的沙漠與草原區。為了在酷熱環境中快速散熱，牠演化出又長又大的耳朵（就像一對天然散熱器），毛色也是方便躲在沙土與灌木叢中的灰褐色。', '地球環境廳', '加拿大凍原'],
    ];
    qSheet.getRange(2, 1, samples.length, QUESTION_HEADERS.length).setValues(samples);
  }

  ensureAnswerSheet_(ss);
}
