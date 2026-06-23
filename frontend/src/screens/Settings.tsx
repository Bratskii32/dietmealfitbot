import { useState, useEffect, type CSSProperties } from 'react';
import WebApp from '@twa-dev/sdk';
import { api } from '../api/client';
import { OFFER_URL, PRIVACY_URL } from '../constants/legal';
import { ErrorToast } from '../components/ErrorToast';

interface Props {
  onShowPaywall: () => void;
  isPremium: boolean;
  premiumExpiresAt?: string | null;
  subscriptionCancelled?: boolean;
  onSubscriptionChange?: () => void;
  onConfigureRation?: () => void;
  onOpenPlanHistory?: () => void;
}

const listButtonStyle: CSSProperties = {
  width: '100%',
  textAlign: 'left',
  marginBottom: 10,
  cursor: 'pointer',
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
};

export function Settings({
  onShowPaywall,
  isPremium,
  premiumExpiresAt,
  subscriptionCancelled,
  onSubscriptionChange,
  onConfigureRation,
  onOpenPlanHistory,
}: Props) {
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [showSupportHint, setShowSupportHint] = useState(false);
  const [showPromoModal, setShowPromoModal] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [promoCode, setPromoCode] = useState('');
  const [promoLoading, setPromoLoading] = useState(false);
  const [promoError, setPromoError] = useState('');
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    api.getSettings().then((s) => setNotificationsEnabled(s.notificationsEnabled)).catch(() => {});
  }, []);

  const expiresLabel = premiumExpiresAt
    ? new Date(premiumExpiresAt).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' })
    : null;

  const openLink = (url: string) => WebApp.openLink(url);

  /** Mini App уже открыт в @dietmealfitbot — openTelegramLink на того же бота не срабатывает */
  const openSupport = () => {
    setShowSupportHint(true);
  };

  const closeAppForSupport = () => {
    try {
      if (window.Telegram?.WebApp?.close) {
        window.Telegram.WebApp.close();
        return;
      }
      WebApp.close();
    } catch {
      setShowSupportHint(false);
    }
  };

  const openPromoModal = () => {
    setPromoError('');
    setShowPromoModal(true);
  };

  const closePromoModal = () => {
    if (promoLoading) return;
    setShowPromoModal(false);
    setPromoError('');
    setPromoCode('');
  };

  const toggleNotifications = async () => {
    const next = !notificationsEnabled;
    setNotificationsEnabled(next);
    try {
      await api.updateSettings(next);
    } catch {
      setNotificationsEnabled(!next);
    }
  };

  const confirmCancel = async () => {
    setCancelling(true);
    try {
      await api.cancelSubscription();
      setShowCancelDialog(false);
      onSubscriptionChange?.();
    } catch {
      alert('Не удалось отменить подписку');
    } finally {
      setCancelling(false);
    }
  };

  const handleActivatePromo = async () => {
    if (!promoCode.trim()) return;
    setPromoLoading(true);
    setPromoError('');
    try {
      const data = await api.activatePromo(promoCode.trim());
      const untilLabel = new Date(data.premiumUntil).toLocaleDateString('ru-RU', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      });
      setShowPromoModal(false);
      setPromoCode('');
      setPromoError('');
      setToast(`✅ Промокод активирован! Premium до ${untilLabel}`);
      onSubscriptionChange?.();
    } catch (err: unknown) {
      const e = err as { message?: string };
      setPromoError(e.message || 'Не удалось активировать промокод');
    } finally {
      setPromoLoading(false);
    }
  };

  return (
    <div className="screen-content">
      <h2 style={{ fontSize: 22, marginBottom: 20 }}>Настройки ⚙️</h2>

      {isPremium && expiresLabel && (
        <div className="card" style={{ marginBottom: 12, background: 'var(--primary-light)' }}>
          <div style={{ fontWeight: 600 }}>
            ⭐ Premium активен до {expiresLabel}
            {subscriptionCancelled && (
              <div style={{ fontSize: 13, fontWeight: 400, marginTop: 4, color: 'var(--text-secondary)' }}>
                Автопродление отключено
              </div>
            )}
          </div>
        </div>
      )}

      <button className="card" style={listButtonStyle} onClick={onConfigureRation}>
        <span>⚙️ Настроить рацион</span>
        <span style={{ color: 'var(--text-secondary)' }}>→</span>
      </button>

      <button className="card" style={listButtonStyle} onClick={onOpenPlanHistory}>
        <span>📚 История рационов</span>
        <span style={{ color: 'var(--text-secondary)' }}>→</span>
      </button>

      <button className="card" style={listButtonStyle} onClick={onShowPaywall}>
        <span>⭐ {isPremium ? 'Продлить подписку' : 'Управление подпиской'}</span>
        <span style={{ color: 'var(--text-secondary)' }}>→</span>
      </button>

      <button className="card" style={listButtonStyle} onClick={openPromoModal}>
        <span>🎟️ Ввести промокод</span>
        <span style={{ color: 'var(--text-secondary)' }}>→</span>
      </button>

      {isPremium && !subscriptionCancelled && (
        <button
          className="card"
          style={{ ...listButtonStyle, color: 'var(--danger)' }}
          onClick={() => setShowCancelDialog(true)}
        >
          <span>Отменить подписку</span>
          <span style={{ color: 'var(--text-secondary)' }}>→</span>
        </button>
      )}

      <div className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
        <span>🔔 Уведомления</span>
        <button
          onClick={toggleNotifications}
          style={{
            width: 50, height: 28, borderRadius: 14, border: 'none',
            background: notificationsEnabled ? 'var(--primary)' : '#ccc',
            position: 'relative', transition: 'background 0.2s',
          }}
        >
          <span style={{
            position: 'absolute', top: 3,
            left: notificationsEnabled ? 25 : 3,
            width: 22, height: 22, borderRadius: '50%', background: 'white',
            transition: 'left 0.2s',
          }} />
        </button>
      </div>

      <button className="card" style={listButtonStyle} onClick={openSupport}>
        <span>💬 Написать в поддержку</span>
        <span style={{ color: 'var(--text-secondary)' }}>→</span>
      </button>

      <button className="card" style={listButtonStyle} onClick={() => openLink(OFFER_URL)}>
        <span>📄 Публичная оферта</span>
        <span style={{ color: 'var(--text-secondary)' }}>→</span>
      </button>

      <button className="card" style={listButtonStyle} onClick={() => openLink(PRIVACY_URL)}>
        <span>🔒 Политика конфиденциальности</span>
        <span style={{ color: 'var(--text-secondary)' }}>→</span>
      </button>

      {showPromoModal && (
        <div className="modal-overlay" onClick={closePromoModal}>
          <div className="modal-content modal-bottom" onClick={(e) => e.stopPropagation()}>
            <h3 style={{ fontSize: 18, marginBottom: 16 }}>Введи промокод</h3>
            <input
              type="text"
              value={promoCode}
              onChange={(e) => setPromoCode(e.target.value.toUpperCase())}
              placeholder="Например: VOTE7"
              autoFocus
              style={{
                width: '100%',
                padding: '12px 16px',
                border: '2px solid var(--border)',
                borderRadius: 12,
                fontSize: 16,
                marginBottom: 12,
                textTransform: 'uppercase',
              }}
            />
            {promoError && (
              <p className="error-text" style={{ marginBottom: 12 }}>{promoError}</p>
            )}
            <button
              className="btn-primary"
              onClick={handleActivatePromo}
              disabled={promoLoading || !promoCode.trim()}
              style={{ background: '#4CAF50' }}
            >
              {promoLoading ? 'Активация...' : 'Активировать'}
            </button>
            <button
              className="btn-secondary"
              style={{ marginTop: 10 }}
              onClick={closePromoModal}
              disabled={promoLoading}
            >
              Отмена
            </button>
          </div>
        </div>
      )}

      {showSupportHint && (
        <div className="modal-overlay" onClick={() => setShowSupportHint(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3 style={{ fontSize: 18, marginBottom: 12 }}>💬 Поддержка</h3>
            <p style={{ marginBottom: 20, lineHeight: 1.5, color: 'var(--text-secondary)' }}>
              Напиши нам прямо в этот чат бота — просто отправь сообщение ниже.
              Мы получим его и ответим как можно скорее.
            </p>
            <button className="btn-primary" onClick={closeAppForSupport}>
              Закрыть приложение и написать
            </button>
            <button className="btn-secondary" style={{ marginTop: 10 }} onClick={() => setShowSupportHint(false)}>
              Остаться в приложении
            </button>
          </div>
        </div>
      )}

      {showCancelDialog && expiresLabel && (
        <div className="modal-overlay" onClick={() => setShowCancelDialog(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3 style={{ fontSize: 18, marginBottom: 12 }}>Отменить подписку?</h3>
            <p style={{ marginBottom: 20, lineHeight: 1.5, color: 'var(--text-secondary)' }}>
              Ты уверен? Доступ сохранится до {expiresLabel}.
            </p>
            <button className="btn-primary" style={{ background: 'var(--danger)' }} onClick={confirmCancel} disabled={cancelling}>
              {cancelling ? 'Отмена...' : 'Да, отменить'}
            </button>
            <button className="btn-secondary" style={{ marginTop: 10 }} onClick={() => setShowCancelDialog(false)}>
              Нет, оставить
            </button>
          </div>
        </div>
      )}

      {toast && (
        <ErrorToast message={toast} onClose={() => setToast(null)} />
      )}
    </div>
  );
}
