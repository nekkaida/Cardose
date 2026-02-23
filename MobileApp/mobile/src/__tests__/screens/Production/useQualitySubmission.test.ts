import { renderHook, act, waitFor } from '@testing-library/react-native';
import { useQualitySubmission } from '../../../screens/Production/hooks/useQualitySubmission';
import { useAuthenticatedFetch } from '../../../hooks/useAuthenticatedFetch';
import { useAppSelector } from '../../../store/hooks';
import type { ChecklistItem, QCStatus } from '../../../screens/Production/types';
import type { SubmitParams, SubmitResult } from '../../../screens/Production/hooks/useQualitySubmission';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------
jest.mock('../../../hooks/useAuthenticatedFetch', () => ({
  useAuthenticatedFetch: jest.fn(),
}));

jest.mock('../../../store/hooks', () => ({
  useAppSelector: jest.fn(),
  useAppDispatch: jest.fn(() => jest.fn()),
}));

// Prevent transitive expo-secure-store import via authSlice -> tokenStorage
jest.mock('../../../utils/tokenStorage', () => ({
  getToken: jest.fn(),
  setToken: jest.fn(),
  removeToken: jest.fn(),
  getUser: jest.fn(),
  setUser: jest.fn(),
  removeUser: jest.fn(),
  clearAll: jest.fn(),
}));

// Prevent transitive import of ApiService (also imported by authSlice)
jest.mock('../../../services/ApiService', () => ({
  ApiService: {
    post: jest.fn(),
    get: jest.fn(),
    put: jest.fn(),
    patch: jest.fn(),
  },
}));

// Mock offline queue service
const mockEnqueue = jest.fn().mockResolvedValue('queued_mock_id');
jest.mock('../../../screens/Production/services/offlineQueue', () => ({
  enqueue: (...args: unknown[]) => mockEnqueue(...args),
}));

const mockedUseAuthenticatedFetch = useAuthenticatedFetch as jest.MockedFunction<
  typeof useAuthenticatedFetch
>;
const mockedUseAppSelector = useAppSelector as jest.MockedFunction<
  typeof useAppSelector
>;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Create a mock Response that resolves to the given JSON body. */
function createMockResponse(
  body: unknown,
  options: { ok?: boolean; status?: number; contentType?: string } = {}
): Response {
  const { ok = true, status = 200, contentType = 'application/json' } = options;
  return {
    ok,
    status,
    headers: {
      get: (name: string) => {
        if (name.toLowerCase() === 'content-type') return contentType;
        return null;
      },
    },
    json: jest.fn().mockResolvedValue(body),
  } as unknown as Response;
}

const SAMPLE_CHECKLIST: ChecklistItem[] = [
  { id: 'default_1', name: 'Material quality inspection', checked: true },
  { id: 'default_2', name: 'Dimensions accuracy check', checked: true },
  { id: 'default_3', name: 'Color matching verification', checked: false },
];

const MOCK_USER = {
  id: 'user-42',
  username: 'inspector',
  email: 'inspector@example.com',
  fullName: 'QC Inspector',
  role: 'employee' as const,
  createdAt: '2025-01-01T00:00:00Z',
};

function makeSubmitParams(overrides: Partial<SubmitParams> = {}): SubmitParams {
  return {
    orderId: 'order-123',
    checklistItems: SAMPLE_CHECKLIST,
    overallStatus: 'needs_review' as QCStatus,
    notes: 'Some observations',
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
describe('useQualitySubmission', () => {
  let mockAuthFetch: jest.Mock;

  const mockAuthState = {
    auth: {
      user: MOCK_USER as typeof MOCK_USER | null,
      token: 'test-jwt-token' as string | null,
      isAuthenticated: true,
      isLoading: false,
      error: null,
      isInitialized: true,
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockAuthFetch = jest.fn();
    mockedUseAuthenticatedFetch.mockReturnValue(mockAuthFetch);
    // Route selectors through mock state so both selectUser and selectToken work
    mockAuthState.auth.user = MOCK_USER;
    mockAuthState.auth.token = 'test-jwt-token';
    mockedUseAppSelector.mockImplementation((selector: any) => selector(mockAuthState));
  });

  // ── Initial state ───────────────────────────────────────────────────
  it('starts with submitting=false', () => {
    const { result } = renderHook(() => useQualitySubmission());
    expect(result.current.submitting).toBe(false);
  });

  // ── Submitting lifecycle ────────────────────────────────────────────
  it('sets submitting=true during submission, false after', async () => {
    let resolveResponse!: (value: Response) => void;
    mockAuthFetch.mockReturnValue(
      new Promise<Response>((resolve) => {
        resolveResponse = resolve;
      })
    );

    const { result } = renderHook(() => useQualitySubmission());

    let submitPromise!: Promise<SubmitResult>;
    act(() => {
      submitPromise = result.current.submit(makeSubmitParams());
    });

    // Should be submitting while promise is pending
    await waitFor(() => {
      expect(result.current.submitting).toBe(true);
    });

    // Resolve
    await act(async () => {
      resolveResponse(createMockResponse({ success: true }));
      await submitPromise;
    });

    expect(result.current.submitting).toBe(false);
  });

  // ── Correct payload ─────────────────────────────────────────────────
  it('sends correct payload with checked_by from user', async () => {
    mockAuthFetch.mockResolvedValue(
      createMockResponse({ success: true })
    );

    const { result } = renderHook(() => useQualitySubmission());

    const params = makeSubmitParams();
    await act(async () => {
      await result.current.submit(params);
    });

    expect(mockAuthFetch).toHaveBeenCalledWith('/quality-checks', {
      method: 'POST',
      body: JSON.stringify({
        order_id: 'order-123',
        checklist_items: SAMPLE_CHECKLIST,
        overall_status: 'needs_review',
        notes: 'Some observations',
        checked_by: 'user-42',
      }),
    });
  });

  it('sends checked_by as undefined when user is null', async () => {
    mockAuthState.auth.user = null;
    mockAuthFetch.mockResolvedValue(
      createMockResponse({ success: true })
    );

    const { result } = renderHook(() => useQualitySubmission());

    await act(async () => {
      await result.current.submit(makeSubmitParams());
    });

    const sentBody = JSON.parse(mockAuthFetch.mock.calls[0][1].body);
    expect(sentBody.checked_by).toBeUndefined();
  });

  // ── Handles missing notes (sends undefined) ────────────────────────
  it('handles missing notes (sends undefined)', async () => {
    mockAuthFetch.mockResolvedValue(
      createMockResponse({ success: true })
    );

    const { result } = renderHook(() => useQualitySubmission());

    await act(async () => {
      await result.current.submit(makeSubmitParams({ notes: '' }));
    });

    const sentBody = JSON.parse(mockAuthFetch.mock.calls[0][1].body);
    // Empty string is falsy, so `params.notes || undefined` yields undefined
    expect(sentBody.notes).toBeUndefined();
  });

  it('includes notes when provided', async () => {
    mockAuthFetch.mockResolvedValue(
      createMockResponse({ success: true })
    );

    const { result } = renderHook(() => useQualitySubmission());

    await act(async () => {
      await result.current.submit(makeSubmitParams({ notes: 'Check again' }));
    });

    const sentBody = JSON.parse(mockAuthFetch.mock.calls[0][1].body);
    expect(sentBody.notes).toBe('Check again');
  });

  // ── Success ─────────────────────────────────────────────────────────
  it('returns success on 200 response', async () => {
    mockAuthFetch.mockResolvedValue(
      createMockResponse({ id: 'qc-new' })
    );

    const { result } = renderHook(() => useQualitySubmission());

    let submitResult!: SubmitResult;
    await act(async () => {
      submitResult = await result.current.submit(makeSubmitParams());
    });

    expect(submitResult).toEqual({ success: true });
  });

  // ── Error: non-ok response ─────────────────────────────────────────
  it('returns error message on non-ok response', async () => {
    mockAuthFetch.mockResolvedValue(
      createMockResponse(
        { error: 'Validation failed: missing checklist items' },
        { ok: false, status: 422 }
      )
    );

    const { result } = renderHook(() => useQualitySubmission());

    let submitResult!: SubmitResult;
    await act(async () => {
      submitResult = await result.current.submit(makeSubmitParams());
    });

    expect(submitResult).toEqual({
      success: false,
      error: 'Validation failed: missing checklist items',
    });
  });

  it('uses fallback error when response has no error field', async () => {
    mockAuthFetch.mockResolvedValue(
      createMockResponse({}, { ok: false, status: 500 })
    );

    const { result } = renderHook(() => useQualitySubmission());

    let submitResult!: SubmitResult;
    await act(async () => {
      submitResult = await result.current.submit(makeSubmitParams());
    });

    expect(submitResult).toEqual({
      success: false,
      error: 'Failed to submit quality check',
    });
  });

  // ── Error: non-JSON response ───────────────────────────────────────
  it('returns error on non-JSON response', async () => {
    mockAuthFetch.mockResolvedValue(
      createMockResponse('<html>Error</html>', {
        contentType: 'text/html',
      })
    );

    const { result } = renderHook(() => useQualitySubmission());

    let submitResult!: SubmitResult;
    await act(async () => {
      submitResult = await result.current.submit(makeSubmitParams());
    });

    expect(submitResult).toEqual({
      success: false,
      error: 'Server returned an unexpected response',
    });
  });

  // ── Error: network failure → queued offline ───────────────────────
  it('queues submission on network failure', async () => {
    mockAuthFetch.mockRejectedValue(new Error('Network request failed'));

    const { result } = renderHook(() => useQualitySubmission());

    let submitResult!: SubmitResult;
    await act(async () => {
      submitResult = await result.current.submit(makeSubmitParams());
    });

    expect(submitResult).toEqual({
      success: true,
      queued: true,
    });
    expect(mockEnqueue).toHaveBeenCalledWith(
      expect.objectContaining({ order_id: 'order-123' }),
      'test-jwt-token'
    );
  });

  it('uses fallback message for non-Error thrown values', async () => {
    mockAuthFetch.mockRejectedValue('something broke');

    const { result } = renderHook(() => useQualitySubmission());

    let submitResult!: SubmitResult;
    await act(async () => {
      submitResult = await result.current.submit(makeSubmitParams());
    });

    expect(submitResult).toEqual({
      success: false,
      error: 'Network error submitting quality check',
    });
  });

  it('resets submitting to false after queued network failure', async () => {
    mockAuthFetch.mockRejectedValue(new Error('Timeout'));

    const { result } = renderHook(() => useQualitySubmission());

    await act(async () => {
      await result.current.submit(makeSubmitParams());
    });

    expect(result.current.submitting).toBe(false);
  });

  // ── Multiple submissions ────────────────────────────────────────────
  it('can submit multiple times', async () => {
    mockAuthFetch.mockResolvedValue(
      createMockResponse({ success: true })
    );

    const { result } = renderHook(() => useQualitySubmission());

    let firstResult!: SubmitResult;
    let secondResult!: SubmitResult;

    await act(async () => {
      firstResult = await result.current.submit(makeSubmitParams());
    });
    await act(async () => {
      secondResult = await result.current.submit(
        makeSubmitParams({ orderId: 'order-456' })
      );
    });

    expect(firstResult.success).toBe(true);
    expect(secondResult.success).toBe(true);
    expect(mockAuthFetch).toHaveBeenCalledTimes(2);
  });
});
