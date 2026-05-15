import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import * as DocumentPicker from 'expo-document-picker';
import { getDatabase } from '../db/database';
import { Customer, InventoryItem, Service } from '../models/types';

interface BackupData {
  version: 1;
  exportedAt: string;
  customers: Customer[];
  inventoryItems: InventoryItem[];
  services: Service[];
}

export interface ImportSummary {
  customers: number;
  inventoryItems: number;
  services: number;
}

export async function exportData(): Promise<void> {
  const db = await getDatabase();
  const customers = await db.getAllAsync<Customer>('SELECT * FROM customers');
  const inventoryItems = await db.getAllAsync<InventoryItem>('SELECT * FROM inventory_items');
  const services = await db.getAllAsync<Service>('SELECT * FROM services');

  const data: BackupData = {
    version: 1,
    exportedAt: new Date().toISOString(),
    customers,
    inventoryItems,
    services,
  };

  const json = JSON.stringify(data, null, 2);
  const fileName = `dctires-backup-${new Date().toISOString().slice(0, 10)}.json`;
  const file = new File(Paths.cache, fileName);
  file.write(json);

  await Sharing.shareAsync(file.uri, {
    mimeType: 'application/json',
    dialogTitle: 'Export DCTires Data',
  });
}

function validateBackup(raw: unknown): BackupData {
  if (!raw || typeof raw !== 'object') throw new Error('Backup file is empty or not an object');
  const data = raw as Record<string, unknown>;
  if (data.version !== 1) throw new Error(`Unsupported backup version: ${String(data.version)}`);

  const required = ['customers', 'inventoryItems', 'services'] as const;
  for (const k of required) {
    if (!Array.isArray(data[k])) throw new Error(`Backup missing or invalid "${k}" array`);
  }
  return data as unknown as BackupData;
}

export async function pickAndImportData(): Promise<ImportSummary | null> {
  const result = await DocumentPicker.getDocumentAsync({
    type: 'application/json',
    copyToCacheDirectory: true,
  });
  if (result.canceled) return null;

  const file = new File(result.assets[0].uri);
  const text = await file.text();
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error('Backup file is not valid JSON');
  }
  const data = validateBackup(parsed);
  return importData(data);
}

async function importData(data: BackupData): Promise<ImportSummary> {
  const db = await getDatabase();
  await db.withTransactionAsync(async () => {
    await db.runAsync('DELETE FROM services');
    await db.runAsync('DELETE FROM inventory_items');
    await db.runAsync('DELETE FROM customers');

    for (const c of data.customers) {
      await db.runAsync(
        `INSERT INTO customers (id, name, phone, notes, source, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        c.id, c.name, c.phone, c.notes ?? '', c.source ?? '', c.created_at, c.updated_at
      );
    }
    for (const i of data.inventoryItems) {
      await db.runAsync(
        `INSERT INTO inventory_items
          (id, wheel_size, tire_spec, bike_category, item_type, quantity, purchase_price, sell_price, notes, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        i.id, i.wheel_size, i.tire_spec, i.bike_category, i.item_type, i.quantity,
        i.purchase_price, i.sell_price, i.notes ?? '', i.created_at, i.updated_at
      );
    }
    for (const s of data.services) {
      await db.runAsync(
        `INSERT INTO services
          (id, service_date, bike_type, wheel_size, service_type, price, other_fee, tip,
           payment_method, customer_id, source, inventory_item_id, cost_at_service, notes, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        s.id, s.service_date, s.bike_type, s.wheel_size, s.service_type,
        s.price, s.other_fee, s.tip, s.payment_method ?? '', s.customer_id,
        s.source ?? '', s.inventory_item_id, s.cost_at_service, s.notes ?? '',
        s.created_at, s.updated_at
      );
    }
  });

  return {
    customers: data.customers.length,
    inventoryItems: data.inventoryItems.length,
    services: data.services.length,
  };
}
