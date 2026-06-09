interface Props {
  current: number;
  total: number;
}

export function ProgressBar({ current, total }: Props) {
  const percent = (current / total) * 100;

  return (
    <div style={{ marginBottom: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, fontSize: 13, color: 'var(--text-secondary)' }}>
        <span>Шаг {current} из {total}</span>
        <span>{Math.round(percent)}%</span>
      </div>
      <div style={{ height: 6, background: 'var(--border)', borderRadius: 3, overflow: 'hidden' }}>
        <div
          style={{
            height: '100%',
            width: `${percent}%`,
            background: 'var(--primary)',
            borderRadius: 3,
            transition: 'width 0.3s ease',
          }}
        />
      </div>
    </div>
  );
}
