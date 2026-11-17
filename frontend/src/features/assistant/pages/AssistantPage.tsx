import { useCallback, useEffect, useRef, useState } from 'react';
import { History, Sparkles } from 'lucide-react';
import { useSearchParams } from 'react-router';
import { QuotaMeter } from '@/components/shared/QuotaMeter';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { useAuth } from '@/features/auth/hooks/use-auth';
import {
  useAiQuota,
  useConversation,
  useConversations,
  useCreateConversation,
  useDeleteConversation,
  useSendMessage,
} from '../hooks/use-assistant';
import type { SendMessagePayload } from '../types/assistant';
import { AssistantConversationList } from '../components/AssistantConversationList';
import { AssistantInputForm } from '../components/AssistantInputForm';
import type { PromptSuggestion } from '../lib/assistant-prompts';
import { AssistantThread } from '../components/AssistantThread';

export function AssistantPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const conversationParam =
    searchParams.get('conversation') ||
    searchParams.get('conversation_id') ||
    searchParams.get('c');
  const promptParam = searchParams.get('q') || searchParams.get('prompt') || '';
  const categoryParam = searchParams.get('category') || '';
  const budgetParam =
    searchParams.get('budget_max') || searchParams.get('budget') || '';
  const initialPromptProcessedRef = useRef(false);

  function parseConversationId(val: string | null): number | null {
    if (!val) return null;
    const parsed = Number(val);
    return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
  }

  const initialConversationId = parseConversationId(conversationParam);

  const [activeConversationId, setActiveConversationId] = useState<
    number | null
  >(() => initialConversationId);
  const lastConversationParamRef = useRef<string | null>(conversationParam);
  const [lastFailedPayload, setLastFailedPayload] =
    useState<SendMessagePayload | null>(null);
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);

  const { user } = useAuth();

  // Preserve initial URL parameters before search params are cleared
  const [initialPromptText] = useState(() => promptParam);
  const [initialCategoryVal] = useState(() => categoryParam);
  const [initialBudgetVal] = useState(() => {
    const p = budgetParam.trim();
    return p !== '' && !Number.isNaN(Number(p)) ? Number(p) : undefined;
  });

  const userCategoryPreference =
    user?.preferences?.favourite_categories &&
    user.preferences.favourite_categories.length > 0
      ? user.preferences.favourite_categories[0]
      : '';

  const userBudgetPreference =
    user?.preferences?.budget_default && user.preferences.budget_default > 0
      ? user.preferences.budget_default
      : undefined;

  const resolvedCategory =
    initialCategoryVal.trim() !== ''
      ? initialCategoryVal.trim()
      : userCategoryPreference;

  const resolvedBudget =
    initialBudgetVal !== undefined ? initialBudgetVal : userBudgetPreference;

  const isUsingSavedPreferences =
    (initialCategoryVal.trim() === '' && Boolean(userCategoryPreference)) ||
    (initialBudgetVal === undefined && userBudgetPreference !== undefined);

  const { data: quota, isLoading: isQuotaLoading } = useAiQuota();
  const {
    data: conversationsResponse,
    isLoading: isConversationsLoading,
    isError: isConversationsError,
    refetch: refetchConversations,
  } = useConversations();
  const conversations = conversationsResponse?.data ?? [];

  const {
    data: activeConversation,
    isLoading: isConversationLoading,
    isError: isConversationError,
    refetch: refetchConversation,
  } = useConversation(activeConversationId);

  useEffect(() => {
    if (conversationParam !== lastConversationParamRef.current) {
      lastConversationParamRef.current = conversationParam;
      const parsed = parseConversationId(conversationParam);
      setActiveConversationId(parsed);
      setLastFailedPayload(null);
    }
  }, [conversationParam]);

  // When conversation error occurs, keep the ID active so AssistantThread can display
  // the ErrorState with retry and start new chat options.

  const createConversationMutation = useCreateConversation();
  const deleteConversationMutation = useDeleteConversation();
  const sendMessageMutation = useSendMessage();

  const isSending =
    sendMessageMutation.isPending || createConversationMutation.isPending;
  const isQuotaExhausted = quota ? quota.remaining <= 0 : false;

  const handleSendMessage = useCallback(
    async (payload: SendMessagePayload) => {
      setLastFailedPayload(null);
      try {
        let conversationId = activeConversationId;

        // If no conversation is active, create one first using a summary title from the message
        if (conversationId === null) {
          const generatedTitle =
            payload.message.length > 40
              ? `${payload.message.slice(0, 37)}...`
              : payload.message;
          const newConv = await createConversationMutation.mutateAsync({
            title: generatedTitle,
          });
          conversationId = newConv.id;
          setActiveConversationId(newConv.id);
        }

        await sendMessageMutation.mutateAsync({
          conversationId,
          payload,
        });
      } catch {
        setLastFailedPayload(payload);
      }
    },
    [activeConversationId, createConversationMutation, sendMessageMutation],
  );

  const handlePromptSelect = useCallback(
    (suggestion: PromptSuggestion) => {
      void handleSendMessage({
        message: suggestion.text,
        category: suggestion.category ?? null,
        budget_max: suggestion.budget ?? null,
      });
    },
    [handleSendMessage],
  );

  useEffect(() => {
    if (initialPromptProcessedRef.current) return;
    const trimmedPrompt = initialPromptText.trim();
    if (trimmedPrompt.length < 2) return;

    // Wait until quota check resolves before deciding whether to auto-send
    if (isQuotaLoading) return;

    if (promptParam || categoryParam || budgetParam) {
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          next.delete('q');
          next.delete('prompt');
          next.delete('category');
          next.delete('budget_max');
          next.delete('budget');
          return next;
        },
        { replace: true },
      );
    }

    if (quota && quota.remaining <= 0) {
      return;
    }

    initialPromptProcessedRef.current = true;

    queueMicrotask(() => {
      void handleSendMessage({
        message: trimmedPrompt,
        category:
          resolvedCategory.trim() !== '' ? resolvedCategory.trim() : null,
        budget_max: resolvedBudget ?? null,
      });
    });
  }, [
    initialPromptText,
    resolvedCategory,
    resolvedBudget,
    promptParam,
    categoryParam,
    budgetParam,
    quota,
    isQuotaLoading,
    handleSendMessage,
    setSearchParams,
  ]);

  const handleNewConversation = useCallback(() => {
    setActiveConversationId(null);
    setLastFailedPayload(null);
    setMobileDrawerOpen(false);
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        next.delete('conversation');
        next.delete('conversation_id');
        next.delete('c');
        return next;
      },
      { replace: true },
    );
  }, [setSearchParams]);

  const handleDeleteConversation = useCallback(
    async (id: number) => {
      await deleteConversationMutation.mutateAsync(id);
      if (activeConversationId === id) {
        setActiveConversationId(null);
      }
    },
    [activeConversationId, deleteConversationMutation],
  );

  const handleSelectConversation = useCallback((id: number) => {
    setActiveConversationId(id);
    setLastFailedPayload(null);
    setMobileDrawerOpen(false);
  }, []);

  return (
    <div className="flex h-full w-full flex-col overflow-hidden bg-background">
      {/* Top Bar with Assistant Brand & Quota */}
      <header className="flex h-14 shrink-0 items-center justify-between border-b border-border/80 bg-card px-4 sm:px-6">
        <div className="flex items-center gap-3">
          <div className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-2xs">
            <Sparkles className="size-4" />
          </div>
          <div>
            <h1 className="font-heading text-sm font-bold tracking-tight text-foreground sm:text-base">
              Shopping Assistant
            </h1>
            <p className="hidden text-[11px] text-muted-foreground sm:block">
              Personalized recommendations grounded in real catalog products and
              verified specs
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Mobile conversation history button */}
          <Sheet open={mobileDrawerOpen} onOpenChange={setMobileDrawerOpen}>
            <SheetTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="h-8 gap-1.5 rounded-full text-xs md:hidden"
              >
                <History className="size-3.5" />
                <span>History</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-80 p-4">
              <SheetHeader className="text-left pb-3">
                <SheetTitle className="font-heading text-base font-bold">
                  Conversations
                </SheetTitle>
              </SheetHeader>
              <AssistantConversationList
                conversations={conversations}
                activeConversationId={activeConversationId}
                onSelectConversation={handleSelectConversation}
                onNewConversation={handleNewConversation}
                onDeleteConversation={handleDeleteConversation}
                isLoading={isConversationsLoading}
                isError={isConversationsError}
                onRetry={() => void refetchConversations()}
              />
            </SheetContent>
          </Sheet>

          <QuotaMeter quota={quota} isLoading={isQuotaLoading} />
        </div>
      </header>

      {/* Main Two-Pane Workspace */}
      <div className="flex flex-1 overflow-hidden">
        {/* Desktop Sidebar: Chat History */}
        <div className="hidden w-72 shrink-0 border-r border-border/80 bg-card/60 p-3.5 md:flex md:flex-col overflow-hidden">
          <AssistantConversationList
            conversations={conversations}
            activeConversationId={activeConversationId}
            onSelectConversation={handleSelectConversation}
            onNewConversation={handleNewConversation}
            onDeleteConversation={handleDeleteConversation}
            isLoading={isConversationsLoading}
            isError={isConversationsError}
            onRetry={() => void refetchConversations()}
          />
        </div>

        {/* Right Main Column: Thread + Floating/Docked Input Bar */}
        <div className="flex flex-1 flex-col overflow-hidden bg-background">
          <AssistantThread
            messages={activeConversation?.messages ?? []}
            isLoadingConversation={isConversationLoading}
            isConversationError={isConversationError}
            onRetryConversation={() => void refetchConversation()}
            onNewChat={handleNewConversation}
            isSendingMessage={isSending}
            sendError={
              sendMessageMutation.error ??
              createConversationMutation.error ??
              null
            }
            onRetry={
              lastFailedPayload
                ? () => void handleSendMessage(lastFailedPayload)
                : undefined
            }
            onSelectPrompt={handlePromptSelect}
            isQuotaExhausted={isQuotaExhausted}
            className="flex-1"
          />

          {/* Bottom Docked Input Form */}
          <div className="shrink-0 border-t border-border/70 bg-card/80 backdrop-blur-md px-4 py-3 sm:px-6">
            <div className="mx-auto w-full max-w-4xl">
              <AssistantInputForm
                onSubmit={(payload) => void handleSendMessage(payload)}
                isPending={isSending}
                isQuotaExhausted={isQuotaExhausted}
                initialPrompt={
                  quota && quota.remaining <= 0 ? initialPromptText : ''
                }
                initialCategory={resolvedCategory}
                initialBudget={resolvedBudget}
                hasPreferencesApplied={isUsingSavedPreferences}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
