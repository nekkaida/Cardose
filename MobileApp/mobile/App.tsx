import React, { useEffect } from 'react';
import { Text, View, ActivityIndicator, StyleSheet } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Provider as PaperProvider } from 'react-native-paper';
import { Provider as ReduxProvider } from 'react-redux';
import { PersistGate } from 'redux-persist/integration/react';
import { store, persistor } from './src/store';
import { theme } from './src/theme/theme';
import { useAppSelector, useAppDispatch } from './src/store/hooks';
import {
  selectUser,
  selectIsAuthenticated,
  selectAuthLoading,
  initializeAuth,
} from './src/store/slices/authSlice';
import { DatabaseService } from './src/services/DatabaseService';
import { ApiService } from './src/services/ApiService';
import { ErrorBoundary } from './src/components/ErrorBoundary';

// Screen and Navigator imports
import { LoginScreen } from './src/screens/Auth/LoginScreen';
import DashboardScreen from './src/screens/Dashboard/DashboardScreen';
import OrdersNavigator from './src/navigation/OrdersNavigator';
import CustomersNavigator from './src/navigation/CustomersNavigator';
import InventoryNavigator from './src/navigation/InventoryNavigator';
import ProductionNavigator from './src/navigation/ProductionNavigator';
import FinancialNavigator from './src/navigation/FinancialNavigator';
import ProfileScreen from './src/screens/Profile/ProfileScreen';

const Tab = createBottomTabNavigator();

function AppNavigator() {
  const dispatch = useAppDispatch();
  const isAuthenticated = useAppSelector(selectIsAuthenticated);
  const isLoading = useAppSelector(selectAuthLoading);
  const user = useAppSelector(selectUser);

  useEffect(() => {
    dispatch(initializeAuth());
  }, [dispatch]);

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  if (!isAuthenticated) {
    return <LoginScreen />;
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
            title: `Premium Gift Box - ${user?.fullName || user?.full_name || 'User'}`,
            tabBarIcon: ({ color }) => (
              <Text style={{ color, fontSize: 18 }}>📊</Text>
            ),
          }}
        />
        <Tab.Screen
          name="Orders"
          component={OrdersNavigator}
          options={{
            headerShown: false,
            tabBarIcon: ({ color }) => (
              <Text style={{ color, fontSize: 18 }}>📦</Text>
            ),
          }}
        />
        <Tab.Screen
          name="Customers"
          component={CustomersNavigator}
          options={{
            headerShown: false,
            tabBarIcon: ({ color }) => (
              <Text style={{ color, fontSize: 18 }}>👥</Text>
            ),
          }}
        />
        <Tab.Screen
          name="Inventory"
          component={InventoryNavigator}
          options={{
            headerShown: false,
            tabBarIcon: ({ color }) => (
              <Text style={{ color, fontSize: 18 }}>📋</Text>
            ),
          }}
        />
        <Tab.Screen
          name="Production"
          component={ProductionNavigator}
          options={{
            headerShown: false,
            tabBarIcon: ({ color }) => (
              <Text style={{ color, fontSize: 18 }}>🏭</Text>
            ),
          }}
        />
        <Tab.Screen
          name="Financial"
          component={FinancialNavigator}
          options={{
            headerShown: false,
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
  // Initialize database on app start
  useEffect(() => {
    const initializeApp = async () => {
      try {
        await ApiService.initialize();
        await DatabaseService.initialize();
        console.log('App services initialized successfully');
      } catch (error) {
        console.error('Failed to initialize app services:', error);
      }
    };

    initializeApp();
  }, []);

  return (
    <ErrorBoundary>
      <ReduxProvider store={store}>
        <PersistGate loading={<LoadingScreen />} persistor={persistor}>
          <PaperProvider theme={theme}>
            <AppNavigator />
          </PaperProvider>
        </PersistGate>
      </ReduxProvider>
    </ErrorBoundary>
  );
}

// Loading screen component for PersistGate
function LoadingScreen() {
  return (
    <View style={styles.loadingContainer}>
      <ActivityIndicator size="large" color={theme.colors.primary} />
      <Text style={styles.loadingText}>Loading...</Text>
    </View>
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
