import { Router, Response } from 'express';
import {
  incrementWeeklyChat,
  getWeeklyQueryCount,
  getChatMessages,
  getChatHistory,
  insertChatMessage,
  parseAllergies,
  logEvent,
} from '../db/repository.js';
import { AuthRequest } from '../middleware/auth.js';
import { chatWithDietitian } from '../services/claude.js';
import { FREEMIUM } from '../config/freemium.js';
import { resolvePremiumUser } from '../services/premium.js';
import { handleClaudeError, serviceUnavailableResponse } from '../services/claudeErrors.js';

const router = Router();
const WEEKLY_LIMIT = FREEMIUM.FREE_CHAT_WEEKLY;

router.get('/messages', async (req: AuthRequest, res: Response) => {
  const messages = await getChatMessages(req.telegramId!);
  const { isPremium } = await resolvePremiumUser(req.telegramId!);
  const used = await getWeeklyQueryCount(req.telegramId!);
  const remaining = isPremium ? -1 : Math.max(0, WEEKLY_LIMIT - used);

  res.json({
    messages: messages.map((m) => ({
      role: m.role,
      content: m.content,
      created_at: m.created_at,
    })),
    remaining,
    limit: WEEKLY_LIMIT,
    isPremium,
    weeklyUsed: used,
  });
});

router.post('/send', async (req: AuthRequest, res: Response) => {
  const { message } = req.body;
  if (!message?.trim()) {
    return res.status(400).json({ error: 'Сообщение пустое' });
  }

  const { isPremium, user } = await resolvePremiumUser(req.telegramId!);
  if (!user) {
    return res.status(404).json({ error: 'Пользователь не найден' });
  }

  const used = await getWeeklyQueryCount(req.telegramId!);

  if (!isPremium && used >= WEEKLY_LIMIT) {
    return res.status(429).json({
      error: 'premium_required',
      message: 'Лимит запросов в чате на этой неделе исчерпан',
      remaining: 0,
      limit: WEEKLY_LIMIT,
      weeklyUsed: used,
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
    await logEvent(req.telegramId!, 'chat_message_sent');

    let newUsed = used;
    if (!isPremium) {
      newUsed = await incrementWeeklyChat(req.telegramId!);
    }

    const remaining = isPremium ? -1 : Math.max(0, WEEKLY_LIMIT - newUsed);

    res.json({
      reply,
      remaining,
      limit: WEEKLY_LIMIT,
      isPremium,
      weeklyUsed: newUsed,
    });
  } catch (error) {
    try {
      handleClaudeError(error);
    } catch {
      return serviceUnavailableResponse(res);
    }
  }
});

export default router;
