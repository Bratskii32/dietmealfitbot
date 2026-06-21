import { Recipe } from '../types';

const MEAL_LABELS: Record<string, string> = {
  breakfast: '🌅 Завтрак',
  lunch: '☀️ Обед',
  dinner: '🌙 Ужин',
  snack: '🍎 Перекус',
};

interface Props {
  type: string;
  recipe: Recipe;
  dayNumber: number;
  isPremium: boolean;
  onRecipeClick: () => void;
  onReplace: () => void;
  onShowPaywall: () => void;
  readOnly?: boolean;
}

export function MealCard({
  type,
  recipe,
  isPremium,
  onRecipeClick,
  onReplace,
  onShowPaywall,
  readOnly = false,
}: Props) {
  const handleReplace = () => {
    if (!isPremium) {
      onShowPaywall();
      return;
    }
    onReplace();
  };

  return (
    <div className="card">
      <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 6 }}>
        {MEAL_LABELS[type] || type}
      </div>
      <div style={{ fontSize: 17, fontWeight: 600, marginBottom: 10 }}>{recipe.name}</div>
      <div style={{ display: 'flex', gap: 12, fontSize: 13, color: 'var(--text-secondary)', marginBottom: 8 }}>
        <span>🔥 {recipe.calories} ккал</span>
        <span>🥩 {recipe.protein}г</span>
        <span>🧈 {recipe.fat}г</span>
        <span>🍞 {recipe.carbs}г</span>
      </div>
      {recipe.replaceReason && (
        <p style={{ fontSize: 13, color: 'var(--primary)', marginBottom: 10 }}>
          💡 {recipe.replaceReason}
        </p>
      )}
      <div style={{ display: 'flex', gap: 16 }}>
        <button
          onClick={onRecipeClick}
          style={{ background: 'none', color: 'var(--primary)', fontSize: 15, fontWeight: 600, padding: 0 }}
        >
          Рецепт →
        </button>
        {!readOnly && (
          <button
            onClick={handleReplace}
            style={{ background: 'none', color: isPremium ? 'var(--primary)' : 'var(--text-secondary)', fontSize: 15, fontWeight: 600, padding: 0 }}
          >
            Заменить 🔄
          </button>
        )}
      </div>
    </div>
  );
}
