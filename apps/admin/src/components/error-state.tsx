import React from 'react';

export interface ErrorStateProps {
  title?: string;
  message: string;
  retry?: () => void;
  retryLabel?: string;
}

export function ErrorState({
  title = 'Something went wrong',
  message,
  retry,
  retryLabel = 'Try again',
}: ErrorStateProps) {
  return (
    <div
      role="alert"
      className="flex min-h-[220px] flex-col items-center justify-center rounded-lg border border-red-200 bg-red-50/50 p-8 text-center"
    >
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-100 text-red-600">
        <svg
          className="h-6 w-6"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
          />
        </svg>
      </div>
      <h3 className="mt-3 font-semibold text-red-900 text-base">{title}</h3>
      <p className="mt-1 max-w-sm text-sm text-red-700">{message}</p>
      {retry && (
        <button
          type="button"
          onClick={retry}
          className="touch-target mt-4 inline-flex items-center rounded-md border border-red-300 bg-white px-4 py-2 font-medium text-sm text-red-700 hover:bg-red-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500"
        >
          {retryLabel}
        </button>
      )}
    </div>
  );
}
