import type { QuizQuestion } from '../schemas/quiz.schema';

export type MuseumHall = '生命科學廳' | '人類文化廳' | '地球環境廳';

export interface MapStation {
  readonly id: string;
  readonly hall: MuseumHall;
  readonly label: string;
  /** 相對於探險圖寬度的百分比位置 (0–100) */
  readonly xPercent: number;
  /** 相對於探險圖高度的百分比位置 (0–100) */
  readonly yPercent: number;
  /** 對應工作表「展品」欄位的精準別名 */
  readonly exhibitAliases: readonly string[];
  /** 用於自動將題庫題目優先配對到對應展品紅點 */
  readonly keywords: readonly string[];
}

export const MAP_STATIONS: readonly MapStation[] = [
  // 一、生命科學廳
  {
    id: 'penghu-elephant',
    hall: '生命科學廳',
    label: '澎湖古象',
    xPercent: 21.5,
    yPercent: 54.5,
    exhibitAliases: ['澎湖古象'],
    keywords: ['古象', '澎湖', '古菱齒象', '直齒象', '齒板'],
  },
  {
    id: 't-rex',
    hall: '生命科學廳',
    label: '暴龍',
    xPercent: 13.5,
    yPercent: 42,
    exhibitAliases: ['暴龍'],
    keywords: ['暴龍', '霸王龍', '恐龍', '白堊紀'],
  },
  {
    id: 'mummy-coffin',
    hall: '生命科學廳',
    label: '木乃伊棺槨',
    xPercent: 14.8,
    yPercent: 66.5,
    exhibitAliases: ['木乃伊棺槨', '木乃伊'],
    keywords: ['木乃伊', '棺槨', '埃及', '保存遺體', '靈魂'],
  },
  // 二、人類文化廳
  {
    id: 'water-clock-tower',
    hall: '人類文化廳',
    label: '水運儀象檯',
    xPercent: 42.5,
    yPercent: 44,
    exhibitAliases: ['水運儀象檯', '水運儀象台'],
    keywords: ['水運儀象', '渾儀', '渾象', '觀測星象', '演示星空'],
  },
  {
    id: 'acupuncture-bronze',
    hall: '人類文化廳',
    label: '經絡銅人',
    xPercent: 44.5,
    yPercent: 62.5,
    exhibitAliases: ['經絡銅人', '針灸銅人'],
    keywords: ['經絡', '銅人', '穴位', '太醫院', '針灸'],
  },
  {
    id: 'plank-boat',
    hall: '人類文化廳',
    label: '拼板舟',
    xPercent: 54.8,
    yPercent: 41,
    exhibitAliases: ['拼板舟'],
    keywords: ['拼板舟', '達悟', '蘭嶼', '獨木舟'],
  },
  // 三、地球環境廳
  {
    id: 'giant-squid',
    hall: '地球環境廳',
    label: '大王魷魚',
    xPercent: 77,
    yPercent: 43.5,
    exhibitAliases: ['大王魷魚'],
    keywords: ['大王魷魚', '吸盤', '環形利齒', '魷魚'],
  },
  {
    id: 'three-rabbits',
    hall: '地球環境廳',
    label: '加拿大凍原',
    xPercent: 90.2,
    yPercent: 49,
    exhibitAliases: ['加拿大凍原', '三隻兔子'],
    keywords: ['加拿大凍原', '凍原', '北極兔', '傑克兔', '麝牛', '雪鴞', '兔子'],
  },
] as const;

export interface AssignedStation {
  readonly station: MapStation;
  readonly question: QuizQuestion;
}

/**
 * 優先依工作表「展品」欄位精準對應，其次依題目關鍵字配對，最後依序補齊
 */
export function assignQuestionsToStations(
  questions: readonly QuizQuestion[],
): readonly AssignedStation[] {
  const remaining = [...questions];
  const matched = new Map<string, QuizQuestion>();

  // 第一輪：依「展品」欄位精準配對
  for (const station of MAP_STATIONS) {
    const exactIndex = remaining.findIndex((q) => {
      const exhibit = q.exhibit?.trim();
      return exhibit ? station.exhibitAliases.includes(exhibit) : false;
    });
    if (exactIndex !== -1) {
      const picked = remaining.splice(exactIndex, 1)[0];
      if (picked) {
        matched.set(station.id, picked);
      }
    }
  }

  // 第二輪：依題幹與選項關鍵字配對
  for (const station of MAP_STATIONS) {
    if (matched.has(station.id)) continue;
    const matchIndex = remaining.findIndex((q) => {
      const text = `${q.question} ${q.options.A} ${q.options.B} ${q.options.C} ${q.options.D}`;
      return station.keywords.some((kw) => text.includes(kw));
    });
    if (matchIndex !== -1) {
      const picked = remaining.splice(matchIndex, 1)[0];
      if (picked) {
        matched.set(station.id, picked);
      }
    }
  }

  // 第三輪：剩餘站點依序補上未分配題目
  const assignments: AssignedStation[] = [];
  for (const station of MAP_STATIONS) {
    const q = matched.get(station.id) ?? remaining.shift();
    if (q) {
      assignments.push({ station, question: q });
    }
  }

  return assignments;
}
