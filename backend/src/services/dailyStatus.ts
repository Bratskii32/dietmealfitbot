import { UserRow } from '../db/types.js';
import {
  generateLiveGreeting,
  getDefaultLiveGreeting,
  getMoscowHour,
  getTimeOfDayLabel,
} from './claude.js';
import { setDailyStatus } from '../db/repository.js';

const DAY_NAMES = ['воскресенье', 'понедельник', 'вторник', 'среда', 'четверг', 'пятница', 'суббота'];

export function getTodayMoscow(): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Moscow' }).format(new Date());
}

function getMoscowDayOfWeek(): string {
  const dayIndex = new Date(
    new Date().toLocaleString('en-US', { timeZone: 'Europe/Moscow' })
  ).getDay();
  return DAY_NAMES[dayIndex];
}

export async function getOrCreateDailyStatus(user: UserRow): Promise<string> {
  const today = getTodayMoscow();
  if (user.daily_status && user.daily_status_date === today) {
    return user.daily_status;
  }

  const hour = getMoscowHour();
  const timeOfDay = getTimeOfDayLabel(hour);
  const name = user.name || user.first_name || 'друг';

  try {
    const status = await generateLiveGreeting({
      name,
      goal: user.goal || 'maintain',
      dayOfWeek: getMoscowDayOfWeek(),
      timeOfDay,
    });
    await setDailyStatus(user.telegram_id, status, today);
    return status;
  } catch {
    const fallback = getDefaultLiveGreeting(name, timeOfDay);
    await setDailyStatus(user.telegram_id, fallback, today);
    return fallback;
  }
}

export function wasActiveRecently(lastSeenAt: string | null | undefined): boolean {
  if (!lastSeenAt) return false;
  return Date.now() - new Date(lastSeenAt).getTime() < 30 * 60 * 1000;
}

export function visitedAfterSixPMMoscow(lastSeenAt: string | null | undefined): boolean {
  if (!lastSeenAt) return false;
  const seenDate = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Moscow' }).format(
    new Date(lastSeenAt)
  );
  const today = getTodayMoscow();
  if (seenDate !== today) return false;
  const hour = parseInt(
    new Intl.DateTimeFormat('en-US', {
      timeZone: 'Europe/Moscow',
      hour: 'numeric',
      hour12: false,
    }).format(new Date(lastSeenAt)),
    10
  );
  return hour >= 18;
}
