export const FREEMIUM = {
  FREE_DAYS: 3,
  PREMIUM_DAYS: 7,
  FREE_SNACK_ADVICE_TOTAL: 3,
  FREE_CHAT_WEEKLY: 3,
} as const;

export const PRODAMUS_PAY_URL =
  process.env.PRODAMUS_PAY_URL || 'https://prodamus.ru/ЗАМЕНИ';

export const PREMIUM_DAYS_DURATION = 30;
