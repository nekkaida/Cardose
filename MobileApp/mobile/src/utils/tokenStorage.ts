/**
 * Secure Token Storage
 *
 * Wraps expo-secure-store for the JWT token (sensitive, small)
 * and AsyncStorage for user profile JSON (less sensitive, potentially larger).
 *
 * SecureStore uses the OS keychain/keystore, so tokens are encrypted at rest
 * and inaccessible on rooted/jailbroken devices without extra effort.
 */

import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { TOKEN_KEY, USER_KEY } from './authConstants';

// ── Token (SecureStore — encrypted) ────────────────────────────────────

export async function getToken(): Promise<string | null> {
  try {
    return await SecureStore.getItemAsync(TOKEN_KEY);
  } catch {
    // Fallback: on platforms where SecureStore is unavailable (e.g. web)
    return AsyncStorage.getItem(TOKEN_KEY);
  }
}

export async function setToken(token: string): Promise<void> {
  try {
    await SecureStore.setItemAsync(TOKEN_KEY, token);
  } catch {
    await AsyncStorage.setItem(TOKEN_KEY, token);
  }
}

export async function removeToken(): Promise<void> {
  try {
    await SecureStore.deleteItemAsync(TOKEN_KEY);
  } catch {
    await AsyncStorage.removeItem(TOKEN_KEY);
  }
}

// ── User profile JSON (AsyncStorage — not a secret) ───────────────────

export async function getUser(): Promise<string | null> {
  return AsyncStorage.getItem(USER_KEY);
}

export async function setUser(userJson: string): Promise<void> {
  await AsyncStorage.setItem(USER_KEY, userJson);
}

export async function removeUser(): Promise<void> {
  await AsyncStorage.removeItem(USER_KEY);
}

// ── Bulk operations ────────────────────────────────────────────────────

export async function clearAll(): Promise<void> {
  await Promise.all([removeToken(), removeUser()]);
}
