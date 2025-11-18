/**
 * Customers Stack Navigator
 *
 * Navigation for Customers module including:
 * - CustomersScreen (list)
 * - CustomerDetailsScreen
 * - CreateCustomerScreen
 * - EditCustomerScreen
 */

import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import CustomersScreen from '../screens/CustomerDatabase/CustomersScreen';
import CustomerDetailsScreen from '../screens/CustomerDatabase/CustomerDetailsScreen';
import CreateCustomerScreen from '../screens/CustomerDatabase/CreateCustomerScreen';
import { COLORS } from '../config';

export type CustomersStackParamList = {
  CustomersList: undefined;
  CustomerDetails: { customerId: string };
  CreateCustomer: undefined;
  EditCustomer: { customerId: string };
};

const Stack = createStackNavigator<CustomersStackParamList>();

export default function CustomersNavigator() {
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
        name="CustomersList"
        component={CustomersScreen}
        options={{
          title: 'Pelanggan',
          headerShown: false, // Hidden because it's in tab navigator
        }}
      />
      <Stack.Screen
        name="CustomerDetails"
        component={CustomerDetailsScreen}
        options={{
          title: 'Detail Pelanggan',
        }}
      />
      <Stack.Screen
        name="CreateCustomer"
        component={CreateCustomerScreen}
        options={{
          title: 'Tambah Pelanggan Baru',
        }}
      />
      <Stack.Screen
        name="EditCustomer"
        component={CreateCustomerScreen}
        options={{
          title: 'Edit Pelanggan',
        }}
      />
    </Stack.Navigator>
  );
}
