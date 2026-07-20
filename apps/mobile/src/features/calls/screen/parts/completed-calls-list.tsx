import { AppAvatar, AppIcon, AppTag, AppText, colors } from '@ohlify/mobile-ui';
import { Fragment } from 'react';
import { Pressable, Text, View } from 'react-native';

import { fileService } from '@shared/services/file-service';

import type { CompletedCallGroup, CompletedCallItem } from '../../types/call-card-models';

export interface CompletedCallsListProps {
  groups: CompletedCallGroup[];
  onTap: (item: CompletedCallItem) => void;
}

/** Mirrors mobile/lib/features/calls/screen/parts/completed_calls_list.dart. */
export function CompletedCallsList({ groups, onTap }: CompletedCallsListProps) {
  return (
    <View>
      {groups.map((group, i) => (
        <Fragment key={group.date}>
          {i > 0 ? <View style={{ height: 12 }} /> : null}
          <CompletedCallGroupCard group={group} onTap={onTap} />
        </Fragment>
      ))}
    </View>
  );
}

function CompletedCallGroupCard({ group, onTap }: { group: CompletedCallGroup; onTap: (item: CompletedCallItem) => void }) {
  return (
    <View style={{ padding: 16, backgroundColor: colors.background, borderRadius: 16, borderWidth: 1, borderColor: colors.border }}>
      <AppText variant="label" color={colors.textMuted} align="left" weight="600">
        {group.date}
      </AppText>
      <View style={{ height: 12 }} />
      {group.calls.map((call, i) => (
        <Fragment key={call.id}>
          {i > 0 ? <View style={{ height: 24, borderTopWidth: 1, borderTopColor: colors.border, marginBottom: 24 }} /> : null}
          <CompletedCallRow call={call} onTap={() => onTap(call)} />
        </Fragment>
      ))}
    </View>
  );
}

function CompletedCallRow({ call, onTap }: { call: CompletedCallItem; onTap: () => void }) {
  const isVideo = call.callType === 'video';
  return (
    <Pressable onPress={onTap}>
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        <AppAvatar fileKey={call.avatarKey} resolveUri={fileService.mintViewUri} name={call.name} size={40} />
        <View style={{ width: 10 }} />
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <View style={{ flexShrink: 1 }}>
              <AppText variant="body" color={colors.textJet} weight="600" align="left" numberOfLines={1}>
                {call.name}
              </AppText>
            </View>
            <View style={{ width: 8 }} />
            <AppTag
              label={isVideo ? 'VIDEO' : 'AUDIO'}
              variant="solid"
              color={isVideo ? '#489B08' : '#8F089B'}
              size="small"
              startIcon={<AppIcon name={isVideo ? 'video' : 'phone'} size={12} color={colors.textWhite} />}
            />
          </View>
          <View style={{ height: 4 }} />
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <StateChip label={call.stateLabel} />
            <View style={{ width: 6 }} />
            <View style={{ flexShrink: 1 }}>
              <AppText variant="label" color={colors.textMuted} align="left" numberOfLines={1}>
                {call.time}
              </AppText>
            </View>
          </View>
        </View>
        <View style={{ width: 8 }} />
        <View style={{ alignItems: 'flex-end' }}>
          <AppText variant="body" color={colors.textJet} weight="600" align="right">
            {call.amount}
          </AppText>
          <View style={{ height: 2 }} />
          <AppText variant="label" color={colors.textMuted} align="right">
            {call.duration}
          </AppText>
        </View>
      </View>
    </Pressable>
  );
}

function stateChipColor(label: string): string {
  switch (label) {
    case 'Completed':
      return '#1F6F15';
    case 'In progress':
      return colors.primary;
    case 'Cancelled':
      return colors.error;
    case 'Missed':
    case 'Disconnected':
      return '#B45309';
    default:
      return colors.textMuted;
  }
}

function StateChip({ label }: { label: string }) {
  const color = stateChipColor(label);
  return (
    <View style={{ paddingHorizontal: 6, paddingVertical: 2, backgroundColor: `${color}1A`, borderRadius: 100 }}>
      <Text style={{ fontFamily: 'MonaSans-SemiBold', fontSize: 10, fontWeight: '600', color }}>{label}</Text>
    </View>
  );
}
