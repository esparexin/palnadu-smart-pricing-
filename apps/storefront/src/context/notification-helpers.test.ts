import { describe, expect, it } from 'vitest';
import {
  addNotification,
  DEFAULT_DURATIONS,
  removeNotification,
  type NotificationItem,
} from './notification-helpers.js';

describe('notification-helpers', () => {
  it('defines persistent durations for errors and warnings', () => {
    expect(DEFAULT_DURATIONS.error).toBe(0);
    expect(DEFAULT_DURATIONS.warning).toBe(0);
    expect(DEFAULT_DURATIONS.success).toBe(5000);
    expect(DEFAULT_DURATIONS.info).toBe(5000);
  });

  it('adds a new notification to empty list', () => {
    const initial: NotificationItem[] = [];
    const updated = addNotification(initial, { type: 'success', message: 'Item saved' }, 'id-1');

    expect(updated).toHaveLength(1);
    expect(updated[0].id).toBe('id-1');
    expect(updated[0].type).toBe('success');
    expect(updated[0].message).toBe('Item saved');
    expect(updated[0].createdAt).toBeGreaterThan(0);
  });

  it('deduplicates identical notifications with same type and message', () => {
    const initial: NotificationItem[] = [
      {
        id: 'id-1',
        type: 'error',
        message: 'Network error occurred',
        createdAt: 1000,
      },
    ];

    const updated = addNotification(
      initial,
      { type: 'error', message: 'Network error occurred' },
      'id-2',
    );

    expect(updated).toHaveLength(1);
    expect(updated[0].id).toBe('id-1');
  });

  it('allows distinct notifications with different types or messages', () => {
    const initial: NotificationItem[] = [
      {
        id: 'id-1',
        type: 'error',
        message: 'Action failed',
        createdAt: 1000,
      },
    ];

    const updated = addNotification(initial, { type: 'info', message: 'Action failed' }, 'id-2');

    expect(updated).toHaveLength(2);
    expect(updated[1].id).toBe('id-2');
  });

  it('removes notification by id', () => {
    const list: NotificationItem[] = [
      { id: 'id-1', type: 'info', message: 'First', createdAt: 100 },
      { id: 'id-2', type: 'warning', message: 'Second', createdAt: 200 },
    ];

    const remaining = removeNotification(list, 'id-1');
    expect(remaining).toHaveLength(1);
    expect(remaining[0].id).toBe('id-2');
  });
});
