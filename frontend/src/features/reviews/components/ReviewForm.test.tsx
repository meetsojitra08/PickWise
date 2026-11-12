import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { ReviewForm } from '@/features/reviews/components/ReviewForm';
import type { ReviewPayload } from '@/features/reviews/types/reviews';
import { ApiError } from '@/lib/api-error';

async function fillValidReview(
  user: ReturnType<typeof userEvent.setup>,
): Promise<void> {
  await user.click(screen.getByRole('radio', { name: '4 stars' }));
  await user.type(screen.getByLabelText('Title'), 'Great value');
  await user.type(
    screen.getByLabelText('Review'),
    'A detailed review of this product.',
  );
}

describe('ReviewForm', () => {
  it('shows inline validation errors and keeps the character counters current', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn(async () => {});

    render(<ReviewForm onSubmit={onSubmit} />);

    expect(screen.getByText('0 / 150')).toBeInTheDocument();
    expect(screen.getByText('0 / 2000')).toBeInTheDocument();

    await user.type(screen.getByLabelText('Title'), 'Great');
    expect(screen.getByText('5 / 150')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Submit review' }));

    expect(
      await screen.findByText('Choose a rating from 1 to 5.'),
    ).toBeInTheDocument();
    expect(
      screen.getByText('Review must be at least 10 characters.'),
    ).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('submits the selected stars, trimmed title and body', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn<(payload: ReviewPayload) => Promise<void>>(
      async () => {},
    );

    render(<ReviewForm onSubmit={onSubmit} />);
    await fillValidReview(user);
    await user.click(screen.getByRole('button', { name: 'Submit review' }));

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith({
        rating: 4,
        title: 'Great value',
        body: 'A detailed review of this product.',
      });
    });
  });

  it('surfaces the duplicate-review message from the API', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn(async () => {
      throw new ApiError({
        status: 422,
        code: 'validation_failed',
        message: 'The given data was invalid.',
        details: {
          review: ['You have already reviewed this product.'],
        },
      });
    });

    render(<ReviewForm onSubmit={onSubmit} />);
    await fillValidReview(user);
    await user.click(screen.getByRole('button', { name: 'Submit review' }));

    expect(
      await screen.findByText('You have already reviewed this product.'),
    ).toBeInTheDocument();
    expect(screen.getByRole('alert')).toHaveTextContent(
      'You have already reviewed this product.',
    );
  });

  it('prefills edit mode and cancels without submitting', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn(async () => {});
    const onCancel = vi.fn();

    render(
      <ReviewForm
        mode="edit"
        initialValues={{
          rating: 3,
          title: 'Solid choice',
          body: 'It has held up well over several months.',
        }}
        onSubmit={onSubmit}
        onCancel={onCancel}
      />,
    );

    expect(screen.getByRole('radio', { name: '3 stars' })).toBeChecked();
    expect(screen.getByLabelText('Title')).toHaveValue('Solid choice');
    expect(screen.getByRole('button', { name: 'Save changes' })).toBeVisible();

    await user.click(screen.getByRole('button', { name: 'Cancel' }));

    expect(onCancel).toHaveBeenCalledOnce();
    expect(onSubmit).not.toHaveBeenCalled();
  });
});
