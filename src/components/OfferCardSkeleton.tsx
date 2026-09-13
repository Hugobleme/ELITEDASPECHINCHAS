'use client';

import React from 'react';

export default function OfferCardSkeleton() {
  return (
    <div className="flex flex-col justify-between overflow-hidden rounded-2xl border border-slate-200/70 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
      {/* Header bar skeleton */}
      <div className="flex items-center justify-between pb-3">
        <div className="skeleton-shimmer h-5 w-20 rounded-md bg-slate-200 dark:bg-slate-800" />
        <div className="skeleton-shimmer h-4 w-16 rounded-md bg-slate-200 dark:bg-slate-800" />
      </div>

      {/* Image container skeleton */}
      <div className="skeleton-shimmer aspect-[4/3] w-full rounded-xl bg-slate-200 dark:bg-slate-800" />

      {/* Title skeleton */}
      <div className="mt-4 space-y-2">
        <div className="skeleton-shimmer h-4 w-full rounded bg-slate-200 dark:bg-slate-800" />
        <div className="skeleton-shimmer h-4 w-3/4 rounded bg-slate-200 dark:bg-slate-800" />
      </div>

      {/* Price skeleton */}
      <div className="mt-4 space-y-1.5">
        <div className="skeleton-shimmer h-3.5 w-24 rounded bg-slate-200 dark:bg-slate-800" />
        <div className="skeleton-shimmer h-6 w-32 rounded bg-slate-200 dark:bg-slate-800" />
      </div>

      {/* Action buttons skeleton */}
      <div className="mt-4 grid grid-cols-2 gap-2">
        <div className="skeleton-shimmer h-9 rounded-xl bg-slate-200 dark:bg-slate-800" />
        <div className="skeleton-shimmer h-9 rounded-xl bg-slate-200 dark:bg-slate-800" />
      </div>
    </div>
  );
}
