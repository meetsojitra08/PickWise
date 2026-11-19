import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { describe, expect, it, vi } from 'vitest';
import { ErrorState } from './ErrorState';

describe('ErrorState', () => {
  it('renders default title, custom description, and alert role', () => {
    render(
      <ErrorState description="Failed to load requested items. Please check network." />,
    );

    const alert = screen.getByRole('alert');
    expect(alert).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { level: 2, name: 'Something went wrong' }),
    ).toBeInTheDocument();
    expect(
      screen.getByText('Failed to load requested items. Please check network.'),
    ).toBeInTheDocument();
  });

  it('triggers onRetry when retry button is clicked', async () => {
    const user = userEvent.setup();
    const handleRetry = vi.fn();

    render(
      <ErrorState
        title="Network request failed"
        description="Could not connect to the server."
        retryLabel="Retry request"
        onRetry={handleRetry}
      />,
    );

    const button = screen.getByRole('button', { name: 'Retry request' });
    await user.click(button);

    expect(handleRetry).toHaveBeenCalledTimes(1);
  });

  it('renders secondary action link and custom title', () => {
    render(
      <MemoryRouter>
        <ErrorState
          title="Conversation not found"
          description="This conversation may have been deleted."
          actionLabel="Start new chat"
          actionTo="/assistant"
        />
      </MemoryRouter>,
    );

    expect(
      screen.getByRole('heading', { level: 2, name: 'Conversation not found' }),
    ).toBeInTheDocument();
    const link = screen.getByRole('link', { name: 'Start new chat' });
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute('href', '/assistant');
  });

  it('renders inline variant with compact alert styling', async () => {
    const user = userEvent.setup();
    const handleAction = vi.fn();

    render(
      <ErrorState
        variant="inline"
        title="Inline error"
        description="Something broke here."
        actionLabel="Dismiss"
        onAction={handleAction}
      />,
    );

    expect(
      screen.getByRole('heading', { level: 3, name: 'Inline error' }),
    ).toBeInTheDocument();
    const button = screen.getByRole('button', { name: 'Dismiss' });
    await user.click(button);
    expect(handleAction).toHaveBeenCalledTimes(1);
  });
});
