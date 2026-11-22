import { PixelButton } from './components/ui/pixel-button';
import { PixelPanel } from './components/ui/pixel-panel';
import { MapBoardScreen } from './features/quiz/components/map-board-screen';
import { ResultScreen } from './features/quiz/components/result-screen';
import { StageScreen } from './features/quiz/components/stage-screen';
import { StartScreen } from './features/quiz/components/start-screen';
import { useLeaderboard } from './features/quiz/hooks/use-leaderboard';
import { useQuizGame } from './features/quiz/hooks/use-quiz-game';

export function App() {
  const { state: leaderboard, reload: reloadLeaderboard } = useLeaderboard();
  const {
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
  } = useQuizGame({ onScoreSynced: reloadLeaderboard });

  if (state.phase === 'start') {
    return (
      <main className="home-page">
        <StartScreen
          initialTeamInfo={lastTeamInfo}
          leaderboard={leaderboard}
          onReloadLeaderboard={reloadLeaderboard}
          onStart={(teamInfo) => void startGame(teamInfo, true)}
        />
      </main>
    );
  }

  if (state.phase === 'playing') {
    const activeIndex =
      state.activeStationId !== null
        ? state.stations.findIndex((entry) => entry.station.id === state.activeStationId)
        : -1;
    const activeEntry = activeIndex !== -1 ? state.stations[activeIndex] : undefined;
    const activeProgress = activeEntry
      ? state.progressByStationId[activeEntry.station.id]
      : undefined;

    const clearedCount = state.stations.filter(
      (entry) => state.progressByStationId[entry.station.id]?.status !== 'pending',
    ).length;

    return (
      <div className="island-map-page">
        <MapBoardScreen
          teamInfo={state.teamInfo}
          stations={state.stations}
          progressByStationId={state.progressByStationId}
          scoreSync={state.scoreSync}
          leaderboard={leaderboard}
          onReloadLeaderboard={reloadLeaderboard}
          onOpenStation={openStation}
          onSubmitAll={() => void submitCurrentRun()}
          onBackToHome={() => void syncAndReturnHome()}
          onAdminResetRun={adminResetCurrentRun}
        />

        {activeEntry && activeProgress ? (
          <StageScreen
            teamInfo={state.teamInfo}
            station={activeEntry.station}
            stageNumber={activeIndex + 1}
            question={activeEntry.question}
            stationProgress={activeProgress}
            feedback={state.stageFeedback}
            clearedCount={clearedCount}
            totalQuestions={state.stations.length}
            onAttemptAnswer={(option) =>
              void attemptStationAnswer(activeEntry.station.id, activeEntry.question.id, option)
            }
            onBackToMap={closeStation}
          />
        ) : null}
      </div>
    );
  }

  return (
    <div className="island-map-page">
      <main className="app-shell">
        {state.phase === 'loading_questions' ? (
          <PixelPanel tone="navy">
            <div style={{ padding: '48px 24px', textAlign: 'center' }}>
              <p
                style={{
                  color: 'var(--gold-bright)',
                  fontWeight: 900,
                  fontSize: '1.15rem',
                  margin: '0 0 10px',
                }}
              >
                黃金島航線準備中...
              </p>
              <p style={{ margin: 0, color: '#d7e6f7' }}>
                正在為 <strong>{state.teamInfo.teamName}</strong> 登錄小隊資料並部署 8 個展品關卡...
              </p>
            </div>
          </PixelPanel>
        ) : null}

        {state.phase === 'submitting' ? (
          <PixelPanel tone="navy">
            <div style={{ padding: '48px 24px', textAlign: 'center' }}>
              <p
                style={{
                  color: 'var(--emerald-bright)',
                  fontWeight: 900,
                  fontSize: '1.15rem',
                  margin: '0 0 10px',
                }}
              >
                正在結算闖關成績...
              </p>
              <p style={{ margin: 0, color: '#d7e6f7' }}>
                正在將 {state.totalQuestions} 題作答送往伺服器計分並寫入 Google Sheets...
              </p>
            </div>
          </PixelPanel>
        ) : null}

        {state.phase === 'result' ? (
          <ResultScreen
            result={state.result}
            teamInfo={state.teamInfo}
            onReplaySameTeam={() => void startGame(state.teamInfo, false)}
            onBackToHome={resetToStart}
          />
        ) : null}

        {state.phase === 'error' ? (
          <PixelPanel tone="navy">
            <div
              style={{
                padding: '32px 24px',
                textAlign: 'center',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '14px',
              }}
            >
              <span style={{ color: 'var(--crimson-bright)', fontWeight: 900, fontSize: '1.1rem' }}>
                連線發生錯誤
              </span>
              <p style={{ margin: 0, maxWidth: '48ch', lineHeight: 1.6 }}>{state.message}</p>
              <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                <PixelButton
                  variant="gold"
                  onClick={() => void startGame(state.teamInfo, true)}
                  style={{ padding: '12px 20px' }}
                >
                  ↻ 重新嘗試
                </PixelButton>
                <PixelButton
                  variant="navy"
                  onClick={resetToStart}
                  style={{ padding: '12px 20px' }}
                >
                  返回首頁
                </PixelButton>
              </div>
            </div>
          </PixelPanel>
        ) : null}
      </main>
    </div>
  );
}
