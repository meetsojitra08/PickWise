import { z } from 'zod';

export const reviewFormSchema = z.object({
  rating: z
    .number()
    .int('Choose a whole star rating.')
    .min(1, 'Choose a rating from 1 to 5.')
    .max(5, 'Choose a rating from 1 to 5.'),
  title: z
    .string()
    .trim()
    .min(3, 'Title must be at least 3 characters.')
    .max(150, 'Title must be 150 characters or fewer.'),
  body: z
    .string()
    .trim()
    .min(10, 'Review must be at least 10 characters.')
    .max(2000, 'Review must be 2000 characters or fewer.'),
});

export type ReviewFormValues = z.infer<typeof reviewFormSchema>;
