import { Repeat, Show } from 'meemaw';
import { useNavigate } from 'react-router-dom';

import { ROUTES } from '@ohlify/core';
import { AppLoader, AppText } from '@ohlify/ui';
import type { Conversation } from '@ohlify/api';

import { useConversations } from '../api/use-conversations.js';

/** The Chats tab — a list of the user's conversations. */
export function ChatsScreen() {
  const navigate = useNavigate();
  const { data: conversations, isLoading } = useConversations();

  const open = (c: Conversation) => {
    navigate(ROUTES.CHAT_THREAD.build({ id: c.id }));
  };

  return (
    <div className="mx-auto w-full max-w-2xl px-4 pt-4">
      <AppText variant="header" weight={700} align="start" color="var(--ohl-text-jet)">
        Chats
      </AppText>

      <Show when={isLoading}>
        <div className="flex justify-center py-16">
          <AppLoader />
        </div>
      </Show>

      <Show when={!isLoading && (conversations?.length ?? 0) === 0}>
        <div className="py-16 text-center">
          <AppText variant="body" align="center" color="var(--ohl-text-muted)">
            No conversations yet. Buy minutes with a professional to start chatting.
          </AppText>
        </div>
      </Show>

      <div className="mt-3 flex flex-col">
        <Repeat each={conversations ?? []}>
          {(c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => open(c)}
              className="flex items-center gap-3 border-b border-border px-1 py-3.5 text-left transition hover:bg-black/[0.02]"
            >
              <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full bg-surface-light">
                <AppText variant="body" weight={700} align="center" color="var(--ohl-text-jet)">
                  {(c.peer_name ?? '?').charAt(0).toUpperCase()}
                </AppText>
              </div>
              <div className="min-w-0 flex-1">
                <AppText variant="body" weight={600} align="start" color="var(--ohl-text-jet)">
                  {c.peer_name ?? 'Professional'}
                </AppText>
                <span className="block truncate">
                  <AppText variant="bodySmall" align="start" color="var(--ohl-text-muted)">
                    {c.last_message_preview ?? 'Say hello'}
                  </AppText>
                </span>
              </div>
              <Show when={c.unread_count > 0}>
                <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1.5">
                  <AppText variant="bodySmall" weight={700} align="center" color="#fff">
                    {String(c.unread_count)}
                  </AppText>
                </span>
              </Show>
            </button>
          )}
        </Repeat>
      </div>
    </div>
  );
}
