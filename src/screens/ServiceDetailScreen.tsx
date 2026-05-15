import React, { useCallback, useLayoutEffect, useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/native';
import { RootStackParamList, Service, Customer, InventoryItem } from '../models/types';
import { getService, deleteService } from '../db/services';
import { getCustomer } from '../db/customers';
import { getInventoryItem } from '../db/inventory';
import { money, formatServiceDate } from '../utils/format';
import ConfirmModal from '../components/ConfirmModal';

type Props = NativeStackScreenProps<RootStackParamList, 'ServiceDetail'>;

export default function ServiceDetailScreen({ navigation, route }: Props) {
  const { serviceId } = route.params;
  const [service, setService] = useState<Service | null>(null);
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [inventory, setInventory] = useState<InventoryItem | null>(null);
  const [showDelete, setShowDelete] = useState(false);

  const refresh = useCallback(async () => {
    const s = await getService(serviceId);
    setService(s);
    if (s?.customer_id != null) setCustomer(await getCustomer(s.customer_id));
    else setCustomer(null);
    if (s?.inventory_item_id != null) setInventory(await getInventoryItem(s.inventory_item_id));
    else setInventory(null);
  }, [serviceId]);

  useFocusEffect(useCallback(() => { refresh(); }, [refresh]));

  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <TouchableOpacity
          onPress={() => navigation.navigate('AddEditService', { serviceId })}
          hitSlop={8}
        >
          <Text style={styles.headerLink}>Edit</Text>
        </TouchableOpacity>
      ),
    });
  }, [navigation, serviceId]);

  if (!service) return <View style={styles.container} />;

  const revenue = service.price + service.other_fee;
  const cost = service.cost_at_service ?? 0;
  const profit = revenue - cost;

  const confirmDelete = async () => {
    setShowDelete(false);
    await deleteService(serviceId);
    navigation.goBack();
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.date}>{formatServiceDate(service.service_date, 'EEEE, MMM d, yyyy')}</Text>
      <Text style={styles.title}>
        {service.wheel_size}" {service.service_type} · {service.bike_type}
      </Text>

      <View style={styles.priceBlock}>
        <Text style={styles.bigPrice}>{money(revenue)}</Text>
        {service.tip > 0 ? <Text style={styles.bigTip}>+ {money(service.tip)} tip</Text> : null}
      </View>

      <View style={styles.card}>
        <KV k="Base price" v={money(service.price)} />
        {service.other_fee > 0 ? <KV k="Surcharge" v={money(service.other_fee)} /> : null}
        {service.tip > 0 ? <KV k="Tip" v={money(service.tip)} /> : null}
        <View style={styles.divider} />
        <KV k="Inventory cost" v={service.cost_at_service != null ? money(cost) : '—'} />
        <KV k="Profit" v={money(profit)} valueStyle={{ color: '#2E7D32', fontWeight: '700' }} />
      </View>

      <View style={styles.card}>
        {customer ? (
          <TouchableOpacity
            onPress={() => navigation.navigate('CustomerDetail', { customerId: customer.id })}
          >
            <Text style={styles.k}>Customer</Text>
            <Text style={styles.linkValue}>{customer.name}</Text>
            {customer.phone ? <Text style={styles.subValue}>{customer.phone}</Text> : null}
          </TouchableOpacity>
        ) : (
          <KV k="Customer" v="(none)" />
        )}
        <View style={styles.divider} />
        <KV k="Payment" v={service.payment_method || '—'} />
        <KV k="Source" v={service.source || '—'} />
      </View>

      <View style={styles.card}>
        {inventory ? (
          <TouchableOpacity
            onPress={() => navigation.navigate('InventoryDetail', { itemId: inventory.id })}
          >
            <Text style={styles.k}>Linked inventory</Text>
            <Text style={styles.linkValue}>
              {inventory.wheel_size}" {inventory.item_type} · {inventory.bike_category}
              {inventory.tire_spec ? ` · ${inventory.tire_spec}` : ''}
            </Text>
            <Text style={styles.subValue}>
              Current stock: {inventory.quantity} · cost was {money(cost)}
            </Text>
          </TouchableOpacity>
        ) : (
          <KV k="Linked inventory" v={service.cost_at_service != null ? `Cost recorded ${money(cost)}` : 'None (no item used)'} />
        )}
      </View>

      {service.notes ? (
        <View style={styles.card}>
          <Text style={styles.k}>Notes</Text>
          <Text style={styles.notes}>{service.notes}</Text>
        </View>
      ) : null}

      <TouchableOpacity style={styles.deleteBtn} onPress={() => setShowDelete(true)}>
        <Text style={styles.deleteText}>Delete service</Text>
      </TouchableOpacity>

      <ConfirmModal
        visible={showDelete}
        title="Delete service?"
        message={
          service.inventory_item_id != null
            ? "This will restore 1 unit to the linked inventory item. Cannot be undone."
            : "This action cannot be undone."
        }
        confirmLabel="Delete"
        onConfirm={confirmDelete}
        onCancel={() => setShowDelete(false)}
        destructive
      />
    </ScrollView>
  );
}

function KV({ k, v, valueStyle }: { k: string; v: string; valueStyle?: any }) {
  return (
    <View style={styles.kvRow}>
      <Text style={styles.k}>{k}</Text>
      <Text style={[styles.v, valueStyle]}>{v}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  content: { padding: 16, paddingBottom: 40 },
  date: { fontSize: 13, color: '#888', textAlign: 'center', marginBottom: 4 },
  title: { fontSize: 22, fontWeight: '700', color: '#222', textAlign: 'center' },
  priceBlock: { alignItems: 'center', marginTop: 12, marginBottom: 16 },
  bigPrice: { fontSize: 36, fontWeight: '800', color: '#2196F3' },
  bigTip: { fontSize: 13, color: '#2E7D32', marginTop: 2 },
  card: { backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 12, elevation: 1, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 2 },
  kvRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6 },
  k: { fontSize: 12, color: '#888', textTransform: 'uppercase', fontWeight: '600', letterSpacing: 0.5 },
  v: { fontSize: 15, color: '#222', fontWeight: '600' },
  linkValue: { fontSize: 15, color: '#2196F3', fontWeight: '700', marginTop: 4 },
  subValue: { fontSize: 12, color: '#666', marginTop: 2 },
  divider: { height: 1, backgroundColor: '#eee', marginVertical: 8 },
  notes: { fontSize: 14, color: '#222', marginTop: 6, lineHeight: 20 },
  deleteBtn: { padding: 14, alignItems: 'center', marginTop: 8 },
  deleteText: { color: '#F44336', fontSize: 15, fontWeight: '600' },
  headerLink: { color: '#2196F3', fontSize: 15, fontWeight: '600' },
});
