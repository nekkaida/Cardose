import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Provider as PaperProvider } from 'react-native-paper';
import { Provider as ReduxProvider } from 'react-redux';
import { store } from './src/store/store';
import { theme } from './src/theme/theme';

// Screen imports
import DashboardScreen from './src/screens/Dashboard/DashboardScreen';
import OrdersScreen from './src/screens/OrderManagement/OrdersScreen';
import CustomersScreen from './src/screens/CustomerDatabase/CustomersScreen';
import InventoryScreen from './src/screens/Inventory/InventoryScreen';
import FinancialScreen from './src/screens/Financial/FinancialScreen';

const Tab = createBottomTabNavigator();

export default function App() {
  return (
    <ReduxProvider store={store}>
      <PaperProvider theme={theme}>
        <NavigationContainer>
          <Tab.Navigator
            screenOptions={{
              headerStyle: {
                backgroundColor: theme.colors.primary,
              },
              headerTintColor: '#fff',
              tabBarActiveTintColor: theme.colors.primary,
            }}
          >
            <Tab.Screen 
              name="Dashboard" 
              component={DashboardScreen}
              options={{
                title: 'Premium Gift Box',
                tabBarIcon: ({ color }) => (
                  <Text style={{ color, fontSize: 18 }}>📊</Text>
                ),
              }}
            />
            <Tab.Screen 
              name="Orders" 
              component={OrdersScreen}
              options={{
                tabBarIcon: ({ color }) => (
                  <Text style={{ color, fontSize: 18 }}>📦</Text>
                ),
              }}
            />
            <Tab.Screen 
              name="Customers" 
              component={CustomersScreen}
              options={{
                tabBarIcon: ({ color }) => (
                  <Text style={{ color, fontSize: 18 }}>👥</Text>
                ),
              }}
            />
            <Tab.Screen 
              name="Inventory" 
              component={InventoryScreen}
              options={{
                tabBarIcon: ({ color }) => (
                  <Text style={{ color, fontSize: 18 }}>📋</Text>
                ),
              }}
            />
            <Tab.Screen 
              name="Financial" 
              component={FinancialScreen}
              options={{
                tabBarIcon: ({ color }) => (
                  <Text style={{ color, fontSize: 18 }}>💰</Text>
                ),
              }}
            />
          </Tab.Navigator>
        </NavigationContainer>
      </PaperProvider>
    </ReduxProvider>
  );
}