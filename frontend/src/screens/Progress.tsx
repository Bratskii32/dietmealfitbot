import { useState, useEffect } from 'react';
import { api } from '../api/client';

type Achievement = {
  id: string;
  title: string;
  description: string;
  unlocked: boolean;
  reward_content: string | null;
  progressText: string | null;
};

export function Progress() {
  const [weightLog, setWeightLog] = useState<{ weight: number; log_date: string }[]>([]);
  const [cookedCount, setCookedCount] = useState(0);
  const [streak, setStreak] = useState(0);
  const [streakMessage, setStreakMessage] = useState('');
  const [aiComment, setAiComment] = useState('');
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [todayWeight, setTodayWeight] = useState('');
  const [saving, setSaving] = useState(false);
  const [selectedReward, setSelectedReward] = useState<Achievement | null>(null);

  useEffect(() => {
    loadProgress();
  }, []);

  const loadProgress = async () => {
    try {
      const data = await api.getProgress();
      setWeightLog(data.weightLog);
      setCookedCount(data.cookedCount);
      setStreak(data.streak);
      setStreakMessage(data.streakMessage);
      setAiComment(data.aiComment);
      setAchievements(data.achievements);
    } catch { /* ignore */ }
  };

  const handleSaveWeight = async () => {
    const w = Number(todayWeight);
    if (!w || w < 30 || w > 300) return;
    setSaving(true);
    try {
      await api.saveWeight(w);
      await loadProgress();
      setTodayWeight('');
    } catch { /* ignore */ }
    finally {
      setSaving(false);
    }
  };

  const handleAchievementClick = (a: Achievement) => {
    if (a.unlocked && a.reward_content) {
      setSelectedReward(a);
    }
  };

  const today = new Date().toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' });

  return (
    <div className="screen-content">
      <h2 style={{ fontSize: 22, marginBottom: 8 }}>Прогресс 📊</h2>

      <p style={{ fontSize: 16, fontWeight: 600, marginBottom: 8 }}>{streakMessage}</p>
      {aiComment && (
        <p style={{ fontSize: 14, color: 'var(--text-secondary)', marginBottom: 16 }}>{aiComment}</p>
      )}

      <div className="card" style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 14, color: 'var(--text-secondary)', marginBottom: 8 }}>Мой вес сегодня · {today}</div>
        <div style={{ display: 'flex', gap: 8 }}>
          <input
            type="number"
            value={todayWeight}
            onChange={(e) => setTodayWeight(e.target.value)}
            placeholder="кг"
            style={{
              flex: 1,
              padding: '12px 16px',
              border: '2px solid var(--border)',
              borderRadius: 12,
              fontSize: 16,
            }}
          />
          <button className="btn-primary" onClick={handleSaveWeight} disabled={saving} style={{ width: 'auto', padding: '12px 20px' }}>
            Сохранить
          </button>
        </div>
      </div>

      {weightLog.length > 0 && (
        <div className="card" style={{ marginBottom: 16 }}>
          <h3 style={{ fontSize: 16, marginBottom: 12 }}>График веса</h3>
          <WeightChart data={weightLog} />
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
        <StatCard label="Рецептов приготовлено" value={cookedCount} icon="👨‍🍳" />
        <StatCard label="Дней подряд" value={streak} icon="🔥" />
      </div>

      <h3 style={{ fontSize: 16, marginBottom: 12 }}>Достижения</h3>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {achievements.map((a) => (
          <div
            key={a.id}
            className="card"
            onClick={() => handleAchievementClick(a)}
            style={{
              opacity: a.unlocked ? 1 : 0.45,
              marginBottom: 0,
              cursor: a.unlocked && a.reward_content ? 'pointer' : 'default',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <span style={{ fontSize: 24 }}>{a.unlocked ? '🏅' : '🔒'}</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 15, fontWeight: a.unlocked ? 600 : 400 }}>{a.title}</div>
                <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 2 }}>{a.description}</div>
                {!a.unlocked && a.progressText && (
                  <div style={{ fontSize: 12, color: 'var(--primary)', marginTop: 6 }}>{a.progressText}</div>
                )}
                {a.unlocked && a.reward_content && (
                  <div style={{ fontSize: 12, color: 'var(--primary)', marginTop: 6 }}>Нажми, чтобы открыть награду →</div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {selectedReward && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'flex-end',
            justifyContent: 'center',
            zIndex: 1000,
            padding: 16,
          }}
          onClick={() => setSelectedReward(null)}
        >
          <div
            className="card"
            style={{
              width: '100%',
              maxWidth: 480,
              maxHeight: '70vh',
              overflow: 'auto',
              marginBottom: 0,
              borderRadius: '16px 16px 0 0',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ fontSize: 18, marginBottom: 12 }}>{selectedReward.title}</h3>
            <p style={{ fontSize: 14, lineHeight: 1.6, whiteSpace: 'pre-line' }}>{selectedReward.reward_content}</p>
            <button
              className="btn-primary"
              style={{ marginTop: 16 }}
              onClick={() => setSelectedReward(null)}
            >
              Закрыть
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value, icon }: { label: string; value: number; icon: string }) {
  return (
    <div className="card" style={{ textAlign: 'center', marginBottom: 0 }}>
      <div style={{ fontSize: 28 }}>{icon}</div>
      <div style={{ fontSize: 28, fontWeight: 700, color: 'var(--primary)', margin: '4px 0' }}>{value}</div>
      <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{label}</div>
    </div>
  );
}

function WeightChart({ data }: { data: { weight: number; log_date: string }[] }) {
  const maxW = Math.max(...data.map((d) => d.weight)) + 2;
  const minW = Math.min(...data.map((d) => d.weight)) - 2;
  const range = maxW - minW || 1;
  const width = 300;
  const height = 120;
  const padding = 20;

  const points = data.map((d, i) => {
    const x = padding + (i / Math.max(data.length - 1, 1)) * (width - 2 * padding);
    const y = height - padding - ((d.weight - minW) / range) * (height - 2 * padding);
    return `${x},${y}`;
  }).join(' ');

  return (
    <svg viewBox={`0 0 ${width} ${height}`} style={{ width: '100%', height: 140 }}>
      <polyline fill="none" stroke="var(--primary)" strokeWidth="2.5" points={points} />
      {data.map((d, i) => {
        const x = padding + (i / Math.max(data.length - 1, 1)) * (width - 2 * padding);
        const y = height - padding - ((d.weight - minW) / range) * (height - 2 * padding);
        return (
          <g key={i}>
            <circle cx={x} cy={y} r="4" fill="var(--primary)" />
            <text x={x} y={height - 4} textAnchor="middle" fontSize="9" fill="var(--text-secondary)">
              {new Date(d.log_date).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
