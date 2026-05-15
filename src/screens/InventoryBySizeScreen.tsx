import React, { useCallback, useLayoutEffect, useState } from 'react';
import {
  View, Text, FlatList, StyleSheet, TouchableOpacity,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { RootStackParamList, InventoryItem } from '../models/types';
import { getInventoryItemsBySize } from '../db/inventory';
import EmptyState from '../components/EmptyState';
import FAB from '../components/FAB';
import { money } from '../utils/format';
import { stockColor } from '../utils/colors';

type Props = NativeStackScreenProps<RootStackParamList, 'InventoryBySize'>;

export default function InventoryBySizeScreen({ navigation, route }: Props) {
  const { size } = route.params;
  const insets = useSafeAreaInsets();
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    setItems(await getInventoryItemsBySize(size));
    setLoading(false);
  }, [size]);

  useFocusEffect(useCallback(() => { refresh(); }, [refresh]));

  useLayoutEffect(() => {
    navigation.setOptions({ title: `${size}" Inventory` });
  }, [navigation, size]);

  // Group items by bike category for visual hierarchy.
  const grouped = items.reduce<Record<string, InventoryItem[]>>((acc, i) => {
    (acc[i.bike_category] ??= []).push(i);
    return acc;
  }, {});
  const sections = Object.entries(grouped);

  const totalStock = items.reduce((s, i) => s + i.quantity, 0);

  return (
    <View style={styles.container}>
      <View style={styles.summaryBar}>
        <Text style={styles.summaryCount}>
          {items.length} item{items.length === 1 ? '' : 's'}
        </Text>
        <Text style={styles.summaryStock}>{totalStock} in stock</Text>
      </View>

      <FlatList
        data={sections}
        keyExtractor={([cat]) => `cat-${cat}`}
        refreshing={loading}
        onRefresh={refresh}
        contentContainerStyle={
          sections.length === 0
            ? { flex: 1 }
            : { paddingTop: 4, paddingBottom: insets.bottom + 96 }
        }
        ListEmptyComponent={
          loading ? null : (
            <EmptyState
              icon="📦"
              title={`No ${size}" items yet`}
              subtitle={`Tap + to add a ${size}" tube, tubeliss, bib, or tire.`}
            />
          )
        }
        renderItem={({ item: [category, list] }) => (
          <View>
            <Text style={styles.categoryHeader}>{category.toUpperCase()}</Text>
            {list.map((item) => {
              const color = stockColor(item.quantity);
              const profit = item.sell_price - item.purchase_price;
              return (
                <TouchableOpacity
                  key={`inv-${item.id}`}
                  style={styles.itemRow}
                  onPress={() => navigation.navigate('InventoryDetail', { itemId: item.id })}
                  activeOpacity={0.7}
                >
                  <View style={[styles.badge, { backgroundColor: color.bg }]}>
                    <Text style={[styles.badgeQty, { color: color.fg }]}>{item.quantity}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.itemTitle} numberOfLines={1}>
                      {item.item_type}
                      {item.tire_spec ? ` · ${item.tire_spec}` : ''}
                    </Text>
                    <Text style={styles.itemSub} numberOfLines={1}>
                      {money(item.purchase_price)} → {money(item.sell_price)} ({money(profit)} profit)
                      {item.notes ? ` · ${item.notes}` : ''}
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        )}
      />
      <FAB
        onPress={() =>
          navigation.navigate('AddEditInventoryItem', { defaultSize: size })
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  summaryBar: { flexDirection: 'row', justifyContent: 'space-between', backgroundColor: '#fff', paddingHorizontal: 16, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#eee' },
  summaryCount: { fontSize: 13, color: '#888', fontWeight: '600' },
  summaryStock: { fontSize: 14, color: '#2196F3', fontWeight: '700' },
  categoryHeader: { fontSize: 11, fontWeight: '700', color: '#888', letterSpacing: 0.6, paddingHorizontal: 16, paddingTop: 14, paddingBottom: 6 },
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
