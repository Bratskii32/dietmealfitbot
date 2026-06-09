import { Router, Response } from 'express';
import { db } from '../db/schema.js';
import { AuthRequest } from '../middleware/auth.js';
import { chatWithDietitian } from '../services/claude.js';

const router = Router();
const FREE_DAILY_LIMIT = 3;

function getToday(): string {
  return new Date().toISOString().split('T')[0];
}

function getQueryCount(telegramId: string): number {
  const today = getToday();
  const row = db.prepare('SELECT count FROM daily_queries WHERE telegram_id = ? AND query_date = ?').get(telegramId, today) as
    | { count: number }
    | undefined;
  return row?.count || 0;
}

function incrementQueryCount(telegramId: string) {
  const today = getToday();
  const existing = db.prepare('SELECT id FROM daily_queries WHERE telegram_id = ? AND query_date = ?').get(telegramId, today);

  if (existing) {
    db.prepare('UPDATE daily_queries SET count = count + 1 WHERE telegram_id = ? AND query_date = ?').run(telegramId, today);
  } else {
    db.prepare('INSERT INTO daily_queries (telegram_id, query_date, count) VALUES (?, ?, 1)').run(telegramId, today);
  }
}

router.get('/messages', (req: AuthRequest, res: Response) => {
  const messages = db.prepare(`
    SELECT role, content, created_at FROM chat_messages
    WHERE telegram_id = ? ORDER BY created_at ASC
  `).all(req.telegramId);

  const user = db.prepare('SELECT is_premium FROM users WHERE telegram_id = ?').get(req.telegramId) as
    | { is_premium: number }
    | undefined;

  const isPremium = !!user?.is_premium;
  const used = getQueryCount(req.telegramId!);
  const remaining = isPremium ? -1 : Math.max(0, FREE_DAILY_LIMIT - used);

  res.json({ messages, remaining, limit: FREE_DAILY_LIMIT, isPremium });
});

router.post('/send', async (req: AuthRequest, res: Response) => {
  const { message } = req.body;
  if (!message?.trim()) {
    return res.status(400).json({ error: 'Сообщение пустое' });
  }

  const user = db.prepare('SELECT * FROM users WHERE telegram_id = ?').get(req.telegramId) as Record<string, unknown> | undefined;
  if (!user) {
    return res.status(404).json({ error: 'Пользователь не найден' });
  }

  const isPremium = !!user.is_premium;
  const used = getQueryCount(req.telegramId!);

  if (!isPremium && used >= FREE_DAILY_LIMIT) {
    return res.status(429).json({
      error: 'Лимит бесплатных запросов исчерпан',
      remaining: 0,
      limit: FREE_DAILY_LIMIT,
    });
  }

  try {
    const history = db.prepare(`
      SELECT role, content FROM chat_messages
      WHERE telegram_id = ? ORDER BY created_at ASC LIMIT 20
    `).all(req.telegramId) as { role: string; content: string }[];

    const profile = {
      name: user.name as string,
      age: user.age as number,
      gender: user.gender as string,
      height: user.height as number,
      weight: user.weight as number,
      goal: user.goal as string,
      activityLevel: user.activity_level as string,
      mealsPerDay: user.meals_per_day as number,
      allergies: user.allergies ? JSON.parse(user.allergies as string) : [],
    };

    const reply = await chatWithDietitian(profile, message, history);

    db.prepare('INSERT INTO chat_messages (telegram_id, role, content) VALUES (?, ?, ?)').run(
      req.telegramId, 'user', message
    );
    db.prepare('INSERT INTO chat_messages (telegram_id, role, content) VALUES (?, ?, ?)').run(
      req.telegramId, 'assistant', reply
    );

    if (!isPremium) {
      incrementQueryCount(req.telegramId!);
    }

    const newUsed = isPremium ? 0 : getQueryCount(req.telegramId!);
    const remaining = isPremium ? -1 : Math.max(0, FREE_DAILY_LIMIT - newUsed);

    res.json({ reply, remaining, limit: FREE_DAILY_LIMIT, isPremium });
  } catch (error) {
    console.error('Chat error:', error);
    res.status(503).json({ error: 'Попробуй через минуту' });
  }
});

export default router;
