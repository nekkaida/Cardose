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

// ── Report response schemas ───────────────────────────────────────

const periodSchema = z.object({ start: z.string(), end: z.string() });

export const salesReportResponseSchema = z.object({
  success: z.boolean(),
  report: z.object({
    period: periodSchema,
    sales: z.array(
      z.object({
        date: z.string(),
        invoice_count: z.number(),
        revenue: z.number(),
        tax_collected: z.number(),
      })
    ),
    summary: z.object({
      totalInvoices: z.number(),
      totalRevenue: z.number(),
      totalTax: z.number(),
      averageInvoice: z.number(),
    }),
    topCustomers: z.array(
      z.object({ name: z.string(), revenue: z.number(), invoice_count: z.number() })
    ),
  }),
});

export const inventoryReportResponseSchema = z.object({
  success: z.boolean(),
  report: z.object({
    summary: z.object({
      totalItems: z.number(),
      outOfStock: z.number(),
      lowStock: z.number(),
      totalValue: z.number(),
    }),
    byCategory: z.array(
      z.object({
        category: z.string().nullable(),
        item_count: z.number(),
        total_stock: z.number(),
        total_value: z.number(),
      })
    ),
    lowStockItems: z.array(
      z.object({
        name: z.string(),
        sku: z.string(),
        category: z.string().nullable(),
        current_stock: z.number(),
        reorder_level: z.number(),
        unit: z.string(),
      })
    ),
    recentMovements: z.array(
      z.object({
        item_name: z.string().nullable(),
        type: z.string(),
        quantity: z.number(),
        created_at: z.string(),
      })
    ),
  }),
});

export const productionReportResponseSchema = z.object({
  success: z.boolean(),
  report: z.object({
    period: periodSchema,
    ordersByStatus: z.array(z.object({ status: z.string(), count: z.number(), value: z.number() })),
    completionRate: z.number(),
    taskStats: z.array(z.object({ status: z.string(), count: z.number() })),
    qualityStats: z.array(z.object({ overall_status: z.string(), count: z.number() })),
  }),
});

export const customerReportResponseSchema = z.object({
  success: z.boolean(),
  report: z.object({
    summary: z.object({
      totalCustomers: z.number(),
      vipCustomers: z.number(),
      totalRevenue: z.number(),
      averageSpent: z.number(),
      newThisMonth: z.number(),
    }),
    byBusinessType: z.array(
      z.object({
        business_type: z.string().nullable(),
        count: z.number(),
        total_spent: z.number(),
        avg_orders: z.number(),
      })
    ),
    byLoyaltyStatus: z.array(
      z.object({
        loyalty_status: z.string().nullable(),
        count: z.number(),
        total_spent: z.number(),
      })
    ),
    topCustomers: z.array(
      z.object({
        name: z.string(),
        business_type: z.string().nullable(),
        loyalty_status: z.string().nullable(),
        total_orders: z.number(),
        total_spent: z.number(),
      })
    ),
  }),
});

export const financialReportResponseSchema = z.object({
  success: z.boolean(),
  report: z.object({
    period: periodSchema,
    summary: z.object({
      totalIncome: z.number(),
      totalExpense: z.number(),
      netIncome: z.number(),
      incomeCount: z.number(),
      expenseCount: z.number(),
    }),
    byCategory: z.array(
      z.object({ category: z.string(), type: z.string(), total: z.number(), count: z.number() })
    ),
    invoiceStats: z.array(z.object({ status: z.string(), count: z.number(), value: z.number() })),
  }),
});

// ── Users response schemas ───────────────────────────────────────

const userSchema = z.object({
  id: z.string(),
  username: z.string(),
  email: z.string(),
  full_name: z.string(),
  phone: z.string().nullable(),
  role: z.string(),
  is_active: z.number(),
  created_at: z.string(),
  updated_at: z.string().nullable().optional(),
});

const userStatsSchema = z.object({
  total: z.number(),
  active: z.number(),
  inactive: z.number(),
  byRole: z.object({
    owner: z.number(),
    manager: z.number(),
    employee: z.number(),
  }),
});

export const usersListResponseSchema = z.object({
  success: z.boolean(),
  users: z.array(userSchema),
  total: z.number(),
  page: z.number(),
  limit: z.number(),
  totalPages: z.number(),
  stats: userStatsSchema,
});

// ── Settings response schemas ────────────────────────────────────

const settingSchema = z.object({
  value: z.string(),
  description: z.string().nullable().optional(),
});

export const settingsListResponseSchema = z.object({
  success: z.boolean(),
  settings: z.record(z.string(), settingSchema),
});

// ── Dashboard analytics schema ────────────────────────────────────

export const dashboardAnalyticsSchema = z.object({
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
    completion_rate: z.number(),
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
