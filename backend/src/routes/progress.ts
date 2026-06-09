import { Router, Response } from 'express';
import { getWeightLog, getCookedCount, getCookedDates, upsertWeight } from '../db/repository.js';
import { AuthRequest } from '../middleware/auth.js';

const router = Router();

function getToday(): string {
  return new Date().toISOString().split('T')[0];
}

router.get('/', async (req: AuthRequest, res: Response) => {
  const weightLog = await getWeightLog(req.telegramId!);
  const cookedCount = await getCookedCount(req.telegramId!);
  const cookedDates = await getCookedDates(req.telegramId!);

  let streak = 0;
  const today = new Date();
  for (let i = 0; i < cookedDates.length; i++) {
    const expected = new Date(today);
    expected.setDate(expected.getDate() - i);
    const expectedStr = expected.toISOString().split('T')[0];
    if (cookedDates[i] === expectedStr) {
      streak++;
    } else {
      break;
    }
  }

  const achievements: { id: string; title: string; unlocked: boolean }[] = [
    { id: 'streak7', title: '7 дней подряд 🔥', unlocked: streak >= 7 },
    { id: 'recipes10', title: '10 рецептов приготовлено 👨‍🍳', unlocked: cookedCount >= 10 },
    { id: 'streak3', title: '3 дня подряд 💪', unlocked: streak >= 3 },
    { id: 'recipes5', title: '5 рецептов приготовлено 🍳', unlocked: cookedCount >= 5 },
  ];

  res.json({
    weightLog,
    cookedCount,
    streak,
    achievements,
  });
});

router.post('/weight', async (req: AuthRequest, res: Response) => {
  const { weight } = req.body;
  if (!weight || weight < 30 || weight > 300) {
    return res.status(400).json({ error: 'Некорректный вес' });
  }

  await upsertWeight(req.telegramId!, weight, getToday());

  res.json({ success: true });
});

export default router;
