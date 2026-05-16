export type BikeCategory = 'Dirtbike' | 'eBike' | 'eScooter' | 'MotorCycle' | 'Segway';
export type BikeType = 'Dirtbike' | 'Talaria' | 'eBike' | 'MotorCycle' | 'Segway';
export type ItemType = 'Tube' | 'Tubeliss' | 'Bib' | 'Tire';
export type PaymentMethod = 'Venmo' | 'Cash' | '';
export type Source = 'FB Market' | 'SMS' | '';

export const BIKE_CATEGORIES: BikeCategory[] = ['Dirtbike', 'eBike', 'eScooter', 'MotorCycle', 'Segway'];
export const BIKE_TYPES: BikeType[] = ['Dirtbike', 'Talaria', 'eBike', 'MotorCycle', 'Segway'];
export const ITEM_TYPES: ItemType[] = ['Tube', 'Tubeliss', 'Bib', 'Tire'];
export const PAYMENT_METHODS: PaymentMethod[] = ['Venmo', 'Cash'];
export const SOURCES: Source[] = ['FB Market', 'SMS'];

export interface Customer {
  id: number;
  name: string;
  phone: string | null;
  notes: string;
  source: string;
  created_at: string;
  updated_at: string;
}

export interface InventoryItem {
  id: number;
  wheel_size: number;
  tire_spec: string | null;
  bike_category: BikeCategory;
  item_type: ItemType;
  quantity: number;
  purchase_price: number;
  sell_price: number;
  notes: string;
  created_at: string;
  updated_at: string;
}

export interface Service {
  id: number;
  service_date: string;
  bike_type: BikeType;
  wheel_size: number;
  service_type: ItemType;
  price: number;
  other_fee: number;
  tip: number;
  payment_method: string;
  customer_id: number | null;
  source: string;
  inventory_item_id: number | null;
  cost_at_service: number | null;
  notes: string;
  created_at: string;
  updated_at: string;
}

export interface ServiceWithCustomer extends Service {
  customer_name: string | null;
  customer_phone: string | null;
}

export interface CustomerStats {
  service_count: number;
  total_revenue: number;
  total_tip: number;
  total_profit: number;
  last_service_date: string | null;
}

export type RootStackParamList = {
  Home: undefined;
  InventoryList: { initialQuery?: string } | undefined;
  InventoryBySize: { size: number };
  InventoryDetail: { itemId: number };
  AddEditInventoryItem: { itemId?: number; defaultSize?: number };
  ServiceList: { initialQuery?: string; customerId?: number; inventoryItemId?: number } | undefined;
  ServiceDetail: { serviceId: number };
  AddEditService: { serviceId?: number; customerId?: number };
  CustomersList: undefined;
  CustomerDetail: { customerId: number };
  Stats: undefined;
  Settings: undefined;
};
