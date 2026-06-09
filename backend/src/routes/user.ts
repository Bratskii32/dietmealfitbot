import { Router, Response } from 'express';
import { db } from '../db/schema.js';
import { AuthRequest } from '../middleware/auth.js';

const router = Router();

router.get('/me', (req: AuthRequest, res: Response) => {
  const user = db.prepare('SELECT * FROM users WHERE telegram_id = ?').get(req.telegramId);
  if (!user) {
    return res.json({ exists: false });
  }

  const row = user as Record<string, unknown>;
  res.json({
    exists: true,
    user: {
      telegramId: row.telegram_id,
      name: row.name,
      age: row.age,
      gender: row.gender,
      height: row.height,
      weight: row.weight,
      goal: row.goal,
      activityLevel: row.activity_level,
      mealsPerDay: row.meals_per_day,
      allergies: row.allergies ? JSON.parse(row.allergies as string) : [],
      isPremium: !!row.is_premium,
      onboardingComplete: !!row.onboarding_complete,
    },
  });
});

router.post('/onboarding', (req: AuthRequest, res: Response) => {
  const { name, age, gender, height, weight, goal, activityLevel, mealsPerDay, allergies } = req.body;

  const existing = db.prepare('SELECT telegram_id FROM users WHERE telegram_id = ?').get(req.telegramId);

  if (existing) {
    db.prepare(`
      UPDATE users SET
        name = ?, age = ?, gender = ?, height = ?, weight = ?,
        goal = ?, activity_level = ?, meals_per_day = ?, allergies = ?,
        onboarding_complete = 1, updated_at = datetime('now')
      WHERE telegram_id = ?
    `).run(
      name, age, gender, height, weight, goal, activityLevel, mealsPerDay,
      JSON.stringify(allergies || []), req.telegramId
    );
  } else {
    db.prepare(`
      INSERT INTO users (telegram_id, name, age, gender, height, weight, goal, activity_level, meals_per_day, allergies, onboarding_complete)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
    `).run(
      req.telegramId, name, age, gender, height, weight, goal, activityLevel, mealsPerDay,
      JSON.stringify(allergies || [])
    );
  }

  res.json({ success: true });
});

export default router;
