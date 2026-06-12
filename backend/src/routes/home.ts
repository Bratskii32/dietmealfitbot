import { Router, Response } from 'express';
import {
  getUser,
  getLatestPlan,
  parseAllergies,
  getSnackAdviceCount,
  incrementSnackAdvice,
  setDailyStatus,
} from '../db/repository.js';
import { AuthRequest } from '../middleware/auth.js';
import { resolvePremiumUser } from '../services/premium.js';
import { FREEMIUM } from '../config/freemium.js';
import {
  generateDailyStatus,
  suggestWhatToEat,
  WeekPlan,
} from '../services/claude.js';

const router = Router();

function getToday(): string {
  return new Date().toISOString().split('T')[0];
}

function getTodayCalories(plan: WeekPlan | null): number {
  if (!plan?.days?.[0]?.meals) return 0;
  return plan.days[0].meals.reduce((s, m) => s + (m.recipe.calories || 0), 0);
}

router.get('/status', async (req: AuthRequest, res: Response) => {
  const { user } = await resolvePremiumUser(req.telegramId!);
  if (!user) return res.json({ status: '' });

  const today = getToday();
  if (user.daily_status && user.daily_status_date === today) {
    return res.json({ status: user.daily_status });
  }

  const planRow = await getLatestPlan(req.telegramId!);
  const plan = planRow ? (JSON.parse(planRow.plan_data) as WeekPlan) : null;
  const todayCalories = getTodayCalories(plan);
  const dailyNorm = plan?.dailyCalories || 2000;

  try {
    const status = await generateDailyStatus(user.goal || 'maintain', todayCalories, dailyNorm);
    await setDailyStatus(req.telegramId!, status, today);
    res.json({ status });
  } catch {
    res.json({ status: '🥗 Следуй своему рациону сегодня' });
  }
});

router.get('/what-to-eat/status', async (req: AuthRequest, res: Response) => {
  const { isPremium, user } = await resolvePremiumUser(req.telegramId!);
  const used = getSnackAdviceCount(user);
  const limit = FREEMIUM.FREE_SNACK_ADVICE_TOTAL;
  res.json({
    isPremium,
    used,
    limit,
    remaining: isPremium ? -1 : Math.max(0, limit - used),
  });
});

router.post('/what-to-eat', async (req: AuthRequest, res: Response) => {
  const { isPremium, user } = await resolvePremiumUser(req.telegramId!);
  if (!user) return res.status(404).json({ error: 'Пользователь не найден' });

  const used = getSnackAdviceCount(user);
  const limit = FREEMIUM.FREE_SNACK_ADVICE_TOTAL;

  if (!isPremium && used >= limit) {
    return res.status(429).json({
      error: 'premium_required',
      message: 'Бесплатные советы исчерпаны',
      used,
      limit,
      remaining: 0,
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
    const hour = new Date().getHours();
    const suggestion = await suggestWhatToEat(profile, hour);

    let newUsed = used;
    if (!isPremium) {
      newUsed = await incrementSnackAdvice(req.telegramId!);
    }

    const remaining = isPremium ? -1 : Math.max(0, limit - newUsed);
    const warning =
      !isPremium && remaining === 1
        ? 'Остался 1 бесплатный совет 👀'
        : undefined;

    res.json({ suggestion, used: newUsed, limit, remaining, warning, isPremium });
  } catch {
    res.status(503).json({ error: 'Попробуй через минуту' });
  }
});

export default router;
