import React, { useCallback, useMemo, useState } from 'react';
import {
  View, Text, FlatList, StyleSheet, TouchableOpacity,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { RootStackParamList, InventoryItem } from '../models/types';
import {
  getAllInventoryItems,
  getInventorySizeBuckets,
  InventorySizeBucket,
} from '../db/inventory';
import SearchBar from '../components/SearchBar';
import EmptyState from '../components/EmptyState';
import FAB from '../components/FAB';
import { money } from '../utils/format';
import { stockColor } from '../utils/colors';

type Props = NativeStackScreenProps<RootStackParamList, 'InventoryList'>;

function matches(item: InventoryItem, q: string): boolean {
  if (!q) return true;
  const hay = `${item.wheel_size} ${item.tire_spec ?? ''} ${item.bike_category} ${item.item_type} ${item.notes}`.toLowerCase();
  return hay.includes(q);
}

export default function InventoryListScreen({ navigation, route }: Props) {
  const insets = useSafeAreaInsets();
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [buckets, setBuckets] = useState<InventorySizeBucket[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState(route.params?.initialQuery ?? '');

  const refresh = useCallback(async () => {
    setLoading(true);
    const [all, b] = await Promise.all([
      getAllInventoryItems(),
      getInventorySizeBuckets(),
    ]);
    setItems(all);
    setBuckets(b);
    setLoading(false);
  }, []);

  useFocusEffect(useCallback(() => { refresh(); }, [refresh]));

  const filteredItems = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter((i) => matches(i, q));
  }, [items, query]);

  const isSearching = query.trim().length > 0;

  return (
    <View style={styles.container}>
      <SearchBar
        value={query}
        onChangeText={setQuery}
        placeholder="Search size, spec, bike, type, notes..."
      />
      {isSearching ? (
        <FlatList
          data={filteredItems}
          keyExtractor={(i) => `inv-${i.id}`}
          refreshing={loading}
          onRefresh={refresh}
          contentContainerStyle={
            filteredItems.length === 0
              ? { flex: 1 }
              : { paddingTop: 8, paddingBottom: insets.bottom + 96 }
          }
          ListEmptyComponent={
            loading ? null : (
              <EmptyState icon="🔍" title="No matches" subtitle="Try a different search term." />
            )
          }
          renderItem={({ item }) => {
            const color = stockColor(item.quantity);
            const profit = item.sell_price - item.purchase_price;
            return (
              <TouchableOpacity
                style={styles.itemRow}
                onPress={() => navigation.navigate('InventoryDetail', { itemId: item.id })}
                activeOpacity={0.7}
              >
                <View style={[styles.badge, { backgroundColor: color.bg }]}>
                  <Text style={[styles.badgeQty, { color: color.fg }]}>{item.quantity}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.itemTitle} numberOfLines={1}>
                    {item.wheel_size}" {item.item_type} · {item.bike_category}
                    {item.tire_spec ? ` · ${item.tire_spec}` : ''}
                  </Text>
                  <Text style={styles.itemSub} numberOfLines={1}>
                    {money(item.purchase_price)} → {money(item.sell_price)} ({money(profit)} profit)
                    {item.notes ? ` · ${item.notes}` : ''}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          }}
        />
      ) : (
        <FlatList
          data={buckets}
          keyExtractor={(b) => `size-${b.wheel_size}`}
          refreshing={loading}
          onRefresh={refresh}
          contentContainerStyle={
            buckets.length === 0
              ? { flex: 1 }
              : { paddingTop: 8, paddingBottom: insets.bottom + 96 }
          }
          ListHeaderComponent={
            buckets.length > 0 ? (
              <Text style={styles.sectionHint}>BROWSE BY WHEEL SIZE</Text>
            ) : null
          }
          ListEmptyComponent={
            loading ? null : (
              <EmptyState
                icon="📦"
                title="No inventory yet"
                subtitle="Tap + to add your first item."
              />
            )
          }
          renderItem={({ item }) => {
            // Bucket badge color: red if any item is out, yellow if any is low,
            // green if all are stocked.
            const bg =
              item.out_count > 0 ? '#FFEBEE'
              : item.low_count > 0 ? '#FFF3E0'
              : '#E8F5E9';
            const fg =
              item.out_count > 0 ? '#C62828'
              : item.low_count > 0 ? '#E65100'
              : '#2E7D32';
            return (
              <TouchableOpacity
                style={styles.bucketRow}
                onPress={() => navigation.navigate('InventoryBySize', { size: item.wheel_size })}
                activeOpacity={0.7}
              >
                <View style={[styles.bucketBadge, { backgroundColor: bg }]}>
                  <Text style={[styles.bucketSize, { color: fg }]}>
                    {item.wheel_size}"
                  </Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.bucketTitle}>
                    {item.item_count} item{item.item_count === 1 ? '' : 's'}
                    {' · '}
                    {item.total_stock} in stock
                  </Text>
                  <Text style={styles.bucketSub}>
                    {item.out_count > 0
                      ? `⚠ ${item.out_count} out · ${item.low_count} low`
                      : item.low_count > 0
                      ? `⚠ ${item.low_count} low`
                      : 'All stocked'}
                  </Text>
                </View>
                <Text style={styles.chevron}>›</Text>
              </TouchableOpacity>
            );
          }}
        />
      )}
      <FAB onPress={() => navigation.navigate('AddEditInventoryItem', {})} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  sectionHint: { fontSize: 11, fontWeight: '700', color: '#888', letterSpacing: 0.6, paddingHorizontal: 16, paddingTop: 12, paddingBottom: 6 },

  // Bucket rows (size groups)
  bucketRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#fff', marginHorizontal: 12, marginVertical: 4,
    borderRadius: 12, padding: 14,
    elevation: 1, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 2,
  },
  bucketBadge: { width: 56, height: 56, borderRadius: 28, justifyContent: 'center', alignItems: 'center', marginRight: 14 },
  bucketSize: { fontSize: 18, fontWeight: '800' },
  bucketTitle: { fontSize: 15, fontWeight: '700', color: '#222' },
  bucketSub: { fontSize: 12, color: '#666', marginTop: 2 },
  chevron: { fontSize: 28, color: '#bbb', fontWeight: '300', marginLeft: 8 },

  // Search-mode item rows (existing flat layout)
  itemRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#fff', marginHorizontal: 12, marginVertical: 4,
    borderRadius: 12, padding: 12,
    elevation: 1, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 2,
  },
  badge: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  badgeQty: { fontSize: 18, fontWeight: '700' },
  itemTitle: { fontSize: 15, fontWeight: '600', color: '#222' },
  itemSub: { fontSize: 12, color: '#666', marginTop: 2 },
});
