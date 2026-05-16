import React, { useCallback, useLayoutEffect, useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { RootStackParamList } from '../models/types';
import { getCurrentMonthTotals, getAllTimeTotals, MonthTotals } from '../db/services';
import { getAllInventoryItems } from '../db/inventory';
import { money, currentYYYYMM, formatMonth } from '../utils/format';

type Props = NativeStackScreenProps<RootStackParamList, 'Home'>;

export default function HomeScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const [monthTotals, setMonthTotals] = useState<MonthTotals>({ revenue: 0, profit: 0, tip: 0, count: 0 });
  const [allTime, setAllTime] = useState<MonthTotals>({ revenue: 0, profit: 0, tip: 0, count: 0 });
  const [lowStock, setLowStock] = useState(0);
  const [inventoryCount, setInventoryCount] = useState(0);

  const refresh = useCallback(async () => {
    const yyyyMM = currentYYYYMM();
    const [month, all, inv] = await Promise.all([
      getCurrentMonthTotals(yyyyMM),
      getAllTimeTotals(),
      getAllInventoryItems(),
    ]);
    setMonthTotals(month);
    setAllTime(all);
    setInventoryCount(inv.length);
    setLowStock(inv.filter((i) => i.quantity <= 1).length);
  }, []);

  useFocusEffect(useCallback(() => { refresh(); }, [refresh]));

  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <TouchableOpacity onPress={() => navigation.navigate('Settings')} hitSlop={8}>
          <Text style={{ fontSize: 22 }}>{'⚙️'}</Text>
        </TouchableOpacity>
      ),
    });
  }, [navigation]);

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 40 }]}
    >
      <Text style={styles.sectionLabel}>{formatMonth(currentYYYYMM())}</Text>
      <View style={styles.statsCard}>
        <View style={styles.statBlock}>
          <Text style={styles.statValue}>{money(monthTotals.revenue)}</Text>
          <Text style={styles.statLabel}>Revenue</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statBlock}>
          <Text style={[styles.statValue, { color: '#2E7D32' }]}>{money(monthTotals.profit)}</Text>
          <Text style={styles.statLabel}>Profit</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statBlock}>
          <Text style={styles.statValue}>{monthTotals.count}</Text>
          <Text style={styles.statLabel}>Jobs</Text>
        </View>
      </View>

      <Text style={styles.sectionLabel}>All time</Text>
      <View style={styles.statsCard}>
        <View style={styles.statBlock}>
          <Text style={styles.statValue}>{money(allTime.revenue)}</Text>
          <Text style={styles.statLabel}>Revenue</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statBlock}>
          <Text style={[styles.statValue, { color: '#2E7D32' }]}>{money(allTime.profit)}</Text>
          <Text style={styles.statLabel}>Profit</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statBlock}>
          <Text style={styles.statValue}>{money(allTime.tip)}</Text>
          <Text style={styles.statLabel}>Tips</Text>
        </View>
      </View>

      <View style={styles.tiles}>
        <TouchableOpacity
          style={[styles.tile, styles.tileInventory]}
          onPress={() => navigation.navigate('InventoryList')}
        >
          <Text style={styles.tileIcon}>📦</Text>
          <Text style={styles.tileTitle}>Inventory</Text>
          <Text style={styles.tileSub}>
            {inventoryCount} items
            {lowStock > 0 ? ` · ${lowStock} low` : ''}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tile, styles.tileServices]}
          onPress={() => navigation.navigate('ServiceList')}
        >
          <Text style={styles.tileIcon}>🔧</Text>
          <Text style={styles.tileTitle}>Services</Text>
          <Text style={styles.tileSub}>{allTime.count} total</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tile, styles.tileCustomers]}
          onPress={() => navigation.navigate('CustomersList')}
        >
          <Text style={styles.tileIcon}>👤</Text>
          <Text style={styles.tileTitle}>Customers</Text>
          <Text style={styles.tileSub}>Tap to search</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tile, styles.tileNew]}
          onPress={() => navigation.navigate('AddEditService', {})}
        >
          <Text style={styles.tileIcon}>＋</Text>
          <Text style={styles.tileTitle}>New service</Text>
          <Text style={styles.tileSub}>Log a job</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tile, styles.tileStats]}
          onPress={() => navigation.navigate('Stats')}
        >
          <Text style={styles.tileIcon}>📊</Text>
          <Text style={styles.tileTitle}>Stats</Text>
          <Text style={styles.tileSub}>By month + top customers</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  content: { padding: 16 },
  sectionLabel: { fontSize: 12, fontWeight: '700', color: '#888', textTransform: 'uppercase', letterSpacing: 0.6, marginTop: 8, marginBottom: 8, marginLeft: 4 },
  statsCard: {
    flexDirection: 'row', backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 8,
    elevation: 1, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 2,
  },
  statBlock: { flex: 1, alignItems: 'center' },
  statDivider: { width: 1, backgroundColor: '#eee', marginHorizontal: 8 },
  statValue: { fontSize: 20, fontWeight: '700', color: '#222' },
  statLabel: { fontSize: 11, color: '#888', marginTop: 2, textTransform: 'uppercase', letterSpacing: 0.5 },
  tiles: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 16 },
  tile: {
    flexBasis: '47%', flexGrow: 1, backgroundColor: '#fff', borderRadius: 12, padding: 18,
    elevation: 1, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 2,
  },
  tileInventory: { backgroundColor: '#E3F2FD' },
  tileServices: { backgroundColor: '#E8F5E9' },
  tileCustomers: { backgroundColor: '#FFF3E0' },
  tileNew: { backgroundColor: '#F3E5F5' },
  tileStats: { backgroundColor: '#FCE4EC' },
  tileIcon: { fontSize: 28, marginBottom: 6 },
  tileTitle: { fontSize: 16, fontWeight: '700', color: '#222' },
  tileSub: { fontSize: 12, color: '#666', marginTop: 2 },
});
