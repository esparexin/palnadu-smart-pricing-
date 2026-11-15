import React from 'react';

export interface LoadingStateProps {
  label?: string;
  description?: string;
}

export function LoadingState({ label = 'Loading...', description }: LoadingStateProps) {
  return (
    <div
      role="status"
      aria-live="polite"
      className="flex min-h-[200px] flex-col items-center justify-center p-8 text-center"
    >
      <div
        className="h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-emerald-600"
        aria-hidden="true"
      />
      <span className="mt-3 font-medium text-sm text-slate-700">{label}</span>
      {description && <p className="mt-1 text-xs text-slate-500">{description}</p>}
      <span className="sr-only">{label}</span>
    </div>
  );
}
