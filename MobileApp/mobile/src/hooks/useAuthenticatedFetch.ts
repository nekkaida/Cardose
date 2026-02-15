import { useAppSelector, useAppDispatch } from '../store/hooks';
import { selectToken, logout } from '../store/slices/authSlice';
import { API_CONFIG } from '../config';

/**
 * Hook for making authenticated API calls.
 * Reads token from Redux store and auto-logouts on 401.
 */
export const useAuthenticatedFetch = () => {
  const token = useAppSelector(selectToken);
  const dispatch = useAppDispatch();

  const authenticatedFetch = async (url: string, options: RequestInit = {}) => {
    if (!token) {
      throw new Error('No authentication token available');
    }

    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
      ...options.headers,
    };

    const response = await fetch(`${API_CONFIG.API_URL}${url}`, {
      ...options,
      headers,
    });

    if (response.status === 401) {
      dispatch(logout());
      throw new Error('Session expired. Please login again.');
    }

    return response;
  };

  return authenticatedFetch;
};
