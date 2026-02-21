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

export const sanitizeCsvValue = (value: unknown): string => {
  const str = String(value ?? '');
  if (/^[=+\-@\t\r]/.test(str)) return `\t${str}`;
  return str;
};

export const exportReportToCSV = (
  data: Record<string, unknown>,
  filename: string,
  sanitize: (v: unknown) => string = sanitizeCsvValue
) => {
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
  collectRows(data);
  if (rows.length === 0) return;

  const headers = Object.keys(rows[0]);
  const csvLines = [
    headers.join(','),
    ...rows.map((row) => headers.map((h) => `"${sanitize(row[h])}"`).join(',')),
  ];
  const BOM = '\uFEFF';
  const blob = new Blob([BOM + csvLines.join('\n')], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
};
