import { useState, useEffect, useCallback } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';
const ADMIN_STORAGE_KEY = 'dietmealfit_admin_token';

interface AdminStats {
  total_users: number;
  premium_users: number;
  today_registrations: number;
  conversion_rate: number;
  total_revenue: number;
  registrations_last_7_days: { date: string; count: number }[];
  recent_payments: { date: string; amount: number }[];
}

async function fetchStats(token: string): Promise<AdminStats> {
  const res = await fetch(`${API_URL}/admin/stats`, {
    headers: { 'X-Admin-Token': token },
  });
  if (res.status === 401) throw new Error('unauthorized');
  if (!res.ok) throw new Error('fetch_failed');
  return res.json();
}

async function sendBroadcast(
  token: string,
  message: string,
  onlyPremium: boolean
): Promise<{ sent: number; failed: number; total: number }> {
  const res = await fetch(`${API_URL}/admin/broadcast`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Admin-Token': token,
    },
    body: JSON.stringify({ message, onlyPremium }),
  });
  if (res.status === 401) throw new Error('unauthorized');
  if (!res.ok) throw new Error('broadcast_failed');
  return res.json();
}

function formatChartDate(iso: string): string {
  return new Date(iso).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' });
}

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString('ru-RU', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="card" style={{ flex: '1 1 140px', minWidth: 140 }}>
      <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 6 }}>{label}</div>
      <div style={{ fontSize: 24, fontWeight: 700, color: 'var(--primary)' }}>{value}</div>
    </div>
  );
}

export function Admin() {
  const [token, setToken] = useState(() => localStorage.getItem(ADMIN_STORAGE_KEY) || '');
  const [password, setPassword] = useState('');
  const [authenticated, setAuthenticated] = useState(false);
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [broadcastMessage, setBroadcastMessage] = useState('');
  const [onlyPremium, setOnlyPremium] = useState(false);
  const [broadcastLoading, setBroadcastLoading] = useState(false);
  const [broadcastResult, setBroadcastResult] = useState('');
  const [broadcastError, setBroadcastError] = useState('');

  const loadStats = useCallback(async (authToken: string) => {
    setLoading(true);
    setError('');
    try {
      const data = await fetchStats(authToken);
      setStats(data);
      setAuthenticated(true);
      localStorage.setItem(ADMIN_STORAGE_KEY, authToken);
    } catch (err) {
      if ((err as Error).message === 'unauthorized') {
        localStorage.removeItem(ADMIN_STORAGE_KEY);
        setAuthenticated(false);
        setToken('');
        setError('Неверный пароль');
      } else {
        setError('Не удалось загрузить статистику');
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (token) loadStats(token);
  }, [token, loadStats]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password.trim()) return;
    await loadStats(password.trim());
  };

  const handleLogout = () => {
    localStorage.removeItem(ADMIN_STORAGE_KEY);
    setToken('');
    setPassword('');
    setAuthenticated(false);
    setStats(null);
    setError('');
    setBroadcastMessage('');
    setBroadcastResult('');
    setBroadcastError('');
  };

  const handleBroadcast = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!broadcastMessage.trim() || !token) return;

    setBroadcastLoading(true);
    setBroadcastResult('');
    setBroadcastError('');

    try {
      const data = await sendBroadcast(token, broadcastMessage.trim(), onlyPremium);
      setBroadcastResult(`✅ Отправлено ${data.sent} пользователям`);
      setBroadcastMessage('');
    } catch (err) {
      if ((err as Error).message === 'unauthorized') {
        handleLogout();
        setError('Неверный пароль');
      } else {
        setBroadcastError('❌ Ошибка отправки');
      }
    } finally {
      setBroadcastLoading(false);
    }
  };

  if (!authenticated || !stats) {
    return (
      <div className="app-container">
        <div className="screen-content" style={{ maxWidth: 400, margin: '0 auto', paddingTop: 80 }}>
          <h1 style={{ fontSize: 24, marginBottom: 8, textAlign: 'center' }}>🔐 Админ-панель</h1>
          <p style={{ textAlign: 'center', color: 'var(--text-secondary)', marginBottom: 24, fontSize: 14 }}>
            DietMealFit Bot — статистика
          </p>
          <form onSubmit={handleLogin}>
            <label style={{ display: 'block', fontSize: 14, fontWeight: 600, marginBottom: 8 }}>
              Введите пароль
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Пароль администратора"
              autoComplete="current-password"
              style={{ width: '100%', marginBottom: 12 }}
            />
            {error && <p className="error-text" style={{ marginBottom: 12 }}>{error}</p>}
            <button type="submit" className="btn-primary" disabled={loading || !password.trim()}>
              {loading ? 'Проверка...' : 'Войти'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  const chartData = stats.registrations_last_7_days.map((d) => ({
    ...d,
    label: formatChartDate(d.date),
  }));

  return (
    <div className="app-container">
      <div className="screen-content" style={{ paddingBottom: 40 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <h1 style={{ fontSize: 22 }}>📊 Статистика</h1>
          <button
            type="button"
            onClick={handleLogout}
            style={{ background: 'none', color: 'var(--text-secondary)', fontSize: 14 }}
          >
            Выйти
          </button>
        </div>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginBottom: 24 }}>
          <StatCard label="Всего пользователей" value={stats.total_users} />
          <StatCard label="Premium пользователей" value={stats.premium_users} />
          <StatCard label="Конверсия в Premium" value={`${stats.conversion_rate}%`} />
          <StatCard label="Доход за всё время" value={`${stats.total_revenue.toLocaleString('ru-RU')} ₽`} />
        </div>

        <div className="card" style={{ marginBottom: 16 }}>
          <div style={{ fontWeight: 600, marginBottom: 4 }}>Регистрации сегодня</div>
          <div style={{ fontSize: 28, fontWeight: 700, color: 'var(--primary)' }}>
            {stats.today_registrations}
          </div>
        </div>

        <div className="card" style={{ marginBottom: 16 }}>
          <div style={{ fontWeight: 600, marginBottom: 16 }}>Регистрации за 7 дней</div>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={chartData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
              <XAxis dataKey="label" tick={{ fontSize: 11 }} />
              <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
              <Tooltip
                formatter={(value) => [Number(value ?? 0), 'Регистраций']}
                labelFormatter={(label) => String(label)}
              />
              <Bar dataKey="count" fill="var(--primary)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="card" style={{ marginBottom: 16 }}>
          <div style={{ fontWeight: 600, marginBottom: 12 }}>Последние 10 оплат</div>
          {stats.recent_payments.length === 0 ? (
            <p style={{ color: 'var(--text-secondary)', fontSize: 14 }}>Оплат пока нет</p>
          ) : (
            stats.recent_payments.map((p, i) => (
              <div
                key={`${p.date}-${i}`}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  padding: '10px 0',
                  borderBottom: i < stats.recent_payments.length - 1 ? '1px solid var(--border)' : undefined,
                  fontSize: 14,
                }}
              >
                <span style={{ color: 'var(--text-secondary)' }}>{formatDateTime(p.date)}</span>
                <span style={{ fontWeight: 600, color: 'var(--primary)' }}>{p.amount} ₽</span>
              </div>
            ))
          )}
        </div>

        <div className="card">
          <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 16 }}>📢 Рассылка пользователям</h2>
          <form onSubmit={handleBroadcast}>
            <textarea
              value={broadcastMessage}
              onChange={(e) => setBroadcastMessage(e.target.value)}
              placeholder="Введи текст сообщения..."
              rows={5}
              style={{
                width: '100%',
                padding: '12px 16px',
                border: '2px solid var(--border)',
                borderRadius: 12,
                fontSize: 15,
                lineHeight: 1.5,
                resize: 'vertical',
                marginBottom: 12,
                fontFamily: 'inherit',
              }}
            />
            <label
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                marginBottom: 16,
                fontSize: 14,
                cursor: 'pointer',
              }}
            >
              <input
                type="checkbox"
                checked={onlyPremium}
                onChange={(e) => setOnlyPremium(e.target.checked)}
                style={{ width: 18, height: 18 }}
              />
              Только Premium пользователям
            </label>
            {broadcastError && (
              <p className="error-text" style={{ marginBottom: 12 }}>{broadcastError}</p>
            )}
            {broadcastResult && (
              <p style={{ color: '#4CAF50', fontSize: 14, marginBottom: 12, fontWeight: 600 }}>
                {broadcastResult}
              </p>
            )}
            <button
              type="submit"
              className="btn-primary"
              disabled={broadcastLoading || !broadcastMessage.trim()}
              style={{ background: '#4CAF50' }}
            >
              {broadcastLoading ? 'Отправка...' : 'Отправить рассылку'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

export default Admin;
