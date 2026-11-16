import { z } from 'zod';

export const HealthResponseSchema = z
  .object({
    status: z.literal('ok'),
  })
  .strict();

export const ReadinessResponseSchema = z
  .object({
    status: z.literal('ready'),
  })
  .strict();

export const ApiErrorResponseSchema = z
  .object({
    error: z
      .object({
        code: z.string().min(1),
        message: z.string().min(1),
        requestId: z.string().min(1),
      })
      .strict(),
  })
  .strict();

export type HealthResponse = z.infer<typeof HealthResponseSchema>;
export type ReadinessResponse = z.infer<typeof ReadinessResponseSchema>;
export type ApiErrorResponse = z.infer<typeof ApiErrorResponseSchema>;

export const AdminPermissionSchema = z
  .string()
  .min(1)
  .max(100)
  .refine((val) => val.trim().length > 0 && val === val.trim(), {
    message: 'Permission identifier must not be blank or contain surrounding whitespace',
  });

export const AdminUserStatusSchema = z.enum(['active', 'suspended']);

export const AdminUserSchema = z
  .object({
    id: z.string().uuid(),
    email: z.string().trim().email().toLowerCase(),
    name: z.string().trim().min(1),
    status: AdminUserStatusSchema,
    permissions: z
      .array(AdminPermissionSchema)
      .refine((items) => new Set(items).size === items.length, {
        message: 'Permissions array must not contain duplicate entries',
      }),
    createdAt: z.string().datetime(),
    updatedAt: z.string().datetime(),
  })
  .strict();

export const LoginRequestSchema = z
  .object({
    email: z.string().trim().email().toLowerCase(),
    password: z.string().min(8).max(128),
  })
  .strict();

export const SessionResponseSchema = z
  .object({
    user: AdminUserSchema,
    expiresAt: z.string().datetime(),
  })
  .strict();

export const LogoutResponseSchema = z
  .object({
    success: z.literal(true),
  })
  .strict();

export type AdminPermission = z.infer<typeof AdminPermissionSchema>;
export type AdminUserStatus = z.infer<typeof AdminUserStatusSchema>;
export type AdminUser = z.infer<typeof AdminUserSchema>;
export type LoginRequest = z.infer<typeof LoginRequestSchema>;
export type SessionResponse = z.infer<typeof SessionResponseSchema>;
export type LogoutResponse = z.infer<typeof LogoutResponseSchema>;

export * from './pricing.js';
export * from './catalogue.js';
export * from './catalogue-admin.js';
export * from './quotations.js';
