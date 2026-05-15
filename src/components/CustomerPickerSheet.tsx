import React, { useEffect, useMemo, useState } from 'react';
import {
  Modal, View, Text, StyleSheet, TouchableOpacity, FlatList,
  TextInput, KeyboardAvoidingView, Platform,
} from 'react-native';
import { Customer } from '../models/types';
import { getAllCustomers, createCustomer, findCustomerByName } from '../db/customers';

interface Props {
  visible: boolean;
  selectedId: number | null;
  onSelect: (customer: Customer | null) => void;
  onClose: () => void;
}

export default function CustomerPickerSheet({ visible, selectedId, onSelect, onClose }: Props) {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [query, setQuery] = useState('');
  const [newPhone, setNewPhone] = useState('');

  useEffect(() => {
    if (!visible) return;
    (async () => {
      const list = await getAllCustomers();
      setCustomers(list);
      setQuery('');
      setNewPhone('');
    })();
  }, [visible]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return customers;
    return customers.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        (c.phone ?? '').toLowerCase().includes(q)
    );
  }, [customers, query]);

  const hasExactMatch = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return true;
    return customers.some((c) => c.name.toLowerCase() === q);
  }, [customers, query]);

  const handleCreate = async () => {
    const trimmed = query.trim();
    if (!trimmed) return;
    const existing = await findCustomerByName(trimmed);
    if (existing) {
      onSelect(existing);
      onClose();
      return;
    }
    const id = await createCustomer({
      name: trimmed,
      phone: newPhone.trim() || null,
      source: '',
    });
    onSelect({
      id, name: trimmed, phone: newPhone.trim() || null, notes: '', source: '',
      created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
    });
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={styles.sheet}>
          <View style={styles.header}>
            <Text style={styles.title}>Select customer</Text>
            <TouchableOpacity onPress={onClose} hitSlop={10}>
              <Text style={styles.close}>✕</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.searchBar}>
            <TextInput
              style={styles.searchInput}
              value={query}
              onChangeText={setQuery}
              placeholder="Search or type a new name..."
              placeholderTextColor="#999"
              autoFocus
              autoCorrect={false}
            />
          </View>
          {query.trim().length > 0 && !hasExactMatch ? (
            <View style={styles.newWrap}>
              <Text style={styles.newLabel}>New customer phone (optional)</Text>
              <TextInput
                style={styles.newInput}
                value={newPhone}
                onChangeText={setNewPhone}
                placeholder="555-123-4567"
                placeholderTextColor="#999"
                keyboardType="phone-pad"
              />
              <TouchableOpacity style={styles.createBtn} onPress={handleCreate}>
                <Text style={styles.createBtnText}>+ Add "{query.trim()}"</Text>
              </TouchableOpacity>
            </View>
          ) : null}
          <FlatList
            data={filtered}
            keyExtractor={(c) => `cust-${c.id}`}
            ListHeaderComponent={
              <TouchableOpacity
                style={[styles.row, selectedId === null && styles.rowActive]}
                onPress={() => { onSelect(null); onClose(); }}
              >
                <Text style={styles.rowTitle}>None (no customer)</Text>
              </TouchableOpacity>
            }
            renderItem={({ item }) => {
              const active = selectedId === item.id;
              return (
                <TouchableOpacity
                  style={[styles.row, active && styles.rowActive]}
                  onPress={() => { onSelect(item); onClose(); }}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={styles.rowTitle}>{item.name}</Text>
                    {item.phone ? <Text style={styles.rowSub}>{item.phone}</Text> : null}
                  </View>
                  {active ? <Text style={styles.check}>✓</Text> : null}
                </TouchableOpacity>
              );
            }}
            ListEmptyComponent={
              query.trim().length === 0 ? (
                <View style={{ padding: 24 }}>
                  <Text style={{ color: '#888', textAlign: 'center' }}>No customers yet.</Text>
                </View>
              ) : null
            }
            keyboardShouldPersistTaps="handled"
          />
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: '#fff', borderTopLeftRadius: 16, borderTopRightRadius: 16, maxHeight: '85%', paddingBottom: 24 },
  header: { flexDirection: 'row', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: '#eee' },
  title: { flex: 1, fontSize: 16, fontWeight: '700', color: '#222' },
  close: { fontSize: 18, color: '#888', paddingHorizontal: 6 },
  searchBar: { paddingHorizontal: 16, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#eee' },
  searchInput: { fontSize: 15, color: '#222', backgroundColor: '#f5f5f5', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10 },
  newWrap: { padding: 16, backgroundColor: '#FFF8E1', borderBottomWidth: 1, borderBottomColor: '#FFE082' },
  newLabel: { fontSize: 12, fontWeight: '600', color: '#666', marginBottom: 6 },
  newInput: { backgroundColor: '#fff', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, fontSize: 15, borderWidth: 1, borderColor: '#FFE082' },
  createBtn: { backgroundColor: '#FF9800', borderRadius: 8, paddingVertical: 12, alignItems: 'center', marginTop: 10 },
  createBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  row: { padding: 14, borderBottomWidth: 1, borderBottomColor: '#f5f5f5', flexDirection: 'row', alignItems: 'center' },
  rowActive: { backgroundColor: '#E3F2FD' },
  rowTitle: { fontSize: 15, fontWeight: '600', color: '#222' },
  rowSub: { fontSize: 12, color: '#666', marginTop: 2 },
  check: { fontSize: 18, color: '#2196F3', fontWeight: '700' },
});
