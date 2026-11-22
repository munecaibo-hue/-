import { PixelButton } from '../../../components/ui/pixel-button';
import { PixelPanel } from '../../../components/ui/pixel-panel';
import { isDemoMode } from '../../../lib/env';
import type { QuizResult, TeamInfo } from '../schemas/quiz.schema';

interface ResultScreenProps {
  result: QuizResult;
  teamInfo: TeamInfo;
  onReplaySameTeam: () => void;
  onBackToHome: () => void;
}

export function ResultScreen({
  result,
  teamInfo,
  onReplaySameTeam,
  onBackToHome,
}: ResultScreenProps) {
  const { stats, review } = result;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <PixelPanel tone="navy">
        <div
          style={{
            padding: '28px 24px',
            textAlign: 'center',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '12px',
          }}
        >
          <span
            style={{
              padding: '5px 16px',
              borderRadius: '999px',
              fontSize: '0.85rem',
              fontWeight: 900,
              background: result.isPassed ? 'var(--emerald-bright)' : 'var(--crimson-bright)',
              color: 'var(--ink-dark)',
            }}
          >
            {result.isPassed ? '闖關成功' : '再接再厲'}
          </span>

          <h2
            style={{
              margin: 0,
              fontSize: 'clamp(1.5rem, 4vw, 2.1rem)',
              color: result.isPassed ? 'var(--gold-bright)' : '#ffd6d6',
              textShadow: '0 2px 8px rgba(0, 0, 0, 0.45)',
            }}
          >
            {result.isPassed ? '恭喜通關黃金島試煉！' : '差一點點就能通關，再挑戰一次！'}
          </h2>

          <p style={{ margin: 0, fontSize: '0.96rem', color: '#e6f1fc' }}>
            <strong>
              {teamInfo.className}・{teamInfo.teamNumber}・{teamInfo.teamName}
            </strong>{' '}
            （小隊長：{teamInfo.teamLeader}／{teamInfo.teamSize} 人）
          </p>

          <p style={{ margin: 0, fontSize: '1.05rem', color: '#d7e6f7' }}>
            本次答對{' '}
            <strong style={{ color: 'var(--gold-bright)' }}>
              {result.correctCount} / {result.totalQuestions}
            </strong>{' '}
            題｜本次總分{' '}
            <strong style={{ color: 'var(--gold-bright)', fontSize: '1.3rem' }}>
              {result.score} 分
            </strong>
          </p>

          {result.isAllGreen && result.perfectBonus > 0 ? (
            <div
              style={{
                padding: '10px 18px',
                borderRadius: '14px',
                background: 'linear-gradient(135deg, rgba(255, 212, 77, 0.25), rgba(82, 229, 150, 0.25))',
                border: '2px solid var(--gold-bright)',
                color: '#fff6d1',
                fontWeight: 800,
                fontSize: '0.96rem',
              }}
            >
              🏆 全部 8 關全綠燈一次通關！自動獲得完美鼓勵加分 +{result.perfectBonus} 分（滿分 100 分）！
            </div>
          ) : null}

          <span style={{ fontSize: '0.82rem', color: '#9bb5d4' }}>
            {isDemoMode
              ? '（本地展示模式：紀錄已暫存於瀏覽器 localStorage）'
              : `成績已同步寫入 Google Sheets（${stats.lastPlayedAt}）`}
          </span>

          <div
            style={{
              display: 'flex',
              gap: '12px',
              marginTop: '8px',
              flexWrap: 'wrap',
              justifyContent: 'center',
            }}
          >
            <PixelButton
              variant="gold"
              onClick={onReplaySameTeam}
              style={{ padding: '13px 22px', fontSize: '1rem' }}
            >
              ↻ 同小隊再次挑戰
            </PixelButton>
            <PixelButton
              variant="navy"
              onClick={onBackToHome}
              style={{ padding: '13px 20px', fontSize: '0.95rem' }}
            >
              返回首頁重新登錄
            </PixelButton>
          </div>
        </div>
      </PixelPanel>

      <PixelPanel tone="parchment">
        <div style={{ padding: '22px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div>
            <h3 style={{ margin: '0 0 12px', fontSize: '1.12rem', fontWeight: 900 }}>
              小隊闖關戰績（對應「回答」工作表）
            </h3>
            <div className="stats-grid">
              <div className="stat-tile">
                <div className="stat-tile__label">闖關次數</div>
                <div className="stat-tile__value">{stats.attempts}</div>
              </div>
              <div className="stat-tile">
                <div className="stat-tile__label">累計總分</div>
                <div className="stat-tile__value">{stats.totalScore}</div>
              </div>
              <div className="stat-tile">
                <div className="stat-tile__label">最高分</div>
                <div className="stat-tile__value">{stats.bestScore}</div>
              </div>
              <div className="stat-tile">
                <div className="stat-tile__label">第一次通關分數</div>
                <div className="stat-tile__value">
                  {stats.firstPassScore !== null ? stats.firstPassScore : '—'}
                </div>
              </div>
              <div className="stat-tile">
                <div className="stat-tile__label">花了幾次通關</div>
                <div className="stat-tile__value">
                  {stats.attemptsToPass !== null ? `${stats.attemptsToPass} 次` : '尚未'}
                </div>
              </div>
            </div>
          </div>

          <div>
            <h3 style={{ margin: '0 0 12px', fontSize: '1.12rem', fontWeight: 900 }}>
              本次作答回顧
            </h3>
            <div className="review-list">
              {review.map((item, idx) => (
                <div
                  key={`${item.questionId}-${idx}`}
                  className={`review-item ${item.isCorrect ? 'review-item--correct' : 'review-item--wrong'}`}
                >
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      gap: '8px',
                      marginBottom: '6px',
                      fontWeight: 700,
                    }}
                  >
                    <span>
                      第 {idx + 1} 關（{item.questionId}）：{item.question}
                    </span>
                    <span
                      style={{
                        flexShrink: 0,
                        color: item.isCorrect ? 'var(--emerald-shadow)' : 'var(--crimson-main)',
                      }}
                    >
                      {item.isCorrect ? '✔ 答對' : '✘ 答錯'}
                    </span>
                  </div>
                  <div style={{ fontSize: '0.9rem', color: 'var(--ink-muted)' }}>
                    你的作答：
                    <strong>
                      {item.selected}. {item.selectedText}
                    </strong>
                    {!item.isCorrect ? (
                      <>
                        {' '}
                        ｜ 正確解答：
                        <strong style={{ color: 'var(--emerald-shadow)' }}>
                          {item.correctAnswer}. {item.correctText}
                        </strong>
                      </>
                    ) : null}
                  </div>
                  {item.explanation ? (
                    <div
                      style={{
                        marginTop: '8px',
                        padding: '10px 12px',
                        borderRadius: '8px',
                        background: '#f5ecd4',
                        color: '#4a361e',
                        fontSize: '0.86rem',
                        lineHeight: 1.65,
                      }}
                    >
                      <strong>【探險小知識】</strong>
                      {item.explanation}
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
          </div>
        </div>
      </PixelPanel>
    </div>
  );
}
