import React from 'react';

export const SkeletonStatCard: React.FC = () => (
  <div className="animate-pulse rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
    <div className="mb-3 h-3 w-20 rounded bg-gray-200" />
    <div className="mb-2 h-7 w-16 rounded bg-gray-200" />
  </div>
);

export const SkeletonColumn: React.FC = () => (
  <div className="animate-pulse rounded-xl border border-gray-100 bg-white shadow-sm">
    <div className="border-b border-gray-100 p-4">
      <div className="mb-2 h-4 w-24 rounded bg-gray-200" />
      <div className="h-3 w-16 rounded bg-gray-200" />
    </div>
    <div className="space-y-3 p-4">
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="rounded-lg border border-gray-200 bg-gray-50 p-3">
          <div className="mb-2 flex justify-between">
            <div className="h-3 w-20 rounded bg-gray-200" />
            <div className="h-4 w-14 rounded-full bg-gray-200" />
          </div>
          <div className="mb-2 h-3 w-28 rounded bg-gray-200" />
          <div className="flex justify-between">
            <div className="h-3 w-16 rounded bg-gray-200" />
            <div className="h-3 w-20 rounded bg-gray-200" />
          </div>
        </div>
      ))}
    </div>
  </div>
);
