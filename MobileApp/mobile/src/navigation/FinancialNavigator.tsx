/**
 * Financial Stack Navigator
 *
 * Navigation for Financial module including:
 * - FinancialListScreen (invoices list)
 * - InvoiceDetailsScreen
 * - CreateInvoiceScreen
 * - RecordPaymentScreen
 */

import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import FinancialListScreen from '../screens/Financial/FinancialListScreen';
import InvoiceDetailsScreen from '../screens/Financial/InvoiceDetailsScreen';
import CreateInvoiceScreen from '../screens/Financial/CreateInvoiceScreen';
import RecordPaymentScreen from '../screens/Financial/RecordPaymentScreen';
import { COLORS } from '../config';

export type FinancialStackParamList = {
  FinancialList: undefined;
  InvoiceDetails: { invoiceId: string };
  CreateInvoice: undefined;
  EditInvoice: { invoiceId: string };
  RecordPayment: { invoiceId: string };
};

const Stack = createStackNavigator<FinancialStackParamList>();

export default function FinancialNavigator() {
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
        name="FinancialList"
        component={FinancialListScreen}
        options={{
          title: 'Keuangan',
          headerShown: false, // Hidden because it's in tab navigator
        }}
      />
      <Stack.Screen
        name="InvoiceDetails"
        component={InvoiceDetailsScreen}
        options={{
          title: 'Detail Invoice',
        }}
      />
      <Stack.Screen
        name="CreateInvoice"
        component={CreateInvoiceScreen}
        options={{
          title: 'Buat Invoice Baru',
        }}
      />
      <Stack.Screen
        name="EditInvoice"
        component={CreateInvoiceScreen}
        options={{
          title: 'Edit Invoice',
        }}
      />
      <Stack.Screen
        name="RecordPayment"
        component={RecordPaymentScreen}
        options={{
          title: 'Catat Pembayaran',
        }}
      />
    </Stack.Navigator>
  );
}
