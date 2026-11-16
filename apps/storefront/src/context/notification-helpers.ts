export type NotificationType = 'success' | 'error' | 'warning' | 'info';

export interface NotificationItem {
  id: string;
  type: NotificationType;
  message: string;
  title?: string;
  createdAt: number;
}

export interface NotifyOptions {
  type: NotificationType;
  message: string;
  title?: string;
  durationMs?: number;
}

// Error and warning notifications persist until dismissed (WCAG 2.2.1)
export const DEFAULT_DURATIONS: Readonly<Record<NotificationType, number>> = Object.freeze({
  success: 5000,
  info: 5000,
  warning: 0,
  error: 0,
});

export function addNotification(
  current: NotificationItem[],
  options: NotifyOptions,
  id: string,
): NotificationItem[] {
  const existing = current.find(
    (item) => item.type === options.type && item.message === options.message,
  );
  if (existing) {
    return current;
  }
  return [
    ...current,
    {
      id,
      type: options.type,
      message: options.message,
      title: options.title,
      createdAt: Date.now(),
    },
  ];
}

export function removeNotification(current: NotificationItem[], id: string): NotificationItem[] {
  return current.filter((item) => item.id !== id);
}
