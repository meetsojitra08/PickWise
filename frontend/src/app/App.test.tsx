import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it } from 'vitest';
import { App } from '@/app/App';

describe('App', () => {
  beforeEach(() => {
    document.documentElement.classList.remove('dark');
  });

  it('renders the Pickwise heading and design system card', () => {
    render(<App />);

    expect(
      screen.getByRole('heading', { level: 1, name: 'Pickwise' }),
    ).toBeInTheDocument();
    expect(screen.getByText('Design system ready')).toBeInTheDocument();
  });

  it('toggles between light and dark theme on the document root', async () => {
    const user = userEvent.setup();
    render(<App />);

    const toggleButton = screen.getByRole('button', {
      name: 'Switch to dark theme',
    });

    await user.click(toggleButton);

    expect(document.documentElement).toHaveClass('dark');
    expect(
      screen.getByRole('button', { name: 'Switch to light theme' }),
    ).toBeInTheDocument();

    await user.click(toggleButton);

    expect(document.documentElement).not.toHaveClass('dark');
    expect(
      screen.getByRole('button', { name: 'Switch to dark theme' }),
    ).toBeInTheDocument();
  });
});
