import { useState, useEffect } from 'react';
import { api } from '../api/client';
import { RecipeListItem, Recipe } from '../types';

interface Props {
  onRecipeSelect: (recipe: Recipe) => void;
}

const FILTERS = [
  { id: 'all', label: 'Все' },
  { id: 'breakfast', label: 'Завтрак' },
  { id: 'lunch', label: 'Обед' },
  { id: 'dinner', label: 'Ужин' },
  { id: 'snack', label: 'Перекус' },
];

export function Recipes({ onRecipeSelect }: Props) {
  const [recipes, setRecipes] = useState<RecipeListItem[]>([]);
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadRecipes();
  }, []);

  const loadRecipes = async () => {
    try {
      const { recipes: r } = await api.getRecipes();
      setRecipes(r);
    } catch { /* ignore */ }
    finally {
      setLoading(false);
    }
  };

  const filtered = recipes.filter((r) => {
    const matchFilter = filter === 'all' || r.type === filter;
    const matchSearch = !search || r.name.toLowerCase().includes(search.toLowerCase());
    return matchFilter && matchSearch;
  });

  if (loading) {
    return (
      <div className="spinner-container">
        <div className="spinner" />
      </div>
    );
  }

  return (
    <div className="screen-content">
      <h2 style={{ fontSize: 22, marginBottom: 16 }}>Рецепты 📖</h2>

      <input
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Поиск по названию..."
        style={{
          width: '100%',
          padding: '12px 16px',
          border: '2px solid var(--border)',
          borderRadius: 12,
          fontSize: 15,
          marginBottom: 12,
        }}
      />

      <div style={{ display: 'flex', gap: 8, overflowX: 'auto', marginBottom: 16, paddingBottom: 4 }}>
        {FILTERS.map((f) => (
          <button
            key={f.id}
            className={`chip ${filter === f.id ? 'selected' : ''}`}
            onClick={() => setFilter(f.id)}
          >
            {f.label}
          </button>
        ))}
      </div>

      {filtered.length === 0 && (
        <p style={{ textAlign: 'center', color: 'var(--text-secondary)', marginTop: 40 }}>
          Рецепты не найдены
        </p>
      )}

      {filtered.map((r, i) => (
        <div
          key={i}
          className="card"
          onClick={() => onRecipeSelect(r.recipe)}
          style={{ cursor: 'pointer' }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
            <div>
              <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 4 }}>
                {r.typeLabel} · День {r.dayNumber}
              </div>
              <div style={{ fontSize: 17, fontWeight: 600, marginBottom: 8 }}>{r.name}</div>
              <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                ⏱ {r.cookingTime} мин · 🔥 {r.calories} ккал
              </div>
            </div>
            <span style={{ color: 'var(--primary)', fontSize: 20 }}>→</span>
          </div>
        </div>
      ))}
    </div>
  );
}
