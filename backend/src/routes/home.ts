import { Router, Response } from 'express';
import {
  getLatestPlan,
  parseAllergies,
  getAdviceQueryCount,
  incrementSnackAdvice,
  setDailyStatus,
} from '../db/repository.js';
import { AuthRequest } from '../middleware/auth.js';
import { resolvePremiumUser } from '../services/premium.js';
import { FREEMIUM } from '../config/freemium.js';
import {
  generateLiveGreeting,
  getDefaultLiveGreeting,
  getMoscowHour,
  getTimeOfDayLabel,
  suggestWhatToEat,
} from '../services/claude.js';
import { handleClaudeError, serviceUnavailableResponse } from '../services/claudeErrors.js';

const router = Router();

const DAY_NAMES = ['воскресенье', 'понедельник', 'вторник', 'среда', 'четверг', 'пятница', 'суббота'];

function getTodayMoscow(): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Moscow' }).format(new Date());
}

function getMoscowDayOfWeek(): string {
  const dayIndex = new Date(
    new Date().toLocaleString('en-US', { timeZone: 'Europe/Moscow' })
  ).getDay();
  return DAY_NAMES[dayIndex];
}

router.get('/status', async (req: AuthRequest, res: Response) => {
  const { user } = await resolvePremiumUser(req.telegramId!);
  if (!user) return res.json({ status: '' });

  const today = getTodayMoscow();
  if (user.daily_status && user.daily_status_date === today) {
    return res.json({ status: user.daily_status });
  }

  const hour = getMoscowHour();
  const timeOfDay = getTimeOfDayLabel(hour);
  const name = user.name || user.first_name || 'друг';

  try {
    const status = await generateLiveGreeting({
      name,
      goal: user.goal || 'maintain',
      dayOfWeek: getMoscowDayOfWeek(),
      timeOfDay,
    });
    await setDailyStatus(req.telegramId!, status, today);
    res.json({ status });
  } catch {
    const fallback = getDefaultLiveGreeting(name, timeOfDay);
    await setDailyStatus(req.telegramId!, fallback, today);
    res.json({ status: fallback });
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

router.post('/what-to-eat', async (req: AuthRequest, res: Response) => {
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
});

export default router;
