import { describe, expect, it } from 'vitest';
import {
  AdminPermissionSchema,
  AdminUserSchema,
  ApiErrorResponseSchema,
  HealthResponseSchema,
  LoginRequestSchema,
  LogoutResponseSchema,
  ReadinessResponseSchema,
  SessionResponseSchema,
} from './index.js';

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

  it('validates and normalizes login requests while strictly preserving password whitespace', () => {
    const rawPassword = '  exact-password-with-spaces  ';
    const parsed = LoginRequestSchema.parse({
      email: '  Admin.User@Example.COM  ',
      password: rawPassword,
    });

    expect(parsed).toEqual({
      email: 'admin.user@example.com',
      password: rawPassword,
    });
    // Explicitly assert password was NOT trimmed or altered
    expect(parsed.password).toBe(rawPassword);
  });

  it('rejects invalid email formats in login requests', () => {
    expect(() =>
      LoginRequestSchema.parse({
        email: 'invalid-email-format',
        password: 'valid-password-123',
      }),
    ).toThrow();
  });

  it('rejects invalid or too short login passwords', () => {
    expect(() =>
      LoginRequestSchema.parse({
        email: 'admin@example.com',
        password: 'short',
      }),
    ).toThrow();
  });

  it('validates admin user and session contracts', () => {
    const user = {
      id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
      email: 'owner@palnadu.dev',
      name: 'Installation Owner',
      status: 'active' as const,
      permissions: ['catalogue:read', 'pricing:manage'],
      createdAt: '2026-11-15T00:00:00.000Z',
      updatedAt: '2026-11-15T00:00:00.000Z',
    };

    expect(AdminUserSchema.parse(user)).toEqual(user);

    const session = {
      user,
      expiresAt: '2026-11-15T12:00:00.000Z',
    };

    expect(SessionResponseSchema.parse(session)).toEqual(session);
  });

  it('rejects secret fields, password hashes, and session tokens in admin and session DTOs', () => {
    const validUser = {
      id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
      email: 'owner@palnadu.dev',
      name: 'Installation Owner',
      status: 'active' as const,
      permissions: ['catalogue:read'],
      createdAt: '2026-11-15T00:00:00.000Z',
      updatedAt: '2026-11-15T00:00:00.000Z',
    };

    // AdminUserSchema must reject passwordHash or credentials
    expect(() =>
      AdminUserSchema.parse({
        ...validUser,
        passwordHash: 'scrypt-hashed-value',
      }),
    ).toThrow();

    expect(() =>
      AdminUserSchema.parse({
        ...validUser,
        password: 'plain-password',
      }),
    ).toThrow();

    // SessionResponseSchema must reject sessionToken or secrets
    expect(() =>
      SessionResponseSchema.parse({
        user: validUser,
        expiresAt: '2026-11-15T12:00:00.000Z',
        sessionToken: 'opaque-token-value',
      }),
    ).toThrow();

    expect(() =>
      SessionResponseSchema.parse({
        user: validUser,
        expiresAt: '2026-11-15T12:00:00.000Z',
        secret: 'session-secret',
      }),
    ).toThrow();
  });

  it('validates UUID and ISO datetime timestamps in AdminUserSchema', () => {
    const baseUser = {
      id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
      email: 'owner@palnadu.dev',
      name: 'Installation Owner',
      status: 'active' as const,
      permissions: ['catalogue:read'],
      createdAt: '2026-11-15T00:00:00.000Z',
      updatedAt: '2026-11-15T00:00:00.000Z',
    };

    // Rejects invalid UUID
    expect(() =>
      AdminUserSchema.parse({
        ...baseUser,
        id: 'not-a-valid-uuid',
      }),
    ).toThrow();

    // Rejects invalid createdAt datetime
    expect(() =>
      AdminUserSchema.parse({
        ...baseUser,
        createdAt: '2026-11-15', // not full ISO datetime
      }),
    ).toThrow();

    // Rejects invalid updatedAt datetime
    expect(() =>
      AdminUserSchema.parse({
        ...baseUser,
        updatedAt: 'not-a-date',
      }),
    ).toThrow();
  });

  it('permits extensible permission strings without premature enum lock while rejecting blanks and whitespace', () => {
    expect(AdminPermissionSchema.parse('catalogue:read')).toBe('catalogue:read');
    expect(AdminPermissionSchema.parse('custom:module:action')).toBe('custom:module:action');
    // Rejects blanks
    expect(() => AdminPermissionSchema.parse('')).toThrow();
    expect(() => AdminPermissionSchema.parse('   ')).toThrow();
    // Rejects whitespace padding without silently mutating valid identifiers
    expect(() => AdminPermissionSchema.parse(' catalogue:read')).toThrow();
    expect(() => AdminPermissionSchema.parse('catalogue:read ')).toThrow();
  });

  it('rejects duplicate permissions in AdminUserSchema', () => {
    const userWithDuplicates = {
      id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
      email: 'owner@palnadu.dev',
      name: 'Installation Owner',
      status: 'active' as const,
      permissions: ['catalogue:read', 'pricing:manage', 'catalogue:read'],
      createdAt: '2026-11-15T00:00:00.000Z',
      updatedAt: '2026-11-15T00:00:00.000Z',
    };

    expect(() => AdminUserSchema.parse(userWithDuplicates)).toThrow(
      'Permissions array must not contain duplicate entries',
    );
  });

  it('validates logout response', () => {
    expect(LogoutResponseSchema.parse({ success: true })).toEqual({ success: true });
    expect(() => LogoutResponseSchema.parse({ success: false })).toThrow();
  });
});
