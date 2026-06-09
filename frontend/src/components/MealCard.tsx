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
  onRecipeClick: () => void;
}

export function MealCard({ type, recipe, onRecipeClick }: Props) {
  return (
    <div className="card">
      <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 6 }}>
        {MEAL_LABELS[type] || type}
      </div>
      <div style={{ fontSize: 17, fontWeight: 600, marginBottom: 10 }}>{recipe.name}</div>
      <div style={{ display: 'flex', gap: 12, fontSize: 13, color: 'var(--text-secondary)', marginBottom: 12 }}>
        <span>🔥 {recipe.calories} ккал</span>
        <span>🥩 {recipe.protein}г</span>
        <span>🧈 {recipe.fat}г</span>
        <span>🍞 {recipe.carbs}г</span>
      </div>
      <button
        onClick={onRecipeClick}
        style={{
          background: 'none',
          color: 'var(--primary)',
          fontSize: 15,
          fontWeight: 600,
          padding: 0,
        }}
      >
        Рецепт →
      </button>
    </div>
  );
}
