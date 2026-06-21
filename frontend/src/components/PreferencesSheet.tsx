import { useState } from 'react';
import { api } from '../api/client';
import { WeekPlan } from '../types';

interface Props {
  initialEatingStyle?: string | null;
  initialCookingTime?: string | null;
  onClose: () => void;
  onSaved: (plan: WeekPlan) => void;
  onSkip?: () => void;
  showSkip?: boolean;
}

const STYLES = [
  { id: 'quick', label: '🏃 Быстро' },
  { id: 'healthy', label: '🥗 ПП' },
  { id: 'cooking', label: '🍝 Готовить' },
  { id: 'varied', label: '🌍 Разное' },
];

const TIMES = [
  { id: 'quick', label: '⚡ 15 мин' },
  { id: 'medium', label: '🍳 30 мин' },
  { id: 'long', label: '👨‍🍳 Не важно' },
];

export function PreferencesSheet({
  initialEatingStyle,
  initialCookingTime,
  onClose,
  onSaved,
  onSkip,
  showSkip = true,
}: Props) {
  const [eatingStyle, setEatingStyle] = useState<string | null>(initialEatingStyle || null);
  const [cookingTime, setCookingTime] = useState<string | null>(initialCookingTime || null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSave = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await api.savePreferences(eatingStyle, cookingTime);
      onSaved(data.plan);
      onClose();
    } catch {
      setError('Не удалось обновить рацион. Попробуй позже.');
    } finally {
      setLoading(false);
    }
  };

  const handleSkip = async () => {
    try {
      await api.skipPreferences();
    } catch { /* ignore */ }
    onSkip?.();
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={showSkip ? handleSkip : onClose}>
      <div className="modal-content modal-bottom" onClick={(e) => e.stopPropagation()}>
        <h2 style={{ fontSize: 20, marginBottom: 6 }}>Хочешь подстрою меню под тебя?</h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: 14, marginBottom: 20 }}>
          1 секунда — и рацион станет точнее
        </p>

        <p style={{ fontWeight: 600, marginBottom: 10, fontSize: 14 }}>Твой стиль еды</p>
        <div className="options-row" style={{ flexWrap: 'wrap', marginBottom: 20 }}>
          {STYLES.map((s) => (
            <button
              key={s.id}
              className={`btn-option ${eatingStyle === s.id ? 'selected' : ''}`}
              style={{ flex: '1 1 45%', fontSize: 13, padding: '10px 8px' }}
              onClick={() => setEatingStyle(eatingStyle === s.id ? null : s.id)}
            >
              {s.label}
            </button>
          ))}
        </div>

        <p style={{ fontWeight: 600, marginBottom: 10, fontSize: 14 }}>Время на готовку</p>
        <div className="options-row" style={{ flexWrap: 'wrap', marginBottom: 20 }}>
          {TIMES.map((t) => (
            <button
              key={t.id}
              className={`btn-option ${cookingTime === t.id ? 'selected' : ''}`}
              style={{ flex: '1 1 30%', fontSize: 13, padding: '10px 6px' }}
              onClick={() => setCookingTime(cookingTime === t.id ? null : t.id)}
            >
              {t.label}
            </button>
          ))}
        </div>

        {error && <p className="error-text" style={{ padding: '0 0 12px' }}>{error}</p>}

        <button className="btn-primary" onClick={handleSave} disabled={loading}>
          {loading ? 'Обновляю рацион...' : 'Сохранить и обновить рацион'}
        </button>

        {showSkip && (
          <button
            type="button"
            onClick={handleSkip}
            style={{
              display: 'block', width: '100%', textAlign: 'center', marginTop: 14,
              background: 'none', color: 'var(--text-secondary)', fontSize: 14,
            }}
          >
            Пропустить
          </button>
        )}
      </div>
    </div>
  );
}
