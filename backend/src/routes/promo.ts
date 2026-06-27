import { Router, Response } from 'express';
import { AuthRequest } from '../middleware/auth.js';
import { activatePromoCode, PromoCodeError } from '../db/repository.js';
import { notifyPromoActivated } from '../services/premium.js';

const router = Router();

router.post('/activate', async (req: AuthRequest, res: Response) => {
  const userId = req.telegramId;
  console.log('promo activate, userId:', userId);

  if (!userId) {
    return res.status(401).json({ error: 'unauthorized', message: 'Не авторизован' });
  }

  const code = req.body.code?.toString().trim().toUpperCase();
  if (!code) {
    return res.status(400).json({ error: 'invalid_code', message: 'Введите промокод' });
  }

  try {
    const result = await activatePromoCode(code, userId);
    try {
      await notifyPromoActivated(userId, result.days, result.premiumUntil);
    } catch (notifyErr) {
      console.error('Promo notify error:', notifyErr);
    }
    const untilLabel = new Date(result.premiumUntil).toLocaleDateString('ru-RU', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
    res.json({
      success: true,
      days: result.days,
      premiumUntil: result.premiumUntil,
      message: `Промокод активирован! Premium действует до ${untilLabel}.`,
    });
  } catch (err) {
    if (err instanceof PromoCodeError) {
      return res.status(400).json({ error: err.code, message: err.message });
    }
    console.error('Promo activate error:', err);
    res.status(500).json({ error: 'internal', message: 'Не удалось активировать промокод' });
  }
});

export default router;
