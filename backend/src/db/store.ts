import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { JSONFilePreset } from 'lowdb/node';
import { DatabaseSchema, defaultData } from './types.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dataDir = path.join(__dirname, '../../data');

if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const dbPath = path.join(dataDir, 'db.json');

let db: Awaited<ReturnType<typeof JSONFilePreset<DatabaseSchema>>> | null = null;

export async function initDatabase(): Promise<void> {
  db = await JSONFilePreset<DatabaseSchema>(dbPath, defaultData);
  await db.read();
  if (!db.data.counters) {
    db.data.counters = { ...defaultData.counters };
  }
  await db.write();
}

export function getDb() {
  if (!db) {
    throw new Error('База данных не инициализирована');
  }
  return db;
}

export async function persist(): Promise<void> {
  await getDb().write();
}

export function now(): string {
  return new Date().toISOString();
}
