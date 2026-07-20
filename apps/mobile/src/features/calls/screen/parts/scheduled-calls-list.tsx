import { AppAvatar, AppButton, AppIcon, AppSvg, AppTag, AppText, colors } from '@ohlify/mobile-ui';
import { Fragment } from 'react';
import { Pressable, View } from 'react-native';

import { fileService } from '@shared/services/file-service';

import type { ScheduledCallItem } from '../../types/call-card-models';

export interface ScheduledCallsListProps {
  calls: ScheduledCallItem[];
  onCancel: (item: ScheduledCallItem) => void;
  onReschedule: (item: ScheduledCallItem) => void;
  onJoin: (item: ScheduledCallItem) => void;
  onTap: (item: ScheduledCallItem) => void;
}

/** Mirrors mobile/lib/features/calls/screen/parts/scheduled_calls_list.dart. */
export function ScheduledCallsList({ calls, onCancel, onReschedule, onJoin, onTap }: ScheduledCallsListProps) {
  return (
    <View>
      {calls.map((call, i) => (
        <Fragment key={call.id}>
          {i > 0 ? <View style={{ height: 12 }} /> : null}
          <ScheduledCallCard
            call={call}
            onCancel={() => onCancel(call)}
            onReschedule={() => onReschedule(call)}
            onJoin={() => onJoin(call)}
            onTap={() => onTap(call)}
          />
        </Fragment>
      ))}
    </View>
  );
}

function ScheduledCallCard({
  call,
  onCancel,
  onReschedule,
  onJoin,
  onTap,
}: {
  call: ScheduledCallItem;
  onCancel: () => void;
  onReschedule: () => void;
  onJoin: () => void;
  onTap: () => void;
}) {
  return (
    <Pressable onPress={onTap}>
      <View style={{ padding: 4, backgroundColor: colors.surfaceDark, borderRadius: 20, borderWidth: 1, borderColor: colors.border }}>
        <View style={{ padding: 14, backgroundColor: colors.background, borderRadius: 16 }}>
          <CardHeader call={call} />
          <View style={{ height: 12 }} />
          <CallMeta call={call} />
        </View>
        <View style={{ paddingHorizontal: 10, paddingTop: 12, paddingBottom: 10 }}>
          <CardActions canReschedule={call.canReschedule} onCancel={onCancel} onReschedule={onReschedule} onJoin={onJoin} />
        </View>
      </View>
    </Pressable>
  );
}

function CardHeader({ call }: { call: ScheduledCallItem }) {
  const isVideo = call.callType === 'video';
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
      <View style={{ borderRadius: 12, overflow: 'hidden' }}>
        <AppAvatar fileKey={call.avatarKey} resolveUri={fileService.mintViewUri} name={call.name} size={56} />
      </View>
      <View style={{ width: 12 }} />
      <View style={{ flex: 1 }}>
        <AppText variant="body" color={colors.textJet} weight="500" align="left" numberOfLines={1}>
          {call.name}
        </AppText>
        <View style={{ height: 2 }} />
        <AppText variant="bodyNormal" color={colors.textMuted} align="left" numberOfLines={1}>
          {call.role}
        </AppText>
      </View>
      <View style={{ width: 8 }} />
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        <AppSvg name="ratingBadge" size={14} />
        <View style={{ width: 4 }} />
        <AppText variant="body" color={colors.textAmber} weight="700" align="left">
          {String(call.rating)}
        </AppText>
        <View style={{ width: 8 }} />
        <View style={{ width: 1, height: 16, backgroundColor: colors.border }} />
        <View style={{ width: 8 }} />
        <AppTag
          label={isVideo ? 'VIDEO' : 'AUDIO'}
          variant="solid"
          color={isVideo ? '#489B08' : '#8F089B'}
          size="medium"
          startIcon={<AppIcon name={isVideo ? 'video' : 'phone'} size={14} color={colors.textWhite} />}
        />
      </View>
    </View>
  );
}

function CallMeta({ call }: { call: ScheduledCallItem }) {
  return (
    <View style={{ flexDirection: 'row' }}>
      <MetaItem svgName="clock" label={call.time} />
      <View style={{ width: 16 }} />
      <MetaItem svgName="calendar" label={call.date} />
      <View style={{ width: 16 }} />
      <MetaItem svgName="stopwatch" label={call.duration} />
    </View>
  );
}

function MetaItem({ svgName, label }: { svgName: 'clock' | 'calendar' | 'stopwatch'; label: string }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
      <AppSvg name={svgName} size={14} />
      <View style={{ width: 4 }} />
      <AppText variant="bodyNormal" color={colors.textMuted} align="left">
        {label}
      </AppText>
    </View>
  );
}

function CardActions({
  canReschedule,
  onCancel,
  onReschedule,
  onJoin,
}: {
  canReschedule: boolean;
  onCancel: () => void;
  onReschedule: () => void;
  onJoin: () => void;
}) {
  if (canReschedule) {
    return (
      <View style={{ flexDirection: 'row' }}>
        <View style={{ flex: 1 }}>
          <AppButton label="Cancel" variant="outline" onPress={onCancel} radius={100} height={44} textStyle={{ fontSize: 14, fontWeight: '600' }} />
        </View>
        <View style={{ width: 12 }} />
        <View style={{ flex: 1 }}>
          <AppButton label="Reschedule" onPress={onReschedule} radius={100} height={44} textStyle={{ fontSize: 14, fontWeight: '600' }} />
        </View>
      </View>
    );
  }

  return <AppButton label="Join call" onPress={onJoin} expanded radius={100} height={44} textStyle={{ fontSize: 14, fontWeight: '600' }} />;
}
