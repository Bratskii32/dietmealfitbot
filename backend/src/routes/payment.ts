import { Router, Response } from 'express';
import { AuthRequest } from '../middleware/auth.js';
import { getYooKassa, PREMIUM_DESCRIPTION, PREMIUM_PRICE } from '../services/yookassa.js';

const router = Router();

export const prices = {
  monthly: 299,
  yearly: 2490,
  pdf_weekly: 149,
};

router.get('/prices', (_req, res: Response) => {
  res.json({ prices });
});

router.post('/create', async (req: AuthRequest, res: Response) => {
  const returnUrl = process.env.YOOKASSA_RETURN_URL;
  if (!returnUrl) {
    return res.status(503).json({ error: 'Оплата не настроена' });
  }

  try {
    const yooKassa = getYooKassa();
    const payment = await yooKassa.createPayment({
      amount: { value: PREMIUM_PRICE, currency: 'RUB' },
      capture: true,
      confirmation: { type: 'redirect', return_url: returnUrl },
      description: PREMIUM_DESCRIPTION,
      metadata: { telegram_id: req.telegramId! },
    });

    const paymentUrl = payment.confirmationUrl;
    if (!paymentUrl) {
      return res.status(500).json({ error: 'Не удалось получить ссылку на оплату' });
    }

    res.json({ paymentUrl });
  } catch (error) {
    console.error('YooKassa create payment error:', error);
    res.status(500).json({ error: 'Не удалось создать платёж' });
  }
});

export default router;
