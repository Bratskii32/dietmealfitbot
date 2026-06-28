import { getBot } from '../bot/instance.js';
import {
  getUser,
  getCookedCount,
  hasAchievement,
  unlockAchievement,
  setAchievementReward,
  createPromoCode,
  logEvent,
  wasEventLoggedToday,
} from '../db/repository.js';
import { UserRow } from '../db/types.js';
import { generateAchievementReward } from './claude.js';
import { isPremiumActive } from './premium.js';
import { wasActiveRecently } from './dailyStatus.js';

const frontendUrl = () => process.env.FRONTEND_URL || 'http://localhost:5173';

export const ACHIEVEMENT_META: Record<
  string,
  { title: string; description: string; needsClaude: boolean; staticReward?: string }
> = {
  first_steps: {
    title: '🔥 Первые шаги',
    description: 'Ты начал путь к здоровому питанию',
    needsClaude: false,
    staticReward: 'Добро пожаловать! Ты на правильном пути — каждый день с планом приближает к цели 💪',
  },
  cook_3: {
    title: '🍳 Повар недели',
    description: 'Приготовил 3 рецепта',
    needsClaude: true,
  },
  streak_3: {
    title: '⭐ 3 дня подряд',
    description: '3 дня подряд с планом',
    needsClaude: true,
  },
  streak_7: {
    title: '💪 Неделя здоровья',
    description: '7 дней подряд',
    needsClaude: true,
  },
  streak_14: {
    title: '🏆 Марафонец',
    description: '14 дней подряд',
    needsClaude: true,
  },
  streak_30: {
    title: '👑 Чемпион питания',
    description: '30 дней подряд',
    needsClaude: false,
  },
};

const STREAK_THRESHOLDS = [
  { key: 'streak_3', min: 3 },
  { key: 'streak_7', min: 7 },
  { key: 'streak_14', min: 14 },
  { key: 'streak_30', min: 30 },
];

async function notifyAchievement(telegramId: string, title: string, rewardContent: string) {
  const bot = getBot();
  if (!bot) return;
  if (wasActiveRecently((await getUser(telegramId))?.last_seen_at)) return;

  await bot.sendMessage(
    Number(telegramId),
    `🎉 Новое достижение: ${title}!\n${rewardContent}`,
    {
      reply_markup: {
        inline_keyboard: [[{ text: 'Смотреть все достижения →', web_app: { url: frontendUrl() } }]],
      },
    }
  );
}

async function unlockOne(
  telegramId: string,
  key: string,
  user: UserRow
): Promise<boolean> {
  if (await hasAchievement(telegramId, key)) return false;

  const meta = ACHIEVEMENT_META[key];
  if (!meta) return false;

  let reward = meta.staticReward || '';

  if (key === 'streak_30') {
    const promoCode = `LOYAL_${telegramId}`;
    try {
      await createPromoCode({ code: promoCode, days: 30, maxUses: 1, expiresAt: null });
      reward = `🎁 Твой персональный промокод: ${promoCode}\n+30 дней Premium! Активируй в настройках приложения.`;
    } catch {
      reward = `🎁 Промокод: ${promoCode} (+30 дней Premium)`;
    }
  } else if (meta.needsClaude) {
    try {
      reward = await generateAchievementReward(key, user);
    } catch {
      reward = meta.description;
    }
  }

  const unlocked = await unlockAchievement(telegramId, key, reward || null);
  if (!unlocked) return false;

  if (meta.needsClaude && reward) {
    await setAchievementReward(telegramId, key, reward);
  }

  await notifyAchievement(telegramId, meta.title, reward || meta.description);
  return true;
}

async function sendSituationalNudges(telegramId: string, streak: number, user: UserRow) {
  const bot = getBot();
  if (!bot || !user.notifications_enabled) return;
  if (wasActiveRecently(user.last_seen_at)) return;

  let nextStreak: (typeof STREAK_THRESHOLDS)[number] | undefined;
  for (const t of STREAK_THRESHOLDS) {
    if (streak < t.min && !(await hasAchievement(telegramId, t.key))) {
      nextStreak = t;
      break;
    }
  }
  if (nextStreak && nextStreak.min - streak === 2) {
    if (!(await wasEventLoggedToday(telegramId, 'streak_nudge_sent'))) {
      await bot.sendMessage(
        Number(telegramId),
        '⭐ Ещё 2 дня — и откроется бонусный рецепт!\nДержись 💪'
      );
      await logEvent(telegramId, 'streak_nudge_sent');
    }
  }

  if (
    user.premium_until &&
    !user.is_lifetime_premium &&
    isPremiumActive(user)
  ) {
    const daysLeft = Math.ceil(
      (new Date(user.premium_until).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
    );
    if (daysLeft === 3 && !(await wasEventLoggedToday(telegramId, 'premium_expiry_nudge_sent'))) {
      await bot.sendMessage(
        Number(telegramId),
        '⚠️ Premium заканчивается через 3 дня.\nПродли подписку в приложении →',
        {
          reply_markup: {
            inline_keyboard: [[{ text: '⭐ Продлить', web_app: { url: frontendUrl() } }]],
          },
        }
      );
      await logEvent(telegramId, 'premium_expiry_nudge_sent');
    }
  }
}

export async function checkAchievements(
  telegramId: string,
  options: { isFirstLogin?: boolean } = {}
): Promise<void> {
  const user = await getUser(telegramId);
  if (!user?.onboarding_complete) return;

  const cookedCount = await getCookedCount(telegramId);
  const streak = user.streak_count ?? 0;

  if (options.isFirstLogin) {
    await unlockOne(telegramId, 'first_steps', user);
  }

  if (cookedCount >= 3) await unlockOne(telegramId, 'cook_3', user);
  if (streak >= 3) await unlockOne(telegramId, 'streak_3', user);
  if (streak >= 7) await unlockOne(telegramId, 'streak_7', user);
  if (streak >= 14) await unlockOne(telegramId, 'streak_14', user);
  if (streak >= 30) await unlockOne(telegramId, 'streak_30', user);

  await sendSituationalNudges(telegramId, streak, user);
}

export function getAchievementProgress(streak: number, cookedCount: number): {
  key: string;
  title: string;
  description: string;
  unlocked: boolean;
  reward_content: string | null;
  progressText: string | null;
}[] {
  const defs = [
    { key: 'first_steps', check: () => true },
    { key: 'cook_3', check: () => cookedCount >= 3, progress: () => Math.max(0, 3 - cookedCount) },
    { key: 'streak_3', check: () => streak >= 3, progress: () => Math.max(0, 3 - streak) },
    { key: 'streak_7', check: () => streak >= 7, progress: () => Math.max(0, 7 - streak) },
    { key: 'streak_14', check: () => streak >= 14, progress: () => Math.max(0, 14 - streak) },
    { key: 'streak_30', check: () => streak >= 30, progress: () => Math.max(0, 30 - streak) },
  ];

  return defs.map((d) => {
    const meta = ACHIEVEMENT_META[d.key];
    const unlocked = d.check();
    const remaining = !unlocked && d.progress ? d.progress() : 0;
    return {
      key: d.key,
      title: meta.title,
      description: meta.description,
      unlocked,
      reward_content: null,
      progressText:
        !unlocked && remaining > 0
          ? `Ещё ${remaining} ${remaining === 1 ? 'день' : remaining < 5 ? 'дня' : 'дней'} до награды 🍰`
          : null,
    };
  });
}
