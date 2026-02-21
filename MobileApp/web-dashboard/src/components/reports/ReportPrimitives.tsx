import React from 'react';

// ── Shared formatting helpers ──────────────────────────────────────

export const LOCALE_MAP: Record<string, string> = { en: 'en-US', id: 'id-ID' };

export const formatLabel = (key: string): string =>
  key
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (l) => l.toUpperCase());

// ── Stateless UI components ────────────────────────────────────────

export const StatCard = ({
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

export const SectionTitle = ({ children }: { children: React.ReactNode }) => (
  <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-gray-700">{children}</h3>
);

export const EmptyState = ({ message }: { message: string }) => (
  <p className="py-6 text-center text-sm text-gray-400">{message}</p>
);

export const DataTable = ({
  headers,
  rows,
  emptyMessage,
}: {
  headers: Array<{ key: string; label: string; format?: (v: any) => string; className?: string }>;
  rows: any[];
  emptyMessage: string;
}) => {
  if (!rows || rows.length === 0) return <EmptyState message={emptyMessage} />;
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

export const SkeletonCard = () => (
  <div className="animate-pulse rounded-xl border border-gray-200 bg-white p-4">
    <div className="mb-2 h-3 w-20 rounded bg-gray-200" />
    <div className="h-6 w-28 rounded bg-gray-200" />
  </div>
);

export const SkeletonTable = () => (
  <div className="animate-pulse">
    <div className="mb-3 h-4 w-32 rounded bg-gray-200" />
    <div className="space-y-2">
      {[...Array(5)].map((_, i) => (
        <div key={i} className="h-10 rounded bg-gray-100" />
      ))}
    </div>
  </div>
);

export const ReportSkeleton = () => (
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
