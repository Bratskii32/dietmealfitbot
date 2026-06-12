import { Router, Response } from 'express';
import { AuthRequest } from '../middleware/auth.js';
import { resolvePremiumUser, getPremiumDaysLeft } from '../services/premium.js';

const router = Router();

router.get('/status', async (req: AuthRequest, res: Response) => {
  const { isPremium, user } = await resolvePremiumUser(req.telegramId!);
  const premiumExpiresAt = user?.premium_until || null;
  res.json({
    isPremium,
    premiumExpiresAt,
    daysLeft: isPremium ? getPremiumDaysLeft(premiumExpiresAt || undefined) : 0,
  });
});

export default router;
