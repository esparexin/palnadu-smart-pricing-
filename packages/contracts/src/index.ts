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
