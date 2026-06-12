import { Router, Response } from 'express';
import {
  getWeightLog,
  getCookedCount,
  getCookedDates,
  upsertWeight,
  getUser,
  setProgressComment,
} from '../db/repository.js';
import { AuthRequest } from '../middleware/auth.js';
import { generateProgressComment } from '../services/claude.js';

const router = Router();

function getToday(): string {
  return new Date().toISOString().split('T')[0];
}

function calcStreak(cookedDates: string[]): number {
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
  return streak;
}

router.get('/', async (req: AuthRequest, res: Response) => {
  const weightLog = await getWeightLog(req.telegramId!);
  const cookedCount = await getCookedCount(req.telegramId!);
  const cookedDates = await getCookedDates(req.telegramId!);
  const streak = calcStreak(cookedDates);
  const user = await getUser(req.telegramId!);
  const today = getToday();

  let aiComment = user?.progress_ai_comment || '';
  if (!user?.progress_ai_comment_date || user.progress_ai_comment_date !== today) {
    try {
      aiComment = await generateProgressComment(streak, user?.goal || 'maintain');
      await setProgressComment(req.telegramId!, aiComment, today);
    } catch {
      aiComment = streak > 0 ? '💪 Отличная дисциплина!' : '🌱 Начни с одного рецепта сегодня';
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
    streakMessage: streak > 0 ? `🔥 Ты держишься уже ${streak} ${daysLabel(streak)} подряд` : '🔥 Начни свой путь сегодня',
    aiComment,
    achievements,
  });
});

function daysLabel(n: number): string {
  if (n % 10 === 1 && n % 100 !== 11) return 'день';
  if ([2, 3, 4].includes(n % 10) && ![12, 13, 14].includes(n % 100)) return 'дня';
  return 'дней';
}

router.post('/weight', async (req: AuthRequest, res: Response) => {
  const { weight } = req.body;
  if (!weight || weight < 30 || weight > 300) {
    return res.status(400).json({ error: 'Некорректный вес' });
  }

  await upsertWeight(req.telegramId!, weight, getToday());

  res.json({ success: true });
});

export default router;
