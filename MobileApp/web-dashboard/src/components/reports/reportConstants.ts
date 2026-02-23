import type { ReportType } from '@shared/types/reports';

export const SUPPORTS_DATE_FILTER: ReportType[] = ['sales', 'production', 'financial'];

export const REPORT_TABS: Array<{
  key: ReportType;
  labelKey: string;
  fallback: string;
  icon: string;
}> = [
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

// ── Date presets ──────────────────────────────────────────────────

export interface DatePreset {
  labelKey: string;
  fallback: string;
  getRange: () => { start: string; end: string };
}

const toISO = (d: Date) => d.toISOString().split('T')[0];

export const DATE_PRESETS: DatePreset[] = [
  {
    labelKey: 'reports.preset7d',
    fallback: 'Last 7 days',
    getRange: () => {
      const end = new Date();
      const start = new Date(end);
      start.setDate(start.getDate() - 7);
      return { start: toISO(start), end: toISO(end) };
    },
  },
  {
    labelKey: 'reports.preset30d',
    fallback: 'Last 30 days',
    getRange: () => {
      const end = new Date();
      const start = new Date(end);
      start.setDate(start.getDate() - 30);
      return { start: toISO(start), end: toISO(end) };
    },
  },
  {
    labelKey: 'reports.presetThisMonth',
    fallback: 'This month',
    getRange: () => {
      const now = new Date();
      const start = new Date(now.getFullYear(), now.getMonth(), 1);
      return { start: toISO(start), end: toISO(now) };
    },
  },
  {
    labelKey: 'reports.presetLastMonth',
    fallback: 'Last month',
    getRange: () => {
      const now = new Date();
      const start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const end = new Date(now.getFullYear(), now.getMonth(), 0);
      return { start: toISO(start), end: toISO(end) };
    },
  },
  {
    labelKey: 'reports.presetThisQuarter',
    fallback: 'This quarter',
    getRange: () => {
      const now = new Date();
      const qStart = Math.floor(now.getMonth() / 3) * 3;
      const start = new Date(now.getFullYear(), qStart, 1);
      return { start: toISO(start), end: toISO(now) };
    },
  },
  {
    labelKey: 'reports.presetThisYear',
    fallback: 'This year',
    getRange: () => {
      const now = new Date();
      const start = new Date(now.getFullYear(), 0, 1);
      return { start: toISO(start), end: toISO(now) };
    },
  },
];

// ── CSV export ────────────────────────────────────────────────────

export const sanitizeCsvValue = (value: unknown): string => {
  const str = String(value ?? '');
  // Escape inner double quotes per RFC 4180
  const escaped = str.replace(/"/g, '""');
  if (/^[=+\-@\t\r]/.test(escaped)) return `\t${escaped}`;
  return escaped;
};

const SECTION_LABELS: Record<string, string> = {
  sales: 'Daily Sales',
  topCustomers: 'Top Customers',
  byCategory: 'By Category',
  lowStockItems: 'Low Stock Items',
  recentMovements: 'Recent Movements',
  ordersByStatus: 'Orders by Status',
  taskStats: 'Task Statistics',
  qualityStats: 'Quality Statistics',
  byBusinessType: 'By Business Type',
  byLoyaltyStatus: 'By Loyalty Status',
  invoiceStats: 'Invoice Statistics',
};

export const exportReportToCSV = (
  data: Record<string, unknown>,
  filename: string,
  sanitize: (v: unknown) => string = sanitizeCsvValue
) => {
  const sheets: Array<{ section: string; rows: Record<string, unknown>[] }> = [];

  // Include period as context row
  if (data.period && typeof data.period === 'object' && !Array.isArray(data.period)) {
    const period = data.period as Record<string, unknown>;
    if (period.start && period.end) {
      sheets.push({ section: 'Period', rows: [{ Start: period.start, End: period.end }] });
    }
  }

  // Include summary as key-value rows
  if (data.summary && typeof data.summary === 'object' && !Array.isArray(data.summary)) {
    const summary = data.summary as Record<string, unknown>;
    const rows = Object.entries(summary).map(([key, val]) => ({
      Metric: formatSectionKey(key),
      Value: val,
    }));
    if (rows.length > 0) {
      sheets.push({ section: 'Summary', rows });
    }
  }

  const collectRows = (obj: Record<string, unknown>) => {
    Object.entries(obj).forEach(([key, value]) => {
      if (key === 'period' || key === 'summary') return;
      if (Array.isArray(value) && value.length > 0) {
        sheets.push({
          section: SECTION_LABELS[key] || formatSectionKey(key),
          rows: value as Record<string, unknown>[],
        });
      } else if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
        const rec = value as Record<string, unknown>;
        const hasArrays = Object.values(rec).some((v) => Array.isArray(v));
        if (hasArrays) {
          collectRows(rec);
        }
      }
    });
  };

  collectRows(data);
  if (sheets.length === 0) return;

  const csvLines: string[] = [];

  sheets.forEach((sheet, idx) => {
    if (idx > 0) csvLines.push('');
    csvLines.push(`"${sanitize(sheet.section)}"`);

    const headers = Object.keys(sheet.rows[0]).filter((k) => k !== '_section');
    csvLines.push(headers.map((h) => `"${sanitize(formatSectionKey(h))}"`).join(','));
    sheet.rows.forEach((row) => {
      csvLines.push(headers.map((h) => `"${sanitize(row[h])}"`).join(','));
    });
  });

  const BOM = '\uFEFF';
  const blob = new Blob([BOM + csvLines.join('\n')], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 150);
};

function formatSectionKey(key: string): string {
  return key
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (l) => l.toUpperCase());
}
