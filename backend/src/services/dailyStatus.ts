import { UserRow } from '../db/types.js';
import {
  generatePeriodStatus,
  getDefaultPeriodStatus,
  getMoscowHour,
  getStatusPeriod,
} from './claude.js';
import { setPeriodStatus } from '../db/repository.js';

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

function getCachedPeriodStatus(
  user: UserRow,
  period: 'morning' | 'day' | 'evening',
  today: string
): string | null {
  if (user.status_date !== today) return null;
  if (period === 'morning') return user.status_morning || null;
  if (period === 'day') return user.status_day || null;
  return user.status_evening || null;
}

export async function getOrCreatePeriodStatus(user: UserRow): Promise<string> {
  const today = getTodayMoscow();
  const period = getStatusPeriod(getMoscowHour());

  const cached = getCachedPeriodStatus(user, period, today);
  if (cached) return cached;

  const name = user.name || user.first_name || 'друг';
  const goal = user.goal || 'maintain';
  const dayOfWeek = getMoscowDayOfWeek();

  try {
    const status = await generatePeriodStatus({ name, goal, dayOfWeek, period });
    await setPeriodStatus(user.telegram_id, period, status, today);
    return status;
  } catch {
    const fallback = getDefaultPeriodStatus(name, period);
    await setPeriodStatus(user.telegram_id, period, fallback, today);
    return fallback;
  }
}

export async function getOrCreateDailyStatus(user: UserRow): Promise<string> {
  return getOrCreatePeriodStatus(user);
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
