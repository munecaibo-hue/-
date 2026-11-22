import { useState } from 'react';
import { PixelButton } from '../../../components/ui/pixel-button';
import type { AssignedStation } from '../data/map-stations';
import { PERFECT_ALL_GREEN_BONUS, PERFECT_REQUIRED_STATIONS } from '../data/mock-questions';
import type { LeaderboardState } from '../hooks/use-leaderboard';
import type { TeamInfo } from '../schemas/quiz.schema';
import type { ScoreSyncState, StationProgress } from '../types';
import { AdminModal } from './admin-modal';

interface MapBoardScreenProps {
  teamInfo: TeamInfo;
  stations: readonly AssignedStation[];
  progressByStationId: Readonly<Record<string, StationProgress>>;
  scoreSync: ScoreSyncState;
  leaderboard: LeaderboardState;
  onReloadLeaderboard: () => void;
  onOpenStation: (stationId: string) => void;
  onSubmitAll: () => void;
  onBackToHome: () => void;
  onAdminResetRun: () => void;
}

export function MapBoardScreen({
  teamInfo,
  stations,
  progressByStationId,
  scoreSync,
  leaderboard,
  onReloadLeaderboard,
  onOpenStation,
  onSubmitAll,
  onBackToHome,
  onAdminResetRun,
}: MapBoardScreenProps) {
  const [isAdminOpen, setIsAdminOpen] = useState(false);

  let clearedCount = 0;
  let greenCount = 0;
  let basePoints = 0;

  for (const entry of stations) {
    const progress = progressByStationId[entry.station.id];
    if (progress && progress.status !== 'pending') {
      clearedCount += 1;
      basePoints += progress.pointsEarned;
      if (progress.status === 'cleared_first_try') {
        greenCount += 1;
      }
    }
  }

  const totalCount = stations.length;
  const isAllCleared = totalCount > 0 && clearedCount === totalCount;
  const isAllGreen =
    isAllCleared && totalCount >= PERFECT_REQUIRED_STATIONS && greenCount === totalCount;
  const perfectBonus = isAllGreen ? PERFECT_ALL_GREEN_BONUS : 0;
  const totalPoints = basePoints + perfectBonus;
  const isSyncing = scoreSync.status === 'syncing';
  const isSynced = scoreSync.status === 'synced';

  return (
    <div className="map-board-shell">
      <header className="map-hud">
        <div className="map-hud__team">
          <div style={{ fontSize: '0.98rem', fontWeight: 900, color: 'var(--gold-bright)' }}>
            {teamInfo.className}・{teamInfo.teamNumber}・{teamInfo.teamName}
          </div>
          <div style={{ fontSize: '0.82rem', color: '#cde0f5' }}>
            小隊長：{teamInfo.teamLeader}（{teamInfo.teamSize} 人）｜
            {isSynced
              ? '✅ 成績已即時送出並更新至首頁成績榜'
              : isSyncing
                ? '⏳ 正在即時同步成績至 Google Sheets...'
                : '點擊地圖上的 PK 紅點開始挑戰'}
          </div>
        </div>

        <div className="map-hud__progress">
          <div
            style={{
              padding: '6px 14px',
              borderRadius: '999px',
              background: isSynced ? 'rgba(34, 168, 99, 0.28)' : 'rgba(255, 212, 77, 0.16)',
              border: `1.5px solid ${isSynced ? 'rgba(82, 229, 150, 0.72)' : 'rgba(255, 212, 77, 0.55)'}`,
              fontSize: '0.88rem',
              fontWeight: 800,
              color: '#fff4cf',
            }}
          >
            目前得分{' '}
            <strong style={{ color: 'var(--gold-bright)', fontSize: '1rem' }}>{totalPoints}</strong>{' '}
            分{isAllGreen ? '（全綠燈 +20！）' : ''}｜已通關{' '}
            <strong style={{ color: 'var(--gold-bright)' }}>{clearedCount}</strong> / {totalCount}{' '}
            關
          </div>

          {scoreSync.status === 'error' ? (
            <PixelButton
              variant="gold"
              onClick={onSubmitAll}
              style={{ padding: '10px 16px', fontSize: '0.9rem' }}
            >
              ⚠️ 同步失敗，點此重送
            </PixelButton>
          ) : isSynced ? (
            <PixelButton
              variant="emerald"
              onClick={onSubmitAll}
              style={{ padding: '10px 18px', fontSize: '0.92rem' }}
            >
              📊 查看結算與小知識（{scoreSync.result.score} 分）
            </PixelButton>
          ) : (
            <PixelButton
              variant={isAllCleared ? 'emerald' : 'gold'}
              disabled={!isAllCleared || isSyncing}
              onClick={onSubmitAll}
              style={{ padding: '10px 18px', fontSize: '0.92rem' }}
            >
              {isSyncing
                ? '⏳ 成績同步送出中...'
                : isAllCleared
                  ? `★ 送出成績（${totalPoints} 分）`
                  : `尚餘 ${totalCount - clearedCount} 關待挑戰`}
            </PixelButton>
          )}

          <PixelButton
            variant="navy"
            disabled={isSyncing}
            onClick={onBackToHome}
            style={{ padding: '10px 16px', fontSize: '0.9rem' }}
          >
            {isSyncing ? '⏳ 同步中...' : '🏠 回到首頁'}
          </PixelButton>
        </div>
      </header>

      {scoreSync.status === 'error' ? (
        <div
          role="alert"
          style={{
            padding: '10px 16px',
            borderRadius: '12px',
            background: 'rgba(180, 35, 24, 0.9)',
            color: '#fff4f4',
            fontSize: '0.88rem',
            fontWeight: 700,
          }}
        >
          ⚠️ 成績自動送出失敗：{scoreSync.message}
        </div>
      ) : null}

      <section className="map-canvas-frame" aria-label="科博館黃金島互動探險地圖">
        <img
          src={`${import.meta.env.BASE_URL}island-map-n.jpg`}
          alt="科博館黃金島探險地圖：包含生命科學廳、人類文化廳與地球環境廳"
          className="map-canvas-img"
        />

        {stations.map((entry) => {
          const { station } = entry;
          const progress = progressByStationId[station.id];
          const status = progress?.status ?? 'pending';

          const statusClass =
            status === 'cleared_first_try'
              ? 'map-hotspot--answered'
              : status === 'cleared_after_retry'
                ? 'map-hotspot--retry-cleared'
                : '';

          const statusText =
            status === 'cleared_first_try'
              ? '已通過（一次過關 +10 分）'
              : status === 'cleared_after_retry'
                ? '已通過（再戰過關 +10 分）'
                : '尚未通關，點擊進入題目';

          const edgeClass = station.xPercent >= 85 ? 'map-hotspot--right-edge' : '';

          return (
            <button
              key={station.id}
              type="button"
              className={`map-hotspot ${statusClass} ${edgeClass}`.trim()}
              style={{
                left: `${station.xPercent}%`,
                top: `${station.yPercent}%`,
              }}
              onClick={() => onOpenStation(station.id)}
              aria-label={`${station.hall} ${station.label}（${statusText}）`}
            >
              <span className="map-hotspot__dot">{status === 'pending' ? 'PK' : '✓'}</span>
              <span className="map-hotspot__label">
                {station.label}
                {status !== 'pending' ? '・已通過' : ''}
              </span>
            </button>
          );
        })}
      </section>

      <footer className="map-legend-bar">
        <span>
          🔴 紅點＝待挑戰 ／ 🟢 綠光＝一次過關 ／ 🟠 亮橙光＝再戰過關（每關 +10 分；8 關全綠光再加 20 分＝滿分 100 分）
        </span>
        <div className="map-station-pills">
          {stations.map((entry) => {
            const status = progressByStationId[entry.station.id]?.status ?? 'pending';
            const pillClass =
              status === 'cleared_first_try'
                ? 'map-station-pill--done'
                : status === 'cleared_after_retry'
                  ? 'map-station-pill--retry'
                  : '';

            return (
              <button
                key={entry.station.id}
                type="button"
                className={`map-station-pill ${pillClass}`.trim()}
                onClick={() => onOpenStation(entry.station.id)}
              >
                <span className="map-station-pill__dot" aria-hidden="true" />
                <span>
                  {entry.station.hall.slice(0, 2)}・{entry.station.label}
                </span>
              </button>
            );
          })}
        </div>
      </footer>

      <button
        type="button"
        className="admin-fab-btn"
        onClick={() => setIsAdminOpen(true)}
        aria-label="開啟管理員控制台"
      >
        ⚙️ 管理員
      </button>

      {isAdminOpen ? (
        <AdminModal
          teamInfo={teamInfo}
          stations={stations}
          progressByStationId={progressByStationId}
          leaderboard={leaderboard}
          onReloadLeaderboard={onReloadLeaderboard}
          onResetCurrentRun={onAdminResetRun}
          onBackToHome={onBackToHome}
          onClose={() => setIsAdminOpen(false)}
        />
      ) : null}
    </div>
  );
}
