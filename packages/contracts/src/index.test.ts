import { describe, expect, it } from 'vitest';
import { ApiErrorResponseSchema, HealthResponseSchema, ReadinessResponseSchema } from './index.js';

describe('shared API contracts', () => {
  it('accepts the health and readiness responses', () => {
    expect(HealthResponseSchema.parse({ status: 'ok' })).toEqual({ status: 'ok' });
    expect(ReadinessResponseSchema.parse({ status: 'ready' })).toEqual({ status: 'ready' });
  });

  it('rejects undeclared response fields', () => {
    expect(() => HealthResponseSchema.parse({ status: 'ok', databaseUrl: 'secret' })).toThrow();
  });

  it('requires a request identifier in API errors', () => {
    expect(
      ApiErrorResponseSchema.safeParse({
        error: { code: 'NOT_FOUND', message: 'Not found' },
      }).success,
    ).toBe(false);
  });
});
