import React, { useEffect, useMemo, useState } from 'react';
import {
  View, Text, FlatList, StyleSheet, TouchableOpacity,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { RootStackParamList, Customer } from '../models/types';
import { useCustomers } from '../hooks/useCustomers';
import { getDatabase } from '../db/database';
import SearchBar from '../components/SearchBar';
import EmptyState from '../components/EmptyState';
import { formatServiceDate } from '../utils/format';

type Props = NativeStackScreenProps<RootStackParamList, 'CustomersList'>;

interface CustomerWithCounts extends Customer {
  service_count: number;
  last_service_date: string | null;
}

export default function CustomersListScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const { customers, loading } = useCustomers();
  const [withCounts, setWithCounts] = useState<CustomerWithCounts[]>([]);
  const [query, setQuery] = useState('');

  useEffect(() => {
    (async () => {
      const db = await getDatabase();
      const rows = await db.getAllAsync<CustomerWithCounts>(
        `SELECT c.*,
                COUNT(s.id) AS service_count,
                MAX(s.service_date) AS last_service_date
           FROM customers c
           LEFT JOIN services s ON s.customer_id = c.id
           GROUP BY c.id
           ORDER BY c.name COLLATE NOCASE`
      );
      setWithCounts(rows);
    })();
  }, [customers]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return withCounts;
    return withCounts.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        (c.phone ?? '').toLowerCase().includes(q)
    );
  }, [withCounts, query]);

  return (
    <View style={styles.container}>
      <SearchBar value={query} onChangeText={setQuery} placeholder="Search name or phone..." />
      <FlatList
        data={filtered}
        keyExtractor={(c) => `cust-${c.id}`}
        contentContainerStyle={
          filtered.length === 0 ? { flex: 1 } : { paddingTop: 8, paddingBottom: insets.bottom + 24 }
        }
        ListEmptyComponent={
          loading ? null : (
            <EmptyState
              icon="👤"
              title={query ? 'No matches' : 'No customers yet'}
              subtitle={query ? 'Try a different search.' : 'Add a customer by logging a service.'}
            />
          )
        }
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.row}
            onPress={() => navigation.navigate('CustomerDetail', { customerId: item.id })}
            activeOpacity={0.7}
          >
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>
                {item.name.trim().charAt(0).toUpperCase()}
              </Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.name}>{item.name}</Text>
              <Text style={styles.sub}>
                {item.service_count} service{item.service_count === 1 ? '' : 's'}
                {item.phone ? ` · ${item.phone}` : ''}
                {item.last_service_date ? ` · last ${formatServiceDate(item.last_service_date)}` : ''}
              </Text>
            </View>
          </TouchableOpacity>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  row: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', marginHorizontal: 12, marginVertical: 4, borderRadius: 12, padding: 12, elevation: 1, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 2 },
  avatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#FFF3E0', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  avatarText: { fontSize: 16, fontWeight: '700', color: '#E65100' },
  name: { fontSize: 15, fontWeight: '600', color: '#222' },
  sub: { fontSize: 12, color: '#666', marginTop: 2 },
});
