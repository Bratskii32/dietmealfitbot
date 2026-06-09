import { Router, Response } from 'express';
import { getUser, getLatestPlan, insertPlan, updateUserLastPlanRefresh, parseAllergies } from '../db/repository.js';
import { AuthRequest } from '../middleware/auth.js';
import { generateMealPlan } from '../services/claude.js';

const router = Router();

function getToday(): string {
  return new Date().toISOString().split('T')[0];
}

router.get('/', async (req: AuthRequest, res: Response) => {
  const plan = await getLatestPlan(req.telegramId!);

  if (!plan) {
    return res.json({ plan: null });
  }

  res.json({ plan: JSON.parse(plan.plan_data) });
});

router.post('/generate', async (req: AuthRequest, res: Response) => {
  const user = await getUser(req.telegramId!);

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
      name: user.name,
      age: user.age,
      gender: user.gender,
      height: user.height,
      weight: user.weight,
      goal: user.goal,
      activityLevel: user.activity_level,
      mealsPerDay: user.meals_per_day,
      allergies: parseAllergies(user),
    };

    const plan = await generateMealPlan(profile);

    await insertPlan(req.telegramId!, JSON.stringify(plan));
    await updateUserLastPlanRefresh(req.telegramId!, today);

    res.json({ plan, canRefresh: isPremium });
  } catch (error) {
    console.error('Plan generation error:', error);
    res.status(503).json({ error: 'Попробуй через минуту' });
  }
});

router.get('/refresh-status', async (req: AuthRequest, res: Response) => {
  const user = await getUser(req.telegramId!);

  if (!user) {
    return res.json({ canRefresh: true });
  }

  const today = getToday();
  const canRefresh = !!user.is_premium || user.last_plan_refresh !== today;

  res.json({ canRefresh, isPremium: !!user.is_premium });
});

export default router;
