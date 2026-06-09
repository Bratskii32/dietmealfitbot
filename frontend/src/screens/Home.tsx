import { useState, useEffect, useRef } from 'react';
import { CalorieChart } from '../components/CalorieChart';
import { MealCard } from '../components/MealCard';
import { api } from '../api/client';
import { WeekPlan, Recipe, Screen } from '../types';

interface Props {
  userName: string;
  onNavigate: (screen: Screen) => void;
  onRecipeSelect: (recipe: Recipe) => void;
}

const DAY_NAMES = ['Воскресенье', 'Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница', 'Суббота'];

export function Home({ userName, onNavigate, onRecipeSelect }: Props) {
  const [plan, setPlan] = useState<WeekPlan | null>(null);
  const [dayIndex, setDayIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [canRefresh, setCanRefresh] = useState(true);
  const [error, setError] = useState('');
  const touchStartX = useRef(0);

  useEffect(() => {
    loadPlan();
    loadRefreshStatus();
  }, []);

  const loadPlan = async () => {
    try {
      const { plan: p } = await api.getPlan();
      setPlan(p);
    } catch {
      setError('Не удалось загрузить рацион');
    } finally {
      setLoading(false);
    }
  };

  const loadRefreshStatus = async () => {
    try {
      const { canRefresh: cr } = await api.getRefreshStatus();
      setCanRefresh(cr);
    } catch { /* ignore */ }
  };

  const handleRefresh = async () => {
    if (!canRefresh) return;
    setRefreshing(true);
    setError('');
    try {
      const { plan: p } = await api.generatePlan();
      setPlan(p);
      setCanRefresh(false);
    } catch (err: unknown) {
      const e = err as { error?: string; status?: number };
      setError(e.error || 'Попробуй через минуту');
    } finally {
      setRefreshing(false);
    }
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    const diff = touchStartX.current - e.changedTouches[0].clientX;
    if (Math.abs(diff) > 50) {
      if (diff > 0 && dayIndex < 6) setDayIndex(dayIndex + 1);
      if (diff < 0 && dayIndex > 0) setDayIndex(dayIndex - 1);
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
    <div
      className="screen-content"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{dateStr}, {dayName}</div>
        <h1 style={{ fontSize: 24, marginTop: 4 }}>Привет, {userName}! 👋</h1>
      </div>

      <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginBottom: 16 }}>
        {plan.days.map((_, i) => (
          <div
            key={i}
            onClick={() => setDayIndex(i)}
            style={{
              width: 8,
              height: 8,
              borderRadius: '50%',
              background: i === dayIndex ? 'var(--primary)' : 'var(--border)',
              cursor: 'pointer',
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
          onRecipeClick={() => onRecipeSelect(meal.recipe)}
        />
      ))}

      {error && <p className="error-text">{error}</p>}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 8 }}>
        <button className="btn-primary" onClick={() => onNavigate('chat')}>
          Задать вопрос диетологу 💬
        </button>
        <button
          className="btn-secondary"
          onClick={handleRefresh}
          disabled={refreshing || !canRefresh}
        >
          {refreshing ? 'Обновляем...' : canRefresh ? 'Обновить рацион 🔄' : 'Обновление доступно завтра'}
        </button>
      </div>
    </div>
  );
}
