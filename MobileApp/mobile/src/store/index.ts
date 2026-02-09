/**
 * Redux Store Configuration
 *
 * Configures Redux Toolkit store with:
 * - All feature slices
 * - Redux Persist for state persistence
 * - Middleware configuration
 * - TypeScript types
 */

import { configureStore, combineReducers } from '@reduxjs/toolkit';
import { persistStore, persistReducer, FLUSH, REHYDRATE, PAUSE, PERSIST, PURGE, REGISTER } from 'redux-persist';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Import reducers
import authReducer from './slices/authSlice';
import ordersReducer from './slices/ordersSlice';
import customersReducer from './slices/customersSlice';
import inventoryReducer from './slices/inventorySlice';
import financialReducer from './slices/financialSlice';
import productionReducer from './slices/productionSlice';
import uiReducer from './slices/uiSlice';
import syncReducer from './slices/syncSlice';

// Combine all reducers
const rootReducer = combineReducers({
  auth: authReducer,
  orders: ordersReducer,
  customers: customersReducer,
  inventory: inventoryReducer,
  financial: financialReducer,
  production: productionReducer,
  ui: uiReducer,
  sync: syncReducer,
});

// Persist configuration
const persistConfig = {
  key: 'root',
  version: 1,
  storage: AsyncStorage,
  whitelist: ['ui'], // Only persist UI state; auth tokens handled by authSlice directly
  blacklist: ['orders', 'customers', 'inventory', 'financial', 'production', 'sync'], // Don't persist (use SQLite instead)
};

// Wrap root reducer with persist
const persistedReducer = persistReducer(persistConfig, rootReducer);

// Configure store
export const store = configureStore({
  reducer: persistedReducer,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        // Ignore persist actions for serialization check
        ignoredActions: [FLUSH, REHYDRATE, PAUSE, PERSIST, PURGE, REGISTER],
      },
    }),
  devTools: process.env.NODE_ENV !== 'production',
});

// Create persistor
export const persistor = persistStore(store);

// Export types
export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

export default store;
