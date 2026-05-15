import React, { useEffect, useState } from 'react';
import {
  Modal, View, Text, StyleSheet, TouchableOpacity, FlatList, ActivityIndicator,
} from 'react-native';
import { InventoryItem, BikeCategory, ItemType } from '../models/types';
import { findMatchingInventory, getAllInventoryItems } from '../db/inventory';
import { money } from '../utils/format';

interface Props {
  visible: boolean;
  wheel_size?: number;
  bike_category?: BikeCategory;
  item_type?: ItemType;
  selectedId: number | null;
  onSelect: (item: InventoryItem | null) => void;
  onClose: () => void;
}

export default function InventoryPickerSheet({
  visible, wheel_size, bike_category, item_type, selectedId, onSelect, onClose,
}: Props) {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [allMode, setAllMode] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!visible) return;
    (async () => {
      setLoading(true);
      try {
        if (wheel_size != null && bike_category && item_type) {
          const matches = await findMatchingInventory(wheel_size, bike_category, item_type);
          if (matches.length > 0) {
            setItems(matches);
            setAllMode(false);
          } else {
            const all = await getAllInventoryItems();
            setItems(all);
            setAllMode(true);
          }
        } else {
          const all = await getAllInventoryItems();
          setItems(all);
          setAllMode(true);
        }
      } finally {
        setLoading(false);
      }
    })();
  }, [visible, wheel_size, bike_category, item_type]);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          <View style={styles.header}>
            <Text style={styles.title}>
              {allMode ? 'All inventory' : `Matches for ${wheel_size}" ${item_type} · ${bike_category}`}
            </Text>
            <TouchableOpacity onPress={onClose} hitSlop={10}>
              <Text style={styles.close}>✕</Text>
            </TouchableOpacity>
          </View>
          {loading ? (
            <ActivityIndicator style={{ padding: 24 }} color="#2196F3" />
          ) : (
            <FlatList
              data={items}
              keyExtractor={(i) => `inv-${i.id}`}
              ListHeaderComponent={
                <TouchableOpacity
                  style={[styles.row, selectedId === null && styles.rowActive]}
                  onPress={() => { onSelect(null); onClose(); }}
                >
                  <Text style={styles.rowTitle}>None (customer brought their own)</Text>
                </TouchableOpacity>
              }
              renderItem={({ item }) => {
                const active = selectedId === item.id;
                const profit = item.sell_price - item.purchase_price;
                return (
                  <TouchableOpacity
                    style={[styles.row, active && styles.rowActive]}
                    onPress={() => { onSelect(item); onClose(); }}
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={styles.rowTitle}>
                        {item.wheel_size}" {item.item_type} · {item.bike_category}
                        {item.tire_spec ? ` · ${item.tire_spec}` : ''}
                      </Text>
                      <Text style={styles.rowSub}>
                        Stock: {item.quantity} · {money(item.purchase_price)} → {money(item.sell_price)} ({money(profit)} profit)
                      </Text>
                    </View>
                    {active ? <Text style={styles.check}>✓</Text> : null}
                  </TouchableOpacity>
                );
              }}
              ListEmptyComponent={
                <View style={{ padding: 24 }}>
                  <Text style={{ color: '#888', textAlign: 'center' }}>No inventory items yet.</Text>
                </View>
              }
            />
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: '#fff', borderTopLeftRadius: 16, borderTopRightRadius: 16, maxHeight: '80%', paddingBottom: 24 },
  header: { flexDirection: 'row', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: '#eee' },
  title: { flex: 1, fontSize: 16, fontWeight: '700', color: '#222' },
  close: { fontSize: 18, color: '#888', paddingHorizontal: 6 },
  row: { padding: 14, borderBottomWidth: 1, borderBottomColor: '#f5f5f5', flexDirection: 'row', alignItems: 'center' },
  rowActive: { backgroundColor: '#E3F2FD' },
  rowTitle: { fontSize: 14, fontWeight: '600', color: '#222' },
  rowSub: { fontSize: 12, color: '#666', marginTop: 2 },
  check: { fontSize: 18, color: '#2196F3', fontWeight: '700' },
});
