import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dataDir = path.join(__dirname, '../../data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}
const dbPath = path.join(dataDir, 'dietmealfitbot.db');

export const db = new Database(dbPath);

db.pragma('journal_mode = WAL');

db.exec(`
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
    allergies TEXT,
    is_premium INTEGER DEFAULT 0,
    premium_until TEXT,
    onboarding_complete INTEGER DEFAULT 0,
    last_plan_refresh TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS week_plans (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    telegram_id TEXT NOT NULL,
    plan_data TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (telegram_id) REFERENCES users(telegram_id)
  );

  CREATE TABLE IF NOT EXISTS chat_messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    telegram_id TEXT NOT NULL,
    role TEXT NOT NULL,
    content TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (telegram_id) REFERENCES users(telegram_id)
  );

  CREATE TABLE IF NOT EXISTS daily_queries (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    telegram_id TEXT NOT NULL,
    query_date TEXT NOT NULL,
    count INTEGER DEFAULT 0,
    UNIQUE(telegram_id, query_date)
  );

  CREATE TABLE IF NOT EXISTS weight_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    telegram_id TEXT NOT NULL,
    weight REAL NOT NULL,
    log_date TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now')),
    UNIQUE(telegram_id, log_date)
  );

  CREATE TABLE IF NOT EXISTS cooked_recipes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    telegram_id TEXT NOT NULL,
    recipe_name TEXT NOT NULL,
    cooked_at TEXT DEFAULT (datetime('now'))
  );
`);

export default db;
