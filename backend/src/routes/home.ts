import { Router, Response } from 'express';
import {
  getLatestPlan,
  parseAllergies,
  getAdviceQueryCount,
  incrementSnackAdvice,
} from '../db/repository.js';
import { AuthRequest } from '../middleware/auth.js';
import { resolvePremiumUser } from '../services/premium.js';
import { FREEMIUM } from '../config/freemium.js';
import { suggestWhatToEat, getMoscowHour } from '../services/claude.js';
import { getOrCreatePeriodStatus } from '../services/dailyStatus.js';
import { handleClaudeError, serviceUnavailableResponse } from '../services/claudeErrors.js';
import { updateStreak } from '../services/streak.js';

const router = Router();

router.get('/status', async (req: AuthRequest, res: Response) => {
  const { user } = await resolvePremiumUser(req.telegramId!);
  if (!user) return res.json({ status: '' });

  try {
    const status = await getOrCreatePeriodStatus(user);
    res.json({ status });
  } catch {
    res.json({ status: '' });
  }
});

router.get('/what-to-eat/status', async (req: AuthRequest, res: Response) => {
  const { isPremium } = await resolvePremiumUser(req.telegramId!);
  const used = await getAdviceQueryCount(req.telegramId!);
  const limit = FREEMIUM.FREE_SNACK_ADVICE_TOTAL;
  res.json({
    isPremium,
    used,
    limit,
    remaining: isPremium ? -1 : Math.max(0, limit - used),
  });
});

router.post('/what-to-eat', handleWhatToEat);
router.post('/advice', handleWhatToEat);

async function handleWhatToEat(req: AuthRequest, res: Response) {
  const { isPremium, user } = await resolvePremiumUser(req.telegramId!);
  if (!user) return res.status(404).json({ error: 'Пользователь не найден' });

  const used = await getAdviceQueryCount(req.telegramId!);
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
      eatingStyle: user.eating_style || null,
      cookingTime: user.cooking_time || null,
    };
    const hour = getMoscowHour();
    const suggestion = await suggestWhatToEat(profile, hour);

    await updateStreak(req.telegramId!);

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
  } catch (error) {
    try {
      handleClaudeError(error);
    } catch {
      return serviceUnavailableResponse(res);
    }
  }
}

export default router;
