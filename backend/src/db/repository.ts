import { query, now, getPool } from './pool.js';
import { randomUUID } from 'crypto';
import { UserRow, ChatMessageRow, WeekPlanRow, EventType } from './types.js';

function getTodayMoscow(): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Moscow' }).format(new Date());
}

function getYesterdayMoscow(): string {
  const [y, m, d] = getTodayMoscow().split('-').map(Number);
  const date = new Date(Date.UTC(y, m - 1, d - 1));
  return date.toISOString().slice(0, 10);
}

type DbUser = {
  telegram_id: string;
  first_name: string | null;
  last_name: string | null;
  username: string | null;
  name: string | null;
  age: number | null;
  gender: string | null;
  height: number | null;
  weight: number | null;
  goal: string | null;
  activity_level: string | null;
  meals_per_day: number | null;
  allergies: unknown;
  is_premium: boolean;
  premium_until: Date | null;
  is_lifetime_premium: boolean;
  premium_expiry_notified: boolean;
  subscription_cancelled: boolean;
  daily_status: string | null;
  daily_status_date: string | null;
  status_morning: string | null;
  status_day: string | null;
  status_evening: string | null;
  status_date: string | null;
  progress_ai_comment: string | null;
  progress_ai_comment_date: string | null;
  onboarding_complete: boolean;
  consent_accepted: boolean;
  pdf_gift_sent: boolean;
  last_plan_refresh: string | null;
  notifications_enabled: boolean;
  eating_style: string | null;
  cooking_time: string | null;
  preferences_prompted: boolean;
  email: string | null;
  password_hash: string | null;
  last_seen_at: Date | null;
  streak_count: number;
  last_visit_date: string | null;
  created_at: Date;
  updated_at: Date;
};

function boolToInt(v: boolean | null | undefined): number {
  return v ? 1 : 0;
}

function mapUser(row: DbUser): UserRow {
  return {
    telegram_id: row.telegram_id,
    first_name: row.first_name ?? undefined,
    last_name: row.last_name ?? undefined,
    username: row.username ?? undefined,
    name: row.name ?? undefined,
    age: row.age ?? undefined,
    gender: row.gender ?? undefined,
    height: row.height ?? undefined,
    weight: row.weight ?? undefined,
    goal: row.goal ?? undefined,
    activity_level: row.activity_level ?? undefined,
    meals_per_day: row.meals_per_day ?? undefined,
    allergies: (row.allergies as string[]) ?? [],
    is_premium: boolToInt(row.is_premium),
    premium_until: row.premium_until?.toISOString(),
    is_lifetime_premium: boolToInt(row.is_lifetime_premium),
    premium_expiry_notified: boolToInt(row.premium_expiry_notified),
    subscription_cancelled: boolToInt(row.subscription_cancelled),
    daily_status: row.daily_status ?? undefined,
    daily_status_date: row.daily_status_date ?? undefined,
    status_morning: row.status_morning ?? undefined,
    status_day: row.status_day ?? undefined,
    status_evening: row.status_evening ?? undefined,
    status_date: row.status_date ?? undefined,
    progress_ai_comment: row.progress_ai_comment ?? undefined,
    progress_ai_comment_date: row.progress_ai_comment_date ?? undefined,
    onboarding_complete: boolToInt(row.onboarding_complete),
    consent_accepted: boolToInt(row.consent_accepted),
    pdf_gift_sent: boolToInt(row.pdf_gift_sent),
    last_plan_refresh: row.last_plan_refresh ?? undefined,
    notifications_enabled: boolToInt(row.notifications_enabled ?? true),
    eating_style: row.eating_style ?? undefined,
    cooking_time: row.cooking_time ?? undefined,
    preferences_prompted: boolToInt(row.preferences_prompted ?? false),
    email: row.email ?? undefined,
    last_seen_at: row.last_seen_at?.toISOString(),
    streak_count: row.streak_count ?? 0,
    last_visit_date: row.last_visit_date ?? undefined,
    created_at: row.created_at.toISOString(),
    updated_at: row.updated_at.toISOString(),
  };
}

export async function getUser(telegramId: string): Promise<UserRow | undefined> {
  const { rows } = await query<DbUser>('SELECT * FROM users WHERE telegram_id = $1', [telegramId]);
  return rows[0] ? mapUser(rows[0]) : undefined;
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
  const timestamp = now();
  await query(
    `INSERT INTO users (
      telegram_id, name, age, gender, height, weight, goal,
      activity_level, meals_per_day, allergies, onboarding_complete, created_at, updated_at
    ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,TRUE,$11,$11)
    ON CONFLICT (telegram_id) DO UPDATE SET
      name = EXCLUDED.name, age = EXCLUDED.age, gender = EXCLUDED.gender,
      height = EXCLUDED.height, weight = EXCLUDED.weight, goal = EXCLUDED.goal,
      activity_level = EXCLUDED.activity_level, meals_per_day = EXCLUDED.meals_per_day,
      allergies = EXCLUDED.allergies, onboarding_complete = TRUE, updated_at = EXCLUDED.updated_at`,
    [
      telegramId, data.name, data.age, data.gender, data.height, data.weight,
      data.goal, data.activityLevel, data.mealsPerDay, JSON.stringify(data.allergies || []),
      timestamp,
    ]
  );
}

export async function acceptConsent(telegramId: string, firstName?: string): Promise<boolean> {
  const existing = await getUser(telegramId);
  const isFirstAccept = !existing?.consent_accepted;
  const timestamp = now();

  if (existing) {
    await query(
      `UPDATE users SET consent_accepted = TRUE, updated_at = $2,
       first_name = COALESCE(first_name, $3) WHERE telegram_id = $1`,
      [telegramId, timestamp, firstName || null]
    );
  } else {
    await query(
      `INSERT INTO users (telegram_id, first_name, consent_accepted, created_at, updated_at)
       VALUES ($1, $2, TRUE, $3, $3)`,
      [telegramId, firstName || null, timestamp]
    );
    await logEvent(telegramId, 'user_registered');
  }
  return isFirstAccept;
}

export async function markPdfGiftSent(telegramId: string): Promise<void> {
  await query('UPDATE users SET pdf_gift_sent = TRUE, updated_at = $2 WHERE telegram_id = $1', [
    telegramId, now(),
  ]);
}

export function hasConsent(user: UserRow | undefined): boolean {
  return !!user?.consent_accepted;
}

export function isPremiumUser(user: UserRow | undefined): boolean {
  if (!user) return false;
  if (user.is_lifetime_premium) return true;
  if (user.premium_until && new Date(user.premium_until) > new Date()) return true;
  return false;
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
  await query(
    `UPDATE users SET is_premium = FALSE, premium_until = NULL, updated_at = $2
     WHERE telegram_id = $1 AND (is_lifetime_premium = FALSE OR is_lifetime_premium IS NULL)`,
    [telegramId, now()]
  );
}

export async function markPremiumExpiryNotified(telegramId: string): Promise<void> {
  await query('UPDATE users SET premium_expiry_notified = TRUE WHERE telegram_id = $1', [telegramId]);
}

export async function activateProdamusPremium(telegramId: string, days = 30): Promise<string> {
  const premiumUntil = new Date();
  premiumUntil.setDate(premiumUntil.getDate() + days);
  const untilStr = premiumUntil.toISOString();
  const timestamp = now();

  await query(
    `INSERT INTO users (telegram_id, is_premium, premium_until, premium_expiry_notified, subscription_cancelled, created_at, updated_at)
     VALUES ($1, TRUE, $2, FALSE, FALSE, $3, $3)
     ON CONFLICT (telegram_id) DO UPDATE SET
       is_premium = TRUE, premium_until = $2, premium_expiry_notified = FALSE,
       subscription_cancelled = FALSE, updated_at = $3`,
    [telegramId, untilStr, timestamp]
  );
  return untilStr;
}

export async function cancelSubscription(telegramId: string): Promise<void> {
  await query(
    'UPDATE users SET subscription_cancelled = TRUE, updated_at = $2 WHERE telegram_id = $1',
    [telegramId, now()]
  );
}

export async function getAdviceQueryCount(telegramId: string): Promise<number> {
  const { rows } = await query<{ count: string }>(
    'SELECT COUNT(*)::text AS count FROM advice_queries WHERE telegram_id = $1',
    [telegramId]
  );
  return parseInt(rows[0]?.count || '0', 10);
}

export async function incrementSnackAdvice(telegramId: string): Promise<number> {
  await query('INSERT INTO advice_queries (telegram_id) VALUES ($1)', [telegramId]);
  return getAdviceQueryCount(telegramId);
}

export async function getWeeklyQueryCount(telegramId: string): Promise<number> {
  const weekStart = getWeekStartMonday();
  const { rows } = await query<{ count: number | null }>(
    'SELECT count FROM weekly_queries WHERE telegram_id = $1 AND week_start = $2',
    [telegramId, weekStart]
  );
  return rows[0]?.count || 0;
}

export async function incrementWeeklyChat(telegramId: string): Promise<number> {
  const weekStart = getWeekStartMonday();
  const { rows } = await query<{ count: number }>(
    `INSERT INTO weekly_queries (telegram_id, week_start, count)
     VALUES ($1, $2, 1)
     ON CONFLICT (telegram_id, week_start) DO UPDATE SET count = weekly_queries.count + 1
     RETURNING count`,
    [telegramId, weekStart]
  );
  return rows[0]?.count || 1;
}

export async function setDailyStatus(telegramId: string, status: string, date: string): Promise<void> {
  await query(
    'UPDATE users SET daily_status = $2, daily_status_date = $3 WHERE telegram_id = $1',
    [telegramId, status, date]
  );
}

export async function setPeriodStatus(
  telegramId: string,
  period: 'morning' | 'day' | 'evening',
  status: string,
  date: string
): Promise<void> {
  const column =
    period === 'morning' ? 'status_morning' : period === 'day' ? 'status_day' : 'status_evening';
  await query(`UPDATE users SET ${column} = $2, status_date = $3 WHERE telegram_id = $1`, [
    telegramId,
    status,
    date,
  ]);
}

export async function setProgressComment(telegramId: string, comment: string, date: string): Promise<void> {
  await query(
    'UPDATE users SET progress_ai_comment = $2, progress_ai_comment_date = $3 WHERE telegram_id = $1',
    [telegramId, comment, date]
  );
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
  await query('UPDATE week_plans SET plan_data = $2, shopping_list = NULL, shopping_list_generated_at = NULL WHERE id = $1', [planRow.id, JSON.stringify(plan)]);
}

export async function getLatestPlan(telegramId: string): Promise<WeekPlanRow | undefined> {
  const { rows } = await query<{
    id: number;
    telegram_id: string;
    plan_data: unknown;
    created_at: Date;
    shopping_list: string | null;
    shopping_list_generated_at: Date | null;
  }>(
    `SELECT id, telegram_id, plan_data, created_at, shopping_list, shopping_list_generated_at
     FROM week_plans WHERE telegram_id = $1 AND (is_archived = FALSE OR is_archived IS NULL)
     ORDER BY created_at DESC LIMIT 1`,
    [telegramId]
  );
  if (!rows[0]) return undefined;
  return {
    id: rows[0].id,
    telegram_id: rows[0].telegram_id,
    plan_data: typeof rows[0].plan_data === 'string' ? rows[0].plan_data : JSON.stringify(rows[0].plan_data),
    created_at: rows[0].created_at.toISOString(),
    shopping_list: rows[0].shopping_list ?? undefined,
    shopping_list_generated_at: rows[0].shopping_list_generated_at?.toISOString(),
  };
}

export async function insertPlan(telegramId: string, planData: string, isPremium: boolean): Promise<void> {
  if (isPremium) {
    await query(
      'UPDATE week_plans SET is_archived = TRUE WHERE telegram_id = $1 AND (is_archived = FALSE OR is_archived IS NULL)',
      [telegramId]
    );
  } else {
    await query('DELETE FROM week_plans WHERE telegram_id = $1', [telegramId]);
  }
  await query(
    'INSERT INTO week_plans (telegram_id, plan_data, shopping_list, shopping_list_generated_at, is_archived) VALUES ($1, $2, NULL, NULL, FALSE)',
    [telegramId, planData]
  );
}

export async function getArchivedPlans(telegramId: string): Promise<{ id: number; createdAt: string }[]> {
  const { rows } = await query<{ id: number; created_at: Date }>(
    `SELECT id, created_at FROM week_plans
     WHERE telegram_id = $1 AND is_archived = TRUE
     ORDER BY created_at DESC`,
    [telegramId]
  );
  return rows.map((r) => ({ id: r.id, createdAt: r.created_at.toISOString() }));
}

export async function getArchivedPlan(
  telegramId: string,
  planId: number
): Promise<{ plan_data: string; created_at: string } | undefined> {
  const { rows } = await query<{ plan_data: unknown; created_at: Date }>(
    `SELECT plan_data, created_at FROM week_plans
     WHERE id = $1 AND telegram_id = $2 AND is_archived = TRUE`,
    [planId, telegramId]
  );
  if (!rows[0]) return undefined;
  return {
    plan_data: typeof rows[0].plan_data === 'string' ? rows[0].plan_data : JSON.stringify(rows[0].plan_data),
    created_at: rows[0].created_at.toISOString(),
  };
}

export async function saveShoppingList(planId: number, list: string): Promise<void> {
  await query(
    'UPDATE week_plans SET shopping_list = $2, shopping_list_generated_at = NOW() WHERE id = $1',
    [planId, list]
  );
}

export async function saveMealPreferences(
  telegramId: string,
  eatingStyle: string | null,
  cookingTime: string | null
): Promise<void> {
  await query(
    'UPDATE users SET eating_style = $2, cooking_time = $3, updated_at = $4 WHERE telegram_id = $1',
    [telegramId, eatingStyle, cookingTime, now()]
  );
}

export async function markPreferencesPrompted(telegramId: string): Promise<void> {
  await query(
    'UPDATE users SET preferences_prompted = TRUE, updated_at = $2 WHERE telegram_id = $1',
    [telegramId, now()]
  );
}

export async function updateUserLastPlanRefresh(telegramId: string, date: string): Promise<void> {
  await query('UPDATE users SET last_plan_refresh = $2, updated_at = $3 WHERE telegram_id = $1', [
    telegramId, date, now(),
  ]);
}

export async function updateLastSeen(telegramId: string): Promise<number> {
  const user = await getUser(telegramId);
  const previous = user?.last_seen_at ? new Date(user.last_seen_at) : null;
  const timestamp = now();
  const today = getTodayMoscow();
  const yesterday = getYesterdayMoscow();

  let streakCount = user?.streak_count ?? 0;
  const lastVisit = user?.last_visit_date;

  if (lastVisit !== today) {
    if (lastVisit === yesterday) {
      streakCount += 1;
    } else {
      streakCount = 1;
    }
  }

  await query(
    `UPDATE users SET last_seen_at = $2, updated_at = $2, streak_count = $3, last_visit_date = $4
     WHERE telegram_id = $1`,
    [telegramId, timestamp, streakCount, today]
  );

  if (!previous) return 0;
  const diffMs = Date.now() - previous.getTime();
  return Math.floor(diffMs / (1000 * 60 * 60 * 24));
}

export async function getChatMessages(telegramId: string): Promise<ChatMessageRow[]> {
  const { rows } = await query<{ id: number; telegram_id: string; role: string; content: string; created_at: Date }>(
    'SELECT * FROM chat_messages WHERE telegram_id = $1 ORDER BY created_at ASC',
    [telegramId]
  );
  return rows.map((r) => ({
    id: r.id,
    telegram_id: r.telegram_id,
    role: r.role,
    content: r.content,
    created_at: r.created_at.toISOString(),
  }));
}

export async function getChatHistory(telegramId: string, limit = 20): Promise<{ role: string; content: string }[]> {
  const messages = await getChatMessages(telegramId);
  return messages.slice(-limit).map((m) => ({ role: m.role, content: m.content }));
}

export async function insertChatMessage(telegramId: string, role: string, content: string): Promise<void> {
  await query('INSERT INTO chat_messages (telegram_id, role, content) VALUES ($1, $2, $3)', [
    telegramId, role, content,
  ]);
}

export async function insertCookedRecipe(telegramId: string, recipeName: string): Promise<void> {
  await query('INSERT INTO cooked_recipes (telegram_id, recipe_name) VALUES ($1, $2)', [
    telegramId, recipeName,
  ]);
}

export async function getWeightLog(telegramId: string): Promise<{ weight: number; log_date: string }[]> {
  const { rows } = await query<{ weight: number; log_date: string }>(
    'SELECT weight, log_date FROM weight_log WHERE telegram_id = $1 ORDER BY log_date ASC',
    [telegramId]
  );
  return rows;
}

export async function getCookedCount(telegramId: string): Promise<number> {
  const { rows } = await query<{ count: string }>(
    'SELECT COUNT(*)::text AS count FROM cooked_recipes WHERE telegram_id = $1',
    [telegramId]
  );
  return parseInt(rows[0]?.count || '0', 10);
}

export async function getCookedDates(telegramId: string): Promise<string[]> {
  const { rows } = await query<{ d: string }>(
    `SELECT DISTINCT cooked_at::date::text AS d FROM cooked_recipes
     WHERE telegram_id = $1 ORDER BY d DESC`,
    [telegramId]
  );
  return rows.map((r) => r.d);
}

export async function upsertWeight(telegramId: string, weight: number, logDate: string): Promise<void> {
  await query(
    `INSERT INTO weight_log (telegram_id, weight, log_date)
     VALUES ($1, $2, $3)
     ON CONFLICT (telegram_id, log_date) DO UPDATE SET weight = EXCLUDED.weight`,
    [telegramId, weight, logDate]
  );
  await query('UPDATE users SET weight = $2, updated_at = $3 WHERE telegram_id = $1', [
    telegramId, weight, now(),
  ]);
}

export async function activatePremium(telegramId: string, premiumUntil: string): Promise<void> {
  await query(
    `UPDATE users SET is_premium = TRUE, premium_until = $2, premium_expiry_notified = FALSE, updated_at = $3
     WHERE telegram_id = $1`,
    [telegramId, premiumUntil, now()]
  );
}

export async function upsertPremiumUser(
  telegramId: string,
  firstName: string,
  premiumUntil: string
): Promise<void> {
  const timestamp = now();
  await query(
    `INSERT INTO users (telegram_id, first_name, is_premium, premium_until, created_at, updated_at)
     VALUES ($1, $2, TRUE, $3, $4, $4)
     ON CONFLICT (telegram_id) DO UPDATE SET
       is_premium = TRUE, premium_until = $3, updated_at = $4`,
    [telegramId, firstName, premiumUntil, timestamp]
  );
}

export async function deleteUserData(telegramId: string): Promise<void> {
  await query('DELETE FROM users WHERE telegram_id = $1', [telegramId]);
}

export async function setNotificationsEnabled(telegramId: string, enabled: boolean): Promise<void> {
  await query('UPDATE users SET notifications_enabled = $2, updated_at = $3 WHERE telegram_id = $1', [
    telegramId, enabled, now(),
  ]);
}

export async function setUserEmail(telegramId: string, email: string): Promise<void> {
  await query('UPDATE users SET email = $2, updated_at = $3 WHERE telegram_id = $1', [
    telegramId,
    email.trim().toLowerCase(),
    now(),
  ]);
}

export async function getUserByAuthEmail(
  email: string
): Promise<{ telegram_id: string; email: string | null; password_hash: string } | undefined> {
  const { rows } = await query<{ telegram_id: string; email: string | null; password_hash: string }>(
    'SELECT telegram_id, email, password_hash FROM users WHERE LOWER(email) = LOWER($1) AND password_hash IS NOT NULL',
    [email.trim()]
  );
  return rows[0];
}

export async function createWebUser(email: string, passwordHash: string): Promise<string> {
  const telegramId = `web_${randomUUID()}`;
  const normalizedEmail = email.trim().toLowerCase();
  const timestamp = now();

  await query(
    `INSERT INTO users (telegram_id, email, password_hash, created_at, updated_at)
     VALUES ($1, $2, $3, $4, $4)`,
    [telegramId, normalizedEmail, passwordHash, timestamp]
  );
  await logEvent(telegramId, 'user_registered');
  return telegramId;
}

export async function getUsersWithPlansForReminders(): Promise<
  {
    telegram_id: string;
    name: string;
    first_name: string | null;
    plan_data: unknown;
    plan_created_at: string;
    status_morning: string | null;
    status_date: string | null;
    last_seen_at: string | null;
    goal: string | null;
    premium_until: string | null;
    is_lifetime_premium: boolean;
  }[]
> {
  const { rows } = await query<{
    telegram_id: string;
    name: string | null;
    first_name: string | null;
    plan_data: unknown;
    plan_created_at: Date;
    status_morning: string | null;
    status_date: string | null;
    last_seen_at: Date | null;
    goal: string | null;
    premium_until: Date | null;
    is_lifetime_premium: boolean;
  }>(
    `SELECT u.telegram_id, u.name, u.first_name, u.status_morning, u.status_date,
            u.last_seen_at, u.goal, u.premium_until, u.is_lifetime_premium,
            wp.plan_data, wp.created_at AS plan_created_at
     FROM users u
     INNER JOIN LATERAL (
       SELECT plan_data, created_at FROM week_plans
       WHERE telegram_id = u.telegram_id AND (is_archived = FALSE OR is_archived IS NULL)
       ORDER BY created_at DESC LIMIT 1
     ) wp ON TRUE
     WHERE u.notifications_enabled = TRUE AND u.onboarding_complete = TRUE`
  );
  return rows.map((r) => ({
    telegram_id: r.telegram_id,
    name: r.name || r.first_name || 'друг',
    first_name: r.first_name,
    plan_data: r.plan_data,
    plan_created_at: r.plan_created_at.toISOString(),
    status_morning: r.status_morning,
    status_date: r.status_date,
    last_seen_at: r.last_seen_at?.toISOString() || null,
    goal: r.goal,
    premium_until: r.premium_until?.toISOString() || null,
    is_lifetime_premium: r.is_lifetime_premium,
  }));
}

export async function logEvent(
  telegramId: string | null,
  eventType: EventType,
  payload: Record<string, unknown> = {}
): Promise<void> {
  await query('INSERT INTO events (telegram_id, event_type, payload) VALUES ($1, $2, $3)', [
    telegramId, eventType, JSON.stringify(payload),
  ]);
}

export async function getAdminStats(): Promise<{
  total_users: number;
  premium_users: number;
  today_registrations: number;
  conversion_rate: number;
  total_revenue: number;
  registrations_last_7_days: { date: string; count: number }[];
  recent_payments: { date: string; amount: number }[];
}> {
  const [users, premium, today, payments, last7Days, recentPayments] = await Promise.all([
    query<{ count: string }>('SELECT COUNT(*)::text AS count FROM users'),
    query<{ count: string }>(
      `SELECT COUNT(*)::text AS count FROM users
       WHERE (is_lifetime_premium = TRUE) OR (premium_until > NOW())`
    ),
    query<{ count: string }>(
      `SELECT COUNT(*)::text AS count FROM users WHERE created_at::date = CURRENT_DATE`
    ),
    query<{ count: string }>(
      `SELECT COUNT(*)::text AS count FROM events WHERE event_type = 'payment_completed'`
    ),
    query<{ day: Date; count: string }>(
      `SELECT d.day::date AS day, COUNT(u.telegram_id)::text AS count
       FROM generate_series(CURRENT_DATE - INTERVAL '6 days', CURRENT_DATE, INTERVAL '1 day') AS d(day)
       LEFT JOIN users u ON u.created_at::date = d.day::date
       GROUP BY d.day
       ORDER BY d.day`
    ),
    query<{ created_at: Date }>(
      `SELECT created_at FROM events
       WHERE event_type = 'payment_completed'
       ORDER BY created_at DESC
       LIMIT 10`
    ),
  ]);

  const total = parseInt(users.rows[0]?.count || '0', 10);
  const premiumCount = parseInt(premium.rows[0]?.count || '0', 10);
  const todayCount = parseInt(today.rows[0]?.count || '0', 10);
  const paymentCount = parseInt(payments.rows[0]?.count || '0', 10);

  return {
    total_users: total,
    premium_users: premiumCount,
    today_registrations: todayCount,
    conversion_rate: total > 0 ? Math.round((premiumCount / total) * 10000) / 100 : 0,
    total_revenue: paymentCount * 299,
    registrations_last_7_days: last7Days.rows.map((r) => ({
      date: r.day.toISOString().split('T')[0],
      count: parseInt(r.count, 10),
    })),
    recent_payments: recentPayments.rows.map((r) => ({
      date: r.created_at.toISOString(),
      amount: 299,
    })),
  };
}

function computePremiumUntilAfterDays(user: UserRow | undefined, days: number): string {
  const nowDate = new Date();
  let base: Date;
  if (user?.premium_until && new Date(user.premium_until) > nowDate) {
    base = new Date(user.premium_until);
  } else {
    base = nowDate;
  }
  base.setDate(base.getDate() + days);
  return base.toISOString();
}

export async function grantLifetimePremium(telegramId: string): Promise<void> {
  const timestamp = now();
  await query(
    `INSERT INTO users (telegram_id, is_premium, is_lifetime_premium, premium_expiry_notified, created_at, updated_at)
     VALUES ($1, TRUE, TRUE, FALSE, $2, $2)
     ON CONFLICT (telegram_id) DO UPDATE SET
       is_premium = TRUE, is_lifetime_premium = TRUE, premium_expiry_notified = FALSE, updated_at = $2`,
    [telegramId, timestamp]
  );
}

export async function grantPremiumDays(telegramId: string, days: number): Promise<string> {
  const user = await getUser(telegramId);
  const untilStr = computePremiumUntilAfterDays(user, days);
  const timestamp = now();
  await query(
    `INSERT INTO users (telegram_id, is_premium, premium_until, premium_expiry_notified, subscription_cancelled, created_at, updated_at)
     VALUES ($1, TRUE, $2, FALSE, FALSE, $3, $3)
     ON CONFLICT (telegram_id) DO UPDATE SET
       is_premium = TRUE, premium_until = $2, premium_expiry_notified = FALSE, updated_at = $3`,
    [telegramId, untilStr, timestamp]
  );
  return untilStr;
}

export async function revokePremiumAccess(telegramId: string): Promise<void> {
  await query(
    `UPDATE users SET is_premium = FALSE, is_lifetime_premium = FALSE, premium_until = NULL, updated_at = $2
     WHERE telegram_id = $1`,
    [telegramId, now()]
  );
}

export type PromoCodeRow = {
  id: number;
  code: string;
  days: number;
  max_uses: number | null;
  used_count: number;
  expires_at: Date | string | null;
  is_active: boolean;
  created_at: Date;
};

export class PromoCodeError extends Error {
  constructor(
    public code: string,
    message: string
  ) {
    super(message);
    this.name = 'PromoCodeError';
  }
}

function mapPromoCodeRow(row: PromoCodeRow) {
  return {
    id: row.id,
    code: row.code,
    days: row.days,
    maxUses: row.max_uses,
    usedCount: row.used_count,
    expiresAt: row.expires_at
      ? (row.expires_at instanceof Date
          ? row.expires_at.toISOString().split('T')[0]
          : String(row.expires_at))
      : null,
    isActive: row.is_active,
    createdAt: row.created_at.toISOString(),
  };
}

export async function createPromoCode(data: {
  code: string;
  days: number;
  maxUses?: number | null;
  expiresAt?: string | null;
}): Promise<{
  id: number;
  code: string;
  days: number;
  maxUses: number | null;
  usedCount: number;
  expiresAt: string | null;
  isActive: boolean;
  createdAt: string;
}> {
  const normalizedCode = data.code.trim().toUpperCase();
  const { rows } = await query<PromoCodeRow>(
    `INSERT INTO promo_codes (code, days, max_uses, expires_at)
     VALUES ($1, $2, $3, $4)
     RETURNING *`,
    [normalizedCode, data.days, data.maxUses ?? null, data.expiresAt ?? null]
  );
  const row = rows[0];
  return mapPromoCodeRow(row);
}

export async function getAllPromoCodes(): Promise<ReturnType<typeof mapPromoCodeRow>[]> {
  const { rows } = await query<PromoCodeRow>(
    'SELECT * FROM promo_codes ORDER BY created_at DESC'
  );
  return rows.map(mapPromoCodeRow);
}

export async function deactivatePromoCode(id: number): Promise<boolean> {
  const { rowCount } = await query(
    'UPDATE promo_codes SET is_active = FALSE WHERE id = $1',
    [id]
  );
  return (rowCount ?? 0) > 0;
}

export async function activatePromoCode(
  code: string,
  telegramId: string
): Promise<{ days: number; premiumUntil: string }> {
  const client = await getPool().connect();

  try {
    await client.query('BEGIN');

    const { rows } = await client.query<PromoCodeRow>(
      `SELECT * FROM promo_codes WHERE UPPER(code) = UPPER($1) FOR UPDATE`,
      [code.trim().toUpperCase()]
    );
    const promo = rows[0];

    if (!promo || !promo.is_active) {
      throw new PromoCodeError('not_found', 'Промокод не найден');
    }

    if (promo.expires_at) {
      const expiresEnd = new Date(promo.expires_at);
      expiresEnd.setHours(23, 59, 59, 999);
      if (expiresEnd < new Date()) {
        throw new PromoCodeError('expired', 'Срок действия истёк');
      }
    }

    if (promo.max_uses !== null && promo.used_count >= promo.max_uses) {
      throw new PromoCodeError('used', 'Промокод уже использован');
    }

    await client.query('UPDATE promo_codes SET used_count = used_count + 1 WHERE id = $1', [promo.id]);

    const { rows: userRows } = await client.query<{ premium_until: Date | null }>(
      'SELECT premium_until FROM users WHERE telegram_id = $1',
      [telegramId]
    );
    const existingUntil = userRows[0]?.premium_until?.toISOString();
    const untilStr = computePremiumUntilAfterDays(
      existingUntil ? { premium_until: existingUntil } as UserRow : undefined,
      promo.days
    );
    const timestamp = now();

    await client.query(
      `INSERT INTO users (telegram_id, is_premium, premium_until, premium_expiry_notified, subscription_cancelled, created_at, updated_at)
       VALUES ($1, TRUE, $2, FALSE, FALSE, $3, $3)
       ON CONFLICT (telegram_id) DO UPDATE SET
         is_premium = TRUE, premium_until = $2, premium_expiry_notified = FALSE, updated_at = $3`,
      [telegramId, untilStr, timestamp]
    );

    await client.query('COMMIT');
    return { days: promo.days, premiumUntil: untilStr };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

export async function appendDaysToPlan(telegramId: string, newDays: DayPlan[]): Promise<void> {
  const planRow = await getLatestPlan(telegramId);
  if (!planRow) throw new Error('Plan not found');
  const plan = JSON.parse(planRow.plan_data) as { days: DayPlan[] };
  plan.days = [...(plan.days || []), ...newDays];
  await query(
    'UPDATE week_plans SET plan_data = $2, shopping_list = NULL, shopping_list_generated_at = NULL WHERE id = $1',
    [planRow.id, JSON.stringify(plan)]
  );
}

export async function updatePlanData(telegramId: string, planData: string): Promise<void> {
  const planRow = await getLatestPlan(telegramId);
  if (!planRow) throw new Error('Plan not found');
  await query(
    'UPDATE week_plans SET plan_data = $2, shopping_list = NULL, shopping_list_generated_at = NULL WHERE id = $1',
    [planRow.id, planData]
  );
}

export async function getUserAchievements(userId: string): Promise<
  { achievement_key: string; reward_content: string | null; unlocked_at: string }[]
> {
  const { rows } = await query<{ achievement_key: string; reward_content: string | null; unlocked_at: Date }>(
    'SELECT achievement_key, reward_content, unlocked_at FROM achievements WHERE user_id = $1 ORDER BY unlocked_at ASC',
    [userId]
  );
  return rows.map((r) => ({
    achievement_key: r.achievement_key,
    reward_content: r.reward_content,
    unlocked_at: r.unlocked_at.toISOString(),
  }));
}

export async function hasAchievement(userId: string, key: string): Promise<boolean> {
  const { rows } = await query<{ count: string }>(
    'SELECT COUNT(*)::text AS count FROM achievements WHERE user_id = $1 AND achievement_key = $2',
    [userId, key]
  );
  return parseInt(rows[0]?.count || '0', 10) > 0;
}

export async function unlockAchievement(
  userId: string,
  key: string,
  rewardContent: string | null = null
): Promise<boolean> {
  if (await hasAchievement(userId, key)) return false;
  await query(
    `INSERT INTO achievements (user_id, achievement_key, reward_content) VALUES ($1, $2, $3)`,
    [userId, key, rewardContent]
  );
  return true;
}

export async function setAchievementReward(userId: string, key: string, rewardContent: string): Promise<void> {
  await query('UPDATE achievements SET reward_content = $3 WHERE user_id = $1 AND achievement_key = $2', [
    userId, key, rewardContent,
  ]);
}

export async function wasEventLoggedToday(telegramId: string, eventType: EventType): Promise<boolean> {
  const { rows } = await query<{ count: string }>(
    `SELECT COUNT(*)::text AS count FROM events
     WHERE telegram_id = $1 AND event_type = $2 AND created_at::date = CURRENT_DATE`,
    [telegramId, eventType]
  );
  return parseInt(rows[0]?.count || '0', 10) > 0;
}

export async function getActiveUsersForBroadcast(onlyPremium: boolean): Promise<
  { telegram_id: string }[]
> {
  const premiumFilter = onlyPremium
    ? `AND ((is_lifetime_premium = TRUE) OR (premium_until > NOW()))`
    : '';
  const { rows } = await query<{ telegram_id: string }>(
    `SELECT telegram_id FROM users
     WHERE onboarding_complete = TRUE
       AND last_seen_at > NOW() - INTERVAL '30 days'
       ${premiumFilter}`,
  );
  return rows;
}

export async function getUsersForStreakCheck(): Promise<
  { telegram_id: string; notifications_enabled: boolean; last_seen_at: string | null }[]
> {
  const { rows } = await query<{
    telegram_id: string;
    notifications_enabled: boolean;
    last_seen_at: Date | null;
  }>(
    `SELECT telegram_id, notifications_enabled, last_seen_at FROM users WHERE onboarding_complete = TRUE`
  );
  return rows.map((r) => ({
    telegram_id: r.telegram_id,
    notifications_enabled: r.notifications_enabled,
    last_seen_at: r.last_seen_at?.toISOString() || null,
  }));
}

type DayPlan = { dayNumber: number; meals: unknown[] };

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
