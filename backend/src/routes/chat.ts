import { Router, Response } from 'express';
import {
  getUser,
  getQueryCount,
  incrementQueryCount,
  getChatMessages,
  getChatHistory,
  insertChatMessage,
  parseAllergies,
  isPremiumUser,
} from '../db/repository.js';
import { AuthRequest } from '../middleware/auth.js';
import { chatWithDietitian } from '../services/claude.js';
import { FREEMIUM } from '../config/freemium.js';

const router = Router();
const FREE_DAILY_LIMIT = FREEMIUM.FREE_CHAT_DAILY;

function getToday(): string {
  return new Date().toISOString().split('T')[0];
}

router.get('/messages', async (req: AuthRequest, res: Response) => {
  const messages = await getChatMessages(req.telegramId!);
  const user = await getUser(req.telegramId!);

  const isPremium = isPremiumUser(user);
  const used = await getQueryCount(req.telegramId!, getToday());
  const remaining = isPremium ? -1 : Math.max(0, FREE_DAILY_LIMIT - used);

  res.json({
    messages: messages.map((m) => ({
      role: m.role,
      content: m.content,
      created_at: m.created_at,
    })),
    remaining,
    limit: FREE_DAILY_LIMIT,
    isPremium,
  });
});

router.post('/send', async (req: AuthRequest, res: Response) => {
  const { message } = req.body;
  if (!message?.trim()) {
    return res.status(400).json({ error: 'Сообщение пустое' });
  }

  const user = await getUser(req.telegramId!);
  if (!user) {
    return res.status(404).json({ error: 'Пользователь не найден' });
  }

  const isPremium = isPremiumUser(user);
  const today = getToday();
  const used = await getQueryCount(req.telegramId!, today);

  if (!isPremium && used >= FREE_DAILY_LIMIT) {
    return res.status(429).json({
      error: 'premium_required',
      message: 'Лимит бесплатных запросов исчерпан',
      remaining: 0,
      limit: FREE_DAILY_LIMIT,
    });
  }

  try {
    const history = await getChatHistory(req.telegramId!);

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
    };

    const reply = await chatWithDietitian(profile, message, history);

    await insertChatMessage(req.telegramId!, 'user', message);
    await insertChatMessage(req.telegramId!, 'assistant', reply);

    if (!isPremium) {
      await incrementQueryCount(req.telegramId!, today);
    }

    const newUsed = isPremium ? 0 : await getQueryCount(req.telegramId!, today);
    const remaining = isPremium ? -1 : Math.max(0, FREE_DAILY_LIMIT - newUsed);

    res.json({ reply, remaining, limit: FREE_DAILY_LIMIT, isPremium });
  } catch (error) {
    console.error('Chat error:', error);
    res.status(503).json({ error: 'Попробуй через минуту' });
  }
});

export default router;
