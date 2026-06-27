import { Router, Request, Response } from 'express';
import {
  getAdminStats,
  grantLifetimePremium,
  grantPremiumDays,
  revokePremiumAccess,
  createPromoCode,
  getAllPromoCodes,
  deactivatePromoCode,
  getUser,
  getActiveUsersForBroadcast,
} from '../db/repository.js';
import { adminAuth } from '../middleware/adminAuth.js';
import {
  notifyLifetimePremiumGranted,
  notifyPremiumDaysGift,
  notifyPremiumRevoked,
} from '../services/premium.js';
import { getBot } from '../bot/instance.js';

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
  const { days, maxUses, expiresAt } = req.body as {
    code?: string;
    days?: number;
    maxUses?: number | null;
    expiresAt?: string | null;
  };
  const code = req.body.code?.toString().trim().toUpperCase();

  if (!code || !days || days < 1) {
    return res.status(400).json({ error: 'code and positive days required' });
  }

  try {
    const promo = await createPromoCode({
      code,
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

router.get('/promos', adminAuth, async (_req: Request, res: Response) => {
  try {
    const promos = await getAllPromoCodes();
    res.json({ promos });
  } catch (err) {
    console.error('List promos error:', err);
    res.status(500).json({ error: 'internal error' });
  }
});

router.post('/deactivate-promo', adminAuth, async (req: Request, res: Response) => {
  const { id } = req.body as { id?: number };
  if (!id || id < 1) {
    return res.status(400).json({ error: 'id required' });
  }

  try {
    const updated = await deactivatePromoCode(id);
    if (!updated) {
      return res.status(404).json({ error: 'not_found', message: 'Промокод не найден' });
    }
    res.json({ success: true });
  } catch (err) {
    console.error('Deactivate promo error:', err);
    res.status(500).json({ error: 'internal error' });
  }
});

router.post('/broadcast', adminAuth, async (req, res) => {
  const { message, onlyPremium } = req.body as { message?: string; onlyPremium?: boolean };
  if (!message?.trim()) {
    return res.status(400).json({ error: 'message required' });
  }

  const bot = getBot();
  if (!bot) {
    return res.status(503).json({ error: 'Bot not available' });
  }

  const users = await getActiveUsersForBroadcast(!!onlyPremium);
  let sent = 0;
  let failed = 0;

  for (const user of users) {
    try {
      await bot.sendMessage(Number(user.telegram_id), message.trim());
      sent++;
    } catch {
      failed++;
    }
  }

  res.json({ success: true, sent, failed, total: users.length });
});

export default router;
