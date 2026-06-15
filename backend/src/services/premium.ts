import { UserRow } from '../db/types.js';
import {
  getUser,
  expirePremium,
  markPremiumExpiryNotified,
} from '../db/repository.js';
import { getBot } from '../bot/instance.js';

export function isPremiumActive(user: UserRow | undefined): boolean {
  if (!user?.is_premium) return false;
  if (!user.premium_until) return false;
  return new Date(user.premium_until) > new Date();
}

export async function resolvePremiumUser(telegramId: string): Promise<{
  user: UserRow | undefined;
  isPremium: boolean;
}> {
  const user = await getUser(telegramId);
  if (!user) return { user: undefined, isPremium: false };

  if (user.is_premium && user.premium_until && new Date(user.premium_until) <= new Date()) {
    const wasNotified = user.premium_expiry_notified;
    await expirePremium(telegramId);
    if (!wasNotified) {
      await notifyPremiumExpired(telegramId);
      await markPremiumExpiryNotified(telegramId);
    }
    const updated = await getUser(telegramId);
    return { user: updated, isPremium: false };
  }

  return { user, isPremium: isPremiumActive(user) };
}

export function getPremiumDaysLeft(premiumUntil?: string): number {
  if (!premiumUntil) return 0;
  const diff = new Date(premiumUntil).getTime() - Date.now();
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
}

export async function notifyPremiumActivated(telegramId: string, expiresAt: string) {
  const bot = getBot();
  if (!bot) return;
  const date = new Date(expiresAt).toLocaleDateString('ru-RU', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
  await bot.sendMessage(
    Number(telegramId),
    `🎉 Premium активирован!\nДоступ открыт до ${date}.`,
    {
      reply_markup: {
        inline_keyboard: [[{ text: '🥗 Открыть приложение', web_app: { url: frontendUrl } }]],
      },
    }
  );
}

export async function notifyPremiumExpired(telegramId: string) {
  const bot = getBot();
  if (!bot) return;
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
  await bot.sendMessage(
    Number(telegramId),
    '⚠️ Твоя подписка Premium истекла.\nПродли, чтобы сохранить доступ к полному рациону.',
    {
      reply_markup: {
        inline_keyboard: [[{ text: '⭐ Продлить подписку', web_app: { url: frontendUrl } }]],
      },
    }
  );
}

export async function notifyPremiumCancelled(telegramId: string) {
  const bot = getBot();
  if (!bot) return;
  await bot.sendMessage(
    Number(telegramId),
    'ℹ️ Подписка Premium отменена. Бесплатный доступ сохранён.'
  );
}

export async function notifySubscriptionCancelled(telegramId: string, expiresAt: string) {
  const bot = getBot();
  if (!bot) return;
  const date = new Date(expiresAt).toLocaleDateString('ru-RU', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
  await bot.sendMessage(
    Number(telegramId),
    `Подписка отменена. Доступ сохраняется до ${date}.\nНадеемся увидеть тебя снова! 🙏`
  );
}
