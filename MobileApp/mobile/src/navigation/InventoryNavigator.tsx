/**
 * Inventory Stack Navigator
 *
 * Navigation for Inventory module including:
 * - InventoryListScreen (list)
 * - MaterialDetailsScreen
 * - CreateMaterialScreen
 * - EditMaterialScreen
 */

import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import InventoryListScreen from '../screens/Inventory/InventoryListScreen';
import MaterialDetailsScreen from '../screens/Inventory/MaterialDetailsScreen';
import CreateMaterialScreen from '../screens/Inventory/CreateMaterialScreen';
import { COLORS } from '../config';

export type InventoryStackParamList = {
  InventoryList: undefined;
  MaterialDetails: { materialId: string };
  CreateMaterial: undefined;
  EditMaterial: { materialId: string };
};

const Stack = createStackNavigator<InventoryStackParamList>();

export default function InventoryNavigator() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: {
          backgroundColor: COLORS.primary,
        },
        headerTintColor: COLORS.white,
        headerTitleStyle: {
          fontWeight: '600',
        },
      }}
    >
      <Stack.Screen
        name="InventoryList"
        component={InventoryListScreen}
        options={{
          title: 'Inventory',
          headerShown: false, // Hidden because it's in tab navigator
        }}
      />
      <Stack.Screen
        name="MaterialDetails"
        component={MaterialDetailsScreen}
        options={{
          title: 'Detail Material',
        }}
      />
      <Stack.Screen
        name="CreateMaterial"
        component={CreateMaterialScreen}
        options={{
          title: 'Tambah Material Baru',
        }}
      />
      <Stack.Screen
        name="EditMaterial"
        component={CreateMaterialScreen}
        options={{
          title: 'Edit Material',
        }}
      />
    </Stack.Navigator>
  );
}
