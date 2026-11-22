interface ProgressBarProps {
  current: number;
  total: number;
  tone?: 'gold' | 'emerald';
  label?: string;
}

export function ProgressBar({ current, total, tone = 'gold', label }: ProgressBarProps) {
  const safeTotal = total > 0 ? total : 1;
  const percent = Math.min(100, Math.max(0, Math.round((current / safeTotal) * 100)));

  return (
    <div style={{ width: '100%' }}>
      {label ? (
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            fontSize: '0.82rem',
            marginBottom: '6px',
            fontWeight: 700,
          }}
        >
          <span>{label}</span>
          <span style={{ fontWeight: 900 }}>
            {current}/{total}
          </span>
        </div>
      ) : null}
      <div
        className="pixel-progress-track"
        role="progressbar"
        aria-valuenow={current}
        aria-valuemin={0}
        aria-valuemax={total}
      >
        <div
          className={`pixel-progress-fill ${tone === 'emerald' ? 'pixel-progress-fill--emerald' : ''}`.trim()}
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}
