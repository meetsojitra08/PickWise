import { apiClient } from '@/lib/api-client';
import type { ApiPaginatedResponse, ApiSuccessResponse } from '@/types/api';
import { getAssistantHeaders } from '../lib/assistant-session';
import type {
  AiConversationDetail,
  AiConversationSummary,
  AiQuota,
  AssistantMessage,
  CreateConversationPayload,
  SendMessagePayload,
} from '../types/assistant';

export async function getAiQuota(signal?: AbortSignal): Promise<AiQuota> {
  const response = await apiClient.get<ApiSuccessResponse<AiQuota>>(
    '/assistant/quota',
    {
      headers: getAssistantHeaders(),
      signal,
    },
  );

  return response.data;
}

export async function getConversations(
  params?: { page?: number; per_page?: number },
  signal?: AbortSignal,
): Promise<ApiPaginatedResponse<AiConversationSummary>> {
  return apiClient.get<ApiPaginatedResponse<AiConversationSummary>>(
    '/assistant/conversations',
    {
      params: {
        page: params?.page ?? 1,
        per_page: params?.per_page ?? 20,
      },
      headers: getAssistantHeaders(),
      signal,
    },
  );
}

export async function getConversation(
  id: number,
  signal?: AbortSignal,
): Promise<AiConversationDetail> {
  const response = await apiClient.get<
    ApiSuccessResponse<AiConversationDetail>
  >(`/assistant/conversations/${id}`, {
    headers: getAssistantHeaders(),
    signal,
  });

  return response.data;
}

export async function createConversation(
  payload?: CreateConversationPayload,
  signal?: AbortSignal,
): Promise<AiConversationDetail> {
  const response = await apiClient.post<
    ApiSuccessResponse<AiConversationDetail>
  >('/assistant/conversations', payload ?? {}, {
    headers: getAssistantHeaders(),
    signal,
  });

  return response.data;
}

export async function deleteConversation(
  id: number,
  signal?: AbortSignal,
): Promise<void> {
  await apiClient.delete<void>(`/assistant/conversations/${id}`, {
    headers: getAssistantHeaders(),
    signal,
  });
}

export async function sendAssistantMessage(
  conversationId: number,
  payload: SendMessagePayload,
  signal?: AbortSignal,
): Promise<AssistantMessage> {
  const cleanPayload = {
    message: payload.message,
    ...(payload.category ? { category: payload.category } : {}),
    ...(payload.budget_max !== undefined &&
    payload.budget_max !== null &&
    payload.budget_max !== ''
      ? { budget_max: payload.budget_max }
      : {}),
  };

  const response = await apiClient.post<ApiSuccessResponse<AssistantMessage>>(
    `/assistant/conversations/${conversationId}/messages`,
    cleanPayload,
    {
      headers: getAssistantHeaders(),
      signal,
    },
  );

  return response.data;
}
