import { Router, Response } from 'express';
import { getUser, getLatestPlan, insertPlan, updateUserLastPlanRefresh, parseAllergies, isPremiumUser } from '../db/repository.js';
import { AuthRequest } from '../middleware/auth.js';
import { generateMealPlan, WeekPlan } from '../services/claude.js';
import { FREEMIUM } from '../config/freemium.js';

const router = Router();

function getToday(): string {
  return new Date().toISOString().split('T')[0];
}

function filterPlanByTier(plan: WeekPlan, isPremium: boolean): WeekPlan {
  const maxDays = isPremium ? FREEMIUM.PREMIUM_DAYS : FREEMIUM.FREE_DAYS;
  return {
    ...plan,
    days: plan.days.slice(0, maxDays),
  };
}

router.get('/', async (req: AuthRequest, res: Response) => {
  const user = await getUser(req.telegramId!);
  const isPremium = isPremiumUser(user);
  const plan = await getLatestPlan(req.telegramId!);

  if (!plan) {
    return res.json({ plan: null, isPremium, maxDays: isPremium ? FREEMIUM.PREMIUM_DAYS : FREEMIUM.FREE_DAYS });
  }

  const fullPlan = JSON.parse(plan.plan_data) as WeekPlan;
  res.json({
    plan: filterPlanByTier(fullPlan, isPremium),
    isPremium,
    maxDays: isPremium ? FREEMIUM.PREMIUM_DAYS : FREEMIUM.FREE_DAYS,
    totalDays: fullPlan.days.length,
  });
});

router.post('/generate', async (req: AuthRequest, res: Response) => {
  const user = await getUser(req.telegramId!);

  if (!user) {
    return res.status(404).json({ error: 'Пользователь не найден' });
  }

  const isPremium = isPremiumUser(user);
  const { upgrade } = req.body as { upgrade?: boolean };

  if (upgrade && !isPremium) {
    return res.status(403).json({
      error: 'premium_required',
      message: 'Обновление рациона доступно в Premium',
    });
  }

  if (!isPremium && user.last_plan_refresh) {
    return res.status(403).json({
      error: 'premium_required',
      message: 'Обновление рациона доступно в Premium',
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

    const days = isPremium ? FREEMIUM.PREMIUM_DAYS : FREEMIUM.FREE_DAYS;
    const plan = await generateMealPlan(profile, days);

    await insertPlan(req.telegramId!, JSON.stringify(plan));
    if (isPremium) {
      await updateUserLastPlanRefresh(req.telegramId!, getToday());
    }

    res.json({
      plan: filterPlanByTier(plan, isPremium),
      isPremium,
      maxDays: days,
      canRefresh: isPremium,
    });
  } catch (error) {
    console.error('Plan generation error:', error);
    res.status(503).json({ error: 'Попробуй через минуту' });
  }
});

router.get('/refresh-status', async (req: AuthRequest, res: Response) => {
  const user = await getUser(req.telegramId!);
  const isPremium = isPremiumUser(user);

  res.json({
    canRefresh: isPremium,
    isPremium,
    maxDays: isPremium ? FREEMIUM.PREMIUM_DAYS : FREEMIUM.FREE_DAYS,
  });
});

export default router;
