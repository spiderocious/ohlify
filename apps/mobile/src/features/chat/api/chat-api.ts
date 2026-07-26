import { apiClient } from '@shared/api/api-client';

import {
  chatMessageFromJson,
  conversationContextFromJson,
  conversationFromJson,
  type ChatMessage,
  type Conversation,
  type ConversationContext,
} from '../types/chat-models';

/** One page of a cursor-paginated list. `nextCursor` is the opaque token from
 * `meta.next_cursor` — pass it back verbatim to fetch the next page; null
 * means the list is exhausted. */
export interface Page<T> {
  items: T[];
  nextCursor: string | null;
}

function pageFromEnvelope<T>(data: unknown, itemFromJson: (json: Record<string, unknown>) => T): Page<T> {
  // Paginated endpoints reply with `{ data: [...], meta: {...} }` and the
  // api-client hands the whole envelope root to fromJson (so callers can read
  // `meta`). Mapping the root object directly would call `{}.map` → throw →
  // surface as a bogus "You're offline" error.
  const root = data as Record<string, unknown>;
  const items = Array.isArray(root.data) ? root.data : [];
  const meta = (root.meta ?? {}) as Record<string, unknown>;
  return {
    items: items.map((e) => itemFromJson(e as Record<string, unknown>)),
    nextCursor: typeof meta.next_cursor === 'string' ? meta.next_cursor : null,
  };
}

/** Mirrors mobile/lib/features/chat/chat_api.dart's ChatApiHttp. */
export const chatApi = {
  async listConversations(opts?: { cursor?: string; limit?: number }): Promise<Page<Conversation>> {
    return apiClient.get('chat/conversations', {
      queryParams: { cursor: opts?.cursor, limit: opts?.limit },
      fromJson: (data) => pageFromEnvelope(data, conversationFromJson),
    }) as Promise<Page<Conversation>>;
  },

  async openConversation(professionalId: string): Promise<string> {
    return apiClient.post('chat/conversations', { professional_id: professionalId }, {
      fromJson: (data) => (data as Record<string, unknown>).id as string,
    }) as Promise<string>;
  },

  async listMessages(conversationId: string, opts?: { cursor?: string; limit?: number }): Promise<Page<ChatMessage>> {
    return apiClient.get(`chat/conversations/${conversationId}/messages`, {
      queryParams: { cursor: opts?.cursor, limit: opts?.limit },
      fromJson: (data) => pageFromEnvelope(data, chatMessageFromJson),
    }) as Promise<Page<ChatMessage>>;
  },

  async send(conversationId: string, body: string): Promise<ChatMessage> {
    return apiClient.post(`chat/conversations/${conversationId}/messages`, { body }, {
      fromJson: (data) => chatMessageFromJson(data as Record<string, unknown>),
    }) as Promise<ChatMessage>;
  },

  async markRead(conversationId: string): Promise<void> {
    await apiClient.post(`chat/conversations/${conversationId}/read`, {}, { fromJson: () => undefined });
  },

  async context(conversationId: string): Promise<ConversationContext> {
    return apiClient.get(`chat/conversations/${conversationId}/context`, {
      fromJson: (data) => conversationContextFromJson(data as Record<string, unknown>),
    }) as Promise<ConversationContext>;
  },

  async proposeSchedule(conversationId: string, scheduledAt: Date, note?: string): Promise<ChatMessage> {
    return apiClient.post(
      `chat/conversations/${conversationId}/schedule`,
      { scheduled_at: scheduledAt.toISOString(), ...(note ? { note } : {}) },
      { fromJson: (data) => chatMessageFromJson(data as Record<string, unknown>) },
    ) as Promise<ChatMessage>;
  },

  async scheduleAction(messageId: string, action: string): Promise<ChatMessage> {
    return apiClient.post(`chat/schedules/${messageId}/action`, { action }, {
      fromJson: (data) => chatMessageFromJson(data as Record<string, unknown>),
    }) as Promise<ChatMessage>;
  },

  async reschedule(messageId: string, scheduledAt: Date): Promise<ChatMessage> {
    return apiClient.post(`chat/schedules/${messageId}/reschedule`, { scheduled_at: scheduledAt.toISOString() }, {
      fromJson: (data) => chatMessageFromJson(data as Record<string, unknown>),
    }) as Promise<ChatMessage>;
  },
};
