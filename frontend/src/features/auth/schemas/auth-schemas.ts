import { z } from 'zod';

const emailSchema = z
  .string()
  .trim()
  .min(1, 'Email is required.')
  .pipe(
    z
      .email('Enter a valid email address.')
      .max(255, 'Email must be 255 characters or fewer.'),
  );

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Password is required.'),
  remember: z.boolean(),
});

export const registerSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(1, 'Name is required.')
      .min(2, 'Name must be at least 2 characters.')
      .max(120, 'Name must be 120 characters or fewer.'),
    email: emailSchema,
    password: z
      .string()
      .min(1, 'Password is required.')
      .min(8, 'Password must be at least 8 characters.')
      .max(255, 'Password must be 255 characters or fewer.'),
    password_confirmation: z.string().min(1, 'Please confirm your password.'),
  })
  .refine((values) => values.password === values.password_confirmation, {
    message: 'Passwords do not match.',
    path: ['password_confirmation'],
  });

export type LoginFormValues = z.infer<typeof loginSchema>;
export type RegisterFormValues = z.infer<typeof registerSchema>;
