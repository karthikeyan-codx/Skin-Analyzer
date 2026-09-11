import React from 'react';

export default function SkeletonResult() {
  return (
    <div className="w-full space-y-8 animate-pulse">
      {/* Top Prediction Card Skeleton */}
      <div className="glass-panel rounded-2xl p-6 sm:p-8 space-y-6">
        <div className="flex items-center justify-between">
          <div className="h-5 w-36 rounded-md skeleton-shimmer" />
          <div className="h-5 w-24 rounded-full skeleton-shimmer" />
        </div>

        <div className="space-y-3">
          <div className="h-4 w-28 rounded skeleton-shimmer" />
          <div className="h-10 w-3/4 max-w-md rounded-lg skeleton-shimmer" />
        </div>

        {/* Confidence Skeleton */}
        <div className="space-y-2 pt-2">
          <div className="flex justify-between items-center">
            <div className="h-4 w-20 rounded skeleton-shimmer" />
            <div className="h-8 w-24 rounded skeleton-shimmer" />
          </div>
          <div className="h-3 w-full rounded-full skeleton-shimmer" />
        </div>
      </div>

      {/* Grad-CAM Viewer Skeleton */}
      <div className="glass-panel rounded-2xl p-6 sm:p-8 space-y-6">
        <div className="space-y-2">
          <div className="h-6 w-56 rounded-md skeleton-shimmer" />
          <div className="h-4 w-96 max-w-full rounded skeleton-shimmer" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="h-72 w-full rounded-xl skeleton-shimmer" />
          <div className="h-72 w-full rounded-xl skeleton-shimmer" />
        </div>
      </div>
    </div>
  );
}
