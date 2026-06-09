import { Screen } from '../types';

interface Props {
  current: Screen;
  onNavigate: (screen: Screen) => void;
}

const NAV_ITEMS: { id: Screen; label: string; icon: string }[] = [
  { id: 'home', label: 'Меню', icon: '🏠' },
  { id: 'recipes', label: 'Рецепты', icon: '📖' },
  { id: 'chat', label: 'Чат', icon: '💬' },
  { id: 'progress', label: 'Прогресс', icon: '📊' },
];

export function Navigation({ current, onNavigate }: Props) {
  return (
    <nav style={{
      position: 'fixed',
      bottom: 0,
      left: '50%',
      transform: 'translateX(-50%)',
      width: '100%',
      maxWidth: 430,
      background: 'white',
      borderTop: '1px solid var(--border)',
      display: 'flex',
      padding: '8px 0',
      zIndex: 100,
    }}>
      {NAV_ITEMS.map((item) => (
        <button
          key={item.id}
          onClick={() => onNavigate(item.id)}
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 2,
            background: 'none',
            padding: '6px 0',
            color: current === item.id ? 'var(--primary)' : 'var(--text-secondary)',
          }}
        >
          <span style={{ fontSize: 20 }}>{item.icon}</span>
          <span style={{ fontSize: 11, fontWeight: current === item.id ? 600 : 400 }}>{item.label}</span>
        </button>
      ))}
    </nav>
  );
}
