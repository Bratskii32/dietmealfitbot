import { useState, useEffect } from 'react';
import { api } from '../api/client';
import WebApp from '@twa-dev/sdk';

interface Props {
  onClose: () => void;
}

export function Premium({ onClose }: Props) {
  const [prices, setPrices] = useState({ monthly: 299, yearly: 2490 });

  useEffect(() => {
    api.getPrices().then((d) => setPrices(d.prices)).catch(() => {});
  }, []);

  const handlePurchase = async (plan: 'monthly' | 'yearly') => {
    try {
      const { invoiceLink } = await api.createInvoice(plan);
      WebApp.openInvoice(invoiceLink, (status) => {
        if (status === 'paid') onClose();
      });
    } catch {
      alert('Оплата доступна только в Telegram');
    }
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
      display: 'flex', alignItems: 'flex-end', justifyContent: 'center', zIndex: 200,
    }}>
      <div style={{
        background: 'white', borderRadius: '20px 20px 0 0', padding: 24,
        width: '100%', maxWidth: 430,
      }}>
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>⭐</div>
          <h2 style={{ fontSize: 22, marginBottom: 8 }}>Premium</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: 15, lineHeight: 1.5 }}>
            Получи безлимитные консультации AI-диетолога
          </p>
        </div>

        <div className="card" style={{ marginBottom: 12, cursor: 'pointer' }} onClick={() => handlePurchase('monthly')}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontWeight: 600, fontSize: 16 }}>1 месяц</div>
              <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Безлимитные запросы</div>
            </div>
            <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--primary)' }}>
              {prices.monthly} ⭐
            </div>
          </div>
        </div>

        <div className="card" style={{ marginBottom: 20, cursor: 'pointer', border: '2px solid var(--primary)' }} onClick={() => handlePurchase('yearly')}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontWeight: 600, fontSize: 16 }}>1 год <span style={{ color: 'var(--primary)', fontSize: 13 }}>-30%</span></div>
              <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Безлимитные запросы</div>
            </div>
            <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--primary)' }}>
              {prices.yearly} ⭐
            </div>
          </div>
        </div>

        <button className="btn-secondary" onClick={onClose}>Позже</button>
      </div>
    </div>
  );
}
