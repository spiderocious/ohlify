import { Show } from 'meemaw';
import { useState } from 'react';

import { AppButton, AppText, cn } from '@ohlify/ui';
import type { ChatMessage, ScheduleAction } from '@ohlify/api';

interface ScheduleCardProps {
  message: ChatMessage;
  onAction: (action: ScheduleAction) => void;
  onReschedule: () => void;
  onJoin: () => void;
}

function formatWhen(iso: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  return d.toLocaleString('en-NG', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    hour: 'numeric',
    minute: '2-digit',
  });
}

const STATUS_LABEL: Record<string, string> = {
  pending: 'Awaiting response',
  accepted: 'Accepted',
  declined: 'Declined',
  cancelled: 'Cancelled',
};

/**
 * A chat-native scheduled call. Either party can propose; the invitee sees
 * Accept (primary) + Decline; the proposer sees Reschedule + Cancel in the
 * overflow menu. Purely informational — Join just starts a normal instant call.
 */
export function ScheduleCard({ message, onAction, onReschedule, onJoin }: ScheduleCardProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const status = message.schedule_status ?? 'pending';
  const isTerminal = status === 'declined' || status === 'cancelled';
  const hasMenu = message.can_reschedule || message.can_cancel;

  return (
    <div className={cn('mb-2 flex', message.mine ? 'justify-end' : 'justify-start')}>
      <div className="relative w-[85%] max-w-sm rounded-2xl border border-border bg-background p-3.5">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <AppText variant="bodySmall" align="start" color="var(--ohl-text-muted)">
              📅 Scheduled call
            </AppText>
            <AppText variant="body" weight={700} align="start" color="var(--ohl-text-jet)">
              {formatWhen(message.scheduled_at)}
            </AppText>
            <Show when={message.body.length > 0}>
              <AppText variant="bodySmall" align="start" color="var(--ohl-text-muted)">
                {message.body}
              </AppText>
            </Show>
          </div>

          <Show when={hasMenu}>
            <div className="relative">
              <button
                type="button"
                aria-label="Schedule options"
                onClick={() => setMenuOpen((v) => !v)}
                className="rounded-full px-2 py-1 text-lg leading-none text-text-muted hover:bg-black/5"
              >
                ⋯
              </button>
              <Show when={menuOpen}>
                <div className="absolute right-0 top-8 z-10 w-40 overflow-hidden rounded-xl border border-border bg-background shadow-lg">
                  <Show when={message.can_reschedule}>
                    <button
                      type="button"
                      onClick={() => {
                        setMenuOpen(false);
                        onReschedule();
                      }}
                      className="block w-full px-3 py-2.5 text-left hover:bg-black/[0.03]"
                    >
                      <AppText variant="bodySmall" align="start" color="var(--ohl-text-jet)">
                        Reschedule
                      </AppText>
                    </button>
                  </Show>
                  <Show when={message.can_cancel}>
                    <button
                      type="button"
                      onClick={() => {
                        setMenuOpen(false);
                        onAction('cancel');
                      }}
                      className="block w-full px-3 py-2.5 text-left hover:bg-black/[0.03]"
                    >
                      <AppText variant="bodySmall" align="start" color="var(--ohl-error)">
                        Cancel
                      </AppText>
                    </button>
                  </Show>
                </div>
              </Show>
            </div>
          </Show>
        </div>

        <div className="mt-2">
          <AppText
            variant="bodySmall"
            align="start"
            color={status === 'accepted' ? 'var(--ohl-success)' : 'var(--ohl-text-muted)'}
          >
            {STATUS_LABEL[status] ?? status}
          </AppText>
        </div>

        {/* Invitee actions on a pending invite. */}
        <Show when={message.can_accept || message.can_decline}>
          <div className="mt-3 flex gap-2">
            <Show when={message.can_accept}>
              <div className="flex-1">
                <AppButton
                  label="Accept"
                  expanded
                  radius={100}
                  height={38}
                  onPressed={() => onAction('accept')}
                />
              </div>
            </Show>
            <Show when={message.can_decline}>
              <div className="flex-1">
                <AppButton
                  label="Decline"
                  expanded
                  radius={100}
                  height={38}
                  variant="outline"
                  onPressed={() => onAction('decline')}
                />
              </div>
            </Show>
          </div>
        </Show>

        {/* Once accepted, either side can jump into the call. */}
        <Show when={status === 'accepted' && !isTerminal}>
          <div className="mt-3">
            <AppButton label="Join call" expanded radius={100} height={38} onPressed={onJoin} />
          </div>
        </Show>
      </div>
    </div>
  );
}
