import {
  getUser,
  parseAllergies,
  updateLastSeen,
  hasAchievement,
} from '../db/repository.js';
import { FREEMIUM } from '../config/freemium.js';
import { resolvePremiumUser } from './premium.js';
import { checkAchievements } from './achievements.js';

export async function buildUserMeResponse(telegramId: string) {
  const { user, isPremium } = await resolvePremiumUser(telegramId);
  if (!user) {
    return { exists: false as const };
  }

  const daysAway = await updateLastSeen(telegramId);

  if (user.onboarding_complete && !(await hasAchievement(telegramId, 'first_steps'))) {
    checkAchievements(telegramId, { isFirstLogin: true }).catch(() => {});
  } else {
    checkAchievements(telegramId).catch(() => {});
  }

  return {
    exists: true as const,
    daysAway,
    user: {
      telegramId: user.telegram_id,
      name: user.name,
      email: user.email || null,
      age: user.age,
      gender: user.gender,
      height: user.height,
      weight: user.weight,
      goal: user.goal,
      activityLevel: user.activity_level,
      mealsPerDay: user.meals_per_day,
      allergies: parseAllergies(user),
      isPremium,
      onboardingComplete: !!user.onboarding_complete,
      maxDays: isPremium ? FREEMIUM.PREMIUM_DAYS : FREEMIUM.FREE_DAYS,
      notificationsEnabled: user.notifications_enabled !== 0,
      preferencesPrompted: !!user.preferences_prompted,
      eatingStyle: user.eating_style || null,
      cookingTime: user.cooking_time || null,
    },
  };
}

export async function getUserEmailById(telegramId: string): Promise<string | null> {
  const user = await getUser(telegramId);
  return user?.email || null;
}
