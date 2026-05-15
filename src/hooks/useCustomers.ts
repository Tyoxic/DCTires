import { useCallback, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { Customer } from '../models/types';
import { getAllCustomers } from '../db/customers';

export function useCustomers() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    const data = await getAllCustomers();
    setCustomers(data);
    setLoading(false);
  }, []);

  useFocusEffect(useCallback(() => { refresh(); }, [refresh]));

  return { customers, loading, refresh };
}
