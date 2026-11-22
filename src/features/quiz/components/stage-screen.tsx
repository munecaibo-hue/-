import { useEffect } from 'react';
import { PixelButton } from '../../../components/ui/pixel-button';
import { PixelPanel } from '../../../components/ui/pixel-panel';
import { ProgressBar } from '../../../components/ui/progress-bar';
import type { MapStation } from '../data/map-stations';
import { OPTION_KEYS } from '../schemas/quiz.schema';
import type { OptionKey, QuizQuestion, TeamInfo } from '../schemas/quiz.schema';
import type { StageFeedback, StationProgress } from '../types';

interface StageScreenProps {
  teamInfo: TeamInfo;
  station: MapStation;
  stageNumber: number;
  question: QuizQuestion;
  stationProgress: StationProgress;
  feedback: StageFeedback;
  clearedCount: number;
  totalQuestions: number;
  onAttemptAnswer: (option: OptionKey) => void;
  onBackToMap: () => void;
}

const NUMBER_KEY_TO_OPTION: Readonly<Record<string, OptionKey>> = {
  '1': 'A',
  '2': 'B',
  '3': 'C',
  '4': 'D',
  a: 'A',
  b: 'B',
  c: 'C',
  d: 'D',
};

export function StageScreen({
  teamInfo,
  station,
  stageNumber,
  question,
  stationProgress,
  feedback,
  clearedCount,
  totalQuestions,
  onAttemptAnswer,
  onBackToMap,
}: StageScreenProps) {
  const visibleOptionKeys = OPTION_KEYS.filter((key) => question.options[key].trim().length > 0);
  const isCleared = stationProgress.status !== 'pending';
  const isChecking = feedback.kind === 'checking';

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onBackToMap();
        return;
      }

      if (isCleared || isChecking) return;

      const mapped = NUMBER_KEY_TO_OPTION[event.key.toLowerCase()];
      if (
        mapped &&
        visibleOptionKeys.includes(mapped) &&
        !stationProgress.wrongOptions.includes(mapped)
      ) {
        onAttemptAnswer(mapped);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    isChecking,
    isCleared,
    onAttemptAnswer,
    onBackToMap,
    stationProgress.wrongOptions,
    visibleOptionKeys,
  ]);

  return (
    <div
      className="quiz-modal-overlay"
      role="dialog"
      aria-modal="true"
      aria-label={`${station.hall} ${station.label} 闖關題目`}
    >
      <div className="quiz-modal-content" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
        <PixelPanel tone="navy">
          <div
            style={{
              padding: '18px 22px',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '10px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                <span
                  style={{
                    padding: '5px 14px',
                    borderRadius: '999px',
                    background:
                      stationProgress.status === 'cleared_after_retry'
                        ? '#ff8c00'
                        : stationProgress.status === 'cleared_first_try'
                          ? '#22a863'
                          : '#e01e2b',
                    color: '#ffffff',
                    fontWeight: 900,
                    fontSize: '0.88rem',
                  }}
                >
                  {station.hall} ・ {station.label}
                </span>
                <span style={{ color: '#e6f1fc', fontSize: '0.9rem', fontWeight: 700 }}>
                  第 {stageNumber} 關（答對得 10 分）
                </span>
                <span style={{ color: '#9fc0e2', fontSize: '0.85rem' }}>
                  {teamInfo.teamName}
                </span>
              </div>

              <PixelButton
                variant="navy"
                onClick={onBackToMap}
                style={{ padding: '7px 14px', fontSize: '0.85rem' }}
              >
                ✕ 返回探險地圖
              </PixelButton>
            </div>

            <ProgressBar
              current={clearedCount}
              total={totalQuestions}
              tone={clearedCount === totalQuestions ? 'emerald' : 'gold'}
              label={`目前進度：已通關 ${clearedCount} / ${totalQuestions} 關`}
            />
          </div>
        </PixelPanel>

        <PixelPanel tone="parchment">
          <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '10px' }}>
              <span
                style={{
                  fontSize: '0.82rem',
                  fontWeight: 900,
                  padding: '4px 10px',
                  borderRadius: '8px',
                  background: 'var(--bg-mid)',
                  color: 'var(--gold-bright)',
                  flexShrink: 0,
                }}
              >
                {question.id}
              </span>
              <h2
                style={{
                  margin: 0,
                  fontSize: 'clamp(1.1rem, 2.5vw, 1.32rem)',
                  lineHeight: 1.55,
                  color: 'var(--ink-dark)',
                }}
              >
                {question.question}
              </h2>
            </div>

            {feedback.kind === 'correct' ? (
              <div className="stage-feedback stage-feedback--correct" role="status" aria-live="polite">
                <strong>🎉 超棒的！</strong>答對獲得 <strong>+10 分</strong>，
                {clearedCount >= totalQuestions
                  ? '全部 8 關過關，正在即時同步送出成績...'
                  : '正在返回探險地圖...'}
              </div>
            ) : null}

            {feedback.kind === 'wrong' ? (
              <div className="stage-feedback stage-feedback--wrong" role="alert">
                <strong>🤔 再想想！</strong>這個答案不太對喔，留在這一關再挑戰看看！
              </div>
            ) : null}

            {feedback.kind === 'check_error' ? (
              <div className="stage-feedback stage-feedback--wrong" role="alert">
                <strong>連線錯誤：</strong>
                {feedback.message}
              </div>
            ) : null}

            {isCleared && feedback.kind !== 'correct' ? (
              <div
                className={`stage-feedback ${
                  stationProgress.status === 'cleared_after_retry'
                    ? 'stage-feedback--retry-cleared'
                    : 'stage-feedback--correct'
                }`}
              >
                <strong>
                  {stationProgress.status === 'cleared_after_retry'
                    ? '🟠 本關再戰闖關成功（+10 分）'
                    : '🟢 本關已闖關通過（+10 分）'}
                </strong>
                {stationProgress.explanation ? (
                  <p style={{ margin: '8px 0 0', fontSize: '0.88rem', lineHeight: 1.65 }}>
                    <strong>【探險小知識】</strong>
                    {stationProgress.explanation}
                  </p>
                ) : null}
              </div>
            ) : null}

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {visibleOptionKeys.map((optionKey) => {
                const isWrongTried = stationProgress.wrongOptions.includes(optionKey);
                const isCorrectChoice = isCleared && stationProgress.selectedAnswer === optionKey;
                const isThisChecking = isChecking && feedback.option === optionKey;

                let stateClass = '';
                if (isCorrectChoice) {
                  stateClass = 'option-btn--correct';
                } else if (isWrongTried) {
                  stateClass = 'option-btn--wrong';
                }

                return (
                  <PixelButton
                    key={optionKey}
                    variant="option"
                    className={stateClass}
                    disabled={isCleared || isChecking || isWrongTried}
                    onClick={() => onAttemptAnswer(optionKey)}
                  >
                    <span className="option-key-badge">{optionKey}</span>
                    <span style={{ flex: 1 }}>{question.options[optionKey]}</span>
                    {isThisChecking ? (
                      <span style={{ fontSize: '0.82rem', color: '#8f5608', fontWeight: 800 }}>
                        判定中...
                      </span>
                    ) : null}
                    {isCorrectChoice ? (
                      <span style={{ fontSize: '0.85rem', color: '#116239', fontWeight: 900 }}>
                        ✔ 正確
                      </span>
                    ) : null}
                    {isWrongTried ? (
                      <span style={{ fontSize: '0.82rem', color: '#b42318', fontWeight: 800 }}>
                        ✘ 再想想
                      </span>
                    ) : null}
                  </PixelButton>
                );
              })}
            </div>

            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                gap: '10px',
                marginTop: '4px',
                flexWrap: 'wrap',
              }}
            >
              <PixelButton
                variant="navy"
                onClick={onBackToMap}
                style={{ padding: '10px 18px', fontSize: '0.92rem' }}
              >
                ◀ 返回黃金島地圖
              </PixelButton>

              <span style={{ fontSize: '0.8rem', color: 'var(--ink-muted)' }}>
                {isCleared
                  ? '本關已完成，點擊返回地圖繼續挑戰其他關卡'
                  : '點擊選項立即判定（快捷鍵 A–D / 1–4、Esc 返回地圖）'}
              </span>
            </div>
          </div>
        </PixelPanel>
      </div>
    </div>
  );
}
