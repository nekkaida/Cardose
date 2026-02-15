import React, { useEffect } from 'react';
import { Text, View, ActivityIndicator, StyleSheet } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Provider as PaperProvider } from 'react-native-paper';
import { Provider as ReduxProvider } from 'react-redux';
import { PersistGate } from 'redux-persist/integration/react';
import { store, persistor } from './src/store';
import { theme } from './src/theme/theme';
import { useAppSelector, useAppDispatch } from './src/store/hooks';
import {
  selectIsAuthenticated,
  selectAuthLoading,
  initializeAuth,
} from './src/store/slices/authSlice';
import { ApiService } from './src/services/ApiService';
import { ErrorBoundary } from './src/components/ErrorBoundary';

// Screens
import { LoginScreen } from './src/screens/Auth/LoginScreen';
import StatusBoardScreen from './src/screens/StatusBoard/StatusBoardScreen';
import OrderPhotosScreen from './src/screens/OrderPhotos/OrderPhotosScreen';
import { QualityControlScreen } from './src/screens/Production/QualityControlScreen';
import ProfileScreen from './src/screens/Profile/ProfileScreen';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: theme.colors.primary },
        headerTintColor: '#fff',
        tabBarActiveTintColor: theme.colors.primary,
      }}
    >
      <Tab.Screen
        name="Orders"
        component={StatusBoardScreen}
        options={{
          title: 'Cardose',
          tabBarIcon: ({ color }) => (
            <Text style={{ color, fontSize: 18 }}>📋</Text>
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
  );
}

function AppNavigator() {
  const dispatch = useAppDispatch();
  const isAuthenticated = useAppSelector(selectIsAuthenticated);
  const isLoading = useAppSelector(selectAuthLoading);

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
      <Stack.Navigator>
        <Stack.Screen
          name="Main"
          component={MainTabs}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="OrderPhotos"
          component={OrderPhotosScreen}
          options={{
            title: 'Order Photos',
            headerStyle: { backgroundColor: theme.colors.primary },
            headerTintColor: '#fff',
          }}
        />
        <Stack.Screen
          name="QualityCheck"
          component={QualityControlScreen}
          options={{
            title: 'Quality Check',
            headerStyle: { backgroundColor: theme.colors.primary },
            headerTintColor: '#fff',
          }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

export default function App() {
  useEffect(() => {
    const initializeApp = async () => {
      try {
        await ApiService.initialize();
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
