import * as SQLite from 'expo-sqlite';

let db: SQLite.SQLiteDatabase | null = null;

export async function getDatabase(): Promise<SQLite.SQLiteDatabase> {
  if (db) return db;
  db = await SQLite.openDatabaseAsync('dctires.db');
  await runMigrations(db);
  return db;
}

async function runMigrations(database: SQLite.SQLiteDatabase) {
  await database.execAsync(`
    PRAGMA foreign_keys = ON;

    CREATE TABLE IF NOT EXISTS customers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      phone TEXT,
      notes TEXT NOT NULL DEFAULT '',
      source TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_customers_name ON customers(name);

    CREATE TABLE IF NOT EXISTS inventory_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      wheel_size REAL NOT NULL,
      tire_spec TEXT,
      bike_category TEXT NOT NULL,
      item_type TEXT NOT NULL,
      quantity INTEGER NOT NULL DEFAULT 0,
      purchase_price REAL NOT NULL DEFAULT 0,
      sell_price REAL NOT NULL DEFAULT 20,
      notes TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_inventory_size ON inventory_items(wheel_size);
    CREATE INDEX IF NOT EXISTS idx_inventory_category ON inventory_items(bike_category);

    CREATE TABLE IF NOT EXISTS services (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      service_date TEXT NOT NULL,
      bike_type TEXT NOT NULL,
      wheel_size REAL NOT NULL,
      service_type TEXT NOT NULL,
      price REAL NOT NULL DEFAULT 20,
      other_fee REAL NOT NULL DEFAULT 0,
      tip REAL NOT NULL DEFAULT 0,
      payment_method TEXT NOT NULL DEFAULT '',
      customer_id INTEGER,
      source TEXT NOT NULL DEFAULT '',
      inventory_item_id INTEGER,
      cost_at_service REAL,
      notes TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE SET NULL,
      FOREIGN KEY (inventory_item_id) REFERENCES inventory_items(id) ON DELETE SET NULL
    );

    CREATE INDEX IF NOT EXISTS idx_services_date ON services(service_date);
    CREATE INDEX IF NOT EXISTS idx_services_customer ON services(customer_id);
    CREATE INDEX IF NOT EXISTS idx_services_inventory ON services(inventory_item_id);

    CREATE TABLE IF NOT EXISTS app_meta (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );
  `);
}
