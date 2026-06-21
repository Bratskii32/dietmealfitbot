interface Props {
  recipeName: string;
  loading: boolean;
  onChoose: (mode: 'similar' | 'different') => void;
  onClose: () => void;
}

export function ReplaceChoiceSheet({ recipeName, loading, onChoose, onClose }: Props) {
  return (
    <div className="modal-overlay" onClick={loading ? undefined : onClose}>
      <div className="modal-content modal-bottom" onClick={(e) => e.stopPropagation()}>
        <h2 style={{ fontSize: 18, marginBottom: 6 }}>Заменить блюдо</h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: 14, marginBottom: 16 }}>
          {recipeName}
        </p>

        <button
          type="button"
          className="card"
          style={{ width: '100%', textAlign: 'left', marginBottom: 10, cursor: loading ? 'wait' : 'pointer' }}
          disabled={loading}
          onClick={() => onChoose('similar')}
        >
          <div style={{ fontWeight: 600, fontSize: 15, marginBottom: 4 }}>🔄 Похожий вариант</div>
          <div style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.4 }}>
            Вариация текущего блюда — сохраняет основу, меняет детали под цель
          </div>
        </button>

        <button
          type="button"
          className="card"
          style={{ width: '100%', textAlign: 'left', marginBottom: 16, cursor: loading ? 'wait' : 'pointer' }}
          disabled={loading}
          onClick={() => onChoose('different')}
        >
          <div style={{ fontWeight: 600, fontSize: 15, marginBottom: 4 }}>🎲 Другое блюдо</div>
          <div style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.4 }}>
            Полностью другое блюдо того же приёма пищи — другой состав и способ готовки
          </div>
        </button>

        {loading && (
          <p style={{ textAlign: 'center', color: 'var(--text-secondary)', fontSize: 14, marginBottom: 12 }}>
            Подбираю замену...
          </p>
        )}

        <button className="btn-secondary" onClick={onClose} disabled={loading}>
          Отмена
        </button>
      </div>
    </div>
  );
}
