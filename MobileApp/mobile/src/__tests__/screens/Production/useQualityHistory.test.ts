import { renderHook, act, waitFor } from '@testing-library/react-native';
import { useQualityHistory } from '../../../screens/Production/hooks/useQualityHistory';
import { useAuthenticatedFetch } from '../../../hooks/useAuthenticatedFetch';
import type { QualityCheck } from '../../../screens/Production/types';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------
jest.mock('../../../hooks/useAuthenticatedFetch', () => ({
  useAuthenticatedFetch: jest.fn(),
}));

const mockedUseAuthenticatedFetch = useAuthenticatedFetch as jest.MockedFunction<
  typeof useAuthenticatedFetch
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

const SAMPLE_CHECKS: QualityCheck[] = [
  {
    id: 'qc-1',
    order_id: 'order-123',
    checklist_items: [{ id: 'default_1', name: 'Material quality', checked: true }],
    overall_status: 'passed',
    checked_by_name: 'Admin',
    checked_at: '2025-06-01T10:00:00Z',
  },
  {
    id: 'qc-2',
    order_id: 'order-123',
    checklist_items: [{ id: 'default_1', name: 'Material quality', checked: false }],
    overall_status: 'failed',
    notes: 'Bad batch',
    checked_by_name: 'QC Inspector',
    checked_at: '2025-06-02T14:30:00Z',
  },
];

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
describe('useQualityHistory', () => {
  let mockAuthFetch: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    mockAuthFetch = jest.fn();
    mockedUseAuthenticatedFetch.mockReturnValue(mockAuthFetch);
  });

  // ── No orderId ──────────────────────────────────────────────────────
  it('does not fetch when orderId is undefined', () => {
    renderHook(() => useQualityHistory(undefined));

    expect(mockAuthFetch).not.toHaveBeenCalled();
  });

  it('returns empty history and no loading/error when orderId is undefined', () => {
    const { result } = renderHook(() => useQualityHistory(undefined));

    expect(result.current.history).toEqual([]);
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  // ── Successful fetch on mount ───────────────────────────────────────
  it('fetches history on mount when orderId is provided', async () => {
    mockAuthFetch.mockResolvedValue(
      createMockResponse({ checks: SAMPLE_CHECKS })
    );

    renderHook(() => useQualityHistory('order-123'));

    await waitFor(() => {
      expect(mockAuthFetch).toHaveBeenCalledWith(
        '/quality-checks?order_id=order-123'
      );
    });
  });

  it('sets loading state during fetch', async () => {
    let resolveResponse!: (value: Response) => void;
    mockAuthFetch.mockReturnValue(
      new Promise<Response>((resolve) => {
        resolveResponse = resolve;
      })
    );

    const { result } = renderHook(() => useQualityHistory('order-123'));

    // While fetch is pending, loading should be true
    await waitFor(() => {
      expect(result.current.loading).toBe(true);
    });

    // Resolve the fetch
    await act(async () => {
      resolveResponse(createMockResponse({ checks: [] }));
    });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });
  });

  it('parses and stores checks array from response', async () => {
    mockAuthFetch.mockResolvedValue(
      createMockResponse({ checks: SAMPLE_CHECKS })
    );

    const { result } = renderHook(() => useQualityHistory('order-123'));

    await waitFor(() => {
      expect(result.current.history).toEqual(SAMPLE_CHECKS);
    });
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('handles empty checks array', async () => {
    mockAuthFetch.mockResolvedValue(
      createMockResponse({ checks: [] })
    );

    const { result } = renderHook(() => useQualityHistory('order-123'));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });
    expect(result.current.history).toEqual([]);
    expect(result.current.error).toBeNull();
  });

  it('defaults to empty array when response has no checks field', async () => {
    mockAuthFetch.mockResolvedValue(
      createMockResponse({})
    );

    const { result } = renderHook(() => useQualityHistory('order-123'));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });
    expect(result.current.history).toEqual([]);
  });

  // ── Error: non-ok response ─────────────────────────────────────────
  it('sets error when response is not ok', async () => {
    mockAuthFetch.mockResolvedValue(
      createMockResponse(
        { error: 'Order not found' },
        { ok: false, status: 404 }
      )
    );

    const { result } = renderHook(() => useQualityHistory('order-123'));

    await waitFor(() => {
      expect(result.current.error).toBe('Order not found');
    });
    expect(result.current.loading).toBe(false);
    expect(result.current.history).toEqual([]);
  });

  it('uses fallback error message when response has no error field', async () => {
    mockAuthFetch.mockResolvedValue(
      createMockResponse({}, { ok: false, status: 500 })
    );

    const { result } = renderHook(() => useQualityHistory('order-123'));

    await waitFor(() => {
      expect(result.current.error).toBe('Failed to load quality history');
    });
  });

  // ── Error: non-JSON content type ───────────────────────────────────
  it('sets error when content-type is not JSON', async () => {
    mockAuthFetch.mockResolvedValue(
      createMockResponse('<html>Error</html>', {
        contentType: 'text/html',
      })
    );

    const { result } = renderHook(() => useQualityHistory('order-123'));

    await waitFor(() => {
      expect(result.current.error).toBe(
        'Server returned an unexpected response'
      );
    });
    expect(result.current.loading).toBe(false);
  });

  // ── Error: network failure ─────────────────────────────────────────
  it('sets error on network failure', async () => {
    mockAuthFetch.mockRejectedValue(new Error('Network request failed'));

    const { result } = renderHook(() => useQualityHistory('order-123'));

    await waitFor(() => {
      expect(result.current.error).toBe('Network request failed');
    });
    expect(result.current.loading).toBe(false);
  });

  it('uses fallback message for non-Error thrown values', async () => {
    mockAuthFetch.mockRejectedValue('something went wrong');

    const { result } = renderHook(() => useQualityHistory('order-123'));

    await waitFor(() => {
      expect(result.current.error).toBe('Network error loading history');
    });
  });

  // ── refresh ─────────────────────────────────────────────────────────
  it('refresh() can be called to re-fetch', async () => {
    mockAuthFetch.mockResolvedValue(
      createMockResponse({ checks: SAMPLE_CHECKS })
    );

    const { result } = renderHook(() => useQualityHistory('order-123'));

    // Wait for initial fetch
    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });
    expect(mockAuthFetch).toHaveBeenCalledTimes(1);

    // Call refresh
    await act(async () => {
      await result.current.refresh();
    });

    expect(mockAuthFetch).toHaveBeenCalledTimes(2);
  });

  it('refresh() clears previous error before re-fetching', async () => {
    // First call fails
    mockAuthFetch.mockRejectedValueOnce(new Error('Network error'));

    const { result } = renderHook(() => useQualityHistory('order-123'));

    await waitFor(() => {
      expect(result.current.error).toBe('Network error');
    });

    // Second call succeeds
    mockAuthFetch.mockResolvedValue(
      createMockResponse({ checks: SAMPLE_CHECKS })
    );

    await act(async () => {
      await result.current.refresh();
    });

    expect(result.current.error).toBeNull();
    expect(result.current.history).toEqual(SAMPLE_CHECKS);
  });

  it('refresh() does nothing when orderId is undefined', async () => {
    const { result } = renderHook(() => useQualityHistory(undefined));

    await act(async () => {
      await result.current.refresh();
    });

    expect(mockAuthFetch).not.toHaveBeenCalled();
  });

  // ── URL encoding ────────────────────────────────────────────────────
  it('encodes orderId in the URL', async () => {
    mockAuthFetch.mockResolvedValue(
      createMockResponse({ checks: [] })
    );

    renderHook(() => useQualityHistory('order with spaces'));

    await waitFor(() => {
      expect(mockAuthFetch).toHaveBeenCalledWith(
        '/quality-checks?order_id=order%20with%20spaces'
      );
    });
  });
});
