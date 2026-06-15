import cron from 'node-cron';
import { getBot } from '../bot/instance.js';
import { getUsersWithPlansForReminders } from '../db/repository.js';
import { WeekPlan } from './claude.js';

const frontendUrl = () => process.env.FRONTEND_URL || 'http://localhost:5173';

function getTodayBreakfast(plan: WeekPlan): { name: string; calories: number } | null {
  const day = plan.days?.[0];
  const breakfast = day?.meals?.find((m) => m.type === 'breakfast');
  if (!breakfast?.recipe) return null;
  return { name: breakfast.recipe.name, calories: breakfast.recipe.calories || 0 };
}

async function sendMorningReminders() {
  const bot = getBot();
  if (!bot) return;

  const users = await getUsersWithPlansForReminders();
  for (const user of users) {
    try {
      const plan = (typeof user.plan_data === 'string'
        ? JSON.parse(user.plan_data)
        : user.plan_data) as WeekPlan;
      const breakfast = getTodayBreakfast(plan);
      if (!breakfast) continue;

      await bot.sendMessage(
        Number(user.telegram_id),
        `🌅 Доброе утро, ${user.name}!\nТвой завтрак сегодня: ${breakfast.name} (${breakfast.calories} ккал)`,
        {
          reply_markup: {
            inline_keyboard: [[{ text: 'Открыть рацион →', web_app: { url: frontendUrl() } }]],
          },
        }
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
      await bot.sendMessage(
        Number(user.telegram_id),
        `🌙 Как прошёл день, ${user.name}?\nНе забудь отметить что поел в приложении!`,
        {
          reply_markup: {
            inline_keyboard: [[{ text: '🥗 Открыть приложение', web_app: { url: frontendUrl() } }]],
          },
        }
      );
    } catch (err) {
      console.error('Evening reminder error:', user.telegram_id, err);
    }
  }
}

export function startReminderCron() {
  cron.schedule('0 9 * * *', sendMorningReminders, { timezone: 'Europe/Moscow' });
  cron.schedule('0 20 * * *', sendEveningReminders, { timezone: 'Europe/Moscow' });
  console.log('Напоминания настроены: 09:00 и 20:00 МСК');
}
