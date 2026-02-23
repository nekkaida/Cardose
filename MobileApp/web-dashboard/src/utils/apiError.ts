/**
 * Extract a user-friendly error message from an API error.
 * Handles Axios errors, plain Error objects, and unknown shapes safely.
 */
export function getApiErrorMessage(
  err: unknown,
  fallback = 'An unexpected error occurred'
): string {
  if (err && typeof err === 'object') {
    // Axios-style error with response.data.error
    const axiosErr = err as { response?: { data?: { error?: string } } };
    if (typeof axiosErr.response?.data?.error === 'string') {
      return axiosErr.response.data.error;
    }
    // Standard Error object
    if (err instanceof Error && err.message) {
      return err.message;
    }
  }
  return fallback;
}
