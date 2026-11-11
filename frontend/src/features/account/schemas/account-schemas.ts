import { z } from 'zod';

export const updateProfileSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, 'Name is required.')
    .min(2, 'Name must be at least 2 characters.')
    .max(120, 'Name must be 120 characters or fewer.'),
  email: z
    .string()
    .trim()
    .min(1, 'Email is required.')
    .pipe(
      z
        .email('Enter a valid email address.')
        .max(255, 'Email must be 255 characters or fewer.'),
    ),
});

export const updatePasswordSchema = z
  .object({
    current_password: z.string().min(1, 'Current password is required.'),
    password: z
      .string()
      .min(1, 'New password is required.')
      .min(8, 'Password must be at least 8 characters.')
      .max(255, 'Password must be 255 characters or fewer.'),
    password_confirmation: z
      .string()
      .min(1, 'Please confirm your new password.'),
  })
  .refine((values) => values.password === values.password_confirmation, {
    message: 'Passwords do not match.',
    path: ['password_confirmation'],
  })
  .refine(
    (values) =>
      !values.current_password || values.password !== values.current_password,
    {
      message: 'New password must be different from your current password.',
      path: ['password'],
    },
  );

export const preferencesFormSchema = z.object({
  budget_default: z
    .string()
    .trim()
    .refine(
      (value) => {
        if (value === '') {
          return true;
        }

        const parsed = Number(value);
        return Number.isFinite(parsed) && parsed >= 0;
      },
      { message: 'Default budget must be 0 or more.' },
    )
    .refine(
      (value) => {
        if (value === '') {
          return true;
        }

        const parsed = Number(value);
        return !Number.isFinite(parsed) || parsed <= 100_000_000;
      },
      { message: 'Default budget must be ₹10,00,00,000 or less.' },
    ),
  favourite_categories: z.array(z.string()).max(20),
  priorities: z
    .array(
      z
        .string()
        .trim()
        .min(2, 'Each priority must be at least 2 characters.')
        .max(50, 'Each priority must be 50 characters or fewer.'),
    )
    .max(5, 'Choose up to 5 priorities.'),
});

export type UpdateProfileFormValues = z.infer<typeof updateProfileSchema>;
export type UpdatePasswordFormValues = z.infer<typeof updatePasswordSchema>;
export type PreferencesFormValues = z.infer<typeof preferencesFormSchema>;
