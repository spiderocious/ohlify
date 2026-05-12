import { z } from 'zod';

export const AdminLoginSchema = z
  .object({
    email: z.string().email().max(254),
    password: z.string().min(1).max(200),
    totp_code: z
      .string()
      .regex(/^\d{6}$/)
      .optional(),
  })
  .strict();

export const AdminRefreshSchema = z
  .object({
    refresh_token: z.string().min(32).max(256),
  })
  .strict();

export const AdminLogoutSchema = z
  .object({
    refresh_token: z.string().min(32).max(256).optional(),
  })
  .strict();

export const AdminTotpSetupSchema = z
  .object({
    password: z.string().min(1).max(200),
  })
  .strict();

export const AdminTotpConfirmSchema = z
  .object({
    code: z.string().regex(/^\d{6}$/),
  })
  .strict();

export type AdminLoginDto = z.infer<typeof AdminLoginSchema>;
export type AdminRefreshDto = z.infer<typeof AdminRefreshSchema>;
export type AdminLogoutDto = z.infer<typeof AdminLogoutSchema>;
export type AdminTotpSetupDto = z.infer<typeof AdminTotpSetupSchema>;
export type AdminTotpConfirmDto = z.infer<typeof AdminTotpConfirmSchema>;
