import { useState, useCallback, useEffect, useRef } from 'react';
import { Alert } from 'react-native';
import { API_CONFIG } from '../../../config';
import { useAppSelector } from '../../../store/hooks';
import { selectToken } from '../../../store/slices/authSlice';
import {
  getQueue,
  removeFromQueue,
} from '../services/offlineQueue';

export interface UseOfflineQueueReturn {
  pendingCount: number;
  processing: boolean;
  processQueue: () => Promise<{ succeeded: number; failed: number }>;
  refreshCount: () => Promise<void>;
}

export function useOfflineQueue(): UseOfflineQueueReturn {
  const [pendingCount, setPendingCount] = useState(0);
  const [processing, setProcessing] = useState(false);
  const processingRef = useRef(false);
  const token = useAppSelector(selectToken);

  const refreshCount = useCallback(async () => {
    const queue = await getQueue();
    setPendingCount(queue.length);
  }, []);

  useEffect(() => {
    refreshCount();
  }, [refreshCount]);

  const processQueue = useCallback(async () => {
    // Re-entrancy guard — prevents duplicate processing from concurrent calls
    if (processingRef.current) return { succeeded: 0, failed: 0 };
    processingRef.current = true;
    setProcessing(true);

    try {
      const queue = await getQueue();
      if (queue.length === 0) return { succeeded: 0, failed: 0 };

      let succeeded = 0;
      let failed = 0;

      for (const entry of queue) {
        try {
          const authToken = token || entry.token;
          const response = await fetch(`${API_CONFIG.API_URL}/quality-checks`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${authToken}`,
            },
            body: JSON.stringify(entry.payload),
          });

          if (response.ok) {
            await removeFromQueue(entry.id);
            succeeded++;
          } else if (response.status === 401) {
            // Token expired — cannot retry without re-authentication
            Alert.alert(
              'Session Expired',
              'Your saved submissions require you to log in again before they can be sent.'
            );
            failed += queue.length - succeeded - failed;
            break;
          } else {
            failed++;
          }
        } catch {
          // Still offline — stop processing remaining items
          failed += queue.length - succeeded - failed;
          break;
        }
      }

      await refreshCount();
      return { succeeded, failed };
    } finally {
      processingRef.current = false;
      setProcessing(false);
    }
  }, [token, refreshCount]);

  return { pendingCount, processing, processQueue, refreshCount };
}
