import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  createConversation,
  deleteConversation,
  getAiQuota,
  getConversation,
  getConversations,
  sendAssistantMessage,
} from '../api/assistant-api';
import type {
  AiConversationDetail,
  AiQuota,
  AssistantMessage,
  CreateConversationPayload,
  SendMessagePayload,
} from '../types/assistant';

export const assistantKeys = {
  all: ['assistant'] as const,
  quota: () => [...assistantKeys.all, 'quota'] as const,
  conversations: () => [...assistantKeys.all, 'conversations'] as const,
  conversation: (id: number | null) =>
    [...assistantKeys.all, 'conversation', id] as const,
};

export function useAiQuota() {
  return useQuery<AiQuota>({
    queryKey: assistantKeys.quota(),
    queryFn: ({ signal }) => getAiQuota(signal),
    staleTime: 30_000,
  });
}

export function useConversations(params?: {
  page?: number;
  per_page?: number;
}) {
  return useQuery({
    queryKey: assistantKeys.conversations(),
    queryFn: ({ signal }) => getConversations(params, signal),
  });
}

export function useConversation(conversationId: number | null) {
  return useQuery<AiConversationDetail>({
    queryKey: assistantKeys.conversation(conversationId),
    queryFn: ({ signal }) => {
      if (conversationId === null) {
        throw new Error('Conversation id is required');
      }
      return getConversation(conversationId, signal);
    },
    enabled: conversationId !== null,
  });
}

export function useCreateConversation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload?: CreateConversationPayload) =>
      createConversation(payload),
    onSuccess: (newConversation) => {
      queryClient.setQueryData<AiConversationDetail>(
        assistantKeys.conversation(newConversation.id),
        newConversation,
      );
      void queryClient.invalidateQueries({
        queryKey: assistantKeys.conversations(),
      });
    },
  });
}

export function useDeleteConversation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (conversationId: number) => deleteConversation(conversationId),
    onSuccess: (_, conversationId) => {
      queryClient.removeQueries({
        queryKey: assistantKeys.conversation(conversationId),
      });
      void queryClient.invalidateQueries({
        queryKey: assistantKeys.conversations(),
      });
    },
  });
}

export interface SendMessageVariables {
  conversationId: number;
  payload: SendMessagePayload;
}

interface SendMessageContext {
  previousDetail?: AiConversationDetail;
  conversationId: number;
}

export function useSendMessage() {
  const queryClient = useQueryClient();

  return useMutation<
    AssistantMessage,
    Error,
    SendMessageVariables,
    SendMessageContext
  >({
    mutationFn: ({ conversationId, payload }: SendMessageVariables) => {
      return sendAssistantMessage(conversationId, payload);
    },
    onMutate: async ({ conversationId, payload }) => {
      await queryClient.cancelQueries({
        queryKey: assistantKeys.conversation(conversationId),
      });

      const previousDetail = queryClient.getQueryData<AiConversationDetail>(
        assistantKeys.conversation(conversationId),
      );

      if (previousDetail) {
        const optimisticUserMessage: AssistantMessage = {
          id: -Date.now(),
          role: 'user',
          content: payload.message,
          recommendations: [],
          alternatives: [],
          status: 'ok',
          created_at: new Date().toISOString(),
        };

        queryClient.setQueryData<AiConversationDetail>(
          assistantKeys.conversation(conversationId),
          {
            ...previousDetail,
            messages: [...previousDetail.messages, optimisticUserMessage],
          },
        );
      }

      return { previousDetail, conversationId };
    },
    onError: (_error, _variables, context) => {
      if (context?.previousDetail) {
        queryClient.setQueryData(
          assistantKeys.conversation(context.conversationId),
          context.previousDetail,
        );
      }
    },
    onSuccess: (reply, variables) => {
      queryClient.setQueryData<AiConversationDetail>(
        assistantKeys.conversation(variables.conversationId),
        (current) => {
          if (!current) return current;
          return {
            ...current,
            messages: [...current.messages, reply],
          };
        },
      );

      void queryClient.invalidateQueries({
        queryKey: assistantKeys.quota(),
      });
      void queryClient.invalidateQueries({
        queryKey: assistantKeys.conversations(),
      });
    },
  });
}
