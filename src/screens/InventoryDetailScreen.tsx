import React, { useCallback, useLayoutEffect, useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity, Alert,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/native';
import { RootStackParamList, InventoryItem } from '../models/types';
import {
  getInventoryItem, adjustInventoryQuantity, deleteInventoryItem, getInventoryUsageCount,
} from '../db/inventory';
import { money } from '../utils/format';
import { stockColor } from '../utils/colors';
import ConfirmModal from '../components/ConfirmModal';

type Props = NativeStackScreenProps<RootStackParamList, 'InventoryDetail'>;

export default function InventoryDetailScreen({ navigation, route }: Props) {
  const { itemId } = route.params;
  const [item, setItem] = useState<InventoryItem | null>(null);
  const [usage, setUsage] = useState(0);
  const [showDelete, setShowDelete] = useState(false);

  const refresh = useCallback(async () => {
    const i = await getInventoryItem(itemId);
    setItem(i);
    setUsage(await getInventoryUsageCount(itemId));
  }, [itemId]);

  useFocusEffect(useCallback(() => { refresh(); }, [refresh]));

  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <TouchableOpacity
          onPress={() => navigation.navigate('AddEditInventoryItem', { itemId })}
          hitSlop={8}
        >
          <Text style={styles.headerLink}>Edit</Text>
        </TouchableOpacity>
      ),
    });
  }, [navigation, itemId]);

  if (!item) return <View style={styles.container} />;

  const color = stockColor(item.quantity);
  const profit = item.sell_price - item.purchase_price;

  const adjust = async (delta: number) => {
    await adjustInventoryQuantity(itemId, delta);
    refresh();
  };

  const confirmDelete = async () => {
    setShowDelete(false);
    if (usage > 0) {
      Alert.alert(
        'In use',
        `This item is linked to ${usage} service${usage === 1 ? '' : 's'}. Deleting will keep those services but clear the inventory link.`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Delete anyway',
            style: 'destructive',
            onPress: async () => {
              await deleteInventoryItem(itemId);
              navigation.goBack();
            },
          },
        ]
      );
      return;
    }
    await deleteInventoryItem(itemId);
    navigation.goBack();
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={[styles.heroBadge, { backgroundColor: color.bg }]}>
        <Text style={[styles.heroQty, { color: color.fg }]}>{item.quantity}</Text>
        <Text style={[styles.heroLabel, { color: color.fg }]}>{color.label}</Text>
      </View>

      <Text style={styles.title}>
        {item.wheel_size}" {item.item_type}
      </Text>
      <Text style={styles.subtitle}>
        {item.bike_category}
        {item.tire_spec ? ` · ${item.tire_spec}` : ''}
      </Text>

      <View style={styles.adjustRow}>
        <TouchableOpacity style={styles.adjustBtn} onPress={() => adjust(-1)}>
          <Text style={styles.adjustText}>−1</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.adjustBtn, styles.adjustBtnPlus]} onPress={() => adjust(1)}>
          <Text style={[styles.adjustText, { color: '#fff' }]}>+1</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.card}>
        <View style={styles.kvRow}>
          <Text style={styles.k}>Purchase price</Text>
          <Text style={styles.v}>{money(item.purchase_price)}</Text>
        </View>
        <View style={styles.kvRow}>
          <Text style={styles.k}>Sell price</Text>
          <Text style={styles.v}>{money(item.sell_price)}</Text>
        </View>
        <View style={styles.kvRow}>
          <Text style={styles.k}>Profit per unit</Text>
          <Text style={[styles.v, { color: '#2E7D32', fontWeight: '700' }]}>{money(profit)}</Text>
        </View>
      </View>

      {item.notes ? (
        <View style={styles.card}>
          <Text style={styles.k}>Notes</Text>
          <Text style={styles.notesText}>{item.notes}</Text>
        </View>
      ) : null}

      <TouchableOpacity
        style={styles.linkBtn}
        onPress={() => navigation.navigate('ServiceList', { inventoryItemId: itemId })}
      >
        <Text style={styles.linkBtnText}>
          🔧 View {usage} service{usage === 1 ? '' : 's'} linked to this item →
        </Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.deleteBtn} onPress={() => setShowDelete(true)}>
        <Text style={styles.deleteText}>Delete item</Text>
      </TouchableOpacity>

      <ConfirmModal
        visible={showDelete}
        title="Delete inventory item?"
        message="This action cannot be undone."
        confirmLabel="Delete"
        onConfirm={confirmDelete}
        onCancel={() => setShowDelete(false)}
        destructive
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  content: { padding: 16, paddingBottom: 40 },
  heroBadge: { alignSelf: 'center', width: 96, height: 96, borderRadius: 48, justifyContent: 'center', alignItems: 'center', marginBottom: 16 },
  heroQty: { fontSize: 36, fontWeight: '800' },
  heroLabel: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  title: { fontSize: 22, fontWeight: '700', color: '#222', textAlign: 'center' },
  subtitle: { fontSize: 14, color: '#666', textAlign: 'center', marginTop: 4, marginBottom: 16 },
  adjustRow: { flexDirection: 'row', gap: 12, marginBottom: 20 },
  adjustBtn: { flex: 1, borderRadius: 8, paddingVertical: 14, backgroundColor: '#fff', borderWidth: 1.5, borderColor: '#2196F3', alignItems: 'center' },
  adjustBtnPlus: { backgroundColor: '#2196F3' },
  adjustText: { fontSize: 18, fontWeight: '700', color: '#2196F3' },
  card: { backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 12, elevation: 1, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 2 },
  kvRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6 },
  k: { fontSize: 13, color: '#666' },
  v: { fontSize: 15, color: '#222', fontWeight: '600' },
  notesText: { fontSize: 14, color: '#222', marginTop: 4, lineHeight: 20 },
  linkBtn: { backgroundColor: '#fff', borderRadius: 12, padding: 16, marginTop: 4, marginBottom: 12, alignItems: 'center', borderWidth: 1, borderColor: '#e0e0e0' },
  linkBtnText: { color: '#2196F3', fontSize: 14, fontWeight: '600' },
  deleteBtn: { padding: 14, alignItems: 'center', marginTop: 8 },
  deleteText: { color: '#F44336', fontSize: 15, fontWeight: '600' },
  headerLink: { color: '#2196F3', fontSize: 15, fontWeight: '600' },
});
