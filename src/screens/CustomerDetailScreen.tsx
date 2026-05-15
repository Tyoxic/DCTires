import React, { useCallback, useLayoutEffect, useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity, FlatList,
  TextInput, Alert, KeyboardAvoidingView, Platform,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/native';
import { format, parseISO } from 'date-fns';
import {
  RootStackParamList, Customer, Service, CustomerStats,
} from '../models/types';
import {
  getCustomer, getCustomerStats, updateCustomer, deleteCustomer,
} from '../db/customers';
import { getServicesByCustomer } from '../db/services';
import ConfirmModal from '../components/ConfirmModal';
import { money } from '../utils/format';

type Props = NativeStackScreenProps<RootStackParamList, 'CustomerDetail'>;

export default function CustomerDetailScreen({ navigation, route }: Props) {
  const { customerId } = route.params;
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [services, setServices] = useState<Service[]>([]);
  const [stats, setStats] = useState<CustomerStats>({ service_count: 0, total_revenue: 0, total_tip: 0, total_profit: 0, last_service_date: null });
  const [editingName, setEditingName] = useState('');
  const [editingPhone, setEditingPhone] = useState('');
  const [editingNotes, setEditingNotes] = useState('');
  const [edited, setEdited] = useState(false);
  const [showDelete, setShowDelete] = useState(false);

  const refresh = useCallback(async () => {
    const c = await getCustomer(customerId);
    setCustomer(c);
    if (c) {
      setEditingName(c.name);
      setEditingPhone(c.phone ?? '');
      setEditingNotes(c.notes);
      setEdited(false);
    }
    setServices(await getServicesByCustomer(customerId));
    setStats(await getCustomerStats(customerId));
  }, [customerId]);

  useFocusEffect(useCallback(() => { refresh(); }, [refresh]));

  useLayoutEffect(() => {
    navigation.setOptions({ title: customer?.name ?? 'Customer' });
  }, [navigation, customer?.name]);

  const save = async () => {
    if (!editingName.trim()) {
      Alert.alert('Name required', 'Customer name cannot be empty.');
      return;
    }
    await updateCustomer(customerId, {
      name: editingName.trim(),
      phone: editingPhone.trim() || null,
      notes: editingNotes.trim(),
    });
    setEdited(false);
    refresh();
  };

  const confirmDelete = async () => {
    setShowDelete(false);
    await deleteCustomer(customerId);
    navigation.goBack();
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 88 : 0}
    >
      <FlatList
        style={styles.container}
        data={services}
        keyExtractor={(s) => `svc-${s.id}`}
        ListHeaderComponent={
          <View style={{ padding: 16 }}>
            <View style={styles.statsCard}>
              <View style={styles.statBlock}>
                <Text style={styles.statValue}>{stats.service_count}</Text>
                <Text style={styles.statLabel}>Services</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statBlock}>
                <Text style={styles.statValue}>{money(stats.total_revenue)}</Text>
                <Text style={styles.statLabel}>Revenue</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statBlock}>
                <Text style={[styles.statValue, { color: '#2E7D32' }]}>{money(stats.total_profit)}</Text>
                <Text style={styles.statLabel}>Profit</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statBlock}>
                <Text style={styles.statValue}>{money(stats.total_tip)}</Text>
                <Text style={styles.statLabel}>Tips</Text>
              </View>
            </View>

            <View style={styles.card}>
              <Text style={styles.label}>Name</Text>
              <TextInput
                style={styles.input}
                value={editingName}
                onChangeText={(t) => { setEditingName(t); setEdited(true); }}
              />
              <Text style={styles.label}>Phone</Text>
              <TextInput
                style={styles.input}
                value={editingPhone}
                onChangeText={(t) => { setEditingPhone(t); setEdited(true); }}
                keyboardType="phone-pad"
                placeholder="Optional"
              />
              <Text style={styles.label}>Notes</Text>
              <TextInput
                style={[styles.input, styles.notesInput]}
                value={editingNotes}
                onChangeText={(t) => { setEditingNotes(t); setEdited(true); }}
                multiline
                placeholder="Optional"
              />
              {edited ? (
                <TouchableOpacity style={styles.saveBtn} onPress={save}>
                  <Text style={styles.saveBtnText}>Save</Text>
                </TouchableOpacity>
              ) : null}
            </View>

            <TouchableOpacity
              style={styles.newServiceBtn}
              onPress={() => navigation.navigate('AddEditService', { customerId })}
            >
              <Text style={styles.newServiceText}>＋ New service for {customer?.name ?? 'customer'}</Text>
            </TouchableOpacity>

            <Text style={styles.historyLabel}>History</Text>
          </View>
        }
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.svcRow}
            onPress={() => navigation.navigate('ServiceDetail', { serviceId: item.id })}
          >
            <View style={styles.svcDate}>
              <Text style={styles.svcDay}>{format(parseISO(item.service_date), 'd')}</Text>
              <Text style={styles.svcMonth}>{format(parseISO(item.service_date), 'MMM yy')}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.svcTitle}>
                {item.wheel_size}" {item.service_type} · {item.bike_type}
              </Text>
              <Text style={styles.svcSub}>
                {money(item.price + item.other_fee)}
                {item.tip > 0 ? ` · +${money(item.tip)} tip` : ''}
                {item.payment_method ? ` · ${item.payment_method}` : ''}
              </Text>
            </View>
          </TouchableOpacity>
        )}
        ListFooterComponent={
          <TouchableOpacity style={styles.deleteBtn} onPress={() => setShowDelete(true)}>
            <Text style={styles.deleteText}>Delete customer</Text>
          </TouchableOpacity>
        }
      />
      <ConfirmModal
        visible={showDelete}
        title="Delete customer?"
        message={`This will keep their service records but unlink them from this customer. Continue?`}
        confirmLabel="Delete"
        onConfirm={confirmDelete}
        onCancel={() => setShowDelete(false)}
        destructive
      />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  statsCard: { flexDirection: 'row', backgroundColor: '#fff', borderRadius: 12, padding: 14, marginBottom: 12, elevation: 1, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 2 },
  statBlock: { flex: 1, alignItems: 'center' },
  statDivider: { width: 1, backgroundColor: '#eee', marginHorizontal: 6 },
  statValue: { fontSize: 16, fontWeight: '700', color: '#222' },
  statLabel: { fontSize: 10, color: '#888', marginTop: 2, textTransform: 'uppercase', letterSpacing: 0.5 },
  card: { backgroundColor: '#fff', borderRadius: 12, padding: 16, elevation: 1, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 2 },
  label: { fontSize: 12, color: '#666', fontWeight: '600', marginTop: 8, marginBottom: 4 },
  input: { borderWidth: 1, borderColor: '#e0e0e0', backgroundColor: '#fafafa', borderRadius: 8, padding: 10, fontSize: 15 },
  notesInput: { minHeight: 60, textAlignVertical: 'top' },
  saveBtn: { backgroundColor: '#2196F3', borderRadius: 8, paddingVertical: 12, alignItems: 'center', marginTop: 12 },
  saveBtnText: { color: '#fff', fontSize: 14, fontWeight: '700' },
  newServiceBtn: { backgroundColor: '#fff', borderRadius: 12, paddingVertical: 14, alignItems: 'center', marginTop: 12, borderWidth: 1, borderColor: '#2196F3' },
  newServiceText: { color: '#2196F3', fontSize: 14, fontWeight: '700' },
  historyLabel: { fontSize: 11, fontWeight: '700', color: '#888', textTransform: 'uppercase', letterSpacing: 0.6, marginTop: 16, marginLeft: 4 },
  svcRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', marginHorizontal: 12, marginVertical: 4, borderRadius: 12, padding: 12 },
  svcDate: { width: 44, alignItems: 'center', marginRight: 12 },
  svcDay: { fontSize: 18, fontWeight: '700', color: '#2196F3' },
  svcMonth: { fontSize: 10, color: '#888', fontWeight: '600' },
  svcTitle: { fontSize: 14, fontWeight: '600', color: '#222' },
  svcSub: { fontSize: 12, color: '#666', marginTop: 2 },
  deleteBtn: { padding: 16, alignItems: 'center', marginTop: 8 },
  deleteText: { color: '#F44336', fontSize: 15, fontWeight: '600' },
});
