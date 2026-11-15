import type { ProductSummary } from '@/features/catalog/types/catalog';

export interface AiQuota {
  limit: number;
  used: number;
  remaining: number;
  resets_at: string;
}

export interface AssistantRecommendationItem {
  product_id: number;
  product: ProductSummary | null;
  reason: string | null;
  tradeoffs: string[];
}

export type AssistantMessageRole = 'user' | 'assistant';
export type AssistantMessageStatus = 'ok' | 'fallback';

export interface AssistantMessage {
  id: number;
  role: AssistantMessageRole;
  content: string;
  recommendations: AssistantRecommendationItem[];
  alternatives: AssistantRecommendationItem[];
  status: AssistantMessageStatus;
  created_at: string | null;
}

export interface AiConversationSummary {
  id: number;
  title: string | null;
  last_message_at: string | null;
  created_at: string | null;
  updated_at: string | null;
  messages_count?: number;
}

export interface AiConversationDetail {
  id: number;
  title: string | null;
  last_message_at: string | null;
  created_at: string | null;
  updated_at: string | null;
  messages: AssistantMessage[];
}

export interface SendMessagePayload {
  message: string;
  category?: string | null;
  budget_max?: number | string | null;
}

export interface CreateConversationPayload {
  title?: string;
}
