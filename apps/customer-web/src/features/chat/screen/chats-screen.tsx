import { Repeat, Show } from 'meemaw';
import { useNavigate } from 'react-router-dom';

import { ROUTES } from '@ohlify/core';
import { AppButton, AppText } from '@ohlify/ui';
import type { Conversation } from '@ohlify/api';

import { useConversations } from '../api/use-conversations.js';

const SKELETON_ROWS: number[] = [0, 1, 2, 3];

/** The Chats tab — a list of the user's conversations. */
export function ChatsScreen() {
  const navigate = useNavigate();
  const { data: conversations, isLoading, isError, refetch } = useConversations();

  const open = (c: Conversation) => {
    navigate(ROUTES.CHAT_THREAD.build({ id: c.id }));
  };

  return (
    <div className="mx-auto w-full max-w-2xl px-4 pt-4">
      <AppText variant="header" weight={700} align="start" color="var(--ohl-text-jet)">
        Chats
      </AppText>

      {/*
        Skeleton rows rather than a spinner: they hold the shape the list will
        take, so nothing shifts underneath the user when it resolves.
      */}
      <Show when={isLoading}>
        <div className="mt-3 flex flex-col">
          <Repeat each={SKELETON_ROWS}>
            {(_, i) => (
              <div key={i} className="flex items-center gap-3 border-b border-border px-1 py-3.5">
                <div className="h-11 w-11 flex-shrink-0 animate-pulse rounded-full bg-surface-light" />
                <div className="flex min-w-0 flex-1 flex-col gap-2">
                  <div className="h-3.5 w-1/3 animate-pulse rounded bg-surface-light" />
                  <div className="h-3 w-2/3 animate-pulse rounded bg-surface-light" />
                </div>
              </div>
            )}
          </Repeat>
        </div>
      </Show>

      {/* Cold cache only. Always carries a way back. */}
      <Show when={isError && !isLoading && (conversations?.length ?? 0) === 0}>
        <div className="flex flex-col items-center gap-3 py-16">
          <AppText variant="body" align="center" color="var(--ohl-text-muted)">
            Could not load your conversations.
          </AppText>
          <AppButton label="Try again" radius={100} height={36} onPressed={() => void refetch()} />
        </div>
      </Show>

      <Show when={!isLoading && !isError && (conversations?.length ?? 0) === 0}>
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
