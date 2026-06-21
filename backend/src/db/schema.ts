import { query } from './pool.js';

const SCHEMA = `
CREATE TABLE IF NOT EXISTS users (
  telegram_id TEXT PRIMARY KEY,
  first_name TEXT,
  last_name TEXT,
  username TEXT,
  name TEXT,
  age INTEGER,
  gender TEXT,
  height INTEGER,
  weight REAL,
  goal TEXT,
  activity_level TEXT,
  meals_per_day INTEGER,
  allergies JSONB DEFAULT '[]',
  is_premium BOOLEAN DEFAULT FALSE,
  premium_until TIMESTAMPTZ,
  premium_expiry_notified BOOLEAN DEFAULT FALSE,
  subscription_cancelled BOOLEAN DEFAULT FALSE,
  daily_status TEXT,
  daily_status_date DATE,
  progress_ai_comment TEXT,
  progress_ai_comment_date DATE,
  onboarding_complete BOOLEAN DEFAULT FALSE,
  consent_accepted BOOLEAN DEFAULT FALSE,
  pdf_gift_sent BOOLEAN DEFAULT FALSE,
  last_plan_refresh DATE,
  notifications_enabled BOOLEAN DEFAULT TRUE,
  last_seen_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS week_plans (
  id SERIAL PRIMARY KEY,
  telegram_id TEXT NOT NULL REFERENCES users(telegram_id) ON DELETE CASCADE,
  plan_data JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS chat_messages (
  id SERIAL PRIMARY KEY,
  telegram_id TEXT NOT NULL REFERENCES users(telegram_id) ON DELETE CASCADE,
  role TEXT NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS weekly_queries (
  id SERIAL PRIMARY KEY,
  telegram_id TEXT NOT NULL,
  week_start DATE NOT NULL,
  count INTEGER DEFAULT 0,
  UNIQUE(telegram_id, week_start)
);

CREATE TABLE IF NOT EXISTS advice_queries (
  id SERIAL PRIMARY KEY,
  telegram_id TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS weight_log (
  id SERIAL PRIMARY KEY,
  telegram_id TEXT NOT NULL REFERENCES users(telegram_id) ON DELETE CASCADE,
  weight REAL NOT NULL,
  log_date DATE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(telegram_id, log_date)
);

CREATE TABLE IF NOT EXISTS cooked_recipes (
  id SERIAL PRIMARY KEY,
  telegram_id TEXT NOT NULL REFERENCES users(telegram_id) ON DELETE CASCADE,
  recipe_name TEXT NOT NULL,
  cooked_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS events (
  id SERIAL PRIMARY KEY,
  telegram_id TEXT,
  event_type TEXT NOT NULL,
  payload JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_week_plans_telegram ON week_plans(telegram_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_events_type ON events(event_type, created_at);
CREATE INDEX IF NOT EXISTS idx_advice_queries_telegram ON advice_queries(telegram_id);
CREATE INDEX IF NOT EXISTS idx_weekly_queries_telegram ON weekly_queries(telegram_id, week_start);
`;

const MIGRATIONS = `
ALTER TABLE users ADD COLUMN IF NOT EXISTS eating_style TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS cooking_time TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS preferences_prompted BOOLEAN DEFAULT FALSE;
ALTER TABLE week_plans ADD COLUMN IF NOT EXISTS shopping_list TEXT;
ALTER TABLE week_plans ADD COLUMN IF NOT EXISTS shopping_list_generated_at TIMESTAMPTZ;
ALTER TABLE week_plans ADD COLUMN IF NOT EXISTS is_archived BOOLEAN DEFAULT FALSE;
CREATE INDEX IF NOT EXISTS idx_week_plans_active ON week_plans(telegram_id, is_archived, created_at DESC);
UPDATE week_plans wp SET is_archived = TRUE
WHERE id NOT IN (
  SELECT DISTINCT ON (telegram_id) id FROM week_plans ORDER BY telegram_id, created_at DESC
) AND (is_archived = FALSE OR is_archived IS NULL);
`;

export async function initSchema(): Promise<void> {
  await query(SCHEMA);
  await query(MIGRATIONS);
}
