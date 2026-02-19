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

// ── Auth schemas ──────────────────────────────────────────────────

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

// ── List/paginated response schema ────────────────────────────────

export const listResponseSchema = z.object({
  success: z.boolean(),
  total: z.number(),
  page: z.number(),
  limit: z.number(),
  totalPages: z.number(),
});

// ── Report response schema ────────────────────────────────────────

export const reportResponseSchema = z.object({
  success: z.boolean(),
  report: z.record(z.string(), z.unknown()),
});

// ── Dashboard analytics schema ────────────────────────────────────

export const dashboardAnalyticsSchema = z.object({
  success: z.boolean(),
  data: z.object({
    period: z.string(),
    revenue: z.object({
      total_revenue: z.number(),
      paid_revenue: z.number(),
      pending_revenue: z.number(),
      average_order_value: z.number(),
      invoice_count: z.number(),
    }),
    orders: z.object({
      total_orders: z.number(),
      completed_orders: z.number(),
      active_orders: z.number(),
      cancelled_orders: z.number(),
      average_value: z.number(),
      completion_rate: z.union([z.number(), z.string()]),
    }),
    customers: z.object({
      total_customers: z.number(),
      vip_customers: z.number(),
      regular_customers: z.number(),
      new_customers: z.number(),
    }),
    inventory: z.object({
      total_materials: z.number(),
      out_of_stock: z.number(),
      low_stock: z.number(),
      total_value: z.number(),
    }),
    production: z.object({
      designing: z.number(),
      in_production: z.number(),
      quality_control: z.number(),
      urgent_orders: z.number(),
    }),
  }),
});

// ── Production board schema ───────────────────────────────────────

const productionTaskSchema = z.object({
  id: z.string(),
  order_id: z.string(),
  title: z.string(),
  status: z.string(),
  priority: z.string(),
  created_at: z.string(),
  updated_at: z.string(),
});

export const productionBoardSchema = z.object({
  success: z.boolean(),
  board: z.object({
    pending: z.array(productionTaskSchema),
    in_progress: z.array(productionTaskSchema),
    completed: z.array(productionTaskSchema),
  }),
});

export const productionStatsSchema = z.object({
  success: z.boolean(),
  stats: z.object({
    total: z.number(),
    pending: z.number(),
    inProgress: z.number(),
    completed: z.number(),
    completedToday: z.number(),
  }),
});

// ── Financial summary schema ──────────────────────────────────────

export const financialSummarySchema = z.object({
  success: z.boolean(),
  summary: z.object({
    totalRevenue: z.number(),
    totalExpenses: z.number(),
    totalTax: z.number(),
    netProfit: z.number(),
    profitMargin: z.number(),
    pendingInvoices: z.number(),
    paidInvoices: z.number(),
  }),
});

// ── Order stats schema ────────────────────────────────────────────

export const orderStatsSchema = z.object({
  success: z.boolean(),
  stats: z.object({
    total: z.number(),
    pending: z.number(),
  }),
});
