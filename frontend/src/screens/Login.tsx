import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import { setStoredToken } from '../utils/telegram';

export function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password) return;

    setLoading(true);
    setError('');
    try {
      const data = await api.login(email.trim(), password);
      setStoredToken(data.token);
      navigate('/', { replace: true });
    } catch (err: unknown) {
      const e = err as { message?: string };
      setError(e.message || 'Не удалось войти');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="app-container">
      <div className="screen-content" style={{ maxWidth: 400, margin: '0 auto', paddingTop: 80 }}>
        <h1 style={{ fontSize: 24, marginBottom: 8, textAlign: 'center' }}>Вход</h1>
        <p style={{ textAlign: 'center', color: 'var(--text-secondary)', marginBottom: 24, fontSize: 14 }}>
          DietMealFit — веб-версия
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
            autoComplete="current-password"
            style={{ width: '100%', marginBottom: 12 }}
          />
          {error && <p className="error-text" style={{ marginBottom: 12 }}>{error}</p>}
          <button type="submit" className="btn-primary" disabled={loading || !email.trim() || !password}>
            {loading ? 'Вход...' : 'Войти'}
          </button>
        </form>
        <p style={{ textAlign: 'center', marginTop: 20, fontSize: 14, color: 'var(--text-secondary)' }}>
          Нет аккаунта?{' '}
          <Link to="/register" style={{ color: 'var(--primary)', fontWeight: 600 }}>
            Зарегистрироваться
          </Link>
        </p>
      </div>
    </div>
  );
}

export default Login;
