import React, { useEffect } from 'react';
import { Text, View, ActivityIndicator, StyleSheet } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Provider as PaperProvider, Icon } from 'react-native-paper';
import { Provider as ReduxProvider } from 'react-redux';
import { PersistGate } from 'redux-persist/integration/react';
import { store, persistor } from './src/store';
import { theme } from './src/theme/theme';
import { useAppSelector, useAppDispatch } from './src/store/hooks';
import {
  selectIsAuthenticated,
  selectIsInitialized,
  initializeAuth,
  forceLogout,
} from './src/store/slices/authSlice';
import { ApiService } from './src/services/ApiService';
import { ErrorBoundary } from './src/components/ErrorBoundary';
import type { RootStackParamList, MainTabParamList } from './src/types/navigation';

// Screens
import { LoginScreen } from './src/screens/Auth/LoginScreen';
import StatusBoardScreen from './src/screens/StatusBoard/StatusBoardScreen';
import OrderPhotosScreen from './src/screens/OrderPhotos/OrderPhotosScreen';
import { QualityControlScreen } from './src/screens/Production/QualityControlScreen';
import ProfileScreen from './src/screens/Profile/ProfileScreen';

const Tab = createBottomTabNavigator<MainTabParamList>();
const Stack = createNativeStackNavigator<RootStackParamList>();

function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: theme.colors.primary },
        headerTintColor: theme.colors.surface,
        tabBarActiveTintColor: theme.colors.primary,
      }}
    >
      <Tab.Screen
        name="Orders"
        component={StatusBoardScreen}
        options={{
          title: 'Cardose',
          tabBarIcon: ({ color, size }) => (
            <Icon source="clipboard-list-outline" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{
          title: 'Profil Saya',
          tabBarIcon: ({ color, size }) => (
            <Icon source="account-outline" size={size} color={color} />
          ),
        }}
      />
    </Tab.Navigator>
  );
}

function AppNavigator() {
  const dispatch = useAppDispatch();
  const isAuthenticated = useAppSelector(selectIsAuthenticated);
  const isInitialized = useAppSelector(selectIsInitialized);

  useEffect(() => {
    const init = async () => {
      // Ensure server URL is loaded before auth initialization
      await ApiService.initialize();

      // Wire up global 401 handler so ApiService can trigger logout
      ApiService.setOnUnauthorized(() => {
        store.dispatch(forceLogout());
      });

      dispatch(initializeAuth());
    };

    init();
  }, [dispatch]);

  if (!isInitialized) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text style={styles.loadingText}>Memuat...</Text>
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
            title: 'Foto Pesanan',
            headerStyle: { backgroundColor: theme.colors.primary },
            headerTintColor: theme.colors.surface,
          }}
        />
        <Stack.Screen
          name="QualityCheck"
          component={QualityControlScreen}
          options={{
            title: 'Kontrol Mutu',
            headerStyle: { backgroundColor: theme.colors.primary },
            headerTintColor: theme.colors.surface,
          }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

export default function App() {
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
      <Text style={styles.loadingText}>Memuat...</Text>
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
