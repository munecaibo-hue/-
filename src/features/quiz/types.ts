import type { AssignedStation } from './data/map-stations';
import type { OptionKey, QuizResult, TeamInfo } from './schemas/quiz.schema';

export type StationClearStatus = 'pending' | 'cleared_first_try' | 'cleared_after_retry';

export interface StationProgress {
  readonly status: StationClearStatus;
  readonly hasFailedBefore: boolean;
  readonly wrongOptions: readonly OptionKey[];
  readonly selectedAnswer: OptionKey | null;
  readonly pointsEarned: number;
  readonly explanation?: string;
}

export type StageFeedback =
  | { readonly kind: 'idle' }
  | { readonly kind: 'checking'; readonly option: OptionKey }
  | { readonly kind: 'correct'; readonly option: OptionKey; readonly explanation?: string }
  | { readonly kind: 'wrong'; readonly option: OptionKey }
  | { readonly kind: 'check_error'; readonly message: string };

export type ScoreSyncState =
  | { readonly status: 'idle' }
  | { readonly status: 'syncing' }
  | { readonly status: 'synced'; readonly result: QuizResult }
  | { readonly status: 'error'; readonly message: string };

export type QuizGameState =
  | { readonly phase: 'start' }
  | {
      readonly phase: 'loading_questions';
      readonly teamInfo: TeamInfo;
      readonly playerId: string;
    }
  | {
      readonly phase: 'playing';
      readonly teamInfo: TeamInfo;
      readonly playerId: string;
      readonly stations: readonly AssignedStation[];
      /** null 表示檢視黃金島地圖；有值表示開啟該展品關卡視窗 */
      readonly activeStationId: string | null;
      readonly progressByStationId: Readonly<Record<string, StationProgress>>;
      readonly stageFeedback: StageFeedback;
      readonly scoreSync: ScoreSyncState;
    }
  | {
      readonly phase: 'submitting';
      readonly teamInfo: TeamInfo;
      readonly playerId: string;
      readonly totalQuestions: number;
    }
  | {
      readonly phase: 'result';
      readonly teamInfo: TeamInfo;
      readonly playerId: string;
      readonly result: QuizResult;
    }
  | {
      readonly phase: 'error';
      readonly teamInfo: TeamInfo;
      readonly playerId: string;
      readonly message: string;
    };
