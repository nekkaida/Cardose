/**
 * Shared authentication constants.
 *
 * Single source of truth for storage keys and role values
 * used across authSlice, ApiService, and tokenStorage.
 */

/** AsyncStorage / SecureStore key for the JWT token */
export const TOKEN_KEY = '@cardose_token';

/** AsyncStorage key for the serialised user object */
export const USER_KEY = '@cardose_user';

/** Valid user roles accepted from the backend */
export const VALID_ROLES = ['owner', 'manager', 'employee'] as const;
export type UserRole = (typeof VALID_ROLES)[number];
