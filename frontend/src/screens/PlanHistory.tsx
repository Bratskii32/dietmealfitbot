import { useState, useEffect, useCallback } from 'react';
import { api } from '../api/client';
import { MealCard } from '../components/MealCard';
import { Recipe, WeekPlan, RecipeHistoryContext } from '../types';

interface HistoryItem {
  id: number;
  createdAt: string;
}

interface Props {
  onClose: () => void;
  onRecipeSelect: (recipe: Recipe, history: RecipeHistoryContext) => void;
  restorePlanId?: number | null;
  restoreDayIndex?: number;
  onRestoreClear?: () => void;
}

const DAY_LABELS = ['День 1', 'День 2', 'День 3', 'День 4', 'День 5', 'День 6', 'День 7'];

function formatPlanDate(iso: string): string {
  return new Date(iso).toLocaleDateString('ru-RU', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

export function PlanHistory({
  onClose,
  onRecipeSelect,
  restorePlanId = null,
  restoreDayIndex = 0,
  onRestoreClear,
}: Props) {
  const [items, setItems] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [plan, setPlan] = useState<WeekPlan | null>(null);
  const [planDate, setPlanDate] = useState('');
  const [dayIndex, setDayIndex] = useState(0);
  const [planLoading, setPlanLoading] = useState(false);

  useEffect(() => {
    api.getPlanHistory()
      .then(({ plans }) => setItems(plans))
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, []);

  const openPlan = useCallback(async (id: number, initialDayIndex = 0) => {
    setSelectedId(id);
    setPlanLoading(true);
    setDayIndex(initialDayIndex);
    try {
      const data = await api.getArchivedPlan(id);
      setPlan(data.plan);
      setPlanDate(formatPlanDate(data.createdAt));
      setDayIndex(initialDayIndex);
    } catch {
      setPlan(null);
    } finally {
      setPlanLoading(false);
    }
  }, []);

  useEffect(() => {
    if (restorePlanId != null) {
      openPlan(restorePlanId, restoreDayIndex);
    }
  }, [restorePlanId, restoreDayIndex, openPlan]);

  const backToList = () => {
    setSelectedId(null);
    setPlan(null);
    onRestoreClear?.();
  };

  if (selectedId !== null) {
    const day = plan?.days[dayIndex];

    return (
      <div className="app-container" style={{ paddingBottom: 24 }}>
        <button
          type="button"
          onClick={backToList}
          style={{ background: 'none', color: 'var(--primary)', fontSize: 15, marginBottom: 16, padding: 0 }}
        >
          ← Назад к списку
        </button>

        {planLoading ? (
          <div className="spinner-container"><div className="spinner" /></div>
        ) : !plan || !day ? (
          <p className="error-text">Не удалось загрузить рацион</p>
        ) : (
          <>
            <h2 style={{ fontSize: 20, marginBottom: 4 }}>Рацион от {planDate}</h2>
            <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 16 }}>
              Только просмотр — архивный рацион
            </p>

            <div style={{ display: 'flex', gap: 6, marginBottom: 16, overflowX: 'auto' }}>
              {plan.days.map((_, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setDayIndex(i)}
                  style={{
                    flexShrink: 0,
                    padding: '8px 12px',
                    borderRadius: 20,
                    border: 'none',
                    fontSize: 13,
                    fontWeight: i === dayIndex ? 600 : 400,
                    background: i === dayIndex ? 'var(--primary)' : 'var(--border)',
                    color: i === dayIndex ? 'white' : 'var(--text-secondary)',
                  }}
                >
                  {DAY_LABELS[i] || `День ${i + 1}`}
                </button>
              ))}
            </div>

            {day.meals.map((meal) => (
              <MealCard
                key={meal.type}
                type={meal.type}
                recipe={meal.recipe}
                dayNumber={day.dayNumber}
                isPremium
                readOnly
                onRecipeClick={() =>
                  onRecipeSelect(meal.recipe, {
                    planId: selectedId,
                    dayNumber: day.dayNumber,
                    dayIndex,
                  })
                }
                onReplace={() => {}}
                onShowPaywall={() => {}}
              />
            ))}
          </>
        )}
      </div>
    );
  }

  return (
    <div className="app-container" style={{ paddingBottom: 24 }}>
      <button
        type="button"
        onClick={onClose}
        style={{ background: 'none', color: 'var(--primary)', fontSize: 15, marginBottom: 16, padding: 0 }}
      >
        ← Назад
      </button>

      <h2 style={{ fontSize: 22, marginBottom: 16 }}>📚 История рационов</h2>

      {loading ? (
        <div className="spinner-container"><div className="spinner" /></div>
      ) : items.length === 0 ? (
        <div className="card">
          <p style={{ color: 'var(--text-secondary)', lineHeight: 1.5 }}>
            Пока нет сохранённых рационов. При обновлении меню предыдущие версии будут появляться здесь.
          </p>
        </div>
      ) : (
        items.map((item) => (
          <button
            key={item.id}
            type="button"
            className="card"
            style={{ width: '100%', textAlign: 'left', marginBottom: 10, cursor: 'pointer' }}
            onClick={() => openPlan(item.id, 0)}
          >
            <div style={{ fontWeight: 600, fontSize: 16 }}>{formatPlanDate(item.createdAt)}</div>
            <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 4 }}>
              Нажми, чтобы посмотреть →
            </div>
          </button>
        ))
      )}
    </div>
  );
}
