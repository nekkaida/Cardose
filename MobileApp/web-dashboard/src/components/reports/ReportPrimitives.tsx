import React, { useState, useEffect } from 'react';

// ── Shared formatting helpers ──────────────────────────────────────

export const LOCALE_MAP: Record<string, string> = { en: 'en-US', id: 'id-ID' };

const ACRONYMS = new Set(['vip', 'sku', 'qc', 'id', 'ppn']);

export const formatLabel = (key: string): string =>
  key
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/_/g, ' ')
    .split(' ')
    .map((word) => {
      const lower = word.toLowerCase();
      if (word.length > 1 && ACRONYMS.has(lower)) return word.toUpperCase();
      return word.charAt(0).toUpperCase() + word.slice(1);
    })
    .join(' ');

export const buildPaginationLabels = (tr: (key: string, fallback: string) => string) => ({
  page: tr('reports.page', 'Page'),
  of: tr('reports.of', 'of'),
  previous: tr('reports.previous', 'Previous'),
  next: tr('reports.next', 'Next'),
  showing: tr('reports.showing', 'Showing'),
  entries: tr('reports.entries', 'entries'),
});

// ── Stateless UI components ────────────────────────────────────────

export const StatCard = ({
  label,
  value,
  accent,
  icon,
}: {
  label: string;
  value: string | number;
  accent?: string;
  icon?: React.ReactNode;
}) => (
  <div
    className="rounded-xl border border-gray-200 bg-white p-4"
    role="figure"
    aria-label={`${label}: ${value}`}
  >
    <div className="flex items-center justify-between">
      <p className="text-xs font-medium uppercase tracking-wide text-gray-500">{label}</p>
      {icon && (
        <span className="text-gray-400" aria-hidden="true">
          {icon}
        </span>
      )}
    </div>
    <p className={`mt-1 text-xl font-bold ${accent || 'text-gray-900'}`}>{value}</p>
  </div>
);

export const SectionTitle = ({ children }: { children: React.ReactNode }) => (
  <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-gray-700">{children}</h3>
);

export const EmptyState = ({ message }: { message: string }) => (
  <p className="py-6 text-center text-sm text-gray-400" role="status">
    {message}
  </p>
);

// ── Typed DataTable with pagination ────────────────────────────────

const PAGE_SIZE = 15;

export interface DataTableHeader<T> {
  key: keyof T & string;
  label: string;
  format?: (value: T[keyof T & string]) => string;
  className?: string;
}

interface DataTableProps<T extends Record<string, unknown>> {
  headers: DataTableHeader<T>[];
  rows: T[];
  emptyMessage: string;
  pageSize?: number;
  paginationLabels?: {
    page?: string;
    of?: string;
    previous?: string;
    next?: string;
    showing?: string;
    entries?: string;
  };
}

export function DataTable<T extends Record<string, unknown>>({
  headers,
  rows,
  emptyMessage,
  pageSize = PAGE_SIZE,
  paginationLabels,
}: DataTableProps<T>) {
  const [currentPage, setCurrentPage] = useState(1);

  // Reset to page 1 when the dataset changes (new fetch, different filters, etc.)
  useEffect(() => {
    setCurrentPage(1);
  }, [rows]);

  if (!rows || rows.length === 0) return <EmptyState message={emptyMessage} />;

  const totalPages = Math.ceil(rows.length / pageSize);
  const needsPagination = rows.length > pageSize;
  const startIdx = (currentPage - 1) * pageSize;
  const paginatedRows = needsPagination ? rows.slice(startIdx, startIdx + pageSize) : rows;

  const pageLabel = paginationLabels?.page ?? 'Page';
  const ofLabel = paginationLabels?.of ?? 'of';
  const prevLabel = paginationLabels?.previous ?? 'Previous';
  const nextLabel = paginationLabels?.next ?? 'Next';
  const showingLabel = paginationLabels?.showing ?? 'Showing';
  const entriesLabel = paginationLabels?.entries ?? 'entries';

  return (
    <div>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200" role="table">
          <thead className="bg-gray-50">
            <tr>
              {headers.map((h) => (
                <th
                  key={h.key}
                  scope="col"
                  className={`px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 ${h.className || ''}`}
                >
                  {h.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 bg-white">
            {paginatedRows.map((row, i) => (
              <tr key={`row-${startIdx + i}`} className="hover:bg-gray-50">
                {headers.map((h) => (
                  <td
                    key={h.key}
                    className={`whitespace-nowrap px-4 py-3 text-sm text-gray-900 ${h.className || ''}`}
                  >
                    {h.format ? h.format(row[h.key]) : String(row[h.key] ?? '-')}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {needsPagination && (
        <nav
          className="mt-3 flex items-center justify-between border-t border-gray-100 px-1 pt-3"
          aria-label="Table pagination"
        >
          <span className="text-xs text-gray-500">
            {showingLabel} {startIdx + 1}–{Math.min(startIdx + pageSize, rows.length)} {ofLabel}{' '}
            {rows.length} {entriesLabel}
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="rounded-md border border-gray-200 px-3 py-1 text-xs font-medium text-gray-600 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
              aria-label={prevLabel}
            >
              {prevLabel}
            </button>
            <span className="text-xs font-medium text-gray-700">
              {pageLabel} {currentPage} {ofLabel} {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="rounded-md border border-gray-200 px-3 py-1 text-xs font-medium text-gray-600 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
              aria-label={nextLabel}
            >
              {nextLabel}
            </button>
          </div>
        </nav>
      )}
    </div>
  );
}

// ── Skeletons ──────────────────────────────────────────────────────

export const SkeletonCard = () => (
  <div
    className="animate-pulse rounded-xl border border-gray-200 bg-white p-4"
    role="status"
    aria-label="Loading"
  >
    <div className="mb-2 h-3 w-20 rounded bg-gray-200" />
    <div className="h-6 w-28 rounded bg-gray-200" />
  </div>
);

export const SkeletonTable = () => (
  <div className="animate-pulse" role="status" aria-label="Loading table">
    <div className="mb-3 h-4 w-32 rounded bg-gray-200" />
    <div className="space-y-2">
      {[...Array(5)].map((_, i) => (
        <div key={i} className="h-10 rounded bg-gray-100" />
      ))}
    </div>
  </div>
);

export const ReportSkeleton = () => (
  <div aria-busy="true" aria-label="Loading report data">
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
