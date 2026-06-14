import { useState } from 'react';
import WebApp from '@twa-dev/sdk';
import { api } from '../api/client';

interface Props {
  onClose: () => void;
  isPremium?: boolean;
  premiumExpiresAt?: string | null;
}

export function Paywall({ onClose, isPremium, premiumExpiresAt }: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const openPayment = async () => {
    setLoading(true);
    setError('');
    try {
      const { paymentUrl } = await api.createPayment();
      WebApp.openLink(paymentUrl);
    } catch {
      setError('Не удалось открыть оплату. Попробуйте позже.');
    } finally {
      setLoading(false);
    }
  };

  const expiresLabel = premiumExpiresAt
    ? new Date(premiumExpiresAt).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' })
    : null;

  if (isPremium && expiresLabel) {
    return (
      <div style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
        display: 'flex', alignItems: 'flex-end', justifyContent: 'center', zIndex: 200,
      }}>
        <div style={{
          background: 'white', borderRadius: '20px 20px 0 0', padding: 24,
          width: '100%', maxWidth: 430,
        }}>
          <div style={{ textAlign: 'center', marginBottom: 20 }}>
            <div style={{ fontSize: 48, marginBottom: 8 }}>⭐</div>
            <h2 style={{ fontSize: 22 }}>Premium активен</h2>
            <p style={{ color: 'var(--text-secondary)', marginTop: 8 }}>
              до {expiresLabel}
            </p>
          </div>
          {error && (
            <p style={{ color: '#e53935', fontSize: 14, textAlign: 'center', marginBottom: 12 }}>{error}</p>
          )}
          <button className="btn-primary" onClick={openPayment} disabled={loading}>
            {loading ? 'Загрузка...' : 'Продлить подписку'}
          </button>
          <button className="btn-secondary" style={{ marginTop: 10 }} onClick={onClose}>Закрыть</button>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
      display: 'flex', alignItems: 'flex-end', justifyContent: 'center', zIndex: 200,
    }}>
      <div style={{
        background: 'white', borderRadius: '20px 20px 0 0', padding: 24,
        width: '100%', maxWidth: 430,
      }}>
        <div style={{ textAlign: 'center', marginBottom: 20 }}>
          <h2 style={{ fontSize: 22, marginBottom: 8 }}>Твой персональный диетолог</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: 15 }}>
            Полный доступ от 299 ₽/мес
          </p>
        </div>

        <div className="card" style={{ marginBottom: 20, fontSize: 15, lineHeight: 1.9 }}>
          <div>✓ Безлимитные AI-советы «Что съесть сейчас»</div>
          <div>✓ Безлимитный чат с диетологом</div>
          <div>✓ Полный рацион на 7 дней</div>
          <div>✓ Замена любого блюда</div>
          <div>✓ Адаптация под тренировки</div>
        </div>

        {error && (
          <p style={{ color: '#e53935', fontSize: 14, textAlign: 'center', marginBottom: 12 }}>{error}</p>
        )}
        <button className="btn-primary" onClick={openPayment} disabled={loading}>
          {loading ? 'Загрузка...' : 'Открыть доступ'}
        </button>
        <p style={{ textAlign: 'center', fontSize: 12, color: 'var(--text-secondary)', marginTop: 12 }}>
          Оплата через ЮKassa · отменить можно в любой момент
        </p>
        <button className="btn-secondary" style={{ marginTop: 10 }} onClick={onClose}>Позже</button>
      </div>
    </div>
  );
}
