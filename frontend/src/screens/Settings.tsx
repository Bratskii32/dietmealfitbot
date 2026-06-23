import { useState, useEffect } from 'react';
import WebApp from '@twa-dev/sdk';
import { api } from '../api/client';
import { OFFER_URL, PRIVACY_URL } from '../constants/legal';

interface Props {
  onShowPaywall: () => void;
  isPremium: boolean;
  premiumExpiresAt?: string | null;
  subscriptionCancelled?: boolean;
  onSubscriptionChange?: () => void;
  onConfigureRation?: () => void;
  onOpenPlanHistory?: () => void;
}

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
  const [cancelling, setCancelling] = useState(false);
  const [promoCode, setPromoCode] = useState('');
  const [promoLoading, setPromoLoading] = useState(false);
  const [promoMessage, setPromoMessage] = useState('');
  const [promoError, setPromoError] = useState('');

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
    setPromoMessage('');
    try {
      const data = await api.activatePromo(promoCode.trim());
      setPromoMessage(data.message);
      setPromoCode('');
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

      <button
        className="card"
        style={{ width: '100%', textAlign: 'left', marginBottom: 10, cursor: 'pointer' }}
        onClick={onConfigureRation}
      >
        ⚙️ Настроить рацион
      </button>

      <button
        className="card"
        style={{ width: '100%', textAlign: 'left', marginBottom: 10, cursor: 'pointer' }}
        onClick={onOpenPlanHistory}
      >
        📚 История рационов
      </button>

      <button className="card" style={{ width: '100%', textAlign: 'left', marginBottom: 10, cursor: 'pointer' }} onClick={onShowPaywall}>
        ⭐ {isPremium ? 'Продлить подписку' : 'Управление подпиской'}
      </button>

      {!isPremium && (
        <div className="card" style={{ marginBottom: 10 }}>
          <div style={{ fontWeight: 600, marginBottom: 10, fontSize: 15 }}>🎁 Промокод</div>
          <input
            type="text"
            value={promoCode}
            onChange={(e) => setPromoCode(e.target.value.toUpperCase())}
            placeholder="Введи промокод"
            style={{ width: '100%', marginBottom: 10, textTransform: 'uppercase' }}
          />
          {promoError && <p className="error-text" style={{ marginBottom: 8 }}>{promoError}</p>}
          {promoMessage && (
            <p style={{ color: 'var(--primary)', fontSize: 14, marginBottom: 8 }}>{promoMessage}</p>
          )}
          <button
            className="btn-primary"
            onClick={handleActivatePromo}
            disabled={promoLoading || !promoCode.trim()}
          >
            {promoLoading ? 'Активация...' : 'Активировать'}
          </button>
        </div>
      )}

      {isPremium && !subscriptionCancelled && (
        <button
          className="card"
          style={{ width: '100%', textAlign: 'left', marginBottom: 10, cursor: 'pointer', color: 'var(--danger)' }}
          onClick={() => setShowCancelDialog(true)}
        >
          Отменить подписку
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

      <button
        className="card"
        style={{ width: '100%', textAlign: 'left', marginBottom: 10, cursor: 'pointer' }}
        onClick={openSupport}
      >
        💬 Написать в поддержку
      </button>

      <button
        className="card"
        style={{ width: '100%', textAlign: 'left', marginBottom: 10, cursor: 'pointer' }}
        onClick={() => openLink(OFFER_URL)}
      >
        📄 Публичная оферта
      </button>

      <button
        className="card"
        style={{ width: '100%', textAlign: 'left', marginBottom: 10, cursor: 'pointer' }}
        onClick={() => openLink(PRIVACY_URL)}
      >
        🔒 Политика конфиденциальности
      </button>

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
    </div>
  );
}
