import { Router, Response } from 'express';
import { getUser, saveOnboarding, parseAllergies } from '../db/repository.js';
import { AuthRequest } from '../middleware/auth.js';

const router = Router();

router.get('/me', async (req: AuthRequest, res: Response) => {
  const user = await getUser(req.telegramId!);
  if (!user) {
    return res.json({ exists: false });
  }

  res.json({
    exists: true,
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
      isPremium: !!user.is_premium,
      onboardingComplete: !!user.onboarding_complete,
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

  res.json({ success: true });
});

export default router;
