import Database from 'better-sqlite3';
import path from 'path';
import { v4 as uuid } from 'uuid';

const envDbPath = process.env.DB_PATH || 'db.sqlite';
const dbPath = path.isAbsolute(envDbPath)
  ? envDbPath
  : path.join(__dirname, envDbPath);
const db = new Database(dbPath);

export function initializeDb() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS workers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      uuid TEXT NOT NULL UNIQUE,
      cron_schedule TEXT NOT NULL,
      query TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  const { count } = db
    .prepare('SELECT COUNT(*) AS count FROM workers')
    .get() as {
    count?: number;
  };

  if (count === 0) {
    const insert = db.prepare(
      `INSERT INTO workers (uuid, cron_schedule, query, created_at, updated_at)
       VALUES (?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
    );
    insert.run(uuid(), '*/5 * * * *', 'Macbook Pro 14');
    console.log('Default configuration seeded.');
  }
}
