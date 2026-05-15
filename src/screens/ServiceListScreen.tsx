import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View, Text, SectionList, StyleSheet, TouchableOpacity,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { format, parseISO } from 'date-fns';
import { RootStackParamList, ServiceWithCustomer } from '../models/types';
import { getAllServicesWithCustomer } from '../db/services';
import { getCustomer } from '../db/customers';
import { getInventoryItem } from '../db/inventory';
import SearchBar from '../components/SearchBar';
import EmptyState from '../components/EmptyState';
import FAB from '../components/FAB';
import { money, formatServiceDate, formatMonth } from '../utils/format';

type Props = NativeStackScreenProps<RootStackParamList, 'ServiceList'>;

interface Section {
  title: string;
  data: ServiceWithCustomer[];
}

function matches(s: ServiceWithCustomer, q: string): boolean {
  if (!q) return true;
  const hay = `${s.customer_name ?? ''} ${s.customer_phone ?? ''} ${s.wheel_size} ${s.service_type} ${s.bike_type} ${s.payment_method} ${s.source} ${s.notes} ${s.service_date}`.toLowerCase();
  return hay.includes(q);
}

export default function ServiceListScreen({ navigation, route }: Props) {
  const insets = useSafeAreaInsets();
  const [all, setAll] = useState<ServiceWithCustomer[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState(route.params?.initialQuery ?? '');
  const [scopeLabel, setScopeLabel] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    const data = await getAllServicesWithCustomer();
    setAll(data);
    setLoading(false);
  }, []);

  useFocusEffect(useCallback(() => { refresh(); }, [refresh]));

  // Resolve external scope filters: customerId or inventoryItemId
  useEffect(() => {
    (async () => {
      if (route.params?.customerId != null) {
        const c = await getCustomer(route.params.customerId);
        setScopeLabel(c ? `Customer: ${c.name}` : 'Customer');
      } else if (route.params?.inventoryItemId != null) {
        const i = await getInventoryItem(route.params.inventoryItemId);
        setScopeLabel(
          i ? `Inventory: ${i.wheel_size}" ${i.item_type} · ${i.bike_category}` : 'Inventory'
        );
      } else {
        setScopeLabel(null);
      }
    })();
  }, [route.params?.customerId, route.params?.inventoryItemId]);

  const scoped = useMemo(() => {
    let list = all;
    if (route.params?.customerId != null) {
      list = list.filter((s) => s.customer_id === route.params!.customerId);
    }
    if (route.params?.inventoryItemId != null) {
      list = list.filter((s) => s.inventory_item_id === route.params!.inventoryItemId);
    }
    const q = query.trim().toLowerCase();
    return list.filter((s) => matches(s, q));
  }, [all, query, route.params?.customerId, route.params?.inventoryItemId]);

  const sections = useMemo<Section[]>(() => {
    const map = new Map<string, ServiceWithCustomer[]>();
    for (const s of scoped) {
      const yyyyMM = s.service_date.slice(0, 7);
      const list = map.get(yyyyMM) ?? [];
      list.push(s);
      map.set(yyyyMM, list);
    }
    return Array.from(map.entries())
      .sort((a, b) => b[0].localeCompare(a[0]))
      .map(([yyyyMM, data]) => ({ title: formatMonth(yyyyMM), data }));
  }, [scoped]);

  const totalRevenue = scoped.reduce((s, x) => s + x.price + x.other_fee, 0);

  return (
    <View style={styles.container}>
      {scopeLabel ? (
        <View style={styles.scopeBar}>
          <Text style={styles.scopeText} numberOfLines={1}>{scopeLabel}</Text>
          <TouchableOpacity onPress={() => navigation.setParams({ customerId: undefined, inventoryItemId: undefined })}>
            <Text style={styles.scopeClear}>Clear ✕</Text>
          </TouchableOpacity>
        </View>
      ) : null}
      <SearchBar
        value={query}
        onChangeText={setQuery}
        placeholder='Search customer, size, payment, notes...'
      />
      <View style={styles.summaryBar}>
        <Text style={styles.summaryCount}>
          {scoped.length} service{scoped.length === 1 ? '' : 's'}
        </Text>
        <Text style={styles.summaryRevenue}>{money(totalRevenue)} revenue</Text>
      </View>
      {sections.length === 0 ? (
        <View style={styles.emptyWrap}>
          <EmptyState
            icon="🔧"
            title={query ? 'No matches' : 'No services yet'}
            subtitle={query ? 'Try a different search.' : 'Tap + to log your first service.'}
          />
        </View>
      ) : (
        <SectionList
          sections={sections}
          keyExtractor={(s) => `svc-${s.id}`}
          stickySectionHeadersEnabled={false}
          contentContainerStyle={{ paddingTop: 8, paddingBottom: insets.bottom + 96 }}
          renderSectionHeader={({ section }) => (
            <Text style={styles.sectionHeader}>{section.title.toUpperCase()}</Text>
          )}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.card}
              onPress={() => navigation.navigate('ServiceDetail', { serviceId: item.id })}
              activeOpacity={0.7}
            >
              <View style={styles.dateCol}>
                <Text style={styles.dateDay}>{format(parseISO(item.service_date), 'd')}</Text>
                <Text style={styles.dateMonth}>{format(parseISO(item.service_date), 'MMM')}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.cardTitle} numberOfLines={1}>
                  {item.customer_name ?? '(no customer)'}
                </Text>
                <Text style={styles.cardSub} numberOfLines={1}>
                  {item.wheel_size}" {item.service_type} · {item.bike_type}
                  {item.payment_method ? ` · ${item.payment_method}` : ''}
                </Text>
              </View>
              <View style={styles.priceCol}>
                <Text style={styles.price}>{money(item.price + item.other_fee)}</Text>
                {item.tip > 0 ? <Text style={styles.tip}>+{money(item.tip)} tip</Text> : null}
              </View>
            </TouchableOpacity>
          )}
        />
      )}
      <FAB onPress={() => navigation.navigate('AddEditService', {})} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  scopeBar: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF3E0', paddingHorizontal: 14, paddingVertical: 8 },
  scopeText: { flex: 1, fontSize: 13, fontWeight: '600', color: '#E65100' },
  scopeClear: { fontSize: 12, color: '#E65100', fontWeight: '700' },
  summaryBar: { flexDirection: 'row', justifyContent: 'space-between', backgroundColor: '#fff', paddingHorizontal: 16, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#eee' },
  summaryCount: { fontSize: 12, color: '#888', fontWeight: '600' },
  summaryRevenue: { fontSize: 14, color: '#2196F3', fontWeight: '700' },
  emptyWrap: { flex: 1, justifyContent: 'center' },
  sectionHeader: { fontSize: 11, fontWeight: '700', color: '#888', letterSpacing: 0.8, paddingHorizontal: 16, paddingTop: 16, paddingBottom: 6 },
  card: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', marginHorizontal: 12, marginVertical: 4, borderRadius: 12, padding: 12, elevation: 1, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 2 },
  dateCol: { width: 44, alignItems: 'center', marginRight: 12 },
  dateDay: { fontSize: 18, fontWeight: '700', color: '#2196F3' },
  dateMonth: { fontSize: 10, color: '#888', fontWeight: '700', letterSpacing: 0.5 },
  cardTitle: { fontSize: 15, fontWeight: '600', color: '#222' },
  cardSub: { fontSize: 12, color: '#666', marginTop: 2 },
  priceCol: { alignItems: 'flex-end', marginLeft: 8 },
  price: { fontSize: 15, fontWeight: '700', color: '#222' },
  tip: { fontSize: 11, color: '#2E7D32', marginTop: 2 },
});
