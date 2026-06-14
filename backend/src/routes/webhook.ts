import { Router, Request, Response } from 'express';
import { activateProdamusPremium } from '../db/repository.js';
import { notifyPremiumActivated } from '../services/premium.js';
import { PREMIUM_DAYS_DURATION } from '../config/freemium.js';
import { isTrustedYooKassaRequest, verifyYooKassaPayment } from '../services/yookassa.js';

const router = Router();

router.post('/yookassa', async (req: Request, res: Response) => {
  if (!isTrustedYooKassaRequest(req)) {
    console.warn('YooKassa webhook: недоверенный IP', req.headers['x-forwarded-for'] || req.socket.remoteAddress);
    return res.status(403).json({ error: 'Forbidden' });
  }

  const body = req.body as {
    type?: string;
    event?: string;
    object?: { id?: string; status?: string; metadata?: { telegram_id?: string } };
  };

  if (body.type !== 'notification' || !body.event || !body.object?.id) {
    return res.status(400).json({ error: 'Invalid notification' });
  }

  if (body.event !== 'payment.succeeded') {
    return res.json({ ok: true, action: 'ignored' });
  }

  try {
    const verified = await verifyYooKassaPayment(body.object.id);
    if (!verified) {
      console.warn('YooKassa webhook: платёж не прошёл проверку', body.object.id);
      return res.status(400).json({ error: 'Payment verification failed' });
    }

    const expiresAt = await activateProdamusPremium(verified.telegramId, PREMIUM_DAYS_DURATION);
    await notifyPremiumActivated(verified.telegramId, expiresAt);

    res.json({ ok: true, action: 'activated' });
  } catch (err) {
    console.error('YooKassa webhook error:', err);
    res.status(500).json({ error: 'internal error' });
  }
});

export default router;
