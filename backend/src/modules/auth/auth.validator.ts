/**
 * auth.validator.ts — Zod Request Schemas
 *
 * Defines the shape and rules for every auth endpoint's request body.
 * The inferred TypeScript types (RegisterDto, LoginDto, etc.) are used
 * throughout auth.service.ts and auth.controller.ts — no duplication.
 *
 * Password policy (defined once here, enforced everywhere):
 *  - Minimum 8 characters
 *  - At least one uppercase letter
 *  - At least one lowercase letter
 *  - At least one digit
 *  - At least one special character: !@#$%^&*(),.?":{}|<>
 *
 * Usage in controller:
 *   const dto = RegisterSchema.parse(req.body);  // throws ZodError if invalid
 *
 * Usage with middleware:
 *   router.post('/register', validate(RegisterSchema), register);
 */
import { z } from 'zod';

// ------------------------------------------------------------------
// Reusable field definitions
// ------------------------------------------------------------------

const emailField = z
  .string({ error: 'Email is required' })
  .email('Invalid email address')
  .toLowerCase()
  .trim();

const passwordField = z
  .string({ error: 'Password is required' })
  .min(8, 'Password must be at least 8 characters')
  .max(128, 'Password cannot exceed 128 characters')
  .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
  .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
  .regex(/[0-9]/, 'Password must contain at least one number')
  .regex(
    /[!@#$%^&*(),.?":{}|<>]/,
    'Password must contain at least one special character',
  );

// ------------------------------------------------------------------
// Register — POST /api/v1/auth/register
// ------------------------------------------------------------------

export const RegisterSchema = z.object({
  fullName: z
    .string({ error: 'Full name is required' })
    .min(2, 'Full name must be at least 2 characters')
    .max(100, 'Full name cannot exceed 100 characters')
    .trim(),
  email:    emailField,
  password: passwordField,
});

export type RegisterDto = z.infer<typeof RegisterSchema>;

// ------------------------------------------------------------------
// Login — POST /api/v1/auth/login
// ------------------------------------------------------------------

export const LoginSchema = z.object({
  email:    emailField,
  password: z.string({ error: 'Password is required' }),
});

export type LoginDto = z.infer<typeof LoginSchema>;

// ------------------------------------------------------------------
// Refresh — POST /api/v1/auth/refresh
// ------------------------------------------------------------------

export const RefreshSchema = z.object({
  refreshToken: z.string({ error: 'Refresh token is required' }).min(1),
});

export type RefreshDto = z.infer<typeof RefreshSchema>;
