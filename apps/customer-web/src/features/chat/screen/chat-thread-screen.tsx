import { Repeat, Show } from 'meemaw';
import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import { ROUTES } from '@ohlify/core';
import { AppButton, AppLoader, AppText, AppTextInput, DrawerService, cn } from '@ohlify/ui';
import type { ChatMessage, ScheduleAction } from '@ohlify/api';

import { useConversationContext } from '../api/use-conversation-context.js';
import { useMarkRead, useMessages, useSendMessage } from '../api/use-messages.js';
import { useProposeSchedule, useReschedule, useScheduleAction } from '../api/use-schedule.js';
import { CreditsBanner } from './parts/credits-banner.js';
import { ScheduleCard } from './parts/schedule-card.js';
import { SchedulePicker } from './parts/schedule-picker.js';

/** A single conversation thread — messages, schedule cards, a credits banner,
 *  the composer, and a Call button that launches an instant call with the peer. */
export function ChatThreadScreen() {
  const { id = '' } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { data: context } = useConversationContext(id);
  const { data: messages, isLoading } = useMessages(id);
  const sendMessage = useSendMessage(id);
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
    setDraft('');
    sendMessage.mutate(body);
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
        <Show when={isLoading}>
          <div className="flex justify-center py-10">
            <AppLoader />
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
                <div
                  className={cn(
                    'max-w-[75%] rounded-2xl px-3.5 py-2',
                    m.mine ? 'bg-primary text-white' : 'bg-surface-light text-jet',
                  )}
                >
                  <AppText
                    variant="body"
                    align="start"
                    color={m.mine ? '#fff' : 'var(--ohl-text-jet)'}
                  >
                    {m.body}
                  </AppText>
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
