import { getDatabase } from '../database';
import { getMeta, setMeta } from '../appMeta';
import { SEED_INVENTORY, SEED_SERVICES } from './initialData';

const SEED_KEY = 'seed_loaded_at';

export async function loadSeedIfNeeded(): Promise<void> {
  if (await getMeta(SEED_KEY)) return;

  const db = await getDatabase();

  await db.withTransactionAsync(async () => {
    // 1) Inventory rows — keep their insertion order so we can map size+category+type
    //    to an inventory_item_id for matching services.
    const inventoryIds: number[] = [];
    for (const inv of SEED_INVENTORY) {
      const r = await db.runAsync(
        `INSERT INTO inventory_items
          (wheel_size, tire_spec, bike_category, item_type, quantity, purchase_price, sell_price, notes)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        inv.wheel_size,
        inv.tire_spec,
        inv.bike_category,
        inv.item_type,
        inv.quantity,
        inv.purchase_price,
        inv.sell_price,
        inv.notes ?? ''
      );
      inventoryIds.push(r.lastInsertRowId);
    }

    // 2) De-dupe customers by case-insensitive name.
    const customerIdByName = new Map<string, number>();
    for (const svc of SEED_SERVICES) {
      const key = svc.customer_name.trim().toLowerCase();
      if (customerIdByName.has(key)) continue;
      const r = await db.runAsync(
        `INSERT INTO customers (name, phone, notes, source) VALUES (?, ?, ?, ?)`,
        svc.customer_name.trim(),
        svc.customer_phone,
        '',
        svc.source
      );
      customerIdByName.set(key, r.lastInsertRowId);
    }
    // Backfill phone numbers from any later sighting of the same name.
    for (const svc of SEED_SERVICES) {
      if (!svc.customer_phone) continue;
      const key = svc.customer_name.trim().toLowerCase();
      const id = customerIdByName.get(key);
      if (id == null) continue;
      await db.runAsync(
        `UPDATE customers SET phone = ? WHERE id = ? AND (phone IS NULL OR phone = '')`,
        svc.customer_phone,
        id
      );
    }

    // 3) Services. Map cost_at_service from inventory when exactly one match exists
    //    for (wheel_size, bike_category, item_type). Otherwise leave null.
    //    Inventory link itself is left null so seed doesn't subtract from stock.
    const inventoryByKey = new Map<string, { id: number; purchase_price: number }[]>();
    for (let i = 0; i < SEED_INVENTORY.length; i++) {
      const inv = SEED_INVENTORY[i];
      const key = `${inv.wheel_size}|${inv.bike_category}|${inv.item_type}`;
      const list = inventoryByKey.get(key) ?? [];
      list.push({ id: inventoryIds[i], purchase_price: inv.purchase_price });
      inventoryByKey.set(key, list);
    }

    for (const svc of SEED_SERVICES) {
      // Inventory bike_category is one of BIKE_CATEGORIES; service bike_type may be Talaria.
      // Treat Talaria as eBike for cost-matching purposes.
      const cat = svc.bike === 'Talaria' ? 'eBike' : svc.bike;
      const key = `${svc.size}|${cat}|${svc.type}`;
      const matches = inventoryByKey.get(key);
      const costAtService = matches && matches.length === 1 ? matches[0].purchase_price : null;
      const customerId = customerIdByName.get(svc.customer_name.trim().toLowerCase()) ?? null;

      await db.runAsync(
        `INSERT INTO services
          (service_date, bike_type, wheel_size, service_type, price, other_fee, tip,
           payment_method, customer_id, source, inventory_item_id, cost_at_service, notes)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        svc.date,
        svc.bike,
        svc.size,
        svc.type,
        svc.price,
        svc.other,
        svc.tip,
        svc.payment,
        customerId,
        svc.source,
        null,
        costAtService,
        svc.notes ?? ''
      );
    }
  });

  await setMeta(SEED_KEY, new Date().toISOString());
}
