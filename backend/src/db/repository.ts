import { UserRow, ChatMessageRow, WeekPlanRow } from './types.js';
import { getDb, persist, now } from './store.js';

export async function getUser(telegramId: string): Promise<UserRow | undefined> {
  return getDb().data.users.find((u) => u.telegram_id === telegramId);
}

export async function saveOnboarding(
  telegramId: string,
  data: {
    name: string;
    age: number;
    gender: string;
    height: number;
    weight: number;
    goal: string;
    activityLevel: string;
    mealsPerDay: number;
    allergies: string[];
  }
): Promise<void> {
  const db = getDb();
  const existing = db.data.users.find((u) => u.telegram_id === telegramId);
  const timestamp = now();

  if (existing) {
    Object.assign(existing, {
      name: data.name,
      age: data.age,
      gender: data.gender,
      height: data.height,
      weight: data.weight,
      goal: data.goal,
      activity_level: data.activityLevel,
      meals_per_day: data.mealsPerDay,
      allergies: data.allergies || [],
      onboarding_complete: 1,
      updated_at: timestamp,
    });
  } else {
    db.data.users.push({
      telegram_id: telegramId,
      name: data.name,
      age: data.age,
      gender: data.gender,
      height: data.height,
      weight: data.weight,
      goal: data.goal,
      activity_level: data.activityLevel,
      meals_per_day: data.mealsPerDay,
      allergies: data.allergies || [],
      onboarding_complete: 1,
      created_at: timestamp,
      updated_at: timestamp,
    });
  }
  await persist();
}

export async function acceptConsent(telegramId: string, firstName?: string): Promise<boolean> {
  const db = getDb();
  let user = db.data.users.find((u) => u.telegram_id === telegramId);
  const isFirstAccept = !user?.consent_accepted;
  const timestamp = now();

  if (user) {
    user.consent_accepted = 1;
    user.updated_at = timestamp;
    if (firstName && !user.first_name) user.first_name = firstName;
  } else {
    db.data.users.push({
      telegram_id: telegramId,
      first_name: firstName,
      consent_accepted: 1,
      created_at: timestamp,
      updated_at: timestamp,
    });
  }
  await persist();
  return isFirstAccept;
}

export async function markPdfGiftSent(telegramId: string): Promise<void> {
  const user = getDb().data.users.find((u) => u.telegram_id === telegramId);
  if (user) {
    user.pdf_gift_sent = 1;
    user.updated_at = now();
    await persist();
  }
}

export function hasConsent(user: UserRow | undefined): boolean {
  return !!user?.consent_accepted;
}

export function isPremiumUser(user: UserRow | undefined): boolean {
  if (!user?.is_premium) return false;
  if (!user.premium_until) return false;
  return new Date(user.premium_until) > new Date();
}

export function getWeekStartMonday(): string {
  const d = new Date();
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d.toISOString().split('T')[0];
}

export async function expirePremium(telegramId: string): Promise<void> {
  const user = getDb().data.users.find((u) => u.telegram_id === telegramId);
  if (user) {
    user.is_premium = 0;
    user.premium_until = undefined;
    user.updated_at = now();
    await persist();
  }
}

export async function markPremiumExpiryNotified(telegramId: string): Promise<void> {
  const user = getDb().data.users.find((u) => u.telegram_id === telegramId);
  if (user) {
    user.premium_expiry_notified = 1;
    await persist();
  }
}

export async function activateProdamusPremium(telegramId: string, days = 30): Promise<string> {
  const db = getDb();
  let user = db.data.users.find((u) => u.telegram_id === telegramId);
  const premiumUntil = new Date();
  premiumUntil.setDate(premiumUntil.getDate() + days);
  const untilStr = premiumUntil.toISOString();

  if (user) {
    user.is_premium = 1;
    user.premium_until = untilStr;
    user.premium_expiry_notified = 0;
    user.updated_at = now();
  } else {
    db.data.users.push({
      telegram_id: telegramId,
      is_premium: 1,
      premium_until: untilStr,
      premium_expiry_notified: 0,
      created_at: now(),
      updated_at: now(),
    });
  }
  await persist();
  return untilStr;
}

export function getSnackAdviceCount(user: UserRow | undefined): number {
  return user?.snack_advice_count || 0;
}

export async function incrementSnackAdvice(telegramId: string): Promise<number> {
  const user = getDb().data.users.find((u) => u.telegram_id === telegramId);
  if (user) {
    user.snack_advice_count = (user.snack_advice_count || 0) + 1;
    user.updated_at = now();
    await persist();
    return user.snack_advice_count;
  }
  return 0;
}

export function getWeeklyChatCount(user: UserRow | undefined): number {
  if (!user) return 0;
  const weekStart = getWeekStartMonday();
  if (user.chat_week_start !== weekStart) return 0;
  return user.chat_week_count || 0;
}

export async function incrementWeeklyChat(telegramId: string): Promise<number> {
  const db = getDb();
  const user = db.data.users.find((u) => u.telegram_id === telegramId);
  if (!user) return 0;
  const weekStart = getWeekStartMonday();
  if (user.chat_week_start !== weekStart) {
    user.chat_week_start = weekStart;
    user.chat_week_count = 1;
  } else {
    user.chat_week_count = (user.chat_week_count || 0) + 1;
  }
  user.updated_at = now();
  await persist();
  return user.chat_week_count || 0;
}

export async function setDailyStatus(telegramId: string, status: string, date: string): Promise<void> {
  const user = getDb().data.users.find((u) => u.telegram_id === telegramId);
  if (user) {
    user.daily_status = status;
    user.daily_status_date = date;
    await persist();
  }
}

export async function setProgressComment(telegramId: string, comment: string, date: string): Promise<void> {
  const user = getDb().data.users.find((u) => u.telegram_id === telegramId);
  if (user) {
    user.progress_ai_comment = comment;
    user.progress_ai_comment_date = date;
    await persist();
  }
}

export async function updateMealInPlan(
  telegramId: string,
  dayNumber: number,
  mealType: string,
  newRecipe: Record<string, unknown>,
  reason: string
): Promise<void> {
  const planRow = await getLatestPlan(telegramId);
  if (!planRow) return;
  const plan = JSON.parse(planRow.plan_data);
  const day = plan.days?.find((d: { dayNumber: number }) => d.dayNumber === dayNumber);
  if (!day) return;
  const meal = day.meals?.find((m: { type: string }) => m.type === mealType);
  if (!meal) return;
  meal.recipe = { ...newRecipe, replaceReason: reason };
  planRow.plan_data = JSON.stringify(plan);
  await persist();
}

export async function getLatestPlan(telegramId: string): Promise<WeekPlanRow | undefined> {
  const plans = getDb().data.week_plans
    .filter((p) => p.telegram_id === telegramId)
    .sort((a, b) => b.created_at.localeCompare(a.created_at));
  return plans[0];
}

export async function insertPlan(telegramId: string, planData: string): Promise<void> {
  const db = getDb();
  db.data.counters.week_plans += 1;
  db.data.week_plans.push({
    id: db.data.counters.week_plans,
    telegram_id: telegramId,
    plan_data: planData,
    created_at: now(),
  });
  await persist();
}

export async function updateUserLastPlanRefresh(telegramId: string, date: string): Promise<void> {
  const user = getDb().data.users.find((u) => u.telegram_id === telegramId);
  if (user) {
    user.last_plan_refresh = date;
    user.updated_at = now();
    await persist();
  }
}

export async function getQueryCount(telegramId: string, queryDate: string): Promise<number> {
  const row = getDb().data.daily_queries.find(
    (q) => q.telegram_id === telegramId && q.query_date === queryDate
  );
  return row?.count || 0;
}

export async function incrementQueryCount(telegramId: string, queryDate: string): Promise<void> {
  const db = getDb();
  const existing = db.data.daily_queries.find(
    (q) => q.telegram_id === telegramId && q.query_date === queryDate
  );
  if (existing) {
    existing.count += 1;
  } else {
    db.data.counters.daily_queries += 1;
    db.data.daily_queries.push({
      id: db.data.counters.daily_queries,
      telegram_id: telegramId,
      query_date: queryDate,
      count: 1,
    });
  }
  await persist();
}

export async function getChatMessages(telegramId: string): Promise<ChatMessageRow[]> {
  return getDb().data.chat_messages
    .filter((m) => m.telegram_id === telegramId)
    .sort((a, b) => a.created_at.localeCompare(b.created_at));
}

export async function getChatHistory(telegramId: string, limit = 20): Promise<{ role: string; content: string }[]> {
  const messages = await getChatMessages(telegramId);
  return messages.slice(-limit).map((m) => ({ role: m.role, content: m.content }));
}

export async function insertChatMessage(
  telegramId: string,
  role: string,
  content: string
): Promise<void> {
  const db = getDb();
  db.data.counters.chat_messages += 1;
  db.data.chat_messages.push({
    id: db.data.counters.chat_messages,
    telegram_id: telegramId,
    role,
    content,
    created_at: now(),
  });
  await persist();
}

export async function insertCookedRecipe(telegramId: string, recipeName: string): Promise<void> {
  const db = getDb();
  db.data.counters.cooked_recipes += 1;
  db.data.cooked_recipes.push({
    id: db.data.counters.cooked_recipes,
    telegram_id: telegramId,
    recipe_name: recipeName,
    cooked_at: now(),
  });
  await persist();
}

export async function getWeightLog(telegramId: string): Promise<{ weight: number; log_date: string }[]> {
  return getDb().data.weight_log
    .filter((w) => w.telegram_id === telegramId)
    .sort((a, b) => a.log_date.localeCompare(b.log_date))
    .map((w) => ({ weight: w.weight, log_date: w.log_date }));
}

export async function getCookedCount(telegramId: string): Promise<number> {
  return getDb().data.cooked_recipes.filter((r) => r.telegram_id === telegramId).length;
}

export async function getCookedDates(telegramId: string): Promise<string[]> {
  const dates = new Set<string>();
  for (const r of getDb().data.cooked_recipes) {
    if (r.telegram_id === telegramId) {
      dates.add(r.cooked_at.split('T')[0]);
    }
  }
  return Array.from(dates).sort((a, b) => b.localeCompare(a));
}

export async function upsertWeight(telegramId: string, weight: number, logDate: string): Promise<void> {
  const db = getDb();
  const existing = db.data.weight_log.find(
    (w) => w.telegram_id === telegramId && w.log_date === logDate
  );
  if (existing) {
    existing.weight = weight;
  } else {
    db.data.counters.weight_log += 1;
    db.data.weight_log.push({
      id: db.data.counters.weight_log,
      telegram_id: telegramId,
      weight,
      log_date: logDate,
      created_at: now(),
    });
  }
  const user = db.data.users.find((u) => u.telegram_id === telegramId);
  if (user) {
    user.weight = weight;
    user.updated_at = now();
  }
  await persist();
}

export async function activatePremium(telegramId: string, premiumUntil: string): Promise<void> {
  const db = getDb();
  const user = db.data.users.find((u) => u.telegram_id === telegramId);
  if (user) {
    user.is_premium = 1;
    user.premium_until = premiumUntil;
    user.premium_expiry_notified = 0;
    user.updated_at = now();
  }
  await persist();
}

export async function upsertPremiumUser(
  telegramId: string,
  firstName: string,
  premiumUntil: string
): Promise<void> {
  const db = getDb();
  const existing = db.data.users.find((u) => u.telegram_id === telegramId);
  if (existing) {
    existing.is_premium = 1;
    existing.premium_until = premiumUntil;
    existing.updated_at = now();
  } else {
    const timestamp = now();
    db.data.users.push({
      telegram_id: telegramId,
      first_name: firstName,
      is_premium: 1,
      premium_until: premiumUntil,
      created_at: timestamp,
      updated_at: timestamp,
    });
  }
  await persist();
}

export async function deleteUserData(telegramId: string): Promise<void> {
  const db = getDb();
  db.data.users = db.data.users.filter((u) => u.telegram_id !== telegramId);
  db.data.week_plans = db.data.week_plans.filter((p) => p.telegram_id !== telegramId);
  db.data.chat_messages = db.data.chat_messages.filter((m) => m.telegram_id !== telegramId);
  db.data.daily_queries = db.data.daily_queries.filter((q) => q.telegram_id !== telegramId);
  db.data.weight_log = db.data.weight_log.filter((w) => w.telegram_id !== telegramId);
  db.data.cooked_recipes = db.data.cooked_recipes.filter((r) => r.telegram_id !== telegramId);
  await persist();
}

export function parseAllergies(user: UserRow): string[] {
  if (Array.isArray(user.allergies)) return user.allergies;
  if (typeof user.allergies === 'string') {
    try {
      return JSON.parse(user.allergies);
    } catch {
      return [];
    }
  }
  return [];
}
