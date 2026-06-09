import { Router, Response } from 'express';
import { db } from '../db/schema.js';
import { AuthRequest } from '../middleware/auth.js';
import { generateMealPlan } from '../services/claude.js';

const router = Router();

function getToday(): string {
  return new Date().toISOString().split('T')[0];
}

router.get('/', (req: AuthRequest, res: Response) => {
  const plan = db.prepare(`
    SELECT * FROM week_plans WHERE telegram_id = ? ORDER BY created_at DESC LIMIT 1
  `).get(req.telegramId) as { plan_data: string } | undefined;

  if (!plan) {
    return res.json({ plan: null });
  }

  res.json({ plan: JSON.parse(plan.plan_data) });
});

router.post('/generate', async (req: AuthRequest, res: Response) => {
  const user = db.prepare('SELECT * FROM users WHERE telegram_id = ?').get(req.telegramId) as Record<string, unknown> | undefined;

  if (!user) {
    return res.status(404).json({ error: 'Пользователь не найден' });
  }

  const isPremium = !!user.is_premium;
  const today = getToday();

  if (!isPremium && user.last_plan_refresh === today) {
    return res.status(429).json({
      error: 'Бесплатное обновление рациона доступно 1 раз в день',
      canRefresh: false,
    });
  }

  try {
    const profile = {
      name: user.name as string,
      age: user.age as number,
      gender: user.gender as string,
      height: user.height as number,
      weight: user.weight as number,
      goal: user.goal as string,
      activityLevel: user.activity_level as string,
      mealsPerDay: user.meals_per_day as number,
      allergies: user.allergies ? JSON.parse(user.allergies as string) : [],
    };

    const plan = await generateMealPlan(profile);

    db.prepare('INSERT INTO week_plans (telegram_id, plan_data) VALUES (?, ?)').run(
      req.telegramId,
      JSON.stringify(plan)
    );

    db.prepare(`UPDATE users SET last_plan_refresh = ?, updated_at = datetime('now') WHERE telegram_id = ?`).run(
      today,
      req.telegramId
    );

    res.json({ plan, canRefresh: isPremium });
  } catch (error) {
    console.error('Plan generation error:', error);
    res.status(503).json({ error: 'Попробуй через минуту' });
  }
});

router.get('/refresh-status', (req: AuthRequest, res: Response) => {
  const user = db.prepare('SELECT is_premium, last_plan_refresh FROM users WHERE telegram_id = ?').get(req.telegramId) as
    | { is_premium: number; last_plan_refresh: string }
    | undefined;

  if (!user) {
    return res.json({ canRefresh: true });
  }

  const today = getToday();
  const canRefresh = !!user.is_premium || user.last_plan_refresh !== today;

  res.json({ canRefresh, isPremium: !!user.is_premium });
});

export default router;
