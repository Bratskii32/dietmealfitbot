import { Router, Response } from 'express';
import { db } from '../db/schema.js';
import { AuthRequest } from '../middleware/auth.js';
import { getBot } from '../bot/instance.js';

const router = Router();

export const prices = {
  monthly: 299,
  yearly: 2490,
};

router.get('/prices', (_req, res: Response) => {
  res.json({ prices });
});

router.post('/invoice', async (req: AuthRequest, res: Response) => {
  const { plan } = req.body;
  if (!['monthly', 'yearly'].includes(plan)) {
    return res.status(400).json({ error: 'Неверный план' });
  }

  const bot = getBot();
  if (!bot) {
    return res.status(503).json({ error: 'Бот не настроен' });
  }

  const amount = prices[plan as keyof typeof prices];
  const title = plan === 'monthly' ? 'Premium на 1 месяц' : 'Premium на 1 год';
  const description =
    plan === 'monthly'
      ? 'Безлимитные консультации AI-диетолога на 30 дней'
      : 'Безлимитные консультации AI-диетолога на 1 год (скидка 30%)';

  try {
    const link = await bot.createInvoiceLink(
      title,
      description,
      plan,
      '',
      'XTR',
      [{ label: title, amount }]
    );
    res.json({ invoiceLink: link });
  } catch (error) {
    console.error('Invoice error:', error);
    res.status(500).json({ error: 'Не удалось создать счёт' });
  }
});

router.post('/activate', (req: AuthRequest, res: Response) => {
  const { plan } = req.body;
  if (!['monthly', 'yearly'].includes(plan)) {
    return res.status(400).json({ error: 'Неверный план' });
  }

  const now = new Date();
  const premiumUntil = new Date(now);
  if (plan === 'monthly') {
    premiumUntil.setMonth(premiumUntil.getMonth() + 1);
  } else {
    premiumUntil.setFullYear(premiumUntil.getFullYear() + 1);
  }

  db.prepare(`
    UPDATE users SET is_premium = 1, premium_until = ?, updated_at = datetime('now')
    WHERE telegram_id = ?
  `).run(premiumUntil.toISOString(), req.telegramId);

  res.json({ success: true, premiumUntil: premiumUntil.toISOString() });
});

export default router;
