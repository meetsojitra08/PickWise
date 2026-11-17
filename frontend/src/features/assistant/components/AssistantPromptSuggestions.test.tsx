import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router';
import { describe, expect, it, vi } from 'vitest';
import { AuthProvider } from '@/features/auth/components/AuthProvider';
import { AssistantPromptSuggestions } from './AssistantPromptSuggestions';
import { STARTER_PROMPT_SUGGESTIONS } from '../lib/assistant-prompts';

function renderWithProviders(ui: React.ReactNode) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <MemoryRouter>{ui}</MemoryRouter>
      </AuthProvider>
    </QueryClientProvider>,
  );
}

describe('AssistantPromptSuggestions', () => {
  it('renders headline, trust pills, and all starter prompt suggestions', () => {
    renderWithProviders(<AssistantPromptSuggestions onSelect={vi.fn()} />);

    expect(
      screen.getByRole('heading', {
        level: 2,
        name: 'What are you shopping for?',
      }),
    ).toBeInTheDocument();

    for (const prompt of STARTER_PROMPT_SUGGESTIONS) {
      expect(
        screen.getByRole('button', { name: new RegExp(prompt.text, 'i') }),
      ).toBeInTheDocument();
    }

    expect(screen.getByText('Real catalog products only')).toBeInTheDocument();
    expect(screen.getByText('Strict budget grounding')).toBeInTheDocument();
  });

  it('triggers onSelect when clicking a starter prompt', async () => {
    const user = userEvent.setup();
    const handleSelect = vi.fn();

    renderWithProviders(<AssistantPromptSuggestions onSelect={handleSelect} />);

    const firstPrompt = STARTER_PROMPT_SUGGESTIONS[0];
    const button = screen.getByRole('button', {
      name: new RegExp(firstPrompt.text, 'i'),
    });
    await user.click(button);

    expect(handleSelect).toHaveBeenCalledWith(firstPrompt);
  });

  it('renders quota exhausted state with catalog link and disables buttons', () => {
    renderWithProviders(
      <AssistantPromptSuggestions onSelect={vi.fn()} isQuotaExhausted={true} />,
    );

    const alert = screen.getByRole('alert');
    expect(alert).toBeInTheDocument();
    expect(screen.getByText('Daily AI limit reached')).toBeInTheDocument();
    expect(
      screen.getByText(
        /You've used today's AI answers. Your quota resets at midnight UTC./,
      ),
    ).toBeInTheDocument();

    const catalogLink = screen.getByRole('link', { name: 'Browse catalog' });
    expect(catalogLink).toBeInTheDocument();
    expect(catalogLink).toHaveAttribute('href', '/products');

    const firstPrompt = STARTER_PROMPT_SUGGESTIONS[0];
    const button = screen.getByRole('button', {
      name: new RegExp(firstPrompt.text, 'i'),
    });
    expect(button).toBeDisabled();
  });
});
