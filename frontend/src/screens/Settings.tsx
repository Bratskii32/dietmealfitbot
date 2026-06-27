import { useState, useEffect, type CSSProperties } from 'react';
import { api } from '../api/client';
import { OFFER_URL, PRIVACY_URL } from '../constants/legal';
import { ErrorToast } from '../components/ErrorToast';
import { openExternalLink, closeMiniApp, isTelegramWebApp, clearStoredToken } from '../utils/telegram';

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
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [promoCode, setPromoCode] = useState('');
  const [promoLoading, setPromoLoading] = useState(false);
  const [promoError, setPromoError] = useState('');
  const [toast, setToast] = useState<string | null>(null);
  const [savedEmail, setSavedEmail] = useState<string | null>(null);
  const [emailInput, setEmailInput] = useState('');
  const [emailLoading, setEmailLoading] = useState(false);
  const [emailError, setEmailError] = useState('');
  const [showLogoutDialog, setShowLogoutDialog] = useState(false);

  const isWeb = !isTelegramWebApp();

  useEffect(() => {
    api.getSettings().then((s) => {
      setNotificationsEnabled(s.notificationsEnabled);
      setSavedEmail(s.email || null);
    }).catch(() => {});
  }, []);

  const expiresLabel = premiumExpiresAt
    ? new Date(premiumExpiresAt).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' })
    : null;

  const openLink = (url: string) => openExternalLink(url);

  /** Mini App уже открыт в @dietmealfitbot — openTelegramLink на того же бота не срабатывает */
  const openSupport = () => {
    setShowSupportHint(true);
  };

  const closeAppForSupport = () => {
    try {
      closeMiniApp();
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

  const openEmailModal = () => {
    setEmailError('');
    setEmailInput('');
    setShowEmailModal(true);
  };

  const closeEmailModal = () => {
    if (emailLoading) return;
    setShowEmailModal(false);
    setEmailError('');
    setEmailInput('');
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

  const handleSaveEmail = async () => {
    if (!emailInput.trim()) return;
    setEmailLoading(true);
    setEmailError('');
    try {
      const data = await api.saveEmail(emailInput.trim());
      setSavedEmail(data.email);
      setShowEmailModal(false);
      setEmailInput('');
    } catch (err: unknown) {
      const e = err as { message?: string };
      setEmailError(e.message || 'Не удалось сохранить email');
    } finally {
      setEmailLoading(false);
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

  const confirmLogout = () => {
    clearStoredToken();
    window.location.href = '/login';
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

      <button className="card" style={listButtonStyle} onClick={onShowPaywall}>
        <span>⭐ {isPremium ? 'Продлить подписку' : 'Управление подпиской'}</span>
        <span style={{ color: 'var(--text-secondary)' }}>→</span>
      </button>

      {savedEmail ? (
        <div
          className="card"
          style={{ marginBottom: 10, color: 'var(--text-secondary)', fontSize: 15 }}
        >
          📧 {savedEmail}
        </div>
      ) : (
        <button className="card" style={listButtonStyle} onClick={openEmailModal}>
          <span>📧 Добавить email</span>
          <span style={{ color: 'var(--text-secondary)' }}>→</span>
        </button>
      )}

      <button className="card" style={listButtonStyle} onClick={onConfigureRation}>
        <span>⚙️ Настроить рацион</span>
        <span style={{ color: 'var(--text-secondary)' }}>→</span>
      </button>

      <button className="card" style={listButtonStyle} onClick={onOpenPlanHistory}>
        <span>📚 История рационов</span>
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

      {isWeb && (
        <button
          className="card"
          style={{ ...listButtonStyle, color: '#e53935', marginBottom: 0 }}
          onClick={() => setShowLogoutDialog(true)}
        >
          <span>Выйти из аккаунта</span>
          <span style={{ color: 'var(--text-secondary)' }}>→</span>
        </button>
      )}

      {showEmailModal && (
        <div className="modal-overlay" onClick={closeEmailModal}>
          <div className="modal-content modal-bottom" onClick={(e) => e.stopPropagation()}>
            <h3 style={{ fontSize: 18, marginBottom: 8 }}>Email для связи</h3>
            <p style={{ fontSize: 14, color: 'var(--text-secondary)', marginBottom: 16, lineHeight: 1.5 }}>
              Оставь email — напишем даже если Telegram будет недоступен
            </p>
            <input
              type="email"
              value={emailInput}
              onChange={(e) => setEmailInput(e.target.value)}
              placeholder="example@mail.ru"
              autoComplete="email"
              autoFocus
              style={{
                width: '100%',
                padding: '12px 16px',
                border: '2px solid var(--border)',
                borderRadius: 12,
                fontSize: 16,
                marginBottom: 12,
              }}
            />
            {emailError && (
              <p className="error-text" style={{ marginBottom: 12 }}>{emailError}</p>
            )}
            <button
              className="btn-primary"
              onClick={handleSaveEmail}
              disabled={emailLoading || !emailInput.trim()}
            >
              {emailLoading ? 'Сохранение...' : 'Сохранить'}
            </button>
            <button
              className="btn-secondary"
              style={{ marginTop: 10 }}
              onClick={closeEmailModal}
              disabled={emailLoading}
            >
              Отмена
            </button>
          </div>
        </div>
      )}

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

      {showLogoutDialog && (
        <div className="modal-overlay" onClick={() => setShowLogoutDialog(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3 style={{ fontSize: 18, marginBottom: 12 }}>Выйти из аккаунта?</h3>
            <p style={{ marginBottom: 20, lineHeight: 1.5, color: 'var(--text-secondary)' }}>
              Вы выйдете из веб-версии. Для входа снова потребуется email и пароль.
            </p>
            <button className="btn-primary" style={{ background: '#e53935' }} onClick={confirmLogout}>
              Выйти
            </button>
            <button className="btn-secondary" style={{ marginTop: 10 }} onClick={() => setShowLogoutDialog(false)}>
              Отмена
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
