import { useState, useEffect, useRef, useCallback } from 'react';
import { CalorieChart } from '../components/CalorieChart';
import { MealCard } from '../components/MealCard';
import { PlanSkeleton } from '../components/PlanSkeleton';
import { ErrorToast } from '../components/ErrorToast';
import { ShoppingListModal } from '../components/ShoppingListModal';
import { api } from '../api/client';
import { parseApiError } from '../utils/errors';
import { WeekPlan, Recipe, Screen } from '../types';

interface Props {
  userName: string;
  isPremium: boolean;
  daysAway?: number;
  onNavigate: (screen: Screen) => void;
  onRecipeSelect: (recipe: Recipe) => void;
  onShowPaywall: () => void;
}

const DAY_NAMES = ['Воскресенье', 'Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница', 'Суббота'];

export function Home({
  userName,
  isPremium: isPremiumProp,
  daysAway = 0,
  onNavigate,
  onRecipeSelect,
  onShowPaywall,
}: Props) {
  const [plan, setPlan] = useState<WeekPlan | null>(null);
  const [dayIndex, setDayIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isPremium, setIsPremium] = useState(isPremiumProp);
  const [maxDays, setMaxDays] = useState(3);
  const [dailyStatus, setDailyStatus] = useState('');
  const [snackRemaining, setSnackRemaining] = useState(3);
  const [snackSuggestion, setSnackSuggestion] = useState('');
  const [snackWarning, setSnackWarning] = useState('');
  const [snackLoading, setSnackLoading] = useState(false);
  const [shoppingLoading, setShoppingLoading] = useState(false);
  const [shoppingList, setShoppingList] = useState('');
  const [showWelcomeBack, setShowWelcomeBack] = useState(daysAway >= 3);
  const [toast, setToast] = useState<{ message: string; retry?: () => void } | null>(null);
  const touchStartX = useRef(0);
  const touchStartY = useRef(0);
  const pullStartY = useRef(0);
  const [pullDistance, setPullDistance] = useState(0);

  useEffect(() => {
    loadAll();
  }, []);

  useEffect(() => {
    setIsPremium(isPremiumProp);
  }, [isPremiumProp]);

  useEffect(() => {
    setShowWelcomeBack(daysAway >= 3);
  }, [daysAway]);

  const showError = (err: unknown, retry?: () => void) => {
    const parsed = parseApiError(err);
    setToast({ message: parsed.message, retry: parsed.retryable ? retry : undefined });
  };

  const loadAll = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
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
    } catch (err) {
      showError(err, () => loadAll(true));
    } finally {
      setLoading(false);
      setRefreshing(false);
      setPullDistance(0);
    }
  }, []);

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
        showError(err, handleWhatToEat);
      }
    } finally {
      setSnackLoading(false);
    }
  };

  const handleShoppingList = async () => {
    setShoppingLoading(true);
    try {
      const data = await api.getShoppingList();
      setShoppingList(data.list);
    } catch (err: unknown) {
      const e = err as { error?: string; status?: number };
      if (e.error === 'premium_required' || e.status === 429) {
        onShowPaywall();
      } else {
        showError(err, handleShoppingList);
      }
    } finally {
      setShoppingLoading(false);
    }
  };

  const handleReplace = async (dayNumber: number, mealType: string, recipeName: string) => {
    const doReplace = async () => {
      try {
        const data = await api.replaceMeal(dayNumber, mealType, recipeName);
        setPlan(data.plan);
      } catch (err: unknown) {
        const e = err as { error?: string; status?: number };
        if (e.error === 'premium_required' || e.status === 403) {
          onShowPaywall();
        } else {
          showError(err, doReplace);
        }
      }
    };
    await doReplace();
  };

  const handleRefreshPlan = async () => {
    try {
      await api.generatePlan(true);
      await loadAll(true);
      setShowWelcomeBack(false);
    } catch (err: unknown) {
      const e = err as { error?: string; status?: number };
      if (e.error === 'premium_required' || e.status === 403) {
        onShowPaywall();
      } else {
        showError(err, handleRefreshPlan);
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
    touchStartY.current = e.touches[0].clientY;
    pullStartY.current = e.touches[0].clientY;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    const el = e.currentTarget as HTMLElement;
    if (el.scrollTop <= 0) {
      const diff = e.touches[0].clientY - pullStartY.current;
      if (diff > 0) setPullDistance(Math.min(diff, 80));
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (pullDistance > 60 && !refreshing) {
      loadAll(true);
    } else {
      setPullDistance(0);
    }

    const diffX = touchStartX.current - e.changedTouches[0].clientX;
    const diffY = Math.abs(touchStartY.current - e.changedTouches[0].clientY);
    if (Math.abs(diffX) > 50 && diffY < 30) {
      if (diffX > 0 && dayIndex < 6) tryGoToDay(dayIndex + 1);
      if (diffX < 0 && dayIndex > 0) tryGoToDay(dayIndex - 1);
    }
  };

  if (loading) return <PlanSkeleton />;

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
    <div
      className="screen-content pull-container"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {pullDistance > 0 && (
        <div className="pull-indicator" style={{ height: pullDistance }}>
          {refreshing ? 'Обновление...' : pullDistance > 60 ? 'Отпусти для обновления' : 'Потяни вниз'}
        </div>
      )}

      {showWelcomeBack && (
        <div className="card welcome-back">
          <p style={{ marginBottom: 12, fontSize: 15 }}>
            С возвращением! Ты не заходил {daysAway} {daysAway === 1 ? 'день' : daysAway < 5 ? 'дня' : 'дней'}.
            Хочешь обновить рацион?
          </p>
          <button className="btn-primary" onClick={handleRefreshPlan}>Обновить</button>
          <button className="btn-secondary" style={{ marginTop: 8 }} onClick={() => setShowWelcomeBack(false)}>
            Позже
          </button>
        </div>
      )}

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

      <button
        className="btn-secondary"
        style={{ marginBottom: 12 }}
        onClick={handleShoppingList}
        disabled={shoppingLoading}
      >
        {shoppingLoading ? '⏳ Составляю список...' : '🛒 Список покупок на неделю'}
      </button>

      <div style={{ marginTop: 8 }}>
        <button className="btn-primary" onClick={() => onNavigate('chat')}>
          Задать вопрос диетологу 💬
        </button>
      </div>

      {shoppingList && (
        <ShoppingListModal list={shoppingList} onClose={() => setShoppingList('')} />
      )}

      {toast && (
        <ErrorToast
          message={toast.message}
          onRetry={toast.retry}
          onClose={() => setToast(null)}
        />
      )}
    </div>
  );
}
