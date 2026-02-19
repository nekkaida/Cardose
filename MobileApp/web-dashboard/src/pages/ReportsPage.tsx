import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useApi } from '../contexts/ApiContext';
import { useLanguage } from '../contexts/LanguageContext';

// ── Types ─────────────────────────────────────────────────────────

interface SalesReportData {
  period: { start: string; end: string };
  sales: Array<{ date: string; invoice_count: number; revenue: number; tax_collected: number }>;
  summary: {
    totalInvoices: number;
    totalRevenue: number;
    totalTax: number;
    averageInvoice: number;
  };
  topCustomers: Array<{ name: string; revenue: number; invoice_count: number }>;
}

interface InventoryReportData {
  summary: { totalItems: number; outOfStock: number; lowStock: number; totalValue: number };
  byCategory: Array<{
    category: string;
    item_count: number;
    total_stock: number;
    total_value: number;
  }>;
  lowStockItems: Array<{
    name: string;
    sku: string;
    category: string;
    current_stock: number;
    reorder_level: number;
    unit: string;
  }>;
  recentMovements: Array<{ item_name: string; type: string; quantity: number; created_at: string }>;
}

interface ProductionReportData {
  period: { start: string; end: string };
  ordersByStatus: Array<{ status: string; count: number; value: number }>;
  completionRate: number | string;
  taskStats: Array<{ status: string; count: number }>;
  qualityStats: Array<{ overall_status: string; count: number }>;
}

interface CustomerReportData {
  summary: {
    totalCustomers: number;
    vipCustomers: number;
    totalRevenue: number;
    averageSpent: number;
    newThisMonth: number;
  };
  byBusinessType: Array<{
    business_type: string;
    count: number;
    total_spent: number;
    avg_orders: number;
  }>;
  byLoyaltyStatus: Array<{ loyalty_status: string; count: number; total_spent: number }>;
  topCustomers: Array<{
    name: string;
    business_type: string;
    loyalty_status: string;
    total_orders: number;
    total_spent: number;
  }>;
}

interface FinancialReportData {
  period: { start: string; end: string };
  summary: {
    totalIncome: number;
    totalExpense: number;
    netIncome: number;
    incomeCount: number;
    expenseCount: number;
  };
  byCategory: Array<{ category: string; type: string; total: number; count: number }>;
  invoiceStats: Array<{ status: string; count: number; value: number }>;
}

type ReportType = 'sales' | 'inventory' | 'production' | 'customers' | 'financial';
type ReportData =
  | SalesReportData
  | InventoryReportData
  | ProductionReportData
  | CustomerReportData
  | FinancialReportData
  | null;

// ── Helpers ───────────────────────────────────────────────────────

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
  }).format(amount || 0);

const formatNumber = (n: number) => new Intl.NumberFormat('id-ID').format(n || 0);

const formatLabel = (key: string): string =>
  key
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (l) => l.toUpperCase());

const sanitizeCsvValue = (value: unknown): string => {
  const str = String(value ?? '');
  if (/^[=+\-@\t\r]/.test(str)) return `\t${str}`;
  return str;
};

const SUPPORTS_DATE_FILTER: ReportType[] = ['sales', 'production', 'financial'];

const REPORT_TABS: Array<{ key: ReportType; labelKey: string; fallback: string; icon: string }> = [
  {
    key: 'sales',
    labelKey: 'reports.sales',
    fallback: 'Sales Report',
    icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z',
  },
  {
    key: 'inventory',
    labelKey: 'reports.inventory',
    fallback: 'Inventory Report',
    icon: 'M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4',
  },
  {
    key: 'production',
    labelKey: 'reports.production',
    fallback: 'Production Report',
    icon: 'M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z',
  },
  {
    key: 'customers',
    labelKey: 'reports.customers',
    fallback: 'Customer Report',
    icon: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z',
  },
  {
    key: 'financial',
    labelKey: 'reports.financial',
    fallback: 'Financial Report',
    icon: 'M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
  },
];

// ── Stateless UI components (outside component to avoid re-creation) ──

const StatCard = ({
  label,
  value,
  accent,
}: {
  label: string;
  value: string | number;
  accent?: string;
}) => (
  <div className="rounded-xl border border-gray-200 bg-white p-4">
    <p className="text-xs font-medium uppercase tracking-wide text-gray-500">{label}</p>
    <p className={`mt-1 text-xl font-bold ${accent || 'text-gray-900'}`}>{value}</p>
  </div>
);

const SectionTitle = ({ children }: { children: React.ReactNode }) => (
  <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-gray-700">{children}</h3>
);

const SkeletonCard = () => (
  <div className="animate-pulse rounded-xl border border-gray-200 bg-white p-4">
    <div className="mb-2 h-3 w-20 rounded bg-gray-200" />
    <div className="h-6 w-28 rounded bg-gray-200" />
  </div>
);

const SkeletonTable = () => (
  <div className="animate-pulse">
    <div className="mb-3 h-4 w-32 rounded bg-gray-200" />
    <div className="space-y-2">
      {[...Array(5)].map((_, i) => (
        <div key={i} className="h-10 rounded bg-gray-100" />
      ))}
    </div>
  </div>
);

const ReportSkeleton = () => (
  <div>
    <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
      {[...Array(4)].map((_, i) => (
        <SkeletonCard key={i} />
      ))}
    </div>
    <SkeletonTable />
    <div className="mt-6">
      <SkeletonTable />
    </div>
  </div>
);

// ── Component ─────────────────────────────────────────────────────

const ReportsPage: React.FC = () => {
  const [reportType, setReportType] = useState<ReportType>('sales');
  const [reportData, setReportData] = useState<ReportData>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [generatedAt, setGeneratedAt] = useState<string | null>(null);

  const {
    getSalesReport,
    getInventoryReport,
    getProductionReport,
    getCustomerReport,
    getFinancialReport,
  } = useApi();
  const { t, language } = useLanguage();

  const tr = useCallback(
    (key: string, fallback: string) => {
      const val = t(key);
      return val === key ? fallback : val;
      // eslint-disable-next-line react-hooks/exhaustive-deps -- language ensures tr updates on locale switch
    },
    [t, language]
  );
  const trRef = useRef(tr);
  trRef.current = tr;

  const fetchReport = useCallback(
    async (type: ReportType, start: string, end: string) => {
      setLoading(true);
      setError(null);
      try {
        const params: Record<string, string> = {};
        if (start) params.startDate = start;
        if (end) params.endDate = end;

        let response;
        switch (type) {
          case 'sales':
            response = await getSalesReport(params);
            break;
          case 'inventory':
            response = await getInventoryReport();
            break;
          case 'production':
            response = await getProductionReport(params);
            break;
          case 'customers':
            response = await getCustomerReport();
            break;
          case 'financial':
            response = await getFinancialReport(params);
            break;
        }
        setReportData(response?.report ?? null);
        setGeneratedAt(new Date().toLocaleString('id-ID'));
      } catch {
        setError(trRef.current('reports.loadError', 'Failed to load report. Please try again.'));
      } finally {
        setLoading(false);
      }
    },
    [getSalesReport, getInventoryReport, getProductionReport, getCustomerReport, getFinancialReport]
  );

  // Auto-fetch when report type changes
  useEffect(() => {
    fetchReport(reportType, startDate, endDate);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only auto-fetch on tab change, dates use Generate button
  }, [reportType, fetchReport]);

  const handleFetch = () => fetchReport(reportType, startDate, endDate);

  // ── CSV Export ────────────────────────────────────────────────

  const exportToCSV = (data: ReportData, filename: string) => {
    if (!data) return;
    const rows: Record<string, unknown>[] = [];

    const collectRows = (obj: Record<string, unknown>) => {
      Object.entries(obj).forEach(([key, value]) => {
        if (Array.isArray(value) && value.length > 0) {
          value.forEach((item: Record<string, unknown>) => rows.push({ _section: key, ...item }));
        } else if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
          const rec = value as Record<string, unknown>;
          const hasArrays = Object.values(rec).some((v) => Array.isArray(v));
          if (hasArrays) {
            collectRows(rec);
          } else {
            rows.push({ _section: key, ...rec });
          }
        }
      });
    };
    collectRows(data as unknown as Record<string, unknown>);
    if (rows.length === 0) return;

    const headers = Object.keys(rows[0]);
    const csvLines = [
      headers.join(','),
      ...rows.map((row) => headers.map((h) => `"${sanitizeCsvValue(row[h])}"`).join(',')),
    ];
    const blob = new Blob([csvLines.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  // ── Shared renderers ─────────────────────────────────────────

  const EmptyState = () => (
    <p className="py-6 text-center text-sm text-gray-400">
      {tr('reports.noData', 'No data available')}
    </p>
  );

  const DataTable = ({
    headers,
    rows,
  }: {
    headers: Array<{ key: string; label: string; format?: (v: any) => string; className?: string }>;
    rows: any[];
  }) => {
    if (!rows || rows.length === 0) return <EmptyState />;
    return (
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              {headers.map((h) => (
                <th
                  key={h.key}
                  className={`px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 ${h.className || ''}`}
                >
                  {h.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 bg-white">
            {rows.map((row, i) => (
              <tr key={i} className="hover:bg-gray-50">
                {headers.map((h) => (
                  <td
                    key={h.key}
                    className={`whitespace-nowrap px-4 py-3 text-sm text-gray-900 ${h.className || ''}`}
                  >
                    {h.format ? h.format(row[h.key]) : (row[h.key] ?? '-')}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  // ── Report-specific renderers ─────────────────────────────────

  const renderSalesReport = (data: SalesReportData) => (
    <>
      {/* Summary cards */}
      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard
          label={tr('reports.totalInvoices', 'Total Invoices')}
          value={formatNumber(data.summary.totalInvoices)}
        />
        <StatCard
          label={tr('reports.totalRevenue', 'Total Revenue')}
          value={formatCurrency(data.summary.totalRevenue)}
          accent="text-green-600"
        />
        <StatCard
          label={tr('reports.totalTax', 'Total Tax')}
          value={formatCurrency(data.summary.totalTax)}
        />
        <StatCard
          label={tr('reports.averageInvoice', 'Average Invoice')}
          value={formatCurrency(data.summary.averageInvoice)}
        />
      </div>

      {/* Period */}
      {data.period && (
        <p className="mb-4 text-xs text-gray-400">
          {tr('reports.period', 'Period')}: {data.period.start} — {data.period.end}
        </p>
      )}

      {/* Daily sales table */}
      <div className="mb-6">
        <SectionTitle>{tr('reports.dailySales', 'Daily Sales')}</SectionTitle>
        <DataTable
          headers={[
            { key: 'date', label: tr('reports.date', 'Date') },
            {
              key: 'invoice_count',
              label: tr('reports.invoiceCount', 'Invoices'),
              format: (v: number) => formatNumber(v),
            },
            {
              key: 'revenue',
              label: tr('reports.revenue', 'Revenue'),
              format: (v: number) => formatCurrency(v),
            },
            {
              key: 'tax_collected',
              label: tr('reports.taxCollected', 'Tax Collected'),
              format: (v: number) => formatCurrency(v),
            },
          ]}
          rows={data.sales}
        />
      </div>

      {/* Top customers */}
      <div>
        <SectionTitle>{tr('reports.topCustomers', 'Top Customers')}</SectionTitle>
        <DataTable
          headers={[
            { key: 'name', label: tr('reports.customerName', 'Customer') },
            {
              key: 'revenue',
              label: tr('reports.revenue', 'Revenue'),
              format: (v: number) => formatCurrency(v),
            },
            {
              key: 'invoice_count',
              label: tr('reports.invoiceCount', 'Invoices'),
              format: (v: number) => formatNumber(v),
            },
          ]}
          rows={data.topCustomers}
        />
      </div>
    </>
  );

  const renderInventoryReport = (data: InventoryReportData) => (
    <>
      {/* Summary cards */}
      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard
          label={tr('reports.totalItems', 'Total Items')}
          value={formatNumber(data.summary.totalItems)}
        />
        <StatCard
          label={tr('reports.outOfStock', 'Out of Stock')}
          value={formatNumber(data.summary.outOfStock)}
          accent={data.summary.outOfStock > 0 ? 'text-red-600' : 'text-gray-900'}
        />
        <StatCard
          label={tr('reports.lowStock', 'Low Stock')}
          value={formatNumber(data.summary.lowStock)}
          accent={data.summary.lowStock > 0 ? 'text-amber-600' : 'text-gray-900'}
        />
        <StatCard
          label={tr('reports.totalValue', 'Total Value')}
          value={formatCurrency(data.summary.totalValue)}
          accent="text-green-600"
        />
      </div>

      {/* By category */}
      <div className="mb-6">
        <SectionTitle>{tr('reports.byCategory', 'By Category')}</SectionTitle>
        <DataTable
          headers={[
            {
              key: 'category',
              label: tr('reports.category', 'Category'),
              format: (v: string) => formatLabel(v || 'Uncategorized'),
            },
            {
              key: 'item_count',
              label: tr('reports.itemCount', 'Items'),
              format: (v: number) => formatNumber(v),
            },
            {
              key: 'total_stock',
              label: tr('reports.totalStock', 'Total Stock'),
              format: (v: number) => formatNumber(v),
            },
            {
              key: 'total_value',
              label: tr('reports.totalValue', 'Total Value'),
              format: (v: number) => formatCurrency(v),
            },
          ]}
          rows={data.byCategory}
        />
      </div>

      {/* Low stock items */}
      <div className="mb-6">
        <SectionTitle>{tr('reports.lowStockItems', 'Low Stock Items')}</SectionTitle>
        <DataTable
          headers={[
            { key: 'name', label: tr('reports.itemName', 'Item') },
            { key: 'sku', label: tr('reports.sku', 'SKU') },
            {
              key: 'category',
              label: tr('reports.category', 'Category'),
              format: (v: string) => formatLabel(v || '-'),
            },
            {
              key: 'current_stock',
              label: tr('reports.currentStock', 'Current Stock'),
              format: (v: number) => formatNumber(v),
            },
            {
              key: 'reorder_level',
              label: tr('reports.reorderLevel', 'Reorder Level'),
              format: (v: number) => formatNumber(v),
            },
            { key: 'unit', label: tr('reports.unit', 'Unit') },
          ]}
          rows={data.lowStockItems}
        />
      </div>

      {/* Recent movements */}
      <div>
        <SectionTitle>{tr('reports.recentMovements', 'Recent Movements')}</SectionTitle>
        <DataTable
          headers={[
            { key: 'item_name', label: tr('reports.itemName', 'Item') },
            {
              key: 'type',
              label: tr('reports.movementType', 'Type'),
              format: (v: string) => formatLabel(v || '-'),
            },
            {
              key: 'quantity',
              label: tr('reports.quantity', 'Quantity'),
              format: (v: number) => formatNumber(v),
            },
            {
              key: 'created_at',
              label: tr('reports.movementDate', 'Date'),
              format: (v: string) => (v ? new Date(v).toLocaleDateString('id-ID') : '-'),
            },
          ]}
          rows={data.recentMovements}
        />
      </div>
    </>
  );

  const renderProductionReport = (data: ProductionReportData) => {
    const totalOrders = data.ordersByStatus.reduce((sum, s) => sum + s.count, 0);
    const completedCount = data.ordersByStatus.find((s) => s.status === 'completed')?.count ?? 0;
    const rate =
      typeof data.completionRate === 'string'
        ? parseFloat(data.completionRate)
        : data.completionRate || 0;

    return (
      <>
        {/* Summary cards */}
        <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-3">
          <StatCard
            label={tr('reports.totalOrders', 'Total Orders')}
            value={formatNumber(totalOrders)}
          />
          <StatCard
            label={tr('reports.completedOrders', 'Completed')}
            value={formatNumber(completedCount)}
            accent="text-green-600"
          />
          <StatCard
            label={tr('reports.completionRate', 'Completion Rate')}
            value={`${rate.toFixed(1)}%`}
            accent={rate >= 80 ? 'text-green-600' : rate >= 50 ? 'text-amber-600' : 'text-red-600'}
          />
        </div>

        {/* Period */}
        {data.period && (
          <p className="mb-4 text-xs text-gray-400">
            {tr('reports.period', 'Period')}: {data.period.start} — {data.period.end}
          </p>
        )}

        {/* Orders by status */}
        <div className="mb-6">
          <SectionTitle>{tr('reports.ordersByStatus', 'Orders by Status')}</SectionTitle>
          <DataTable
            headers={[
              {
                key: 'status',
                label: tr('reports.status', 'Status'),
                format: (v: string) => formatLabel(v || '-'),
              },
              {
                key: 'count',
                label: tr('reports.count', 'Count'),
                format: (v: number) => formatNumber(v),
              },
              {
                key: 'value',
                label: tr('reports.value', 'Value'),
                format: (v: number) => formatCurrency(v),
              },
            ]}
            rows={data.ordersByStatus}
          />
        </div>

        {/* Task stats */}
        <div className="mb-6">
          <SectionTitle>{tr('reports.taskStats', 'Task Statistics')}</SectionTitle>
          <DataTable
            headers={[
              {
                key: 'status',
                label: tr('reports.status', 'Status'),
                format: (v: string) => formatLabel(v || '-'),
              },
              {
                key: 'count',
                label: tr('reports.count', 'Count'),
                format: (v: number) => formatNumber(v),
              },
            ]}
            rows={data.taskStats}
          />
        </div>

        {/* Quality stats */}
        <div>
          <SectionTitle>{tr('reports.qualityStats', 'Quality Check Statistics')}</SectionTitle>
          <DataTable
            headers={[
              {
                key: 'overall_status',
                label: tr('reports.status', 'Status'),
                format: (v: string) => formatLabel(v || '-'),
              },
              {
                key: 'count',
                label: tr('reports.count', 'Count'),
                format: (v: number) => formatNumber(v),
              },
            ]}
            rows={data.qualityStats}
          />
        </div>
      </>
    );
  };

  const renderCustomerReport = (data: CustomerReportData) => (
    <>
      {/* Summary cards */}
      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-5">
        <StatCard
          label={tr('reports.totalCustomers', 'Total Customers')}
          value={formatNumber(data.summary.totalCustomers)}
        />
        <StatCard
          label={tr('reports.vipCustomers', 'VIP Customers')}
          value={formatNumber(data.summary.vipCustomers)}
          accent="text-amber-600"
        />
        <StatCard
          label={tr('reports.totalRevenue', 'Total Revenue')}
          value={formatCurrency(data.summary.totalRevenue)}
          accent="text-green-600"
        />
        <StatCard
          label={tr('reports.averageSpent', 'Average Spent')}
          value={formatCurrency(data.summary.averageSpent)}
        />
        <StatCard
          label={tr('reports.newThisMonth', 'New This Month')}
          value={formatNumber(data.summary.newThisMonth)}
          accent="text-blue-600"
        />
      </div>

      {/* By business type */}
      <div className="mb-6">
        <SectionTitle>{tr('reports.byBusinessType', 'By Business Type')}</SectionTitle>
        <DataTable
          headers={[
            {
              key: 'business_type',
              label: tr('reports.businessType', 'Business Type'),
              format: (v: string) => formatLabel(v || '-'),
            },
            {
              key: 'count',
              label: tr('reports.count', 'Count'),
              format: (v: number) => formatNumber(v),
            },
            {
              key: 'total_spent',
              label: tr('reports.totalSpent', 'Total Spent'),
              format: (v: number) => formatCurrency(v),
            },
            {
              key: 'avg_orders',
              label: tr('reports.avgOrders', 'Avg Orders'),
              format: (v: number) => Number(v || 0).toFixed(1),
            },
          ]}
          rows={data.byBusinessType}
        />
      </div>

      {/* By loyalty status */}
      <div className="mb-6">
        <SectionTitle>{tr('reports.byLoyaltyStatus', 'By Loyalty Status')}</SectionTitle>
        <DataTable
          headers={[
            {
              key: 'loyalty_status',
              label: tr('reports.loyaltyStatus', 'Loyalty Status'),
              format: (v: string) => formatLabel(v || '-'),
            },
            {
              key: 'count',
              label: tr('reports.count', 'Count'),
              format: (v: number) => formatNumber(v),
            },
            {
              key: 'total_spent',
              label: tr('reports.totalSpent', 'Total Spent'),
              format: (v: number) => formatCurrency(v),
            },
          ]}
          rows={data.byLoyaltyStatus}
        />
      </div>

      {/* Top customers */}
      <div>
        <SectionTitle>{tr('reports.topCustomers', 'Top Customers')}</SectionTitle>
        <DataTable
          headers={[
            { key: 'name', label: tr('reports.customerName', 'Customer') },
            {
              key: 'business_type',
              label: tr('reports.businessType', 'Business Type'),
              format: (v: string) => formatLabel(v || '-'),
            },
            {
              key: 'loyalty_status',
              label: tr('reports.loyaltyStatus', 'Loyalty Status'),
              format: (v: string) => formatLabel(v || '-'),
            },
            {
              key: 'total_orders',
              label: tr('reports.totalOrdersCol', 'Total Orders'),
              format: (v: number) => formatNumber(v),
            },
            {
              key: 'total_spent',
              label: tr('reports.totalSpent', 'Total Spent'),
              format: (v: number) => formatCurrency(v),
            },
          ]}
          rows={data.topCustomers}
        />
      </div>
    </>
  );

  const renderFinancialReport = (data: FinancialReportData) => (
    <>
      {/* Summary cards */}
      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-5">
        <StatCard
          label={tr('reports.totalIncome', 'Total Income')}
          value={formatCurrency(data.summary.totalIncome)}
          accent="text-green-600"
        />
        <StatCard
          label={tr('reports.totalExpense', 'Total Expense')}
          value={formatCurrency(data.summary.totalExpense)}
          accent="text-red-600"
        />
        <StatCard
          label={tr('reports.netIncome', 'Net Income')}
          value={formatCurrency(data.summary.netIncome)}
          accent={data.summary.netIncome >= 0 ? 'text-green-600' : 'text-red-600'}
        />
        <StatCard
          label={tr('reports.incomeCount', 'Income Transactions')}
          value={formatNumber(data.summary.incomeCount)}
        />
        <StatCard
          label={tr('reports.expenseCount', 'Expense Transactions')}
          value={formatNumber(data.summary.expenseCount)}
        />
      </div>

      {/* Period */}
      {data.period && (
        <p className="mb-4 text-xs text-gray-400">
          {tr('reports.period', 'Period')}: {data.period.start} — {data.period.end}
        </p>
      )}

      {/* By category */}
      <div className="mb-6">
        <SectionTitle>{tr('reports.byCategoryType', 'By Category & Type')}</SectionTitle>
        <DataTable
          headers={[
            {
              key: 'category',
              label: tr('reports.category', 'Category'),
              format: (v: string) => formatLabel(v || '-'),
            },
            {
              key: 'type',
              label: tr('reports.type', 'Type'),
              format: (v: string) => formatLabel(v || '-'),
            },
            {
              key: 'total',
              label: tr('reports.total', 'Total'),
              format: (v: number) => formatCurrency(v),
            },
            {
              key: 'count',
              label: tr('reports.count', 'Count'),
              format: (v: number) => formatNumber(v),
            },
          ]}
          rows={data.byCategory}
        />
      </div>

      {/* Invoice stats */}
      <div>
        <SectionTitle>{tr('reports.invoiceStats', 'Invoice Statistics')}</SectionTitle>
        <DataTable
          headers={[
            {
              key: 'status',
              label: tr('reports.status', 'Status'),
              format: (v: string) => formatLabel(v || '-'),
            },
            {
              key: 'count',
              label: tr('reports.count', 'Count'),
              format: (v: number) => formatNumber(v),
            },
            {
              key: 'value',
              label: tr('reports.value', 'Value'),
              format: (v: number) => formatCurrency(v),
            },
          ]}
          rows={data.invoiceStats}
        />
      </div>
    </>
  );

  const renderReport = () => {
    if (!reportData) return <EmptyState />;
    switch (reportType) {
      case 'sales':
        return renderSalesReport(reportData as SalesReportData);
      case 'inventory':
        return renderInventoryReport(reportData as InventoryReportData);
      case 'production':
        return renderProductionReport(reportData as ProductionReportData);
      case 'customers':
        return renderCustomerReport(reportData as CustomerReportData);
      case 'financial':
        return renderFinancialReport(reportData as FinancialReportData);
    }
  };

  // ── Render ────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{tr('reports.title', 'Reports')}</h1>
          <p className="text-sm text-gray-500">
            {tr('reports.subtitle', 'Generate and view business reports')}
          </p>
        </div>
        <button
          onClick={handleFetch}
          disabled={loading}
          className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:opacity-50"
        >
          <svg
            className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
            />
          </svg>
          {tr('reports.refresh', 'Refresh')}
        </button>
      </div>

      {/* Report Type Tabs */}
      <div className="flex flex-wrap gap-2">
        {REPORT_TABS.map((rt) => (
          <button
            key={rt.key}
            onClick={() => setReportType(rt.key)}
            className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
              reportType === rt.key
                ? 'bg-primary-600 text-white shadow-sm'
                : 'border border-gray-200 bg-white text-gray-600 hover:bg-gray-50'
            }`}
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={rt.icon} />
            </svg>
            {tr(rt.labelKey, rt.fallback)}
          </button>
        ))}
      </div>

      {/* Date Filters (for reports that support them) */}
      {SUPPORTS_DATE_FILTER.includes(reportType) && (
        <div className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
          <div className="flex flex-col items-end gap-3 md:flex-row">
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-500">
                {tr('reports.startDate', 'Start Date')}
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-500">
                {tr('reports.endDate', 'End Date')}
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
            <button
              onClick={handleFetch}
              disabled={loading}
              className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary-700 disabled:opacity-50"
            >
              {tr('reports.generate', 'Generate')}
            </button>
          </div>
        </div>
      )}

      {/* Error banner (shown above stale data so user retains context) */}
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-6 py-4 text-red-700">
          <p className="font-medium">{tr('common.error', 'Error')}</p>
          <p className="text-sm">{error}</p>
          <button
            onClick={() => {
              setError(null);
              handleFetch();
            }}
            className="mt-2 text-sm text-red-600 underline"
          >
            {tr('reports.retry', 'Try Again')}
          </button>
        </div>
      )}

      {/* Report Content */}
      <div className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">
            {tr(
              REPORT_TABS.find((rt) => rt.key === reportType)?.labelKey ?? '',
              REPORT_TABS.find((rt) => rt.key === reportType)?.fallback ?? ''
            )}
          </h2>
          <div className="flex items-center gap-3">
            {reportData && !loading && (
              <button
                onClick={() => exportToCSV(reportData, `${reportType}_report.csv`)}
                className="rounded-lg border border-gray-200 bg-gray-100 px-3 py-1.5 text-xs font-medium text-gray-700 transition-colors hover:bg-gray-200"
              >
                {tr('reports.exportCsv', 'Export CSV')}
              </button>
            )}
            {generatedAt && !loading && (
              <span className="text-xs text-gray-400">
                {tr('reports.generatedAt', 'Generated at')} {generatedAt}
              </span>
            )}
          </div>
        </div>

        {loading ? <ReportSkeleton /> : renderReport()}
      </div>
    </div>
  );
};

export default ReportsPage;
