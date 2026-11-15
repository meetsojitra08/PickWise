export interface PromptSuggestion {
  text: string;
  category?: string;
  budget?: number;
}

export const STARTER_PROMPT_SUGGESTIONS: readonly PromptSuggestion[] = [
  {
    text: 'Laptop for video editing under ₹90,000',
    category: 'laptops',
    budget: 90000,
  },
  {
    text: 'Noise-cancelling wireless headphones for travel',
    category: 'headphones',
    budget: undefined,
  },
  {
    text: 'Best 4K monitor for programming under ₹40,000',
    category: 'monitors',
    budget: 40000,
  },
];

export function buildAssistantPromptUrl(suggestion: {
  text: string;
  category?: string;
  budget?: number;
}): string {
  const params = new URLSearchParams();
  params.set('q', suggestion.text);
  if (suggestion.category) {
    params.set('category', suggestion.category);
  }
  if (suggestion.budget !== undefined && suggestion.budget !== null) {
    params.set('budget_max', String(suggestion.budget));
  }
  return `/assistant?${params.toString()}`;
}
