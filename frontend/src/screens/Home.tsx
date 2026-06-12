import { useState, useEffect, useRef } from 'react';
import { CalorieChart } from '../components/CalorieChart';
import { MealCard } from '../components/MealCard';
import { api } from '../api/client';
import { WeekPlan, Recipe, Screen } from '../types';

interface Props {
  userName: string;
  isPremium: boolean;
  onNavigate: (screen: Screen) => void;
  onRecipeSelect: (recipe: Recipe) => void;
  onShowPaywall: () => void;
}

const DAY_NAMES = ['Воскресенье', 'Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница', 'Суббота'];

export function Home({ userName, isPremium: isPremiumProp, onNavigate, onRecipeSelect, onShowPaywall }: Props) {
  const [plan, setPlan] = useState<WeekPlan | null>(null);
  const [dayIndex, setDayIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [isPremium, setIsPremium] = useState(isPremiumProp);
  const [maxDays, setMaxDays] = useState(3);
  const [dailyStatus, setDailyStatus] = useState('');
  const [snackRemaining, setSnackRemaining] = useState(3);
  const [snackSuggestion, setSnackSuggestion] = useState('');
  const [snackWarning, setSnackWarning] = useState('');
  const [snackLoading, setSnackLoading] = useState(false);
  const [error, setError] = useState('');
  const touchStartX = useRef(0);

  useEffect(() => {
    loadAll();
  }, []);

  useEffect(() => {
    setIsPremium(isPremiumProp);
  }, [isPremiumProp]);

  const loadAll = async () => {
    try {
      const [planData, statusData, snackStatus] = await Promise.all([
        api.getPlan(),
        api.getDailyStatus(),
        api.getWhatToEatStatus(),
      ]);
      setPlan(planData.plan);
      setIsPremium(planData.isPremium);
      setMaxDays(planData.maxDays);
      setDailyStatus(statusData.status);
      if (!planData.isPremium) {
        setSnackRemaining(snackStatus.remaining);
      }
    } catch {
      setError('Не удалось загрузить рацион');
    } finally {
      setLoading(false);
    }
  };

  const handleWhatToEat = async () => {
    if (!isPremium && snackRemaining <= 0) {
      onShowPaywall();
      return;
    }
    setSnackLoading(true);
    setSnackSuggestion('');
    setSnackWarning('');
    try {
      const data = await api.whatToEat();
      setSnackSuggestion(data.suggestion);
      if (data.warning) setSnackWarning(data.warning);
      if (!data.isPremium) setSnackRemaining(data.remaining);
    } catch (err: unknown) {
      const e = err as { error?: string; status?: number };
      if (e.error === 'premium_required' || e.status === 429) {
        onShowPaywall();
      } else {
        setError('Попробуй через минуту');
      }
    } finally {
      setSnackLoading(false);
    }
  };

  const handleReplace = async (dayNumber: number, mealType: string, recipeName: string) => {
    try {
      const data = await api.replaceMeal(dayNumber, mealType, recipeName);
      setPlan(data.plan);
    } catch (err: unknown) {
      const e = err as { error?: string; status?: number };
      if (e.error === 'premium_required' || e.status === 403) {
        onShowPaywall();
      } else {
        setError('Не удалось заменить блюдо');
      }
    }
  };

  const tryGoToDay = (index: number) => {
    if (index >= maxDays) {
      onShowPaywall();
      return;
    }
    setDayIndex(index);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    const diff = touchStartX.current - e.changedTouches[0].clientX;
    if (Math.abs(diff) > 50) {
      if (diff > 0 && dayIndex < 6) tryGoToDay(dayIndex + 1);
      if (diff < 0 && dayIndex > 0) tryGoToDay(dayIndex - 1);
    }
  };

  if (loading) {
    return (
      <div className="spinner-container">
        <div className="spinner" />
      </div>
    );
  }

  if (!plan) {
    return <p className="error-text">Рацион не найден</p>;
  }

  const day = plan.days[dayIndex];
  if (!day) {
    return <p className="error-text">Рацион не найден</p>;
  }

  const today = new Date();
  const displayDate = new Date(today);
  displayDate.setDate(today.getDate() + dayIndex);
  const dayName = DAY_NAMES[displayDate.getDay()];
  const dateStr = displayDate.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' });

  const consumed = day.meals.reduce((sum, m) => sum + m.recipe.calories, 0);
  const consumedProtein = day.meals.reduce((sum, m) => sum + m.recipe.protein, 0);
  const consumedCarbs = day.meals.reduce((sum, m) => sum + m.recipe.carbs, 0);
  const consumedFat = day.meals.reduce((sum, m) => sum + m.recipe.fat, 0);

  return (
    <div className="screen-content" onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
        <div>
          <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{dateStr}, {dayName}</div>
          <h1 style={{ fontSize: 24, marginTop: 4 }}>Привет, {userName}! 👋</h1>
        </div>
        {!isPremium && (
          <button
            onClick={onShowPaywall}
            style={{
              background: '#FFB300', color: '#fff', border: 'none', borderRadius: 20,
              padding: '8px 14px', fontSize: 13, fontWeight: 600, flexShrink: 0,
            }}
          >
            ⭐ Premium
          </button>
        )}
      </div>

      {dailyStatus && (
        <p style={{ fontSize: 14, color: 'var(--text-secondary)', marginBottom: 12 }}>{dailyStatus}</p>
      )}

      <button
        onClick={handleWhatToEat}
        disabled={snackLoading}
        style={{
          width: '100%', textAlign: 'left', background: 'white', border: '2px solid var(--primary-light)',
          borderRadius: 12, padding: '12px 16px', marginBottom: 16, fontSize: 15, cursor: 'pointer',
        }}
      >
        {snackLoading ? '⏳ Думаю...' : '💡 Что мне съесть сейчас?'}
        {!isPremium && (
          <span style={{ float: 'right', fontSize: 12, color: 'var(--text-secondary)' }}>
            Советов осталось: {snackRemaining}/3
          </span>
        )}
      </button>

      {snackWarning && (
        <p style={{ fontSize: 13, color: '#FF9800', marginBottom: 8 }}>{snackWarning}</p>
      )}

      {snackSuggestion && (
        <div className="card" style={{ marginBottom: 16, fontSize: 14, lineHeight: 1.5, whiteSpace: 'pre-line' }}>
          {snackSuggestion}
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginBottom: 16 }}>
        {Array.from({ length: 7 }, (_, i) => (
          <div
            key={i}
            onClick={() => tryGoToDay(i)}
            style={{
              width: 8, height: 8, borderRadius: '50%',
              background: i === dayIndex ? 'var(--primary)' : i >= maxDays ? '#E0E0E0' : 'var(--border)',
              cursor: 'pointer', opacity: i >= maxDays ? 0.5 : 1,
            }}
          />
        ))}
      </div>

      <CalorieChart
        consumed={consumed}
        target={plan.dailyCalories}
        protein={consumedProtein}
        carbs={consumedCarbs}
        fat={consumedFat}
      />

      {day.meals.map((meal, i) => (
        <MealCard
          key={i}
          type={meal.type}
          recipe={meal.recipe}
          dayNumber={day.dayNumber}
          isPremium={isPremium}
          onRecipeClick={() => onRecipeSelect(meal.recipe)}
          onReplace={() => handleReplace(day.dayNumber, meal.type, meal.recipe.name)}
          onShowPaywall={onShowPaywall}
        />
      ))}

      {error && <p className="error-text">{error}</p>}

      <div style={{ marginTop: 8 }}>
        <button className="btn-primary" onClick={() => onNavigate('chat')}>
          Задать вопрос диетологу 💬
        </button>
      </div>
    </div>
  );
}
