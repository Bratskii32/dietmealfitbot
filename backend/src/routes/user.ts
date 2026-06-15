import { Router, Response } from 'express';
import {
  saveOnboarding,
  parseAllergies,
  updateLastSeen,
  setNotificationsEnabled,
  logEvent,
} from '../db/repository.js';
import { AuthRequest } from '../middleware/auth.js';
import { FREEMIUM } from '../config/freemium.js';
import { resolvePremiumUser } from '../services/premium.js';

const router = Router();

router.get('/me', async (req: AuthRequest, res: Response) => {
  const { user, isPremium } = await resolvePremiumUser(req.telegramId!);
  if (!user) {
    return res.json({ exists: false });
  }

  const daysAway = await updateLastSeen(req.telegramId!);

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
  });
});

router.patch('/settings', async (req: AuthRequest, res: Response) => {
  const { notificationsEnabled } = req.body as { notificationsEnabled?: boolean };
  if (typeof notificationsEnabled !== 'boolean') {
    return res.status(400).json({ error: 'notificationsEnabled required' });
  }
  await setNotificationsEnabled(req.telegramId!, notificationsEnabled);
  res.json({ success: true, notificationsEnabled });
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
