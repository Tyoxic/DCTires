import { getDatabase } from './database';
import { Service, ServiceWithCustomer, BikeType, ItemType } from '../models/types';

export interface ServiceInput {
  service_date: string;
  bike_type: BikeType;
  wheel_size: number;
  service_type: ItemType;
  price?: number;
  other_fee?: number;
  tip?: number;
  payment_method?: string;
  customer_id?: number | null;
  source?: string;
  inventory_item_id?: number | null;
  notes?: string;
}

async function applyInventoryDeduction(
  db: Awaited<ReturnType<typeof getDatabase>>,
  inventoryItemId: number
): Promise<number | null> {
  const row = await db.getFirstAsync<{ purchase_price: number; quantity: number }>(
    'SELECT purchase_price, quantity FROM inventory_items WHERE id = ?',
    inventoryItemId
  );
  if (!row) return null;
  await db.runAsync(
    `UPDATE inventory_items
       SET quantity = MAX(0, quantity - 1),
           updated_at = datetime('now')
       WHERE id = ?`,
    inventoryItemId
  );
  return row.purchase_price;
}

async function revertInventoryDeduction(
  db: Awaited<ReturnType<typeof getDatabase>>,
  inventoryItemId: number
): Promise<void> {
  await db.runAsync(
    `UPDATE inventory_items
       SET quantity = quantity + 1,
           updated_at = datetime('now')
       WHERE id = ?`,
    inventoryItemId
  );
}

export async function createService(input: ServiceInput): Promise<number> {
  const db = await getDatabase();
  let newId = 0;
  await db.withTransactionAsync(async () => {
    let costAtService: number | null = null;
    if (input.inventory_item_id != null) {
      costAtService = await applyInventoryDeduction(db, input.inventory_item_id);
    }
    const result = await db.runAsync(
      `INSERT INTO services
        (service_date, bike_type, wheel_size, service_type, price, other_fee, tip,
         payment_method, customer_id, source, inventory_item_id, cost_at_service, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      input.service_date,
      input.bike_type,
      input.wheel_size,
      input.service_type,
      input.price ?? 20,
      input.other_fee ?? 0,
      input.tip ?? 0,
      input.payment_method ?? '',
      input.customer_id ?? null,
      input.source ?? '',
      input.inventory_item_id ?? null,
      costAtService,
      input.notes ?? ''
    );
    newId = result.lastInsertRowId;
  });
  return newId;
}

export async function updateService(id: number, input: ServiceInput): Promise<void> {
  const db = await getDatabase();
  await db.withTransactionAsync(async () => {
    const prev = await db.getFirstAsync<{
      inventory_item_id: number | null;
      cost_at_service: number | null;
    }>('SELECT inventory_item_id, cost_at_service FROM services WHERE id = ?', id);
    if (!prev) return;

    const prevInv = prev.inventory_item_id;
    const nextInv = input.inventory_item_id ?? null;
    let costAtService: number | null = prev.cost_at_service;

    if (prevInv !== nextInv) {
      if (prevInv != null) {
        await revertInventoryDeduction(db, prevInv);
      }
      if (nextInv != null) {
        costAtService = await applyInventoryDeduction(db, nextInv);
      } else {
        costAtService = null;
      }
    }

    await db.runAsync(
      `UPDATE services SET
         service_date = ?, bike_type = ?, wheel_size = ?, service_type = ?,
         price = ?, other_fee = ?, tip = ?, payment_method = ?,
         customer_id = ?, source = ?, inventory_item_id = ?, cost_at_service = ?,
         notes = ?, updated_at = datetime('now')
       WHERE id = ?`,
      input.service_date,
      input.bike_type,
      input.wheel_size,
      input.service_type,
      input.price ?? 20,
      input.other_fee ?? 0,
      input.tip ?? 0,
      input.payment_method ?? '',
      input.customer_id ?? null,
      input.source ?? '',
      nextInv,
      costAtService,
      input.notes ?? '',
      id
    );
  });
}

export async function deleteService(id: number): Promise<void> {
  const db = await getDatabase();
  await db.withTransactionAsync(async () => {
    const prev = await db.getFirstAsync<{ inventory_item_id: number | null }>(
      'SELECT inventory_item_id FROM services WHERE id = ?',
      id
    );
    if (prev?.inventory_item_id != null) {
      await revertInventoryDeduction(db, prev.inventory_item_id);
    }
    await db.runAsync('DELETE FROM services WHERE id = ?', id);
  });
}

export async function getService(id: number): Promise<Service | null> {
  const db = await getDatabase();
  return db.getFirstAsync<Service>('SELECT * FROM services WHERE id = ?', id);
}

export async function getAllServicesWithCustomer(): Promise<ServiceWithCustomer[]> {
  const db = await getDatabase();
  return db.getAllAsync<ServiceWithCustomer>(
    `SELECT s.*, c.name AS customer_name, c.phone AS customer_phone
       FROM services s
       LEFT JOIN customers c ON c.id = s.customer_id
       ORDER BY s.service_date DESC, s.id DESC`
  );
}

export async function getServicesByCustomer(customerId: number): Promise<Service[]> {
  const db = await getDatabase();
  return db.getAllAsync<Service>(
    `SELECT * FROM services WHERE customer_id = ?
       ORDER BY service_date DESC, id DESC`,
    customerId
  );
}

export async function getServicesByInventory(inventoryItemId: number): Promise<Service[]> {
  const db = await getDatabase();
  return db.getAllAsync<Service>(
    `SELECT * FROM services WHERE inventory_item_id = ?
       ORDER BY service_date DESC, id DESC`,
    inventoryItemId
  );
}

export interface MonthTotals {
  revenue: number;
  profit: number;
  tip: number;
  count: number;
}

export async function getCurrentMonthTotals(yyyyMM: string): Promise<MonthTotals> {
  const db = await getDatabase();
  const row = await db.getFirstAsync<{
    revenue: number | null;
    profit: number | null;
    tip: number | null;
    count: number;
  }>(
    `SELECT
       SUM(price + other_fee) AS revenue,
       SUM(price + other_fee - COALESCE(cost_at_service, 0)) AS profit,
       SUM(tip) AS tip,
       COUNT(*) AS count
     FROM services
     WHERE substr(service_date, 1, 7) = ?`,
    yyyyMM
  );
  return {
    revenue: row?.revenue ?? 0,
    profit: row?.profit ?? 0,
    tip: row?.tip ?? 0,
    count: row?.count ?? 0,
  };
}

export async function getAllTimeTotals(): Promise<MonthTotals> {
  const db = await getDatabase();
  const row = await db.getFirstAsync<{
    revenue: number | null;
    profit: number | null;
    tip: number | null;
    count: number;
  }>(
    `SELECT
       SUM(price + other_fee) AS revenue,
       SUM(price + other_fee - COALESCE(cost_at_service, 0)) AS profit,
       SUM(tip) AS tip,
       COUNT(*) AS count
     FROM services`
  );
  return {
    revenue: row?.revenue ?? 0,
    profit: row?.profit ?? 0,
    tip: row?.tip ?? 0,
    count: row?.count ?? 0,
  };
}

export interface MonthlyTotals {
  yyyyMM: string;          // e.g. '2025-08'
  count: number;
  revenue: number;
  profit: number;
  tip: number;
}

export async function getMonthlyTotals(): Promise<MonthlyTotals[]> {
  const db = await getDatabase();
  return db.getAllAsync<MonthlyTotals>(
    `SELECT
       substr(service_date, 1, 7)                              AS yyyyMM,
       COUNT(*)                                                AS count,
       COALESCE(SUM(price + other_fee), 0)                     AS revenue,
       COALESCE(SUM(price + other_fee - COALESCE(cost_at_service, 0)), 0) AS profit,
       COALESCE(SUM(tip), 0)                                   AS tip
     FROM services
     GROUP BY yyyyMM
     ORDER BY yyyyMM DESC`
  );
}

export interface TopCustomer {
  customer_id: number;
  name: string;
  service_count: number;
  revenue: number;
  profit: number;
  tip: number;
}

export async function getTopCustomers(limit = 10): Promise<TopCustomer[]> {
  const db = await getDatabase();
  return db.getAllAsync<TopCustomer>(
    `SELECT
       c.id   AS customer_id,
       c.name AS name,
       COUNT(s.id) AS service_count,
       COALESCE(SUM(s.price + s.other_fee), 0)                                 AS revenue,
       COALESCE(SUM(s.price + s.other_fee - COALESCE(s.cost_at_service, 0)), 0) AS profit,
       COALESCE(SUM(s.tip), 0)                                                 AS tip
     FROM customers c
     INNER JOIN services s ON s.customer_id = c.id
     GROUP BY c.id
     HAVING service_count > 0
     ORDER BY service_count DESC, revenue DESC, c.name COLLATE NOCASE
     LIMIT ?`,
    limit
  );
}

export interface ServiceTypeStat {
  service_type: string;
  count: number;
  revenue: number;
}

export async function getServiceTypeBreakdown(): Promise<ServiceTypeStat[]> {
  const db = await getDatabase();
  return db.getAllAsync<ServiceTypeStat>(
    `SELECT
       service_type,
       COUNT(*) AS count,
       COALESCE(SUM(price + other_fee), 0) AS revenue
     FROM services
     GROUP BY service_type
     ORDER BY count DESC`
  );
}
