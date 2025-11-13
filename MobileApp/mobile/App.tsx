import React from 'react';
import { Text, View, ActivityIndicator, StyleSheet } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Provider as PaperProvider } from 'react-native-paper';
import { theme } from './src/theme/theme';
import { AuthProvider, useAuth } from './src/contexts/AuthContext';

// Screen imports
import { LoginScreen } from './src/screens/Auth/LoginScreen';
import DashboardScreen from './src/screens/Dashboard/DashboardScreen';
import OrdersScreen from './src/screens/OrderManagement/OrdersScreen';
import CustomersScreen from './src/screens/CustomerDatabase/CustomersScreen';
import InventoryScreen from './src/screens/Inventory/InventoryScreen';
import FinancialScreen from './src/screens/Financial/FinancialScreen';
import ProfileScreen from './src/screens/Profile/ProfileScreen';

const Tab = createBottomTabNavigator();

function AppNavigator() {
  const { isAuthenticated, isLoading, login, user } = useAuth();

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  if (!isAuthenticated) {
    return <LoginScreen onLogin={login} />;
  }

  return (
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
            title: `Premium Gift Box - ${user?.fullName || 'User'}`,
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
        <Tab.Screen
          name="Profile"
          component={ProfileScreen}
          options={{
            title: 'My Profile',
            tabBarIcon: ({ color }) => (
              <Text style={{ color, fontSize: 18 }}>👤</Text>
            ),
          }}
        />
      </Tab.Navigator>
    </NavigationContainer>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <PaperProvider theme={theme}>
        <AppNavigator />
      </PaperProvider>
    </AuthProvider>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.colors.background,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: theme.colors.textSecondary,
  },
});