/**
 * Orders Stack Navigator
 *
 * Navigation for Orders module including:
 * - OrdersScreen (list)
 * - OrderDetailsScreen
 * - CreateOrderScreen
 * - UpdateOrderStatusScreen
 * - EditOrderScreen
 */

import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import OrdersScreen from '../screens/OrderManagement/OrdersScreen';
import OrderDetailsScreen from '../screens/OrderManagement/OrderDetailsScreen';
import CreateOrderScreen from '../screens/OrderManagement/CreateOrderScreen';
import UpdateOrderStatusScreen from '../screens/OrderManagement/UpdateOrderStatusScreen';
import { COLORS } from '../config';

export type OrdersStackParamList = {
  OrdersList: undefined;
  OrderDetails: { orderId: string };
  CreateOrder: undefined;
  EditOrder: { orderId: string };
  UpdateOrderStatus: { orderId: string };
};

const Stack = createStackNavigator<OrdersStackParamList>();

export default function OrdersNavigator() {
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
        name="OrdersList"
        component={OrdersScreen}
        options={{
          title: 'Pesanan',
          headerShown: false, // Hidden because it's in tab navigator
        }}
      />
      <Stack.Screen
        name="OrderDetails"
        component={OrderDetailsScreen}
        options={{
          title: 'Detail Pesanan',
        }}
      />
      <Stack.Screen
        name="CreateOrder"
        component={CreateOrderScreen}
        options={{
          title: 'Buat Pesanan Baru',
        }}
      />
      <Stack.Screen
        name="EditOrder"
        component={CreateOrderScreen}
        options={{
          title: 'Edit Pesanan',
        }}
      />
      <Stack.Screen
        name="UpdateOrderStatus"
        component={UpdateOrderStatusScreen}
        options={{
          title: 'Update Status',
        }}
      />
    </Stack.Navigator>
  );
}
