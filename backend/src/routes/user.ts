import { Router, Response } from 'express';
import {
  saveOnboarding,
  parseAllergies,
  updateLastSeen,
  setNotificationsEnabled,
  logEvent,
  saveMealPreferences,
  markPreferencesPrompted,
  insertPlan,
  hasAchievement,
  setUserEmail,
} from '../db/repository.js';
import { AuthRequest } from '../middleware/auth.js';
import { FREEMIUM } from '../config/freemium.js';
import { resolvePremiumUser } from '../services/premium.js';
import { buildUserProfile } from '../services/userProfile.js';
import { generateMealPlan, WeekPlan } from '../services/claude.js';
import { handleClaudeError, serviceUnavailableResponse } from '../services/claudeErrors.js';
import { checkAchievements } from '../services/achievements.js';

const router = Router();

function filterPlanByTier(plan: WeekPlan, isPremium: boolean): WeekPlan {
  const maxDays = isPremium ? FREEMIUM.PREMIUM_DAYS : FREEMIUM.FREE_DAYS;
  return { ...plan, days: plan.days.slice(0, maxDays) };
}

router.get('/me', async (req: AuthRequest, res: Response) => {
  const { user, isPremium } = await resolvePremiumUser(req.telegramId!);
  if (!user) {
    return res.json({ exists: false });
  }

  const daysAway = await updateLastSeen(req.telegramId!);

  if (user.onboarding_complete && !(await hasAchievement(req.telegramId!, 'first_steps'))) {
    checkAchievements(req.telegramId!, { isFirstLogin: true }).catch(() => {});
  } else {
    checkAchievements(req.telegramId!).catch(() => {});
  }

  res.json({
    exists: true,
    daysAway,
    user: {
      telegramId: user.telegram_id,
      name: user.name,
      age: user.age,
      gender: user.gender,
      height: user.height,
      weight: user.weight,
      goal: user.goal,
      activityLevel: user.activity_level,
      mealsPerDay: user.meals_per_day,
      allergies: parseAllergies(user),
      isPremium,
      onboardingComplete: !!user.onboarding_complete,
      maxDays: isPremium ? FREEMIUM.PREMIUM_DAYS : FREEMIUM.FREE_DAYS,
      notificationsEnabled: user.notifications_enabled !== 0,
      preferencesPrompted: !!user.preferences_prompted,
      eatingStyle: user.eating_style || null,
      cookingTime: user.cooking_time || null,
    },
  });
});

router.post('/onboarding', async (req: AuthRequest, res: Response) => {
  const { name, age, gender, height, weight, goal, activityLevel, mealsPerDay, allergies } = req.body;

  await saveOnboarding(req.telegramId!, {
    name,
    age,
    gender,
    height,
    weight,
    goal,
    activityLevel,
    mealsPerDay,
    allergies: allergies || [],
  });

  await logEvent(req.telegramId!, 'onboarding_completed');

  res.json({ success: true });
});

router.get('/settings', async (req: AuthRequest, res: Response) => {
  const user = await resolvePremiumUser(req.telegramId!);
  res.json({
    notificationsEnabled: user.user?.notifications_enabled !== 0,
    eatingStyle: user.user?.eating_style || null,
    cookingTime: user.user?.cooking_time || null,
    email: user.user?.email || null,
  });
});

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

router.patch('/email', async (req: AuthRequest, res: Response) => {
  const { email } = req.body as { email?: string };
  if (!email?.trim() || !isValidEmail(email.trim())) {
    return res.status(400).json({ error: 'invalid_email', message: 'Введите корректный email' });
  }

  await setUserEmail(req.telegramId!, email.trim());
  res.json({ success: true, email: email.trim().toLowerCase() });
});

router.patch('/settings', async (req: AuthRequest, res: Response) => {
  const { notificationsEnabled } = req.body as { notificationsEnabled?: boolean };
  if (typeof notificationsEnabled !== 'boolean') {
    return res.status(400).json({ error: 'notificationsEnabled required' });
  }
  await setNotificationsEnabled(req.telegramId!, notificationsEnabled);
  res.json({ success: true, notificationsEnabled });
});

router.post('/preferences', async (req: AuthRequest, res: Response) => {
  const { eatingStyle, cookingTime } = req.body as {
    eatingStyle?: string | null;
    cookingTime?: string | null;
  };

  const validStyles = ['quick', 'healthy', 'cooking', 'varied'];
  const validTimes = ['quick', 'medium', 'long'];

  if (eatingStyle && !validStyles.includes(eatingStyle)) {
    return res.status(400).json({ error: 'Неверный стиль еды' });
  }
  if (cookingTime && !validTimes.includes(cookingTime)) {
    return res.status(400).json({ error: 'Неверное время готовки' });
  }

  const { isPremium, user } = await resolvePremiumUser(req.telegramId!);
  if (!user) return res.status(404).json({ error: 'Пользователь не найден' });

  await saveMealPreferences(req.telegramId!, eatingStyle || null, cookingTime || null);

  try {
    const profile = buildUserProfile({
      ...user,
      eating_style: eatingStyle || undefined,
      cooking_time: cookingTime || undefined,
    });
    const days = isPremium ? FREEMIUM.PREMIUM_DAYS : FREEMIUM.FREE_DAYS;
    const plan = await generateMealPlan(profile, days);
    await insertPlan(req.telegramId!, JSON.stringify(plan), isPremium);
    await markPreferencesPrompted(req.telegramId!);
    await logEvent(req.telegramId!, 'plan_generated');

    res.json({
      success: true,
      plan: filterPlanByTier(plan, isPremium),
      isPremium,
      maxDays: days,
    });
  } catch (error) {
    try {
      handleClaudeError(error);
    } catch {
      return serviceUnavailableResponse(res);
    }
  }
});

router.post('/preferences/skip', async (req: AuthRequest, res: Response) => {
  await markPreferencesPrompted(req.telegramId!);
  res.json({ success: true });
});

const CLIENT_EVENTS = ['paywall_shown'] as const;

router.post('/event', async (req: AuthRequest, res: Response) => {
  const { eventType } = req.body as { eventType?: string };
  if (!eventType || !CLIENT_EVENTS.includes(eventType as typeof CLIENT_EVENTS[number])) {
    return res.status(400).json({ error: 'Invalid event type' });
  }
  await logEvent(req.telegramId!, eventType as import('../db/types.js').EventType);
  res.json({ ok: true });
});

export default router;
