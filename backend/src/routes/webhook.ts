import { Router, Request, Response } from 'express';
import {
  activateProdamusPremium,
  expirePremium,
  getUser,
} from '../db/repository.js';
import {
  notifyPremiumActivated,
  notifyPremiumCancelled,
} from '../services/premium.js';
import { PREMIUM_DAYS_DURATION } from '../config/freemium.js';

const router = Router();

function extractTelegramId(body: Record<string, unknown>): string | null {
  const candidates = [
    body.telegram_id,
    body.telegramId,
    body.customer_extra,
    body.customerExtra,
    (body.customer as Record<string, unknown>)?.extra,
    (body.order as Record<string, unknown>)?.customer_extra,
  ];
  for (const c of candidates) {
    if (c != null && String(c).trim()) return String(c).trim();
  }
  return null;
}

function isSuccessPayment(body: Record<string, unknown>): boolean {
  const status = String(body.payment_status || body.status || body.order_status || '').toLowerCase();
  return ['success', 'paid', 'completed', 'done'].includes(status);
}

function isFailedPayment(body: Record<string, unknown>): boolean {
  const status = String(body.payment_status || body.status || body.order_status || '').toLowerCase();
  return ['failed', 'cancelled', 'canceled', 'refunded', 'chargeback'].includes(status);
}

router.post('/prodamus', async (req: Request, res: Response) => {
  const body = req.body as Record<string, unknown>;
  const telegramId = extractTelegramId(body);

  if (!telegramId) {
    console.warn('Prodamus webhook: telegram_id не найден', body);
    return res.status(400).json({ error: 'telegram_id required' });
  }

  try {
    if (isSuccessPayment(body)) {
      const expiresAt = await activateProdamusPremium(telegramId, PREMIUM_DAYS_DURATION);
      await notifyPremiumActivated(telegramId, expiresAt);
      return res.json({ ok: true, action: 'activated' });
    }

    if (isFailedPayment(body)) {
      const user = await getUser(telegramId);
      if (user?.is_premium) {
        await expirePremium(telegramId);
        await notifyPremiumCancelled(telegramId);
      }
      return res.json({ ok: true, action: 'cancelled' });
    }

    res.json({ ok: true, action: 'ignored' });
  } catch (err) {
    console.error('Prodamus webhook error:', err);
    res.status(500).json({ error: 'internal error' });
  }
});

export default router;
