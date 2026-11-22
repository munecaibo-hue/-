import { appEnv } from '../../../lib/env';
import {
  checkMockAnswer,
  clearMockDemoStorage,
  fetchMockLeaderboard,
  fetchMockQuestions,
  registerMockTeam,
  submitMockAnswers,
} from '../data/mock-questions';
import type {
  AnswerSubmissionItem,
  CheckAnswerResult,
  LeaderboardData,
  OptionKey,
  QuizQuestion,
  QuizResult,
  TeamInfo,
} from '../schemas/quiz.schema';
import {
  checkAnswerResponseSchema,
  fetchQuestionsResponseSchema,
  leaderboardResponseSchema,
  registerTeamResponseSchema,
  resetAllScoresResponseSchema,
  submitQuizResponseSchema,
} from '../schemas/quiz.schema';

export async function registerTeam(team: TeamInfo): Promise<string> {
  if (appEnv.GOOGLE_APP_SCRIPT_URL === null) {
    return registerMockTeam(team);
  }

  const response = await fetch(appEnv.GOOGLE_APP_SCRIPT_URL, {
    method: 'POST',
    redirect: 'follow',
    headers: {
      'Content-Type': 'text/plain;charset=utf-8',
    },
    body: JSON.stringify({
      action: 'registerTeam',
      team,
    }),
  });

  if (!response.ok) {
    throw new Error(`無法登錄小隊資料至「黃金島」工作表（HTTP ${response.status}）`);
  }

  const raw: unknown = await response.json();
  const parsed = registerTeamResponseSchema.safeParse(raw);
  if (!parsed.success) {
    throw new Error('小隊登錄回應格式不正確，請確認已部署最新版 Google Apps Script');
  }

  if (!parsed.data.ok) {
    if (parsed.data.error.includes('不支援的 action')) {
      throw new Error(
        `Google Apps Script 尚未部署新版本（${parsed.data.error}）。請將最新 gas/Code.gs 貼入 Apps Script，並執行「部署 → 管理部署作業 → 編輯 → 新版本 → 部署」。`,
      );
    }
    throw new Error(parsed.data.error);
  }

  return parsed.data.playerId;
}

export async function fetchQuizQuestions(count: number): Promise<QuizQuestion[]> {
  if (appEnv.GOOGLE_APP_SCRIPT_URL === null) {
    return fetchMockQuestions(count);
  }

  const endpoint = new URL(appEnv.GOOGLE_APP_SCRIPT_URL);
  endpoint.searchParams.set('action', 'questions');
  endpoint.searchParams.set('count', String(count));

  const response = await fetch(endpoint.toString(), {
    method: 'GET',
    redirect: 'follow',
  });

  if (!response.ok) {
    throw new Error(`無法從題庫取得題目（HTTP ${response.status}）`);
  }

  const raw: unknown = await response.json();
  const parsed = fetchQuestionsResponseSchema.safeParse(raw);
  if (!parsed.success) {
    throw new Error('題庫回傳格式不正確，請確認 Google Apps Script 部署版本');
  }

  if (!parsed.data.ok) {
    if (parsed.data.error.includes('不支援的 action')) {
      throw new Error(
        `Google Apps Script 尚未部署新版本（${parsed.data.error}）。請將最新 gas/Code.gs 貼入 Apps Script，並執行「部署 → 管理部署作業 → 編輯 → 新版本 → 部署」。`,
      );
    }
    throw new Error(parsed.data.error);
  }

  return parsed.data.questions;
}

export async function checkQuizAnswer(
  questionId: string,
  selected: OptionKey,
): Promise<CheckAnswerResult> {
  if (appEnv.GOOGLE_APP_SCRIPT_URL === null) {
    return checkMockAnswer(questionId, selected);
  }

  const response = await fetch(appEnv.GOOGLE_APP_SCRIPT_URL, {
    method: 'POST',
    redirect: 'follow',
    headers: {
      'Content-Type': 'text/plain;charset=utf-8',
    },
    body: JSON.stringify({
      action: 'checkAnswer',
      questionId,
      selected,
    }),
  });

  if (!response.ok) {
    throw new Error(`對答連線失敗（HTTP ${response.status}）`);
  }

  const raw: unknown = await response.json();
  const parsed = checkAnswerResponseSchema.safeParse(raw);
  if (!parsed.success) {
    throw new Error('對答回應格式不正確，請確認已部署最新版 Google Apps Script');
  }

  if (!parsed.data.ok) {
    if (parsed.data.error.includes('不支援的 action')) {
      throw new Error(
        `Google Apps Script 尚未部署新版本（${parsed.data.error}）。請將最新 gas/Code.gs 貼入 Apps Script，並執行「部署 → 管理部署作業 → 編輯 → 新版本 → 部署」。`,
      );
    }
    throw new Error(parsed.data.error);
  }

  return parsed.data.check;
}

export async function submitQuizAnswers(
  playerId: string,
  answers: readonly AnswerSubmissionItem[],
  passThreshold: number,
): Promise<QuizResult> {
  if (appEnv.GOOGLE_APP_SCRIPT_URL === null) {
    return submitMockAnswers(playerId, answers, passThreshold);
  }

  // 使用 text/plain 避開瀏覽器對 Google Apps Script 發出 CORS preflight (OPTIONS)
  const response = await fetch(appEnv.GOOGLE_APP_SCRIPT_URL, {
    method: 'POST',
    redirect: 'follow',
    headers: {
      'Content-Type': 'text/plain;charset=utf-8',
    },
    body: JSON.stringify({
      action: 'submit',
      playerId,
      answers,
      passThreshold,
    }),
  });

  if (!response.ok) {
    throw new Error(`送出成績失敗（HTTP ${response.status}）`);
  }

  const raw: unknown = await response.json();
  const parsed = submitQuizResponseSchema.safeParse(raw);
  if (!parsed.success) {
    throw new Error('結算回應格式不正確，請檢查 Google Apps Script 程式碼');
  }

  if (!parsed.data.ok) {
    if (parsed.data.error.includes('不支援的 action')) {
      throw new Error(
        `Google Apps Script 尚未部署新版本（${parsed.data.error}）。請將最新 gas/Code.gs 貼入 Apps Script，並執行「部署 → 管理部署作業 → 編輯 → 新版本 → 部署」。`,
      );
    }
    throw new Error(parsed.data.error);
  }

  return parsed.data.result;
}

export async function fetchLeaderboard(): Promise<LeaderboardData> {
  if (appEnv.GOOGLE_APP_SCRIPT_URL === null) {
    return fetchMockLeaderboard(5);
  }

  const endpoint = new URL(appEnv.GOOGLE_APP_SCRIPT_URL);
  endpoint.searchParams.set('action', 'leaderboard');

  const response = await fetch(endpoint.toString(), {
    method: 'GET',
    redirect: 'follow',
  });

  if (!response.ok) {
    throw new Error(`無法載入成績榜（HTTP ${response.status}）`);
  }

  const raw: unknown = await response.json();
  const parsed = leaderboardResponseSchema.safeParse(raw);
  if (!parsed.success) {
    throw new Error('成績榜回應格式不正確，請確認已部署最新版 Google Apps Script');
  }

  if (!parsed.data.ok) {
    if (parsed.data.error.includes('不支援的 action')) {
      throw new Error(
        `Google Apps Script 尚未部署新版本（${parsed.data.error}）。請將最新 gas/Code.gs 貼入 Apps Script，並執行「部署 → 管理部署作業 → 編輯 → 新版本 → 部署」。`,
      );
    }
    throw new Error(parsed.data.error);
  }

  return {
    topClasses: parsed.data.topClasses,
    allTeams: parsed.data.allTeams,
  };
}

export async function resetAllScores(
  passcode: string,
  includeTeams = false,
): Promise<{ clearedAnswerRows: number; clearedTeamRows: number }> {
  if (appEnv.GOOGLE_APP_SCRIPT_URL === null) {
    await new Promise((resolve) => window.setTimeout(resolve, 180));
    return clearMockDemoStorage(includeTeams);
  }

  const response = await fetch(appEnv.GOOGLE_APP_SCRIPT_URL, {
    method: 'POST',
    redirect: 'follow',
    headers: {
      'Content-Type': 'text/plain;charset=utf-8',
    },
    body: JSON.stringify({
      action: 'resetAllScores',
      passcode,
      includeTeams,
    }),
  });

  if (!response.ok) {
    throw new Error(`重置成績失敗（HTTP ${response.status}）`);
  }

  const raw: unknown = await response.json();
  const parsed = resetAllScoresResponseSchema.safeParse(raw);
  if (!parsed.success) {
    throw new Error('重置成績回應格式不正確，請確認已部署最新版 Google Apps Script');
  }

  if (!parsed.data.ok) {
    if (parsed.data.error.includes('不支援的 action')) {
      throw new Error(
        `Google Apps Script 尚未部署新版本（${parsed.data.error}）。請將最新 gas/Code.gs 貼入 Apps Script，並執行「部署 → 管理部署作業 → 編輯 → 新版本 → 部署」。`,
      );
    }
    throw new Error(parsed.data.error);
  }

  return {
    clearedAnswerRows: parsed.data.clearedAnswerRows,
    clearedTeamRows: parsed.data.clearedTeamRows,
  };
}
