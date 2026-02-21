import React from 'react';

// ---------------------------------------------------------------------------
// Brand color palette used across analytics charts
// ---------------------------------------------------------------------------

export const BRAND_COLORS = [
  '#2C5530',
  '#C4A962',
  '#4e3a21',
  '#3a7a40',
  '#a67c36',
  '#1a3a1e',
  '#d4b97a',
];

// ---------------------------------------------------------------------------
// Consistent chart tick styling
// ---------------------------------------------------------------------------

export const TICK_STYLE = { fontSize: 11 };

// ---------------------------------------------------------------------------
// Skeleton components
// ---------------------------------------------------------------------------

export const SkeletonKPICard: React.FC = () => (
  <div className="animate-pulse rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
    <div className="mb-3 h-3 w-24 rounded bg-gray-200" />
    <div className="mb-2 h-7 w-20 rounded bg-gray-200" />
    <div className="h-3 w-28 rounded bg-gray-200" />
  </div>
);

export const SkeletonChart: React.FC<{ height?: number }> = ({ height = 280 }) => (
  <div className="animate-pulse rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
    <div className="mb-6 h-4 w-48 rounded bg-gray-200" />
    <div className="rounded bg-gray-100" style={{ height }} />
  </div>
);

// ---------------------------------------------------------------------------
// Empty state
// ---------------------------------------------------------------------------

export const EmptyState: React.FC<{ message: string }> = ({ message }) => (
  <div className="flex flex-col items-center justify-center py-12 text-gray-400">
    <svg
      className="mb-2 h-10 w-10"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={1.5}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z"
      />
    </svg>
    <p className="text-sm">{message}</p>
  </div>
);

// ---------------------------------------------------------------------------
// Section error banner
// ---------------------------------------------------------------------------

export const SectionError: React.FC<{ message: string; onRetry: () => void }> = ({
  message,
  onRetry,
}) => (
  <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
    {message}
    <button onClick={onRetry} className="ml-2 underline">
      Retry
    </button>
  </div>
);
