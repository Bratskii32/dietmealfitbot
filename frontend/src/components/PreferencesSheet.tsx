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
  {
    id: 'quick',
    emoji: '🏃',
    title: 'Быстро и просто',
    subtitle: 'Яйца, каши, курица — то что есть дома',
  },
  {
    id: 'healthy',
    emoji: '🥗',
    title: 'Стараюсь питаться правильно',
    subtitle: 'ПП, авокадо, цельные продукты, слежу за составом',
  },
  {
    id: 'cooking',
    emoji: '🍝',
    title: 'Люблю готовить',
    subtitle: 'Разнообразные блюда, не тороплюсь на кухне',
  },
  {
    id: 'varied',
    emoji: '🌍',
    title: 'Хочу пробовать новое',
    subtitle: 'Разные кухни, интересные рецепты, открыт к новому',
  },
];

const TIMES = [
  {
    id: 'quick',
    emoji: '⚡',
    title: 'До 15 минут',
    subtitle: 'Максимально быстро',
  },
  {
    id: 'medium',
    emoji: '🍳',
    title: 'До 30 минут',
    subtitle: 'Нормально, не тороплюсь',
  },
  {
    id: 'long',
    emoji: '👨‍🍳',
    title: 'Больше 30 минут',
    subtitle: 'Люблю готовить, время есть',
  },
];

function OptionCard({
  emoji,
  title,
  subtitle,
  selected,
  onClick,
}: {
  emoji: string;
  title: string;
  subtitle: string;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: 12,
        width: '100%',
        padding: 12,
        marginBottom: 8,
        borderRadius: 12,
        border: `2px solid ${selected ? 'var(--primary)' : 'var(--border)'}`,
        background: selected ? 'var(--primary-light)' : 'white',
        textAlign: 'left',
        cursor: 'pointer',
      }}
    >
      <span style={{ fontSize: 24, lineHeight: 1, flexShrink: 0 }}>{emoji}</span>
      <div>
        <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 2 }}>{title}</div>
        <div style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.4 }}>{subtitle}</div>
      </div>
    </button>
  );
}

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

        <h3 style={{ fontWeight: 600, fontSize: 15, marginBottom: 4 }}>
          Как ты обычно питаешься?
        </h3>
        <p style={{ color: 'var(--text-secondary)', fontSize: 13, marginBottom: 12 }}>
          Подберём рацион под твой ритм жизни
        </p>
        <div style={{ marginBottom: 20 }}>
          {STYLES.map((s) => (
            <OptionCard
              key={s.id}
              emoji={s.emoji}
              title={s.title}
              subtitle={s.subtitle}
              selected={eatingStyle === s.id}
              onClick={() => setEatingStyle(eatingStyle === s.id ? null : s.id)}
            />
          ))}
        </div>

        <h3 style={{ fontWeight: 600, fontSize: 15, marginBottom: 12 }}>
          Сколько времени на готовку?
        </h3>
        <div style={{ marginBottom: 20 }}>
          {TIMES.map((t) => (
            <OptionCard
              key={t.id}
              emoji={t.emoji}
              title={t.title}
              subtitle={t.subtitle}
              selected={cookingTime === t.id}
              onClick={() => setCookingTime(cookingTime === t.id ? null : t.id)}
            />
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
