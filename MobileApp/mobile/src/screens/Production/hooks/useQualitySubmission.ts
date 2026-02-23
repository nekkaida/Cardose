import { useState, useCallback } from 'react';
import { useAuthenticatedFetch } from '../../../hooks/useAuthenticatedFetch';
import { useAppSelector } from '../../../store/hooks';
import { selectUser, selectToken } from '../../../store/slices/authSlice';
import type { ChecklistItem, QCStatus, QualityCheckPayload } from '../types';
import { enqueue } from '../services/offlineQueue';

export interface SubmitParams {
  orderId: string;
  checklistItems: ChecklistItem[];
  overallStatus: QCStatus;
  notes: string;
}

export interface SubmitResult {
  success: boolean;
  queued?: boolean;
  error?: string;
}

export interface UseQualitySubmissionReturn {
  submitting: boolean;
  submit: (params: SubmitParams) => Promise<SubmitResult>;
}

function isNetworkError(err: unknown): boolean {
  if (!(err instanceof Error)) return false;
  const msg = err.message.toLowerCase();
  return (
    msg.includes('network') ||
    msg.includes('fetch') ||
    msg.includes('timeout') ||
    msg.includes('abort') ||
    msg.includes('econnrefused') ||
    msg.includes('enotfound')
  );
}

export function useQualitySubmission(): UseQualitySubmissionReturn {
  const [submitting, setSubmitting] = useState(false);
  const authenticatedFetch = useAuthenticatedFetch();
  const user = useAppSelector(selectUser);
  const token = useAppSelector(selectToken);

  const submit = useCallback(
    async (params: SubmitParams): Promise<SubmitResult> => {
      setSubmitting(true);

      const payload: QualityCheckPayload = {
        order_id: params.orderId,
        checklist_items: params.checklistItems,
        overall_status: params.overallStatus,
        notes: params.notes || undefined,
        checked_by: user?.id,
      };

      try {
        const response = await authenticatedFetch('/quality-checks', {
          method: 'POST',
          body: JSON.stringify(payload),
        });

        const contentType = response.headers.get('content-type');
        if (!contentType?.includes('application/json')) {
          return { success: false, error: 'Server returned an unexpected response' };
        }

        const data = await response.json();

        if (response.ok) {
          return { success: true };
        }

        return {
          success: false,
          error: data.error || 'Failed to submit quality check',
        };
      } catch (err) {
        // Queue for offline retry on network errors
        if (isNetworkError(err) && token) {
          await enqueue(payload, token);
          return { success: true, queued: true };
        }

        const message =
          err instanceof Error ? err.message : 'Network error submitting quality check';
        return { success: false, error: message };
      } finally {
        setSubmitting(false);
      }
    },
    [authenticatedFetch, user?.id, token]
  );

  return { submitting, submit };
}
