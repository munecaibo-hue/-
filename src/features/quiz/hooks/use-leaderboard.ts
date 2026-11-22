import { useCallback, useEffect, useState } from 'react';
import type { LeaderboardData } from '../schemas/quiz.schema';
import { fetchLeaderboard } from '../services/quiz-api';

export type LeaderboardState =
  | { readonly status: 'loading' }
  | { readonly status: 'success'; readonly data: LeaderboardData }
  | { readonly status: 'error'; readonly message: string };

export function useLeaderboard() {
  const [state, setState] = useState<LeaderboardState>({ status: 'loading' });
  const [reloadTick, setReloadTick] = useState(0);

  const reload = useCallback(() => {
    setState({ status: 'loading' });
    setReloadTick((prev) => prev + 1);
  }, []);

  useEffect(() => {
    let isCancelled = false;

    fetchLeaderboard()
      .then((data) => {
        if (!isCancelled) {
          setState({ status: 'success', data });
        }
      })
      .catch((err: unknown) => {
        if (!isCancelled) {
          const message = err instanceof Error ? err.message : '無法讀取成績榜';
          setState({ status: 'error', message });
        }
      });

    return () => {
      isCancelled = true;
    };
  }, [reloadTick]);

  return { state, reload };
}
