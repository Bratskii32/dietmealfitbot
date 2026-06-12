import WebApp from '@twa-dev/sdk';

interface Props {
  onShowPaywall: () => void;
  isPremium: boolean;
  premiumExpiresAt?: string | null;
}

const PRIVACY = `📄 Политика конфиденциальности @dietmealfitbot

1. Какие данные собираем: имя, возраст, пол, рост, вес, цели, аллергии, история чата.
2. Зачем: для персонального рациона внутри приложения.
3. Где хранятся: на защищённом сервере.
4. Как удалить: команда /delete в боте.`;

export function Settings({ onShowPaywall, isPremium, premiumExpiresAt }: Props) {
  const expiresLabel = premiumExpiresAt
    ? new Date(premiumExpiresAt).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' })
    : null;

  const openLink = (url: string) => WebApp.openLink(url);

  return (
    <div className="screen-content">
      <h2 style={{ fontSize: 22, marginBottom: 20 }}>Настройки ⚙️</h2>

      {isPremium && expiresLabel && (
        <div className="card" style={{ marginBottom: 12, background: 'var(--primary-light)' }}>
          <div style={{ fontWeight: 600 }}>⭐ Premium активен до {expiresLabel}</div>
        </div>
      )}

      <button className="card" style={{ width: '100%', textAlign: 'left', marginBottom: 10, cursor: 'pointer' }} onClick={onShowPaywall}>
        ⭐ {isPremium ? 'Продлить подписку' : 'Управление подпиской'}
      </button>

      <button
        className="card"
        style={{ width: '100%', textAlign: 'left', marginBottom: 10, cursor: 'pointer' }}
        onClick={() => openLink('https://t.me/dietmealfitbot')}
      >
        💬 Написать в поддержку
      </button>

      <button
        className="card"
        style={{ width: '100%', textAlign: 'left', marginBottom: 10, cursor: 'pointer', opacity: 0.6 }}
        onClick={() => alert('Канал скоро будет доступен')}
      >
        📢 Наш канал
      </button>

      <div className="card" style={{ marginTop: 16 }}>
        <div style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6, whiteSpace: 'pre-line' }}>
          {PRIVACY}
        </div>
      </div>
    </div>
  );
}
