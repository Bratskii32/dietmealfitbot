import { Router, Response } from 'express';
import { AuthRequest } from '../middleware/auth.js';
import { activatePromoCode, PromoCodeError } from '../db/repository.js';
import { notifyPromoActivated } from '../services/premium.js';

const router = Router();

router.post('/activate', async (req: AuthRequest, res: Response) => {
  const { code } = req.body as { code?: string };
  if (!code?.trim()) {
    return res.status(400).json({ error: 'invalid_code', message: 'Введите промокод' });
  }

  try {
    const result = await activatePromoCode(code.trim(), req.telegramId!);
    await notifyPromoActivated(req.telegramId!, result.days, result.premiumUntil);
    res.json({
      success: true,
      days: result.days,
      premiumUntil: result.premiumUntil,
      message: `Промокод активирован! +${result.days} дней Premium.`,
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
