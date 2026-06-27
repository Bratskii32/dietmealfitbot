import { useState, useEffect, useRef, useCallback } from 'react';
import { CalorieChart } from '../components/CalorieChart';
import { MealCard } from '../components/MealCard';
import { PlanSkeleton } from '../components/PlanSkeleton';
import { ErrorToast } from '../components/ErrorToast';
import { ShoppingListModal } from '../components/ShoppingListModal';
import { ReplaceChoiceSheet } from '../components/ReplaceChoiceSheet';
import { api } from '../api/client';
import { parseApiError } from '../utils/errors';
import { getMoscowDate } from '../utils/date';
import { WeekPlan, Recipe, Screen } from '../types';

interface Props {
  userName: string;
  isPremium: boolean;
  daysAway?: number;
  preferencesPrompted?: boolean;
  planVersion?: number;
  dayIndex: number;
  dailyStatus: string;
  statusLoading: boolean;
  onDayIndexChange: (index: number) => void;
  onNavigate: (screen: Screen) => void;
  onRecipeSelect: (recipe: Recipe) => void;
  onShowPaywall: () => void;
  onOpenPreferences: () => void;
}

const DAY_NAMES = ['Воскресенье', 'Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница', 'Суббота'];

function DayTopBar({ onBack }: { onBack: () => void }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', marginBottom: 16 }}>
      <button
        type="button"
        onClick={onBack}
        style={{
          background: 'none',
          border: 'none',
          fontSize: 16,
          color: 'var(--primary)',
          cursor: 'pointer',
          padding: '8px 0',
          fontWeight: 600,
        }}
      >
        ← Назад
      </button>
    </div>
  );
}

export function Home({
  userName,
  isPremium: isPremiumProp,
  daysAway = 0,
  preferencesPrompted = true,
  planVersion = 0,
  dayIndex,
  dailyStatus,
  statusLoading,
  onDayIndexChange,
  onNavigate,
  onRecipeSelect,
  onShowPaywall,
  onOpenPreferences,
}: Props) {
  const [plan, setPlan] = useState<WeekPlan | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isPremium, setIsPremium] = useState(isPremiumProp);
  const [totalDays, setTotalDays] = useState(3);
  const [extendLoading, setExtendLoading] = useState(false);
  const [regenerateLoading, setRegenerateLoading] = useState(false);
  const [snackRemaining, setSnackRemaining] = useState(3);
  const [snackSuggestion, setSnackSuggestion] = useState('');
  const [snackWarning, setSnackWarning] = useState('');
  const [snackLoading, setSnackLoading] = useState(false);
  const [shoppingLoading, setShoppingLoading] = useState(false);
  const [shoppingRefreshing, setShoppingRefreshing] = useState(false);
  const [shoppingList, setShoppingList] = useState('');
  const [showWelcomeBack, setShowWelcomeBack] = useState(daysAway >= 3);
  const [toast, setToast] = useState<{ message: string; retry?: () => void } | null>(null);
  const [replaceTarget, setReplaceTarget] = useState<{
    dayNumber: number;
    mealType: string;
    recipeName: string;
  } | null>(null);
  const [replaceLoading, setReplaceLoading] = useState(false);
  const touchStartX = useRef(0);
  const touchStartY = useRef(0);
  const pullStartY = useRef(0);
  const [pullDistance, setPullDistance] = useState(0);

  useEffect(() => {
    loadAll();
  }, [planVersion]);

  useEffect(() => {
    if (plan && !preferencesPrompted) {
      onOpenPreferences();
    }
  }, [plan, preferencesPrompted, onOpenPreferences]);

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
      const [planData, snackStatus] = await Promise.all([
        api.getPlan(),
        api.getWhatToEatStatus(),
      ]);
      setPlan(planData.plan);
      setIsPremium(planData.isPremium);
      setTotalDays(planData.totalDays ?? planData.plan?.days?.length ?? 3);
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

  const handleShoppingList = async (refresh = false) => {
    if (refresh) setShoppingRefreshing(true);
    else setShoppingLoading(true);
    try {
      const data = await api.getShoppingList(refresh);
      setShoppingList(data.list);
    } catch (err: unknown) {
      const e = err as { error?: string; status?: number };
      if (e.error === 'premium_required' || e.status === 429) {
        onShowPaywall();
      } else {
        showError(err, () => handleShoppingList(refresh));
      }
    } finally {
      setShoppingLoading(false);
      setShoppingRefreshing(false);
    }
  };

  const handleReplaceClick = (dayNumber: number, mealType: string, recipeName: string) => {
    setReplaceTarget({ dayNumber, mealType, recipeName });
  };

  const handleReplaceMode = async (mode: 'similar' | 'different') => {
    if (!replaceTarget) return;
    setReplaceLoading(true);
    const doReplace = async () => {
      try {
        const data = await api.replaceMeal(
          replaceTarget.dayNumber,
          replaceTarget.mealType,
          replaceTarget.recipeName,
          mode
        );
        setPlan(data.plan);
        setReplaceTarget(null);
      } catch (err: unknown) {
        const e = err as { error?: string; status?: number };
        if (e.error === 'premium_required' || e.status === 403) {
          setReplaceTarget(null);
          onShowPaywall();
        } else {
          showError(err, () => handleReplaceMode(mode));
        }
      } finally {
        setReplaceLoading(false);
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

  const handleExtendPlan = async () => {
    setExtendLoading(true);
    try {
      const data = await api.extendPlan();
      setPlan(data.plan);
      setTotalDays(data.totalDays);
      onDayIndexChange(totalDays);
    } catch (err: unknown) {
      showError(err, handleExtendPlan);
    } finally {
      setExtendLoading(false);
    }
  };

  const handleRegeneratePlan = async () => {
    setRegenerateLoading(true);
    try {
      const data = await api.regenerateNewPlan();
      setPlan(data.plan);
      setTotalDays(data.totalDays);
      onDayIndexChange(0);
    } catch (err: unknown) {
      showError(err, handleRegeneratePlan);
    } finally {
      setRegenerateLoading(false);
    }
  };

  const tryGoToDay = (index: number) => {
    if (index < 0 || index > 6) return;
    onDayIndexChange(index);
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

  const displayDayNumber = dayIndex + 1;
  const showFreePaywall = !isPremium && dayIndex >= 3;
  const showPremiumExtend = isPremium && totalDays < 7 && dayIndex >= totalDays;
  const showPlanComplete = isPremium && totalDays >= 7 && dayIndex === 6;

  const renderDayDots = () => (
    <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginBottom: 16 }}>
      {Array.from({ length: 7 }, (_, i) => {
        const locked = !isPremium && i >= 3;
        const beyondPlan = isPremium && i >= totalDays && totalDays < 7;
        return (
          <div
            key={i}
            onClick={() => tryGoToDay(i)}
            style={{
              width: 8,
              height: 8,
              borderRadius: '50%',
              background: i === dayIndex ? 'var(--primary)' : locked || beyondPlan ? '#E0E0E0' : 'var(--border)',
              cursor: 'pointer',
              opacity: locked || beyondPlan ? 0.5 : 1,
            }}
          />
        );
      })}
    </div>
  );

  if (showFreePaywall) {
    return (
      <div
        className="screen-content pull-container"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <DayTopBar onBack={() => tryGoToDay(dayIndex - 1)} />
        {renderDayDots()}
        <div className="card" style={{ textAlign: 'center', padding: '32px 24px' }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>⭐</div>
          <h2 style={{ fontSize: 20, marginBottom: 8 }}>День {displayDayNumber} доступен в Premium</h2>
          <p style={{ fontSize: 14, color: 'var(--text-secondary)', marginBottom: 24, lineHeight: 1.5 }}>
            Открой полный рацион на 7 дней с персональными рецептами и списком покупок
          </p>
          <button className="btn-primary" onClick={onShowPaywall}>
            Открыть доступ
          </button>
        </div>
        {toast && (
          <ErrorToast message={toast.message} onRetry={toast.retry} onClose={() => setToast(null)} />
        )}
      </div>
    );
  }

  if (showPremiumExtend) {
    const fromDay = totalDays + 1;
    return (
      <div
        className="screen-content pull-container"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <DayTopBar onBack={() => tryGoToDay(Math.min(dayIndex - 1, totalDays - 1))} />
        {renderDayDots()}
        <div className="card" style={{ textAlign: 'center', padding: '32px 24px' }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>🚀</div>
          <h2 style={{ fontSize: 20, marginBottom: 8 }}>Продолжи свой рацион 🚀</h2>
          <p style={{ fontSize: 14, color: 'var(--text-secondary)', marginBottom: 24, lineHeight: 1.5 }}>
            У тебя {totalDays} {totalDays === 1 ? 'день' : totalDays < 5 ? 'дня' : 'дней'} из 7.
            Добавим оставшиеся с учётом уже выбранных продуктов?
          </p>
          <button className="btn-primary" onClick={handleExtendPlan} disabled={extendLoading}>
            {extendLoading ? '⏳ Генерирую...' : `Добавить дни ${fromDay}-7`}
          </button>
        </div>
        {toast && (
          <ErrorToast message={toast.message} onRetry={toast.retry} onClose={() => setToast(null)} />
        )}
      </div>
    );
  }

  const day = plan.days[dayIndex];
  if (!day) {
    return <p className="error-text">Рацион не найден</p>;
  }

  const today = getMoscowDate();
  const displayDate = new Date(today);
  displayDate.setDate(today.getDate() + dayIndex);
  const dayName = DAY_NAMES[displayDate.getDay()];
  const dateStr = displayDate.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' });

  const consumed = day.meals.reduce((sum, m) => sum + (Number(m.recipe.calories) || 0), 0);
  const consumedProtein = day.meals.reduce((sum, m) => sum + (Number(m.recipe.protein) || 0), 0);
  const consumedCarbs = day.meals.reduce((sum, m) => sum + (Number(m.recipe.carbs) || 0), 0);
  const consumedFat = day.meals.reduce((sum, m) => sum + (Number(m.recipe.fat) || 0), 0);

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

      {dayIndex > 0 && (
        <DayTopBar onBack={() => tryGoToDay(dayIndex - 1)} />
      )}

      {statusLoading ? (
        <div className="skeleton skeleton-text" style={{ width: '85%', height: 16, marginBottom: 12 }} />
      ) : dailyStatus ? (
        <p style={{ fontSize: 14, color: 'var(--text-secondary)', marginBottom: 12 }}>{dailyStatus}</p>
      ) : null}

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

      {renderDayDots()}

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
          onReplace={() => handleReplaceClick(day.dayNumber, meal.type, meal.recipe.name)}
          onShowPaywall={onShowPaywall}
        />
      ))}

      {showPlanComplete && (
        <div className="card" style={{ textAlign: 'center', marginBottom: 16, padding: '24px 16px' }}>
          <h3 style={{ fontSize: 18, marginBottom: 8 }}>Рацион завершён 🎉</h3>
          <p style={{ fontSize: 14, color: 'var(--text-secondary)', marginBottom: 16 }}>
            Ты прошёл всю неделю! Готов к новому рациону?
          </p>
          <button className="btn-primary" onClick={handleRegeneratePlan} disabled={regenerateLoading}>
            {regenerateLoading ? '⏳ Генерирую...' : 'Сгенерировать новый рацион на неделю 🔄'}
          </button>
        </div>
      )}

      <button
        className="btn-secondary"
        style={{ marginBottom: 12 }}
        onClick={() => handleShoppingList(false)}
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
        <ShoppingListModal
          list={shoppingList}
          loading={shoppingRefreshing}
          onRefresh={() => handleShoppingList(true)}
          onClose={() => setShoppingList('')}
        />
      )}

      {replaceTarget && (
        <ReplaceChoiceSheet
          recipeName={replaceTarget.recipeName}
          loading={replaceLoading}
          onChoose={handleReplaceMode}
          onClose={() => !replaceLoading && setReplaceTarget(null)}
        />
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
