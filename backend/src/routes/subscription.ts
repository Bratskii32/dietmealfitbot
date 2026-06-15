import { Router, Response } from 'express';
import { AuthRequest } from '../middleware/auth.js';
import { resolvePremiumUser, getPremiumDaysLeft } from '../services/premium.js';
import { cancelSubscription, logEvent } from '../db/repository.js';
import { notifySubscriptionCancelled } from '../services/premium.js';

const router = Router();

router.get('/status', async (req: AuthRequest, res: Response) => {
  const { isPremium, user } = await resolvePremiumUser(req.telegramId!);
  const premiumExpiresAt = user?.premium_until || null;
  res.json({
    isPremium,
    premiumExpiresAt,
    daysLeft: isPremium ? getPremiumDaysLeft(premiumExpiresAt || undefined) : 0,
    cancelled: !!user?.subscription_cancelled,
  });
});

router.post('/cancel', async (req: AuthRequest, res: Response) => {
  const { user } = await resolvePremiumUser(req.telegramId!);
  if (!user?.is_premium || !user.premium_until) {
    return res.status(400).json({ error: 'Нет активной подписки' });
  }

  await cancelSubscription(req.telegramId!);
  await logEvent(req.telegramId!, 'subscription_cancelled');
  await notifySubscriptionCancelled(req.telegramId!, user.premium_until);

  res.json({
    success: true,
    premiumExpiresAt: user.premium_until,
    message: 'Подписка отменена. Доступ сохраняется до конца оплаченного периода.',
  });
});

export default router;
