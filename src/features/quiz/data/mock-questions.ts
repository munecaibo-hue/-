import { z } from 'zod';
import { shuffleArray } from '../../../lib/shuffle';
import type {
  AnswerSubmissionItem,
  CheckAnswerResult,
  LeaderboardData,
  LeaderboardEntry,
  OptionKey,
  PlayerStats,
  QuizQuestion,
  QuizResult,
  TeamInfo,
} from '../schemas/quiz.schema';
import { buildTeamPlayerId, playerStatsSchema, teamInfoSchema } from '../schemas/quiz.schema';

export const POINTS_PER_QUESTION = 10;
export const PERFECT_ALL_GREEN_BONUS = 20;
export const PERFECT_REQUIRED_STATIONS = 8;

interface MockQuestionRecord extends QuizQuestion {
  readonly answer: OptionKey;
  readonly explanation: string;
}

const DEMO_STORAGE_KEY = 'golden-island-demo-records-v1';
const DEMO_TEAMS_STORAGE_KEY = 'golden-island-demo-teams-v1';

const MOCK_QUESTION_BANK: readonly MockQuestionRecord[] = [
  {
    id: 'Q01',
    hall: '生命科學廳',
    exhibit: '澎湖古象',
    question: '下列敘述何者「錯誤」？',
    options: {
      A: '學名是澎湖諾氏古菱齒象',
      B: '又有直齒象之稱',
      C: '牙齒齒板磨蝕後中間部分擴大，形成圓形',
      D: '高約3.7公尺，長約7.8公尺',
    },
    answer: 'C',
    explanation: '',
  },
  {
    id: 'Q02',
    hall: '生命科學廳',
    exhibit: '暴龍',
    question: '估一估：暴龍大約多高、多長？',
    options: {
      A: '高約 4 公尺、長約 7 公尺',
      B: '一定是我的3倍高大',
      C: '高約10公尺、長約5公尺',
      D: '',
    },
    answer: 'A',
    explanation: '',
  },
  {
    id: 'Q03',
    hall: '生命科學廳',
    exhibit: '木乃伊棺槨',
    question: '古埃及人為什麼要保存遺體？',
    options: {
      A: '為了當作傳家寶，世世代代放在家裡紀念',
      B: '相信靈魂在死後仍需要身體（依展板說明作答）',
      C: '為了向神明展現家族的財富與地位',
      D: '',
    },
    answer: 'B',
    explanation:
      '古埃及人相信人死後靈魂（包含「巴 Ba」與「卡 Ka」）會離開身體，並在來世重返原本的軀體獲得永生。為了讓靈魂能認出並回到自己的家，他們才發展出精細的防腐技術，將遺體製作成木乃伊並放入華麗的棺槨中妥善保護！',
  },
  {
    id: 'Q04',
    hall: '人類文化廳',
    exhibit: '水運儀象檯',
    question: '找出最上層觀測星象的儀器、中層演示星空的球體各叫什麼？',
    options: {
      A: '地動儀、日晷',
      B: '渾象、渾儀',
      C: '渾儀、渾象',
      D: '',
    },
    answer: 'C',
    explanation:
      '這座高達十多公尺的「水運儀象檯」是北宋科學家蘇頌等人發明的超大天文鐘，利用水力推動齒輪運轉，集結了「觀測、演示、報時」三大功能！最上層的「渾儀」用來實際觀測天體位置，中層的「渾象」會隨時間自動旋轉演示星空變化，最下層則有木偶定時敲鐘擊鼓報時，堪稱古代最精密的黑科技！',
  },
  {
    id: 'Q05',
    hall: '人類文化廳',
    exhibit: '經絡銅人',
    question:
      '古代太醫院常用這座「針灸銅人」來考驗醫學生，請問考官會用什麼神奇的方法來測試學生有沒有扎準穴位？',
    options: {
      A: '扎準穴位時，銅人內部會敲響清脆的鐘聲',
      B: '銅人表面塗蠟、內部裝水，扎準穴位就會噴出水來',
      C: '扎準穴位時，銅人手上的機關會自動彈開',
      D: '',
    },
    answer: 'B',
    explanation:
      '這座全身佈滿線條與小孔的「經絡銅人」，源自北宋醫官王惟一設計的「天聖針灸銅人」，全身刻有精密的經絡路線與數百個穴位，是古代醫學教學與考試的超級教具！考試時，考官會先在銅人肚子里注滿水，再於表面塗上一層厚厚的黃蠟遮住穴位小孔；考生必須憑真功夫找準位置下針，只要一針扎對穴位，水就會立刻從孔中噴出來，若是扎偏了就會被銅壁擋住，堪稱古代最嚴格的「實戰模擬考」！',
  },
  {
    id: 'Q06',
    hall: '人類文化廳',
    exhibit: '拼板舟',
    question: '拼板舟主要有哪三種顏色？',
    options: {
      A: '紅、黑、白',
      B: '藍、綠、黃',
      C: '紅、黃、綠',
      D: '',
    },
    answer: 'A',
    explanation:
      '拼板舟（達悟語稱為 Tatala）是蘭嶼達悟族人最重要的海洋文化寶藏，整艘船不用一根鐵釘，完全依靠精密的木釘與卡榫拼接而成！船身上的傳統彩繪顏料全取材自大自然：白色來自研磨的貝殼或珊瑚石灰，象徵純潔；紅色來自紅土，代表熱情與勇敢；黑色則是鍋底灰或木炭，象徵莊嚴與驅邪避凶。這三種顏色搭配船首閃亮的「船眼紋」，就像為小船裝上導航雷達，守護族人在大海中平安航行！',
  },
  {
    id: 'Q07',
    hall: '地球環境廳',
    exhibit: '大王魷魚',
    question: '觀察吸盤，牠的「秘密武器」是什麼？',
    options: {
      A: '吸盤內藏有能發光的螢光液體',
      B: '吸盤上的環形利齒',
      C: '吸盤能釋放高壓電流擊暈獵物',
      D: '',
    },
    answer: 'B',
    explanation:
      '這隻來自深海的巨無霸「大王魷魚」，在兩條最長的捕食「觸腕」末端，長滿了帶有環形利齒（幾丁質齒環）的吸盤！這些鋸齒狀的利齒就像一圈圈小鋸子，一旦抓住獵物就會緊緊嵌進皮肉裡讓對手無法掙脫。就連深海大魔王「抹香鯨」的皮膚上，也常常能發現與大王魷魚搏鬥後留下的圓形齒痕傷疤呢！',
  },
  {
    id: 'Q08',
    hall: '地球環境廳',
    exhibit: '加拿大凍原',
    question: '下列何者不是此區的生物？',
    options: {
      A: '麝牛',
      B: '北極兔',
      C: '傑克兔',
      D: '雪鴞',
    },
    answer: 'C',
    explanation:
      '傑克兔（沙漠居民）：生活在美國西南部等炎熱乾燥的沙漠與草原區。為了在酷熱環境中快速散熱，牠演化出又長又大的耳朵（就像一對天然散熱器），毛色也是方便躲在沙土與灌木叢中的灰褐色。',
  },
];

const storedRecordsSchema = z.record(z.string(), playerStatsSchema);
const storedTeamsSchema = z.record(z.string(), teamInfoSchema);

export async function registerMockTeam(team: TeamInfo): Promise<string> {
  await new Promise((resolve) => window.setTimeout(resolve, 160));
  const playerId = buildTeamPlayerId(team);
  try {
    const raw = window.localStorage.getItem(DEMO_TEAMS_STORAGE_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : {};
    const validated = storedTeamsSchema.safeParse(parsed);
    const teams: Record<string, TeamInfo> = validated.success ? { ...validated.data } : {};
    teams[playerId] = team;
    window.localStorage.setItem(DEMO_TEAMS_STORAGE_KEY, JSON.stringify(teams));
  } catch {
    // 隱私模式等無法寫入 localStorage 時不中斷闖關流程
  }
  return playerId;
}

function readDemoRecords(): Record<string, PlayerStats> {
  try {
    const raw = window.localStorage.getItem(DEMO_STORAGE_KEY);
    if (!raw) return {};
    const parsed: unknown = JSON.parse(raw);
    const validated = storedRecordsSchema.safeParse(parsed);
    return validated.success ? validated.data : {};
  } catch {
    return {};
  }
}

function writeDemoRecords(records: Record<string, PlayerStats>): void {
  try {
    window.localStorage.setItem(DEMO_STORAGE_KEY, JSON.stringify(records));
  } catch {
    // 隱私模式等無法寫入 localStorage 時不中斷遊戲結算流程
  }
}

function formatLocalTimestamp(date: Date): string {
  const pad = (n: number): string => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}

export async function fetchMockQuestions(count: number): Promise<QuizQuestion[]> {
  await new Promise((resolve) => window.setTimeout(resolve, 260));
  return shuffleArray(MOCK_QUESTION_BANK)
    .slice(0, Math.min(count, MOCK_QUESTION_BANK.length))
    .map(({ id, question, options, hall, exhibit }) => ({
      id,
      question,
      options,
      hall,
      exhibit,
    }));
}

export async function checkMockAnswer(
  questionId: string,
  selected: OptionKey,
): Promise<CheckAnswerResult> {
  await new Promise((resolve) => window.setTimeout(resolve, 140));
  const record = MOCK_QUESTION_BANK.find((q) => q.id === questionId);
  if (!record) {
    throw new Error(`找不到題號：${questionId}`);
  }
  const isCorrect = selected === record.answer;
  return {
    questionId,
    isCorrect,
    pointsEarned: isCorrect ? POINTS_PER_QUESTION : 0,
    explanation: isCorrect && record.explanation ? record.explanation : undefined,
  };
}

export async function submitMockAnswers(
  playerId: string,
  answers: readonly AnswerSubmissionItem[],
  passThreshold: number,
): Promise<QuizResult> {
  await new Promise((resolve) => window.setTimeout(resolve, 320));

  const bankById = new Map(MOCK_QUESTION_BANK.map((q) => [q.id, q]));
  let correctCount = 0;
  let firstTryGreenCount = 0;

  const review = answers.map((item) => {
    const questionRecord = bankById.get(item.questionId);
    if (!questionRecord) {
      throw new Error(`找不到題號：${item.questionId}`);
    }
    const isCorrect = item.selected === questionRecord.answer;
    if (isCorrect) {
      correctCount += 1;
      if (!item.hadMistake) {
        firstTryGreenCount += 1;
      }
    }

    return {
      questionId: item.questionId,
      question: questionRecord.question,
      selected: item.selected,
      selectedText: questionRecord.options[item.selected],
      correctAnswer: questionRecord.answer,
      correctText: questionRecord.options[questionRecord.answer],
      isCorrect,
      explanation: questionRecord.explanation || undefined,
    };
  });

  const totalQuestions = answers.length;
  const isAllGreen =
    totalQuestions >= PERFECT_REQUIRED_STATIONS &&
    correctCount === totalQuestions &&
    firstTryGreenCount === totalQuestions;
  const perfectBonus = isAllGreen ? PERFECT_ALL_GREEN_BONUS : 0;
  const score = correctCount * POINTS_PER_QUESTION + perfectBonus;
  const isPassed = correctCount >= passThreshold;
  const nowStr = formatLocalTimestamp(new Date());

  const records = readDemoRecords();
  const prev = records[playerId];
  const nextAttempts = (prev?.attempts ?? 0) + 1;
  const nextTotalScore = (prev?.totalScore ?? 0) + score;
  const nextBestScore = Math.max(prev?.bestScore ?? 0, score);
  const hasPassedBefore = prev?.firstPassScore !== null && prev?.firstPassScore !== undefined;

  const stats: PlayerStats = {
    attempts: nextAttempts,
    totalScore: nextTotalScore,
    bestScore: nextBestScore,
    firstPassScore: hasPassedBefore ? prev.firstPassScore : isPassed ? score : null,
    attemptsToPass: hasPassedBefore ? prev.attemptsToPass : isPassed ? nextAttempts : null,
    lastPlayedAt: nowStr,
  };

  records[playerId] = stats;
  writeDemoRecords(records);

  return {
    playerId,
    score,
    correctCount,
    totalQuestions,
    passThreshold,
    isPassed,
    isAllGreen,
    perfectBonus,
    stats,
    review,
  };
}

export async function fetchMockLeaderboard(topLimit = 5): Promise<LeaderboardData> {
  await new Promise((resolve) => window.setTimeout(resolve, 120));

  const records = readDemoRecords();
  let teams: Record<string, TeamInfo> = {};
  try {
    const raw = window.localStorage.getItem(DEMO_TEAMS_STORAGE_KEY);
    if (raw) {
      const parsed: unknown = JSON.parse(raw);
      const validated = storedTeamsSchema.safeParse(parsed);
      if (validated.success) {
        teams = validated.data;
      }
    }
  } catch {
    teams = {};
  }

  const allTeams: LeaderboardEntry[] = Object.entries(records).map(([playerId, stats]) => {
    const meta = teams[playerId];
    const parts = playerId.split('-');
    return {
      playerId,
      className: meta?.className ?? parts[0] ?? '未分班',
      teamNumber: meta?.teamNumber ?? parts[1] ?? '',
      teamName: meta?.teamName ?? (parts.slice(2).join('-') || playerId),
      teamLeader: meta?.teamLeader ?? '',
      bestScore: stats.bestScore,
      attempts: stats.attempts,
      lastPlayedAt: stats.lastPlayedAt,
    };
  });

  allTeams.sort((a, b) => {
    if (b.bestScore !== a.bestScore) return b.bestScore - a.bestScore;
    if (a.attempts !== b.attempts) return a.attempts - b.attempts;
    return a.lastPlayedAt.localeCompare(b.lastPlayedAt);
  });

  const seenClasses = new Set<string>();
  const topClasses: LeaderboardEntry[] = [];
  for (const entry of allTeams) {
    if (seenClasses.has(entry.className)) continue;
    seenClasses.add(entry.className);
    topClasses.push(entry);
    if (topClasses.length >= topLimit) break;
  }

  return { topClasses, allTeams };
}

export function clearMockDemoStorage(includeTeams = false): {
  clearedAnswerRows: number;
  clearedTeamRows: number;
} {
  let clearedAnswerRows = 0;
  let clearedTeamRows = 0;
  try {
    clearedAnswerRows = Object.keys(readDemoRecords()).length;
    window.localStorage.removeItem(DEMO_STORAGE_KEY);
    if (includeTeams) {
      const rawTeams = window.localStorage.getItem(DEMO_TEAMS_STORAGE_KEY);
      if (rawTeams) {
        const parsed: unknown = JSON.parse(rawTeams);
        const validated = storedTeamsSchema.safeParse(parsed);
        clearedTeamRows = validated.success ? Object.keys(validated.data).length : 0;
      }
      window.localStorage.removeItem(DEMO_TEAMS_STORAGE_KEY);
    }
  } catch {
    // 忽略隱私模式儲存限制
  }
  return { clearedAnswerRows, clearedTeamRows };
}
