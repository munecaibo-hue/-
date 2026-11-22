import { z } from 'zod';

export const OPTION_KEYS = ['A', 'B', 'C', 'D'] as const;

export const optionKeySchema = z.enum(OPTION_KEYS);
export type OptionKey = z.infer<typeof optionKeySchema>;

export const teamInfoSchema = z.object({
  className: z.string().trim().min(1, '請輸入班級').max(30, '班級名稱過長'),
  teamNumber: z.string().trim().min(1, '請輸入第幾小隊').max(20, '小隊編號過長'),
  teamName: z.string().trim().min(1, '請輸入小隊名稱').max(30, '小隊名稱過長'),
  teamLeader: z.string().trim().min(1, '請輸入小隊長姓名').max(30, '小隊長姓名過長'),
  teamSize: z.coerce
    .number({ invalid_type_error: '請選擇小隊人數' })
    .int('人數需為整數')
    .min(1, '小隊人數至少 1 人')
    .max(10, '小隊人數最多 10 人'),
});
export type TeamInfo = z.infer<typeof teamInfoSchema>;

export function buildTeamPlayerId(team: TeamInfo): string {
  const normalizedTeamNo = /^第/.test(team.teamNumber)
    ? team.teamNumber
    : `第${team.teamNumber}小隊`;
  return `${team.className}-${normalizedTeamNo}-${team.teamName}`;
}

export const registerTeamResponseSchema = z.discriminatedUnion('ok', [
  z.object({
    ok: z.literal(true),
    playerId: z.string().min(1),
  }),
  z.object({
    ok: z.literal(false),
    error: z.string(),
  }),
]);

export const quizQuestionSchema = z.object({
  id: z.string().min(1),
  question: z.string().min(1),
  options: z.object({
    A: z.string(),
    B: z.string(),
    C: z.string(),
    D: z.string(),
  }),
  hall: z.string().optional(),
  exhibit: z.string().optional(),
});
export type QuizQuestion = z.infer<typeof quizQuestionSchema>;

export const fetchQuestionsResponseSchema = z.discriminatedUnion('ok', [
  z.object({
    ok: z.literal(true),
    questions: z.array(quizQuestionSchema).min(1),
  }),
  z.object({
    ok: z.literal(false),
    error: z.string(),
  }),
]);

export const answerSubmissionItemSchema = z.object({
  questionId: z.string().min(1),
  selected: optionKeySchema,
  hadMistake: z.boolean().optional(),
});
export type AnswerSubmissionItem = z.infer<typeof answerSubmissionItemSchema>;

export const questionReviewSchema = z.object({
  questionId: z.string(),
  question: z.string(),
  selected: optionKeySchema,
  selectedText: z.string(),
  correctAnswer: optionKeySchema,
  correctText: z.string(),
  isCorrect: z.boolean(),
  explanation: z.string().optional(),
});
export type QuestionReview = z.infer<typeof questionReviewSchema>;

export const playerStatsSchema = z.object({
  attempts: z.number().int().min(1),
  totalScore: z.number(),
  bestScore: z.number(),
  firstPassScore: z.number().nullable(),
  attemptsToPass: z.number().int().nullable(),
  lastPlayedAt: z.string(),
});
export type PlayerStats = z.infer<typeof playerStatsSchema>;

export const quizResultSchema = z.object({
  playerId: z.string(),
  score: z.number(),
  correctCount: z.number().int().min(0),
  totalQuestions: z.number().int().min(1),
  passThreshold: z.number().int().min(1),
  isPassed: z.boolean(),
  isAllGreen: z.boolean().default(false),
  perfectBonus: z.number().int().min(0).default(0),
  stats: playerStatsSchema,
  review: z.array(questionReviewSchema),
});
export type QuizResult = z.infer<typeof quizResultSchema>;

export const checkAnswerResultSchema = z.object({
  questionId: z.string().min(1),
  isCorrect: z.boolean(),
  pointsEarned: z.number().int().min(0),
  explanation: z.string().optional(),
});
export type CheckAnswerResult = z.infer<typeof checkAnswerResultSchema>;

export const checkAnswerResponseSchema = z.discriminatedUnion('ok', [
  z.object({
    ok: z.literal(true),
    check: checkAnswerResultSchema,
  }),
  z.object({
    ok: z.literal(false),
    error: z.string(),
  }),
]);

export const leaderboardEntrySchema = z.object({
  playerId: z.string(),
  className: z.string(),
  teamNumber: z.string(),
  teamName: z.string(),
  teamLeader: z.string().default(''),
  bestScore: z.number(),
  attempts: z.number().int().min(0),
  lastPlayedAt: z.string(),
});
export type LeaderboardEntry = z.infer<typeof leaderboardEntrySchema>;

export const leaderboardDataSchema = z.object({
  topClasses: z.array(leaderboardEntrySchema),
  allTeams: z.array(leaderboardEntrySchema),
});
export type LeaderboardData = z.infer<typeof leaderboardDataSchema>;

export const leaderboardResponseSchema = z.discriminatedUnion('ok', [
  z.object({
    ok: z.literal(true),
    topClasses: z.array(leaderboardEntrySchema),
    allTeams: z.array(leaderboardEntrySchema),
  }),
  z.object({
    ok: z.literal(false),
    error: z.string(),
  }),
]);

export const resetAllScoresResponseSchema = z.discriminatedUnion('ok', [
  z.object({
    ok: z.literal(true),
    clearedAnswerRows: z.number().int().min(0),
    clearedTeamRows: z.number().int().min(0),
  }),
  z.object({
    ok: z.literal(false),
    error: z.string(),
  }),
]);

export const submitQuizResponseSchema = z.discriminatedUnion('ok', [
  z.object({
    ok: z.literal(true),
    result: quizResultSchema,
  }),
  z.object({
    ok: z.literal(false),
    error: z.string(),
  }),
]);
