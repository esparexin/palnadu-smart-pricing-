'use client';

import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';
import {
  addNotification,
  DEFAULT_DURATIONS,
  removeNotification,
  type NotificationItem,
  type NotificationType,
  type NotifyOptions,
} from './notification-helpers';

export type { NotificationItem, NotificationType, NotifyOptions };
export { DEFAULT_DURATIONS };

export interface NotificationContextValue {
  notifications: NotificationItem[];
  notify: (options: NotifyOptions) => string;
  dismiss: (id: string) => void;
  clear: () => void;
}

const NotificationContext = createContext<NotificationContextValue | null>(null);

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);

  const dismiss = useCallback((id: string) => {
    setNotifications((prev) => removeNotification(prev, id));
  }, []);

  const clear = useCallback(() => {
    setNotifications([]);
  }, []);

  const notify = useCallback(
    (options: NotifyOptions): string => {
      const generatedId = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
      let returnedId = generatedId;

      setNotifications((prev) => {
        const existing = prev.find(
          (item) => item.type === options.type && item.message === options.message,
        );
        if (existing) {
          returnedId = existing.id;
          return prev;
        }

        const duration = options.durationMs ?? DEFAULT_DURATIONS[options.type];
        if (duration > 0) {
          setTimeout(() => {
            dismiss(generatedId);
          }, duration);
        }

        return addNotification(prev, options, generatedId);
      });

      return returnedId;
    },
    [dismiss],
  );

  const value = useMemo<NotificationContextValue>(
    () => ({
      notifications,
      notify,
      dismiss,
      clear,
    }),
    [notifications, notify, dismiss, clear],
  );

  return <NotificationContext.Provider value={value}>{children}</NotificationContext.Provider>;
}

export function useNotification(): NotificationContextValue {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotification must be used within a NotificationProvider');
  }
  return context;
}
