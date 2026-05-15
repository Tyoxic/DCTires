import React, { useEffect, useLayoutEffect, useState } from 'react';
import {
  View, Text, TextInput, ScrollView, StyleSheet, TouchableOpacity, Alert,
  KeyboardAvoidingView, Platform,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { format, parseISO } from 'date-fns';
import {
  RootStackParamList, BIKE_TYPES, ITEM_TYPES, PAYMENT_METHODS, SOURCES,
  BikeType, ItemType, InventoryItem, Customer, BikeCategory,
} from '../models/types';
import {
  createService, getService, updateService,
} from '../db/services';
import { getInventoryItem } from '../db/inventory';
import { getCustomer } from '../db/customers';
import ChipRow from '../components/ChipRow';
import InventoryPickerSheet from '../components/InventoryPickerSheet';
import CustomerPickerSheet from '../components/CustomerPickerSheet';
import { todayISO, money } from '../utils/format';

type Props = NativeStackScreenProps<RootStackParamList, 'AddEditService'>;

function categoryForBike(bike: BikeType): BikeCategory {
  if (bike === 'Talaria') return 'eBike';
  return bike as BikeCategory;
}

export default function AddEditServiceScreen({ navigation, route }: Props) {
  const serviceId = route.params?.serviceId;
  const isEdit = !!serviceId;

  const [serviceDate, setServiceDate] = useState(todayISO());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [bikeType, setBikeType] = useState<BikeType>('Dirtbike');
  const [wheelSize, setWheelSize] = useState('');
  const [serviceType, setServiceType] = useState<ItemType>('Tube');
  const [price, setPrice] = useState('20');
  const [otherFee, setOtherFee] = useState('0');
  const [tip, setTip] = useState('0');
  const [paymentMethod, setPaymentMethod] = useState<typeof PAYMENT_METHODS[number] | ''>('Venmo');
  const [source, setSource] = useState<typeof SOURCES[number] | ''>('FB Market');
  const [notes, setNotes] = useState('');

  const [customer, setCustomer] = useState<Customer | null>(null);
  const [inventory, setInventory] = useState<InventoryItem | null>(null);
  const [showCustomerPicker, setShowCustomerPicker] = useState(false);
  const [showInventoryPicker, setShowInventoryPicker] = useState(false);

  useLayoutEffect(() => {
    navigation.setOptions({ title: isEdit ? 'Edit Service' : 'Log Service' });
  }, [navigation, isEdit]);

  useEffect(() => {
    (async () => {
      if (route.params?.customerId != null && !isEdit) {
        const c = await getCustomer(route.params.customerId);
        if (c) setCustomer(c);
      }
      if (!isEdit || !serviceId) return;
      const s = await getService(serviceId);
      if (!s) return;
      setServiceDate(s.service_date);
      setBikeType(s.bike_type as BikeType);
      setWheelSize(String(s.wheel_size));
      setServiceType(s.service_type as ItemType);
      setPrice(String(s.price));
      setOtherFee(String(s.other_fee));
      setTip(String(s.tip));
      setPaymentMethod((s.payment_method as any) || '');
      setSource((s.source as any) || '');
      setNotes(s.notes);
      if (s.customer_id != null) setCustomer(await getCustomer(s.customer_id));
      if (s.inventory_item_id != null) setInventory(await getInventoryItem(s.inventory_item_id));
    })();
  }, [isEdit, serviceId, route.params?.customerId]);

  const handleDateChange = (event: DateTimePickerEvent, date?: Date) => {
    setShowDatePicker(false);
    if (event.type === 'set' && date) {
      setServiceDate(format(date, 'yyyy-MM-dd'));
    }
  };

  const save = async () => {
    const size = parseFloat(wheelSize);
    if (!isFinite(size) || size <= 0) {
      Alert.alert('Invalid size', 'Wheel size must be a positive number.');
      return;
    }
    const data = {
      service_date: serviceDate,
      bike_type: bikeType,
      wheel_size: size,
      service_type: serviceType,
      price: parseFloat(price) || 0,
      other_fee: parseFloat(otherFee) || 0,
      tip: parseFloat(tip) || 0,
      payment_method: paymentMethod,
      customer_id: customer?.id ?? null,
      source,
      inventory_item_id: inventory?.id ?? null,
      notes: notes.trim(),
    };
    if (isEdit && serviceId) {
      await updateService(serviceId, data);
    } else {
      await createService(data);
    }
    navigation.goBack();
  };

  const wheelSizeNum = parseFloat(wheelSize);
  const validSize = isFinite(wheelSizeNum) && wheelSizeNum > 0;

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 88 : 0}
    >
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="interactive"
        automaticallyAdjustKeyboardInsets
      >
        <Text style={styles.label}>Date</Text>
        <TouchableOpacity style={styles.input} onPress={() => setShowDatePicker(true)}>
          <Text style={styles.inputText}>
            {format(parseISO(serviceDate), 'EEE, MMM d, yyyy')}
          </Text>
        </TouchableOpacity>
        {showDatePicker && (
          <DateTimePicker
            value={parseISO(serviceDate)}
            mode="date"
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            onChange={handleDateChange}
          />
        )}

        <Text style={styles.label}>Customer</Text>
        <TouchableOpacity style={styles.input} onPress={() => setShowCustomerPicker(true)}>
          <Text style={[styles.inputText, !customer && styles.placeholder]}>
            {customer ? `${customer.name}${customer.phone ? ` · ${customer.phone}` : ''}` : 'Tap to select or add'}
          </Text>
        </TouchableOpacity>

        <Text style={styles.label}>Bike type</Text>
        <ChipRow options={BIKE_TYPES} value={bikeType} onChange={setBikeType} />

        <Text style={styles.label}>Wheel size *</Text>
        <TextInput
          style={styles.input}
          value={wheelSize}
          onChangeText={setWheelSize}
          placeholder='e.g. 21 or 6.5'
          keyboardType="decimal-pad"
        />

        <Text style={styles.label}>Service type</Text>
        <ChipRow options={ITEM_TYPES} value={serviceType} onChange={setServiceType} />

        <View style={styles.row}>
          <View style={styles.rowItem}>
            <Text style={styles.label}>Price</Text>
            <TextInput style={styles.input} value={price} onChangeText={setPrice} keyboardType="decimal-pad" />
          </View>
          <View style={styles.rowItem}>
            <Text style={styles.label}>Surcharge</Text>
            <TextInput style={styles.input} value={otherFee} onChangeText={setOtherFee} keyboardType="decimal-pad" />
          </View>
          <View style={styles.rowItem}>
            <Text style={styles.label}>Tip</Text>
            <TextInput style={styles.input} value={tip} onChangeText={setTip} keyboardType="decimal-pad" />
          </View>
        </View>

        <Text style={styles.label}>Payment</Text>
        <ChipRow options={PAYMENT_METHODS} value={paymentMethod || null} onChange={(v) => setPaymentMethod(v)} />

        <Text style={styles.label}>Source</Text>
        <ChipRow options={SOURCES} value={source || null} onChange={(v) => setSource(v)} />

        <Text style={styles.label}>Inventory item used</Text>
        <TouchableOpacity
          style={styles.input}
          onPress={() => {
            if (!validSize) {
              Alert.alert('Enter wheel size', 'Set a wheel size first so we can match inventory.');
              return;
            }
            setShowInventoryPicker(true);
          }}
        >
          <Text style={[styles.inputText, !inventory && styles.placeholder]}>
            {inventory
              ? `${inventory.wheel_size}" ${inventory.item_type} · ${inventory.bike_category}${inventory.tire_spec ? ` · ${inventory.tire_spec}` : ''} (stock: ${inventory.quantity}, cost ${money(inventory.purchase_price)})`
              : 'None (customer brought own)'}
          </Text>
        </TouchableOpacity>

        <Text style={styles.label}>Notes</Text>
        <TextInput
          style={[styles.input, styles.notesInput]}
          value={notes}
          onChangeText={setNotes}
          placeholder="Optional"
          multiline
        />

        <TouchableOpacity style={styles.saveBtn} onPress={save}>
          <Text style={styles.saveBtnText}>{isEdit ? 'Save changes' : 'Log service'}</Text>
        </TouchableOpacity>

        <Text style={styles.helperText}>
          Linking an inventory item will deduct 1 from stock and snapshot the purchase price for profit tracking. Editing or deleting the service will revert the deduction.
        </Text>
      </ScrollView>

      <CustomerPickerSheet
        visible={showCustomerPicker}
        selectedId={customer?.id ?? null}
        onSelect={setCustomer}
        onClose={() => setShowCustomerPicker(false)}
      />
      <InventoryPickerSheet
        visible={showInventoryPicker}
        wheel_size={validSize ? wheelSizeNum : undefined}
        bike_category={categoryForBike(bikeType)}
        item_type={serviceType}
        selectedId={inventory?.id ?? null}
        onSelect={setInventory}
        onClose={() => setShowInventoryPicker(false)}
      />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  content: { padding: 16, paddingBottom: 280 },
  label: { fontSize: 13, fontWeight: '600', color: '#555', marginTop: 14, marginBottom: 6 },
  input: { backgroundColor: '#fff', borderRadius: 8, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, borderWidth: 1, borderColor: '#e0e0e0', minHeight: 44, justifyContent: 'center' },
  inputText: { fontSize: 15, color: '#222' },
  placeholder: { color: '#999' },
  notesInput: { minHeight: 80, textAlignVertical: 'top' },
  row: { flexDirection: 'row', gap: 8 },
  rowItem: { flex: 1 },
  saveBtn: { backgroundColor: '#2196F3', borderRadius: 8, paddingVertical: 14, alignItems: 'center', marginTop: 24 },
  saveBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  helperText: { fontSize: 11, color: '#888', marginTop: 10, lineHeight: 16 },
});
