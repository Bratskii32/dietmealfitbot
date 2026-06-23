import { Router, Request, Response } from 'express';
import {
  getAdminStats,
  grantLifetimePremium,
  grantPremiumDays,
  revokePremiumAccess,
  createPromoCode,
  getUser,
} from '../db/repository.js';
import { adminAuth } from '../middleware/adminAuth.js';
import {
  notifyLifetimePremiumGranted,
  notifyPremiumDaysGift,
  notifyPremiumRevoked,
} from '../services/premium.js';

const router = Router();

router.get('/stats', adminAuth, async (_req: Request, res: Response) => {
  try {
    const stats = await getAdminStats();
    res.json(stats);
  } catch (err) {
    console.error('Admin stats error:', err);
    res.status(500).json({ error: 'internal error' });
  }
});

router.post('/grant-lifetime', adminAuth, async (req: Request, res: Response) => {
  const { telegramId } = req.body as { telegramId?: string };
  if (!telegramId?.trim()) {
    return res.status(400).json({ error: 'telegramId required' });
  }

  try {
    await grantLifetimePremium(telegramId.trim());
    await notifyLifetimePremiumGranted(telegramId.trim());
    res.json({ success: true, telegramId: telegramId.trim() });
  } catch (err) {
    console.error('Grant lifetime error:', err);
    res.status(500).json({ error: 'internal error' });
  }
});

router.post('/grant-days', adminAuth, async (req: Request, res: Response) => {
  const { telegramId, days } = req.body as { telegramId?: string; days?: number };
  if (!telegramId?.trim() || !days || days < 1) {
    return res.status(400).json({ error: 'telegramId and positive days required' });
  }

  try {
    const premiumUntil = await grantPremiumDays(telegramId.trim(), days);
    await notifyPremiumDaysGift(telegramId.trim(), days, premiumUntil);
    res.json({ success: true, telegramId: telegramId.trim(), premiumUntil, days });
  } catch (err) {
    console.error('Grant days error:', err);
    res.status(500).json({ error: 'internal error' });
  }
});

router.post('/revoke-premium', adminAuth, async (req: Request, res: Response) => {
  const { telegramId } = req.body as { telegramId?: string };
  if (!telegramId?.trim()) {
    return res.status(400).json({ error: 'telegramId required' });
  }

  try {
    const user = await getUser(telegramId.trim());
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    await revokePremiumAccess(telegramId.trim());
    await notifyPremiumRevoked(telegramId.trim());
    res.json({ success: true, telegramId: telegramId.trim() });
  } catch (err) {
    console.error('Revoke premium error:', err);
    res.status(500).json({ error: 'internal error' });
  }
});

router.post('/create-promo', adminAuth, async (req: Request, res: Response) => {
  const { code, days, maxUses, expiresAt } = req.body as {
    code?: string;
    days?: number;
    maxUses?: number | null;
    expiresAt?: string | null;
  };

  if (!code?.trim() || !days || days < 1) {
    return res.status(400).json({ error: 'code and positive days required' });
  }

  try {
    const promo = await createPromoCode({
      code: code.trim(),
      days,
      maxUses: maxUses ?? null,
      expiresAt: expiresAt ?? null,
    });
    res.json({ success: true, promo });
  } catch (err) {
    const pgErr = err as { code?: string };
    if (pgErr.code === '23505') {
      return res.status(409).json({ error: 'duplicate', message: 'Промокод уже существует' });
    }
    console.error('Create promo error:', err);
    res.status(500).json({ error: 'internal error' });
  }
});

export default router;
