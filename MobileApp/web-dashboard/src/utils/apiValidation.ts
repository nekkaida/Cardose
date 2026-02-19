import { z } from 'zod';

/**
 * Safely validate an API response against a Zod schema.
 * On failure: logs a warning and returns the raw data (graceful degradation).
 */
export function validateResponse<T>(schema: z.ZodType<T>, data: unknown, endpoint: string): T {
  const result = schema.safeParse(data);
  if (!result.success) {
    console.warn(`[API Validation] ${endpoint}: response shape mismatch`, result.error.issues);
    return data as T;
  }
  return result.data;
}

// ── Common schemas ─────────────────────────────────────────────────

export const loginResponseSchema = z.object({
  success: z.boolean(),
  token: z.string(),
  user: z.object({
    id: z.string(),
    username: z.string(),
    email: z.string(),
    role: z.string(),
  }),
});

export const reportResponseSchema = z.object({
  success: z.boolean(),
  report: z.record(z.string(), z.unknown()),
});

export const listResponseSchema = z.object({
  success: z.boolean(),
  total: z.number(),
  page: z.number(),
  limit: z.number(),
  totalPages: z.number(),
});
