import { useCallback, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { ServiceWithCustomer } from '../models/types';
import { getAllServicesWithCustomer } from '../db/services';

export function useServices() {
  const [services, setServices] = useState<ServiceWithCustomer[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    const data = await getAllServicesWithCustomer();
    setServices(data);
    setLoading(false);
  }, []);

  useFocusEffect(useCallback(() => { refresh(); }, [refresh]));

  return { services, loading, refresh };
}
