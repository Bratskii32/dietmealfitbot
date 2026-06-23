import { Router, Response } from 'express';
import {
  getWeightLog,
  getCookedCount,
  getCookedDates,
  upsertWeight,
  getUser,
  setProgressComment,
  getUserAchievements,
} from '../db/repository.js';
import { AuthRequest } from '../middleware/auth.js';
import { generateProgressComment } from '../services/claude.js';
import { calcStreak, getAchievementProgress } from '../services/achievements.js';

const router = Router();

function getToday(): string {
  return new Date().toISOString().split('T')[0];
}

function daysLabel(n: number): string {
  if (n % 10 === 1 && n % 100 !== 11) return 'день';
  if ([2, 3, 4].includes(n % 10) && ![12, 13, 14].includes(n % 100)) return 'дня';
  return 'дней';
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

  const unlocked = await getUserAchievements(req.telegramId!);
  const unlockedMap = new Map(unlocked.map((a) => [a.achievement_key, a]));

  const achievements = getAchievementProgress(streak, cookedCount).map((a) => {
    const row = unlockedMap.get(a.key);
    const isUnlocked = !!row;
    let progressText: string | null = null;

    if (!isUnlocked) {
      if (a.key === 'cook_3') {
        const left = 3 - cookedCount;
        if (left > 0) {
          progressText = `Ещё ${left} рецепт${left === 1 ? '' : left < 5 ? 'а' : 'ов'} до награды 🍰`;
        }
      } else if (a.key.startsWith('streak_') && a.progressText) {
        progressText = a.progressText.replace('до награды', 'до следующей награды');
      } else if (a.key === 'first_steps') {
        progressText = null;
      }
    }

    return {
      id: a.key,
      title: a.title,
      description: a.description,
      unlocked: isUnlocked,
      reward_content: row?.reward_content || null,
      progressText,
    };
  });

  res.json({
    weightLog,
    cookedCount,
    streak,
    streakMessage: streak > 0 ? `🔥 Ты держишься уже ${streak} ${daysLabel(streak)} подряд` : '🔥 Начни свой путь сегодня',
    aiComment,
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
