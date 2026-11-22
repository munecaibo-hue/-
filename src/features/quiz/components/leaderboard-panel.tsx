import type { LeaderboardState } from '../hooks/use-leaderboard';

interface LeaderboardPanelProps {
  leaderboard: LeaderboardState;
  onReload: () => void;
}

const RANK_BADGES = ['🥇', '🥈', '🥉', '4', '5'] as const;

export function LeaderboardPanel({ leaderboard, onReload }: LeaderboardPanelProps) {
  return (
    <section className="home-leaderboard-card" aria-label="黃金島英雄成績榜">
      <div className="home-leaderboard-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          <h2 className="home-leaderboard-title">🏆 成績榜・前五名優勝班級</h2>
          <span className="home-leaderboard-sub">各班最高分小隊排名</span>
        </div>
        <button
          type="button"
          className="home-leaderboard-refresh"
          onClick={onReload}
          disabled={leaderboard.status === 'loading'}
        >
          {leaderboard.status === 'loading' ? '更新中...' : '↻ 更新榜單'}
        </button>
      </div>

      {leaderboard.status === 'loading' ? (
        <p className="home-leaderboard-empty">正在載入最新成績榜...</p>
      ) : null}

      {leaderboard.status === 'error' ? (
        <p className="home-leaderboard-empty" style={{ color: '#ffd1d1' }}>
          無法載入成績榜：{leaderboard.message}
        </p>
      ) : null}

      {leaderboard.status === 'success' && leaderboard.data.topClasses.length === 0 ? (
        <p className="home-leaderboard-empty">
          目前尚無完成闖關的班級紀錄，快報到出發搶下第 1 名寶座吧！
        </p>
      ) : null}

      {leaderboard.status === 'success' && leaderboard.data.topClasses.length > 0 ? (
        <ol className="leaderboard-list">
          {leaderboard.data.topClasses.slice(0, 5).map((entry, idx) => (
            <li
              key={entry.playerId}
              className={`leaderboard-row ${idx === 0 ? 'leaderboard-row--first' : ''}`.trim()}
            >
              <span className="leaderboard-rank">{RANK_BADGES[idx] ?? idx + 1}</span>
              <div className="leaderboard-team">
                <span className="leaderboard-class">{entry.className}</span>
                <span className="leaderboard-name">
                  {entry.teamName}
                  {entry.teamNumber ? `（${entry.teamNumber}）` : ''}
                </span>
              </div>
              <span className="leaderboard-score">{entry.bestScore} 分</span>
            </li>
          ))}
        </ol>
      ) : null}
    </section>
  );
}
