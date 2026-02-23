import { useState, useCallback, useEffect } from 'react';
import { useAuthenticatedFetch } from '../../../hooks/useAuthenticatedFetch';
import type { QualityCheck } from '../types';

export interface UseQualityHistoryReturn {
  history: QualityCheck[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

export function useQualityHistory(orderId: string | undefined): UseQualityHistoryReturn {
  const [history, setHistory] = useState<QualityCheck[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const authenticatedFetch = useAuthenticatedFetch();

  const refresh = useCallback(async () => {
    if (!orderId) return;

    setLoading(true);
    setError(null);

    try {
      const response = await authenticatedFetch(
        `/quality-checks?order_id=${encodeURIComponent(orderId)}`
      );

      const contentType = response.headers.get('content-type');
      if (!contentType?.includes('application/json')) {
        throw new Error('Server returned an unexpected response');
      }

      const data = await response.json();

      if (response.ok) {
        setHistory(data.checks || []);
      } else {
        setError(data.error || 'Failed to load quality history');
      }
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Network error loading history';
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [orderId, authenticatedFetch]);

  useEffect(() => {
    if (orderId) {
      refresh();
    }
  }, [orderId, refresh]);

  return { history, loading, error, refresh };
}
