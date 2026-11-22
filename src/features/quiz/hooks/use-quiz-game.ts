import { useCallback, useEffect, useRef, useState } from 'react';
import { appEnv } from '../../../lib/env';
import type { AssignedStation } from '../data/map-stations';
import { assignQuestionsToStations, MAP_STATIONS } from '../data/map-stations';
import type { AnswerSubmissionItem, OptionKey, TeamInfo } from '../schemas/quiz.schema';
import { buildTeamPlayerId } from '../schemas/quiz.schema';
import {
  checkQuizAnswer,
  fetchQuizQuestions,
  registerTeam,
  submitQuizAnswers,
} from '../services/quiz-api';
import type { QuizGameState, StationProgress } from '../types';

const AUTO_RETURN_DELAY_MS = 1150;

function createInitialStationProgress(): StationProgress {
  return {
    status: 'pending',
    hasFailedBefore: false,
    wrongOptions: [],
    selectedAnswer: null,
    pointsEarned: 0,
  };
}

function buildClearedSubmission(
  stations: readonly AssignedStation[],
  progressByStationId: Readonly<Record<string, StationProgress>>,
): AnswerSubmissionItem[] {
  const submission: AnswerSubmissionItem[] = [];
  for (const entry of stations) {
    const progress = progressByStationId[entry.station.id];
    if (progress && progress.status !== 'pending' && progress.selectedAnswer) {
      submission.push({
        questionId: entry.question.id,
        selected: progress.selectedAnswer,
        hadMistake: progress.hasFailedBefore,
      });
    }
  }
  return submission;
}

export interface UseQuizGameOptions {
  readonly onScoreSynced?: () => void;
}

export function useQuizGame(options: UseQuizGameOptions = {}) {
  const { onScoreSynced } = options;
  const [state, setState] = useState<QuizGameState>({ phase: 'start' });
  const [lastTeamInfo, setLastTeamInfo] = useState<TeamInfo | null>(null);
  const autoReturnTimerRef = useRef<number | null>(null);
  const stateRef = useRef<QuizGameState>(state);
  const isSubmittingRef = useRef(false);

  stateRef.current = state;

  const clearAutoReturnTimer = useCallback(() => {
    if (autoReturnTimerRef.current !== null) {
      window.clearTimeout(autoReturnTimerRef.current);
      autoReturnTimerRef.current = null;
    }
  }, []);

  useEffect(() => clearAutoReturnTimer, [clearAutoReturnTimer]);

  const syncScoreInBackground = useCallback(
    async (
      playerId: string,
      stations: readonly AssignedStation[],
      progressByStationId: Readonly<Record<string, StationProgress>>,
    ): Promise<boolean> => {
      if (isSubmittingRef.current) return false;
      const submission = buildClearedSubmission(stations, progressByStationId);
      if (submission.length === 0) return false;

      isSubmittingRef.current = true;
      setState((prev) => {
        if (prev.phase !== 'playing') return prev;
        return { ...prev, scoreSync: { status: 'syncing' } };
      });

      try {
        const effectiveThreshold = Math.min(appEnv.PASS_THRESHOLD, stations.length);
        const result = await submitQuizAnswers(playerId, submission, effectiveThreshold);
        setState((prev) => {
          if (prev.phase !== 'playing') return prev;
          return { ...prev, scoreSync: { status: 'synced', result } };
        });
        onScoreSynced?.();
        return true;
      } catch (err) {
        const message = err instanceof Error ? err.message : '同步成績失敗，請重試';
        setState((prev) => {
          if (prev.phase !== 'playing') return prev;
          return { ...prev, scoreSync: { status: 'error', message } };
        });
        return false;
      } finally {
        isSubmittingRef.current = false;
      }
    },
    [onScoreSynced],
  );

  const startGame = useCallback(
    async (teamInfo: TeamInfo, shouldRegisterTeam = true) => {
      clearAutoReturnTimer();
      isSubmittingRef.current = false;
      const tentativeId = buildTeamPlayerId(teamInfo);
      setLastTeamInfo(teamInfo);
      setState({ phase: 'loading_questions', teamInfo, playerId: tentativeId });

      try {
        const questionFetchCount = Math.max(appEnv.QUESTION_COUNT, MAP_STATIONS.length);
        const [playerId, questions] = await Promise.all([
          shouldRegisterTeam ? registerTeam(teamInfo) : Promise.resolve(tentativeId),
          fetchQuizQuestions(questionFetchCount),
        ]);

        const stations = assignQuestionsToStations(questions);
        const progressByStationId: Record<string, StationProgress> = {};
        for (const entry of stations) {
          progressByStationId[entry.station.id] = createInitialStationProgress();
        }

        setState({
          phase: 'playing',
          teamInfo,
          playerId,
          stations,
          activeStationId: null,
          progressByStationId,
          stageFeedback: { kind: 'idle' },
          scoreSync: { status: 'idle' },
        });
      } catch (err) {
        const message = err instanceof Error ? err.message : '載入題目或登錄小隊資料時發生未知錯誤';
        setState({ phase: 'error', teamInfo, playerId: tentativeId, message });
      }
    },
    [clearAutoReturnTimer],
  );

  const openStation = useCallback(
    (stationId: string) => {
      clearAutoReturnTimer();
      setState((prev) => {
        if (prev.phase !== 'playing') return prev;
        return {
          ...prev,
          activeStationId: stationId,
          stageFeedback: { kind: 'idle' },
        };
      });
    },
    [clearAutoReturnTimer],
  );

  const closeStation = useCallback(() => {
    clearAutoReturnTimer();
    setState((prev) => {
      if (prev.phase !== 'playing') return prev;
      return {
        ...prev,
        activeStationId: null,
        stageFeedback: { kind: 'idle' },
      };
    });
  }, [clearAutoReturnTimer]);

  const attemptStationAnswer = useCallback(
    async (stationId: string, questionId: string, option: OptionKey) => {
      clearAutoReturnTimer();
      const snapshot = stateRef.current;
      if (snapshot.phase !== 'playing') return;
      if (snapshot.stageFeedback.kind === 'checking') return;
      const existingProgress = snapshot.progressByStationId[stationId];
      if (!existingProgress || existingProgress.status !== 'pending') return;

      setState((prev) => {
        if (prev.phase !== 'playing') return prev;
        return {
          ...prev,
          stageFeedback: { kind: 'checking', option },
        };
      });

      try {
        const check = await checkQuizAnswer(questionId, option);

        if (check.isCorrect) {
          const latest = stateRef.current;
          if (latest.phase !== 'playing') return;

          const currentProgress =
            latest.progressByStationId[stationId] ?? createInitialStationProgress();
          const nextStatus = currentProgress.hasFailedBefore
            ? 'cleared_after_retry'
            : 'cleared_first_try';

          const nextProgressMap: Record<string, StationProgress> = {
            ...latest.progressByStationId,
            [stationId]: {
              ...currentProgress,
              status: nextStatus,
              selectedAnswer: option,
              pointsEarned: check.pointsEarned,
              explanation: check.explanation,
            },
          };

          const isNowAllCleared = latest.stations.every(
            (entry) => nextProgressMap[entry.station.id]?.status !== 'pending',
          );

          setState((prev) => {
            if (prev.phase !== 'playing') return prev;
            return {
              ...prev,
              progressByStationId: nextProgressMap,
              stageFeedback: {
                kind: 'correct',
                option,
                explanation: check.explanation,
              },
            };
          });

          // 8 關全數闖關通過時，立即自動同步送出成績到 Google Sheets 並更新成績榜
          if (isNowAllCleared) {
            void syncScoreInBackground(latest.playerId, latest.stations, nextProgressMap);
          }

          // 顯示「超棒的」後自動跳回第二頁探險地圖
          autoReturnTimerRef.current = window.setTimeout(() => {
            autoReturnTimerRef.current = null;
            setState((prev) => {
              if (prev.phase !== 'playing' || prev.activeStationId !== stationId) return prev;
              return {
                ...prev,
                activeStationId: null,
                stageFeedback: { kind: 'idle' },
              };
            });
          }, AUTO_RETURN_DELAY_MS);
        } else {
          setState((prev) => {
            if (prev.phase !== 'playing') return prev;
            const currentProgress =
              prev.progressByStationId[stationId] ?? createInitialStationProgress();
            const wrongOptions = currentProgress.wrongOptions.includes(option)
              ? currentProgress.wrongOptions
              : [...currentProgress.wrongOptions, option];

            return {
              ...prev,
              progressByStationId: {
                ...prev.progressByStationId,
                [stationId]: {
                  ...currentProgress,
                  hasFailedBefore: true,
                  wrongOptions,
                },
              },
              stageFeedback: { kind: 'wrong', option },
            };
          });
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : '檢查答案時發生錯誤，請再試一次';
        setState((prev) => {
          if (prev.phase !== 'playing') return prev;
          return {
            ...prev,
            stageFeedback: { kind: 'check_error', message },
          };
        });
      }
    },
    [clearAutoReturnTimer, syncScoreInBackground],
  );

  const submitCurrentRun = useCallback(async () => {
    const current = stateRef.current;
    if (current.phase !== 'playing') return;
    clearAutoReturnTimer();

    // 若自動同步已完成，直接切進結算畫面（不重複寫入 Google Sheets）
    if (current.scoreSync.status === 'synced') {
      setState({
        phase: 'result',
        teamInfo: current.teamInfo,
        playerId: current.playerId,
        result: current.scoreSync.result,
      });
      return;
    }

    const submission = buildClearedSubmission(current.stations, current.progressByStationId);
    if (submission.length === 0) return;

    const { teamInfo, playerId, stations } = current;
    setState({ phase: 'submitting', teamInfo, playerId, totalQuestions: submission.length });

    try {
      const effectiveThreshold = Math.min(appEnv.PASS_THRESHOLD, stations.length);
      const result = await submitQuizAnswers(playerId, submission, effectiveThreshold);
      onScoreSynced?.();
      setState({ phase: 'result', teamInfo, playerId, result });
    } catch (err) {
      const message = err instanceof Error ? err.message : '計算並記錄成績時發生未知錯誤';
      setState({ phase: 'error', teamInfo, playerId, message });
    }
  }, [clearAutoReturnTimer, onScoreSynced]);

  /**
   * 回到首頁：若有已通關關卡且尚未同步送出，先自動同步至試算表再回首頁並刷新成績榜
   */
  const syncAndReturnHome = useCallback(async () => {
    clearAutoReturnTimer();
    const current = stateRef.current;

    if (current.phase === 'playing') {
      const hasClearedAny = current.stations.some(
        (entry) => current.progressByStationId[entry.station.id]?.status !== 'pending',
      );
      if (hasClearedAny && current.scoreSync.status !== 'synced') {
        await syncScoreInBackground(
          current.playerId,
          current.stations,
          current.progressByStationId,
        );
      }
    }

    setState({ phase: 'start' });
    onScoreSynced?.();
  }, [clearAutoReturnTimer, onScoreSynced, syncScoreInBackground]);

  const resetToStart = useCallback(() => {
    clearAutoReturnTimer();
    setState({ phase: 'start' });
    onScoreSynced?.();
  }, [clearAutoReturnTimer, onScoreSynced]);

  const adminResetCurrentRun = useCallback(() => {
    clearAutoReturnTimer();
    isSubmittingRef.current = false;
    setState((prev) => {
      if (prev.phase !== 'playing') return prev;
      const freshProgress: Record<string, StationProgress> = {};
      for (const entry of prev.stations) {
        freshProgress[entry.station.id] = createInitialStationProgress();
      }
      return {
        ...prev,
        activeStationId: null,
        progressByStationId: freshProgress,
        stageFeedback: { kind: 'idle' },
        scoreSync: { status: 'idle' },
      };
    });
  }, [clearAutoReturnTimer]);

  return {
    state,
    lastTeamInfo,
    startGame,
    openStation,
    closeStation,
    attemptStationAnswer,
    submitCurrentRun,
    syncAndReturnHome,
    resetToStart,
    adminResetCurrentRun,
  };
}
