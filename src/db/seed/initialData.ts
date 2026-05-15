import { BikeCategory, BikeType, ItemType } from '../../models/types';

export interface SeedInventory {
  wheel_size: number;
  tire_spec: string | null;
  bike_category: BikeCategory;
  item_type: ItemType;
  quantity: number;
  purchase_price: number;
  sell_price: number;
  notes?: string;
}

export interface SeedService {
  date: string;
  bike: BikeType;
  size: number;
  type: ItemType;
  price: number;
  other: number;
  tip: number;
  payment: string;
  customer_name: string;
  customer_phone: string | null;
  source: string;
  notes?: string;
}

// Public DCTires repo ships with NO bundled seed data. The owner's real
// inventory + service history lives only in the local SQLite database on
// their installed device. Use Settings → Export to back it up, and
// Settings → Import to restore on a fresh install.
//
// To pre-seed a fresh build with your own data, fill these arrays before
// running `eas build`. One example row is included to illustrate the
// schema. The first-launch seed runs only if app_meta.seed_loaded_at is
// null, so this file has no effect on devices that already loaded a seed.

export const SEED_INVENTORY: SeedInventory[] = [
  {
    wheel_size: 21,
    tire_spec: '80/100',
    bike_category: 'Dirtbike',
    item_type: 'Tube',
    quantity: 0,
    purchase_price: 0,
    sell_price: 20,
    notes: 'Example row — replace or remove before shipping your own build.',
  },
];

export const SEED_SERVICES: SeedService[] = [];
