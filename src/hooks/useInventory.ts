import { useCallback, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { InventoryItem } from '../models/types';
import { getAllInventoryItems } from '../db/inventory';

export function useInventory() {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    const data = await getAllInventoryItems();
    setItems(data);
    setLoading(false);
  }, []);

  useFocusEffect(useCallback(() => { refresh(); }, [refresh]));

  return { items, loading, refresh };
}
