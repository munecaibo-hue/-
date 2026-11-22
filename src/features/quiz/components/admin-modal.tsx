import type { FormEvent } from 'react';
import { useEffect, useState } from 'react';
import { PixelButton } from '../../../components/ui/pixel-button';
import { isDemoMode } from '../../../lib/env';
import type { AssignedStation } from '../data/map-stations';
import type { LeaderboardState } from '../hooks/use-leaderboard';
import type { TeamInfo } from '../schemas/quiz.schema';
import { resetAllScores } from '../services/quiz-api';
import type { StationProgress } from '../types';

const ADMIN_PASSCODE = '3333';

export interface AdminActiveSession {
  readonly teamInfo: TeamInfo;
  readonly stations: readonly AssignedStation[];
  readonly progressByStationId: Readonly<Record<string, StationProgress>>;
  readonly onResetCurrentRun: () => void;
  readonly onBackToHome: () => void;
}

interface AdminModalProps {
  activeSession?: AdminActiveSession;
  leaderboard: LeaderboardState;
  onReloadLeaderboard: () => void;
  onClose: () => void;
}

type ResetStatus =
  | { readonly kind: 'idle' }
  | { readonly kind: 'resetting' }
  | { readonly kind: 'success'; readonly message: string }
  | { readonly kind: 'error'; readonly message: string };

export function AdminModal({
  activeSession,
  leaderboard,
  onReloadLeaderboard,
  onClose,
}: AdminModalProps) {
  const [passcode, setPasscode] = useState('');
  const [verifiedPasscode, setVerifiedPasscode] = useState('');
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [includeTeams, setIncludeTeams] = useState(false);
  const [resetStatus, setResetStatus] = useState<ResetStatus>({ kind: 'idle' });

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const handleUnlock = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmed = passcode.trim();
    if (trimmed === ADMIN_PASSCODE) {
      setVerifiedPasscode(trimmed);
      setIsUnlocked(true);
      setErrorMsg(null);
      onReloadLeaderboard();
    } else {
      setErrorMsg('密碼錯誤，請重新輸入');
      setPasscode('');
    }
  };

  const handleResetAllScores = async () => {
    const targetDesc = includeTeams
      ? '「回答」成績表與「黃金島」小隊報到表'
      : '「回答」成績表中的所有成績紀錄';
    const confirmed = window.confirm(
      `確定要全部重置嗎？\n此動作將同步清空 Google Sheets ${targetDesc}（保留第 1 列標題）${activeSession ? '並重設本局進度' : ''}，且無法復原！`,
    );
    if (!confirmed) return;

    setResetStatus({ kind: 'resetting' });
    try {
      const summary = await resetAllScores(verifiedPasscode, includeTeams);
      activeSession?.onResetCurrentRun();
      onReloadLeaderboard();

      const teamMsg = includeTeams ? `、清空 ${summary.clearedTeamRows} 筆小隊報到` : '';
      setResetStatus({
        kind: 'success',
        message: isDemoMode
          ? `已清除本機展示資料（${summary.clearedAnswerRows} 筆成績${teamMsg}）。`
          : `已同步清空 Google Sheets（${summary.clearedAnswerRows} 筆成績${teamMsg}），首頁成績榜已更新！`,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : '全部重置成績時發生錯誤';
      setResetStatus({ kind: 'error', message });
    }
  };

  const greenCount = activeSession
    ? activeSession.stations.filter(
        (s) => activeSession.progressByStationId[s.station.id]?.status === 'cleared_first_try',
      ).length
    : 0;
  const retryCount = activeSession
    ? activeSession.stations.filter(
        (s) => activeSession.progressByStationId[s.station.id]?.status === 'cleared_after_retry',
      ).length
    : 0;

  return (
    <div
      className="quiz-modal-overlay"
      role="dialog"
      aria-modal="true"
      aria-label="管理員控制台"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="admin-modal-card">
        <div className="admin-modal-header">
          <h2 style={{ margin: 0, fontSize: '1.12rem', fontWeight: 900 }}>
            {isUnlocked ? '⚙️ 黃金島管理員後台' : '🔒 管理員驗證'}
          </h2>
          <PixelButton
            variant="navy"
            onClick={onClose}
            style={{ padding: '6px 12px', fontSize: '0.84rem' }}
          >
            ✕ 關閉
          </PixelButton>
        </div>

        {!isUnlocked ? (
          <form
            onSubmit={handleUnlock}
            style={{ padding: '22px', display: 'flex', flexDirection: 'column', gap: '14px' }}
          >
            <label htmlFor="admin-passcode-input" style={{ fontWeight: 700, fontSize: '0.94rem' }}>
              請輸入管理員密碼：
            </label>
            <input
              id="admin-passcode-input"
              type="password"
              inputMode="numeric"
              className="team-input"
              placeholder="請輸入密碼"
              value={passcode}
              onChange={(e) => {
                setPasscode(e.target.value);
                if (errorMsg) setErrorMsg(null);
              }}
              autoFocus
            />
            {errorMsg ? (
              <p className="team-field-error" role="alert">
                {errorMsg}
              </p>
            ) : null}
            <PixelButton
              type="submit"
              variant="gold"
              style={{ padding: '12px 18px', fontSize: '1rem' }}
            >
              確認登入
            </PixelButton>
          </form>
        ) : (
          <div
            style={{
              padding: '18px 20px 24px',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px',
            }}
          >
            {activeSession ? (
              <div className="admin-section">
                <h3 className="admin-section-title">目前場次狀態</h3>
                <p style={{ margin: '0 0 8px', fontSize: '0.92rem', lineHeight: 1.6 }}>
                  小隊：
                  <strong>
                    {activeSession.teamInfo.className}・{activeSession.teamInfo.teamNumber}・
                    {activeSession.teamInfo.teamName}
                  </strong>
                  （小隊長：{activeSession.teamInfo.teamLeader}／{activeSession.teamInfo.teamSize}{' '}
                  人）
                </p>
                <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--ink-muted)' }}>
                  🟢 一次過關：{greenCount} 關 ｜ 🟠 再戰過關：{retryCount} 關 ｜ 🔴 未完成：
                  {activeSession.stations.length - greenCount - retryCount} 關
                </p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', marginTop: '12px' }}>
                  <PixelButton
                    variant="gold"
                    onClick={() => {
                      activeSession.onResetCurrentRun();
                      onClose();
                    }}
                    style={{ padding: '9px 14px', fontSize: '0.88rem' }}
                  >
                    ↻ 僅重設本局 8 關進度
                  </PixelButton>
                  <PixelButton
                    variant="navy"
                    onClick={() => {
                      onClose();
                      activeSession.onBackToHome();
                    }}
                    style={{ padding: '9px 14px', fontSize: '0.88rem' }}
                  >
                    🏠 直接返回首頁
                  </PixelButton>
                </div>
              </div>
            ) : null}

            <div className="admin-section admin-section--danger">
              <h3 className="admin-section-title" style={{ color: '#9b1c1c' }}>
                全部重置成績（同步更新 Google Sheets）
              </h3>
              <p
                style={{
                  margin: '0 0 10px',
                  fontSize: '0.86rem',
                  color: '#5c2b2b',
                  lineHeight: 1.6,
                }}
              >
                會清空 Google Sheets「回答」工作表的所有成績列（保留第 1 列標題），並立即重置首頁成績榜
                {activeSession ? '與本局進度' : ''}。
              </p>

              <label
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  fontSize: '0.88rem',
                  fontWeight: 700,
                  color: '#4a2020',
                  marginBottom: '12px',
                  cursor: 'pointer',
                }}
              >
                <input
                  type="checkbox"
                  checked={includeTeams}
                  onChange={(e) => setIncludeTeams(e.target.checked)}
                />
                <span>同時清空「黃金島」工作表的小隊報到紀錄</span>
              </label>

              <PixelButton
                variant="navy"
                disabled={resetStatus.kind === 'resetting'}
                onClick={() => void handleResetAllScores()}
                style={{
                  padding: '10px 18px',
                  fontSize: '0.92rem',
                  background: '#c92a2a',
                  boxShadow: '0 4px 0 0 #7a1414',
                }}
              >
                {resetStatus.kind === 'resetting'
                  ? '⏳ 正在清空 Google Sheets 成績...'
                  : '🗑 全部重置成績（同步清空 Google Sheets）'}
              </PixelButton>

              {resetStatus.kind === 'success' ? (
                <p
                  role="status"
                  style={{
                    margin: '10px 0 0',
                    fontSize: '0.86rem',
                    fontWeight: 800,
                    color: '#116239',
                  }}
                >
                  ✅ {resetStatus.message}
                </p>
              ) : null}

              {resetStatus.kind === 'error' ? (
                <p role="alert" className="team-field-error" style={{ marginTop: '10px' }}>
                  ⚠️ {resetStatus.message}
                </p>
              ) : null}
            </div>

            <div className="admin-section">
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  gap: '8px',
                  flexWrap: 'wrap',
                  marginBottom: '10px',
                }}
              >
                <h3 className="admin-section-title" style={{ margin: 0 }}>
                  所有小隊成績總覽（
                  {leaderboard.status === 'success' ? leaderboard.data.allTeams.length : 0} 筆）
                </h3>
                <button
                  type="button"
                  className="admin-mini-btn"
                  onClick={onReloadLeaderboard}
                  disabled={leaderboard.status === 'loading'}
                >
                  {leaderboard.status === 'loading' ? '載入中...' : '↻ 重新整理'}
                </button>
              </div>

              {leaderboard.status === 'error' ? (
                <p className="team-field-error">{leaderboard.message}</p>
              ) : leaderboard.status === 'success' && leaderboard.data.allTeams.length === 0 ? (
                <p style={{ margin: 0, fontSize: '0.88rem', color: 'var(--ink-muted)' }}>
                  尚無已送出的小隊成績紀錄。
                </p>
              ) : leaderboard.status === 'success' ? (
                <div className="admin-table-wrap">
                  <table className="admin-table">
                    <thead>
                      <tr>
                        <th>#</th>
                        <th>班級</th>
                        <th>小隊名稱</th>
                        <th>最高分</th>
                        <th>次數</th>
                        <th>最近遊玩</th>
                      </tr>
                    </thead>
                    <tbody>
                      {leaderboard.data.allTeams.map((row, idx) => (
                        <tr key={row.playerId}>
                          <td>{idx + 1}</td>
                          <td>{row.className}</td>
                          <td>
                            {row.teamName}
                            {row.teamNumber ? `（${row.teamNumber}）` : ''}
                          </td>
                          <td>
                            <strong>{row.bestScore}</strong>
                          </td>
                          <td>{row.attempts}</td>
                          <td>{row.lastPlayedAt}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : null}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
