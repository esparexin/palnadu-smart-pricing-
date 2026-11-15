'use client';

import React from 'react';
import { useNotification, type NotificationType } from '../context/notification-context';

const COLOR_MAP: Record<
  NotificationType,
  { bg: string; border: string; text: string; icon: string }
> = {
  success: {
    bg: 'bg-emerald-50',
    border: 'border-emerald-500',
    text: 'text-emerald-900',
    icon: 'text-emerald-600',
  },
  error: {
    bg: 'bg-red-50',
    border: 'border-red-500',
    text: 'text-red-900',
    icon: 'text-red-600',
  },
  warning: {
    bg: 'bg-amber-50',
    border: 'border-amber-500',
    text: 'text-amber-900',
    icon: 'text-amber-600',
  },
  info: {
    bg: 'bg-sky-50',
    border: 'border-sky-500',
    text: 'text-sky-900',
    icon: 'text-sky-600',
  },
};

export function NotificationBanner() {
  const { notifications, dismiss } = useNotification();

  if (notifications.length === 0) {
    return null;
  }

  return (
    <div aria-label="Application notifications" className="mb-6 w-full space-y-2">
      {notifications.map((item) => {
        const style = COLOR_MAP[item.type];
        const isUrgent = item.type === 'error' || item.type === 'warning';

        return (
          <div
            key={item.id}
            role={isUrgent ? 'alert' : 'status'}
            aria-live={isUrgent ? 'assertive' : 'polite'}
            className={`flex items-start justify-between gap-3 rounded-lg border-l-4 p-4 shadow-sm ${style.bg} ${style.border} ${style.text}`}
          >
            <div className="flex-1">
              {item.title && <p className="font-semibold text-sm leading-5">{item.title}</p>}
              <p className="text-sm leading-5">{item.message}</p>
            </div>
            <button
              type="button"
              onClick={() => dismiss(item.id)}
              className="touch-target inline-flex items-center justify-center rounded p-1 text-slate-500 hover:text-slate-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
              aria-label="Dismiss notification"
            >
              <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                <path
                  fillRule="evenodd"
                  d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                  clipRule="evenodd"
                />
              </svg>
            </button>
          </div>
        );
      })}
    </div>
  );
}
