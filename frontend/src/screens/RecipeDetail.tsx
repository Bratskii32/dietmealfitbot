import { useState } from 'react';
import { Recipe } from '../types';
import { api } from '../api/client';

interface Props {
  recipe: Recipe;
  onBack: () => void;
}

export function RecipeDetail({ recipe, onBack }: Props) {
  const [cooked, setCooked] = useState(false);

  const handleCooked = async () => {
    try {
      await api.markCooked(recipe.name);
      setCooked(true);
    } catch { /* ignore */ }
  };

  return (
    <div className="screen-content">
      <button
        onClick={onBack}
        style={{ background: 'none', color: 'var(--primary)', fontSize: 15, marginBottom: 16, padding: 0 }}
      >
        ← Назад
      </button>

      <h1 style={{ fontSize: 24, marginBottom: 8 }}>{recipe.name}</h1>
      <p style={{ color: 'var(--text-secondary)', marginBottom: 16, fontSize: 15 }}>{recipe.description}</p>

      <div className="card" style={{ display: 'flex', justifyContent: 'space-around', textAlign: 'center' }}>
        <MacroStat label="Ккал" value={recipe.calories} />
        <MacroStat label="Белки" value={`${recipe.protein}г`} />
        <MacroStat label="Жиры" value={`${recipe.fat}г`} />
        <MacroStat label="Углев." value={`${recipe.carbs}г`} />
      </div>

      <div style={{ fontSize: 14, color: 'var(--text-secondary)', marginBottom: 20 }}>
        ⏱ Время приготовления: {recipe.cookingTime} мин · {recipe.servings} порц.
      </div>

      <h3 style={{ fontSize: 18, marginBottom: 12 }}>Ингредиенты</h3>
      <div className="card" style={{ marginBottom: 20 }}>
        {recipe.ingredients.map((ing, i) => (
          <div key={i} style={{
            display: 'flex', justifyContent: 'space-between', padding: '8px 0',
            borderBottom: i < recipe.ingredients.length - 1 ? '1px solid var(--border)' : 'none',
          }}>
            <span>{ing.name}</span>
            <span style={{ fontWeight: 600 }}>{ing.amount} {ing.unit}</span>
          </div>
        ))}
      </div>

      <h3 style={{ fontSize: 18, marginBottom: 12 }}>Приготовление</h3>
      <div className="card" style={{ marginBottom: 24 }}>
        {recipe.instructions.map((step, i) => (
          <div key={i} style={{ display: 'flex', gap: 12, padding: '10px 0' }}>
            <span style={{
              width: 28, height: 28, borderRadius: '50%', background: 'var(--primary)',
              color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 14, fontWeight: 600, flexShrink: 0,
            }}>
              {i + 1}
            </span>
            <span style={{ fontSize: 15, lineHeight: 1.5, paddingTop: 4 }}>{step}</span>
          </div>
        ))}
      </div>

      <button
        className="btn-primary"
        onClick={handleCooked}
        disabled={cooked}
        style={{ background: cooked ? '#BDBDBD' : undefined }}
      >
        {cooked ? '✅ Отмечено!' : '✅ Приготовил'}
      </button>
    </div>
  );
}

function MacroStat({ label, value }: { label: string; value: string | number }) {
  return (
    <div>
      <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--primary)' }}>{value}</div>
      <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{label}</div>
    </div>
  );
}
