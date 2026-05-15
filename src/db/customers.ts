import { getDatabase } from './database';
import { Customer, CustomerStats } from '../models/types';

export interface CustomerInput {
  name: string;
  phone?: string | null;
  notes?: string;
  source?: string;
}

export async function createCustomer(input: CustomerInput): Promise<number> {
  const db = await getDatabase();
  const result = await db.runAsync(
    `INSERT INTO customers (name, phone, notes, source) VALUES (?, ?, ?, ?)`,
    input.name,
    input.phone ?? null,
    input.notes ?? '',
    input.source ?? ''
  );
  return result.lastInsertRowId;
}

export async function getAllCustomers(): Promise<Customer[]> {
  const db = await getDatabase();
  return db.getAllAsync<Customer>('SELECT * FROM customers ORDER BY name COLLATE NOCASE');
}

export async function getCustomer(id: number): Promise<Customer | null> {
  const db = await getDatabase();
  return db.getFirstAsync<Customer>('SELECT * FROM customers WHERE id = ?', id);
}

export async function findCustomerByName(name: string): Promise<Customer | null> {
  const db = await getDatabase();
  return db.getFirstAsync<Customer>(
    'SELECT * FROM customers WHERE name = ? COLLATE NOCASE LIMIT 1',
    name
  );
}

export async function updateCustomer(id: number, input: Partial<CustomerInput>): Promise<void> {
  const db = await getDatabase();
  const fields: string[] = [];
  const values: (string | number | null)[] = [];

  if (input.name !== undefined) { fields.push('name = ?'); values.push(input.name); }
  if (input.phone !== undefined) { fields.push('phone = ?'); values.push(input.phone); }
  if (input.notes !== undefined) { fields.push('notes = ?'); values.push(input.notes); }
  if (input.source !== undefined) { fields.push('source = ?'); values.push(input.source); }

  if (fields.length === 0) return;

  fields.push("updated_at = datetime('now')");
  values.push(id);

  await db.runAsync(`UPDATE customers SET ${fields.join(', ')} WHERE id = ?`, ...values);
}

export async function deleteCustomer(id: number): Promise<void> {
  const db = await getDatabase();
  await db.runAsync('DELETE FROM customers WHERE id = ?', id);
}

export async function getCustomerStats(id: number): Promise<CustomerStats> {
  const db = await getDatabase();
  const row = await db.getFirstAsync<{
    service_count: number;
    total_revenue: number | null;
    total_tip: number | null;
    total_profit: number | null;
    last_service_date: string | null;
  }>(
    `SELECT
       COUNT(*) AS service_count,
       SUM(price + other_fee) AS total_revenue,
       SUM(tip) AS total_tip,
       SUM(price + other_fee - COALESCE(cost_at_service, 0)) AS total_profit,
       MAX(service_date) AS last_service_date
     FROM services WHERE customer_id = ?`,
    id
  );
  return {
    service_count: row?.service_count ?? 0,
    total_revenue: row?.total_revenue ?? 0,
    total_tip: row?.total_tip ?? 0,
    total_profit: row?.total_profit ?? 0,
    last_service_date: row?.last_service_date ?? null,
  };
}
