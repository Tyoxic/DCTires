import React, { useEffect, useLayoutEffect, useState } from 'react';
import {
  View, Text, TextInput, ScrollView, StyleSheet, TouchableOpacity, Alert,
  KeyboardAvoidingView, Platform,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import {
  RootStackParamList, BIKE_CATEGORIES, ITEM_TYPES, BikeCategory, ItemType,
} from '../models/types';
import {
  createInventoryItem, getInventoryItem, updateInventoryItem,
} from '../db/inventory';
import ChipRow from '../components/ChipRow';

type Props = NativeStackScreenProps<RootStackParamList, 'AddEditInventoryItem'>;

export default function AddEditInventoryItemScreen({ navigation, route }: Props) {
  const itemId = route.params?.itemId;
  const defaultSize = route.params?.defaultSize;
  const isEdit = !!itemId;

  const [wheelSize, setWheelSize] = useState(
    defaultSize != null ? String(defaultSize) : ''
  );
  const [tireSpec, setTireSpec] = useState('');
  const [bikeCategory, setBikeCategory] = useState<BikeCategory>('Dirtbike');
  const [itemType, setItemType] = useState<ItemType>('Tube');
  const [quantity, setQuantity] = useState('0');
  const [purchasePrice, setPurchasePrice] = useState('0');
  const [sellPrice, setSellPrice] = useState('20');
  const [notes, setNotes] = useState('');

  useLayoutEffect(() => {
    navigation.setOptions({ title: isEdit ? 'Edit Item' : 'Add Item' });
  }, [navigation, isEdit]);

  useEffect(() => {
    if (!isEdit || !itemId) return;
    (async () => {
      const item = await getInventoryItem(itemId);
      if (!item) return;
      setWheelSize(String(item.wheel_size));
      setTireSpec(item.tire_spec ?? '');
      setBikeCategory(item.bike_category);
      setItemType(item.item_type);
      setQuantity(String(item.quantity));
      setPurchasePrice(String(item.purchase_price));
      setSellPrice(String(item.sell_price));
      setNotes(item.notes);
    })();
  }, [isEdit, itemId]);

  const save = async () => {
    const size = parseFloat(wheelSize);
    if (!isFinite(size) || size <= 0) {
      Alert.alert('Invalid size', 'Wheel size must be a positive number.');
      return;
    }
    const qty = parseInt(quantity, 10);
    const pp = parseFloat(purchasePrice);
    const sp = parseFloat(sellPrice);

    const data = {
      wheel_size: size,
      tire_spec: tireSpec.trim() || null,
      bike_category: bikeCategory,
      item_type: itemType,
      quantity: isFinite(qty) && qty >= 0 ? qty : 0,
      purchase_price: isFinite(pp) && pp >= 0 ? pp : 0,
      sell_price: isFinite(sp) && sp >= 0 ? sp : 20,
      notes: notes.trim(),
    };

    if (isEdit && itemId) {
      await updateInventoryItem(itemId, data);
    } else {
      await createInventoryItem(data);
    }
    navigation.goBack();
  };

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
        <Text style={styles.label}>Wheel size *</Text>
        <TextInput
          style={styles.input}
          value={wheelSize}
          onChangeText={setWheelSize}
          placeholder='e.g. 21 or 6.5'
          keyboardType="decimal-pad"
        />

        <Text style={styles.label}>Tire spec (optional)</Text>
        <TextInput
          style={styles.input}
          value={tireSpec}
          onChangeText={setTireSpec}
          placeholder="e.g. 80/100, 70/100, 90/65"
        />

        <Text style={styles.label}>Bike category</Text>
        <ChipRow options={BIKE_CATEGORIES} value={bikeCategory} onChange={setBikeCategory} />

        <Text style={styles.label}>Item type</Text>
        <ChipRow options={ITEM_TYPES} value={itemType} onChange={setItemType} />

        <View style={styles.row}>
          <View style={styles.rowItem}>
            <Text style={styles.label}>Quantity</Text>
            <TextInput style={styles.input} value={quantity} onChangeText={setQuantity} keyboardType="number-pad" />
          </View>
          <View style={styles.rowItem}>
            <Text style={styles.label}>Purchase price</Text>
            <TextInput style={styles.input} value={purchasePrice} onChangeText={setPurchasePrice} keyboardType="decimal-pad" />
          </View>
        </View>

        <Text style={styles.label}>Sell price</Text>
        <TextInput style={styles.input} value={sellPrice} onChangeText={setSellPrice} keyboardType="decimal-pad" />

        <Text style={styles.label}>Notes</Text>
        <TextInput
          style={[styles.input, styles.notesInput]}
          value={notes}
          onChangeText={setNotes}
          placeholder="Optional"
          multiline
        />

        <TouchableOpacity style={styles.saveBtn} onPress={save}>
          <Text style={styles.saveBtnText}>{isEdit ? 'Save changes' : 'Add item'}</Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  content: { padding: 16, paddingBottom: 280 },
  label: { fontSize: 13, fontWeight: '600', color: '#555', marginTop: 12, marginBottom: 6 },
  input: { backgroundColor: '#fff', borderRadius: 8, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, borderWidth: 1, borderColor: '#e0e0e0' },
  notesInput: { minHeight: 80, textAlignVertical: 'top' },
  row: { flexDirection: 'row', gap: 12 },
  rowItem: { flex: 1 },
  saveBtn: { backgroundColor: '#2196F3', borderRadius: 8, paddingVertical: 14, alignItems: 'center', marginTop: 24 },
  saveBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
