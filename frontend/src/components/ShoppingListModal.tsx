interface Props {
  list: string;
  onClose: () => void;
}

export function ShoppingListModal({ list, onClose }: Props) {
  const copyList = async () => {
    try {
      await navigator.clipboard.writeText(list);
    } catch {
      /* ignore */
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <h2 style={{ fontSize: 20, marginBottom: 16 }}>🛒 Список покупок на неделю</h2>
        <div style={{
          whiteSpace: 'pre-line', fontSize: 14, lineHeight: 1.6,
          maxHeight: '50vh', overflowY: 'auto', marginBottom: 16,
        }}>
          {list}
        </div>
        <button className="btn-primary" onClick={copyList}>Скопировать список</button>
        <button className="btn-secondary" style={{ marginTop: 10 }} onClick={onClose}>Закрыть</button>
      </div>
    </div>
  );
}
