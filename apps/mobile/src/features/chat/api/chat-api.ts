import { apiClient } from '@shared/api/api-client';

import {
  chatMessageFromJson,
  conversationContextFromJson,
  conversationFromJson,
  type ChatMessage,
  type Conversation,
  type ConversationContext,
} from '../types/chat-models';

/** Mirrors mobile/lib/features/chat/chat_api.dart's ChatApiHttp. */
export const chatApi = {
  async listConversations(): Promise<Conversation[]> {
    return apiClient.get('chat/conversations', {
      fromJson: (data) => (data as unknown[]).map((e) => conversationFromJson(e as Record<string, unknown>)),
    }) as Promise<Conversation[]>;
  },

  async openConversation(professionalId: string): Promise<string> {
    return apiClient.post('chat/conversations', { professional_id: professionalId }, {
      fromJson: (data) => (data as Record<string, unknown>).id as string,
    }) as Promise<string>;
  },

  async listMessages(conversationId: string): Promise<ChatMessage[]> {
    return apiClient.get(`chat/conversations/${conversationId}/messages`, {
      fromJson: (data) => (data as unknown[]).map((e) => chatMessageFromJson(e as Record<string, unknown>)),
    }) as Promise<ChatMessage[]>;
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
