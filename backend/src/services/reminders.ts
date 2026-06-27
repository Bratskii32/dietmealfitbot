import cron from 'node-cron';
import { getBot } from '../bot/instance.js';
import { getUsersWithPlansForReminders, getUser } from '../db/repository.js';
import { WeekPlan } from './claude.js';
import {
  getPlanDayIndexForToday,
  getBreakfastForPlanDay,
  getDinnerForPlanDay,
} from './planDay.js';
import {
  getOrCreateDailyStatus,
  wasActiveRecently,
  visitedAfterSixPMMoscow,
  getTodayMoscow,
} from './dailyStatus.js';
import { checkAchievements } from './achievements.js';

const frontendUrl = () => process.env.FRONTEND_URL || 'http://localhost:5173';

function appButton() {
  return {
    inline_keyboard: [[{ text: 'Открыть →', web_app: { url: frontendUrl() } }]],
  };
}

async function sendMorningReminders() {
  const bot = getBot();
  if (!bot) return;

  const users = await getUsersWithPlansForReminders();
  const today = getTodayMoscow();

  for (const user of users) {
    try {
      if (wasActiveRecently(user.last_seen_at)) continue;

      const plan = (typeof user.plan_data === 'string'
        ? JSON.parse(user.plan_data)
        : user.plan_data) as WeekPlan;

      const dayIndex = getPlanDayIndexForToday(user.plan_created_at, plan.days?.length || 0);
      if (dayIndex === null) continue;

      const breakfast = getBreakfastForPlanDay(plan, dayIndex);
      if (!breakfast) continue;

      let status = user.status_morning;
      if (!status || user.status_date !== today) {
        const fullUser = await getUser(user.telegram_id);
        if (fullUser) {
          status = await getOrCreateDailyStatus(fullUser);
        }
      }
      status = status || `Доброе утро, ${user.name}!`;

      await bot.sendMessage(
        Number(user.telegram_id),
        `${status}\n🍳 Завтрак: ${breakfast.name} (${breakfast.calories} ккал)`,
        { reply_markup: appButton() }
      );
    } catch (err) {
      console.error('Morning reminder error:', user.telegram_id, err);
    }
  }
}

async function sendEveningReminders() {
  const bot = getBot();
  if (!bot) return;

  const users = await getUsersWithPlansForReminders();

  for (const user of users) {
    try {
      if (wasActiveRecently(user.last_seen_at)) continue;
      if (visitedAfterSixPMMoscow(user.last_seen_at)) continue;

      const plan = (typeof user.plan_data === 'string'
        ? JSON.parse(user.plan_data)
        : user.plan_data) as WeekPlan;

      const dayIndex = getPlanDayIndexForToday(user.plan_created_at, plan.days?.length || 0);
      if (dayIndex === null) continue;

      const dinner = getDinnerForPlanDay(plan, dayIndex);
      if (!dinner) continue;

      await bot.sendMessage(
        Number(user.telegram_id),
        `🌙 Не забудь про ужин, ${user.name}!\n${dinner.name} — ${dinner.calories} ккал`,
        { reply_markup: appButton() }
      );
    } catch (err) {
      console.error('Evening reminder error:', user.telegram_id, err);
    }
  }
}

async function runDailyStreakCheck() {
  const { getUsersForStreakCheck } = await import('../db/repository.js');
  const users = await getUsersForStreakCheck();
  for (const user of users) {
    try {
      if (!user.notifications_enabled) continue;
      await checkAchievements(user.telegram_id);
    } catch (err) {
      console.error('Streak check error:', user.telegram_id, err);
    }
  }
}

export function startReminderCron() {
  cron.schedule('0 9 * * *', sendMorningReminders, { timezone: 'Europe/Moscow' });
  cron.schedule('0 20 * * *', sendEveningReminders, { timezone: 'Europe/Moscow' });
  cron.schedule('0 0 * * *', runDailyStreakCheck, { timezone: 'Europe/Moscow' });
  console.log('Напоминания: 09:00, 20:00, streak 00:00 МСК');
}
