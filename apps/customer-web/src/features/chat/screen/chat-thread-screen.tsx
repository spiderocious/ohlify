import { Repeat, Show } from 'meemaw';
import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import { ROUTES } from '@ohlify/core';
import { AppButton, AppText, AppTextInput, DrawerService, cn } from '@ohlify/ui';
import type { ChatMessage, ScheduleAction } from '@ohlify/api';

import { useConversationContext } from '../api/use-conversation-context.js';
import {
  useDiscardMessage,
  useMarkRead,
  useMessages,
  useSendMessage,
} from '../api/use-messages.js';
import type { PendingChatMessage } from '../api/use-messages.js';
import { useProposeSchedule, useReschedule, useScheduleAction } from '../api/use-schedule.js';
import { CreditsBanner } from './parts/credits-banner.js';
import { ScheduleCard } from './parts/schedule-card.js';
import { SchedulePicker } from './parts/schedule-picker.js';

/** Alternating sides, so the loading state reads as a conversation. */
const SKELETON_BUBBLES: boolean[] = [false, true, false, true];

/**
 * `pending` and `failed` live only in the cache — the API never sends them —
 * so they are read through a narrowing cast rather than added to `ChatMessage`,
 * which is the server's contract and should keep describing only what it sends.
 */
const isPending = (m: ChatMessage) => Boolean((m as PendingChatMessage).pending);
const isFailed = (m: ChatMessage) => Boolean((m as PendingChatMessage).failed);

/** A single conversation thread — messages, schedule cards, a credits banner,
 *  the composer, and a Call button that launches an instant call with the peer. */
export function ChatThreadScreen() {
  const { id = '' } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { data: context } = useConversationContext(id);
  const { data: messages, isLoading, isError, refetch } = useMessages(id);
  const sendMessage = useSendMessage(id);
  const discardMessage = useDiscardMessage(id);
  const markRead = useMarkRead(id);
  const proposeSchedule = useProposeSchedule(id);
  const scheduleAction = useScheduleAction(id);
  const reschedule = useReschedule(id);

  const [draft, setDraft] = useState('');
  const listEndRef = useRef<HTMLDivElement>(null);

  // Clear unread on open.
  const markReadRef = useRef(markRead);
  markReadRef.current = markRead;
  useEffect(() => {
    if (id) markReadRef.current.mutate();
  }, [id]);

  // Newest-first from the API → reverse for chronological display.
  const ordered = messages ? [...messages].reverse() : [];

  useEffect(() => {
    listEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [ordered.length]);

  // The client can only message while they hold minutes; the pro can always reply.
  const canSend = context?.can_send ?? true;

  const send = () => {
    const body = draft.trim();
    if (!body || !canSend) return;
    // Cleared only once the optimistic row exists, so a rejected send leaves
    // the text somewhere the user can still see it.
    sendMessage.mutate(body, { onSettled: () => undefined });
    setDraft('');
  };

  /** Re-send a failed message: drop the dead placeholder, send the body again. */
  const retry = (m: PendingChatMessage) => {
    discardMessage(m.id);
    sendMessage.mutate(m.body);
  };

  const call = () => {
    if (!context) return;
    const search = new URLSearchParams({ pro: context.peer_user_id, type: 'audio' });
    if (context.peer_name) search.set('name', context.peer_name);
    navigate(`${ROUTES.INSTANT_CALL.absPath}?${search.toString()}`);
  };

  const buyMinutes = () => {
    if (!context) return;
    navigate(ROUTES.PROFESSIONAL.build({ id: context.peer_user_id }));
  };

  const onErr = (err: unknown) => {
    const e = err as { errorMessage?: string };
    DrawerService.toast(e.errorMessage ?? 'Something went wrong.', { type: 'error' });
  };

  // Real calendar + time picker (no free-text datetime entry).
  const openPicker = (
    title: string,
    submitLabel: string,
    initialAt: string | null,
    onPicked: (iso: string, note?: string) => void,
  ) => {
    DrawerService.showCustomModal(
      title,
      (dismiss) => (
        <SchedulePicker
          initialAt={initialAt}
          submitLabel={submitLabel}
          onConfirm={(iso, note) => {
            dismiss();
            onPicked(iso, note);
          }}
        />
      ),
      { position: 'bottom' },
    );
  };

  const openScheduler = () =>
    openPicker('Schedule a call', 'Propose', null, (iso, note) =>
      proposeSchedule.mutate({ scheduled_at: iso, note }, { onError: onErr }),
    );

  const onScheduleAction = (messageId: string, action: ScheduleAction) =>
    scheduleAction.mutate({ messageId, action }, { onError: onErr });

  const onReschedule = (messageId: string, currentAt: string | null) =>
    openPicker('Reschedule call', 'Reschedule', currentAt, (iso, note) =>
      reschedule.mutate({ messageId, scheduled_at: iso, note }, { onError: onErr }),
    );

  return (
    <div className="mx-auto flex h-[100dvh] w-full max-w-2xl flex-col">
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <button type="button" onClick={() => navigate(-1)} aria-label="Back">
          <AppText variant="body" weight={600} align="start" color="var(--ohl-text-jet)">
            ‹ Back
          </AppText>
        </button>
        <AppText variant="body" weight={700} align="center" color="var(--ohl-text-jet)">
          {context?.peer_name ?? 'Chat'}
        </AppText>
        <div className="flex gap-2">
          <AppButton
            label="Schedule"
            radius={100}
            height={36}
            variant="outline"
            onPressed={openScheduler}
          />
          <AppButton label="Call" radius={100} height={36} onPressed={call} />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4">
        {/*
          Skeleton bubbles rather than a centred spinner: they stand in the
          shape the messages will occupy, so the thread does not jump when it
          arrives. Alternating sides, because a column of identical blocks
          reads as a broken layout rather than as a conversation.
        */}
        <Show when={isLoading && ordered.length === 0}>
          <div className="flex flex-col gap-2 py-2">
            <Repeat each={SKELETON_BUBBLES}>
              {(own, i) => (
                <div key={i} className={cn('flex', own ? 'justify-end' : 'justify-start')}>
                  <div
                    className={cn(
                      'h-9 animate-pulse rounded-2xl bg-surface-light',
                      own ? 'w-[45%]' : 'w-[60%]',
                    )}
                  />
                </div>
              )}
            </Repeat>
          </div>
        </Show>

        {/* Cold cache only — with messages on screen the error is a banner. */}
        <Show when={isError && ordered.length === 0}>
          <div className="flex flex-col items-center gap-3 py-10">
            <AppText variant="body" align="center" color="var(--ohl-text-muted)">
              Could not load this conversation.
            </AppText>
            <AppButton
              label="Try again"
              radius={100}
              height={36}
              onPressed={() => void refetch()}
            />
          </div>
        </Show>
        <Repeat each={ordered}>
          {(m: ChatMessage) =>
            m.kind === 'schedule' ? (
              <ScheduleCard
                key={m.id}
                message={m}
                onAction={(action) => onScheduleAction(m.id, action)}
                onReschedule={() => onReschedule(m.id, m.scheduled_at)}
                onJoin={call}
              />
            ) : (
              <div key={m.id} className={cn('mb-2 flex', m.mine ? 'justify-end' : 'justify-start')}>
                <div className="flex max-w-[75%] flex-col items-end gap-1">
                  <div
                    className={cn(
                      'rounded-2xl px-3.5 py-2 transition-opacity',
                      m.mine ? 'bg-primary text-white' : 'bg-surface-light text-jet',
                      // Sent but unconfirmed: on screen, visibly not yet landed.
                      isPending(m) && 'opacity-55',
                      isFailed(m) && 'bg-error/10',
                    )}
                  >
                    <AppText
                      variant="body"
                      align="start"
                      color={
                        isFailed(m)
                          ? 'var(--ohl-text-jet)'
                          : m.mine
                            ? '#fff'
                            : 'var(--ohl-text-jet)'
                      }
                    >
                      {m.body}
                    </AppText>
                  </div>

                  <Show when={isFailed(m)}>
                    <button
                      type="button"
                      onClick={() => retry(m)}
                      className="px-1 text-left"
                      aria-label="Retry sending this message"
                    >
                      <AppText variant="bodySmall" align="end" color="var(--ohl-error)">
                        Failed — tap to retry
                      </AppText>
                    </button>
                  </Show>
                </div>
              </div>
            )
          }
        </Repeat>
        <div ref={listEndRef} />
      </div>

      {/* Credits warning sits directly above the composer. */}
      <Show when={Boolean(context)}>
        <CreditsBanner context={context!} onBuyMinutes={buyMinutes} />
      </Show>

      <div className="flex items-center gap-2 border-t border-border px-4 py-3">
        <div className="flex-1">
          <AppTextInput
            label=""
            value={draft}
            placeholder={canSend ? 'Message' : 'Buy minutes to keep chatting'}
            disabled={!canSend}
            onChange={setDraft}
          />
        </div>
        <AppButton
          label="Send"
          radius={100}
          height={44}
          isDisabled={!canSend || draft.trim().length === 0}
          onPressed={!canSend || draft.trim().length === 0 ? undefined : send}
        />
      </div>
    </div>
  );
}
