import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { RootStackParamList } from '../models/types';
import HomeScreen from '../screens/HomeScreen';
import InventoryListScreen from '../screens/InventoryListScreen';
import InventoryBySizeScreen from '../screens/InventoryBySizeScreen';
import InventoryDetailScreen from '../screens/InventoryDetailScreen';
import AddEditInventoryItemScreen from '../screens/AddEditInventoryItemScreen';
import ServiceListScreen from '../screens/ServiceListScreen';
import ServiceDetailScreen from '../screens/ServiceDetailScreen';
import AddEditServiceScreen from '../screens/AddEditServiceScreen';
import CustomersListScreen from '../screens/CustomersListScreen';
import CustomerDetailScreen from '../screens/CustomerDetailScreen';
import SettingsScreen from '../screens/SettingsScreen';

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function RootNavigator() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: '#fff' },
        headerTintColor: '#222',
        headerTitleStyle: { fontWeight: '600' },
      }}
    >
      <Stack.Screen name="Home" component={HomeScreen} options={{ title: 'DCTires' }} />
      <Stack.Screen name="InventoryList" component={InventoryListScreen} options={{ title: 'Inventory' }} />
      <Stack.Screen name="InventoryBySize" component={InventoryBySizeScreen} options={{ title: 'Inventory' }} />
      <Stack.Screen name="InventoryDetail" component={InventoryDetailScreen} options={{ title: 'Item' }} />
      <Stack.Screen name="AddEditInventoryItem" component={AddEditInventoryItemScreen} options={{ title: 'Add Item' }} />
      <Stack.Screen name="ServiceList" component={ServiceListScreen} options={{ title: 'Services' }} />
      <Stack.Screen name="ServiceDetail" component={ServiceDetailScreen} options={{ title: 'Service' }} />
      <Stack.Screen name="AddEditService" component={AddEditServiceScreen} options={{ title: 'Log Service' }} />
      <Stack.Screen name="CustomersList" component={CustomersListScreen} options={{ title: 'Customers' }} />
      <Stack.Screen name="CustomerDetail" component={CustomerDetailScreen} options={{ title: 'Customer' }} />
      <Stack.Screen name="Settings" component={SettingsScreen} options={{ title: 'Settings' }} />
    </Stack.Navigator>
  );
}
