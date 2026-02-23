export const formatCurrency = (amount: number, locale?: string): string => {
  return new Intl.NumberFormat(locale || 'id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
  }).format(amount || 0);
};

const SHORT_CURRENCY_LABELS: Record<string, { b: string; m: string; k: string }> = {
  id: { b: 'M', m: 'Jt', k: 'Rb' },
  en: { b: 'B', m: 'M', k: 'K' },
};

export const formatShortCurrency = (amount: number, lang?: string): string => {
  const labels = SHORT_CURRENCY_LABELS[lang || 'id'] || SHORT_CURRENCY_LABELS.id;
  const sign = amount < 0 ? '-' : '';
  const abs = Math.abs(amount);
  if (abs >= 1_000_000_000) return `${sign}Rp ${(abs / 1_000_000_000).toFixed(1)} ${labels.b}`;
  if (abs >= 1_000_000) return `${sign}Rp ${(abs / 1_000_000).toFixed(0)} ${labels.m}`;
  if (abs >= 1_000) return `${sign}Rp ${(abs / 1_000).toFixed(0)} ${labels.k}`;
  return `${sign}Rp ${abs}`;
};

export const formatDate = (dateString: string): string => {
  if (!dateString) return '-';
  // Date-only strings ("2025-02-01") are parsed as UTC by spec.
  // Append T00:00:00 so the Date constructor treats them as local time,
  // preventing off-by-one display errors in UTC+ timezones (e.g. Indonesia).
  const d = dateString.length === 10 ? new Date(dateString + 'T00:00:00') : new Date(dateString);
  if (isNaN(d.getTime())) return '-';
  return d.toLocaleDateString('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
};

export const formatNumber = (num: number): string => {
  return new Intl.NumberFormat('id-ID').format(num || 0);
};

// Fields to exclude from CSV exports for security/cleanliness
const CSV_EXCLUDED_FIELDS = new Set([
  'created_by',
  'updated_by',
  'password',
  'token',
  'secret',
  'items',
  'order_id',
  'customer_id',
]);

function escapeCSVValue(value: unknown): string {
  if (value === null || value === undefined) return '""';
  let str = String(value);
  // Prevent CSV formula injection (DDE attacks in Excel/Sheets/LibreOffice)
  // Covers: = + - @ (standard), \t \r \n (row injection), ; | \ (EU locale / pipe)
  if (/^[=+\-@\t\r\n;|\\]/.test(str)) {
    str = "'" + str;
  }
  // Neutralize embedded newlines that could break CSV row boundaries
  str = str.replace(/[\r\n]/g, ' ');
  // Escape double quotes by doubling them, then wrap in quotes
  return `"${str.replace(/"/g, '""')}"`;
}

export const exportToCSV = (
  data: Record<string, unknown>[] | object[],
  filename: string,
  excludeFields?: Set<string>
): void => {
  if (!data || data.length === 0) return;

  const excluded = excludeFields || CSV_EXCLUDED_FIELDS;
  const allKeys = Object.keys(data[0] as Record<string, unknown>);
  const keys = allKeys.filter((k) => !excluded.has(k));

  const headers = keys.map(escapeCSVValue).join(',');
  const rows = data.map((row) => {
    const record = row as Record<string, unknown>;
    return keys.map((k) => escapeCSVValue(record[k])).join(',');
  });

  const bom = '\uFEFF'; // UTF-8 BOM for Excel compatibility
  const csv = bom + [headers, ...rows].join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  // Delay revocation so the browser can finish reading the blob
  setTimeout(() => URL.revokeObjectURL(url), 1500);
};
