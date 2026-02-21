import React from 'react';

export const SkeletonRow: React.FC<{ columns: number }> = ({ columns }) => (
  <tr className="animate-pulse">
    {Array.from({ length: columns }).map((_, i) => (
      <td key={i} className="px-6 py-4">
        <div className="h-4 w-3/4 rounded bg-gray-200"></div>
      </td>
    ))}
  </tr>
);

export const SortIcon: React.FC<{
  column: string;
  sortBy: string;
  sortOrder: 'asc' | 'desc';
}> = ({ column, sortBy, sortOrder }) => {
  if (sortBy !== column) return <span className="ml-1 text-gray-300">&#8645;</span>;
  return <span className="ml-1 text-primary-600">{sortOrder === 'asc' ? '\u2191' : '\u2193'}</span>;
};

export const Pagination: React.FC<{
  page: number;
  totalPages: number;
  total: number;
  label: string;
  onPrev: () => void;
  onNext: () => void;
  prevText?: string;
  nextText?: string;
}> = ({
  page,
  totalPages,
  total,
  label,
  onPrev,
  onNext,
  prevText = 'Previous',
  nextText = 'Next',
}) => (
  <div className="flex items-center justify-between border-t bg-gray-50 px-6 py-3">
    <span className="text-sm text-gray-600">
      Page {page} of {totalPages} ({total} {label})
    </span>
    <div className="space-x-2">
      <button
        disabled={page <= 1}
        onClick={onPrev}
        className="rounded-lg border px-3 py-1.5 text-sm transition-colors hover:bg-gray-100 disabled:opacity-40"
      >
        {prevText}
      </button>
      <button
        disabled={page >= totalPages}
        onClick={onNext}
        className="rounded-lg border px-3 py-1.5 text-sm transition-colors hover:bg-gray-100 disabled:opacity-40"
      >
        {nextText}
      </button>
    </div>
  </div>
);
