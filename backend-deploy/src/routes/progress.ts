import { Router, Response } from 'express';
import { db } from '../db/schema.js';
import { AuthRequest } from '../middleware/auth.js';

const router = Router();

function getToday(): string {
  return new Date().toISOString().split('T')[0];
}

router.get('/', (req: AuthRequest, res: Response) => {
  const weightLog = db.prepare(`
    SELECT weight, log_date FROM weight_log
    WHERE telegram_id = ? ORDER BY log_date ASC
  `).all(req.telegramId);

  const cookedCount = db.prepare(`
    SELECT COUNT(*) as count FROM cooked_recipes WHERE telegram_id = ?
  `).get(req.telegramId) as { count: number };

  const cookedDates = db.prepare(`
    SELECT DISTINCT date(cooked_at) as d FROM cooked_recipes
    WHERE telegram_id = ? ORDER BY d DESC
  `).all(req.telegramId) as { d: string }[];

  let streak = 0;
  const today = new Date();
  for (let i = 0; i < cookedDates.length; i++) {
    const expected = new Date(today);
    expected.setDate(expected.getDate() - i);
    const expectedStr = expected.toISOString().split('T')[0];
    if (cookedDates[i]?.d === expectedStr) {
      streak++;
    } else {
      break;
    }
  }

  const achievements: { id: string; title: string; unlocked: boolean }[] = [
    { id: 'streak7', title: '7 дней подряд 🔥', unlocked: streak >= 7 },
    { id: 'recipes10', title: '10 рецептов приготовлено 👨‍🍳', unlocked: cookedCount.count >= 10 },
    { id: 'streak3', title: '3 дня подряд 💪', unlocked: streak >= 3 },
    { id: 'recipes5', title: '5 рецептов приготовлено 🍳', unlocked: cookedCount.count >= 5 },
  ];

  res.json({
    weightLog,
    cookedCount: cookedCount.count,
    streak,
    achievements,
  });
});

router.post('/weight', (req: AuthRequest, res: Response) => {
  const { weight } = req.body;
  if (!weight || weight < 30 || weight > 300) {
    return res.status(400).json({ error: 'Некорректный вес' });
  }

  const today = getToday();

  const existing = db.prepare('SELECT id FROM weight_log WHERE telegram_id = ? AND log_date = ?').get(
    req.telegramId,
    today
  );

  if (existing) {
    db.prepare('UPDATE weight_log SET weight = ? WHERE telegram_id = ? AND log_date = ?').run(
      weight,
      req.telegramId,
      today
    );
  } else {
    db.prepare('INSERT INTO weight_log (telegram_id, weight, log_date) VALUES (?, ?, ?)').run(
      req.telegramId,
      weight,
      today
    );
  }

  db.prepare("UPDATE users SET weight = ?, updated_at = datetime('now') WHERE telegram_id = ?").run(
    weight,
    req.telegramId
  );

  res.json({ success: true });
});

export default router;
