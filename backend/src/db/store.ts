import { initPool } from './pool.js';
import { initSchema } from './schema.js';

export async function initDatabase(): Promise<void> {
  await initPool();
  await initSchema();
}

export { now } from './pool.js';
