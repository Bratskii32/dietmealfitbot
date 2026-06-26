import { useState, type CSSProperties } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import { setStoredToken, openExternalLink } from '../utils/telegram';
import { OFFER_URL, PRIVACY_URL } from '../constants/legal';

const linkButtonStyle: CSSProperties = {
  background: 'none',
  border: 'none',
  padding: 0,
  color: 'var(--primary)',
  fontWeight: 600,
  cursor: 'pointer',
  fontSize: 'inherit',
  textDecoration: 'underline',
};

export function Register() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [consentAccepted, setConsentAccepted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password || !consentAccepted) return;

    setLoading(true);
    setError('');
    try {
      const data = await api.register(email.trim(), password);
      setStoredToken(data.token);
      navigate('/', { replace: true });
    } catch (err: unknown) {
      const e = err as { message?: string };
      setError(e.message || 'Не удалось зарегистрироваться');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="app-container">
      <div className="screen-content" style={{ maxWidth: 400, margin: '0 auto', paddingTop: 80 }}>
        <h1 style={{ fontSize: 24, marginBottom: 8, textAlign: 'center' }}>Регистрация</h1>
        <p style={{ textAlign: 'center', color: 'var(--text-secondary)', marginBottom: 24, fontSize: 14 }}>
          Создай аккаунт для веб-версии
        </p>
        <form onSubmit={handleSubmit}>
          <label style={{ display: 'block', fontSize: 14, fontWeight: 600, marginBottom: 8 }}>Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="example@mail.ru"
            autoComplete="email"
            style={{ width: '100%', marginBottom: 16 }}
          />
          <label style={{ display: 'block', fontSize: 14, fontWeight: 600, marginBottom: 8 }}>Пароль</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Минимум 6 символов"
            autoComplete="new-password"
            style={{ width: '100%', marginBottom: 16 }}
          />
          <label
            style={{
              display: 'flex',
              gap: 10,
              alignItems: 'flex-start',
              marginBottom: 16,
              fontSize: 13,
              lineHeight: 1.5,
              cursor: 'pointer',
              color: 'var(--text-secondary)',
            }}
          >
            <input
              type="checkbox"
              checked={consentAccepted}
              onChange={(e) => setConsentAccepted(e.target.checked)}
              style={{ width: 18, height: 18, marginTop: 2, flexShrink: 0 }}
            />
            <span>
              Я принимаю условия{' '}
              <button
                type="button"
                style={linkButtonStyle}
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  openExternalLink(OFFER_URL);
                }}
              >
                оферты
              </button>{' '}
              и{' '}
              <button
                type="button"
                style={linkButtonStyle}
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  openExternalLink(PRIVACY_URL);
                }}
              >
                политику конфиденциальности
              </button>
              . Сервис носит информационный характер и не является медицинской рекомендацией.
            </span>
          </label>
          {error && <p className="error-text" style={{ marginBottom: 12 }}>{error}</p>}
          <button
            type="submit"
            className="btn-primary"
            disabled={loading || !email.trim() || !password || !consentAccepted}
          >
            {loading ? 'Создание...' : 'Создать аккаунт'}
          </button>
        </form>
        <p style={{ textAlign: 'center', marginTop: 20, fontSize: 14, color: 'var(--text-secondary)' }}>
          Уже есть аккаунт?{' '}
          <Link to="/login" style={{ color: 'var(--primary)', fontWeight: 600 }}>
            Войти
          </Link>
        </p>
      </div>
    </div>
  );
}

export default Register;
