interface Props {
  consumed: number;
  target: number;
  protein: number;
  carbs: number;
  fat: number;
}

export function CalorieChart({ consumed, target, protein, carbs, fat }: Props) {
  const percent = Math.min((consumed / target) * 100, 100);
  const radius = 54;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (percent / 100) * circumference;

  return (
    <div className="card" style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
      <div style={{ position: 'relative', width: 130, height: 130, flexShrink: 0 }}>
        <svg width="130" height="130" style={{ transform: 'rotate(-90deg)' }}>
          <circle cx="65" cy="65" r={radius} fill="none" stroke="var(--border)" strokeWidth="10" />
          <circle
            cx="65"
            cy="65"
            r={radius}
            fill="none"
            stroke="var(--primary)"
            strokeWidth="10"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
            style={{ transition: 'stroke-dashoffset 0.5s ease' }}
          />
        </svg>
        <div style={{
          position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
          textAlign: 'center',
        }}>
          <div style={{ fontSize: 22, fontWeight: 700 }}>{consumed}</div>
          <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>из {target} ккал</div>
        </div>
      </div>
      <div style={{ flex: 1 }}>
        <MacroRow label="Белки" value={protein} unit="г" color="#4CAF50" />
        <MacroRow label="Жиры" value={fat} unit="г" color="#FF9800" />
        <MacroRow label="Углеводы" value={carbs} unit="г" color="#2196F3" />
      </div>
    </div>
  );
}

function MacroRow({ label, value, unit, color }: { label: string; value: number; unit: string; color: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
      <div style={{ width: 8, height: 8, borderRadius: '50%', background: color, flexShrink: 0 }} />
      <span style={{ fontSize: 14, flex: 1 }}>{label}</span>
      <span style={{ fontSize: 14, fontWeight: 600 }}>{value} {unit}</span>
    </div>
  );
}
