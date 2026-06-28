import { getUser } from '../db/repository.js';
import { query, now } from '../db/pool.js';

function getTodayMoscow(): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Moscow' }).format(new Date());
}

function getYesterdayMoscow(): string {
  const [y, m, d] = getTodayMoscow().split('-').map(Number);
  const date = new Date(Date.UTC(y, m - 1, d - 1));
  return date.toISOString().slice(0, 10);
}

export async function updateStreak(telegramId: string): Promise<number> {
  const user = await getUser(telegramId);
  if (!user) return 0;

  const today = getTodayMoscow();
  const yesterday = getYesterdayMoscow();
  const lastActivity = user.last_activity_date ?? null;

  let streakCount = user.streak_count ?? 0;

  if (lastActivity === today) {
    return streakCount;
  }

  if (lastActivity === yesterday) {
    streakCount += 1;
  } else {
    streakCount = 1;
  }

  await query(
    `UPDATE users SET streak_count = $2, last_activity_date = $3, updated_at = $4 WHERE telegram_id = $1`,
    [telegramId, streakCount, today, now()]
  );

  return streakCount;
}
