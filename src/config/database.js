import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DB_PATH = process.env.DB_PATH || path.join(__dirname, '../../data/fleet-fuel.db');

// Ensure data directory exists
const dbDir = path.dirname(DB_PATH);
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

// Create and configure database
const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// Initialize database schema
export function initializeDatabase() {
  // Card Configuration Table
  db.exec(`
    CREATE TABLE IF NOT EXISTS card_config (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      monthly_limit REAL NOT NULL DEFAULT 10000,
      cutoff_start_day INTEGER NOT NULL DEFAULT 29,
      cutoff_end_day INTEGER NOT NULL DEFAULT 2,
      recharge_day INTEGER NOT NULL DEFAULT 3,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `);

  // Gas Stations Table
  db.exec(`
    CREATE TABLE IF NOT EXISTS gas_stations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      address TEXT NOT NULL,
      zone TEXT NOT NULL,
      province TEXT,
      lat REAL,
      lng REAL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `);

  // Fuel Expenses Table
  db.exec(`
    CREATE TABLE IF NOT EXISTS fuel_expenses (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      amount REAL NOT NULL,
      date TEXT NOT NULL,
      station_id INTEGER,
      cycle_id TEXT NOT NULL,
      notes TEXT,
      receipt_image TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (station_id) REFERENCES gas_stations(id) ON DELETE SET NULL
    )
  `);

  // Create indexes for better performance
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_expenses_cycle ON fuel_expenses(cycle_id);
    CREATE INDEX IF NOT EXISTS idx_expenses_date ON fuel_expenses(date DESC);
    CREATE INDEX IF NOT EXISTS idx_stations_zone ON gas_stations(zone);
  `);

  // Insert default config if not exists
  const configCount = db.prepare('SELECT COUNT(*) as count FROM card_config').get();
  if (configCount.count === 0) {
    db.prepare(`
      INSERT INTO card_config (monthly_limit, cutoff_start_day, cutoff_end_day, recharge_day)
      VALUES (?, ?, ?, ?)
    `).run(10000, 29, 2, 3);
  }

  console.log('✅ Database initialized successfully');
}

export default db;
