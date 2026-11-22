import type { FormEvent } from 'react';
import { useState } from 'react';
import { appEnv, isDemoMode } from '../../../lib/env';
import type { LeaderboardState } from '../hooks/use-leaderboard';
import type { TeamInfo } from '../schemas/quiz.schema';
import { teamInfoSchema } from '../schemas/quiz.schema';
import { AdminModal } from './admin-modal';
import { LeaderboardPanel } from './leaderboard-panel';

interface StartScreenProps {
  initialTeamInfo: TeamInfo | null;
  leaderboard: LeaderboardState;
  onReloadLeaderboard: () => void;
  onStart: (teamInfo: TeamInfo) => void;
}

interface TeamFormDraft {
  className: string;
  teamNumber: string;
  teamName: string;
  teamLeader: string;
  teamSize: string;
}

type FieldErrors = Partial<Record<keyof TeamFormDraft, string>>;

const TEAM_NUMBER_OPTIONS = Array.from({ length: 10 }, (_, idx) => `第${idx + 1}小隊`);

export function StartScreen({
  initialTeamInfo,
  leaderboard,
  onReloadLeaderboard,
  onStart,
}: StartScreenProps) {
  const [isAdminOpen, setIsAdminOpen] = useState(false);
  const [draft, setDraft] = useState<TeamFormDraft>(() => ({
    className: initialTeamInfo?.className ?? '',
    teamNumber: initialTeamInfo?.teamNumber ?? '',
    teamName: initialTeamInfo?.teamName ?? '',
    teamLeader: initialTeamInfo?.teamLeader ?? '',
    teamSize: initialTeamInfo ? String(initialTeamInfo.teamSize) : '',
  }));
  const [errors, setErrors] = useState<FieldErrors>({});

  const updateField = (field: keyof TeamFormDraft, value: string) => {
    setDraft((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => {
      if (!prev[field]) return prev;
      const next = { ...prev };
      delete next[field];
      return next;
    });
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const parsed = teamInfoSchema.safeParse(draft);
    if (!parsed.success) {
      const nextErrors: FieldErrors = {};
      for (const issue of parsed.error.issues) {
        const key = issue.path[0];
        if (
          key === 'className' ||
          key === 'teamNumber' ||
          key === 'teamName' ||
          key === 'teamLeader' ||
          key === 'teamSize'
        ) {
          if (!nextErrors[key]) {
            nextErrors[key] = issue.message;
          }
        }
      }
      setErrors(nextErrors);
      return;
    }

    setErrors({});
    onStart(parsed.data);
  };

  return (
    <>
      <div className="home-container">
        <header className="home-header">
          <h1 className="home-title">科博館黃金島闖關</h1>
        </header>

        <section className="home-story-card" aria-label="活動說明">
          <p>
            各位小小探險家，歡迎登陸「臺中科博館．黃金島」！今天整座博物館就是一座超大智慧寶庫，快背上「求知背包」，準備展開刺激的「黃金島知識闖關」！
          </p>
          <p>
            從巨大的恐龍、神祕木乃伊，到藏著漢字密碼的葫蘆門，處處都是解謎線索！快睜大雙眼、揪夥伴一起動腦，把閃亮的「知識寶藏」通通裝進背包吧！準備好了嗎？我們出發囉！
          </p>
        </section>

        <LeaderboardPanel leaderboard={leaderboard} onReload={onReloadLeaderboard} />

        <section className="home-form-card" aria-label="小隊資料登錄">
          <h2 className="home-form-title">
            <span>小隊探險報到</span>
            <span className="home-form-meta">
              共{appEnv.QUESTION_COUNT}關，以班級為單位，取班上成績最高小隊
            </span>
          </h2>

          {isDemoMode ? (
            <div className="home-demo-notice">
              目前為本地展示模式（<code>.env</code> 尚未填寫 <code>GOOGLE_APP_SCRIPT_URL</code>
              ），小隊資料與成績將先模擬儲存於本機。
            </div>
          ) : null}

          <form onSubmit={handleSubmit} noValidate>
            <div className="team-form-grid">
              <div className="team-field">
                <label htmlFor="team-class-name">班級</label>
                <input
                  id="team-class-name"
                  type="text"
                  className="team-input"
                  placeholder="例如：901（填入自己的班級）"
                  value={draft.className}
                  onChange={(e) => updateField('className', e.target.value)}
                  maxLength={30}
                  autoFocus
                />
                {errors.className ? <p className="team-field-error">{errors.className}</p> : null}
              </div>

              <div className="team-field">
                <label htmlFor="team-number">第幾小隊</label>
                <select
                  id="team-number"
                  className="team-input"
                  value={draft.teamNumber}
                  onChange={(e) => updateField('teamNumber', e.target.value)}
                >
                  <option value="">請選擇小隊（第1～10小隊）</option>
                  {TEAM_NUMBER_OPTIONS.map((teamLabel) => (
                    <option key={teamLabel} value={teamLabel}>
                      {teamLabel}
                    </option>
                  ))}
                </select>
                {errors.teamNumber ? <p className="team-field-error">{errors.teamNumber}</p> : null}
              </div>

              <div className="team-field team-field--full">
                <label htmlFor="team-name">小隊名稱</label>
                <input
                  id="team-name"
                  type="text"
                  className="team-input"
                  placeholder="例如：暴龍探險隊"
                  value={draft.teamName}
                  onChange={(e) => updateField('teamName', e.target.value)}
                  maxLength={30}
                />
                {errors.teamName ? <p className="team-field-error">{errors.teamName}</p> : null}
              </div>

              <div className="team-field">
                <label htmlFor="team-leader">小隊長</label>
                <input
                  id="team-leader"
                  type="text"
                  className="team-input"
                  placeholder="請輸入小隊長姓名"
                  value={draft.teamLeader}
                  onChange={(e) => updateField('teamLeader', e.target.value)}
                  maxLength={30}
                />
                {errors.teamLeader ? <p className="team-field-error">{errors.teamLeader}</p> : null}
              </div>

              <div className="team-field">
                <label htmlFor="team-size">小隊人數</label>
                <select
                  id="team-size"
                  className="team-input"
                  value={draft.teamSize}
                  onChange={(e) => updateField('teamSize', e.target.value)}
                >
                  <option value="">請選擇人數（1～10 人）</option>
                  {Array.from({ length: 10 }, (_, idx) => idx + 1).map((count) => (
                    <option key={count} value={String(count)}>
                      {count} 人
                    </option>
                  ))}
                </select>
                {errors.teamSize ? <p className="team-field-error">{errors.teamSize}</p> : null}
              </div>
            </div>

            <button type="submit" className="home-submit-btn">
              出發！進入黃金島闖關 →
            </button>
          </form>
        </section>
      </div>

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
          leaderboard={leaderboard}
          onReloadLeaderboard={onReloadLeaderboard}
          onClose={() => setIsAdminOpen(false)}
        />
      ) : null}
    </>
  );
}
