import { getDatabase } from './database';
import { InventoryItem, BikeCategory, ItemType } from '../models/types';

export interface InventoryInput {
  wheel_size: number;
  tire_spec?: string | null;
  bike_category: BikeCategory;
  item_type: ItemType;
  quantity?: number;
  purchase_price?: number;
  sell_price?: number;
  notes?: string;
}

export async function createInventoryItem(input: InventoryInput): Promise<number> {
  const db = await getDatabase();
  const result = await db.runAsync(
    `INSERT INTO inventory_items
      (wheel_size, tire_spec, bike_category, item_type, quantity, purchase_price, sell_price, notes)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    input.wheel_size,
    input.tire_spec ?? null,
    input.bike_category,
    input.item_type,
    input.quantity ?? 0,
    input.purchase_price ?? 0,
    input.sell_price ?? 20,
    input.notes ?? ''
  );
  return result.lastInsertRowId;
}

export async function getAllInventoryItems(): Promise<InventoryItem[]> {
  const db = await getDatabase();
  return db.getAllAsync<InventoryItem>(
    `SELECT * FROM inventory_items
     ORDER BY bike_category, wheel_size DESC, item_type`
  );
}

export async function getInventoryItem(id: number): Promise<InventoryItem | null> {
  const db = await getDatabase();
  return db.getFirstAsync<InventoryItem>('SELECT * FROM inventory_items WHERE id = ?', id);
}

export async function updateInventoryItem(
  id: number,
  input: Partial<InventoryInput>
): Promise<void> {
  const db = await getDatabase();
  const fields: string[] = [];
  const values: (string | number | null)[] = [];

  const allowed: (keyof InventoryInput)[] = [
    'wheel_size', 'tire_spec', 'bike_category', 'item_type',
    'quantity', 'purchase_price', 'sell_price', 'notes',
  ];
  for (const key of allowed) {
    const v = input[key];
    if (v !== undefined) {
      fields.push(`${key} = ?`);
      values.push(v as string | number | null);
    }
  }

  if (fields.length === 0) return;

  fields.push("updated_at = datetime('now')");
  values.push(id);

  await db.runAsync(`UPDATE inventory_items SET ${fields.join(', ')} WHERE id = ?`, ...values);
}

export async function adjustInventoryQuantity(id: number, delta: number): Promise<void> {
  const db = await getDatabase();
  await db.runAsync(
    `UPDATE inventory_items
       SET quantity = MAX(0, quantity + ?),
           updated_at = datetime('now')
       WHERE id = ?`,
    delta,
    id
  );
}

export async function deleteInventoryItem(id: number): Promise<void> {
  const db = await getDatabase();
  await db.runAsync('DELETE FROM inventory_items WHERE id = ?', id);
}

export async function findMatchingInventory(
  wheel_size: number,
  bike_category: BikeCategory,
  item_type: ItemType
): Promise<InventoryItem[]> {
  const db = await getDatabase();
  return db.getAllAsync<InventoryItem>(
    `SELECT * FROM inventory_items
       WHERE wheel_size = ? AND bike_category = ? AND item_type = ?
       ORDER BY quantity DESC, purchase_price ASC`,
    wheel_size,
    bike_category,
    item_type
  );
}

export async function getInventoryUsageCount(id: number): Promise<number> {
  const db = await getDatabase();
  const row = await db.getFirstAsync<{ count: number }>(
    'SELECT COUNT(*) AS count FROM services WHERE inventory_item_id = ?',
    id
  );
  return row?.count ?? 0;
}

export interface InventorySizeBucket {
  wheel_size: number;
  item_count: number;        // distinct inventory items at this size
  total_stock: number;       // sum of quantities
  out_count: number;         // items with quantity == 0
  low_count: number;         // items with quantity == 1
}

export async function getInventorySizeBuckets(): Promise<InventorySizeBucket[]> {
  const db = await getDatabase();
  return db.getAllAsync<InventorySizeBucket>(
    `SELECT
       wheel_size,
       COUNT(*)                            AS item_count,
       COALESCE(SUM(quantity), 0)          AS total_stock,
       SUM(CASE WHEN quantity = 0 THEN 1 ELSE 0 END) AS out_count,
       SUM(CASE WHEN quantity = 1 THEN 1 ELSE 0 END) AS low_count
     FROM inventory_items
     GROUP BY wheel_size
     ORDER BY wheel_size DESC`
  );
}

export async function getInventoryItemsBySize(size: number): Promise<InventoryItem[]> {
  const db = await getDatabase();
  return db.getAllAsync<InventoryItem>(
    `SELECT * FROM inventory_items
       WHERE wheel_size = ?
       ORDER BY bike_category, item_type, tire_spec`,
    size
  );
}
