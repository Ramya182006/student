import React from 'react';

/** Full-page spinner */
export const FullPageLoader = () => (
  <div className="fixed inset-0 flex items-center justify-center bg-slate-900/60 z-50">
    <div className="flex flex-col items-center gap-3">
      <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      <p className="text-white text-sm font-medium">Loading…</p>
    </div>
  </div>
);

/** Inline spinner */
export const Spinner = ({ size = 'md', className = '' }) => {
  const sizes = { sm: 'w-4 h-4 border-2', md: 'w-8 h-8 border-3', lg: 'w-12 h-12 border-4' };
  return (
    <div
      className={`${sizes[size]} border-indigo-500 border-t-transparent rounded-full animate-spin ${className}`}
    />
  );
};

/** Skeleton shimmer block */
export const Skeleton = ({ className = '' }) => (
  <div className={`bg-slate-200 animate-pulse rounded-lg ${className}`} />
);

/** Table skeleton */
export const TableSkeleton = ({ rows = 5, cols = 5 }) => (
  <div className="space-y-2 p-4">
    <Skeleton className="h-10 w-full mb-4" />
    {Array.from({ length: rows }).map((_, i) => (
      <div key={i} className="flex gap-4">
        {Array.from({ length: cols }).map((_, j) => (
          <Skeleton key={j} className="h-8 flex-1" />
        ))}
      </div>
    ))}
  </div>
);

export default FullPageLoader;
