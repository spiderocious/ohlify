import { IconCalendar, IconClock, IconPhone, IconStar, IconVideo } from '@icons';
import { Repeat, Show } from 'meemaw';

import type { ScheduledCallItem } from '@ohlify/core';
import { AppButton, AppEmptyState, AppFilePreview, AppTag, AppText } from '@ohlify/ui';

interface ScheduledCallsListProps {
  calls: ReadonlyArray<ScheduledCallItem>;
  onCancel: (call: ScheduledCallItem) => void;
  onReschedule: (call: ScheduledCallItem) => void;
  onJoin: (call: ScheduledCallItem) => void;
  onTap: (call: ScheduledCallItem) => void;
}

/** Mirrors mobile/lib/features/calls/screen/parts/scheduled_calls_list.dart. */
export function ScheduledCallsList({
  calls,
  onCancel,
  onReschedule,
  onJoin,
  onTap,
}: ScheduledCallsListProps) {
  return (
    <Show when={calls.length > 0} fallback={<AppEmptyState message="No upcoming calls." />}>
      <div className="space-y-3">
        <Repeat each={calls as ScheduledCallItem[]}>
          {(c) => (
            <ScheduledCallCard
              key={c.id}
              call={c}
              onCancel={() => onCancel(c)}
              onReschedule={() => onReschedule(c)}
              onJoin={() => onJoin(c)}
              onTap={() => onTap(c)}
            />
          )}
        </Repeat>
      </div>
    </Show>
  );
}

interface CardProps {
  call: ScheduledCallItem;
  onCancel: () => void;
  onReschedule: () => void;
  onJoin: () => void;
  onTap: () => void;
}

function ScheduledCallCard({ call, onCancel, onReschedule, onJoin, onTap }: CardProps) {
  const isVideo = call.callType === 'video';
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onTap}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onTap();
        }
      }}
      className="cursor-pointer rounded-3xl border border-border bg-surface-dark p-1.5 transition hover:border-primary/30"
    >
      {/* Inner white card — details only */}
      <div className="rounded-2xl bg-background p-3.5">
        <CardHeader call={call} isVideo={isVideo} />
        <div className="mt-3">
          <CallMeta call={call} />
        </div>
      </div>
      {/* Actions live in the outer (bluish) tray */}
      <div
        className="px-2 pb-1.5 pt-3"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => e.stopPropagation()}
        role="presentation"
      >
        <CardActions
          canReschedule={call.canReschedule}
          onCancel={onCancel}
          onReschedule={onReschedule}
          onJoin={onJoin}
        />
      </div>
    </div>
  );
}

interface CardHeaderProps {
  call: ScheduledCallItem;
  isVideo: boolean;
}

function CardHeader({ call, isVideo }: CardHeaderProps) {
  return (
    <div className="flex items-center gap-3">
      <AppFilePreview
        fileKey={call.avatarKey ?? null}
        kind="image"
        width={56}
        height={56}
        radius={12}
        alt={call.name}
        fallback={
          isVideo ? (
            <IconVideo size={22} color="var(--ohl-text-muted)" />
          ) : (
            <IconPhone size={22} color="var(--ohl-text-muted)" />
          )
        }
      />
      <div className="min-w-0 flex-1">
        <AppText variant="body" weight={600} align="start" color="var(--ohl-text-jet)" maxLines={1}>
          {call.name}
        </AppText>
        <AppText
          variant="bodyNormal"
          align="start"
          color="var(--ohl-text-muted)"
          maxLines={1}
          className="mt-0.5"
        >
          {call.role}
        </AppText>
      </div>
      <div className="flex items-center gap-2">
        <span className="inline-flex items-center gap-1">
          <IconStar size={14} fill="var(--ohl-text-amber)" color="var(--ohl-text-amber)" />
          <span className="font-sans text-sm font-bold text-text-amber">
            {call.rating}
          </span>
        </span>
        <span className="h-4 w-px bg-border" />
        <AppTag
          label={isVideo ? 'VIDEO' : 'AUDIO'}
          variant="solid"
          color={isVideo ? '#489B08' : '#8F089B'}
          size="medium"
          startIcon={
            isVideo ? (
              <IconVideo size={14} color="#fff" />
            ) : (
              <IconPhone size={14} color="#fff" />
            )
          }
        />
      </div>
    </div>
  );
}

function CallMeta({ call }: { call: ScheduledCallItem }) {
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-text-muted">
      <MetaItem icon={<IconClock size={14} />} label={call.time} />
      <MetaItem icon={<IconCalendar size={14} />} label={call.date} />
      <MetaItem icon={<IconClock size={14} />} label={call.duration} />
    </div>
  );
}

function MetaItem({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      {icon}
      <span className="font-sans text-xs">{label}</span>
    </span>
  );
}

interface CardActionsProps {
  canReschedule: boolean;
  onCancel: () => void;
  onReschedule: () => void;
  onJoin: () => void;
}

function CardActions({ canReschedule, onCancel, onReschedule, onJoin }: CardActionsProps) {
  if (canReschedule) {
    return (
      <div className="flex gap-3">
        <div className="flex-1">
          <AppButton
            label="Cancel"
            variant="outline"
            radius={100}
            height={44}
            expanded
            onPressed={onCancel}
          />
        </div>
        <div className="flex-1">
          <AppButton
            label="Reschedule"
            radius={100}
            height={44}
            expanded
            onPressed={onReschedule}
          />
        </div>
      </div>
    );
  }
  return (
    <AppButton label="Join call" expanded radius={100} height={44} onPressed={onJoin} />
  );
}

